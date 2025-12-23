import React from 'react';
import {
  User,
  FileText,
  DollarSign,
  Settings,
  Users,
  Shield,
  Zap,
  Database,
  CreditCard,
  BarChart,
  MessageSquare,
  FileCheck,
  Truck
} from 'lucide-react';
import { Card, CardBody } from './ui/Card';
import { PageHeader } from './PageHeader';
import { SECTION_THEMES } from '../constants/designSystem';
import { AppState } from '../types';

interface SettingsScreenProps {
  onNavigateToAuditorSettings: () => void;
  onNavigateToBillingSettings: () => void;
  onNavigateToUserManagement: () => void;
  onNavigateToAdmin: () => void;

  onNavigateToAIPrompts: () => void;
  onNavigateToAIReportSettings: () => void;
  onNavigateToSupplierManagement: () => void;
  onNavigateToAIUsageStats: () => void;
  onNavigateToAIPricingConfig: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onNavigateToAuditorSettings,
  onNavigateToBillingSettings,
  onNavigateToUserManagement,
  onNavigateToAdmin,

  onNavigateToAIPrompts,
  onNavigateToAIReportSettings,
  onNavigateToSupplierManagement,
  onNavigateToAIUsageStats,
  onNavigateToAIPricingConfig
}) => {
  const sectionTheme = SECTION_THEMES[AppState.SETTINGS];

  const settingsGroups = [
    {
      title: 'Můj Profil & Aplikace',
      icon: User,
      items: [
        {
          title: 'Správa uživatelů',
          description: 'Přidávání a správa uživatelských účtů',
          icon: Users,
          action: onNavigateToUserManagement,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50'
        },
        {
          title: 'Nastavení auditora',
          description: 'Kontaktní údaje a podpis pro reporty',
          icon: FileCheck,
          action: onNavigateToAuditorSettings,
          color: 'text-indigo-600',
          bgColor: 'bg-indigo-50'
        }
      ]
    },
    {
      title: 'Audity a Reporty',
      icon: FileText,
      items: [

        {
          title: 'Struktura auditů',
          description: 'Editace sekcí a položek auditu',
          icon: Shield,
          action: onNavigateToAdmin,
          color: 'text-teal-600',
          bgColor: 'bg-teal-50'
        }
      ]
    },
    {
      title: 'Fakturace a Ceník',
      icon: DollarSign,
      items: [
        {
          title: 'Nastavení fakturace',
          description: 'Splatnosti, měny a číslování',
          icon: CreditCard,
          action: onNavigateToBillingSettings,
          color: 'text-amber-600',
          bgColor: 'bg-amber-50'
        },
        {
          title: 'Správa dodavatelů',
          description: 'Evidence dodavatelů pro fakturaci',
          icon: Truck,
          action: onNavigateToSupplierManagement,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50'
        }
      ]
    },
    {
      title: 'Systém a AI Analytika',
      icon: Settings,
      items: [
        {
          title: 'AI Konfigurace',
          description: 'Nastavení reportů a promptů',
          icon: MessageSquare,
          action: onNavigateToAIReportSettings,
          color: 'text-purple-600',
          bgColor: 'bg-purple-50'
        },
        {
          title: 'Statistiky využití',
          description: 'Přehled nákladů a využití AI',
          icon: BarChart,
          action: onNavigateToAIUsageStats,
          color: 'text-pink-600',
          bgColor: 'bg-pink-50'
        },
        {
          title: 'Ceny AI modelů',
          description: 'Konfigurace cen za tokeny',
          icon: Database,
          action: onNavigateToAIPricingConfig,
          color: 'text-rose-600',
          bgColor: 'bg-rose-50'
        }
      ]
    }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto pb-6">
      <PageHeader
        section={sectionTheme}
        title="Nastavení"
        description="Správa aplikace, uživatelů a konfigurace systému"
      />

      <div className="grid grid-cols-1 gap-8">
        {settingsGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="animate-fade-in" style={{ animationDelay: `${groupIndex * 100}ms` }}>
            <div className="flex items-center gap-3 mb-4 px-1">
              <div className={`p-2 rounded-lg ${group.items[0].bgColor}`}>
                <group.icon className={`w-5 h-5 ${group.items[0].color}`} />
              </div>
              <h2 className="text-lg font-bold text-gray-800">{group.title}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.items.map((item, itemIndex) => (
                <Card
                  key={itemIndex}
                  onClick={item.action}
                  className="cursor-pointer hover:shadow-md transition-all duration-200 border-transparent hover:border-gray-200 group"
                >
                  <CardBody className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${item.bgColor} group-hover:scale-110 transition-transform duration-200`}>
                        <item.icon className={`w-6 h-6 ${item.color}`} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                          {item.title}
                        </h3>
                        <p className="text-sm text-gray-500 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
