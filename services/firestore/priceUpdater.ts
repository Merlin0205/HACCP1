/**
 * Služba pro aktualizaci cen Gemini modelů z internetu pomocí LLM
 * Volá Cloud Functions místo přímého Gemini API
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebaseConfig';

/**
 * Cloud Function reference
 */
const updateGeminiPricesFunction = httpsCallable(functions, 'updateGeminiPrices');

/**
 * Aktualizuje ceny Gemini modelů pomocí LLM přes Cloud Functions
 * LLM volání je zalogováno do aiUsageLogs
 */
export async function updateGeminiPricesFromWeb(): Promise<{
  updated: number;
  failed: string[];
}> {
  try {
    const result = await updateGeminiPricesFunction({});
    const response = result.data as { updated: number; failed: string[] };
    return response;
  } catch (error: any) {
    console.error('[PRICE-UPDATER] Chyba při volání Cloud Functions:', error);
    throw new Error(error.message || 'Nepodařilo se aktualizovat ceny modelů');
  }
}

