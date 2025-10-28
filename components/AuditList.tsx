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

  return (
    <>
      <div className="w-full max-w-4xl bg-white p-8 rounded-2xl shadow-xl animate-fade-in">
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

        <div className="space-y-4">
          {audits.length > 0 ? (
            audits.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(audit => (
              <div key={audit.id} className="bg-gray-50 border border-gray-200 p-4 rounded-lg flex flex-col sm:flex-row sm:justify-between sm:items-center shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="mb-4 sm:mb-0">
                  <p className="font-bold text-lg text-gray-800">Audit ze dne: {new Date(audit.createdAt).toLocaleDateString('cs-CZ')}</p>
                  <div className="flex items-center space-x-3 mt-2">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
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
            ))
          ) : (
            <div className="text-center py-10 bg-gray-50 rounded-lg border-2 border-dashed">
                <p>Žádné audity</p>
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
