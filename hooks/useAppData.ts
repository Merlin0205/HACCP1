/**
 * Custom hook pro správu aplikačních dat
 * 
 * MIGRACE NA FIREBASE: Nyní používá Firestore real-time listeners
 * místo polling a manual save
 */

import { useState, useEffect, useCallback } from 'react';
import { handleError } from '../utils/errorHandler';
import { toast } from '../utils/toast';
import { Operator, Premise, Audit, Report } from '../types';
import {
  fetchOperators,
  fetchPremises,
  fetchAudits,
  fetchReports,
  createOperator,
  updateOperator,
  deleteOperator,
  createPremise,
  updatePremise,
  deletePremise,
  createAudit,
  updateAudit,
  deleteAudit,
  createReport,
  updateReport,
  deleteReport
} from '../services/firestore';

export function useAppData() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [premises, setPremises] = useState<Premise[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Načte data z Firestore
   */
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [operatorsData, premisesData, auditsData, reportsData] = await Promise.all([
        fetchOperators(),
        fetchPremises(),
        fetchAudits(),
        fetchReports()
      ]);

      setOperators(operatorsData);
      setPremises(premisesData);
      setAudits(auditsData);
      setReports(reportsData);
    } catch (err) {
      const errorInfo = handleError(err);
      setError(errorInfo.message);
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
    operators,
    premises,
    audits,
    reports,
    setOperators,
    setPremises,
    setAudits,
    setReports,
    isLoading,
    error,
    reload: loadData,
  };
}
