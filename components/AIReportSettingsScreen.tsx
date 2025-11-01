/**
 * AI Report Settings Screen - Nastavení AI generování reportů
 * NOVÁ VERZE - strukturován podle AIUsageStatsScreen.tsx pro správnou šířku
 */

import React, { useState, useEffect } from 'react';
import { fetchAIReportConfig, saveAIReportConfig, fetchAIModelsConfig, saveAIModelsConfig } from '../services/firestore/settings';
import { fetchAIPricingConfig } from '../services/firestore/settings';
import { toast } from '../utils/toast';

interface AIReportConfig {
  staticPositiveReport: {
    evaluation_text: string;
    key_findings: string[];
    key_recommendations: string[];
  };
  aiPromptTemplate: string;
  useAI: boolean;
  selectedModel: string;
  fallbackText: string;
}

const DEFAULT_CONFIG: AIReportConfig = {
  staticPositiveReport: {
    evaluation_text: "Audit prokázal výborný hygienický stav provozovny. Všechny kontrolované položky vyhovují legislativním požadavkům České republiky a Evropské unie. Provozovna má zavedené správné hygienické postupy a udržuje vysoký standard bezpečnosti potravin.",
    key_findings: [
      "Všechny kontrolované oblasti vyhovují legislativním požadavkům",
      "Zavedené hygienické postupy jsou funkční a efektivní",
      "Provozovna udržuje vysoký hygienický standard",
      "Dokumentace je vedena v souladu s požadavky"
    ],
    key_recommendations: [
      "Pokračovat v nastaveném režimu kontrol a údržby",
      "Udržovat pravidelné školení zaměstnanců v oblasti hygieny",
      "Průběžně aktualizovat dokumentaci HACCP",
      "Provádět pravidelné interní audity pro udržení vysokého standardu"
    ]
  },
  aiPromptTemplate: "Jsi expert na hygienu potravin a HACCP v České republice a řídíš se výhradně platnou legislativou ČR a příslušnými nadřazenými předpisy Evropské unie. Tvým úkolem je vygenerovat strukturovaný report z auditu ve formátu JSON.\n\n### DŮLEŽITÉ: Byly nalezeny následující neshody, které MUSÍŠ zahrnout do reportu:\n{{neshody}}\n\n### Počet neshod celkem: {{pocet_neshod}}",
  useAI: true,
  selectedModel: "gemini-1.5-flash",
  fallbackText: "Audit byl proveden a byly zjištěny neshody, které vyžadují okamžitou pozornost a nápravu."
};

interface AIReportSettingsScreenProps {
  onBack: () => void;
}

interface ModelInfo {
  name: string;
  usage: string;
  estimatedCost: number;
}

const AIReportSettingsScreen: React.FC<AIReportSettingsScreenProps> = ({ onBack }) => {
  const [config, setConfig] = useState<AIReportConfig>(DEFAULT_CONFIG);
  const [initialConfig, setInitialConfig] = useState<AIReportConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Načíst z Firestore
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const [reportConfig, modelsConfig, pricingConfig] = await Promise.all([
          fetchAIReportConfig(),
          fetchAIModelsConfig(),
          fetchAIPricingConfig()
        ]);
        
        let loadedConfig = { ...DEFAULT_CONFIG, ...reportConfig };
        
        // Načíst selected model z models config
        const reportModel = modelsConfig.models?.['report-generation'];
        if (reportModel) {
          loadedConfig.selectedModel = reportModel;
        }
        
        setConfig(loadedConfig);
        setInitialConfig(loadedConfig);
        
        // Načíst modely pro výběr
        const modelsList: ModelInfo[] = Object.entries(pricingConfig.models || {}).map(([modelName, pricing]: [string, any]) => {
          let estimatedCost = 0;
          if (pricing) {
            const inputCost = (787 / 1000000) * (pricing.inputPrice || 0);
            const outputCost = (1013 / 1000000) * (pricing.outputPrice || 0);
            estimatedCost = (inputCost + outputCost) * (pricingConfig.usdToCzk || 25);
          }
          return { name: modelName, usage: `Pro generování reportů`, estimatedCost };
        });
        setModels(modelsList);
      } catch (error) {
        console.error('Chyba při načítání:', error);
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, []);

  // Detekce neuložených změn
  const hasUnsavedChanges = JSON.stringify(config) !== JSON.stringify(initialConfig);

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
    try {
      setSaving(true);
      await saveAIReportConfig(config);
      
      // Uložit také selected model do models config
      const modelsConfig = await fetchAIModelsConfig();
      modelsConfig.models = modelsConfig.models || {};
      modelsConfig.models['report-generation'] = config.selectedModel;
      await saveAIModelsConfig(modelsConfig);
      
      setInitialConfig(config);
      setLastSaved(new Date());
      toast.success('Nastavení úspěšně uloženo');
    } catch (error) {
      console.error('Chyba při ukládání:', error);
      toast.error('Chyba při ukládání');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center p-12">Načítání...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 md:p-6" style={{ width: '100%' }}>
      <div className="w-full mx-auto" style={{ maxWidth: '896px', width: '100%' }}>
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">🤖 Nastavení AI reportů</h1>
              <p className="text-gray-600 mt-2">Upravte texty a prompty pro generování reportů</p>
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

        {/* Statický text */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">📝 Statický text (když vše vyhovuje)</h2>
          <p className="text-sm text-gray-600 mb-6">Tento text se použije když audit nemá žádné neshody</p>
          
          <div className="space-y-6">
            {/* Celkové hodnocení */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Celkové hodnocení</label>
              <textarea
                value={config.staticPositiveReport.evaluation_text}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  staticPositiveReport: { ...prev.staticPositiveReport, evaluation_text: e.target.value }
                }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            </div>

            {/* Klíčová zjištění */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-gray-700">Klíčová zjištění</label>
                <button
                  onClick={() => setConfig(prev => ({
                    ...prev,
                    staticPositiveReport: {
                      ...prev.staticPositiveReport,
                      key_findings: [...prev.staticPositiveReport.key_findings, '']
                    }
                  }))}
                  className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                >
                  + Přidat
                </button>
              </div>
              {config.staticPositiveReport.key_findings.map((finding, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={finding}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      staticPositiveReport: {
                        ...prev.staticPositiveReport,
                        key_findings: prev.staticPositiveReport.key_findings.map((f, i) => i === index ? e.target.value : f)
                      }
                    }))}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Zjištění..."
                  />
                  <button
                    onClick={() => setConfig(prev => ({
                      ...prev,
                      staticPositiveReport: {
                        ...prev.staticPositiveReport,
                        key_findings: prev.staticPositiveReport.key_findings.filter((_, i) => i !== index)
                      }
                    }))}
                    className="bg-red-100 text-red-600 px-3 py-2 rounded-lg hover:bg-red-200"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Doporučení */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-gray-700">Doporučení</label>
                <button
                  onClick={() => setConfig(prev => ({
                    ...prev,
                    staticPositiveReport: {
                      ...prev.staticPositiveReport,
                      key_recommendations: [...prev.staticPositiveReport.key_recommendations, '']
                    }
                  }))}
                  className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                >
                  + Přidat
                </button>
              </div>
              {config.staticPositiveReport.key_recommendations.map((rec, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={rec}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      staticPositiveReport: {
                        ...prev.staticPositiveReport,
                        key_recommendations: prev.staticPositiveReport.key_recommendations.map((r, i) => i === index ? e.target.value : r)
                      }
                    }))}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Doporučení..."
                  />
                  <button
                    onClick={() => setConfig(prev => ({
                      ...prev,
                      staticPositiveReport: {
                        ...prev.staticPositiveReport,
                        key_recommendations: prev.staticPositiveReport.key_recommendations.filter((_, i) => i !== index)
                      }
                    }))}
                    className="bg-red-100 text-red-600 px-3 py-2 rounded-lg hover:bg-red-200"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Nastavení */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">🤖 AI Generování (když jsou neshody)</h2>
          
          {/* Toggle */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Použít AI</h3>
                <p className="text-sm text-gray-600">Automatické generování reportu</p>
              </div>
              <button
                onClick={() => setConfig(prev => ({ ...prev, useAI: !prev.useAI }))}
                className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors ${
                  config.useAI ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span className={`inline-block h-8 w-8 transform rounded-full bg-white shadow-lg transition-transform ${
                  config.useAI ? 'translate-x-11' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>

          {config.useAI ? (
            <div className="space-y-6">
              {/* Modely */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Vyberte AI model</label>
                <div className="space-y-3">
                  {models.map((model) => (
                    <div
                      key={model.name}
                      onClick={() => setConfig(prev => ({ ...prev, selectedModel: model.name }))}
                      className={`cursor-pointer border-2 rounded-xl p-4 transition-all ${
                        config.selectedModel === model.name
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          config.selectedModel === model.name ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                        }`}>
                          {config.selectedModel === model.name && <div className="w-2 h-2 bg-white rounded-full"></div>}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-gray-800">{model.name}</div>
                          <div className="text-sm text-gray-600">Cena: {model.estimatedCost.toFixed(4)} Kč</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Prompt */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">AI Prompt</label>
                <textarea
                  value={config.aiPromptTemplate}
                  onChange={(e) => setConfig(prev => ({ ...prev, aiPromptTemplate: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  rows={10}
                />
              </div>
            </div>
          ) : (
            /* Fallback text když je AI vypnuto */
            <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="text-lg font-bold text-orange-800">AI vypnuto - Vlastní text</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Tento text se zobrazí v reportu když jsou nalezeny neshody a AI je vypnuto.
              </p>
              <textarea
                value={config.fallbackText}
                onChange={(e) => setConfig(prev => ({ ...prev, fallbackText: e.target.value }))}
                className="w-full px-4 py-3 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                rows={6}
                placeholder="Audit byl proveden a byly zjištěny neshody..."
              />
            </div>
          )}
        </div>

        {/* Tlačítka */}
        <div className="flex gap-4">
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
        </div>
      </div>
    </div>
  );
};

export default AIReportSettingsScreen;
