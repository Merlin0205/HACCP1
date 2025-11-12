/**
 * Cloud Function pro parsing cen Gemini modelů z oficiální stránky
 * https://ai.google.dev/gemini-api/docs/pricing
 * 
 * Struktura HTML:
 * - <div class="models-section"><div class="heading-group"><h2 id="gemini-2.5-pro">Gemini 2.5 Pro</h2><em><code>gemini-2.5-pro</code></em></div></div>
 * - <p>Description text...</p>
 * - <devsite-selector><section role="tabpanel" data-tab="standard"><div class="devsite-table-wrapper"><table class="pricing-table">...</table></section></devsite-selector>
 * - Tabulka má strukturu: <thead><tr><th></th><th>Free Tier</th><th>Paid Tier, per 1M tokens in USD</th></tr></thead>
 * - <tbody><tr><td>Input price</td><td>Free of charge</td><td>$1.25, prompts <= 200k tokens<br>$2.50, prompts > 200k tokens</td></tr></tbody>
 * - Paid Tier je třetí sloupec (index 2)
 */

import * as functions from 'firebase-functions/v1';
import * as cheerio from 'cheerio';

interface ModelPricing {
  name: string;
  inputPrice: number;
  outputPrice: number;
  audioInputPrice?: number;
  imageInputPrice?: number;
  description?: string;
  useCase?: string;
}

interface ParsePricingResponse {
  models: Record<string, ModelPricing>;
  success: boolean;
  error?: string;
}

/**
 * Extrahuje cenu z textu (např. "$1.25" nebo "$1.25, prompts <= 200k tokens" -> 1.25)
 * Vezme první cenu před <br> nebo čárkou
 */
function extractPrice(text: string): number {
  if (!text) return 0;
  
  // Odstranit HTML tagy a vzít první řádek
  const firstLine = text.split(/<br\s*\/?>|,|\n/)[0].trim();
  
  // Najít cenu v formátu $číslo
  const match = firstLine.match(/\$([\d.]+)/);
  if (!match) {
    return 0;
  }
  
  const price = parseFloat(match[1]);
  return isNaN(price) ? 0 : price;
}

/**
 * Extrahuje audio input cenu z textu (např. "$0.30 (text / image / video)$1.00 (audio)" -> 1.00)
 * Hledá cenu následovanou "(audio)" nebo podobným textem
 */
function extractAudioPrice(text: string): number | undefined {
  if (!text) return undefined;
  
  // Najít všechny ceny v textu
  const priceMatches = text.matchAll(/\$([\d.]+)\s*\([^)]*audio[^)]*\)/gi);
  const matches = Array.from(priceMatches);
  
  if (matches.length > 0) {
    const price = parseFloat(matches[0][1]);
    return isNaN(price) ? undefined : price;
  }
  
  return undefined;
}

/**
 * Extrahuje image input cenu z textu (většinou stejná jako text, ale může být specifikována)
 * Pokud není specifikována, vrátí undefined (bude použita inputPrice)
 */
function extractImagePrice(text: string): number | undefined {
  if (!text) return undefined;
  
  // Pokud text obsahuje "(text / image / video)", použít první cenu
  // Jinak vrátit undefined (bude použita inputPrice)
  const match = text.match(/\$([\d.]+)\s*\([^)]*(?:text|image|video)[^)]*\)/i);
  if (match) {
    const price = parseFloat(match[1]);
    return isNaN(price) ? undefined : price;
  }
  
  return undefined;
}

/**
 * Najde cenu v tabulce pro daný řádek
 * Tabulka má strukturu: Free Tier | Paid Tier (index 2)
 */
function findPriceInTable($: cheerio.CheerioAPI, table: cheerio.Cheerio<any>, rowText: string): number {
  if (table.length === 0) {
    return 0;
  }
  
  const tbody = table.find('tbody');
  if (tbody.length === 0) {
    return 0;
  }
  
  const rows = tbody.find('tr');
  const row = rows.filter((i: number, el: any) => {
    const text = $(el).find('td').first().text().toLowerCase();
    return text.includes(rowText.toLowerCase());
  });
  
  if (row.length === 0) {
    return 0;
  }
  
  // Paid Tier je třetí sloupec (index 2)
  const paidTierCell = row.find('td').eq(2);
  if (paidTierCell.length === 0) {
    return 0;
  }
  
  // Získat HTML obsah buňky (aby se zachovaly <br> tagy)
  const cellHtml = paidTierCell.html() || '';
  const price = extractPrice(cellHtml);
  
  return price;
}

/**
 * Najde audio input cenu v tabulce pro řádek "Input price"
 */
function findAudioPriceInTable($: cheerio.CheerioAPI, table: cheerio.Cheerio<any>): number | undefined {
  if (table.length === 0) {
    return undefined;
  }
  
  const tbody = table.find('tbody');
  if (tbody.length === 0) {
    return undefined;
  }
  
  const rows = tbody.find('tr');
  const row = rows.filter((i: number, el: any) => {
    const text = $(el).find('td').first().text().toLowerCase();
    return text.includes('input price');
  });
  
  if (row.length === 0) {
    return undefined;
  }
  
  const paidTierCell = row.find('td').eq(2);
  if (paidTierCell.length === 0) {
    return undefined;
  }
  
  const cellHtml = paidTierCell.html() || '';
  return extractAudioPrice(cellHtml);
}

/**
 * Najde image input cenu v tabulce pro řádek "Input price"
 */
function findImagePriceInTable($: cheerio.CheerioAPI, table: cheerio.Cheerio<any>): number | undefined {
  if (table.length === 0) {
    return undefined;
  }
  
  const tbody = table.find('tbody');
  if (tbody.length === 0) {
    return undefined;
  }
  
  const rows = tbody.find('tr');
  const row = rows.filter((i: number, el: any) => {
    const text = $(el).find('td').first().text().toLowerCase();
    return text.includes('input price');
  });
  
  if (row.length === 0) {
    return undefined;
  }
  
  const paidTierCell = row.find('td').eq(2);
  if (paidTierCell.length === 0) {
    return undefined;
  }
  
  const cellHtml = paidTierCell.html() || '';
  return extractImagePrice(cellHtml);
}

/**
 * Vyčistí text od neviditelných znaků a přebytečných mezer
 */
function cleanText(text: string): string {
  return text
    .replace(/\u00A0/g, ' ') // Non-breaking space
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

/**
 * Najde useCase podle názvu modelu (fallback)
 */
function inferUseCase(modelName: string): string {
  const lower = modelName.toLowerCase();
  
  if (lower.includes('flash') || lower.includes('lite')) {
    return 'Rychlé generování textu, analýza obrázků';
  } else if (lower.includes('pro')) {
    return 'Komplexní úlohy, zpracování dlouhých dokumentů';
  } else if (lower.includes('multimodal') || lower.includes('vision') || lower.includes('image')) {
    return 'Multimodální úlohy, analýza obrázků';
  } else if (lower.includes('audio') || lower.includes('tts')) {
    return 'Transkribce audio, zpracování zvuku';
  } else if (lower.includes('embedding')) {
    return 'Embeddingy, vektorové reprezentace';
  } else if (lower.includes('ultra')) {
    return 'Nejpokročilejší úlohy, složité úkoly vyžadující hlubokou úvahu';
  } else if (lower.includes('robotics')) {
    return 'Robotické úlohy, reasoning';
  } else if (lower.includes('computer-use')) {
    return 'Počítačové úlohy, interakce s aplikacemi';
  } else {
    return 'Všestranné použití';
  }
}

/**
 * Parsuje HTML stránku s cenami Gemini modelů
 * Používá strukturu HTML: H2 -> code (model_id) -> section (Standard) -> table (pricing-table)
 */
export const parseGeminiPricing = functions
  .region('europe-west1')
  .https.onCall(async (data: any, context: functions.https.CallableContext) => {
    try {
      // Ověření autentizace
      if (!context || !context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Uživatel musí být přihlášen');
      }

      const url = 'https://ai.google.dev/gemini-api/docs/pricing';
      console.log('[parseGeminiPricing] Začínám parsing cen z:', url);
      
      // Načíst HTML stránku
      console.log('[parseGeminiPricing] Načítám HTML stránku...');
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; FirebaseFunctionsBot/1.0)'
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const html = await response.text();
      console.log('[parseGeminiPricing] HTML načteno, délka:', html.length, 'znaků');
      const $ = cheerio.load(html);
      
      // Najít root element (main nebo body)
      const $root = $('main').length ? $('main') : $('body');
      
      const models: Record<string, ModelPricing> = {};
      console.log('[parseGeminiPricing] Začínám parsování modelů...');
      
      // Projít všechny H2 nadpisy (sekce s modely)
      $root.find('h2').each((_, h2) => {
        const h2Text = cleanText($(h2).text());
        if (!h2Text) return;
        
        const lower = h2Text.toLowerCase();
        
        // Přeskočit obecné sekce
        if (['free', 'paid', 'enterprise', 'overview', 'introduction'].includes(lower)) {
          return;
        }
        
        // Přeskočit pokud není Gemini model (nemá "gemini" v textu nebo id)
        const h2Id = $(h2).attr('id') || '';
        if (!h2Text.toLowerCase().includes('gemini') && !h2Id.includes('gemini')) {
          return;
        }
        
        console.log('[parseGeminiPricing] Zpracovávám sekci:', h2Text);
        
        // Najít model_id z <code> elementu hned po H2
        // Struktura: <h2>...</h2><em><code>gemini-2.5-pro</code></em>
        let modelId: string | undefined;
        
        // Zkusit najít code element v rodiči nebo hned po H2
        const h2Parent = $(h2).parent();
        const codeElement = h2Parent.find('code').first();
        
        if (codeElement.length > 0) {
          const codeText = cleanText(codeElement.text());
          if (codeText && codeText.includes('gemini-')) {
            modelId = codeText.toLowerCase();
            console.log('[parseGeminiPricing]   Nalezen model_id:', modelId);
          }
        }
        
        // Pokud není v rodiči, zkusit najít v následujících elementech
        if (!modelId) {
          let $walker = $(h2).next();
          let walkerCount = 0;
          
          while ($walker.length && walkerCount < 5) {
            const codeInWalker = $walker.find('code').first();
            if (codeInWalker.length > 0) {
              const codeText = cleanText(codeInWalker.text());
              if (codeText && codeText.includes('gemini-')) {
                modelId = codeText.toLowerCase();
                console.log('[parseGeminiPricing]   Nalezen model_id v walker:', modelId);
                break;
              }
            }
            $walker = $walker.next();
            walkerCount++;
          }
        }
        
        // Pokud stále není model_id, přeskočit tuto sekci
        if (!modelId) {
          console.log('[parseGeminiPricing]   ⚠️ Model_id nenalezen, přeskakuji sekci');
          return;
        }
        
        // Najít tabulku s cenami v sekci "Standard"
        // Struktura: <devsite-selector><section role="tabpanel" data-tab="standard"><div class="devsite-table-wrapper"><table class="pricing-table">
        let inputPrice = 0;
        let outputPrice = 0;
        let audioInputPrice: number | undefined = undefined;
        let imageInputPrice: number | undefined = undefined;
        
        // Najít rozsah od tohoto H2 do dalšího H2
        const nextH2 = $(h2).nextAll('h2').first();
        const sectionRange = nextH2.length 
          ? $(h2).nextUntil(nextH2)
          : $(h2).nextAll();
        
        // Najít devsite-selector v tomto rozsahu
        const devsiteSelector = sectionRange.filter('devsite-selector').first();
        
        if (devsiteSelector.length > 0) {
          // Najít section s data-tab="standard" v devsite-selector
          const standardSection = devsiteSelector.find('section[role="tabpanel"][data-tab="standard"]').first();
          
          if (standardSection.length > 0) {
            // Najít tabulku v devsite-table-wrapper
            const table = standardSection.find('table.pricing-table').first();
            
            if (table.length > 0) {
              console.log('[parseGeminiPricing]   ✅ Nalezena Standard tabulka pro', modelId);
              
              inputPrice = findPriceInTable($, table, 'Input price');
              outputPrice = findPriceInTable($, table, 'Output price');
              audioInputPrice = findAudioPriceInTable($, table);
              imageInputPrice = findImagePriceInTable($, table);
              
              if (inputPrice > 0 || outputPrice > 0) {
                console.log('[parseGeminiPricing]   Nalezeny ceny - Input:', inputPrice, 'Output:', outputPrice, 'Audio Input:', audioInputPrice, 'Image Input:', imageInputPrice);
              }
            } else {
              console.log('[parseGeminiPricing]   ⚠️ Tabulka nenalezena v standard section');
            }
          } else {
            console.log('[parseGeminiPricing]   ⚠️ Standard section nenalezena v devsite-selector');
          }
        } else {
          // Fallback: zkusit najít přímo section s data-tab="standard"
          const standardSection = sectionRange.filter('section[role="tabpanel"][data-tab="standard"]').first();
          
          if (standardSection.length > 0) {
            const table = standardSection.find('table.pricing-table').first();
            
            if (table.length > 0) {
              console.log('[parseGeminiPricing]   ✅ Nalezena Standard tabulka (fallback) pro', modelId);
              
              inputPrice = findPriceInTable($, table, 'Input price');
              outputPrice = findPriceInTable($, table, 'Output price');
              audioInputPrice = findAudioPriceInTable($, table);
              imageInputPrice = findImagePriceInTable($, table);
              
              if (inputPrice > 0 || outputPrice > 0) {
                console.log('[parseGeminiPricing]   Nalezeny ceny - Input:', inputPrice, 'Output:', outputPrice, 'Audio Input:', audioInputPrice, 'Image Input:', imageInputPrice);
              }
            }
          } else {
            console.log('[parseGeminiPricing]   ⚠️ Devsite-selector ani standard section nenalezeny');
          }
        }
        
        // Najít description z prvního odstavce po H2 (před tabulkou)
        let description: string | undefined;
        let $walker = $(h2).next();
        let walkerCount = 0;
        
        while ($walker.length && walkerCount < 10) {
          const tagName = ($walker.prop('tagName') || '').toLowerCase();
          
          // Pokud narazíme na section nebo další H2, skončit
          if (tagName === 'section' || tagName === 'h2') {
            break;
          }
          
          // Přeskočit code elementy a H3
          if (tagName === 'code' || tagName === 'h3' || tagName === 'em') {
            $walker = $walker.next();
            walkerCount++;
            continue;
          }
          
          const text = cleanText($walker.text());
          if (text && text.length > 20 && !text.toLowerCase().includes('try it in google ai studio')) {
            // Vzít první řádek jako description
            description = text.split('\n').find(l => l.trim().length > 0)?.trim();
            if (description && description.length > 20) {
              console.log('[parseGeminiPricing]   Nalezen description:', description.substring(0, 50) + '...');
              break;
            }
          }
          
          $walker = $walker.next();
          walkerCount++;
        }
        
        // Přidat model pouze pokud máme model_id a alespoň nějaké ceny nebo description
        if (modelId && (inputPrice > 0 || outputPrice > 0 || description)) {
          const useCase = inferUseCase(modelId);
          
          models[modelId] = {
            name: modelId,
            inputPrice: inputPrice,
            outputPrice: outputPrice,
            audioInputPrice: audioInputPrice,
            imageInputPrice: imageInputPrice,
            description: description || undefined,
            useCase: useCase
          };
          
          console.log('[parseGeminiPricing] ✅ Model přidán:', modelId, '- Input:', inputPrice, 'Output:', outputPrice);
        } else {
          console.log('[parseGeminiPricing]   ⚠️ Model přeskočen - chybí ceny i description');
        }
      });
      
      console.log('[parseGeminiPricing] Parsování dokončeno. Celkem nalezeno modelů:', Object.keys(models).length);
      console.log('[parseGeminiPricing] Nalezené modely:', Object.keys(models).join(', '));
      
      return {
        models,
        success: true
      } as ParsePricingResponse;
      
    } catch (error: any) {
      console.error('[parseGeminiPricing] Chyba:', error);
      
      // Pokud už je HttpsError, vyhodit ho dál
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      
      // Jinak vytvořit nový HttpsError
      throw new functions.https.HttpsError(
        'internal',
        error.message || 'Nepodařilo se parsovat ceny z oficiální stránky'
      );
    }
  });
