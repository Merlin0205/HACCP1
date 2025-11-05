# HACCP Audit - Smart Template Report System

## 🎯 Cíl projektu

Cílem je doplnit do stávající aplikace HACCP Audit **nový systém generování reportů (Smart Template)**, který:

1. **Automaticky** poskládá layout reportu podle definovaných šablon (rules JSON).  
2. Umožní **ručně editovat** automaticky vytvořený návrh (texty, tabulky, obrázky, page-breaky).  
3. Uloží **finální verzi** jako samostatný záznam, který lze kdykoli znovu otevřít a vygenerovat.  
4. Zachová **současný systém (Legacy)** beze změn – oba režimy budou existovat paralelně.  

---

## ⚙️ Architektura

```
reports/
├── legacy/
│   ├── {version}.json
│   ├── {version}.pdf
│
├── smart/
│   ├── templates/
│   │   └── {templateId}/v{n}.json      # pravidla šablony (layout rules)
│   ├── drafts/
│   │   └── lastSmartDraft.json          # pracovní návrh po auto-generaci
│   ├── output/
│   │   └── {timestamp}.json             # uložený ReportDocument
│   ├── finalVersions/
│   │   └── {versionId}/reportDocument.json
│   └── pdf/
│       ├── {timestamp}.pdf
│       └── latest.pdf
```

---

## 🧩 Funkční režimy

### 1. Legacy mód (stávající)
- Zůstává beze změny.  
- Načítá uložený JSON a rendruje HTML → uživatel klikne **„Tisk / Uložit do PDF“**.  
- Používá dosavadní šablonu.

### 2. Smart Template mód (nový)
- **Záložka v UI:** `Legacy | Smart`
- Po výběru Smart:
  - Vybere se **šablona (rules JSON)** a její verze.
  - Klikne se na **„Vygenerovat layout“** → engine vytvoří **ReportDocument** (návrh).
  - Návrh se zobrazí ve **WYSIWYG PDF náhledu**.
  - Uživatel může **ručně upravit** texty, fotky, tabulky, page-breaky.
  - Klikne **„Uložit jako finální“** → vznikne `finalVersions/{versionId}/reportDocument.json`.
  - Kdykoli může finální verzi znovu načíst nebo regenerovat z nové šablony.
  - Možnost **„Vygenerovat PDF (server)”** → uloží do Storage, vrátí podepsaný odkaz.

---

## 🧱 Komponenty a soubory

```
src/
  types.report.ts                 # typy a JSON schema ReportDocument
  components/report/
    ReportRenderer.tsx            # React-PDF renderer + PDF download
    ReportDesigner.tsx            # vizuální editor návrhu
    SmartTemplateEngine.ts        # funkce applySmartTemplate(data, rules)
    SmartTemplateView.tsx         # UI přepínač Legacy/Smart + verze
  services/
    firestore/reports.ts          # CRUD pro reporty, verze, šablony
    functions/pdf.ts              # callable generateReportPdf
functions/
  src/
    generatePdf.ts                # backend generace PDF do Storage
```

---

## 🧰 Balíčky k instalaci

```bash
npm i @react-pdf/renderer
npm i @dnd-kit/core @dnd-kit/sortable @dnd-kit/modifiers
npm i zod
npm i date-fns
```

*(Firebase SDK, Flowbite React, Tailwind už existují.)*

---

## 🔧 Backend (Cloud Functions)

### `functions/src/generatePdf.ts`
- Callable Function `generateReportPdf(reportDoc, storagePath)`
- Využívá `@react-pdf/renderer.renderToBuffer()`
- Výstup uloží do `reports/{reportId}/smart/pdf/{timestamp}.pdf`
- Vrátí `signed URL` pro stažení

---

## 🧠 Smart Template Engine

### `SmartTemplateEngine.ts`
Funkce:  
```ts
applySmartTemplate(data: ReportData, templateRules: TemplateRules): ReportDocument
```

Vstupy:
- `data`: surová data auditu (texty, tabulky, fotky)
- `templateRules`: JSON pravidla layoutu

Výstup:
- `ReportDocument`: struktura připravená pro render (WYSIWYG)

Engine provede:
1. Vybere sekce dle `flow` (pořadí v rules)
2. Aplikuje limity textů (`truncate`)
3. Rozdělí fotky do řádků dle `perRow` / `maxRowsPerPage`
4. U tabulek nastaví šířky, zarovnání, `repeatHeader`
5. Přidá `pageBreakBefore`/`After` dle `pageBreaks` pravidel

---

## 💾 Firestore datový model

```json
{
  "reports": {
    "{reportId}": {
      "meta": {
        "title": "Audit Bistro Alfa",
        "createdBy": "uid123",
        "createdAt": "2025-11-05T21:00:00Z"
      },
      "legacyVersions": [
        { "id": "v1.2", "jsonPath": "reports/{id}/legacy/v1.2.json" }
      ],
      "smart": {
        "selectedTemplateId": "haccp-default",
        "selectedTemplateVersion": "2",
        "lastSmartDraft": "reports/{id}/smart/drafts/lastSmartDraft.json",
        "finalVersions": [
          {
            "versionId": "2025-11-05-2130",
            "reportPath": "reports/{id}/smart/finalVersions/2025-11-05-2130/reportDocument.json",
            "pdfPath": "reports/{id}/smart/pdf/2025-11-05-2130.pdf"
          }
        ]
      }
    }
  }
}
```

---

## 🖥️ Uživatelské workflow

1. Otevře **Náhled zprávy**
2. Vybere záložku **Smart Template**
3. Vybere šablonu a verzi
4. Klikne **„Vygenerovat layout“**
5. Návrh se zobrazí v PDF vieweru
6. Upraví texty / tabulky / obrázky
7. Klikne **„Uložit jako finální verzi“**
8. Finální verzi může kdykoli znovu otevřít a **vygenerovat PDF**

---

## 🧩 Přepínače a akce v UI

| Akce | Popis |
|------|-------|
| `Vygenerovat layout` | Spustí Smart engine a vytvoří draft |
| `Uložit jako finální` | Uloží návrh jako verzi (immutable) |
| `Načíst finální verzi` | Otevře existující reportDocument.json |
| `Regenerovat z nové šablony` | Spustí engine znovu na aktuální data |
| `Vygenerovat PDF (server)` | Zavolá callable, uloží do Storage |
| `Stáhnout PDF` | Otevře podepsaný link |
| `Zpět` | Návrat do seznamu auditů |

---

## 🧾 Šablona pravidel (Template Rules – příklad)

```json
{
  "page": { "margin": { "top": 56, "right": 48, "bottom": 56, "left": 48 }, "fontSize": 11 },
  "flow": ["cover", "summary", "images", "findingsTable"],
  "pageBreaks": { "afterSection": { "summary": true } },
  "text": { "summary": { "maxChars": 800, "overflow": "truncate" } },
  "images": { "defaultPerRow": 3, "maxRowsPerPage": 3 },
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

## ✅ Akceptační kritéria

1. **Legacy režim beze změny**
2. **Smart generace layoutu funguje** podle šablony
3. **Uživatel může editovat návrh**
4. **Uložení jako finální verze** vytvoří nový záznam
5. **Každou verzi lze znovu otevřít**
6. **Generace PDF (server)** uloží soubor a vrátí funkční URL
7. **Náhled a PDF výstup se shodují**
8. **Bezpečnost** – jen oprávnění uživatelé mají přístup

---

## 📦 Shrnutí úkolů

| Oblast | Akce |
|--------|------|
| UI | Přidat záložku „Smart Template“ s přepínačem šablony a verzí |
| Engine | Implementovat `applySmartTemplate()` |
| Renderer | Použít `@react-pdf/renderer` pro preview a PDF export |
| Backend | Vytvořit `generateReportPdf` (callable) |
| Firestore | Přidat strukturu `smart/finalVersions` |
| Storage | Ukládat PDF a JSON podle návrhu struktury |
| UX | Možnost editace návrhu a uložení jako finální verze |
| Security | Upravit Firestore/Storage rules |
| Testy | Ověřit všechny akce a 1:1 náhled/PDF |

---

**Autor instrukcí:** Jan Krejčí  
**Datum:** 2025-11-05  
**Cíl:** Zavést paralelní systém reportů (Legacy + Smart Template) s podporou draftu, editace, verzí a generace PDF (WYSIWYG + server).  
