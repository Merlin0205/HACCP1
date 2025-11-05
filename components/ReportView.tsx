import React, { useMemo, useState } from 'react';
import { Audit, Report, ReportStatus, AuditStructure, AuditAnswer, ReportData, NonComplianceData } from '../types';
import SummaryReportContent from '../src/components/SummaryReport';
import { Button } from './ui/Button';
import { BackButton } from './BackButton';
// Tabs - vlastní implementace místo Flowbite (kvůli nekompatibilitě verze)

interface ReportViewProps {
  report: Report | undefined;
  audit: Audit | undefined;
  auditStructure: AuditStructure | undefined;
  onBack: () => void;
  reportVersions?: Report[]; // Všechny verze reportů pro tento audit
  onSelectVersion?: (reportId: string) => void; // Callback pro změnu verze
}

const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Neuvedeno';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 'Neplatné datum' : date.toLocaleDateString('cs-CZ');
};

const HeaderSection: React.FC<{ title: string; fields: {id: string, label: string}[]; values: any }> = ({ title, fields, values }) => (
    <div className="mb-4 print:break-inside-avoid">
        <h2 className="text-sm font-bold uppercase border-b-2 border-black pb-1 mb-2">{title}</h2>
        <table className="w-full text-sm">
            <tbody>
                {fields.map(field => (
                    <tr key={field.id}>
                        <td className="font-bold pr-4 py-1 align-top w-40">{field.label}</td>
                        <td className="py-1">{values[field.id] || '-'}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);


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

const FullReportContent: React.FC<{ report: Report | undefined, reportData: ReportData | undefined, audit: Audit, auditStructure: AuditStructure }> = ({ report, reportData, audit, auditStructure }) => {
    
    const getAnswerStatus = (answer: AuditAnswer | undefined) => {
        if (answer && !answer.compliant) return { text: 'NEVYHOVUJE', color: 'text-red-600 font-bold' };
        return { text: 'Vyhovuje', color: 'text-green-600 font-bold' };
    };

    const nonCompliantDetails = useMemo(() => {
        const details: (NonComplianceData & { sectionTitle: string; itemTitle: string })[] = [];
        auditStructure.audit_sections.forEach(section => {
            section.items.forEach(item => {
                const answer = audit.answers[item.id];
                if (answer && !answer.compliant && answer.nonComplianceData) {
                    answer.nonComplianceData.forEach(ncData => {
                        details.push({
                            sectionTitle: section.title,
                            itemTitle: item.title,
                            ...ncData
                        });
                    });
                }
            });
        });
        return details;
    }, [audit, auditStructure]);

    return (
        <div className="bg-white p-8 md:p-12 font-sans text-sm print:p-0">
            <h1 className="text-2xl font-bold text-center mb-4">{auditStructure.audit_title}</h1>
            <div className="text-center mb-8 text-base">
                <p><strong>Datum auditu:</strong> {formatDate(audit.completedAt)}</p>
                <p><strong>Za provozovatele:</strong> {audit.headerValues.operator_name || 'Neuvedeno'}</p>
            </div>
            
            <div className="mb-8 print:break-inside-avoid border-y-2 border-black py-2">
                <h2 className="text-sm font-bold uppercase text-center mb-2">Zpracovatel Auditu</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left">
                      {auditStructure.header_data.auditor.fields.map(field => (
                        <th key={field.id} className="font-bold p-1">{field.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {auditStructure.header_data.auditor.fields.map(field => {
                        // Používat uložené údaje z reportu (snapshot) pokud existují
                        const auditorInfo = report?.auditorSnapshot || {
                          name: (audit.headerValues as any)['auditor_name'] || '-',
                          phone: (audit.headerValues as any)['auditor_phone'] || '-',
                          email: (audit.headerValues as any)['auditor_email'] || '-',
                          web: (audit.headerValues as any)['auditor_web'] || '-',
                        };
                        const auditorValueMap: { [key: string]: string } = {
                          'auditor_name': auditorInfo.name,
                          'auditor_phone': auditorInfo.phone,
                          'auditor_email': auditorInfo.email,
                          'auditor_web': auditorInfo.web
                        };
                        return (
                          <td key={field.id} className="p-1">{auditorValueMap[field.id] || '-'}</td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
            </div>

            <div className="grid grid-cols-2 gap-x-12 mb-8">
                <HeaderSection 
                    title={auditStructure.header_data.audited_premise.title}
                    fields={auditStructure.header_data.audited_premise.fields}
                    values={audit.headerValues}
                />
                <HeaderSection 
                    title={auditStructure.header_data.operator.title}
                    fields={auditStructure.header_data.operator.fields}
                    values={audit.headerValues}
                />
            </div>
                        
            <SummaryReportContent reportData={reportData} />

            <div className="print:break-before-page mt-8">
                <h2 className="text-sm font-bold uppercase border-b-2 border-black pb-1 mb-2">SEZNAM AUDITOVANÝCH POLOŽEK</h2>
                <table className="w-full border-collapse border border-gray-400 mb-8 text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="border border-gray-300 p-2 text-left">Kontrolovaná oblast</th>
                            <th className="border border-gray-300 p-2 text-left w-32">Výsledek</th>
                        </tr>
                    </thead>
                    <tbody>
                        {auditStructure.audit_sections.filter(s => s.active).map((section, sectionIndex) => {
                            // NATVRDO: "SPRÁVNÁ VÝROBNÍ PRAXE" začíná na nové stránce
                            const forcePageBreak = section.title === "SPRÁVNÁ VÝROBNÍ PRAXE";
                            
                            return (
                            <React.Fragment key={section.id}>
                                <tr className={`bg-gray-50 print:break-inside-avoid-page ${
                                    forcePageBreak ? 'print:break-before-page' : ''
                                }`}>
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
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {nonCompliantDetails.length > 0 && (
                 <div className="print:break-before-page mt-8">
                     <h2 className="text-sm font-bold uppercase border-b-2 border-black pb-1 mb-2">DETAIL ZJIŠTĚNÝCH NESCHOD</h2>
                     {nonCompliantDetails.map((nc, index) => (
                        <div key={index} className="mb-6 pt-4 print:break-inside-avoid border-t">
                            <h3 className="font-bold text-md">{index + 1}. {nc.itemTitle}</h3>
                            <p className="text-xs text-gray-500 mb-2">Sekce: {nc.sectionTitle}</p>
                            
                            <div className="pl-4 border-l-4 border-red-500 mb-4">
                                <p><strong>Místo:</strong> {nc.location || '-'}</p>
                                <p><strong>Zjištění:</strong> {nc.finding || '-'}</p>
                                <p><strong>Doporučení:</strong> {nc.recommendation || '-'}</p>
                            </div>

                            {nc.photos && nc.photos.length > 0 && (
                                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    {nc.photos.map((photo, pIndex) => (
                                        photo.base64 && <img
                                            key={pIndex}
                                            src={`data:image/jpeg;base64,${photo.base64}`}
                                            alt={`Fotografie neshody ${index + 1}`}
                                            className="w-full h-auto rounded-md shadow-md border"
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                     ))}
                 </div>
            )}
        </div>
    );
};

const ReportView: React.FC<ReportViewProps> = ({ report, audit, auditStructure, onBack, reportVersions = [], onSelectVersion }) => {
  const [activeTab, setActiveTab] = useState(0);

  const formatDateFull = (dateString?: string): string => {
    if (!dateString) return 'Neuvedeno';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 'Neplatné datum' : date.toLocaleDateString('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderLegacyContent = () => {
    if (!audit || !auditStructure) return <ErrorView error="Přiřazený audit nebo jeho struktura nebyly nalezeny." />;
    if (!report) return <ErrorView error="Pro tento audit neexistuje žádný záznam o reportu." />;

    switch (report.status) {
      case ReportStatus.PENDING:
      case ReportStatus.GENERATING:
        return <GeneratingView />;
      case ReportStatus.ERROR:
        return <ErrorView error={report.error || 'Neznámá chyba'} />;
      case ReportStatus.DONE:
        return <FullReportContent report={report} reportData={report.reportData} audit={audit} auditStructure={auditStructure} />;
      default:
        return <ErrorView error={`Neznámý stav reportu: ${report.status}`} />;
    }
  }

  // Dynamicky importovat SmartTemplateView pouze pokud je potřeba
  const [SmartTemplateView, setSmartTemplateView] = useState<React.ComponentType<any> | null>(null);
  
  React.useEffect(() => {
    if (activeTab === 1) {
      import('./report/SmartTemplateView').then((module) => {
        setSmartTemplateView(() => module.default);
      }).catch((error) => {
        console.error('[ReportView] Chyba při načítání SmartTemplateView:', error);
      });
    }
  }, [activeTab]);

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Header - pouze pro obrazovku */}
      <div className="p-6 bg-gradient-to-r from-gray-50 via-gray-50 to-gray-100 border-b border-gray-200 shadow-sm print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Náhled zprávy</h2>
            {report && (reportVersions.length > 1 || report.versionNumber) && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-200 shadow-sm">
                  <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm font-semibold text-gray-700">
                    Verze {report.versionNumber || 'N/A'}
                  </span>
                  {report.isLatest && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                      Aktuální
                    </span>
                  )}
                </div>
                {report.createdByName && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-200 shadow-sm text-sm text-gray-600">
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="font-medium">{report.createdByName}</span>
                  </div>
                )}
                {report.createdAt && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-200 shadow-sm text-sm text-gray-600">
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{formatDateFull(report.createdAt)}</span>
                  </div>
                )}
                {reportVersions.length > 1 && onSelectVersion && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-200 shadow-sm">
                    <label className="text-sm text-gray-600 font-medium whitespace-nowrap">Přepnout verzi:</label>
                    <select
                      value={report.id}
                      onChange={(e) => onSelectVersion(e.target.value)}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent hover:border-gray-400 transition-colors min-w-[200px]"
                    >
                      {reportVersions.map((v) => (
                        <option key={v.id} value={v.id}>
                          Verze {v.versionNumber || 'N/A'}
                          {v.isLatest ? ' (Aktuální)' : ''}
                          {v.createdByName ? ` - ${v.createdByName}` : ''}
                          {v.createdAt ? ` - ${formatDateFull(v.createdAt)}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 lg:self-center">
            {activeTab === 0 && (
              <Button
                variant="primary"
                onClick={() => window.print()}
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                }
                className="shadow-md hover:shadow-lg transition-all hover:scale-105"
              >
                Tisk / Uložit do PDF
              </Button>
            )}
            <BackButton
              onClick={onBack}
              label="Zpět"
            />
          </div>
        </div>
      </div>
      
      {/* Tabs - Legacy / Smart Template */}
      <div className="w-full max-w-7xl bg-white rounded-2xl shadow-xl animate-fade-in print:shadow-none print:w-full print:max-w-none print:rounded-none">
        <div className="p-6 print:hidden">
          <div className="border-b border-gray-200 mb-4">
            <nav className="-mb-px flex space-x-8" aria-label="Report modes">
              <button
                onClick={() => setActiveTab(0)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === 0
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                Legacy
              </button>
              <button
                onClick={() => setActiveTab(1)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === 1
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                Smart Template
              </button>
            </nav>
          </div>
        </div>
        
        {/* Report content */}
        <div className="report-body">
          {activeTab === 0 && renderLegacyContent()}
          {activeTab === 1 && report && audit && auditStructure && SmartTemplateView && (
            <SmartTemplateView
              report={report}
              audit={audit}
              auditStructure={auditStructure}
              onBack={onBack}
            />
          )}
          {activeTab === 1 && !SmartTemplateView && (
            <div className="text-center p-12">
              <div className="flex justify-center items-center mb-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
              <p className="text-gray-600 mt-2">Načítání Smart Template systému...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportView;
