/**
 * AI Pricing Config Screen - Nastavení cen modelů a kurzu
 */

import React, { useState, useEffect } from 'react';
import { 
  fetchAIModelsConfig, 
  fetchAIPricingConfig, 
  saveAIPricingConfig, 
  saveAIModelsConfig,
  fetchAllGeminiModels,
  calculateModelCategory,
  type ModelCategory,
  type GeminiModelInfo
} from '../services/firestore/settings';
import { 
  calculateCostsByOperation, 
  calculateModelStats,
  type OperationStats 
} from '../services/firestore/aiUsageLogs';
import { updateGeminiPricesFromWeb } from '../services/firestore/priceUpdater';
import { toast } from '../utils/toast';

interface ModelPricing {
  inputPrice: number;
  outputPrice: number;
  inputPriceHigh?: number;
  outputPriceHigh?: number;
  threshold?: number;
  note?: string;
  lastPriceUpdate?: string;
}

interface PricingConfig {
  usdToCzk: number;
  lastCurrencyUpdate?: string;
  models: Record<string, ModelPricing>;
}

interface AIPricingConfigScreenProps {
  onBack: () => void;
}

const AIPricingConfigScreen: React.FC<AIPricingConfigScreenProps> = ({ onBack }) => {
  const [config, setConfig] = useState<PricingConfig>({ usdToCzk: 25, models: {} });
  const [initialConfig, setInitialConfig] = useState<PricingConfig>({ usdToCzk: 25, models: {} });
  const [modelsConfig, setModelsConfig] = useState<any>({ models: {} });
  const [initialModelsConfig, setInitialModelsConfig] = useState<any>({ models: {} });
  const [allModelsList, setAllModelsList] = useState<Record<string, GeminiModelInfo>>({});
  const [lastFullUpdate, setLastFullUpdate] = useState<string | null>(null);
  const [usageStats, setUsageStats] = useState<Record<string, OperationStats>>({});
  const [updatingPrices, setUpdatingPrices] = useState(false);
  const [hiddenModels, setHiddenModels] = useState<Set<string>>(new Set()); // Skryté modely
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set()); // Rozbalené modely v accordionu
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [showAddModel, setShowAddModel] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      // Před načtením zajistit inicializaci databáze
      try {
        const { initializeAIModelsDatabase } = await import('../services/firestore/settings');
        await initializeAIModelsDatabase();
      } catch (error) {
        console.error('Chyba při inicializaci databáze:', error);
      }
      
      // Načíst modely, pricing config a seznam všech modelů
      const [loadedModelsConfig, pricingConfig, allModels] = await Promise.all([
        fetchAIModelsConfig(),
        fetchAIPricingConfig(),
        fetchAllGeminiModels()
      ]);
      
      setModelsConfig(loadedModelsConfig);
      setInitialModelsConfig(loadedModelsConfig);
      setAllModelsList(allModels.models || {});
      setLastFullUpdate(allModels.lastFullUpdate || null);
      
      // Načíst statistiky z logů
      try {
        const stats = await calculateCostsByOperation();
        setUsageStats(stats);
      } catch (error) {
        console.error('Chyba při načítání statistik:', error);
      }
      
      // Sloučit: modely z models config + jejich ceny z pricing configu
      const mergedModels: Record<string, ModelPricing> = {};
      
      // Nejdřív přidat všechny modely ze seznamu (allModelsList)
      Object.entries(allModels.models || {}).forEach(([name, modelInfo]: [string, any]) => {
        const existingPricing = pricingConfig.models?.[name];
        mergedModels[name] = existingPricing || {
          inputPrice: modelInfo.inputPrice || 0,
          outputPrice: modelInfo.outputPrice || 0,
          note: modelInfo.description,
          lastPriceUpdate: modelInfo.lastPriceUpdate || new Date().toISOString().split('T')[0]
        };
      });
      
      // Přidat modely z models config (které mohou být použity, ale nejsou v allModelsList)
      Object.entries(loadedModelsConfig.models || {}).forEach(([usage, modelName]: [string, any]) => {
        const existingPricing = pricingConfig.models?.[modelName];
        if (!mergedModels[modelName]) {
          mergedModels[modelName] = existingPricing || {
            inputPrice: 0,
            outputPrice: 0,
            note: `Model z aiModelsConfig (${usage})`,
            lastPriceUpdate: new Date().toISOString().split('T')[0]
          };
        }
      });
      
      // Přidat i modely z pricing configu které nejsou v models config ani v allModelsList (vlastní modely)
      Object.keys(pricingConfig.models || {}).forEach(modelName => {
        if (!mergedModels[modelName]) {
          mergedModels[modelName] = pricingConfig.models[modelName];
        }
      });
      
      const loadedConfig = {
        usdToCzk: pricingConfig.usdToCzk || 25,
        lastCurrencyUpdate: pricingConfig.lastCurrencyUpdate,
        models: mergedModels
      };
      
      setConfig(loadedConfig);
      setInitialConfig(loadedConfig);
    } catch (error) {
      console.error('Chyba při načítání pricing config:', error);
    } finally {
      setLoading(false);
    }
  };

  // Detekce neuložených změn
  const hasUnsavedChanges = 
    JSON.stringify(config) !== JSON.stringify(initialConfig) ||
    JSON.stringify(modelsConfig) !== JSON.stringify(initialModelsConfig);

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
      
      // Uložit pricing config
      await saveAIPricingConfig({
        ...config,
        lastCurrencyUpdate: new Date().toISOString()
      });
      
      // Uložit models config
      await saveAIModelsConfig(modelsConfig);
      
      setInitialConfig(config);
      setInitialModelsConfig(modelsConfig);
      setLastSaved(new Date());
      toast.success('Konfigurace úspěšně uložena');
    } catch (error) {
      console.error('Chyba při ukládání:', error);
      toast.error('Chyba při ukládání konfigurace');
    } finally {
      setSaving(false);
    }
  };

  const updateModelPrice = (modelName: string, field: keyof ModelPricing, value: number | string) => {
    setConfig(prev => {
      // Pokud model ještě není v config.models, vytvořit ho
      if (!prev.models[modelName]) {
        const modelInfo = allModelsList[modelName];
        prev.models[modelName] = {
          inputPrice: modelInfo?.inputPrice || 0,
          outputPrice: modelInfo?.outputPrice || 0,
          note: modelInfo?.description,
          lastPriceUpdate: new Date().toISOString().split('T')[0]
        };
      }
      
      return {
        ...prev,
        models: {
          ...prev.models,
          [modelName]: {
            ...prev.models[modelName],
            [field]: typeof value === 'string' ? value : value,
            lastPriceUpdate: new Date().toISOString().split('T')[0]
          }
        }
      };
    });
  };

  const addNewModel = () => {
    if (!newModelName.trim()) {
      alert('Zadejte název modelu');
      return;
    }
    
    if (config.models[newModelName]) {
      alert('Model už existuje');
      return;
    }

    setConfig(prev => ({
      ...prev,
      models: {
        ...prev.models,
        [newModelName]: {
          inputPrice: 0,
          outputPrice: 0,
          lastPriceUpdate: new Date().toISOString().split('T')[0]
        }
      }
    }));
    
    setNewModelName('');
    setShowAddModel(false);
  };

  const handleUpdatePrices = async () => {
    try {
      setUpdatingPrices(true);
      const result = await updateGeminiPricesFromWeb();
      
      toast.success(`Aktualizováno ${result.updated} modelů. ${result.failed.length > 0 ? `Nepodařilo se aktualizovat: ${result.failed.join(', ')}` : ''}`);
      
      // Znovu načíst konfiguraci
      await loadConfig();
    } catch (error: any) {
      console.error('Chyba při aktualizaci cen:', error);
      toast.error(`Chyba při aktualizaci cen: ${error.message}`);
    } finally {
      setUpdatingPrices(false);
    }
  };

  // Získat kategorii modelu
  const getModelCategory = (modelName: string): ModelCategory => {
    const modelInfo = allModelsList[modelName];
    if (modelInfo) {
      return modelInfo.category;
    }
    const pricing = config.models[modelName];
    if (pricing) {
      return calculateModelCategory(pricing.inputPrice, pricing.outputPrice);
    }
    return 'střední';
  };

  // Zkontrolovat, zda je model zdarma (ceny 0)
  const isFreeModel = (modelName: string): boolean => {
    const modelInfo = allModelsList[modelName];
    const pricing = config.models[modelName];
    const inputPrice = pricing?.inputPrice ?? modelInfo?.inputPrice ?? 0;
    const outputPrice = pricing?.outputPrice ?? modelInfo?.outputPrice ?? 0;
    return inputPrice === 0 && outputPrice === 0;
  };

  // Získat popisek kategorie
  const getCategoryLabel = (category: ModelCategory): string => {
    const labels: Record<ModelCategory, string> = {
      'zdarma': '🆓 zdarma',
      'levný': '🟢 levný',
      'střední': '🟡 střední',
      'drahý': '🔴 drahý'
    };
    return labels[category] || 'střední';
  };

  const deleteModel = (modelName: string) => {
    // Zkontrolovat jestli je model z výchozího seznamu Gemini modelů
    const isFromDefaultList = allModelsList[modelName];
    
    if (isFromDefaultList) {
      alert('Tento model je součástí výchozího seznamu Gemini modelů a nelze ho smazat. Můžete změnit jeho ceny.');
      return;
    }
    
    if (confirm(`Opravdu smazat model ${modelName}?`)) {
      setConfig(prev => {
        const newModels = { ...prev.models };
        delete newModels[modelName];
        return { ...prev, models: newModels };
      });
    }
  };

  if (loading) {
    return <div className="text-center p-12">Načítání...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">💵 Ceny AI modelů</h1>
              <p className="text-gray-600 mt-2">Nastavte kurz a ceny pro jednotlivé modely</p>
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

        {/* Kurz CZK/USD */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">💱 Kurz měny</h2>
          <div className="flex items-center gap-4">
            <label className="text-gray-700 font-semibold">1 USD =</label>
            <input
              type="number"
              step="0.1"
              value={config.usdToCzk}
              onChange={(e) => setConfig(prev => ({ ...prev, usdToCzk: parseFloat(e.target.value) || 25 }))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-32"
            />
            <span className="text-gray-600 font-semibold">Kč</span>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            💡 Příklad: Pokud je kurz 25, znamená to že 1 USD = 25 Kč
          </p>
          {config.lastCurrencyUpdate && (
            <p className="text-sm text-gray-500 mt-2">
              Poslední aktualizace: {new Date(config.lastCurrencyUpdate).toLocaleString('cs-CZ')}
            </p>
          )}
        </div>

        {/* Výběr modelů pro operace */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">🎯 Výběr modelů pro operace</h2>
          <p className="text-sm text-gray-600 mb-4">
            Vyberte, který model se má použít pro jednotlivé AI operace
          </p>
          
          <div className="space-y-6">
            {/* Helper funkce pro renderování dropdownu */}
            {(['audio-transcription', 'image-analysis', 'report-generation', 'text-generation'] as const).map((operation) => {
              const operationLabels: Record<typeof operation, { icon: string; label: string }> = {
                'audio-transcription': { icon: '🎤', label: 'Transkribce audio' },
                'image-analysis': { icon: '🖼️', label: 'Analýza obrázků' },
                'report-generation': { icon: '📄', label: 'Generování reportů' },
                'text-generation': { icon: '📝', label: 'Generování textu' }
              };
              
              const selectedModel = modelsConfig.models?.[operation] || '';
              const opStats = usageStats[operation];
              const allModelNames = Object.keys(allModelsList).length > 0 ? Object.keys(allModelsList) : Object.keys(config.models);
              
              return (
                <div key={operation}>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    {operationLabels[operation].icon} {operationLabels[operation].label}
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => {
                      const value = e.target.value;
                      setModelsConfig(prev => ({
                        ...prev,
                        models: {
                          ...prev.models,
                          [operation]: value
                        }
                      }));
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Vyberte model --</option>
                    {allModelNames.map(modelName => {
                      const modelInfo = allModelsList[modelName];
                      const pricing = config.models[modelName];
                      const inputPrice = pricing?.inputPrice || modelInfo?.inputPrice || 0;
                      const outputPrice = pricing?.outputPrice || modelInfo?.outputPrice || 0;
                      const category = getModelCategory(modelName);
                      const categoryLabel = getCategoryLabel(category);
                      
                      return (
                        <option key={modelName} value={modelName}>
                          {modelName} ({categoryLabel}) - Input: ${inputPrice}/1M, Output: ${outputPrice}/1M
                        </option>
                      );
                    })}
                  </select>
                  
                  {/* Zobrazení nákladů z logů pro tuto operaci (celkové napříč všemi modely) */}
                  {opStats && opStats.count > 0 && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-xs font-semibold text-gray-700 mb-1">💰 Náklady z použitých dat (celkem pro tuto operaci):</p>
                      <div className="text-xs text-gray-600 grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div>Volání: <span className="font-bold">{opStats.count}</span></div>
                        <div>Tokeny: <span className="font-bold">{opStats.totalTokens.toLocaleString()}</span></div>
                        <div>USD: <span className="font-bold text-green-600">${opStats.totalCostUsd.toFixed(4)}</span></div>
                        <div>Kč: <span className="font-bold text-green-600">{opStats.totalCostCzk.toFixed(2)} Kč</span></div>
                      </div>
                      {/* Rozpis podle modelů pokud existuje */}
                      {opStats.byModel && Object.keys(opStats.byModel).length > 0 && (
                        <div className="mt-2 pt-2 border-t border-green-200">
                          <p className="text-xs font-semibold text-gray-700 mb-1">Rozpis podle modelů:</p>
                          <div className="space-y-1">
                            {Object.entries(opStats.byModel).map(([modelName, modelStats]: [string, any]) => (
                              <div key={modelName} className="text-xs text-gray-600">
                                {modelName}: {modelStats.count}× volání, {modelStats.totalTokens.toLocaleString()} tokenů, ${modelStats.totalCostUsd.toFixed(4)} USD
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Seznam modelů */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">🤖 Modely</h2>
              <p className="text-sm text-gray-600 mt-1">
                ℹ️ Kompletní seznam všech dostupných Gemini modelů. Ceny můžete nastavit nebo aktualizovat tlačítkem níže.
              </p>
            </div>
            <div className="flex gap-2">
              {hiddenModels.size > 0 && (
                <button
                  onClick={() => setHiddenModels(new Set())}
                  className="bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors text-sm"
                  title={`Zobrazit ${hiddenModels.size} skrytých modelů`}
                >
                  👁️ Zobrazit skryté ({hiddenModels.size})
                </button>
              )}
              <button
                onClick={() => setShowAddModel(!showAddModel)}
                className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                + Vlastní model
              </button>
            </div>
          </div>

          {/* Přidat nový model */}
          {showAddModel && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  placeholder="Název modelu (např. gemini-1.5-flash)"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={addNewModel}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  Přidat
                </button>
                <button
                  onClick={() => setShowAddModel(false)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                >
                  Zrušit
                </button>
              </div>
            </div>
          )}

          {/* Accordion s modely */}
          <div className="space-y-2">
            {/* Zobrazit všechny modely ze seznamu, nejen ty s cenami */}
            {Object.entries(allModelsList).length > 0 ? (
              Object.entries(allModelsList)
                .filter(([modelName]) => !hiddenModels.has(modelName)) // Filtrovat skryté modely
                .map(([modelName, modelInfo]) => {
                // Najít ceny z config.models nebo použít z modelInfo
                const pricing = config.models[modelName] || {
                  inputPrice: modelInfo.inputPrice || 0,
                  outputPrice: modelInfo.outputPrice || 0,
                  note: modelInfo.description
                };
                
                const category = getModelCategory(modelName);
                const isFree = isFreeModel(modelName);
                const isExpanded = expandedModels.has(modelName);
                
                return (
                  <div key={modelName} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Accordion header */}
                    <div
                      onClick={() => {
                        const newExpanded = new Set(expandedModels);
                        if (isExpanded) {
                          newExpanded.delete(modelName);
                        } else {
                          newExpanded.add(modelName);
                        }
                        setExpandedModels(newExpanded);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          const newExpanded = new Set(expandedModels);
                          if (isExpanded) {
                            newExpanded.delete(modelName);
                          } else {
                            newExpanded.add(modelName);
                          }
                          setExpandedModels(newExpanded);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400">{isExpanded ? '▼' : '▶'}</span>
                        <h3 className="text-lg font-bold text-gray-800">{modelName}</h3>
                        <span className={`text-xs px-2 py-1 rounded ${
                          category === 'zdarma' ? 'bg-blue-100 text-blue-700' :
                          category === 'levný' ? 'bg-green-100 text-green-700' :
                          category === 'střední' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {getCategoryLabel(category)}
                        </span>
                        {modelInfo.description && (
                          <span className="text-sm text-gray-500 italic">{modelInfo.description}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const newHidden = new Set(hiddenModels);
                            newHidden.add(modelName);
                            setHiddenModels(newHidden);
                          }}
                          className="text-gray-500 hover:text-gray-700 text-sm"
                          title="Skrýt model"
                        >
                          👁️
                        </button>
                        {/* Smazat pouze pokud není v allModelsList (vlastní model) */}
                        {!allModelsList[modelName] && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteModel(modelName);
                            }}
                            className="text-red-600 hover:text-red-800 font-semibold text-sm"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Accordion content */}
                    {isExpanded && (
                      <div className="p-4 bg-white">
                        {/* Poznámka o free tieru pro zdarma modely */}
                        {isFree && (
                          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm font-semibold text-blue-800 mb-1">🆓 Free tier:</p>
                            <p className="text-xs text-blue-700">
                              Bezplatné používání s omezením např. 15 požadavků za minutu, 1 milion tokenů za minutu a 1500 požadavků denně
                            </p>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                              Input ($/1M)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={pricing.inputPrice}
                              onChange={(e) => updateModelPrice(modelName, 'inputPrice', parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                              Output ($/1M)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={pricing.outputPrice}
                              onChange={(e) => updateModelPrice(modelName, 'outputPrice', parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          {pricing.threshold && (
                            <>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                  Input High ($/1M)
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={pricing.inputPriceHigh || 0}
                                  onChange={(e) => updateModelPrice(modelName, 'inputPriceHigh', parseFloat(e.target.value) || 0)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                  Threshold
                                </label>
                                <input
                                  type="number"
                                  value={pricing.threshold}
                                  onChange={(e) => updateModelPrice(modelName, 'threshold', parseInt(e.target.value) || 0)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </>
                          )}
                        </div>

                        {pricing.note && pricing.note !== modelInfo.description && (
                          <p className="text-sm text-gray-600 mt-2">ℹ️ {pricing.note}</p>
                        )}
                        
                        {/* Zobrazení aktuálních cen */}
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm font-semibold text-gray-700 mb-1">💰 Aktuální ceny za tokeny:</p>
                          <div className="text-xs text-gray-600 space-y-1">
                            <div>Input: <span className="font-bold text-blue-600">${pricing.inputPrice}</span> za 1M tokenů</div>
                            <div>Output: <span className="font-bold text-blue-600">${pricing.outputPrice}</span> za 1M tokenů</div>
                            {config.usdToCzk && (
                              <div className="mt-2 pt-2 border-t border-blue-200">
                                <div>Input: <span className="font-bold text-green-600">{(pricing.inputPrice * config.usdToCzk).toFixed(2)} Kč</span> za 1M tokenů</div>
                                <div>Output: <span className="font-bold text-green-600">{(pricing.outputPrice * config.usdToCzk).toFixed(2)} Kč</span> za 1M tokenů</div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {(pricing.lastPriceUpdate || modelInfo.lastPriceUpdate) && (
                          <p className="text-xs text-gray-500 mt-2">
                            Poslední aktualizace: {pricing.lastPriceUpdate || modelInfo.lastPriceUpdate}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              // Fallback: zobrazit modely z config.models pokud allModelsList je prázdný
              Object.entries(config.models).map(([modelName, pricing]) => (
                <div key={modelName} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-800">{modelName}</h3>
                      {allModelsList[modelName] && (
                        <span className={`text-xs px-2 py-1 rounded ${
                          allModelsList[modelName].category === 'levný' ? 'bg-green-100 text-green-700' :
                          allModelsList[modelName].category === 'střední' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {getCategoryLabel(allModelsList[modelName].category)}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => deleteModel(modelName)}
                      className="text-red-600 hover:text-red-800 font-semibold text-sm"
                    >
                      🗑️ Smazat
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Input ($/1M)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={pricing.inputPrice}
                        onChange={(e) => updateModelPrice(modelName, 'inputPrice', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Output ($/1M)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={pricing.outputPrice}
                        onChange={(e) => updateModelPrice(modelName, 'outputPrice', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {pricing.threshold && (
                      <>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Input High ($/1M)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={pricing.inputPriceHigh || 0}
                            onChange={(e) => updateModelPrice(modelName, 'inputPriceHigh', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Threshold
                          </label>
                          <input
                            type="number"
                            value={pricing.threshold}
                            onChange={(e) => updateModelPrice(modelName, 'threshold', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {pricing.note && (
                    <p className="text-sm text-gray-600 mt-2">ℹ️ {pricing.note}</p>
                  )}
                  
                  {/* Zobrazení aktuálních cen */}
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-semibold text-gray-700 mb-1">💰 Aktuální ceny za tokeny:</p>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>Input: <span className="font-bold text-blue-600">${pricing.inputPrice}</span> za 1M tokenů</div>
                      <div>Output: <span className="font-bold text-blue-600">${pricing.outputPrice}</span> za 1M tokenů</div>
                      {config.usdToCzk && (
                        <div className="mt-2 pt-2 border-t border-blue-200">
                          <div>Input: <span className="font-bold text-green-600">{(pricing.inputPrice * config.usdToCzk).toFixed(2)} Kč</span> za 1M tokenů</div>
                          <div>Output: <span className="font-bold text-green-600">{(pricing.outputPrice * config.usdToCzk).toFixed(2)} Kč</span> za 1M tokenů</div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {pricing.lastPriceUpdate && (
                    <p className="text-xs text-gray-500 mt-2">
                      Poslední aktualizace: {pricing.lastPriceUpdate}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
          
          {/* Tlačítko pro aktualizaci cen */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={handleUpdatePrices}
              disabled={updatingPrices}
              className={`w-full font-bold py-3 px-6 rounded-lg transition-colors ${
                updatingPrices
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              {updatingPrices ? (
                <>
                  <span className="animate-spin">⏳</span> Aktualizuji ceny z internetu...
                </>
              ) : (
                <>
                  🔄 Aktualizovat ceny z internetu
                </>
              )}
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              {lastFullUpdate && `Poslední aktualizace všech modelů: ${new Date(lastFullUpdate).toLocaleString('cs-CZ')}`}
            </p>
          </div>
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

export default AIPricingConfigScreen;
