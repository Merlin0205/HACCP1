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
  type OperationStats
} from '../services/firestore/aiUsageLogs';
import { updateGeminiPricesFromWeb, updateGeminiPricesWithLLM } from '../services/firestore/priceUpdater';
import { toast } from '../utils/toast';
import { DetailTooltip } from './ui/DetailTooltip';
import { PageHeader } from './PageHeader';
import { SECTION_THEMES } from '../constants/designSystem';
import { AppState } from '../types';
import { Card, CardBody, CardHeader } from './ui/Card';
import { Button } from './ui/Button';
import { TextField } from './ui/Input';
import {
  Save,
  ArrowLeft,
  Bot,
  RefreshCw,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Cpu,
  Globe,
  AlertTriangle,
  CheckCircle,
  X,
  Info
} from 'lucide-react';

interface ModelPricing {
  inputPrice: number;
  outputPrice: number;
  inputPriceHigh?: number;
  outputPriceHigh?: number;
  threshold?: number;
  audioInputPrice?: number;
  imageInputPrice?: number;
  note?: string;
  lastPriceUpdate?: string;
  useCase?: string;
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
    foundOnPage?: boolean;
  }> | null>(null);
  const [lastLLMStatus, setLastLLMStatus] = useState<{
    status: 'running' | 'success' | 'error';
    message: string;
    timestamp: string;
    details?: string;
  } | null>(null);
  const [hiddenModels, setHiddenModels] = useState<Set<string>>(new Set());
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());
  const [showDropdowns, setShowDropdowns] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [showAddModel, setShowAddModel] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const sectionTheme = SECTION_THEMES[AppState.SETTINGS];

  useEffect(() => {
    loadConfig();
    const savedStatus = localStorage.getItem('aiPricing_llmStatus');
    if (savedStatus) {
      try {
        const status = JSON.parse(savedStatus);
        if (status.status === 'running') {
          const statusTime = new Date(status.timestamp);
          const now = new Date();
          const diffMinutes = (now.getTime() - statusTime.getTime()) / 1000 / 60;
          if (diffMinutes > 10) {
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
      try {
        const { initializeAIModelsDatabase } = await import('../services/firestore/settings');
        await initializeAIModelsDatabase();
      } catch (error) {
        console.error('Chyba při inicializaci databáze:', error);
      }

      const [loadedModelsConfig, pricingConfig, allModels] = await Promise.all([
        fetchAIModelsConfig(),
        fetchAIPricingConfig(),
        fetchAllGeminiModels()
      ]);

      setModelsConfig(loadedModelsConfig);
      setInitialModelsConfig(loadedModelsConfig);
      setAllModelsList(allModels.models || {});
      setLastFullUpdate(allModels.lastFullUpdate || null);

      try {
        const stats = await calculateCostsByOperation();
        setUsageStats(stats);
      } catch (error) {
        console.error('Chyba při načítání statistik:', error);
      }

      const mergedModels: Record<string, ModelPricing> = {};

      Object.entries(allModels.models || {}).forEach(([name, modelInfo]: [string, any]) => {
        const existingPricing = pricingConfig.models?.[name];
        mergedModels[name] = existingPricing || {
          inputPrice: modelInfo.inputPrice || 0,
          outputPrice: modelInfo.outputPrice || 0,
          note: modelInfo.description,
          lastPriceUpdate: modelInfo.lastPriceUpdate || new Date().toISOString().split('T')[0]
        };
      });

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

  const hasUnsavedChanges =
    JSON.stringify(config) !== JSON.stringify(initialConfig) ||
    JSON.stringify(modelsConfig) !== JSON.stringify(initialModelsConfig);

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

      await saveAIPricingConfig({
        ...config,
        lastCurrencyUpdate: new Date().toISOString()
      });

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

  const updateModelPrice = (modelName: string, field: keyof ModelPricing, value: number | string | undefined) => {
    setConfig(prev => {
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
            [field]: value,
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
      setParsingResults(null);

      const result = await updateGeminiPricesFromWeb((step, details) => {
        setUpdateProgress({ step, details });
      });

      setUpdateProgress(null);
      setParsingResults((result as any).parsedModels || null);
      toast.success(`Aktualizováno ${result.updated} modelů. ${result.failed.length > 0 ? `Nepodařilo se aktualizovat: ${result.failed.join(', ')}` : ''}`);

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
      setParsingResults((result as any).parsedModels || null);

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

      let errorMessage = error.message || 'Neznámá chyba';
      let errorDetails = error.message;

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

  const isFreeModel = (modelName: string): boolean => {
    const modelInfo = allModelsList[modelName];
    const pricing = config.models[modelName];
    const inputPrice = pricing?.inputPrice ?? modelInfo?.inputPrice ?? 0;
    const outputPrice = pricing?.outputPrice ?? modelInfo?.outputPrice ?? 0;
    return inputPrice === 0 && outputPrice === 0;
  };

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
    return (
      <div className="w-full max-w-5xl mx-auto pb-10">
        <PageHeader
          section={sectionTheme}
          title="Ceny AI modelů"
          description="Nastavení cen modelů a kurzu"
          onBack={onBack}
        />
        <div className="text-center p-12">Načítání...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      <PageHeader
        section={sectionTheme}
        title="Ceny AI modelů"
        description="Nastavení cen modelů a kurzu"
        onBack={onBack}
        action={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleUpdatePrices}
                disabled={updatingPrices}
                leftIcon={updatingPrices ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
              >
                {updatingPrices ? 'Aktualizuji...' : 'Aktualizovat (HTML)'}
              </Button>
              {updateProgress && (
                <div className="absolute top-full left-0 mt-2 bg-gray-900 text-white p-3 rounded-lg shadow-lg z-50 min-w-[300px]">
                  <div className="font-semibold text-sm mb-1">{updateProgress.step}</div>
                  {updateProgress.details && (
                    <div className="text-xs text-gray-300">{updateProgress.details}</div>
                  )}
                </div>
              )}
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={handleUpdatePricesWithLLM}
              disabled={updatingPrices}
              leftIcon={updatingPrices ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
            >
              {updatingPrices ? 'Aktualizuji...' : 'Aktualizovat (LLM)'}
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={saving || !hasUnsavedChanges}
              className="bg-green-600 hover:bg-green-700 text-white focus:ring-green-500"
              leftIcon={saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            >
              {saving ? 'Ukládám...' : 'Uložit'}
            </Button>
          </div>
        }
      />

      {/* Status banner pro LLM parsing */}
      {lastLLMStatus && (
        <Card className={`mb-6 border-l-4 ${lastLLMStatus.status === 'running' ? 'border-l-blue-500 bg-blue-50' :
          lastLLMStatus.status === 'success' ? 'border-l-green-500 bg-green-50' :
            'border-l-red-500 bg-red-50'
          }`}>
          <CardBody className="flex items-start justify-between gap-3 p-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {lastLLMStatus.status === 'running' && <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />}
                {lastLLMStatus.status === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
                {lastLLMStatus.status === 'error' && <AlertTriangle className="w-5 h-5 text-red-600" />}
                <span className={`font-bold ${lastLLMStatus.status === 'running' ? 'text-blue-800' :
                  lastLLMStatus.status === 'success' ? 'text-green-800' :
                    'text-red-800'
                  }`}>
                  {lastLLMStatus.status === 'running' ? 'LLM Parsing probíhá...' :
                    lastLLMStatus.status === 'success' ? 'LLM Parsing dokončen' :
                      'LLM Parsing selhal'}
                </span>
              </div>
              <div className={`text-sm ${lastLLMStatus.status === 'running' ? 'text-blue-700' :
                lastLLMStatus.status === 'success' ? 'text-green-700' :
                  'text-red-700'
                }`}>
                {lastLLMStatus.message}
              </div>
              {lastLLMStatus.details && (
                <div className="text-xs mt-1 opacity-80">
                  {lastLLMStatus.details}
                </div>
              )}
              <div className="text-xs mt-2 opacity-60">
                {new Date(lastLLMStatus.timestamp).toLocaleString('cs-CZ')}
              </div>
            </div>
            <button
              onClick={() => {
                setLastLLMStatus(null);
                localStorage.removeItem('aiPricing_llmStatus');
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </CardBody>
        </Card>
      )}

      {/* Kurz CZK/USD */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Kurz měny</h2>
          </div>
        </CardHeader>
        <CardBody>
          <div className="flex items-center gap-3">
            <label className="text-gray-700 font-medium text-sm">1 USD =</label>
            <div className="w-32">
              <TextField
                type="number"
                step="0.1"
                value={config.usdToCzk}
                onChange={(e) => setConfig(prev => ({ ...prev, usdToCzk: parseFloat(e.target.value) || 25 }))}
              />
            </div>
            <span className="text-gray-600 font-medium text-sm">Kč</span>
          </div>
        </CardBody>
      </Card>

      {/* Výběr modelů pro operace */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Výběr modelů pro operace</h2>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      <span className="text-green-600 text-xs font-bold" title="Používáno">💰</span>
                    )}
                  </div>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowDropdowns(prev => ({ ...prev, [operation]: !prev[operation] }))}
                      onBlur={(e) => {
                        const relatedTarget = e.relatedTarget as HTMLElement;
                        if (!relatedTarget || !e.currentTarget.parentElement?.contains(relatedTarget)) {
                          setTimeout(() => {
                            setShowDropdowns(prev => ({ ...prev, [operation]: false }));
                          }, 200);
                        }
                      }}
                      className={`w-full px-3 py-2 pr-10 border ${colors.border} ${colors.bg} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium ${colors.text} transition-all text-left flex items-center justify-between`}
                    >
                      <span className="truncate">
                        {selectedModel
                          ? `${selectedModel} (${getCategoryLabel(selectedCategory || 'střední').replace('🟢 ', '').replace('🟡 ', '').replace('🔴 ', '').replace('🆓 ', '')})`
                          : '-- Vyberte --'}
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${showDropdowns[operation] ? 'rotate-180' : ''}`} />
                    </button>
                    {showDropdowns[operation] && (
                      <div
                        className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto"
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
                                setModelsConfig((prev: any) => ({
                                  ...prev,
                                  models: {
                                    ...prev.models,
                                    [operation]: modelName
                                  }
                                }));
                                setShowDropdowns(prev => ({ ...prev, [operation]: false }));
                              }}
                              className={`px-3 py-2 cursor-pointer transition-colors flex items-center justify-between ${isSelected
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
        </CardBody>
      </Card>

      {/* Seznam modelů */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Modely</h2>
            </div>
            <div className="flex gap-2">
              {hiddenModels.size > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setHiddenModels(new Set())}
                  leftIcon={<Eye className="w-4 h-4" />}
                >
                  ({hiddenModels.size})
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowAddModel(!showAddModel)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Vlastní
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          {/* Přidat nový model */}
          {showAddModel && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <TextField
                    value={newModelName}
                    onChange={(e) => setNewModelName(e.target.value)}
                    placeholder="Název modelu"
                  />
                </div>
                <Button
                  variant="primary"
                  onClick={addNewModel}
                  className="bg-green-600 hover:bg-green-700 text-white focus:ring-green-500"
                >
                  Přidat
                </Button>
                <Button variant="secondary" onClick={() => setShowAddModel(false)}>✕</Button>
              </div>
            </div>
          )}

          {/* Accordion s modely */}
          <div className="space-y-2">
            {Object.entries(allModelsList).length > 0 ? (
              Object.entries(allModelsList)
                .filter(([modelName]) => !hiddenModels.has(modelName))
                .sort(([, a], [, b]) => {
                  const avgPriceA = (a.inputPrice || 0) + (a.outputPrice || 0);
                  const avgPriceB = (b.inputPrice || 0) + (b.outputPrice || 0);
                  return avgPriceB - avgPriceA;
                })
                .map(([modelName, modelInfo], index, array) => {
                  const pricing = config.models[modelName] || {
                    inputPrice: modelInfo.inputPrice || 0,
                    outputPrice: modelInfo.outputPrice || 0,
                    note: modelInfo.description,
                    useCase: modelInfo.useCase || ''
                  };

                  const category = getModelCategory(modelName);
                  const isFree = isFreeModel(modelName);
                  const isExpanded = expandedModels.has(modelName);
                  const isLastRow = index >= array.length - 2;

                  return (
                    <div key={modelName} className="border border-gray-200 rounded-lg overflow-hidden">
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
                        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
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
                          <div className="flex items-center gap-3 flex-1 min-w-0 cursor-help truncate block w-full">
                            <span className="text-gray-400">{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
                            <h3 className="text-sm font-bold text-gray-800 truncate">{modelName}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${category === 'zdarma' ? 'bg-blue-100 text-blue-700' :
                              category === 'levný' ? 'bg-green-100 text-green-700' :
                                category === 'střední' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                              }`}>
                              {getCategoryLabel(category).replace('🟢 ', '').replace('🟡 ', '').replace('🔴 ', '').replace('🆓 ', '')}
                            </span>
                            <span className="text-xs text-gray-500 truncate flex-1 min-w-0">
                              ${pricing.inputPrice}/${pricing.outputPrice}/1M
                            </span>
                            <span className="text-xs text-gray-600 truncate max-w-[200px] hidden sm:inline">
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
                            className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-200"
                            title="Skrýt model"
                          >
                            <EyeOff className="w-4 h-4" />
                          </button>
                          {!allModelsList[modelName] && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteModel(modelName);
                              }}
                              className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-100"
                              title="Smazat model"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="p-4 bg-white border-t border-gray-200">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <TextField
                                label="Input ($/1M)"
                                type="number"
                                step="0.01"
                                value={pricing.inputPrice}
                                onChange={(e) => updateModelPrice(modelName, 'inputPrice', parseFloat(e.target.value) || 0)}
                                helperText={config.usdToCzk ? `${(pricing.inputPrice * config.usdToCzk).toFixed(2)} Kč/1M` : undefined}
                              />
                            </div>

                            <div>
                              <TextField
                                label="Output ($/1M)"
                                type="number"
                                step="0.01"
                                value={pricing.outputPrice}
                                onChange={(e) => updateModelPrice(modelName, 'outputPrice', parseFloat(e.target.value) || 0)}
                                helperText={config.usdToCzk ? `${(pricing.outputPrice * config.usdToCzk).toFixed(2)} Kč/1M` : undefined}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                            <div>
                              <TextField
                                label="Audio Input ($/1M)"
                                type="number"
                                step="0.01"
                                value={pricing.audioInputPrice !== undefined ? pricing.audioInputPrice : ''}
                                onChange={(e) => updateModelPrice(modelName, 'audioInputPrice', e.target.value === '' ? undefined : parseFloat(e.target.value) || 0)}
                                placeholder={pricing.inputPrice?.toString() || '0.00'}
                                helperText={config.usdToCzk ? (pricing.audioInputPrice !== undefined ? `${(pricing.audioInputPrice * config.usdToCzk).toFixed(2)} Kč/1M` : 'Použije se Input cena') : undefined}
                              />
                            </div>

                            <div>
                              <TextField
                                label="Image Input ($/1M)"
                                type="number"
                                step="0.01"
                                value={pricing.imageInputPrice !== undefined ? pricing.imageInputPrice : ''}
                                onChange={(e) => updateModelPrice(modelName, 'imageInputPrice', e.target.value === '' ? undefined : parseFloat(e.target.value) || 0)}
                                placeholder={pricing.inputPrice?.toString() || '0.00'}
                                helperText={config.usdToCzk ? (pricing.imageInputPrice !== undefined ? `${(pricing.imageInputPrice * config.usdToCzk).toFixed(2)} Kč/1M` : 'Použije se Input cena') : undefined}
                              />
                            </div>
                          </div>

                          {pricing.threshold && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                              <div>
                                <TextField
                                  label="Input High ($/1M)"
                                  type="number"
                                  step="0.01"
                                  value={pricing.inputPriceHigh || 0}
                                  onChange={(e) => updateModelPrice(modelName, 'inputPriceHigh', parseFloat(e.target.value) || 0)}
                                />
                              </div>

                              <div>
                                <TextField
                                  label="Threshold"
                                  type="number"
                                  value={pricing.threshold}
                                  onChange={(e) => updateModelPrice(modelName, 'threshold', parseInt(e.target.value) || 0)}
                                />
                              </div>
                            </div>
                          )}

                          {(pricing.lastPriceUpdate || modelInfo.lastPriceUpdate) && (
                            <div className="mt-4 pt-2 border-t border-gray-100">
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Info className="w-3 h-3" />
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
              // Fallback
              Object.entries(config.models)
                .sort(([, a], [, b]) => {
                  const avgPriceA = (a.inputPrice || 0) + (a.outputPrice || 0);
                  const avgPriceB = (b.inputPrice || 0) + (b.outputPrice || 0);
                  return avgPriceB - avgPriceA;
                })
                .map(([modelName, pricing], index, array) => {
                  const category = getModelCategory(modelName);
                  const isExpanded = expandedModels.has(modelName);
                  const isLastRow = index >= array.length - 2;

                  return (
                    <div key={modelName} className="border border-gray-200 rounded-lg overflow-hidden">
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
                        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
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
                          <div className="flex items-center gap-3 flex-1 min-w-0 cursor-help truncate block w-full">
                            <span className="text-gray-400">{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
                            <h3 className="text-sm font-bold text-gray-800 truncate">{modelName}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${category === 'zdarma' ? 'bg-blue-100 text-blue-700' :
                              category === 'levný' ? 'bg-green-100 text-green-700' :
                                category === 'střední' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                              }`}>
                              {getCategoryLabel(category).replace('🟢 ', '').replace('🟡 ', '').replace('🔴 ', '').replace('🆓 ', '')}
                            </span>
                            <span className="text-xs text-gray-500 truncate flex-1 min-w-0">
                              ${pricing.inputPrice}/${pricing.outputPrice}/1M
                            </span>
                            <span className="text-xs text-gray-600 truncate max-w-[200px] hidden sm:inline">
                              {pricing.useCase ? `• ${pricing.useCase}` : '• Použití neuvedeno'}
                            </span>
                          </div>
                        </DetailTooltip>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteModel(modelName);
                          }}
                          className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-100"
                          title="Smazat model"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="p-4 bg-white border-t border-gray-200">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <TextField
                                label="Input ($/1M)"
                                type="number"
                                step="0.01"
                                value={pricing.inputPrice}
                                onChange={(e) => updateModelPrice(modelName, 'inputPrice', parseFloat(e.target.value) || 0)}
                                helperText={config.usdToCzk ? `${(pricing.inputPrice * config.usdToCzk).toFixed(2)} Kč/1M` : undefined}
                              />
                            </div>

                            <div>
                              <TextField
                                label="Output ($/1M)"
                                type="number"
                                step="0.01"
                                value={pricing.outputPrice}
                                onChange={(e) => updateModelPrice(modelName, 'outputPrice', parseFloat(e.target.value) || 0)}
                                helperText={config.usdToCzk ? `${(pricing.outputPrice * config.usdToCzk).toFixed(2)} Kč/1M` : undefined}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                            <div>
                              <TextField
                                label="Audio Input ($/1M)"
                                type="number"
                                step="0.01"
                                value={pricing.audioInputPrice !== undefined ? pricing.audioInputPrice : ''}
                                onChange={(e) => updateModelPrice(modelName, 'audioInputPrice', e.target.value === '' ? undefined : parseFloat(e.target.value) || 0)}
                                placeholder={pricing.inputPrice?.toString() || '0.00'}
                                helperText={config.usdToCzk ? (pricing.audioInputPrice !== undefined ? `${(pricing.audioInputPrice * config.usdToCzk).toFixed(2)} Kč/1M` : 'Použije se Input cena') : undefined}
                              />
                            </div>

                            <div>
                              <TextField
                                label="Image Input ($/1M)"
                                type="number"
                                step="0.01"
                                value={pricing.imageInputPrice !== undefined ? pricing.imageInputPrice : ''}
                                onChange={(e) => updateModelPrice(modelName, 'imageInputPrice', e.target.value === '' ? undefined : parseFloat(e.target.value) || 0)}
                                placeholder={pricing.inputPrice?.toString() || '0.00'}
                                helperText={config.usdToCzk ? (pricing.imageInputPrice !== undefined ? `${(pricing.imageInputPrice * config.usdToCzk).toFixed(2)} Kč/1M` : 'Použije se Input cena') : undefined}
                              />
                            </div>
                          </div>

                          {pricing.note && (
                            <div className="mt-4 pt-2 border-t border-gray-100">
                              <p className="text-xs text-gray-600">{pricing.note}</p>
                            </div>
                          )}

                          {pricing.lastPriceUpdate && (
                            <div className="mt-2 pt-2 border-t border-gray-100">
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Info className="w-3 h-3" />
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
        </CardBody>
      </Card>

      {/* Výsledky parsování */}
      {parsingResults && (
        <Card className="mb-6 border-l-4 border-l-blue-500 bg-blue-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-blue-800">Výsledky parsování</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setParsingResults(null)}
                leftIcon={<X className="w-4 h-4" />}
              >
                Zavřít
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="text-sm text-gray-700 mb-3">
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
          </CardBody>
        </Card>
      )}
    </div>
  );
};

export default AIPricingConfigScreen;
