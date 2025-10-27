
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 9002;
const DB_DIR = path.join(__dirname, 'db');
const AUDIT_STRUCTURE_FILE = path.join(DB_DIR, 'auditStructure.json');
const APP_DATA_FILE = path.join(DB_DIR, 'appData.json'); // Nový soubor pro data aplikace

const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY);
const reportModelName = process.env.VITE_MODEL_REPORT_GENERATION;
if (!reportModelName) {
    throw new Error("VITE_MODEL_REPORT_GENERATION is not defined in the .env file.");
}
const reportModel = genAI.getGenerativeModel({ model: reportModelName });

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- Inicializace databáze (struktura auditu + data aplikace) ---
const initializeDatabase = async () => {
  await fs.mkdir(DB_DIR, { recursive: true });

  // Inicializace struktury auditu, pokud neexistuje
  try {
    await fs.access(AUDIT_STRUCTURE_FILE);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('Audit structure file not found, creating a new one.');
      // Zde byl kód pro vytvoření, ale pro zjednodušení ho přeskočíme, 
      // protože by měl být vytvořen z frontendu.
      // Můžeme sem vložit defaultní prázdnou strukturu, pokud je potřeba.
      await fs.writeFile(AUDIT_STRUCTURE_FILE, JSON.stringify({ audit_title: "Default Title" }), 'utf-8');
    }
  }

  // Inicializace souboru pro data aplikace, pokud neexistuje
  try {
    await fs.access(APP_DATA_FILE);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('App data file not found, creating a new one.');
      const initialData = {
        customers: [],
        audits: [],
        reports: [],
      };
      await fs.writeFile(APP_DATA_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    }
  }
};

// --- API pro data aplikace (nové) ---

// GET endpoint pro načtení všech dat
app.get('/api/app-data', async (req, res) => {
  try {
    const data = await fs.readFile(APP_DATA_FILE, 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error reading app data file:', error);
    res.status(500).json({ message: 'Error reading application data' });
  }
});

// POST endpoint pro uložení všech dat
app.post('/api/app-data', async (req, res) => {
  try {
    const newData = req.body;
    // Základní validace, zda data obsahují očekávané klíče
    if (!newData || !('customers' in newData) || !('audits' in newData) || !('reports' in newData)) {
        return res.status(400).json({ message: 'Invalid data structure' });
    }
    await fs.writeFile(APP_DATA_FILE, JSON.stringify(newData, null, 2), 'utf-8');
    res.status(200).json({ message: 'Application data updated successfully' });
  } catch (error) {
    console.error('Error writing to app data file:', error);
    res.status(500).json({ message: 'Error updating application data' });
  }
});


// --- Stávající API pro audit-structure a generate-report (beze změn) ---

app.get('/api/audit-structure', async (req, res) => {
  try {
    const data = await fs.readFile(AUDIT_STRUCTURE_FILE, 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error reading audit structure file:', error);
    res.status(500).json({ message: 'Error reading audit structure' });
  }
});

app.post('/api/audit-structure', async (req, res) => {
  try {
    const newStructure = req.body;
    await fs.writeFile(AUDIT_STRUCTURE_FILE, JSON.stringify(newStructure, null, 2), 'utf-8');
    res.status(200).json({ message: 'Audit structure updated successfully' });
  } catch (error) {
    console.error('Error writing to audit structure file:', error);
    res.status(500).json({ message: 'Error updating audit structure' });
  }
});

app.post('/api/generate-report', async (req, res) => {
    const { auditData, auditStructure } = req.body;

    if (!auditData || !auditStructure) {
        return res.status(400).json({ message: "Missing auditData or auditStructure." });
    }

    const nonCompliantItems = Object.entries(auditData.answers)
        .filter(([_, answer]) => !answer.compliant)
        .map(([itemId, answer]) => {
            const item = auditStructure.audit_sections.flatMap(s => s.items).find(i => i.id === itemId);
            const section = auditStructure.audit_sections.find(s => s.items.some(i => i.id === itemId));
            return {
                ...item,
                sectionTitle: section?.title,
                nonComplianceData: answer.nonComplianceData,
            };
        });

    if (nonCompliantItems.length === 0) {
        return res.json({
            result: {
                introduction: `Audit provedený dne ${auditData.headerValues.audit_date || 'neuvedeno'} v provozovně ${auditData.headerValues.premise_name || 'neuvedeno'} neprokázal žádné neshody.`,
                summary: [],
                conclusion: "Všechny sledované oblasti jsou v souladu s hygienickými standardy a zásadami správné praxe."
            },
            usage: { model: reportModelName, totalTokens: 0, costCZK: 0 }
        });
    }

    try {
        const nonCompliancesText = nonCompliantItems.map(item => 
            `Oblast: ${item.sectionTitle} -> ${item.title}\n` +
            item.nonComplianceData.map(d => 
                `  - Místo: ${d.location}\n` +
                `  - Zjištění: ${d.finding}\n` +
                `  - Doporučení: ${d.recommendation}`
            ).join('\n')
        ).join('\n\n');

        const prompt = `
            Jsi expert na hygienu potravin a bezpečnost potravin. Tvým úkolem je analyzovat data z interního hygienického auditu a vrátit strukturovaný JSON objekt.

            Cílem je vytvořit datový podklad pro generování reportu, nikoli finální text.

            KONTEXT AUDITU:
            - Auditovaný podnik: ${auditData.headerValues.premise_name || 'neuvedeno'}
            - Provozovatel: ${auditData.headerValues.operator_name || 'neuvedeno'}
            - Datum auditu: ${auditData.headerValues.audit_date || 'neuvedeno'}

            NÍŽE JSOU ZJIŠTĚNÉ NESHODY:
            ---
            ${nonCompliancesText}
            ---

            TVŮJ ÚKOL:
            1.  Analyzuj poskytnuté neshody.
            2.  Vytvoř JSON objekt, který bude obsahovat TŘI klíče: "introduction", "summary", a "conclusion".
            3.  Do klíče "introduction" vlož krátký úvodní text, kde zmíníš, kdy a kde audit proběhl.
            4.  Do klíče "summary" vlož pole objektů. Každý objekt bude reprezentovat jednu oblast (např. "Infrastruktura", "Osobní hygiena") a bude mít dva klíče: "area" (název oblasti) a "findings" (textový souhrn zjištění v dané oblasti). Seskupuj podobné problémy.
            5.  Do klíče "conclusion" vlož závěrečný text, který zhodnotí celkový stav. Pokud byly nalezeny neshody, konstatuj, že zavedené postupy nejsou plně v souladu se zásadami HACCP a správné praxe, a zdůrazni nutnost přijetí nápravných opatření.

            PŘESNÁ STRUKTURA VÝSTUPNÍHO JSON OBJEKTU:
            {
              "introduction": "string",
              "summary": [
                {
                  "area": "string",
                  "findings": "string"
                }
              ],
              "conclusion": "string"
            }

            DŮLEŽITÉ:
            - Neformátuj výstup jako HTML.
            - Vracej POUZE a VÝHRADNĚ validní JSON objekt.
            - Texty musí být gramaticky a stylisticky správně.
            - Názvy klíčů v JSONu musí být přesně "introduction", "summary", "conclusion", "area", "findings".
        `;

        const result = await reportModel.generateContent(prompt);
        const response = result.response;
        const rawJsonResult = response.text();
        
        const jsonStart = rawJsonResult.indexOf('{');
        const jsonEnd = rawJsonResult.lastIndexOf('}') + 1;
        const jsonString = rawJsonResult.substring(jsonStart, jsonEnd);
        
        const jsonResult = JSON.parse(jsonString);

        const promptTokenCount = (prompt.length / 4) * 1.1;
        const completionTokenCount = (rawJsonResult.length / 4) * 1.2;
        const totalTokens = Math.round(promptTokenCount + completionTokenCount);

        const costPer1MInputTokensUSD = 0;
        const costPer1MOutputTokensUSD = 0;
        const usdToCzkRate = 23.5;

        const costUSD = ((promptTokenCount / 1000000) * costPer1MInputTokensUSD) + ((completionTokenCount / 1000000) * costPer1MOutputTokensUSD);
        const costCZK = costUSD * usdToCzkRate;
        
        res.json({
            result: jsonResult,
            usage: {
                model: reportModelName, 
                totalTokens: totalTokens,
                costCZK: costCZK,
            }
        });

    } catch (error) {
        console.error("Error generating AI report:", error);
        res.status(500).json({ message: `Při generování reportu na serveru nastala chyba: ${error.message}` });
    }
});

app.listen(PORT, async () => {
  try {
    await initializeDatabase();
    console.log(`Server is running on http://localhost:${PORT}`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
});
