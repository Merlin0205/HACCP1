/**
 * Cloud Function pro přepis audia pomocí Gemini
 * Nahrazuje WebSocket implementaci z server/index.js
 */

import * as functions from 'firebase-functions';
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
  .https.onCall(async (data, context) => {
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
      const apiKey = functions.config().gemini?.api_key;
      if (!apiKey) {
        throw new functions.https.HttpsError('failed-precondition', 'Gemini API key not configured');
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
      const usage = response.usageMetadata || {};

      // Zalogovat usage
      await logAIUsage(
        userId,
        selectedModel,
        usage.promptTokenCount || 0,
        usage.candidatesTokenCount || 0,
        usage.totalTokenCount || 0
      );

      return {
        transcription: text,
        usage: {
          promptTokens: usage.promptTokenCount || 0,
          completionTokens: usage.candidatesTokenCount || 0,
          totalTokens: usage.totalTokenCount || 0
        }
      };
    } catch (error: any) {
      console.error('[transcribeAudio] Error:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

