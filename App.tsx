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
import { AppState, Audit, Operator, Premise, AuditStatus, Report, ReportStatus, AuditStructure, AuditHeaderValues } from './types';
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
  fetchAuditorInfo,
  fetchPremisesByOperator
} from './services/firestore';
import { fetchAuditStructure } from './services/firestore/settings';

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

  // --- STATE MANAGEMENT ---
  const [appState, setAppState] = useState<AppState>(AppState.INCOMPLETE_AUDITS);
  const [activeOperatorId, setActiveOperatorId] = useState<string | null>(null);
  const [activePremiseId, setActivePremiseId] = useState<string | null>(null);
  const [activeAuditId, setActiveAuditId] = useState<string | null>(null);
  const [auditStructure, setAuditStructureState] = useState<AuditStructure>(DEFAULT_AUDIT_STRUCTURE);
  const [pendingHeader, setPendingHeader] = useState<AuditHeaderValues | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loadingAuditStructure, setLoadingAuditStructure] = useState(true);

  // Načíst audit structure z Firestore při startu
  useEffect(() => {
    const loadAuditStructure = async () => {
      try {
        const savedStructure = await fetchAuditStructure();
        if (savedStructure) {
          setAuditStructureState(savedStructure);
        } else {
          // Pokud není v databázi, uložit výchozí
          const { saveAuditStructure } = await import('./services/firestore/settings');
          await saveAuditStructure(DEFAULT_AUDIT_STRUCTURE);
        }
      } catch (error) {
        console.error('[App] Error loading audit structure:', error);
        // Při chybě použít výchozí strukturu
      } finally {
        setLoadingAuditStructure(false);
      }
    };

    loadAuditStructure();
  }, []);

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
    onReportUpdate: (reportId, updates) => {
      setReports(prev =>
        prev.map(r => (r.id === reportId ? { ...r, ...updates } : r))
      );
    },
  });

  // --- DERIVED STATE ---
  const activeAudit = useMemo(() => audits.find(a => a.id === activeAuditId), [audits, activeAuditId]);
  const activeReport = useMemo(() => reports.find(r => r.auditId === activeAuditId), [reports, activeAuditId]);
  const operatorToEdit = useMemo(() => operators.find(o => o.id === activeOperatorId), [operators, activeOperatorId]);
  const premiseToEdit = useMemo(() => premises.find(p => p.id === activePremiseId), [premises, activePremiseId]);

  // --- NAVIGATION & ACTIONS ---
  const handleBackToDashboard = () => {
    setAppState(AppState.OPERATOR_DASHBOARD);
    setActiveOperatorId(null);
    setActivePremiseId(null);
    setActiveAuditId(null);
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

  const handleSelectPremiseForAudits = (premiseId: string) => {
    setActivePremiseId(premiseId);
    setAppState(AppState.AUDIT_LIST);
  };

  const handleBackToAuditList = () => {
    setAppState(AppState.AUDIT_LIST);
    setActiveAuditId(null);
    setPendingHeader(null);
  };

  const handlePrepareNewAudit = async () => {
    if (!activePremiseId) return;
    const activePremise = premises.find(p => p.id === activePremiseId);
    const activeOperator = activePremise ? operators.find(o => o.id === activePremise.operatorId) : null;
    if (!activePremise || !activeOperator) return;

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

      // Pokud je audit dokončen (COMPLETED nebo starý LOCKED), změnit na REVISED
      // Jinak změnit na IN_PROGRESS
      const newStatus = (audit.status === AuditStatus.COMPLETED || audit.status === AuditStatus.LOCKED)
        ? AuditStatus.REVISED
        : AuditStatus.IN_PROGRESS;

      // Aktualizovat status
      await updateAudit(auditId, { 
        status: newStatus
      });
      
      setAudits(prev => prev.map(a => a.id === auditId ? { ...a, status: newStatus } : a));
      setActiveAuditId(auditId);
      setAppState(AppState.AUDIT_IN_PROGRESS);
    } catch (error) {
      console.error('[handleUnlockAudit] Error:', error);
      toast.error('Chyba při odemčení auditu. Zkuste to znovu.');
    }
  };

  const handleSelectAudit = (auditId: string) => {
    const selectedAudit = audits.find(a => a.id === auditId);
    if (!selectedAudit) return;

    setActiveAuditId(auditId);
    setActivePremiseId(selectedAudit.premiseId); // Nastavit také premiseId pro správnou navigaci

    // Pokud je audit dokončen (COMPLETED nebo starý LOCKED), zobrazit report
    if (selectedAudit.status === AuditStatus.COMPLETED || selectedAudit.status === AuditStatus.LOCKED) {
      setAppState(AppState.REPORT_VIEW);
    } else {
      setAppState(AppState.AUDIT_IN_PROGRESS);
    }
  };

  const createNewAudit = (headerValues: AuditHeaderValues, status: AuditStatus): Audit => {
    if (!activePremiseId) throw new Error("Premise ID is missing");
    return {
      id: `audit_${Date.now()}`,
      premiseId: activePremiseId,
      status: status,
      createdAt: new Date().toISOString(),
      headerValues: headerValues,
      answers: {},
    };
  };

  const handleHeaderUpdateAndReturn = async (headerValues: AuditHeaderValues) => {
    try {
      if (activeAuditId) {
        await updateAudit(activeAuditId, { headerValues });
        setAudits(prev => prev.map(a => (a.id === activeAuditId ? { ...a, headerValues } : a)));
      } else {
        const newAuditData = createNewAudit(headerValues, AuditStatus.DRAFT);
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
        const newAuditData = createNewAudit(headerValues, AuditStatus.IN_PROGRESS);
        // Předat ID do createAudit, aby se použilo stejné ID ve Firestore
        const { id, ...auditDataWithoutId } = newAuditData;
        const newId = await createAudit({ ...auditDataWithoutId, id });
        auditIdToContinue = newId;
        const newAudit = { ...newAuditData, id: newId };
        setAudits(prev => [...prev, newAudit]);
      }
      setActiveAuditId(auditIdToContinue);
      setAppState(AppState.AUDIT_IN_PROGRESS);
      setPendingHeader(null);
    } catch (error) {
      console.error('[handleHeaderUpdateAndContinue] Error:', error);
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
      await updateAudit(activeAuditId, { status: finalStatus });
      setAudits(prev => prev.map(a => a.id === activeAuditId ? { ...a, status: finalStatus } : a));
      toast.success('Průběh byl uložen');
    } catch (error) {
      console.error('[handleSaveProgress] Error:', error);
      toast.error('Chyba při ukládání průběhu');
    }
  }, [activeAuditId, audits]);

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
      const newAnswers = { ...audit.answers, [itemId]: answer };
      await updateAudit(activeAuditId, { 
        answers: newAnswers,
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

      // Smazat starý report pokud existuje
      await deleteReportByAudit(activeAuditId);
      setReports(prev => prev.filter(r => r.auditId !== activeAuditId));

      // Vytvoř nový report
      const newReportData: Omit<Report, 'id'> = {
        auditId: activeAuditId,
        status: ReportStatus.PENDING,
        createdAt: new Date().toISOString(),
      };
      
      const newId = await createReport(newReportData);
      const newReport: Report = { ...newReportData, id: newId };
      setReports(prev => [...prev, newReport]);
      setAppState(AppState.REPORT_VIEW);
    } catch (error) {
      console.error('[handleFinishAudit] Error:', error);
    }
  };

  const handleToggleAdmin = () => {
    setAppState(prev => prev === AppState.SETTINGS || prev === AppState.ADMIN ? AppState.OPERATOR_DASHBOARD : AppState.SETTINGS)
  }

  const handleNavigateToAdmin = () => {
    setAppState(AppState.ADMIN);
  }

  const handleNavigateToUserManagement = () => {
    setAppState(AppState.USER_MANAGEMENT);
  }

  const handleBackFromAdmin = () => {
    setAppState(AppState.SETTINGS);
  }

  const handleBackFromSettings = () => {
    setAppState(AppState.INCOMPLETE_AUDITS);
  };

  const handleNavigateToAuditorSettings = () => {
    setAppState(AppState.AUDITOR_SETTINGS);
  }

  const handleBackFromAuditorSettings = () => {
    setAppState(AppState.SETTINGS);
  }

  const handleNavigateToAIReportSettings = () => {
    setAppState(AppState.AI_REPORT_SETTINGS);
  }

  const handleBackFromAIReportSettings = () => {
    setAppState(AppState.SETTINGS);
  }

  const handleNavigateToAIUsageStats = () => {
    setAppState(AppState.AI_USAGE_STATS);
  }

  const handleBackFromAIUsageStats = () => {
    setAppState(AppState.SETTINGS);
  }

  const handleNavigateToAIPricingConfig = () => {
    setAppState(AppState.AI_PRICING_CONFIG);
  }

  const handleBackFromAIPricingConfig = () => {
    setAppState(AppState.SETTINGS);
  }

  // --- RENDER LOGIC ---
  const renderContent = () => {
    if (isLoading) return <div className="text-center"><p>Načítání dat ze serveru...</p></div>;
    if (error) return <div className="text-center text-red-600"><p>{error}</p></div>;

    switch (appState) {
      case AppState.OPERATOR_DASHBOARD:
        return <OperatorDashboard 
          operators={operators} 
          premises={premises}
          onSelectPremise={handleSelectPremiseForAudits} 
          onAddNewOperator={handleAddNewOperator} 
          onEditOperator={handleEditOperator} 
          onDeleteOperator={handleDeleteOperator}
          onAddPremise={handleAddPremise}
          onEditPremise={handleEditPremise}
          onDeletePremise={handleDeletePremise}
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
          audits={premiseAudits}
          reports={reports.filter(r => premiseAudits.some(a => a.id === r.auditId))}
          onSelectAudit={handleSelectAudit}
          onPrepareNewAudit={handlePrepareNewAudit}
          onDeleteAudit={handleDeleteAudit}
          onUnlockAudit={handleUnlockAudit}
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
        />;
      case AppState.HEADER_FORM: {
        const initialValues = activeAudit ? activeAudit.headerValues : pendingHeader;
        if (!initialValues) return <p>Chyba: Chybí data pro záhlaví auditu.</p>
        return <HeaderForm headerData={auditStructure.header_data} initialValues={initialValues} onSaveAndBack={handleHeaderUpdateAndReturn} onSaveAndContinue={handleHeaderUpdateAndContinue} onBack={handleBackToAuditList} />;
      }
      case AppState.AUDIT_IN_PROGRESS: {
        if (!activeAudit) {
          return <p>Chyba: Aktivní audit nebyl nalezen při pokusu o zobrazení checklistu.</p>;
        }
        return <AuditChecklist auditData={activeAudit} auditStructure={auditStructure} onAnswerUpdate={handleAnswerUpdate} onComplete={handleFinishAudit} onSaveProgress={handleSaveProgress} onBack={handleBackToAuditList} log={log} />;
      }
      case AppState.REPORT_VIEW: {
        if (!activeAudit) return <p>Chyba: Audit pro report nebyl nalezen.</p>
        return <ReportView report={activeReport} audit={activeAudit} auditStructure={auditStructure} onBack={handleBackToAuditList} />
      }
      case AppState.SETTINGS:
        return <SettingsScreen onNavigateToAdmin={handleNavigateToAdmin} onNavigateToUserManagement={handleNavigateToUserManagement} onNavigateToAuditorSettings={handleNavigateToAuditorSettings} onNavigateToAIReportSettings={handleNavigateToAIReportSettings} onNavigateToAIUsageStats={handleNavigateToAIUsageStats} onNavigateToAIPricingConfig={handleNavigateToAIPricingConfig} onBack={handleBackFromSettings} />;
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
          onSelectPremise={handleSelectPremiseForAudits} 
          onAddNewOperator={handleAddNewOperator} 
          onEditOperator={handleEditOperator} 
          onDeleteOperator={handleDeleteOperator}
          onAddPremise={handleAddPremise}
          onEditPremise={handleEditPremise}
          onDeletePremise={handleDeletePremise}
        />;
    }
  };

  // Determine if sidebar should be shown (hide for forms and specific screens)
  const shouldShowSidebar = ![
    AppState.ADD_OPERATOR,
    AppState.EDIT_OPERATOR,
    AppState.ADD_PREMISE,
    AppState.EDIT_PREMISE,
    AppState.HEADER_FORM,
  ].includes(appState);

  return (
    <ErrorBoundary>
      <Layout
        currentView={appState}
        onNavigate={setAppState}
        showSidebar={shouldShowSidebar}
        activePremiseId={activePremiseId}
        activeAuditId={activeAuditId}
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
