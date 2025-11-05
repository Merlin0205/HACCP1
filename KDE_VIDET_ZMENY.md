# Kde vidět změny v UI

## 🚀 Dev server

Server běží na: **http://localhost:5173** (nebo jiný port podle vite.config.ts)

Otevři v prohlížeči a podívej se na změny!

## 📁 Nové soubory (komponenty)

1. **`components/ui/Tooltip.tsx`** - Jednotný tooltip komponent
   - Automatické pozicování
   - Podpora všech směrů (top, bottom, left, right)
   - Použití: `<Tooltip content="Text">...</Tooltip>`

2. **`components/ui/Badge.tsx`** - Jednotný badge komponent
   - Různé varianty (success, warning, error, info, neutral)
   - Použití: `<Badge variant="success">Hotovo</Badge>`

3. **`components/ui/EmptyState.tsx`** - Jednotný empty state
   - Použití: `<EmptyState title="Žádná data" description="..." />`

4. **`components/ui/index.tsx`** - Export všech UI komponentů

5. **`utils/badges.tsx`** - Helper funkce pro status badges
   - `getAuditStatusBadge()` - badge pro audit status
   - `getReportStatusBadge()` - badge pro report status

## 📝 Aktualizované soubory

1. **`components/AllAuditsScreen.tsx`**
   - ✅ Používá jednotné Tooltip komponenty
   - ✅ Používá jednotné Badge komponenty
   - ✅ Používá EmptyState komponent
   - ✅ Konzistentní tooltips místo vlastních řešení

2. **`constants/designSystem.ts`**
   - ✅ Rozšířené design tokens
   - ✅ Konzistentní barevná paleta
   - ✅ Breakpoints pro responzivitu

## 🔍 Kde vidět změny v aplikaci

### 1. Seznam všech auditů ("Audity vše")
- **Cesta:** Menu → "Audity vše"
- **Co uvidíš:**
  - Jednotné tooltips při hoveru nad provozovateli/pracovišti
  - Jednotné badge komponenty pro statusy
  - Empty state když nejsou žádné audity

### 2. Status badges
- **Kde:** Všude kde se zobrazují statusy auditů/reportů
- **Co se změnilo:** Všechny statusy používají jednotný Badge komponent

### 3. Tooltips
- **Kde:** Při hoveru nad:
  - Provozovateli (ukáže IČO, adresu, kontakt)
  - Pracovišti (ukáže adresu, odpovědnou osobu, kontakt)
  - Tlačítky (ukáže popis akce)

## 🎨 Design systém

Všechny komponenty používají konzistentní:
- **Barvy:** Definované v `constants/designSystem.ts` → `COLORS`
- **Spacing:** Používá `DESIGN_TOKENS.spacing`
- **Typography:** Používá `DESIGN_TOKENS.typography`

## 📱 Responzivita

Všechny komponenty jsou responzivní:
- Desktop: Plná funkcionalita
- Tablet: Upravené rozložení
- Mobile: Optimalizované pro dotykové ovládání

## 🧪 Testování

1. **Tooltips:** Najdi kurzorem nad provozovatele/pracoviště → uvidíš jednotný tooltip
2. **Badges:** Podívej se na statusy auditů → všechny jsou jednotné
3. **Empty state:** Vytvoř filtr který nenajde žádné audity → uvidíš jednotný empty state

## ⚠️ Poznámka

Všechny změny jsou **pouze vizuální** - žádné změny v backendu nebo funkcionalitě.
Aplikace funguje stejně, jen má jednotnější a modernější vzhled!
