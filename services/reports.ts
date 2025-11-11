/**
 * API služba pro generování reportů - Firebase AI Logic SDK
 */

import { Audit, AuditStructure, ReportData } from '../types';
import { generateContentWithSDK, type AIGenerateContentResponse } from './aiLogic';
import { fetchAIModelsConfig } from './firestore/settings';
import { addAIUsageLog } from './firestore/aiUsageLogs';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export interface GenerateReportRequest {
  auditData: Audit;
  auditStructure: AuditStructure;
}

export interface GenerateReportResponse {
  result: ReportData;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Sesbírá všechny neshody z auditu
 */
function collectNonCompliances(auditData: Audit, auditStructure: AuditStructure): Array<{
  section_title: string;
  item_title: string;
  location: string;
  finding: string;
  recommendation: string;
}> {
  const nonCompliances: Array<{
    section_title: string;
    item_title: string;
    location: string;
    finding: string;
    recommendation: string;
  }> = [];
  
  auditStructure.audit_sections
    .filter((section) => section.active)
    .forEach((section) => {
      section.items
        .filter((item) => item.active && auditData.answers[item.id])
        .forEach((item) => {
          const answer = auditData.answers[item.id];
          if (!answer.compliant && answer.nonComplianceData && answer.nonComplianceData.length > 0) {
            answer.nonComplianceData.forEach((nc) => {
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
function createStaticPositiveReport(auditStructure: AuditStructure, config: any): ReportData {
  const sections = auditStructure.audit_sections
    .filter((section) => section.active)
    .map((section) => ({
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
function createReportPrompt(nonCompliances: Array<{
  section_title: string;
  item_title: string;
  location: string;
  finding: string;
  recommendation: string;
}>, promptTemplate: string): string {
  const formatNonCompliance = (nc: typeof nonCompliances[0]) => `
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
 * Vygeneruje report pomocí Firebase AI Logic SDK
 */
export async function generateReport(
  request: GenerateReportRequest
): Promise<GenerateReportResponse> {
  const { auditData, auditStructure } = request;

  // Načíst AI config
  const configDoc = await getDoc(doc(db, 'settings', 'aiReportConfig'));
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
    
    let processedFallbackText = fallbackText.replace('{{pocet_neshod}}', nonCompliances.length.toString());
    const neshodySeznam = nonCompliances.map(nc => `- ${nc.item_title}`).join('\n');
    processedFallbackText = processedFallbackText.replace('{{neshody}}', neshodySeznam);
    
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
  const modelsConfig = await fetchAIModelsConfig();
  let modelName = modelsConfig.models?.['report-generation'] || 'gemini-2.0-flash-exp';
  
  // Validace modelu
  const deprecatedModels = ['gemini-1.5-pro', 'gemini-1.5-flash'];
  if (deprecatedModels.includes(modelName)) {
    modelName = 'gemini-2.0-flash-exp';
  }

  const prompt = createReportPrompt(nonCompliances, config.aiPromptTemplate);

  const response: AIGenerateContentResponse = await generateContentWithSDK(modelName, prompt);
  
  // Extrahovat JSON
  const jsonMatch = response.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse AI response');
  }

  const parsedResult = JSON.parse(jsonMatch[0]);
  
  await addAIUsageLog(
    modelName,
    'report-generation',
    response.usageMetadata.promptTokenCount,
    response.usageMetadata.candidatesTokenCount,
    response.usageMetadata.totalTokenCount,
    'sdk'
  );
  
  return {
    result: parsedResult,
    usage: {
      promptTokens: response.usageMetadata.promptTokenCount,
      completionTokens: response.usageMetadata.candidatesTokenCount,
      totalTokens: response.usageMetadata.totalTokenCount
    }
  };
}

export const reportsApi = {
  generate: generateReport,
};
