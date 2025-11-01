# Firebase Konfigurace

## CO MUSI UDELAT:

### 1. Firebase Console
1. Jdete na https://console.firebase.google.com
2. Vyber projekt
3. Aktivovat sluzby:
   - Firestore Database (Production mode, region: europe-west3)
   - Storage (Get started)
   - Authentication (Email/Password + Google)

### 2. Ziskat Firebase Config
1. Project Settings (ozubene kolo)
2. Your apps â†’ Web app
3. Zkopirovat firebaseConfig objekt

### 3. Upravit .firebaserc
```json
{
  "projects": {
    "default": "VAS_PROJECT_ID"
  }
}
```

### 4. Vytvorit .env
```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=vas-projekt.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=vas-projekt-id
VITE_FIREBASE_STORAGE_BUCKET=vas-projekt.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456
VITE_FIREBASE_APP_ID=1:123:web:abc
```

### 5. Nastavit Gemini API klic
```bash
firebase functions:config:set gemini.api_key="VAS_KLIC"
```

### 6. Deploy
```bash
npm install --legacy-peer-deps
cd functions && npm install && cd ..
npm run build
firebase deploy
```

Hotovo! Aplikace bezi na: https://vas-projekt.web.app
