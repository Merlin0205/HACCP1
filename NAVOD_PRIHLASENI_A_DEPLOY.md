# 🔥 NÁVOD: Jak se přihlásit do Firebase a deploy aplikace

## ✅ CO JE UŽ HOTOVO
- ✅ Závislosti nainstalovány
- ✅ Build aplikace úspěšný
- ✅ Firebase CLI nainstalováno
- ✅ `.env` soubor vytvořen

---

## 📝 KROK ZA KROKEM

### Krok 1: Otevřete terminál v projektu

**Windows:**
1. Otevřete **PowerShell** nebo **Command Prompt**
2. Přejděte do složky projektu:
   ```powershell
   cd D:\Programovani\HACCP1
   ```

**Nebo přímo ve VS Code:**
- Klikněte na **Terminal** → **New Terminal** (nebo `Ctrl + Shift + `` ` ``)

---

### Krok 2: Přihlaste se do Firebase

V terminálu spusťte:
```bash
firebase login
```

**Co se stane:**
1. Otevře se vám **prohlížeč**
2. Zobrazí se **Firebase login stránka**
3. **Vyberte Google účet**, který máte spojený s Firebase projektem `haccp-2776d`
4. Klikněte na **"Allow"** nebo **"Povolit"**
5. V terminálu uvidíte: **"✔ Success! Logged in as [váš email]"**

**⚠️ DŮLEŽITÉ:** 
- Musíte být přihlášení do stejného Google účtu, který vlastní Firebase projekt
- Pokud projekt vlastní jiný účet, budete potřebovat přístup k tomuto účtu

---

### Krok 3: Ověřte, že jste správně přihlášení

```bash
firebase projects:list
```

**Měli byste vidět:**
```
┌─────────────────────┬──────────────────────┬─────────────────┐
│ Project Display Name│ Project ID           │ Project Number  │
├─────────────────────┼──────────────────────┼─────────────────┤
│ HACCP               │ haccp-2776d           │ 440620865103    │
└─────────────────────┴──────────────────────┴─────────────────┘
```

---

### Krok 4: Nastavte Gemini API klíč (VOLITELNÉ - pro AI funkce)

**Pokud máte Gemini API klíč:**
```bash
firebase functions:config:set gemini.api_key="VÁŠ_GEMINI_API_KLÍČ"
```

**Pokud nemáte Gemini API klíč:**
- Tento krok můžete přeskočit
- AI funkce (generování reportů, audio transcription) nebudou fungovat
- Zbytek aplikace bude fungovat normálně

---

### Krok 5: Deploy aplikace na Firebase

```bash
firebase deploy
```

**Co se stane:**
1. Firebase zkontroluje konfiguraci
2. Nasadí **Firestore rules** (security rules)
3. Nasadí **Storage rules**
4. Nasadí **Cloud Functions** (pokud jsou připravené)
5. Nasadí **Hosting** (web aplikaci)

**Celý proces trvá cca 2-5 minut.**

---

### Krok 6: Získejte URL aplikace

Po úspěšném deployi uvidíte:
```
✔  Deploy complete!

Hosting URL: https://haccp-2776d.web.app
```

**Vaše aplikace je nyní online na této adrese!** 🎉

---

## 🐛 ŘEŠENÍ PROBLÉMŮ

### "Error: Failed to authenticate"
→ Spusťte znovu `firebase login`

### "Error: Not authorized"
→ Ověřte, že jste přihlášení pod správným Google účtem

### "Error: Project not found"
→ Ověřte `.firebaserc` - mělo by obsahovat `"default": "haccp-2776d"`

### "Error: Functions deploy failed"
→ Je to v pořádku, pokud nemáte nastavený Gemini API klíč
→ Hosting a rules se nasadí i tak

---

## ✅ PO ÚSPĚŠNÉM DEPLOYI

1. Otevřete aplikaci: `https://haccp-2776d.web.app`
2. Zaregistrujte se (první účet)
3. Vytvořte zákazníka
4. Proveďte audit

---

## 📞 DALŠÍ POMOC

Pokud narazíte na problém:
- Zkontrolujte Firebase Console: https://console.firebase.google.com
- Podívejte se na logy: `firebase functions:log`
- Zkontrolujte Hosting: Firebase Console → Hosting

