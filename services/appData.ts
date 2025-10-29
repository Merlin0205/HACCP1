/**
 * API služba pro správu aplikačních dat
 * (customers, audits, reports)
 */

import { api } from './client';
import { Customer, Audit, Report } from '../types';

export interface AppData {
  customers: Customer[];
  audits: Audit[];
  reports: Report[];
}

/**
 * Načte všechna data aplikace
 */
export async function fetchAppData(): Promise<AppData> {
  return api.get<AppData>('/api/app-data');
}

/**
 * Uloží všechna data aplikace
 */
export async function saveAppData(data: AppData): Promise<void> {
  await api.post('/api/app-data', data);
}

/**
 * Helpers pro jednotlivé entity
 */
export const appDataApi = {
  /**
   * Načte data ze serveru
   */
  load: fetchAppData,

  /**
   * Uloží data na server
   */
  save: saveAppData,
};
