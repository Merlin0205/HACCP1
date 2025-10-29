import React, { useState } from 'react';
import { Audit, AuditStatus, Report, ReportStatus } from '../types';
import { BackIcon, PlusIcon, ReportIcon, TrashIcon, EditIcon } from './icons'; // Přidána EditIcon

interface AuditListProps {
  customerName: string;
  audits: Audit[];
  reports: Report[];
  onSelectAudit: (auditId: string) => void;
  onPrepareNewAudit: () => void;
  onDeleteAudit: (auditId: string) => void;
  onUnlockAudit: (auditId: string) => void; // Nová funkce pro odemčení
  onBack: () => void;
}

export const AuditList: React.FC<AuditListProps> = ({ 
  customerName, 
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
  
  const handleDeleteRequest = (e: React.MouseEvent, auditId: string) => {
    e.stopPropagation();
    setDeletingAuditId(auditId);
  };

  const handleDeleteConfirm = () => {
    if (deletingAuditId) {
      onDeleteAudit(deletingAuditId);
      setDeletingAuditId(null);
    }
  };

  const handleUnlockRequest = (e: React.MouseEvent, auditId: string) => {
    e.stopPropagation();
    setUnlockingAuditId(auditId);
  };

  const handleUnlockConfirm = () => {
    if (unlockingAuditId) {
      onUnlockAudit(unlockingAuditId);
      setUnlockingAuditId(null);
    }
  };

  // Filtrování auditů podle statusu a data
  const filteredAudits = audits.filter(audit => {
    // Filtr podle statusu
    if (statusFilter !== 'all' && audit.status !== statusFilter) {
      return false;
    }
    
    // Filtr podle data
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

  return (
    <>
      <div className="w-full max-w-7xl bg-white p-4 md:p-8 rounded-2xl shadow-xl animate-fade-in">
        <div className="flex justify-between items-center mb-8">
          <div>
            <button onClick={onBack} className="flex items-center text-sm text-gray-600 hover:text-blue-600 mb-2">
              <BackIcon className="h-4 w-4 mr-2" /> 
              Zpět na zákazníky
            </button>
            <h2 className="text-3xl font-bold text-gray-800">Audity pro: {customerName}</h2>
          </div>
          <button 
            className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-transform transform hover:scale-105 flex items-center"
            onClick={onPrepareNewAudit}
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Připravit nový audit
          </button>
        </div>

        {/* Filtry a řazení */}
        <div className="mb-6 space-y-4">
          {/* Řazení a filtrování podle data */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">📅 Datum a řazení:</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {/* Řazení */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSortOrder('newest')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                      sortOrder === 'newest'
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'bg-white text-gray-700 hover:bg-purple-100 border-2 border-purple-200'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    Nejnovější
                  </button>
                  <button
                    onClick={() => setSortOrder('oldest')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                      sortOrder === 'oldest'
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'bg-white text-gray-700 hover:bg-purple-100 border-2 border-purple-200'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    Nejstarší
                  </button>
                </div>
                
                {/* Filtr od data */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-gray-700">Od data:</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="px-3 py-2 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                  {dateFrom && (
                    <button
                      onClick={() => setDateFrom('')}
                      className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                      title="Vymazat filtr"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Filtry podle statusu */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">🏷️ Filtrovat podle statusu:</span>
              </div>
              <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  statusFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-blue-100 border-2 border-gray-200'
                }`}
              >
                🔍 Vše ({audits.length})
              </button>
              <button
                onClick={() => setStatusFilter(AuditStatus.NOT_STARTED)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  statusFilter === AuditStatus.NOT_STARTED
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-blue-100 border-2 border-blue-200'
                }`}
              >
                📋 Nový ({audits.filter(a => a.status === AuditStatus.NOT_STARTED).length})
              </button>
              <button
                onClick={() => setStatusFilter(AuditStatus.IN_PROGRESS)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  statusFilter === AuditStatus.IN_PROGRESS
                    ? 'bg-yellow-500 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-yellow-100 border-2 border-yellow-200'
                }`}
              >
                ⏳ Probíhá ({audits.filter(a => a.status === AuditStatus.IN_PROGRESS).length})
              </button>
              <button
                onClick={() => setStatusFilter(AuditStatus.COMPLETED)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  statusFilter === AuditStatus.COMPLETED
                    ? 'bg-green-500 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-green-100 border-2 border-green-200'
                }`}
              >
                ✅ Dokončen ({audits.filter(a => a.status === AuditStatus.COMPLETED).length})
              </button>
              <button
                onClick={() => setStatusFilter(AuditStatus.LOCKED)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  statusFilter === AuditStatus.LOCKED
                    ? 'bg-gray-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border-2 border-gray-300'
                }`}
              >
                🔒 Uzamčen ({audits.filter(a => a.status === AuditStatus.LOCKED).length})
              </button>
            </div>
            <div className="text-sm text-gray-600">
              Zobrazeno: <span className="font-bold text-blue-600">{sortedAudits.length}</span> z {audits.length}
              {dateFrom && <span className="ml-2 text-purple-600">(od {new Date(dateFrom).toLocaleDateString('cs-CZ')})</span>}
            </div>
          </div>
          </div>
        </div>

        <div className="space-y-4">
          {sortedAudits.length > 0 ? (
            sortedAudits.map(audit => (
              <div key={audit.id} className="bg-gray-50 border border-gray-200 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                  {/* Levý blok - Data a statusy ve sloupcích */}
                  <div className="flex flex-wrap items-start gap-6">
                    {/* První sloupec - Data pod sebou */}
                    <div className="flex flex-col gap-1.5">
                      <div className="group relative">
                        <div className="flex items-center gap-1.5 text-sm text-gray-700 cursor-help">
                          <span>📅</span>
                          <span className="font-medium">{new Date(audit.createdAt).toLocaleDateString('cs-CZ')}</span>
                        </div>
                        <div className="invisible group-hover:visible absolute bottom-full left-0 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-10 shadow-lg">
                          Založeno: {new Date(audit.createdAt).toLocaleString('cs-CZ')}
                          <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                      {audit.completedAt && (
                        <div className="group relative">
                          <div className="flex items-center gap-1.5 text-sm text-gray-700 cursor-help">
                            <span>✅</span>
                            <span className="font-medium">{new Date(audit.completedAt).toLocaleDateString('cs-CZ')}</span>
                          </div>
                          <div className="invisible group-hover:visible absolute bottom-full left-0 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-10 shadow-lg">
                            Dokončeno: {new Date(audit.completedAt).toLocaleString('cs-CZ')}
                            <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Druhý sloupec - Statusy pod sebou */}
                    <div className="flex flex-col gap-2">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full whitespace-nowrap w-fit ${
                          audit.status === AuditStatus.LOCKED ? 'bg-gray-200 text-gray-800' :
                          audit.status === AuditStatus.COMPLETED ? 'bg-green-100 text-green-800' :
                          audit.status === AuditStatus.IN_PROGRESS ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                      }`}>
                          {audit.status}
                      </span>
                      {audit.status === AuditStatus.LOCKED && getReportStatusBadge(audit.id)}
                    </div>
                  </div>

                  {/* Pravý blok - Tlačítka */}
                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={() => onSelectAudit(audit.id)}
                      className="bg-green-600 text-white font-semibold py-2 px-5 rounded-lg hover:bg-green-700 transition-colors flex items-center"
                    >
                      <ReportIcon className="h-5 w-5 mr-2" />
                      {audit.status === AuditStatus.LOCKED ? 'Zobrazit report' : 'Pokračovat'}
                    </button>
                    {audit.status === AuditStatus.LOCKED && (
                       <button 
                          onClick={(e) => handleUnlockRequest(e, audit.id)}
                          className="bg-yellow-500 text-white font-semibold p-3 rounded-lg hover:bg-yellow-600 transition-colors"
                          aria-label="Upravit audit"
                        >
                          <EditIcon className="h-5 w-5" />
                        </button>
                    )}
                    <button 
                      onClick={(e) => handleDeleteRequest(e, audit.id)}
                      className="bg-red-600 text-white font-semibold p-3 rounded-lg hover:bg-red-700 transition-colors"
                      aria-label="Smazat audit"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border-2 border-dashed border-gray-300">
              {statusFilter !== 'all' ? (
                <>
                  <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-gray-600 text-lg font-semibold">Žádné audity s tímto statusem</p>
                  <p className="text-gray-500 mt-2">Zkuste změnit filtr</p>
                  <button
                    onClick={() => setStatusFilter('all')}
                    className="mt-4 text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    Zobrazit všechny audity
                  </button>
                </>
              ) : (
                <>
                  <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-600 text-lg font-semibold">Žádné audity</p>
                  <p className="text-gray-500 mt-2">Začněte kliknutím na "Připravit nový audit"</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {deletingAuditId && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <h3 className="text-lg font-semibold">Potvrdit smazání</h3>
            <p className="my-4">Opravdu chcete smazat tento audit?</p>
            <div className="flex justify-end space-x-2">
              <button onClick={() => setDeletingAuditId(null)} className="px-4 py-2 rounded bg-gray-200">Zrušit</button>
              <button onClick={handleDeleteConfirm} className="px-4 py-2 rounded bg-red-600 text-white">Smazat</button>
            </div>
          </div>
        </div>
      )}
      
      {unlockingAuditId && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <h3 className="text-lg font-semibold">Odemknout audit</h3>
            <p className="my-4">Chcete tento audit odemknout a upravit? Změny se projeví v reportu.</p>
            <div className="flex justify-end space-x-2">
              <button onClick={() => setUnlockingAuditId(null)} className="px-4 py-2 rounded bg-gray-200">Zrušit</button>
              <button onClick={handleUnlockConfirm} className="px-4 py-2 rounded bg-yellow-500 text-white">Odemknout</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
