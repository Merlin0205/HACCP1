import React, { useState, useMemo } from 'react';
import { Audit, AuditStatus, Operator, Premise, Report, ReportStatus } from '../types';
import { Card, CardHeader, CardBody, CardFooter } from './ui/Card';
import { TextField } from './ui/Input';
import { Button } from './ui/Button';
import { PlusIcon } from './icons';

interface AllAuditsScreenProps {
  audits: Audit[];
  operators: Operator[];
  premises: Premise[];
  reports: Report[];
  onSelectAudit: (auditId: string) => void;
  title?: string;
  description?: string;
  onAddNewAudit?: () => void;
  showStatusFilter?: boolean;
}

type SortField = 'operator' | 'premise' | 'status' | 'createdAt' | 'completedAt';
type SortDirection = 'asc' | 'desc';

export const AllAuditsScreen: React.FC<AllAuditsScreenProps> = ({
  audits,
  operators,
  premises,
  reports,
  onSelectAudit,
  title = 'Přehled všech auditů',
  description = 'Kompletní seznam všech auditů v systému',
  onAddNewAudit,
  showStatusFilter = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AuditStatus | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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
    const badges = {
      [AuditStatus.DRAFT]: 'bg-gray-100 text-gray-800',
      [AuditStatus.NOT_STARTED]: 'bg-gray-100 text-gray-800', // zpětná kompatibilita
      [AuditStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
      [AuditStatus.COMPLETED]: 'bg-green-100 text-green-800',
      [AuditStatus.REVISED]: 'bg-orange-100 text-orange-800',
      [AuditStatus.LOCKED]: 'bg-green-100 text-green-800', // zpětná kompatibilita - mapuje na COMPLETED
    };
    // Zobrazit správný text pro zpětnou kompatibilitu
    const displayText = status === AuditStatus.LOCKED ? AuditStatus.COMPLETED : 
                        status === AuditStatus.NOT_STARTED ? AuditStatus.DRAFT : status;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badges[status] || badges[AuditStatus.DRAFT]}`}>
        {displayText}
      </span>
    );
  };

  const getReportBadge = (auditId: string) => {
    const report = reports.find(r => r.auditId === auditId);
    if (!report) return null;

    const badges = {
      [ReportStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
      [ReportStatus.GENERATING]: 'bg-yellow-100 text-yellow-800 animate-pulse',
      [ReportStatus.DONE]: 'bg-green-100 text-green-800',
      [ReportStatus.ERROR]: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badges[report.status]}`}>
        {report.status === ReportStatus.GENERATING ? 'Generuje se...' : report.status}
      </span>
    );
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

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-600">{description}</p>
      </div>

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
                Zobrazeno: <span className="font-semibold text-primary">{filteredAndSortedAudits.length}</span> z {audits.length}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Table - Desktop */}
      <Card className="overflow-hidden hidden md:block">
        <CardBody className="p-0 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-primary-dark to-primary">
              <tr>
                <th
                  className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-dark/80 transition-colors"
                  onClick={() => handleSort('operator')}
                >
                  <div className="flex items-center gap-2">
                    Provozovatel
                    <SortIcon field="operator" />
                  </div>
                </th>
                <th
                  className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-dark/80 transition-colors"
                  onClick={() => handleSort('premise')}
                >
                  <div className="flex items-center gap-2">
                    Pracoviště
                    <SortIcon field="premise" />
                  </div>
                </th>
                <th
                  className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-dark/80 transition-colors"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-2">
                    Status
                    <SortIcon field="status" />
                  </div>
                </th>
                <th
                  className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-dark/80 transition-colors"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center gap-2">
                    Datum založení
                    <SortIcon field="createdAt" />
                  </div>
                </th>
                <th
                  className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider cursor-pointer hover:bg-primary-dark/80 transition-colors"
                  onClick={() => handleSort('completedAt')}
                >
                  <div className="flex items-center gap-2">
                    Datum dokončení
                    <SortIcon field="completedAt" />
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                  Report
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">
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
                filteredAndSortedAudits.map((audit) => {
                  const premise = premises.find(p => p.id === audit.premiseId);
                  const operator = premise ? operators.find(o => o.id === premise.operatorId) : null;

                  return (
                    <tr
                      key={audit.id}
                      className="hover:bg-primary-light/5 transition-colors cursor-pointer border-l-4 border-transparent hover:border-primary"
                      onClick={() => onSelectAudit(audit.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {operator?.operator_name || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {premise?.premise_name || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(audit.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(audit.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {audit.completedAt ? formatDate(audit.completedAt) : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getReportBadge(audit.id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectAudit(audit.id);
                          }}
                        >
                          Otevřít
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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

            return (
              <Card
                key={audit.id}
                onClick={() => onSelectAudit(audit.id)}
                className="cursor-pointer hover:shadow-lg transition-all border-l-4 border-primary"
              >
                <CardBody>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-gray-900 mb-1">{operator?.operator_name || '-'}</h3>
                      <p className="text-sm text-gray-600 mb-2">{premise?.premise_name || '-'}</p>
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
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <Button
                      variant="primary"
                      size="sm"
                      fullWidth
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectAudit(audit.id);
                      }}
                    >
                      Otevřít audit
                    </Button>
                  </div>
                </CardBody>
              </Card>
            );
          })
        )}
      </div>

      {/* FAB Button for adding new audit */}
      {onAddNewAudit && (
        <div className="fixed bottom-6 right-6 z-50 group">
          <button
            onClick={onAddNewAudit}
            className="w-14 h-14 bg-gradient-to-br from-primary-dark to-primary text-white rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 transition-all flex items-center justify-center relative"
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

