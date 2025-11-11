# Diagnostika Firebase AI Logic SDK

## Problém: Všechny volání jdou přes Cloud Functions (CF), ne přes SDK

### Možné příčiny:

1. **App Check není nastavený**
   - SDK vyžaduje App Check pro bezpečnost
   - Zkontroluj `.env` - měl by obsahovat `VITE_RECAPTCHA_SITE_KEY`
   - Pokud není nastaven, SDK volání selhávají a automaticky se používá fallback

2. **SDK se neinicializuje správně**
   - Zkontroluj konzoli při načítání stránky
   - Měl bys vidět: `[AI Logic SDK] 🔧 Inicializuji Firebase AI Logic SDK...`
   - Pokud nevidíš tento log, SDK se neinicializuje

3. **Chyba při SDK volání**
   - Zkontroluj konzoli při použití AI funkce
   - Měl bys vidět buď:
     - `[AI Logic SDK] ✅ SDK úspěšně dokončeno` → SDK funguje
     - `[AI Logic SDK] ❌ Chyba při generování obsahu` → SDK selhalo

## Jak zkontrolovat:

### 1. Otevři Developer Console (F12)
   - Klikni na záložku "Console"
   - Zkontroluj, jestli nejsou filtrované logy (zkontroluj filtry vpravo nahoře)

### 2. Obnov stránku (F5)
   - Měl bys vidět logy při inicializaci:
     ```
     [Firebase] ✅ App Check initialized
     [AI Logic SDK] 🔧 Inicializuji Firebase AI Logic SDK...
     [AI Logic SDK] ✅ SDK úspěšně inicializováno
     ```

### 3. Použij AI funkci (např. přepis neshody)
   - Měl bys vidět buď:
     ```
     [AI] 🚀 Používám Firebase AI Logic SDK pro rewriteFinding
     [AI Logic SDK] 📤 Volám model "gemini-2.5-flash" přes Firebase AI Logic SDK
     [AI Logic SDK] ✅ SDK úspěšně dokončeno
     ```
     NEBO
     ```
     [AI] 🚀 Používám Firebase AI Logic SDK pro rewriteFinding
     [AI Logic SDK] ❌ Chyba při generování obsahu: [chyba]
     [AI] ⚠️  SDK selhalo, používám Cloud Functions fallback
     ```

## Řešení:

### Pokud nevidíš žádné logy v konzoli:
1. **Zkontroluj filtry konzole:**
   - V konzoli klikni na ikonu filtrů (🔍)
   - Zkontroluj, jestli nejsou zapnuté filtry jako "Hide network", "Errors only", atd.
   - Zkus vypnout všechny filtry

2. **Zkontroluj `.env` soubor:**
   ```env
   VITE_RECAPTCHA_SITE_KEY=...tvoje reCAPTCHA site key...
   ```
   - Pokud není nastaven, SDK nemůže fungovat
   - Potřebuješ reCAPTCHA Enterprise site key z Firebase Console

### Pokud vidíš chybu při SDK volání:
- Zkopíruj celou chybu z konzole
- Měl bys vidět detailní informace o chybě v logu:
  ```
  [AI Logic SDK] ❌ Chyba při generování obsahu: {
    message: "...",
    code: "...",
    ...
  }
  ```

### Pokud App Check není nastavený:
1. Jdi do Firebase Console → App Check
2. Vytvoř nový App Check token provider (reCAPTCHA Enterprise)
3. Zkopíruj Site Key
4. Přidej do `.env`:
   ```env
   VITE_RECAPTCHA_SITE_KEY=tvoje-site-key
   ```
5. Restartuj dev server

## Testování:

Po úpravách zkus:
1. Obnov stránku (F5)
2. Otevři konzoli (F12)
3. Použij AI funkci (např. přepis neshody)
4. Sleduj logy v konzoli
5. Zkontroluj tabulku nákladů - měl by se zobrazit badge "🚀 SDK" místo "📡 CF"

