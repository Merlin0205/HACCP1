/**
 * Cloud Function pro generování AI reportů
 * Migrace z server/index.js - endpoint /api/generate-report
 */

import * as functions from 'firebase-functions';
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

  let prompt = promptTemplate
    .replace('{{neshody}}', nonCompliancesText)
    .replace('{{pocet_neshod}}', nonCompliances.length.toString());
  
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
  .https.onCall(async (data, context) => {
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
          evaluation_text: "Audit prokázal výborný hygienický stav provozovny.",
          key_findings: ["Všechny oblasti vyhovují"],
          key_recommendations: ["Udržovat standard"]
        },
        aiPromptTemplate: "Vygeneruj report pro tyto neshody: {{neshody}}",
        useAI: true
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
        const fallbackText = config.fallbackText || "Audit byl proveden a byly zjištěny neshody.";
        return {
          result: {
            summary: {
              title: "Souhrnné hodnocení auditu",
              evaluation_text: fallbackText,
              key_findings: nonCompliances.slice(0, 5).map(nc => nc.item_title),
              key_recommendations: ["Provést nápravu zjištěných neshod"]
            },
            sections: []
          },
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
        };
      }

      // Načíst model config
      const modelsDoc = await db.collection('settings').doc('aiModelsConfig').get();
      const modelsConfig = modelsDoc.data();
      const selectedModel = modelsConfig?.models?.['report-generation'] || 'gemini-2.0-flash-exp';

      // Generovat pomocí AI
      const apiKey = functions.config().gemini?.api_key;
      if (!apiKey) {
        throw new functions.https.HttpsError('failed-precondition', 'Gemini API key not configured');
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
      const usage = response.usageMetadata || {};

      // Vypočítat náklady a zalogovat
      const cost = await calculateCost(
        selectedModel,
        usage.promptTokenCount || 0,
        usage.candidatesTokenCount || 0
      );

      await logAIUsage(
        userId,
        selectedModel,
        usage.promptTokenCount || 0,
        usage.candidatesTokenCount || 0,
        usage.totalTokenCount || 0,
        'report-generation',
        cost.usd,
        cost.czk
      );

      return {
        result: parsedResult,
        usage: {
          promptTokens: usage.promptTokenCount || 0,
          completionTokens: usage.candidatesTokenCount || 0,
          totalTokens: usage.totalTokenCount || 0
        }
      };
    } catch (error: any) {
      console.error('[generateReport] Error:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

