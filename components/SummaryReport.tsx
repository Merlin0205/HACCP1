import React, { useEffect, useState } from 'react';
import { AuditData, AuditStructure, SavedAudit, AIUsage, AIResponse, PhotoWithAnalysis, NonComplianceData } from '../types';
import { generateReportConclusionWithAI } from '../services/geminiService';
import Spinner from './Spinner';

interface SummaryReportProps {
  auditData: AuditData;
  auditStructure: AuditStructure;
  onRestart: () => void;
}

const SummaryReport: React.FC<SummaryReportProps> = ({ auditData, auditStructure, onRestart }) => {
    const [reportHtml, setReportHtml] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [reportUsage, setReportUsage] = useState<AIUsage | null>(null);
    const [loadingStep, setLoadingStep] = useState<string>('');
    const [errorState, setErrorState] = useState<{title: string, message: string} | null>(null);

    useEffect(() => {
        const generateReport = async () => {
            setIsLoading(true);
            setReportUsage(null);
            setErrorState(null);

            // KROK 1: Sestavení statických částí reportu
            setLoadingStep("Krok 1/2: Sestavuji data auditu...");
            
            const buildHeaderHtml = (section: any, data: any) => `
                <h3 class="text-lg font-semibold mt-4 mb-2">${section.title}</h3>
                <table class="w-full text-sm">
                    <tbody>
                        ${section.fields.map((field: any) => `
                            <tr class="border-b"><th class="w-1/3 text-left p-2 bg-gray-100 font-semibold text-gray-800">${field.label}</th><td class="p-2 text-gray-900">${data[field.id] || ''}</td></tr>
                        `).join('')}
                    </tbody>
                </table>`;

            const headerHtml = `
                <h1 class="text-2xl font-bold text-center mb-6">${auditStructure.audit_title}</h1>
                ${buildHeaderHtml(auditStructure.header_data.audited_premise, auditData.headerValues)}
                ${buildHeaderHtml(auditStructure.header_data.operator, auditData.headerValues)}
                ${buildHeaderHtml(auditStructure.header_data.auditor, auditData.headerValues)}
                <div class="mt-4">
                  <p><strong>Datum provedení:</strong> ${auditData.headerValues.audit_date || ''}</p>
                  <p><strong>Za provozovatele:</strong> ${auditData.headerValues.operator_representative || ''}</p>
                </div>`;
            
            const nonCompliantItems = auditStructure.audit_sections
                .flatMap(section => section.items.map(item => ({...item, sectionTitle: section.title})))
                .filter(item => {
                    const answer = auditData.answers[item.id];
                    return item.active && answer && !answer.compliant && answer.nonComplianceData && answer.nonComplianceData.length > 0;
                })
                .map(item => ({...item, nonComplianceData: auditData.answers[item.id].nonComplianceData!}));

            let aiConclusionHtml = '';

            // KROK 2: Generování závěru pomocí AI (pokud jsou neshody)
            if (nonCompliantItems.length > 0) {
                setLoadingStep("Krok 2/2: Odesílám data na servery Google AI a čekám na zpracování...");
                try {
                    const conclusionPromise = generateReportConclusionWithAI(nonCompliantItems, auditData.headerValues);
                    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 90000));

                    const response = await Promise.race([conclusionPromise, timeoutPromise]) as AIResponse<string>;
                    aiConclusionHtml = response.result;
                    setReportUsage(response.usage);

                } catch (error: any) {
                     const errorTitle = "Generování reportu trvalo příliš dlouho";
                     let errorMessage = `
                        <p>Aplikace neobdržela odpověď od serverů Google AI v časovém limitu 90 sekund. To se mohlo stát v kroku: <br><strong>${loadingStep}</strong></p>
                        <p class="font-bold mt-2">Možné příčiny:</p>
                        <ul class="list-disc list-inside">
                          <li>Velmi rozsáhlý audit s mnoha neshodami a fotkami, který AI zpracovává déle.</li>
                          <li>Dočasný problém s připojením k serverům Google AI.</li>
                          <li>Dočasné přetížení služeb Gemini API.</li>
                        </ul>
                        <p class="font-bold mt-2">Doporučení:</p>
                        <p>Zkuste prosím restartovat audit a vygenerovat zprávu znovu. Pokud problém přetrvává, zvažte zjednodušení auditu nebo to zkuste později.</p>`;
                    setErrorState({title: errorTitle, message: errorMessage});
                    aiConclusionHtml = `<div class="p-4 bg-red-100 text-red-700 rounded-md"><strong>Chyba:</strong> Generování slovního hodnocení selhalo. ${error.message}</div>`;
                }
            } else {
                 aiConclusionHtml = `
                    <p>Dne ${auditData.headerValues.audit_date || '(datum nezadáno)'} byl proveden vnitřní hygienický audit v provozovně ${auditData.headerValues.premise_name || '(provozovna nezadána)'}.</p>
                    <p>Při auditu nebyly zjištěny žádné neshody s požadavky správné výrobní a hygienické praxe a platné legislativy.</p>
                    <!-- ZAVER_START -->
                    <h3>ZÁVĚR</h3>
                    <p>Ve výše uvedeném potravinářském podniku nebyly zjištěny žádné neshody při ověřování systému zajištění zdravotní bezpečnosti uvádění potravin do oběhu. Zavedené postupy jsou v souladu se zásadami HACCP a požadavky správné výrobní a hygienické praxe.</p>
                `;
            }
            
            // KROK 3: Sestavení finálního HTML
            const summaryTableHtml = `
                <h2 class="text-xl font-bold mt-8 mb-4" style="page-break-before: always;">SOUHRN AUDITU</h2>
                <table class="w-full text-sm">
                    <thead>
                        <tr class="bg-gray-200"><th class="text-left p-2 font-semibold text-gray-800">OBLAST KONTroly</th><th class="text-left p-2 font-semibold text-gray-800">STAV</th></tr>
                    </thead>
                    <tbody>
                        ${auditStructure.audit_sections.filter(s => s.active).flatMap(s => s.items.filter(i => i.active)).map(item => `
                            <tr class="border-b">
                                <td class="p-2 text-black">${item.title}</td>
                                <td class="p-2 font-semibold ${auditData.answers[item.id]?.compliant ? 'text-green-600' : 'text-red-600'}">
                                    ${auditData.answers[item.id]?.compliant ? "Vyhovuje" : "Neshoda"}
                                </td>
                            </tr>`).join('')}
                    </tbody>
                </table>`;

            const nonCompliancesHtml = nonCompliantItems.length > 0 ? `
                <h2 class="text-xl font-bold mt-8 mb-4" style="page-break-before: always;">DETAIL ZJIŠTĚNÝCH NESHOD</h2>
                ${nonCompliantItems.map(item => `
                    <div class="mb-6" style="page-break-inside: avoid;">
                        <div class="p-2 bg-gray-200 rounded-t-md font-bold">${item.sectionTitle} / ${item.title}</div>
                        <div class="p-4 border rounded-b-md">
                            <p class="text-sm italic text-gray-600 mb-3">${item.description}</p>
                            ${(item.nonComplianceData as NonComplianceData[]).map((nc, index) => `
                                <div class="mt-2 p-3 border-l-4 border-red-500 bg-red-50">
                                    <p><strong>Místo:</strong> ${nc.location}</p>
                                    <p><strong>Zjištění:</strong> ${nc.finding}</p>
                                    <p><strong>Doporučení:</strong> ${nc.recommendation}</p>
                                    ${nc.photos && nc.photos.length > 0 ? `<div class="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        ${nc.photos.map(p => p.base64 ? `<img src="data:image/jpeg;base64,${p.base64}" class="rounded-md w-full h-auto" alt="Fotografie neshody">` : '').join('')}
                                    </div>` : ''}
                                </div>`).join('')}
                        </div>
                    </div>`).join('')}
            ` : '';

            const finalHtml = `
                <div>
                    ${headerHtml}
                    <h2 class="text-xl font-bold mt-8 mb-4">VÝSLEDEK AUDITU</h2>
                    ${aiConclusionHtml}
                    ${summaryTableHtml}
                    ${nonCompliancesHtml}
                </div>
            `;
            
            setReportHtml(finalHtml);
            setIsLoading(false);
        };
        
        generateReport();
    }, [auditData, auditStructure]);
    
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
                    <div className="prose prose-sm prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: reportHtml }} />
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