/**
 * Default template pro Smart Template systém
 */

import { TemplateRules } from '../../types/smartReport';

/**
 * Default HACCP template podle specifikace
 */
export const DEFAULT_TEMPLATE: TemplateRules = {
  page: {
    margin: { top: 56, right: 48, bottom: 56, left: 48 },
    fontSize: 11
  },
  flow: ["cover", "summary", "images", "findingsTable"],
  pageBreaks: {
    afterSection: { summary: true }
  },
  text: {
    summary: {
      maxChars: 800,
      overflow: "truncate"
    }
  },
  images: {
    defaultPerRow: 3,
    maxRowsPerPage: 3
  },
  tables: {
    repeatHeader: true,
    columns: {
      findings: [
        { key: "cat", title: "Kategorie", width: 140 },
        { key: "desc", title: "Popis" },
        { key: "sev", title: "Závažnost", width: 90, align: "center" }
      ]
    }
  },
  sections: {
    summary: { source: "report.summaryText" },
    images: { source: "report.photos" },
    findingsTable: { source: "report.findings" }
  }
};

export const DEFAULT_TEMPLATE_ID = "haccp-default";
export const DEFAULT_TEMPLATE_VERSION = "1";


