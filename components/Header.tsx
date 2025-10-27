import React from 'react';
import { AppState } from '../types';
import { SettingsIcon } from './icons/SettingsIcon';
import { BackIcon } from './icons/BackIcon';

interface HeaderProps {
  appState: AppState;
  onToggleAdmin: () => void;
}

const Header: React.FC<HeaderProps> = ({ appState, onToggleAdmin }) => {
  return (
    <header className="bg-white shadow-md w-full">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold text-blue-600">
          HACCP Audit Assistant
        </h1>
        <button
          onClick={onToggleAdmin}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label={appState === AppState.ADMIN ? "Zpět na audit" : "Správa otázek"}
        >
          {appState === AppState.ADMIN ? <BackIcon /> : <SettingsIcon />}
        </button>
      </div>
    </header>
  );
};

export default Header;