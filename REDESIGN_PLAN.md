# Plán redesignu obrazovky "Správa typů auditů"

## 1. Hlavní změny rozhraní

### Aktuální stav:
- Dropdown pro výběr typu
- Tlačítka pro akce pouze pro vybraný typ
- Neintuitivní workflow

### Nový design:
- **Seznam typů jako karty/boxy** - grid layout
- Každá karta je samostatná entita s vlastními akcemi
- Možnost kliknout na kartu pro zobrazení detailu (sekcí a položek)

## 2. Struktura karty typu auditu

Každá karta obsahuje:

### Hlavní obsah:
- **Název typu** (editovatelný - inline nebo přes modal)
- **Status badge** (Aktivní/Neaktivní) s barevným označením
- **Statistiky:**
  - Počet sekcí (celkem / aktivních)
  - Počet položek (celkem / aktivních)
  - Datum vytvoření/aktualizace (volitelně)

### Akční tlačítka/ikony:
1. **Edit (Upravit)** - ikona tužky
   - Možnost editovat název typu
   - Možnost editovat strukturu (sekce a položky)
   
2. **Toggle Active/Inactive** - ikona přepínače nebo checkmark
   - Aktivovat/deaktivovat typ
   - Změna barvy badge
   
3. **Copy/Duplicate (Kopírovat)** - ikona kopírování
   - Vytvořit kopii typu s novým názvem
   
4. **Delete (Smazat)** - ikona koše
   - Smazat typ (s potvrzením)

### Vizualizace:
- Aktivní typ: zelený border nebo pozadí
- Neaktivní typ: šedý border, snížená opacity
- Hover efekt: zvýraznění, stín

## 3. Funkcionalita

### Základní CRUD operace:
- ✅ **Create** - Přidat nový typ (tlačítko + Přidat typ)
- ✅ **Read** - Zobrazit seznam všech typů
- ✅ **Update** - Editovat název, strukturu, aktivaci
- ✅ **Delete** - Smazat typ

### Rozšířené funkce:
- 🔄 **Kopírovat typ** - duplikovat s novým názvem
- 📊 **Statistiky** - zobrazit počty sekcí/položek
- 🔍 **Filtrování** - zobrazit pouze aktivní/neaktivní
- 🔎 **Vyhledávání** - najít typ podle názvu
- 📝 **Inline editace názvu** - rychlá úprava názvu

### Workflow:
1. Zobrazení seznamu typů jako karty
2. Kliknutí na kartu → zobrazení detailu (sekcí a položek)
3. Úprava struktury v detailu
4. Uložení změn

## 4. Detailní rozhraní pro vybraný typ

Po kliknutí na kartu:
- Zobrazení sekcí a položek (současný design)
- Možnost přepínat mezi typy v sidebaru nebo breadcrumb
- Tlačítko "Uložit" pro uložení změn

## 5. Modaly

### Modal pro vytvoření nového typu:
- Vstupní pole: Název typu
- Checkbox: Zkopírovat strukturu z existujícího typu
- Dropdown: Výběr zdrojového typu (pokud kopírujeme)
- Tlačítka: Vytvořit / Zrušit

### Modal pro editaci názvu typu:
- Vstupní pole: Nový název
- Info: Aktuální název
- Tlačítka: Uložit / Zrušit

### Modal pro smazání typu:
- Potvrzení: Opravdu smazat?
- Info: Název typu, počet sekcí/položek
- Varování: Tato akce je nevratná
- Tlačítka: Smazat / Zrušit

## 6. Responzivní design

- Desktop: Grid 2-3 sloupce
- Tablet: Grid 2 sloupce
- Mobile: 1 sloupec, karty naplno

## 7. Dodatečné funkce (na které jsme možná zapomněli)

1. **Řazení typů** - podle názvu, data vytvoření, statusu
2. **Drag & drop pro změnu pořadí** (volitelně)
3. **Batch operace** - aktivovat/deaktivovat více typů najednou
4. **Export/Import typu** - exportovat strukturu do JSON
5. **Historie změn** - kdy byl typ vytvořen/upraven
6. **Použití typu** - kolik auditů používá tento typ (statistika)
7. **Validace** - kontrola duplicitních názvů při vytváření
8. **Tooltips** - vysvětlení akcí při hoveru
9. **Kontextové menu** - pravý klik pro rychlé akce
10. **Šablony** - možnost uložit typ jako šablonu

## 8. Implementační kroky

1. Vytvořit komponentu `AuditTypeCard` pro jednotlivé karty
2. Upravit `AdminScreen` - změnit dropdown na grid karet
3. Přidat modaly pro CRUD operace
4. Implementovat inline editaci názvu
5. Přidat statistiky do karet
6. Implementovat filtrování a vyhledávání
7. Přidat potvrzovací dialogy
8. Otestovat všechny operace
9. Přidat loading states a error handling
10. Finální styling a responzivita

## 9. Technické detaily

### Komponenty:
- `AuditTypeCard` - karta typu
- `AuditTypeGrid` - grid layout pro karty
- `AuditTypeDetail` - detail vybraného typu (současný obsah)
- `CreateAuditTypeModal` - modal pro vytvoření
- `EditAuditTypeNameModal` - modal pro editaci názvu
- `DeleteAuditTypeModal` - modal pro smazání

### State management:
- `selectedTypeId` - ID vybraného typu pro detail
- `editingTypeId` - ID typu v editaci
- `filterStatus` - filtr podle statusu
- `searchQuery` - vyhledávací dotaz

### API calls:
- `fetchAllAuditTypes()` - načtení všech typů
- `createAuditType()` - vytvoření nového typu
- `updateAuditType()` - aktualizace typu
- `deleteAuditType()` - smazání typu
- `copyAuditType()` - kopírování typu

