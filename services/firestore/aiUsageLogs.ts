/**
 * Firestore service pro AI usage logs
 */

import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  deleteDoc,
  Timestamp,
  limit,
  addDoc
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { fetchAIPricingConfig, DEFAULT_GEMINI_MODELS } from './settings';

const COLLECTION_NAME = 'aiUsageLogs';

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

export interface AIUsageLog {
  id: string;
  timestamp: string;
  model: string;
  operation: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  costCzk: number;
  source?: 'sdk' | 'cloud-functions'; // Zdroj volání: SDK nebo Cloud Functions
}

/**
 * Převede Firestore dokument na AIUsageLog objekt
 */
function docToLog(docSnapshot: any): AIUsageLog {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    ...data,
    timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp
  } as AIUsageLog;
}

/**
 * Načte AI usage logy aktuálního uživatele
 */
export async function fetchAIUsageLogs(maxResults: number = 100): Promise<AIUsageLog[]> {
  const userId = getCurrentUserId();
  const q = query(
    collection(db, COLLECTION_NAME),
    where('userId', '==', userId),
    orderBy('timestamp', 'desc'),
    limit(maxResults)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToLog);
}

/**
 * Smaže všechny AI usage logy aktuálního uživatele
 */
export async function clearAIUsageLogs(): Promise<void> {
  const userId = getCurrentUserId();
  const q = query(
    collection(db, COLLECTION_NAME),
    where('userId', '==', userId)
  );
  
  const snapshot = await getDocs(q);
  const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletePromises);
}

/**
 * Vypočítá náklady za AI volání podle pricing configu
 * Používá ceny z aiPricingConfig nebo fallback na DEFAULT_GEMINI_MODELS
 */
async function calculateCost(model: string, promptTokens: number, completionTokens: number): Promise<{ usd: number; czk: number }> {
  try {
    const pricingConfig = await fetchAIPricingConfig();
    const usdToCzk = pricingConfig.usdToCzk || 25;
    
    // Zkusit najít ceny v pricing configu
    let pricing = pricingConfig.models?.[model];
    
    // Pokud není v pricing configu, použít výchozí ceny z DEFAULT_GEMINI_MODELS
    if (!pricing) {
      const defaultModel = DEFAULT_GEMINI_MODELS[model];
      if (defaultModel) {
        pricing = {
          inputPrice: defaultModel.inputPrice,
          outputPrice: defaultModel.outputPrice,
        };
        console.log(`[AI-USAGE] Použity výchozí ceny pro model "${model}" z DEFAULT_GEMINI_MODELS`);
      } else {
        console.warn(`[AI-USAGE] Pricing config pro model "${model}" nenalezen, ani v DEFAULT_GEMINI_MODELS`);
        return { usd: 0, czk: 0 };
      }
    }
    
    const inputPrice = pricing.inputPrice || 0;
    const outputPrice = pricing.outputPrice || 0;
    
    // Ceny jsou obvykle za 1M tokenů
    const inputCost = (promptTokens / 1000000) * inputPrice;
    const outputCost = (completionTokens / 1000000) * outputPrice;
    const totalUsd = inputCost + outputCost;
    const totalCzk = totalUsd * usdToCzk;
    
    return { usd: totalUsd, czk: totalCzk };
  } catch (error) {
    console.error('[AI-USAGE] Chyba při výpočtu nákladů:', error);
    return { usd: 0, czk: 0 };
  }
}

/**
 * Přidá nový AI usage log do Firestore
 */
export async function addAIUsageLog(
  model: string,
  operation: string,
  promptTokens: number,
  completionTokens: number,
  totalTokens: number,
  source?: 'sdk' | 'cloud-functions'
): Promise<void> {
  try {
    const userId = getCurrentUserId();
    
    // Vypočítat náklady
    const cost = await calculateCost(model, promptTokens, completionTokens);
    
    // Přidat log do Firestore
    await addDoc(collection(db, COLLECTION_NAME), {
      userId,
      timestamp: Timestamp.now(),
      model,
      operation,
      promptTokens: promptTokens || 0,
      completionTokens: completionTokens || 0,
      totalTokens: totalTokens || 0,
      costUsd: cost.usd,
      costCzk: cost.czk,
      source: source || 'cloud-functions' // Default je cloud-functions pro zpětnou kompatibilitu
    });
    
    const sourceLabel = source === 'sdk' ? 'SDK' : 'Cloud Functions';
    console.log(`[AI-USAGE] Zalogováno (${sourceLabel}): ${model}, ${totalTokens} tokens, $${cost.usd.toFixed(6)} (${cost.czk.toFixed(6)} Kč)`);
  } catch (error) {
    console.error('[AI-USAGE] Chyba při logování:', error);
    // Nevyhodit chybu - logování nesmí blokovat hlavní funkcionalitu
  }
}

/**
 * Načte AI usage logy filtrované podle operace
 */
export async function fetchAIUsageLogsByOperation(operation: string, maxResults: number = 1000): Promise<AIUsageLog[]> {
  const userId = getCurrentUserId();
  const q = query(
    collection(db, COLLECTION_NAME),
    where('userId', '==', userId),
    where('operation', '==', operation),
    orderBy('timestamp', 'desc'),
    limit(maxResults)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToLog);
}

/**
 * Statistiky podle modelu pro konkrétní operaci
 */
export interface OperationStats {
  totalCostUsd: number;
  totalCostCzk: number;
  totalTokens: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  count: number;
  byModel: Record<string, {
    totalCostUsd: number;
    totalCostCzk: number;
    totalTokens: number;
    totalPromptTokens: number;
    totalCompletionTokens: number;
    count: number;
  }>;
}

/**
 * Vypočítá náklady podle operací
 */
export async function calculateCostsByOperation(): Promise<Record<string, OperationStats>> {
  const logs = await fetchAIUsageLogs(1000); // Načíst maximálně 1000 záznamů
  
  const operations: Record<string, OperationStats> = {};
  
  logs.forEach(log => {
    const op = log.operation || 'unknown';
    
    if (!operations[op]) {
      operations[op] = {
        totalCostUsd: 0,
        totalCostCzk: 0,
        totalTokens: 0,
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        count: 0,
        byModel: {}
      };
    }
    
    const opStats = operations[op];
    opStats.totalCostUsd += log.costUsd || 0;
    opStats.totalCostCzk += log.costCzk || 0;
    opStats.totalTokens += log.totalTokens || 0;
    opStats.totalPromptTokens += log.promptTokens || 0;
    opStats.totalCompletionTokens += log.completionTokens || 0;
    opStats.count += 1;
    
    // Statistiky podle modelu
    if (!opStats.byModel[log.model]) {
      opStats.byModel[log.model] = {
        totalCostUsd: 0,
        totalCostCzk: 0,
        totalTokens: 0,
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        count: 0
      };
    }
    
    const modelStats = opStats.byModel[log.model];
    modelStats.totalCostUsd += log.costUsd || 0;
    modelStats.totalCostCzk += log.costCzk || 0;
    modelStats.totalTokens += log.totalTokens || 0;
    modelStats.totalPromptTokens += log.promptTokens || 0;
    modelStats.totalCompletionTokens += log.completionTokens || 0;
    modelStats.count += 1;
  });
  
  return operations;
}

/**
 * Vypočítá statistiky pro konkrétní model (volitelně filtrované podle operace)
 */
export async function calculateModelStats(modelName: string, operation?: string): Promise<{
  totalCostUsd: number;
  totalCostCzk: number;
  totalTokens: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  count: number;
  byOperation: Record<string, {
    totalCostUsd: number;
    totalCostCzk: number;
    totalTokens: number;
    totalPromptTokens: number;
    totalCompletionTokens: number;
    count: number;
  }>;
}> {
  const logs = await fetchAIUsageLogs(1000);
  
  // Filtrovat podle modelu a volitelně podle operace
  const filteredLogs = logs.filter(log => {
    if (log.model !== modelName) return false;
    if (operation && log.operation !== operation) return false;
    return true;
  });
  
  const stats = {
    totalCostUsd: 0,
    totalCostCzk: 0,
    totalTokens: 0,
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    count: 0,
    byOperation: {} as Record<string, {
      totalCostUsd: number;
      totalCostCzk: number;
      totalTokens: number;
      totalPromptTokens: number;
      totalCompletionTokens: number;
      count: number;
    }>
  };
  
  filteredLogs.forEach(log => {
    stats.totalCostUsd += log.costUsd || 0;
    stats.totalCostCzk += log.costCzk || 0;
    stats.totalTokens += log.totalTokens || 0;
    stats.totalPromptTokens += log.promptTokens || 0;
    stats.totalCompletionTokens += log.completionTokens || 0;
    stats.count += 1;
    
    // Rozpis podle operací
    const op = log.operation || 'unknown';
    if (!stats.byOperation[op]) {
      stats.byOperation[op] = {
        totalCostUsd: 0,
        totalCostCzk: 0,
        totalTokens: 0,
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        count: 0
      };
    }
    
    const opStats = stats.byOperation[op];
    opStats.totalCostUsd += log.costUsd || 0;
    opStats.totalCostCzk += log.costCzk || 0;
    opStats.totalTokens += log.totalTokens || 0;
    opStats.totalPromptTokens += log.promptTokens || 0;
    opStats.totalCompletionTokens += log.completionTokens || 0;
    opStats.count += 1;
  });
  
  return stats;
}

/**
 * Vypočítá celkové statistiky z logů
 */
export async function calculateAIUsageStats(): Promise<{
  totalCostUsd: number;
  totalCostCzk: number;
  totalTokens: number;
  logCount: number;
}> {
  const logs = await fetchAIUsageLogs(1000); // Načíst maximálně 1000 záznamů
  
  const stats = logs.reduce((acc, log) => {
    return {
      totalCostUsd: acc.totalCostUsd + (log.costUsd || 0),
      totalCostCzk: acc.totalCostCzk + (log.costCzk || 0),
      totalTokens: acc.totalTokens + (log.totalTokens || 0),
      logCount: acc.logCount + 1
    };
  }, {
    totalCostUsd: 0,
    totalCostCzk: 0,
    totalTokens: 0,
    logCount: 0
  });
  
  return stats;
}
