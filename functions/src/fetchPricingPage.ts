/**
 * Cloud Function pro načtení HTML stránky s cenami Gemini modelů
 * Používá se pro LLM parsing (kvůli CORS)
 */

import * as functions from 'firebase-functions/v1';

/**
 * Cloud Function pro načtení HTML stránky s cenami Gemini modelů
 * Používá se pro LLM parsing (kvůli CORS)
 */
export const fetchPricingPage = functions
  .region('europe-west1')
  .https.onCall(async (data: any, context: functions.https.CallableContext) => {
    try {
      // Ověření autentizace
      if (!context || !context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Uživatel musí být přihlášen');
      }

      const url = 'https://ai.google.dev/gemini-api/docs/pricing?hl=en';
      console.log('[fetchPricingPage] Načítám HTML stránku:', url);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; FirebaseFunctionsBot/1.0)',
          'Accept-Language': 'en-US,en;q=0.9' // Zajistit anglickou verzi stránky
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const html = await response.text();
      console.log('[fetchPricingPage] HTML načteno, délka:', html.length, 'znaků');
      
      return { html, success: true };
    } catch (error: any) {
      console.error('[fetchPricingPage] Chyba:', error);
      
      // Pokud už je HttpsError, vyhodit ho dál
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      
      // Jinak vytvořit nový HttpsError
      throw new functions.https.HttpsError(
        'internal',
        error.message || 'Nepodařilo se načíst HTML stránku'
      );
    }
  });

