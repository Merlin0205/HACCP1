# Firebase Deploy Checklist - Smart Template System

## ✅ Co je potřeba nahrát na Firebase:

### 1. Firestore Security Rules
```bash
firebase deploy --only firestore:rules
```
**Soubor:** `firestore.rules`
- ✅ Přidána pravidla pro `reportTemplates` collection (řádky 163-175)

### 2. Storage Security Rules  
```bash
firebase deploy --only storage
```
**Soubor:** `storage.rules`
- ✅ Už podporuje `users/{userId}/reports/{reportId}/{allPaths=**}` - pokrývá i smart strukturu

### 3. Cloud Functions
```bash
firebase deploy --only functions:generateSmartReportPdf
```
**Nová funkce:** `generateSmartReportPdf`
- ✅ Vytvořena v `functions/src/generateSmartReportPdf.ts`
- ✅ Exportována v `functions/src/index.ts`
- ✅ Používá @react-pdf/renderer pro generování PDF

### 4. Frontend (Hosting)
```bash
firebase deploy --only hosting
```
**Soubory:** Všechny nové komponenty a služby
- ✅ Komponenty v `components/report/`
- ✅ Služby v `services/smartTemplate/`
- ✅ Typy v `types/smartReport.ts`
- ✅ Upravené `components/ReportView.tsx`

### 5. Inicializace Default Template (volitelné)
Po prvním deploy spustit script pro vytvoření default template:
```bash
npm run init-default-template
```
nebo přes Firebase Console ručně vytvořit dokument v `reportTemplates` collection s ID `haccp-default`

## 📋 Kompletní deploy příkaz:

```bash
# Deploy všechno najednou
firebase deploy

# Nebo postupně:
firebase deploy --only firestore:rules
firebase deploy --only storage
firebase deploy --only functions:generateSmartReportPdf
firebase deploy --only hosting
```

## ⚠️ Poznámky:

1. **Cloud Functions** potřebují Node.js 20 (jak je nastaveno v `functions/package.json`)
2. **Default Template** může být vytvořen později přes UI - není nutné pro základní fungování
3. **Storage rules** už pokrývají smart strukturu - žádné změny nejsou potřeba
4. **Legacy systém** zůstává beze změny - žádné deploy změny nejsou potřeba

## 🧪 Po deploy testování:

1. ✅ Vygenerovat Legacy report (mělo by fungovat jako předtím)
2. ✅ Přepnout na Smart Template záložku v ReportView
3. ✅ Vybrat šablonu (nebo použít default)
4. ✅ Vygenerovat layout
5. ✅ Upravit draft
6. ✅ Uložit jako finální verzi
7. ✅ Vygenerovat PDF (server)


