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

import React, { useState, useCallback, useMemo } from 'react';
import { AppState, Audit, Customer, AuditStatus, Report, ReportStatus, AuditStructure, AuditHeaderValues } from './types';
import { DEFAULT_AUDIT_STRUCTURE } from './constants';
import { Header } from './components/Header';
import AuditChecklist from './components/AuditChecklist';
import AdminScreen from './components/AdminScreen';
import SettingsScreen from './components/SettingsScreen';
import AuditorSettingsScreen from './components/AuditorSettingsScreen';
import AIReportSettingsScreen from './components/AIReportSettingsScreen';
import AIUsageStatsScreen from './components/AIUsageStatsScreen';
import AIPricingConfigScreen from './components/AIPricingConfigScreen';
import { CustomerDashboard } from './components/CustomerDashboard';
import { CustomerForm } from './components/CustomerForm';
import { AuditList } from './components/AuditList';
import { HeaderForm } from './components/HeaderForm';
import ReportView from './components/ReportView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/ToastContainer';
import { useAppData } from './hooks/useAppData';
import { useReportGenerator } from './hooks/useReportGenerator';
import { useAuth } from './contexts/AuthContext';
import {
  createCustomer,
  updateCustomer,
  deleteCustomer,
  createAudit,
  updateAudit,
  deleteAudit,
  deleteAuditsByCustomer,
  createReport,
  updateReport,
  deleteReportByAudit,
  deleteReportsByAuditIds,
  fetchAuditorInfo
} from './services/firestore';

const App: React.FC = () => {
  // --- DATA MANAGEMENT (using custom hooks) ---
  const {
    customers,
    audits,
    reports,
    setCustomers,
    setAudits,
    setReports,
    isLoading,
    error,
  } = useAppData();

  // --- STATE MANAGEMENT ---
  const [appState, setAppState] = useState<AppState>(AppState.CUSTOMER_DASHBOARD);
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(null);
  const [activeAuditId, setActiveAuditId] = useState<string | null>(null);
  const [auditStructure, setAuditStructureState] = useState<AuditStructure>(DEFAULT_AUDIT_STRUCTURE);
  const [pendingHeader, setPendingHeader] = useState<AuditHeaderValues | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

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
  const customerToEdit = useMemo(() => customers.find(c => c.id === activeCustomerId), [customers, activeCustomerId]);

  // --- NAVIGATION & ACTIONS ---
  const handleBackToDashboard = () => {
    setAppState(AppState.CUSTOMER_DASHBOARD);
    setActiveCustomerId(null);
    setActiveAuditId(null);
    setPendingHeader(null);
  };

  const handleAddNewCustomer = () => {
    setActiveCustomerId(null);
    setAppState(AppState.ADD_CUSTOMER);
  };

  const handleEditCustomer = (customerId: string) => {
    setActiveCustomerId(customerId);
    setAppState(AppState.EDIT_CUSTOMER);
  };

  const handleSaveCustomer = async (customerData: Omit<Customer, 'id'>) => {
    try {
      if (activeCustomerId) {
        // Update existujícího zákazníka
        await updateCustomer(activeCustomerId, customerData);
        setCustomers(prev => prev.map(c => (c.id === activeCustomerId ? { ...c, ...customerData } : c)));
      } else {
        // Vytvoření nového zákazníka
        const newId = await createCustomer(customerData);
        const newCustomer: Customer = { id: newId, ...customerData };
        setCustomers(prev => [...prev, newCustomer]);
      }
      handleBackToDashboard();
    } catch (error) {
      console.error('[handleSaveCustomer] Error:', error);
      // Toast je zobrazen automaticky z error handleru
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    try {
      // Nejprve smazat všechny audity a reporty
      const auditsToDelete = audits.filter(a => a.customerId === customerId);
      const auditIds = auditsToDelete.map(a => a.id);
      
      // Smazat reporty
      if (auditIds.length > 0) {
        await deleteReportsByAuditIds(auditIds);
      }
      
      // Smazat audity
      await deleteAuditsByCustomer(customerId);
      
      // Smazat zákazníka
      await deleteCustomer(customerId);
      
      // Aktualizovat lokální state
      setCustomers(prev => prev.filter(c => c.id !== customerId));
      setAudits(prev => prev.filter(a => a.customerId !== customerId));
      setReports(prev => prev.filter(r => !auditIds.includes(r.auditId)));
    } catch (error) {
      console.error('[handleDeleteCustomer] Error:', error);
    }
  };

  const handleSelectCustomerForAudits = (customerId: string) => {
    setActiveCustomerId(customerId);
    setAppState(AppState.AUDIT_LIST);
  };

  const handleBackToAuditList = () => {
    setAppState(AppState.AUDIT_LIST);
    setActiveAuditId(null);
    setPendingHeader(null);
  };

  const handlePrepareNewAudit = async () => {
    if (!activeCustomerId) return;
    const activeCustomer = customers.find(c => c.id === activeCustomerId);
    if (!activeCustomer) return;

    // Načíst aktuální údaje auditora z Firestore
    const auditorInfo = await fetchAuditorInfo();

    const prefilledHeaderValues: AuditHeaderValues = {
      premise_name: activeCustomer.premise_name || '',
      premise_address: activeCustomer.premise_address || '',
      premise_responsible_person: activeCustomer.premise_responsible_person || '',
      premise_phone: activeCustomer.premise_phone || '',
      premise_email: activeCustomer.premise_email || '',
      operator_name: activeCustomer.operator_name || '',
      operator_address: activeCustomer.operator_address || '',
      operator_ico: activeCustomer.operator_ico || '',
      operator_statutory_body: activeCustomer.operator_statutory_body || '',
      operator_phone: activeCustomer.operator_phone || '',
      operator_email: activeCustomer.operator_email || '',
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
      // Smazat report
      await deleteReportByAudit(auditId);
      
      // Smazat audit
      await deleteAudit(auditId);
      
      // Aktualizovat lokální state
      setAudits(prev => prev.filter(a => a.id !== auditId));
      setReports(prev => prev.filter(r => r.auditId !== auditId));
    } catch (error) {
      console.error('[handleDeleteAudit] Error:', error);
    }
  };

  const handleUnlockAudit = async (auditId: string) => {
    try {
      const updatedData = { status: AuditStatus.IN_PROGRESS };
      await updateAudit(auditId, updatedData);
      
      setAudits(prev => prev.map(a => a.id === auditId ? { ...a, ...updatedData } : a));
      setActiveAuditId(auditId);
      setAppState(AppState.AUDIT_IN_PROGRESS);
    } catch (error) {
      console.error('[handleUnlockAudit] Error:', error);
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
    if (!activeCustomerId) throw new Error("Customer ID is missing");
    return {
      id: `audit_${Date.now()}`,
      customerId: activeCustomerId,
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
        const newId = await createAudit(newAuditData);
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
        const newId = await createAudit(newAuditData);
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
    setAppState(prev => prev === AppState.SETTINGS || prev === AppState.ADMIN ? AppState.CUSTOMER_DASHBOARD : AppState.SETTINGS)
  }

  const handleNavigateToAdmin = () => {
    setAppState(AppState.ADMIN);
  }

  const handleBackFromAdmin = () => {
    setAppState(AppState.SETTINGS);
  }

  const handleBackFromSettings = () => {
    setAppState(AppState.CUSTOMER_DASHBOARD);
  }

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
      case AppState.CUSTOMER_DASHBOARD:
        return <CustomerDashboard customers={customers} onSelectCustomer={handleSelectCustomerForAudits} onAddNewCustomer={handleAddNewCustomer} onEditCustomer={handleEditCustomer} onDeleteCustomer={handleDeleteCustomer} />;
      case AppState.ADD_CUSTOMER:
      case AppState.EDIT_CUSTOMER:
        return <CustomerForm initialData={appState === AppState.EDIT_CUSTOMER ? customerToEdit || null : null} onSave={handleSaveCustomer} onBack={handleBackToDashboard} />;
      case AppState.AUDIT_LIST: {
        const activeCustomer = customers.find(c => c.id === activeCustomerId);
        const customerAudits = audits.filter(a => a.customerId === activeCustomerId);
        return <AuditList
          customerName={activeCustomer?.premise_name || ''}
          audits={customerAudits}
          reports={reports.filter(r => customerAudits.some(a => a.id === r.auditId))}
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
        return <SettingsScreen onNavigateToAdmin={handleNavigateToAdmin} onNavigateToAuditorSettings={handleNavigateToAuditorSettings} onNavigateToAIReportSettings={handleNavigateToAIReportSettings} onNavigateToAIUsageStats={handleNavigateToAIUsageStats} onNavigateToAIPricingConfig={handleNavigateToAIPricingConfig} onBack={handleBackFromSettings} />;
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
        return <CustomerDashboard customers={customers} onSelectCustomer={handleSelectCustomerForAudits} onAddNewCustomer={handleAddNewCustomer} onEditCustomer={handleEditCustomer} onDeleteCustomer={handleDeleteCustomer} />;
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
