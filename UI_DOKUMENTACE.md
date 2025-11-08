# UI Dokumentace - Současný stav aplikace HACCP Audit

## Obsah
1. [Struktura aplikace](#struktura-aplikace)
2. [Design systém](#design-systém)
3. [Komponenty](#komponenty)
4. [Navigace a routing](#navigace-a-routing)
5. [Screeny a jejich zobrazení](#screeny-a-jejich-zobrazení)
6. [Responsivní design](#responsivní-design)
7. [Styling a CSS](#styling-a-css)

---

## Struktura aplikace

### Základní technologie
- **Framework**: React 19.2.0 + TypeScript
- **Build tool**: Vite 6.2.0
- **Styling**: Tailwind CSS (CDN)
- **Backend**: Firebase (Auth, Firestore, Storage, Functions)
- **Font**: Inter (Google Fonts)

### Adresářová struktura UI

```
components/
├── ui/                    # Základní UI komponenty
│   ├── Button.tsx        # Tlačítka (primary, secondary, ghost, danger)
│   ├── Card.tsx          # Karty (Card, CardHeader, CardBody, CardFooter)
│   ├── Input.tsx         # Inputy (TextField, TextArea, Select)
│   └── Modal.tsx         # Modální okna
├── icons/                # SVG ikony
├── Layout.tsx            # Hlavní layout s sidebar
├── Header.tsx            # Header (starší, nepoužívá se)
├── TabBar.tsx           # Tab navigace pro audity/reporty
├── MobileMenu.tsx        # Hamburger menu pro mobil
├── PageHeader.tsx        # Hlavička stránky s ikonou a popisem
├── OperatorDashboard.tsx # Dashboard zákazníků
├── AuditList.tsx         # Seznam auditů pro pracoviště
├── AllAuditsScreen.tsx   # Přehled všech auditů
├── AuditChecklist.tsx    # Checklist pro audit
├── ReportView.tsx        # Zobrazení reportu
├── SettingsScreen.tsx   # Nastavení aplikace
├── LoginScreen.tsx       # Přihlášení
├── RegisterScreen.tsx    # Registrace
└── ... další screeny
```

---

## Design systém

### Barvy

#### Primary Colors
- **primary-dark**: `#3B3F8C` (tmavě modrá)
- **primary**: `#5B5FC7` (hlavní modrá/fialová)
- **primary-light**: `#7C3AED` (světlejší fialová)
- **primary-lighter**: `#A78BFA` (nejsvětlejší fialová)

#### Accent Colors
- **accent-success**: `#10B981` (zelená)
- **accent-error**: `#EF4444` (červená)
- **accent-warning**: `#F59E0B` (oranžová)
- **accent-info**: `#3B82F6` (modrá)

#### Section Themes
Každá sekce má vlastní barevný motiv:
- **INCOMPLETE_AUDITS**: Indigo (#6366F1)
- **ALL_AUDITS**: Blue (#3B82F6)
- **OPERATOR_DASHBOARD**: Emerald (#10B981)
- **SETTINGS**: Slate (#64748B)

#### Tab Themes
- **audit**: Blue (#3B82F6)
- **report**: Emerald (#10B981)
- **audit_list**: Blue (#3B82F6)

### Typography
- **Font**: Inter (Google Fonts)
- **H1**: `text-2xl sm:text-3xl font-bold`
- **H2**: `text-xl sm:text-2xl font-bold`
- **H3**: `text-lg sm:text-xl font-semibold`
- **Body**: `text-sm sm:text-base`
- **Body Small**: `text-xs sm:text-sm`

### Spacing
- xs: 4px (0.25rem)
- sm: 8px (0.5rem)
- md: 16px (1rem)
- lg: 24px (1.5rem)
- xl: 32px (2rem)
- 2xl: 48px (3rem)

### Shadows
- sm: `shadow-sm`
- md: `shadow-md`
- lg: `shadow-lg`
- xl: `shadow-xl`

### Border Radius
- sm: `rounded-sm`
- md: `rounded-md`
- lg: `rounded-lg`
- xl: `rounded-xl`
- 2xl: `rounded-2xl`
- 3xl: `rounded-3xl`
- full: `rounded-full`

---

## Komponenty

### UI Komponenty (`components/ui/`)

#### Button (`Button.tsx`)
**Variants:**
- `primary`: Modrá/fialová barva (`bg-primary`)
- `secondary`: Světlejší modrá (`bg-primary-light`)
- `ghost`: Průhledné pozadí
- `danger`: Červená (`bg-accent-error`)

**Sizes:**
- `sm`: `px-3 py-1.5 text-sm`
- `md`: `px-4 py-2 text-base`
- `lg`: `px-6 py-3 text-lg`

**Props:**
- `variant`, `size`, `isLoading`, `leftIcon`, `rightIcon`, `fullWidth`

#### Card (`Card.tsx`)
**Subkomponenty:**
- `Card`: Základní wrapper
- `CardHeader`: Hlavička s border-bottom
- `CardBody`: Tělo karty
- `CardFooter`: Patička s border-top a šedým pozadím

**Props:**
- `hover`: Přidá hover efekt
- `onClick`: Umožní kliknutí na kartu

#### Input (`Input.tsx`)
**Komponenty:**
- `TextField`: Text input s label, error, helperText
- `TextArea`: Textarea s label, error, helperText
- `Select`: Select dropdown s options

**Props:**
- `label`, `error`, `helperText`, `leftIcon`, `rightIcon`

#### Modal (`Modal.tsx`)
**Sizes:**
- `sm`: `max-w-md`
- `md`: `max-w-2xl`
- `lg`: `max-w-4xl`
- `xl`: `max-w-6xl`
- `full`: `max-w-full mx-4`

**Funkce:**
- Zavření na Escape
- Zavření kliknutím na backdrop
- Mobile: bottom drawer, Desktop: centered modal

### Layout Komponenty

#### Layout (`Layout.tsx`)
**Hlavní struktura:**
```
<Layout>
  <aside>        <!-- Desktop Sidebar -->
  <header>       <!-- Top Header Bar -->
  <TabBar>       <!-- Tab navigace (pokud existují taby) -->
  <main>         <!-- Hlavní obsah -->
</Layout>
```

**Funkce:**
- Desktop: Fixed sidebar (64px/256px), collapsible
- Mobile: Hamburger menu, full-width content
- User menu s odhlášením
- AI náklady indikátor
- Verze aplikace

**Props:**
- `showSidebar`: Zobrazit/skrýt sidebar
- `currentView`: Aktuální AppState
- `tabs`, `activeTabId`: Tab systém
- `onNavigate`: Navigace mezi sekcemi

#### TabBar (`TabBar.tsx`)
**Typy tabů:**
- `audit_list`: Seznam auditů pro pracoviště
- `audit`: Aktivní audit
- `report`: Zobrazení reportu

**Funkce:**
- Zobrazení více tabů současně
- Aktivní tab má gradient background
- Zavření tabu (X ikona)
- Kliknutí na tab aktivuje ho

**Logika vytváření tabů:**
- Centrální funkce `openOrActivateTab()` v `App.tsx`
- Pokud existuje tab pro stejný audit/premise → aktivuje se existující tab
- Pokud existuje tab s jiným typem → aktualizuje se typ tabu
- Pokud tab neexistuje → vytvoří se nový tab

**Formát názvů tabů:**
- `audit_list`: "Audity ([Název pracoviště])"
- `audit`: "Audit ([Název provozovatele])"
- `report`: "Report ([Název provozovatele])"

**Tooltips:**
- Každý tab má `title` atribut s detaily (provozovatel, pracoviště, datum, status)

**"Zpět" navigace:**
- Pokud je aktivní `audit_list` tab → vrací na předchozí view (OPERATOR_DASHBOARD)
- Pokud je aktivní `audit` nebo `report` tab → vrací na AUDIT_LIST pro dané pracoviště
- Pokud nejsou taby → vrací na předchozí appState

#### MobileMenu (`MobileMenu.tsx`)
**Funkce:**
- Full-screen overlay na mobilu
- Seznam menu položek
- User info a odhlášení
- AI náklady indikátor

#### PageHeader (`PageHeader.tsx`)
**Struktura:**
- Ikona s gradient pozadím (podle section theme)
- Nadpis a popis
- Volitelná akce (tlačítko vpravo)

### Screen Komponenty

#### OperatorDashboard (`OperatorDashboard.tsx`)
**Funkce:**
- Zobrazení všech provozovatelů a jejich pracovišť
- Vyhledávání a řazení
- Rozbalovací sekce s pracovišti
- Desktop: Tabulka, Mobile: Karty
- Tooltips s detailními informacemi

**Akce:**
- Přidat zákazníka
- Editovat zákazníka
- Smazat zákazníka
- Přidat pracoviště
- Editovat pracoviště
- Smazat pracoviště
- Zobrazit audity pro pracoviště

#### AuditList (`AuditList.tsx`)
**Funkce:**
- Seznam auditů pro konkrétní pracoviště
- Filtrování podle statusu
- Řazení podle data/statusu
- Rozbalovací sekce s reporty (verze)
- Badge pro status auditu a reportu

**Akce:**
- Nový audit (s výběrem typu auditu)
- Otevřít audit
- Odemknout audit
- Smazat audit
- Zobrazit report
- Smazat verzi reportu
- Nastavit verzi jako aktuální

#### AllAuditsScreen (`AllAuditsScreen.tsx`)
**Funkce:**
- Kompletní přehled všech auditů
- Filtrování podle statusu a vyhledávání
- Řazení podle různých kritérií
- Rozbalovací sekce s reporty
- Desktop: Tabulka, Mobile: Karty

#### AuditChecklist (`AuditChecklist.tsx`)
**Funkce:**
- Sekce auditních bodů (collapsible)
- Grid zobrazení položek s ikonami
- Status indikátory (zelená/červená tečka)
- Non-compliance sidebar (desktop)
- Modal pro odpověď na položku
- Tlačítka: Uložit průběh, Dokončit audit

**UI prvky:**
- Sekce jsou sbalené defaultně
- Položky zobrazeny jako grid s ikonami
- Kliknutí na položku otevře modal
- Non-compliance sidebar zobrazuje neshody

#### ReportView (`ReportView.tsx`)
**Funkce:**
- Zobrazení kompletního reportu
- Verze reportů (výběr ze seznamu)
- Print styling
- Sekce: Záhlaví, Shrnutí, Seznam položek, Detail neshod

**Stavy:**
- `PENDING`: Čeká na generování
- `GENERATING`: Generuje se (spinner)
- `DONE`: Hotový report
- `ERROR`: Chyba při generování

#### SettingsScreen (`SettingsScreen.tsx`)
**Funkce:**
- Grid karet s nastaveními
- Ikony a barvy pro každou kategorii
- Navigace do podsekce

**Nastavení:**
- Správa uživatelů (admin only)
- Správa bodů auditu
- Údaje auditora
- Nastavení AI reportů
- Náklady na AI
- Ceny AI modelů
- AI Prompty

---

## Navigace a routing

### AppState (typ navigace)
```typescript
enum AppState {
  OPERATOR_DASHBOARD,      // Dashboard zákazníků
  ADD_OPERATOR,            // Formulář přidání zákazníka
  EDIT_OPERATOR,           // Formulář úpravy zákazníka
  ADD_PREMISE,             // Formulář přidání pracoviště
  EDIT_PREMISE,            // Formulář úpravy pracoviště
  AUDIT_LIST,              // Seznam auditů pro pracoviště
  HEADER_FORM,             // Formulář záhlaví auditu
  AUDIT_IN_PROGRESS,       // Aktivní audit (checklist)
  REPORT_VIEW,             // Zobrazení reportu
  INCOMPLETE_AUDITS,       // Nezapočaté audity
  ALL_AUDITS,              // Všechny audity
  SETTINGS,                // Nastavení
  USER_MANAGEMENT,         // Správa uživatelů
  AUDITOR_SETTINGS,         // Nastavení auditora
  AI_REPORT_SETTINGS,       // Nastavení AI reportů
  AI_USAGE_STATS,           // Statistiky AI
  AI_PRICING_CONFIG,        // Konfigurace cen AI
  AI_PROMPTS,               // AI Prompty
  ADMIN                     // Admin panel
}
```

### Navigační flow

1. **Přihlášení** (`LoginScreen`) → `App`
2. **Hlavní navigace** (Sidebar/MobileMenu):
   - Nezapočaté → `INCOMPLETE_AUDITS`
   - Audity vše → `ALL_AUDITS`
   - Zákazníci → `OPERATOR_DASHBOARD`
   - Nastavení → `SETTINGS`
3. **Zákazníci flow**:
   - Dashboard → Seznam provozovatelů
   - Klik na pracoviště → `AUDIT_LIST`
   - Klik na audit → `AUDIT_IN_PROGRESS` nebo `REPORT_VIEW`
   - Nový audit → `HEADER_FORM` → `AUDIT_IN_PROGRESS`
4. **Tab systém**:
   - Více otevřených auditů/reportů současně
   - Tab může být `audit_list`, `audit`, nebo `report`
   - Zavření tabu vrací na předchozí view

### Routing logika
- `App.tsx` obsahuje `renderContent()` který vrací správný screen podle `appState`
- Pokud existují taby, obsah se zobrazuje podle aktivního tabu
- Sidebar se skrývá pro formuláře (`ADD_OPERATOR`, `EDIT_OPERATOR`, `ADD_PREMISE`, `EDIT_PREMISE`)

---

## Screeny a jejich zobrazení

### OperatorDashboard
**Zobrazení:**
- Desktop: Tabulka s provozovateli (6 sloupců)
- Mobile: Karty s rozbalovacími sekcemi
- Tooltips s detailními informacemi

**Interakce:**
- Rozbalení sekce zobrazí pracoviště
- Klik na pracoviště → `AUDIT_LIST`
- Edit/Smazat tlačítka

### AuditList
**Zobrazení:**
- Desktop: Tabulka s audity
- Mobile: Karty s audity
- Rozbalovací sekce s reporty (verze)

**Interakce:**
- Nový audit → Modal s výběrem typu → `HEADER_FORM`
- Klik na audit → Otevře v tabu nebo přímo
- Odemknout audit → Změní status na `IN_PROGRESS`

### AuditChecklist
**Zobrazení:**
- Sekce (collapsible cards)
- Grid položek s ikonami
- Non-compliance sidebar (desktop, vpravo)
- Mobile: Floating button pro non-compliance

**Interakce:**
- Klik na sekci → Rozbalí/sbalí
- Klik na položku → Modal s odpovědí
- Uložit průběh → Uloží aktuální stav
- Dokončit audit → Vytvoří report

### ReportView
**Zobrazení:**
- Print-friendly layout
- Sekce: Záhlaví, Shrnutí, Seznam položek, Detail neshod
- Verze reportů (dropdown nebo seznam)

**Stavy:**
- `PENDING`: Čeká na generování
- `GENERATING`: Spinner + "Generuje se..."
- `DONE`: Zobrazení reportu
- `ERROR`: Chybová zpráva

### SettingsScreen
**Zobrazení:**
- Grid karet (1-3 sloupce podle velikosti obrazovky)
- Každá karta má ikonu, název, popis
- Barevné rozlišení kategorií

**Interakce:**
- Klik na kartu → Navigace do podsekce
- Admin only položky se zobrazí pouze adminům

---

## Responsivní design

### Breakpoints
- `xs`: 375px
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px (Desktop sidebar)
- `xl`: 1280px
- `2xl`: 1920px

### Mobile vs Desktop

#### Layout
- **Mobile**: Hamburger menu, full-width content, bottom drawer modals
- **Desktop**: Fixed sidebar, centered modals, více sloupců v gridu

#### Komponenty
- **OperatorDashboard**: Mobile = karty, Desktop = tabulka
- **AllAuditsScreen**: Mobile = karty, Desktop = tabulka
- **Modal**: Mobile = bottom drawer, Desktop = centered
- **TabBar**: Horizontal scroll na mobilu

#### Typography
- Responzivní velikosti: `text-sm sm:text-base`, `text-xl sm:text-2xl`

---

## Styling a CSS

### Tailwind CSS
- Používá se CDN verze Tailwind CSS
- Custom config v `index.html`:
  - Custom colors (primary, accent)
  - Custom fonts (Inter)
  - Custom breakpoints
  - Custom shadows a border radius

### Custom CSS (`index.css`)
- Animace: `slideIn`, `fadeInUp`, `scaleIn`
- Print styles: A4 formát, break-before/after
- Utility třídy: `animate-slide-in`, `animate-fade-in-up`, `animate-scale-in`

### Theme systém
- **Section Themes**: Každá sekce má vlastní barvy (`constants/designSystem.ts`)
- **Tab Themes**: Barvy pro různé typy tabů
- **Design Tokens**: Standardizované spacing, typography, shadows

### Gradienty
- Používají se pro aktivní stavy (sidebar menu, taby)
- Format: `bg-gradient-to-r from-[color] to-[color]`

---

## Další poznámky

### Ikony
- Vlastní SVG komponenty v `components/icons/`
- Import přes `components/icons/index.ts`
- Používají se jako React komponenty s className props

### Stavy a statusy
- **Audit Status**: DRAFT, NOT_STARTED, IN_PROGRESS, COMPLETED, REVISED, LOCKED
- **Report Status**: PENDING, GENERATING, DONE, ERROR
- Badge zobrazení s barevným rozlišením

### Loading states
- `Spinner` komponenta pro načítání
- `isLoading` prop na Button komponentě
- Loading overlay v některých screenách

### Error handling
- `ErrorBoundary` pro zachycení chyb
- Toast notifikace pro chyby (`ToastContainer`)
- Error states v komponentách (např. ReportView)

### Print styling
- Print-friendly CSS v `index.css`
- A4 formát s marginy
- Break-before/after pro sekce
- Skrytí navigace při tisku (`print:hidden`)

---

## Souhrn

**Současný stav:**
- Vlastní UI komponenty (Button, Card, Input, Modal)
- Tailwind CSS pro styling
- Vlastní design systém s section themes
- Responsivní design (mobile/desktop)
- Tab systém pro navigaci
- Sidebar navigace (desktop)
- Mobile menu (mobile)

**Hlavní oblasti pro migraci:**
1. Základní UI komponenty (Button, Card, Input, Modal) → Flowbite komponenty
2. Layout struktura → Flowbite Admin Dashboard layout
3. Tabulky → Flowbite Table komponenty
4. Formuláře → Flowbite Form komponenty
5. Modals → Flowbite Modal komponenty
6. Navigace → Flowbite Sidebar/Navbar komponenty
7. Badge/Status → Flowbite Badge komponenty
8. Design systém → Flowbite design tokens

