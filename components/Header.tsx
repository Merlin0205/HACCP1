import React, { useEffect, useState } from 'react';
import { AppState } from '../types';
import { SettingsIcon, BackIcon } from './icons';
import { useAuth } from '../contexts/AuthContext';
import { calculateAIUsageStats } from '../services/firestore';

interface HeaderProps {
  appState: AppState;
  onToggleAdmin: () => void;
}

export const Header: React.FC<HeaderProps> = ({ appState, onToggleAdmin }) => {
  const { currentUser, signOut } = useAuth();
  const [totalCost, setTotalCost] = useState({ usd: 0, czk: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    // Načíst celkové náklady z Firestore
    const loadTotalCost = async () => {
      try {
        const stats = await calculateAIUsageStats();
        setTotalCost({ usd: stats.totalCostUsd, czk: stats.totalCostCzk });
      } catch (error) {
        console.error('Chyba při načítání celkových nákladů:', error);
      }
    };

    loadTotalCost();
    // Aktualizovat každých 30 sekund
    const interval = setInterval(loadTotalCost, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-white shadow-md w-full print:hidden">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold text-blue-600">
          HACCP Audit Assistant
        </h1>
        <div className="flex items-center gap-2">
          {/* Ikona s celkovými náklady na AI */}
          <div 
            className="relative"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <div className="p-2 rounded-full hover:bg-gray-100 transition-colors cursor-pointer">
              <svg 
                className="h-6 w-6 text-green-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
            </div>
            
            {/* Tooltip */}
            {showTooltip && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-gray-900 text-white text-sm rounded-lg shadow-lg p-3 z-50">
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
                {/* Šipka tooltippu */}
                <div className="absolute -top-2 right-4 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-gray-900"></div>
              </div>
            )}
          </div>

          {/* Tlačítko nastavení */}
          <button
            onClick={onToggleAdmin}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label={appState === AppState.ADMIN ? "Zpět na audit" : "Správa otázek"}
          >
            {appState === AppState.ADMIN ? <BackIcon className="h-6 w-6" /> : <SettingsIcon className="h-6 w-6" />}
          </button>

          {/* Uživatelské menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                {currentUser?.displayName?.charAt(0).toUpperCase() || currentUser?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
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
      </div>
    </header>
  );
};
