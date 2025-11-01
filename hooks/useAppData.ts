/**
 * Custom hook pro správu aplikačních dat
 * 
 * MIGRACE NA FIREBASE: Nyní používá Firestore real-time listeners
 * místo polling a manual save
 */

import { useState, useEffect, useCallback } from 'react';
import { handleError } from '../utils/errorHandler';
import { toast } from '../utils/toast';
import { Customer, Audit, Report } from '../types';
import {
  fetchCustomers,
  fetchAudits,
  fetchReports,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  createAudit,
  updateAudit,
  deleteAudit,
  createReport,
  updateReport,
  deleteReport
} from '../services/firestore';

export function useAppData() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Načte data z Firestore
   */
  const loadData = useCallback(async () => {
    console.log('[useAppData] Načítám data z Firestore...');
    setIsLoading(true);
    setError(null);

    try {
      const [customersData, auditsData, reportsData] = await Promise.all([
        fetchCustomers(),
        fetchAudits(),
        fetchReports()
      ]);
      
      setCustomers(customersData);
      setAudits(auditsData);
      setReports(reportsData);
      console.log('[useAppData] Data úspěšně načtena');
    } catch (err) {
      const errorInfo = handleError(err);
      setError(errorInfo.message);
      console.error('[useAppData] Chyba při načítání:', err);
      toast.error(errorInfo.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Inicializační načtení
   */
  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * Wrapped setters s automatickým ukládáním do Firestore
   * Tyto funkce aktualizují lokální state, ale vlastní ukládání
   * probíhá v komponentách pomocí Firestore CRUD metod
   */
  return {
    customers,
    audits,
    reports,
    setCustomers,
    setAudits,
    setReports,
    isLoading,
    error,
    reload: loadData,
  };
}
