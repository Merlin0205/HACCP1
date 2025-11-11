import React from 'react';
import { AppState } from '../types';
import { HomeIcon, SettingsIcon, ClockIcon, ChecklistIcon, InProgressIcon } from '../components/icons';

// Section Theme Type
export interface SectionTheme {
  name: string;
  colors: {
    primary: string;
    light: string;
    lighter: string;
    darkest: string;
    gradient: string;
    gradientDark: string;
    bgLight: string;
    bgLighter: string;
    text: string;
    textLight: string;
  };
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

// Section Themes Configuration
export const SECTION_THEMES: Record<string, SectionTheme> = {
  [AppState.INCOMPLETE_AUDITS]: {
    name: 'Nezapočaté audity',
    colors: {
      primary: '#6366F1', // indigo-500
      light: '#818CF8', // indigo-400
      lighter: '#A5B4FC', // indigo-300
      darkest: '#4338CA', // indigo-600
      gradient: 'from-indigo-500 to-indigo-600',
      gradientDark: 'from-indigo-600 to-indigo-700',
      bgLight: 'bg-indigo-50',
      bgLighter: 'bg-indigo-100',
      text: 'text-indigo-600',
      textLight: 'text-indigo-700',
    },
    icon: ClockIcon,
  },
  [AppState.IN_PROGRESS_AUDITS]: {
    name: 'Probíhající audity',
    colors: {
      primary: '#F59E0B', // amber-500
      light: '#FBBF24', // amber-400
      lighter: '#FCD34D', // amber-300
      darkest: '#D97706', // amber-600
      gradient: 'from-amber-500 to-amber-600',
      gradientDark: 'from-amber-600 to-amber-700',
      bgLight: 'bg-amber-50',
      bgLighter: 'bg-amber-100',
      text: 'text-amber-600',
      textLight: 'text-amber-700',
    },
    icon: InProgressIcon,
  },
  [AppState.ALL_AUDITS]: {
    name: 'Audity vše',
    colors: {
      primary: '#3B82F6', // blue-500
      light: '#60A5FA', // blue-400
      lighter: '#93C5FD', // blue-300
      darkest: '#2563EB', // blue-600
      gradient: 'from-blue-500 to-blue-600',
      gradientDark: 'from-blue-600 to-blue-700',
      bgLight: 'bg-blue-50',
      bgLighter: 'bg-blue-100',
      text: 'text-blue-600',
      textLight: 'text-blue-700',
    },
    icon: ChecklistIcon,
  },
  [AppState.OPERATOR_DASHBOARD]: {
    name: 'Zákazníci',
    colors: {
      primary: '#10B981', // emerald-500
      light: '#34D399', // emerald-400
      lighter: '#6EE7B7', // emerald-300
      darkest: '#059669', // emerald-600
      gradient: 'from-emerald-500 to-emerald-600',
      gradientDark: 'from-emerald-600 to-emerald-700',
      bgLight: 'bg-emerald-50',
      bgLighter: 'bg-emerald-100',
      text: 'text-emerald-600',
      textLight: 'text-emerald-700',
    },
    icon: HomeIcon,
  },
  [AppState.SETTINGS]: {
    name: 'Nastavení',
    colors: {
      primary: '#64748B', // slate-500
      light: '#94A3B8', // slate-400
      lighter: '#CBD5E1', // slate-300
      darkest: '#475569', // slate-600
      gradient: 'from-slate-500 to-slate-600',
      gradientDark: 'from-slate-600 to-slate-700',
      bgLight: 'bg-slate-50',
      bgLighter: 'bg-slate-100',
      text: 'text-slate-600',
      textLight: 'text-slate-700',
    },
    icon: SettingsIcon,
  },
};

// Tab Type Colors
export const TAB_THEMES = {
  audit: {
    colors: {
      primary: '#3B82F6', // blue-500
      light: '#60A5FA', // blue-400
      gradient: 'from-blue-500 to-blue-600',
      bgLight: 'bg-blue-50',
      text: 'text-blue-600',
    },
  },
  report: {
    colors: {
      primary: '#10B981', // emerald-500
      light: '#34D399', // emerald-400
      gradient: 'from-emerald-500 to-emerald-600',
      bgLight: 'bg-emerald-50',
      text: 'text-emerald-600',
    },
  },
  audit_list: {
    colors: {
      primary: '#3B82F6', // blue-500
      light: '#60A5FA', // blue-400
      gradient: 'from-blue-500 to-blue-600',
      bgLight: 'bg-blue-50',
      text: 'text-blue-600',
    },
  },
};

// Helper function to get theme for current view
export const getSectionTheme = (appState: AppState): SectionTheme | null => {
  // Map AppState to section theme
  if (appState === AppState.INCOMPLETE_AUDITS) {
    return SECTION_THEMES[AppState.INCOMPLETE_AUDITS];
  }
  if (appState === AppState.IN_PROGRESS_AUDITS) {
    return SECTION_THEMES[AppState.IN_PROGRESS_AUDITS];
  }
  if (appState === AppState.ALL_AUDITS || appState === AppState.AUDIT_LIST) {
    return SECTION_THEMES[AppState.ALL_AUDITS];
  }
  if (
    appState === AppState.OPERATOR_DASHBOARD ||
    appState === AppState.ADD_OPERATOR ||
    appState === AppState.EDIT_OPERATOR ||
    appState === AppState.ADD_PREMISE ||
    appState === AppState.EDIT_PREMISE
  ) {
    return SECTION_THEMES[AppState.OPERATOR_DASHBOARD];
  }
  if (
    appState === AppState.SETTINGS ||
    appState === AppState.USER_MANAGEMENT ||
    appState === AppState.AUDITOR_SETTINGS ||
    appState === AppState.AI_REPORT_SETTINGS ||
    appState === AppState.AI_USAGE_STATS ||
    appState === AppState.AI_PRICING_CONFIG ||
    appState === AppState.SMART_TEMPLATE_SETTINGS ||
    appState === AppState.ADMIN
  ) {
    return SECTION_THEMES[AppState.SETTINGS];
  }
  return null;
};

// Design tokens
export const DESIGN_TOKENS = {
  spacing: {
    xs: '0.25rem', // 4px
    sm: '0.5rem', // 8px
    md: '1rem', // 16px
    lg: '1.5rem', // 24px
    xl: '2rem', // 32px
    '2xl': '3rem', // 48px
  },
  typography: {
    h1: 'text-2xl sm:text-3xl font-bold',
    h2: 'text-xl sm:text-2xl font-bold',
    h3: 'text-lg sm:text-xl font-semibold',
    body: 'text-sm sm:text-base',
    bodySmall: 'text-xs sm:text-sm',
  },
  shadows: {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
  },
  borderRadius: {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full',
  },
  transitions: {
    fast: 'transition-all duration-150',
    normal: 'transition-all duration-200',
    slow: 'transition-all duration-300',
  },
};

