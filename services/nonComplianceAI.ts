/**
 * AI Service pro generování textu v neshodách
 * Používá prompty z Firestore a volá generateText cloud function
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebaseConfig';
import { fetchAIPromptsConfig } from './firestore/settings';

const generateTextFunction = httpsCallable(functions, 'generateText');

interface AIContext {
  itemTitle: string;
  itemDescription: string;
  sectionTitle: string;
}

/**
 * Nahradí placeholder proměnné v promptu skutečnými hodnotami
 */
function replacePlaceholders(template: string, context: AIContext, finding: string): string {
  return template
    .replace(/\{sectionTitle\}/g, context.sectionTitle || '')
    .replace(/\{itemTitle\}/g, context.itemTitle || '')
    .replace(/\{itemDescription\}/g, context.itemDescription || '')
    .replace(/\{finding\}/g, finding || '');
}

/**
 * Přepíše text popisu neshody pomocí AI
 */
export async function rewriteFinding(
  finding: string,
  context: AIContext
): Promise<string> {
  try {
    // Načíst prompty z Firestore
    const promptsConfig = await fetchAIPromptsConfig();
    const promptTemplate = promptsConfig.prompts?.['rewrite-finding']?.template;
    
    if (!promptTemplate) {
      throw new Error('Prompt pro přepis neshody nebyl nalezen v konfiguraci');
    }

    // Nahradit proměnné v promptu
    const prompt = replacePlaceholders(promptTemplate, context, finding);

    // Volat cloud function
    const result = await generateTextFunction({
      prompt,
      operation: 'text-generation'
    });

    const response = result.data as any;
    return response.text || finding;
  } catch (error: any) {
    console.error('[rewriteFinding] Error:', error);
    throw new Error(error.message || 'Chyba při přepisování textu pomocí AI');
  }
}

/**
 * Vygeneruje doporučené nápravné opatření pomocí AI
 */
export async function generateRecommendation(
  finding: string,
  context: AIContext
): Promise<string> {
  try {
    // Načíst prompty z Firestore
    const promptsConfig = await fetchAIPromptsConfig();
    const promptTemplate = promptsConfig.prompts?.['generate-recommendation']?.template;
    
    if (!promptTemplate) {
      throw new Error('Prompt pro generování doporučení nebyl nalezen v konfiguraci');
    }

    // Nahradit proměnné v promptu
    const prompt = replacePlaceholders(promptTemplate, context, finding);

    // Volat cloud function
    const result = await generateTextFunction({
      prompt,
      operation: 'text-generation'
    });

    const response = result.data as any;
    return response.text || '';
  } catch (error: any) {
    console.error('[generateRecommendation] Error:', error);
    throw new Error(error.message || 'Chyba při generování doporučení pomocí AI');
  }
}








