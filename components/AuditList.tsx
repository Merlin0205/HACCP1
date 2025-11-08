import React, { useState, useMemo, Fragment, useEffect } from 'react';
import { Audit, AuditStatus, Operator, Premise, Report, ReportStatus } from '../types';
import { Card, CardHeader, CardBody, CardFooter } from './ui/Card';
import { TextField } from './ui/Input';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { Badge } from './ui/Badge';
import { PlusIcon, EditIcon, TrashIcon, ReportIcon, ClockIcon } from './icons';
import { PageHeader } from './PageHeader';
import { SECTION_THEMES } from '../constants/designSystem';
import { AppState } from '../types';
import { fetchActiveAuditTypes, AuditType } from '../services/firestore/auditTypes';
import { Pagination } from './ui/Pagination';

interface AuditListProps {
  premiseName: string;
  premiseId?: string; // ID pracoviště pro vytváření auditů
  audits: Audit[];
  reports: Report[];
  operators: Operator[];
  premises: Premise[];
  onSelectAudit: (auditId: string, reportId?: string) => void;
  onPrepareNewAudit: (auditTypeId?: string) => void; // Deprecated, použijte onPrepareAudit
  onPrepareAudit?: (premiseId: string) => void; // Nový handler pro předpřipravení
  onStartNewAudit?: (premiseId: string) => void; // Nový handler pro vytvoření
  onDeleteAudit: (auditId: string) => void;
  onUnlockAudit: (auditId: string) => void;
  onCancelReportGeneration?: (reportId: string) => void;
  onDeleteReportVersion?: (reportId: string, auditId: string) => void;
  onSetReportAsLatest?: (reportId: string, auditId: string) => void;
  onBack: () => void;
}

type SortField = 'status' | 'createdAt' | 'completedAt';
type SortDirection = 'asc' | 'desc';

export const AuditList: React.FC<AuditListProps> = ({ 
  premiseName, 
  premiseId,
  audits, 
  reports,
  operators,
  premises,
  onSelectAudit, 
  onPrepareNewAudit, 
  onPrepareAudit,
  onStartNewAudit,
  onDeleteAudit, 
  onUnlockAudit,
  onCancelReportGeneration,
  onDeleteReportVersion,
  onSetReportAsLatest,
  onBack 
}) => {
  const [deletingAuditId, setDeletingAuditId] = useState<string | null>(null);
  const [unlockingAuditId, setUnlockingAuditId] = useState<string | null>(null);
  const [preparingAuditPremiseId, setPreparingAuditPremiseId] = useState<string | null>(null);
  const [startingAuditPremiseId, setStartingAuditPremiseId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AuditStatus | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [expandedAudits, setExpandedAudits] = useState<Set<string>>(new Set());
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
  const [settingLatestReportId, setSettingLatestReportId] = useState<string | null>(null);
  const [showAuditTypeModal, setShowAuditTypeModal] = useState(false);
  const [auditTypes, setAuditTypes] = useState<AuditType[]>([]);
  const [selectedAuditTypeId, setSelectedAuditTypeId] = useState<string>('');
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // Získat premiseId - MUSÍ být k dispozici, stejně jako premise.id v OperatorDashboard
  const resolvedPremiseId = useMemo(() => {
    console.log('[AuditList] Resolving premiseId:', { premiseId, audits: audits.length, premiseName, premises: premises?.length });
    
    // 1. Použít premiseId z props (nejspolehlivější)
    if (premiseId) {
      console.log('[AuditList] Using premiseId from props:', premiseId);
      return premiseId;
    }
    
    // 2. Najít z audits
    if (audits.length > 0 && audits[0].premiseId) {
      console.log('[AuditList] Using premiseId from audits:', audits[0].premiseId);
      return audits[0].premiseId;
    }
    
    // 3. Najít z premises pomocí premiseName
    if (premiseName && premises && premises.length > 0) {
      const found = premises.find(p => p.premise_name === premiseName);
      if (found?.id) {
        console.log('[AuditList] Found premiseId from premiseName:', found.id);
        return found.id;
      }
    }
    
    console.error('[AuditList] Could not resolve premiseId!');
    return null;
  }, [premiseId, audits, premiseName, premises]);

  // Načíst aktivní typy auditů při otevření modalu
  useEffect(() => {
    if (showAuditTypeModal) {
      const loadTypes = async () => {
        try {
          setLoadingTypes(true);
          const types = await fetchActiveAuditTypes();
          setAuditTypes(types);
          if (types.length > 0) {
            setSelectedAuditTypeId(types[0].id);
          }
        } catch (error) {
          console.error('[AuditList] Error loading audit types:', error);
        } finally {
          setLoadingTypes(false);
        }
      };
      loadTypes();
    }
  }, [showAuditTypeModal]);

  const handleNewAuditClick = () => {
    setShowAuditTypeModal(true);
  };

  const handleConfirmAuditType = () => {
    setShowAuditTypeModal(false);
    onPrepareNewAudit(selectedAuditTypeId || undefined);
    setSelectedAuditTypeId('');
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: AuditStatus) => {
    const badgeColors: Record<AuditStatus, 'gray' | 'blue' | 'success' | 'warning'> = {
      [AuditStatus.DRAFT]: 'gray',
      [AuditStatus.NOT_STARTED]: 'gray',
      [AuditStatus.IN_PROGRESS]: 'blue',
      [AuditStatus.COMPLETED]: 'success',
      [AuditStatus.REVISED]: 'warning',
      [AuditStatus.LOCKED]: 'success',
    };
    const displayText = status === AuditStatus.LOCKED ? AuditStatus.COMPLETED : 
                        status === AuditStatus.NOT_STARTED ? AuditStatus.DRAFT : status;
    return (
      <Badge color={badgeColors[status] || 'gray'}>
        {displayText}
      </Badge>
    );
  };

  const getAuditReportVersions = (auditId: string) => {
    return reports
      .filter(r => r.auditId === auditId)
      .sort((a, b) => {
        if (a.versionNumber !== undefined && b.versionNumber !== undefined) {
          return b.versionNumber - a.versionNumber;
        }
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
  };

  const getReportBadge = (auditId: string) => {
    const report = reports.find(r => r.auditId === auditId && r.isLatest);
    if (!report) return null;

    const badgeColors: Record<ReportStatus, 'warning' | 'success' | 'failure'> = {
      [ReportStatus.PENDING]: 'warning',
      [ReportStatus.GENERATING]: 'warning',
      [ReportStatus.DONE]: 'success',
      [ReportStatus.ERROR]: 'failure',
    };

    const isGenerating = report.status === ReportStatus.GENERATING;

    return (
      <div className="flex items-center gap-1">
        {isGenerating && onCancelReportGeneration && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCancelReportGeneration(report.id);
            }}
            className="p-0.5 rounded hover:bg-red-100 text-red-600 transition-colors"
            title="Zrušit generování"
          >
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        <Badge 
          color={badgeColors[report.status] || 'gray'}
          className={isGenerating ? 'animate-pulse' : ''}
        >
          {report.status === ReportStatus.GENERATING ? 'Generuje se...' : report.status === ReportStatus.DONE ? 'Hotovo' : report.status}
        </Badge>
      </div>
    );
  };

  const toggleAuditExpansion = (auditId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedAudits(prev => {
      const newSet = new Set(prev);
      if (newSet.has(auditId)) {
        newSet.delete(auditId);
      } else {
        newSet.add(auditId);
      }
      return newSet;
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const filteredAndSortedAudits = useMemo(() => {
    let filtered = audits.filter(audit => {
      // Filtr podle statusu
      if (statusFilter !== 'all' && audit.status !== statusFilter) {
        return false;
      }

      // Vyhledávání podle ID nebo provozovatele/pracoviště
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const premise = premises?.find(p => p.id === audit.premiseId);
        const operator = premise ? operators?.find(o => o.id === premise.operatorId) : null;
        
        if (
          !audit.id.toLowerCase().includes(query) &&
          !(operator?.operator_name?.toLowerCase().includes(query)) &&
          !(premise?.premise_name?.toLowerCase().includes(query))
        ) {
          return false;
        }
      }

      return true;
    });

    // Řazení
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'createdAt':
          aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
        case 'completedAt':
          aValue = a.completedAt ? new Date(a.completedAt).getTime() : 0;
          bValue = b.completedAt ? new Date(b.completedAt).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [audits, statusFilter, searchQuery, sortField, sortDirection, operators, premises]);

  const paginatedAudits = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedAudits.slice(start, start + itemsPerPage);
  }, [filteredAndSortedAudits, currentPage, itemsPerPage]);

  const isCompleted = (status: AuditStatus) => {
    return status === AuditStatus.COMPLETED || status === AuditStatus.LOCKED;
  };

  const isEditable = (status: AuditStatus) => {
    return status === AuditStatus.DRAFT || 
           status === AuditStatus.IN_PROGRESS || 
           status === AuditStatus.REVISED ||
           status === AuditStatus.NOT_STARTED;
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <PageHeader
        section={SECTION_THEMES[AppState.ALL_AUDITS]}
        title="Audity"
        description={`Kompletní seznam auditů pro pracoviště: ${premiseName}`}
        action={
          resolvedPremiseId ? (
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('[AuditList] Předpřipravit clicked, premiseId:', resolvedPremiseId);
                  setPreparingAuditPremiseId(resolvedPremiseId);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-purple-50 transition-colors text-purple-600 hover:text-purple-700 border border-purple-200"
                title="Předpřipravit audit"
              >
                <ClockIcon className="h-4 w-4" />
                <span className="text-sm font-medium">Předpřipravit audit</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('[AuditList] Začít clicked, premiseId:', resolvedPremiseId);
                  setStartingAuditPremiseId(resolvedPremiseId);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-green-50 transition-colors text-green-600 hover:text-green-700 bg-green-50 border border-green-200"
                title="Začít audit"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                <span className="text-sm font-medium">Začít audit</span>
              </button>
            </div>
          ) : null
        }
      />

      {/* Search and Filter */}
      <Card>
        <CardBody>
          <div className={`grid grid-cols-1 ${statusFilter !== 'all' ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
            <TextField
              label="Vyhledávání"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ID, provozovatel, pracoviště..."
              leftIcon={
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as AuditStatus | 'all')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
              >
                <option value="all">Všechny</option>
                <option value={AuditStatus.IN_PROGRESS}>Probíhá</option>
                <option value={AuditStatus.COMPLETED}>Dokončen</option>
                <option value={AuditStatus.REVISED}>Změny</option>
                <option value={AuditStatus.DRAFT}>Nezapočatý</option>
              </select>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Zobrazeno: <span className="font-semibold text-gray-900">{filteredAndSortedAudits.length}</span> z {audits.length}
          </div>
        </CardBody>
      </Card>

      {/* Table - Desktop */}
      <Card className="hidden md:block">
        <CardBody className="p-0">
          <div className="min-w-[900px] xl:min-w-0 overflow-x-auto xl:overflow-x-visible overflow-y-visible">
            <table className="w-full">
            <thead 
              style={{
                background: `linear-gradient(to right, ${SECTION_THEMES[AppState.ALL_AUDITS].colors.primary}, ${SECTION_THEMES[AppState.ALL_AUDITS].colors.darkest})`
              }}
            >
              <tr>
                <th className="px-3 md:px-4 xl:px-6 py-3 md:py-4 text-left text-xs font-semibold text-white uppercase tracking-wider rounded-tl-lg">
                  ID
                </th>
                <th
                  className="px-3 md:px-4 xl:px-6 py-3 md:py-4 text-left text-xs font-semibold text-white uppercase tracking-wider cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-2">
                    Status
                    <SortIcon field="status" />
                  </div>
                </th>
                <th
                  className="px-3 md:px-4 xl:px-6 py-3 md:py-4 text-left text-xs font-semibold text-white uppercase tracking-wider cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center gap-2">
                    Datum založení
                    <SortIcon field="createdAt" />
                  </div>
                </th>
                <th
                  className="px-3 md:px-4 xl:px-6 py-3 md:py-4 text-left text-xs font-semibold text-white uppercase tracking-wider cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => handleSort('completedAt')}
                >
                  <div className="flex items-center gap-2">
                    Datum dokončení
                    <SortIcon field="completedAt" />
                  </div>
                </th>
                <th className="px-3 md:px-4 xl:px-6 py-3 md:py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                  Report
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider rounded-tr-lg">
                  Akce
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredAndSortedAudits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 mb-1">Žádné audity nenalezeny</p>
                      <p className="text-sm text-gray-600">Zkuste upravit vyhledávání nebo vytvořte nový audit</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedAudits.map((audit, index) => {
                  const premise = premises?.find(p => p.id === audit.premiseId);
                  const operator = premise ? operators?.find(o => o.id === premise.operatorId) : null;
                  const reportVersions = getAuditReportVersions(audit.id);
                  const hasMultipleVersions = reportVersions.length > 1;
                  const isExpanded = expandedAudits.has(audit.id);
                  const isLastRow = index === paginatedAudits.length - 1;

                  return (
                    <React.Fragment key={audit.id}>
                      <tr
                        className="hover:bg-primary-light/5 transition-colors cursor-pointer"
                        onClick={() => onSelectAudit(audit.id)}
                      >
                      <td className="px-3 md:px-4 xl:px-6 py-3 md:py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {audit.id}
                        </div>
                      </td>
                      <td className="px-3 md:px-4 xl:px-6 py-3 md:py-4 whitespace-nowrap">
                        {getStatusBadge(audit.status)}
                      </td>
                      <td className="px-3 md:px-4 xl:px-6 py-3 md:py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(audit.createdAt)}
                        </div>
                      </td>
                      <td className="px-3 md:px-4 xl:px-6 py-3 md:py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {audit.completedAt ? formatDate(audit.completedAt) : '-'}
                        </div>
                      </td>
                      <td className="px-3 md:px-4 xl:px-6 py-3 md:py-4 whitespace-nowrap">
                        {getReportBadge(audit.id)}
                      </td>
                      <td className="px-3 md:px-4 xl:px-6 py-3 md:py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {/* Pokračovat v auditu nebo Zobrazit report */}
                          {isCompleted(audit.status) ? (
                            <div className="relative group">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectAudit(audit.id);
                                }}
                                className="p-2 rounded-lg hover:bg-primary-light/20 transition-colors text-primary hover:text-primary-dark"
                                title="Zobrazit report"
                              >
                                <ReportIcon className="h-5 w-5" />
                              </button>
                              {/* Tooltip */}
                              <div className="absolute right-0 top-full mt-1 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                Zobrazit report
                              </div>
                            </div>
                          ) : (
                            <div className="relative group">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectAudit(audit.id);
                                }}
                                className="p-2 rounded-lg hover:bg-green-50 transition-colors text-green-600 hover:text-green-700"
                                title="Pokračovat v auditu"
                              >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                              </button>
                              {/* Tooltip */}
                              <div className="absolute right-0 top-full mt-1 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                Pokračovat v auditu
                              </div>
                            </div>
                          )}

                          {/* Editovat (pouze pokud není dokončen) */}
                          {isEditable(audit.status) && (
                            <div className="relative group">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectAudit(audit.id);
                                }}
                                className="p-2 rounded-lg hover:bg-blue-50 transition-colors text-blue-600 hover:text-blue-700"
                                title="Editovat audit"
                              >
                                <EditIcon className="h-5 w-5" />
                              </button>
                              {/* Tooltip */}
                              <div className="absolute right-0 top-full mt-1 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                Editovat audit
                              </div>
                            </div>
                          )}

                          {/* Odemknout (pouze pokud je dokončen) */}
                          {isCompleted(audit.status) && onUnlockAudit && (
                            <div className="relative group">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setUnlockingAuditId(audit.id);
                                }}
                                className="p-2 rounded-lg hover:bg-yellow-50 transition-colors text-yellow-600 hover:text-yellow-700"
                                title="Odemknout pro úpravy"
                              >
                                <EditIcon className="h-5 w-5" />
                              </button>
                              {/* Tooltip */}
                              <div className="absolute right-0 top-full mt-1 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                Odemknout pro úpravy
                              </div>
                            </div>
                          )}

                          {/* Smazat */}
                          {onDeleteAudit && (
                            <div className="relative group">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingAuditId(audit.id);
                                }}
                                className="p-2 rounded-lg hover:bg-red-50 transition-colors text-red-600 hover:text-red-700"
                                title="Smazat audit"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                              {/* Tooltip */}
                              <div className="absolute right-0 top-full mt-1 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                Smazat audit
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                    {/* Collapsible sekce s historií verzí reportů */}
                    {(() => {
                      const reportVersions = getAuditReportVersions(audit.id);
                      const hasMultipleVersions = reportVersions.length > 1;
                      const isExpanded = expandedAudits.has(audit.id);
                      
                      if (!hasMultipleVersions) return null;
                      
                      return (
                        <tr className="bg-gradient-to-r from-yellow-50 via-amber-50 to-yellow-50">
                          <td colSpan={6} className="px-4 py-1 md:px-6 md:py-1.5">
                            <button
                              onClick={(e) => toggleAuditExpansion(audit.id, e)}
                              className="w-full flex items-center justify-between text-left transition-all hover:opacity-80"
                            >
                              <div className="flex items-center gap-2 md:gap-3">
                                <div className="flex items-center justify-center w-5 h-5 md:w-6 md:h-6 bg-yellow-400 rounded-full shadow-sm flex-shrink-0">
                                  <svg className="h-3 w-3 md:h-4 md:w-4 text-yellow-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </div>
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <span className="font-semibold text-yellow-900 text-xs md:text-sm whitespace-nowrap">
                                    Historie verzí reportů
                                  </span>
                                  <span className="px-1.5 py-0.5 bg-yellow-200 text-yellow-900 text-xs rounded-full font-medium whitespace-nowrap">
                                    {reportVersions.length} {reportVersions.length === 1 ? 'verze' : reportVersions.length >= 2 && reportVersions.length <= 4 ? 'verze' : 'verzí'}
                                  </span>
                                </div>
                              </div>
                              <svg
                                className={`h-3.5 w-3.5 md:h-4 md:w-4 text-yellow-700 transition-transform duration-200 flex-shrink-0 ml-2 ${isExpanded ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            {isExpanded && (
                              <div className="mt-1.5 md:mt-2 space-y-1 pl-7 md:pl-9">
                                {reportVersions.map((report, index) => (
                                  <div
                                    key={report.id}
                                    className="flex items-center justify-between gap-2 p-1.5 md:p-2 bg-white rounded border-2 border-yellow-200 hover:border-yellow-300 hover:shadow-sm transition-all duration-200"
                                  >
                                    <div className="flex items-center gap-1.5 md:gap-2 flex-1 min-w-0">
                                      <div className={`flex items-center justify-center w-4 h-4 md:w-5 md:h-5 rounded-full font-bold text-xs flex-shrink-0 ${
                                        report.isLatest 
                                          ? 'bg-gradient-to-br from-green-400 to-green-500 text-white shadow-sm' 
                                          : 'bg-gradient-to-br from-yellow-100 to-yellow-200 text-yellow-900'
                                      }`}>
                                        {report.versionNumber || '?'}
                                      </div>
                                      <span className="font-semibold text-gray-900 text-xs truncate">
                                        Verze {report.versionNumber || 'N/A'}
                                      </span>
                                      {report.createdByName && (
                                        <div className="flex items-center gap-0.5 text-xs text-gray-600 hidden sm:flex">
                                          <svg className="h-2.5 w-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                          </svg>
                                          <span className="font-medium truncate">{report.createdByName}</span>
                                        </div>
                                      )}
                                      {report.createdAt && (
                                        <div className="flex items-center gap-0.5 text-xs text-gray-600 hidden md:flex">
                                          <svg className="h-2.5 w-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                          </svg>
                                          <span className="truncate">{formatDate(report.createdAt)}</span>
                                        </div>
                                      )}
                                      {report.isLatest && (
                                        <span className="px-1 py-0.5 bg-green-100 text-green-800 text-xs rounded-full font-semibold shadow-sm flex-shrink-0">
                                          Aktuální
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      {report.status === ReportStatus.DONE ? (
                                        <>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onSelectAudit(audit.id, report.id);
                                            }}
                                            className="p-1 md:p-1.5 rounded bg-gradient-to-br from-primary to-primary-dark text-white hover:shadow-md hover:scale-105 transition-all duration-200"
                                            title="Otevřít tuto verzi reportu"
                                          >
                                            <ReportIcon className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                          </button>
                                          {!report.isLatest && onSetReportAsLatest && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSettingLatestReportId(report.id);
                                              }}
                                              className="p-1 md:p-1.5 rounded bg-gradient-to-br from-green-50 to-green-100 text-green-700 hover:from-green-100 hover:to-green-200 hover:shadow-sm transition-all duration-200 border border-green-200"
                                              title="Nastavit jako aktuální verzi"
                                            >
                                              <svg className="h-3.5 w-3.5 md:h-4 md:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                              </svg>
                                            </button>
                                          )}
                                          {onDeleteReportVersion && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setDeletingReportId(report.id);
                                              }}
                                              className="p-1 md:p-1.5 rounded bg-gradient-to-br from-red-50 to-red-100 text-red-700 hover:from-red-100 hover:to-red-200 hover:shadow-sm transition-all duration-200 border border-red-200"
                                              title="Smazat tuto verzi"
                                            >
                                              <TrashIcon className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                            </button>
                                          )}
                                        </>
                                      ) : (
                                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium border ${
                                          report.status === ReportStatus.GENERATING 
                                            ? 'bg-yellow-100 text-yellow-800 border-yellow-300' 
                                            : report.status === ReportStatus.PENDING 
                                            ? 'bg-blue-100 text-blue-800 border-blue-300'
                                            : 'bg-red-100 text-red-800 border-red-300'
                                        }`}>
                                          {report.status === ReportStatus.GENERATING ? 'Generuje se...' : report.status}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })()}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalItems={filteredAndSortedAudits.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(items) => {
              setItemsPerPage(items);
              setCurrentPage(1);
            }}
          />
        </CardBody>
      </Card>

      {/* Cards - Mobile */}
      <div className="md:hidden space-y-3 mb-20">
        {filteredAndSortedAudits.length === 0 ? (
          <Card>
            <CardBody className="py-16 text-center">
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-lg font-semibold text-gray-900 mb-1">Žádné audity nenalezeny</p>
                <p className="text-sm text-gray-600">Zkuste upravit vyhledávání nebo vytvořte nový audit</p>
              </div>
            </CardBody>
          </Card>
        ) : (
          filteredAndSortedAudits.map((audit) => {
            const premise = premises?.find(p => p.id === audit.premiseId);
            const operator = premise ? operators?.find(o => o.id === premise.operatorId) : null;
            const reportVersions = getAuditReportVersions(audit.id);
            const hasMultipleVersions = reportVersions.length > 1;
            const isExpanded = expandedAudits.has(audit.id);

            return (
              <Fragment key={audit.id}>
                <Card
                  onClick={() => onSelectAudit(audit.id)}
                  className="cursor-pointer hover:shadow-lg transition-all"
                >
                  <CardBody>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="relative group mb-1">
                          <h3 className="text-base font-bold text-gray-900 cursor-help">{audit.id}</h3>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {getStatusBadge(audit.status)}
                          {getReportBadge(audit.id)}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600 border-t border-gray-100 pt-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Založeno:</span>
                        <span>{formatDate(audit.createdAt)}</span>
                      </div>
                      {audit.completedAt && (
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Dokončeno:</span>
                          <span>{formatDate(audit.completedAt)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                      {isCompleted(audit.status) ? (
                        <Button
                          variant="primary"
                          size="sm"
                          fullWidth
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectAudit(audit.id);
                          }}
                          leftIcon={<ReportIcon className="h-4 w-4" />}
                        >
                          Zobrazit report
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          fullWidth
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectAudit(audit.id);
                          }}
                        >
                          Pokračovat
                        </Button>
                      )}
                      {isCompleted(audit.status) && onUnlockAudit && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setUnlockingAuditId(audit.id);
                          }}
                          className="p-2 rounded-lg hover:bg-yellow-50 transition-colors text-yellow-600"
                          title="Odemknout"
                        >
                          <EditIcon className="h-4 w-4" />
                        </button>
                      )}
                      {onDeleteAudit && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingAuditId(audit.id);
                          }}
                          className="p-2 rounded-lg hover:bg-red-50 transition-colors text-red-600"
                          title="Smazat"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </CardBody>
                </Card>
                {/* Collapsible sekce s historií verzí reportů - Mobile */}
                {hasMultipleVersions && (
                  <Card className="bg-gradient-to-r from-yellow-50 via-amber-50 to-yellow-50">
                    <CardBody className="py-2">
                      <button
                        onClick={(e) => toggleAuditExpansion(audit.id, e)}
                        className="w-full flex items-center justify-between text-left"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-5 h-5 bg-yellow-400 rounded-full shadow-sm">
                            <svg className="h-3 w-3 text-yellow-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <span className="font-semibold text-yellow-900 text-xs">
                            Historie verzí reportů
                          </span>
                          <span className="px-1.5 py-0.5 bg-yellow-200 text-yellow-900 text-xs rounded-full font-medium">
                            {reportVersions.length} {reportVersions.length === 1 ? 'verze' : reportVersions.length >= 2 && reportVersions.length <= 4 ? 'verze' : 'verzí'}
                          </span>
                        </div>
                        <svg
                          className={`h-4 w-4 text-yellow-700 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {isExpanded && (
                        <div className="mt-2 space-y-1 pl-7">
                          {reportVersions.map((report) => (
                            <div
                              key={report.id}
                              className="flex items-center justify-between gap-2 p-1.5 bg-white rounded border-2 border-yellow-200"
                            >
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <div className={`flex items-center justify-center w-4 h-4 rounded-full font-bold text-xs flex-shrink-0 ${
                                  report.isLatest 
                                    ? 'bg-gradient-to-br from-green-400 to-green-500 text-white' 
                                    : 'bg-gradient-to-br from-yellow-100 to-yellow-200 text-yellow-900'
                                }`}>
                                  {report.versionNumber || '?'}
                                </div>
                                <span className="font-semibold text-gray-900 text-xs truncate">
                                  Verze {report.versionNumber || 'N/A'}
                                </span>
                                {report.isLatest && (
                                  <span className="px-1 py-0.5 bg-green-100 text-green-800 text-xs rounded-full font-semibold">
                                    Aktuální
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {report.status === ReportStatus.DONE ? (
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onSelectAudit(audit.id, report.id);
                                      }}
                                      className="p-1 rounded bg-gradient-to-br from-primary to-primary-dark text-white"
                                      title="Otevřít tuto verzi reportu"
                                    >
                                      <ReportIcon className="h-3.5 w-3.5" />
                                    </button>
                                    {!report.isLatest && onSetReportAsLatest && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSettingLatestReportId(report.id);
                                        }}
                                        className="p-1 rounded bg-gradient-to-br from-green-50 to-green-100 text-green-700 border border-green-200"
                                        title="Nastavit jako aktuální verzi"
                                      >
                                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                      </button>
                                    )}
                                    {onDeleteReportVersion && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeletingReportId(report.id);
                                        }}
                                        className="p-1 rounded bg-gradient-to-br from-red-50 to-red-100 text-red-700 border border-red-200"
                                        title="Smazat tuto verzi"
                                      >
                                        <TrashIcon className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium border ${
                                    report.status === ReportStatus.GENERATING 
                                      ? 'bg-yellow-100 text-yellow-800 border-yellow-300' 
                                      : report.status === ReportStatus.PENDING 
                                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                                      : 'bg-red-100 text-red-800 border-red-300'
                                  }`}>
                                    {report.status === ReportStatus.GENERATING ? 'Generuje se...' : report.status}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardBody>
                  </Card>
                )}
              </Fragment>
            );
          })
        )}
      </div>

      {/* Delete Audit Modal */}
      <Modal
        isOpen={!!deletingAuditId}
        onClose={() => setDeletingAuditId(null)}
        title="Smazat audit?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeletingAuditId(null)}>
              Zrušit
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (deletingAuditId) {
                  onDeleteAudit(deletingAuditId);
                  setDeletingAuditId(null);
                }
              }}
            >
              Smazat
            </Button>
          </>
        }
      >
        <p className="text-gray-600">
          Opravdu si přejete smazat tento audit? Tato akce je nevratná.
        </p>
      </Modal>

      {/* Unlock Audit Modal */}
      <Modal
        isOpen={!!unlockingAuditId}
        onClose={() => setUnlockingAuditId(null)}
        title="Odemknout audit?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setUnlockingAuditId(null)}>
              Zrušit
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                if (unlockingAuditId) {
                  onUnlockAudit(unlockingAuditId);
                  setUnlockingAuditId(null);
                }
              }}
            >
              Odemknout
            </Button>
          </>
        }
      >
        <p className="text-gray-600">
          Chcete tento audit odemknout a upravit? Změny se projeví v reportu po opětovném dokončení auditu.
        </p>
      </Modal>

      {/* Delete Report Version Modal */}
      {onDeleteReportVersion && (
        <Modal
          isOpen={!!deletingReportId}
          onClose={() => setDeletingReportId(null)}
          title="Smazat verzi reportu?"
          footer={
            <>
              <Button variant="ghost" onClick={() => setDeletingReportId(null)}>
                Zrušit
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (deletingReportId) {
                    const report = reports.find(r => r.id === deletingReportId);
                    if (report) {
                      onDeleteReportVersion(deletingReportId, report.auditId);
                      setDeletingReportId(null);
                    }
                  }
                }}
              >
                Smazat
              </Button>
            </>
          }
        >
          <p className="text-gray-600">
            Opravdu si přejete smazat tuto verzi reportu? Tato akce je nevratná.
          </p>
        </Modal>
      )}

      {/* Set Report as Latest Modal */}
      {onSetReportAsLatest && (
        <Modal
          isOpen={!!settingLatestReportId}
          onClose={() => setSettingLatestReportId(null)}
          title="Nastavit jako aktuální verzi?"
          footer={
            <>
              <Button variant="ghost" onClick={() => setSettingLatestReportId(null)}>
                Zrušit
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  if (settingLatestReportId) {
                    const report = reports.find(r => r.id === settingLatestReportId);
                    if (report) {
                      onSetReportAsLatest(settingLatestReportId, report.auditId);
                      setSettingLatestReportId(null);
                    }
                  }
                }}
              >
                Nastavit jako aktuální
              </Button>
            </>
          }
        >
          <p className="text-gray-600">
            Tato verze reportu bude nastavena jako aktuální. Ostatní verze budou označeny jako historické.
          </p>
        </Modal>
      )}

      {/* Audit Type Selection Modal */}
      <Modal
        isOpen={showAuditTypeModal}
        onClose={() => {
          setShowAuditTypeModal(false);
          setSelectedAuditTypeId('');
        }}
        title="Vyberte typ auditu"
        footer={
          <>
            <Button variant="ghost" onClick={() => {
              setShowAuditTypeModal(false);
              setSelectedAuditTypeId('');
            }}>
              Zrušit
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmAuditType}
              disabled={!selectedAuditTypeId || loadingTypes}
            >
              Pokračovat
            </Button>
          </>
        }
      >
        {loadingTypes ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : auditTypes.length === 0 ? (
          <p className="text-gray-600 text-center py-8">
            Nejsou k dispozici žádné aktivní typy auditů. Prosím, vytvořte typ auditu v nastavení.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-gray-600 mb-4">
              Vyberte typ auditu, který chcete použít pro nový audit:
            </p>
            {auditTypes.map(type => (
              <label
                key={type.id}
                className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  selectedAuditTypeId === type.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="auditType"
                  value={type.id}
                  checked={selectedAuditTypeId === type.id}
                  onChange={(e) => setSelectedAuditTypeId(e.target.value)}
                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">{type.name}</div>
                  {type.auditStructure.audit_title && (
                    <div className="text-sm text-gray-600 mt-1">
                      {type.auditStructure.audit_title}
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}
      </Modal>

      {/* Prepare Audit Modal */}
      <Modal
        isOpen={!!preparingAuditPremiseId}
        onClose={() => setPreparingAuditPremiseId(null)}
        title="Předpřipravit audit?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPreparingAuditPremiseId(null)}>
              Zrušit
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (preparingAuditPremiseId) {
                  onPrepareAudit(preparingAuditPremiseId);
                  setPreparingAuditPremiseId(null);
                }
              }}
            >
              Předpřipravit
            </Button>
          </>
        }
      >
        <p className="text-gray-600">
          Opravdu chcete předpřipravit audit pro toto pracoviště? Audit bude vytvořen se statusem "Nezapočatý" a bude k dispozici v seznamu nezapočatých auditů.
        </p>
      </Modal>

      {/* Start Audit Modal */}
      <Modal
        isOpen={!!startingAuditPremiseId}
        onClose={() => setStartingAuditPremiseId(null)}
        title="Začít audit?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setStartingAuditPremiseId(null)}>
              Zrušit
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (startingAuditPremiseId) {
                  onStartNewAudit(startingAuditPremiseId);
                  setStartingAuditPremiseId(null);
                }
              }}
            >
              Začít
            </Button>
          </>
        }
      >
        <p className="text-gray-600">
          Opravdu chcete začít audit pro toto pracoviště? Audit bude vytvořen se statusem "Probíhá" a budete přesměrováni přímo do formuláře auditu.
        </p>
      </Modal>
    </div>
  );
};
