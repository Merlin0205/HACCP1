import React from 'react';
import { Audit, AuditStatus, Report, ReportStatus } from '../types';
import { BackIcon, PlusIcon, ReportIcon, TrashIcon } from './icons';

interface AuditListProps {
  customerName: string;
  audits: Audit[];
  reports: Report[];
  onSelectAudit: (auditId: string) => void;
  onPrepareNewAudit: () => void;
  onDeleteAudit: (auditId: string) => void;
  onBack: () => void;
}

export const AuditList: React.FC<AuditListProps> = ({ 
  customerName, 
  audits, 
  reports, 
  onSelectAudit, 
  onPrepareNewAudit, 
  onDeleteAudit, 
  onBack 
}) => {

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
  
  const getActionText = (status: AuditStatus): string => {
      switch (status) {
          case AuditStatus.NEW:
              return "Začít";
          case AuditStatus.IN_PROGRESS:
              return "Pokračovat";
          case AuditStatus.COMPLETED:
          case AuditStatus.REPORT_GENERATED:
              return "Zobrazit report";
          default:
              return "Otevřít";
      }
  }

  return (
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
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${
                        audit.status === AuditStatus.NEW ? 'bg-blue-100 text-blue-800' :
                        audit.status === AuditStatus.IN_PROGRESS ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-200 text-gray-700'
                    }`}>
                        {audit.status.replace('_', ' ').toLowerCase()}
                    </span>
                    {audit.status === AuditStatus.COMPLETED && getReportStatusBadge(audit.id)}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => onSelectAudit(audit.id)}
                  className="bg-green-600 text-white font-semibold py-2 px-5 rounded-lg hover:bg-green-700 transition-colors flex items-center"
                >
                  <ReportIcon className="h-5 w-5 mr-2" />
                  {getActionText(audit.status)}
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent triggering onSelectAudit
                    if (window.confirm('Opravdu si přejete smazat tento audit? Tato akce je nevratná.')) {
                      onDeleteAudit(audit.id);
                    }
                  }}
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
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Žádné audity</h3>
            <p className="mt-1 text-sm text-gray-500">Začněte vytvořením nového auditu pro tohoto zákazníka.</p>
            <div className="mt-6">
               <button 
                className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-transform transform hover:scale-105 inline-flex items-center"
                onClick={onPrepareNewAudit}
                >
                <PlusIcon className="h-5 w-5 mr-2" />
                Vytvořit první audit
                </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
