/**
 * Settings Screen - Obrazovka nastavení (iDoklad redesign)
 */

import React from 'react';
import { useUserRole } from '../hooks/useUserRole';
import { Card, CardBody } from './ui/Card';
import { PageHeader } from './PageHeader';
import { SECTION_THEMES } from '../constants/designSystem';
import { AppState } from '../types';

interface SettingsScreenProps {
  onNavigateToAdmin: () => void;
  onNavigateToUserManagement: () => void;
  onNavigateToAuditorSettings: () => void;
  onNavigateToAIReportSettings: () => void;
  onNavigateToAIUsageStats: () => void;
  onNavigateToAIPricingConfig: () => void;
  onNavigateToAIPrompts: () => void;
  onBack: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ 
  onNavigateToAdmin, 
  onNavigateToUserManagement, 
  onNavigateToAuditorSettings, 
  onNavigateToAIReportSettings, 
  onNavigateToAIUsageStats, 
  onNavigateToAIPricingConfig,
  onNavigateToAIPrompts, 
  onBack 
}) => {
  const { isAdmin } = useUserRole();

  const settingsItems = [
    {
      id: 'users',
      title: 'Správa uživatelů',
      description: 'Schvalování uživatelů a správa rolí',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      color: 'bg-red-100 text-red-600',
      hoverColor: 'hover:bg-red-50',
      onClick: onNavigateToUserManagement,
      adminOnly: true,
    },
    {
      id: 'audit-structure',
      title: 'Správa bodů auditu',
      description: 'Spravujte sekce a položky auditů',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
      color: 'bg-primary-light text-primary-dark',
      hoverColor: 'hover:bg-primary-light/10',
      onClick: onNavigateToAdmin,
      adminOnly: false,
    },
    {
      id: 'auditor',
      title: 'Údaje auditora',
      description: 'Jméno, kontakt, který se zobrazí v reportech',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      color: 'bg-purple-100 text-purple-600',
      hoverColor: 'hover:bg-purple-50',
      onClick: onNavigateToAuditorSettings,
      adminOnly: false,
    },
    {
      id: 'ai-report',
      title: 'Nastavení AI reportů',
      description: 'Texty a prompty pro generování reportů',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      color: 'bg-green-100 text-green-600',
      hoverColor: 'hover:bg-green-50',
      onClick: onNavigateToAIReportSettings,
      adminOnly: false,
    },
    {
      id: 'ai-usage',
      title: 'Náklady na AI',
      description: 'Tracking usage a nákladů na AI modely',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'bg-yellow-100 text-yellow-600',
      hoverColor: 'hover:bg-yellow-50',
      onClick: onNavigateToAIUsageStats,
      adminOnly: false,
    },
    {
      id: 'ai-pricing',
      title: 'Ceny AI modelů',
      description: 'Nastavení kurzu a cen modelů',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
      color: 'bg-orange-100 text-orange-600',
      hoverColor: 'hover:bg-orange-50',
      onClick: onNavigateToAIPricingConfig,
      adminOnly: false,
    },
    {
      id: 'ai-prompts',
      title: 'AI Prompty',
      description: 'Správa promptů pro generování textu neshod',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      color: 'bg-blue-100 text-blue-600',
      hoverColor: 'hover:bg-blue-50',
      onClick: onNavigateToAIPrompts,
      adminOnly: false,
    },
  ];

  const visibleItems = settingsItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <div className="w-full max-w-7xl mx-auto">
      <PageHeader
        section={SECTION_THEMES[AppState.SETTINGS]}
        title="Nastavení"
        description="Správa aplikace a konfigurace"
      />

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {visibleItems.map((item) => (
          <Card
            key={item.id}
            hover
            onClick={item.onClick}
            className="cursor-pointer transition-all"
          >
            <CardBody>
              <div className={`w-14 h-14 ${item.color} rounded-xl flex items-center justify-center mb-4 ${item.hoverColor} transition-colors`}>
                {item.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-sm text-gray-600 mb-4">{item.description}</p>
              <div className="flex items-center text-primary text-sm font-medium">
                <span>Otevřít</span>
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SettingsScreen;
