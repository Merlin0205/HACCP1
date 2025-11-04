/**
 * AI Prompts Screen - Nastavení AI promptů pro neshody
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchAIPromptsConfig, saveAIPromptsConfig, initializeAIPromptsConfig, AIPromptsConfig, AIPrompt } from '../services/firestore/settings';
import { fetchAIModelsConfig } from '../services/firestore/settings';
import { toast } from '../utils/toast';
import { PageHeader } from './PageHeader';
import { SECTION_THEMES } from '../constants/designSystem';
import { AppState } from '../types';

interface AIPromptsScreenProps {
  onBack: () => void;
}

// PromptCard komponenta mimo hlavní komponentu, aby se nemusela znovu vytvářet
const PromptCard: React.FC<{ 
  promptId: 'rewrite-finding' | 'generate-recommendation'; 
  prompt: AIPrompt;
  onPromptChange: (promptId: 'rewrite-finding' | 'generate-recommendation', field: keyof AIPrompt, value: string) => void;
}> = ({ promptId, prompt, onPromptChange }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [localTemplate, setLocalTemplate] = useState(prompt.template);

  // Synchronizovat lokální state s prop, když se prompt změní zvenku (např. při resetu)
  useEffect(() => {
    setLocalTemplate(prompt.template);
  }, [prompt.template]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setLocalTemplate(value);
    onPromptChange(promptId, 'template', value);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xl font-bold text-gray-800">{prompt.name}</h3>
            <div className="relative">
              <button
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className="text-blue-500 hover:text-blue-700"
                type="button"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              {showTooltip && (
                <div className="absolute z-10 left-0 top-6 w-80 bg-gray-900 text-white text-xs rounded-lg shadow-xl p-3">
                  <p className="font-semibold mb-2">{prompt.description}</p>
                  <p className="text-gray-300 mb-2">Dostupné proměnné:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-300">
                    {prompt.variables.map((variable) => (
                      <li key={variable}>
                        <code className="bg-gray-800 px-1 rounded">{`{${variable}}`}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">{prompt.description}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Template promptu
          </label>
          <textarea
            value={localTemplate}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            rows={6}
            placeholder="Zadejte template promptu..."
          />
          <p className="text-xs text-gray-500 mt-2">
            Použijte proměnné jako {'{sectionTitle}'}, {'{itemTitle}'}, {'{itemDescription}'}, {'{finding}'} v textu
          </p>
        </div>
      </div>
    </div>
  );
};

const AIPromptsScreen: React.FC<AIPromptsScreenProps> = ({ onBack }) => {
  const [config, setConfig] = useState<AIPromptsConfig | null>(null);
  const [initialConfig, setInitialConfig] = useState<AIPromptsConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [currentModel, setCurrentModel] = useState<string>('');

  // Načíst z Firestore
  useEffect(() => {
    const loadConfig = async () => {
      try {
        // Inicializovat pokud neexistuje
        await initializeAIPromptsConfig();
        
        const [promptsConfig, modelsConfig] = await Promise.all([
          fetchAIPromptsConfig(),
          fetchAIModelsConfig()
        ]);
        
        // Načíst model pro text-generation
        const textGenerationModel = modelsConfig.models?.['text-generation'];
        if (textGenerationModel) {
          setCurrentModel(textGenerationModel);
        }
        
        setConfig(promptsConfig);
        setInitialConfig(promptsConfig);
      } catch (error) {
        console.error('Chyba při načítání:', error);
        toast.error('Chyba při načítání konfigurace');
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, []);

  // Detekce neuložených změn - použít useMemo pro optimalizaci
  const hasUnsavedChanges = useMemo(() => {
    if (!config || !initialConfig) return false;
    return JSON.stringify(config) !== JSON.stringify(initialConfig);
  }, [config, initialConfig]);

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

  const handleSave = async () => {
    if (!config) return;
    
    try {
      setSaving(true);
      await saveAIPromptsConfig(config);
      setInitialConfig(config);
      setLastSaved(new Date());
      toast.success('Prompty úspěšně uloženy');
    } catch (error) {
      console.error('Chyba při ukládání:', error);
      toast.error('Chyba při ukládání');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Opravdu chcete obnovit výchozí prompty? Všechny změny budou ztraceny.')) {
      return;
    }
    
    try {
      await initializeAIPromptsConfig();
      const defaultConfig = await fetchAIPromptsConfig();
      setConfig(defaultConfig);
      setInitialConfig(defaultConfig);
      toast.success('Výchozí prompty obnoveny');
    } catch (error) {
      console.error('Chyba při obnovování:', error);
      toast.error('Chyba při obnovování výchozích promptů');
    }
  };

  // Použít useCallback pro stabilní referenci funkce - funkční update pro zabránění re-renderu
  const handlePromptChange = useCallback((promptId: 'rewrite-finding' | 'generate-recommendation', field: keyof AIPrompt, value: string) => {
    setConfig(prevConfig => {
      if (!prevConfig) return prevConfig;
      
      return {
        ...prevConfig,
        prompts: {
          ...prevConfig.prompts,
          [promptId]: {
            ...prevConfig.prompts[promptId],
            [field]: value
          }
        }
      };
    });
  }, []); // Prázdné dependencies - funkční update nepotřebuje závislosti

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto">
        <PageHeader
          section={SECTION_THEMES[AppState.SETTINGS]}
          title="AI Prompty"
          description="Správa promptů pro generování textu neshod"
        />
        <div className="text-center p-12">Načítání...</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="w-full max-w-7xl mx-auto">
        <PageHeader
          section={SECTION_THEMES[AppState.SETTINGS]}
          title="AI Prompty"
          description="Správa promptů pro generování textu neshod"
        />
        <div className="text-center p-12 text-red-600">Chyba při načítání konfigurace</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      <PageHeader
        section={SECTION_THEMES[AppState.SETTINGS]}
        title="AI Prompty"
        description="Správa promptů pro generování textu neshod"
      />

      {/* Info panel */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Informace</h2>
            <div className="space-y-1 text-sm text-gray-600">
              <p>
                <span className="font-semibold">Používaný model:</span> {currentModel || 'Není nastaven'}
              </p>
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
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Obnovit výchozí
            </button>
            <button
              onClick={handleSave}
              disabled={!hasUnsavedChanges || saving}
              className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Ukládám...' : 'Uložit všechny'}
            </button>
            <button
              onClick={onBack}
              className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Zpět
            </button>
          </div>
        </div>
      </div>

      {/* Prompty */}
      <div className="space-y-6">
        {config && (
          <>
            <PromptCard 
              key="rewrite-finding" 
              promptId="rewrite-finding" 
              prompt={config.prompts['rewrite-finding']} 
              onPromptChange={handlePromptChange} 
            />
            <PromptCard 
              key="generate-recommendation" 
              promptId="generate-recommendation" 
              prompt={config.prompts['generate-recommendation']} 
              onPromptChange={handlePromptChange} 
            />
          </>
        )}
      </div>
    </div>
  );
};

export default AIPromptsScreen;

