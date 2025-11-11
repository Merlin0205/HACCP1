# Jak zjistit, jestli AI funguje přes SDK nebo Cloud Functions

## V Developer Console (F12)

Když použiješ AI funkci (např. přepis neshody), v konzoli uvidíš:

### ✅ Pokud funguje přes SDK:
```
[AI Logic SDK] 🔧 Inicializuji Firebase AI Logic SDK...
[AI Logic SDK] ✅ SDK úspěšně inicializováno
[AI] 🚀 Používám Firebase AI Logic SDK pro rewriteFinding
[AI Logic SDK] 📤 Volám model "gemini-2.5-flash" přes Firebase AI Logic SDK
[AI Logic SDK] 📥 Odpověď přijata: 150 tokenů (prompt: 100, completion: 50)
[AI] ✅ SDK úspěšně dokončeno: {model: "gemini-2.5-flash", tokens: 150, ...}
```

### ⚠️ Pokud funguje přes Cloud Functions (fallback):
```
[AI] 🚀 Používám Firebase AI Logic SDK pro rewriteFinding
[AI Logic SDK] ❌ Chyba při generování obsahu: [chyba]
[AI] ⚠️  SDK selhalo, používám Cloud Functions fallback: [chyba]
[AI] 📡 Volám Cloud Function generateText
[AI] ✅ Cloud Functions úspěšně dokončeno
```

## Jak vypnout fallback (pro testování SDK)

Pokud chceš otestovat, jestli SDK funguje bez fallbacku:

1. Otevři soubor `.env` v kořenovém adresáři
2. Přidej řádek:
   ```
   VITE_DISABLE_AI_FALLBACK=true
   ```
3. Restartuj dev server (`npm run dev`)
4. Zkus použít AI funkci

**Pozor:** Pokud SDK selže a fallback je vypnutý, AI funkce selže s chybou. To je normální - použij to jen pro testování.

## Jak zkontrolovat, že SDK funguje správně

1. **Otevři Developer Console** (F12)
2. **Použij AI funkci** (např. přepis neshody)
3. **Sleduj logy:**
   - Pokud vidíš `🚀 Používám Firebase AI Logic SDK` → SDK se používá
   - Pokud vidíš `✅ SDK úspěšně dokončeno` → SDK funguje správně
   - Pokud vidíš `⚠️ SDK selhalo, používám Cloud Functions fallback` → SDK selhalo, použil se fallback

## Co znamenají jednotlivé logy

- `🚀 Používám Firebase AI Logic SDK` - Začátek SDK volání
- `✅ SDK úspěšně dokončeno` - SDK volání proběhlo úspěšně
- `📡 Volám Cloud Function` - Používá se Cloud Functions fallback
- `⚠️ SDK selhalo` - SDK selhalo, použije se fallback
- `❌ SDK selhalo a fallback je vypnutý` - SDK selhalo a fallback je vypnutý (pouze pokud je `VITE_DISABLE_AI_FALLBACK=true`)

## Tipy

- **Pro normální použití:** Nech fallback zapnutý (default) - aplikace bude fungovat i když SDK selže
- **Pro testování SDK:** Vypni fallback (`VITE_DISABLE_AI_FALLBACK=true`) - uvidíš, jestli SDK skutečně funguje
- **V produkci:** Fallback by měl být zapnutý pro spolehlivost

