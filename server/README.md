# PDF Generation Server

Samostatný Express server pro generování PDF z HTML pomocí Puppeteer.

## Instalace

```bash
cd server
npm install
```

## Spuštění

```bash
npm start
# nebo
node pdf-server.js
```

Server běží na `http://localhost:3001`

## Použití

### Health Check
```bash
curl http://localhost:3001/health
```

### Generování PDF
```bash
curl -X POST http://localhost:3001/api/generate-pdf \
  -H "Content-Type: application/json" \
  -d '{"html": "<html>...</html>", "title": "My Report"}' \
  --output report.pdf
```

## Poznámky

- Server musí běžet samostatně, než použijete PDF export ve V3 editoru
- Port 3001 musí být volný
- Puppeteer stáhne Chromium při první instalaci (~200MB)
