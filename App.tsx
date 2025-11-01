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
import { Header } from './components/Header';
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
  const [appState, setAppState] = useState<AppState>(AppState.OPERATOR_DASHBOARD);
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

      // Aktualizovat status na IN_PROGRESS
      await updateAudit(auditId, { 
        status: AuditStatus.IN_PROGRESS
      });
      
      setAudits(prev => prev.map(a => a.id === auditId ? { ...a, status: AuditStatus.IN_PROGRESS } : a));
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

    if (selectedAudit.status === AuditStatus.LOCKED) {
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
        const newAuditData = createNewAudit(headerValues, AuditStatus.NOT_STARTED);
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
        await updateAudit(auditIdToContinue, { headerValues, status: AuditStatus.IN_PROGRESS });
        setAudits(prev => prev.map(a => (a.id === auditIdToContinue ? { ...a, headerValues, status: AuditStatus.IN_PROGRESS } : a)));
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

  const handleAnswerUpdate = useCallback(async (itemId: string, answer: any) => {
    if (!activeAuditId) return;
    
    // Optimisticky aktualizovat UI
    setAudits(prev => prev.map(audit => {
      if (audit.id === activeAuditId) {
        const newAnswers = { ...audit.answers, [itemId]: answer };
        return { ...audit, answers: newAnswers };
      }
      return audit;
    }));
    
    // Uložit do Firestore
    try {
      const audit = audits.find(a => a.id === activeAuditId);
      if (audit) {
        const newAnswers = { ...audit.answers, [itemId]: answer };
        await updateAudit(activeAuditId, { answers: newAnswers });
      }
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
        status: AuditStatus.LOCKED,
        completedAt
      });
      
      setAudits(prev => prev.map(a => a.id === activeAuditId
        ? { ...a, status: AuditStatus.LOCKED, completedAt }
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
    setAppState(AppState.OPERATOR_DASHBOARD);
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
      case AppState.HEADER_FORM: {
        const initialValues = activeAudit ? activeAudit.headerValues : pendingHeader;
        if (!initialValues) return <p>Chyba: Chybí data pro záhlaví auditu.</p>
        return <HeaderForm headerData={auditStructure.header_data} initialValues={initialValues} onSaveAndBack={handleHeaderUpdateAndReturn} onSaveAndContinue={handleHeaderUpdateAndContinue} onBack={handleBackToAuditList} />;
      }
      case AppState.AUDIT_IN_PROGRESS: {
        if (!activeAudit) {
          return <p>Chyba: Aktivní audit nebyl nalezen při pokusu o zobrazení checklistu.</p>;
        }
        return <AuditChecklist auditData={activeAudit} auditStructure={auditStructure} onAnswerUpdate={handleAnswerUpdate} onComplete={handleFinishAudit} onBack={handleBackToAuditList} log={log} />;
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

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 text-gray-800 flex flex-col">
        <div className="print:hidden">
          <Header appState={appState} onToggleAdmin={handleToggleAdmin} />
        </div>
        <main className="flex-grow p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center">
          {renderContent()}
        </main>
        <ToastContainer />
      </div>
    </ErrorBoundary>
  );
};

export default App;
