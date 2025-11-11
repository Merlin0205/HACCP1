import React, { useState, useEffect } from 'react';
import { AppState, Tab } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { calculateAIUsageStats } from '../services/firestore';
import { APP_VERSION, BUILD_DATE } from '../constants';
import { ClockIcon, ChecklistIcon, HomeIcon, SettingsIcon, InProgressIcon } from './icons/index';
import { MobileMenu } from './MobileMenu';
import { TabBar } from './TabBar';
import { getSectionTheme, SECTION_THEMES } from '../constants/designSystem';

interface LayoutProps {
  children: React.ReactNode;
  currentView: AppState;
  onNavigate: (state: AppState) => void;
  showSidebar?: boolean;
  activePremiseId?: string | null;
  activeAuditId?: string | null;
  tabs?: Tab[];
  activeTabId?: string | null;
  onTabClick?: (tabId: string) => void;
  onTabClose?: (tabId: string, e?: React.MouseEvent) => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  currentView,
  onNavigate,
  showSidebar = true,
  activePremiseId,
  activeAuditId,
  tabs = [],
  activeTabId,
  onTabClick,
  onTabClose,
}) => {
  const { currentUser, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [totalCost, setTotalCost] = useState({ usd: 0, czk: 0 });
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const loadTotalCost = async () => {
      try {
        const stats = await calculateAIUsageStats();
        setTotalCost({ usd: stats.totalCostUsd, czk: stats.totalCostCzk });
      } catch (error) {
        console.error('Chyba při načítání celkových nákladů:', error);
      }
    };
    loadTotalCost();
    const interval = setInterval(loadTotalCost, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!showSidebar) {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  const menuItems = [
    {
      id: AppState.INCOMPLETE_AUDITS,
      label: 'Nezapočaté',
      icon: ClockIcon,
      active: currentView === AppState.INCOMPLETE_AUDITS,
      theme: SECTION_THEMES[AppState.INCOMPLETE_AUDITS],
    },
    {
      id: AppState.IN_PROGRESS_AUDITS,
      label: 'Probíhající',
      icon: InProgressIcon,
      active: currentView === AppState.IN_PROGRESS_AUDITS,
      theme: SECTION_THEMES[AppState.IN_PROGRESS_AUDITS],
    },
    {
      id: AppState.ALL_AUDITS,
      label: 'Audity vše',
      icon: ChecklistIcon,
      active: currentView === AppState.ALL_AUDITS,
      theme: SECTION_THEMES[AppState.ALL_AUDITS],
    },
    {
      id: AppState.OPERATOR_DASHBOARD,
      label: 'Zákazníci',
      icon: HomeIcon,
      active: currentView === AppState.OPERATOR_DASHBOARD || 
              currentView === AppState.ADD_OPERATOR || 
              currentView === AppState.EDIT_OPERATOR ||
              currentView === AppState.ADD_PREMISE ||
              currentView === AppState.EDIT_PREMISE,
      theme: SECTION_THEMES[AppState.OPERATOR_DASHBOARD],
    },
    {
      id: AppState.SETTINGS,
      label: 'Nastavení',
      icon: SettingsIcon,
      active: currentView === AppState.SETTINGS || 
              currentView === AppState.USER_MANAGEMENT ||
              currentView === AppState.AUDITOR_SETTINGS ||
              currentView === AppState.AI_REPORT_SETTINGS ||
              currentView === AppState.AI_USAGE_STATS ||
              currentView === AppState.AI_PRICING_CONFIG ||
              currentView === AppState.AI_PROMPTS ||
              currentView === AppState.ADMIN,
      theme: SECTION_THEMES[AppState.SETTINGS],
    },
  ];

  const visibleMenuItems = menuItems.filter(item => item.show !== false);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Menu Overlay */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        menuItems={visibleMenuItems}
        currentView={currentView}
        onNavigate={(state) => {
          onNavigate(state);
          setIsMobileMenuOpen(false);
        }}
        onSignOut={signOut}
        currentUser={currentUser}
        totalCost={totalCost}
      />

      {/* Mobile/Tablet Navigation - Horizontal bar */}
      <nav className="flex xl:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50 shadow-sm">
        <div className="flex items-center justify-between w-full px-2 md:px-4 py-3 md:py-2.5 h-16 md:h-14">
          {/* Logo */}
          <div className="flex items-center gap-2 md:gap-1.5">
            <div className="w-8 h-8 md:w-7 md:h-7 bg-gradient-to-br from-primary-dark to-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm md:text-xs">H</span>
            </div>
            <h1 className="text-base md:text-base font-bold text-primary-dark hidden sm:block">HACCP</h1>
          </div>
          
          {/* Navigation Icons - Mobile: vertical layout with labels, Tablet: horizontal icons only */}
          <div className="flex items-center gap-1 md:gap-2 flex-1 justify-center">
            {visibleMenuItems.map((item) => {
              const isActive = item.active;
              const theme = item.theme;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`
                    flex flex-col items-center justify-center 
                    min-w-[56px] md:min-w-[48px] 
                    px-2 py-1.5 md:px-3 md:py-2.5 
                    rounded-xl md:rounded-lg 
                    transition-all duration-200
                    active:scale-95
                    ${isActive 
                      ? 'text-white shadow-lg' 
                      : 'text-gray-600 active:bg-gray-100'
                    }
                  `}
                  style={isActive ? {
                    background: `linear-gradient(to right, ${theme.colors.primary}, ${theme.colors.darkest})`
                  } : undefined}
                  title={item.label}
                >
                  {/* Icon - larger on mobile */}
                  <div className="mb-0.5 md:mb-0 flex items-center justify-center">
                    <item.icon className={`h-7 w-7 md:h-6 md:w-6 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                  </div>
                  {/* Label - only on mobile */}
                  <span className="text-[10px] md:hidden font-medium leading-tight text-center max-w-[60px] truncate">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
          
          {/* User Avatar */}
          <div className="w-9 h-9 md:w-8 md:h-8 bg-primary text-white rounded-full flex items-center justify-center font-semibold text-sm md:text-sm cursor-pointer hover:opacity-90 active:scale-95 transition-all">
            {currentUser?.displayName?.charAt(0).toUpperCase() || currentUser?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
        </div>
      </nav>

      {/* Desktop Sidebar - vlastní implementace s Flowbite styling */}
      <aside className={`
        hidden xl:flex flex-col bg-white border-r border-gray-200 transition-all duration-300
        ${isSidebarCollapsed ? 'w-16' : 'w-64'}
      `}>
        {/* Logo */}
        <div className={`px-6 py-4 border-b border-gray-200 flex items-center ${isSidebarCollapsed ? 'justify-center' : ''}`}>
          {!isSidebarCollapsed && (
            <h1 className="text-xl font-bold text-primary-dark">HACCP Audit</h1>
          )}
          {isSidebarCollapsed && (
            <div className="w-8 h-8 bg-gradient-to-br from-primary-dark to-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">H</span>
            </div>
          )}
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-4 py-4 space-y-1">
          {visibleMenuItems.map((item) => {
            const isActive = item.active;
            const theme = item.theme;
            
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                  ${isActive 
                    ? 'text-white shadow-md' 
                    : 'text-gray-700 hover:bg-gray-100'
                  }
                  ${isSidebarCollapsed ? 'justify-center' : ''}
                `}
                title={isSidebarCollapsed ? item.label : undefined}
                style={isActive ? {
                  background: `linear-gradient(to right, ${theme.colors.primary}, ${theme.colors.darkest})`
                } : undefined}
              >
                <item.icon className={`h-6 w-6 ${isActive ? 'text-white' : 'text-gray-700'}`} />
                {!isSidebarCollapsed && (
                  <span className="font-medium">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* AI Cost Indicator */}
        <div className={`px-4 py-3 border-t border-gray-200 ${isSidebarCollapsed ? 'px-2' : ''}`}>
          <div className={`
            bg-gray-50 rounded-lg p-3
            ${isSidebarCollapsed ? 'flex flex-col items-center' : ''}
          `}>
            {!isSidebarCollapsed && (
              <div className="text-xs text-gray-500 mb-1">💰 AI Náklady</div>
            )}
            <div className={`text-sm font-semibold text-gray-900 ${isSidebarCollapsed ? 'text-xs' : ''}`}>
              {totalCost.czk.toFixed(2)} Kč
            </div>
          </div>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="px-4 py-2 border-t border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors text-sm"
        >
          {isSidebarCollapsed ? '→' : '← Schovat menu'}
        </button>

        {/* Version Info */}
        {!isSidebarCollapsed && (
          <div className="px-4 py-2 border-t border-gray-200 text-xs text-gray-400 text-center">
            <div>Verze: {APP_VERSION}</div>
            <div className="text-gray-300">Build: {BUILD_DATE}</div>
          </div>
        )}
        {isSidebarCollapsed && (
          <div className="px-2 py-2 border-t border-gray-200 text-xs text-gray-400 text-center">
            v{APP_VERSION.split('.')[0]}
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar - vlastní implementace s Flowbite styling */}
        <header className="bg-white border-b border-gray-200 h-14 flex items-center justify-between px-4 xl:px-6 sticky top-0 z-40 print:hidden pt-16 md:pt-14 xl:pt-0">
          {/* Mobile/Tablet: Empty space (top bar handles navigation) */}
          <div className="hidden xl:block flex-1" />

          {/* Right side: User (desktop only - mobile/tablet mají user v top bar) */}
          <div className="hidden xl:flex items-center gap-3">
            {/* User Avatar - Desktop only */}
            <div className="hidden xl:block relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-9 h-9 bg-primary text-white rounded-full flex items-center justify-center font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                {currentUser?.displayName?.charAt(0).toUpperCase() || currentUser?.email?.charAt(0).toUpperCase() || 'U'}
              </button>
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900 truncate">{currentUser?.displayName || 'User'}</p>
                    <p className="text-xs text-gray-500 truncate">{currentUser?.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      signOut();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Odhlásit se
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* TabBar - pouze když existují taby (desktop only) */}
        {tabs.length > 0 && onTabClick && onTabClose && (
          <div className="hidden xl:block">
            <TabBar
              tabs={tabs}
              activeTabId={activeTabId || null}
              onTabClick={onTabClick}
              onTabClose={onTabClose}
            />
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};
