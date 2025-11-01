# 🔥 HACCP Audit Assistant - Firebase Edition

> **Cloudová aplikace pro vedení HACCP auditů** - Kompletně migrována na Firebase platformu

## 📋 O PROJEKTU

Digitální asistent pro provádění a vyhodnocování interních hygienických auditů v potravinářských podnicích podle systému HACCP. Aplikace byla **kompletně přestavěna** z lokální Express + JSON architektury na **plně cloudové Firebase řešení**.

---

## ✅ CO BYLO UDĚLÁNO (FIREBASE MIGRACE)

### 🔥 Přidáno:

#### 1. **Firebase Authentication**
- Email/heslo přihlášení
- Google OAuth přihlášení
- Registrace nových uživatelů
- Reset hesla
- Soubory: `contexts/AuthContext.tsx`, `components/LoginScreen.tsx`, `components/RegisterScreen.tsx`, `AppWithAuth.tsx`

#### 2. **Firestore Database** (místo lokálních JSON)
- Kompletní CRUD service layer
- Collections: customers, audits, reports, settings, users, aiUsageLogs
- Real-time cloud databáze
- Soubory v `services/firestore/`: `customers.ts`, `audits.ts`, `reports.ts`, `settings.ts`, `aiUsageLogs.ts`

#### 3. **Firebase Storage** (místo base64)
- Upload a správa fotek z auditů
- PDF storage pro reporty
- Optimalizace pro velké soubory
- Soubor: `services/storage.ts`

#### 4. **Cloud Functions** (místo Express serveru)
- AI generování reportů (Gemini API)
- Audio transcription
- PDF generování (Puppeteer)
- Složka: `functions/src/`: `generateReport.ts`, `transcribeAudio.ts`, `generatePdf.ts`

#### 5. **Security Rules**
- Firestore rules - user isolation
- Storage rules - pouze obrázky do 10MB
- Soubory: `firestore.rules`, `storage.rules`

#### 6. **Firebase Config**
- Inicializace Firebase SDK
- Konfigurace služeb
- Soubory: `firebaseConfig.ts`, `firebase.json`, `.firebaserc`, `firestore.indexes.json`

### ❌ Odstraněno:

- `server/` adresář (Express server již není potřeba)
- Lokální JSON soubory (`server/db/*.json`)
- WebSocket komunikace
- Manuální backup/restore

### 🔄 Aktualizováno:

- `App.tsx` - používá Firestore CRUD operace
- `hooks/useAppData.ts` - načítá z Firestore
- `services/appData.ts` - migrace na Firestore
- `components/Header.tsx` - user menu + odhlášení
- `index.tsx` - používá AppWithAuth wrapper

---

## 🏗️ STRUKTURA PROJEKTU

```
HACCP1/
├── components/              # React komponenty
│   ├── LoginScreen.tsx      # [NOVÉ] Přihlášení
│   ├── RegisterScreen.tsx   # [NOVÉ] Registrace
│   ├── Header.tsx           # [UPDATED] + user menu
│   ├── CustomerDashboard.tsx
│   ├── AuditChecklist.tsx
│   └── ...další komponenty
│
├── contexts/                # [NOVÉ] React Contexts
│   └── AuthContext.tsx      # Firebase Authentication
│
├── services/
│   ├── firestore/           # [NOVÉ] Firestore CRUD
│   │   ├── customers.ts
│   │   ├── audits.ts
│   │   ├── reports.ts
│   │   ├── settings.ts
│   │   └── aiUsageLogs.ts
│   ├── storage.ts           # [NOVÉ] Firebase Storage
│   ├── appData.ts           # [UPDATED] používá Firestore
│   └── ...další služby
│
├── functions/               # [NOVÉ] Cloud Functions
│   ├── src/
│   │   ├── index.ts
│   │   ├── generateReport.ts    # AI reporty
│   │   ├── transcribeAudio.ts   # Audio přepis
│   │   └── generatePdf.ts       # PDF generování
│   ├── package.json
│   └── tsconfig.json
│
├── hooks/
│   ├── useAppData.ts        # [UPDATED] Firestore
│   └── useReportGenerator.ts
│
├── firebaseConfig.ts        # [NOVÉ] Firebase init
├── firebase.json            # [NOVÉ] Firebase config
├── .firebaserc              # [NOVÉ] Project ID (upravit!)
├── firestore.rules          # [NOVÉ] DB security
├── storage.rules            # [NOVÉ] Storage security
├── firestore.indexes.json   # [NOVÉ] DB indexy
├── AppWithAuth.tsx          # [NOVÉ] Auth wrapper
├── App.tsx                  # [UPDATED] Firestore CRUD
├── index.tsx                # [UPDATED] používá AppWithAuth
├── .env                     # [VYTVOŘIT] Firebase credentials
└── README.md                # Tento soubor
```

---

## 🗂️ DATABÁZOVÁ STRUKTURA

### Firestore Collections:

```
/customers/{customerId}
  ├─ userId: string          # Vlastník dat
  ├─ premise_name: string
  ├─ premise_address: string
  ├─ operator_name: string
  └─ ...další pole zákazníka

/audits/{auditId}
  ├─ userId: string          # Vlastník dat
  ├─ customerId: string      # Reference na zákazníka
  ├─ status: string          # "Nový", "Probíhá", "Uzamčen"
  ├─ createdAt: timestamp
  ├─ completedAt: timestamp
  ├─ headerValues: map       # Hlavička auditu
  └─ answers: map            # Odpovědi z checklistu

/reports/{reportId}
  ├─ userId: string
  ├─ auditId: string         # Reference na audit
  ├─ status: string          # "Pending", "Done", "Error"
  ├─ reportData: object      # AI vygenerovaný report
  └─ auditorSnapshot: object # Údaje auditora

/settings/{documentId}
  ├─ auditStructure          # Struktura checklistu (sdílená)
  ├─ aiReportConfig          # Konfigurace AI reportů
  ├─ aiPricingConfig         # Ceny AI modelů
  └─ aiModelsConfig          # Názvy modelů

/users/{userId}
  ├─ auditorInfo: object     # Jméno, tel, email, web
  ├─ displayName: string
  └─ email: string

/aiUsageLogs/{logId}
  ├─ userId: string
  ├─ timestamp: timestamp
  ├─ model: string           # Název Gemini modelu
  ├─ operation: string       # "report-generation", "audio-transcription"
  ├─ promptTokens: number
  ├─ completionTokens: number
  ├─ totalTokens: number
  ├─ costUsd: number
  └─ costCzk: number
```

### Firebase Storage:

```
/users/{userId}/
  ├─ audits/{auditId}/
  │   ├─ photo_0_timestamp.jpg
  │   ├─ photo_1_timestamp.jpg
  │   └─ ...další fotky
  └─ reports/
      └─ report_{reportId}_timestamp.pdf
```

---

## 🚀 QUICK START (3 KROKY)

### 1️⃣ Firebase Console Setup (5 minut)

1. **Otevřete** https://console.firebase.google.com
2. **Vyberte projekt** (nebo vytvořte nový)
3. **Aktivujte služby:**

   **A) Firestore Database:**
   - Build → Firestore Database
   - Create database → Production mode
   - Region: **europe-west3** (Frankfurt)

   **B) Firebase Storage:**
   - Build → Storage
   - Get started (použít default rules)

   **C) Authentication:**
   - Build → Authentication → Get started
   - Sign-in method:
     - ✅ **Email/Password** - zapnout
     - ✅ **Google** - zapnout (vyžaduje OAuth setup)

4. **Zkopírujte Firebase config:**
   - Klikněte ⚙️ **Project Settings**
   - Scrollujte na **Your apps** → Web app
   - Zkopírujte celý `firebaseConfig` objekt

### 2️⃣ Lokální konfigurace (2 minuty)

**A) Upravte `.firebaserc`** (v rootu projektu):
```json
{
  "projects": {
    "default": "VÁŠ_FIREBASE_PROJECT_ID"
  }
}
```

**B) Vytvořte `.env`** (v rootu projektu):
```env
VITE_FIREBASE_API_KEY=...zkopírujte z Firebase Console
VITE_FIREBASE_AUTH_DOMAIN=vas-projekt.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=vas-projekt-id
VITE_FIREBASE_STORAGE_BUCKET=vas-projekt.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdefghijk
```

**C) Nastavte Gemini API klíč:**
```bash
firebase login
firebase functions:config:set gemini.api_key="VÁŠ_GEMINI_API_KLÍČ"
```

### 3️⃣ Deploy (5 minut)

```bash
# Instalace dependencies
npm install --legacy-peer-deps
cd functions && npm install && cd ..

# Build aplikace
npm run build

# Deploy na Firebase
firebase deploy
```

✅ **HOTOVO!** Aplikace běží na: `https://vas-projekt.web.app`

---

## ✨ FEATURES

- ✅ **Správa zákazníků** - CRUD operace v Firestore
- ✅ **HACCP Audity** - Interaktivní checklist s fotodokumentací
- ✅ **Hlasový přepis** - Gemini AI audio transcription
- ✅ **AI Reporty** - Automatické generování protokolů
- ✅ **PDF Export** - Puppeteer v Cloud Functions
- ✅ **Cloudová databáze** - Firestore (real-time sync)
- ✅ **Autentifikace** - Email/heslo + Google OAuth
- ✅ **Multi-user** - Každý auditor má vlastní účet
- ✅ **Fotky v cloudu** - Firebase Storage (optimalizované)
- ✅ **Security** - User isolation, validace na DB úrovni

## 🛠️ TECH STACK

### Frontend:
- **React** 19.2
- **TypeScript** 5.8
- **Vite** 6.2
- **Firebase SDK** 12.5
- TailwindCSS (inline)

### Backend:
- **Firebase Firestore** - NoSQL databáze
- **Firebase Storage** - File storage
- **Firebase Authentication** - Auth služba
- **Cloud Functions** - Node.js 20 (TypeScript)
- **Puppeteer** - PDF generování

### AI:
- **Google Gemini API** - Report generation & Audio transcription

---

## 🔐 BEZPEČNOST

### Firestore Security Rules:
- **User isolation** - každý vidí JEN svá data
- Všechny collections mají `userId` field
- Rules ověřují: `request.auth.uid == resource.data.userId`

### Storage Security Rules:
- Pouze vlastní soubory (path obsahuje userId)
- Pouze obrázky (`image/*`)
- Max velikost: 10MB per file

### Authentication:
- Firebase Auth (industry standard)
- Email verification
- Google OAuth 2.0

---

## 💰 NÁKLADY

### Firebase Free Tier (ZDARMA):
- **Firestore**: 1 GB storage, 50K reads/day, 20K writes/day
- **Storage**: 5 GB, 1 GB download/day
- **Functions**: 125K invocations/month, 40K GB-seconds
- **Authentication**: neomezeno
- **Hosting**: 10 GB bandwidth/month

### Odhad pro 1 auditora:
- ~5-10 auditů/měsíc
- ~100 fotek/měsíc
- ~1000 Firestore operací/měsíc

**→ Celkem: $0-5/měsíc** (většinou free tier stačí)

---

## 🐛 TROUBLESHOOTING

### "Permission denied"
```bash
firebase login
```

### Build chyby
```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### Cloud Functions nefungují
```bash
# Zobrazit logy
firebase functions:log

# Ověřit Gemini klíč
firebase functions:config:get
```

### Přihlášení nefunguje
→ Firebase Console → Authentication → Email/Password musí být aktivní

### Fotky se neukládají
→ Firebase Console → Storage → Zkontrolovat rules

---

## 📊 DEPLOYMENT PŘÍKAZY

```bash
# První deploy (vše najednou)
firebase deploy

# Deploy jednotlivě
firebase deploy --only hosting      # Web aplikace
firebase deploy --only functions    # Cloud Functions
firebase deploy --only firestore    # DB rules
firebase deploy --only storage      # Storage rules

# Logy
firebase functions:log              # Function logs
firebase hosting:channel:list       # Preview channels

# Lokální emulátory (pro development)
firebase emulators:start
```

---

## 📚 DOKUMENTACE

- Složka `readme/` obsahuje další dokumenty
- Pro více info o migraci viz git commit history
- Firebase dokumentace: https://firebase.google.com/docs

---

## 🎯 PRVNÍ POUŽITÍ

1. **Otevřete aplikaci** na `https://vas-projekt.web.app`
2. **Zaregistrujte se** (první účet)
3. **Vytvořte zákazníka** - Přidat zákazníka
4. **Proveďte audit** - Vyberte zákazníka → Nový audit
5. **Vygenerujte report** - Dokončit audit → Report se vytvoří automaticky
6. **Stáhněte PDF** - Export to PDF

---

## 📞 PODPORA

- **Firebase Console** → Functions → Logs (pro backend chyby)
- **Browser DevTools** → Console (F12) (pro frontend chyby)
- **Firebase Docs**: https://firebase.google.com/docs
- **Stack Overflow**: "firebase [váš problém]"

---

## ✨ SHRNUTÍ

**Vaše aplikace je kompletně připravena na Firebase!**

- ✅ Všechny soubory vytvořeny a na místě
- ✅ CRUD operace migrované na Firestore
- ✅ Authentication implementována
- ✅ Cloud Functions připraveny
- ✅ Security rules nastaveny

**Stačí 3 kroky a za 12 minut máte aplikaci v cloudu!** 🚀

---

*Poslední aktualizace: Listopad 2025*
*Verze: 2.0 - Firebase Edition*
