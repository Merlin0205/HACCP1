# 🤖 AI Content Suggestions - Návod k Použití

## 🎯 Co to je?

AI Content Suggestions je nová funkce Report Editoru, která automaticky analyzuje obsah vašich auditních neshod a navrhuje vylepšení pomocí umělé inteligence (Gemini).

## ✨ Co AI kontroluje?

AI analyzuje každé pole neshody (Místo, Zjištění, Doporučení) a hledá:

1. ✍️ **Gramatické chyby** - pravopis, překlepy
2. 💡 **Srozumitelnost** - jasné a jednoznačné formulace
3. 👔 **Profesionalitu** - odborná terminologie HACCP
4. 🏗️ **Strukturu** - logické uspořádání informací
5. 🎯 **Konkrétnost** - SMART doporučení (Specific, Measurable, Achievable, Relevant, Time-bound)

## 🚀 Jak to použít?

### Krok 1: Otevřete Editor
1. Dokončete audit
2. V náhledu reportu klikněte na **"✏️ Editor & AI Layout"**

### Krok 2: Spusťte AI Analýzu
1. Klikněte na tlačítko **"🤖 AI Návrhy"**
2. AI začne analyzovat obsah (může to trvat 10-30 sekund)
3. Po dokončení se automaticky zobrazí seznam návrhů

### Krok 3: Prohlédněte si návrhy

Každý návrh zobrazuje:
- 🏷️ **Kategorii** (gramatika, srozumitelnost, atd.)
- 📍 **Umístění** (které pole a která neshoda)
- 💭 **Důvod změny** - proč AI navrhuje úpravu
- 📊 **Jistotu** - jak moc je AI si jistá (0-100%)
- 📝 **Diff View** - porovnání původního a navrženého textu

### Krok 4: Accept nebo Reject

Pro každý návrh máte 3 možnosti:

#### Možnost A: Individuální kontrola
1. Klikněte na návrh pro rozbalení Diff Vieweru
2. Prohlédněte si změny (červeně = původní, zeleně = nový text)
3. Klikněte:
   - **✓ Přijmout změnu** - aplikuje návrh
   - **✗ Zamítnout** - ponechá původní text

#### Možnost B: Bulk Actions
- **✓ Přijmout vše** - aplikuje všechny návrhy najednou
- **✗ Zamítnout vše** - zavře AI návrhy bez změn

### Krok 5: Dokončení
1. Po aplikování změn se automaticky vrátíte do **Edit Mode**
2. Můžete provést další manuální úpravy
3. Pokračujte na **Preview** a **Export do PDF**

## 💡 Tipy a Triky

### ✅ Kdy použít AI návrhy?
- Máte hodně neshod a chcete rychlé vylepšení
- Chcete profesionálnější formulace
- Potřebujete kontrolu gramatiky
- Chcete konkrétnější doporučení

### ⚠️ Kdy být opatrní?
- Vždy zkontrolujte návrhy před přijetím
- AI nemusí znát specifický kontext vašeho podniku
- Některé technické termíny může AI změnit zbytečně

### 🎓 Best Practices
1. **Nejdřív AI, pak manuál** - nechte AI vylepšit text, pak dolaďte detaily
2. **Kontrolujte diff** - vždy se podívejte, co konkrétně AI mění
3. **Využijte bulk accept** - pokud vidíte, že většina návrhů je dobrých
4. **Kombinujte** - některé návrhy přijměte, jiné zamítněte

## 🔧 Technické detaily

### Jak to funguje?
1. AI dostane všechny neshody z reportu
2. Analyzuje každé pole (místo, zjištění, doporučení)
3. Generuje návrhy s důvody a jistotou
4. Vrací strukturovaný JSON s návrhy
5. Diff Viewer zobrazuje změny word-by-word

### Co když AI selže?
- Pokud AI nedokáže vygenerovat návrhy, zobrazí se prázdný seznam
- Můžete zkusit znovu nebo pokračovat s manuální editací
- Fallback: "Žádné návrhy nebyly vygenerovány"

### Limity
- AI může trvat 10-30 sekund (záleží na počtu neshod)
- Maximum přibližně 50 neshod najednou
- Vyžaduje VITE_GEMINI_API_KEY v .env

## 🐛 Troubleshooting

### AI tlačítko nereaguje
- Zkontrolujte konzoli (F12) - možná chybí API klíč
- Zkuste refreshnout stránku

### Návrhy vypadají divně
- AI není dokonalá - vždy kontrolujte před přijetím
- Zamítněte nesmyslné návrhy

### Diff Viewer se nezobrazuje
- Zkuste kliknout na návrh znovu
- Refreshněte stránku

## 📞 Podpora

Máte problém nebo nápad na vylepšení? Kontaktujte vývojáře nebo vytvořte issue.

---

**Verze:** 2.0  
**Poslední aktualizace:** 28. října 2025
