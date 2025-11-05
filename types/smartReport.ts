/**
 * Typy pro Smart Template Report System
 */

/**
 * Template Rules - JSON pravidla pro layout reportu
 */
export interface TemplateRules {
  page: {
    margin: { top: number; right: number; bottom: number; left: number };
    fontSize: number;
  };
  flow: string[]; // ["cover", "summary", "images", "findingsTable"]
  pageBreaks?: {
    beforeSection?: Record<string, boolean>;
    afterSection?: Record<string, boolean>;
  };
  text?: {
    [sectionKey: string]: {
      maxChars?: number;
      overflow?: "truncate" | "wrap" | "continue";
    };
  };
  images?: {
    defaultPerRow?: number;
    maxRowsPerPage?: number;
    maxWidth?: number; // %
  };
  tables?: {
    repeatHeader?: boolean;
    columns?: {
      [tableKey: string]: Array<{
        key: string;
        title: string;
        width?: number; // %
        align?: "left" | "center" | "right";
      }>;
    };
  };
  sections?: {
    [sectionKey: string]: {
      source: string; // "report.summaryText", "report.photos", atd.
    };
  };
}

/**
 * ReportDocument - struktura připravená pro render (WYSIWYG)
 */
export interface ReportDocument {
  metadata: {
    templateId: string;
    templateVersion: string;
    generatedAt: string;
    auditId: string;
  };
  pages: Page[];
}

/**
 * Page - jedna stránka dokumentu
 */
export interface Page {
  pageNumber: number;
  elements: PageElement[];
}

/**
 * PageElement - union type pro různé typy elementů na stránce
 */
export type PageElement =
  | { type: "cover"; content: CoverContent }
  | { type: "text"; content: TextContent }
  | { type: "images"; content: ImagesContent }
  | { type: "table"; content: TableContent }
  | { type: "pageBreak" };

/**
 * CoverContent - obsah úvodní stránky
 */
export interface CoverContent {
  title: string;
  subtitle?: string;
  auditDate?: string;
  operatorName?: string;
  premiseName?: string;
  auditorInfo?: {
    name: string;
    phone: string;
    email: string;
    web: string;
  };
}

/**
 * TextContent - textový obsah
 */
export interface TextContent {
  text: string;
  style?: {
    fontSize?: number;
    fontWeight?: "bold" | "normal";
    align?: "left" | "center" | "right";
  };
}

/**
 * ImagesContent - obsah s obrázky
 */
export interface ImagesContent {
  images: Array<{
    id: string;
    base64: string;
    caption?: string;
    width?: number; // %
  }>;
  layout: "grid" | "single";
  perRow?: number;
}

/**
 * TableContent - tabulkový obsah
 */
export interface TableContent {
  headers: string[];
  rows: string[][];
  columnWidths?: number[]; // %
  alignments?: ("left" | "center" | "right")[];
  repeatHeader?: boolean;
}


