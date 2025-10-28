import React from 'react';
import { Audit, Report, ReportStatus, AIReportData, AuditStructure, AuditAnswer } from '../types';

interface ReportViewProps {
  report: Report | undefined;
  audit: Audit | undefined;
  auditStructure: AuditStructure | undefined;
  onBack: () => void;
}

const formatDate = (dateString: string | undefined): string => {
    if (!dateString || dateString.trim() === '') return 'Neuvedeno';
    const date = new Date(dateString);
    if (isNaN(date.getTime()) || date.getFullYear() < 2000) {
        return 'Neuvedeno';
    }
    return date.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' });
};

const GeneratingView: React.FC = () => (
  <div className="text-center p-12">
    <div className="flex justify-center items-center mb-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
    <h3 className="text-2xl font-bold text-blue-600">Zpráva se generuje...</h3>
    <p className="text-gray-600 mt-2">Váš report je právě zpracováván umělou inteligencí.</p>
  </div>
);

const ErrorView: React.FC<{ error: string }> = ({ error }) => (
  <div className="text-center p-12 bg-red-50 border border-red-200 rounded-lg">
    <h3 className="text-2xl font-bold text-red-600">Došlo k chybě</h3>
    <p className="text-gray-700 mt-2">{error}</p>
  </div>
);

const FullReportContent: React.FC<{ reportData: AIReportData, audit: Audit, auditStructure: AuditStructure }> = ({ reportData, audit, auditStructure }) => {

    const nonCompliantItems = auditStructure.audit_sections
        .flatMap(section => section.items.map(item => ({ item, section, answer: audit.answers[item.id] })))
        .filter(({ answer }) => answer && !answer.compliant && answer.nonComplianceData && answer.nonComplianceData.length > 0);

    const getAnswerStatus = (answer: AuditAnswer | undefined) => {
        if (answer && !answer.compliant) {
            return { text: 'NEVYHOVUJE', color: 'text-red-600 font-bold' };
        }
        return { text: 'Vyhovuje', color: 'text-green-600 font-bold' };
    };
    
    const introductionText = `Audit provedený dne ${formatDate(audit.completedAt)} v provozovně ${audit.headerValues.premise_name || '[Název provozovny]'} ${nonCompliantItems.length > 0 ? 'prokázal některé neshody' : 'neprokázal žádné neshody'}.`;

    return (
        <div className="bg-white p-8 md:p-12 font-sans text-sm print:p-0">
            <h1 className="text-2xl font-bold text-center mb-4">{auditStructure.audit_title}</h1>
            <div className="text-center mb-8 text-base">
                <p><strong>Datum auditu:</strong> {formatDate(audit.completedAt)}</p>
                <p><strong>Za provozovatele:</strong> {audit.headerValues.operator_name || 'Neuvedeno'}</p>
            </div>

            {auditStructure.header_data.auditor && (
              <div className="mb-8 print:break-inside-avoid border-y-2 border-black py-2">
                  <h2 className="text-sm font-bold uppercase text-center mb-2">ZPRACOVATEL AUDITU</h2>
                  <div className="grid grid-cols-4 gap-x-4 text-sm">
                      <div className="text-left"><span className="font-bold">Auditor:</span><br/>{audit.headerValues.auditor_name || '-'}</div>
                      <div className="text-left"><span className="font-bold">Mobil:</span><br/>{audit.headerValues.auditor_phone || '-'}</div>
                      <div className="text-left"><span className="font-bold">E-mail:</span><br/>{audit.headerValues.auditor_email || '-'}</div>
                      <div className="text-left"><span className="font-bold">Web:</span><br/>{audit.headerValues.auditor_web || '-'}</div>
                  </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-x-12 mb-8">
                <div>
                    {auditStructure.header_data.audited_premise && (
                        <div className="mb-4 print:break-inside-avoid">
                            <h2 className="text-sm font-bold uppercase border-b-2 border-black pb-1 mb-2">{auditStructure.header_data.audited_premise.title}</h2>
                            <table className="w-full text-sm"><tbody>
                                {auditStructure.header_data.audited_premise.fields.map(field => (
                                    <tr key={field.id}><td className="font-bold pr-4 py-1 align-top w-36">{field.label}</td><td className="py-1">{(audit.headerValues as any)[field.id] || '-'}</td></tr>
                                ))}
                            </tbody></table>
                        </div>
                    )}
                </div>
                <div>
                    {auditStructure.header_data.operator && (
                         <div className="mb-4 print:break-inside-avoid">
                            <h2 className="text-sm font-bold uppercase border-b-2 border-black pb-1 mb-2">{auditStructure.header_data.operator.title}</h2>
                            <table className="w-full text-sm"><tbody>
                                {auditStructure.header_data.operator.fields.map(field => (
                                    <tr key={field.id}><td className="font-bold pr-4 py-1 align-top w-36">{field.label}</td><td className="py-1">{(audit.headerValues as any)[field.id] || '-'}</td></tr>
                                ))}
                            </tbody></table>
                        </div>
                    )}
                </div>
            </div>

            <div className="print:break-inside-avoid">
                <h2 className="text-sm font-bold uppercase border-b-2 border-black pb-1 mb-2">VÝSLEDEK AUDITU</h2>
                <div className="space-y-4 mb-8 text-base prose prose-sm max-w-none prose-ul:list-disc prose-ul:pl-5">
                    <p>{introductionText}</p>
                    <h4>Celkový souhrn a doporučení:</h4>
                    {reportData.summary.length > 0 ? (
                        <ul>
                            {reportData.summary.map((s, i) => <li key={i}><strong>{s.area}:</strong> {s.findings}</li>)}
                        </ul>
                     ) : <p>Nebyly shledány žádné významné neshody.</p>}
                    <h4>Závěr:</h4>
                    <p>{reportData.conclusion}</p>
                </div>
            </div>

            <div className="print:break-before-page">
                <h2 className="text-sm font-bold uppercase border-b-2 border-black pb-1 mb-2">SEZNAM AUDITOVANÝCH POLOŽEK</h2>
                <table className="w-full border-collapse border border-gray-400 mb-8 text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="border border-gray-300 p-2 text-left">Kontrolovaná oblast</th>
                            <th className="border border-gray-300 p-2 text-left w-32">Výsledek</th>
                        </tr>
                    </thead>
                    <tbody>
                        {auditStructure.audit_sections.filter(s => s.active).map(section => (
                            <React.Fragment key={section.id}>
                                <tr className="bg-gray-50 print:break-inside-avoid-page">
                                    <td colSpan={2} className="border border-gray-300 p-2 font-bold">{section.title}</td>
                                </tr>
                                {section.items.filter(i => i.active).map(item => {
                                    const status = getAnswerStatus(audit.answers[item.id]);
                                    return (
                                        <tr key={item.id} className="print:break-inside-avoid">
                                            <td className="border border-gray-300 p-2">{item.title}</td>
                                            <td className={`border border-gray-300 p-2 ${status.color}`}>{status.text}</td>
                                        </tr>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {nonCompliantItems.length > 0 && (
                <div className="print:break-before-page">
                    <h2 className="text-sm font-bold uppercase border-b-2 border-black pb-1 mb-2">DETAIL ZJIŠTĚNÝCH NESCHOD</h2>
                    {nonCompliantItems.map(({ item, section, answer }, index) => (
                        <div key={item.id} className="mb-6 pt-4 text-base print:break-inside-avoid-page print:border-t">
                            <h3 className="font-bold text-lg">{index + 1}. {item.title}</h3>
                            <p className="text-xs text-gray-500 mb-2">Sekce: {section.title}</p>
                            <div className="pl-4 border-l-2 border-red-500">
                                <p className="italic text-gray-700 mb-2">\"{item.description}\"</p>
                                {answer?.nonComplianceData?.map((nc, ncIndex) => (
                                    <div key={ncIndex} className="bg-red-50 p-3 rounded-md border border-red-100">
                                        <p><strong>Zjištění:</strong> {nc.comment}</p>
                                        {nc.deadline && <p><strong>Termín nápravy:</strong> {formatDate(nc.deadline)}</p>}
                                        {nc.photos && nc.photos.length > 0 && (
                                            <div className="mt-3">
                                                <p className="font-semibold">Fotodokumentace:</p>
                                                <div className="flex flex-wrap gap-4 mt-2">
                                                    {nc.photos.map((photo, pIndex) => (
                                                        <img key={pIndex} src={photo} alt={`Fotografie neshody`} className="max-h-56 h-auto w-auto max-w-full border rounded-md"/>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            <footer className="text-center text-xs text-gray-500 mt-12 pt-4 border-t print:break-before-page">
                <p>Tento protokol byl vygenerován automaticky na základě dat z auditu.</p>
                <p>Vygenerováno dne: {new Date().toLocaleDateString('cs-CZ')}</p>
            </footer>
        </div>
    );
};

const ReportView: React.FC<ReportViewProps> = ({ report, audit, auditStructure, onBack }) => {

  const renderContent = () => {
    if (!audit || !auditStructure) {
        return <ErrorView error="Přiřazený audit nebo jeho struktura nebyly nalezeny." />;
    }
    if (!report) {
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
          return <FullReportContent reportData={report.reportData} audit={audit} auditStructure={auditStructure} />;
        }
        return <ErrorView error="Report je označen jako hotový, ale neobsahuje žádná data." />;
      default:
        return <ErrorView error={`Neznámý stav reportu: ${report.status}`} />;
    }
  }

  return (
    <div className="w-full max-w-7xl bg-white rounded-2xl shadow-xl animate-fade-in print:shadow-none print:w-full print:max-w-none print:rounded-none">
        <div className="p-6 flex justify-between items-center print:hidden">
            <h2 className="text-3xl font-bold text-gray-800">Náhled zprávy</h2>
            <div className="flex items-center gap-4">
              <button 
                  onClick={() => window.print()}
                  className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                  Tisk / Uložit do PDF
              </button>
              <button 
                  onClick={onBack}
                  className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                  &larr; Zpět na seznam
              </button>
            </div>
        </div>
        <div className="report-body">
          {renderContent()}
        </div>
    </div>
  );
};

export default ReportView;
