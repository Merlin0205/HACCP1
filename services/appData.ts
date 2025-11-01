/**
 * API služba pro správu aplikačních dat
 * (operators, premises, audits, reports)
 * 
 * MIGRACE NA FIREBASE: Nyní používá Firestore místo Express API
 */

import { Operator, Premise, Audit, Report } from '../types';
import {
  fetchOperators,
  fetchPremises,
  fetchAudits,
  fetchReports
} from './firestore';

export interface AppData {
  operators: Operator[];
  premises: Premise[];
  audits: Audit[];
  reports: Report[];
}

/**
 * Načte všechna data aplikace z Firestore
 */
export async function fetchAppData(): Promise<AppData> {
  try {
    // Načíst všechna data paralelně
    const [operators, premises, audits, reports] = await Promise.all([
      fetchOperators(),
      fetchPremises(),
      fetchAudits(),
      fetchReports()
    ]);

    return {
      operators,
      premises,
      audits,
      reports
    };
  } catch (error) {
    console.error('[fetchAppData] Error:', error);
    throw error;
  }
}

/**
 * Uloží všechna data aplikace
 * 
 * POZNÁMKA: V Firebase se data ukládají automaticky přes jednotlivé
 * CRUD operace v services/firestore/, takže tato funkce není potřeba.
 * Zachována pro kompatibilitu.
 */
export async function saveAppData(data: AppData): Promise<void> {
  console.warn('[saveAppData] This function is deprecated with Firebase. Data is saved automatically through Firestore services.');
  // Neděláme nic - data se ukládají automaticky
}

/**
 * Helpers pro jednotlivé entity
 */
export const appDataApi = {
  /**
   * Načte data z Firestore
   */
  load: fetchAppData,

  /**
   * Deprecated - data se ukládají automaticky
   */
  save: saveAppData,
};
