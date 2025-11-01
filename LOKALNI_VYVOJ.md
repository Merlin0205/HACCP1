# 🔧 LOKÁLNÍ VÝVOJ A LADĚNÍ

## ✅ Spuštění lokálního serveru

Aplikace běží na: **http://localhost:3000**

Dev server běží na pozadí. Otevřete v prohlížeči:
👉 http://localhost:3000

---

## 🐛 LADĚNÍ CHYB

### 1. Otevřete Developer Tools
- Stiskněte **F12** v prohlížeči
- Nebo klikněte pravým → **Zkontrolovat** / **Inspect**

### 2. Zkontrolujte konzoli
- Karta **Console** - zde uvidíte JavaScript chyby
- Karta **Network** - zde uvidíte síťové požadavky

### 3. Nejpravděpodobnější chyby:

#### ❌ "Firebase configuration is missing"
**Řešení:** Zkontrolujte `.env` soubor - musí obsahovat:
```env
VITE_FIREBASE_API_KEY=AIzaSyCw25Q-71Pe0H5UgAzvBOMxz-tgtnkZ2jg
VITE_FIREBASE_AUTH_DOMAIN=haccp-2776d.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=haccp-2776d
VITE_FIREBASE_STORAGE_BUCKET=haccp-2776d.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=440620865103
VITE_FIREBASE_APP_ID=1:440620865103:web:27573133dcaa35a72f7c3a
```

#### ❌ "Permission denied" v Firestore
**Řešení:** Zkontrolujte, že jste přihlášení v aplikaci

#### ❌ Chyby při načítání dat
**Řešení:** Zkontrolujte Network tab - jaké API volání selhávají

---

## 📝 JAK PŘIDAT CHYBĚJÍCÍ FIREBASE CONFIG DO .env

V `.env` souboru přidejte tyto řádky:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyCw25Q-71Pe0H5UgAzvBOMxz-tgtnkZ2jg
VITE_FIREBASE_AUTH_DOMAIN=haccp-2776d.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=haccp-2776d
VITE_FIREBASE_STORAGE_BUCKET=haccp-2776d.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=440620865103
VITE_FIREBASE_APP_ID=1:440620865103:web:27573133dcaa35a72f7c3a

# Gemini API (pokud už máte)
VITE_GEMINI_API_KEY=AIzaSyC7fTx21AnYkt5I0I5NSLnyU3BS_aN3RVE
```

**⚠️ POZOR:** Po změně `.env` souboru je potřeba **restartovat dev server**!

---

## 🔄 RESTART DEV SERVERU

1. Zastavte aktuální server: `Ctrl + C` v terminálu
2. Spusťte znovu: `npm run dev`

---

## ✅ WORKFLOW PRO LADĚNÍ

1. **Spusťte lokálně**: `npm run dev`
2. **Otevřete**: http://localhost:3000
3. **Otevřete DevTools**: F12
4. **Zkontrolujte chyby** v Console
5. **Opravte chyby** v kódu
6. **Uložte soubor** - Vite automaticky obnoví stránku (Hot Module Replacement)
7. **Otestujte** znovu
8. **Deploy** až když vše funguje: `npm run build` → `firebase deploy`

---

## 🌐 ROZDÍL MEZI LOKÁLNÍM A PRODUKČNÍM PROSTŘEDÍM

- **Lokálně** (`npm run dev`): http://localhost:3000
  - Rychlé obnovení při změnách
  - Source maps pro ladění
  - Hot reload

- **Produkce** (`firebase deploy`): https://haccp-2776d.web.app
  - Optimalizovaný build
  - Minifikovaný kód
  - Cloud Functions dostupné

---

## 📞 POTŘEBUJETE POMOC?

Pošlete screenshot chyby z Console nebo popište, co vidíte!

