# Kroky pro nastavení Firebase Console

## 1. Aktivovat Firebase AI Logic API

1. Otevři Firebase Console: https://console.firebase.google.com/
2. Vyber svůj projekt
3. V levém menu klikni na **"Build"** → **"AI Logic"**
4. Pokud ještě není aktivní, klikni na **"Enable AI Logic API"**
5. Počkej na aktivaci (může trvat několik minut)

## 2. Nastavit App Check s reCAPTCHA Enterprise

### 2.1 Vytvořit reCAPTCHA Enterprise site

1. V Firebase Console přejdi na **"Build"** → **"App Check"**
2. Klikni na **"Get started"** nebo **"Add app"**
3. Vyber **"Web"** (reCAPTCHA Enterprise)
4. Zadej název aplikace (např. "HACCP Audit Assistant")
5. Klikni na **"Register"**
6. **Zkopíruj Site Key** - budeš ho potřebovat do `.env` souboru

### 2.2 Přidat Site Key do aplikace

1. Otevři soubor `.env` v kořenovém adresáři projektu
2. Přidej řádek:
   ```
   VITE_RECAPTCHA_SITE_KEY=tvuj-site-key-zde
   ```
3. Ulož soubor

### 2.3 (Volitelné) Nastavit App Check enforcement

1. V App Check sekci klikni na **"APIs"** tab
2. Pro **Cloud Functions** můžeš nastavit enforcement (ale není nutné, protože máš fallback)
3. Pro **Firebase AI Logic** by enforcement měl být automatický

## 3. Ověření nastavení

Po nastavení:
1. Restartuj dev server (`npm run dev`)
2. Otevři aplikaci v prohlížeči
3. Otevři Developer Console (F12)
4. Měl bys vidět: `[Firebase] ✅ App Check initialized`
5. Pokud vidíš varování, zkontroluj, že máš správný Site Key v `.env`

## 4. Testování

1. Přihlas se do aplikace
2. Zkus použít AI funkce (např. přepis neshody)
3. V Developer Console bys měl vidět:
   - Pokud SDK funguje: `[AI Logic SDK]` logy
   - Pokud SDK selže: `SDK failed, using Cloud Functions fallback` (to je OK, fallback funguje)

## Poznámky

- **Cloud Functions zůstávají jako fallback** - pokud SDK selže, automaticky se použijí Cloud Functions
- **App Check není kritické** - aplikace může fungovat i bez něj, ale doporučuje se ho mít pro produkci
- **Ceny modelů** - systém automaticky používá výchozí ceny z `DEFAULT_GEMINI_MODELS`, můžeš je upravit přes UI v nastavení

## Troubleshooting

### Pokud SDK nefunguje:
- Zkontroluj, že máš aktivovaný Firebase AI Logic API
- Zkontroluj, že máš správný Site Key v `.env`
- Zkontroluj Developer Console pro chyby
- Fallback na Cloud Functions by měl fungovat automaticky

### Pokud App Check nefunguje:
- Zkontroluj, že máš správný Site Key
- Zkontroluj, že reCAPTCHA Enterprise je aktivní v Google Cloud Console
- Aplikace může fungovat i bez App Check (ale není doporučeno pro produkci)

