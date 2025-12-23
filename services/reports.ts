/**
 * API služba pro generování reportů
 */

import { Audit, AuditStructure, ReportData, AuditType } from '../types';

export interface GenerateReportRequest {
  auditData: Audit;
  auditStructure: AuditStructure;
  auditType: AuditType;
}

export interface GenerateReportResponse {
  result: ReportData;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Sesbírá všechny neshody z auditu
 */
function collectNonCompliances(auditData: Audit, auditStructure: AuditStructure): Array<{
  section_title: string;
  item_title: string;
  location: string;
  finding: string;
  recommendation: string;
}> {
  const nonCompliances: Array<{
    section_title: string;
    item_title: string;
    location: string;
    finding: string;
    recommendation: string;
  }> = [];
  
  auditStructure.audit_sections
    .filter((section) => section.active)
    .forEach((section) => {
      section.items
        .filter((item) => item.active && auditData.answers[item.id])
        .forEach((item) => {
          const answer = auditData.answers[item.id];
          if (!answer.compliant && answer.nonComplianceData && answer.nonComplianceData.length > 0) {
            answer.nonComplianceData.forEach((nc) => {
              nonCompliances.push({
                section_title: section.title,
                item_title: item.title,
                location: nc.location || 'Nespecifikováno',
                finding: nc.finding || 'Nespecifikováno',
                recommendation: nc.recommendation || 'Nespecifikováno'
              });
            });
          }
        });
    });
  
  return nonCompliances;
}

/**
 * Vytvoří statický pozitivní report
 */
function createStaticPositiveReport(auditStructure: AuditStructure, reportText: string): ReportData {
  const sections = auditStructure.audit_sections
    .filter((section) => section.active)
    .map((section) => ({
      section_title: section.title,
      evaluation: `Všechny kontrolované položky v této sekci vyhovují legislativním požadavkům. Provozovna udržuje vysoký hygienický standard v oblasti ${section.title.toLowerCase()}.`,
      non_compliances: []
    }));

  return {
    summary: {
      title: "Souhrnné hodnocení auditu",
      evaluation_text: reportText || 'Audit prokázal výborný hygienický stav provozovny.',
      key_findings: [],
      key_recommendations: []
    },
    sections
  };
}

/**
 * Vygeneruje report pomocí statických textů z typu auditu
 */
export async function generateReport(
  request: GenerateReportRequest
): Promise<GenerateReportResponse> {
  const { auditData, auditStructure, auditType } = request;

  // Sesbírat neshody
  const nonCompliances = collectNonCompliances(auditData, auditStructure);

  // Vytvořit sekce pro report
  const sections = auditStructure.audit_sections
    .filter((section) => section.active)
    .map((section) => {
      const sectionNonCompliances = nonCompliances.filter(nc => nc.section_title === section.title);
      return {
        section_title: section.title,
        evaluation: sectionNonCompliances.length === 0 
          ? `Všechny kontrolované položky v této sekci vyhovují legislativním požadavkům. Provozovna udržuje vysoký hygienický standard v oblasti ${section.title.toLowerCase()}.`
          : '',
        non_compliances: sectionNonCompliances.map(nc => ({
          item_title: nc.item_title,
          location: nc.location,
          finding: nc.finding,
          recommendation: nc.recommendation
        }))
      };
    });

  // Vybrat správný text podle toho, zda jsou neshody
  const reportText = nonCompliances.length === 0
    ? (auditType.reportTextNoNonCompliances || 'Audit prokázal výborný hygienický stav provozovny.')
    : (auditType.reportTextWithNonCompliances || 'Audit byl proveden a byly zjištěny neshody, které vyžadují pozornost a nápravu.');

  const report: ReportData = {
    summary: {
      title: "Souhrnné hodnocení auditu",
      evaluation_text: reportText,
      key_findings: [],
      key_recommendations: []
    },
    sections
  };

  return {
    result: report,
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
  };
}

export const reportsApi = {
  generate: generateReport,
};
