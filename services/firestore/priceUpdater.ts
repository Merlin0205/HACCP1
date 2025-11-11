/**
 * Služba pro aktualizaci cen Gemini modelů z oficiální stránky
 * Používá Cloud Function pro parsing HTML místo LLM
 */

import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import app from '../../firebaseConfig';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { calculateModelCategory, DEFAULT_GEMINI_MODELS } from './settings';

const COLLECTION_NAME = 'settings';

// Inicializace Functions instance
const functions = getFunctions(app, 'europe-west1');

/**
 * Callback pro progress aktualizace cen
 */
export type PriceUpdateProgressCallback = (step: string, details?: string) => void;

/**
 * Aktualizuje ceny Gemini modelů pomocí parsing z oficiální stránky
 * https://ai.google.dev/gemini-api/docs/pricing
 * 
 * Používá DEFAULT_GEMINI_MODELS jako základní seznam modelů (strukturovaný, spolehlivý)
 * Cloud Function parsuje HTML stránku a extrahuje ceny
 * 
 * @param progressCallback Volitelný callback pro zobrazení progressu
 */
export async function updateGeminiPricesFromWeb(
  progressCallback?: PriceUpdateProgressCallback
): Promise<{
  updated: number;
  failed: string[];
  totalModels: number;
}> {
  try {
    progressCallback?.('Inicializace', 'Načítám konfiguraci...');
    
    // POUŽÍT DEFAULT_GEMINI_MODELS jako základní seznam modelů (strukturovaný, spolehlivý)
    const knownModelNames = Object.keys(DEFAULT_GEMINI_MODELS);
    
    progressCallback?.('Načítání seznamu modelů', `Nalezeno ${knownModelNames.length} modelů v databázi`);

    // Volat Cloud Function pro parsing cen z HTML stránky
    progressCallback?.('Parsování stránky', 'Načítám ceny z oficiální stránky...');
    
    const parseGeminiPricing = httpsCallable(functions, 'parseGeminiPricing');
    const result = await parseGeminiPricing();
    
    // LOGOVÁNÍ: Co Cloud Function skutečně vrátila
    console.log('[PRICE-UPDATER] ========================================');
    console.log('[PRICE-UPDATER] Surová odpověď z Cloud Function:', result);
    console.log('[PRICE-UPDATER] result.data:', result.data);
    console.log('[PRICE-UPDATER] Typ result.data:', typeof result.data);
    
    const response = result.data as {
      models: Record<string, {
        name: string;
        inputPrice: number;
        outputPrice: number;
        description?: string;
        useCase?: string;
      }>;
      success: boolean;
      error?: string;
    };
    
    // LOGOVÁNÍ: Parsovaná odpověď
    console.log('[PRICE-UPDATER] Parsovaná odpověď:', response);
    console.log('[PRICE-UPDATER] response.success:', response?.success);
    console.log('[PRICE-UPDATER] response.models:', response?.models);
    console.log('[PRICE-UPDATER] Počet modelů v response.models:', response?.models ? Object.keys(response.models).length : 0);
    console.log('[PRICE-UPDATER] Názvy modelů:', response?.models ? Object.keys(response.models) : []);
    
    // Cloud Function vrací buď úspěšnou odpověď s models, nebo vyhodí HttpsError
    if (!response || !response.models) {
      console.error('[PRICE-UPDATER] CHYBA: response nebo response.models je prázdné!');
      throw new Error('Nepodařilo se parsovat ceny - prázdná odpověď');
    }
    
    const parsedModels = response.models;
    console.log('[PRICE-UPDATER] Parsované modely (celý objekt):', parsedModels);
    console.log('[PRICE-UPDATER] Detail každého modelu:');
    Object.entries(parsedModels).forEach(([modelName, modelData]) => {
      console.log(`[PRICE-UPDATER]   ${modelName}:`, {
        inputPrice: modelData.inputPrice,
        outputPrice: modelData.outputPrice,
        description: modelData.description,
        useCase: modelData.useCase
      });
    });
    console.log('[PRICE-UPDATER] ========================================');
    progressCallback?.('Ceny načteny', `Získal ceny pro ${Object.keys(parsedModels).length} modelů z parsování`);
    
    // Přidat všechny modely z DEFAULT_GEMINI_MODELS, i když nebyly nalezeny na stránce
    // Modely nalezené na stránce budou mít aktualizované ceny, ostatní budou mít výchozí ceny
    const allParsedModels: Record<string, {
      name: string;
      inputPrice: number;
      outputPrice: number;
      description?: string;
      useCase?: string;
      foundOnPage?: boolean; // Označit, zda byl model nalezen na stránce
    }> = {};
    
    // Přidat všechny modely z DEFAULT_GEMINI_MODELS
    Object.entries(DEFAULT_GEMINI_MODELS).forEach(([modelName, defaultModel]) => {
      const parsedModel = parsedModels[modelName];
      
      // Fallback pro useCase
      let useCase = '';
      if (parsedModel?.useCase) {
        useCase = parsedModel.useCase;
      } else if (defaultModel.useCase) {
        useCase = defaultModel.useCase;
      } else {
        // Fallback podle názvu modelu
        if (modelName.includes('flash') || modelName.includes('lite')) {
          useCase = 'Rychlé generování textu, analýza obrázků';
        } else if (modelName.includes('pro')) {
          useCase = 'Komplexní úlohy, zpracování dlouhých dokumentů';
        } else if (modelName.includes('multimodal') || modelName.includes('vision')) {
          useCase = 'Multimodální úlohy, analýza obrázků';
        } else if (modelName.includes('audio') || modelName.includes('tts')) {
          useCase = 'Transkribce audio, zpracování zvuku';
        } else if (modelName.includes('embedding')) {
          useCase = 'Embeddingy, vektorové reprezentace';
        } else if (modelName.includes('ultra')) {
          useCase = 'Nejpokročilejší úlohy, složité úkoly vyžadující hlubokou úvahu';
        } else if (modelName.includes('robotics')) {
          useCase = 'Robotické úlohy, reasoning';
        } else {
          useCase = 'Všestranné použití';
        }
      }
      
      if (parsedModel) {
        // Model byl nalezen na stránce - použít parsované ceny
        allParsedModels[modelName] = {
          ...parsedModel,
          useCase: parsedModel.useCase || useCase, // Zajistit, že useCase je vždy vyplněno
          foundOnPage: true
        };
      } else {
        // Model nebyl nalezen na stránce - použít výchozí ceny
        allParsedModels[modelName] = {
          name: modelName,
          inputPrice: defaultModel.inputPrice || 0,
          outputPrice: defaultModel.outputPrice || 0,
          description: defaultModel.description || '',
          useCase: useCase, // VŽDY vyplněno
          foundOnPage: false
        };
      }
    });
    
    progressCallback?.('Ceny připraveny', `Celkem ${Object.keys(allParsedModels).length} modelů (${Object.keys(parsedModels).length} nalezeno na stránce)`);

    // Aktualizovat aiModelsList - použít DEFAULT_GEMINI_MODELS jako základ
    // Parsované ceny aktualizují ceny, useCase zůstává z DEFAULT_GEMINI_MODELS nebo fallback
    progressCallback?.('Aktualizace seznamu modelů', `Zpracovávám ${knownModelNames.length} modelů...`);
    
    const allModelsList: Record<string, any> = {};
    const updateDate = new Date().toISOString().split('T')[0];

    knownModelNames.forEach((modelName) => {
      const defaultModel = DEFAULT_GEMINI_MODELS[modelName];
      const parsedModel = allParsedModels[modelName] || parsedModels[modelName];
      
      // Použít ceny z parsované stránky, pokud jsou k dispozici, jinak použít výchozí ceny
      const inputPrice = parsedModel?.inputPrice !== undefined ? parsedModel.inputPrice : (defaultModel.inputPrice || 0);
      const outputPrice = parsedModel?.outputPrice !== undefined ? parsedModel.outputPrice : (defaultModel.outputPrice || 0);
      
      // Validace useCase - použít z parsedModel, defaultModel nebo fallback
      let useCase = (parsedModel?.useCase || defaultModel.useCase || '').trim();
      
      // Pokud stále není useCase, použít fallback podle názvu modelu
      if (!useCase) {
        if (modelName.includes('flash') || modelName.includes('lite')) {
          useCase = 'Rychlé generování textu, analýza obrázků';
        } else if (modelName.includes('pro')) {
          useCase = 'Komplexní úlohy, zpracování dlouhých dokumentů';
        } else if (modelName.includes('multimodal') || modelName.includes('vision')) {
          useCase = 'Multimodální úlohy, analýza obrázků';
        } else if (modelName.includes('audio') || modelName.includes('tts')) {
          useCase = 'Transkribce audio, zpracování zvuku';
        } else if (modelName.includes('embedding')) {
          useCase = 'Embeddingy, vektorové reprezentace';
        } else if (modelName.includes('ultra')) {
          useCase = 'Nejpokročilejší úlohy, složité úkoly vyžadující hlubokou úvahu';
        } else {
          useCase = 'Všestranné použití';
        }
      }
      
      allModelsList[modelName] = {
        name: modelName,
        category: calculateModelCategory(inputPrice, outputPrice),
        inputPrice: inputPrice,
        outputPrice: outputPrice,
        description: (parsedModel?.description || defaultModel.description || '').trim(),
        useCase: useCase, // VŽDY vyplněno
        lastPriceUpdate: updateDate
      };
    });

    progressCallback?.('Ukládání do databáze', 'Ukládám aktualizované modely...');

    // Uložit aktualizovaný seznam modelů - PŘEPÍŠE všechny modely (bez merge)
    await setDoc(
      doc(db, COLLECTION_NAME, 'aiModelsList'),
      {
        models: allModelsList,
        lastFullUpdate: new Date().toISOString(),
        updatedAt: Timestamp.now()
      }
      // BEZ merge - přepíše všechny modely
    );

    // Aktualizovat pricing config
    progressCallback?.('Aktualizace pricing config', 'Aktualizuji ceny modelů...');
    
    const pricingDoc = await doc(db, COLLECTION_NAME, 'aiPricingConfig');
    const pricingDocSnap = await getDoc(pricingDoc);
    const pricingConfig = pricingDocSnap.data() || { models: {} };
    const updatedModels: string[] = [];
    const failedModels: string[] = [];

    for (const modelName of knownModelNames) {
      const parsedModel = parsedModels[modelName];
      const defaultModel = DEFAULT_GEMINI_MODELS[modelName];
      
      // Pokud model nebyl nalezen v parsovaných datech, použít výchozí ceny
      const inputPrice = parsedModel?.inputPrice !== undefined ? parsedModel.inputPrice : (defaultModel.inputPrice || 0);
      const outputPrice = parsedModel?.outputPrice !== undefined ? parsedModel.outputPrice : (defaultModel.outputPrice || 0);

      if (inputPrice === 0 && outputPrice === 0 && !modelName.includes('exp')) {
        // Pokud jsou obě ceny 0 a není to exp model, označit jako failed
        failedModels.push(modelName);
        continue;
      }

      if (!pricingConfig.models) {
        pricingConfig.models = {};
      }

      // Zajistit, že useCase není prázdné - použít z allModelsList nebo fallback
      let useCase = allModelsList[modelName]?.useCase || parsedModel?.useCase || defaultModel?.useCase || '';
      if (!useCase || useCase.trim() === '') {
        // Fallback podle názvu modelu - VŽDY musí být vyplněno
        if (modelName.includes('flash') || modelName.includes('lite')) {
          useCase = 'Rychlé generování textu, analýza obrázků';
        } else if (modelName.includes('pro')) {
          useCase = 'Komplexní úlohy, zpracování dlouhých dokumentů';
        } else if (modelName.includes('multimodal') || modelName.includes('vision')) {
          useCase = 'Multimodální úlohy, analýza obrázků';
        } else if (modelName.includes('audio') || modelName.includes('tts')) {
          useCase = 'Transkribce audio, zpracování zvuku';
        } else if (modelName.includes('embedding')) {
          useCase = 'Embeddingy, vektorové reprezentace';
        } else if (modelName.includes('ultra')) {
          useCase = 'Nejpokročilejší úlohy, složité úkoly vyžadující hlubokou úvahu';
        } else {
          useCase = 'Všestranné použití';
        }
      }

      pricingConfig.models[modelName] = {
        ...pricingConfig.models[modelName],
        inputPrice,
        outputPrice,
        note: parsedModel?.description || defaultModel?.description || '',
        useCase: useCase.trim(), // VŽDY vyplněno
        lastPriceUpdate: updateDate
      };

      updatedModels.push(modelName);
    }

    // Uložit aktualizovaný pricing config
    await setDoc(
      doc(db, COLLECTION_NAME, 'aiPricingConfig'),
      {
        ...pricingConfig,
        lastFullPriceUpdate: new Date().toISOString(),
        updatedAt: Timestamp.now()
      },
      { merge: true }
    );

    progressCallback?.('Dokončeno', `Aktualizováno ${updatedModels.length} modelů`);

    return {
      updated: updatedModels.length,
      failed: failedModels,
      totalModels: knownModelNames.length,
      parsedModels: allParsedModels // Vrátit všechny modely s označením, které byly nalezeny
    };
  } catch (error: any) {
    console.error('[PRICE-UPDATER] Chyba při aktualizaci cen:', error);
    throw new Error(error.message || 'Nepodařilo se aktualizovat ceny modelů');
  }
}

/**
 * Aktualizuje ceny Gemini modelů pomocí LLM (Firebase AI Logic SDK)
 * Používá stejnou logiku jako HTML parsing, ale přes LLM
 * 
 * @param progressCallback Volitelný callback pro zobrazení progressu
 */
export async function updateGeminiPricesWithLLM(
  progressCallback?: PriceUpdateProgressCallback
): Promise<{
  updated: number;
  failed: string[];
  totalModels: number;
  parsedModels: Record<string, {
    name: string;
    inputPrice: number;
    outputPrice: number;
    description?: string;
    useCase?: string;
    foundOnPage?: boolean;
  }>;
}> {
  try {
    progressCallback?.('Inicializace LLM', 'Načítám konfiguraci...');

    const { generateContentWithSDK } = await import('../aiLogic');
    const { fetchAIModelsConfig } = await import('./settings');
    const { addAIUsageLog } = await import('./aiUsageLogs');
    
    // Použít DEFAULT_GEMINI_MODELS jako základní seznam modelů
    const knownModelNames = Object.keys(DEFAULT_GEMINI_MODELS);
    
    progressCallback?.('Načítání seznamu modelů', `Nalezeno ${knownModelNames.length} modelů v databázi`);
    
    // Načíst konfiguraci modelu pro LLM
    const modelsConfig = await fetchAIModelsConfig();
    const llmModel = modelsConfig.models?.priceUpdateModel || 'gemini-2.5-flash';
    
    progressCallback?.('LLM parsing', 'Načítám ceny z oficiální stránky pomocí LLM...');
    
    // Načíst HTML stránku přes Cloud Function (kvůli CORS)
    progressCallback?.('Načítání HTML', 'Stahuji HTML stránku s cenami...');
    const fetchPricingPage = httpsCallable(functions, 'fetchPricingPage');
    const htmlResult = await fetchPricingPage();
    const htmlContent = (htmlResult.data as { html: string; success: boolean }).html;
    
    // Omezit délku HTML kvůli token limitům (zachovat důležité části)
    // Najít sekce s modely VČETNĚ tabulek s cenami
    // Struktura: <div class="models-section">...<devsite-selector>...<table class="pricing-table">...</table>...</devsite-selector>
    let relevantHtml = htmlContent;
    
    // Najít všechny sekce s modely včetně tabulek s cenami
    // Zachytit od <div class="models-section"> až do dalšího <div class="models-section"> nebo konce
    const modelSectionsPattern = /<div class="models-section">[\s\S]*?(?=<div class="models-section">|$)/gi;
    const modelSections = htmlContent.match(modelSectionsPattern);
    
    if (modelSections && modelSections.length > 0) {
      // Najít sekce, které obsahují tabulky s cenami
      const sectionsWithTables = modelSections.filter(section => 
        section.includes('pricing-table') || section.includes('devsite-selector')
      );
      
      if (sectionsWithTables.length > 0) {
        relevantHtml = sectionsWithTables.join('\n');
        console.log('[PRICE-UPDATER-LLM] Nalezeno sekcí s modely a tabulkami:', sectionsWithTables.length);
      } else {
        // Pokud nejsou tabulky v sekcích, zkusit najít tabulky samostatně
        const tablePattern = /<table class="pricing-table">[\s\S]*?<\/table>/gi;
        const tables = htmlContent.match(tablePattern);
        if (tables && tables.length > 0) {
          // Najít kontext kolem tabulek (předchozí h2 s gemini ID)
          let htmlWithContext = '';
          for (const table of tables) {
            // Najít předchozí h2 s gemini ID
            const tableIndex = htmlContent.indexOf(table);
            const beforeTable = htmlContent.substring(Math.max(0, tableIndex - 2000), tableIndex);
            const h2Match = beforeTable.match(/<h2[^>]*id="gemini[^"]*"[\s\S]*?(?=<h2|$)/i);
            if (h2Match) {
              htmlWithContext += h2Match[0] + '\n' + table + '\n';
            } else {
              htmlWithContext += table + '\n';
            }
          }
          relevantHtml = htmlWithContext;
          console.log('[PRICE-UPDATER-LLM] Nalezeno tabulek s cenami:', tables.length);
        } else {
          relevantHtml = modelSections.join('\n');
          console.log('[PRICE-UPDATER-LLM] Nalezeno sekcí s modely (bez tabulek):', modelSections.length);
        }
      }
    } else {
      // Pokud nic nenašli, použít celý HTML (ale omezit délku)
      console.log('[PRICE-UPDATER-LLM] Nenalezeny sekce s modely, používám celý HTML');
    }
    
    // Omezit na 80000 znaků kvůli token limitům (zvýšeno, protože potřebujeme tabulky)
    relevantHtml = relevantHtml.substring(0, 80000);
    
    // Logování pro debugging
    console.log('[PRICE-UPDATER-LLM] Délka HTML:', relevantHtml.length, 'znaků');
    console.log('[PRICE-UPDATER-LLM] Prvních 500 znaků HTML:', relevantHtml.substring(0, 500));
    console.log('[PRICE-UPDATER-LLM] Obsahuje pricing-table:', relevantHtml.includes('pricing-table'));
    console.log('[PRICE-UPDATER-LLM] Obsahuje devsite-selector:', relevantHtml.includes('devsite-selector'));
    
    // Pokud HTML neobsahuje tabulky, použít větší část HTML
    if (!relevantHtml.includes('pricing-table') && !relevantHtml.includes('devsite-selector')) {
      console.log('[PRICE-UPDATER-LLM] ⚠️ HTML neobsahuje tabulky s cenami, používám větší část HTML');
      // Najít část HTML kolem sekcí s modely (větší kontext)
      const largerContextPattern = /<h2[^>]*id="gemini[^"]*"[\s\S]{0,10000}(?=<h2[^>]*id="gemini|$)/gi;
      const largerSections = htmlContent.match(largerContextPattern);
      if (largerSections && largerSections.length > 0) {
        relevantHtml = largerSections.join('\n').substring(0, 80000);
        console.log('[PRICE-UPDATER-LLM] Použita větší část HTML:', relevantHtml.length, 'znaků');
      }
    }
    
    progressCallback?.('Parsování HTML', 'Posílám HTML do LLM pro parsování...');
    
    // Vytvořit prompt pro LLM s HTML obsahem
    const prompt = `Jsi parser HTML stránky s cenami Gemini modelů. Tvá úloha je VÝHRADNĚ extrahovat přesné ceny z poskytnutého HTML kódu.

HTML obsah stránky (sekce s modely):
${relevantHtml}

INSTRUKCE PRO PARSOVÁNÍ:
1. Najdi každý model podle jeho ID (např. "gemini-2.5-flash") v HTML
2. Pro každý model najdi tabulku s cenami (obvykle v sekci "Standard" nebo "Paid Tier")
3. V tabulce najdi řádek "Input price" a "Output price"
4. Extrahuj přesné číselné hodnoty z těchto řádků (např. "$0.07" = 0.07, "$1.25" = 1.25)
5. Pokud model má více cen (např. "$1.25, prompts <= 200k tokens"), použij první cenu
6. Pokud model není v HTML nebo nemá ceny, vrať {"inputPrice": 0, "outputPrice": 0}

Modely k nalezení: ${knownModelNames.join(', ')}

Vrať POUZE JSON ve formátu (bez dalšího textu):
{
  "models": {
    "gemini-2.5-flash": {
      "inputPrice": 0.07,
      "outputPrice": 0.21,
      "description": "Rychlý a cenově efektivní multimodální model",
      "useCase": "Rychlé generování textu, analýza obrázků"
    },
    ...
  }
}

KRITICKÉ PRAVIDLA:
- POUŽIJ POUZE ceny z HTML - NEPOUŽÍVEJ své znalosti nebo staré informace
- Ceny musí být přesné čísla z HTML tabulek
- Pokud cena není v HTML, vrať 0 (ne hádej!)
- Všechny texty (description, useCase) musí být v češtině
- useCase musí být vyplněno pro každý model (i když je cena 0)`;

    const startTime = Date.now();
    const response = await generateContentWithSDK(llmModel, prompt);
    const endTime = Date.now();
    
    // Logování odpovědi od LLM pro debugging
    console.log('[PRICE-UPDATER-LLM] LLM odpověď (prvních 1000 znaků):', response.text.substring(0, 1000));
    
    // Zalogovat AI usage
    await addAIUsageLog(
      llmModel,
      'price-update-llm',
      response.usageMetadata?.promptTokenCount || 0,
      response.usageMetadata?.candidatesTokenCount || 0,
      response.usageMetadata?.totalTokenCount || 0,
      'sdk'
    );
    
    progressCallback?.('Parsování odpovědi', 'Zpracovávám JSON z LLM...');
    
    // Parsovat JSON odpověď - LLM může vrátit JSON v různých formátech
    let jsonText = response.text.trim();
    
    // Zkusit najít JSON v markdown code bloku (```json ... ``` nebo ``` ... ```)
    const markdownJsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (markdownJsonMatch) {
      const codeContent = markdownJsonMatch[1].trim();
      // Zkontrolovat, jestli obsah začíná {
      if (codeContent.startsWith('{')) {
        jsonText = codeContent;
      }
    }
    
    // Pokud ještě nemáme JSON, zkusit najít JSON objekt přímo v textu
    if (!jsonText.startsWith('{')) {
      // Najít první { a poslední } - musí být správně párovány
      const firstBrace = jsonText.indexOf('{');
      const lastBrace = jsonText.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonText = jsonText.substring(firstBrace, lastBrace + 1);
      } else {
        console.error('[PRICE-UPDATER-LLM] LLM odpověď:', jsonText.substring(0, 1000));
        throw new Error('LLM nevrátil validní JSON - nenalezen JSON objekt');
      }
    }
    
    // Vyčistit JSON od možných problémů
    jsonText = jsonText.trim();
    
    // Zkusit parsovat JSON
    let pricesData;
    try {
      pricesData = JSON.parse(jsonText);
    } catch (parseError: any) {
      console.error('[PRICE-UPDATER-LLM] Chyba při parsování JSON:', parseError);
      console.error('[PRICE-UPDATER-LLM] JSON text:', jsonText.substring(0, 500));
      throw new Error(`LLM nevrátil validní JSON: ${parseError.message}`);
    }
    
    if (!pricesData || !pricesData.models) {
      console.error('[PRICE-UPDATER-LLM] Data nejsou v očekávaném formátu:', pricesData);
      throw new Error('LLM nevrátil data v očekávaném formátu - chybí pole "models"');
    }
    
    const parsedModels = pricesData.models;
    progressCallback?.('Ceny načteny', `Získal ceny pro ${Object.keys(parsedModels).length} modelů z LLM`);
    
    // Přidat všechny modely z DEFAULT_GEMINI_MODELS, i když nebyly nalezeny
    const allParsedModels: Record<string, {
      name: string;
      inputPrice: number;
      outputPrice: number;
      description?: string;
      useCase?: string;
      foundOnPage?: boolean;
    }> = {};

    Object.entries(DEFAULT_GEMINI_MODELS).forEach(([modelName, defaultModel]) => {
      const parsedModel = parsedModels[modelName];

      // Fallback pro useCase
      let useCase = '';
      if (parsedModel?.useCase) {
        useCase = parsedModel.useCase;
      } else if (defaultModel.useCase) {
        useCase = defaultModel.useCase;
      } else {
        // Fallback podle názvu modelu
        if (modelName.includes('flash') || modelName.includes('lite')) {
          useCase = 'Rychlé generování textu, analýza obrázků';
        } else if (modelName.includes('pro')) {
          useCase = 'Komplexní úlohy, zpracování dlouhých dokumentů';
        } else if (modelName.includes('multimodal') || modelName.includes('vision')) {
          useCase = 'Multimodální úlohy, analýza obrázků';
        } else if (modelName.includes('audio') || modelName.includes('tts')) {
          useCase = 'Transkribce audio, zpracování zvuku';
        } else if (modelName.includes('embedding')) {
          useCase = 'Embeddingy, vektorové reprezentace';
        } else if (modelName.includes('ultra')) {
          useCase = 'Nejpokročilejší úlohy, složité úkoly vyžadující hlubokou úvahu';
        } else if (modelName.includes('robotics')) {
          useCase = 'Robotické úlohy, reasoning';
        } else {
          useCase = 'Všestranné použití';
        }
      }

      if (parsedModel) {
        allParsedModels[modelName] = {
          ...parsedModel,
          useCase: parsedModel.useCase || useCase,
          foundOnPage: true
        };
      } else {
        allParsedModels[modelName] = {
          name: modelName,
          inputPrice: defaultModel.inputPrice || 0,
          outputPrice: defaultModel.outputPrice || 0,
          description: defaultModel.description || '',
          useCase: useCase,
          foundOnPage: false
        };
      }
    });

    progressCallback?.('Ceny připraveny', `Celkem ${Object.keys(allParsedModels).length} modelů (${Object.keys(parsedModels).length} nalezeno LLM)`);

    // Aktualizovat aiModelsList
    progressCallback?.('Aktualizace seznamu modelů', `Zpracovávám ${knownModelNames.length} modelů...`);

    const allModelsList: Record<string, any> = {};
    const updateDate = new Date().toISOString().split('T')[0];

    knownModelNames.forEach((modelName) => {
      const defaultModel = DEFAULT_GEMINI_MODELS[modelName];
      const parsedModel = allParsedModels[modelName] || parsedModels[modelName];

      const inputPrice = parsedModel?.inputPrice !== undefined ? parsedModel.inputPrice : (defaultModel.inputPrice || 0);
      const outputPrice = parsedModel?.outputPrice !== undefined ? parsedModel.outputPrice : (defaultModel.outputPrice || 0);

      let useCase = (parsedModel?.useCase || defaultModel.useCase || '').trim();

      if (!useCase) {
        if (modelName.includes('flash') || modelName.includes('lite')) {
          useCase = 'Rychlé generování textu, analýza obrázků';
        } else if (modelName.includes('pro')) {
          useCase = 'Komplexní úlohy, zpracování dlouhých dokumentů';
        } else if (modelName.includes('multimodal') || modelName.includes('vision')) {
          useCase = 'Multimodální úlohy, analýza obrázků';
        } else if (modelName.includes('audio') || modelName.includes('tts')) {
          useCase = 'Transkribce audio, zpracování zvuku';
        } else if (modelName.includes('embedding')) {
          useCase = 'Embeddingy, vektorové reprezentace';
        } else if (modelName.includes('ultra')) {
          useCase = 'Nejpokročilejší úlohy, složité úkoly vyžadující hlubokou úvahu';
        } else {
          useCase = 'Všestranné použití';
        }
      }

      allModelsList[modelName] = {
        name: modelName,
        category: calculateModelCategory(inputPrice, outputPrice),
        inputPrice: inputPrice,
        outputPrice: outputPrice,
        description: (parsedModel?.description || defaultModel.description || '').trim(),
        useCase: useCase,
        lastPriceUpdate: updateDate
      };
    });

    progressCallback?.('Ukládání do databáze', 'Ukládám aktualizované modely...');

    await setDoc(
      doc(db, COLLECTION_NAME, 'aiModelsList'),
      {
        models: allModelsList,
        lastFullUpdate: new Date().toISOString(),
        updatedAt: Timestamp.now()
      }
    );

    // Aktualizovat pricing config
    progressCallback?.('Aktualizace pricing config', 'Aktualizuji ceny modelů...');
    
    const pricingDoc = await doc(db, COLLECTION_NAME, 'aiPricingConfig');
    const pricingDocSnap = await getDoc(pricingDoc);
    const pricingConfig = pricingDocSnap.data() || { models: {} };
    const updatedModels: string[] = [];
    const failedModels: string[] = [];

    for (const modelName of knownModelNames) {
      const parsedModel = parsedModels[modelName];
      const defaultModel = DEFAULT_GEMINI_MODELS[modelName];

      const inputPrice = parsedModel?.inputPrice !== undefined ? parsedModel.inputPrice : (defaultModel.inputPrice || 0);
      const outputPrice = parsedModel?.outputPrice !== undefined ? parsedModel.outputPrice : (defaultModel.outputPrice || 0);

      if (inputPrice === 0 && outputPrice === 0 && !modelName.includes('exp')) {
        failedModels.push(modelName);
        continue;
      }

      if (!pricingConfig.models) {
        pricingConfig.models = {};
      }

      let useCase = allModelsList[modelName]?.useCase || parsedModel?.useCase || defaultModel?.useCase || '';
      if (!useCase || useCase.trim() === '') {
        if (modelName.includes('flash') || modelName.includes('lite')) {
          useCase = 'Rychlé generování textu, analýza obrázků';
        } else if (modelName.includes('pro')) {
          useCase = 'Komplexní úlohy, zpracování dlouhých dokumentů';
        } else if (modelName.includes('multimodal') || modelName.includes('vision')) {
          useCase = 'Multimodální úlohy, analýza obrázků';
        } else if (modelName.includes('audio') || modelName.includes('tts')) {
          useCase = 'Transkribce audio, zpracování zvuku';
        } else if (modelName.includes('embedding')) {
          useCase = 'Embeddingy, vektorové reprezentace';
        } else if (modelName.includes('ultra')) {
          useCase = 'Nejpokročilejší úlohy, složité úkoly vyžadující hlubokou úvahu';
        } else {
          useCase = 'Všestranné použití';
        }
      }

      pricingConfig.models[modelName] = {
        ...pricingConfig.models[modelName],
        inputPrice,
        outputPrice,
        note: parsedModel?.description || defaultModel?.description || '',
        useCase: useCase.trim(),
        lastPriceUpdate: updateDate
      };

      updatedModels.push(modelName);
    }

    await setDoc(
      doc(db, COLLECTION_NAME, 'aiPricingConfig'),
      {
        ...pricingConfig,
        lastFullPriceUpdate: new Date().toISOString(),
        updatedAt: Timestamp.now()
      },
      { merge: true }
    );

    progressCallback?.('Dokončeno', `Aktualizováno ${updatedModels.length} modelů`);

    return {
      updated: updatedModels.length,
      failed: failedModels,
      totalModels: knownModelNames.length,
      parsedModels: allParsedModels
    };
  } catch (error: any) {
    console.error('[PRICE-UPDATER-LLM] Chyba při aktualizaci cen:', error);
    throw new Error(error.message || 'Nepodařilo se aktualizovat ceny modelů pomocí LLM');
  }
}
