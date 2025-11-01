/**
 * Cloud Function pro přepis audia pomocí Gemini
 * Nahrazuje WebSocket implementaci z server/index.js
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
      operation: 'audio-transcription',
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
 * Callable Cloud Function pro přepis audia
 */
export const transcribeAudio = functions
  .region('europe-west1')
  .https.onCall(async (data: any, context: functions.https.CallableContext) => {
    // Ověření autentifikace
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const { audioData, mimeType } = data;

    if (!audioData) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing audio data');
    }

    try {
      // Načíst model config
      const modelsDoc = await db.collection('settings').doc('aiModelsConfig').get();
      const modelsConfig = modelsDoc.data();
      const selectedModel = modelsConfig?.models?.['audio-transcription'] || 'gemini-2.0-flash-exp';

      // Inicializovat Gemini
      // Pro emulátory použít process.env, pro produkci functions.config()
      const apiKey = process.env.GEMINI_API_KEY || functions.config().gemini?.api_key;
      if (!apiKey) {
        throw new functions.https.HttpsError('failed-precondition', 'Gemini API key not configured. Set GEMINI_API_KEY in functions/.env for emulators or use firebase functions:config:set for production.');
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: selectedModel });

      // Přepsat audio
      const result = await model.generateContent([
        {
          inlineData: {
            mimeType: mimeType || 'audio/webm',
            data: audioData
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
        promptTokens,
        completionTokens,
        totalTokens
      );

      return {
        transcription: text,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens
        }
      };
    } catch (error: any) {
      console.error('[transcribeAudio] Error:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

