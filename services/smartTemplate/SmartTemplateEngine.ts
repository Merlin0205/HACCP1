/**
 * Smart Template Engine - aplikuje pravidla šablony na audit data
 * 
 * POZNÁMKA: Tento engine generuje ReportDocument ze stejných dat jako Legacy report,
 * ale v editovatelné struktuře. Design je stejný jako Legacy report.
 */

import { ReportData, Audit, AuditStructure, AuditAnswer, NonComplianceData } from '../../types';
import { TemplateRules, ReportDocument, Page, PageElement, CoverContent, TextContent, ImagesContent, TableContent } from '../../types/smartReport';

/**
 * Aplikuje pravidla šablony na audit data a vytvoří ReportDocument
 * 
 * Tato funkce generuje report ve STEJNÉ struktuře jako Legacy report,
 * ale v editovatelné formě pro Smart Template systém.
 */
export function applySmartTemplate(
  data: ReportData,
  templateRules: TemplateRules,
  audit: Audit,
  auditStructure: AuditStructure,
  report: { auditorSnapshot?: { name: string; phone: string; email: string; web: string } }
): ReportDocument {
  const pages: Page[] = [];
  let currentPageNumber = 1;
  let currentPageElements: PageElement[] = [];

  // Helper: přidat page break
  const addPageBreak = () => {
    if (currentPageElements.length > 0) {
      pages.push({
        pageNumber: currentPageNumber,
        elements: [...currentPageElements]
      });
      currentPageElements = [];
      currentPageNumber++;
    }
  };

  // Helper: přidat element na aktuální stránku
  const addElement = (element: PageElement) => {
    currentPageElements.push(element);
  };

  // STRÁNKA 1: Cover + Header sekce (stejné jako Legacy)
  // 1. Nadpis auditu
  addElement({
    type: 'text',
    content: {
      text: auditStructure.audit_title,
      style: {
        fontSize: 20,
        fontWeight: 'bold',
        align: 'center'
      }
    }
  });

  // 2. Datum auditu a provozovatel (centrované)
  const auditDate = audit.completedAt ? new Date(audit.completedAt).toLocaleDateString('cs-CZ') : 'Neuvedeno';
  const operatorName = audit.headerValues.operator_name || 'Neuvedeno';
  addElement({
    type: 'text',
    content: {
      text: `Datum auditu: ${auditDate}\nZa provozovatele: ${operatorName}`,
      style: {
        fontSize: 14,
        align: 'center'
      }
    }
  });

  // 3. Sekce "Zpracovatel Auditu" (tabulka stejná jako Legacy)
  const auditorInfo = report.auditorSnapshot || {
    name: (audit.headerValues as any)['auditor_name'] || '-',
    phone: (audit.headerValues as any)['auditor_phone'] || '-',
    email: (audit.headerValues as any)['auditor_email'] || '-',
    web: (audit.headerValues as any)['auditor_web'] || '-',
  };

  const auditorFields = auditStructure.header_data.auditor.fields;
  addElement({
    type: 'table',
    content: {
      headers: auditorFields.map(f => f.label),
      rows: [[
        auditorInfo.name,
        auditorInfo.phone,
        auditorInfo.email,
        auditorInfo.web
      ]],
      alignments: ['left', 'left', 'left', 'left']
    }
  });

  // 4. Sekce "Auditované pracoviště" a "Provozovatel" (side-by-side jako Legacy)
  // Pro jednoduchost je rozdělíme na dva textové elementy
  const premiseFields = auditStructure.header_data.audited_premise.fields;
  const premiseText = premiseFields.map(f => `${f.label}: ${audit.headerValues[f.id] || '-'}`).join('\n');
  
  const operatorFields = auditStructure.header_data.operator.fields;
  const operatorText = operatorFields.map(f => `${f.label}: ${audit.headerValues[f.id] || '-'}`).join('\n');

  addElement({
    type: 'text',
    content: {
      text: `AUDITOVANÉ PRACOVIŠTĚ\n${premiseText}\n\nPROVOZOVATEL\n${operatorText}`,
      style: {
        fontSize: 11,
        align: 'left'
      }
    }
  });

  // Page break před Summary
  addPageBreak();

  // STRÁNKA 2: Summary sekce (stejné jako Legacy)
  if (data.summary) {
    const summaryText = [
      data.summary.title || 'Souhrnné hodnocení auditu',
      '',
      'Celkový souhrn a doporučení:',
      data.summary.evaluation_text || '',
      '',
      data.summary.key_findings && data.summary.key_findings.length > 0
        ? 'Klíčová zjištění:\n' + data.summary.key_findings.map(f => `• ${f}`).join('\n')
        : '',
      '',
      data.summary.key_recommendations && data.summary.key_recommendations.length > 0
        ? 'Závěr a doporučení:\n' + data.summary.key_recommendations.map(r => `• ${r}`).join('\n')
        : ''
    ].filter(Boolean).join('\n');

    addElement({
      type: 'text',
      content: {
        text: summaryText,
        style: {
          fontSize: 11,
          align: 'left'
        }
      }
    });
  }

  // Page break před tabulkou
  addPageBreak();

  // STRÁNKA 3: Tabulka auditovaných položek (stejná struktura jako Legacy)
  const tableHeaders = ['Kontrolovaná oblast', 'Výsledek'];
  const tableRows: string[][] = [];

  auditStructure.audit_sections.filter(s => s.active).forEach(section => {
    // Přidat řádek se sekcí (bold, jako v Legacy)
    tableRows.push([section.title, '']); // Prázdný druhý sloupec pro sekci
    
    section.items.filter(i => i.active).forEach(item => {
      const answer = audit.answers[item.id];
      const status = answer && !answer.compliant ? 'NEVYHOVUJE' : 'Vyhovuje';
      tableRows.push([item.title, status]);
    });
  });

  if (tableRows.length > 0) {
    addElement({
      type: 'text',
      content: {
        text: 'SEZNAM AUDITOVANÝCH POLOŽEK',
        style: {
          fontSize: 11,
          fontWeight: 'bold',
          align: 'left'
        }
      }
    });

    addElement({
      type: 'table',
      content: {
        headers: tableHeaders,
        rows: tableRows,
        alignments: ['left', 'center'],
        repeatHeader: false
      }
    });
  }

  // Page break před non-compliances
  addPageBreak();

  // STRÁNKA 4+: Detail neshod (pokud existují)
  const nonCompliantDetails: Array<NonComplianceData & { sectionTitle: string; itemTitle: string }> = [];
  auditStructure.audit_sections.forEach(section => {
    section.items.forEach(item => {
      const answer = audit.answers[item.id];
      if (answer && !answer.compliant && answer.nonComplianceData) {
        answer.nonComplianceData.forEach(ncData => {
          nonCompliantDetails.push({
            sectionTitle: section.title,
            itemTitle: item.title,
            ...ncData
          });
        });
      }
    });
  });

  if (nonCompliantDetails.length > 0) {
    addElement({
      type: 'text',
      content: {
        text: 'DETAIL ZJIŠTĚNÝCH NESCHOD',
        style: {
          fontSize: 11,
          fontWeight: 'bold',
          align: 'left'
        }
      }
    });

    nonCompliantDetails.forEach((nc, index) => {
      const ncText = [
        `${index + 1}. ${nc.itemTitle}`,
        `Sekce: ${nc.sectionTitle}`,
        '',
        `Místo: ${nc.location || '-'}`,
        `Zjištění: ${nc.finding || '-'}`,
        `Doporučení: ${nc.recommendation || '-'}`
      ].join('\n');

      addElement({
        type: 'text',
        content: {
          text: ncText,
          style: {
            fontSize: 11,
            align: 'left'
          }
        }
      });

      // Přidat obrázky pokud existují
      if (nc.photos && nc.photos.length > 0) {
        const imagesWithCaptions = nc.photos.map((photo, pIndex) => ({
          id: `${nc.itemTitle}_${index}_${pIndex}`,
          base64: photo.base64 || '',
          caption: `${nc.itemTitle} - ${nc.location || 'Nespecifikováno'}`
        })).filter(img => img.base64);

        if (imagesWithCaptions.length > 0) {
          addElement({
            type: 'images',
            content: {
              images: imagesWithCaptions,
              layout: 'grid',
              perRow: 3
            }
          });
        }
      }
    });
  }

  // Přidat poslední stránku pokud má nějaké elementy
  if (currentPageElements.length > 0) {
    pages.push({
      pageNumber: currentPageNumber,
      elements: currentPageElements
    });
  }

  return {
    metadata: {
      templateId: 'haccp-default',
      templateVersion: '1',
      generatedAt: new Date().toISOString(),
      auditId: audit.id
    },
    pages
  };
}

/**
 * Vytvoří cover page element
 */
function createCoverPage(
  audit: Audit,
  auditStructure: AuditStructure,
  report: { auditorSnapshot?: { name: string; phone: string; email: string; web: string } }
): PageElement {
  const auditorInfo = report.auditorSnapshot || {
    name: (audit.headerValues as any)['auditor_name'] || '-',
    phone: (audit.headerValues as any)['auditor_phone'] || '-',
    email: (audit.headerValues as any)['auditor_email'] || '-',
    web: (audit.headerValues as any)['auditor_web'] || '-'
  };

  const coverContent: CoverContent = {
    title: auditStructure.audit_title,
    auditDate: audit.completedAt ? new Date(audit.completedAt).toLocaleDateString('cs-CZ') : undefined,
    operatorName: audit.headerValues.operator_name || undefined,
    premiseName: audit.headerValues.premise_name || undefined,
    auditorInfo
  };

  return {
    type: 'cover',
    content: coverContent
  };
}

/**
 * Vytvoří summary sekci z ReportData
 */
function createSummarySection(data: ReportData, templateRules: TemplateRules): PageElement | null {
  if (!data.summary) {
    return null;
  }

  let summaryText = data.summary.evaluation_text || '';
  
  // Aplikovat textové limity
  const textRules = templateRules.text?.summary;
  if (textRules?.maxChars && summaryText.length > textRules.maxChars) {
    if (textRules.overflow === 'truncate') {
      summaryText = summaryText.substring(0, textRules.maxChars) + '...';
    }
  }

  // Sestavit kompletní text summary
  const fullText = [
    summaryText,
    data.summary.key_findings && data.summary.key_findings.length > 0
      ? '\n\nKlíčová zjištění:\n' + data.summary.key_findings.map(f => `• ${f}`).join('\n')
      : '',
    data.summary.key_recommendations && data.summary.key_recommendations.length > 0
      ? '\n\nDoporučení:\n' + data.summary.key_recommendations.map(r => `• ${r}`).join('\n')
      : ''
  ].filter(Boolean).join('\n');

  const textContent: TextContent = {
    text: fullText,
    style: {
      fontSize: templateRules.page.fontSize,
      align: 'left'
    }
  };

  return {
    type: 'text',
    content: textContent
  };
}

/**
 * Vytvoří images sekci z nonComplianceData photos
 */
function createImagesSection(
  audit: Audit,
  auditStructure: AuditStructure,
  templateRules: TemplateRules
): PageElement[] {
  const images: Array<{ id: string; base64: string; caption?: string }> = [];

  // Shromáždit všechny fotky z nonComplianceData
  auditStructure.audit_sections.forEach(section => {
    section.items.forEach(item => {
      const answer = audit.answers[item.id];
      if (answer && !answer.compliant && answer.nonComplianceData) {
        answer.nonComplianceData.forEach((ncData, ncIndex) => {
          if (ncData.photos) {
            ncData.photos.forEach((photo, photoIndex) => {
              if (photo.base64) {
                images.push({
                  id: `${item.id}_${ncIndex}_${photoIndex}`,
                  base64: photo.base64,
                  caption: `${item.title} - ${ncData.location || 'Nespecifikováno'}`
                });
              }
            });
          }
        });
      }
    });
  });

  if (images.length === 0) {
    return [];
  }

  const elements: PageElement[] = [];
  const perRow = templateRules.images?.defaultPerRow || 3;
  const maxRowsPerPage = templateRules.images?.maxRowsPerPage || 3;
  const maxImagesPerPage = perRow * maxRowsPerPage;

  // Rozdělit obrázky do chunků podle maxImagesPerPage
  for (let i = 0; i < images.length; i += maxImagesPerPage) {
    const pageImages = images.slice(i, i + maxImagesPerPage);
    
    const imagesContent: ImagesContent = {
      images: pageImages,
      layout: 'grid',
      perRow
    };

    elements.push({
      type: 'images',
      content: imagesContent
    });
  }

  return elements;
}

/**
 * Vytvoří findings table z auditStructure a audit.answers
 */
function createFindingsTable(
  audit: Audit,
  auditStructure: AuditStructure,
  templateRules: TemplateRules
): PageElement | null {
  const headers = ['Kontrolovaná oblast', 'Výsledek'];
  const rows: string[][] = [];

  auditStructure.audit_sections.filter(s => s.active).forEach(section => {
    section.items.filter(i => i.active).forEach(item => {
      const answer = audit.answers[item.id];
      const status = answer && !answer.compliant ? 'NEVYHOVUJE' : 'Vyhovuje';
      rows.push([item.title, status]);
    });
  });

  if (rows.length === 0) {
    return null;
  }

  const tableContent: TableContent = {
    headers,
    rows,
    columnWidths: [undefined, 120], // První sloupec auto, druhý 120px
    alignments: ['left', 'center'],
    repeatHeader: templateRules.tables?.repeatHeader || false
  };

  return {
    type: 'table',
    content: tableContent
  };
}


