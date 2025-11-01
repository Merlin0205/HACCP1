# 🚀 RYCHLÝ START - LOKÁLNÍ VÝVOJ S EMULÁTORY

## ✅ Co bylo nastaveno

✅ Firebase Emulators konfigurace v `firebase.json`  
✅ Automatické připojení k emulátorům při `VITE_USE_FIREBASE_EMULATORS=true`  
✅ Gemini API klíč pro emulátory v `functions/.env`  
✅ Scripty v `package.json` pro snadné spuštění  

---

## 🎯 JAK POUŽÍVAT

### Krok 1: Aktivovat emulátory v `.env`

Přidejte do root `.env`:
```bash
VITE_USE_FIREBASE_EMULATORS=true
```

### Krok 2: Spustit emulátory (Terminal 1)

```powershell
npm run emulators
```

Nebo jen Functions:
```powershell
npm run emulators:functions
```

### Krok 3: Spustit frontend (Terminal 2)

```powershell
npm run dev
```

---

## 📊 Co běží kde

| Služba | Lokální URL | Produkce |
|--------|-------------|----------|
| **Frontend** | http://localhost:3000 | Firebase Hosting |
| **Firebase UI** | http://localhost:4000 | - |
| **Auth** | localhost:9099 | Firebase Auth |
| **Functions** | localhost:5001 | Cloud Functions |
| **Firestore** | localhost:8080 | Firestore |
| **Storage** | localhost:9199 | Firebase Storage |

---

## 💡 Workflow

### 🧪 Testování lokálně
```powershell
# Terminal 1
npm run emulators

# Terminal 2  
npm run dev
```

**Výhody:**
- ✅ Okamžité změny bez deployu
- ✅ Zdarma (neplatíte za Cloud Functions)
- ✅ Bezpečné (netestujete na produkci)

### 🚀 Deploy na produkci (jen když jste spokojeni)
```powershell
# 1. Vypnout emulátory (Ctrl+C)
# 2. Vypnout emulátory v .env (smazat nebo nastavit na false)
# 3. Deploy
firebase deploy --only functions
```

---

## ⚙️ Konfigurace

### Gemini API klíč

Pro emulátory: `functions/.env`
```bash
GEMINI_API_KEY=AIzaSyC7fTx21AnYkt5I0I5NSLnyU3BS_aN3RVE
```

Pro produkci: `firebase functions:config:set gemini.api_key="..."`

---

## 🐛 Troubleshooting

### Emulátory neběží
```powershell
# Zkontrolovat porty
netstat -ano | findstr "9099 5001 8080 9199 4000"
```

### Frontend se nepřipojuje
- Zkontrolujte, že `VITE_USE_FIREBASE_EMULATORS=true` je v root `.env`
- Restartujte dev server (`npm run dev`)

### Cloud Functions nefungují v emulátorech
- Zkontrolujte `functions/.env` - musí obsahovat `GEMINI_API_KEY`
- Zkontrolujte logy v Firebase UI: http://localhost:4000

---

## 📝 Poznámky

- **Emulátory používají lokální data** - změny se neukládají do Firebase
- **Firestore data** - jsou prázdná při každém restartu (kromě exportu/importu)
- **Deploy** - **NEZAPOMEŇTE** vypnout emulátory před deployem!

---

## 🎉 Hotovo!

Nyní můžete testovat všechny změny lokálně bez deployu! 🚀

