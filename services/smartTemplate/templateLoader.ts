/**
 * Template Loader - načítání šablon z Firestore
 */

import { TemplateRules } from '../../types/smartReport';
import { fetchReportTemplate, fetchDefaultTemplate } from '../firestore/reportTemplates';
import { DEFAULT_TEMPLATE } from './defaultTemplate';

// Cache pro načtené šablony
const templateCache = new Map<string, TemplateRules>();

/**
 * Načte šablonu z Firestore nebo použije default
 */
export async function loadTemplate(templateId: string, version?: string): Promise<TemplateRules> {
  const cacheKey = `${templateId}_${version || 'latest'}`;
  
  // Zkontrolovat cache
  if (templateCache.has(cacheKey)) {
    return templateCache.get(cacheKey)!;
  }

  try {
    // Pokusit se načíst z Firestore
    const template = await fetchReportTemplate(templateId);
    
    if (template) {
      // Pokud je specifikována verze, ověřit že odpovídá
      if (version && template.version !== version) {
        console.warn(`[loadTemplate] Template ${templateId} má verzi ${template.version}, požadovaná byla ${version}`);
      }
      
      const rules = template.rules as TemplateRules;
      templateCache.set(cacheKey, rules);
      return rules;
    }
  } catch (error) {
    console.warn(`[loadTemplate] Chyba při načítání šablony ${templateId}:`, error);
  }

  // Fallback na default template
  console.warn(`[loadTemplate] Šablona ${templateId} nenalezena, používám default template`);
  templateCache.set(cacheKey, DEFAULT_TEMPLATE);
  return DEFAULT_TEMPLATE;
}

/**
 * Načte default šablonu z Firestore nebo použije hardcoded default
 */
export async function loadDefaultTemplate(): Promise<TemplateRules> {
  try {
    const defaultTemplate = await fetchDefaultTemplate();
    if (defaultTemplate) {
      const rules = defaultTemplate.rules as TemplateRules;
      templateCache.set('default', rules);
      return rules;
    }
  } catch (error) {
    console.warn('[loadDefaultTemplate] Chyba při načítání default šablony:', error);
  }

  // Fallback na hardcoded default
  return DEFAULT_TEMPLATE;
}

/**
 * Vyčistí cache šablon
 */
export function clearTemplateCache(): void {
  templateCache.clear();
}


