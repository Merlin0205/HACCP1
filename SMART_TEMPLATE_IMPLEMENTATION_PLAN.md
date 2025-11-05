# 📋 Detailní Plán Implementace Smart Template Report System

> **Datum:** 2025-01-XX  
> **Cíl:** Implementovat paralelní Smart Template systém vedle stávajícího Legacy systému generování reportů

---

## 🎯 SOUHRN PROJEKTU

### Cíl
Přidat nový systém generování reportů (Smart Template), který:
- ✅ Bude fungovat **paralelně** se stávajícím Legacy systémem
- ✅ Umožní **automatické generování layoutu** podle šablon (rules JSON)
- ✅ Umožní **WYSIWYG editaci** automaticky vytvořeného návrhu
- ✅ Uloží **finální verze** jako samostatné záznamy
- ✅ Podporuje **verzování** a **regeneraci** z nových šablon

### Základní principy
1. **Legacy systém zůstává beze změny** - žádné úpravy stávajícího kódu
2. **Smart systém je přidán vedle** - nové komponenty, nové služby, nová struktura Storage
3. **UI přepínač** - uživatel si může vybrat mezi Legacy a Smart módem
4. **Sdílená data** - oba systémy používají stejná audit data z Firestore

---

## 📊 ANALÝZA SOUČASNÉHO STAVU

### Legacy systém (co už existuje)

#### 1. Generování reportu
- **Funkce:** `functions/src/generateReport.ts` - Cloud Function `generateReport`
- **API:** `services/reports.ts` - `generateReport()`
- **Hook:** `hooks/useReportGenerator.ts` - automatické generování v pozadí
- **Proces:**
  1. Uživatel dokončí audit → automaticky se vytvoří `Report` s status `PENDING`
  2. `useReportGenerator` detekuje `PENDING` reporty a spustí generování
  3. Zavolá Cloud Function `generateReport` s `auditData` a `auditStructure`
  4. AI (Gemini) vygeneruje `ReportData` (JSON struktura)
  5. Report se uloží do Firestore s status `DONE`

#### 2. Zobrazení reportu
- **Komponenta:** `components/ReportView.tsx`
- **Zobrazuje:** Status (`PENDING`, `GENERATING`, `DONE`, `ERROR`)
- **Obsah:** `SummaryReportContent` komponenta (`src/components/SummaryReport.tsx`)
- **Export:** Tlačítko "Tisk / Uložit do PDF" → `window.print()`

#### 3. Editace reportu
- **Komponenta:** `components/ReportEditor.tsx`
- **Funkce:**
  - Editace textů neshod
  - Přeskupení obrázků (drag & drop)
  - AI layout suggestions
  - PDF export (window.print nebo Puppeteer)

#### 4. Ukládání dat
- **Firestore:** Collection `reports/{reportId}`
  ```typescript
  {
    id: string;
    auditId: string;
    userId: string;
    status: ReportStatus;
    reportData: ReportData;  // AI vygenerovaný obsah
    auditorSnapshot: AuditorInfo;
    versionNumber: number;
    isLatest: boolean;
    createdAt: string;
    generatedAt?: string;
  }
  ```
- **Storage:** `reports/{reportId}/pdf/{timestamp}.pdf` (volitelné)

#### 5. Typy
- **`types.ts`:** `Report`, `ReportData`, `ReportStatus`
- **`types/reportEditor.ts`:** `EditableNonCompliance`, `EditablePhoto`, `ReportLayout`

---

## 🏗️ ARCHITEKTURA NOVÉHO SYSTÉMU

### Struktura Storage (Firebase Storage)

```
reports/{reportId}/
├── legacy/
│   └── (stávající struktura - žádné změny)
│
└── smart/
    ├── templates/
    │   └── {templateId}/
    │       └── v{n}.json          # Pravidla šablony (layout rules)
    │
    ├── drafts/
    │   └── lastSmartDraft.json    # Pracovní návrh po auto-generaci
    │
    ├── finalVersions/
    │   └── {versionId}/
    │       └── reportDocument.json  # Uložený ReportDocument (immutable)
    │
    └── pdf/
        ├── {timestamp}.pdf        # PDF soubory
        └── latest.pdf             # Vždy nejnovější PDF
```

### Struktura Firestore (rozšíření)

#### Collection: `reports/{reportId}` (rozšíření)
```typescript
{
  // ... existující Legacy pole (zůstávají beze změny)
  
  // NOVÁ pole pro Smart Template
  smart?: {
    selectedTemplateId?: string;      // ID vybrané šablony
    selectedTemplateVersion?: string; // Verze šablony (např. "2")
    lastSmartDraftPath?: string;     // Storage path k draftu
    finalVersions?: Array<{
      versionId: string;              // "2025-11-05-2130"
      reportPath: string;             // Storage path k reportDocument.json
      pdfPath?: string;               // Storage path k PDF
      createdAt: string;               // ISO timestamp
      createdBy: string;               // userId
      createdByName?: string;          // displayName
    }>;
  };
}
```

#### Collection: `reportTemplates/{templateId}` (NOVÁ)
```typescript
{
  id: string;
  name: string;                       // "HACCP Default"
  description?: string;
  version: string;                    // "2"
  rules: TemplateRules;               // JSON pravidla layoutu
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;                   // userId
}
```

---

## 📁 NOVÉ SOUBORY A KOMPONENTY

### Frontend komponenty

```
components/
├── report/                          # NOVÁ složka
│   ├── SmartTemplateView.tsx        # Hlavní UI přepínač Legacy/Smart
│   ├── SmartTemplateSelector.tsx    # Výběr šablony a verze
│   ├── SmartReportRenderer.tsx      # @react-pdf/renderer preview
│   ├── SmartReportDesigner.tsx      # WYSIWYG editor návrhu
│   └── SmartReportActions.tsx       # Tlačítka akcí (Uložit, PDF, atd.)
│
├── ReportView.tsx                   # UPRAVIT - přidat záložky Legacy/Smart
└── ReportEditor.tsx                 # BEZE ZMĚNY
```

### Services

```
services/
├── smartTemplate/
│   ├── SmartTemplateEngine.ts       # Engine pro applySmartTemplate()
│   ├── templateLoader.ts            # Načítání šablon z Firestore/Storage
│   └── reportDocumentService.ts     # CRUD pro ReportDocument
│
└── firestore/
    ├── reports.ts                   # UPRAVIT - přidat smart pole
    └── reportTemplates.ts          # NOVÁ - CRUD pro šablony
```

### Typy

```
types/
├── types.ts                         # UPRAVIT - přidat Smart typy
└── smartReport.ts                   # NOVÁ - typy pro Smart Template
```

### Cloud Functions

```
functions/src/
├── generateReport.ts                # BEZE ZMĚNY
└── generateSmartReportPdf.ts        # NOVÁ - generování PDF z ReportDocument
```

---

## 🧩 DETAILNÍ POPIS KOMPONENT

### 1. SmartTemplateView.tsx
**Účel:** Hlavní komponenta pro Smart Template mód

**Funkce:**
- Přepínač mezi Legacy/Smart záložkami
- Zobrazení aktuálního stavu (draft/final version)
- Navigace mezi akcemi

**Props:**
```typescript
interface SmartTemplateViewProps {
  report: Report;
  audit: Audit;
  auditStructure: AuditStructure;
  onBack: () => void;
}
```

**UI struktura:**
```tsx
<Tabs>
  <Tab label="Legacy"> {/* Stávající ReportView */} </Tab>
  <Tab label="Smart Template">
    <SmartTemplateSelector />
    <SmartReportDesigner />
    <SmartReportActions />
  </Tab>
</Tabs>
```

---

### 2. SmartTemplateEngine.ts
**Účel:** Aplikuje pravidla šablony na audit data

**Funkce:**
```typescript
function applySmartTemplate(
  data: ReportData,                    // Surová data z auditu
  templateRules: TemplateRules,       // JSON pravidla šablony
  audit: Audit,
  auditStructure: AuditStructure
): ReportDocument
```

**Proces:**
1. Načte sekce podle `flow` (pořadí v rules)
2. Aplikuje limity textů (`truncate`)
3. Rozdělí fotky do řádků dle `perRow` / `maxRowsPerPage`
4. Nastaví šířky tabulek, zarovnání, `repeatHeader`
5. Přidá `pageBreakBefore`/`After` dle `pageBreaks` pravidel
6. Vrátí `ReportDocument` strukturu

---

### 3. SmartReportRenderer.tsx
**Účel:** WYSIWYG náhled pomocí @react-pdf/renderer

**Funkce:**
- Renderuje `ReportDocument` jako PDF preview
- Podporuje editaci přímo v náhledu
- Zobrazení stránek (page-by-page nebo scroll)

**Použité balíčky:**
- `@react-pdf/renderer` - PDF rendering
- `@dnd-kit/core`, `@dnd-kit/sortable` - drag & drop pro editaci

---

### 4. SmartReportDesigner.tsx
**Účel:** Vizuální editor pro úpravu návrhu

**Funkce:**
- Editace textů (inline editing)
- Přeskupení obrázků (drag & drop)
- Úprava page-breaků
- Úprava tabulek (šířky sloupců, zarovnání)

**UI:**
- Levý panel: Seznam sekcí
- Prostředek: PDF preview (editovatelný)
- Pravý panel: Vlastnosti vybraného elementu

---

### 5. reportDocumentService.ts
**Účel:** CRUD operace pro ReportDocument

**Funkce:**
```typescript
// Uložit draft
async function saveSmartDraft(
  reportId: string,
  document: ReportDocument
): Promise<string>  // Storage path

// Uložit finální verzi
async function saveSmartFinalVersion(
  reportId: string,
  document: ReportDocument
): Promise<string>  // versionId

// Načíst finální verzi
async function loadSmartFinalVersion(
  reportId: string,
  versionId: string
): Promise<ReportDocument>

// Načíst draft
async function loadSmartDraft(
  reportId: string
): Promise<ReportDocument | null>
```

---

### 6. generateSmartReportPdf.ts (Cloud Function)
**Účel:** Generování PDF z ReportDocument na serveru

**Funkce:**
```typescript
export const generateSmartReportPdf = functions
  .region('europe-west1')
  .https.onCall(async (data: {
    reportDocument: ReportDocument;
    reportId: string;
  }, context) => {
    // 1. Načíst ReportDocument
    // 2. Renderovat pomocí @react-pdf/renderer.renderToBuffer()
    // 3. Uložit do Storage: reports/{reportId}/smart/pdf/{timestamp}.pdf
    // 4. Vrátit signed URL
  });
```

---

## 📐 TYPY A SCHÉMATA

### TemplateRules (JSON struktura šablony)

```typescript
interface TemplateRules {
  page: {
    margin: { top: number; right: number; bottom: number; left: number };
    fontSize: number;
  };
  flow: string[];  // ["cover", "summary", "images", "findingsTable"]
  pageBreaks?: {
    beforeSection?: Record<string, boolean>;
    afterSection?: Record<string, boolean>;
  };
  text?: {
    [sectionKey: string]: {
      maxChars?: number;
      overflow?: "truncate" | "wrap" | "continue";
    };
  };
  images?: {
    defaultPerRow?: number;
    maxRowsPerPage?: number;
    maxWidth?: number;  // %
  };
  tables?: {
    repeatHeader?: boolean;
    columns?: {
      [tableKey: string]: Array<{
        key: string;
        title: string;
        width?: number;  // %
        align?: "left" | "center" | "right";
      }>;
    };
  };
  sections?: {
    [sectionKey: string]: {
      source: string;  // "report.summaryText", "report.photos", atd.
    };
  };
}
```

### ReportDocument (výstupní struktura)

```typescript
interface ReportDocument {
  metadata: {
    templateId: string;
    templateVersion: string;
    generatedAt: string;
    auditId: string;
  };
  pages: Page[];
}

interface Page {
  pageNumber: number;
  elements: PageElement[];
}

type PageElement =
  | { type: "cover"; content: CoverContent }
  | { type: "text"; content: TextContent }
  | { type: "images"; content: ImagesContent }
  | { type: "table"; content: TableContent }
  | { type: "pageBreak" };

interface TextContent {
  text: string;
  style?: {
    fontSize?: number;
    fontWeight?: "bold" | "normal";
    align?: "left" | "center" | "right";
  };
}

interface ImagesContent {
  images: Array<{
    id: string;
    base64: string;
    caption?: string;
    width?: number;  // %
  }>;
  layout: "grid" | "single";
  perRow?: number;
}

interface TableContent {
  headers: string[];
  rows: string[][];
  columnWidths?: number[];  // %
  alignments?: ("left" | "center" | "right")[];
  repeatHeader?: boolean;
}
```

---

## 🔄 WORKFLOW UŽIVATELE

### Scénář 1: Vytvoření nového Smart reportu

1. Uživatel otevře **Náhled zprávy** (ReportView)
2. Přepne na záložku **Smart Template**
3. Vybere šablonu a verzi (`SmartTemplateSelector`)
4. Klikne **"Vygenerovat layout"**
5. Engine vytvoří `ReportDocument` draft
6. Draft se zobrazí v `SmartReportRenderer` (WYSIWYG náhled)
7. Uživatel může editovat (texty, obrázky, page-breaky)
8. Klikne **"Uložit jako finální verzi"**
9. Vytvoří se záznam v `reports/{reportId}/smart/finalVersions/{versionId}/`

### Scénář 2: Úprava existujícího Smart reportu

1. Uživatel otevře **Smart Template** záložku
2. Vybere finální verzi ze seznamu
3. Načte se `ReportDocument` z Storage
4. Zobrazí se v `SmartReportDesigner`
5. Uživatel upraví
6. Klikne **"Uložit jako novou verzi"**
7. Vytvoří se nový záznam v `finalVersions`

### Scénář 3: Generování PDF

1. Uživatel má otevřený Smart report (draft nebo finální verze)
2. Klikne **"Vygenerovat PDF (server)"**
3. Zavolá se Cloud Function `generateSmartReportPdf`
4. Server vygeneruje PDF pomocí `@react-pdf/renderer`
5. PDF se uloží do Storage: `reports/{reportId}/smart/pdf/{timestamp}.pdf`
6. Vrátí se signed URL pro stažení

---

## 📦 BALÍČKY K INSTALACI

```bash
npm install @react-pdf/renderer
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/modifiers
npm install zod  # Pro validaci JSON schémat
npm install date-fns  # Pro formátování datumů
```

---

## ✅ IMPLEMENTAČNÍ KROKY

### Fáze 1: Příprava základů
- [ ] Vytvořit typy (`types/smartReport.ts`)
- [ ] Vytvořit základní strukturu služeb (`services/smartTemplate/`)
- [ ] Rozšířit Firestore typy (`types.ts`)
- [ ] Vytvořit CRUD pro šablony (`services/firestore/reportTemplates.ts`)

### Fáze 2: Smart Template Engine
- [ ] Implementovat `SmartTemplateEngine.ts`
- [ ] Vytvořit testovací šablonu (default template)
- [ ] Otestovat engine na reálných datech

### Fáze 3: UI komponenty
- [ ] Vytvořit `SmartTemplateView.tsx` (záložky)
- [ ] Vytvořit `SmartTemplateSelector.tsx`
- [ ] Vytvořit `SmartReportRenderer.tsx` (@react-pdf/renderer)
- [ ] Vytvořit `SmartReportDesigner.tsx` (editor)
- [ ] Upravit `ReportView.tsx` (přidat záložky)

### Fáze 4: Storage a Firestore
- [ ] Implementovat `reportDocumentService.ts`
- [ ] Rozšířit `services/firestore/reports.ts` (smart pole)
- [ ] Aktualizovat Storage rules (pokud potřeba)
- [ ] Aktualizovat Firestore rules (pokud potřeba)

### Fáze 5: PDF generování
- [ ] Vytvořit Cloud Function `generateSmartReportPdf.ts`
- [ ] Implementovat server-side rendering pomocí @react-pdf/renderer
- [ ] Otestovat generování PDF

### Fáze 6: Integrace a testování
- [ ] Propojit všechny komponenty
- [ ] Otestovat celý workflow
- [ ] Ověřit, že Legacy systém funguje beze změny
- [ ] Opravit chyby a edge cases

### Fáze 7: Dokumentace
- [ ] Aktualizovat `.cursorrules` (přidat Smart Template sekci)
- [ ] Aktualizovat `README.md` (přidat Smart Template info)
- [ ] Aktualizovat `NAVOD.md` (pokud potřeba)
- [ ] Vytvořit příklad šablony (default template JSON)

---

## 🔒 BEZPEČNOST

### Firestore Rules (rozšíření)
```javascript
match /reports/{reportId} {
  // ... existující rules pro Legacy
  
  // Smart Template data jsou v rámci stejného dokumentu
  // Žádné další změny nejsou potřeba
}

match /reportTemplates/{templateId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null 
    && (resource == null || resource.data.createdBy == request.auth.uid);
}
```

### Storage Rules (rozšíření)
```javascript
match /reports/{reportId}/smart/** {
  allow read: if request.auth != null 
    && resource.metadata.userId == request.auth.uid;
  allow write: if request.auth != null 
    && request.resource.metadata.userId == request.auth.uid;
}
```

---

## 🧪 TESTING STRATEGIE

### Unit testy
- `SmartTemplateEngine.ts` - testování aplikace pravidel
- `reportDocumentService.ts` - testování CRUD operací

### Integrační testy
- Celý workflow vytvoření Smart reportu
- Přepínání mezi Legacy a Smart módem
- Generování PDF

### Manuální testy
- Legacy systém funguje beze změny
- Smart Template systém funguje samostatně
- Oba systémy mohou fungovat paralelně

---

## 📝 PŘÍKLAD ŠABLONY (Default Template)

```json
{
  "page": {
    "margin": { "top": 56, "right": 48, "bottom": 56, "left": 48 },
    "fontSize": 11
  },
  "flow": ["cover", "summary", "images", "findingsTable"],
  "pageBreaks": {
    "afterSection": { "summary": true }
  },
  "text": {
    "summary": {
      "maxChars": 800,
      "overflow": "truncate"
    }
  },
  "images": {
    "defaultPerRow": 3,
    "maxRowsPerPage": 3
  },
  "tables": {
    "repeatHeader": true,
    "columns": {
      "findings": [
        { "key": "cat", "title": "Kategorie", "width": 140 },
        { "key": "desc", "title": "Popis" },
        { "key": "sev", "title": "Závažnost", "width": 90, "align": "center" }
      ]
    }
  },
  "sections": {
    "summary": { "source": "report.summaryText" },
    "images": { "source": "report.photos" },
    "findingsTable": { "source": "report.findings" }
  }
}
```

---

## 🎯 AKCEPTAČNÍ KRITÉRIA

1. ✅ **Legacy systém funguje beze změny** - žádné chyby, žádné změny v chování
2. ✅ **Smart Template systém funguje samostatně** - může vytvořit report bez Legacy
3. ✅ **UI přepínač funguje** - uživatel může přepínat mezi Legacy/Smart
4. ✅ **Automatické generování layoutu** - engine aplikuje pravidla šablony
5. ✅ **WYSIWYG editace funguje** - uživatel může upravit návrh
6. ✅ **Uložení finální verze** - vytvoří se immutable záznam
7. ✅ **Načtení finální verze** - uživatel může znovu otevřít uloženou verzi
8. ✅ **Generování PDF** - server vygeneruje PDF z ReportDocument
9. ✅ **Bezpečnost** - pouze oprávnění uživatelé mají přístup
10. ✅ **Dokumentace aktualizována** - všechny relevantní soubory jsou aktualizovány

---

## 📚 SOUVISEJÍCÍ DOKUMENTY

- `HACCP_Smart_Template_Report_System.md` - původní instrukce
- `.cursorrules` - pravidla pro Cursor AI
- `README.md` - struktura projektu
- `NAVOD.md` - návod k nastavení a deploy

---

**Konec dokumentu**


