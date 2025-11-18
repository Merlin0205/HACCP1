import * as functions from 'firebase-functions/v1';

/**
 * Cloud Function pro stažení obrázku a vrácení jako Base64
 * Řeší CORS problémy při generování PDF na klientovi
 */
export const proxyImage = functions
  .region('europe-west1')
  .runWith({
    timeoutSeconds: 30,
    memory: '256MB'
  })
  .https.onCall(async (data: any, context: functions.https.CallableContext) => {
    // Ověření autentifikace
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'The function must be called while authenticated.'
      );
    }

    const { url } = data;

    if (!url || typeof url !== 'string') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'The function must be called with one argument "url" containing the image URL.'
      );
    }

    try {
      console.log(`[proxyImage] Fetching image: ${url}`);
      
      // Použití nativního fetch (Node.js 18+)
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');
      
      console.log(`[proxyImage] Image fetched successfully, size: ${base64.length} chars`);
      
      return {
        base64,
        contentType,
        dataUrl: `data:${contentType};base64,${base64}`
      };
    } catch (error: any) {
      console.error('[proxyImage] Error:', error);
      throw new functions.https.HttpsError('internal', `Error fetching image: ${error.message}`);
    }
  });

