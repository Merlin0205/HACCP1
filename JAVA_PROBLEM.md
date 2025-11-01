# ⚠️ JAVA JE POTŘEBNÁ PRO FIREBASE EMULÁTORY

## Problém

Firebase emulátory pro **Firestore** a **Auth** vyžadují **Java JDK**.  
Functions emulátor funguje bez Java.

---

## ✅ ŘEŠENÍ 1: Nainstalovat Java (DOPORUČENO)

### Krok 1: Stáhnout Java JDK
👉 https://adoptium.net/ (doporučuji Eclipse Temurin)

### Krok 2: Nainstalovat
- Stáhněte Windows x64 Installer
- Spusťte instalaci
- Restartujte terminál

### Krok 3: Ověřit instalaci
```powershell
java -version
```

### Krok 4: Spustit všechny emulátory
```powershell
firebase emulators:start
```

---

## ✅ ŘEŠENÍ 2: Použít jen Functions emulátor (RYCHLÉ)

**Functions emulátor funguje bez Java!**

### Spustit jen Functions emulátor:
```powershell
firebase emulators:start --only functions
```

### Co bude fungovat:
✅ **Cloud Functions** - lokálně (bez Java)  
⚠️ **Firestore** - produkce (potřebuje Java)  
⚠️ **Auth** - produkce (potřebuje Java)  
⚠️ **Storage** - produkce (potřebuje Java)  

---

## 🎯 CO DOPORUČUJI

**Pro rychlé testování Cloud Functions:**
- Použijte jen Functions emulátor
- Firestore/Auth budou používat produkci

**Pro kompletní lokální vývoj:**
- Nainstalujte Java JDK
- Pak můžete používat všechny emulátory

---

## 📝 Poznámka

Aktuálně je nastaveno:
- ✅ Functions emulátor - **LOKÁLNĚ** (port 5001)
- ⚠️ Firestore/Auth - **PRODUKCE** (dokud nenainstalujete Java)

To znamená, že:
- ✅ Cloud Functions můžete testovat lokálně
- ⚠️ Data se budou ukládat do produkčního Firestore (ale to je OK pro testování)

---

## 🚀 Po instalaci Java

Až nainstalujete Java:
1. Odkomentujte řádky v `firebaseConfig.ts`:
   ```typescript
   connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
   connectFirestoreEmulator(db, 'localhost', 8080);
   connectStorageEmulator(storage, 'localhost', 9199);
   ```
2. Spusťte: `firebase emulators:start`
3. Vše bude lokálně! 🎉

