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
  limit
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';

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

interface AIUsageLog {
  id: string;
  timestamp: string;
  model: string;
  operation: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  costCzk: number;
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

