# 📱 JAK ZÍSKAT WEB APP CONFIG - KROK ZA KROKEM

## ⚠️ DŮLEŽITÉ: Admin SDK ≠ Web App Config

**Admin SDK JSON** (co máte v `1FireKEY/`) = pro **backend/Cloud Functions** ✅  
**Web App Config** (co potřebujeme) = pro **frontend/React aplikaci** ❌ (chybí)

---

## 🎯 KDE NAJÍT WEB APP CONFIG

### Krok 1: Otevřete Firebase Console
👉 https://console.firebase.google.com

### Krok 2: Vyberte projekt
👉 Klikněte na **`haccp-2776d`**

### Krok 3: Otevřete Project Settings
👉 Klikněte na **⚙️ (ozubené kolo)** vlevo nahoře → **Project Settings**

### Krok 4: Najděte sekci "Your apps"
👉 Scrollujte dolů na sekci **"Your apps"**

### Krok 5: Vytvořte Web App (pokud ještě nemáte)
👉 Pokud tam není žádná Web app:
   1. Klikněte na ikonu **`</>`** (Web)
   2. Zadejte název: **"HACCP Audit"** (nebo cokoliv)
   3. Klikněte **"Register app"**

### Krok 6: Zkopírujte config
👉 Uvidíte objekt `firebaseConfig`:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz123456",
  authDomain: "haccp-2776d.firebaseapp.com",
  projectId: "haccp-2776d",
  storageBucket: "haccp-2776d.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdefghijk123456"
};
```

---

## 📝 VYTVOŘTE .env SOUBOR

V rootu projektu vytvořte soubor **`.env`** (bez přípony) s tímto obsahem:

```env
VITE_FIREBASE_API_KEY=AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz123456
VITE_FIREBASE_AUTH_DOMAIN=haccp-2776d.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=haccp-2776d
VITE_FIREBASE_STORAGE_BUCKET=haccp-2776d.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdefghijk123456
```

**⚠️ DŮLEŽITÉ:** Nahraďte hodnoty skutečnými hodnotami z Firebase Console!

---

## ✅ CO MÁTE HOTOVO

✅ Admin SDK JSON - pro Cloud Functions (už máte)  
✅ Project ID - `haccp-2776d` (už máme)  
✅ `.firebaserc` - aktualizováno s project ID  
✅ `package.json` - Firebase SDK přidán  

---

## ❌ CO JEŠTĚ POTŘEBUJETE

❌ **Web App Config** - musíte získat z Firebase Console (5 minut)  
❌ **`.env` soubor** - vytvořit s hodnotami z Web App Config  

---

## 🚀 PO VYTVOŘENÍ .env SOUBORU

Pak můžete pokračovat:
```bash
npm install --legacy-peer-deps
cd functions && npm install && cd ..
npm run build
firebase deploy
```

---

**💡 TIP:** Pokud už máte Web app vytvořenou v Firebase Console, config najdete okamžitě v Project Settings → Your apps → Web app.

