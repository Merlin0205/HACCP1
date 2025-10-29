# AuditFlow - Aplikace pro HACCP Audity

**Verze dokumentace:** 2.0  
**Poslední aktualizace:** 28. října 2025

---

## 🚀 Spuštění Aplikace

Aplikace se skládá ze dvou částí: **backend serveru** a **frontend aplikace**, které musí běžet současně.

### Prerekvizity

1. **Node.js** (verze 18 nebo vyšší)
2. **npm** (součást Node.js)
3. **Google Gemini API klíč** (pro AI funkce)

### Instalace Závislostí

```bash
# Instalace závislostí pro frontend
npm install

# Instalace závislostí pro backend
cd server
npm install
cd ..
```

### Konfigurace Prostředí

Vytvořte soubor `.env` v **kořenovém adresáři** projektu s následujícím obsahem:

```env
# Port pro backend server (výchozí: 9002)
PORT=9002

# Google Gemini API klíč
VITE_GEMINI_API_KEY=váš_api_klíč_zde

# Názvy modelů pro různé AI úkoly
VITE_MODEL_REPORT_GENERATION=gemini-1.5-flash
VITE_MODEL_AUDIO_TRANSCRIPTION=gemini-1.5-flash
VITE_MODEL_IMAGE_ANALYSIS=gemini-1.5-flash
VITE_MODEL_TEXT_GENERATION=gemini-1.5-flash
```

### Spuštění

**Varianta 1: Dva samostatné terminály (doporučeno pro vývoj)**

```bash
# Terminál 1 - Backend server
node server/index.js

# Terminál 2 - Frontend vývojový server
npm run dev
```

**Varianta 2: Build a produkční režim**

```bash
# Build frontend aplikace
npm run build

# Spuštění serveru (obsluhuje i statické soubory)
node server/index.js
```

Aplikace bude dostupná na:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:9002
- **WebSocket:** ws://localhost:9002

---

## 📋 O Aplikaci

**AuditFlow** je komplexní webová aplikace určená pro provádění hygienických HACCP auditů v potravinářských provozovnách. Aplikace podporuje celý workflow od správy zákazníků, přes provádění auditů s hlasovým přepisem, až po automatické generování profesionálních protokolů pomocí umělé inteligence.

### Hlavní Funkce

- ✅ **Správa zákazníků** - Evidence provozoven a jejich údajů
- ✅ **Konfigurovatelné audity** - Administrátorské rozhraní pro úpravu kontrolních otázek
- ✅ **Hlasový přepis** - Diktování neshod pomocí mikrofonu s AI přepisem
- ✅ **Fotodokumentace** - Přikládání fotografií k neshodám
- ✅ **AI generované reporty** - Automatické vytváření profesionálních závěrů
- ✅ **Historie auditů** - Uchovávání všech provedených auditů s možností jejich prohlížení
- ✅ **Export a tisk** - Uložení reportů do PDF

---

## 🏗️ Architektura Aplikace

### Technologický Stack

**Frontend:**
- **React 19.2.0** - UI knihovna
- **TypeScript 5.8.2** - Typová bezpečnost
- **Vite 6.2.0** - Build nástroj a dev server
- **TailwindCSS** - Styling (inline v komponentách)

**Backend:**
- **Node.js** + **Express.js** - HTTP server
- **WebSocket (ws)** - Real-time komunikace pro streaming
- **Google Generative AI SDK** - Integrace s Gemini API
- **dotenv** - Správa proměnných prostředí

**Persistence:**
- **JSON soubory** - Server-side ukládání (server/db/)
  - `appData.json` - Data zákazníků, auditů a reportů
  - `auditStructure.json` - Struktura kontrolních otázek

### Architektura Složek

```
HACCP1/
├── components/          # React komponenty
│   ├── AdminScreen.tsx         # Správa struktury auditu
│   ├── AuditChecklist.tsx      # Provádění auditu
│   ├── CustomerDashboard.tsx   # Dashboard zákazníků
│   ├── CustomerForm.tsx        # Formulář pro zákazníka
│   ├── AuditList.tsx           # Seznam auditů zákazníka
│   ├── HeaderForm.tsx          # Formulář záhlaví auditu
│   ├── ReportView.tsx          # Zobrazení reportu
│   ├── NonComplianceForm.tsx   # Formulář neshody
│   ├── AuditItemModal.tsx      # Dialog pro audit položku
│   └── icons/                  # SVG ikony
├── hooks/               # Custom React hooks
│   └── useAudioRecorder.ts     # Hook pro nahrávání a přepis audia
├── src/
│   ├── components/
│   │   └── SummaryReport.tsx   # Komponenta souhrnu reportu
│   └── geminiService.ts        # Služba pro Gemini API
├── server/              # Backend server
│   ├── index.js                # Express server s WebSocket
│   └── db/                     # JSON databáze
│       ├── appData.json
│       └── auditStructure.json
├── types.ts             # TypeScript definice typů
├── constants.ts         # Výchozí struktura auditu
├── App.tsx              # Hlavní komponenta aplikace
├── index.tsx            # Entry point
├── vite.config.ts       # Vite konfigurace
└── package.json         # Závislosti projektu
```

---

## 🧠 Business Logika

### Workflow Aplikace

```
1. Zákazník (Customer)
   ↓
2. Audity zákazníka (AuditList)
   ↓
3. Nový audit → Vyplnění záhlaví (HeaderForm)
   ↓
4. Průběh auditu - kontrolní body (AuditChecklist)
   ↓
5. Uzavření auditu
   ↓
6. Generování reportu (AI na serveru)
   ↓
7. Zobrazení a tisk reportu (ReportView)
```

### Stavy Aplikace (AppState)

Aplikace používá stavový stroj s následujícími stavy:

1. **CUSTOMER_DASHBOARD** - Přehled všech zákazníků
2. **ADD_CUSTOMER** / **EDIT_CUSTOMER** - Formulář pro zákazníka
3. **AUDIT_LIST** - Seznam auditů konkrétního zákazníka
4. **HEADER_FORM** - Vyplnění základních údajů auditu
5. **AUDIT_IN_PROGRESS** - Provádění auditu (kontrolní checklist)
6. **REPORT_VIEW** - Zobrazení vygenerovaného reportu
7. **ADMIN** - Administrátorské rozhraní pro správu kontrolních otázek

### Stavy Auditu (AuditStatus)

- **NOT_STARTED** (Nový) - Audit vytvořen, pouze s vyplněným záhlavím
- **IN_PROGRESS** (Probíhá) - Audit se provádí, lze editovat odpovědi
- **LOCKED** (Uzamčen) - Audit dokončen, nelze měnit, existuje report

### Stavy Reportu (ReportStatus)

- **PENDING** (Čeká na generování) - Report čeká ve frontě
- **GENERATING** (Generuje se) - Backend vytváří report pomocí AI
- **DONE** (Hotovo) - Report úspěšně vygenerován
- **ERROR** (Chyba) - Při generování došlo k chybě

### Datový Model

**Customer** (Zákazník)
```typescript
{
  id: string;
  operator_name: string;         // Název firmy
  operator_address: string;      // Sídlo firmy
  operator_ico: string;          // IČO
  operator_statutory_body: string; // Statutární orgán
  operator_phone: string;
  operator_email: string;
  premise_name: string;          // Název provozovny
  premise_address: string;       // Adresa provozovny
  premise_responsible_person: string;
  premise_phone: string;
  premise_email: string;
}
```

**Audit**
```typescript
{
  id: string;
  customerId: string;            // Vazba na zákazníka
  status: AuditStatus;
  createdAt: string;             // ISO timestamp
  completedAt?: string;          // ISO timestamp
  headerValues: AuditHeaderValues; // Vyplněné údaje ze záhlaví
  answers: {
    [itemId: string]: {
      compliant: boolean;        // Vyhovuje / Nevyhovuje
      nonComplianceData?: NonComplianceData[]; // Detaily neshod
    }
  };
}
```

**NonComplianceData** (Neshoda)
```typescript
{
  location: string;              // Místo neshody
  finding: string;               // Popis zjištění
  recommendation: string;        // Doporučené opatření
  photos: PhotoWithAnalysis[];   // Fotografie (base64)
}
```

**Report**
```typescript
{
  id: string;
  auditId: string;               // Vazba na audit
  status: ReportStatus;
  createdAt: string;
  generatedAt?: string;
  reportData?: ReportData;       // AI vygenerovaný obsah
  error?: string;
  usage?: any;                   // Statistiky použití AI
}
```

---

## ⚙️ Technická Implementace

### Frontend Architektura

**State Management**
- Centralizovaný state v `App.tsx` pomocí React hooks
- State obsahuje: customers, audits, reports, auditStructure
- Změny stavu se automaticky propagují do dětských komponent
- Synchronizace se serverem pomocí useEffect hooks

**Komunikace s Backend**

```typescript
// REST API volání
GET  /api/app-data              // Načtení dat (customers, audits, reports)
POST /api/app-data              // Uložení dat
GET  /api/audit-structure       // Načtení struktury auditu (nepoužívá se)
POST /api/audit-structure       // Uložení struktury auditu (nepoužívá se)
POST /api/generate-report       // Generování AI reportu

// WebSocket komunikace (pro streaming audio přepisu)
ws://localhost:9002
```

**Vite Konfigurace**
- Dev server běží na portu 3000
- Proxy pro `/api` volání směruje na backend (port 9002)
- Hot Module Replacement (HMR) pro rychlý vývoj
- Environment proměnné prefixované `VITE_` jsou dostupné ve frontendové části

### Backend Architektura

**Express Server** (server/index.js)
- HTTP server pro REST API
- WebSocket server pro real-time audio streaming
- Middleware: express.json s limitem 50MB (pro fotografie v base64)
- Statické soubory: Obsluhuje build frontend aplikace

**Endpoints Detail**

1. **GET /api/app-data**
   - Načte data ze souboru `server/db/appData.json`
   - Vrací: `{ customers: [], audits: [], reports: [] }`
   - Při chybě nebo neexistujícím souboru vrací prázdné pole

2. **POST /api/app-data**
   - Přijímá: `{ customers, audits, reports }`
   - Uloží data do `server/db/appData.json`
   - Auto-save při každé změně na frontendu

3. **POST /api/generate-report**
   - Přijímá: `{ auditData, auditStructure }`
   - Vytvoří AI prompt s detaily auditu
   - Volá Gemini API pro generování strukturovaného JSON reportu
   - Vrací: `{ result: ReportData, usage: UsageMetadata }`

**WebSocket Stream**
- Klient pošle `{ type: 'startStream' }` pro zahájení session
- Klient streamuje audio chunks: `{ type: 'audioData', chunk: ArrayBuffer }`
- Server posílá partial transcription: `{ type: 'partialTranscription', text: string }`
- Používá se v `useAudioRecorder` hooku

### AI Integrace

**Gemini API Použití**

1. **Audio Transcription** (geminiService.ts)
   ```
   model: VITE_MODEL_AUDIO_TRANSCRIPTION
   input: Audio blob (webm format)
   output: Přepsaný text
   ```

2. **Image Analysis** (připraveno, v současnosti nepoužívá)
   ```
   model: VITE_MODEL_IMAGE_ANALYSIS
   input: Fotografie (base64)
   output: Popis a identifikovaná rizika
   ```

3. **Report Generation** (server/index.js)
   ```
   model: VITE_MODEL_REPORT_GENERATION
   input: Komplexní prompt s výsledky auditu
   output: Strukturovaný JSON report
   ```

**AI Prompt pro Report**
- Obsahuje základní údaje auditu (headerValues)
- Detailní výsledky po sekcích (Vyhovuje/Nevyhovuje)
- Pro každou neshodu: místo, zjištění, doporučení
- AI vrací JSON se souhrnem, klíčovými zjištěními a doporučeními pro každou sekci

### Klíčové Komponenty

**1. App.tsx** - Hlavní orchestrátor
- Správa globálního stavu
- Načítání a ukládání dat ze serveru
- Background generování reportů (useEffect hook)
- Routing mezi obrazovkami podle AppState

**2. CustomerDashboard.tsx**
- Zobrazení seznamu zákazníků
- CRUD operace na zákaznících
- Navigace na audity zákazníka

**3. AuditList.tsx**
- Zobrazení auditů konkrétního zákazníka
- Indikace stavu auditu a reportu
- Vytvoření nového auditu
- Odemknutí uzamčeného auditu (pro opravu)

**4. AuditChecklist.tsx**
- Grid zobrazení kontrolních položek po sekcích
- Vizuální indikace (zelená/červená) pro Vyhovuje/Nevyhovuje
- Sidebar s přehledem neshod
- Otevírání AuditItemModal pro detail

**5. AuditItemModal.tsx**
- Dialog pro vyhodnocení jedné kontrolní položky
- Tlačítka "Vyhovuje" / "Neshoda"
- Při neshodě zobrazí NonComplianceForm

**6. NonComplianceForm.tsx**
- Formulář pro detail neshody (místo, zjištění, doporučení)
- Textové pole s tlačítkem mikrofonu pro hlasový přepis
- Upload fotografií
- useAudioRecorder hook pro nahrávání a přepis

**7. ReportView.tsx**
- Zobrazení různých stavů reportu (GENERATING, ERROR, DONE)
- Kompletní report s AI vygenerovaným obsahem
- Tlačítko pro tisk/export do PDF
- Tabulka všech kontrolovaných položek
- Detail všech neshod včetně fotografií

**8. AdminScreen.tsx**
- Správa struktury auditu (sekce a položky)
- Drag-and-drop pro změnu pořadí
- Zapínání/vypínání sekcí a položek
- Editace názvů a popisů
- Přidávání nových sekcí a položek

### Custom Hooks

**useAudioRecorder.ts**
```
Poskytuje funkcionalitu pro:
- Přístup k mikrofonu (MediaRecorder API)
- Nahrávání zvuku (audio/webm)
- Konverze na base64
- Odeslání na Gemini API
- Callback s přepsaným textem
- Logování všech kroků
```

---

## 🔄 Datový Tok

### Scénář: Vytvoření a dokončení auditu

```
1. Uživatel vybere zákazníka
   → setActiveCustomerId()
   → setAppState(AUDIT_LIST)

2. Vytvoří nový audit
   → Předvyplní headerValues z dat zákazníka
   → setAppState(HEADER_FORM)

3. Vyplní záhlaví auditu
   → Vytvoří se nový Audit objekt
   → audits state se aktualizuje
   → POST /api/app-data (auto-save)
   → setAppState(AUDIT_IN_PROGRESS)

4. Prochází kontrolní body
   → Klikne na položku → AuditItemModal
   → Označí "Neshoda" → NonComplianceForm
   → Nahraje fotky, nadiktuje text mikrofonem
   → onAnswerUpdate() → aktualizace audit.answers
   → POST /api/app-data (auto-save)

5. Dokončí audit
   → onComplete()
   → audit.status = LOCKED
   → Vytvoří se Report objekt (status: PENDING)
   → POST /api/app-data
   → setAppState(REPORT_VIEW)

6. Background generování (useEffect v App.tsx)
   → Detekuje report se status PENDING
   → report.status = GENERATING
   → POST /api/generate-report { auditData, auditStructure }
   → Backend volá Gemini API
   → Backend vrací ReportData
   → report.status = DONE, report.reportData = AI output
   → POST /api/app-data

7. Zobrazení reportu
   → ReportView načte report.reportData
   → Zobrazí AI vygenerovaný obsah
   → Možnost tisku/exportu
```

---

## 📊 Plán Refaktorizace

### 🔴 Kritické Problémy

**1. Velikost appData.json (4+ MB)**
- ❌ **Problém:** Soubor obsahuje všechna data včetně fotografií v base64
- ❌ **Dopad:** Pomalé načítání, paměťové nároky, riziko ztráty dat
- ✅ **Řešení:**
  - **Databáze:** Migrace na SQLite nebo PostgreSQL
  - **File Storage:** Oddělené ukládání fotografií jako soubory (static/uploads/)
  - **Chunking:** Načítání dat po částech (pagination na zákaznících/auditech)
  - **Compression:** Komprese fotografií před uložením (Sharp library)

**2. Chybějící Error Handling**
- ❌ **Problém:** Nedostatečné ošetření chyb při síťových voláních
- ❌ **Dopad:** Aplikace může "zamrznout" při výpadku sítě nebo serveru
- ✅ **Řešení:**
  - Implementovat try-catch bloky všude kolem fetch volání
  - Přidat retry logiku pro kritické operace
  - Toast notifikace pro uživatele při chybách (react-toastify)
  - Offline mode s queue pro odložené operace

**3. Absence Autentizace a Autorizace**
- ❌ **Problém:** Žádná ochrana dat, kdokoliv může přistupovat k API
- ❌ **Dopad:** Bezpečnostní riziko, žádná evidence uživatelů
- ✅ **Řešení:**
  - Implementovat JWT authentication
  - Role-based access control (Admin vs. Auditor)
  - Per-user data izolace
  - Passport.js nebo Auth0 integrace

**4. Neefektivní Re-renders**
- ❌ **Problém:** Každá změna customers/audits/reports způsobí re-render celé App
- ❌ **Dopad:** Pomalý UI při větším množství dat
- ✅ **Řešení:**
  - React.memo pro drahé komponenty
  - Přesunout state do Context API s více granulárními contexts
  - useMemo a useCallback strategicky
  - Virtual scrolling pro dlouhé seznamy (react-window)

### 🟡 Významná Zlepšení

**5. State Management Scalability**
- 🔶 **Problém:** Celý state v App.tsx, prop drilling
- 🔶 **Dopad:** Těžká údržba při růstu aplikace
- ✅ **Řešení:**
  - **Context API** pro sdílení stavu (CustomerContext, AuditContext)
  - **Nebo Redux/Zustand** pro komplexnější state management
  - Custom hooks pro business logiku (useCustomers, useAudits)

**6. API Layer Abstrakce**
- 🔶 **Problém:** Fetch volání rozházená po komponentách
- ✅ **Řešení:**
  - Vytvořit `api/` folder s dedicated službami
  - `api/customers.ts`, `api/audits.ts`, `api/reports.ts`
  - Centrální error handling a retry logika
  - React Query nebo SWR pro caching a synchronizaci

**7. Testing**
- 🔶 **Problém:** Žádné testy
- ✅ **Řešení:**
  - **Unit testy:** Vitest pro utility funkce a hooks
  - **Component testy:** React Testing Library
  - **E2E testy:** Playwright pro kritické workflows
  - **API testy:** Supertest pro backend endpoints
  - CI/CD pipeline s automatickým testováním

**8. Validace Dat**
- 🔶 **Problém:** Chybí validace vstupu od uživatele
- ✅ **Řešení:**
  - Zod nebo Yup schema pro všechny formuláře
  - Backend validace na API endpointech
  - Unified error messages

**9. Logging a Monitoring**
- 🔶 **Problém:** Jen console.log, žádné centrální logování
- ✅ **Řešení:**
  - Winston nebo Pino pro backend logging
  - Sentry nebo LogRocket pro error tracking
  - Performance monitoring (Web Vitals)

**10. TypeScript Konzistence**
- 🔶 **Problém:** Některé typy jsou `any`, nekonzistentní naming
- ✅ **Řešení:**
  - Odstranit všechny `any` typy
  - Strict mode v tsconfig.json
  - Unified naming conventions

### 🟢 Nice-to-Have Vylepšení

**11. Internationalizace (i18n)**
- Podpora více jazyků (čeština, angličtina)
- react-i18next library

**12. Dark Mode**
- Témování aplikace
- Uložení preference uživatele

**13. Progressive Web App (PWA)**
- Offline funkčnost
- Instalovatelná aplikace
- Service Workers

**14. Export Možnosti**
- Excel export seznamu auditů
- CSV export
- Hromadný export reportů

**15. Audit Templates**
- Možnost uložit vlastní šablony auditů
- Sdílení šablon mezi uživateli

**16. Notifikace**
- Email notifikace po dokončení auditu
- Push notifikace při dokončení AI generování

**17. Statistiky a Analytics**
- Dashboard s přehledem auditů
- Grafy trendů neshod
- Export statistik

---

## 🚀 Prioritizovaný Implementační Plán

### Fáze 1: Stabilita a Bezpečnost (1-2 měsíce)
1. Migrace na databázi (SQLite/PostgreSQL)
2. Separace fotografií do file storage
3. Error handling a retry logika
4. Autentizace a autorizace
5. Unit a integrační testy

### Fáze 2: Optimalizace a Údržba (1 měsíc)
6. State management refaktoring (Context API)
7. API layer abstrakce
8. Performance optimalizace
9. TypeScript strict mode
10. Logging a monitoring

### Fáze 3: Feature Enhancements (ongoing)
11. i18n podpora
12. PWA funkčnost
13. Export možnosti
14. Statistiky a analytics
15. Audit templates

---

## 📝 Závěr

AuditFlow je funkční prototyp s solidní business logikou a moderním tech stackem. Hlavní výzvy jsou v oblasti **scalability**, **bezpečnosti** a **data persistence**. Implementací navrženého plánu refaktorizace se aplikace stane produkčně připravenou pro reálné nasazení.

**Klíčové silné stránky:**
- ✅ Intuitivní UX
- ✅ AI integrace pro produktivitu
- ✅ Kompletní workflow pokrytí
- ✅ TypeScript pro type safety

**Klíčové oblasti ke zlepšení:**
- ❌ Databáze místo JSON souborů
- ❌ Autentizace a bezpečnost
- ❌ Error handling
- ❌ Testing coverage
