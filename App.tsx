import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { AppState, Audit, Customer, AuditStatus, Report, ReportStatus, AuditStructure, AuditHeaderValues } from './types';
import { DEFAULT_AUDIT_STRUCTURE } from './constants';
import { Header } from './components/Header';
import AuditChecklist from './components/AuditChecklist';
import AdminScreen from './components/AdminScreen';
import { CustomerDashboard } from './components/CustomerDashboard';
import { CustomerForm } from './components/CustomerForm';
import { AuditList } from './components/AuditList';
import { HeaderForm } from './components/HeaderForm';
import ReportView from './components/ReportView';
import LogViewer from './components/LogViewer'; // Import LogViewer

const App: React.FC = () => {
  // --- STATE MANAGEMENT ---
  const [appState, setAppState] = useState<AppState>(AppState.CUSTOMER_DASHBOARD);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(null);
  const [activeAuditId, setActiveAuditId] = useState<string | null>(null);
  const [auditStructure, setAuditStructureState] = useState<AuditStructure>(DEFAULT_AUDIT_STRUCTURE);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isInitialLoad = useRef(true);
  const [pendingHeader, setPendingHeader] = useState<AuditHeaderValues | null>(null);
  const [logs, setLogs] = useState<string[]>([]); // State for logs

  // --- LOGGING FUNCTION ---
  const log = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prevLogs => [`[${timestamp}] ${message}`, ...prevLogs]);
  }, []);


  // --- DATA PERSISTENCE ---
  useEffect(() => {
    log('Aplikace se spouští, načítám data...');
    const loadData = async () => {
      try {
        const response = await fetch('/api/app-data');
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        const data = await response.json();
        setCustomers(data.customers || []);
        setAudits(data.audits || []);
        setReports(data.reports || []);
        log('Data úspěšně načtena ze serveru.');
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error("Failed to load data from server:", e);
        setError("Nepodařilo se načíst data ze serveru. Zkuste prosím obnovit stránku.");
        log(`Chyba při načítání dat: ${errorMessage}`);
      } finally {
        setIsLoading(false);
        setTimeout(() => { isInitialLoad.current = false; }, 500);
      }
    };
    loadData();
  }, [log]);

  useEffect(() => {
    if (isInitialLoad.current || isLoading) return;
    const saveData = async () => {
      try {
        await fetch('/api/app-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customers, audits, reports }),
        });
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error("Failed to save data to server:", e);
        setError("Chyba při ukládání dat na server.");
        log(`Chyba při ukládání dat: ${errorMessage}`);
      }
    };
    saveData();
  }, [customers, audits, reports, isLoading, log]);

  // --- BACKGROUND REPORT GENERATION ---
    useEffect(() => {
    const reportToGenerate = reports.find(r => r.status === ReportStatus.PENDING);
    if (reportToGenerate && !isGenerating) {
      setIsGenerating(true);
      setReports(prev => prev.map(r => r.id === reportToGenerate.id ? { ...r, status: ReportStatus.GENERATING } : r));
      
      const auditForReport = audits.find(a => a.id === reportToGenerate.auditId);
      if (!auditForReport) {
          console.error("Audit for report not found!");
          setReports(prev => prev.map(r => r.id === reportToGenerate.id ? { ...r, status: ReportStatus.ERROR, error: "Přiřazený audit nebyl nalezen." } : r));
          setIsGenerating(false);
          return;
      }

      fetch('/api/generate-report', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ auditData: auditForReport, auditStructure: auditStructure })
       })
      .then(res => {
        if (!res.ok) throw new Error(`Chyba serveru: ${res.status}`);
        return res.json();
      })
      .then(data => {
          setReports(prev => prev.map(r => 
              r.id === reportToGenerate.id 
              ? { ...r, status: ReportStatus.DONE, reportData: data.result, usage: data.usage }
              : r
          ));
      })
      .catch(err => {
          console.error("Report generation failed:", err);
          setReports(prev => prev.map(r => 
              r.id === reportToGenerate.id 
              ? { ...r, status: ReportStatus.ERROR, error: err.message }
              : r
          ));
      })
      .finally(() => {
          setIsGenerating(false);
      });
    }
  }, [reports, audits, isGenerating, auditStructure]);


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

  const handleSaveCustomer = (customerData: Omit<Customer, 'id'>) => {
    if (activeCustomerId) {
      setCustomers(prev => prev.map(c => (c.id === activeCustomerId ? { ...c, ...customerData } : c)));
    } else {
      const newCustomer: Customer = { id: `customer_${Date.now()}`, ...customerData };
      setCustomers(prev => [...prev, newCustomer]);
    }
    handleBackToDashboard();
  };

  const handleDeleteCustomer = (customerId: string) => {
    const auditsToDelete = audits.filter(a => a.customerId === customerId).map(a => a.id);
    setCustomers(prev => prev.filter(c => c.id !== customerId));
    setAudits(prev => prev.filter(a => a.customerId !== customerId));
    setReports(prev => prev.filter(r => !auditsToDelete.includes(r.auditId)));
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

  const handlePrepareNewAudit = () => {
    if (!activeCustomerId) return;
    const activeCustomer = customers.find(c => c.id === activeCustomerId);
    if (!activeCustomer) return;

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
        auditor_name: 'Bc. Sylva Polzer, hygienický konzultant',
        auditor_phone: '603 398 774',
        auditor_email: 'sylvapolzer@avlyspol.cz',
        auditor_web: 'www.avlyspol.cz',
    };
    
    setActiveAuditId(null);
    setPendingHeader(prefilledHeaderValues);
    setAppState(AppState.HEADER_FORM);
  };
  

  const handleDeleteAudit = (auditId: string) => {
    setAudits(prev => prev.filter(a => a.id !== auditId));
    setReports(prev => prev.filter(r => r.auditId !== auditId));
  };


  const handleSelectAudit = (auditId: string) => {
    const selectedAudit = audits.find(a => a.id === auditId);
    if (!selectedAudit) return;

    setActiveAuditId(auditId);

    if (selectedAudit.status === AuditStatus.COMPLETED || selectedAudit.status === AuditStatus.REPORT_GENERATED) {
        setAppState(AppState.REPORT_VIEW);
    } else if (selectedAudit.status === AuditStatus.IN_PROGRESS) {
        setAppState(AppState.AUDIT_IN_PROGRESS);
    } else if (selectedAudit.status === AuditStatus.NOT_STARTED) {
        setAudits(prev => prev.map(a => (a.id === auditId ? { ...a, status: AuditStatus.IN_PROGRESS } : a)));
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
  
  const handleHeaderUpdateAndReturn = (headerValues: AuditHeaderValues) => {
    if (activeAuditId) {
      setAudits(prev => prev.map(a => (a.id === activeAuditId ? { ...a, headerValues } : a)));
    } else {
      const newAudit = createNewAudit(headerValues, AuditStatus.NOT_STARTED);
      setAudits(prev => [...prev, newAudit]);
    }
    handleBackToAuditList();
  };
  
  const handleHeaderUpdateAndContinue = (headerValues: AuditHeaderValues) => {
    let auditIdToContinue = activeAuditId;
    if (auditIdToContinue) {
      setAudits(prev => prev.map(a => (a.id === auditIdToContinue ? { ...a, headerValues, status: AuditStatus.IN_PROGRESS } : a)));
    } else {
      const newAudit = createNewAudit(headerValues, AuditStatus.IN_PROGRESS);
      setAudits(prev => [...prev, newAudit]);
      auditIdToContinue = newAudit.id;
    }
    setActiveAuditId(auditIdToContinue);
    setAppState(AppState.AUDIT_IN_PROGRESS);
    setPendingHeader(null);
  };

  const handleAnswerUpdate = useCallback((itemId: string, answer: any) => {
    if (!activeAuditId) return;
    setAudits(prev => prev.map(audit => {
        if (audit.id === activeAuditId) {
            const newAnswers = { ...audit.answers, [itemId]: answer };
            return { ...audit, answers: newAnswers };
        }
        return audit;
    }));
  }, [activeAuditId]);

  const handleFinishAudit = () => {
    if (!activeAuditId || !window.confirm("Opravdu chcete audit uzavřít a vygenerovat protokol?")) return;
    setAudits(prev => prev.map(a => a.id === activeAuditId ? { ...a, status: AuditStatus.COMPLETED, completedAt: new Date().toISOString() } : a));
    const newReport: Report = {
      id: `report_${Date.now()}`,
      auditId: activeAuditId,
      status: ReportStatus.PENDING,
      createdAt: new Date().toISOString(),
    };
    setReports(prev => [...prev, newReport]);
    setAppState(AppState.REPORT_VIEW);
  };

 const handleToggleAdmin = () => {
    setAppState(prev => prev === AppState.ADMIN ? AppState.CUSTOMER_DASHBOARD : AppState.ADMIN)
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
        return <AuditList customerName={activeCustomer?.premise_name || ''} audits={customerAudits} reports={reports.filter(r => customerAudits.some(a => a.id === r.auditId))} onSelectAudit={handleSelectAudit} onPrepareNewAudit={handlePrepareNewAudit} onDeleteAudit={handleDeleteAudit} onBack={handleBackToDashboard} />;
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
      case AppState.ADMIN:        
        return <AdminScreen auditStructure={auditStructure} setAuditStructure={setAuditStructureState} />;
      default:                    
        return <CustomerDashboard customers={customers} onSelectCustomer={handleSelectCustomerForAudits} onAddNewCustomer={handleAddNewCustomer} onEditCustomer={handleEditCustomer} onDeleteCustomer={handleDeleteCustomer} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 flex flex-col">
      <Header appState={appState} onToggleAdmin={handleToggleAdmin} className="print:hidden" />
      <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center">
        {renderContent()}
      </main>
      <LogViewer logs={logs} />
    </div>
  );
};

export default App;
