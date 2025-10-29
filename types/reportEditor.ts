/**
 * Typy pro Report Editor System
 */

export interface EditablePhoto {
  id: string;
  base64: string;
  caption?: string;
  width?: number; // Šířka v procentech (0-100)
  position?: 'left' | 'center' | 'right';
  column?: 1 | 2; // Sloupec v layoutu (1 = levý, 2 = pravý)
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

export interface AILayoutSuggestion {
  confidence: number; // 0-1
  reason: string;
  layout: ReportLayout;
}
