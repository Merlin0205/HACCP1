import React, { useState, useMemo } from 'react';
import { Audit, AuditStatus, Report, ReportStatus } from '../types';
import { Card, CardHeader, CardBody, CardFooter } from './ui/Card';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { PlusIcon, ReportIcon, TrashIcon, EditIcon } from './icons';

interface AuditListProps {
  premiseName: string;
  audits: Audit[];
  reports: Report[];
  onSelectAudit: (auditId: string) => void;
  onPrepareNewAudit: () => void;
  onDeleteAudit: (auditId: string) => void;
  onUnlockAudit: (auditId: string) => void;
  onBack: () => void;
}

export const AuditList: React.FC<AuditListProps> = ({ 
  premiseName, 
  audits, 
  reports, 
  onSelectAudit, 
  onPrepareNewAudit, 
  onDeleteAudit, 
  onUnlockAudit, 
  onBack 
}) => {
  const [deletingAuditId, setDeletingAuditId] = useState<string | null>(null);
  const [unlockingAuditId, setUnlockingAuditId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<AuditStatus | 'all'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [dateFrom, setDateFrom] = useState<string>('');

  const getReportStatusBadge = (auditId: string) => {
    const report = reports.find(r => r.auditId === auditId);
    if (!report) return null;

    let badgeClass = '';
    let text = '';

    switch (report.status) {
      case ReportStatus.GENERATING:
      case ReportStatus.PENDING:
        badgeClass = 'bg-yellow-100 text-yellow-800 animate-pulse';
        text = 'Report se generuje';
        break;
      case ReportStatus.DONE:
        badgeClass = 'bg-green-100 text-green-800';
        text = 'Report hotov';
        break;
      case ReportStatus.ERROR:
        badgeClass = 'bg-red-100 text-red-800';
        text = 'Chyba reportu';
        break;
      default:
        return null;
    }

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badgeClass}`}>
        {text}
      </span>
    );
  };

  // Filtrování auditů podle statusu a data
  const filteredAudits = audits.filter(audit => {
    if (statusFilter !== 'all' && audit.status !== statusFilter) {
      return false;
    }
    
    if (dateFrom) {
      const auditDate = new Date(audit.createdAt);
      const filterDate = new Date(dateFrom);
      if (auditDate < filterDate) {
        return false;
      }
    }
    
    return true;
  });

  // Řazení auditů
  const sortedAudits = [...filteredAudits].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  const getStatusColor = (status: AuditStatus) => {
    switch (status) {
      case AuditStatus.COMPLETED:
      case AuditStatus.LOCKED: // zpětná kompatibilita
        return 'border-green-500';
      case AuditStatus.IN_PROGRESS:
        return 'border-orange-500';
      case AuditStatus.REVISED:
        return 'border-yellow-500';
      case AuditStatus.DRAFT:
      case AuditStatus.NOT_STARTED: // zpětná kompatibilita
        return 'border-blue-500';
      default:
        return 'border-gray-300';
    }
  };

  const getStatusBadge = (status: AuditStatus) => {
    switch (status) {
      case AuditStatus.COMPLETED:
        return { bg: 'bg-green-100', text: 'text-green-800', label: '✅ Dokončen' };
      case AuditStatus.LOCKED: // zpětná kompatibilita
        return { bg: 'bg-green-100', text: 'text-green-800', label: '✅ Dokončen' };
      case AuditStatus.IN_PROGRESS:
        return { bg: 'bg-orange-100', text: 'text-orange-800', label: '⏳ Probíhá' };
      case AuditStatus.REVISED:
        return { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '📝 Změny' };
      case AuditStatus.DRAFT:
        return { bg: 'bg-blue-100', text: 'text-blue-800', label: '📋 Nezapočatý' };
      case AuditStatus.NOT_STARTED: // zpětná kompatibilita
        return { bg: 'bg-blue-100', text: 'text-blue-800', label: '📋 Nezapočatý' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6">
        <nav className="flex items-center gap-2 text-sm text-gray-600">
          <button onClick={onBack} className="hover:text-primary transition-colors">
            Provozovatelé
          </button>
          <span>/</span>
          <span className="text-gray-900 font-medium">{premiseName}</span>
          <span>/</span>
          <span className="text-gray-900 font-medium">Audity</span>
        </nav>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Audity</h1>
          <p className="text-gray-600 text-sm sm:text-base">Pracoviště: {premiseName}</p>
        </div>
        <Button
          variant="primary"
          size="lg"
          onClick={onPrepareNewAudit}
          leftIcon={<PlusIcon className="h-5 w-5" />}
        >
          Nový audit
        </Button>
      </div>

      {/* Filter/Sort Bar */}
      <div className="mb-6 space-y-4">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-4">
          <span className="text-sm font-medium text-gray-700 mr-2">Status:</span>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-primary text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Všechny ({audits.length})
          </button>
          <button
            onClick={() => setStatusFilter(AuditStatus.IN_PROGRESS)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === AuditStatus.IN_PROGRESS
                ? 'bg-orange-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Rozpracované ({audits.filter(a => a.status === AuditStatus.IN_PROGRESS).length})
          </button>
          <button
            onClick={() => setStatusFilter(AuditStatus.COMPLETED)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === AuditStatus.COMPLETED || statusFilter === AuditStatus.LOCKED
                ? 'bg-green-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Dokončené ({audits.filter(a => a.status === AuditStatus.COMPLETED || a.status === AuditStatus.LOCKED).length})
          </button>
          <button
            onClick={() => setStatusFilter(AuditStatus.REVISED)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === AuditStatus.REVISED
                ? 'bg-yellow-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Změny ({audits.filter(a => a.status === AuditStatus.REVISED).length})
          </button>
        </div>

        {/* Sort and Date Filter */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Řadit:</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
            >
              <option value="newest">Nejnovější</option>
              <option value="oldest">Nejstarší</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Od data:</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
            />
            {dateFrom && (
              <button
                onClick={() => setDateFrom('')}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Vymazat filtr"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <div className="text-sm text-gray-600 ml-auto">
            Zobrazeno: <span className="font-semibold text-gray-900">{sortedAudits.length}</span> z {audits.length}
          </div>
        </div>
      </div>

      {/* Audit Cards Grid */}
      {sortedAudits.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-20">
          {sortedAudits.map(audit => {
            const statusBadge = getStatusBadge(audit.status);
            const report = reports.find(r => r.auditId === audit.id);

            return (
              <Card
                key={audit.id}
                hover
                className={`border-l-4 ${getStatusColor(audit.status)}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${statusBadge.bg} ${statusBadge.text}`}>
                          {statusBadge.label}
                        </span>
                        {audit.status === AuditStatus.COMPLETED || audit.status === AuditStatus.LOCKED ? (
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : null}
                        {getReportStatusBadge(audit.id)}
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{new Date(audit.createdAt).toLocaleDateString('cs-CZ')}</span>
                          <span className="text-gray-400">•</span>
                          <span>{new Date(audit.createdAt).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {audit.completedAt && (
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Dokončeno: {new Date(audit.completedAt).toLocaleDateString('cs-CZ')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {(audit.status === AuditStatus.COMPLETED || audit.status === AuditStatus.LOCKED) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setUnlockingAuditId(audit.id);
                          }}
                          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
                          title="Odemknout"
                        >
                          <EditIcon className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingAuditId(audit.id);
                        }}
                        className="p-2 rounded-lg hover:bg-red-50 transition-colors text-gray-600 hover:text-red-600"
                        title="Smazat"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </CardHeader>

                <CardBody>
                  {/* Header Values Preview */}
                  {audit.headerValues && Object.keys(audit.headerValues).length > 0 && (
                    <div className="space-y-2 text-sm">
                      {Object.entries(audit.headerValues).slice(0, 3).map(([key, value]) => (
                        value && (
                          <div key={key} className="flex items-start gap-2">
                            <span className="text-gray-500 font-medium min-w-[100px]">{key}:</span>
                            <span className="text-gray-900">{value}</span>
                          </div>
                        )
                      ))}
                    </div>
                  )}
                </CardBody>

                <CardFooter>
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      fullWidth
                      onClick={() => onSelectAudit(audit.id)}
                      leftIcon={<ReportIcon className="h-4 w-4" />}
                    >
                      {audit.status === AuditStatus.COMPLETED || audit.status === AuditStatus.LOCKED ? 'Zobrazit report' : 'Pokračovat'}
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
          {statusFilter !== 'all' || dateFrom ? (
            <>
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-gray-600 font-semibold mb-2">Žádné audity s tímto filtrem</p>
              <p className="text-gray-500 mb-4">Zkuste změnit filtr</p>
              <Button variant="secondary" onClick={() => { setStatusFilter('all'); setDateFrom(''); }}>
                Zobrazit všechny audity
              </Button>
            </>
          ) : (
            <>
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-600 font-semibold mb-2">Žádné audity</p>
              <p className="text-gray-500 mb-4">Začněte kliknutím na "Nový audit"</p>
              <Button variant="primary" onClick={onPrepareNewAudit} leftIcon={<PlusIcon className="h-5 w-5" />}>
                Vytvořit první audit
              </Button>
            </>
          )}
        </div>
      )}

      {/* Delete Modal */}
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

      {/* Unlock Modal */}
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
    </div>
  );
};
