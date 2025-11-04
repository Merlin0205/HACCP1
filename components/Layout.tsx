import React, { useState, useEffect } from 'react';
import { AppState, Tab } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { calculateAIUsageStats } from '../services/firestore';
import { APP_VERSION, BUILD_DATE } from '../constants';
import { ClockIcon, ChecklistIcon, HomeIcon, SettingsIcon } from './icons/index';
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

  // Mobile: hamburger menu, Desktop: sidebar
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  if (!showSidebar) {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  const menuItems = [
    {
      id: AppState.INCOMPLETE_AUDITS,
      label: 'Nezapočaté',
      icon: <ClockIcon className="h-5 w-5" />,
      active: currentView === AppState.INCOMPLETE_AUDITS,
      theme: SECTION_THEMES[AppState.INCOMPLETE_AUDITS],
    },
    {
      id: AppState.ALL_AUDITS,
      label: 'Audity vše',
      icon: <ChecklistIcon className="h-5 w-5" />,
      active: currentView === AppState.ALL_AUDITS,
      theme: SECTION_THEMES[AppState.ALL_AUDITS],
    },
    {
      id: AppState.OPERATOR_DASHBOARD,
      label: 'Zákazníci',
      icon: <HomeIcon className="h-5 w-5" />,
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
      icon: <SettingsIcon className="h-5 w-5" />,
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

      {/* Desktop Sidebar */}
      <aside className={`
        hidden lg:flex flex-col bg-white border-r border-gray-200 transition-all duration-300
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
                    ? `bg-gradient-to-r ${theme.colors.gradient} text-white shadow-md` 
                    : 'text-gray-700 hover:bg-gray-100'
                  }
                  ${isSidebarCollapsed ? 'justify-center' : ''}
                `}
                title={isSidebarCollapsed ? item.label : undefined}
                style={isActive ? {
                  background: `linear-gradient(to right, ${theme.colors.primary}, ${theme.colors.darkest})`
                } : undefined}
              >
                {item.icon}
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

        {/* User Menu */}
        <div className="px-4 py-4 border-t border-gray-200 relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={`
              w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors
              ${isSidebarCollapsed ? 'justify-center' : ''}
            `}
          >
            <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-semibold flex-shrink-0">
              {currentUser?.displayName?.charAt(0).toUpperCase() || 
               currentUser?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            {!isSidebarCollapsed && (
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {currentUser?.displayName || 'Uživatel'}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {currentUser?.email}
                </div>
              </div>
            )}
          </button>

          {showUserMenu && !isSidebarCollapsed && (
            <div className="absolute bottom-full left-4 mb-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 p-2 z-50">
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  signOut();
                }}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-red-50 text-red-600 font-medium"
              >
                Odhlásit se
              </button>
            </div>
          )}
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
        {/* Top Header Bar */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-40 print:hidden">
          {/* Mobile: Hamburger + Logo */}
          <div className="flex items-center gap-4 lg:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Otevřít menu"
            >
              <svg className="h-6 w-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-bold text-primary-dark">HACCP Audit</h1>
          </div>

          {/* Desktop: Breadcrumb could go here */}
          <div className="hidden lg:flex items-center flex-1">
            {/* Breadcrumb can be added here */}
          </div>

          {/* Right side: User menu */}
          <div className="flex items-center gap-2">
            {/* AI Cost Indicator - Mobile */}
            <div className="lg:hidden relative group">
              <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <div className="absolute right-0 top-full mt-2 w-48 bg-gray-900 text-white text-sm rounded-lg shadow-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="font-bold mb-2">💰 Celkové náklady AI</div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-300">USD:</span>
                    <span className="font-bold text-green-400">${totalCost.usd.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Kč:</span>
                    <span className="font-bold text-orange-400">{totalCost.czk.toFixed(4)} Kč</span>
                  </div>
                </div>
              </div>
            </div>

            {/* User Avatar */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2"
              >
                <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-semibold text-sm">
                  {currentUser?.displayName?.charAt(0).toUpperCase() || 
                   currentUser?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <svg className="hidden lg:block h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 p-2 z-50">
                  <div className="px-3 py-2 border-b border-gray-200">
                    <p className="font-semibold text-gray-800">{currentUser?.displayName || 'Uživatel'}</p>
                    <p className="text-sm text-gray-600 truncate">{currentUser?.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      signOut();
                    }}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-red-50 text-red-600 font-medium mt-1"
                  >
                    Odhlásit se
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* TabBar - pouze když existují taby */}
        {tabs.length > 0 && onTabClick && onTabClose && (
          <TabBar
            tabs={tabs}
            activeTabId={activeTabId || null}
            onTabClick={onTabClick}
            onTabClose={onTabClose}
          />
        )}

        {/* Content Area */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

