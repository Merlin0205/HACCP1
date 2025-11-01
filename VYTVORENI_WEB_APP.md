# ✅ CO MÁTE Z PROJECT SETTINGS

Z obrázku vidím tyto hodnoty:
- **Project ID**: `haccp-2776d` ✅
- **Web API Key**: `AlzaSyCw25Q-71Pe0H5UgAzvBOMxz-tgtnkZ2jg` ✅
- **Project number**: `440620865103` ✅

---

## 🎯 CO TEĎ UDĚLAT

### Krok 1: Vytvořte Web App
1. V sekci **"Your apps"** na stránce Project Settings
2. Klikněte na ikonu **`</>`** (Web)
3. Zadejte název: **"HACCP Audit"** (nebo cokoliv)
4. Klikněte **"Register app"**

### Krok 2: Zkopírujte zbývající hodnoty
Po vytvoření Web app uvidíte objekt `firebaseConfig`:

```javascript
const firebaseConfig = {
  apiKey: "AlzaSyCw25Q-71Pe0H5UgAzvBOMxz-tgtnkZ2jg",  // ✅ už máte
  authDomain: "haccp-2776d.firebaseapp.com",         // ✅ můžeme odvodit
  projectId: "haccp-2776d",                           // ✅ už máte
  storageBucket: "haccp-2776d.appspot.com",            // ✅ můžeme odvodit
  messagingSenderId: "440620865103",                    // ✅ můžeme použít project number
  appId: "1:440620865103:web:XXXXXXXXX"                // ❌ potřebujete zkopírovat
};
```

### Krok 3: Vytvořte .env soubor
V rootu projektu vytvořte soubor **`.env`** s tímto obsahem:

```env
VITE_FIREBASE_API_KEY=AlzaSyCw25Q-71Pe0H5UgAzvBOMxz-tgtnkZ2jg
VITE_FIREBASE_AUTH_DOMAIN=haccp-2776d.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=haccp-2776d
VITE_FIREBASE_STORAGE_BUCKET=haccp-2776d.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=440620865103
VITE_FIREBASE_APP_ID=1:440620865103:web:XXXXXXXXX
```

**⚠️ DŮLEŽITÉ:** Hodnotu `VITE_FIREBASE_APP_ID` musíte zkopírovat z firebaseConfig objektu po vytvoření Web app!

---

## 📝 ZKOPÍROVANÝ TEXT Z FIREBASE CONSOLE

Pokud uvidíte něco jako:
```
<!-- The core Firebase JS SDK is always required and must be listed first -->
<script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-app.js"></script>
...
```

Scrollujte dolů, dokud neuvidíte:
```javascript
const firebaseConfig = {
  apiKey: "...",
  ...
  appId: "1:440620865103:web:XXXXXXXXX"  // ← TOHLE ZKOPÍRUJTE
};
```

---

## ✅ PO VYTVOŘENÍ .env SOUBORU

Pak můžete pokračovat:
```bash
npm install --legacy-peer-deps
cd functions && npm install && cd ..
npm run build
firebase deploy
```

