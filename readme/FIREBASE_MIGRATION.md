# Firebase Migration - HACCP Audit App

## QUICK START

### 1. Firebase Console (5 min)
- OtevĹ™ete https://console.firebase.google.com
- Aktivujte: Firestore + Storage + Authentication

### 2. Konfigurace (2 min)
Upravte .firebaserc a vytvorte .env soubor s Firebase credentials

### 3. Deploy (5 min)
```bash
npm install --legacy-peer-deps
cd functions && npm install && cd ..
npm run build
firebase deploy
```

## CO BYLO ZMENENO

### Pridano:
- Firebase Authentication (email + Google)
- Firestore Database (misto JSON)
- Firebase Storage (pro fotky)
- Cloud Functions (misto Express)

### Odstraneno:
- server/ adresar (Express uz neni potreba)
- Lokalni JSON soubory

## DATABAZE

Firestore collections:
- /customers - zakaznici
- /audits - audity
- /reports - reporty
- /settings - nastaveni
- /users - uzivatele
- /aiUsageLogs - AI statistiky

Kazdy uzivatel vidi JEN sva data (userId field).

## NAKLADY

Free tier: -5/mesic (vetsinou zdarma)
- Firestore: 1 GB, 50K reads/day
- Storage: 5 GB
- Functions: 125K invocations/month

## TROUBLESHOOTING

Permission denied: firebase login
Build chyby: rm -rf node_modules && npm install --legacy-peer-deps
Functions nefunguji: firebase functions:log

## DEPLOY PRIKAZY

```bash
# Prvni deploy
firebase login
npm run build
firebase deploy

# Aktualizace
firebase deploy --only hosting
firebase deploy --only functions
```

Kompletni navod: Viz .firebaserc a .env.example
