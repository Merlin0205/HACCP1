# 🚀 HACCP AUDIT APP - ÚPLNÝ NÁVOD

> Kompletní průvodce vývojem, testováním a deployem HACCP Audit aplikace

---

## 🌐 LIVE APLIKACE

**👉 Aplikace běží na:** https://haccp-2776d.web.app

Tuto adresu použij pro:
- ✅ Ověření, že všechny změny fungují v produkci
- ✅ Testování po deployi
- ✅ Sdílení s uživateli

---

## 📋 OBSAH

1. [Lokální testování](#lokální-testování)
2. [API klíče a Secrets](#api-klíče-a-secrets)
3. [Jak to funguje na Firebase](#jak-to-funguje-na-firebase)
4. [Scripty pro deploy](#scripty-pro-deploy)
5. [Bezpečnost a .gitignore](#bezpečnost-a-gitignore)

---

## 🧪 LOKÁLNÍ TESTOVÁNÍ

### Spuštění lokálního vývoje:

```powershell
# Spustit dev server (frontend)
.\dev.bat

# Nebo přímo:
npm run dev
```

**Aplikace běží na:** http://localhost:3000

### Spuštění s Firebase Emulátory (volitelné):

```powershell
# Terminal 1: Emulátory
firebase emulators:start --only functions

# Terminal 2: Frontend
npm run dev
```

**Emulátory běží na:**
- Functions: http://localhost:5001
- Firebase UI: http://localhost:4000

### Build pro produkci (lokálně):

```powershell
.\build.bat

# Nebo přímo:
npm run build
```

**Výstup:** `dist/` složka s buildem

---

## 🔐 API KLÍČE A SECRETS

### Co potřebuješ nastavit:

#### 1. Root `.env` soubor (pro frontend):

```env
# Firebase konfigurace (POVINNÉ)
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=haccp-2776d.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=haccp-2776d
VITE_FIREBASE_STORAGE_BUCKET=haccp-2776d.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=440620865103
VITE_FIREBASE_APP_ID=1:440620865103:web:27573133dcaa35a72f7c3a

# Emulátory (volitelné)
VITE_USE_FIREBASE_EMULATORS=true
```

**⚠️ POZOR:** `VITE_GEMINI_API_KEY` už není potřeba! (klíč je na backendu)

#### 2. `functions/.env` soubor (pro Cloud Functions - lokální vývoj):

```env
GEMINI_API_KEY=TVŮJ_GEMINI_API_KLÍČ
```

#### 3. Firebase Secrets (pro produkci):

```powershell
# Automatická synchronizace z functions/.env:
.\synchronizuj-klice.ps1

# Nebo ručně:
firebase functions:secrets:set GEMINI_API_KEY
# (zadej klíč)
```

### Kde jsou klíče uložené:

| Prostředí | Kde je klíč | Jak aktualizovat |
|-----------|-------------|------------------|
| **Lokální vývoj** | `functions/.env` | Upravit soubor |
| **Produkce** | Firebase Secrets | `.\synchronizuj-klice.ps1` |

---

## 🌐 JAK TO FUNGUJE NA FIREBASE

### Architektura:

```
┌─────────────────┐
│   Frontend      │  (React + Vite)
│   (Hosting)     │  → Zobrazuje UI
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐
│ Cloud Functions │  → AI volání (Gemini API)
│   (Backend)     │  → Zpracování dat
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Firestore     │  → Databáze (audity, zákazníci)
│   Storage       │  → Fotky, PDF
│   Auth          │  → Přihlášení
└─────────────────┘
```

### Co běží kde:

- **Frontend:** Firebase Hosting (statické soubory z `dist/`)
- **Backend:** Cloud Functions (Node.js 20, TypeScript)
- **AI API:** Gemini API (voláno z Cloud Functions)
- **Databáze:** Firestore (NoSQL)
- **Soubory:** Firebase Storage

### API klíče:

- **Gemini API klíč:** Pouze v Cloud Functions (bezpečně na backendu)
- **Firebase config:** Ve frontendu (veřejné, bezpečné)

---

## 📦 SCRIPTY PRO DEPLOY

### Dostupné scripty:

#### `build.bat` - Lokální build
```powershell
.\build.bat
```
**Dělá:** `npm run build` → vytvoří `dist/` složku

#### `dev.bat` - Lokální vývoj
```powershell
.\dev.bat
```
**Dělá:** `npm run dev` → spustí dev server

#### `deploy.bat` - KOMPLETNÍ DEPLOY
```powershell
.\deploy.bat
```
**Dělá:**
1. `npm run build` (build frontendu)
2. `firebase deploy --only "hosting,firestore:rules,firestore:indexes"` (deploy frontend + databáze)

**⚠️ POZOR:** Cloud Functions se deployují SAMOSTATNĚ (viz níže)

#### `deploy-rules.bat` - Pouze databáze
```powershell
.\deploy-rules.bat
```
**Dělá:** `firebase deploy --only "firestore:rules,firestore:indexes"`

**Použití:** Když změníš pouze databázová pravidla nebo indexy

#### `synchronizuj-klice.ps1` - Synchronizace API klíče
```powershell
.\synchronizuj-klice.ps1
```
**Dělá:**
1. Načte klíč z `functions/.env`
2. Nastaví ho do Firebase Secrets
3. Po nastavení: `firebase deploy --only functions`

**Použití:** Když změníš Gemini API klíč

### Ruční deploy (pokud potřebuješ jen část):

```powershell
# Pouze frontend
firebase deploy --only hosting

# Pouze Cloud Functions
firebase deploy --only functions

# Pouze databáze (rules + indexes)
firebase deploy --only firestore:rules,firestore:indexes

# Pouze Storage rules
firebase deploy --only storage

# Vše najednou
firebase deploy
```

---

## 🔒 BEZPEČNOST A .GITIGNORE

### ✅ Co je v .gitignore (NIKDY se nesynchronizuje):

```
.env                           # Root .env (Firebase config)
functions/.env                 # Functions .env (Gemini API klíč)
**/firebase-adminsdk*.json     # Firebase Admin SDK klíče
**/FireKEY/**                  # Složky s klíči
*.key, *.pem, *.p12            # Šifrovací klíče
dist/                          # Build output
node_modules/                  # Dependencies
```

### ✅ Co se synchronizuje do GitHubu:

- ✅ Veškerý kód (`.tsx`, `.ts`, `.json`)
- ✅ `firebase.json` (nastavení deploy)
- ✅ `firestore.rules` (bezpečnostní pravidla)
- ✅ `firestore.indexes.json` (databázové indexy)
- ✅ `storage.rules` (storage pravidla)
- ✅ `synchronizuj-klice.ps1` (skript pro synchronizaci klíče)

### ⚠️ Co NIKDY nesynchronizovat:

- ❌ `.env` soubory
- ❌ API klíče
- ❌ Firebase Admin SDK JSON soubory

---

## 📝 RYCHLÝ WORKFLOW

### První nastavení:

1. **Vytvoř `functions/.env`:**
   ```env
   GEMINI_API_KEY=TVŮJ_KLÍČ
   ```

2. **Synchronizuj klíč do Firebase:**
   ```powershell
   .\synchronizuj-klice.ps1
   ```

3. **Deploy vše:**
   ```powershell
   .\deploy.bat          # Frontend + databáze
   firebase deploy --only functions  # Cloud Functions
   ```

### Běžná práce:

1. **Lokální vývoj:**
   ```powershell
   .\dev.bat
   ```

2. **Po změnách kódu:**
   ```powershell
   .\deploy.bat                    # Frontend + databáze
   firebase deploy --only functions  # Cloud Functions (pokud byly změny)
   ```

3. **Změna API klíče:**
   - Uprav `functions/.env`
   - Spusť `.\synchronizuj-klice.ps1`
   - Deploy: `firebase deploy --only functions`

---

## 🆘 RYCHLÁ POMOC

### Aplikace nefunguje lokálně:

```powershell
# Zkontroluj, že máš .env soubor
# Restartuj dev server (Ctrl+C, pak znovu npm run dev)
```

### Deploy selhal:

```powershell
# Zkontroluj, že jsi přihlášený
firebase login

# Zkontroluj Firebase klíč
firebase functions:secrets:access GEMINI_API_KEY
```

### Cloud Functions nefungují:

```powershell
# Zkontroluj logy
firebase functions:log

# Ověř, že máš Secret nastavený
firebase functions:secrets:access GEMINI_API_KEY
```

---

## 📚 DALŠÍ INFORMACE

- **Firebase Console:** https://console.firebase.google.com
- **Firebase Docs:** https://firebase.google.com/docs
- **GitHub Repo:** (váš repo)

---

*Poslední aktualizace: Listopad 2025*

