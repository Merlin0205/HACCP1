/**
 * AI Layout Service - Gemini API pro optimalizaci rozložení PDF reportu
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { EditableNonCompliance, ReportLayout, AILayoutSuggestion } from '../types/reportEditor';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL_NAME = import.meta.env.VITE_MODEL_TEXT_GENERATION || 'gemini-1.5-flash';

/**
 * Analyzuje obsah reportu a navrhne optimální rozložení stránek
 */
export async function suggestOptimalLayout(
  nonCompliances: EditableNonCompliance[],
  pageHeight: number = 1100,
  pageWidth: number = 800
): Promise<AILayoutSuggestion> {
  
  if (!API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY není nastaven');
  }

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  // VYLEPŠENÝ výpočet výšky - PŘESNÝ jako v editoru
  const estimateItemHeight = (nc: EditableNonCompliance): number => {
    let height = 0;
    
    // Nadpis: ~40px
    height += 40;
    
    // Text pole - přesný výpočet
    const locationLines = Math.max(2, Math.ceil((nc.location?.length || 0) / 80));
    height += locationLines * 18 + 25;
    
    const findingLines = Math.max(3, Math.ceil((nc.finding?.length || 0) / 80));
    height += findingLines * 18 + 25;
    
    const recommendationLines = Math.max(3, Math.ceil((nc.recommendation?.length || 0) / 80));
    height += recommendationLines * 18 + 25;
    
    // Fotografie - PŘESNÝ výpočet
    if (nc.photos.length > 0) {
      height += 30; // Label
      
      if (nc.photos.length > 1) {
        // Grid layout - 2 sloupce
        const rows = Math.ceil(nc.photos.length / 2);
        const photoWidth = (pageWidth * 0.48);
        const photoHeight = photoWidth * 0.75;
        height += rows * (photoHeight + 80) + (rows - 1) * 12;
      } else {
        // Stack layout
        nc.photos.forEach(photo => {
          const photoWidth = ((photo.width || 100) / 100) * pageWidth;
          const photoHeight = photoWidth * 0.75;
          height += photoHeight + 80 + 12;
        });
      }
    }
    
    height += 30; // Extra spacing
    return Math.round(height);
  };

  // Připravíme kontext pro AI s PŘESNÝMI výškami
  const itemsSummary = nonCompliances.map((nc, index) => ({
    index,
    id: nc.id,
    title: nc.itemTitle,
    textLength: (nc.location + nc.finding + nc.recommendation).length,
    photoCount: nc.photos.length,
    estimatedHeight: estimateItemHeight(nc), // ✅ PŘESNÁ výška!
  }));

  const prompt = `
Jsi expert na rozložení PDF dokumentů. Máš následující neshody v HACCP auditu, které je třeba rozložit do stránek A4.

DOSTUPNÁ VÝŠKA NA STRÁNCE: ${pageHeight}px

Neshody s PŘESNÝMI výškami:
${JSON.stringify(itemsSummary, null, 2)}

PRAVIDLA pro optimální rozložení:
1. Každá stránka má ${pageHeight}px dostupné výšky
2. V poli "estimatedHeight" je PŘESNÁ výška každé položky v pixelech
3. Sečti výšky položek na stránce - NESMÍ překročit ${pageHeight}px
4. Poskládej položky tak, aby:
   - Žádná stránka nepřetekla (součet výšek ≤ ${pageHeight}px)
   - Byl minimální počet stránek
   - Stránky byly rovnoměrně zaplněné (ideálně 80-95% využití)
5. Jedna položka NESMÍ být rozdělena na více stránek

PŘÍKLAD správného výpočtu:
Stránka 1: Položka 0 (350px) + Položka 1 (280px) = 630px ✅ (pod ${pageHeight}px)
Stránka 2: Položka 2 (420px) + Položka 3 (490px) = 910px ✅
Stránka 3: Položka 4 (650px) = 650px ✅

Vrať mi JSON odpověď ve formátu:
{
  "pages": [
    {
      "pageNumber": 1,
      "itemIds": ["id1", "id2"],
      "reasoning": "Proč jsem tyto položky dal na tuto stránku"
    }
  ],
  "confidence": 0.95,
  "overallReason": "Celkové vysvětlení rozložení"
}
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parsujeme JSON z odpovědi
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI nevrátila validní JSON');
    }
    
    const aiResponse = JSON.parse(jsonMatch[0]);
    
    // Konvertujeme AI odpověď na náš ReportLayout formát
    const layout: ReportLayout = {
      pages: aiResponse.pages.map((page: any) => ({
        pageNumber: page.pageNumber,
        items: nonCompliances.filter(nc => page.itemIds.includes(nc.id)),
        estimatedHeight: pageHeight,
      })),
      pageHeight,
      pageWidth,
    };

    return {
      confidence: aiResponse.confidence || 0.8,
      reason: aiResponse.overallReason || 'AI optimalizovalo rozložení',
      layout,
    };
  } catch (error) {
    console.error('[AILayoutService] Chyba při generování layoutu:', error);
    
    // Fallback - pokud AI selže, použije se inteligentní algoritmus
    return fallbackLayout(nonCompliances);
  }
}

/**
 * Fallback - inteligentní algoritmus pro rozložení bez AI
 */
function fallbackLayout(nonCompliances: EditableNonCompliance[]): AILayoutSuggestion {
  const pageHeight = 1100;
  const pageWidth = 800;
  const pages: any[] = [];
  let currentPage: any = { pageNumber: 1, items: [], estimatedHeight: 0 };

  nonCompliances.forEach(nc => {
    const itemHeight = estimateItemHeight(nc);
    
    if (currentPage.estimatedHeight + itemHeight > pageHeight) {
      // Nová stránka
      pages.push(currentPage);
      currentPage = { pageNumber: pages.length + 1, items: [], estimatedHeight: 0 };
    }
    
    currentPage.items.push(nc);
    currentPage.estimatedHeight += itemHeight;
  });

  if (currentPage.items.length > 0) {
    pages.push(currentPage);
  }

  return {
    confidence: 0.6,
    reason: 'Použito jednoduché rozložení (AI nedostupná)',
    layout: {
      pages,
      pageHeight,
      pageWidth,
    },
  };
}

/**
 * Odhaduje výšku položky v pixelech
 */
function estimateItemHeight(item: EditableNonCompliance): number {
  let height = 150; // Základní výška
  
  // Text pole
  height += Math.ceil((item.location?.length || 0) / 100) * 20;
  height += Math.ceil((item.finding?.length || 0) / 100) * 30;
  height += Math.ceil((item.recommendation?.length || 0) / 100) * 30;
  
  // Fotografie
  item.photos.forEach(photo => {
    const photoWidth = (photo.width || 100) / 100 * 700;
    const photoHeight = photoWidth * 0.75;
    height += photoHeight + 30;
  });

  return height;
}

/**
 * Aplikuje automatické stránkování s ohledem na výšku obsahu
 */
export function applyAutoPageBreaks(
  nonCompliances: EditableNonCompliance[]
): EditableNonCompliance[] {
  const A4_HEIGHT = 1123;
  const PAGE_PADDING = 120;
  const AVAILABLE_HEIGHT = A4_HEIGHT - PAGE_PADDING;

  let currentPageHeight = 0;
  const result: EditableNonCompliance[] = [];

  nonCompliances.forEach((nc, index) => {
    const itemHeight = estimateItemHeight(nc);

    if (currentPageHeight + itemHeight > AVAILABLE_HEIGHT && index > 0) {
      result.push({
        ...nc,
        pageBreakBefore: true,
      });
      currentPageHeight = itemHeight;
    } else {
      result.push(nc);
      currentPageHeight += itemHeight;
    }
  });

  return result;
}
