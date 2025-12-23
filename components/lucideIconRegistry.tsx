/**
 * Statický seznam ikon zaměřený na hygienické audity.
 * Používáme moderní ikony z knihovny lucide-react.
 */

import type { ComponentType } from 'react';
import {
  CheckCircle,
  AlertCircle,
  ClipboardList,
  FileText,
  Package,
  Box,
  Thermometer,
  Droplets,
  Wind,
  Trash2,
  ShieldCheck,
  Wrench,
  Truck,
  Users,
  BookOpen,
  Camera,
  Mic,
  Home,
  RefreshCw,
  Clock,
  Award,
  Utensils,
  ChefHat,
  Apple,
  Carrot,
  Beef,
  Fish,
  Wheat,
  Croissant,
  Coffee,
  Soup,
  Pizza,
  Sandwich,
  Cake,
  IceCream,
  Beer,
  Wine,
  Martini,
  Candy,
  Cookie,
  Egg,
  Milk,
  SprayCan,
  Brush,
  Sparkles,
  Recycle,
  Biohazard,
  Bath,
  ShowerHead,
  WashingMachine,
  Hand,
  HandPlatter,
  Snowflake,
  Sun,
  Flame,
  Fan,
  AirVent,
  ShieldAlert,
  TriangleAlert,
  Siren,
  HardHat,
  Construction,
  Skull,
  Radiation,
  Zap,
  Bug,
  Rat,
  Bird,
  Mouse,
  Settings,
  Factory,
  Store,
  Building,
  Hammer,
  FileWarning,
  FolderOpen,
  Archive,
  Search,
  Grape,
  Banana,
  Bean,
  Cherry,
  Citrus,
  Nut,
  BadgeCheck,
  Ban,
  Check,
  X
} from 'lucide-react';

export interface LucideIconOption {
  id: string;
  name: string;
  searchTerms: string[];
  category: string;
  component: ComponentType<any>;
}

const ICON_DEFINITIONS: LucideIconOption[] = [
  // --- KONTROLA A VYHODNOCENÍ ---
  {
    id: 'compliance',
    name: 'Soulad',
    category: 'Kontrola a vyhodnocení',
    searchTerms: ['souhlas', 'vyhovuje', 'soulad', 'ok', 'check', 'fajfka', 'splněno'],
    component: CheckCircle,
  },
  {
    id: 'non-compliance',
    name: 'Neshoda',
    category: 'Kontrola a vyhodnocení',
    searchTerms: ['neshoda', 'problém', 'upozornění', 'varování', 'alert', 'chyba', 'bad'],
    component: AlertCircle,
  },
  {
    id: 'checklist',
    name: 'Kontrolní seznam',
    category: 'Kontrola a vyhodnocení',
    searchTerms: ['checklist', 'úkoly', 'kroky', 'kontrola', 'seznam', 'položky'],
    component: ClipboardList,
  },
  {
    id: 'refresh',
    name: 'Aktualizace postupu',
    category: 'Kontrola a vyhodnocení',
    searchTerms: ['aktualizace', 'refresh', 'přehodnocení', 'revize', 'změna'],
    component: RefreshCw,
  },
  {
    id: 'time',
    name: 'Čas / monitoring',
    category: 'Kontrola a vyhodnocení',
    searchTerms: ['čas', 'monitoring', 'interval', 'záznam', 'hodiny', 'doba'],
    component: Clock,
  },
  {
    id: 'certification',
    name: 'Certifikace / audit',
    category: 'Kontrola a vyhodnocení',
    searchTerms: ['certifikace', 'audit', 'hodnocení', 'výsledek', 'diplom', 'ocenění'],
    component: Award,
  },
  {
    id: 'verified',
    name: 'Ověřeno',
    category: 'Kontrola a vyhodnocení',
    searchTerms: ['ověřeno', 'validace', 'podpis', 'badge'],
    component: BadgeCheck,
  },
  {
    id: 'ban',
    name: 'Zákaz',
    category: 'Kontrola a vyhodnocení',
    searchTerms: ['zákaz', 'stop', 'nepovoleno', 'blokováno'],
    component: Ban,
  },

  // --- HYGIENA A PROSTŘEDÍ ---
  {
    id: 'temperature',
    name: 'Teplota',
    category: 'Hygiena a prostředí',
    searchTerms: ['teplota', 'chlazení', 'mražení', 'termometr', 'stupně', 'měření'],
    component: Thermometer,
  },
  {
    id: 'cold',
    name: 'Chlazení / Mráz',
    category: 'Hygiena a prostředí',
    searchTerms: ['mráz', 'zima', 'chlad', 'lednice', 'mrazák', 'led'],
    component: Snowflake,
  },
  {
    id: 'heat',
    name: 'Teplo / Vaření',
    category: 'Hygiena a prostředí',
    searchTerms: ['teplo', 'horko', 'slunce', 'ohřev', 'léto'],
    component: Sun,
  },
  {
    id: 'water-quality',
    name: 'Voda',
    category: 'Hygiena a prostředí',
    searchTerms: ['voda', 'pitná', 'sanitace', 'oplach', 'tekutina', 'kapka'],
    component: Droplets,
  },
  {
    id: 'ventilation',
    name: 'Ventilace',
    category: 'Hygiena a prostředí',
    searchTerms: ['vzduch', 'ventilace', 'klimatizace', 'vzduchotechnika', 'vítr', 'průvan'],
    component: Wind,
  },
  {
    id: 'fan',
    name: 'Větrák',
    category: 'Hygiena a prostředí',
    searchTerms: ['větrák', 'ventilátor', 'chlazení'],
    component: Fan,
  },
  {
    id: 'air-vent',
    name: 'Vzduchotechnika',
    category: 'Hygiena a prostředí',
    searchTerms: ['odtah', 'digestoř', 'mřížka', 'ventilace'],
    component: AirVent,
  },
  {
    id: 'waste',
    name: 'Odpad',
    category: 'Hygiena a prostředí',
    searchTerms: ['odpad', 'odpadky', 'likvidace', 'koš', 'popelnice'],
    component: Trash2,
  },
  {
    id: 'cleaning-spray',
    name: 'Čistící prostředky',
    category: 'Hygiena a prostředí',
    searchTerms: ['sprej', 'úklid', 'chemie', 'dezinfekce', 'čištění'],
    component: SprayCan,
  },
  {
    id: 'cleaning-brush',
    name: 'Úklidové pomůcky',
    category: 'Hygiena a prostředí',
    searchTerms: ['kartáč', 'štěstka', 'zametání', 'úklid', 'drhnutí'],
    component: Brush,
  },
  {
    id: 'cleanliness',
    name: 'Čistota',
    category: 'Hygiena a prostředí',
    searchTerms: ['čisté', 'lesk', 'uklizeno', 'výborné', 'sparkles'],
    component: Sparkles,
  },
  {
    id: 'recycle',
    name: 'Recyklace',
    category: 'Hygiena a prostředí',
    searchTerms: ['recyklace', 'třídění', 'ekologie', 'navrátit'],
    component: Recycle,
  },
  {
    id: 'pest-bug',
    name: 'Hmyz',
    category: 'Hygiena a prostředí',
    searchTerms: ['hmyz', 'brouk', 'škůdce', 'dezinsekce'],
    component: Bug,
  },
  {
    id: 'pest-rat',
    name: 'Hlodavci',
    category: 'Hygiena a prostředí',
    searchTerms: ['krysa', 'potkan', 'myš', 'deratizace', 'škůdce'],
    component: Rat,
  },
  {
    id: 'premises',
    name: 'Provoz / pracoviště',
    category: 'Hygiena a prostředí',
    searchTerms: ['provoz', 'pracoviště', 'budova', 'místnost', 'dům'],
    component: Home,
  },
  {
    id: 'toilet',
    name: 'Sociální zařízení',
    category: 'Hygiena a prostředí',
    searchTerms: ['wc', 'toaleta', 'záchod', 'koupelna'],
    component: Bath,
  },
  {
    id: 'shower',
    name: 'Sprcha',
    category: 'Hygiena a prostředí',
    searchTerms: ['sprcha', 'koupelna', 'mytí'],
    component: ShowerHead,
  },
  {
    id: 'laundry',
    name: 'Prádelna',
    category: 'Hygiena a prostředí',
    searchTerms: ['praní', 'pračka', 'oděvy', 'textil'],
    component: WashingMachine,
  },

  // --- SKLADOVÁNÍ A LOGISTIKA ---
  {
    id: 'storage',
    name: 'Skladování',
    category: 'Skladování a logistika',
    searchTerms: ['sklad', 'skladování', 'zásoby', 'balení', 'boxy'],
    component: Package,
  },
  {
    id: 'materials',
    name: 'Materiál / obaly',
    category: 'Skladování a logistika',
    searchTerms: ['materiál', 'obaly', 'krabice', 'box', 'karton'],
    component: Box,
  },
  {
    id: 'transport',
    name: 'Logistika / příjem',
    category: 'Skladování a logistika',
    searchTerms: ['doprava', 'dodávka', 'příjem', 'vozidlo', 'auto', 'kamion'],
    component: Truck,
  },
  {
    id: 'warehouse',
    name: 'Velký sklad',
    category: 'Skladování a logistika',
    searchTerms: ['sklad', 'hala', 'budova', 'továrna'],
    component: Factory,
  },
  {
    id: 'store',
    name: 'Prodejna',
    category: 'Skladování a logistika',
    searchTerms: ['obchod', 'prodejna', 'krám', 'výdej'],
    component: Store,
  },

  // --- POTRAVINY A SUROVINY (NOVÁ KATEGORIE) ---
  {
    id: 'food-general',
    name: 'Potraviny (obecné)',
    category: 'Potraviny a suroviny',
    searchTerms: ['jídlo', 'pokrm', 'stravování', 'příbor', 'restaurace'],
    component: Utensils,
  },
  {
    id: 'chef',
    name: 'Kuchař / Příprava',
    category: 'Potraviny a suroviny',
    searchTerms: ['kuchař', 'čepice', 'vaření', 'příprava'],
    component: ChefHat,
  },
  {
    id: 'fruit-apple',
    name: 'Ovoce',
    category: 'Potraviny a suroviny',
    searchTerms: ['jablko', 'ovoce', 'čerstvé', 'vitamíny'],
    component: Apple,
  },
  {
    id: 'vegetable-carrot',
    name: 'Zelenina',
    category: 'Potraviny a suroviny',
    searchTerms: ['mrkev', 'zelenina', 'kořenová', 'zdravé'],
    component: Carrot,
  },
  {
    id: 'meat-beef',
    name: 'Maso (červené)',
    category: 'Potraviny a suroviny',
    searchTerms: ['maso', 'hovězí', 'vepřové', 'steak', 'flákota'],
    component: Beef,
  },
  {
    id: 'fish',
    name: 'Ryby / Mořské plody',
    category: 'Potraviny a suroviny',
    searchTerms: ['ryba', 'mořské', 'pstruh', 'losos', 'filet'],
    component: Fish,
  },
  {
    id: 'bakery-wheat',
    name: 'Obiloviny / Mouka',
    category: 'Potraviny a suroviny',
    searchTerms: ['obilí', 'mouka', 'klas', 'lepek', 'pečivo'],
    component: Wheat,
  },
  {
    id: 'bakery-croissant',
    name: 'Pečivo',
    category: 'Potraviny a suroviny',
    searchTerms: ['rohlík', 'croissant', 'snídaně', 'čerstvé'],
    component: Croissant,
  },
  {
    id: 'dairy-milk',
    name: 'Mléko / Mléčné',
    category: 'Potraviny a suroviny',
    searchTerms: ['mléko', 'nápoj', 'laktóza', 'vápník'],
    component: Milk,
  },
  {
    id: 'egg',
    name: 'Vejce',
    category: 'Potraviny a suroviny',
    searchTerms: ['vejce', 'vajíčko', 'skořápka', 'bílkoviny'],
    component: Egg,
  },
  {
    id: 'coffee',
    name: 'Káva / Nápoje',
    category: 'Potraviny a suroviny',
    searchTerms: ['káva', 'čaj', 'hrnek', 'horké'],
    component: Coffee,
  },
  {
    id: 'soup',
    name: 'Polévka / Teplé',
    category: 'Potraviny a suroviny',
    searchTerms: ['polévka', 'miska', 'jídlo', 'oběd'],
    component: Soup,
  },
  {
    id: 'pizza',
    name: 'Pizza / Fastfood',
    category: 'Potraviny a suroviny',
    searchTerms: ['pizza', 'italské', 'fastfood', 'trojúhelník'],
    component: Pizza,
  },
  {
    id: 'sandwich',
    name: 'Sendvič / Svačina',
    category: 'Potraviny a suroviny',
    searchTerms: ['sendvič', 'chleba', 'toast', 'svačina'],
    component: Sandwich,
  },
  {
    id: 'dessert-cake',
    name: 'Dort / Zákusek',
    category: 'Potraviny a suroviny',
    searchTerms: ['dort', 'koláč', 'sladké', 'narozeniny'],
    component: Cake,
  },
  {
    id: 'ice-cream',
    name: 'Zmrzlina',
    category: 'Potraviny a suroviny',
    searchTerms: ['zmrzlina', 'mražené', 'dezert', 'léto'],
    component: IceCream,
  },
  {
    id: 'alcohol-beer',
    name: 'Pivo',
    category: 'Potraviny a suroviny',
    searchTerms: ['pivo', 'alkohol', 'nápoj', 'pullitr'],
    component: Beer,
  },
  {
    id: 'alcohol-wine',
    name: 'Víno',
    category: 'Potraviny a suroviny',
    searchTerms: ['víno', 'sklenička', 'alkohol', 'hrozny'],
    component: Wine,
  },
  {
    id: 'alcohol-cocktail',
    name: 'Koktejl / Drink',
    category: 'Potraviny a suroviny',
    searchTerms: ['drink', 'koktejl', 'martini', 'bar'],
    component: Martini,
  },
  {
    id: 'sweets-candy',
    name: 'Bonbóny',
    category: 'Potraviny a suroviny',
    searchTerms: ['bonbon', 'sladkosti', 'cukrovinky'],
    component: Candy,
  },
  {
    id: 'sweets-cookie',
    name: 'Sušenky',
    category: 'Potraviny a suroviny',
    searchTerms: ['sušenka', 'keks', 'sladké', 'čokoláda'],
    component: Cookie,
  },
  {
    id: 'fruit-grape',
    name: 'Hroznové víno',
    category: 'Potraviny a suroviny',
    searchTerms: ['hrozny', 'ovoce', 'víno'],
    component: Grape,
  },
  {
    id: 'fruit-banana',
    name: 'Banány',
    category: 'Potraviny a suroviny',
    searchTerms: ['banán', 'ovoce', 'tropické'],
    component: Banana,
  },
  {
    id: 'fruit-cherry',
    name: 'Třešně',
    category: 'Potraviny a suroviny',
    searchTerms: ['třešeň', 'ovoce', 'sladké'],
    component: Cherry,
  },
  {
    id: 'fruit-citrus',
    name: 'Citrusy',
    category: 'Potraviny a suroviny',
    searchTerms: ['citron', 'pomeranč', 'limetka', 'kyselý'],
    component: Citrus,
  },
  {
    id: 'nut',
    name: 'Ořechy',
    category: 'Potraviny a suroviny',
    searchTerms: ['ořech', 'alergen', 'skořápka'],
    component: Nut,
  },
  {
    id: 'veg-bean',
    name: 'Luštěniny',
    category: 'Potraviny a suroviny',
    searchTerms: ['fazole', 'hrách', 'čočka'],
    component: Bean,
  },

  // --- ÚDRŽBA A BEZPEČNOST ---
  {
    id: 'safety',
    name: 'Bezpečnost',
    category: 'Údržba a bezpečnost',
    searchTerms: ['bezpečnost', 'ochrana', 'haccp', 'kritický bod', 'štít'],
    component: ShieldCheck,
  },
  {
    id: 'safety-alert',
    name: 'Bezpečnostní riziko',
    category: 'Údržba a bezpečnost',
    searchTerms: ['riziko', 'nebezpečí', 'pozor', 'varování', 'vykřičník'],
    component: ShieldAlert,
  },
  {
    id: 'warning',
    name: 'Varování',
    category: 'Údržba a bezpečnost',
    searchTerms: ['pozor', 'výstraha', 'trojúhelník', 'riziko'],
    component: TriangleAlert,
  },
  {
    id: 'fire',
    name: 'Oheň / Požár',
    category: 'Údržba a bezpečnost',
    searchTerms: ['oheň', 'požár', 'hasicí', 'plamen', 'nebezpečí', 'teplo'],
    component: Flame,
  },
  {
    id: 'biohazard',
    name: 'Biohazard',
    category: 'Údržba a bezpečnost',
    searchTerms: ['bio', 'nebezpečné', 'infekční', 'odpad', 'riziko'],
    component: Biohazard,
  },
  {
    id: 'radiation',
    name: 'Radiace / Záření',
    category: 'Údržba a bezpečnost',
    searchTerms: ['radiace', 'záření', 'nebezpečí', 'uva'],
    component: Radiation,
  },
  {
    id: 'electricity',
    name: 'Elektřina',
    category: 'Údržba a bezpečnost',
    searchTerms: ['elektřina', 'proud', 'blesk', 'napětí', 'zásuvka'],
    component: Zap,
  },
  {
    id: 'toxic',
    name: 'Toxické / Jed',
    category: 'Údržba a bezpečnost',
    searchTerms: ['jed', 'smrt', 'nebezpečné', 'chemikálie', 'lebka'],
    component: Skull,
  },
  {
    id: 'maintenance',
    name: 'Údržba',
    category: 'Údržba a bezpečnost',
    searchTerms: ['údržba', 'servis', 'oprava', 'nástroje', 'stroj', 'klíč'],
    component: Wrench,
  },
  {
    id: 'construction',
    name: 'Práce / Rekonstrukce',
    category: 'Údržba a bezpečnost',
    searchTerms: ['stavba', 'práce', 'zábrana', 'oprava'],
    component: Construction,
  },
  {
    id: 'siren',
    name: 'Alarm / Poplach',
    category: 'Údržba a bezpečnost',
    searchTerms: ['alarm', 'houkačka', 'světlo', 'nouze'],
    component: Siren,
  },
  {
    id: 'tools-hammer',
    name: 'Kladivo / Opravy',
    category: 'Údržba a bezpečnost',
    searchTerms: ['kladivo', 'tlouk', 'hřebík', 'bourání'],
    component: Hammer,
  },


  // --- PERSONÁL A ŠKOLENÍ ---
  {
    id: 'staff',
    name: 'Personál',
    category: 'Personál a školení',
    searchTerms: ['personál', 'zaměstnanci', 'obsluha', 'hygiena personálu', 'tým'],
    component: Users,
  },
  {
    id: 'training',
    name: 'Školení',
    category: 'Personál a školení',
    searchTerms: ['školení', 'vzdělávání', 'záznam', 'kompetence', 'kniha', 'studium'],
    component: BookOpen,
  },
  {
    id: 'protection-gear',
    name: 'Ochranné pomůcky',
    category: 'Personál a školení',
    searchTerms: ['přilba', 'ochrana', 'bezpečnost', 'oblečení', 'oop'],
    component: HardHat,
  },
  {
    id: 'wash-hands',
    name: 'Mytí rukou',
    category: 'Personál a školení',
    searchTerms: ['ruce', 'mytí', 'hygiena', 'mýdlo'],
    component: Hand,
  },
  {
    id: 'service',
    name: 'Obsluha',
    category: 'Personál a školení',
    searchTerms: ['číšník', 'servis', 'jídlo', 'podávání'],
    component: HandPlatter,
  },

  // --- DOKUMENTACE A EVIDENCE ---
  {
    id: 'documentation',
    name: 'Dokumentace',
    category: 'Dokumentace a evidence',
    searchTerms: ['doklad', 'protokol', 'report', 'zápis', 'evidence', 'papír'],
    component: FileText,
  },
  {
    id: 'doc-warning',
    name: 'Chybějící dokument',
    category: 'Dokumentace a evidence',
    searchTerms: ['chyba', 'dokument', 'vykřičník', 'problém'],
    component: FileWarning,
  },
  {
    id: 'folder',
    name: 'Složka / Evidence',
    category: 'Dokumentace a evidence',
    searchTerms: ['složka', 'pořadač', 'otevřeno', 'archiv'],
    component: FolderOpen,
  },
  {
    id: 'archive',
    name: 'Archiv',
    category: 'Dokumentace a evidence',
    searchTerms: ['archiv', 'krabice', 'staré', 'uloženo'],
    component: Archive,
  },
  {
    id: 'photo',
    name: 'Fotodokumentace',
    category: 'Dokumentace a evidence',
    searchTerms: ['foto', 'fotodokumentace', 'obrázek', 'důkaz', 'kamera'],
    component: Camera,
  },
  {
    id: 'audio',
    name: 'Audio poznámka',
    category: 'Dokumentace a evidence',
    searchTerms: ['audio', 'diktafon', 'poznámka', 'hlas', 'mikrofon'],
    component: Mic,
  },
  {
    id: 'search',
    name: 'Hledání / Audit',
    category: 'Dokumentace a evidence',
    searchTerms: ['lupa', 'hledat', 'zkoumat', 'přezkum'],
    component: Search,
  },
  {
    id: 'settings',
    name: 'Nastavení procesu',
    category: 'Dokumentace a evidence',
    searchTerms: ['nastavení', 'ozubené', 'kolo', 'proces'],
    component: Settings,
  },
];

const CATEGORY_ORDER = [
  'Potraviny a suroviny',
  'Hygiena a prostředí',
  'Kontrola a vyhodnocení',
  'Skladování a logistika',
  'Údržba a bezpečnost',
  'Personál a školení',
  'Dokumentace a evidence',
] as const;

const iconCategoriesMap: Record<string, LucideIconOption[]> = {};
ICON_DEFINITIONS.forEach((icon) => {
  if (!iconCategoriesMap[icon.category]) {
    iconCategoriesMap[icon.category] = [];
  }
  iconCategoriesMap[icon.category].push(icon);
});

const lucideIconCategoriesOrdered: Record<string, LucideIconOption[]> = {};
CATEGORY_ORDER.forEach((category) => {
  if (iconCategoriesMap[category]) {
    lucideIconCategoriesOrdered[category] = iconCategoriesMap[category];
  }
});

Object.keys(iconCategoriesMap).forEach((category) => {
  if (!lucideIconCategoriesOrdered[category]) {
    lucideIconCategoriesOrdered[category] = iconCategoriesMap[category];
  }
});

export const allLucideIcons: LucideIconOption[] = ICON_DEFINITIONS;
export const lucideIconCategories: { [key: string]: LucideIconOption[] } = lucideIconCategoriesOrdered;

export const lucideIconMapById: { [key: string]: LucideIconOption } = ICON_DEFINITIONS.reduce(
  (acc, icon) => {
    acc[icon.id] = icon;
    return acc;
  },
  {} as Record<string, LucideIconOption>
);

export function searchLucideIcons(query: string): LucideIconOption[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return ICON_DEFINITIONS;
  }

  return ICON_DEFINITIONS.filter((icon) => {
    if (icon.name.toLowerCase().includes(normalized)) {
      return true;
    }

    return icon.searchTerms.some((term) => term.toLowerCase().includes(normalized)) || icon.id.includes(normalized);
  });
}
