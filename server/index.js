const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs').promises;
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- Konfigurace ---
const PORT = process.env.PORT || 9002;
const API_KEY = process.env.VITE_GEMINI_API_KEY;
const REPORT_MODEL_NAME = process.env.VITE_MODEL_REPORT_GENERATION;
const AUDIO_MODEL_NAME = process.env.VITE_MODEL_AUDIO_TRANSCRIPTION;

// --- Aplikace & Server ---
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// --- Middleware ---
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../build')));

// --- Datové soubory ---
const DATA_FILE = path.join(__dirname, 'db', 'appData.json');
const AUDIT_STRUCTURE_FILE = path.join(__dirname, 'db', 'auditStructure.json');

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
                    for await (const chunk of result.stream) {
                        if (chunk.candidates?.[0]?.content?.parts?.[0]?.text) {
                           const text = chunk.candidates[0].content.parts[0].text;
                           if (ws.readyState === WebSocket.OPEN) {
                               ws.send(JSON.stringify({ type: 'partialTranscription', text }));
                           }
                        }
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
    await fs.writeFile(DATA_FILE, JSON.stringify(req.body, null, 2), 'utf8');
    res.status(200).send('Data saved');
  } catch (error) {
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

const createReportPrompt = (auditData, auditStructure) => {
    const formatNonCompliance = (ncData) => `
        - Místo: ${ncData.location || 'Nespecifikováno'}
        - Zjištění: ${ncData.finding || 'Nespecifikováno'}
        - Opatření: ${ncData.recommendation || 'Nespecifikováno'}
    `.trim();

    const auditSummary = auditStructure.audit_sections
        .filter(section => section.active)
        .map(section => {
            const sectionItems = section.items
                .filter(item => item.active && auditData.answers[item.id])
                .map(item => {
                    const answer = auditData.answers[item.id];
                    if (answer.compliant) {
                        return `  - ${item.title}: Vyhovuje`;
                    } else {
                        const nonCompliances = answer.nonComplianceData.map(formatNonCompliance).join('\n    ');
                        return `  - ${item.title}: NEVYHOVUJE\n    Neshody:\n    ${nonCompliances}`;
                    }
                }).join('\n');
            return `Sekce: ${section.title}\n${sectionItems}`;
        }).join('\n\n');

    return `
    Jsi expert na hygienu potravin a HACCP v České republice a řídíš se výhradně platnou legislativou ČR a příslušnými nadřazenými předpisy Evropské unie. Tvým úkolem je vygenerovat strukturovaný report z auditu ve formátu JSON.
    Na základě následujících dat z auditu vytvoř obsah pro report.

    ### Základní informace o auditu:
    ${JSON.stringify(auditData.headerValues, null, 2)}

    ### Detailní výsledky auditu po sekcích:
    ${auditSummary}

    ### Požadovaný výstupní formát:
    Vrať POUZE a jedině validní JSON objekt bez jakéhokoliv dalšího textu nebo formátování (žádné markdown \`\`\`json na začátku nebo na konci).
    JSON objekt musí mít následující strukturu:
    {
      "summary": {
        "title": "Souhrnné hodnocení auditu",
        "evaluation_text": "Stručné slovní zhodnocení celkového stavu provozovny na základě auditu. Zmiň klíčové oblasti, které jsou v pořádku, a ty, které vyžadují pozornost. Měl by to být odstavec textu.",
        "key_findings": [
          "Klíčové pozitivní zjištění 1",
          "Další pozitivní zjištění"
        ],
        "key_recommendations": [
          "Nejdůležitější doporučení ke zlepšení 1",
          "Další důležité doporučení"
        ]
      },
      "sections": [
        {
          "section_title": "Název první sekce auditu (např. Infrastruktura)",
          "evaluation": "Slovní zhodnocení této konkrétní sekce. Popiš, co bylo kontrolováno a jaké jsou hlavní závěry pro tuto oblast. Měl by to být odstavec textu.",
          "non_compliances": [
            {
              "item_title": "Název kontrolované položky (např. 'Stěny')",
              "location": "Místo neshody (např. 'Kuchyň')",
              "finding": "Detailní popis zjištěné neshody.",
              "recommendation": "Navrhované nápravné opatření."
            }
          ]
        }
      ]
    }

    ### Důležité pokyny:
    - Pro každou sekci z auditu vytvoř odpovídající objekt v poli "sections".
    - Pokud v sekci není žádná neshoda, pole "non_compliances" pro danou sekci musí být prázdné ([]).
    - Texty generuj v českém jazyce, profesionálně, jasně a stručně.
    - V "summary" poskytni celkový pohled na stav provozovny.
    - Ujisti se, že výstup je POUZE validní JSON.
    `;
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
        
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: REPORT_MODEL_NAME });
        const prompt = createReportPrompt(auditData, auditStructure);

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
        
        console.log('[SERVER-ÚSPĚCH] Report úspěšně vygenerován a zpracován. Odesílám klientovi.');
        res.json({ result: parsedResult });

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


// --- Fallback & Spuštění Serveru ---
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build', 'index.html'));
});
server.listen(PORT, () => {
  console.log(`[SERVER] HTTP a WebSocket server běží na portu ${PORT}`);
});
