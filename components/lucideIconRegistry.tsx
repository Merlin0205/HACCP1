/**
 * Statický seznam ikon zaměřený na hygienické audity.
 * Používáme feather ikony z knihovny react-icons/fi.
 */

import type { ComponentType } from 'react';
import {
  FiCheckCircle,
  FiAlertCircle,
  FiClipboard,
  FiFileText,
  FiPackage,
  FiBox,
  FiThermometer,
  FiDroplet,
  FiWind,
  FiTrash2,
  FiShield,
  FiTool,
  FiTruck,
  FiUsers,
  FiBookOpen,
  FiCamera,
  FiMic,
  FiHome,
  FiRefreshCw,
  FiClock,
  FiAward,
} from 'react-icons/fi';

export interface LucideIconOption {
  id: string;
  name: string;
  searchTerms: string[];
  category: string;
  component: ComponentType<any>;
}

const ICON_DEFINITIONS: LucideIconOption[] = [
  {
    id: 'compliance',
    name: 'Soulad',
    category: 'Kontrola a vyhodnocení',
    searchTerms: ['souhlas', 'vyhovuje', 'soulad', 'ok', 'check'],
    component: FiCheckCircle,
  },
  {
    id: 'non-compliance',
    name: 'Neshoda',
    category: 'Kontrola a vyhodnocení',
    searchTerms: ['neshoda', 'problém', 'upozornění', 'varování', 'alert'],
    component: FiAlertCircle,
  },
  {
    id: 'checklist',
    name: 'Kontrolní seznam',
    category: 'Kontrola a vyhodnocení',
    searchTerms: ['checklist', 'úkoly', 'kroky', 'kontrola', 'seznam'],
    component: FiClipboard,
  },
  {
    id: 'documentation',
    name: 'Dokumentace',
    category: 'Dokumentace a evidence',
    searchTerms: ['doklad', 'protokol', 'report', 'zápis', 'evidence'],
    component: FiFileText,
  },
  {
    id: 'storage',
    name: 'Skladování',
    category: 'Skladování a logistika',
    searchTerms: ['sklad', 'skladování', 'zásoby', 'balení'],
    component: FiPackage,
  },
  {
    id: 'materials',
    name: 'Materiál / obaly',
    category: 'Skladování a logistika',
    searchTerms: ['materiál', 'obaly', 'krabice', 'box'],
    component: FiBox,
  },
  {
    id: 'temperature',
    name: 'Teplota',
    category: 'Hygiena a prostředí',
    searchTerms: ['teplota', 'chlazení', 'mražení', 'termometr'],
    component: FiThermometer,
  },
  {
    id: 'water-quality',
    name: 'Voda',
    category: 'Hygiena a prostředí',
    searchTerms: ['voda', 'pitná', 'sanitace', 'oplach'],
    component: FiDroplet,
  },
  {
    id: 'ventilation',
    name: 'Ventilace',
    category: 'Hygiena a prostředí',
    searchTerms: ['vzduch', 'ventilace', 'klimatizace', 'vzduchotechnika'],
    component: FiWind,
  },
  {
    id: 'waste',
    name: 'Odpad',
    category: 'Hygiena a prostředí',
    searchTerms: ['odpad', 'odpadky', 'likvidace', 'koš'],
    component: FiTrash2,
  },
  {
    id: 'safety',
    name: 'Bezpečnost',
    category: 'Údržba a bezpečnost',
    searchTerms: ['bezpečnost', 'ochrana', 'haccp', 'kritický bod'],
    component: FiShield,
  },
  {
    id: 'maintenance',
    name: 'Údržba',
    category: 'Údržba a bezpečnost',
    searchTerms: ['údržba', 'servis', 'oprava', 'nástroje', 'stroj'],
    component: FiTool,
  },
  {
    id: 'transport',
    name: 'Logistika / příjem',
    category: 'Skladování a logistika',
    searchTerms: ['doprava', 'dodávka', 'příjem', 'vozidlo', 'suroviny'],
    component: FiTruck,
  },
  {
    id: 'staff',
    name: 'Personál',
    category: 'Personál a školení',
    searchTerms: ['personál', 'zaměstnanci', 'obsluha', 'hygiena personálu'],
    component: FiUsers,
  },
  {
    id: 'training',
    name: 'Školení',
    category: 'Personál a školení',
    searchTerms: ['školení', 'vzdělávání', 'záznam', 'kompetence'],
    component: FiBookOpen,
  },
  {
    id: 'photo',
    name: 'Fotodokumentace',
    category: 'Dokumentace a evidence',
    searchTerms: ['foto', 'fotodokumentace', 'obrázek', 'důkaz'],
    component: FiCamera,
  },
  {
    id: 'audio',
    name: 'Audio poznámka',
    category: 'Dokumentace a evidence',
    searchTerms: ['audio', 'diktafon', 'poznámka', 'hlas'],
    component: FiMic,
  },
  {
    id: 'premises',
    name: 'Provoz / pracoviště',
    category: 'Hygiena a prostředí',
    searchTerms: ['provoz', 'pracoviště', 'budova', 'místnost'],
    component: FiHome,
  },
  {
    id: 'refresh',
    name: 'Aktualizace postupu',
    category: 'Kontrola a vyhodnocení',
    searchTerms: ['aktualizace', 'refresh', 'přehodnocení', 'revize'],
    component: FiRefreshCw,
  },
  {
    id: 'time',
    name: 'Čas / monitoring',
    category: 'Kontrola a vyhodnocení',
    searchTerms: ['čas', 'monitoring', 'interval', 'záznam'],
    component: FiClock,
  },
  {
    id: 'certification',
    name: 'Certifikace / audit',
    category: 'Kontrola a vyhodnocení',
    searchTerms: ['certifikace', 'audit', 'hodnocení', 'výsledek'],
    component: FiAward,
  },
];

const CATEGORY_ORDER = [
  'Kontrola a vyhodnocení',
  'Hygiena a prostředí',
  'Skladování a logistika',
  'Personál a školení',
  'Dokumentace a evidence',
  'Údržba a bezpečnost',
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
