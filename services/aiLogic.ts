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
      console.error('[AI Logic SDK] ❌ Chyba při inicializaci SDK:', {
        message: error?.message,
        code: error?.code,
        name: error?.name,
      });
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
}

/**
 * Wrapper pro generateContent s extrakcí usage metadata
 */
export async function generateContentWithSDK(
  modelName: string,
  prompt: string | Array<string | { inlineData: { data: string; mimeType: string } }>
): Promise<AIGenerateContentResponse> {
  try {
    const model = getModel(modelName);
    const result = await model.generateContent(prompt);
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
    };
  } catch (error: any) {
    const errorDetails = {
      message: error?.message,
      code: error?.code,
      name: error?.name,
      stack: error?.stack,
    };
    console.error('[AI Logic SDK] ❌ Chyba při generování obsahu:', errorDetails);
    throw new Error(`Firebase AI Logic SDK selhalo: ${error?.message || 'Neznámá chyba'}. Kód: ${error?.code || 'N/A'}`);
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

