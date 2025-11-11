/**
 * App.tsx - Hlavní komponenta aplikace (REFAKTOROVÁNO)
 * 
 * Změny v refaktorizaci:
 * - Používá nový API layer s error handlingem
 * - Custom hooks pro data management
 * - Error Boundary pro zachytávání chyb
 * - Toast notifikace
 * - Lepší separace concerns
 */

/**
 * App.tsx - Hlavní komponenta aplikace (FIREBASE MIGRACE)
 * 
 * Změny v Firebase migraci:
 * - Používá Firestore pro všechna data
 * - Firebase Storage pro fotky
 * - Firebase Authentication (zajištěno v AppWithAuth)
 * - Cloud Functions pro AI operace
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { AppState, Audit, Operator, Premise, AuditStatus, Report, ReportStatus, AuditStructure, AuditHeaderValues, Tab } from './types';
import { DEFAULT_AUDIT_STRUCTURE } from './constants';
import { Layout } from './components/Layout';
import AuditChecklist from './components/AuditChecklist';
import AdminScreen from './components/AdminScreen';
import SettingsScreen from './components/SettingsScreen';
import UserManagementScreen from './components/UserManagementScreen';
import AuditorSettingsScreen from './components/AuditorSettingsScreen';
import AIReportSettingsScreen from './components/AIReportSettingsScreen';
import AIUsageStatsScreen from './components/AIUsageStatsScreen';
import AIPricingConfigScreen from './components/AIPricingConfigScreen';
import AIPromptsScreen from './components/AIPromptsScreen';
import SmartTemplateSettingsScreen from './components/SmartTemplateSettingsScreen';
import { OperatorDashboard } from './components/OperatorDashboard';
import { OperatorForm } from './components/OperatorForm';
import { PremiseForm } from './components/PremiseForm';
import { AuditList } from './components/AuditList';
import { AllAuditsScreen } from './components/AllAuditsScreen';
import { HeaderForm } from './components/HeaderForm';
import ReportView from './components/ReportView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/ToastContainer';
import { toast } from './utils/toast';
import { useAppData } from './hooks/useAppData';
import { useReportGenerator } from './hooks/useReportGenerator';
import { useAuth } from './contexts/AuthContext';
import { SECTION_THEMES } from './constants/designSystem';
import {
  createOperator,
  updateOperator,
  deleteOperator,
  createPremise,
  updatePremise,
  deletePremise,
  deletePremisesByOperator,
  createAudit,
  updateAudit,
  deleteAudit,
  deleteAuditsByPremise,
  createReport,
  updateReport,
  deleteReportByAudit,
  deleteReportsByAuditIds,
  fetchReportsByAudit,
  deleteReport,
  fetchAuditorInfo,
  fetchPremisesByOperator
} from './services/firestore';
import { fetchAuditStructure } from './services/firestore/settings';
import { writeBatch, doc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { generateHumanReadableId } from './utils/idGenerator';
import { getAIInstance } from './services/aiLogic';

const App: React.FC = () => {
  // --- DATA MANAGEMENT (using custom hooks) ---
  const {
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
  } = useAppData();

  // --- SDK INITIALIZATION ---
  useEffect(() => {
    // Inicializovat Firebase AI Logic SDK při načtení aplikace
    try {
      getAIInstance();
    } catch (error) {
      // Silent fail - aplikace bude fungovat s Cloud Functions fallback
    }
  }, []);

  // --- STATE MANAGEMENT ---
  const [appState, setAppState] = useState<AppState>(AppState.INCOMPLETE_AUDITS);
  const [activeOperatorId, setActiveOperatorId] = useState<string | null>(null);
  const [activePremiseId, setActivePremiseId] = useState<string | null>(null);
  const [activeAuditId, setActiveAuditId] = useState<string | null>(null);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [previousAppState, setPreviousAppState] = useState<AppState>(AppState.INCOMPLETE_AUDITS);
  const [auditStructure, setAuditStructureState] = useState<AuditStructure>(DEFAULT_AUDIT_STRUCTURE);
  const [pendingHeader, setPendingHeader] = useState<AuditHeaderValues | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loadingAuditStructure, setLoadingAuditStructure] = useState(true);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);

  // Načíst audit structure z Firestore při startu nebo podle typu auditu
  useEffect(() => {
    const loadAuditStructure = async () => {
      try {
        // Pokud má aktivní audit auditTypeId, načíst strukturu z typu
        if (activeAuditId) {
          const audit = audits.find(a => a.id === activeAuditId);
          if (audit?.auditTypeId) {
            try {
              const { fetchAuditType } = await import('./services/firestore/auditTypes');
              const auditType = await fetchAuditType(audit.auditTypeId);
              if (auditType) {
                setAuditStructureState(auditType.auditStructure);
                setLoadingAuditStructure(false);
                return;
              }
            } catch (error) {
              console.error('[App] Error loading audit type structure:', error);
              // Pokračovat s výchozí strukturou
            }
          }
        }
        
        // Jinak načíst výchozí strukturu z settings
        const savedStructure = await fetchAuditStructure();
        if (savedStructure) {
          setAuditStructureState(savedStructure);
        } else {
          // Pokud není v databázi, uložit výchozí
          const { saveAuditStructure } = await import('./services/firestore/settings');
          await saveAuditStructure(DEFAULT_AUDIT_STRUCTURE);
          setAuditStructureState(DEFAULT_AUDIT_STRUCTURE);
        }
      } catch (error) {
        console.error('[App] Error loading audit structure:', error);
        // Při chybě použít výchozí strukturu
      } finally {
        setLoadingAuditStructure(false);
      }
    };

    loadAuditStructure();
  }, [activeAuditId, audits]);

  // --- LOGGING FUNCTION ---
  const log = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prevLogs => [`[${timestamp}] ${message}`, ...prevLogs]);
  }, []);

  // --- BACKGROUND REPORT GENERATION ---
  const { isGenerating } = useReportGenerator({
    reports,
    audits,
    auditStructure,
    onReportUpdate: async (reportId, updates) => {
      // Aktualizovat lokální state
      setReports(prev =>
        prev.map(r => (r.id === reportId ? { ...r, ...updates } : r))
      );
      
      // Uložit změny do Firestore
      try {
        await updateReport(reportId, updates);
        console.log('[App] Report aktualizován v Firestore:', reportId);
      } catch (error) {
        console.error('[App] Chyba při ukládání reportu do Firestore:', error);
        // Nezobrazovat toast - uživatel nemusí vědět o interních chybách
        // State je aktualizován lokálně, takže UI bude fungovat
      }
    },
  });

  // --- DERIVED STATE ---
  const activeAudit = useMemo(() => audits.find(a => a.id === activeAuditId), [audits, activeAuditId]);
  const activeReport = useMemo(() => {
    // Pokud je nastavený activeReportId, použít konkrétní report
    if (activeReportId) {
      return reports.find(r => r.id === activeReportId);
    }
    // Jinak použít nejnovější report pro audit
    return reports.find(r => r.auditId === activeAuditId && r.isLatest);
  }, [reports, activeAuditId, activeReportId]);
  const operatorToEdit = useMemo(() => operators.find(o => o.id === activeOperatorId), [operators, activeOperatorId]);
  const premiseToEdit = useMemo(() => premises.find(p => p.id === activePremiseId), [premises, activePremiseId]);

  // --- NAVIGATION & ACTIONS ---
  const handleBackToDashboard = () => {
    setAppState(AppState.OPERATOR_DASHBOARD);
    setActiveOperatorId(null);
    setActivePremiseId(null);
    setActiveAuditId(null);
    setActiveReportId(null);
    setPendingHeader(null);
  };

  const handleAddNewOperator = () => {
    setActiveOperatorId(null);
    setAppState(AppState.ADD_OPERATOR);
  };

  const handleEditOperator = (operatorId: string) => {
    setActiveOperatorId(operatorId);
    setAppState(AppState.EDIT_OPERATOR);
  };

  const handleSaveOperator = async (operatorData: Omit<Operator, 'id'>) => {
    try {
      if (activeOperatorId) {
        await updateOperator(activeOperatorId, operatorData);
        setOperators(prev => prev.map(o => (o.id === activeOperatorId ? { ...o, ...operatorData } : o)));
      } else {
        const newId = await createOperator(operatorData);
        const newOperator: Operator = { id: newId, ...operatorData };
        setOperators(prev => [...prev, newOperator]);
      }
      handleBackToDashboard();
    } catch (error) {
      console.error('[handleSaveOperator] Error:', error);
    }
  };

  const handleDeleteOperator = async (operatorId: string) => {
    try {
      // Najít všechna pracoviště pro tohoto provozovatele
      const operatorPremises = premises.filter(p => p.operatorId === operatorId);
      const premiseIds = operatorPremises.map(p => p.id);
      
      // Najít všechny audity pro tato pracoviště
      const auditsToDelete = audits.filter(a => premiseIds.includes(a.premiseId));
      const auditIds = auditsToDelete.map(a => a.id);
      
      // Smazat reporty
      if (auditIds.length > 0) {
        await deleteReportsByAuditIds(auditIds);
      }
      
      // Smazat audity
      for (const premiseId of premiseIds) {
        await deleteAuditsByPremise(premiseId);
      }
      
      // Smazat všechna pracoviště
      await deletePremisesByOperator(operatorId);
      
      // Smazat provozovatele
      await deleteOperator(operatorId);
      
      // Aktualizovat lokální state
      setOperators(prev => prev.filter(o => o.id !== operatorId));
      setPremises(prev => prev.filter(p => p.operatorId !== operatorId));
      setAudits(prev => prev.filter(a => !premiseIds.includes(a.premiseId)));
      setReports(prev => prev.filter(r => !auditIds.includes(r.auditId)));
    } catch (error) {
      console.error('[handleDeleteOperator] Error:', error);
    }
  };

  const handleAddPremise = (operatorId: string) => {
    setActiveOperatorId(operatorId);
    setActivePremiseId(null);
    setAppState(AppState.ADD_PREMISE);
  };

  const handleEditPremise = (premiseId: string) => {
    const premise = premises.find(p => p.id === premiseId);
    if (premise) {
      setActiveOperatorId(premise.operatorId);
      setActivePremiseId(premiseId);
      setAppState(AppState.EDIT_PREMISE);
    }
  };

  const handleSavePremise = async (premiseData: Omit<Premise, 'id'>) => {
    try {
      if (activePremiseId) {
        await updatePremise(activePremiseId, premiseData);
        setPremises(prev => prev.map(p => (p.id === activePremiseId ? { ...p, ...premiseData } : p)));
      } else {
        const newId = await createPremise(premiseData);
        const newPremise: Premise = { id: newId, ...premiseData };
        setPremises(prev => [...prev, newPremise]);
      }
      handleBackToDashboard();
    } catch (error) {
      console.error('[handleSavePremise] Error:', error);
    }
  };

  const handleDeletePremise = async (premiseId: string) => {
    try {
      // Nejprve smazat všechny audity a reporty
      const auditsToDelete = audits.filter(a => a.premiseId === premiseId);
      const auditIds = auditsToDelete.map(a => a.id);
      
      // Smazat reporty
      if (auditIds.length > 0) {
        await deleteReportsByAuditIds(auditIds);
      }
      
      // Smazat audity
      await deleteAuditsByPremise(premiseId);
      
      // Smazat pracoviště
      await deletePremise(premiseId);
      
      // Aktualizovat lokální state
      setPremises(prev => prev.filter(p => p.id !== premiseId));
      setAudits(prev => prev.filter(a => a.premiseId !== premiseId));
      setReports(prev => prev.filter(r => !auditIds.includes(r.auditId)));
    } catch (error) {
      console.error('[handleDeletePremise] Error:', error);
    }
  };

  // Centrální funkce pro vytvoření nebo aktivaci tabu
  const openOrActivateTab = (
    auditId: string | undefined,
    tabType: 'audit' | 'report' | 'audit_list',
    premiseId: string,
    operatorName: string,
    premiseName?: string,
    auditDate?: string,
    status?: string
  ): string => {
    // 1. Najít existující tab
    let existingTab: Tab | undefined;
    
    if (tabType === 'audit_list') {
      // Pro audit_list hledat podle premiseId
      existingTab = tabs.find(t => t.type === 'audit_list' && t.premiseId === premiseId);
    } else if (auditId) {
      // Pro audit/report hledat podle auditId (jakéhokoliv typu)
      existingTab = tabs.find(t => t.auditId === auditId);
    }
    
    if (existingTab) {
      // Pokud existuje tab s jiným typem, aktualizovat typ a metadata
      if (existingTab.type !== tabType) {
        const updatedTab: Tab = {
          ...existingTab,
          type: tabType,
          operatorName: operatorName,
          premiseName: premiseName,
          auditDate: auditDate,
          status: status,
        };
        setTabs(prev => prev.map(t => t.id === existingTab!.id ? updatedTab : t));
        setActiveTabId(existingTab.id);
        return existingTab.id;
      }
      // Pokud je typ stejný, pouze aktualizovat metadata pokud je poskytnuto
      if (auditDate || status || premiseName) {
        const updatedTab: Tab = {
          ...existingTab,
          operatorName: operatorName,
          premiseName: premiseName || existingTab.premiseName,
          auditDate: auditDate || existingTab.auditDate,
          status: status || existingTab.status,
        };
        setTabs(prev => prev.map(t => t.id === existingTab!.id ? updatedTab : t));
      }
      // Aktivovat existující tab
      setActiveTabId(existingTab.id);
      return existingTab.id;
    }
    
    // 2. Vytvořit nový tab pouze pokud neexistuje
    const newTab: Tab = {
      id: `tab_${Date.now()}_${auditId || premiseId}`,
      type: tabType,
      auditId: auditId,
      premiseId: premiseId,
      operatorName: operatorName,
      premiseName: premiseName,
      auditDate: auditDate,
      status: status,
      createdAt: new Date().toISOString(),
    };
    
    setTabs(prev => {
      const newTabs = [...prev, newTab];
      if (prev.length === 0) {
        setPreviousAppState(appState);
      }
      return newTabs;
    });
    setActiveTabId(newTab.id);
    
    return newTab.id;
  };

  const handleSelectPremiseForAudits = (premiseId: string) => {
    const premise = premises.find(p => p.id === premiseId);
    const operator = premise ? operators.find(o => o.id === premise.operatorId) : null;
    const operatorName = operator?.operator_name || 'Neznámý';
    const premiseName = premise?.premise_name || 'Neznámé';

    setActivePremiseId(premiseId);

    // Použít centrální funkci pro vytvoření/aktivaci tabu
    openOrActivateTab(
      undefined, // auditId není potřeba pro audit_list
      'audit_list',
      premiseId,
      operatorName,
      premiseName
    );

    setAppState(AppState.AUDIT_LIST);
  };

  const handleBackToAuditList = () => {
    // Pokud existují taby, pouze vrátit na předchozí view, ale tab ponechat otevřený v TabBar
    if (activeTabId && tabs.length > 0) {
      const activeTab = tabs.find(t => t.id === activeTabId);
      // Pokud je to audit_list tab, vrátit se na předchozí view (např. OPERATOR_DASHBOARD)
      // Pokud je to audit/report tab, vrátit se na audit_list nebo předchozí view
      if (activeTab?.type === 'audit_list') {
        // Pro audit_list vrátit se na předchozí view (OPERATOR_DASHBOARD)
        setActiveTabId(null);
        setActivePremiseId(null);
        setAppState(previousAppState);
        setActiveReportId(null); // Reset report ID
        return;
      } else if (activeTab?.type === 'report' || activeTab?.type === 'audit') {
        // Pro report/audit tab vrátit se na audit_list
        const premise = premises.find(p => p.id === activeTab.premiseId);
        if (premise) {
          setAppState(AppState.AUDIT_LIST);
          setActivePremiseId(premise.id);
          setActiveAuditId(null);
          setActiveReportId(null); // Reset report ID
          setActiveTabId(null);
          return;
        }
      }
    }

    // Pokud nejsou taby, nebo je to jiný případ, použít standardní logiku
    setActiveAuditId(null);
    setActiveReportId(null); // Reset report ID
    setAppState(previousAppState);
  };

  const handleStartNewAudit = async (premiseId: string) => {
    try {
      const premise = premises.find(p => p.id === premiseId);
      const operator = premise ? operators.find(o => o.id === premise.operatorId) : null;
      
      if (!premise || !operator) {
        toast.error('Chyba: Nepodařilo se načíst data o pracovišti nebo provozovateli.');
        return;
      }

      // Načíst strukturu podle typu auditu z premise
      let structureToUse = auditStructure;
      let auditTypeIdToUse: string | undefined = premise.auditTypeId;
      
      if (auditTypeIdToUse) {
        try {
          const { fetchAuditType } = await import('./services/firestore/auditTypes');
          const auditType = await fetchAuditType(auditTypeIdToUse);
          if (auditType) {
            structureToUse = auditType.auditStructure;
          }
        } catch (error) {
          console.error('[handleStartNewAudit] Error loading audit type:', error);
          toast.error('Chyba při načítání typu auditu. Použita výchozí struktura.');
        }
      }

      // Načíst aktuální údaje auditora z Firestore
      const auditorInfo = await fetchAuditorInfo();

      const prefilledHeaderValues: AuditHeaderValues = {
        premise_name: premise.premise_name || '',
        premise_address: premise.premise_address || '',
        premise_responsible_person: premise.premise_responsible_person || '',
        premise_phone: premise.premise_phone || '',
        premise_email: premise.premise_email || '',
        operator_name: operator.operator_name || '',
        operator_address: operator.operator_address || '',
        operator_ico: operator.operator_ico || '',
        operator_statutory_body: operator.operator_statutory_body || '',
        operator_phone: operator.operator_phone || '',
        operator_email: operator.operator_email || '',
        auditor_name: auditorInfo.name,
        auditor_phone: auditorInfo.phone,
        auditor_email: auditorInfo.email,
        auditor_web: auditorInfo.web,
      };

      // Vytvořit audit s statusem IN_PROGRESS
      const newAuditData: Omit<Audit, 'id'> = {
        premiseId: premiseId,
        status: AuditStatus.IN_PROGRESS,
        createdAt: new Date().toISOString(),
        headerValues: prefilledHeaderValues,
        answers: {},
        auditTypeId: auditTypeIdToUse,
      };

      // Generovat human-readable ID (formát: A{YYYYMMDD}_{COUNTER})
      const auditId = await createAudit({ ...newAuditData, id: await generateHumanReadableId('A', 'audits') });
      const newAudit: Audit = { ...newAuditData, id: auditId };
      
      // Aktualizovat lokální state
      setAudits(prev => [...prev, newAudit]);
      
      // Nastavit aktivní audit a premise
      setActiveAuditId(auditId);
      setActivePremiseId(premiseId);
      
      // Nastavit strukturu pro AuditChecklist
      setAuditStructureState(structureToUse);
      
      // Použít centrální funkci pro vytvoření/aktivaci tabu
      openOrActivateTab(
        auditId,
        'audit',
        premiseId,
        operator.operator_name,
        premise.premise_name,
        new Date().toISOString().split('T')[0], // auditDate
        AuditStatus.IN_PROGRESS
      );
      
      // Přeskočit HEADER_FORM a jít rovnou do AUDIT_IN_PROGRESS
      setAppState(AppState.AUDIT_IN_PROGRESS);
      
      toast.success('Audit byl vytvořen a můžete začít vyplňovat.');
    } catch (error) {
      console.error('[handleStartNewAudit] Error:', error);
      toast.error('Chyba při vytváření auditu.');
    }
  };

  const handlePrepareAudit = async (premiseId: string) => {
    try {
      const premise = premises.find(p => p.id === premiseId);
      const operator = premise ? operators.find(o => o.id === premise.operatorId) : null;
      
      if (!premise || !operator) {
        toast.error('Chyba: Nepodařilo se načíst data o pracovišti nebo provozovateli.');
        return;
      }

      // Načíst strukturu podle typu auditu z premise
      let structureToUse = auditStructure;
      let auditTypeIdToUse: string | undefined = premise.auditTypeId;
      
      if (auditTypeIdToUse) {
        try {
          const { fetchAuditType } = await import('./services/firestore/auditTypes');
          const auditType = await fetchAuditType(auditTypeIdToUse);
          if (auditType) {
            structureToUse = auditType.auditStructure;
          }
        } catch (error) {
          console.error('[handlePrepareAudit] Error loading audit type:', error);
          toast.error('Chyba při načítání typu auditu. Použita výchozí struktura.');
        }
      }

      // Načíst aktuální údaje auditora z Firestore
      const auditorInfo = await fetchAuditorInfo();

      const prefilledHeaderValues: AuditHeaderValues = {
        premise_name: premise.premise_name || '',
        premise_address: premise.premise_address || '',
        premise_responsible_person: premise.premise_responsible_person || '',
        premise_phone: premise.premise_phone || '',
        premise_email: premise.premise_email || '',
        operator_name: operator.operator_name || '',
        operator_address: operator.operator_address || '',
        operator_ico: operator.operator_ico || '',
        operator_statutory_body: operator.operator_statutory_body || '',
        operator_phone: operator.operator_phone || '',
        operator_email: operator.operator_email || '',
        auditor_name: auditorInfo.name,
        auditor_phone: auditorInfo.phone,
        auditor_email: auditorInfo.email,
        auditor_web: auditorInfo.web,
      };

      // Vytvořit audit s statusem DRAFT (Nezapočatý)
      const newAuditData: Omit<Audit, 'id'> = {
        premiseId: premiseId,
        status: AuditStatus.DRAFT,
        createdAt: new Date().toISOString(),
        headerValues: prefilledHeaderValues,
        answers: {},
        auditTypeId: auditTypeIdToUse,
      };

      // Generovat human-readable ID (formát: A{YYYYMMDD}_{COUNTER})
      const auditId = await createAudit({ ...newAuditData, id: await generateHumanReadableId('A', 'audits') });
      const newAudit: Audit = { ...newAuditData, id: auditId };
      
      // Aktualizovat lokální state
      setAudits(prev => [...prev, newAudit]);
      
      toast.success('Audit byl předpřipraven a je k dispozici v seznamu nezapočatých auditů.');
    } catch (error) {
      console.error('[handlePrepareAudit] Error:', error);
      toast.error('Chyba při předpřipravení auditu.');
    }
  };

  const handlePrepareNewAudit = async (auditTypeId?: string) => {
    // Pokud je aktivní tab typu audit_list, použít premiseId z tabu
    let premiseIdToUse = activePremiseId;
    
    if (activeTabId && tabs.length > 0) {
      const activeTab = tabs.find(t => t.id === activeTabId);
      if (activeTab?.type === 'audit_list') {
        premiseIdToUse = activeTab.premiseId;
      }
    }
    
    if (!premiseIdToUse) {
      toast.error('Chyba: Nebylo vybráno pracoviště pro nový audit.');
      return;
    }
    
    const activePremise = premises.find(p => p.id === premiseIdToUse);
    const activeOperator = activePremise ? operators.find(o => o.id === activePremise.operatorId) : null;
    if (!activePremise || !activeOperator) {
      toast.error('Chyba: Nepodařilo se načíst data o pracovišti nebo provozovateli.');
      return;
    }

    // Načíst strukturu podle typu auditu - použít auditTypeId z premise pokud existuje, jinak použít předaný parametr
    let structureToUse = auditStructure;
    const auditTypeIdToUse = activePremise.auditTypeId || auditTypeId;
    
    if (auditTypeIdToUse) {
      try {
        const { fetchAuditType } = await import('./services/firestore/auditTypes');
        const auditType = await fetchAuditType(auditTypeIdToUse);
        if (auditType) {
          structureToUse = auditType.auditStructure;
        }
      } catch (error) {
        console.error('[handlePrepareNewAudit] Error loading audit type:', error);
        toast.error('Chyba při načítání typu auditu. Použita výchozí struktura.');
      }
    } else {
      // Pokud premise nemá auditTypeId a není předán parametr, zobrazit modal pro výběr
      // Toto se stane jen u starých premises bez auditTypeId
      // Prozatím použijeme výchozí strukturu, ale v budoucnu můžeme zobrazit modal
    }

    // Načíst aktuální údaje auditora z Firestore
    const auditorInfo = await fetchAuditorInfo();

    const prefilledHeaderValues: AuditHeaderValues = {
      premise_name: activePremise.premise_name || '',
      premise_address: activePremise.premise_address || '',
      premise_responsible_person: activePremise.premise_responsible_person || '',
      premise_phone: activePremise.premise_phone || '',
      premise_email: activePremise.premise_email || '',
      operator_name: activeOperator.operator_name || '',
      operator_address: activeOperator.operator_address || '',
      operator_ico: activeOperator.operator_ico || '',
      operator_statutory_body: activeOperator.operator_statutory_body || '',
      operator_phone: activeOperator.operator_phone || '',
      operator_email: activeOperator.operator_email || '',
      auditor_name: auditorInfo.name,
      auditor_phone: auditorInfo.phone,
      auditor_email: auditorInfo.email,
      auditor_web: auditorInfo.web,
    };

    setActiveAuditId(null);
    setPendingHeader(prefilledHeaderValues);
    // Uložit auditTypeId do state pro pozdější vytvoření auditu
    if (auditTypeIdToUse) {
      // Uložit do sessionStorage nebo do state
      sessionStorage.setItem('pendingAuditTypeId', auditTypeIdToUse);
    }
    // Pokud je aktivní tab, nastavit také activePremiseId pro HEADER_FORM
    if (premiseIdToUse) {
      setActivePremiseId(premiseIdToUse);
    }
    // Deaktivovat aktivní tab, aby se zobrazil HEADER_FORM
    if (activeTabId) {
      setActiveTabId(null);
    }
    // Nastavit strukturu pro HeaderForm
    setAuditStructureState(structureToUse);
    setAppState(AppState.HEADER_FORM);
  };

  const handleDeleteAudit = async (auditId: string) => {
    try {
      // Smazat report nejdřív
      try {
        await deleteReportByAudit(auditId);
      } catch (reportError: any) {
        // Pokud report neexistuje, ignorovat chybu
      }
      
      // Smazat audit
      try {
        await deleteAudit(auditId);
      } catch (auditError: any) {
        // Pokud audit neexistuje, můžeme pokračovat (možná už je smazán)
        if (auditError?.code !== 'not-found') {
          throw auditError; // Jiné chyby znovu vyhodit
        }
      }
      
      // Aktualizovat lokální state
      setAudits(prev => prev.filter(a => a.id !== auditId));
      setReports(prev => prev.filter(r => r.auditId !== auditId));
      
      toast.success('Audit byl úspěšně smazán');
    } catch (error: any) {
      console.error('[handleDeleteAudit] Error:', error);
      toast.error(`Chyba při mazání auditu: ${error?.message || error?.code || 'Neznámá chyba'}`);
    }
  };

  const handleUnlockAudit = async (auditId: string) => {
    try {
      // Najít audit v lokálním state
      const audit = audits.find(a => a.id === auditId);
      if (!audit) {
        toast.error('Audit nenalezen');
        return;
      }

      // Odemknout audit - změnit status pouze pokud je DRAFT na IN_PROGRESS
      // Pokud je COMPLETED/LOCKED, neměnit status - změní se až při skutečných změnách v handleAnswerUpdate
      const newStatus = audit.status === AuditStatus.DRAFT || audit.status === AuditStatus.NOT_STARTED
        ? AuditStatus.IN_PROGRESS
        : audit.status; // Zachovat původní status pro COMPLETED/LOCKED audity

      // Aktualizovat status
      await updateAudit(auditId, { 
        status: newStatus
      });
      
      setAudits(prev => prev.map(a => a.id === auditId ? { ...a, status: newStatus } : a));
      setActiveAuditId(auditId);
      
      // Použít centrální funkci pro vytvoření/aktivaci tabu
      const premise = premises.find(p => p.id === audit.premiseId);
      const operator = premise ? operators.find(o => o.id === premise.operatorId) : null;
      const operatorName = operator?.operator_name || 'Neznámý';
      const premiseName = premise?.premise_name;
      
      openOrActivateTab(
        auditId,
        'audit',
        audit.premiseId,
        operatorName,
        premiseName,
        audit.createdAt ? new Date(audit.createdAt).toISOString().split('T')[0] : undefined,
        newStatus
      );
      
      // Aktualizovat tab - změnit typ na 'audit' pokud existuje report tab
      // (to už dělá openOrActivateTab, takže můžeme odstranit starou logiku)
    } catch (error) {
      console.error('[handleUnlockAudit] Error:', error);
      toast.error('Chyba při odemčení auditu. Zkuste to znovu.');
    }
  };

  const handleSelectAudit = (auditId: string, reportId?: string) => {
    const selectedAudit = audits.find(a => a.id === auditId);
    if (!selectedAudit) return;

    const premise = premises.find(p => p.id === selectedAudit.premiseId);
    const operator = premise ? operators.find(o => o.id === premise.operatorId) : null;
    const operatorName = operator?.operator_name || 'Neznámý';

    setActiveAuditId(auditId);
    setActivePremiseId(selectedAudit.premiseId);
    // Pokud je předán reportId, použít konkrétní verzi reportu
    if (reportId) {
      setActiveReportId(reportId);
    } else {
      setActiveReportId(null); // Reset na nejnovější verzi
    }

    // Určit typ tabu podle statusu auditu
    const isCompleted = selectedAudit.status === AuditStatus.COMPLETED || selectedAudit.status === AuditStatus.LOCKED;
    const tabType: 'audit' | 'report' = isCompleted ? 'report' : 'audit';

    // Použít centrální funkci pro vytvoření/aktivaci tabu
    const premiseName = premise?.premise_name;
    const auditDate = selectedAudit.createdAt ? new Date(selectedAudit.createdAt).toISOString().split('T')[0] : undefined;
    
    openOrActivateTab(
      auditId,
      tabType,
      selectedAudit.premiseId,
      operatorName,
      premiseName,
      auditDate,
      selectedAudit.status
    );

    // Nastavit appState podle typu tabu
    if (tabType === 'report') {
      setAppState(AppState.REPORT_VIEW);
    } else {
      setAppState(AppState.AUDIT_IN_PROGRESS);
    }
  };

  const handleTabClick = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    setActiveTabId(tabId);
    
    if (tab.type === 'audit_list') {
      // Pro audit_list nastavíme premiseId
      setActivePremiseId(tab.premiseId);
      setActiveAuditId(null);
      setActiveReportId(null); // Reset report ID
      setAppState(AppState.AUDIT_LIST);
    } else {
      // Pro audit a report nastavíme auditId a premiseId
      if (tab.auditId) {
        setActiveAuditId(tab.auditId);
        // Reset report ID na null, aby se použil nejnovější report
        setActiveReportId(null);
      }
      setActivePremiseId(tab.premiseId);
      
      // Nastavit appState podle typu tabu
      if (tab.type === 'report') {
        setAppState(AppState.REPORT_VIEW);
      } else {
        setAppState(AppState.AUDIT_IN_PROGRESS);
      }
    }
  };

  const handleTabClose = (tabId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();

    const tabIndex = tabs.findIndex(t => t.id === tabId);
    if (tabIndex === -1) return;

    const isActiveTab = tabId === activeTabId;
    const newTabs = tabs.filter(t => t.id !== tabId);

    setTabs(newTabs);

    if (isActiveTab) {
      // Pokud zavíráme aktivní tab, aktivovat jiný
      if (newTabs.length > 0) {
        // Aktivovat předchozí tab nebo první dostupný
        const newActiveTab = tabIndex > 0 ? newTabs[tabIndex - 1] : newTabs[0];
        setActiveTabId(newActiveTab.id);
        
        if (newActiveTab.type === 'audit_list') {
          setActivePremiseId(newActiveTab.premiseId);
          setActiveAuditId(null);
          setAppState(AppState.AUDIT_LIST);
        } else {
          if (newActiveTab.auditId) {
            setActiveAuditId(newActiveTab.auditId);
          }
          setActivePremiseId(newActiveTab.premiseId);
          // Nastavit appState podle typu tabu
          if (newActiveTab.type === 'report') {
            setAppState(AppState.REPORT_VIEW);
          } else {
            setAppState(AppState.AUDIT_IN_PROGRESS);
          }
        }
      } else {
        // Všechny taby zavřené, vrátit se na předchozí view
        setActiveTabId(null);
        setActiveAuditId(null);
        setActivePremiseId(null);
        setActiveReportId(null);
        setAppState(previousAppState);
      }
    }
  };

  const createNewAudit = async (headerValues: AuditHeaderValues, status: AuditStatus): Promise<Audit> => {
    if (!activePremiseId) throw new Error("Premise ID is missing");
    
    // Získat auditTypeId z premise pokud existuje, jinak z sessionStorage
    const premise = premises.find(p => p.id === activePremiseId);
    let auditTypeId: string | undefined = premise?.auditTypeId;
    
    if (!auditTypeId) {
      // Fallback na sessionStorage pro staré flow
      auditTypeId = sessionStorage.getItem('pendingAuditTypeId') || undefined;
      if (auditTypeId) {
        sessionStorage.removeItem('pendingAuditTypeId');
      }
    }
    
    // Generovat human-readable ID (formát: A{YYYYMMDD}_{COUNTER})
    const auditId = await generateHumanReadableId('A', 'audits');
    
    return {
      id: auditId,
      premiseId: activePremiseId,
      status: status,
      createdAt: new Date().toISOString(),
      headerValues: headerValues,
      answers: {},
      auditTypeId: auditTypeId,
    };
  };

  const handleHeaderUpdateAndReturn = async (headerValues: AuditHeaderValues) => {
    try {
      if (activeAuditId) {
        await updateAudit(activeAuditId, { headerValues });
        setAudits(prev => prev.map(a => (a.id === activeAuditId ? { ...a, headerValues } : a)));
      } else {
        const newAuditData = await createNewAudit(headerValues, AuditStatus.DRAFT);
        // Předat ID do createAudit, aby se použilo stejné ID ve Firestore
        const { id, ...auditDataWithoutId } = newAuditData;
        const newId = await createAudit({ ...auditDataWithoutId, id });
        const newAudit = { ...newAuditData, id: newId };
        setAudits(prev => [...prev, newAudit]);
      }
      handleBackToAuditList();
    } catch (error) {
      console.error('[handleHeaderUpdateAndReturn] Error:', error);
    }
  };

  const handleHeaderUpdateAndContinue = async (headerValues: AuditHeaderValues) => {
    try {
      let auditIdToContinue = activeAuditId;
      if (auditIdToContinue) {
        const audit = audits.find(a => a.id === auditIdToContinue);
        // Pokud je audit DRAFT nebo NOT_STARTED, změnit na IN_PROGRESS
        // Jinak zachovat aktuální status
        const newStatus = (audit?.status === AuditStatus.DRAFT || audit?.status === AuditStatus.NOT_STARTED)
          ? AuditStatus.IN_PROGRESS
          : audit?.status || AuditStatus.IN_PROGRESS;
        
        await updateAudit(auditIdToContinue, { headerValues, status: newStatus });
        setAudits(prev => prev.map(a => (a.id === auditIdToContinue ? { ...a, headerValues, status: newStatus } : a)));
      } else {
        const newAuditData = await createNewAudit(headerValues, AuditStatus.IN_PROGRESS);
        // Předat ID do createAudit, aby se použilo stejné ID ve Firestore
        const { id, ...auditDataWithoutId } = newAuditData;
        const newId = await createAudit({ ...auditDataWithoutId, id });
        auditIdToContinue = newId;
        const newAudit = { ...newAuditData, id: newId };
        setAudits(prev => [...prev, newAudit]);
      }
      
      setActiveAuditId(auditIdToContinue);
      
      // Použít centrální funkci pro vytvoření/aktivaci tabu
      const premise = premises.find(p => p.id === activePremiseId);
      const operator = premise ? operators.find(o => o.id === premise.operatorId) : null;
      const operatorName = operator?.operator_name || 'Neznámý';
      const premiseName = premise?.premise_name;
      const audit = audits.find(a => a.id === auditIdToContinue);
      const auditDate = audit?.createdAt ? new Date(audit.createdAt).toISOString().split('T')[0] : undefined;
      
      openOrActivateTab(
        auditIdToContinue,
        'audit',
        activePremiseId || '',
        operatorName,
        premiseName,
        auditDate,
        AuditStatus.IN_PROGRESS
      );
      
      setPendingHeader(null);
    } catch (error) {
      console.error('[handleHeaderUpdateAndContinue] Error:', error);
      toast.error('Chyba při vytváření auditu. Zkuste to znovu.');
    }
  };

  const handleSaveProgress = useCallback(async () => {
    if (!activeAuditId) return;
    
    const audit = audits.find(a => a.id === activeAuditId);
    if (!audit) return;
    
    // Pokud je audit dokončen (COMPLETED nebo starý LOCKED), změnit na REVISED
    const shouldChangeToRevised = audit.status === AuditStatus.COMPLETED || audit.status === AuditStatus.LOCKED;
    const newStatus = shouldChangeToRevised ? AuditStatus.REVISED : audit.status;
    
    // Pokud je status DRAFT a má nějaké odpovědi, změnit na IN_PROGRESS
    const finalStatus = (audit.status === AuditStatus.DRAFT && Object.keys(audit.answers).length > 0)
      ? AuditStatus.IN_PROGRESS
      : newStatus;
    
    try {
      // Sanitizovat všechny answers - odstranit File objekty před uložením do Firestore
      const sanitizedAnswers = sanitizeAnswersForFirestore(audit.answers);
      await updateAudit(activeAuditId, { 
        answers: sanitizedAnswers,
        status: finalStatus 
      });
      setAudits(prev => prev.map(a => a.id === activeAuditId ? { ...a, status: finalStatus } : a));
      toast.success('Průběh byl uložen');
    } catch (error) {
      console.error('[handleSaveProgress] Error:', error);
      toast.error('Chyba při ukládání průběhu');
    }
  }, [activeAuditId, audits]);

  // Pomocná funkce pro odstranění File objektů z photos před uložením do Firestore
  const sanitizeAnswerForFirestore = (answer: AuditAnswer): AuditAnswer => {
    if (!answer.nonComplianceData) return answer;
    
    return {
      ...answer,
      nonComplianceData: answer.nonComplianceData.map(nc => ({
        ...nc,
        photos: nc.photos.map(photo => {
          // Odstranit File objekt - nelze ukládat do Firestore
          const { file, ...photoWithoutFile } = photo;
          return photoWithoutFile;
        })
      }))
    };
  };

  // Sanitizovat všechny answers před uložením do Firestore
  const sanitizeAnswersForFirestore = (answers: { [itemId: string]: AuditAnswer }): { [itemId: string]: AuditAnswer } => {
    const sanitized: { [itemId: string]: AuditAnswer } = {};
    for (const [itemId, answer] of Object.entries(answers)) {
      sanitized[itemId] = sanitizeAnswerForFirestore(answer);
    }
    return sanitized;
  };

  const handleAnswerUpdate = useCallback(async (itemId: string, answer: any) => {
    if (!activeAuditId) return;
    
    const audit = audits.find(a => a.id === activeAuditId);
    if (!audit) return;
    
    // Vypočítat nový status
    let finalStatus = audit.status;
    
    // Pokud je audit dokončen a uživatel dělá změny, změnit na REVISED
    if (audit.status === AuditStatus.COMPLETED || audit.status === AuditStatus.LOCKED) {
      finalStatus = AuditStatus.REVISED;
    }
    // Pokud je status DRAFT/NOT_STARTED a má nějaké odpovědi, změnit na IN_PROGRESS
    else if ((audit.status === AuditStatus.DRAFT || audit.status === AuditStatus.NOT_STARTED)) {
      const newAnswers = { ...audit.answers, [itemId]: answer };
      // Pokud má alespoň jednu odpověď, změnit na IN_PROGRESS
      if (Object.keys(newAnswers).length > 0) {
        finalStatus = AuditStatus.IN_PROGRESS;
      }
    }
    
    // Optimisticky aktualizovat UI
    setAudits(prev => prev.map(audit => {
      if (audit.id === activeAuditId) {
        const newAnswers = { ...audit.answers, [itemId]: answer };
        return { ...audit, answers: newAnswers, status: finalStatus };
      }
      return audit;
    }));
    
    // Uložit do Firestore
    try {
      // Sanitizovat všechny answers - odstranit File objekty před uložením do Firestore
      const newAnswers = { ...audit.answers, [itemId]: answer };
      const sanitizedAnswers = sanitizeAnswersForFirestore(newAnswers);
      await updateAudit(activeAuditId, { 
        answers: sanitizedAnswers,
        status: finalStatus 
      });
    } catch (error) {
      console.error('[handleAnswerUpdate] Error:', error);
    }
  }, [activeAuditId, audits]);

  const handleFinishAudit = async () => {
    if (!activeAuditId) return;

    try {
      const completedAt = new Date().toISOString();
      
      // Aktualizovat audit status
      await updateAudit(activeAuditId, {
        status: AuditStatus.COMPLETED,
        completedAt
      });
      
      setAudits(prev => prev.map(a => a.id === activeAuditId
        ? { ...a, status: AuditStatus.COMPLETED, completedAt }
        : a
      ));

      // NEMAZAT staré reporty - místo toho označit všechny staré jako isLatest: false
      // Nový report se vytvoří s isLatest: true v createReport funkci
      // Neodstraňujeme reporty ze state, protože chceme zachovat historii

      // Vytvoř nový report (createReport automaticky označí staré jako isLatest: false)
      const newReportData: Omit<Report, 'id'> = {
        auditId: activeAuditId,
        status: ReportStatus.PENDING,
        createdAt: new Date().toISOString(),
      };
      
      const newId = await createReport(newReportData);
      const newReport: Report = { ...newReportData, id: newId };
      
      // Načíst všechny verze reportů pro aktualizaci state (včetně nového)
      const allReports = await fetchReportsByAudit(activeAuditId);
      setReports(prev => {
        // Odstranit staré reporty pro tento audit a přidat všechny nové verze
        const filtered = prev.filter(r => r.auditId !== activeAuditId);
        return [...filtered, ...allReports];
      });

      // Aktualizovat tab - použít centrální funkci
      const activeAudit = audits.find(a => a.id === activeAuditId);
      if (activeAudit) {
        const premise = premises.find(p => p.id === activeAudit.premiseId);
        const operator = premise ? operators.find(o => o.id === premise.operatorId) : null;
        const operatorName = operator?.operator_name || 'Neznámý';
        const premiseName = premise?.premise_name;
        const auditDate = activeAudit.createdAt ? new Date(activeAudit.createdAt).toISOString().split('T')[0] : undefined;
        
        openOrActivateTab(
          activeAuditId,
          'report',
          activeAudit.premiseId,
          operatorName,
          premiseName,
          auditDate,
          AuditStatus.COMPLETED
        );
        
        setAppState(AppState.REPORT_VIEW);
      }
    } catch (error) {
      console.error('[handleFinishAudit] Error:', error);
    }
  };

  const handleDeleteReportVersion = async (reportId: string, auditId: string) => {
    try {
      await deleteReport(reportId);
      
      // Aktualizovat lokální state
      setReports(prev => prev.filter(r => r.id !== reportId));
      
      toast.success('Verze reportu byla smazána');
    } catch (error) {
      console.error('[handleDeleteReportVersion] Error:', error);
      toast.error('Chyba při mazání verze reportu');
    }
  };

  const handleSetReportAsLatest = async (reportId: string, auditId: string) => {
    try {
      // Načíst všechny verze pro tento audit
      const allVersions = await fetchReportsByAudit(auditId);
      
      // Použít batch pro atomickou aktualizaci
      const batch = writeBatch(db);
      
      // Označit všechny verze jako isLatest: false
      allVersions.forEach(report => {
        const reportRef = doc(db, 'reports', report.id);
        batch.update(reportRef, { isLatest: false });
      });
      
      // Nastavit vybranou verzi jako isLatest: true
      const selectedReportRef = doc(db, 'reports', reportId);
      batch.update(selectedReportRef, { isLatest: true });
      
      await batch.commit();
      
      // Aktualizovat lokální state
      setReports(prev => prev.map(r => ({
        ...r,
        isLatest: r.id === reportId
      })));
      
      toast.success('Verze byla nastavena jako aktuální');
    } catch (error) {
      console.error('[handleSetReportAsLatest] Error:', error);
      toast.error('Chyba při nastavení verze jako aktuální');
    }
  };

  const handleCancelReportGeneration = async (reportId: string) => {
    try {
      // Změnit status reportu na ERROR s popisem o zrušení
      await updateReport(reportId, {
        status: ReportStatus.ERROR,
        error: 'Generování bylo zrušeno uživatelem'
      });
      
      setReports(prev => prev.map(r => 
        r.id === reportId 
          ? { ...r, status: ReportStatus.ERROR, error: 'Generování bylo zrušeno uživatelem' }
          : r
      ));
      
      toast.success('Generování reportu bylo zrušeno');
    } catch (error) {
      console.error('[handleCancelReportGeneration] Error:', error);
      toast.error('Chyba při rušení generování reportu');
    }
  };

  const handleToggleAdmin = () => {
    setAppState(prev => prev === AppState.SETTINGS || prev === AppState.ADMIN ? AppState.OPERATOR_DASHBOARD : AppState.SETTINGS);
  };

  const handleNavigateToAdmin = () => {
    setAppState(AppState.ADMIN);
  };

  const handleNavigateToUserManagement = () => {
    setAppState(AppState.USER_MANAGEMENT);
  };

  const handleBackFromAdmin = () => {
    setAppState(AppState.SETTINGS);
  };

  const handleBackFromSettings = () => {
    setAppState(AppState.INCOMPLETE_AUDITS);
  };

  const handleNavigateToAuditorSettings = () => {
    setAppState(AppState.AUDITOR_SETTINGS);
  };

  const handleBackFromAuditorSettings = () => {
    setAppState(AppState.SETTINGS);
  };

  const handleNavigateToAIReportSettings = () => {
    setAppState(AppState.AI_REPORT_SETTINGS);
  };

  const handleBackFromAIReportSettings = () => {
    setAppState(AppState.SETTINGS);
  };

  const handleNavigateToAIUsageStats = () => {
    setAppState(AppState.AI_USAGE_STATS);
  };

  const handleBackFromAIUsageStats = () => {
    setAppState(AppState.SETTINGS);
  };

  const handleNavigateToAIPricingConfig = () => {
    setAppState(AppState.AI_PRICING_CONFIG);
  };

  const handleBackFromAIPricingConfig = () => {
    setAppState(AppState.SETTINGS);
  };

  const handleNavigateToAIPrompts = () => {
    setAppState(AppState.AI_PROMPTS);
  };

  const handleBackFromAIPrompts = () => {
    setAppState(AppState.SETTINGS);
  };

  const handleNavigateToSmartTemplateSettings = () => {
    setAppState(AppState.SMART_TEMPLATE_SETTINGS);
  };

  const handleBackFromSmartTemplateSettings = () => {
    setAppState(AppState.SETTINGS);
  };

  const handleNavigate = (newState: AppState) => {
    // Pokud jsou otevřené taby a navigujeme na jinou obrazovku, deaktivujeme taby
    if (tabs.length > 0 && activeTabId) {
      // Pokud navigujeme na obrazovku, která není v tabu, deaktivujeme aktivní tab
      const isTabView = newState === AppState.AUDIT_LIST || 
                       newState === AppState.AUDIT_IN_PROGRESS || 
                       newState === AppState.REPORT_VIEW;
      
      if (!isTabView) {
        // Deaktivovat aktuální tab, ale ponechat ho v tabs array
        setActiveTabId(null);
        setActiveAuditId(null);
        // Pokud navigujeme z audit_list tabu, také resetovat activePremiseId
        const activeTab = tabs.find(t => t.id === activeTabId);
        if (activeTab?.type === 'audit_list') {
          setActivePremiseId(null);
        }
      }
    }
    
    // Nastavit nový stav
    setAppState(newState);
  };

  // --- RENDER LOGIC ---
  const renderContent = () => {
    if (isLoading) return <div className="text-center"><p>Načítání dat ze serveru...</p></div>;
    if (error) return <div className="text-center text-red-600"><p>{error}</p></div>;

    // Pokud existují taby a aktivní tab, zobrazit obsah podle tabu
    if (activeTabId && tabs.length > 0) {
      const activeTab = tabs.find(t => t.id === activeTabId);
      if (activeTab) {
        if (activeTab.type === 'audit_list') {
          // Zobrazit seznam auditů pro pracoviště
          const activePremise = premises.find(p => p.id === activeTab.premiseId);
          const premiseAudits = audits.filter(a => a.premiseId === activeTab.premiseId);
          return <AuditList
            premiseName={activePremise?.premise_name || ''}
            premiseId={activeTab.premiseId}
            audits={premiseAudits}
            reports={reports.filter(r => premiseAudits.some(a => a.id === r.auditId))}
            operators={operators}
            premises={premises}
            onSelectAudit={handleSelectAudit}
            onPrepareNewAudit={handlePrepareNewAudit}
            onPrepareAudit={handlePrepareAudit}
            onStartNewAudit={handleStartNewAudit}
            onDeleteAudit={handleDeleteAudit}
            onUnlockAudit={handleUnlockAudit}
            onCancelReportGeneration={handleCancelReportGeneration}
            onDeleteReportVersion={handleDeleteReportVersion}
            onSetReportAsLatest={handleSetReportAsLatest}
            onBack={handleBackToAuditList}
          />;
        } else if (activeTab.type === 'report' && activeAudit) {
          // Načíst všechny verze reportů pro tento audit z lokálního state
          const allVersions = reports.filter(r => r.auditId === activeAudit.id)
            .sort((a, b) => (b.versionNumber || 0) - (a.versionNumber || 0));
          return (
            <ReportView 
              report={activeReport} 
              audit={activeAudit} 
              auditStructure={auditStructure}
              reportVersions={allVersions}
              onSelectVersion={(reportId) => {
                setActiveReportId(reportId);
              }}
              onBack={handleBackToAuditList} 
            />
          );
        } else if (activeTab.type === 'audit' && activeAudit) {
          return <AuditChecklist auditData={activeAudit} auditStructure={auditStructure} onAnswerUpdate={handleAnswerUpdate} onComplete={handleFinishAudit} onSaveProgress={handleSaveProgress} onBack={handleBackToAuditList} log={log} />;
        }
      }
    }

    // Pokud existují taby, ale žádný není aktivní, zobrazit předchozí view
    if (tabs.length > 0 && !activeTabId) {
      // Zobrazit obsah podle appState (který už byl nastaven na previousAppState v handleBackToAuditList)
      // Pokračujeme na switch níže
    }

    // Standardní render podle appState
    switch (appState) {
      case AppState.OPERATOR_DASHBOARD:
        return <OperatorDashboard 
          operators={operators} 
          premises={premises}
          audits={audits}
          onSelectPremise={handleSelectPremiseForAudits} 
          onAddNewOperator={handleAddNewOperator} 
          onEditOperator={handleEditOperator} 
          onDeleteOperator={handleDeleteOperator}
          onAddPremise={handleAddPremise}
          onEditPremise={handleEditPremise}
          onDeletePremise={handleDeletePremise}
          onStartNewAudit={handleStartNewAudit}
          onPrepareAudit={handlePrepareAudit}
        />;
      case AppState.ADD_OPERATOR:
      case AppState.EDIT_OPERATOR:
        return <OperatorForm initialData={appState === AppState.EDIT_OPERATOR ? operatorToEdit || null : null} onSave={handleSaveOperator} onBack={handleBackToDashboard} />;
      case AppState.ADD_PREMISE:
      case AppState.EDIT_PREMISE:
        return <PremiseForm 
          initialData={appState === AppState.EDIT_PREMISE ? premiseToEdit || null : null} 
          operatorId={activeOperatorId || ''}
          onSave={handleSavePremise} 
          onBack={handleBackToDashboard} 
        />;
      case AppState.AUDIT_LIST: {
        const activePremise = premises.find(p => p.id === activePremiseId);
        const premiseAudits = audits.filter(a => a.premiseId === activePremiseId);
        return <AuditList
          premiseName={activePremise?.premise_name || ''}
          premiseId={activePremiseId}
          audits={premiseAudits}
          reports={reports.filter(r => premiseAudits.some(a => a.id === r.auditId))}
          operators={operators}
          premises={premises}
          onSelectAudit={handleSelectAudit}
          onPrepareNewAudit={handlePrepareNewAudit}
          onPrepareAudit={handlePrepareAudit}
          onStartNewAudit={handleStartNewAudit}
          onDeleteAudit={handleDeleteAudit}
          onUnlockAudit={handleUnlockAudit}
          onCancelReportGeneration={handleCancelReportGeneration}
          onDeleteReportVersion={handleDeleteReportVersion}
          onSetReportAsLatest={handleSetReportAsLatest}
          onBack={handleBackToDashboard}
        />;
      }
      case AppState.ALL_AUDITS:
        return <AllAuditsScreen
          audits={audits}
          operators={operators}
          premises={premises}
          reports={reports}
          onSelectAudit={handleSelectAudit}
          onDeleteAudit={handleDeleteAudit}
          onUnlockAudit={handleUnlockAudit}
          sectionTheme={SECTION_THEMES[AppState.ALL_AUDITS]}
          onCancelReportGeneration={handleCancelReportGeneration}
          onDeleteReportVersion={handleDeleteReportVersion}
          onSetReportAsLatest={handleSetReportAsLatest}
        />;
      case AppState.INCOMPLETE_AUDITS:
        // Filtrovat pouze nezapočaté audity (DRAFT)
        const incompleteAudits = audits.filter(a => 
          a.status === AuditStatus.DRAFT || 
          a.status === AuditStatus.NOT_STARTED // zpětná kompatibilita
        );
        return <AllAuditsScreen
          audits={incompleteAudits}
          operators={operators}
          premises={premises}
          reports={reports}
          onSelectAudit={handleSelectAudit}
          onAddNewAudit={() => {
            // Nejprve vybrat pracoviště - pokud není žádné, musí uživatel jít do Zákazníků
            if (premises.length === 0) {
              toast.error('Nejprve musíte vytvořit pracoviště v sekci Zákazníci');
              setAppState(AppState.OPERATOR_DASHBOARD);
              return;
            }
            // Pokud je jen jedno pracoviště, použít ho
            if (premises.length === 1) {
              setActivePremiseId(premises[0].id);
              handlePrepareNewAudit();
            } else {
              // Pokud je více pracovišť, jít na dashboard
              toast.info('Vyberte pracoviště pro nový audit');
              setAppState(AppState.OPERATOR_DASHBOARD);
            }
          }}
          title="Nezapočaté audity"
          description="Seznam auditů, které ještě nebyly započaty"
          showStatusFilter={false}
          sectionTheme={SECTION_THEMES[AppState.INCOMPLETE_AUDITS]}
          onCancelReportGeneration={handleCancelReportGeneration}
          onDeleteReportVersion={handleDeleteReportVersion}
          onSetReportAsLatest={handleSetReportAsLatest}
        />;
      case AppState.IN_PROGRESS_AUDITS:
        // Filtrovat pouze probíhající audity (IN_PROGRESS)
        const inProgressAudits = audits.filter(a => 
          a.status === AuditStatus.IN_PROGRESS
        );
        return <AllAuditsScreen
          audits={inProgressAudits}
          operators={operators}
          premises={premises}
          reports={reports}
          onSelectAudit={handleSelectAudit}
          onAddNewAudit={() => {
            // Nejprve vybrat pracoviště - pokud není žádné, musí uživatel jít do Zákazníků
            if (premises.length === 0) {
              toast.error('Nejprve musíte vytvořit pracoviště v sekci Zákazníci');
              setAppState(AppState.OPERATOR_DASHBOARD);
              return;
            }
            // Pokud je jen jedno pracoviště, použít ho
            if (premises.length === 1) {
              setActivePremiseId(premises[0].id);
              handlePrepareNewAudit();
            } else {
              // Pokud je více pracovišť, jít na dashboard
              toast.info('Vyberte pracoviště pro nový audit');
              setAppState(AppState.OPERATOR_DASHBOARD);
            }
          }}
          title="Probíhající audity"
          description="Seznam auditů, které jsou právě v procesu"
          showStatusFilter={false}
          sectionTheme={SECTION_THEMES[AppState.IN_PROGRESS_AUDITS]}
          onCancelReportGeneration={handleCancelReportGeneration}
          onDeleteReportVersion={handleDeleteReportVersion}
          onSetReportAsLatest={handleSetReportAsLatest}
        />;
      case AppState.HEADER_FORM: {
        const initialValues = activeAudit ? activeAudit.headerValues : pendingHeader;
        if (!initialValues) return <p>Chyba: Chybí data pro záhlaví auditu.</p>
        return <HeaderForm headerData={auditStructure.header_data} initialValues={initialValues} onSaveAndBack={handleHeaderUpdateAndReturn} onSaveAndContinue={handleHeaderUpdateAndContinue} onBack={handleBackToAuditList} />;
      }
      case AppState.AUDIT_IN_PROGRESS: {
        // Tento case se už nepoužívá když jsou taby, ale zůstává pro zpětnou kompatibilitu
        if (!activeAudit) {
          return <p>Chyba: Aktivní audit nebyl nalezen při pokusu o zobrazení checklistu.</p>;
        }
        return <AuditChecklist auditData={activeAudit} auditStructure={auditStructure} onAnswerUpdate={handleAnswerUpdate} onComplete={handleFinishAudit} onSaveProgress={handleSaveProgress} onBack={handleBackToAuditList} log={log} />;
      }
      case AppState.REPORT_VIEW: {
        // Tento case se už nepoužívá když jsou taby, ale zůstává pro zpětnou kompatibilitu
        if (!activeAudit) return <p>Chyba: Audit pro report nebyl nalezen.</p>
        // Načíst všechny verze reportů pro tento audit z lokálního state
        const allVersions = reports.filter(r => r.auditId === activeAudit.id)
          .sort((a, b) => (b.versionNumber || 0) - (a.versionNumber || 0));
        return (
          <ReportView 
            report={activeReport} 
            audit={activeAudit} 
            auditStructure={auditStructure}
            reportVersions={allVersions}
            onSelectVersion={(reportId) => {
              setActiveReportId(reportId);
            }}
            onBack={handleBackToAuditList} 
          />
        );
      }
      case AppState.SETTINGS:
        return <SettingsScreen onNavigateToAdmin={handleNavigateToAdmin} onNavigateToUserManagement={handleNavigateToUserManagement} onNavigateToAuditorSettings={handleNavigateToAuditorSettings} onNavigateToAIReportSettings={handleNavigateToAIReportSettings} onNavigateToAIUsageStats={handleNavigateToAIUsageStats} onNavigateToAIPricingConfig={handleNavigateToAIPricingConfig} onNavigateToAIPrompts={handleNavigateToAIPrompts} onNavigateToSmartTemplateSettings={handleNavigateToSmartTemplateSettings} onBack={handleBackFromSettings} />;
      case AppState.USER_MANAGEMENT:
        return <UserManagementScreen onBack={handleBackFromSettings} />;
      case AppState.AUDITOR_SETTINGS:
        return <AuditorSettingsScreen onBack={handleBackFromAuditorSettings} />;
      case AppState.AI_REPORT_SETTINGS:
        return <AIReportSettingsScreen onBack={handleBackFromAIReportSettings} />;
      case AppState.AI_USAGE_STATS:
        return <AIUsageStatsScreen onBack={handleBackFromAIUsageStats} />;
      case AppState.AI_PRICING_CONFIG:
        return <AIPricingConfigScreen onBack={handleBackFromAIPricingConfig} />;
      case AppState.AI_PROMPTS:
        return <AIPromptsScreen onBack={handleBackFromAIPrompts} />;
      case AppState.SMART_TEMPLATE_SETTINGS:
        return <SmartTemplateSettingsScreen onBack={handleBackFromSmartTemplateSettings} />;
      case AppState.ADMIN:
        return (
          <div>
            <div className="p-4 bg-white shadow-md mb-4">
              <button
                onClick={handleBackFromAdmin}
                className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                ← Zpět na Nastavení
              </button>
            </div>
            <AdminScreen auditStructure={auditStructure} setAuditStructure={setAuditStructureState} />
          </div>
        );
      default:
        return <OperatorDashboard 
          operators={operators} 
          premises={premises}
          audits={audits}
          onSelectPremise={handleSelectPremiseForAudits} 
          onAddNewOperator={handleAddNewOperator} 
          onEditOperator={handleEditOperator} 
          onDeleteOperator={handleDeleteOperator}
          onAddPremise={handleAddPremise}
          onEditPremise={handleEditPremise}
          onDeletePremise={handleDeletePremise}
          onStartNewAudit={handleStartNewAudit}
          onPrepareAudit={handlePrepareAudit}
        />;
    }
  };

  // Determine if sidebar should be shown (hide for forms and specific screens)
  const shouldShowSidebar = ![
    AppState.ADD_OPERATOR,
    AppState.EDIT_OPERATOR,
    AppState.ADD_PREMISE,
    AppState.EDIT_PREMISE,
  ].includes(appState);

  return (
    <ErrorBoundary>
      <Layout
        currentView={appState}
        onNavigate={handleNavigate}
        showSidebar={shouldShowSidebar}
        activePremiseId={activePremiseId}
        activeAuditId={activeAuditId}
        tabs={tabs}
        activeTabId={activeTabId}
        onTabClick={handleTabClick}
        onTabClose={handleTabClose}
      >
        <div className="p-4 sm:p-6 lg:p-8">
          {renderContent()}
        </div>
      </Layout>
      <ToastContainer />
    </ErrorBoundary>
  );
};

export default App;
