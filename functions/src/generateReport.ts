/**
 * Cloud Function pro generování AI reportů
 * Migrace z server/index.js - endpoint /api/generate-report
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';

const db = admin.firestore();

interface NonCompliance {
  section_title: string;
  item_title: string;
  location: string;
  finding: string;
  recommendation: string;
}

interface ReportSummary {
  title: string;
  evaluation_text: string;
  key_findings: string[];
  key_recommendations: string[];
}

interface ReportSection {
  section_title: string;
  evaluation: string;
  non_compliances: Array<{
    item_title: string;
    location: string;
    finding: string;
    recommendation: string;
  }>;
}

interface ReportData {
  summary: ReportSummary;
  sections: ReportSection[];
}

/**
 * Sesbírá všechny neshody z auditu
 */
function collectNonCompliances(auditData: any, auditStructure: any): NonCompliance[] {
  const nonCompliances: NonCompliance[] = [];
  
  auditStructure.audit_sections
    .filter((section: any) => section.active)
    .forEach((section: any) => {
      section.items
        .filter((item: any) => item.active && auditData.answers[item.id])
        .forEach((item: any) => {
          const answer = auditData.answers[item.id];
          if (!answer.compliant && answer.nonComplianceData && answer.nonComplianceData.length > 0) {
            answer.nonComplianceData.forEach((nc: any) => {
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
function createStaticPositiveReport(auditStructure: any, config: any): ReportData {
  const sections: ReportSection[] = auditStructure.audit_sections
    .filter((section: any) => section.active)
    .map((section: any) => ({
      section_title: section.title,
      evaluation: `Všechny kontrolované položky v této sekci vyhovují legislativním požadavkům. Provozovna udržuje vysoký hygienický standard v oblasti ${section.title.toLowerCase()}.`,
      non_compliances: []
    }));

  return {
    summary: {
      title: "Souhrnné hodnocení auditu",
      evaluation_text: config.evaluation_text,
      key_findings: config.key_findings,
      key_recommendations: config.key_recommendations
    },
    sections
  };
}

/**
 * Vytvoří prompt pro AI
 */
function createReportPrompt(nonCompliances: NonCompliance[], promptTemplate: string): string {
  const formatNonCompliance = (nc: NonCompliance) => `
    Sekce: ${nc.section_title}
    Položka: ${nc.item_title}
    - Místo: ${nc.location}
    - Zjištění: ${nc.finding}
    - Doporučení: ${nc.recommendation}
  `.trim();

  const nonCompliancesText = nonCompliances.map(formatNonCompliance).join('\n\n');

  // Nahradit placeholdery v template
  let prompt = promptTemplate
    .replace('{{neshody}}', nonCompliancesText)
    .replace('{{pocet_neshod}}', nonCompliances.length.toString());
  
  // Přidat strukturu výstupu (pokud už není v template)
  if (!prompt.includes('Požadovaný výstupní formát') && !prompt.includes('JSON objekt')) {
    prompt += `

    ### Požadovaný výstupní formát:
    Vrať POUZE a jedině validní JSON objekt bez jakéhokoliv dalšího textu nebo formátování (žádné markdown \`\`\`json na začátku nebo na konci).
    JSON objekt musí mít následující strukturu:
    {
      "summary": {
        "title": "Souhrnné hodnocení auditu",
        "evaluation_text": "...",
        "key_findings": [...],
        "key_recommendations": [...]
      },
      "sections": [...]
    }
    `;
  }

  return prompt;
}

/**
 * Zaloguje AI usage do Firestore
 */
async function logAIUsage(
  userId: string,
  model: string,
  promptTokens: number,
  completionTokens: number,
  totalTokens: number,
  operation: string,
  costUsd: number,
  costCzk: number
) {
  await db.collection('aiUsageLogs').add({
    userId,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    model,
    operation,
    promptTokens: promptTokens || 0,
    completionTokens: completionTokens || 0,
    totalTokens: totalTokens || 0,
    costUsd: costUsd || 0,
    costCzk: costCzk || 0
  });
}

/**
 * Vypočítá náklady za AI volání
 */
async function calculateCost(model: string, promptTokens: number, completionTokens: number) {
  try {
    const pricingDoc = await db.collection('settings').doc('aiPricingConfig').get();
    const config = pricingDoc.data();
    
    if (!config) {
      return { usd: 0, czk: 0 };
    }
    
    const pricing = config.models?.[model];
    const usdToCzk = config.usdToCzk || 25;
    
    if (!pricing) {
      return { usd: 0, czk: 0 };
    }

    let inputCost = 0;
    let outputCost = 0;

    if (pricing.threshold && pricing.inputPriceHigh) {
      if (promptTokens <= pricing.threshold) {
        inputCost = (promptTokens / 1000000) * pricing.inputPrice;
      } else {
        inputCost = (pricing.threshold / 1000000) * pricing.inputPrice +
                    ((promptTokens - pricing.threshold) / 1000000) * pricing.inputPriceHigh;
      }

      if (completionTokens <= pricing.threshold) {
        outputCost = (completionTokens / 1000000) * pricing.outputPrice;
      } else {
        outputCost = (pricing.threshold / 1000000) * pricing.outputPrice +
                     ((completionTokens - pricing.threshold) / 1000000) * pricing.outputPriceHigh;
      }
    } else {
      inputCost = (promptTokens / 1000000) * (pricing.inputPrice || 0);
      outputCost = (completionTokens / 1000000) * (pricing.outputPrice || 0);
    }

    const totalUsd = inputCost + outputCost;
    const totalCzk = totalUsd * usdToCzk;

    return { usd: totalUsd, czk: totalCzk };
  } catch (error) {
    console.error('[calculateCost] Error:', error);
    return { usd: 0, czk: 0 };
  }
}

/**
 * Callable Cloud Function pro generování reportů
 */
export const generateReport = functions
  .region('europe-west1')
  .https.onCall(async (data: any, context: functions.https.CallableContext) => {
    // Ověření autentifikace
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const { auditData, auditStructure } = data;

    if (!auditData || !auditStructure) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing audit data or structure');
    }

    try {
      // Načíst AI config
      const configDoc = await db.collection('settings').doc('aiReportConfig').get();
      const config = configDoc.data() || {
        staticPositiveReport: {
          evaluation_text: "Audit prokázal výborný hygienický stav provozovny. Všechny kontrolované položky vyhovují legislativním požadavkům České republiky a Evropské unie. Provozovna má zavedené správné hygienické postupy a udržuje vysoký standard bezpečnosti potravin.",
          key_findings: [
            "Všechny kontrolované oblasti vyhovují legislativním požadavkům",
            "Zavedené hygienické postupy jsou funkční a efektivní",
            "Provozovna udržuje vysoký hygienický standard",
            "Dokumentace je vedena v souladu s požadavky"
          ],
          key_recommendations: [
            "Pokračovat v nastaveném režimu kontrol a údržby",
            "Udržovat pravidelné školení zaměstnanců v oblasti hygieny",
            "Průběžně aktualizovat dokumentaci HACCP",
            "Provádět pravidelné interní audity pro udržení vysokého standardu"
          ]
        },
        aiPromptTemplate: "Jsi expert na hygienu potravin a HACCP v České republice a řídíš se výhradně platnou legislativou ČR a příslušnými nadřazenými předpisy Evropské unie. Tvým úkolem je vygenerovat strukturovaný report z auditu ve formátu JSON.\n\n### DŮLEŽITÉ: Byly nalezeny následující neshody, které MUSÍŠ zahrnout do reportu:\n{{neshody}}\n\n### Počet neshod celkem: {{pocet_neshod}}\n\n### Důležité pokyny:\n- Zaměř se na KONKRÉTNÍ NESHODY uvedené výše\n- Pro každou sekci z auditu vytvoř odpovídající objekt v poli \"sections\"\n- Do \"non_compliances\" zahrnout POUZE neshody uvedené výše\n- Pokud v sekci není žádná neshoda, pole \"non_compliances\" musí být prázdné ([])\n- V \"summary\" zaměř hodnocení na nalezené neshody a navrhni konkrétní nápravná opatření\n- NEPIŠ obecná doporučení, zaměř se na konkrétní problémy\n- Texty generuj v českém jazyce, profesionálně, jasně a stručně\n- Ujisti se, že výstup je POUZE validní JSON",
        useAI: true,
        fallbackText: "Audit byl proveden a byly zjištěny neshody, které vyžadují okamžitou pozornost a nápravu. Doporučujeme provést revizi hygienických postupů a zavést nápravná opatření."
      };

      // Sesbírat neshody
      const nonCompliances = collectNonCompliances(auditData, auditStructure);

      // Pokud nejsou neshody, vrátit statický pozitivní report
      if (nonCompliances.length === 0) {
        return {
          result: createStaticPositiveReport(auditStructure, config.staticPositiveReport),
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
        };
      }

      // Pokud jsou neshody ale AI je vypnuto
      if (!config.useAI) {
        const fallbackText = config.fallbackText || "Audit byl proveden a byly zjištěny neshody, které vyžadují okamžitou pozornost a nápravu. Doporučujeme provést revizi hygienických postupů a zavést nápravná opatření.";
        
        // Nahradit placeholdery v fallback textu
        let processedFallbackText = fallbackText.replace('{{pocet_neshod}}', nonCompliances.length.toString());
        const neshodySeznam = nonCompliances.map(nc => `- ${nc.item_title}`).join('\n');
        processedFallbackText = processedFallbackText.replace('{{neshody}}', neshodySeznam);
        
        // Fallback report má jednodušší strukturu (bez sections)
        const fallbackReport = {
          summary: {
            title: "Souhrnné hodnocení auditu",
            evaluation_text: processedFallbackText,
            key_findings: nonCompliances.slice(0, 5).map(nc => nc.item_title),
            key_recommendations: [
              "Provést nápravu zjištěných neshod",
              "Aktualizovat dokumentaci",
              "Proškolit zaměstnance"
            ]
          },
          sections: []
        };
        
        return {
          result: fallbackReport,
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
        };
      }

      // Načíst model config
      const modelsDoc = await db.collection('settings').doc('aiModelsConfig').get();
      const modelsConfig = modelsDoc.data();
      const selectedModel = modelsConfig?.models?.['report-generation'] || 'gemini-2.0-flash-exp';

      // Generovat pomocí AI
      // Pro emulátory použít process.env, pro produkci functions.config()
      const apiKey = process.env.GEMINI_API_KEY || functions.config().gemini?.api_key;
      if (!apiKey) {
        throw new functions.https.HttpsError('failed-precondition', 'Gemini API key not configured. Set GEMINI_API_KEY in functions/.env for emulators or use firebase functions:config:set for production.');
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: selectedModel });
      const prompt = createReportPrompt(nonCompliances, config.aiPromptTemplate);

      const result = await model.generateContent(prompt);
      const response = result.response;
      const rawText = response.text();

      // Extrahovat JSON
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new functions.https.HttpsError('internal', 'Failed to parse AI response');
      }

      const parsedResult = JSON.parse(jsonMatch[0]);
      const usageMetadata = response.usageMetadata as any || {};
      const promptTokens = usageMetadata.promptTokenCount || 0;
      const completionTokens = usageMetadata.candidatesTokenCount || 0;
      const totalTokens = usageMetadata.totalTokenCount || 0;

      // Vypočítat náklady a zalogovat
      const cost = await calculateCost(
        selectedModel,
        promptTokens,
        completionTokens
      );

      await logAIUsage(
        userId,
        selectedModel,
        promptTokens,
        completionTokens,
        totalTokens,
        'report-generation',
        cost.usd,
        cost.czk
      );

      return {
        result: parsedResult,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens
        }
      };
    } catch (error: any) {
      console.error('[generateReport] Error:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

