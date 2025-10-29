/**
 * Report Editor - Editovatelný náhled reportu před tiskem/exportem do PDF
 * 
 * Features:
 * - Editace textu neshod
 * - Přeskupení obrázků (drag & drop)
 * - Page preview s náhledem stránek
 * - AI-assisted layout optimization
 * - Export do PDF
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Audit, Report, AuditStructure, NonComplianceData, AuditAnswer } from '../types';
import { EditableNonCompliance, EditablePhoto, ReportLayout } from '../types/reportEditor';
import { suggestOptimalLayout } from '../services/aiLayoutService';
import { generateContentSuggestions, applySuggestion, applyAllSuggestions, ContentSuggestion, SuggestionsResult } from '../services/aiContentSuggestions';
import { generatePrintableHTML } from './PrintableReport';
import { generatePDF, downloadPDF } from '../services/pdfService';
import { toast } from '../utils/toast';
import { getAuditorInfo } from './AuditorSettingsScreen';
import SummaryReportContent from '../src/components/SummaryReport';
import AISuggestionsView from './AISuggestionsView';
import './ReportEditorPrint.css';

interface ReportEditorProps {
  report: Report;
  audit: Audit;
  auditStructure: AuditStructure;
  onBack: () => void;
  onSave?: (editedData: EditableNonCompliance[]) => void;
  usePuppeteer?: boolean; // true = nová verze (Puppeteer), false/undefined = stará verze (window.print)
}

const ReportEditor: React.FC<ReportEditorProps> = ({
  report,
  audit,
  auditStructure,
  onBack,
  onSave,
  usePuppeteer = false, // Výchozí = stará verze
}) => {
  // Konverze původních dat na editovatelný formát
  const initialNonCompliances = useMemo((): EditableNonCompliance[] => {
    const ncs: EditableNonCompliance[] = [];
    
    auditStructure.audit_sections.forEach(section => {
      section.items.forEach(item => {
        const answer = audit.answers[item.id];
        if (answer && !answer.compliant && answer.nonComplianceData) {
          answer.nonComplianceData.forEach((ncData, index) => {
            ncs.push({
              id: `${item.id}_${index}`,
              sectionTitle: section.title,
              itemTitle: item.title,
              location: ncData.location || '',
              finding: ncData.finding || '',
              recommendation: ncData.recommendation || '',
              photos: (ncData.photos || []).map((photo, pIndex) => ({
                id: `${item.id}_${index}_${pIndex}`,
                base64: photo.base64 || '',
                caption: '',
                width: 100,
                position: 'center',
              })),
              pageBreakBefore: false,
              pageBreakAfter: false,
            });
          });
        }
      });
    });
    
    return ncs;
  }, [audit, auditStructure]);

  // Load saved data from localStorage OR use initial
  const loadSavedData = (): EditableNonCompliance[] => {
    const saved = localStorage.getItem(`report_editor_${audit.id}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Chyba při načítání uložených dat:', e);
      }
    }
    return initialNonCompliances;
  };

  const [editableData, setEditableData] = useState<EditableNonCompliance[]>(loadSavedData);
  const [aiLayout, setAiLayout] = useState<ReportLayout | null>(null);
  const [isGeneratingLayout, setIsGeneratingLayout] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'ai-suggestions' | 'preview'>('edit');
  const [aiSuggestions, setAiSuggestions] = useState<SuggestionsResult | null>(null);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());

  // OPRAVA: Uložit a obnovit data při přepínání módů
  const previousViewMode = React.useRef<string>('edit');
  
  useEffect(() => {
    // Při návratu na edit mode, obnovit data z localStorage
    if (viewMode === 'edit' && previousViewMode.current !== 'edit') {
      const saved = localStorage.getItem(`report_editor_${audit.id}`);
      if (saved) {
        try {
          const savedData = JSON.parse(saved);
          setEditableData(savedData);
          toast.info('Data obnovena z poslední editace');
        } catch (e) {
          console.error('Chyba při obnově dat:', e);
        }
      }
    }
    previousViewMode.current = viewMode;
  }, [viewMode, audit.id]);

  // Auto-save changes to localStorage (pouze v edit mode)
  useEffect(() => {
    if (viewMode === 'edit') {
      localStorage.setItem(`report_editor_${audit.id}`, JSON.stringify(editableData));
    }
  }, [editableData, audit.id, viewMode]);

  // AI Layout optimization
  const handleOptimizeLayout = async () => {
    setIsGeneratingLayout(true);
    toast.info('Optimalizuji rozložení pomocí AI...');
    
    try {
      const suggestion = await suggestOptimalLayout(editableData);
      setAiLayout(suggestion.layout);
      
      // OPRAVA: Aplikovat page breaks z AI layoutu přímo do dat
      const updatedData = editableData.map(nc => ({ 
        ...nc, 
        pageBreakBefore: false, 
        pageBreakAfter: false,
        // Automaticky nastavit grid layout pro položky s 2+ fotkami
        photos: nc.photos.length >= 2 
          ? nc.photos.map((photo, idx) => ({
              ...photo,
              column: (idx % 2 === 0 ? 1 : 2) as 1 | 2,
              gridPosition: idx,
              width: 48  // Grid: 48% šířky
            }))
          : nc.photos.map(photo => ({ ...photo, width: photo.width || 100 }))  // Stack: zachovat původní
      }));
      
      // Projít stránky a aplikovat page breaks
      suggestion.layout.pages.forEach((page, pageIndex) => {
        if (pageIndex === 0) return; // První stránka nemá break
        
        const firstItemOnPage = page.items[0];
        if (firstItemOnPage && typeof firstItemOnPage !== 'string' && 'id' in firstItemOnPage) {
          const index = updatedData.findIndex(nc => nc.id === firstItemOnPage.id);
          if (index >= 0) {
            updatedData[index] = { ...updatedData[index], pageBreakBefore: true };
          }
        }
      });
      
      setEditableData(updatedData);
      
      const photoOptimizedCount = editableData.filter(nc => nc.photos.length >= 2).length;
      toast.success(`Rozložení optimalizováno na ${suggestion.layout.pages.length} stránek! ${photoOptimizedCount > 0 ? `Fotografie u ${photoOptimizedCount} položek nastaveny na grid layout.` : ''}`);
    } catch (error) {
      toast.error('Chyba při optimalizaci layoutu');
      console.error(error);
    } finally {
      setIsGeneratingLayout(false);
    }
  };

  // AI Content Suggestions
  const handleGenerateSuggestions = async () => {
    setIsGeneratingSuggestions(true);
    toast.info('AI analyzuje obsah reportu...');
    
    try {
      const suggestions = await generateContentSuggestions(editableData);
      setAiSuggestions(suggestions);
      setViewMode('ai-suggestions');
      toast.success(`Vygenerováno ${suggestions.suggestions.length} návrhů!`);
    } catch (error) {
      toast.error('Chyba při generování AI návrhů');
      console.error(error);
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  // Přijmout AI návrh
  const handleAcceptSuggestion = (suggestion: ContentSuggestion) => {
    const updated = applySuggestion(editableData, suggestion);
    setEditableData(updated);
    
    // Označit návrh jako aplikovaný
    setAppliedSuggestions(prev => {
      const newSet = new Set(prev);
      newSet.add(`${suggestion.nonComplianceId}_${suggestion.field}`);
      return newSet;
    });
    
    // Odstranit z návrhů
    if (aiSuggestions) {
      setAiSuggestions({
        ...aiSuggestions,
        suggestions: aiSuggestions.suggestions.filter(
          s => !(s.nonComplianceId === suggestion.nonComplianceId && s.field === suggestion.field)
        ),
      });
    }
    
    toast.success('Změna přijata!');
  };

  // Zamítnout AI návrh
  const handleRejectSuggestion = (suggestion: ContentSuggestion) => {
    if (aiSuggestions) {
      setAiSuggestions({
        ...aiSuggestions,
        suggestions: aiSuggestions.suggestions.filter(
          s => !(s.nonComplianceId === suggestion.nonComplianceId && s.field === suggestion.field)
        ),
      });
    }
    toast.info('Změna zamítnuta');
  };

  // Přijmout všechny návrhy
  const handleAcceptAllSuggestions = () => {
    if (!aiSuggestions) return;
    
    const updated = applyAllSuggestions(editableData, aiSuggestions.suggestions);
    setEditableData(updated);
    
    toast.success(`Přijato ${aiSuggestions.suggestions.length} změn!`);
    setAiSuggestions({ ...aiSuggestions, suggestions: [] });
    setViewMode('edit');
  };

  // Zamítnout všechny návrhy
  const handleRejectAllSuggestions = () => {
    if (!aiSuggestions) return;
    
    toast.info(`Zamítnuto ${aiSuggestions.suggestions.length} návrhů`);
    setAiSuggestions({ ...aiSuggestions, suggestions: [] });
    setViewMode('edit');
  };

  // Editace textu neshody
  const handleTextEdit = (id: string, field: 'location' | 'finding' | 'recommendation', value: string) => {
    setEditableData(prev =>
      prev.map(nc => (nc.id === id ? { ...nc, [field]: value } : nc))
    );
  };

  // Změna velikosti obrázku
  const handlePhotoResize = (ncId: string, photoId: string, width: number) => {
    setEditableData(prev =>
      prev.map(nc =>
        nc.id === ncId
          ? {
              ...nc,
              photos: nc.photos.map(p =>
                p.id === photoId ? { ...p, width } : p
              ),
            }
          : nc
      )
    );
  };

  // Smazání obrázku
  const handlePhotoDelete = (ncId: string, photoId: string) => {
    setEditableData(prev =>
      prev.map(nc =>
        nc.id === ncId
          ? { ...nc, photos: nc.photos.filter(p => p.id !== photoId) }
          : nc
      )
    );
  };

  // Toggle page break
  const togglePageBreak = (id: string, type: 'before' | 'after') => {
    setEditableData(prev =>
      prev.map(nc => {
        if (nc.id === id) {
          return type === 'before'
            ? { ...nc, pageBreakBefore: !nc.pageBreakBefore }
            : { ...nc, pageBreakAfter: !nc.pageBreakAfter };
        }
        return nc;
      })
    );
  };

  // Export do PDF - podporuje starou (window.print) i novou (Puppeteer) verzi
  const handleExportPDF = async () => {
    if (onSave) {
      onSave(editableData);
    }
    
    // STARÁ VERZE - window.print()
    if (!usePuppeteer) {
      // Přepnout na preview mode
      setViewMode('preview');
      toast.info('Příprava PDF...');
      
      // Spustit tisk po zobrazení preview
      setTimeout(() => {
        window.print();
      }, 500);
      return;
    }
    
    // NOVÁ VERZE - Puppeteer (Best Practice podle jak_na_to.md)
    try {
      toast.info('Generování PDF pomocí Puppeteer...');
      
      // Získat aktuální údaje auditora z nastavení
      const auditorInfo = getAuditorInfo();
      const auditorName = auditorInfo.name || 'Neznámý';
      
      console.log('[ReportEditor] Používám údaje auditora:', auditorInfo);
      
      // Vygenerovat HTML pro Puppeteer (getAuditorInfo() se volá uvnitř funkce)
      const html = generatePrintableHTML(
        auditStructure.audit_title,
        audit.completedAt ? new Date(audit.completedAt).toLocaleDateString('cs-CZ') : new Date().toLocaleDateString('cs-CZ'),
        auditorName,
        editableData
      );
      
      console.log('[ReportEditor] Odesílání HTML na server...');
      
      // Zavolat Puppeteer backend
      const pdfBlob = await generatePDF(html);
      
      // Stáhnout PDF
      const filename = `audit-${auditStructure.audit_title.replace(/\s+/g, '-').substring(0, 30)}-${new Date().toISOString().split('T')[0]}.pdf`;
      downloadPDF(pdfBlob, filename);
      
      toast.success('✅ PDF úspěšně vygenerováno!');
      console.log('[ReportEditor] PDF vygenerováno a staženo:', filename);
      
    } catch (error) {
      console.error('[ReportEditor] Chyba při generování PDF:', error);
      toast.error(`❌ Chyba při generování PDF: ${error instanceof Error ? error.message : 'Neznámá chyba'}`);
    }
  };

  return (
    <div className="w-full max-w-7xl bg-white rounded-2xl shadow-xl print:shadow-none print:w-full print:max-w-none print:rounded-none">
      {/* Toolbar (skryté při tisku) */}
      <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b print:hidden">
        <div className="flex justify-between items-center mb-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold text-gray-800">Report Editor</h2>
              {usePuppeteer ? (
                <span className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">
                  🚀 Nová verze (Puppeteer)
                </span>
              ) : (
                <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-3 py-1 rounded-full">
                  ⚠️ Stará verze (window.print)
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Upravte report před exportem do PDF
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (confirm('Opravdu chcete vymazat všechny změny a začít od začátku?')) {
                  localStorage.removeItem(`report_editor_${audit.id}`);
                  setEditableData(initialNonCompliances);
                  toast.success('Změny vymazány, načteny původní data');
                }
              }}
              className="bg-orange-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-orange-600 transition-colors text-sm"
              title="Vymazat uložené změny a načíst původní data"
            >
              🔄 Reset
            </button>
            <button
              onClick={onBack}
              className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
              ← Zpět
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 flex-wrap">
          {/* View Mode Toggles */}

          <button
            onClick={() => {
              if (aiSuggestions && aiSuggestions.suggestions.length > 0) {
                setViewMode('ai-suggestions');
              } else {
                handleGenerateSuggestions();
              }
            }}
            disabled={isGeneratingSuggestions}
            className={`font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 ${
              viewMode === 'ai-suggestions'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-100'
            }`}
          >
            {isGeneratingSuggestions ? '⏳ Analyzuji...' : '🤖 AI Návrhy'}
            {aiSuggestions && aiSuggestions.suggestions.length > 0 && viewMode !== 'ai-suggestions' && (
              <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {aiSuggestions.suggestions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setViewMode('preview')}
            className={`font-semibold py-2 px-4 rounded-lg transition-colors ${
              viewMode === 'preview'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-100'
            }`}
          >
            👁 Preview
          </button>

          {/* Additional Actions */}
          <div className="ml-auto flex gap-3">
            {viewMode === 'edit' && (
              <button
                onClick={handleOptimizeLayout}
                disabled={isGeneratingLayout}
                className="bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {isGeneratingLayout ? '⏳ Optimalizuji layout...' : '📐 AI Layout'}
              </button>
            )}

            <button
              onClick={handleExportPDF}
              className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
              title={usePuppeteer ? 'Export pomocí Puppeteer (server-side)' : 'Export pomocí window.print() (browser)'}
            >
              📄 Export do PDF {usePuppeteer ? '(Puppeteer)' : '(Print)'}
            </button>
          </div>
        </div>

        {/* Info Panel */}
        <div className="mt-3 flex gap-3">
          {aiLayout && (
            <div className="flex-1 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
              <p className="text-green-800">
                ✓ AI layout aktivní - Report optimalizován na <strong>{aiLayout.pages.length} stránek</strong>
              </p>
            </div>
          )}
          
          {viewMode === 'edit' && (
            <div className="flex-1 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
              <p className="text-blue-800">
                📄 Aktuálně: <strong>{editableData.length} neshod</strong>
                {editableData.filter(nc => nc.pageBreakBefore).length > 0 && (
                  <span className="ml-2">
                    • {editableData.filter(nc => nc.pageBreakBefore).length} page breaks
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Preview Content */}
      <div className="bg-white print:p-0">

        {viewMode === 'ai-suggestions' && aiSuggestions && (
          <AISuggestionsView
            suggestions={aiSuggestions.suggestions}
            nonCompliances={editableData}
            onAccept={handleAcceptSuggestion}
            onReject={handleRejectSuggestion}
            onAcceptAll={handleAcceptAllSuggestions}
            onRejectAll={handleRejectAllSuggestions}
            summary={aiSuggestions.summary}
          />
        )}

        {viewMode === 'preview' && (
          <PreviewMode
            data={editableData}
            audit={audit}
            auditStructure={auditStructure}
            layout={aiLayout}
            report={report}
          />
        )}
      </div>
    </div>
  );
};

// Edit Mode - Editovatelný pohled
const EditMode: React.FC<{
  data: EditableNonCompliance[];
  onTextEdit: (id: string, field: 'location' | 'finding' | 'recommendation', value: string) => void;
  onPhotoResize: (ncId: string, photoId: string, width: number) => void;
  onPhotoDelete: (ncId: string, photoId: string) => void;
  onTogglePageBreak: (id: string, type: 'before' | 'after') => void;
}> = ({ data, onTextEdit, onPhotoResize, onPhotoDelete, onTogglePageBreak }) => {
  return (
    <div className="space-y-6">
      {data.map((nc, index) => (
        <div
          key={nc.id}
          className={`p-6 border-2 rounded-lg ${
            nc.pageBreakBefore ? 'border-blue-500' : 'border-gray-200'
          } hover:border-blue-300 transition-colors`}
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-bold text-lg">{index + 1}. {nc.itemTitle}</h3>
              <p className="text-xs text-gray-500">Sekce: {nc.sectionTitle}</p>
            </div>
            
            {/* Page Break Controls */}
            <div className="flex gap-2">
              <button
                onClick={() => onTogglePageBreak(nc.id, 'before')}
                className={`text-xs px-2 py-1 rounded ${
                  nc.pageBreakBefore
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
                title="Nová stránka před"
              >
                ⬆ Break
              </button>
              <button
                onClick={() => onTogglePageBreak(nc.id, 'after')}
                className={`text-xs px-2 py-1 rounded ${
                  nc.pageBreakAfter
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
                title="Nová stránka po"
              >
                ⬇ Break
              </button>
            </div>
          </div>

          {/* Editable Fields */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold mb-1">Místo:</label>
              <input
                type="text"
                value={nc.location}
                onChange={(e) => onTextEdit(nc.id, 'location', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Zjištění:</label>
              <textarea
                value={nc.finding}
                onChange={(e) => onTextEdit(nc.id, 'finding', e.target.value)}
                rows={3}
                className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Doporučení:</label>
              <textarea
                value={nc.recommendation}
                onChange={(e) => onTextEdit(nc.id, 'recommendation', e.target.value)}
                rows={3}
                className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Photos */}
          {nc.photos.length > 0 && (
            <div className="mt-4">
              <label className="block text-sm font-semibold mb-2">Fotografie ({nc.photos.length}):</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {nc.photos.map(photo => (
                  <div key={photo.id} className="border border-gray-200 rounded-lg p-3">
                    <img
                      src={`data:image/jpeg;base64,${photo.base64}`}
                      alt="Neshoda"
                      className="w-full h-auto rounded mb-2"
                    />
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-600">Šířka:</label>
                      <input
                        type="range"
                        min="30"
                        max="100"
                        value={photo.width || 100}
                        onChange={(e) =>
                          onPhotoResize(nc.id, photo.id, parseInt(e.target.value))
                        }
                        className="flex-1"
                      />
                      <span className="text-xs font-semibold">{photo.width || 100}%</span>
                      <button
                        onClick={() => onPhotoDelete(nc.id, photo.id)}
                        className="text-red-600 hover:text-red-800 text-xs font-bold px-2 py-1 rounded hover:bg-red-50"
                        title="Smazat fotku"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Preview Mode - Náhled před tiskem (kompletní s veškerým obsahem)
const PreviewMode: React.FC<{
  data: EditableNonCompliance[];
  audit: Audit;
  auditStructure: AuditStructure;
  layout: ReportLayout | null;
  report: Report;
}> = ({ data, audit, auditStructure, layout, report }) => {
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Neuvedeno';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 'Neplatné datum' : date.toLocaleDateString('cs-CZ');
  };

  const getAnswerStatus = (answer: AuditAnswer | undefined) => {
    if (answer && !answer.compliant) return { text: 'NEVYHOVUJE', color: 'text-red-600 font-bold' };
    return { text: 'Vyhovuje', color: 'text-green-600 font-bold' };
  };

  return (
    <div className="bg-white font-sans text-sm print:p-0" style={{ 
      width: '100%',  /* Plná šířka obrazovky */
      maxWidth: 'none',  /* Žádné omezení */
      padding: '40px 3%',  /* Horní/dolní 40px, levý/pravý 3% */
      /* Print má své vlastní marginy z CSS */
    }}>
      {/* Hlavička */}
      <h1 className="text-2xl font-bold text-center mb-4">{auditStructure.audit_title}</h1>
      <div className="text-center mb-8 text-base">
        <p><strong>Datum auditu:</strong> {formatDate(audit.completedAt)}</p>
        <p><strong>Za provozovatele:</strong> {audit.headerValues.operator_name || 'Neuvedeno'}</p>
      </div>
      
      {/* Zpracovatel Auditu */}
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
              {auditStructure.header_data.auditor.fields.map(field => (
                <td key={field.id} className="p-1">{(audit.headerValues as any)[field.id] || '-'}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Auditovaná provozovna a Provozovatel */}
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
      
      {/* AI Souhrnné hodnocení */}
      <SummaryReportContent reportData={report.reportData} />

      {/* Seznam auditovaných položek */}
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

      {/* Detail zjištěných neshod */}
      {data.length > 0 && (
        <div className="print:break-before-page mt-8">
          <h2 className="text-sm font-bold uppercase border-b-2 border-black pb-1 mb-2">DETAIL ZJIŠTĚNÝCH NESHOD</h2>
          
          {data.map((nc, index) => (
            <div
              key={nc.id}
              className={`mb-6 pt-4 border-t ${
                nc.pageBreakBefore ? 'print:break-before-page' : ''
              } ${nc.pageBreakAfter ? 'print:break-after-page' : ''} print:break-inside-avoid`}
            >
              <h3 className="font-bold text-md">{index + 1}. {nc.itemTitle}</h3>
              <p className="text-xs text-gray-500 mb-2">Sekce: {nc.sectionTitle}</p>

              <div className="pl-4 border-l-4 border-red-500 mb-4">
                <p><strong>Místo:</strong> {nc.location || '-'}</p>
                <p><strong>Zjištění:</strong> {nc.finding || '-'}</p>
                <p><strong>Doporučení:</strong> {nc.recommendation || '-'}</p>
              </div>

              {/* Fotografie - Grid layout pro 2+ fotek */}
              {nc.photos.length > 0 && (
                <div className={`mt-3 ${nc.photos.length === 1 ? 'space-y-3' : 'grid grid-cols-2 gap-3'}`}>
                  {nc.photos.map(photo => (
                    <div
                      key={photo.id}
                      className="print:break-inside-avoid"
                      style={nc.photos.length === 1 ? { width: `${photo.width || 100}%` } : {}}
                    >
                      <img
                        src={`data:image/jpeg;base64,${photo.base64}`}
                        alt={`Fotografie ${index + 1}`}
                        className="w-full h-auto rounded shadow-md border"
                      />
                    </div>
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

// Helper komponenta pro sekce (stejná jako v ReportView)
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

export default ReportEditor;
