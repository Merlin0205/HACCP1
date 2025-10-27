
## Spuštění Aplikace

Pro plné fungování aplikace je potřeba spustit backendový server i frontendovou část.

**1. Spuštění backend serveru**

Otevřete terminál a spusťte následující příkaz:

`node server/index.js`

**2. Spuštění frontend aplikace**

Otevřete druhý terminál (nechte první běžet!) a spusťte:

`npm run dev`

# Popis Aplikace pro Audity

Tato aplikace je nástroj pro provádění auditů, který se skládá ze dvou hlavních částí: administrátorského rozhraní pro definování dotazníků a uživatelského rozhraní pro jejich vyplňování.

## Architektura

Aplikace je postavena na moderních webových technologiích, konkrétně na knihovně React s využitím TypeScriptu pro typovou kontrolu. Hlavní komponenta `App.tsx` slouží jako vstupní bod a řídí stav celé aplikace, přepíná mezi jednotlivými obrazovkami a spravuje data auditu.

Stav aplikace je spravován pomocí React hooks (`useState`, `useCallback`, `useMemo`) a pro perzistentní ukládání struktury auditu do lokálního úložiště prohlížeče je využit vlastní hook `usePersistentState`.

Klíčové komponenty a jejich role:

*   `AdminScreen.tsx`: Umožňuje administrátorům vytvářet, upravovat a mazat sekce a otázky v rámci dotazníku. Změny se ukládají lokálně v prohlížeči.
*   `AuditChecklist.tsx`: Zobrazuje dotazník pro uživatele, kteří na něj odpovídají. Umožňuje označit, zda daný bod vyhovuje, nebo je v neshodě.
*   `NonComplianceForm.tsx`: Formulář pro zadávání detailů o neshodě, včetně možnosti přidat fotografie a textový popis.
*   `SummaryReport.tsx`: Generuje souhrnnou zprávu po dokončení auditu. V případě neshod využívá API Gemini k vygenerování slovního hodnocení a závěru.
*   `geminiService.ts`: Služba pro komunikaci s Google Gemini API. Zajišťuje analýzu fotografií a generování textových obsahů pro zprávu.

## Administrátorské rozhraní

Administrátor má k dispozici rozhraní (`AdminScreen.tsx`), kde může plně upravovat strukturu dotazníku. Může:

*   Přidávat, přejmenovávat a mazat celé sekce dotazníku.
*   V rámci sekcí přidávat, upravovat a mazat jednotlivé kontrolní otázky.
*   Měnit pořadí sekcí i otázek pomocí drag-and-drop.
*   Aktivovat nebo deaktivovat jednotlivé sekce a otázky, které se pak (ne)zobrazí v uživatelském rozhraní.

Veškeré změny se díky hooku `usePersistentState` automaticky ukládají do lokálního úložiště prohlížeče, takže struktura dotazníku zůstane zachována i po znovunačtení stránky.

## Uživatelské rozhraní a průběh auditu

Uživatel (auditor) nejprve vidí úvodní obrazovku, kde může zahájit nový audit nebo nahrát rozpracovaný audit ze souboru.

1.  **Zadání základních údajů:** Před samotnou kontrolou uživatel vyplní formulář se základními údaji o auditu (kontrolovaná provozovna, provozovatel, auditor atd.).
2.  **Průběh kontroly:** V `AuditChecklist.tsx` se zobrazí aktivní otázky dotazníku, seskupené do sekcí. Uživatel prochází jednotlivé body a označuje je jako "Vyhovuje" nebo "Neshoda".
3.  **Zadávání neshod:** Pokud je nalezena neshoda, uživatel může otevřít modální okno `NonComplianceForm.tsx`, kde podrobně popíše problém:
    *   **Místo:** Kde se neshoda nachází.
    *   **Zjištění:** Podrobný popis problému.
    *   **Doporučení:** Návrh nápravného opatření.
    *   **Fotodokumentace:** Možnost nahrát jednu či více fotografií, které se uloží jako Base64 řetězec.
4.  **Generování zprávy:** Po dokončení kontroly se zobrazí `SummaryReport.tsx`. Tato komponenta:
    *   Sestaví kompletní HTML zprávu.
    *   Pokud byly zjištěny neshody, odešle jejich souhrn na Gemini API (`generateReportConclusionWithAI`) a do zprávy vloží vygenerovaný slovní výsledek a závěr.
    *   Zobrazí finální zprávu, kterou je možné uložit jako JSON soubor (pro pozdější nahrání) nebo vytisknout.

## Využití AI

Aplikace využívá Google Gemini API ve dvou klíčových momentech:

1.  **Analýza fotografií (`analyzeImageWithAI`):** Ačkoliv tato funkce není přímo volána z `NonComplianceForm.tsx`, je v `geminiService.ts` připravena. Umožňuje odeslat obrázek a získat zpět jeho popis, identifikovaná rizika a doporučení.
2.  **Generování závěru zprávy (`generateReportConclusionWithAI`):** Po dokončení auditu se souhrn všech neshod (bez fotografií, pouze textové popisy) odešle na Gemini API. To na základě dat vygeneruje profesionálně znějící slovní hodnocení a závěr, který se stane součástí finální zprávy. To šetří auditorovi čas a sjednocuje formální výstup.

## Ukládání dat

V současné verzi aplikace probíhá veškeré ukládání dat na straně klienta:

*   **Struktura auditu:** JSON objekt s definicí sekcí a otázek se ukládá do `localStorage` prohlížeče.
*   **Data probíhajícího auditu:** Kompletní stav auditu (vyplněné hlavičky, odpovědi, data o neshodách včetně Base64 fotek) se drží ve stavu React komponent. Uživatel si může celý stav uložit jako lokální `.json` soubor, který lze kdykoliv později znovu nahrát a pokračovat v práci nebo si jen prohlédnout výsledky.
