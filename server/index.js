const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs').promises;
const { GoogleGenerativeAI } = require('@google/generative-ai');
const puppeteer = require('puppeteer');

// --- Konfigurace ---
const PORT = process.env.PORT || 9002;
const API_KEY = process.env.VITE_GEMINI_API_KEY;

// --- Datové soubory (musí být definovány PŘED použitím) ---
const DATA_FILE = path.join(__dirname, 'db', 'appData.json');
const AUDIT_STRUCTURE_FILE = path.join(__dirname, 'db', 'auditStructure.json');
const AI_REPORT_CONFIG_FILE = path.join(__dirname, 'db', 'aiReportConfig.json');
const AI_USAGE_LOG_FILE = path.join(__dirname, 'db', 'aiUsageLog.json');
const AI_PRICING_CONFIG_FILE = path.join(__dirname, 'db', 'aiPricingConfig.json');
const AI_MODELS_CONFIG_FILE = path.join(__dirname, 'db', 'aiModelsConfig.json');

// Modely se načítají z JSON souboru místo .env
let REPORT_MODEL_NAME = null;
let AUDIO_MODEL_NAME = null;

/**
 * Načte modely z konfiguračního souboru
 */
async function loadModelsConfig() {
    try {
        const data = await fs.readFile(AI_MODELS_CONFIG_FILE, 'utf8');
        const config = JSON.parse(data);
        return config.models || {};
    } catch (error) {
        console.error('[MODELS] Chyba při načítání models config:', error);
        return {};
    }
}

// Načíst modely při startu serveru
(async () => {
    const models = await loadModelsConfig();
    REPORT_MODEL_NAME = models['report-generation'];
    AUDIO_MODEL_NAME = models['audio-transcription'];
    console.log('[MODELS] Načtené modely:', { REPORT_MODEL_NAME, AUDIO_MODEL_NAME });
})();

// --- Aplikace & Server ---
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// --- Middleware ---
// CORS - povolit requesty z frontendu
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Preflight request
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../build')));

// --- WebSocket a Gemini Stream ---
wss.on('connection', (ws) => {
    console.log('[SERVER - WS] Klient připojen.');
    let chat;

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);

            if (data.type === 'startStream') {
                console.log('[SERVER - WS] Zahájení streamu pro přepis audia.');
                if (!API_KEY || !AUDIO_MODEL_NAME) {
                    ws.send(JSON.stringify({ type: 'error', message: 'API klíč nebo název modelu chybí.' }));
                    return;
                }
                const genAI = new GoogleGenerativeAI(API_KEY);
                const model = genAI.getGenerativeModel({ model: AUDIO_MODEL_NAME });
                chat = model.startChat({});
                console.log('[SERVER - WS] Chat s Gemini úspěšně zahájen.');
                ws.send(JSON.stringify({ type: 'streamStarted' }));
            }

            if (data.type === 'audioData') {
                if (!chat) return;
                
                const buffer = Buffer.from(data.chunk);
                const base64Chunk = buffer.toString('base64');
                
                chat.sendMessageStream([{ inlineData: { mimeType: 'audio/webm', data: base64Chunk } }])
                .then(async (result) => {
                    let fullResponse = '';
                    for await (const chunk of result.stream) {
                        if (chunk.candidates?.[0]?.content?.parts?.[0]?.text) {
                           const text = chunk.candidates[0].content.parts[0].text;
                           fullResponse += text;
                           if (ws.readyState === WebSocket.OPEN) {
                               ws.send(JSON.stringify({ type: 'partialTranscription', text }));
                           }
                        }
                    }
                    
                    // Po dokončení streamu zkusit získat usage metadata a zalogovat
                    try {
                        const response = await result.response;
                        const usage = response.usageMetadata || {};
                        console.log('[SERVER - WS] Usage metadata:', JSON.stringify(usage));
                        
                        if (usage.totalTokenCount || usage.promptTokenCount || usage.candidatesTokenCount) {
                            const promptTokens = usage.promptTokenCount || 0;
                            const completionTokens = usage.candidatesTokenCount || 0;
                            const totalTokens = usage.totalTokenCount || (promptTokens + completionTokens);
                            
                            console.log(`[SERVER - WS] Logování audio usage: ${totalTokens} tokenů`);
                            await logAIUsage(
                                AUDIO_MODEL_NAME,
                                promptTokens,
                                completionTokens,
                                totalTokens,
                                'audio-transcription'
                            );
                        } else {
                            console.log('[SERVER - WS] Usage metadata není k dispozici nebo je prázdné');
                        }
                    } catch (error) {
                        console.error('[SERVER - WS] Chyba při logování usage:', error);
                    }
                })
                .catch(error => {
                    console.error('[SERVER - WS] CHYBA při odesílání/zpracování streamu:', error);
                    if(ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'error', message: 'Chyba během streamování.' }));
                });
            }
        } catch (error) {
            console.error('[SERVER - WS] CHYBA při zpracování zprávy:', error);
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'error', message: 'Chyba na serveru (neplatná zpráva).' }));
            }
        }
    });

    ws.on('close', (code, reason) => console.log(`[SERVER - WS] Klient odpojen. Kód: ${code}, Důvod: ${reason}`));
    ws.on('error', (error) => console.error('[SERVER - WS] WebSocket chyba:', error));
});

// --- Klasické API Endpoints ---
app.get('/api/app-data', async (req, res) => {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    if (error.code === 'ENOENT') res.json({ customers: [], audits: [], reports: [] });
    else res.status(500).send('Error reading data');
  }
});
app.post('/api/app-data', async (req, res) => {
  try {
    // Načíst stávající data pro zachování settings
    let existingData = {};
    try {
      const data = await fs.readFile(DATA_FILE, 'utf8');
      existingData = JSON.parse(data);
    } catch (error) {
      // Soubor neexistuje nebo je prázdný
      console.log('[SERVER] appData.json neexistuje, vytváření nového');
    }

    // Sloučit: aktualizovat customers, audits, reports, ale zachovat settings
    const updatedData = {
      ...req.body,
      settings: existingData.settings || req.body.settings || {}
    };

    await fs.writeFile(DATA_FILE, JSON.stringify(updatedData, null, 2), 'utf8');
    res.status(200).send('Data saved');
  } catch (error) {
    console.error('[SERVER] Error saving app-data:', error);
    res.status(500).send('Error saving data');
  }
});
app.get('/api/audit-structure', async (req, res) => {
    try {
        const structure = await fs.readFile(AUDIT_STRUCTURE_FILE, 'utf8');
        res.json(JSON.parse(structure));
    } catch (error) { res.status(500).send('Error reading audit structure'); }
});
app.post('/api/audit-structure', async (req, res) => {
    try {
        await fs.writeFile(AUDIT_STRUCTURE_FILE, JSON.stringify(req.body, null, 2), 'utf8');
        res.status(200).send('Audit structure saved');
    } catch (error) { res.status(500).send('Error saving audit structure'); }
});

// API pro auditor settings
app.get('/api/auditor-settings', async (req, res) => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const appData = JSON.parse(data);
        const auditor = appData.settings?.auditor || {
            name: 'Bc. Sylva Polzer, hygienický konzultant',
            phone: '603 398 774',
            email: 'sylvapolzer@avlyspol.cz',
            web: 'www.avlyspol.cz'
        };
        res.json(auditor);
    } catch (error) {
        console.error('[SERVER] Error reading auditor settings:', error);
        res.status(500).send('Error reading auditor settings');
    }
});

app.post('/api/auditor-settings', async (req, res) => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const appData = JSON.parse(data);
        
        if (!appData.settings) {
            appData.settings = {};
        }
        appData.settings.auditor = req.body;
        
        await fs.writeFile(DATA_FILE, JSON.stringify(appData, null, 2), 'utf8');
        console.log('[SERVER] Auditor settings saved:', req.body);
        res.status(200).send('Auditor settings saved');
    } catch (error) {
        console.error('[SERVER] Error saving auditor settings:', error);
        res.status(500).send('Error saving auditor settings');
    }
});

/**
 * Načte AI pricing config ze souboru
 */
async function loadPricingConfig() {
    try {
        const data = await fs.readFile(AI_PRICING_CONFIG_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('[PRICING] Chyba při načítání pricing config, používám výchozí');
        // Výchozí config
        return {
            usdToCzk: 25,
            models: {
                'gemini-2.0-flash-exp': { inputPrice: 0, outputPrice: 0 },
                'gemini-2.5-flash': { inputPrice: 0.30, outputPrice: 2.50 }
            }
        };
    }
}

/**
 * Vypočítá náklady za AI volání
 */
async function calculateCost(model, promptTokens, completionTokens) {
    const config = await loadPricingConfig();
    const pricing = config.models[model];
    const usdToCzk = config.usdToCzk || 25;
    
    if (!pricing) {
        console.warn(`[PRICING] Neznámý model: ${model}, vrací 0`);
        return { usd: 0, czk: 0 };
    }

    let inputCost = 0;
    let outputCost = 0;

    // Pro modely s threshold (např. gemini-2.5-pro)
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
        // Ostatní modely
        inputCost = (promptTokens / 1000000) * (pricing.inputPrice || 0);
        outputCost = (completionTokens / 1000000) * (pricing.outputPrice || 0);
    }

    const totalUsd = inputCost + outputCost;
    const totalCzk = totalUsd * usdToCzk;

    return {
        usd: totalUsd,
        czk: totalCzk
    };
}

/**
 * Zaloguje AI usage do souboru
 */
async function logAIUsage(model, promptTokens, completionTokens, totalTokens, operation) {
    try {
        console.log(`[AI-USAGE] Počítám náklady pro model: ${model}, tokeny: ${promptTokens}/${completionTokens}`);
        const cost = await calculateCost(model, promptTokens, completionTokens);
        console.log(`[AI-USAGE] Vypočtené náklady:`, cost);
        
        const logEntry = {
            timestamp: new Date().toISOString(),
            model,
            operation,
            promptTokens: promptTokens || 0,
            completionTokens: completionTokens || 0,
            totalTokens: totalTokens || 0,
            costUsd: cost.usd || 0,
            costCzk: cost.czk || 0
        };

        // Načíst existující log
        let logData = { logs: [] };
        try {
            const data = await fs.readFile(AI_USAGE_LOG_FILE, 'utf8');
            logData = JSON.parse(data);
        } catch (error) {
            // Soubor neexistuje, vytvoříme nový
            console.log('[AI-USAGE] Log soubor neexistuje, vytváření nového');
        }

        // Přidat nový záznam
        logData.logs.push(logEntry);

        // Uložit zpět
        await fs.writeFile(AI_USAGE_LOG_FILE, JSON.stringify(logData, null, 2), 'utf8');
        console.log(`[AI-USAGE] Zalogováno: ${model}, ${totalTokens} tokens, $${cost.usd.toFixed(4)} (${cost.czk.toFixed(2)} Kč)`);
    } catch (error) {
        console.error('[AI-USAGE] Chyba při logování:', error);
    }
}

// API pro AI report config
app.get('/api/ai-report-config', async (req, res) => {
    try {
        const data = await fs.readFile(AI_REPORT_CONFIG_FILE, 'utf8');
        const config = JSON.parse(data);
        res.json(config);
    } catch (error) {
        console.error('[SERVER] Error reading AI report config:', error);
        // Vrátit výchozí config pokud soubor neexistuje
        res.json({
            staticPositiveReport: {
                evaluation_text: "Audit prokázal výborný hygienický stav provozovny.",
                key_findings: ["Všechny oblasti vyhovují"],
                key_recommendations: ["Udržovat standard"]
            },
            aiPromptTemplate: "Vygeneruj report pro tyto neshody: {{neshody}}"
        });
    }
});

app.post('/api/ai-report-config', async (req, res) => {
    try {
        await fs.writeFile(AI_REPORT_CONFIG_FILE, JSON.stringify(req.body, null, 2), 'utf8');
        console.log('[SERVER] AI report config saved');
        res.status(200).send('AI report config saved');
    } catch (error) {
        console.error('[SERVER] Error saving AI report config:', error);
        res.status(500).send('Error saving AI report config');
    }
});

// API pro logování AI usage z frontendu
app.post('/api/log-ai-usage', async (req, res) => {
    try {
        const { model, operation, promptTokens, completionTokens, totalTokens } = req.body;
        
        if (!model || !operation) {
            return res.status(400).json({ error: 'Model a operation jsou povinné' });
        }
        
        await logAIUsage(
            model,
            promptTokens || 0,
            completionTokens || 0,
            totalTokens || 0,
            operation
        );
        
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('[SERVER] Chyba při logování AI usage:', error);
        res.status(500).json({ error: 'Chyba při logování' });
    }
});

// API pro AI usage statistics
app.get('/api/ai-usage-stats', async (req, res) => {
    try {
        const data = await fs.readFile(AI_USAGE_LOG_FILE, 'utf8');
        const logData = JSON.parse(data);
        res.json(logData);
    } catch (error) {
        console.error('[SERVER] Error reading AI usage log:', error);
        res.json({ logs: [] });
    }
});

// API pro smazání AI usage log
app.delete('/api/ai-usage-stats', async (req, res) => {
    try {
        await fs.writeFile(AI_USAGE_LOG_FILE, JSON.stringify({ logs: [] }, null, 2), 'utf8');
        console.log('[SERVER] AI usage log cleared');
        res.status(200).send('AI usage log cleared');
    } catch (error) {
        console.error('[SERVER] Error clearing AI usage log:', error);
        res.status(500).send('Error clearing AI usage log');
    }
});

// API pro získání modelů z konfiguračního souboru
app.get('/api/ai-models-config', async (req, res) => {
    try {
        const data = await fs.readFile(AI_MODELS_CONFIG_FILE, 'utf8');
        const config = JSON.parse(data);
        res.json(config);
    } catch (error) {
        console.error('[SERVER] Error reading models config:', error);
        res.status(500).json({ error: 'Error reading models config' });
    }
});

app.post('/api/ai-models-config', async (req, res) => {
    try {
        await fs.writeFile(AI_MODELS_CONFIG_FILE, JSON.stringify(req.body, null, 2), 'utf8');
        
        // Reload modelů do paměti
        const models = await loadModelsConfig();
        REPORT_MODEL_NAME = models['report-generation'];
        AUDIO_MODEL_NAME = models['audio-transcription'];
        console.log('[MODELS] Models config saved and reloaded:', { REPORT_MODEL_NAME, AUDIO_MODEL_NAME });
        
        res.status(200).send('Models config saved');
    } catch (error) {
        console.error('[SERVER] Error saving models config:', error);
        res.status(500).send('Error saving models config');
    }
});

// API pro AI pricing config
app.get('/api/ai-pricing-config', async (req, res) => {
    try {
        const config = await loadPricingConfig();
        res.json(config);
    } catch (error) {
        console.error('[SERVER] Error reading AI pricing config:', error);
        res.status(500).json({ error: 'Error reading pricing config' });
    }
});

app.post('/api/ai-pricing-config', async (req, res) => {
    try {
        await fs.writeFile(AI_PRICING_CONFIG_FILE, JSON.stringify(req.body, null, 2), 'utf8');
        console.log('[SERVER] AI pricing config saved');
        res.status(200).send('AI pricing config saved');
    } catch (error) {
        console.error('[SERVER] Error saving AI pricing config:', error);
        res.status(500).send('Error saving AI pricing config');
    }
});

/**
 * Spočítá všechny neshody v auditu
 */
const collectNonCompliances = (auditData, auditStructure) => {
    const nonCompliances = [];
    
    auditStructure.audit_sections
        .filter(section => section.active)
        .forEach(section => {
            section.items
                .filter(item => item.active && auditData.answers[item.id])
                .forEach(item => {
                    const answer = auditData.answers[item.id];
                    console.log(`[DEBUG] Položka ${item.title}: compliant=${answer.compliant}, hasNonCompliance=${!!answer.nonComplianceData}`);
                    if (!answer.compliant && answer.nonComplianceData && answer.nonComplianceData.length > 0) {
                        answer.nonComplianceData.forEach(nc => {
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
    
    console.log(`[DEBUG] Celkem sesbíráno ${nonCompliances.length} neshod`);
    return nonCompliances;
};

/**
 * Statický pozitivní report (když vše vyhovuje)
 */
const createStaticPositiveReport = (auditData, auditStructure, config) => {
    const sections = auditStructure.audit_sections
        .filter(section => section.active)
        .map(section => ({
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
};

const createReportPrompt = (auditData, auditStructure, nonCompliances, promptTemplate) => {
    const formatNonCompliance = (nc) => `
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
        .replace('{{pocet_neshod}}', nonCompliances.length);
    
    // Přidat strukturu výstupu
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
};

app.post('/api/generate-report', async (req, res) => {
    console.log('\n\n--- [SERVER] Zahájení generování reportu ---');
    if (!API_KEY || !REPORT_MODEL_NAME) {
        console.error('[SERVER-CHYBA] Chybí API klíč nebo název modelu v serverové konfiguraci.');
        return res.status(500).json({ error: 'Chybí API klíč nebo název modelu.' });
    }
    
    try {
        const { auditData, auditStructure } = req.body;
        if (!auditData || !auditStructure) {
            console.error('[SERVER-CHYBA] V požadavku chybí data auditu nebo struktura.');
            return res.status(400).json({ error: 'Chybí data auditu nebo struktura.' });
        }
        console.log('[SERVER-INFO] Data auditu a struktura úspěšně přijata.');
        
        // Načíst AI report config
        let config;
        try {
            const configData = await fs.readFile(AI_REPORT_CONFIG_FILE, 'utf8');
            config = JSON.parse(configData);
            console.log('[SERVER-INFO] AI report config úspěšně načten.');
        } catch (error) {
            console.error('[SERVER-CHYBA] Nelze načíst AI report config, používám výchozí:', error);
            // Výchozí config
            config = {
                staticPositiveReport: {
                    evaluation_text: "Audit prokázal výborný hygienický stav provozovny.",
                    key_findings: ["Všechny oblasti vyhovují"],
                    key_recommendations: ["Udržovat standard"]
                },
                aiPromptTemplate: "Vygeneruj report pro tyto neshody: {{neshody}}"
            };
        }
        
        // Spočítat všechny neshody
        const nonCompliances = collectNonCompliances(auditData, auditStructure);
        console.log(`[SERVER-INFO] Nalezeno ${nonCompliances.length} neshod v auditu.`);
        
        // Pokud nejsou žádné neshody, vrátit statický pozitivní report
        if (nonCompliances.length === 0) {
            console.log('[SERVER-INFO] Žádné neshody nenalezeny. Vracím statický pozitivní report.');
            const staticReport = createStaticPositiveReport(auditData, auditStructure, config.staticPositiveReport);
            console.log('[SERVER-ÚSPĚCH] Statický report úspěšně vytvořen. Žádné API volání nebylo provedeno.');
            return res.json({ 
                result: staticReport,
                usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
            });
        }
        
        // Pokud jsou neshody, zkontrolovat jestli používat AI
        if (!config.useAI) {
            console.log('[SERVER-INFO] AI je vypnuto. Používám fallback text.');
            // Použít fallback text
            let fallbackText = config.fallbackText || "Audit byl proveden a byly zjištěny neshody.";
            
            // Nahradit placeholdery
            fallbackText = fallbackText.replace('{{pocet_neshod}}', nonCompliances.length.toString());
            const neshodySeznam = nonCompliances.map(nc => `- ${nc.questionText}`).join('\n');
            fallbackText = fallbackText.replace('{{neshody}}', neshodySeznam);
            
            const fallbackReport = {
                evaluation_text: fallbackText,
                key_findings: nonCompliances.slice(0, 5).map(nc => nc.questionText),
                key_recommendations: ["Provést nápravu zjištěných neshod", "Aktualizovat dokumentaci", "Proškolit zaměstnance"]
            };
            
            console.log('[SERVER-ÚSPĚCH] Fallback report vytvořen.');
            return res.json({ 
                result: fallbackReport,
                usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
            });
        }
        
        // Pokud jsou neshody a AI je zapnuto, vygenerovat report pomocí AI
        console.log('[SERVER-INFO] Neshody nalezeny. Generuji report pomocí AI...');
        
        // Načíst vybraný model z aiModelsConfig.json
        let selectedModel = REPORT_MODEL_NAME; // fallback
        try {
            const modelsConfigData = await fs.readFile(AI_MODELS_CONFIG_FILE, 'utf8');
            const modelsConfig = JSON.parse(modelsConfigData);
            selectedModel = modelsConfig.models['report-generation'] || REPORT_MODEL_NAME;
        } catch (error) {
            console.warn('[SERVER] Nelze načíst models config, používám default model');
        }
        
        console.log(`[SERVER-INFO] Používám model: ${selectedModel}`);
        
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: selectedModel });
        const prompt = createReportPrompt(auditData, auditStructure, nonCompliances, config.aiPromptTemplate);

        // Zde logujeme pouze část promptu, aby log nebyl příliš dlouhý
        console.log('[SERVER-INFO] Prompt pro AI byl vytvořen. Začátek promptu:');
        console.log(prompt.substring(0, 500) + '...');
        console.log('--- Konec ukázky promptu ---');

        console.log('[SERVER-INFO] Odesílám požadavek na Gemini AI...');
        
        const result = await model.generateContent(prompt);
        const response = result.response;
        
        console.log('[SERVER-INFO] Odpověď od AI byla přijata.');

        // Zkusíme získat text, ale ošetříme případ, kdy by odpověď byla prázdná nebo chybná
        let rawText = '';
        try {
            rawText = response.text();
            console.log('[SERVER-INFO] Surová textová odpověď od AI:');
            console.log(rawText);
        } catch (e) {
            console.error('[SERVER-CHYBA] Nepodařilo se extrahovat text z odpovědi AI.', e);
            console.log('[SERVER-INFO] Kompletní objekt odpovědi od AI:', JSON.stringify(response, null, 2));
            throw new Error('AI odpověď neobsahovala platný text.');
        }

        console.log('[SERVER-INFO] Hledám JSON v surové odpovědi...');
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error('[SERVER-CHYBA] V odpovědi od AI nebyl nalezen žádný JSON objekt.');
            throw new Error('Nepodařilo se najít validní JSON v odpovědi od AI.');
        }
        
        const jsonText = jsonMatch[0];
        console.log('[SERVER-INFO] JSON objekt nalezen. Provádím parsování...');
        
        const parsedResult = JSON.parse(jsonText);
        
        // Získat usage metriky z AI odpovědi
        const usage = result.response.usageMetadata || {};
        
        console.log('[SERVER-ÚSPĚCH] Report úspěšně vygenerován a zpracován. Odesílám klientovi.');
        console.log(`[SERVER-INFO] Usage: ${usage.promptTokenCount || 0} prompt + ${usage.candidatesTokenCount || 0} completion = ${usage.totalTokenCount || 0} total tokens`);
        
        // Zalogovat AI usage pro tracking nákladů
        await logAIUsage(
            selectedModel,
            usage.promptTokenCount || 0,
            usage.candidatesTokenCount || 0,
            usage.totalTokenCount || 0,
            'report-generation'
        );
        
        res.json({ 
            result: parsedResult,
            usage: {
                promptTokens: usage.promptTokenCount || 0,
                completionTokens: usage.candidatesTokenCount || 0,
                totalTokens: usage.totalTokenCount || 0
            }
        });

    } catch (error) {
        console.error('\n--- [SERVER-KRITICKÁ CHYBA] Došlo k chybě během generování reportu ---');
        console.error('CHYBOVÁ HLÁŠKA:', error.message);
        // Pokud je k dispozici, zalogujeme i stack trace pro lepší ladění
        if (error.stack) {
            console.error('STACK TRACE:', error.stack);
        }
        // Zalogujeme také doplňující info, pokud existuje (např. z odpovědi od Google AI)
        if (error.response && error.response.data) {
            console.error('DETAIL CHYBY (OD API):', JSON.stringify(error.response.data, null, 2));
        }
        console.log('--- Konec chybového hlášení ---\n');

        res.status(500).json({ 
            error: 'Došlo k chybě při generování AI reportu.',
            details: error.message 
        });
    }
});

// --- PDF Generování pomocí Puppeteer (Best Practice) ---
app.post('/api/generate-pdf', async (req, res) => {
    console.log('\n[SERVER-PDF] Zahájení generování PDF pomocí Puppeteer');
    
    try {
        const { html, options = {} } = req.body;
        
        if (!html) {
            return res.status(400).json({ error: 'HTML content je povinný' });
        }

        // Spustit headless Chrome
        console.log('[SERVER-PDF] Spouštění Puppeteer...');
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        
        // Nastavit content
        console.log('[SERVER-PDF] Načítání HTML obsahu...');
        await page.setContent(html, {
            waitUntil: 'networkidle0' // Počkat na všechny zdroje
        });

        // Generovat PDF s A4 rozměry
        console.log('[SERVER-PDF] Generování PDF...');
        const pdfBuffer = await page.pdf({
            format: 'A4',
            margin: {
                top: '10mm',
                right: '6mm',
                bottom: '10mm',
                left: '6mm'
            },
            printBackground: true, // Zachovat barvy a pozadí
            preferCSSPageSize: false, // Použít A4 formát
            ...options // Povolit custom options z requestu
        });

        await browser.close();
        console.log('[SERVER-PDF] PDF úspěšně vygenerováno');

        // Vrátit PDF jako buffer
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="report.pdf"');
        res.send(pdfBuffer);

    } catch (error) {
        console.error('[SERVER-PDF-CHYBA]', error);
        res.status(500).json({ 
            error: 'Došlo k chybě při generování PDF',
            details: error.message 
        });
    }
});

// --- Fallback & Spuštění Serveru ---
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build', 'index.html'));
});
server.listen(PORT, () => {
  console.log(`[SERVER] HTTP a WebSocket server běží na portu ${PORT}`);
});
