# 🔒 CITLIVÉ SOUBORY A BEZPEČNOST

## ⚠️ DŮLEŽITÉ: TYTO SOUBORY NIKDY NEPOSÍLEJTE DO GITU!

### 📋 Seznam citlivých souborů:

#### 1. **Environment Variables (.env soubory)**
- `.env` - Firebase a Gemini API klíče (root projektu)
- `functions/.env` - Gemini API klíč pro Cloud Functions

**Co obsahují:**
```env
VITE_FIREBASE_API_KEY=...
VITE_GEMINI_API_KEY=...
GEMINI_API_KEY=...
```

#### 2. **Firebase Admin SDK Keys**
- `**/firebase-adminsdk*.json` - Admin SDK JSON soubory
- `**/FireKEY/**` - Složka s klíči
- `**/1FireKEY/**` - Složka s klíči

**Co obsahují:**
```json
{
  "type": "service_account",
  "private_key": "...",
  "client_email": "..."
}
```

#### 3. **Další citlivé soubory**
- `*.key`, `*.pem`, `*.p12`, `*.pfx` - Šifrovací klíče
- `secrets.json`, `config.json`, `credentials.json` - Konfigurační soubory s tajemstvími

---

## ✅ CO JE SPRÁVNĚ NASTAVENO

### .gitignore
Všechny citlivé soubory jsou přidány do `.gitignore`:
- ✅ `.env` soubory
- ✅ Firebase Admin SDK JSON soubory
- ✅ Složky s klíči (`FireKEY/`, `1FireKEY/`)
- ✅ Všechny klíče a certifikáty

### Template soubory (.env.example)
Vytvořeny template soubory pro snadné nastavení:
- ✅ `.env.example` - Template pro root `.env`
- ✅ `functions/.env.example` - Template pro functions `.env`

---

## 📝 JAK NASTAVIT PROJEKT

### 1. Zkopírujte template soubory:
```bash
# Root .env
cp .env.example .env

# Functions .env
cp functions/.env.example functions/.env
```

### 2. Vyplňte skutečné hodnoty:
- Otevřete `.env` a nahraďte `your-*-here` skutečnými hodnotami
- Otevřete `functions/.env` a nahraďte Gemini API klíč

### 3. Ověřte, že soubory nejsou v gitu:
```bash
git status
# .env soubory by neměly být vidět
```

---

## 🔍 JAK OVĚŘIT, ŽE VŠECHNO JE SPRÁVNĚ

### Zkontrolujte, že citlivé soubory nejsou v gitu:
```bash
git ls-files | grep -E "\.env|firebase-adminsdk|FireKEY"
# Mělo by být prázdné
```

### Zkontrolujte, že jsou ignorovány:
```bash
git check-ignore -v .env
git check-ignore -v functions/.env
git check-ignore -v 1FireKEY/haccp-2776d-firebase-adminsdk-fbsvc-a236e4dce2.json
# Měly by být ignorovány
```

---

## 🚨 CO DĚLAT, KDYŽ JSETE NÁHODOU COMMITNULI CITLIVÉ SOUBORY

### Pokud jste soubory ještě nepushli:
```bash
# Odstraňte soubory z gitu (ale nechte je na disku)
git rm --cached .env
git rm --cached functions/.env
git rm --cached -r 1FireKEY/

# Commitněte změny
git commit -m "Remove sensitive files from git"
```

### Pokud jste soubory už pushli:
1. **OKAMŽITĚ** změňte všechny API klíče v Firebase/Gemini Console
2. Odstraňte soubory z gitu (viz výše)
3. Force push NENÍ doporučeno (pokud nevíte co děláte)

---

## 📚 KDE ZÍSKAT HODNOTY

### Firebase Web App Config:
1. Firebase Console → Project Settings → Your apps → Web app
2. Zkopírujte hodnoty z `firebaseConfig` objektu

### Gemini API Key:
1. Navštivte https://ai.google.dev/
2. Vytvořte API klíč
3. Zkopírujte klíč

### Firebase Admin SDK:
1. Firebase Console → Project Settings → Service Accounts
2. Generate new private key
3. Stáhněte JSON soubor (Uložte do `1FireKEY/` nebo podobné složky)

---

## ✅ CHECKLIST PŘED COMMITEM

- [ ] `.env` soubory nejsou v gitu
- [ ] Firebase Admin SDK JSON nejsou v gitu
- [ ] Žádné API klíče nejsou v kódu (pouze v .env)
- [ ] `.env.example` soubory existují a obsahují pouze template hodnoty
- [ ] `git status` neukazuje žádné citlivé soubory

---

**Zapamatujte si:** 🔒 Pokud není v `.gitignore`, NEPOSÍLEJTE TO DO GITU!

