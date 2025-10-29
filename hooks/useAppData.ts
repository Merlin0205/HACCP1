/**
 * Custom hook pro správu aplikačních dat
 * 
 * Poskytuje načítání a ukládání dat s error handlingem
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchAppData, saveAppData, AppData } from '../services/appData';
import { handleError } from '../utils/errorHandler';
import { toast } from '../utils/toast';
import { Customer, Audit, Report } from '../types';

export function useAppData() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const isInitialLoad = useRef(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Načte data ze serveru
   */
  const loadData = useCallback(async () => {
    console.log('[useAppData] Načítám data ze serveru...');
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchAppData();
      setCustomers(data.customers || []);
      setAudits(data.audits || []);
      setReports(data.reports || []);
      console.log('[useAppData] Data úspěšně načtena');
      
      if (!isInitialLoad.current) {
        toast.success('Data načtena');
      }
    } catch (err) {
      const errorInfo = handleError(err);
      setError(errorInfo.message);
      console.error('[useAppData] Chyba při načítání:', err);
      toast.error(errorInfo.message);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        isInitialLoad.current = false;
      }, 500);
    }
  }, []);

  /**
   * Uloží data na server s debounce
   */
  const saveData = useCallback(async (data: AppData) => {
    if (isInitialLoad.current || isLoading) return;

    // Debounce - počkáme 500ms před uložením
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      console.log('[useAppData] Ukládám data na server...');
      try {
        await saveAppData(data);
        console.log('[useAppData] Data úspěšně uložena');
      } catch (err) {
        const errorInfo = handleError(err);
        console.error('[useAppData] Chyba při ukládání:', err);
        // Nezobrazovat toast - data se uloží při dalším pokusu
        // toast.error(`Nepodařilo se uložit změny: ${errorInfo.message}`);
      }
    }, 1000); // Zvýšeno z 500ms na 1000ms pro menší spam
  }, [isLoading]);

  /**
   * Auto-save při změnách
   */
  useEffect(() => {
    if (!isInitialLoad.current && !isLoading) {
      saveData({ customers, audits, reports });
    }
  }, [customers, audits, reports, saveData, isLoading]);

  /**
   * Inicializační načtení
   */
  useEffect(() => {
    loadData();

    // Cleanup
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [loadData]);

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
