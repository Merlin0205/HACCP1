import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AuditData, AuditStructure, PhotoWithAnalysis, AIUsage, AIResponse, AuditHeaderValues } from './types';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.warn("API_KEY environment variable not set. Using a placeholder.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// Prices per 1 million tokens (approximations based on public data)
const MODEL_PRICES: { [key: string]: { input: number; output: number } } = {
    'gemini-2.5-pro': { input: 3.50, output: 7.00 },
    'gemini-2.5-flash': { input: 0.35, output: 0.70 },
    'gemini-flash-lite-latest': { input: 0.35, output: 0.70 },
};
const USD_TO_CZK_RATE = 23; // Current rate

function calculateUsage(response: GenerateContentResponse, model: string): AIUsage | null {
    const usageMetadata = response.usageMetadata;
    if (!usageMetadata || !usageMetadata.promptTokenCount || !usageMetadata.candidatesTokenCount || !usageMetadata.totalTokenCount) {
        return null;
    }

    const { promptTokenCount, candidatesTokenCount, totalTokenCount } = usageMetadata;
    const prices = MODEL_PRICES[model];
    if (!prices) {
        return {
            inputTokens: promptTokenCount,
            outputTokens: candidatesTokenCount,
            totalTokens: totalTokenCount,
            costUSD: 0,
            costCZK: 0,
            model: model,
        };
    }

    const inputCost = (promptTokenCount / 1_000_000) * prices.input;
    const outputCost = (candidatesTokenCount / 1_000_000) * prices.output;
    const totalCostUSD = inputCost + outputCost;
    const totalCostCZK = totalCostUSD * USD_TO_CZK_RATE;

    return {
        inputTokens: promptTokenCount,
        outputTokens: candidatesTokenCount,
        totalTokens: totalTokenCount,
        costUSD: totalCostUSD,
        costCZK: totalCostCZK,
        model: model,
    };
}


export const analyzeImageWithAI = async (base64Image: string, mimeType: string): Promise<AIResponse<string>> => {
    const model = 'gemini-2.5-flash';
    const prompt = `Jste expert na HACCP. Detailně analyzujte tento obrázek z potravinářského provozu. Odpovězte v ČESKÉM JAZYCE a použijte jednoduché HTML tagy pro formátování (<p>, <strong>, <ul>, <li>). Struktura odpovědi:

<p><strong>Popis:</strong> Stručný popis toho, co je na obrázku.</p>
<p><strong>Identifikovaná rizika:</strong></p>
<ul><li>Všechna potenciální hygienická nebo bezpečnostní rizika.</li></ul>
<p><strong>Doporučení:</strong></p>
<ul><li>Konkrétní nápravná opatření pro každé zjištěné riziko.</li></ul>`;
    
    try {
        const imagePart = {
            inlineData: {
                mimeType,
                data: base64Image
            }
        };

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: model,
            contents: [{ parts: [ {text: prompt}, imagePart] }],
        });
        
        if (!response.text) {
             if (response.candidates && response.candidates[0]?.finishReason === 'SAFETY') {
                 throw new Error("Odpověď byla zablokována z bezpečnostních důvodů.");
            }
            throw new Error("API nevrátilo žádný text.");
        }

        return {
            result: response.text,
            usage: calculateUsage(response, model),
        }
    } catch (error) {
        console.error(`Error analyzing image with ${model}:`, error);
        throw new Error(`Analýza obrázku se nezdařila: ${error instanceof Error ? error.message : 'Neznámá chyba'}.`);
    }
};

export const generateReportConclusionWithAI = async (
    nonCompliantItems: any[],
    headerValues: AuditHeaderValues,
): Promise<AIResponse<string>> => {
    const model = 'gemini-2.5-flash'; // Faster and cheaper model for a smaller task

    const nonCompliancesSummary = nonCompliantItems.map(item => {
        const ncDetails = item.nonComplianceData.map((nc: any, index: number) => `
            - Detail neshody ${index + 1}:
              - Místo: ${nc.location || '(neuvedeno)'}
              - Zjištění: ${nc.finding || '(bez popisu)'}
              - Doporučení: ${nc.recommendation || '(bez doporučení)'}
              - Fotografie: ${nc.photos && nc.photos.length > 0 ? `Ano (${nc.photos.length})` : 'Ne'}
        `).join('');

        return `
            Oblast kontroly: ${item.title}
            Požadavek: ${item.description}
            ${ncDetails}
        `;
    }).join('\n---\n');

    const prompt = `
        Jste expert na HACCP s hlubokou znalostí aktuální legislativy platné v České republice a nadřazených nařízení EU.
        Na základě následujících dat z auditu vygenerujte profesionální slovní hodnocení pro finální zprávu.
        Vytvořte POUZE textový obsah pro sekce "VÝSLEDEK AUDITU" a "ZÁVĚR".
        Formátujte výstup jako čisté HTML (používejte tagy <p>, <ul>, <li>, <strong>, <h3>). NEZAHRNUJTE samotné nadpisy "VÝSLEDEK AUDITU", ty už jsou v šabloně.
        Začněte přímo prvním odstavcem pro VÝSLEDEK AUDITU.

        **Základní informace o auditu:**
        - Název provozovny: ${headerValues.premise_name || '(neuvedeno)'}
        - Adresa: ${headerValues.premise_address || '(neuvedeno)'}
        - Provozovatel: ${headerValues.operator_name || '(neuvedeno)'}
        - Datum auditu: ${headerValues.audit_date || '(neuvedeno)'}

        **Souhrn zjištěných neshod (formát Markdown):**
        ${nonCompliancesSummary}

        **Váš úkol:**
        1.  Napište text pro **VÝSLEDEK AUDITU**: Začněte standardní větou o provedení auditu (např. "Dne XY byl proveden audit v provozovně XY..."). Poté srozumitelně a profesionálně shrňte zjištěné neshody uvedené výše. Zmiňte klíčové problémové oblasti. Strukturujte text do několika logických odstavců (<p>).
        2.  Vložte speciální HTML komentář: \`<!-- ZAVER_START -->\`
        3.  Napište text pro **ZÁVĚR**: Na základě zjištěných skutečností formulujte celkový závěr a doporučení k realizaci nápravných opatření. Důrazně upozorněte na nutnost odstranění zjištěných neshod. Tento text uveďte nadpisem \`<h3>ZÁVĚR</h3>\` a strukturujte jej také do odstavců.
    `;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: [{ parts: [{ text: prompt }] }],
        });
        
        let reportText = response.text.trim();
        // Clean up potential markdown code fences
        if (reportText.startsWith('```html')) {
            reportText = reportText.substring(7, reportText.length - 3).trim();
        } else if (reportText.startsWith('html')) {
            reportText = reportText.substring(4).trim();
        }
        
        if (!reportText) {
             if (response.candidates && response.candidates[0]?.finishReason === 'SAFETY') {
                 throw new Error("Odpověď byla zablokována z bezpečnostních důvodů.");
            }
            throw new Error("API nevrátilo žádný text.");
        }
        
        return {
            result: reportText,
            usage: calculateUsage(response, model),
        };
    } catch (error) {
        console.error(`Error generating report conclusion with ${model}:`, error);
        throw new Error(`Generování závěru reportu se nezdařilo: ${error instanceof Error ? error.message : 'Neznámá chyba'}.`);
    }
};


export const transcribeAudioWithAI = async (base64Audio: string, mimeType: string): Promise<AIResponse<string>> => {
    const model = 'gemini-2.5-flash';
    const prompt = "Přepiš tento zvukový záznam v češtině. Vrať pouze čistý přepis bez jakýchkoli dalších komentářů nebo formátování.";

    try {
        const audioPart = {
            inlineData: {
                mimeType,
                data: base64Audio,
            },
        };

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: model,
            contents: [{ parts: [{ text: prompt }, audioPart] }],
        });

        const text = response.text;
        
        if (!text) {
            if (response.candidates && response.candidates[0]?.finishReason === 'SAFETY') {
                 throw new Error("Přepis byl zablokován z bezpečnostních důvodů.");
            }
            throw new Error("Odpověď z API neobsahovala platný text nebo byla prázdná.");
        }

        return {
            result: text.trim(),
            usage: calculateUsage(response, model),
        };
    } catch (error) {
        console.error(`Error transcribing audio with ${model}:`, error);
        throw new Error(`Přepis zvuku se nezdařil: ${error instanceof Error ? error.message : 'Neznámá chyba'}.`);
    }
};