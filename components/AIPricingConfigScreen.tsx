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
import { updateGeminiPricesFromWeb, updateGeminiPricesWithLLM } from '../services/firestore/priceUpdater';
import { toast } from '../utils/toast';
import { DetailTooltip } from './ui/DetailTooltip';

interface ModelPricing {
  inputPrice: number;
  outputPrice: number;
  inputPriceHigh?: number;
  outputPriceHigh?: number;
  threshold?: number;
  audioInputPrice?: number; // Speciální cena pro audio vstup (např. $1.00 pro Flash místo $0.30)
  imageInputPrice?: number; // Speciální cena pro image vstup (většinou stejná jako text, ale může být jiná)
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
  const [updateProgress, setUpdateProgress] = useState<{ step: string; details?: string } | null>(null);
  const [parsingResults, setParsingResults] = useState<Record<string, {
    name: string;
    inputPrice: number;
    outputPrice: number;
    description?: string;
    useCase?: string;
    foundOnPage?: boolean; // Označit, zda byl model nalezen na stránce
  }> | null>(null);
  const [lastLLMStatus, setLastLLMStatus] = useState<{
    status: 'running' | 'success' | 'error';
    message: string;
    timestamp: string; // ISO string pro localStorage
    details?: string;
  } | null>(null);
  const [hiddenModels, setHiddenModels] = useState<Set<string>>(new Set()); // Skryté modely
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set()); // Rozbalené modely v accordionu
  const [showDropdowns, setShowDropdowns] = useState<Record<string, boolean>>({}); // Otevřené dropdowny pro výběr modelů
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [showAddModel, setShowAddModel] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    loadConfig();
    // Načíst poslední status LLM parsingu z localStorage
    const savedStatus = localStorage.getItem('aiPricing_llmStatus');
    if (savedStatus) {
      try {
        const status = JSON.parse(savedStatus);
        // Pokud je status "running" a je starší než 10 minut, považovat za timeout
        if (status.status === 'running') {
          const statusTime = new Date(status.timestamp);
          const now = new Date();
          const diffMinutes = (now.getTime() - statusTime.getTime()) / 1000 / 60;
          if (diffMinutes > 10) {
            // Považovat za timeout
            setLastLLMStatus({
              status: 'error',
              message: 'Parsing byl přerušen (timeout)',
              timestamp: status.timestamp,
              details: 'Operace trvala déle než 10 minut a byla pravděpodobně přerušena.'
            });
            localStorage.removeItem('aiPricing_llmStatus');
          } else {
            setLastLLMStatus(status);
          }
        } else {
          setLastLLMStatus(status);
        }
      } catch (e) {
        console.error('Chyba při načítání statusu:', e);
      }
    }
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
      setUpdateProgress({ step: 'Spouštím aktualizaci...' });
      setParsingResults(null); // Resetovat předchozí výsledky
      
      const result = await updateGeminiPricesFromWeb((step, details) => {
        setUpdateProgress({ step, details });
      });
      
      setUpdateProgress(null);
      setParsingResults(result.parsedModels || null); // Uložit výsledky parsování
      console.log('[AIPricingConfigScreen] Výsledky parsování:', result.parsedModels);
      console.log('[AIPricingConfigScreen] Počet nalezených modelů:', result.parsedModels ? Object.keys(result.parsedModels).length : 0);
      toast.success(`Aktualizováno ${result.updated} modelů. ${result.failed.length > 0 ? `Nepodařilo se aktualizovat: ${result.failed.join(', ')}` : ''}`);
      
      // Znovu načíst konfiguraci
      await loadConfig();
    } catch (error: any) {
      console.error('Chyba při aktualizaci cen:', error);
      setUpdateProgress(null);
      setParsingResults(null);
      toast.error(`Chyba při aktualizaci cen: ${error.message}`);
    } finally {
      setUpdatingPrices(false);
    }
  };

  const handleUpdatePricesWithLLM = async () => {
    try {
      setUpdatingPrices(true);
      setUpdateProgress({ step: 'Spouštím aktualizaci pomocí LLM...' });
      setParsingResults(null);
      
      // Uložit status "running" do localStorage
      const runningStatus = {
        status: 'running' as const,
        message: 'Parsing probíhá...',
        timestamp: new Date().toISOString(),
        details: 'Operace může trvat několik minut'
      };
      setLastLLMStatus(runningStatus);
      localStorage.setItem('aiPricing_llmStatus', JSON.stringify(runningStatus));
      
      const result = await updateGeminiPricesWithLLM((step, details) => {
        setUpdateProgress({ step, details });
        // Aktualizovat status při progressu
        const progressStatus = {
          status: 'running' as const,
          message: step,
          timestamp: new Date().toISOString(),
          details: details
        };
        setLastLLMStatus(progressStatus);
        localStorage.setItem('aiPricing_llmStatus', JSON.stringify(progressStatus));
      });
      
      setUpdateProgress(null);
      setParsingResults(result.parsedModels || null);
      console.log('[AIPricingConfigScreen] Výsledky parsování (LLM):', result.parsedModels);
      console.log('[AIPricingConfigScreen] Počet nalezených modelů (LLM):', result.parsedModels ? Object.keys(result.parsedModels).length : 0);
      
      // Uložit úspěšný status
      const successStatus = {
        status: 'success' as const,
        message: `Úspěšně aktualizováno ${result.updated} modelů`,
        timestamp: new Date().toISOString(),
        details: result.failed.length > 0 ? `Nepodařilo se aktualizovat: ${result.failed.join(', ')}` : undefined
      };
      setLastLLMStatus(successStatus);
      localStorage.setItem('aiPricing_llmStatus', JSON.stringify(successStatus));
      
      toast.success(`Aktualizováno ${result.updated} modelů pomocí LLM. ${result.failed.length > 0 ? `Nepodařilo se aktualizovat: ${result.failed.join(', ')}` : ''}`);
      
      await loadConfig();
    } catch (error: any) {
      console.error('Chyba při aktualizaci cen pomocí LLM:', error);
      setUpdateProgress(null);
      setParsingResults(null);
      
      // Uložit chybový status s lepší zprávou
      let errorMessage = error.message || 'Neznámá chyba';
      let errorDetails = error.message;
      
      // Zlepšit zprávu pro 503 chyby
      if (error?.message?.includes('503') || 
          error?.message?.includes('Service Unavailable') ||
          error?.message?.includes('overloaded') ||
          error?.message?.includes('unavailable')) {
        errorMessage = 'Model Gemini je momentálně přetížený';
        errorDetails = 'Systém automaticky zkoušel opakovat požadavek 3x, ale model je stále nedostupný. Zkuste to prosím znovu za chvíli nebo použijte HTML parsing místo LLM parsingu.';
      }
      
      const errorStatus = {
        status: 'error' as const,
        message: errorMessage,
        timestamp: new Date().toISOString(),
        details: errorDetails
      };
      setLastLLMStatus(errorStatus);
      localStorage.setItem('aiPricing_llmStatus', JSON.stringify(errorStatus));
      
      toast.error(errorMessage);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-3 md:p-4">
      <div className="max-w-5xl mx-auto">
        {/* Status banner pro LLM parsing */}
        {lastLLMStatus && (
          <div className={`mb-4 rounded-xl shadow-lg p-4 ${
            lastLLMStatus.status === 'running' 
              ? 'bg-blue-50 border-2 border-blue-300' 
              : lastLLMStatus.status === 'success'
              ? 'bg-green-50 border-2 border-green-300'
              : 'bg-red-50 border-2 border-red-300'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {lastLLMStatus.status === 'running' && (
                    <>
                      <span className="animate-spin text-blue-600">⏳</span>
                      <span className="font-bold text-blue-800">LLM Parsing probíhá...</span>
                    </>
                  )}
                  {lastLLMStatus.status === 'success' && (
                    <>
                      <span className="text-green-600">✓</span>
                      <span className="font-bold text-green-800">LLM Parsing dokončen</span>
                    </>
                  )}
                  {lastLLMStatus.status === 'error' && (
                    <>
                      <span className="text-red-600">✗</span>
                      <span className="font-bold text-red-800">LLM Parsing selhal</span>
                    </>
                  )}
                </div>
                <div className={`text-sm ${
                  lastLLMStatus.status === 'running' ? 'text-blue-700' :
                  lastLLMStatus.status === 'success' ? 'text-green-700' :
                  'text-red-700'
                }`}>
                  {lastLLMStatus.message}
                </div>
                {lastLLMStatus.details && (
                  <div className={`text-xs mt-1 ${
                    lastLLMStatus.status === 'running' ? 'text-blue-600' :
                    lastLLMStatus.status === 'success' ? 'text-green-600' :
                    'text-red-600'
                  }`}>
                    {lastLLMStatus.details}
                  </div>
                )}
                <div className={`text-xs mt-2 ${
                  lastLLMStatus.status === 'running' ? 'text-blue-500' :
                  lastLLMStatus.status === 'success' ? 'text-green-600' :
                  'text-red-600'
                }`}>
                  {new Date(lastLLMStatus.timestamp).toLocaleString('cs-CZ')}
                </div>
              </div>
              <button
                onClick={() => {
                  setLastLLMStatus(null);
                  localStorage.removeItem('aiPricing_llmStatus');
                }}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                title="Zavřít"
              >
                ×
              </button>
            </div>
            {lastLLMStatus.status === 'running' && updateProgress && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <div className="text-xs text-blue-600 font-medium">{updateProgress.step}</div>
                {updateProgress.details && (
                  <div className="text-xs text-blue-500 mt-1">{updateProgress.details}</div>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-800">💵 Ceny AI modelů</h1>
              <div className="mt-1 flex items-center gap-3 text-xs">
                {saving && (
                  <span className="text-blue-600 font-medium flex items-center gap-1">
                    <span className="animate-spin">⏳</span> Ukládám...
                  </span>
                )}
                {!saving && lastSaved && (
                  <span className="text-green-600 font-medium">
                    ✓ Uloženo {lastSaved.toLocaleTimeString('cs-CZ')}
                  </span>
                )}
                {hasUnsavedChanges && !saving && (
                  <span className="text-orange-600 font-medium">
                    ⚠ Neuložené změny
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* HTML Parsing tlačítko */}
              <div className="relative">
                <DetailTooltip
                  content={
                    <div className="space-y-1.5">
                      <div className="font-bold text-sm mb-2 pb-1 border-b border-gray-700">
                        Aktualizace pomocí HTML parsingu
                      </div>
                      <div className="text-xs space-y-1">
                        <div><strong>Krok 1:</strong> Načte oficiální stránku s cenami (ai.google.dev/gemini-api/docs/pricing)</div>
                        <div><strong>Krok 2:</strong> Parsuje HTML a extrahuje ceny pro všechny modely</div>
                        <div className="mt-2 pt-2 border-t border-gray-700">
                          <div><strong>📋 Seznam modelů:</strong> Používá strukturovaný seznam z databáze (DEFAULT_GEMINI_MODELS) - <strong>všechny modely jsou vždy zahrnuty</strong></div>
                          <div className="mt-1"><strong>💰 Ceny modelů:</strong> Aktualizuje ceny pro všechny modely z parsované stránky</div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-700">
                        💡 Používá Cloud Function pro parsing HTML - žádné LLM volání, rychlejší a spolehlivější
                      </div>
                      {lastFullUpdate && (
                        <div className="text-xs text-gray-400 mt-1">
                          Poslední aktualizace: {new Date(lastFullUpdate).toLocaleString('cs-CZ')}
                        </div>
                      )}
                    </div>
                  }
                >
                  <button
                    onClick={handleUpdatePrices}
                    disabled={updatingPrices}
                    className={`font-medium py-1.5 px-3 rounded-lg transition-colors text-sm ${
                      updatingPrices
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    {updatingPrices ? (
                      <>
                        <span className="animate-spin">⏳</span> Aktualizuji...
                      </>
                    ) : (
                      <>
                        🔄 Aktualizovat (HTML)
                      </>
                    )}
                  </button>
                </DetailTooltip>
                {updateProgress && (
                  <div className="absolute top-full left-0 mt-2 bg-gray-900 text-white p-3 rounded-lg shadow-lg z-50 min-w-[300px]">
                    <div className="font-semibold text-sm mb-1">{updateProgress.step}</div>
                    {updateProgress.details && (
                      <div className="text-xs text-gray-300">{updateProgress.details}</div>
                    )}
                  </div>
                )}
              </div>
              
              {/* LLM Parsing tlačítko */}
              <div className="relative">
                <DetailTooltip
                  content={
                    <div className="space-y-1.5">
                      <div className="font-bold text-sm mb-2 pb-1 border-b border-gray-700">
                        Aktualizace pomocí LLM
                      </div>
                      <div className="text-xs space-y-1">
                        <div><strong>Krok 1:</strong> Načte oficiální stránku s cenami (ai.google.dev/gemini-api/docs/pricing)</div>
                        <div><strong>Krok 2:</strong> Použije LLM (Firebase AI Logic SDK) k extrakci cen z webové stránky</div>
                        <div className="mt-2 pt-2 border-t border-gray-700">
                          <div><strong>📋 Seznam modelů:</strong> Používá strukturovaný seznam z databáze (DEFAULT_GEMINI_MODELS) - <strong>všechny modely jsou vždy zahrnuty</strong></div>
                          <div className="mt-1"><strong>💰 Ceny modelů:</strong> LLM extrahuje ceny z webové stránky</div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-700">
                        💡 Používá Firebase AI Logic SDK - může být pomalejší, ale flexibilnější pro změny struktury stránky
                      </div>
                    </div>
                  }
                >
                  <button
                    onClick={handleUpdatePricesWithLLM}
                    disabled={updatingPrices}
                    className={`font-medium py-1.5 px-3 rounded-lg transition-colors text-sm ${
                      updatingPrices
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {updatingPrices ? (
                      <>
                        <span className="animate-spin">⏳</span> Aktualizuji...
                      </>
                    ) : (
                      <>
                        🤖 Aktualizovat (LLM)
                      </>
                    )}
                  </button>
                </DetailTooltip>
              </div>
              
              <button
                onClick={handleSave}
                disabled={saving || !hasUnsavedChanges}
                className={`font-medium py-1.5 px-3 rounded-lg transition-colors text-sm ${
                  saving || !hasUnsavedChanges
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {saving ? '⏳ Ukládám...' : '💾 Uložit'}
              </button>
              <button
                onClick={onBack}
                className="bg-gray-200 text-gray-800 font-medium py-1.5 px-3 rounded-lg hover:bg-gray-300 transition-colors text-sm"
              >
                ← Zpět
              </button>
            </div>
          </div>
        </div>

        {/* Kurz CZK/USD */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
          <h2 className="text-lg font-bold text-gray-800 mb-2">💱 Kurz měny</h2>
          <div className="flex items-center gap-3">
            <label className="text-gray-700 font-medium text-sm">1 USD =</label>
            <input
              type="number"
              step="0.1"
              value={config.usdToCzk}
              onChange={(e) => setConfig(prev => ({ ...prev, usdToCzk: parseFloat(e.target.value) || 25 }))}
              className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-24 text-sm"
            />
            <span className="text-gray-600 font-medium text-sm">Kč</span>
          </div>
        </div>

        {/* Výběr modelů pro operace */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
          <h2 className="text-lg font-bold text-gray-800 mb-3">🎯 Výběr modelů pro operace</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
              const selectedModelInfo = selectedModel ? allModelsList[selectedModel] : null;
              const selectedPricing = selectedModel ? config.models[selectedModel] : null;
              const selectedCategory = selectedModel ? getModelCategory(selectedModel) : null;
              
              // Barvy podle kategorie
              const categoryColors: Record<ModelCategory, { bg: string; border: string; text: string; badge: string }> = {
                'zdarma': { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700' },
                'levný': { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-700' },
                'střední': { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700' },
                'drahý': { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-700' }
              };
              
              const colors = selectedCategory ? categoryColors[selectedCategory] : { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-700', badge: 'bg-gray-100 text-gray-700' };
              
              return (
                <div key={operation} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {operationLabels[operation].icon} {operationLabels[operation].label}
                    </label>
                    {opStats && opStats.count > 0 && (
                      <DetailTooltip
                        content={
                          <div className="space-y-1.5">
                            <div className="font-bold text-sm mb-2 pb-1 border-b border-gray-700">
                              💰 Náklady z použití
                            </div>
                            <div className="text-xs space-y-1">
                              <div>Volání: <span className="font-bold">{opStats.count}</span></div>
                              <div>Tokeny: <span className="font-bold">{opStats.totalTokens.toLocaleString()}</span></div>
                              <div>USD: <span className="font-bold text-green-400">${opStats.totalCostUsd.toFixed(4)}</span></div>
                              <div>Kč: <span className="font-bold text-green-400">{opStats.totalCostCzk.toFixed(2)} Kč</span></div>
                            </div>
                            {opStats.byModel && Object.keys(opStats.byModel).length > 0 && (
                              <div className="mt-2 pt-2 border-t border-gray-700">
                                <div className="text-xs font-semibold mb-1">Rozpis podle modelů:</div>
                                {Object.entries(opStats.byModel).map(([modelName, modelStats]: [string, any]) => (
                                  <div key={modelName} className="text-xs">
                                    {modelName}: {modelStats.count}×, {modelStats.totalTokens.toLocaleString()} tokenů, ${modelStats.totalCostUsd.toFixed(4)}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        }
                      >
                        <span className="text-green-600 cursor-help text-xs font-bold">💰</span>
                      </DetailTooltip>
                    )}
                  </div>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowDropdowns(prev => ({ ...prev, [operation]: !prev[operation] }))}
                      onBlur={(e) => {
                        // Nezavřít pokud klikne na dropdown obsah
                        const relatedTarget = e.relatedTarget as HTMLElement;
                        if (!relatedTarget || !e.currentTarget.parentElement?.contains(relatedTarget)) {
                          setTimeout(() => {
                            setShowDropdowns(prev => ({ ...prev, [operation]: false }));
                          }, 200);
                        }
                      }}
                      className={`w-full px-3 py-2 pr-10 border-2 ${colors.border} ${colors.bg} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium ${colors.text} transition-all text-left flex items-center justify-between`}
                    >
                      <span className="truncate">
                        {selectedModel 
                          ? `${selectedModel} (${getCategoryLabel(selectedCategory || 'střední').replace('🟢 ', '').replace('🟡 ', '').replace('🔴 ', '').replace('🆓 ', '')})`
                          : '-- Vyberte --'}
                      </span>
                      <svg className={`w-4 h-4 transition-transform ${showDropdowns[operation] ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {showDropdowns[operation] && (
                      <div 
                        className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto"
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        {allModelNames.map(modelName => {
                          const modelInfo = allModelsList[modelName];
                          const pricing = config.models[modelName];
                          const inputPrice = pricing?.inputPrice || modelInfo?.inputPrice || 0;
                          const outputPrice = pricing?.outputPrice || modelInfo?.outputPrice || 0;
                          const category = getModelCategory(modelName);
                          const categoryLabel = getCategoryLabel(category);
                          const optionColors = categoryColors[category];
                          const isSelected = selectedModel === modelName;
                          
                          return (
                            <div
                              key={modelName}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setModelsConfig(prev => ({
                                  ...prev,
                                  models: {
                                    ...prev.models,
                                    [operation]: modelName
                                  }
                                }));
                                setShowDropdowns(prev => ({ ...prev, [operation]: false }));
                              }}
                              className={`px-3 py-2 cursor-pointer transition-colors flex items-center justify-between ${
                                isSelected 
                                  ? `${optionColors.bg} ${optionColors.text} font-semibold` 
                                  : category === 'zdarma' 
                                    ? 'hover:bg-blue-50 hover:text-blue-700'
                                    : category === 'levný'
                                      ? 'hover:bg-green-50 hover:text-green-700'
                                      : category === 'střední'
                                        ? 'hover:bg-yellow-50 hover:text-yellow-700'
                                        : 'hover:bg-red-50 hover:text-red-700'
                              }`}
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${optionColors.badge}`}>
                                  {categoryLabel.replace('🟢 ', '').replace('🟡 ', '').replace('🔴 ', '').replace('🆓 ', '')}
                                </span>
                                <span className="text-sm truncate">{modelName}</span>
                              </div>
                              <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">${inputPrice}/${outputPrice}/1M</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {selectedModel && (
                    <div className={`text-xs ${colors.text} font-medium space-y-1 px-2 py-1 rounded ${colors.bg}`}>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Input:</span>
                        <span>${selectedPricing?.inputPrice || selectedModelInfo?.inputPrice || 0}/1M</span>
                        <span className="text-gray-400">•</span>
                        <span className="font-semibold">Output:</span>
                        <span>${selectedPricing?.outputPrice || selectedModelInfo?.outputPrice || 0}/1M</span>
                      </div>
                      {operation === 'audio-transcription' && (selectedPricing?.audioInputPrice !== undefined || selectedModelInfo?.audioInputPrice !== undefined) && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-semibold">Audio Input:</span>
                          <span>${selectedPricing?.audioInputPrice || selectedModelInfo?.audioInputPrice || 0}/1M</span>
                        </div>
                      )}
                      {operation === 'image-analysis' && (selectedPricing?.imageInputPrice !== undefined || selectedModelInfo?.imageInputPrice !== undefined) && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-semibold">Image Input:</span>
                          <span>${selectedPricing?.imageInputPrice || selectedModelInfo?.imageInputPrice || 0}/1M</span>
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
        <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-800">🤖 Modely</h2>
            <div className="flex gap-2">
              {hiddenModels.size > 0 && (
                <button
                  onClick={() => setHiddenModels(new Set())}
                  className="bg-gray-500 text-white font-medium py-1 px-2 rounded text-xs hover:bg-gray-600 transition-colors"
                  title={`Zobrazit ${hiddenModels.size} skrytých modelů`}
                >
                  👁️ ({hiddenModels.size})
                </button>
              )}
              <button
                onClick={() => setShowAddModel(!showAddModel)}
                className="bg-blue-600 text-white font-medium py-1 px-2 rounded text-xs hover:bg-blue-700 transition-colors"
              >
                + Vlastní
              </button>
            </div>
          </div>

          {/* Přidat nový model */}
          {showAddModel && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  placeholder="Název modelu"
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={addNewModel}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                >
                  Přidat
                </button>
                <button
                  onClick={() => setShowAddModel(false)}
                  className="bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-400"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Accordion s modely */}
          <div className="space-y-2 overflow-visible">
            {/* Zobrazit všechny modely ze seznamu, nejen ty s cenami */}
            {Object.entries(allModelsList).length > 0 ? (
              Object.entries(allModelsList)
                .filter(([modelName]) => !hiddenModels.has(modelName)) // Filtrovat skryté modely
                .sort(([, a], [, b]) => {
                  // Seřadit od nejdražšího po nejlevnější podle průměrné ceny (input + output)
                  const avgPriceA = (a.inputPrice || 0) + (a.outputPrice || 0);
                  const avgPriceB = (b.inputPrice || 0) + (b.outputPrice || 0);
                  return avgPriceB - avgPriceA; // Sestupně (nejdražší první)
                })
                .map(([modelName, modelInfo], index, array) => {
                // Najít ceny z config.models nebo použít z modelInfo
                const pricing = config.models[modelName] || {
                  inputPrice: modelInfo.inputPrice || 0,
                  outputPrice: modelInfo.outputPrice || 0,
                  note: modelInfo.description,
                  useCase: modelInfo.useCase || ''
                };
                
                const category = getModelCategory(modelName);
                const isFree = isFreeModel(modelName);
                const isExpanded = expandedModels.has(modelName);
                const isLastRow = index >= array.length - 2; // Poslední 2 řádky
                
                return (
                  <div key={modelName} className="border border-gray-200 rounded-lg">
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
                      className="w-full flex items-center justify-between p-2 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <DetailTooltip
                        position={isLastRow ? 'top' : 'bottom'}
                        content={
                          <div className="space-y-1.5">
                            <div className="font-bold text-sm mb-2 pb-2 border-b border-gray-700">{modelName}</div>
                            {modelInfo.description && (
                              <div className="flex items-start gap-2">
                                <span className="font-semibold text-gray-300 min-w-[60px]">Popis:</span>
                                <span className="text-white">{modelInfo.description}</span>
                              </div>
                            )}
                            <div className="flex items-start gap-2">
                              <span className="font-semibold text-gray-300 min-w-[60px]">Použití:</span>
                              <span className="text-white">{modelInfo.useCase || 'Neuvedeno'}</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="font-semibold text-gray-300 min-w-[60px]">Cena:</span>
                              <span className="text-white">Input: ${pricing.inputPrice}/1M, Output: ${pricing.outputPrice}/1M</span>
                            </div>
                            {isFree && (
                              <div className="text-xs text-blue-300 mt-2 pt-2 border-t border-gray-700">
                                🆓 Free tier: Bezplatné používání s omezením
                              </div>
                            )}
                          </div>
                        }
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0 cursor-help truncate block w-full">
                          <span className="text-gray-400 text-xs">{isExpanded ? '▼' : '▶'}</span>
                          <h3 className="text-sm font-bold text-gray-800 truncate">{modelName}</h3>
                          <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                            category === 'zdarma' ? 'bg-blue-100 text-blue-700' :
                            category === 'levný' ? 'bg-green-100 text-green-700' :
                            category === 'střední' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {getCategoryLabel(category).replace('🟢 ', '').replace('🟡 ', '').replace('🔴 ', '').replace('🆓 ', '')}
                          </span>
                          <span className="text-xs text-gray-500 truncate flex-1 min-w-0">
                            ${pricing.inputPrice}/${pricing.outputPrice}/1M
                          </span>
                          <span className="text-xs text-gray-600 truncate max-w-[200px]">
                            {(pricing.useCase || modelInfo.useCase) ? `• ${pricing.useCase || modelInfo.useCase}` : '• Použití neuvedeno'}
                          </span>
                        </div>
                      </DetailTooltip>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const newHidden = new Set(hiddenModels);
                            newHidden.add(modelName);
                            setHiddenModels(newHidden);
                          }}
                          className="text-gray-500 hover:text-gray-700 text-xs p-1"
                          title="Skrýt model"
                        >
                          👁️
                        </button>
                        {!allModelsList[modelName] && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteModel(modelName);
                            }}
                            className="text-red-600 hover:text-red-800 text-xs p-1"
                            title="Smazat model"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Accordion content */}
                    {isExpanded && (
                      <div className="p-3 bg-white border-t border-gray-200">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Input ($/1M) <span className="text-gray-400">(text/image/video)</span>
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={pricing.inputPrice}
                              onChange={(e) => updateModelPrice(modelName, 'inputPrice', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                            />
                            {config.usdToCzk && (
                              <div className="text-xs text-gray-500 mt-1">
                                {(pricing.inputPrice * config.usdToCzk).toFixed(2)} Kč/1M
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Output ($/1M)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={pricing.outputPrice}
                              onChange={(e) => updateModelPrice(modelName, 'outputPrice', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                            />
                            {config.usdToCzk && (
                              <div className="text-xs text-gray-500 mt-1">
                                {(pricing.outputPrice * config.usdToCzk).toFixed(2)} Kč/1M
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Audio a Image Input Price */}
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Audio Input ($/1M) <span className="text-gray-400">(volitelné)</span>
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={pricing.audioInputPrice !== undefined ? pricing.audioInputPrice : ''}
                              onChange={(e) => updateModelPrice(modelName, 'audioInputPrice', e.target.value === '' ? undefined : parseFloat(e.target.value) || 0)}
                              placeholder={pricing.inputPrice?.toString() || '0.00'}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                            />
                            {config.usdToCzk && (
                              <div className="text-xs text-gray-500 mt-1">
                                {pricing.audioInputPrice !== undefined ? ((pricing.audioInputPrice * config.usdToCzk).toFixed(2) + ' Kč/1M') : 'Použije se Input cena'}
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Image Input ($/1M) <span className="text-gray-400">(volitelné)</span>
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={pricing.imageInputPrice !== undefined ? pricing.imageInputPrice : ''}
                              onChange={(e) => updateModelPrice(modelName, 'imageInputPrice', e.target.value === '' ? undefined : parseFloat(e.target.value) || 0)}
                              placeholder={pricing.inputPrice?.toString() || '0.00'}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                            />
                            {config.usdToCzk && (
                              <div className="text-xs text-gray-500 mt-1">
                                {pricing.imageInputPrice !== undefined ? ((pricing.imageInputPrice * config.usdToCzk).toFixed(2) + ' Kč/1M') : 'Použije se Input cena'}
                              </div>
                            )}
                          </div>
                        </div>

                        {pricing.threshold && (
                          <div className="grid grid-cols-2 gap-3 mt-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Input High ($/1M)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={pricing.inputPriceHigh || 0}
                                onChange={(e) => updateModelPrice(modelName, 'inputPriceHigh', parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Threshold
                              </label>
                              <input
                                type="number"
                                value={pricing.threshold}
                                onChange={(e) => updateModelPrice(modelName, 'threshold', parseInt(e.target.value) || 0)}
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        )}

                        {(pricing.lastPriceUpdate || modelInfo.lastPriceUpdate) && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="text-xs text-gray-500">
                              Aktualizováno: {pricing.lastPriceUpdate || modelInfo.lastPriceUpdate}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              // Fallback: zobrazit modely z config.models pokud allModelsList je prázdný
              Object.entries(config.models)
                .sort(([, a], [, b]) => {
                  // Seřadit od nejdražšího po nejlevnější podle průměrné ceny (input + output)
                  const avgPriceA = (a.inputPrice || 0) + (a.outputPrice || 0);
                  const avgPriceB = (b.inputPrice || 0) + (b.outputPrice || 0);
                  return avgPriceB - avgPriceA; // Sestupně (nejdražší první)
                })
                .map(([modelName, pricing], index, array) => {
                const category = getModelCategory(modelName);
                const isExpanded = expandedModels.has(modelName);
                const isLastRow = index >= array.length - 2; // Poslední 2 řádky
                
                return (
                  <div key={modelName} className="border border-gray-200 rounded-lg">
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
                      className="w-full flex items-center justify-between p-2 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <DetailTooltip
                        position={isLastRow ? 'top' : 'bottom'}
                        content={
                          <div className="space-y-1.5">
                            <div className="font-bold text-sm mb-2 pb-2 border-b border-gray-700">{modelName}</div>
                            {pricing.note && (
                              <div className="flex items-start gap-2">
                                <span className="font-semibold text-gray-300 min-w-[60px]">Popis:</span>
                                <span className="text-white">{pricing.note}</span>
                              </div>
                            )}
                            <div className="flex items-start gap-2">
                              <span className="font-semibold text-gray-300 min-w-[60px]">Použití:</span>
                              <span className="text-white">{pricing.useCase || 'Neuvedeno'}</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="font-semibold text-gray-300 min-w-[60px]">Cena:</span>
                              <span className="text-white">Input: ${pricing.inputPrice}/1M, Output: ${pricing.outputPrice}/1M</span>
                            </div>
                            {pricing.lastPriceUpdate && (
                              <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-700">
                                Aktualizováno: {pricing.lastPriceUpdate}
                              </div>
                            )}
                          </div>
                        }
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0 cursor-help truncate block w-full">
                          <span className="text-gray-400 text-xs">{isExpanded ? '▼' : '▶'}</span>
                          <h3 className="text-sm font-bold text-gray-800 truncate">{modelName}</h3>
                          <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                            category === 'zdarma' ? 'bg-blue-100 text-blue-700' :
                            category === 'levný' ? 'bg-green-100 text-green-700' :
                            category === 'střední' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {getCategoryLabel(category).replace('🟢 ', '').replace('🟡 ', '').replace('🔴 ', '').replace('🆓 ', '')}
                          </span>
                          <span className="text-xs text-gray-500 truncate flex-1 min-w-0">
                            ${pricing.inputPrice}/${pricing.outputPrice}/1M
                          </span>
                          <span className="text-xs text-gray-600 truncate max-w-[200px]">
                            {pricing.useCase ? `• ${pricing.useCase}` : '• Použití neuvedeno'}
                          </span>
                        </div>
                      </DetailTooltip>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteModel(modelName);
                        }}
                        className="text-red-600 hover:text-red-800 text-xs p-1"
                        title="Smazat model"
                      >
                        🗑️
                      </button>
                    </div>
                    
                    {isExpanded && (
                      <div className="p-3 bg-white border-t border-gray-200">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Input ($/1M) <span className="text-gray-400">(text/image/video)</span>
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={pricing.inputPrice}
                              onChange={(e) => updateModelPrice(modelName, 'inputPrice', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                            />
                            {config.usdToCzk && (
                              <div className="text-xs text-gray-500 mt-1">
                                {(pricing.inputPrice * config.usdToCzk).toFixed(2)} Kč/1M
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Output ($/1M)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={pricing.outputPrice}
                              onChange={(e) => updateModelPrice(modelName, 'outputPrice', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                            />
                            {config.usdToCzk && (
                              <div className="text-xs text-gray-500 mt-1">
                                {(pricing.outputPrice * config.usdToCzk).toFixed(2)} Kč/1M
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Audio a Image Input Price */}
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Audio Input ($/1M) <span className="text-gray-400">(volitelné)</span>
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={pricing.audioInputPrice !== undefined ? pricing.audioInputPrice : ''}
                              onChange={(e) => updateModelPrice(modelName, 'audioInputPrice', e.target.value === '' ? undefined : parseFloat(e.target.value) || 0)}
                              placeholder={pricing.inputPrice?.toString() || '0.00'}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                            />
                            {config.usdToCzk && (
                              <div className="text-xs text-gray-500 mt-1">
                                {pricing.audioInputPrice !== undefined ? ((pricing.audioInputPrice * config.usdToCzk).toFixed(2) + ' Kč/1M') : 'Použije se Input cena'}
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Image Input ($/1M) <span className="text-gray-400">(volitelné)</span>
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={pricing.imageInputPrice !== undefined ? pricing.imageInputPrice : ''}
                              onChange={(e) => updateModelPrice(modelName, 'imageInputPrice', e.target.value === '' ? undefined : parseFloat(e.target.value) || 0)}
                              placeholder={pricing.inputPrice?.toString() || '0.00'}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                            />
                            {config.usdToCzk && (
                              <div className="text-xs text-gray-500 mt-1">
                                {pricing.imageInputPrice !== undefined ? ((pricing.imageInputPrice * config.usdToCzk).toFixed(2) + ' Kč/1M') : 'Použije se Input cena'}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {pricing.note && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="text-xs text-gray-600">{pricing.note}</p>
                          </div>
                        )}
                        
                        {pricing.lastPriceUpdate && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="text-xs text-gray-500">
                              Aktualizováno: {pricing.lastPriceUpdate}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
          
        </div>

        {/* Výsledky parsování */}
        {parsingResults && (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-xl shadow-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-blue-800">📊 Výsledky parsování</h2>
              <button
                onClick={() => setParsingResults(null)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                ✕ Zavřít
              </button>
            </div>
            
            <div className="bg-white rounded-lg p-3 border border-blue-200">
              <div className="text-sm text-gray-700 mb-2">
                <strong>Nalezeno modelů:</strong> {Object.keys(parsingResults).length}
              </div>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {Object.entries(parsingResults).length > 0 ? (
                  Object.entries(parsingResults).map(([modelName, modelData]) => (
                    <div key={modelName} className={`border-b border-gray-200 pb-2 last:border-b-0 ${modelData.foundOnPage === false ? 'opacity-60' : ''}`}>
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-sm text-gray-800">{modelName}</div>
                        {modelData.foundOnPage === false && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">Výchozí cena</span>
                        )}
                        {modelData.foundOnPage === true && (
                          <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">✓ Nalezeno</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        <div>Input: <strong>${modelData.inputPrice.toFixed(4)}</strong> / 1M tokenů</div>
                        <div>Output: <strong>${modelData.outputPrice.toFixed(4)}</strong> / 1M tokenů</div>
                        {modelData.description && (
                          <div className="mt-1 text-gray-500">{modelData.description}</div>
                        )}
                        {modelData.useCase && (
                          <div className="mt-1 text-gray-500">Použití: {modelData.useCase}</div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500">Žádné modely nebyly nalezeny</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIPricingConfigScreen;
