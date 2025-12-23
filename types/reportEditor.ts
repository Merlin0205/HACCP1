/**
 * Typy pro Report Editor System
 */

export interface EditablePhoto {
  id: string;
  base64: string;
  url?: string; // URL obrázku (pokud není base64)
  caption?: string;
  width?: number; // Šířka v procentech (0-100)
  position?: 'left' | 'center' | 'right';
  column?: 1 | 2; // Sloupec v layoutu (1 = levý, 2 = pravý)
  colSpan?: 1 | 2 | 3; // Individual column span (1/3, 2/3, or full width)
  widthRatio?: number; // Precise width ratio (0.1-1.0) for smooth resizing (V4)
  aspectRatio?: number; // Aspect ratio (width / height)
  alignment?: 'left' | 'center' | 'right'; // Individual photo alignment
  gridPosition?: number; // Pozice v gridu (pro automatické rozmístění)
  pageHint?: number; // Preferovaná stránka
}

export interface EditableNonCompliance {
  id: string;
  sectionTitle: string;
  itemTitle: string;
  location: string;
  finding: string;
  recommendation: string;
  photos: EditablePhoto[];
  photoGridColumns?: 1 | 2 | 3; // New property for grid layout
  photoAlignment?: 'left' | 'center' | 'right'; // Horizontal alignment for photos
  pageBreakBefore?: boolean; // Vynutit novou stránku před touto neshodou
  pageBreakAfter?: boolean;  // Vynutit novou stránku za touto neshodou
}

export interface PageContent {
  pageNumber: number;
  items: (EditableNonCompliance | 'header' | 'summary' | 'table')[];
  estimatedHeight: number; // V pixelech
}

export interface ReportLayout {
  pages: PageContent[];
  pageHeight: number; // A4 = ~1100px
  pageWidth: number;  // A4 = ~800px
}

export interface AuditorStamp {
  stampUrl?: string;
  stampAlignment?: 'left' | 'center' | 'right';
  stampWidthRatio?: number; // Šířka jako ratio 0.1-1.0 (výchozí: 0.333 = 1/3 šířky)
  /**
   * Volné umístění razítka nad obsahem (může překrývat tabulku/tekst).
   * Pokud je true, razítko se nerenderuje v toku dokumentu, ale absolutně na zvolené stránce.
   */
  overlayEnabled?: boolean;
  /**
   * Cílová stránka (1-based, stejné číslování jako v patičce "Strana X z Y").
   * Pokud není nastaveno, použije se poslední stránka.
   */
  overlayPageNumber?: number;
  /**
   * Pozice v pixelech relativně k vnitřnímu obsahu PageSheet (od levého horního rohu).
   */
  overlayPosition?: {
    x: number;
    y: number;
  };
}

export interface ReportEditorState {
  // Global overrides for summary text
  summaryOverrides?: {
    evaluation_text?: string;
    key_findings?: string[];
    key_recommendations?: string[];
  };
  // Ordered list of non-compliances with layout settings
  nonCompliances: EditableNonCompliance[];
  // Table settings
  tableSettings?: {
    breakAfterSection?: boolean; // Force break after each section in table?
  };
  // Auditor stamp settings (editovatelné v report editoru)
  // null znamená, že bylo smazáno, undefined znamená, že nebylo nikdy nastaveno
  auditorStamp?: AuditorStamp | null;
}

// ============================================================================
// V4 Tiptap Document Types
// ============================================================================

/**
 * Tiptap JSONContent type (simplified from @tiptap/core)
 */
export interface JSONContent {
  type?: string;
  attrs?: Record<string, any>;
  content?: JSONContent[];
  marks?: {
    type: string;
    attrs?: Record<string, any>;
    [key: string]: any;
  }[];
  text?: string;
  [key: string]: any;
}

/**
 * V4 Tiptap document state
 */
export interface TiptapDocumentState {
  type: 'doc';
  content: JSONContent[];
}

/**
 * Attributes for NonCompliance custom node
 */
export interface NonComplianceNodeAttrs {
  id: string;
  sectionTitle: string;
  itemTitle: string;
  location: string;
  finding: string;
  recommendation: string;
  photos: EditablePhoto[];
  pageBreakBefore: boolean;
}

/**
 * Attributes for AuditTable custom node
 */
export interface AuditTableNodeAttrs {
  sections: any[]; // Audit sections data
  answers: Record<string, any>; // Answer map
}

/**
 * Attributes for Summary custom node
 */
export interface SummaryNodeAttrs {
  evaluationText: string;
  keyFindings: string[];
  keyRecommendations: string[];
}

/**
 * Attributes for Header custom node
 */
export interface HeaderNodeAttrs {
  auditTitle: string;
  auditDate: string;
  operatorName: string;
  headerValues: Record<string, any>;
  auditorSnapshot: any;
}
