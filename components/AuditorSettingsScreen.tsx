/**
 * Auditor Settings Screen - Nastavení údajů auditora
 * 
 * Umožňuje nastavit:
 * - Jméno a titul
 * - Telefon
 * - E-mail
 * - Web
 */

import React, { useState, useEffect } from 'react';
import { AuditorInfo } from '../types';

// Prázdný string = použije relativní URL přes Vite proxy (/api → localhost:9002)
// Vite proxy je definovaná v vite.config.ts
const API_URL = '';

const DEFAULT_AUDITOR: AuditorInfo = {
  name: 'Bc. Sylva Polzer, hygienický konzultant',
  phone: '603 398 774',
  email: 'sylvapolzer@avlyspol.cz',
  web: 'www.avlyspol.cz'
};

interface AuditorSettingsScreenProps {
  onBack: () => void;
}

const AuditorSettingsScreen: React.FC<AuditorSettingsScreenProps> = ({ onBack }) => {
  const [auditorInfo, setAuditorInfo] = useState<AuditorInfo>(DEFAULT_AUDITOR);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Načíst z API při prvním načtení
  useEffect(() => {
    const loadAuditorInfo = async () => {
      try {
        const response = await fetch(`${API_URL}/api/auditor-settings`);
        if (response.ok) {
          const data = await response.json();
          setAuditorInfo(data);
        }
      } catch (error) {
        console.error('Chyba při načítání údajů auditora:', error);
      } finally {
        setLoading(false);
      }
    };
    loadAuditorInfo();
  }, []);

  const handleChange = (field: keyof AuditorInfo, value: string) => {
    setAuditorInfo(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auditor-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auditorInfo)
      });
      
      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        alert('Chyba při ukládání údajů auditora');
      }
    } catch (error) {
      console.error('Chyba při ukládání:', error);
      alert('Chyba při ukládání údajů auditora');
    }
  };

  const handleReset = async () => {
    if (confirm('Opravdu chcete obnovit výchozí údaje auditora?')) {
      try {
        const response = await fetch(`${API_URL}/api/auditor-settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(DEFAULT_AUDITOR)
        });
        
        if (response.ok) {
          setAuditorInfo(DEFAULT_AUDITOR);
          setSaved(true);
          setTimeout(() => setSaved(false), 3000);
        }
      } catch (error) {
        console.error('Chyba při resetu:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 md:p-6" style={{ width: '100%' }}>
      <div className="w-full mx-auto" style={{ maxWidth: '896px', width: '100%' }}>
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">⚙️ Nastavení auditora</h1>
              <p className="text-gray-600 mt-2">Údaje, které se zobrazí v reportech</p>
            </div>
            <button
              onClick={onBack}
              className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
              ← Zpět
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="space-y-6">
            {/* Jméno */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Jméno a titul
              </label>
              <input
                type="text"
                value={auditorInfo.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Bc. Sylva Polzer, hygienický konzultant"
              />
            </div>

            {/* Telefon */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Mobil
              </label>
              <input
                type="tel"
                value={auditorInfo.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="603 398 774"
              />
            </div>

            {/* E-mail */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                E-mail
              </label>
              <input
                type="email"
                value={auditorInfo.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="sylvapolzer@avlyspol.cz"
              />
            </div>

            {/* Web */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Web
              </label>
              <input
                type="text"
                value={auditorInfo.web}
                onChange={(e) => handleChange('web', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="www.avlyspol.cz"
              />
            </div>

            {/* Náhled */}
            <div className="mt-8 p-6 bg-gray-50 rounded-lg border-2 border-gray-200">
              <h3 className="text-sm font-bold text-gray-700 mb-4">Náhled v reportu:</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-bold text-gray-700">Auditor</span>
                  <span className="font-bold text-gray-700">Mobil</span>
                  <span className="font-bold text-gray-700">E-mail</span>
                  <span className="font-bold text-gray-700">Web</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>{auditorInfo.name}</span>
                  <span>{auditorInfo.phone}</span>
                  <span>{auditorInfo.email}</span>
                  <span>{auditorInfo.web}</span>
                </div>
              </div>
            </div>

            {/* Tlačítka */}
            <div className="flex gap-4 pt-6">
              <button
                onClick={handleSave}
                className="flex-1 bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
              >
                💾 Uložit
              </button>
              <button
                onClick={handleReset}
                className="bg-gray-200 text-gray-800 font-semibold py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors"
              >
                🔄 Výchozí hodnoty
              </button>
            </div>

            {/* Potvrzení */}
            {saved && (
              <div className="p-4 bg-green-100 border-2 border-green-500 rounded-lg text-green-800 font-semibold text-center animate-fade-in">
                ✅ Údaje byly úspěšně uloženy
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditorSettingsScreen;

// Helper funkce pro získání údajů auditora z API (použitelná v celé aplikaci)
export const getAuditorInfo = async (): Promise<AuditorInfo> => {
  try {
    const response = await fetch(`${API_URL}/api/auditor-settings`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('[getAuditorInfo] Chyba při načítání:', error);
  }
  return DEFAULT_AUDITOR;
};
