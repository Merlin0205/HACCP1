import React, { useState, useMemo, Fragment } from 'react';
import { Audit, AuditStatus, Operator, Premise, Report, ReportStatus } from '../types';
import { Card, CardHeader, CardBody, CardFooter } from './ui/Card';
import { TextField } from './ui/Input';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { Badge } from './ui/Badge';
import { DetailTooltip } from './ui/DetailTooltip';
import { TooltipCell } from './ui/TooltipCell';
import { ActionIconTooltip } from './ui/ActionIconTooltip';
import { SimpleTooltip } from './ui/SimpleTooltip';
import { PlusIcon, EditIcon, TrashIcon, ReportIcon } from './icons';
import { PageHeader } from './PageHeader';
import { SECTION_THEMES } from '../constants/designSystem';
import { SectionTheme } from '../constants/designSystem';
import { AppState } from '../types';
import { Pagination } from './ui/Pagination';

interface AllAuditsScreenProps {
  audits: Audit[];
  operators: Operator[];
  premises: Premise[];
  reports: Report[];
  onSelectAudit: (auditId: string, reportId?: string) => void;
  onDeleteAudit?: (auditId: string) => void;
  onUnlockAudit?: (auditId: string) => void;
  onCancelReportGeneration?: (reportId: string) => void;
  onDeleteReportVersion?: (reportId: string, auditId: string) => void;
  onSetReportAsLatest?: (reportId: string, auditId: string) => void;
  title?: string;
  description?: string;
  onAddNewAudit?: () => void;
  showStatusFilter?: boolean;
  sectionTheme?: SectionTheme;
}

type SortField = 'operator' | 'premise' | 'status' | 'createdAt' | 'completedAt';
type SortDirection = 'asc' | 'desc';

export const AllAuditsScreen: React.FC<AllAuditsScreenProps> = ({
  audits,
  operators,
  premises,
  reports,
  onSelectAudit,
  onDeleteAudit,
  onUnlockAudit,
  onCancelReportGeneration,
  onDeleteReportVersion,
  onSetReportAsLatest,
  title = 'Přehled všech auditů',
  description = 'Kompletní seznam všech auditů v systému',
  onAddNewAudit,
  showStatusFilter = true,
  sectionTheme = SECTION_THEMES[AppState.ALL_AUDITS],
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AuditStatus | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [deletingAuditId, setDeletingAuditId] = useState<string | null>(null);
  const [unlockingAuditId, setUnlockingAuditId] = useState<string | null>(null);
  const [expandedAudits, setExpandedAudits] = useState<Set<string>>(new Set());
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
  const [settingLatestReportId, setSettingLatestReportId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

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
        <Badge 
          color={badgeColors[report.status] || 'gray'}
          className={isGenerating ? 'animate-pulse' : ''}
        >
          {isGenerating ? 'Generuje se...' : report.status}
        </Badge>
        {isGenerating && onCancelReportGeneration && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCancelReportGeneration(report.id);
            }}
            className="px-1.5 py-0.5 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors font-bold"
            title="Zrušit generování"
          >
            ✕
          </button>
        )}
      </div>
    );
  };

  const getAuditReportVersions = (auditId: string): Report[] => {
    return reports
      .filter(r => r.auditId === auditId)
      .sort((a, b) => (b.versionNumber || 0) - (a.versionNumber || 0));
  };

  const toggleAuditExpansion = (auditId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
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

  const filteredAndSortedAudits = useMemo(() => {
    let filtered = audits;

    // Filtrování podle statusu
    if (statusFilter !== 'all') {
      filtered = filtered.filter(audit => audit.status === statusFilter);
    }

    // Vyhledávání
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(audit => {
        const premise = premises.find(p => p.id === audit.premiseId);
        const operator = premise ? operators.find(o => o.id === premise.operatorId) : null;
        
        return (
          (operator?.operator_name?.toLowerCase().includes(query)) ||
          (premise?.premise_name?.toLowerCase().includes(query)) ||
          (audit.id?.toLowerCase().includes(query))
        );
      });
    }

    // Řazení
    filtered = [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'operator':
          const aPremiseOp = premises.find(p => p.id === a.premiseId);
          const bPremiseOp = premises.find(p => p.id === b.premiseId);
          const aOperator = aPremiseOp ? operators.find(o => o.id === aPremiseOp.operatorId) : null;
          const bOperator = bPremiseOp ? operators.find(o => o.id === bPremiseOp.operatorId) : null;
          aValue = aOperator?.operator_name || '';
          bValue = bOperator?.operator_name || '';
          break;
        case 'premise':
          const aPremise = premises.find(p => p.id === a.premiseId);
          const bPremise = premises.find(p => p.id === b.premiseId);
          aValue = aPremise?.premise_name || '';
          bValue = bPremise?.premise_name || '';
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
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
  }, [audits, operators, premises, searchQuery, statusFilter, sortField, sortDirection]);

  const paginatedAudits = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedAudits.slice(start, start + itemsPerPage);
  }, [filteredAndSortedAudits, currentPage, itemsPerPage]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon: React.FC<{ field: SortField }> = ({ field }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 ml-1 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 ml-1 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

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
    <div className="w-full max-w-7xl mx-auto pb-6">
      <PageHeader
        section={sectionTheme}
        title={title}
        description={description}
        action={onAddNewAudit && (
          <Button
            variant="primary"
            size="lg"
            onClick={onAddNewAudit}
            leftIcon={<PlusIcon className="h-5 w-5" />}
          >
            Nový audit
          </Button>
        )}
      />

      {/* Filters */}
      <Card className="mb-6">
        <CardBody>
          <div className={`grid grid-cols-1 ${showStatusFilter ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
            <TextField
              label="Vyhledávání"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Provozovatel, pracoviště, ID..."
              leftIcon={
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
            {showStatusFilter && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as AuditStatus | 'all')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="all">Všechny</option>
                  <option value={AuditStatus.DRAFT}>{AuditStatus.DRAFT}</option>
                  <option value={AuditStatus.IN_PROGRESS}>{AuditStatus.IN_PROGRESS}</option>
                  <option value={AuditStatus.COMPLETED}>{AuditStatus.COMPLETED}</option>
                  <option value={AuditStatus.REVISED}>{AuditStatus.REVISED}</option>
                  {/* Zpětná kompatibilita */}
                  <option value={AuditStatus.NOT_STARTED}>{AuditStatus.DRAFT}</option>
                  <option value={AuditStatus.LOCKED}>{AuditStatus.COMPLETED}</option>
                </select>
              </div>
            )}
            <div className="flex items-end">
              <p className="text-sm text-gray-600">
                Zobrazeno: <span className="font-semibold" style={{ color: sectionTheme.colors.primary }}>{filteredAndSortedAudits.length}</span> z {audits.length}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Table - Desktop */}
      <Card className="hidden md:block w-full">
        <CardBody className="p-0">
          <div className="w-full">
            <table className="w-full table-fixed">
            <thead 
              style={{
                background: `linear-gradient(to right, ${sectionTheme.colors.primary}, ${sectionTheme.colors.darkest})`
              }}
            >
              <tr>
                <th
                  className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 text-left text-xs md:text-[10px] xl:text-xs font-semibold text-white uppercase tracking-wider cursor-pointer hover:opacity-90 transition-opacity rounded-tl-lg"
                  onClick={() => handleSort('operator')}
                >
                  <div className="flex items-center gap-2 md:gap-1">
                    Provozovatel
                    <SortIcon field="operator" />
                  </div>
                </th>
                <th
                  className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 text-left text-xs md:text-[10px] xl:text-xs font-semibold text-white uppercase tracking-wider cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => handleSort('premise')}
                >
                  <div className="flex items-center gap-2 md:gap-1">
                    Pracoviště
                    <SortIcon field="premise" />
                  </div>
                </th>
                <th
                  className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 text-left text-xs md:text-[10px] xl:text-xs font-semibold text-white uppercase tracking-wider cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-2 md:gap-1">
                    Status
                    <SortIcon field="status" />
                  </div>
                </th>
                <th
                  className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 text-left text-xs md:text-[10px] xl:text-xs font-semibold text-white uppercase tracking-wider cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center gap-2 md:gap-1">
                    Datum založení
                    <SortIcon field="createdAt" />
                  </div>
                </th>
                <th
                  className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 text-left text-xs md:text-[10px] xl:text-xs font-semibold text-white uppercase tracking-wider cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => handleSort('completedAt')}
                >
                  <div className="flex items-center gap-2 md:gap-1">
                    Datum dokončení
                    <SortIcon field="completedAt" />
                  </div>
                </th>
                <th className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 text-left text-xs md:text-[10px] xl:text-xs font-semibold text-white uppercase tracking-wider">
                  Report
                </th>
                <th className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 text-right text-xs md:text-[10px] xl:text-xs font-semibold text-white uppercase tracking-wider rounded-tr-lg">
                  Akce
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredAndSortedAudits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
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
                  const premise = premises.find(p => p.id === audit.premiseId);
                  const operator = premise ? operators.find(o => o.id === premise.operatorId) : null;
                  const reportVersions = getAuditReportVersions(audit.id);
                  const hasMultipleVersions = reportVersions.length > 1;
                  const isExpanded = expandedAudits.has(audit.id);
                  const isLastRow = index === paginatedAudits.length - 1;

                  return (
                    <React.Fragment key={audit.id}>
                      <tr
                        className="transition-colors cursor-pointer"
                        style={{ 
                          '--hover-bg': `${sectionTheme.colors.light}0D`
                        } as React.CSSProperties & { '--hover-bg': string }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = `${sectionTheme.colors.light}0D`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '';
                        }}
                        onClick={() => onSelectAudit(audit.id)}
                      >
                      <TooltipCell className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 whitespace-nowrap">
                        <DetailTooltip
                          position={isLastRow ? 'top' : 'bottom'}
                          content={
                            <div className="space-y-1.5">
                              <div className="font-bold text-sm mb-2 pb-2 border-b border-gray-700">{operator.operator_name || 'Neznámý provozovatel'}</div>
                              {operator.operator_ico && (
                                <div className="flex items-start gap-2">
                                  <span className="font-semibold text-gray-300 min-w-[50px]">IČO:</span>
                                  <span className="text-white">{operator.operator_ico}</span>
                                </div>
                              )}
                              {operator.operator_address && (
                                <div className="flex items-start gap-2">
                                  <span className="font-semibold text-gray-300 min-w-[50px]">Adresa:</span>
                                  <span className="text-white">{operator.operator_address}</span>
                                </div>
                              )}
                              {operator.operator_phone && (
                                <div className="flex items-start gap-2">
                                  <span className="font-semibold text-gray-300 min-w-[50px]">Telefon:</span>
                                  <span className="text-white">{operator.operator_phone}</span>
                                </div>
                              )}
                              {operator.operator_email && (
                                <div className="flex items-start gap-2">
                                  <span className="font-semibold text-gray-300 min-w-[50px]">Email:</span>
                                  <span className="text-white break-all">{operator.operator_email}</span>
                                </div>
                              )}
                            </div>
                          }
                        >
                          <div className="text-sm md:text-xs xl:text-sm font-medium text-gray-900 cursor-help truncate block w-full">
                            {operator?.operator_name || '-'}
                          </div>
                        </DetailTooltip>
                      </TooltipCell>
                      <TooltipCell className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 whitespace-nowrap">
                        <DetailTooltip
                          position={isLastRow ? 'top' : 'bottom'}
                          content={
                            <div className="space-y-1.5">
                              <div className="font-bold text-sm mb-2 pb-2 border-b border-gray-700">{premise.premise_name || 'Neznámé pracoviště'}</div>
                              {premise.premise_address && (
                                <div className="flex items-start gap-2">
                                  <span className="font-semibold text-gray-300 min-w-[60px]">Adresa:</span>
                                  <span className="text-white">{premise.premise_address}</span>
                                </div>
                              )}
                              {premise.premise_responsible_person && (
                                <div className="flex items-start gap-2">
                                  <span className="font-semibold text-gray-300 min-w-[60px]">Odpovědná osoba:</span>
                                  <span className="text-white">{premise.premise_responsible_person}</span>
                                </div>
                              )}
                              {premise.premise_phone && (
                                <div className="flex items-start gap-2">
                                  <span className="font-semibold text-gray-300 min-w-[60px]">Telefon:</span>
                                  <span className="text-white">{premise.premise_phone}</span>
                                </div>
                              )}
                              {premise.premise_email && (
                                <div className="flex items-start gap-2">
                                  <span className="font-semibold text-gray-300 min-w-[60px]">Email:</span>
                                  <span className="text-white break-all">{premise.premise_email}</span>
                                </div>
                              )}
                            </div>
                          }
                        >
                          <div className="text-sm md:text-xs xl:text-sm text-gray-900 cursor-help truncate block w-full">
                            {premise?.premise_name || '-'}
                          </div>
                        </DetailTooltip>
                      </TooltipCell>
                      <td className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 whitespace-nowrap overflow-hidden">
                        {getStatusBadge(audit.status)}
                      </td>
                      <TooltipCell className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 whitespace-nowrap">
                        <SimpleTooltip text={formatDate(audit.createdAt)} isLastRow={isLastRow}>
                          <div className="text-sm md:text-xs xl:text-sm text-gray-900 truncate w-full">
                            {formatDate(audit.createdAt)}
                          </div>
                        </SimpleTooltip>
                      </TooltipCell>
                      <TooltipCell className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 whitespace-nowrap">
                        <SimpleTooltip text={audit.completedAt ? formatDate(audit.completedAt) : '-'} isLastRow={isLastRow}>
                          <div className="text-sm md:text-xs xl:text-sm text-gray-900 truncate w-full">
                            {audit.completedAt ? formatDate(audit.completedAt) : '-'}
                          </div>
                        </SimpleTooltip>
                      </TooltipCell>
                      <td className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 whitespace-nowrap overflow-hidden">
                        {getReportBadge(audit.id)}
                      </td>
                      <td className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 whitespace-nowrap text-right text-sm md:text-xs xl:text-sm font-medium">
                        <div className="flex items-center justify-end gap-2 md:gap-1">
                          {/* Pokračovat v auditu nebo Zobrazit report */}
                          {isCompleted(audit.status) ? (
                            <div className="relative group/button">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectAudit(audit.id);
                                }}
                                className="p-2 rounded-lg transition-colors"
                                style={{
                                  color: sectionTheme.colors.primary
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = `${sectionTheme.colors.light}33`;
                                  e.currentTarget.style.color = sectionTheme.colors.darkest;
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = '';
                                  e.currentTarget.style.color = sectionTheme.colors.primary;
                                }}
                              >
                                <ReportIcon className="h-5 w-5" />
                              </button>
                              <ActionIconTooltip text="Zobrazit report" isLastRow={isLastRow} />
                            </div>
                          ) : (
                            <div className="relative group/button">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectAudit(audit.id);
                                }}
                                className="p-2 rounded-lg hover:bg-green-50 transition-colors text-green-600 hover:text-green-700"
                              >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                              </button>
                              <ActionIconTooltip text="Pokračovat v auditu" isLastRow={isLastRow} />
                            </div>
                          )}

                          {/* Editovat (pouze pokud není dokončen) */}
                          {isEditable(audit.status) && (
                            <div className="relative group/button">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectAudit(audit.id);
                                }}
                                className="p-2 rounded-lg hover:bg-blue-50 transition-colors text-blue-600 hover:text-blue-700"
                              >
                                <EditIcon className="h-5 w-5" />
                              </button>
                              <ActionIconTooltip text="Editovat audit" isLastRow={isLastRow} />
                            </div>
                          )}

                          {/* Odemknout (pouze pokud je dokončen) */}
                          {isCompleted(audit.status) && onUnlockAudit && (
                            <div className="relative group/button">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setUnlockingAuditId(audit.id);
                                }}
                                className="p-2 rounded-lg hover:bg-yellow-50 transition-colors text-yellow-600 hover:text-yellow-700"
                              >
                                <EditIcon className="h-5 w-5" />
                              </button>
                              <ActionIconTooltip text="Odemknout pro úpravy" isLastRow={isLastRow} />
                            </div>
                          )}

                          {/* Smazat */}
                          {onDeleteAudit && (
                            <div className="relative group/button">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingAuditId(audit.id);
                                }}
                                className="p-2 rounded-lg hover:bg-red-50 transition-colors text-red-600 hover:text-red-700"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                              <ActionIconTooltip text="Smazat audit" isLastRow={isLastRow} />
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
                          <td colSpan={7} className="px-4 py-1 md:px-6 md:py-1.5">
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
                                          <div className="relative group/button">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onSelectAudit(audit.id, report.id);
                                              }}
                                              className="p-1 md:p-1.5 rounded text-white hover:shadow-md hover:scale-105 transition-all duration-200"
                                              style={{
                                                background: `linear-gradient(to bottom right, ${sectionTheme.colors.primary}, ${sectionTheme.colors.darkest})`
                                              }}
                                            >
                                              <ReportIcon className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                            </button>
                                            <ActionIconTooltip text="Otevřít tuto verzi reportu" isLastRow={index === reportVersions.length - 1} />
                                          </div>
                                          {!report.isLatest && onSetReportAsLatest && (
                                            <div className="relative group/button">
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setSettingLatestReportId(report.id);
                                                }}
                                                className="p-1 md:p-1.5 rounded bg-gradient-to-br from-green-50 to-green-100 text-green-700 hover:from-green-100 hover:to-green-200 hover:shadow-sm transition-all duration-200 border border-green-200"
                                              >
                                                <svg className="h-3.5 w-3.5 md:h-4 md:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                              </button>
                                              <ActionIconTooltip text="Nastavit jako aktuální verzi" isLastRow={index === reportVersions.length - 1} />
                                            </div>
                                          )}
                                          {onDeleteReportVersion && (
                                            <div className="relative group/button">
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setDeletingReportId(report.id);
                                                }}
                                                className="p-1 md:p-1.5 rounded bg-gradient-to-br from-red-50 to-red-100 text-red-700 hover:from-red-100 hover:to-red-200 hover:shadow-sm transition-all duration-200 border border-red-200"
                                              >
                                                <TrashIcon className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                              </button>
                                              <ActionIconTooltip text="Smazat tuto verzi" isLastRow={index === reportVersions.length - 1} />
                                            </div>
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
            const premise = premises.find(p => p.id === audit.premiseId);
            const operator = premise ? operators.find(o => o.id === premise.operatorId) : null;
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
                        <DetailTooltip
                          position="bottom"
                          content={
                            <div className="space-y-1.5">
                              <div className="font-bold text-sm mb-2 pb-2 border-b border-gray-700">{operator.operator_name || 'Neznámý provozovatel'}</div>
                              {operator.operator_ico && (
                                <div className="flex items-start gap-2">
                                  <span className="font-semibold text-gray-300 min-w-[50px]">IČO:</span>
                                  <span className="text-white">{operator.operator_ico}</span>
                                </div>
                              )}
                              {operator.operator_address && (
                                <div className="flex items-start gap-2">
                                  <span className="font-semibold text-gray-300 min-w-[50px]">Adresa:</span>
                                  <span className="text-white">{operator.operator_address}</span>
                                </div>
                              )}
                              {operator.operator_phone && (
                                <div className="flex items-start gap-2">
                                  <span className="font-semibold text-gray-300 min-w-[50px]">Telefon:</span>
                                  <span className="text-white">{operator.operator_phone}</span>
                                </div>
                              )}
                              {operator.operator_email && (
                                <div className="flex items-start gap-2">
                                  <span className="font-semibold text-gray-300 min-w-[50px]">Email:</span>
                                  <span className="text-white break-all">{operator.operator_email}</span>
                                </div>
                              )}
                            </div>
                          }
                        >
                          <h3 className="text-base font-bold text-gray-900 cursor-help">{operator?.operator_name || '-'}</h3>
                        </DetailTooltip>
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
                    {hasMultipleVersions && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAuditExpansion(audit.id);
                          }}
                          className="w-full flex items-center justify-between p-2 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg border border-yellow-200"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center flex-shrink-0">
                              <svg className="h-3.5 w-3.5 text-yellow-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <span className="text-sm font-semibold text-yellow-900">
                              Historie verzí ({reportVersions.length} {reportVersions.length === 1 ? 'verze' : reportVersions.length >= 2 && reportVersions.length <= 4 ? 'verze' : 'verzí'})
                            </span>
                          </div>
                          <svg
                            className={`h-4 w-4 text-yellow-700 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {isExpanded && (
                          <div className="mt-2 space-y-2">
                            {reportVersions.map((report) => (
                              <div
                                key={report.id}
                                className="p-2.5 bg-white rounded-lg border-2 border-yellow-200"
                              >
                                <div className="flex items-center gap-2 mb-1.5">
                                  <div className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center flex-shrink-0 ${
                                    report.isLatest 
                                      ? 'bg-gradient-to-br from-green-400 to-green-500 text-white' 
                                      : 'bg-gradient-to-br from-yellow-100 to-yellow-200 text-yellow-900'
                                  }`}>
                                    {report.versionNumber || '?'}
                                  </div>
                                  <span className="font-semibold text-gray-900 text-sm">
                                    Verze {report.versionNumber || 'N/A'}
                                  </span>
                                  {report.isLatest && (
                                    <span className="px-1.5 py-0.5 bg-green-100 text-green-800 text-xs rounded-full font-semibold">
                                      Aktuální
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-600 ml-8 mb-2">
                                  {report.createdByName && <span className="mr-2">{report.createdByName}</span>}
                                  {report.createdAt && <span>{formatDate(report.createdAt)}</span>}
                                </div>
                                {report.status === ReportStatus.DONE && (
                                  <div className="flex items-center gap-2 mt-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onSelectAudit(audit.id, report.id);
                                      }}
                                      className="flex-1 px-3 py-1.5 text-white text-xs rounded-lg font-medium hover:shadow-md transition-all"
                                      style={{
                                        background: `linear-gradient(to bottom right, ${sectionTheme.colors.primary}, ${sectionTheme.colors.darkest})`
                                      }}
                                    >
                                      Otevřít verzi
                                    </button>
                                    {!report.isLatest && onSetReportAsLatest && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSettingLatestReportId(report.id);
                                        }}
                                        className="px-2 py-1.5 bg-green-50 text-green-700 text-xs rounded-lg border border-green-200"
                                      >
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                        className="px-2 py-1.5 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200"
                                      >
                                        <TrashIcon className="h-4 w-4" />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2">
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
                            leftIcon={
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                              </svg>
                            }
                          >
                            Pokračovat v auditu
                          </Button>
                        )}
                        {onDeleteAudit && (
                          <div className="relative group/button">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingAuditId(audit.id);
                              }}
                              className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex-shrink-0"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                            <ActionIconTooltip text="Smazat audit" isLastRow={false} />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </Fragment>
            );
          })
        )}
      </div>

      {/* Delete Report Version Modal */}
      {deletingReportId && onDeleteReportVersion && (
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
            Opravdu chcete smazat tuto verzi reportu? Tato akce je nevratná a report bude trvale odstraněn.
          </p>
        </Modal>
      )}

      {/* Set Report as Latest Modal */}
      {settingLatestReportId && onSetReportAsLatest && (
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
                variant="secondary"
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
            Opravdu chcete nastavit tuto verzi jako aktuální? Původní aktuální verze bude označena jako historická.
          </p>
        </Modal>
      )}

      {/* Delete Audit Modal */}
      {deletingAuditId && onDeleteAudit && (
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
      )}

      {/* Unlock Audit Modal */}
      {unlockingAuditId && onUnlockAudit && (
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
      )}

      {/* FAB Button for adding new audit */}
      {onAddNewAudit && (
        <div className="fixed bottom-6 right-6 z-50 group">
          <button
            onClick={onAddNewAudit}
            className="w-14 h-14 text-white rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 transition-all flex items-center justify-center relative"
            style={{
              background: `linear-gradient(to bottom right, ${sectionTheme.colors.darkest}, ${sectionTheme.colors.primary})`
            }}
            aria-label="Zadat audit"
            title="Zadat audit"
          >
            <PlusIcon className="h-6 w-6" />
            {/* Tooltip */}
            <span className="absolute right-full mr-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Zadat audit
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

