# AuditFlow - HACCP Asistent pro Interní Hygienické Audity

> **⚡ Refaktorovaná verze 1.0** - Vylepšený error handling, API layer, toast notifikace

Digitální asistent pro provádění a vyhodnocování interních hygienických auditů v potravinářských podnicích v souladu se systémem HACCP.

## 🚀 Quick Start

### 1. Instalace
```bash
npm install
cd server && npm install && cd ..
```

### 2. Konfigurace
Vytvořte soubor `.env` v kořenovém adresáři:
```env
PORT=9002
VITE_GEMINI_API_KEY=váš_api_klíč
VITE_MODEL_REPORT_GENERATION=gemini-1.5-flash
VITE_MODEL_AUDIO_TRANSCRIPTION=gemini-1.5-flash
```

### 3. Spuštění
```bash
# Terminál 1 - Backend
node server/index.js

# Terminál 2 - Frontend
npm run dev
```

Aplikace běží na **http://localhost:3000**

---

## 📚 Dokumentace

- **[README_REFAKTORIZACE.md](README_REFAKTORIZACE.md)** - Quick start po refaktorizaci
- **[POPIS_APLIKACE.md](POPIS_APLIKACE.md)** - Kompletní technická dokumentace
- **[REFAKTORIZACE.md](REFAKTORIZACE.md)** - Changelog a detaily změn

## ✨ Hlavní Funkce

- ✅ Správa zákazníků a auditů
- ✅ Hlasový přepis pomocí AI (Gemini)
- ✅ Fotodokumentace neshod
- ✅ Automatické generování profesionálních protokolů
- ✅ Export do PDF
- ✅ Toast notifikace a error handling
- ✅ Automatický retry při chybách

## 🛠️ Tech Stack

- **Frontend:** React 19.2 + TypeScript 5.8 + Vite 6.2
- **Backend:** Node.js + Express + WebSocket
- **AI:** Google Gemini API
- **Styling:** TailwindCSS (inline)

---

## 🔧 Pro Vývojáře

### Nová Struktura
```
api/          - API layer s retry logikou
utils/        - Error handling, toast systém
hooks/        - Custom hooks (useAppData, useReportGenerator)
components/   - React komponenty + ErrorBoundary + ToastContainer
```

### API Použití
```typescript
import { api } from './api';
const data = await api.get('/api/endpoint');
```

### Toast Notifikace
```typescript
import { toast } from './utils/toast';
toast.success('Hotovo!');
toast.error('Chyba!');
```

---

**Verze:** 1.0 (Refaktorováno 28.10.2025)
