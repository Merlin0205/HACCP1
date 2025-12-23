/**
 * AI Service pro generování textu v neshodách
 * Používá pouze Firebase AI Logic SDK
 */

import { fetchAIPromptsConfig, fetchAIModelsConfig } from './firestore/settings';
import { generateContentWithSDK, type AIGenerateContentResponse } from './aiLogic';
import { addAIUsageLog } from './firestore/aiUsageLogs';

interface AIContext {
  itemTitle: string;
  itemDescription: string;
  sectionTitle: string;
}

/**
 * Nahradí placeholder proměnné v promptu skutečnými hodnotami
 */
function replacePlaceholders(template: string, context: AIContext, finding: string): string {
  const out = template
    // podporujeme obě varianty placeholderů: {var} i {{var}}
    .replace(/\{\{sectionTitle\}\}|\{sectionTitle\}/g, context.sectionTitle || '')
    .replace(/\{\{itemTitle\}\}|\{itemTitle\}/g, context.itemTitle || '')
    .replace(/\{\{itemDescription\}\}|\{itemDescription\}/g, context.itemDescription || '')
    .replace(/\{\{finding\}\}|\{finding\}/g, finding || '');

  return out;
}

/**
 * Přepíše text popisu neshody pomocí AI
 * Používá pouze Firebase AI Logic SDK
 */
export async function rewriteFinding(
  finding: string,
  context: AIContext
): Promise<string> {
  const promptsConfig = await fetchAIPromptsConfig();
  const promptTemplate = promptsConfig.prompts?.['rewrite-finding']?.template;

  if (!promptTemplate) {
    throw new Error('Prompt pro přepis neshody nebyl nalezen v konfiguraci');
  }

  const prompt = replacePlaceholders(promptTemplate, context, finding);
  const modelsConfig = await fetchAIModelsConfig();
  const modelName = modelsConfig.models?.['text-generation'] || 'gemini-2.5-flash';

  const response: AIGenerateContentResponse = await generateContentWithSDK(modelName, prompt);

  await addAIUsageLog(
    response.modelUsed || modelName,
    'text-generation',
    response.usageMetadata.promptTokenCount,
    response.usageMetadata.candidatesTokenCount,
    response.usageMetadata.totalTokenCount,
    'sdk'
  );

  return response.text || finding;
}

/**
 * Vygeneruje doporučené nápravné opatření pomocí AI
 * Používá pouze Firebase AI Logic SDK
 */
export async function generateRecommendation(
  finding: string,
  context: AIContext
): Promise<string> {
  const promptsConfig = await fetchAIPromptsConfig();
  const promptTemplate = promptsConfig.prompts?.['generate-recommendation']?.template;

  if (!promptTemplate) {
    throw new Error('Prompt pro generování doporučení nebyl nalezen v konfiguraci');
  }

  const prompt = replacePlaceholders(promptTemplate, context, finding);
  const modelsConfig = await fetchAIModelsConfig();
  const modelName = modelsConfig.models?.['text-generation'] || 'gemini-2.5-flash';

  const response: AIGenerateContentResponse = await generateContentWithSDK(modelName, prompt);

  await addAIUsageLog(
    response.modelUsed || modelName,
    'text-generation',
    response.usageMetadata.promptTokenCount,
    response.usageMetadata.candidatesTokenCount,
    response.usageMetadata.totalTokenCount,
    'sdk'
  );

  return response.text || '';
}













