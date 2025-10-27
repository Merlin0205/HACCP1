import React from 'react';
import { Audit, Report, ReportStatus, AIReportData } from '../types';

interface ReportViewProps {
  report: Report | undefined; // Can be undefined if it doesn't exist yet
  audit: Audit | undefined;   // Can be undefined if not found
  onBack: () => void;
}

// --- Sub-components for different states ---

const GeneratingView: React.FC = () => (
  <div className="text-center py-12">
    <div className="flex justify-center items-center mb-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
    <h3 className="text-2xl font-bold text-blue-600">Zpráva se generuje...</h3>
    <p className="text-gray-600 mt-2">Váš report je právě zpracováván umělou inteligencí.</p>
    <p className="text-gray-500 mt-1">Tato operace může trvat několik desítek sekund. Nemusíte čekat, můžete se vrátit později.</p>
  </div>
);

const ErrorView: React.FC<{ error: string }> = ({ error }) => (
  <div className="text-center py-12 bg-red-50 border border-red-200 rounded-lg">
    <h3 className="text-2xl font-bold text-red-600">Došlo k chybě</h3>
    <p className="text-gray-700 mt-2">Při generování reportu se vyskytla chyba.</p>
    <p className="text-sm text-gray-600 bg-gray-100 p-2 mt-4 rounded font-mono">{error}</p>
  </div>
);

const ReportContentView: React.FC<{ reportData: AIReportData, audit: Audit }> = ({ reportData, audit }) => (
    <div className="prose max-w-none">
        <h1 className="text-4xl font-bold text-center mb-8">Protokol o provedeném auditu</h1>

        {/* Header - Audit Info */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-10 p-4 border rounded-lg">
            <div><strong>Provozovna:</strong> {audit.auditData.headerValues.premise_name}</div>
            <div><strong>Datum auditu:</strong> {new Date(audit.auditData.headerValues.audit_date).toLocaleDateString('cs-CZ')}</div>
            <div><strong>Provozovatel:</strong> {audit.auditData.headerValues.operator_name}</div>
            <div><strong>Auditor:</strong> {audit.auditData.headerValues.auditor_name}</div>
        </div>

        {/* Introduction */}
        <section>
            <h2 className="text-2xl font-semibold border-b-2 border-gray-200 pb-2">1. Úvod</h2>
            <p>{reportData.introduction}</p>
        </section>

        {/* Summary of Findings */}
        <section>
            <h2 className="text-2xl font-semibold border-b-2 border-gray-200 pb-2">2. Souhrn zjištění</h2>
            {reportData.summary.length > 0 ? (
                <ul className="list-disc pl-5 space-y-2">
                    {reportData.summary.map((item, index) => (
                        <li key={index}>
                            <strong>{item.area}:</strong> {item.findings}
                        </li>
                    ))}
                </ul>
            ) : (
                <p>Nebyly zjištěny žádné neshody.</p>
            )}
        </section>

        {/* Conclusion */}
        <section>
            <h2 className="text-2xl font-semibold border-b-2 border-gray-200 pb-2">3. Závěr</h2>
            <p>{reportData.conclusion}</p>
        </section>

        <footer className="text-center text-sm text-gray-500 mt-12 pt-4 border-t">
            <p>Tento protokol byl vygenerován automaticky na základě dat z auditu.</p>
            <p>Vygenerováno dne: {new Date().toLocaleDateString('cs-CZ')}</p>
        </footer>
    </div>
);


const ReportView: React.FC<ReportViewProps> = ({ report, audit, onBack }) => {

  const renderContent = () => {
    if (!audit) {
        return <ErrorView error="Přiřazený audit nebyl nalezen. Data jsou pravděpodobně nekonzistentní." />;
    }

    if (!report) {
        // This case should ideally not happen if an audit is completed, but as a fallback:
        return <ErrorView error="Pro tento audit neexistuje žádný záznam o reportu." />;
    }

    switch (report.status) {
      case ReportStatus.PENDING:
      case ReportStatus.GENERATING:
        return <GeneratingView />;
      
      case ReportStatus.ERROR:
        return <ErrorView error={report.error || 'Neznámá chyba'} />;

      case ReportStatus.DONE:
        if (report.reportData) {
          return <ReportContentView reportData={report.reportData} audit={audit} />;
        }
        return <ErrorView error="Report je označen jako hotový, ale neobsahuje žádná data." />;
      
      default:
        return <ErrorView error={`Neznámý stav reportu: ${report.status}`} />;
    }
  }

  return (
    <div className="w-full max-w-5xl bg-white p-8 rounded-2xl shadow-xl animate-fade-in">
        <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800">Náhled zprávy</h2>
            <button 
                onClick={onBack}
                className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
                &larr; Zpět na seznam auditů
            </button>
        </div>
        {renderContent()}
    </div>
  );
};

export default ReportView;
