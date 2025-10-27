import React, { useEffect, useState } from 'react';
import { AuditData, AuditStructure, SavedAudit, AIUsage, AIResponse, NonComplianceData, AIReportData } from '../types';
import Spinner from './Spinner';

interface SummaryReportProps {
  auditData: AuditData;
  auditStructure: AuditStructure;
  onRestart: () => void;
}

const SummaryReport: React.FC<SummaryReportProps> = ({ auditData, auditStructure, onRestart }) => {
    const [reportData, setReportData] = useState<AIReportData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [reportUsage, setReportUsage] = useState<AIUsage | null>(null);
    const [loadingStep, setLoadingStep] = useState<string>('');
    const [errorState, setErrorState] = useState<{title: string, message: string} | null>(null);

    useEffect(() => {
        const generateReport = async () => {
            setIsLoading(true);
            setReportUsage(null);
            setErrorState(null);

            setLoadingStep("Krok 1/2: Sestavuji data auditu...");
            
            const nonCompliantItems = auditStructure.audit_sections
                .flatMap(section => section.items.map(item => ({...item, sectionTitle: section.title})))
                .filter(item => {
                    const answer = auditData.answers[item.id];
                    return item.active && answer && !answer.compliant && answer.nonComplianceData && answer.nonComplianceData.length > 0;
                })
                .map(item => ({...item, nonComplianceData: auditData.answers[item.id].nonComplianceData!}));

            if (nonCompliantItems.length > 0) {
                setLoadingStep("Krok 2/2: Odesílám data na server a čekám na zpracování...");
                try {
                    const response = await fetch('/api/generate-report', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            nonCompliantItems,
                            headerValues: auditData.headerValues 
                        }),
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                    }

                    const data: AIResponse<AIReportData> = await response.json();
                    setReportData(data.result);
                    if (data.usage) {
                      setReportUsage(data.usage);
                    }

                } catch (error: any) {
                     const errorTitle = "Generování reportu selhalo";
                     let errorMessage = `<p>Během komunikace se serverem nastala chyba: <strong>${error.message}</strong></p>`;
                    setErrorState({title: errorTitle, message: errorMessage});
                }
            } else {
                const intro = `Dne ${auditData.headerValues.audit_date || '(datum nezadáno)'} byl proveden vnitřní hygienický audit v provozovně ${auditData.headerValues.premise_name || '(provozovna nezadána)'}.`;
                const conclusion = "Ve výše uvedeném potravinářském podniku nebyly zjištěny žádné neshody při ověřování systému zajištění zdravotní bezpečnosti uvádění potravin do oběhu. Zavedené postupy jsou v souladu se zásadami HACCP a požadavky správné výrobní a hygienické praxe.";
                setReportData({ introduction: intro, summary: [], conclusion: conclusion });
            }
            
            setIsLoading(false);
        };
        
        generateReport();
    }, [auditData, auditStructure]);

    const renderHeader = () => (
        <>
            <h1 className="text-2xl font-bold text-center mb-6">{auditStructure.audit_title}</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <div>
                    <h3 className="text-lg font-semibold mt-4 mb-2">{auditStructure.header_data.audited_premise.title}</h3>
                    <table className="w-full text-sm">
                        <tbody>
                            {auditStructure.header_data.audited_premise.fields.map(field => (
                                <tr key={field.id} className="border-b"><th className="w-1/3 text-left p-2 bg-gray-100 font-semibold text-gray-800">{field.label}</th><td className="p-2 text-gray-900">{auditData.headerValues[field.id] || ''}</td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div>
                    <h3 className="text-lg font-semibold mt-4 mb-2">{auditStructure.header_data.operator.title}</h3>
                    <table className="w-full text-sm">
                        <tbody>
                            {auditStructure.header_data.operator.fields.map(field => (
                                <tr key={field.id} className="border-b"><th className="w-1/3 text-left p-2 bg-gray-100 font-semibold text-gray-800">{field.label}</th><td className="p-2 text-gray-900">{auditData.headerValues[field.id] || ''}</td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
             <div>
                <h3 className="text-lg font-semibold mt-4 mb-2">{auditStructure.header_data.auditor.title}</h3>
                <table className="w-full text-sm">
                    <tbody>
                        {auditStructure.header_data.auditor.fields.map(field => (
                            <tr key={field.id} className="border-b"><th className="w-1/3 text-left p-2 bg-gray-100 font-semibold text-gray-800">{field.label}</th><td className="p-2 text-gray-900">{auditData.headerValues[field.id] || ''}</td></tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="mt-4">
              <p><strong>Datum provedení:</strong> {auditData.headerValues.audit_date || ''}</p>
              <p><strong>Za provozovatele:</strong> {auditData.headerValues.operator_representative || ''}</p>
            </div>
        </>
    );

    const renderAiReport = () => {
        if (!reportData) return null;
        return (
            <>
                <h2 className="text-xl font-bold mt-8 mb-4">VÝSLEDEK AUDITU</h2>
                <p>{reportData.introduction}</p>
                {reportData.summary.map((s, i) => (
                    <div key={i} className="mt-4">
                        <h4 className="font-semibold">{s.area}</h4>
                        <p>{s.findings}</p>
                    </div>
                ))}
                <h3 className="text-lg font-bold mt-4">ZÁVĚR</h3>
                <p>{reportData.conclusion}</p>
            </>
        )
    }

    const renderSummaryTable = () => (
        <>
            <h2 className="text-xl font-bold mt-8 mb-4" style={{pageBreakBefore: 'always'}}>SOUHRN AUDITU</h2>
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-gray-200"><th className="text-left p-2 font-semibold text-gray-800">OBLAST KONTroly</th><th className="text-left p-2 font-semibold text-gray-800">STAV</th></tr>
                </thead>
                <tbody>
                    {auditStructure.audit_sections.filter(s => s.active).flatMap(s => s.items.filter(i => i.active)).map(item => (
                        <tr key={item.id} className="border-b">
                            <td className="p-2 text-black">{item.title}</td>
                            <td className={`p-2 font-semibold ${auditData.answers[item.id]?.compliant ? 'text-green-600' : 'text-red-600'}`}>
                                {auditData.answers[item.id]?.compliant ? "Vyhovuje" : "Neshoda"}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </>
    );

    const renderNonCompliances = () => {
        const nonCompliantItems = auditStructure.audit_sections
            .flatMap(section => section.items.map(item => ({...item, sectionTitle: section.title})))
            .filter(item => {
                const answer = auditData.answers[item.id];
                return item.active && answer && !answer.compliant && answer.nonComplianceData && answer.nonComplianceData.length > 0;
            })
            .map(item => ({...item, nonComplianceData: auditData.answers[item.id].nonComplianceData!}));

        if (nonCompliantItems.length === 0) return null;

        return (
            <>
                <h2 className="text-xl font-bold mt-8 mb-4" style={{pageBreakBefore: 'always'}}>DETAIL ZJIŠTĚNÝCH NESHOD</h2>
                {nonCompliantItems.map(item => (
                    <div key={item.id} className="mb-6" style={{pageBreakInside: 'avoid'}}>
                        <div className="p-2 bg-gray-200 rounded-t-md font-bold">{item.sectionTitle} / {item.title}</div>
                        <div className="p-4 border rounded-b-md">
                            <p className="text-sm italic text-gray-600 mb-3">{item.description}</p>
                            {(item.nonComplianceData as NonComplianceData[]).map((nc, index) => (
                                <div key={index} className="mt-2 p-3 border-l-4 border-red-500 bg-red-50">
                                    <p><strong>Místo:</strong> {nc.location}</p>
                                    <p><strong>Zjištění:</strong> {nc.finding}</p>
                                    <p><strong>Doporučení:</strong> {nc.recommendation}</p>
                                    {nc.photos && nc.photos.length > 0 && (
                                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            {nc.photos.map((p, i) => p.base64 ? <img key={i} src={`data:image/jpeg;base64,${p.base64}`} className="rounded-md w-full h-auto" alt="Fotografie neshody" /> : null)}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </>
        )
    }
    
    const handleSaveAudit = () => {
        const auditToSave: SavedAudit = { auditData, auditStructure };
        const replacer = (key: string, value: any) => (key === 'file' && value instanceof File) ? undefined : value;
        const dataStr = JSON.stringify(auditToSave, replacer, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        const fileName = `haccp_audit_${auditData.headerValues.premise_name || 'data'}_${new Date().toISOString().split('T')[0]}.json`;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="w-full max-w-6xl bg-white p-6 md:p-8 rounded-2xl shadow-xl animate-fade-in">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-800 mb-6">Zpráva z Auditu</h2>

            {isLoading ? (
                <div className="flex flex-col justify-center items-center h-64 my-4 p-6 bg-white border border-gray-200 rounded-xl">
                    <div className="text-blue-600">
                       <Spinner />
                    </div>
                    <p className="mt-4 text-lg font-semibold text-gray-700">{loadingStep}</p>
                    <p className="text-sm text-gray-500">To může trvat i déle než minutu, prosím o strpení.</p>
                </div>
            ) : errorState ? (
                 <div className="my-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h3 className="font-bold text-yellow-800">{errorState.title}</h3>
                    <div className="text-sm text-yellow-700 prose max-w-none" dangerouslySetInnerHTML={{ __html: errorState.message }} />
                </div>
            ) : (
                <div className="mb-8 mt-4 p-4 md:p-6 bg-white border border-gray-200 rounded-xl max-h-[70vh] overflow-y-auto">
                    {renderHeader()}
                    {renderAiReport()}
                    {renderSummaryTable()}
                    {renderNonCompliances()}
                </div>
            )}
            
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
               <button
                  onClick={() => alert('Funkce odeslání emailem není implementována.')}
                  disabled={isLoading}
                  className="bg-gray-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-700 transition-transform transform hover:scale-105 disabled:bg-gray-300 disabled:scale-100"
              >
                  Odeslat emailem
              </button>
              <button
                  onClick={handleSaveAudit}
                  disabled={isLoading}
                  className="bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition-transform transform hover:scale-105 disabled:bg-green-300 disabled:scale-100"
              >
                  Uložit audit
              </button>
              <button
                  onClick={onRestart}
                  className="bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-transform transform hover:scale-105"
              >
                  Nový audit
              </button>
            </div>
            {reportUsage && (
                <div className="mt-6 p-3 bg-gray-100 rounded-lg text-xs text-gray-600 border border-gray-200">
                    <h4 className="font-semibold text-gray-700 mb-1">Informace o volání AI</h4>
                    <p>
                        <strong>Model:</strong> {reportUsage.model}, 
                        <strong> Tokeny:</strong> {reportUsage.totalTokens.toLocaleString('cs-CZ')},
                        <strong> Cena:</strong> {reportUsage.costCZK.toFixed(3)} Kč
                    </p>
                </div>
            )}
        </div>
    );
};

export default SummaryReport;
