/**
 * AI Content Suggestions Service
 * 
 * Generuje návrhy vylepšení obsahu reportu pomocí Gemini AI
 * - Gramatika a pravopis
 * - Profesionalita textu
 * - Struktura a formátování
 * - Konkrétnost doporučení
 */

import { EditableNonCompliance } from '../types/reportEditor';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ContentSuggestion {
  nonComplianceId: string;
  field: 'location' | 'finding' | 'recommendation';
  originalText: string;
  suggestedText: string;
  reason: string;
  confidence: number; // 0-1
  category: 'grammar' | 'clarity' | 'professionalism' | 'structure' | 'specificity';
}

export interface SuggestionsResult {
  suggestions: ContentSuggestion[];
  summary: string;
  totalImprovements: number;
}

/**
 * Vygeneruje AI návrhy na vylepšení obsahu reportu
 */
export async function generateContentSuggestions(
  nonCompliances: EditableNonCompliance[]
): Promise<SuggestionsResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY není nastaven');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.0-flash-exp',
    generationConfig: {
      temperature: 0.3, // Nižší teplota pro konzistentnější výstupy
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
    }
  });

  // Připravíme data pro AI
  const nonCompliancesData = nonCompliances.map((nc, index) => ({
    id: nc.id,
    index: index + 1,
    itemTitle: nc.itemTitle,
    location: nc.location,
    finding: nc.finding,
    recommendation: nc.recommendation,
  }));

  const prompt = `Jsi expert na hygienické audity HACCP. Analyzuj následující zjištěné neshody z hygienického auditu a navrhni vylepšení textu.

## NESHODY K ANALÝZE:
${JSON.stringify(nonCompliancesData, null, 2)}

## ÚKOL:
Pro každou neshodu analyzuj pole "location" (místo), "finding" (zjištění) a "recommendation" (doporučení) a navrhni vylepšení v těchto oblastech:

1. **Gramatika a pravopis** - oprav chyby v češtině
2. **Jasnost a srozumitelnost** - zlepši formulaci, aby byla konkrétnější
3. **Profesionalita** - používej odbornou terminologii HACCP
4. **Struktura** - zlepši logickou strukturu textu
5. **Konkrétnost** - doporučení musí být konkrétní a akčnı́

## PRAVIDLA:
- Navrhuj POUZE změny, které skutečně zlepší kvalitu textu
- Pokud je text v pořádku, nevytvářej zbytečné návrhy
- Každý návrh musí mít jasný důvod
- Zachovej odborný a profesionální tón
- Použij českou terminologii HACCP (např. "kritický kontrolní bod", "nápravné opatření")
- Doporučení musí být SMART (Specific, Measurable, Achievable, Relevant, Time-bound)

## VÝSTUP (striktně JSON):
{
  "suggestions": [
    {
      "nonComplianceId": "id neshody",
      "field": "location | finding | recommendation",
      "originalText": "původní text",
      "suggestedText": "vylepšený text",
      "reason": "stručný důvod změny (max 100 znaků)",
      "confidence": 0.95,
      "category": "grammar | clarity | professionalism | structure | specificity"
    }
  ],
  "summary": "Stručné shrnutí návrhů (2-3 věty)",
  "totalImprovements": 5
}

VRAŤ POUZE ČISTÝ JSON BEZ MARKDOWN FORMATOVÁNÍ.`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Odstraníme markdown code blocks pokud existují
    const cleanedText = responseText
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
    
    const parsedResult: SuggestionsResult = JSON.parse(cleanedText);
    
    // Validace výstupu
    if (!parsedResult.suggestions || !Array.isArray(parsedResult.suggestions)) {
      throw new Error('Neplatný formát odpovědi AI');
    }
    
    return parsedResult;
  } catch (error) {
    console.error('Chyba při generování AI návrhů:', error);
    
    // Fallback - žádné návrhy
    return {
      suggestions: [],
      summary: 'Nepodařilo se vygenerovat návrhy změn. Zkuste to prosím znovu.',
      totalImprovements: 0,
    };
  }
}

/**
 * Aplikuje vybraný návrh na neshodu
 */
export function applySuggestion(
  nonCompliances: EditableNonCompliance[],
  suggestion: ContentSuggestion
): EditableNonCompliance[] {
  return nonCompliances.map(nc => {
    if (nc.id === suggestion.nonComplianceId) {
      return {
        ...nc,
        [suggestion.field]: suggestion.suggestedText,
      };
    }
    return nc;
  });
}

/**
 * Aplikuje všechny návrhy najednou
 */
export function applyAllSuggestions(
  nonCompliances: EditableNonCompliance[],
  suggestions: ContentSuggestion[]
): EditableNonCompliance[] {
  let updated = [...nonCompliances];
  
  suggestions.forEach(suggestion => {
    updated = applySuggestion(updated, suggestion);
  });
  
  return updated;
}
