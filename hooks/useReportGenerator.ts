/**
 * Custom hook pro generování reportů
 * 
 * Automaticky detekuje PENDING reporty a spouští AI generování
 */

import { useEffect, useState, useCallback } from 'react';
import { Report, Audit, AuditStructure, ReportStatus, AuditHeaderValues } from '../types';
import { generateReport } from '../services/reports';
import { handleError } from '../utils/errorHandler';
import { toast } from '../utils/toast';
import { getAuditorInfo } from '../components/AuditorSettingsScreen';
import { fetchOperator } from '../services/firestore/operators';
import { fetchPremise } from '../services/firestore/premises';
import { fetchAudit } from '../services/firestore/audits';
import { fetchAuditorInfo } from '../services/firestore/settings';
import { fetchAuditType } from '../services/firestore/auditTypes';

interface UseReportGeneratorProps {
  reports: Report[];
  audits: Audit[];
  auditStructure: AuditStructure;
  onReportUpdate: (reportId: string, updates: Partial<Report>) => Promise<void>;
}

export function useReportGenerator({
  reports,
  audits,
  auditStructure,
  onReportUpdate,
}: UseReportGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Timeout pro generování reportů (1 minuta)
  const GENERATION_TIMEOUT_MS = 1 * 60 * 1000; // 1 minuta

  const generateSingleReport = useCallback(
    async (report: Report) => {
      let audit = audits.find(a => a.id === report.auditId) || null;
      if (!audit) {
        // Po refreshi / v multi-user režimu nemusí být audit ještě v lokálním state.
        // Neoznačovat report jako orphan – zkusit audit načíst přímo z Firestore.
        try {
          audit = await fetchAudit(report.auditId);
        } catch {
          audit = null;
        }
      }

      if (!audit) {
        await onReportUpdate(report.id, {
          status: ReportStatus.ERROR,
          error: 'Přiřazený audit nebyl nalezen.',
        });
        toast.error('Chyba při generování reportu: Audit nenalezen');
        return;
      }

      // Zkontrolovat, jestli report nebyl mezitím zrušen (status se změnil na ERROR)
      const currentReport = reports.find(r => r.id === report.id);
      if (currentReport && currentReport.status === ReportStatus.ERROR) {
        return;
      }

      await onReportUpdate(report.id, { status: ReportStatus.GENERATING });

      try {
        // Načíst aktuální data provozovatele a pracoviště z databáze pro snapshot
        let headerValuesSnapshot: AuditHeaderValues | undefined = undefined;
        
        try {
          const premise = await fetchPremise(audit.premiseId);
          if (premise) {
            const operator = await fetchOperator(premise.operatorId);
            if (operator) {
              // Kombinovat adresu provozovatele
              const operatorAddressParts = [
                operator.operator_street,
                operator.operator_zip,
                operator.operator_city
              ].filter(Boolean);
              const operator_address = operatorAddressParts.length > 0 
                ? operatorAddressParts.join(', ')
                : '';

              // Načíst aktuální údaje auditora
              const auditorInfo = await fetchAuditorInfo();

              // Vytvořit snapshot headerValues s aktuálními daty
              headerValuesSnapshot = {
                ...audit.headerValues,
                premise_name: premise.premise_name || audit.headerValues.premise_name || '',
                premise_address: premise.premise_address || audit.headerValues.premise_address || '',
                premise_responsible_person: premise.premise_responsible_person || audit.headerValues.premise_responsible_person || '',
                premise_phone: premise.premise_phone || audit.headerValues.premise_phone || '',
                premise_email: premise.premise_email || audit.headerValues.premise_email || '',
                operator_name: operator.operator_name || audit.headerValues.operator_name || '',
                operator_address: operator_address,
                operator_street: operator.operator_street || audit.headerValues.operator_street || '',
                operator_city: operator.operator_city || audit.headerValues.operator_city || '',
                operator_zip: operator.operator_zip || audit.headerValues.operator_zip || '',
                operator_ico: operator.operator_ico || audit.headerValues.operator_ico || '',
                operator_statutory_body: operator.operator_statutory_body || audit.headerValues.operator_statutory_body || '',
                operator_phone: operator.operator_phone || audit.headerValues.operator_phone || '',
                operator_email: operator.operator_email || audit.headerValues.operator_email || '',
                auditor_name: auditorInfo.name || audit.headerValues.auditor_name || '',
                auditor_phone: auditorInfo.phone || audit.headerValues.auditor_phone || '',
                auditor_email: auditorInfo.email || audit.headerValues.auditor_email || '',
                auditor_web: auditorInfo.web || audit.headerValues.auditor_web || '',
              };
            }
          }
        } catch (dataError) {
          // Pokud se nepodaří načíst aktuální data, použít audit.headerValues jako snapshot
          // Tím zajistíme, že každý report má snapshot (i když jsou to data z auditu)
          headerValuesSnapshot = audit.headerValues;
        }

        // Zajistit, že snapshot je vždy vytvořen (i když jsou to data z auditu)
        if (!headerValuesSnapshot) {
          headerValuesSnapshot = audit.headerValues;
        }

        // Použít snapshot pro generování reportu
        const auditForGeneration = { ...audit, headerValues: headerValuesSnapshot };

        // Načíst auditType pro texty reportu
        let auditType = null;
        if (audit.auditTypeId) {
          try {
            auditType = await fetchAuditType(audit.auditTypeId);
            if (!auditType) {
            }
          } catch (error) {
          }
        }

        // Pokud není auditType, použít výchozí strukturu (pro zpětnou kompatibilitu)
        if (!auditType) {
          // Vytvořit minimální auditType z auditStructure pro zpětnou kompatibilitu
          auditType = {
            id: 'default',
            name: 'Výchozí',
            active: true,
            auditStructure: auditStructure,
            reportTextNoNonCompliances: '',
            reportTextWithNonCompliances: '',
            createdAt: new Date(),
            updatedAt: new Date()
          };
        }

        const result = await generateReport({
          auditData: auditForGeneration,
          auditStructure,
          auditType,
        });
        
        // Zkontrolovat znovu, jestli report nebyl mezitím zrušen
        const checkReport = reports.find(r => r.id === report.id);
        if (checkReport && checkReport.status === ReportStatus.ERROR) {
          return;
        }

        // Získat aktuální údaje auditora a uložit jako snapshot
        let auditorSnapshot;
        try {
          auditorSnapshot = await getAuditorInfo();
        } catch (auditorError) {
          // Pokračovat bez auditor snapshot
          auditorSnapshot = undefined;
        }
        
        // Zkontrolovat znovu před uložením výsledku, jestli report nebyl mezitím zrušen
        const finalCheck = reports.find(r => r.id === report.id);
        if (finalCheck && finalCheck.status === ReportStatus.ERROR) {
          return;
        }
        
        // Vytvořit initial editorState z reportData pro nově vygenerovaný report
        // DŮLEŽITÉ: Tento editorState obsahuje kompletní snapshot neshod v době generování reportu
        // a je nezávislý na budoucích změnách v auditu
        const { ReportEditorState } = await import('../types/reportEditor');
        const initialNonCompliances: any[] = [];
        
        // Inicializovat z audit answers - vytvořit kompletní snapshot všech neshod
        Object.entries(audit.answers).forEach(([questionId, answer]) => {
          if (!answer.compliant && answer.nonComplianceData) {
            answer.nonComplianceData.forEach(nc => {
              // Find section and item titles
              let sectionTitle = '';
              let itemTitle = '';

              auditStructure.audit_sections.forEach(section => {
                const item = section.items.find(i => i.id === questionId);
                if (item) {
                  sectionTitle = section.title;
                  itemTitle = item.title;
                }
              });

              // Vytvořit kompletní snapshot neshody s všemi texty a fotkami
              initialNonCompliances.push({
                id: nc.id || Math.random().toString(36).substr(2, 9),
                sectionTitle,
                itemTitle,
                // Zajistit, že všechny texty jsou uloženy (i když jsou prázdné)
                location: nc.location || '',
                finding: nc.finding || '',
                recommendation: nc.recommendation || '',
                // Uložit fotky s url (fotky zůstávají ve Storage, takže url je dostupné)
                // base64 může být také uložen pro případ, že by url nebylo dostupné
                photos: nc.photos?.map((p, pIndex) => ({
                  id: p.id || `photo-${questionId}-${pIndex}-${Math.random().toString(36).substr(2, 9)}`,
                  url: p.url || '', // URL je primární zdroj (fotky zůstávají ve Storage)
                  base64: p.base64 || undefined, // base64 je volitelný fallback
                  caption: p.caption || '',
                  width: 30,
                  position: 'left',
                  column: 1,
                  colSpan: 1,
                  widthRatio: 0.333,
                  alignment: 'left'
                })) || []
              });
            });
          }
        });

        const summary = result.result?.summary;
        
        // Načíst razítko auditora z globálního nastavení a přidat do editorState
        let auditorStamp: any = undefined;
        try {
          const auditorInfo = await fetchAuditorInfo();
          if (auditorInfo.stampUrl) {
            auditorStamp = {
              stampUrl: auditorInfo.stampUrl,
              stampAlignment: 'left', // Vždy výchozí zarovnání vlevo
              stampWidthRatio: auditorInfo.stampWidthRatio || 0.333
            };
          }
        } catch (error) {
        }
        
        const initialEditorState = {
          nonCompliances: initialNonCompliances,
          zoomLevel: 1.0,
          summaryOverrides: summary ? {
            evaluation_text: summary.evaluation_text,
            key_findings: summary.key_findings,
            key_recommendations: summary.key_recommendations
          } : undefined,
          auditorStamp: auditorStamp // Přidat razítko do editorState
        };
        
        // Vytvořit snapshot audit.answers v době generování reportu
        const answersSnapshot = { ...audit.answers };
        
        await onReportUpdate(report.id, {
          status: ReportStatus.DONE,
          reportData: result.result,
          usage: result.usage,
          generatedAt: new Date().toISOString(),
          auditorSnapshot, // Uložit snapshot údajů auditora v době generování
          headerValuesSnapshot, // Uložit snapshot headerValues v době generování
          answersSnapshot, // Uložit snapshot audit.answers v době generování
          editorState: initialEditorState, // Uložit initial editorState při generování (bude uloženo do smart.editorState)
        });
        toast.success('Report byl úspěšně vygenerován');
      } catch (err) {
        const errorInfo = handleError(err);
        await onReportUpdate(report.id, {
          status: ReportStatus.ERROR,
          error: errorInfo.message,
        });
        toast.error(`Chyba při generování reportu: ${errorInfo.message}`);
      }
    },
    [audits, auditStructure, onReportUpdate, reports]
  );

  /**
   * Background generování reportů
   */
  useEffect(() => {
    // 1. Zkontrolovat zaseknuté GENERATING reporty (starší než timeout)
    const stuckGeneratingReports = reports.filter(r => {
      if (r.status !== ReportStatus.GENERATING) return false;
      if (!r.createdAt) return false;
      const createdAt = new Date(r.createdAt).getTime();
      const now = Date.now();
      return (now - createdAt) > GENERATION_TIMEOUT_MS;
    });

    // Označit zaseknuté reporty jako ERROR
    stuckGeneratingReports.forEach(async (report) => {
      await onReportUpdate(report.id, {
        status: ReportStatus.ERROR,
        error: 'Generování reportu překročilo časový limit (10 minut)'
      });
    });

    // 2. Zpracovat všechny PENDING reporty postupně (ne jen první)
    if (!isGenerating) {
      const pendingReports = reports.filter(r => r.status === ReportStatus.PENDING);
      if (pendingReports.length > 0) {
        setIsGenerating(true);
        // Zpracovat první PENDING report
        const firstPending = pendingReports[0];
        generateSingleReport(firstPending).finally(() => {
          setIsGenerating(false);
        });
      }
    }
    
    // 3. Zkontrolovat GENERATING reporty bez auditu
    const generatingReports = reports.filter(r => r.status === ReportStatus.GENERATING);
    if (generatingReports.length > 0 && !isGenerating) {
      generatingReports.forEach(generatingReport => {
        const audit = audits.find(a => a.id === generatingReport.auditId);
        if (!audit) {
          // Pokud audit neexistuje, označit report jako ERROR
          onReportUpdate(generatingReport.id, {
            status: ReportStatus.ERROR,
            error: 'Audit byl smazán během generování',
          });
        }
      });
    }
  }, [reports, isGenerating, generateSingleReport, audits, onReportUpdate]);

  return {
    isGenerating,
  };
}
