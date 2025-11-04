/**
 * Cloud Function pro aktualizaci cen Gemini modelů pomocí LLM
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
 * Callable Cloud Function pro aktualizaci cen modelů
 */
export const updateGeminiPrices = functions
  .region('europe-west1')
  .https.onCall(async (data: any, context: functions.https.CallableContext) => {
    // Ověření autentifikace
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;

    try {
      // Načíst seznam všech modelů
      const allModelsDoc = await db.collection('settings').doc('aiModelsList').get();
      const allModelsData = allModelsDoc.data();
      const modelNames = Object.keys(allModelsData?.models || {});

      if (modelNames.length === 0) {
        throw new functions.https.HttpsError('failed-precondition', 'Žádné modely k aktualizaci');
      }

      // Načíst model config pro výběr modelu pro text generování
      const modelsDoc = await db.collection('settings').doc('aiModelsConfig').get();
      const modelsConfig = modelsDoc.data();
      const textModelName = modelsConfig?.models?.['text-generation'] || 'gemini-2.5-flash';

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
      const model = genAI.getGenerativeModel({ model: textModelName });

      // Vytvořit prompt pro LLM
      const prompt = `Najdi aktuální ceny pro následující Gemini modely z oficiální dokumentace Google AI (ai.google.dev). 
Pro každý model potřebuji ceny za 1 milion tokenů pro input a output.

Modely: ${modelNames.join(', ')}

Vrať JSON ve formátu:
{
  "models": {
    "gemini-2.5-flash": {
      "inputPrice": 0.15,
      "outputPrice": 2.5,
      "note": "Volitelně nějaká poznámka"
    },
    ...
  }
}

Pokud najdeš ceny, vrať je přesně v tomto formátu. Pokud nějaký model nenajdeš, vrať pro něj {"inputPrice": 0, "outputPrice": 0}.`;

      let promptTokens = 0;
      let completionTokens = 0;
      let totalTokens = 0;
      let pricesData: any = null;

      try {
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        
        const usageMetadata = response.usageMetadata as any || {};
        promptTokens = usageMetadata.promptTokenCount || 0;
        completionTokens = usageMetadata.candidatesTokenCount || 0;
        totalTokens = usageMetadata.totalTokenCount || 0;
        
        // Parsovat JSON odpověď
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('LLM nevrátil validní JSON');
        }
        
        pricesData = JSON.parse(jsonMatch[0]);
        
        // Zalogovat AI usage
        await logAIUsage(
          userId,
          textModelName,
          'price-update',
          promptTokens,
          completionTokens,
          totalTokens
        );
      } catch (error) {
        console.error('[updateGeminiPrices] Chyba při LLM volání:', error);
        // Pokusit se zalogovat i když selhalo
        try {
          await logAIUsage(
            userId,
            textModelName,
            'price-update',
            promptTokens,
            completionTokens,
            totalTokens
          );
        } catch (logError) {
          console.error('[updateGeminiPrices] Chyba při logování:', logError);
        }
        throw error;
      }

      if (!pricesData || !pricesData.models) {
        throw new Error('LLM nevrátil data v očekávaném formátu');
      }

      // Načíst aktuální pricing config
      const pricingDoc = await db.collection('settings').doc('aiPricingConfig').get();
      const pricingConfig = pricingDoc.data() || { models: {} };
      const updatedModels: string[] = [];
      const failedModels: string[] = [];
      const updateDate = new Date().toISOString().split('T')[0];

      // Aktualizovat ceny pro každý model
      for (const modelName of modelNames) {
        const modelPrice = pricesData.models[modelName];
        
        if (!modelPrice) {
          failedModels.push(modelName);
          continue;
        }

        const inputPrice = parseFloat(modelPrice.inputPrice) || 0;
        const outputPrice = parseFloat(modelPrice.outputPrice) || 0;

        if (inputPrice === 0 && outputPrice === 0) {
          failedModels.push(modelName);
          continue;
        }

        // Aktualizovat pricing config
        if (!pricingConfig.models) {
          pricingConfig.models = {};
        }

        pricingConfig.models[modelName] = {
          ...pricingConfig.models[modelName],
          inputPrice,
          outputPrice,
          note: modelPrice.note || pricingConfig.models[modelName]?.note,
          lastPriceUpdate: updateDate
        };

        updatedModels.push(modelName);
      }

      // Uložit aktualizovaný pricing config
      await db.collection('settings').doc('aiPricingConfig').set({
        ...pricingConfig,
        lastFullPriceUpdate: new Date().toISOString(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      return {
        updated: updatedModels.length,
        failed: failedModels
      };
    } catch (error: any) {
      console.error('[updateGeminiPrices] Error:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

