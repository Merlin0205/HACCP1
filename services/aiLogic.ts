/**
 * Firebase AI Logic SDK Service
 * 
 * Inicializuje Firebase AI Logic SDK a poskytuje wrapper funkce
 * pro volání AI modelů s fallbackem na Cloud Functions
 */

import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import app from '../firebaseConfig';

// Inicializace Firebase AI Logic SDK
let aiInstance: ReturnType<typeof getAI> | null = null;

/**
 * Získá inicializovanou AI instanci
 */
export function getAIInstance() {
  if (!aiInstance) {
    try {
      aiInstance = getAI(app, {
        backend: new GoogleAIBackend(),
        // App Check se automaticky použije pokud je nastaven
      });
    } catch (error: any) {
      throw error;
    }
  }
  return aiInstance;
}

/**
 * Získá generativní model pro daný název modelu
 */
export function getModel(modelName: string) {
  const ai = getAIInstance();
  return getGenerativeModel(ai, { model: modelName });
}

/**
 * Usage metadata z AI Logic SDK response
 */
export interface AIUsageMetadata {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
}

/**
 * Response z AI volání
 */
export interface AIGenerateContentResponse {
  text: string;
  usageMetadata: AIUsageMetadata;
  /** Skutečně použitý model (může se lišit od požadovaného kvůli fallbacku při 429). */
  modelUsed: string;
}

/**
 * Wrapper pro generateContent s extrakcí usage metadata
 * @param timeout Timeout v milisekundách (default: 120000 = 2 minuty)
 */
export async function generateContentWithSDK(
  modelName: string,
  prompt: string | Array<string | { inlineData: { data: string; mimeType: string } }>,
  timeout: number = 120000 // 2 minuty default timeout
): Promise<AIGenerateContentResponse> {
  // Vytvořit AbortController pro timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  const isRateLimit429 = (err: any) => {
    const errAny = err as any;
    const msg = String(errAny?.message || '');
    const stack = String(errAny?.stack || '');
    const statusCandidate =
      errAny?.status ??
      errAny?.httpStatusCode ??
      errAny?.customData?.status ??
      errAny?.customData?.httpStatus ??
      errAny?.customData?.httpStatusCode ??
      errAny?.data?.status ??
      null;
    return (
      statusCandidate === 429 ||
      /\b429\b/.test(msg) ||
      /\b429\b/.test(stack) ||
      msg.includes('Too Many Requests') ||
      msg.includes('RESOURCE_EXHAUSTED') ||
      msg.toLowerCase().includes('overloaded')
    );
  };

  const doGenerate = async (modelToUse: string): Promise<AIGenerateContentResponse> => {
    const model = getModel(modelToUse);

    // Zkusit volat generateContent s timeout
    // Poznámka: Firebase AI Logic SDK nemusí podporovat AbortSignal přímo,
    // ale můžeme použít Promise.race pro timeout
    const generatePromise = model.generateContent(prompt);

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Timeout: Request trval déle než ${timeout / 1000} sekund`));
      }, timeout);
    });

    const result = await Promise.race([generatePromise, timeoutPromise]);
    const response = result.response;
    const text = response.text();

    // usageMetadata je vlastnost na response objektu, ne funkce
    const usageMetadata = response.usageMetadata || null;

    const promptTokenCount = usageMetadata?.promptTokenCount || 0;
    const candidatesTokenCount = usageMetadata?.candidatesTokenCount || 0;
    const totalTokenCount = usageMetadata?.totalTokenCount || 0;

    return {
      text,
      usageMetadata: {
        promptTokenCount,
        candidatesTokenCount,
        totalTokenCount,
      },
      modelUsed: modelToUse,
    };
  };

  try {
    const primary = modelName;
    const fallbackModels: string[] = [];

    // Pokud je model často přetížený, zkusit okamžitě alternativy (bez čekání)
    if (primary.includes('gemini-2.5-flash')) {
      fallbackModels.push('gemini-2.0-flash-exp', 'gemini-2.0-flash', 'gemini-2.5-flash-lite');
    } else if (primary.includes('gemini-2.5-pro')) {
      fallbackModels.push('gemini-2.5-flash', 'gemini-2.0-flash-exp', 'gemini-2.0-flash');
    } else if (primary.includes('gemini-2.0-flash-lite')) {
      fallbackModels.push('gemini-2.0-flash-exp', 'gemini-2.0-flash');
    }

    const uniqueModels = [primary, ...fallbackModels].filter((m, idx, arr) => arr.indexOf(m) === idx);

    let lastErr: any = null;
    for (let attempt = 0; attempt < uniqueModels.length; attempt++) {
      const modelToUse = uniqueModels[attempt];
      try {
        const result = await doGenerate(modelToUse);
        clearTimeout(timeoutId);

        return result;
      } catch (error: any) {
        lastErr = error;

        // Pokud je to timeout nebo abort error, poskytnout lepší zprávu
        if (error?.name === 'AbortError' || error?.message?.includes('aborted') || error?.message?.includes('Timeout')) {
          clearTimeout(timeoutId);
          throw new Error(`Request byl přerušen (timeout nebo abort). Zkuste zkrátit prompt nebo použít jiný model. Původní chyba: ${error?.message || 'Neznámá chyba'}`);
        }

        const errAny = error as any;
        const msg = String(errAny?.message || '');
        const is429 = isRateLimit429(error);

        // Pokud 429 a máme další fallback, pokračovat na další model
        if (is429 && attempt < uniqueModels.length - 1) {
          continue;
        }

        // Rate limit / overload (429) – typicky dočasné přetížení/kvóta Gemini API
        if (is429) {
          clearTimeout(timeoutId);
          throw new Error('AI je momentálně přetížená (429). Zkuste to prosím znovu za 20–60 sekund.');
        }

        // Firebase AI SDK někdy vrací fetch-error bez explicitního statusu (uživatel vidí 429 jen v Network)
        if (errAny?.code === 'fetch-error' && msg.includes('firebasevertexai')) {
          clearTimeout(timeoutId);
          throw new Error('AI je momentálně nedostupná (pravděpodobně přetížení/kvóta). Zkuste to prosím za chvilku znovu.');
        }

        clearTimeout(timeoutId);
        throw new Error(`Firebase AI Logic SDK selhalo: ${error?.message || 'Neznámá chyba'}. Kód: ${error?.code || 'N/A'}`);
      }
    }

    clearTimeout(timeoutId);
    throw lastErr || new Error('Neznámá chyba při volání AI.');
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Získá seznam dostupných modelů z SDK
 * Poznámka: Firebase AI Logic SDK nemá přímou metodu listModels()
 * Použijeme fallback na výchozí modely
 */
export async function listAvailableModels(): Promise<string[]> {
  // Firebase AI Logic SDK nemá přímou metodu listModels()
  // Vrátíme prázdný seznam a použijeme fallback na DEFAULT_GEMINI_MODELS
  // V budoucnu může být tato funkcionalita přidána do SDK
  return [];
}

