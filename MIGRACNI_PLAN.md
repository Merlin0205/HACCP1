# Migrační plán - Přechod na Flowbite Admin Dashboard

## Přehled

Tento dokument popisuje detailní plán migrace UI aplikace HACCP Audit z vlastních komponent na Flowbite Admin Dashboard framework. Migrace zachová veškerou existující logiku a backend, mění se pouze UI vrstva.

**Cíl:** Jednotný, profesionální UI design založený na Flowbite Admin Dashboard, zachování všech funkcionalit.

---

## Předpoklady

### Současný stav
- React 19.2.0 + TypeScript
- Vite 6.2.0
- Tailwind CSS (CDN)
- Firebase (Auth, Firestore, Storage, Functions)
- Vlastní UI komponenty

### Cílový stav
- React 19.2.0 + TypeScript (zachováno)
- Vite 6.2.0 (zachováno)
- Tailwind CSS (nainstalováno jako npm package)
- Flowbite React komponenty
- Flowbite Admin Dashboard layout a styling
- Firebase (zachováno - žádné změny)

---

## Fáze migrace

### FÁZE 1: Příprava a instalace (1-2 dny)

#### 1.1 Instalace závislostí

```bash
# Instalace Flowbite React a Tailwind CSS
npm install flowbite-react
npm install -D tailwindcss postcss autoprefixer

# Instalace Flowbite plugin pro Tailwind
npm install -D flowbite

# Instalace Flowbite Icons (volitelné, ale doporučeno)
npm install flowbite-icons
```

#### 1.2 Konfigurace Tailwind CSS

**Vytvořit `tailwind.config.js`:**
```javascript
import flowbite from "flowbite-react/tailwind";

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./App.tsx",
    "./AppWithAuth.tsx",
    "node_modules/flowbite-react/lib/esm/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        // Zachovat vlastní primary barvy pro branding
        primary: {
          dark: '#3B3F8C',
          DEFAULT: '#5B5FC7',
          light: '#7C3AED',
          lighter: '#A78BFA',
        },
        accent: {
          success: '#10B981',
          error: '#EF4444',
          warning: '#F59E0B',
          info: '#3B82F6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [flowbite],
};
```

**Vytvořit `postcss.config.js`:**
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

#### 1.3 Aktualizace CSS

**Upravit `index.css`:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Zachovat vlastní animace */
@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* ... další animace ... */

/* Zachovat print styles */
@media print {
  /* ... existující print styles ... */
}
```

**Odstranit Tailwind CDN z `index.html`** (nyní používáme npm balíček)

#### 1.4 Inicializace Flowbite React

**Vytvořit `src/flowbite-init.ts`:**
```typescript
import { initFlowbite } from 'flowbite-react';

// Inicializace Flowbite pro interaktivní komponenty
initFlowbite();
```

**Přidat do `index.tsx` nebo `App.tsx`:**
```typescript
import './flowbite-init';
```

---

### FÁZE 2: Migrace základních UI komponent (3-5 dní)

#### 2.1 Button komponenta

**Současný stav:** `components/ui/Button.tsx`
**Cíl:** Použít Flowbite `Button` komponentu

**Migrace:**
- Nahradit import: `import { Button } from 'flowbite-react';`
- Mapovat varianty:
  - `primary` → `Button color="blue"` nebo vlastní styling
  - `secondary` → `Button color="purple"` (pro primary-light)
  - `ghost` → `Button color="gray" outline`
  - `danger` → `Button color="failure"`
- Mapovat sizes:
  - `sm` → `size="xs"`
  - `md` → `size="sm"` (default)
  - `lg` → `size="md"`
- Zachovat props: `isLoading`, `leftIcon`, `rightIcon`, `fullWidth`

**Soubory k úpravě:**
- `components/ui/Button.tsx` → Wrapper nad Flowbite Button
- Všechny komponenty používající Button

#### 2.2 Card komponenta

**Současný stav:** `components/ui/Card.tsx`
**Cíl:** Použít Flowbite `Card` komponentu

**Migrace:**
- Nahradit import: `import { Card } from 'flowbite-react';`
- Mapovat subkomponenty:
  - `Card` → `Card`
  - `CardHeader` → `Card` s `horizontal` prop nebo vlastní header
  - `CardBody` → `Card` obsah
  - `CardFooter` → `Card` s footer prop

**Soubory k úpravě:**
- `components/ui/Card.tsx` → Wrapper nad Flowbite Card
- Všechny screeny používající Card

#### 2.3 Input komponenty

**Současný stav:** `components/ui/Input.tsx`
**Cíl:** Použít Flowbite form komponenty

**Migrace:**
- `TextField` → `TextInput` z Flowbite
- `TextArea` → `Textarea` z Flowbite
- `Select` → `Select` z Flowbite
- Použít `Label` komponentu z Flowbite

**Soubory k úpravě:**
- `components/ui/Input.tsx` → Wrapper nad Flowbite form komponenty
- Všechny formuláře

#### 2.4 Modal komponenta

**Současný stav:** `components/ui/Modal.tsx`
**Cíl:** Použít Flowbite `Modal` komponentu

**Migrace:**
- Nahradit import: `import { Modal } from 'flowbite-react';`
- Mapovat sizes:
  - `sm` → `size="sm"`
  - `md` → `size="md"`
  - `lg` → `size="lg"`
  - `xl` → `size="xl"`
  - `full` → `size="7xl"`
- Zachovat props: `isOpen`, `onClose`, `title`, `footer`, `children`

**Soubory k úpravě:**
- `components/ui/Modal.tsx` → Wrapper nad Flowbite Modal
- Všechny modaly v aplikaci

---

### FÁZE 3: Migrace Layout komponent (4-6 dní)

#### 3.1 Layout komponenta

**Současný stav:** `components/Layout.tsx`
**Cíl:** Použít Flowbite Admin Dashboard layout strukturu

**Migrace:**
- **Sidebar:** Použít Flowbite `Sidebar` komponentu
  - Desktop: Fixed sidebar s collapsible funkcí
  - Mobile: Hamburger menu s Drawer
- **Header:** Použít Flowbite `Navbar` komponentu
  - User menu s Dropdown
  - AI náklady indikátor
- **Main content:** Zachovat strukturu, použít Flowbite spacing utilities

**Komponenty Flowbite:**
```typescript
import { Sidebar, Navbar, Dropdown } from 'flowbite-react';
```

**Soubory k úpravě:**
- `components/Layout.tsx` → Kompletní přepis s Flowbite komponentami
- `components/MobileMenu.tsx` → Použít Flowbite Drawer nebo Sidebar pro mobile

#### 3.2 TabBar komponenta

**Současný stav:** `components/TabBar.tsx`
**Cíl:** Použít Flowbite `Tabs` komponentu nebo vlastní implementaci s Flowbite styling

**Migrace:**
- Pokud Flowbite Tabs nevyhovuje, použít vlastní implementaci s Flowbite styling
- Zachovat funkčnost: více tabů, zavření tabu, aktivní tab

**Soubory k úpravě:**
- `components/TabBar.tsx` → Přepis s Flowbite styling

#### 3.3 PageHeader komponenta

**Současný stav:** `components/PageHeader.tsx`
**Cíl:** Zachovat funkčnost, použít Flowbite styling

**Migrace:**
- Zachovat strukturu a funkčnost
- Použít Flowbite typography a spacing utilities
- Ikony z Flowbite Icons nebo zachovat vlastní

**Soubory k úpravě:**
- `components/PageHeader.tsx` → Úprava styling na Flowbite

---

### FÁZE 4: Migrace Screen komponent (7-10 dní)

#### 4.1 OperatorDashboard

**Současný stav:** `components/OperatorDashboard.tsx`
**Cíl:** Použít Flowbite Table komponenty

**Migrace:**
- Desktop tabulka: Použít Flowbite `Table` komponentu
- Mobile karty: Použít Flowbite `Card` komponenty
- Tooltips: Použít Flowbite `Tooltip` komponentu
- Badge: Použít Flowbite `Badge` komponentu

**Flowbite komponenty:**
```typescript
import { Table, Card, Tooltip, Badge } from 'flowbite-react';
```

**Soubory k úpravě:**
- `components/OperatorDashboard.tsx` → Přepis tabulky a karet

#### 4.2 AuditList a AllAuditsScreen

**Současný stav:** `components/AuditList.tsx`, `components/AllAuditsScreen.tsx`
**Cíl:** Použít Flowbite Table a Card komponenty

**Migrace:**
- Stejný přístup jako OperatorDashboard
- Badge pro statusy: Použít Flowbite `Badge` s různými barvami
- Dropdown pro verze reportů: Použít Flowbite `Dropdown`

**Soubory k úpravě:**
- `components/AuditList.tsx`
- `components/AllAuditsScreen.tsx`

#### 4.3 AuditChecklist

**Současný stav:** `components/AuditChecklist.tsx`
**Cíl:** Zachovat funkčnost, použít Flowbite styling

**Migrace:**
- Sekce: Použít Flowbite `Accordion` nebo `Collapse` komponentu
- Grid položek: Zachovat, použít Flowbite spacing
- Badge pro status: Použít Flowbite `Badge`
- Modal pro odpověď: Použít Flowbite `Modal` (již migrováno)

**Soubory k úpravě:**
- `components/AuditChecklist.tsx`

#### 4.4 ReportView

**Současný stav:** `components/ReportView.tsx`
**Cíl:** Zachovat print styling, použít Flowbite typography

**Migrace:**
- Zachovat print styles (nejsou součástí Flowbite)
- Použít Flowbite typography utilities
- Tabulky: Použít Flowbite `Table`

**Soubory k úpravě:**
- `components/ReportView.tsx`

#### 4.5 SettingsScreen

**Současný stav:** `components/SettingsScreen.tsx`
**Cíl:** Použít Flowbite Card grid

**Migrace:**
- Grid karet: Použít Flowbite `Card` komponenty
- Ikony: Použít Flowbite Icons nebo zachovat vlastní
- Hover efekty: Použít Flowbite Card hover

**Soubory k úpravě:**
- `components/SettingsScreen.tsx`

#### 4.6 Formuláře

**Současný stav:** `components/OperatorForm.tsx`, `components/PremiseForm.tsx`, `components/HeaderForm.tsx`
**Cíl:** Použít Flowbite form komponenty

**Migrace:**
- Všechny inputy: Použít Flowbite `TextInput`, `Select`, `Textarea`
- Label: Použít Flowbite `Label`
- Validace: Použít Flowbite form helpers

**Soubory k úpravě:**
- `components/OperatorForm.tsx`
- `components/PremiseForm.tsx`
- `components/HeaderForm.tsx`
- Všechny další formuláře

#### 4.7 Login a Register

**Současný stav:** `components/LoginScreen.tsx`, `components/RegisterScreen.tsx`
**Cíl:** Použít Flowbite form komponenty a styling

**Migrace:**
- Formuláře: Použít Flowbite form komponenty
- Layout: Použít Flowbite Card pro kontejner
- Button: Použít Flowbite Button (již migrováno)

**Soubory k úpravě:**
- `components/LoginScreen.tsx`
- `components/RegisterScreen.tsx`

---

### FÁZE 5: Migrace pomocných komponent (2-3 dny)

#### 5.1 Toast notifikace

**Současný stav:** `components/ToastContainer.tsx`
**Cíl:** Použít Flowbite `Toast` komponentu

**Migrace:**
- Nahradit vlastní Toast implementaci Flowbite `Toast`
- Použít Flowbite toast helpers

**Soubory k úpravě:**
- `components/ToastContainer.tsx`
- `utils/toast.ts`

#### 5.2 Spinner

**Současný stav:** `components/Spinner.tsx`
**Cíl:** Použít Flowbite `Spinner` komponentu

**Migrace:**
- Nahradit vlastní Spinner Flowbite `Spinner`

**Soubory k úpravě:**
- `components/Spinner.tsx`

#### 5.3 Badge/Status

**Současný stav:** Vlastní badge implementace
**Cíl:** Použít Flowbite `Badge` komponentu

**Migrace:**
- Najít všechny místa s badge/status a nahradit Flowbite `Badge`

**Soubory k úpravě:**
- Všechny komponenty používající badge

---

### FÁZE 6: Úprava Design Systemu (2-3 dny)

#### 6.1 Aktualizace design tokens

**Současný stav:** `constants/designSystem.ts`
**Cíl:** Sladit s Flowbite design systémem

**Migrace:**
- Zachovat vlastní primary barvy pro branding
- Použít Flowbite standardní barvy pro accent
- Aktualizovat spacing a typography podle Flowbite

**Soubory k úpravě:**
- `constants/designSystem.ts`
- `index.html` (Tailwind config)

#### 6.2 Theme systém

**Současný stav:** Section themes
**Cíl:** Zachovat, použít Flowbite colors

**Migrace:**
- Mapovat section themes na Flowbite colors
- Zachovat funkčnost, použít Flowbite color utilities

**Soubory k úpravě:**
- `constants/designSystem.ts`
- Komponenty používající section themes

---

### FÁZE 7: Testování a ladění (3-5 dní)

#### 7.1 Funkční testování
- Otestovat všechny screeny
- Otestovat všechny formuláře
- Otestovat všechny modaly
- Otestovat navigaci
- Otestovat tab systém

#### 7.2 Responsivní testování
- Mobile (375px, 640px)
- Tablet (768px)
- Desktop (1024px, 1280px, 1920px)

#### 7.3 Cross-browser testování
- Chrome
- Firefox
- Safari
- Edge

#### 7.4 Print testování
- Otestovat print styling pro reporty

---

## Implementační plán

### Týden 1: Příprava a základní komponenty
- Den 1-2: Instalace a konfigurace Flowbite
- Den 3-4: Migrace Button, Card, Input, Modal
- Den 5: Testování základních komponent

### Týden 2: Layout a navigace
- Den 1-2: Migrace Layout komponenty
- Den 3: Migrace TabBar
- Den 4: Migrace MobileMenu
- Den 5: Testování layoutu

### Týden 3: Screeny - část 1
- Den 1-2: Migrace OperatorDashboard
- Den 3-4: Migrace AuditList a AllAuditsScreen
- Den 5: Testování

### Týden 4: Screeny - část 2
- Den 1-2: Migrace AuditChecklist
- Den 3: Migrace ReportView
- Den 4: Migrace SettingsScreen
- Den 5: Testování

### Týden 5: Formuláře a pomocné komponenty
- Den 1-2: Migrace všech formulářů
- Den 3: Migrace Toast, Spinner, Badge
- Den 4-5: Testování

### Týden 6: Design systém a finální úpravy
- Den 1-2: Úprava design systému
- Den 3-4: Finální ladění a opravy
- Den 5: Kompletní testování

---

## Důležité poznámky

### Zachování funkcionalit
- **Všechna logika zůstává stejná** - měníme pouze UI komponenty
- **Firebase zůstává beze změny** - žádné změny v backendu
- **Routing zůstává stejný** - AppState systém zachován
- **State management zůstává stejný** - React hooks zachovány

### Kompatibilita
- Flowbite React je kompatibilní s React 19
- Tailwind CSS v3+ je podporován
- Vite build tool je podporován

### Customizace
- Vlastní barvy (primary) zůstávají pro branding
- Flowbite umožňuje customizaci přes theme prop
- Vlastní CSS může být přidáno pro specifické případy

### Performance
- Flowbite komponenty jsou optimalizované
- Tree-shaking podporováno (import pouze používaných komponent)
- Žádný negativní dopad na performance

---

## Postup migrace jednotlivých komponent

### Obecný postup

1. **Backup současného stavu**
   ```bash
   git checkout -b migrate-flowbite
   git commit -m "Backup před migrací"
   ```

2. **Instalace Flowbite komponenty**
   ```bash
   npm install flowbite-react
   ```

3. **Import Flowbite komponenty**
   ```typescript
   import { Button } from 'flowbite-react';
   ```

4. **Nahrazení vlastní komponenty**
   - Komentovat nebo odstranit vlastní implementaci
   - Použít Flowbite komponentu
   - Mapovat props na Flowbite API

5. **Testování**
   - Ověřit funkčnost
   - Ověřit styling
   - Ověřit responsive design

6. **Commit změn**
   ```bash
   git add .
   git commit -m "Migrace [název komponenty] na Flowbite"
   ```

---

## Dokumentace pro budoucí vývoj

### Pravidla pro používání Flowbite komponent

1. **Vždy použít Flowbite komponentu pokud existuje**
   - Button → `flowbite-react Button`
   - Card → `flowbite-react Card`
   - Input → `flowbite-react TextInput/Select/Textarea`
   - Modal → `flowbite-react Modal`
   - Table → `flowbite-react Table`
   - Badge → `flowbite-react Badge`
   - Toast → `flowbite-react Toast`

2. **Customizace přes theme prop**
   ```typescript
   import { Button } from 'flowbite-react';
   
   const customTheme = {
     color: {
       primary: {
         base: 'bg-primary',
         // ...
       }
     }
   };
   
   <Button theme={customTheme}>Custom Button</Button>
   ```

3. **Vlastní styling pouze když je nutné**
   - Použít Tailwind utility classes
   - Přidat custom CSS pouze v výjimečných případech

4. **Ikony**
   - Preferovat Flowbite Icons
   - Vlastní ikony pouze když Flowbite Icons nevyhovují

5. **Responsive design**
   - Použít Flowbite responsive utilities
   - Dodržovat breakpoints: sm, md, lg, xl, 2xl

### Standardy pro nové komponenty

1. **Nový screen**
   - Použít Flowbite layout komponenty
   - Použít Flowbite Card pro kontejnery
   - Použít Flowbite Table pro tabulky
   - Použít Flowbite Button pro akce

2. **Nový formulář**
   - Použít Flowbite form komponenty
   - Použít Flowbite Label
   - Použít Flowbite validaci

3. **Nová modal**
   - Použít Flowbite Modal
   - Dodržet Flowbite modal sizing

### Design tokens

**Barvy:**
- Primary: Vlastní (`#5B5FC7`)
- Success: Flowbite green (`#10B981`)
- Error: Flowbite red (`#EF4444`)
- Warning: Flowbite yellow (`#F59E0B`)
- Info: Flowbite blue (`#3B82F6`)

**Spacing:**
- Použít Flowbite spacing scale (Tailwind default)

**Typography:**
- Font: Inter (zachováno)
- Velikosti: Flowbite typography scale

---

## Checklist migrace

### Příprava
- [x] Instalace Flowbite React
- [x] Konfigurace Tailwind CSS
- [x] Konfigurace PostCSS
- [x] Aktualizace index.css
- [x] Odstranění Tailwind CDN
- [x] Nastavení light theme (class="light" na html, ThemeModeScript, useThemeMode)

### Základní komponenty
- [x] Button (wrapper nad Flowbite Button)
- [x] Card (wrapper nad Flowbite Card)
- [x] Input (TextField, TextArea, Select - wrappery nad Flowbite komponenty)
- [x] Modal (wrapper nad Flowbite Modal s responzivním designem)

### Layout
- [x] Layout (custom implementace s Flowbite styling)
- [x] TabBar (Flowbite styling)
- [x] MobileMenu (custom implementace s Flowbite styling)
- [x] PageHeader (Flowbite styling s inline styles pro gradienty)

### Screeny
- [x] OperatorDashboard (Flowbite styling, inline styles pro gradienty v tabulkách)
- [x] AuditList (Flowbite styling, inline styles pro gradienty v tabulkách)
- [x] AllAuditsScreen (Flowbite styling, inline styles pro gradienty v tabulkách)
- [x] AuditChecklist (Flowbite styling, lepší kontrast indikátorů)
- [x] ReportView (HTML tabulky pro print - správně, není potřeba Flowbite)
- [x] SettingsScreen (Flowbite Card přes wrapper)
- [x] LoginScreen (Flowbite Button a TextField přes wrappery)
- [x] RegisterScreen (Flowbite Button a TextField přes wrappery)
- [x] Všechny formuláře (OperatorForm, PremiseForm, HeaderForm - Flowbite přes wrappery)

### Pomocné komponenty
- [x] Toast (Flowbite Toast)
- [x] Spinner (Flowbite Spinner)
- [x] Badge (Flowbite Badge)

### Design systém
- [x] Zachování původních barev přes inline styles pro gradienty
- [x] Light theme nastaveno jako default
- [x] Odstranění dark mode tříd z komponent
- [x] Flowbite styling aplikován konzistentně

### Testování
- [x] Funkční testování (základní)
- [x] Responsivní testování (modaly s responsiveSize prop)
- [ ] Cross-browser testování (doporučeno uživateli)
- [x] Print testování (ReportView zachovává print styles)

---

## Závěr

Tento migrační plán poskytuje detailní postup pro přechod na Flowbite Admin Dashboard. Důležité je:

1. **Zachovat veškerou logiku** - měníme pouze UI
2. **Postupovat postupně** - jedna komponenta po druhé
3. **Testovat průběžně** - po každé fázi
4. **Dokumentovat změny** - commit messages s popisem

Po dokončení migrace bude aplikace mít jednotný, profesionální UI design založený na Flowbite Admin Dashboard, který bude snadno udržovatelný a rozšiřitelný.

