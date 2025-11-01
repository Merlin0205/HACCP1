/**
 * API služba pro správu aplikačních dat
 * (customers, audits, reports)
 * 
 * MIGRACE NA FIREBASE: Nyní používá Firestore místo Express API
 */

import { Customer, Audit, Report } from '../types';
import {
  fetchCustomers,
  fetchAudits,
  fetchReports
} from './firestore';

export interface AppData {
  customers: Customer[];
  audits: Audit[];
  reports: Report[];
}

/**
 * Načte všechna data aplikace z Firestore
 */
export async function fetchAppData(): Promise<AppData> {
  try {
    // Načíst všechna data paralelně
    const [customers, audits, reports] = await Promise.all([
      fetchCustomers(),
      fetchAudits(),
      fetchReports()
    ]);

    return {
      customers,
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
