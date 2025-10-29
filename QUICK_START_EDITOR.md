# 🚀 Quick Start - PDF Report Editor

## ⚡ Rychlý Návod

### 1️⃣ Spuštění Aplikace

```bash
# Terminál 1 - Backend
node server/index.js

# Terminál 2 - Frontend
npm run dev
```

Otevřete: **http://localhost:3000**

---

### 2️⃣ Použití Report Editoru

#### Krok 1: Vytvořte Audit s Neshodami
1. Přidejte nebo vyberte zákazníka
2. Vytvořte nový audit
3. Projděte kontrolní body
4. Označte nějaké jako "Neshoda"
5. Přidejte fotky a popisy
6. Dokončete audit

#### Krok 2: Počkejte na AI Report
- Report se automaticky vygeneruje
- Status: PENDING → GENERATING → DONE

#### Krok 3: Otevřete Editor
1. V náhledu reportu klikněte na **"✏️ Editor & AI Layout"**
2. Otevře se Report Editor

#### Krok 4: Editujte Report

**V Edit Mode můžete:**
- ✏️ Upravit texty neshod
- 📏 Změnit velikost obrázků (slider 30-100%)
- 🗑️ Smazat nežádoucí fotky
- ⬆️⬇️ Přidat page breaks (tlačítka Break)

**AI Optimalizace (volitelné):**
1. Klikněte **"🤖 AI Optimalizace"**
2. AI navrhne optimální rozložení stránek
3. Počkejte na výsledek (~5-10 sekund)

#### Krok 5: Preview
1. Klikněte **"👁 Preview"**
2. Zkontrolujte finální vzhled

#### Krok 6: Export do PDF
1. Klikněte **"📄 Export do PDF"**
2. Použijte funkci tisku prohlížeče:
   - **Chrome/Edge:** "Uložit jako PDF"
   - **Firefox:** "Tisk do PDF"

---

## 🎯 Co Editor Řeší

### Problém: Špatné Formátování Obrázků
**Před:**
```
┌─────────────────────────┐
│ [IMG] [IMG] [IMG]       │ ← Grid, dělí se špatně
│ [IMG]                   │ ← Zbývá 1 obrázek
└─────────────────────────┘
┌─────────────────────────┐
│ (nová stránka)          │
└─────────────────────────┘
```

**Po:**
```
┌─────────────────────────┐
│ [IMG - 100% width]      │ ← Jeden po druhém
│ [IMG - 100% width]      │
│ [IMG - 100% width]      │
└─────────────────────────┘
┌─────────────────────────┐
│ [IMG - 100% width]      │
└─────────────────────────┘
```

### Problém: Neshoda Se Rozdělí
**Před:**
```
┌─────────────────────────┐
│ Neshoda #1:             │
│ - Místo: Kuchyně        │
│ - Zjištění: ...         │
└─────────────────────────┘
┌─────────────────────────┐ ← Rozděleno!
│ - Doporučení: ...       │
│ [IMG]                   │
└─────────────────────────┘
```

**Po (s page break):**
```
┌─────────────────────────┐
│ ... konec předchozí     │
└─────────────────────────┘
┌─────────────────────────┐ ← Page break před
│ Neshoda #1:             │
│ - Místo: Kuchyně        │
│ - Zjištění: ...         │
│ - Doporučení: ...       │
│ [IMG]                   │
└─────────────────────────┘
```

---

## 🤖 AI Optimalizace - Jak Funguje

1. **Analýza:**
   - AI spočítá délku textů
   - Spočítá počet fotek
   - Odhadne výšku každé neshody

2. **Optimalizace:**
   - Rozdělí neshody do stránek
   - Minimalizuje počet stránek
   - Zajistí, že se neshody nedělí

3. **Výsledek:**
   - Automaticky přidá page breaks
   - Zobrazí confidence (0-100%)
   - Pokud AI selže, použije se jednoduchý algoritmus

---

## 💡 Tipy & Triky

### Tip 1: Velikost Obrázků
- **100%** - Celá šířka (dobré pro detail)
- **70%** - Střední (dobré pro 2 obrázky vedle sebe mentálně)
- **50%** - Malé (přehled)

### Tip 2: Page Breaks
- **⬆ Break** - Nová stránka **před** touto neshodou
- **⬇ Break** - Nová stránka **po** této neshodě
- Použijte, když chcete logicky oddělit sekce

### Tip 3: Preview Před Exportem
- Vždy si zkontrolujte Preview
- Ujistěte se, že obrázky nejsou rozříznuté
- Zkontrolujte page breaks

### Tip 4: AI Optimalizace
- Funguje nejlépe s 3+ neshodami
- Pokud máte jen 1-2 neshody, použijte manuální page breaks
- AI bere v úvahu délku textu + počet fotek

---

## 🐛 Troubleshooting

### Editor Se Nenačte
**Problém:** Tlačítko "Editor & AI Layout" není vidět  
**Řešení:** Report musí být ve stavu DONE (vygenerovaný)

### AI Optimalizace Selže
**Problém:** AI vrátí chybu  
**Řešení:** Automaticky se použije fallback algoritmus (jednoduchý)

### Obrázky Se Stále Špatně Tisknou
**Problém:** V Chromu se obrázky ořezávají  
**Řešení:**
1. V Print dialogu vypněte "Headers & Footers"
2. Nastavte "Margins" na "None" nebo "Minimum"
3. Zkuste jinou velikost obrázků (např. 90% místo 100%)

### Export Do PDF Nefunguje
**Problém:** Tlačítko Export nic nedělá  
**Řešení:**
1. Ujistěte se, že máte zapnuté pop-ups
2. Zkuste jiný prohlížeč (Chrome doporučeno)
3. Použijte Ctrl+P manuálně

---

## 📞 Potřebujete Pomoc?

1. Přečtěte si **PDF_REPORT_EDITOR.md** (kompletní dokumentace)
2. Zkontrolujte konzoli (F12) pro chyby
3. Zkontrolujte, že backend běží (port 9002)

---

**Verze:** 2.0.0  
**Datum:** 28. října 2025  
**Status:** ✅ Připraveno k použití
