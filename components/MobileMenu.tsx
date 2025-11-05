import React from 'react';
import { AppState } from '../types';
import { User } from 'firebase/auth';
import { SECTION_THEMES } from '../constants/designSystem';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: Array<{
    id: AppState;
    label: string;
    icon: React.ReactNode;
    active: boolean;
    theme?: typeof SECTION_THEMES[string];
  }>;
  currentView: AppState;
  onNavigate: (state: AppState) => void;
  onSignOut: () => void;
  currentUser: User | null;
  totalCost: { usd: number; czk: number };
}

export const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  onClose,
  menuItems,
  onNavigate,
  onSignOut,
  currentUser,
  totalCost,
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity duration-300 lg:hidden"
        onClick={onClose}
      />

      {/* Slide-in Menu */}
      <div
        className={`
          fixed top-0 left-0 h-full w-72 bg-white shadow-2xl z-50
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          flex flex-col
        `}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-primary-dark">Menu</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Zavřít"
          >
            <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = item.active;
            const theme = item.theme || SECTION_THEMES[item.id] || SECTION_THEMES[AppState.ALL_AUDITS];
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                  ${isActive 
                    ? 'text-white shadow-md' 
                    : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
                style={isActive ? {
                  background: `linear-gradient(to right, ${theme.colors.primary}, ${theme.colors.darkest})`
                } : undefined}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* AI Cost Indicator */}
        <div className="px-4 py-3 border-t border-gray-200">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">💰 AI Náklady</div>
            <div className="text-sm font-semibold text-gray-900">
              {totalCost.czk.toFixed(2)} Kč
            </div>
            <div className="text-xs text-gray-500 mt-1">
              ${totalCost.usd.toFixed(4)} USD
            </div>
          </div>
        </div>

        {/* User Section */}
        <div className="px-4 py-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-semibold">
              {currentUser?.displayName?.charAt(0).toUpperCase() || 
               currentUser?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {currentUser?.displayName || 'Uživatel'}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {currentUser?.email}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              onSignOut();
              onClose();
            }}
            className="w-full px-4 py-2 rounded-lg hover:bg-red-50 text-red-600 font-medium transition-colors"
          >
            Odhlásit se
          </button>
        </div>
      </div>
    </>
  );
};
