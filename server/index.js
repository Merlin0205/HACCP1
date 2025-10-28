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
                
                // NEBLOKUJÍCÍ ZPRACOVÁNÍ: Odesíláme data a na odpověď nečekáme,
                // zpracuje se v .then() bloku, zatímco message handler může přijímat další data.
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

// --- Klasické API Endpoints (zůstávají beze změny) ---
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
app.post('/api/generate-report', async (req, res) => {
    if (!API_KEY || !REPORT_MODEL_NAME) {
        return res.status(500).json({ error: 'API klíč nebo název modelu pro reporty chybí.' });
    }
    try {
        const { auditData, auditStructure } = req.body;
        if (!auditData || !auditStructure) {
            return res.status(400).json({ error: 'Chybějící data auditu nebo struktura.' });
        }
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: REPORT_MODEL_NAME });
        const prompt = `Jsi expert na hygienu potravin a HACCP...`; // Váš prompt
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const jsonText = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
        res.json({ result: JSON.parse(jsonText) });
    } catch (error) {
        console.error('Error generating AI report:', error);
        res.status(500).json({ error: 'Došlo k chybě při generování reportu: ' + error.message });
    }
});


// --- Fallback & Spuštění Serveru ---
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build', 'index.html'));
});
server.listen(PORT, () => {
  console.log(`[SERVER] HTTP a WebSocket server běží na portu ${PORT}`);
});
