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
import { useNavigate, useLocation, matchPath } from 'react-router-dom';
import { AppState, Audit, Operator, Premise, AuditStatus, Report, ReportStatus, AuditStructure, AuditHeaderValues, Tab, AuditAnswer } from './types';
import { DEFAULT_AUDIT_STRUCTURE } from './constants';
import { Layout } from './components/Layout';
import AuditChecklistWrapper from './components/AuditChecklistWrapper';
import AdminScreen from './components/AdminScreen';
import { SettingsScreen } from './components/SettingsScreen';
import UserManagementScreen from './components/UserManagementScreen';
import AuditorSettingsScreen from './components/AuditorSettingsScreen';
import AIReportSettingsScreen from './components/AIReportSettingsScreen';
import AIUsageStatsScreen from './components/AIUsageStatsScreen';
import AIPricingConfigScreen from './components/AIPricingConfigScreen';


import { PricingScreen } from './components/PricingScreen';
import { BillingSettingsScreen } from './components/BillingSettingsScreen';
import { SupplierManagementScreen } from './components/SupplierManagementScreen';
import { OperatorDashboard } from './components/OperatorDashboard';
import { OperatorForm } from './components/OperatorForm';
import { PremiseForm } from './components/PremiseForm';
import { AuditList } from './components/AuditList';
import { AllAuditsScreen } from './components/AllAuditsScreen';
import { HeaderForm } from './components/HeaderForm';
import ReportView from './components/ReportView';
import { InvoicesPage } from './components/invoices/InvoicesPage';
import { InvoiceDetailPage } from './components/invoices/InvoiceDetailPage';
import { InvoiceForm } from './components/invoices/InvoiceForm';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/ToastContainer';
import { Modal } from './components/ui/Modal';
import { uploadReportPdf, deleteAllAuditPhotos } from './services/storage';
import { toast } from './utils/toast';
import { useAppData } from './hooks/useAppData';
import { useReportGenerator } from './hooks/useReportGenerator';
import { useAuth } from './contexts/AuthContext';
import { useUnsavedChanges } from './contexts/UnsavedChangesContext';
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
  fetchReportByAudit,
  fetchReport,
  fetchAudit,
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
    reload,
  } = useAppData();

  const { checkUnsavedChanges } = useUnsavedChanges();

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
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);
  const [invoiceCreateAuditId, setInvoiceCreateAuditId] = useState<string | undefined>(undefined);
  const [invoiceCreateCustomerId, setInvoiceCreateCustomerId] = useState<string | undefined>(undefined);
  const [invoiceRefreshTrigger, setInvoiceRefreshTrigger] = useState(0);

  // --- ROUTING SYNC ---
  const navigate = useNavigate();
  const location = useLocation();

  // Sync URL -> State
  useEffect(() => {
    const path = location.pathname;
    let cancelled = false;

    const ensureReportContextById = async (reportId: string) => {
      // 1) Načíst report (lokálně nebo z DB)
      let report = reports.find(r => r.id === reportId) || null;
      if (!report) {
        report = await fetchReport(reportId);
        if (!report || cancelled) return;
        setReports(prev => {
          const filtered = prev.filter(r => r.id !== reportId);
          return [...filtered, report!];
        });
      }

      // 2) Nastavit audit kontext z reportu
      setActiveAuditId(report.auditId);

      // 3) Načíst audit, pokud není v lokálním state (typicky po refreshi / multi-user)
      let audit = audits.find(a => a.id === report!.auditId) || null;
      if (!audit) {
        audit = await fetchAudit(report!.auditId);
        if (!audit || cancelled) return;
        setAudits(prev => {
          const filtered = prev.filter(a => a.id !== audit!.id);
          return [...filtered, audit!];
        });
      }

      setActivePremiseId(audit.premiseId);
      const premise = premises.find(p => p.id === audit!.premiseId);
      if (premise) {
        setActiveOperatorId(premise.operatorId);
      }
    };

    // 1. Operators & Premises
    if (path === '/') {
      navigate('/operators', { replace: true });
      return;
    } else if (path === '/operators' || path === '/dashboard') {
      setAppState(AppState.OPERATOR_DASHBOARD);
      setActiveOperatorId(null);
      setActivePremiseId(null);
      setActiveAuditId(null);
      setActiveReportId(null);
      setActiveTabId(null);
    } else if (path === '/operators/new') {
      setAppState(AppState.ADD_OPERATOR);
      setActiveOperatorId(null);
      setActiveTabId(null);
    } else if (matchPath('/operators/:operatorId', path)) {
      const match = matchPath('/operators/:operatorId', path);
      if (match?.params.operatorId) {
        setAppState(AppState.EDIT_OPERATOR);
        setActiveOperatorId(match.params.operatorId);
        setActiveTabId(null);
      }
    } else if (matchPath('/operators/:operatorId/premises/new', path)) {
      const match = matchPath('/operators/:operatorId/premises/new', path);
      if (match?.params.operatorId) {
        setAppState(AppState.ADD_PREMISE);
        setActiveOperatorId(match.params.operatorId);
        setActivePremiseId(null);
        setActiveTabId(null);
      }
    } else if (matchPath('/premises/:premiseId', path)) {
      const match = matchPath('/premises/:premiseId', path);
      if (match?.params.premiseId) {
        setAppState(AppState.EDIT_PREMISE);
        setActivePremiseId(match.params.premiseId);
        setActiveTabId(null);
        // Find operator for this premise to set activeOperatorId
        const premise = premises.find(p => p.id === match.params.premiseId);
        if (premise) setActiveOperatorId(premise.operatorId);
      }
    } else if (matchPath('/premises/:premiseId/audits', path)) {
      const match = matchPath('/premises/:premiseId/audits', path);
      if (match?.params.premiseId) {
        setAppState(AppState.AUDIT_LIST);
        setActivePremiseId(match.params.premiseId);
        const premise = premises.find(p => p.id === match.params.premiseId);
        if (premise) setActiveOperatorId(premise.operatorId);
      }
    } else if (matchPath('/premises/:premiseId/audits/new', path)) {
      const match = matchPath('/premises/:premiseId/audits/new', path);
      if (match?.params.premiseId) {
        setAppState(AppState.HEADER_FORM);
        setActivePremiseId(match.params.premiseId);
        const premise = premises.find(p => p.id === match.params.premiseId);
        if (premise) setActiveOperatorId(premise.operatorId);
      }
    }
    // 2. Audits
    else if (path === '/audits') {
      setAppState(AppState.ALL_AUDITS);
      setActiveTabId(null);
    } else if (path === '/audits/incomplete') {
      setAppState(AppState.INCOMPLETE_AUDITS);
      setActiveTabId(null);
    } else if (path === '/audits/in-progress') {
      setAppState(AppState.IN_PROGRESS_AUDITS);
      setActiveTabId(null);
    }
    // 2b. Reports (kanonická routa)
    else if (matchPath('/reports/:reportId', path)) {
      const match = matchPath('/reports/:reportId', path);
      const reportId = match?.params.reportId;
      if (reportId) {
        setAppState(AppState.REPORT_VIEW);
        setActiveReportId(reportId);
        void ensureReportContextById(reportId);
      }
    }
    // 2c. Backward kompatibilita: /audits/:auditId/report -> redirect na nejnovější report
    else if (matchPath('/audits/:auditId/report', path)) {
      const match = matchPath('/audits/:auditId/report', path);
      const auditId = match?.params.auditId;
      if (auditId) {
        const localLatest =
          reports.find(r => r.auditId === auditId && r.isLatest) ||
          reports
            .filter(r => r.auditId === auditId)
            .sort((a, b) => (b.versionNumber || 0) - (a.versionNumber || 0))[0] ||
          null;

        if (localLatest?.id) {
          navigate(`/reports/${localLatest.id}`, { replace: true });
          return;
        }

        void (async () => {
          try {
            const latestFromDb = await fetchReportByAudit(auditId);
            if (!latestFromDb || cancelled) {
              navigate(`/audits/${auditId}`, { replace: true });
              return;
            }
            setReports(prev => {
              const filtered = prev.filter(r => r.id !== latestFromDb.id);
              return [...filtered, latestFromDb];
            });
            navigate(`/reports/${latestFromDb.id}`, { replace: true });
          } catch {
            navigate(`/audits/${auditId}`, { replace: true });
          }
        })();
      }
    }
    // 2d. Audits (pozor na pořadí - musí být až po /audits/:auditId/report)
    else if (matchPath('/audits/:auditId', path)) {
      const match = matchPath('/audits/:auditId', path);
      if (match?.params.auditId) {
        setAppState(AppState.AUDIT_IN_PROGRESS);
        const auditId = match.params.auditId;
        setActiveAuditId(auditId);
        // Find premise and operator
        const audit = audits.find(a => a.id === auditId);
        if (audit) {
          setActivePremiseId(audit.premiseId);
          const premise = premises.find(p => p.id === audit.premiseId);
          if (premise) {
            setActiveOperatorId(premise.operatorId);

            // Create/Open Tab for Deep Link
            const operator = operators.find(o => o.id === premise.operatorId);
            if (operator) {
              const auditDate = audit.createdAt ? new Date(audit.createdAt).toISOString().split('T')[0] : undefined;
              openOrActivateTab(
                auditId,
                'audit',
                undefined,
                premise.id,
                operator.operator_name,
                premise.premise_name,
                auditDate,
                audit.status
              );
            }
          }
        }
      }
    }
    // 3. Invoices
    else if (path === '/invoices') {
      setAppState(AppState.INVOICES);
      setActiveTabId(null);
    } else if (path === '/invoices/new') {
      setAppState(AppState.INVOICE_CREATE);
      setActiveTabId(null);
    } else if (matchPath('/invoices/:invoiceId', path)) {
      const match = matchPath('/invoices/:invoiceId', path);
      if (match?.params.invoiceId) {
        setAppState(AppState.INVOICE_DETAIL);
        setActiveInvoiceId(match.params.invoiceId);
        setActiveTabId(null);
      }
    }
    // 4. Settings & Admin
    else if (path === '/settings') {
      setAppState(AppState.SETTINGS);
      setActiveTabId(null);
    } else if (path === '/settings/auditor') {
      console.log('[App] Matched /settings/auditor -> AUDITOR_SETTINGS');
      setAppState(AppState.AUDITOR_SETTINGS);
      setActiveTabId(null);
    } else if (path === '/settings/ai-config') {
      console.log('[App] Matched /settings/ai-config -> AI_REPORT_SETTINGS');
      setAppState(AppState.AI_REPORT_SETTINGS);
      setActiveTabId(null);
    } else if (path === '/settings/pricing') {
      setAppState(AppState.PRICING);
      setActiveTabId(null);
    } else if (path === '/settings/billing') {
      setAppState(AppState.BILLING_SETTINGS);
      setActiveTabId(null);
    } else if (path === '/settings/suppliers') {
      console.log('[App] Matched /settings/suppliers -> SUPPLIER_MANAGEMENT');
      setAppState(AppState.SUPPLIER_MANAGEMENT);
      setActiveTabId(null);
    } else if (path === '/settings/ai-stats') {
      setAppState(AppState.AI_USAGE_STATS);
      setActiveTabId(null);
    } else if (path === '/settings/ai-pricing') {
      setAppState(AppState.AI_PRICING_CONFIG);
      setActiveTabId(null);
    } else if (path === '/settings/user-management') {
      console.log('[App] Matched /settings/user-management -> USER_MANAGEMENT');
      setAppState(AppState.USER_MANAGEMENT);
      setActiveTabId(null);
    } else if (path === '/settings/audit-structure') {
      setAppState(AppState.ADMIN);
      setActiveTabId(null);
    } else if (path === '/admin') {
      // Redirect old /admin URL to new location
      navigate('/settings/audit-structure', { replace: true });
      return;
    }
    // Default fallback (only if no state is set yet, to avoid overriding on initial load if logic differs)
    // But here we rely on URL as source of truth.
    return () => {
      cancelled = true;
    };
  }, [location.pathname, audits, premises, operators, reports]); // Dependencies need to be correct to re-run when data loads



  // Načíst audit structure z Firestore při startu nebo podle typu auditu
  useEffect(() => {
    const loadAuditStructure = async () => {
      try {
        // Pokud má aktivní audit auditTypeId, načíst strukturu z typu
        if (activeAuditId) {
          const audit = audits.find(a => a.id === activeAuditId);
          if (audit?.auditTypeId) {
            try {
              const { fetchAuditType, updateAuditType } = await import('./services/firestore/auditTypes');
              const auditType = await fetchAuditType(audit.auditTypeId);
              if (auditType) {
                // Migrace: Aktualizovat "Mobil" na "Telefon" pokud existuje
                let needsUpdate = false;
                const migratedStructure = JSON.parse(JSON.stringify(auditType.auditStructure)); // Deep copy
                
                // Aktualizovat labely v header_data
                ['auditor', 'audited_premise', 'operator'].forEach(sectionKey => {
                  if (migratedStructure.header_data?.[sectionKey]?.fields) {
                    migratedStructure.header_data[sectionKey].fields.forEach((field: any) => {
                      if (field.label === 'Mobil') {
                        field.label = 'Telefon';
                        needsUpdate = true;
                      }
                    });
                  }
                });
                
                if (needsUpdate) {
                  await updateAuditType(audit.auditTypeId, {
                    auditStructure: migratedStructure
                  });
                  setAuditStructureState(migratedStructure);
                } else {
                  setAuditStructureState(auditType.auditStructure);
                }
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
          // Migrace: Aktualizovat "Mobil" na "Telefon" pokud existuje
          let needsUpdate = false;
          const migratedStructure = JSON.parse(JSON.stringify(savedStructure)); // Deep copy
          
          // Aktualizovat labely v header_data
          ['auditor', 'audited_premise', 'operator'].forEach(sectionKey => {
            if (migratedStructure.header_data?.[sectionKey]?.fields) {
              migratedStructure.header_data[sectionKey].fields.forEach((field: any) => {
                if (field.label === 'Mobil') {
                  field.label = 'Telefon';
                  needsUpdate = true;
                }
              });
            }
          });
          
          if (needsUpdate) {
            const { saveAuditStructure } = await import('./services/firestore/settings');
            await saveAuditStructure(migratedStructure);
            setAuditStructureState(migratedStructure);
          } else {
            setAuditStructureState(savedStructure);
          }
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
  const safeNavigate = (action: () => void) => {
    checkUnsavedChanges(action);
  };

  const handleBackToDashboard = () => {
    safeNavigate(() => {
      navigate('/operators');
    });
  };

  const handleAddNewOperator = () => {
    safeNavigate(() => {
      navigate('/operators/new');
    });
  };

  const handleEditOperator = (operatorId: string) => {
    safeNavigate(() => {
      navigate(`/operators/${operatorId}`);
    });
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
      // Navigovat přímo bez kontroly neuložených změn (protože jsme právě uložili)
      navigate('/');
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
    safeNavigate(() => {
      navigate(`/operators/${operatorId}/premises/new`);
    });
  };

  const handleEditPremise = (premiseId: string) => {
    safeNavigate(() => {
      navigate(`/premises/${premiseId}`);
    });
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
      // Navigovat přímo bez kontroly neuložených změn (protože jsme právě uložili)
      navigate('/operators');
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
    reportId: string | undefined,
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
          reportId: tabType === 'report' ? (reportId || existingTab.reportId) : undefined,
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
      if (auditDate || status || premiseName || (tabType === 'report' && reportId)) {
        const updatedTab: Tab = {
          ...existingTab,
          operatorName: operatorName,
          premiseName: premiseName || existingTab.premiseName,
          auditDate: auditDate || existingTab.auditDate,
          status: status || existingTab.status,
          reportId: tabType === 'report' ? (reportId || existingTab.reportId) : existingTab.reportId,
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
      reportId: tabType === 'report' ? reportId : undefined,
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
    safeNavigate(() => {
      navigate(`/premises/${premiseId}/audits`);
    });
  };

  const handleBackToAuditList = () => {
    safeNavigate(() => {
      // Vždy navigovat na Přehled všech auditů
      navigate('/audits');
    });
  };

  const handleStartNewAudit = async (premiseId: string) => {
    safeNavigate(async () => {
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

        // Kombinovat adresu provozovatele
        const operatorAddressParts = [
          operator.operator_street,
          operator.operator_zip,
          operator.operator_city
        ].filter(Boolean);
        const operator_address = operatorAddressParts.length > 0 
          ? operatorAddressParts.join(', ')
          : '';

        const prefilledHeaderValues: AuditHeaderValues = {
          premise_name: premise.premise_name || '',
          premise_address: premise.premise_address || '',
          premise_responsible_person: premise.premise_responsible_person || '',
          premise_phone: premise.premise_phone || '',
          premise_email: premise.premise_email || '',
          operator_name: operator.operator_name || '',
          operator_address: operator_address,
          operator_street: operator.operator_street || '',
          operator_city: operator.operator_city || '',
          operator_zip: operator.operator_zip || '',
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
          undefined,
          premiseId,
          operator.operator_name,
          premise.premise_name,
          new Date().toISOString().split('T')[0], // auditDate
          AuditStatus.IN_PROGRESS
        );

        // Přeskočit HEADER_FORM a jít rovnou do AUDIT_IN_PROGRESS
        setAppState(AppState.AUDIT_IN_PROGRESS);

        toast.success('Audit byl vytvořen a můžete začít vyplňovat.');
        navigate(`/audits/${auditId}`);
      } catch (error) {
        console.error('[handleStartNewAudit] Error:', error);
        toast.error('Chyba při vytváření auditu.');
      }
    });
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

      // Kombinovat adresu provozovatele
      const operatorAddressParts = [
        operator.operator_street,
        operator.operator_zip,
        operator.operator_city
      ].filter(Boolean);
      const operator_address = operatorAddressParts.length > 0 
        ? operatorAddressParts.join(', ')
        : '';

      const prefilledHeaderValues: AuditHeaderValues = {
        premise_name: premise.premise_name || '',
        premise_address: premise.premise_address || '',
        premise_responsible_person: premise.premise_responsible_person || '',
        premise_phone: premise.premise_phone || '',
        premise_email: premise.premise_email || '',
        operator_name: operator.operator_name || '',
        operator_address: operator_address,
        operator_street: operator.operator_street || '',
        operator_city: operator.operator_city || '',
        operator_zip: operator.operator_zip || '',
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
      // Zůstat na seznamu auditů (nebo navigovat na incomplete?)
      // navigate('/audits/incomplete'); // Optional
    } catch (error) {
      console.error('[handlePrepareAudit] Error:', error);
      toast.error('Chyba při předpřipravení auditu.');
    }
  };

  const handlePrepareNewAudit = async (auditTypeId?: string) => {
    safeNavigate(async () => {
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

      // ... (rest of logic remains same until navigation)

      // Místo nastavování state přímo, navigujeme na URL
      // Ale HEADER_FORM je trochu specifický, protože potřebuje předvyplněná data.
      // Buď je předáme přes state (location.state) nebo je uložíme do dočasného úložiště.
      // Pro jednoduchost zatím navigujeme na URL a data necháme v App state (pendingHeader),
      // protože useEffect pro routing sync jen nastaví AppState.HEADER_FORM, ale pendingHeader zůstane.

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
      }

      // Načíst aktuální údaje auditora z Firestore
      const auditorInfo = await fetchAuditorInfo();

      // Kombinovat adresu provozovatele
      const operatorAddressParts = [
        activeOperator.operator_street,
        activeOperator.operator_zip,
        activeOperator.operator_city
      ].filter(Boolean);
      const operator_address = operatorAddressParts.length > 0 
        ? operatorAddressParts.join(', ')
        : '';

      const prefilledHeaderValues: AuditHeaderValues = {
        premise_name: activePremise.premise_name || '',
        premise_address: activePremise.premise_address || '',
        premise_responsible_person: activePremise.premise_responsible_person || '',
        premise_phone: activePremise.premise_phone || '',
        premise_email: activePremise.premise_email || '',
        operator_name: activeOperator.operator_name || '',
        operator_address: operator_address,
        operator_street: activeOperator.operator_street || '',
        operator_city: activeOperator.operator_city || '',
        operator_zip: activeOperator.operator_zip || '',
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
        sessionStorage.setItem('pendingAuditTypeId', auditTypeIdToUse);
      }

      // Nastavit strukturu pro HeaderForm
      setAuditStructureState(structureToUse);

      navigate(`/premises/${premiseIdToUse}/audits/new`);
    });
  };

  const handleDeleteAudit = async (auditId: string) => {
    try {
      // Smazat report nejdřív
      try {
        await deleteReportByAudit(auditId);
      } catch (reportError: any) {
        // Pokud report neexistuje, ignorovat chybu
      }

      // Smaže všechny fotky z auditu (včetně orphaned souborů)
      try {
        await deleteAllAuditPhotos(auditId);
      } catch (photoError: any) {
        console.error('[handleDeleteAudit] Error deleting photos:', photoError);
        // Pokračujeme dál, i když se nepodaří smazat fotky (aby se smazal aspoň audit)
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
      // Nebo pokud je COMPLETED na REVISED
      if (audit.status === AuditStatus.COMPLETED || audit.status === AuditStatus.LOCKED) {
        await updateAudit(auditId, { status: AuditStatus.REVISED });
        setAudits(prev => prev.map(a => (a.id === auditId ? { ...a, status: AuditStatus.REVISED } : a)));

        // Otevřít audit
        navigate(`/audits/${auditId}`);
      } else if (audit.status === AuditStatus.DRAFT || audit.status === AuditStatus.NOT_STARTED) {
        await updateAudit(auditId, { status: AuditStatus.IN_PROGRESS });
        setAudits(prev => prev.map(a => (a.id === auditId ? { ...a, status: AuditStatus.IN_PROGRESS } : a)));

        // Otevřít audit
        navigate(`/audits/${auditId}`);
      } else {
        // Pokud je už IN_PROGRESS nebo REVISED, jen otevřít
        navigate(`/audits/${auditId}`);
      }
    } catch (error) {
      console.error('[handleUnlockAudit] Error:', error);
      toast.error('Chyba při odemykání auditu');
    }
  };

  const handleSelectAudit = (auditId: string, reportId?: string) => {
    safeNavigate(() => {
      const selectedAudit = audits.find(a => a.id === auditId);
      if (!selectedAudit) return;

      if (reportId) {
        navigate(`/reports/${reportId}`);
      } else {
        const isCompleted = selectedAudit.status === AuditStatus.COMPLETED;
        if (isCompleted) {
          const latest =
            reports.find(r => r.auditId === auditId && r.isLatest) ||
            reports
              .filter(r => r.auditId === auditId)
              .sort((a, b) => (b.versionNumber || 0) - (a.versionNumber || 0))[0] ||
            null;
          if (latest?.id) {
            navigate(`/reports/${latest.id}`);
          } else {
            // fallback – route sync udělá redirect po načtení
            navigate(`/audits/${auditId}/report`);
          }
        } else {
          navigate(`/audits/${auditId}`);
        }
      }
    });
  };

  const handleTabClick = (tabId: string) => {
    safeNavigate(() => {
      const tab = tabs.find(t => t.id === tabId);
      if (tab) {
        setActiveTabId(tabId);

        // Navigovat na URL podle typu tabu
        if (tab.type === 'audit_list') {
          navigate(`/premises/${tab.premiseId}/audits`);
        } else if (tab.type === 'audit') {
          if (tab.auditId) {
            navigate(`/audits/${tab.auditId}`);
          }
        } else if (tab.type === 'report') {
          if (tab.reportId) {
            navigate(`/reports/${tab.reportId}`);
          } else if (tab.auditId) {
            // fallback pro starší taby bez reportId
            navigate(`/audits/${tab.auditId}/report`);
          }
        }
      }
    });
  };

  const handleTabClose = (tabId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();

    // Zavření tabu je specifická akce - pokud zavíráme aktivní tab, chceme zkontrolovat změny
    // Pokud zavíráme neaktivní tab, změny nás nezajímají (protože v něm nemůžeme mít neuložené změny, ty jsou jen v aktivním)
    const isActiveTab = tabId === activeTabId;

    const closeAction = () => {
      const tabIndex = tabs.findIndex(t => t.id === tabId);
      if (tabIndex === -1) return;

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
            setActiveReportId(null); // Reset report ID
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

    if (isActiveTab) {
      safeNavigate(closeAction);
    } else {
      closeAction();
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
        undefined,
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
        photos: nc.photos
          // Filtrovat fotky, které se stále nahrávají - nechceme ukládat placeholdery bez storagePath
          .filter(photo => !photo.isUploading)
          .map(photo => {
            // Odstranit File objekt a base64 - nelze ukládat do Firestore (limit 1MB)
            // Base64 slouží jen pro lokální preview, po uploadu máme URL
            const { file, base64, ...photoSanitized } = photo;
            return photoSanitized;
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

  const handleCompletedAtUpdate = useCallback(async (completedAt: string) => {
    if (!activeAuditId) return;

    try {
      // Optimisticky aktualizovat UI
      setAudits(prev => prev.map(audit => {
        if (audit.id === activeAuditId) {
          return { ...audit, completedAt };
        }
        return audit;
      }));

      // Uložit do Firestore
      await updateAudit(activeAuditId, { completedAt });
    } catch (error) {
      console.error('[handleCompletedAtUpdate] Error:', error);
    }
  }, [activeAuditId]);

  const handleNoteUpdate = useCallback(async (note: string) => {
    if (!activeAuditId) return;

    try {
      // Optimisticky aktualizovat UI
      setAudits(prev => prev.map(audit => {
        if (audit.id === activeAuditId) {
          return { ...audit, note };
        }
        return audit;
      }));

      // Uložit do Firestore
      await updateAudit(activeAuditId, { note });
    } catch (error) {
      console.error('[handleNoteUpdate] Error:', error);
    }
  }, [activeAuditId]);

  const handlePresentPersonUpdate = useCallback(async (presentPerson: string) => {
    if (!activeAuditId) return;

    try {
      // Optimisticky aktualizovat UI (uložit do headerValues)
      setAudits(prev => prev.map(audit => {
        if (audit.id === activeAuditId) {
          return {
            ...audit,
            headerValues: {
              ...audit.headerValues,
              present_person: presentPerson
            }
          };
        }
        return audit;
      }));

      const audit = audits.find(a => a.id === activeAuditId);
      const nextHeaderValues = {
        ...(audit?.headerValues || {}),
        present_person: presentPerson
      };

      // Uložit do Firestore
      await updateAudit(activeAuditId, { headerValues: nextHeaderValues });
    } catch (error) {
      console.error('[handlePresentPersonUpdate] Error:', error);
    }
  }, [activeAuditId, audits]);

  const handleFinishAudit = async () => {
    if (!activeAuditId) return;

    try {
      // Najít aktuální audit pro získání existujícího completedAt
      const currentAudit = audits.find(a => a.id === activeAuditId);
      // Použít existující completedAt, pokud existuje, jinak aktuální datum
      const completedAt = currentAudit?.completedAt || new Date().toISOString();

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
      // Po vytvoření nové verze vždy zobrazit právě vytvořený (nejnovější) report.
      // Jinak může zůstat "připnutá" předchozí verze přes activeReportId.
      setActiveReportId(newId);
      navigate(`/reports/${newId}`, { replace: true });

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
          newId,
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
    safeNavigate(() => {
      // Toggle logic requires reading current URL or state, simpler to just go to valid route
      // If in settings -> go to operators. If elsewhere -> go to settings.
      if (location.pathname.startsWith('/settings') || location.pathname.startsWith('/admin')) {
        navigate('/operators');
      } else {
        navigate('/settings');
      }
    });
  };

  const handleNavigateToAdmin = () => {
    safeNavigate(() => {
      navigate('/settings/audit-structure');
    });
  };

  const handleNavigateToUserManagement = () => {
    safeNavigate(() => {
      navigate('/settings/user-management');
    });
  };

  const handleBackFromAdmin = () => {
    navigate('/settings');
  };

  const handleBackFromUserManagement = () => {
    navigate('/settings');
  };

  const handleNavigateToSettings = () => {
    safeNavigate(() => {
      setAppState(AppState.SETTINGS);
    });
  };

  const handleBackFromSettings = () => {
    navigate('/settings');
  };

  const handleNavigateToAuditorSettings = () => {
    safeNavigate(() => {
      navigate('/settings/auditor');
    });
  };

  const handleBackFromAuditorSettings = () => {
    navigate('/settings');
  };

  const handleNavigateToAIReportSettings = () => {
    safeNavigate(() => {
      navigate('/settings/ai-config');
    });
  };

  const handleBackFromAIReportSettings = () => {
    navigate('/settings');
  };

  const handleNavigateToAIUsageStats = () => {
    safeNavigate(() => {
      navigate('/settings/ai-stats');
    });
  };

  const handleBackFromAIUsageStats = () => {
    navigate('/settings');
  };

  const handleNavigateToAIPricingConfig = () => {
    safeNavigate(() => {
      navigate('/settings/ai-pricing');
    });
  };

  const handleBackFromAIPricingConfig = () => {
    navigate('/settings');
  };

  const handleNavigateToAIPrompts = () => {
    setAppState(AppState.AI_PROMPTS);
  };





  const handleNavigateToBillingSettings = () => {
    safeNavigate(() => {
      navigate('/settings/billing');
    });
  };

  const handleNavigateToSupplierManagement = () => {
    safeNavigate(() => {
      navigate('/settings/suppliers');
    });
  };

  const handleNavigateToPricing = () => {
    safeNavigate(() => {
      navigate('/settings/pricing');
    });
  };

  const handleBackFromBillingSettings = () => {
    navigate('/settings');
  };

  const handleBackFromSupplierManagement = () => {
    navigate('/settings');
  };

  const handleBackFromPricing = () => {
    navigate('/settings');
  };

  // Invoice handlers
  const handleNavigateToInvoices = () => {
    safeNavigate(() => {
      setAppState(AppState.INVOICES);
      setActiveInvoiceId(null);
    });
  };

  const handleSelectInvoice = (invoiceId: string) => {
    console.log('[App] handleSelectInvoice called with invoiceId:', invoiceId);
    setActiveInvoiceId(invoiceId);
    setAppState(AppState.INVOICE_DETAIL);
    console.log('[App] State updated - activeInvoiceId:', invoiceId, 'appState:', AppState.INVOICE_DETAIL);
  };

  const handleCreateInvoice = (auditId?: string, customerId?: string) => {
    setInvoiceCreateAuditId(auditId);
    setInvoiceCreateCustomerId(customerId);
    setAppState(AppState.INVOICE_CREATE);
  };

  const handleEditInvoice = (invoiceId: string) => {
    safeNavigate(() => {
      setActiveInvoiceId(invoiceId);
      setAppState(AppState.INVOICE_EDIT);
    });
  };

  const handleBackFromInvoice = () => {
    setAppState(AppState.INVOICES);
    setActiveInvoiceId(null);
    setInvoiceCreateAuditId(undefined);
    setInvoiceCreateCustomerId(undefined);
  };

  const handleCancelInvoice = async (invoiceId: string) => {
    try {
      const { markInvoiceAsCancelled } = await import('./services/firestore');
      await markInvoiceAsCancelled(invoiceId);
      toast.success('Faktura byla stornována');
      // Pokud je faktura aktuálně zobrazena, vrátit se na seznam
      if (activeInvoiceId === invoiceId) {
        handleBackFromInvoice();
      }
      // Aktualizovat seznam faktur
      setInvoiceRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      console.error('[App] Error cancelling invoice:', error);
      toast.error('Chyba při stornování faktury: ' + error.message);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    try {
      const { deleteInvoice } = await import('./services/firestore');
      await deleteInvoice(invoiceId);
      toast.success('Faktura byla trvale smazána');
      // Pokud je faktura aktuálně zobrazena, vrátit se na seznam
      if (activeInvoiceId === invoiceId) {
        handleBackFromInvoice();
      }
      // Aktualizovat seznam faktur
      setInvoiceRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      console.error('[App] Error deleting invoice:', error);
      toast.error('Chyba při mazání faktury: ' + error.message);
    }
  };

  const handleMarkInvoiceAsPaid = async (invoiceId: string) => {
    try {
      const { markInvoiceAsPaid } = await import('./services/firestore');
      await markInvoiceAsPaid(invoiceId);
      toast.success('Faktura byla označena jako zaplacená');
      // Pokud je faktura aktuálně zobrazena, aktualizovat ji
      if (activeInvoiceId === invoiceId) {
        // InvoiceDetailPage si to načte samo přes useEffect
      }
      // Aktualizovat seznam faktur
      setInvoiceRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      console.error('[App] Error marking invoice as paid:', error);
      toast.error('Chyba při označení faktury jako zaplacené: ' + error.message);
    }
  };

  const handleRestoreInvoice = async (invoiceId: string) => {
    try {
      const { restoreInvoice } = await import('./services/firestore');
      await restoreInvoice(invoiceId);
      toast.success('Faktura byla obnovena');
      // Pokud je faktura aktuálně zobrazena, aktualizovat ji
      if (activeInvoiceId === invoiceId) {
        // InvoiceDetailPage si to načte samo přes useEffect
      }
      // Aktualizovat seznam faktur
      setInvoiceRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      console.error('[App] Error restoring invoice:', error);
      toast.error('Chyba při obnovení faktury: ' + error.message);
    }
  };

  const handleSaveInvoice = async (invoiceId: string) => {
    // Pokud byla faktura vytvořena z auditu, aktualizovat audit.invoiceId
    if (invoiceCreateAuditId) {
      try {
        await updateAudit(invoiceCreateAuditId, { invoiceId });
        // Aktualizovat lokální state
        setAudits(prev => prev.map(a =>
          a.id === invoiceCreateAuditId ? { ...a, invoiceId } : a
        ));
      } catch (error: any) {
        console.error('[App] Error updating audit invoiceId:', error);
        toast.error('Chyba při aktualizaci auditu: ' + error.message);
      }
    }

    setActiveInvoiceId(invoiceId);
    setAppState(AppState.INVOICE_DETAIL);
    setInvoiceCreateAuditId(undefined);
    setInvoiceCreateCustomerId(undefined);
    setInvoiceCreateAuditId(undefined);
    setInvoiceCreateCustomerId(undefined);
  };

  const handleNavigate = (state: AppState) => {
    safeNavigate(() => {
      // Mapování AppState na URL
      switch (state) {
        case AppState.OPERATOR_DASHBOARD:
          navigate('/operators');
          break;
        case AppState.ADD_OPERATOR:
          navigate('/operators/new');
          break;
        case AppState.ALL_AUDITS:
          navigate('/audits');
          break;
        case AppState.INCOMPLETE_AUDITS:
          navigate('/audits/incomplete');
          break;
        case AppState.IN_PROGRESS_AUDITS:
          navigate('/audits/in-progress');
          break;
        case AppState.INVOICES:
          navigate('/invoices');
          break;
        case AppState.INVOICE_CREATE:
          navigate('/invoices/new');
          break;
        case AppState.SETTINGS:
          navigate('/settings');
          break;
        case AppState.AUDITOR_SETTINGS:
          navigate('/settings/auditor');
          break;
        case AppState.AI_REPORT_SETTINGS:
          navigate('/settings/ai-config');
          break;
        case AppState.AI_USAGE_STATS:
          navigate('/settings/ai-stats');
          break;
        case AppState.AI_PRICING_CONFIG:
          navigate('/settings/ai-pricing');
          break;
        case AppState.BILLING_SETTINGS:
          navigate('/settings/billing');
          break;
        case AppState.SUPPLIER_MANAGEMENT:
          navigate('/settings/suppliers');
          break;
        case AppState.PRICING:
          navigate('/settings/pricing');
          break;
        case AppState.ADMIN:
          navigate('/settings/audit-structure');
          break;
        case AppState.USER_MANAGEMENT:
          navigate('/settings/user-management');
          break;
        default:
          // Fallback pro stavy, které nemají přímou URL (nebo jsou modální)
          setAppState(state);
      }
    });
  };

  // --- RENDER LOGIC ---
  const renderContent = () => {
    console.log('[App] renderContent called. AppState:', appState, 'ActiveTab:', activeTabId);
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
              onCancelReportGeneration={handleCancelReportGeneration}
              onSelectVersion={async (reportId) => {
                // Check if report exists in current state
                const reportExists = reports.some(r => r.id === reportId);
                if (!reportExists) {
                  // If not found (e.g. newly created), reload data first
                  await reload();
                }
                setActiveReportId(reportId);
              }}
              onBack={handleBackToAuditList}
            />
          );
        } else if (activeTab.type === 'audit' && activeAudit) {
          return <AuditChecklistWrapper auditData={activeAudit} auditStructure={auditStructure} onAnswerUpdate={handleAnswerUpdate} onComplete={handleFinishAudit} onSaveProgress={handleSaveProgress} onCompletedAtUpdate={handleCompletedAtUpdate} onNoteUpdate={handleNoteUpdate} onPresentPersonUpdate={handlePresentPersonUpdate} onBack={handleBackToAuditList} log={log} />;
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
          onOperatorAdded={(newOperator) => {
            setOperators(prev => [...prev, newOperator]);
          }}
          onPremiseAdded={(newPremise) => {
            setPremises(prev => [...prev, newPremise]);
          }}
        />;
      case AppState.ADD_OPERATOR:
      case AppState.EDIT_OPERATOR:
        return (
          <OperatorForm
            initialData={appState === AppState.EDIT_OPERATOR ? operatorToEdit || null : null}
            operators={operators}
            onSave={(data) => {
              handleSaveOperator(data);
            }}
            onBack={handleBackToDashboard}
          />
        );
      case AppState.ADD_PREMISE:
      case AppState.EDIT_PREMISE:
        return <PremiseForm
          initialData={appState === AppState.EDIT_PREMISE ? premiseToEdit || null : null}
          operatorId={activeOperatorId || ''}
          premises={premises}
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
          onCreateInvoiceFromAudit={(auditId) => {
            const audit = audits.find(a => a.id === auditId);
            const premise = audit ? premises.find(p => p.id === audit.premiseId) : null;
            const customerId = premise ? premise.operatorId : undefined;
            handleCreateInvoice(auditId, customerId);
          }}
          onSelectInvoice={handleSelectInvoice}
          getInvoiceByAuditId={async (auditId) => {
            const audit = audits.find(a => a.id === auditId);
            if (audit?.invoiceId) {
              try {
                // Načíst fakturu a zkontrolovat, jestli skutečně existuje
                const { getInvoice } = await import('./services/firestore/invoices');
                const invoice = await getInvoice(audit.invoiceId);
                if (invoice) {
                  return { id: invoice.id, invoiceNumber: invoice.invoiceNumber, status: invoice.status };
                }
                // Pokud faktura neexistuje, odstranit invoiceId z auditu
                const { updateAudit } = await import('./services/firestore');
                await updateAudit(auditId, { invoiceId: null });
                // Aktualizovat lokální state
                setAudits(prev => prev.map(a => a.id === auditId ? { ...a, invoiceId: undefined } : a));
              } catch (error) {
                console.error('[getInvoiceByAuditId] Error loading invoice:', error);
                // Pokud faktura neexistuje, odstranit invoiceId z auditu
                const { updateAudit } = await import('./services/firestore');
                await updateAudit(auditId, { invoiceId: null });
                // Aktualizovat lokální state
                setAudits(prev => prev.map(a => a.id === auditId ? { ...a, invoiceId: undefined } : a));
              }
            }
            return null;
          }}
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
        return <AuditChecklistWrapper auditData={activeAudit} auditStructure={auditStructure} onAnswerUpdate={handleAnswerUpdate} onComplete={handleFinishAudit} onSaveProgress={handleSaveProgress} onCompletedAtUpdate={handleCompletedAtUpdate} onNoteUpdate={handleNoteUpdate} onPresentPersonUpdate={handlePresentPersonUpdate} onBack={handleBackToAuditList} log={log} />;
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
            onCancelReportGeneration={handleCancelReportGeneration}
            onSelectVersion={(reportId) => {
              navigate(`/reports/${reportId}`);
            }}
            onBack={handleBackToAuditList}
          />
        );
      }
      case AppState.SETTINGS:
        return <SettingsScreen onNavigateToAdmin={handleNavigateToAdmin} onNavigateToUserManagement={handleNavigateToUserManagement} onNavigateToAuditorSettings={handleNavigateToAuditorSettings} onNavigateToAIReportSettings={handleNavigateToAIReportSettings} onNavigateToAIUsageStats={handleNavigateToAIUsageStats} onNavigateToAIPricingConfig={handleNavigateToAIPricingConfig} onNavigateToBillingSettings={handleNavigateToBillingSettings} onNavigateToSupplierManagement={handleNavigateToSupplierManagement} />;
      case AppState.USER_MANAGEMENT:
        return <UserManagementScreen onBack={handleBackFromUserManagement} />;
      case AppState.AUDITOR_SETTINGS:
        return <AuditorSettingsScreen onBack={handleBackFromAuditorSettings} />;
      case AppState.AI_REPORT_SETTINGS:
        return <AIReportSettingsScreen onBack={handleBackFromAIReportSettings} />;
      case AppState.AI_USAGE_STATS:
        return <AIUsageStatsScreen onBack={handleBackFromAIUsageStats} />;
      case AppState.AI_PRICING_CONFIG:
        return <AIPricingConfigScreen onBack={handleBackFromAIPricingConfig} />;


      case AppState.BILLING_SETTINGS:
        return <BillingSettingsScreen onBack={handleBackFromBillingSettings} onNavigateToPricing={handleNavigateToPricing} />;
      case AppState.SUPPLIER_MANAGEMENT:
        return <SupplierManagementScreen onBack={handleBackFromSupplierManagement} />;
      case AppState.PRICING:
        return <PricingScreen onBack={handleBackFromPricing} />;
      case AppState.INVOICES:
        return <InvoicesPage
          onSelectInvoice={handleSelectInvoice}
          onCreateInvoice={() => handleCreateInvoice()}
          onEditInvoice={handleEditInvoice}
          onCancelInvoice={handleCancelInvoice}
          onDeleteInvoice={handleDeleteInvoice}
          onMarkAsPaid={handleMarkInvoiceAsPaid}
          onRestoreInvoice={handleRestoreInvoice}
          refreshTrigger={invoiceRefreshTrigger}
        />;
      case AppState.INVOICE_DETAIL:
        console.log('[App] Rendering INVOICE_DETAIL, activeInvoiceId:', activeInvoiceId);
        return activeInvoiceId ? (
          <InvoiceDetailPage
            invoiceId={activeInvoiceId}
            onBack={handleBackFromInvoice}
            onEdit={handleEditInvoice}
            onSelectAudit={(auditId) => {
              setActiveAuditId(auditId);
              handleSelectAudit(auditId);
            }}
            onRestoreInvoice={handleRestoreInvoice}
          />
        ) : (
          <InvoicesPage
            onSelectInvoice={handleSelectInvoice}
            onCreateInvoice={() => handleCreateInvoice()}
          />
        );
      case AppState.INVOICE_CREATE:
      case AppState.INVOICE_EDIT:
        return (
          <InvoiceForm
            key={`invoice-form-${invoiceCreateAuditId || 'new'}-${invoiceCreateCustomerId || 'none'}`}
            invoice={appState === AppState.INVOICE_EDIT && activeInvoiceId ? undefined : null}
            invoiceId={appState === AppState.INVOICE_EDIT ? activeInvoiceId || undefined : undefined}
            initialAuditId={invoiceCreateAuditId}
            initialCustomerId={invoiceCreateCustomerId}
            operators={operators}
            premises={premises}
            audits={audits}
            onSave={handleSaveInvoice}
            onBack={handleBackFromInvoice}
            onNavigateToSettings={() => {
              setPreviousAppState(appState);
              setAppState(AppState.SETTINGS);
            }}
            onOperatorAdded={(operator) => {
              // Aktualizovat seznam zákazníků
              setOperators(prev => [...prev, operator]);
            }}
          />
        );
      case AppState.ADMIN:
        return <AdminScreen auditStructure={auditStructure} setAuditStructure={setAuditStructureState} onBack={handleBackFromAdmin} />;
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
    // Sidebar should be visible for most editing screens now
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
