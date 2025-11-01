# 🔥 NÁVOD: Jak získat Firebase Web App Config

## Projekt: haccp-2776d

### Krok 1: Otevřete Firebase Console
1. Otevřete https://console.firebase.google.com
2. Přihlaste se a vyberte projekt **haccp-2776d**

### Krok 2: Vytvořte Web App (pokud ještě nemáte)
1. V levém menu klikněte na **⚙️ Project Settings**
2. Scrollujte dolů na sekci **"Your apps"**
3. Pokud tam není žádná Web app, klikněte na ikonu **</>** (Web)
4. Zadejte název aplikace (např. "HACCP Audit") a klikněte **Register app**

### Krok 3: Zkopírujte Firebase Config
V sekci **"Your apps"** uvidíte objekt `firebaseConfig`, který vypadá takto:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "haccp-2776d.firebaseapp.com",
  projectId: "haccp-2776d",
  storageBucket: "haccp-2776d.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdefghijk"
};
```

### Krok 4: Vytvořte .env soubor
V rootu projektu vytvořte soubor `.env` (bez přípony) s tímto obsahem:

```env
VITE_FIREBASE_API_KEY=AIzaSy...zkopírujte z firebaseConfig.apiKey
VITE_FIREBASE_AUTH_DOMAIN=haccp-2776d.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=haccp-2776d
VITE_FIREBASE_STORAGE_BUCKET=haccp-2776d.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdefghijk
```

**Důležité:** 
- Nahraďte hodnoty skutečnými hodnotami z Firebase Console
- `VITE_FIREBASE_API_KEY` - zkopírujte z `apiKey`
- `VITE_FIREBASE_MESSAGING_SENDER_ID` - zkopírujte z `messagingSenderId`
- `VITE_FIREBASE_APP_ID` - zkopírujte z `appId`

### Krok 5: Ověřte, že služby jsou aktivní
V Firebase Console zkontrolujte, že jsou aktivní:

✅ **Firestore Database** (Build → Firestore Database)
✅ **Firebase Storage** (Build → Storage)
✅ **Authentication** (Build → Authentication)
   - Email/Password - zapnuto
   - Google - zapnuto (volitelné)

### Krok 6: Nastavte Gemini API klíč (pro Cloud Functions)
```bash
firebase login
firebase functions:config:set gemini.api_key="VÁŠ_GEMINI_API_KLÍČ"
```

## ✅ Hotovo!
Po vytvoření `.env` souboru můžete pokračovat podle README.md → sekce "🚀 QUICK START"

