import React, { useMemo, useState } from 'react';
import { AuditData, AuditStructure } from '../types';
import { generateReportConclusionWithAI } from '../geminiService';

interface SummaryReportProps {
    auditData: AuditData;
    auditStructure: AuditStructure;
    onRestart: () => void;
}

const SummaryReport: React.FC<SummaryReportProps> = ({ auditData, auditStructure, onRestart }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiConclusion, setAiConclusion] = useState<{ slovniHodnoceni: string; zaver: string } | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

    const nonCompliantItems = useMemo(() => {
        return Object.entries(auditData.answers)
            .filter(([_, answer]) => !answer.compliant && answer.nonComplianceData && answer.nonComplianceData.length > 0)
            .map(([itemId, answer]) => {
                const section = auditStructure.audit_sections.find(s => s.items.some(i => i.id === itemId));
                const item = section?.items.find(i => i.id === itemId);
                return { ...item, ...answer, sectionName: section?.title };
            });
    }, [auditData, auditStructure]);

    const handleGenerateAIConclusion = async () => {
        if (nonCompliantItems.length === 0) {
            alert("Pro generování AI závěru musí existovat alespoň jedna neshoda.");
            return;
        }
        setIsGenerating(true);
        try {
            const summaryText = nonCompliantItems.map(item => 
                `Sekce: ${item.sectionName}, Položka: ${item.text}\n` + 
                item.nonComplianceData.map(nc => 
                    `   - Zjištění: ${nc.description}\n   - Doporučení: ${nc.recommendation}`
                ).join('\n')
            ).join('\n\n');

            const result = await generateReportConclusionWithAI(summaryText);
            setAiConclusion(result);
        } catch (error) {
            console.error("Error generating AI conclusion:", error);
            alert("Nepodařilo se vygenerovat AI závěr. Zkontrolujte prosím API klíč a zkuste to znovu.");
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleSaveToServer = async () => {
        setSaveStatus('saving');
        const fullAuditData = {
            auditStructure,
            auditData,
        };

        try {
            const response = await fetch('http://localhost:5000/api/audits', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(fullAuditData),
            });

            if (response.ok) {
                setSaveStatus('success');
                setTimeout(() => setSaveStatus('idle'), 3000); // Reset status after 3s
            } else {
                throw new Error(`Server returned status: ${response.status}`);
            }
        } catch (error) {
            console.error("Failed to save audit to server:", error);
            setSaveStatus('error');
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const renderHeader = (headerConf: any, values: any) => (
        <div key={headerConf.title} className="mb-4 page-break-avoid">
            <h3 className="text-lg font-bold border-b-2 border-gray-400 mb-2">{headerConf.title}</h3>
            <div className="grid grid-cols-2 gap-x-4">
            {headerConf.fields.map((field: any) => (
                <p key={field.id} className="text-sm"><strong>{field.label}:</strong> {values[field.id] || '-'}</p>
            ))}
            </div>
        </div>
    );

    return (
        <div className="w-full max-w-4xl bg-white p-8 rounded-lg shadow-lg print-friendly-report">
            <div className="no-print mb-8 flex flex-wrap gap-4 justify-between items-center">
                <h2 className="text-3xl font-bold text-gray-800">Souhrnná zpráva auditu</h2>
                <div className="flex flex-wrap gap-2">
                    <button 
                        onClick={handleSaveToServer}
                        disabled={saveStatus === 'saving' || saveStatus === 'success'}
                        className={`px-4 py-2 font-semibold rounded-lg transition-colors ${saveStatus === 'saving' ? 'bg-yellow-400' : saveStatus === 'success' ? 'bg-green-500' : saveStatus === 'error' ? 'bg-red-500' : 'bg-blue-600'} text-white`}
                    >
                        {saveStatus === 'saving' ? 'Ukládám...' : saveStatus === 'success' ? 'Uloženo!' : saveStatus === 'error' ? 'Chyba při ukládání' : 'Uložit na server'}
                    </button>
                    <button onClick={handlePrint} className="bg-gray-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-800">
                        Vytisknout
                    </button>
                    <button onClick={onRestart} className="bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300">
                        Nový audit
                    </button>
                </div>
            </div>

            <div id="report-content">
                <h1 className="text-2xl font-bold text-center mb-4">{auditStructure.audit_title}</h1>
                <p className="text-center mb-6">Protokol o provedení interního auditu</p>
                
                {renderHeader(auditStructure.header_data.audited_premise, auditData.headerValues)}
                {renderHeader(auditStructure.header_data.operator, auditData.headerValues)}
                {renderHeader(auditStructure.header_data.auditor, auditData.headerValues)}
                
                <div className="mb-4 page-break-avoid">
                    <h3 className="text-lg font-bold border-b-2 border-gray-400 mb-2">Předmět auditu</h3>
                     <div className="grid grid-cols-2 gap-x-4">
                        {auditStructure.header_data.audit_meta.fields.map((field: any) => (
                            <p key={field.id} className="text-sm"><strong>{field.label}:</strong> {auditData.headerValues[field.id] || '-'}</p>
                        ))}
                    </div>
                </div>
                
                {nonCompliantItems.length > 0 && (
                    <div className="mb-6 page-break-before">
                        <h2 className="text-xl font-bold mb-4">Zjištěné neshody</h2>
                        <button 
                            onClick={handleGenerateAIConclusion} 
                            disabled={isGenerating || !!aiConclusion} 
                            className="no-print mb-4 bg-purple-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-purple-700 disabled:bg-purple-300">
                            {isGenerating ? 'Generuji AI závěr...' : (aiConclusion ? 'Závěr vygenerován' : 'Vygenerovat AI závěr')}
                        </button>
                        {aiConclusion && (
                             <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg mb-6 page-break-avoid">
                                <h3 className="text-lg font-bold text-purple-800">Slovní hodnocení (AI)</h3>
                                <p className="text-purple-700 italic">{aiConclusion.slovniHodnoceni}</p>
                                <h3 className="text-lg font-bold text-purple-800 mt-4">Závěr (AI)</h3>
                                <p className="text-purple-700 italic">{aiConclusion.zaver}</p>
                            </div>
                        )}
                        {nonCompliantItems.map((item, index) => (
                            <div key={index} className="mb-6 page-break-avoid">
                                <h4 className="font-bold text-md">{item.sectionName} - {item.text}</h4>
                                {item.nonComplianceData.map((nc, ncIndex) => (
                                    <div key={ncIndex} className="pl-4 border-l-4 border-red-500 my-2">
                                        <p><strong>Místo:</strong> {nc.location}</p>
                                        <p><strong>Zjištění:</strong> {nc.description}</p>
                                        <p><strong>Doporučení:</strong> {nc.recommendation}</p>
                                        {nc.photos && nc.photos.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {nc.photos.map((photo, pIndex) => (
                                                     <img key={pIndex} src={photo} alt={`Neshoda ${index+1}-${ncIndex+1}`} className="max-w-xs max-h-48 rounded-lg shadow-sm" />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
                
                {nonCompliantItems.length === 0 && !aiConclusion && (
                    <div className="text-center text-green-600 bg-green-50 p-6 rounded-lg my-6">
                        <h2 className="text-xl font-bold">Audit proběhl bez zjištěných neshod.</h2>
                    </div>
                )}

                <div className="mt-8 pt-4 border-t-2 border-gray-300 text-xs text-gray-500">
                    <p>Zpráva vygenerována systémem AuditFlow dne {new Date().toLocaleDateString()}.</p>
                </div>
            </div>
        </div>
    );
};

export default SummaryReport;
