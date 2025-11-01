# 🚀 AuditFlow - Refaktorovaná Aplikace

## ⚠️ DŮLEŽITÉ - První Spuštění

Po refaktorizaci je třeba **restartovat oba servery** (frontend i backend).

---

## 📋 Quick Start

### 1. Instalace
```bash
# Hlavní projekt
npm install

# Backend server
cd server
npm install
cd ..
```

### 2. Konfigurace .env
Ujistěte se, že máte soubor `.env` v kořenovém adresáři:
```env
PORT=9002
VITE_GEMINI_API_KEY=váš_api_klíč_zde
VITE_MODEL_REPORT_GENERATION=gemini-1.5-flash
VITE_MODEL_AUDIO_TRANSCRIPTION=gemini-1.5-flash
VITE_MODEL_IMAGE_ANALYSIS=gemini-1.5-flash
VITE_MODEL_TEXT_GENERATION=gemini-1.5-flash
```

### 3. Spuštění
```bash
# Terminál 1 - Backend
node server/index.js

# Terminál 2 - Frontend (v novém terminálu)
npm run dev
```

Aplikace poběží na:
- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:9002

---

## ✨ Co Je Nového

### 🎯 Hlavní Vylepšení

1. **API Layer s Retry Logikou**
   - Automatický retry při chybách (3 pokusy)
   - Timeout management
   - Centralizované error handling

2. **Toast Notifikace**
   - Zelený toast při úspěchu
   - Červený toast při chybě
   - Auto-dismiss po 5 sekundách

3. **Error Boundary**
   - Zachytává React chyby
   - User-friendly error screen
   - Možnost resetu aplikace

4. **Custom Hooks**
   - `useAppData` - data management
   - `useReportGenerator` - AI generování

5. **Lepší UX**
   - Debounced auto-save (500ms)
   - Loading states
   - Error messages s detaily

---

## 📁 Nová Struktura

```
HACCP1/
├── api/                      # 🆕 API layer
│   ├── client.ts            # Fetch wrapper s retry
│   ├── appData.ts           # App data API
│   └── reports.ts           # Reports API
├── utils/                    # 🆕 Utility funkce
│   ├── errorHandler.ts      # Error handling
│   └── toast.ts             # Toast systém
├── hooks/                    # Custom hooks
│   ├── useAppData.ts        # 🆕 Data management
│   ├── useReportGenerator.ts # 🆕 Report generování
│   └── useAudioRecorder.ts
├── components/
│   ├── ErrorBoundary.tsx    # 🆕 Error boundary
│   ├── ToastContainer.tsx   # 🆕 Toast UI
│   └── ...ostatní komponenty
├── OLD_TO_BE_DELETED/        # 🆕 Zastaralé soubory
│   ├── App.old.tsx
│   ├── POPIS_APLIKACE_stary.md
│   └── ...další
├── App.tsx                   # ♻️ Refaktorováno
├── POPIS_APLIKACE.md         # 📝 Aktualizovaná dokumentace
└── REFAKTORIZACE.md          # 📝 Changelog
```

---

## 🔧 Použití Nových Features

### Toast Notifikace
```typescript
import { toast } from './utils/toast';

// Různé typy toastů
toast.success('Operace úspěšná!');
toast.error('Došlo k chybě');
toast.warning('Varování');
toast.info('Informace');

// S akcí
toast.show({
  message: 'Soubor smazán',
  type: 'warning',
  action: () => restoreFile(),
  actionLabel: 'Obnovit'
});
```

### API Volání
```typescript
import { api } from './api/client';

// GET request
const data = await api.get('/api/endpoint');

// POST request s retry
const result = await api.post('/api/endpoint', { data }, {
  retries: 5,
  retryDelay: 2000,
  timeout: 60000
});
```

### Error Handling
```typescript
import { handleError } from './utils/errorHandler';
import { toast } from './utils/toast';

try {
  await someOperation();
} catch (error) {
  const errorInfo = handleError(error);
  toast.error(errorInfo.message);
  console.error(errorInfo.details);
}
```

---

## 🐛 Troubleshooting

### Aplikace se nespustí
1. Zkontrolujte, že běží backend server (`node server/index.js`)
2. Ujistěte se, že máte nainstalované závislosti (`npm install`)
3. Zkontrolujte `.env` soubor

### Toast se nezobrazuje
- `ToastContainer` musí být v `App.tsx` (již je implementováno)

### Data se neukládají
1. Zkontrolujte konzoli prohlížeče (F12)
2. Zkontrolujte, že backend běží
3. Zkuste manuálně zavolat reload: klikněte na tlačítko "Obnovit data"

### Chyba při generování reportu
1. Zkontrolujte `VITE_GEMINI_API_KEY` v `.env`
2. Ujistěte se, že máte kredity na Gemini API
3. Zkontrolujte konzoli serveru pro detaily

---

## 📚 Dokumentace

- **`POPIS_APLIKACE.md`** - Kompletní dokumentace aplikace
- **`REFAKTORIZACE.md`** - Detaily o změnách v refaktorizaci
- **`README_REFAKTORIZACE.md`** - Tento soubor (quick start)

---

## 🔜 Další Plánované Vylepšení

### Fáze 2 (1 měsíc)
- [ ] Migrace na PostgreSQL/SQLite
- [ ] Oddělení fotografií do file storage
- [ ] Context API pro state management
- [ ] TypeScript strict mode

### Fáze 3 (ongoing)
- [ ] Autentizace (JWT)
- [ ] Unit a E2E testy
- [ ] i18n (čeština, angličtina)
- [ ] PWA (offline mode)
- [ ] Export do Excel/CSV

---

## 💾 Zálohování Dat

**DŮLEŽITÉ:** Data jsou uložena v `server/db/appData.json` (4+ MB)

### Doporučená záloha:
```bash
# Vytvoření zálohy
copy server\db\appData.json server\db\appData.backup.json

# Nebo s datem
copy server\db\appData.json server\db\appData_backup_%date:~-4,4%%date:~-7,2%%date:~-10,2%.json
```

---

## 🤝 Contributing

Při dalším vývoji dodržujte:
1. Používejte nový API layer (`api/client.ts`)
2. Všechny chyby handlujte přes `handleError()`
3. Používejte toast notifikace pro user feedback
4. Vytvářejte custom hooks pro složitější logiku
5. Dokumentujte změny v kódu

---

## 📞 Pomoc

Máte problém? Postupujte takto:
1. Zkontrolujte tuto dokumentaci
2. Podívejte se do konzole prohlížeče (F12) a serveru
3. Zkontrolujte `REFAKTORIZACE.md` pro známé issues
4. Vytvořte issue s detailním popisem problému

---

**Verze:** 1.0 (Po refaktorizaci)  
**Datum:** 28. října 2025
