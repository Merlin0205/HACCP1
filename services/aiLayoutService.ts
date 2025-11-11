/**
 * AI Layout Service - wrapper pro Firebase AI Logic SDK
 */

import { EditableNonCompliance, ReportLayout, AILayoutSuggestion } from '../types/reportEditor';
import { generateContentWithSDK, type AIGenerateContentResponse } from './aiLogic';
import { fetchAIModelsConfig } from './firestore/settings';
import { addAIUsageLog } from './firestore/aiUsageLogs';

/**
 * Odhaduje výšku položky v pixelech - PŘESNÝ výpočet jako v editoru
 */
function estimateItemHeight(nc: EditableNonCompliance, pageWidth: number = 800): number {
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
}

/**
 * Analyzuje obsah reportu a navrhne optimální rozložení stránek
 */
export async function suggestOptimalLayout(
  nonCompliances: EditableNonCompliance[],
  pageHeight: number = 1100,
  pageWidth: number = 800
): Promise<AILayoutSuggestion> {

  // Připravíme kontext pro AI s PŘESNÝMI výškami
  const itemsSummary = nonCompliances.map((nc, index) => ({
    index,
    id: nc.id,
    title: nc.itemTitle,
    textLength: (nc.location + nc.finding + nc.recommendation).length,
    photoCount: nc.photos.length,
    estimatedHeight: estimateItemHeight(nc, pageWidth), // ✅ PŘESNÁ výška!
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

  const modelsConfig = await fetchAIModelsConfig();
  const modelName = modelsConfig.models?.['text-generation'] || 'gemini-2.5-flash';

  try {
    const response: AIGenerateContentResponse = await generateContentWithSDK(modelName, prompt);
    
    await addAIUsageLog(
      modelName,
      'text-generation',
      response.usageMetadata.promptTokenCount,
      response.usageMetadata.candidatesTokenCount,
      response.usageMetadata.totalTokenCount,
      'sdk'
    );
    
    // Parsujeme JSON z odpovědi
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
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
    throw error;
  }
}

/**
 * Aplikuje automatické stránkování s ohledem na výšku obsahu
 */
export function applyAutoPageBreaks(
  nonCompliances: EditableNonCompliance[],
  pageWidth: number = 800
): EditableNonCompliance[] {
  const A4_HEIGHT = 1123;
  const PAGE_PADDING = 120;
  const AVAILABLE_HEIGHT = A4_HEIGHT - PAGE_PADDING;

  let currentPageHeight = 0;
  const result: EditableNonCompliance[] = [];

  nonCompliances.forEach((nc, index) => {
    const itemHeight = estimateItemHeight(nc, pageWidth);

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
