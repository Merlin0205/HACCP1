/**
 * Gemini Service - wrapper pro Firebase AI Logic SDK
 * Všechna AI volání používají pouze Firebase AI Logic SDK
 */

import { Part } from "@google/generative-ai";
import { generateContentWithSDK, type AIGenerateContentResponse } from '../services/aiLogic';
import { fetchAIModelsConfig } from '../services/firestore/settings';
import { addAIUsageLog } from '../services/firestore/aiUsageLogs';

// --- FUNKCE PRO PŘEPIS ZVUKU ---
/**
 * Převede zvuková data na text přes Firebase AI Logic SDK.
 * @param audioPart Zvuková data ve formátu, kterému Gemini rozumí.
 * @returns Přepsaný text.
 */
export const transcribeAudio = async (audioPart: Part): Promise<string> => {
  if (!audioPart.inlineData) {
    throw new Error('Audio part musí obsahovat inlineData');
  }

  const audioData = audioPart.inlineData.data;
  const mimeType = audioPart.inlineData.mimeType || 'audio/webm';
  const prompt = "Proveďte přímý přepis následujícího zvukového záznamu na text. Neodpovídejte celou větou, neformátujte text, neuvádějte žádný doprovodný text ani poznámky. Vraťte pouze samotný přepis.";

  const modelsConfig = await fetchAIModelsConfig();
  const modelName = modelsConfig.models?.['audio-transcription'] || 'gemini-2.0-flash-exp';

  const response: AIGenerateContentResponse = await generateContentWithSDK(modelName, [
    prompt,
    {
      inlineData: {
        data: audioData,
        mimeType: mimeType
      }
    }
  ]);
  
  await addAIUsageLog(
    modelName,
    'audio-transcription',
    response.usageMetadata.promptTokenCount,
    response.usageMetadata.candidatesTokenCount,
    response.usageMetadata.totalTokenCount,
    'sdk'
  );
  
  return response.text || '';
};

// --- FUNKCE PRO ANALÝZU OBRAZKŮ ---
export const analyzeImageWithAI = async (photo: Part): Promise<string> => {
  if (!photo.inlineData) {
    throw new Error('Photo part musí obsahovat inlineData');
  }

  const imageData = photo.inlineData.data;
  const mimeType = photo.inlineData.mimeType || 'image/jpeg';
  const prompt = "Analyzuj tuto fotografii z potravinářského provozu. Popiš, co na ní je, a identifikuj případná hygienická rizika nebo neshody s HACCP. Buď stručný a věcný.";

  const modelsConfig = await fetchAIModelsConfig();
  const modelName = modelsConfig.models?.['image-analysis'] || 'gemini-2.5-flash';

  const response: AIGenerateContentResponse = await generateContentWithSDK(modelName, [
    prompt,
    {
      inlineData: {
        data: imageData,
        mimeType: mimeType
      }
    }
  ]);
  
  await addAIUsageLog(
    modelName,
    'image-analysis',
    response.usageMetadata.promptTokenCount,
    response.usageMetadata.candidatesTokenCount,
    response.usageMetadata.totalTokenCount,
    'sdk'
  );
  
  return response.text || '';
};

// --- FUNKCE PRO GENEROVÁNÍ TEXTU ---
export const generateReportConclusionWithAI = async (summary: string): Promise<string> => {
  const prompt = `Na základě následujícího souhrnu neshod z HACCP auditu vygeneruj profesionální slovní hodnocení a závěr. Zdůrazni hlavní problematické oblasti a navrhni obecná doporučení. Celý text formuluj jako jeden odstavec. Souhrn neshod: ${summary}`;

  const modelsConfig = await fetchAIModelsConfig();
  const modelName = modelsConfig.models?.['text-generation'] || 'gemini-2.5-flash';

  const response: AIGenerateContentResponse = await generateContentWithSDK(modelName, prompt);
  
  await addAIUsageLog(
    modelName,
    'text-generation',
    response.usageMetadata.promptTokenCount,
    response.usageMetadata.candidatesTokenCount,
    response.usageMetadata.totalTokenCount,
    'sdk'
  );
  
  return response.text || '';
};
