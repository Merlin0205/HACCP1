# 🚀 LOKÁLNÍ VÝVOJ S FIREBASE EMULÁTORY

## Proč používat emulátory?

✅ **Rychlé testování** - Změny se projeví okamžitě bez deployu  
✅ **Zdarma** - Neplatíte za Cloud Functions volání  
✅ **Offline** - Funguje bez internetu  
✅ **Bezpečné** - Netestujete na produkčních datech  

---

## 📋 Nastavení

### 1. Aktivovat emulátory v `.env`

Přidejte do `.env`:
```bash
VITE_USE_FIREBASE_EMULATORS=true
```

### 2. Nastavit Gemini API klíč pro emulátory

V `functions/.env` (vytvořte soubor):
```bash
GEMINI_API_KEY=VÁŠ_GEMINI_API_KLÍČ
```

Nebo použijte existující z root `.env`:
```bash
# V functions/.env
GEMINI_API_KEY=AIzaSyC7fTx21AnYkt5I0I5NSLnyU3BS_aN3RVE
```

---

## 🎯 Spuštění lokálního vývoje

### Terminal 1: Spustit Firebase Emulátory
```powershell
cd D:\Programovani\HACCP1
firebase emulators:start
```

Emulátory běží na:
- **Firebase UI**: http://localhost:4000
- **Auth**: localhost:9099
- **Functions**: localhost:5001
- **Firestore**: localhost:8080
- **Storage**: localhost:9199

### Terminal 2: Spustit Frontend Dev Server
```powershell
cd D:\Programovani\HACCP1
npm run dev
```

Frontend běží na: **http://localhost:3000**

---

## 🔧 Workflow pro vývoj

### 1. Testování lokálně (s emulátory)
```powershell
# Terminal 1: Emulátory
firebase emulators:start

# Terminal 2: Frontend
npm run dev
```

### 2. Změny v Cloud Functions
```powershell
# Při změně v functions/src/*.ts
cd functions
npm run build

# Emulátory automaticky reloadují změny!
```

### 3. Deploy na produkci (jen když jste spokojeni)
```powershell
# Vypnout emulátory (Ctrl+C)
# Nastavit VITE_USE_FIREBASE_EMULATORS=false v .env (nebo smazat)
firebase deploy --only functions
```

---

## ⚙️ Konfigurace emulátorů

Emulátory jsou nakonfigurovány v `firebase.json`:
- **Auth**: port 9099
- **Functions**: port 5001  
- **Firestore**: port 8080
- **Storage**: port 9199
- **UI**: http://localhost:4000

---

## 📝 Důležité poznámky

1. **Emulátory používají lokální data** - změny se neukládají do Firebase
2. **Gemini API klíč** - musí být nastaven v `functions/.env` pro Cloud Functions
3. **Firestore data** - jsou prázdná při každém restartu (kromě exportu/importu)
4. **Deploy** - **NEZAPOMEŇTE** vypnout emulátory před deployem na produkci!

---

## 🐛 Troubleshooting

### Emulátory neběží
```powershell
# Zkontrolovat, jestli porty nejsou obsazené
netstat -ano | findstr "9099 5001 8080 9199 4000"
```

### Frontend se nepřipojuje k emulátorům
- Zkontrolujte, že `VITE_USE_FIREBASE_EMULATORS=true` je v `.env`
- Restartujte dev server (`npm run dev`)

### Cloud Functions nefungují
- Zkontrolujte, že `functions/.env` obsahuje `GEMINI_API_KEY`
- Zkontrolujte logy v Firebase UI: http://localhost:4000

---

## 🎉 Hotovo!

Nyní můžete testovat všechny změny lokálně bez deployu na Firebase! 🚀

