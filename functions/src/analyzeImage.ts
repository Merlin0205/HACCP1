/**
 * Cloud Function pro analýzu obrázků pomocí Gemini
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';

const db = admin.firestore();

/**
 * Zaloguje AI usage
 */
async function logAIUsage(
  userId: string,
  model: string,
  operation: string,
  promptTokens: number,
  completionTokens: number,
  totalTokens: number
) {
  try {
    // Vypočítat náklady
    const pricingDoc = await db.collection('settings').doc('aiPricingConfig').get();
    const config = pricingDoc.data();
    
    let costUsd = 0;
    let costCzk = 0;
    
    if (config) {
      const pricing = config.models?.[model];
      const usdToCzk = config.usdToCzk || 25;
      
      if (pricing) {
        const inputCost = (promptTokens / 1000000) * (pricing.inputPrice || 0);
        const outputCost = (completionTokens / 1000000) * (pricing.outputPrice || 0);
        costUsd = inputCost + outputCost;
        costCzk = costUsd * usdToCzk;
      }
    }

    await db.collection('aiUsageLogs').add({
      userId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      model,
      operation,
      promptTokens: promptTokens || 0,
      completionTokens: completionTokens || 0,
      totalTokens: totalTokens || 0,
      costUsd,
      costCzk
    });
  } catch (error) {
    console.error('[logAIUsage] Error:', error);
  }
}

/**
 * Callable Cloud Function pro analýzu obrázků
 */
export const analyzeImage = functions
  .region('europe-west1')
  .https.onCall(async (data: any, context: functions.https.CallableContext) => {
    // Ověření autentifikace
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const { imageData, mimeType } = data;

    if (!imageData) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing image data');
    }

    try {
      // Načíst model config
      const modelsDoc = await db.collection('settings').doc('aiModelsConfig').get();
      const modelsConfig = modelsDoc.data();
      const selectedModel = modelsConfig?.models?.['image-analysis'] || 'gemini-2.5-flash';

      // Inicializovat Gemini
      // Použít process.env (načte se z .env nebo Firebase Secrets)
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new functions.https.HttpsError(
          'failed-precondition', 
          'Gemini API key not configured. Set GEMINI_API_KEY in functions/.env for local development or use Firebase Secrets for production.'
        );
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: selectedModel });

      // Analyzovat obrázek
      const prompt = "Analyzuj tuto fotografii z potravinářského provozu. Popiš, co na ní je, a identifikuj případná hygienická rizika nebo neshody s HACCP. Buď stručný a věcný.";
      
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: mimeType || 'image/jpeg',
            data: imageData
          }
        }
      ]);

      const response = result.response;
      const text = response.text();
      const usageMetadata = response.usageMetadata as any || {};
      const promptTokens = usageMetadata.promptTokenCount || 0;
      const completionTokens = usageMetadata.candidatesTokenCount || 0;
      const totalTokens = usageMetadata.totalTokenCount || 0;

      // Zalogovat usage
      await logAIUsage(
        userId,
        selectedModel,
        'image-analysis',
        promptTokens,
        completionTokens,
        totalTokens
      );

      return {
        analysis: text,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens
        }
      };
    } catch (error: any) {
      console.error('[analyzeImage] Error:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

