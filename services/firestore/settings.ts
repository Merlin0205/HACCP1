/**
 * Firestore service pro správu nastavení aplikace
 */

import {
  doc,
  getDoc,
  setDoc,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { AuditStructure, AuditorInfo } from '../../types';

const COLLECTION_NAME = 'settings';

/**
 * Získá aktuálního uživatele
 */
function getCurrentUserId(): string {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user.uid;
}

/**
 * Načte audit strukturu
 */
export async function fetchAuditStructure(): Promise<AuditStructure | null> {
  const docRef = doc(db, COLLECTION_NAME, 'auditStructure');
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  return docSnap.data() as AuditStructure;
}

/**
 * Uloží audit strukturu
 */
export async function saveAuditStructure(structure: AuditStructure): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, 'auditStructure');
  await setDoc(docRef, {
    ...structure,
    updatedAt: Timestamp.now()
  });
}

/**
 * Načte informace o auditorovi (user-specific)
 */
export async function fetchAuditorInfo(): Promise<AuditorInfo> {
  const userId = getCurrentUserId();
  const docRef = doc(db, 'users', userId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    // Vrátit výchozí hodnoty
    return {
      name: 'Bc. Sylva Polzer, hygienický konzultant',
      phone: '603 398 774',
      email: 'sylvapolzer@avlyspol.cz',
      web: 'www.avlyspol.cz'
    };
  }
  
  const data = docSnap.data();
  return data.auditorInfo || {
    name: 'Bc. Sylva Polzer, hygienický konzultant',
    phone: '603 398 774',
    email: 'sylvapolzer@avlyspol.cz',
    web: 'www.avlyspol.cz'
  };
}

/**
 * Uloží informace o auditorovi
 */
export async function saveAuditorInfo(auditorInfo: AuditorInfo): Promise<void> {
  const userId = getCurrentUserId();
  const docRef = doc(db, 'users', userId);
  
  await setDoc(docRef, {
    auditorInfo,
    updatedAt: Timestamp.now()
  }, { merge: true });
}

/**
 * Načte AI report config
 */
export async function fetchAIReportConfig(): Promise<any> {
  const docRef = doc(db, COLLECTION_NAME, 'aiReportConfig');
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    // Výchozí konfigurace
    return {
      staticPositiveReport: {
        evaluation_text: "Audit prokázal výborný hygienický stav provozovny.",
        key_findings: ["Všechny oblasti vyhovují"],
        key_recommendations: ["Udržovat standard"]
      },
      aiPromptTemplate: "Vygeneruj report pro tyto neshody: {{neshody}}",
      useAI: true
    };
  }
  
  return docSnap.data();
}

/**
 * Uloží AI report config
 */
export async function saveAIReportConfig(config: any): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, 'aiReportConfig');
  await setDoc(docRef, {
    ...config,
    updatedAt: Timestamp.now()
  });
}

/**
 * Kategorie modelu podle ceny
 */
export type ModelCategory = 'zdarma' | 'levný' | 'střední' | 'drahý';

/**
 * Informace o Gemini modelu
 */
export interface GeminiModelInfo {
  name: string;
  category: ModelCategory;
  inputPrice: number;
  outputPrice: number;
  description?: string;
  lastPriceUpdate?: string;
}

/**
 * Seznam všech Gemini modelů
 */
export interface AllGeminiModels {
  models: Record<string, GeminiModelInfo>;
  lastFullUpdate?: string;
}

/**
 * Vypočítá kategorii modelu podle průměrné ceny
 * Pokud jsou obě ceny 0, vrátí "zdarma"
 */
export function calculateModelCategory(inputPrice: number, outputPrice: number): ModelCategory {
  // Pokud jsou obě ceny 0, model je zdarma
  if (inputPrice === 0 && outputPrice === 0) {
    return 'zdarma';
  }
  
  const avgPrice = (inputPrice + outputPrice) / 2;
  
  if (avgPrice < 0.5) {
    return 'levný';
  } else if (avgPrice <= 2) {
    return 'střední';
  } else {
    return 'drahý';
  }
}

/**
 * Seznam zastaralých modelů, které byly ukončeny Googlem
 * Tyto modely budou automaticky nahrazeny alternativami
 */
const DEPRECATED_MODELS: Record<string, string> = {
  'gemini-1.5-pro': 'gemini-2.5-pro', // Nahrazeno gemini-2.5-pro
  'gemini-1.5-flash': 'gemini-2.5-flash', // Nahrazeno gemini-2.5-flash
};

/**
 * Výchozí seznam všech Gemini modelů podle dokumentace
 * ZASTARALÉ MODELY (gemini-1.5-pro, gemini-1.5-flash) byly odstraněny - byly ukončeny Googlem
 */
const DEFAULT_GEMINI_MODELS: Record<string, GeminiModelInfo> = {
  'gemini-2.5-flash': {
    name: 'gemini-2.5-flash',
    category: 'střední',
    inputPrice: 0.15,
    outputPrice: 2.5,
    description: 'Model multimodální (text + obraz)',
    lastPriceUpdate: new Date().toISOString().split('T')[0]
  },
  'gemini-2.5-flash-lite': {
    name: 'gemini-2.5-flash-lite',
    category: 'levný',
    inputPrice: 0.10,
    outputPrice: 0.40,
    description: 'Nejlevnější varianta 2.5 řady',
    lastPriceUpdate: new Date().toISOString().split('T')[0]
  },
  'gemini-2.0-flash': {
    name: 'gemini-2.0-flash',
    category: 'levný',
    inputPrice: 0.10,
    outputPrice: 0.40,
    description: 'Kontextové okno až ~1 000 000 tokenů',
    lastPriceUpdate: new Date().toISOString().split('T')[0]
  },
  'gemini-2.0-flash-exp': {
    name: 'gemini-2.0-flash-exp',
    category: 'levný',
    inputPrice: 0,
    outputPrice: 0,
    description: 'Free experimental model',
    lastPriceUpdate: new Date().toISOString().split('T')[0]
  },
  'gemini-2.0-flash-lite': {
    name: 'gemini-2.0-flash-lite',
    category: 'levný',
    inputPrice: 0.075,
    outputPrice: 0.30,
    description: 'Menší a nejúspornější varianta',
    lastPriceUpdate: new Date().toISOString().split('T')[0]
  },
  'gemini-embedding-001': {
    name: 'gemini-embedding-001',
    category: 'levný',
    inputPrice: 0.15,
    outputPrice: 0,
    description: 'Model pro embeddingy',
    lastPriceUpdate: new Date().toISOString().split('T')[0]
  },
  'gemini-2.5-pro-preview-tts': {
    name: 'gemini-2.5-pro-preview-tts',
    category: 'drahý',
    inputPrice: 1.00,
    outputPrice: 20.00,
    description: 'Model s audio výstupem, vysoké ceny',
    lastPriceUpdate: new Date().toISOString().split('T')[0]
  },
  'gemini-robotics-er-1.5-preview': {
    name: 'gemini-robotics-er-1.5-preview',
    category: 'střední',
    inputPrice: 0.30,
    outputPrice: 2.50,
    description: 'Model pro robotické "reasoning" úlohy',
    lastPriceUpdate: new Date().toISOString().split('T')[0]
  },
  'gemini-2.5-pro': {
    name: 'gemini-2.5-pro',
    category: 'drahý',
    inputPrice: 1.25,
    outputPrice: 10,
    description: 'Nejvýkonnější model',
    lastPriceUpdate: new Date().toISOString().split('T')[0]
  },
};

/**
 * Načte AI pricing config
 */
export async function fetchAIPricingConfig(): Promise<any> {
  const docRef = doc(db, COLLECTION_NAME, 'aiPricingConfig');
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    // Pokud neexistuje, inicializovat s výchozími cenami ze seznamu modelů
    const defaultPricing: any = {
      usdToCzk: 25,
      models: {}
    };
    
    // Přidat výchozí ceny pro všechny modely
    Object.entries(DEFAULT_GEMINI_MODELS).forEach(([name, modelInfo]) => {
      defaultPricing.models[name] = {
        inputPrice: modelInfo.inputPrice,
        outputPrice: modelInfo.outputPrice,
        note: modelInfo.description,
        lastPriceUpdate: modelInfo.lastPriceUpdate
      };
    });
    
    // Uložit do databáze
    await saveAIPricingConfig(defaultPricing);
    return defaultPricing;
  }
  
  return docSnap.data();
}

/**
 * Uloží AI pricing config
 */
export async function saveAIPricingConfig(config: any): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, 'aiPricingConfig');
  await setDoc(docRef, {
    ...config,
    updatedAt: Timestamp.now()
  });
}

/**
 * Načte AI models config a automaticky migruje zastaralé modely
 */
export async function fetchAIModelsConfig(): Promise<any> {
  const docRef = doc(db, COLLECTION_NAME, 'aiModelsConfig');
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    // Pokud neexistuje, inicializovat s výchozími hodnotami
    const defaultConfig = {
      models: {
        'report-generation': 'gemini-2.0-flash-exp',
        'image-analysis': 'gemini-2.5-flash',
        'audio-transcription': 'gemini-2.5-flash',
        'text-generation': 'gemini-2.5-flash'
      }
    };
    
    // Uložit do databáze
    await saveAIModelsConfig(defaultConfig);
    return defaultConfig;
  }
  
  const data = docSnap.data();
  
  // Automatická migrace zastaralých modelů
  let needsMigration = false;
  const migratedModels: any = { ...data.models };
  
  Object.entries(migratedModels).forEach(([operation, modelName]: [string, any]) => {
    if (DEPRECATED_MODELS[modelName]) {
      console.warn(`[fetchAIModelsConfig] Migrating deprecated model "${modelName}" to "${DEPRECATED_MODELS[modelName]}" for operation "${operation}"`);
      migratedModels[operation] = DEPRECATED_MODELS[modelName];
      needsMigration = true;
    }
  });
  
  // Pokud byla provedena migrace, uložit změny
  if (needsMigration) {
    await saveAIModelsConfig({ models: migratedModels });
    return { models: migratedModels };
  }
  
  return data;
}

/**
 * Uloží AI models config
 */
export async function saveAIModelsConfig(config: any): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, 'aiModelsConfig');
  await setDoc(docRef, {
    ...config,
    updatedAt: Timestamp.now()
  });
}

/**
 * Načte seznam všech Gemini modelů
 */
export async function fetchAllGeminiModels(): Promise<AllGeminiModels> {
  const docRef = doc(db, COLLECTION_NAME, 'aiModelsList');
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    // Při prvním načtení inicializovat databázi s výchozími modely
    const defaultModels: AllGeminiModels = {
      models: DEFAULT_GEMINI_MODELS,
      lastFullUpdate: new Date().toISOString()
    };
    await saveAllGeminiModels(defaultModels);
    return defaultModels;
  }
  
  const data = docSnap.data() as AllGeminiModels;
  
  // Zajistit, že všechny výchozí modely jsou v seznamu
  const mergedModels = { ...DEFAULT_GEMINI_MODELS };
  if (data.models) {
    Object.entries(data.models).forEach(([name, modelInfo]) => {
      mergedModels[name] = {
        ...modelInfo,
        // Aktualizovat kategorii podle aktuálních cen
        category: calculateModelCategory(modelInfo.inputPrice, modelInfo.outputPrice)
      };
    });
  }
  
  return {
    models: mergedModels,
    lastFullUpdate: data.lastFullUpdate
  };
}

/**
 * Inicializuje databázi s výchozími modely (použít pouze jednou při prvním nasazení)
 */
export async function initializeAIModelsDatabase(): Promise<void> {
  try {
    // Inicializovat seznam všech modelů
    const allModelsDoc = doc(db, COLLECTION_NAME, 'aiModelsList');
    const allModelsSnap = await getDoc(allModelsDoc);
    
    if (!allModelsSnap.exists()) {
      await saveAllGeminiModels({
        models: DEFAULT_GEMINI_MODELS,
        lastFullUpdate: new Date().toISOString()
      });
      console.log('[INIT] Inicializován seznam všech Gemini modelů');
    }
    
    // Inicializovat pricing config s výchozími cenami
    const pricingDoc = doc(db, COLLECTION_NAME, 'aiPricingConfig');
    const pricingSnap = await getDoc(pricingDoc);
    
    if (!pricingSnap.exists()) {
      const defaultPricing: any = {
        usdToCzk: 25,
        models: {}
      };
      
      // Přidat výchozí ceny pro všechny modely
      Object.entries(DEFAULT_GEMINI_MODELS).forEach(([name, modelInfo]) => {
        defaultPricing.models[name] = {
          inputPrice: modelInfo.inputPrice,
          outputPrice: modelInfo.outputPrice,
          note: modelInfo.description,
          lastPriceUpdate: modelInfo.lastPriceUpdate
        };
      });
      
      await saveAIPricingConfig(defaultPricing);
      console.log('[INIT] Inicializován pricing config');
    }
    
    // Inicializovat models config (výběr modelů pro operace)
    const modelsConfigDoc = doc(db, COLLECTION_NAME, 'aiModelsConfig');
    const modelsConfigSnap = await getDoc(modelsConfigDoc);
    
    if (!modelsConfigSnap.exists()) {
      const defaultModelsConfig = {
        models: {
          'report-generation': 'gemini-2.0-flash-exp',
          'image-analysis': 'gemini-2.5-flash',
          'audio-transcription': 'gemini-2.5-flash',
          'text-generation': 'gemini-2.5-flash'
        }
      };
      
      await saveAIModelsConfig(defaultModelsConfig);
      console.log('[INIT] Inicializován models config');
    }
    
    console.log('[INIT] Inicializace databáze dokončena');
  } catch (error) {
    console.error('[INIT] Chyba při inicializaci databáze:', error);
    throw error;
  }
}

/**
 * Uloží seznam všech Gemini modelů
 */
export async function saveAllGeminiModels(modelsList: AllGeminiModels): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, 'aiModelsList');
  
  // Aktualizovat kategorie před uložením
  const updatedModels: Record<string, GeminiModelInfo> = {};
  Object.entries(modelsList.models || {}).forEach(([name, modelInfo]) => {
    updatedModels[name] = {
      ...modelInfo,
      category: calculateModelCategory(modelInfo.inputPrice, modelInfo.outputPrice)
    };
  });
  
  await setDoc(docRef, {
    models: updatedModels,
    lastFullUpdate: modelsList.lastFullUpdate || new Date().toISOString(),
    updatedAt: Timestamp.now()
  });
}

/**
 * Interface pro jeden prompt
 */
export interface AIPrompt {
  name: string;
  description: string;
  template: string;
  variables: string[];
}

/**
 * Interface pro konfiguraci AI promptů
 */
export interface AIPromptsConfig {
  prompts: {
    'rewrite-finding': AIPrompt;
    'generate-recommendation': AIPrompt;
  };
  updatedAt?: Timestamp;
}

/**
 * Výchozí prompty
 */
const DEFAULT_AI_PROMPTS: AIPromptsConfig = {
  prompts: {
    'rewrite-finding': {
      name: 'Přepis popisu neshody',
      description: 'Přepíše text popisu neshody s opravenou gramatikou a formálním stylem',
      template: 'Vezmi následující text popisu zjištěné neshody a přepiš ho v češtině správně pravopisně a formálně jako popis závady. Kontext: Sekce: {sectionTitle}, Položka: {itemTitle} ({itemDescription}). Text k přepsání: {finding}',
      variables: ['sectionTitle', 'itemTitle', 'itemDescription', 'finding']
    },
    'generate-recommendation': {
      name: 'Generování doporučení',
      description: 'Vygeneruje doporučené nápravné opatření na základě popisu neshody',
      template: 'Na základě popisu zjištěné neshody vygeneruj doporučené nápravné opatření v češtině. Kontext: Sekce: {sectionTitle}, Položka: {itemTitle} ({itemDescription}). Popis neshody: {finding}. Vygeneruj konkrétní a akční doporučení.',
      variables: ['sectionTitle', 'itemTitle', 'itemDescription', 'finding']
    }
  }
};

/**
 * Načte AI prompty config
 */
export async function fetchAIPromptsConfig(): Promise<AIPromptsConfig> {
  const docRef = doc(db, COLLECTION_NAME, 'aiPromptsConfig');
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    // Pokud neexistuje, inicializovat s výchozími hodnotami
    await initializeAIPromptsConfig();
    return DEFAULT_AI_PROMPTS;
  }
  
  const data = docSnap.data() as AIPromptsConfig;
  
  // Zajistit, že všechny výchozí prompty existují
  const mergedPrompts: AIPromptsConfig = {
    prompts: {
      'rewrite-finding': data.prompts?.['rewrite-finding'] || DEFAULT_AI_PROMPTS.prompts['rewrite-finding'],
      'generate-recommendation': data.prompts?.['generate-recommendation'] || DEFAULT_AI_PROMPTS.prompts['generate-recommendation']
    },
    updatedAt: data.updatedAt
  };
  
  return mergedPrompts;
}

/**
 * Uloží AI prompty config
 */
export async function saveAIPromptsConfig(config: AIPromptsConfig): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, 'aiPromptsConfig');
  await setDoc(docRef, {
    ...config,
    updatedAt: Timestamp.now()
  });
}

/**
 * Inicializuje AI prompty config s výchozími hodnotami
 */
export async function initializeAIPromptsConfig(): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, 'aiPromptsConfig');
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    await saveAIPromptsConfig(DEFAULT_AI_PROMPTS);
    console.log('[INIT] Inicializován AI prompty config');
  }
}



