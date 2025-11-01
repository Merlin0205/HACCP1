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
import { fetchAuditorInfo, saveAuditorInfo } from '../services/firestore/settings';
import { toast } from '../utils/toast';

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
  const [initialAuditorInfo, setInitialAuditorInfo] = useState<AuditorInfo>(DEFAULT_AUDITOR);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Načíst z Firestore při prvním načtení
  useEffect(() => {
    const loadAuditorInfo = async () => {
      try {
        const data = await fetchAuditorInfo();
        setAuditorInfo(data);
        setInitialAuditorInfo(data);
      } catch (error) {
        console.error('Chyba při načítání údajů auditora:', error);
      } finally {
        setLoading(false);
      }
    };
    loadAuditorInfo();
  }, []);

  // Detekce neuložených změn
  const hasUnsavedChanges = JSON.stringify(auditorInfo) !== JSON.stringify(initialAuditorInfo);

  // Varování při odchodu pokud jsou neuložené změny
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges || saving) {
        e.preventDefault();
        e.returnValue = 'Máte neuložené změny. Opravdu chcete opustit stránku?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, saving]);

  const handleChange = (field: keyof AuditorInfo, value: string) => {
    setAuditorInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await saveAuditorInfo(auditorInfo);
      setInitialAuditorInfo(auditorInfo);
      setLastSaved(new Date());
      toast.success('Údaje byly úspěšně uloženy');
    } catch (error) {
      console.error('Chyba při ukládání:', error);
      toast.error('Chyba při ukládání údajů auditora');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (confirm('Opravdu chcete obnovit výchozí údaje auditora?')) {
      try {
        setSaving(true);
        await saveAuditorInfo(DEFAULT_AUDITOR);
        setAuditorInfo(DEFAULT_AUDITOR);
        setInitialAuditorInfo(DEFAULT_AUDITOR);
        setLastSaved(new Date());
        toast.success('Údaje byly obnoveny na výchozí hodnoty');
      } catch (error) {
        console.error('Chyba při resetu:', error);
        toast.error('Chyba při resetu');
      } finally {
        setSaving(false);
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
              <div className="mt-3 flex items-center gap-3 text-sm">
                {saving && (
                  <span className="text-blue-600 font-semibold flex items-center gap-2">
                    <span className="animate-spin">⏳</span> Ukládám...
                  </span>
                )}
                {!saving && lastSaved && (
                  <span className="text-green-600 font-semibold">
                    ✓ Uloženo {lastSaved.toLocaleTimeString('cs-CZ')}
                  </span>
                )}
                {hasUnsavedChanges && !saving && (
                  <span className="text-orange-600 font-semibold">
                    ⚠ Neuložené změny
                  </span>
                )}
              </div>
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
                disabled={saving || !hasUnsavedChanges}
                className={`flex-1 font-bold py-3 px-6 rounded-lg transition-colors ${
                  saving || !hasUnsavedChanges
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {saving ? '⏳ Ukládám...' : '💾 Uložit'}
              </button>
              <button
                onClick={handleReset}
                disabled={saving}
                className={`font-semibold py-3 px-6 rounded-lg transition-colors ${
                  saving
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                🔄 Výchozí hodnoty
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditorSettingsScreen;

// Helper funkce pro získání údajů auditora z Firestore (použitelná v celé aplikaci)
export const getAuditorInfo = async (): Promise<AuditorInfo> => {
  try {
    return await fetchAuditorInfo();
  } catch (error) {
    console.error('[getAuditorInfo] Chyba při načítání:', error);
    return DEFAULT_AUDITOR;
  }
};
