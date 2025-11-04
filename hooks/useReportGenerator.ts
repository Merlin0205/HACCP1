/**
 * Custom hook pro generování reportů
 * 
 * Automaticky detekuje PENDING reporty a spouští AI generování
 */

import { useEffect, useState, useCallback } from 'react';
import { Report, Audit, AuditStructure, ReportStatus } from '../types';
import { generateReport } from '../services/reports';
import { handleError } from '../utils/errorHandler';
import { toast } from '../utils/toast';
import { getAuditorInfo } from '../components/AuditorSettingsScreen';

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

  const generateSingleReport = useCallback(
    async (report: Report) => {
      const audit = audits.find(a => a.id === report.auditId);
      if (!audit) {
        console.error('[useReportGenerator] Audit nenalezen pro report:', report.id);
        // Smazat orphaned report
        try {
          const { deleteReport } = await import('../services/firestore');
          await deleteReport(report.id);
          console.log('[useReportGenerator] Orphaned report smazán:', report.id);
        } catch (deleteError) {
          console.error('[useReportGenerator] Chyba při mazání orphaned report:', deleteError);
        }
        onReportUpdate(report.id, {
          status: ReportStatus.ERROR,
          error: 'Přiřazený audit nebyl nalezen.',
        });
        toast.error('Chyba při generování reportu: Audit nenalezen');
        return;
      }

      // Zkontrolovat, jestli report nebyl mezitím zrušen (status se změnil na ERROR)
      const currentReport = reports.find(r => r.id === report.id);
      if (currentReport && currentReport.status === ReportStatus.ERROR) {
        console.log('[useReportGenerator] Report byl zrušen před zahájením generování:', report.id);
        return;
      }

      console.log('[useReportGenerator] Generuji report:', report.id);
      await onReportUpdate(report.id, { status: ReportStatus.GENERATING });

      try {
        console.log('[useReportGenerator] Volám API pro generování reportu...');
        const result = await generateReport({
          auditData: audit,
          auditStructure,
        });
        
        // Zkontrolovat znovu, jestli report nebyl mezitím zrušen
        const checkReport = reports.find(r => r.id === report.id);
        if (checkReport && checkReport.status === ReportStatus.ERROR) {
          console.log('[useReportGenerator] Report byl zrušen během generování, ukončuji:', report.id);
          return;
        }
        
        console.log('[useReportGenerator] API response obdržena:', result);

        // Získat aktuální údaje auditora a uložit jako snapshot
        console.log('[useReportGenerator] Načítám auditor info...');
        let auditorSnapshot;
        try {
          auditorSnapshot = await getAuditorInfo();
          console.log('[useReportGenerator] Auditor info načteno:', auditorSnapshot);
        } catch (auditorError) {
          console.error('[useReportGenerator] Chyba při načítání auditor info:', auditorError);
          // Pokračovat bez auditor snapshot
          auditorSnapshot = undefined;
        }

        console.log('[useReportGenerator] Report úspěšně vygenerován, aktualizuji state...');
        
        // Zkontrolovat znovu před uložením výsledku, jestli report nebyl mezitím zrušen
        const finalCheck = reports.find(r => r.id === report.id);
        if (finalCheck && finalCheck.status === ReportStatus.ERROR) {
          console.log('[useReportGenerator] Report byl zrušen před uložením výsledku, ukončuji:', report.id);
          return;
        }
        
        await onReportUpdate(report.id, {
          status: ReportStatus.DONE,
          reportData: result.result,
          usage: result.usage,
          generatedAt: new Date().toISOString(),
          auditorSnapshot, // Uložit snapshot údajů auditora v době generování
        });
        console.log('[useReportGenerator] State aktualizován na DONE');
        toast.success('Report byl úspěšně vygenerován');
      } catch (err) {
        const errorInfo = handleError(err);
        console.error('[useReportGenerator] Chyba při generování:', err);
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
    const pendingReport = reports.find(r => r.status === ReportStatus.PENDING);
    
    if (pendingReport && !isGenerating) {
      setIsGenerating(true);
      generateSingleReport(pendingReport).finally(() => {
        setIsGenerating(false);
      });
    }
    
    // Zkontrolovat, jestli není nějaký GENERATING report, který už nemá odpovídající audit
    // nebo byl zrušen (status se změnil na ERROR během generování)
    const generatingReports = reports.filter(r => r.status === ReportStatus.GENERATING);
    if (generatingReports.length > 0 && !isGenerating) {
      generatingReports.forEach(generatingReport => {
        const audit = audits.find(a => a.id === generatingReport.auditId);
        if (!audit) {
          // Pokud audit neexistuje, označit report jako ERROR
          console.warn('[useReportGenerator] Generující report bez auditu, označuji jako ERROR');
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
