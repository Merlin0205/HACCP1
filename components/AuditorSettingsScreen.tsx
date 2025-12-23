/**
 * Auditor Settings Screen - Nastavení údajů auditora
 * 
 * Umožňuje nastavit:
 * - Jméno a titul
 * - Telefon
 * - E-mail
 * - Web
 */

import React, { useState, useEffect, useRef } from 'react';
import { AuditorInfo } from '../types';
import { fetchAuditorInfo, saveAuditorInfo } from '../services/firestore/settings';
import { toast } from '../utils/toast';
import { PageHeader } from './PageHeader';
import { Card, CardBody, CardHeader } from './ui/Card';
import { TextField } from './ui/Input';
import { Button } from './ui/Button';
import { SECTION_THEMES } from '../constants/designSystem';
import { AppState } from '../types';
import { useUnsavedChanges } from '../contexts/UnsavedChangesContext';
import { uploadAuditorStamp, deleteAuditorStamp, fileToBase64 } from '../services/storage';

const DEFAULT_AUDITOR: AuditorInfo = {
  name: 'Bc. Sylva Polzer, hygienický konzultant',
  phone: '603 398 774',
  email: 'sylvapolzer@avlyspol.cz',
  web: 'www.avlyspol.cz',
  stampWidth: 30
};

interface AuditorSettingsScreenProps {
  onBack: () => void;
}

const AuditorSettingsScreen: React.FC<AuditorSettingsScreenProps> = ({ onBack }) => {
  const { setDirty, isDirty } = useUnsavedChanges();
  const [auditorInfo, setAuditorInfo] = useState<AuditorInfo>(DEFAULT_AUDITOR);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [stampPreview, setStampPreview] = useState<string | null>(null);
  const [isUploadingStamp, setIsUploadingStamp] = useState(false);
  const [stampFile, setStampFile] = useState<File | null>(null);
  const [deletingStamp, setDeletingStamp] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Načíst z Firestore při prvním načtení
  useEffect(() => {
    const loadAuditorInfo = async () => {
      try {
        const data = await fetchAuditorInfo();
        setAuditorInfo(data);
        // Nastavit preview razítka pokud existuje URL
        if (data.stampUrl) {
          setStampPreview(data.stampUrl);
        }
      } catch (error) {
        console.error('Chyba při načítání údajů auditora:', error);
      } finally {
        setLoading(false);
      }
    };
    loadAuditorInfo();
  }, []);

  const handleChange = (field: keyof AuditorInfo, value: string | 'left' | 'center' | 'right' | number) => {
    setAuditorInfo(prev => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const handleStampFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validace typu souboru
    if (!file.type.startsWith('image/')) {
      toast.error('Soubor musí být obrázek');
      return;
    }

    // Validace velikosti (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Soubor je příliš velký (max 10MB)');
      return;
    }

    setIsUploadingStamp(true);
    try {
      // Vytvořit preview
      const preview = await fileToBase64(file);
      setStampPreview(preview);
      setStampFile(file);
      setDirty(true);
      toast.success('Razítko připraveno k uložení');
    } catch (error: any) {
      console.error('[AuditorSettingsScreen] Error processing stamp file:', error);
      toast.error('Chyba při zpracování souboru: ' + error.message);
      setStampPreview(null);
      setStampFile(null);
    } finally {
      setIsUploadingStamp(false);
    }
  };

  const handleDeleteStamp = async () => {
    if (!confirm('Opravdu chcete smazat razítko?')) {
      return;
    }

    setDeletingStamp(true);
    try {
      // Smazat z Storage
      await deleteAuditorStamp();
      
      // Vymazat z state
      setStampPreview(null);
      setStampFile(null);
      setAuditorInfo(prev => ({ ...prev, stampUrl: undefined }));
      setDirty(true);
      toast.success('Razítko bylo smazáno');
    } catch (error: any) {
      console.error('[AuditorSettingsScreen] Error deleting stamp:', error);
      toast.error('Chyba při mazání razítka: ' + error.message);
    } finally {
      setDeletingStamp(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Pokud je nový soubor razítka, nahrát ho do Storage
      let finalStampUrl = auditorInfo.stampUrl;
      if (stampFile) {
        try {
          finalStampUrl = await uploadAuditorStamp(stampFile);
          setStampFile(null);
          toast.success('Razítko bylo nahráno');
        } catch (error: any) {
          console.error('[AuditorSettingsScreen] Error uploading stamp:', error);
          toast.error('Chyba při nahrávání razítka: ' + error.message);
          return; // Přerušit ukládání pokud se nepodařilo nahrát razítko
        }
      }

      // Uložit všechny údaje včetně razítka
      await saveAuditorInfo({
        ...auditorInfo,
        stampUrl: finalStampUrl
      });
      
      // Aktualizovat preview pokud bylo nahráno nové razítko
      if (finalStampUrl) {
        setStampPreview(finalStampUrl);
      }
      
      setLastSaved(new Date());
      setDirty(false);
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
        setLastSaved(new Date());
        setDirty(false);
        toast.success('Údaje byly obnoveny na výchozí hodnoty');
      } catch (error) {
        console.error('Chyba při resetu:', error);
        toast.error('Chyba při resetu');
      } finally {
        setSaving(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <p className="mt-4 text-gray-600">Načítání nastavení...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      <PageHeader
        section={SECTION_THEMES[AppState.SETTINGS]}
        title="Nastavení auditora"
        description="Údaje, které se zobrazí v reportech"
        onBack={onBack}
      />

      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Kontaktní údaje</h2>
            <div className="flex items-center gap-3 text-sm">
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
              {isDirty && !saving && (
                <span className="text-orange-600 font-semibold">
                  ⚠ Neuložené změny
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <TextField
              label="Jméno a titul"
              value={auditorInfo.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Bc. Sylva Polzer, hygienický konzultant"
            />
            <TextField
              label="Telefon"
              type="tel"
              value={auditorInfo.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="603 398 774"
            />
            <TextField
              label="E-mail"
              type="email"
              value={auditorInfo.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="sylvapolzer@avlyspol.cz"
            />
            <TextField
              label="Web"
              value={auditorInfo.web}
              onChange={(e) => handleChange('web', e.target.value)}
              placeholder="www.avlyspol.cz"
            />
          </div>
        </CardBody>
      </Card>

      {/* Razítko s podpisem */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Razítko s podpisem</h2>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            {/* Upload razítka */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nahrajte razítko s podpisem
              </label>
              <div className="flex items-center gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleStampFileChange}
                  className="hidden"
                  disabled={isUploadingStamp || saving}
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isUploadingStamp || saving}
                  isLoading={isUploadingStamp}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {stampPreview ? 'Změnit razítko' : 'Nahrát razítko'}
                </Button>
                {stampPreview && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleDeleteStamp}
                    disabled={deletingStamp || saving}
                    isLoading={deletingStamp}
                    className="bg-red-50 text-red-700 hover:bg-red-100"
                  >
                    Smazat razítko
                  </Button>
                )}
              </div>
              {stampPreview && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">Náhled razítka:</p>
                  <div className={`inline-block ${auditorInfo.stampAlignment === 'center' ? 'mx-auto block text-center' : auditorInfo.stampAlignment === 'right' ? 'ml-auto block text-right' : 'text-left'}`} style={{ width: `${auditorInfo.stampWidth || 30}%`, maxWidth: '100%' }}>
                    <img
                      src={stampPreview}
                      alt="Náhled razítka"
                      className="w-full h-auto border border-gray-300 rounded"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Velikost razítka */}
            {stampPreview && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Velikost razítka v reportu
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={auditorInfo.stampWidth || 30}
                    onChange={(e) => handleChange('stampWidth', parseInt(e.target.value))}
                    disabled={saving}
                    className="flex-1"
                  />
                  <div className="w-20 text-right">
                    <span className="text-sm font-medium text-gray-700">{auditorInfo.stampWidth || 30}%</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => handleChange('stampWidth', 20)}
                    disabled={saving}
                    className={`px-2 py-1 text-xs rounded ${auditorInfo.stampWidth === 20 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    Malé (20%)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('stampWidth', 30)}
                    disabled={saving}
                    className={`px-2 py-1 text-xs rounded ${(auditorInfo.stampWidth || 30) === 30 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    Střední (30%)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('stampWidth', 50)}
                    disabled={saving}
                    className={`px-2 py-1 text-xs rounded ${auditorInfo.stampWidth === 50 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    Velké (50%)
                  </button>
                </div>
              </div>
            )}

            {/* Zarovnání razítka */}
            {stampPreview && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zarovnání razítka v reportu
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleChange('stampAlignment', 'left')}
                    disabled={saving}
                    className={`flex items-center gap-2 px-4 py-2 rounded border-2 transition-colors ${
                      (auditorInfo.stampAlignment === 'left' || !auditorInfo.stampAlignment)
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h16" />
                    </svg>
                    <span className="text-sm font-medium">Doleva</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('stampAlignment', 'center')}
                    disabled={saving}
                    className={`flex items-center gap-2 px-4 py-2 rounded border-2 transition-colors ${
                      auditorInfo.stampAlignment === 'center'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M4 18h16" />
                    </svg>
                    <span className="text-sm font-medium">Na střed</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('stampAlignment', 'right')}
                    disabled={saving}
                    className={`flex items-center gap-2 px-4 py-2 rounded border-2 transition-colors ${
                      auditorInfo.stampAlignment === 'right'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M4 18h16" />
                    </svg>
                    <span className="text-sm font-medium">Doprava</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Náhled */}
      <Card className="mb-6 bg-gray-50 border-dashed">
        <CardBody>
          <h3 className="text-sm font-bold text-gray-700 mb-4">Náhled v reportu:</h3>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="font-bold text-gray-700">Auditor</div>
                <div className="text-gray-600">{auditorInfo.name}</div>
              </div>
              <div>
                <div className="font-bold text-gray-700">Telefon</div>
                <div className="text-gray-600">{auditorInfo.phone}</div>
              </div>
              <div>
                <div className="font-bold text-gray-700">E-mail</div>
                <div className="text-gray-600">{auditorInfo.email}</div>
              </div>
              <div>
                <div className="font-bold text-gray-700">Web</div>
                <div className="text-gray-600">{auditorInfo.web}</div>
              </div>
            </div>
            {/* Náhled razítka s zarovnáním */}
            {stampPreview && (
              <div className="mt-6 pt-4 border-t border-gray-300">
                <div className="font-bold text-gray-700 mb-2">Razítko s podpisem:</div>
                <div className={`${auditorInfo.stampAlignment === 'center' ? 'text-center' : auditorInfo.stampAlignment === 'right' ? 'text-right' : 'text-left'}`}>
                  <div className="inline-block" style={{ width: `${auditorInfo.stampWidth || 30}%`, maxWidth: '100%' }}>
                    <img
                      src={stampPreview}
                      alt="Náhled razítka v reportu"
                      className="w-full h-auto"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Tlačítka */}
      <div className="flex justify-end gap-4">
        <Button
          variant="secondary"
          onClick={handleReset}
          disabled={saving}
        >
          Obnovit výchozí
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={saving || !isDirty}
          isLoading={saving}
        >
          Uložit změny
        </Button>
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
