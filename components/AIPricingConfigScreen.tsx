/**
 * AI Pricing Config Screen - Nastavení cen modelů a kurzu
 */

import React, { useState, useEffect } from 'react';

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
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [showAddModel, setShowAddModel] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      // Načíst modely z JSON configu
      const modelsResponse = await fetch('/api/ai-models-config');
      const modelsConfig = modelsResponse.ok ? await modelsResponse.json() : { models: {} };
      
      // Načíst pricing config
      const configResponse = await fetch('/api/ai-pricing-config');
      const pricingConfig = configResponse.ok ? await configResponse.json() : { usdToCzk: 25, models: {} };
      
      // Sloučit: modely z JSON config + jejich ceny z pricing configu
      const mergedModels: Record<string, ModelPricing> = {};
      
      // Projít všechny modely z JSON configu
      Object.entries(modelsConfig.models).forEach(([usage, modelName]: [string, any]) => {
        const existingPricing = pricingConfig.models[modelName];
        mergedModels[modelName] = existingPricing || {
          inputPrice: 0,
          outputPrice: 0,
          note: `Model z aiModelsConfig.json (${usage})`,
          lastPriceUpdate: new Date().toISOString().split('T')[0]
        };
      });
      
      // Přidat i modely z pricing configu které nejsou v models config (vlastní modely)
      Object.keys(pricingConfig.models).forEach(modelName => {
        if (!mergedModels[modelName]) {
          mergedModels[modelName] = pricingConfig.models[modelName];
        }
      });
      
      setConfig({
        usdToCzk: pricingConfig.usdToCzk || 25,
        lastCurrencyUpdate: pricingConfig.lastCurrencyUpdate,
        models: mergedModels
      });
    } catch (error) {
      console.error('Chyba při načítání pricing config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const response = await fetch('/api/ai-pricing-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          lastCurrencyUpdate: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        alert('Chyba při ukládání pricing configu');
      }
    } catch (error) {
      console.error('Chyba při ukládání:', error);
      alert('Chyba při ukládání pricing configu');
    }
  };

  const updateModelPrice = (modelName: string, field: keyof ModelPricing, value: number | string) => {
    setConfig(prev => ({
      ...prev,
      models: {
        ...prev.models,
        [modelName]: {
          ...prev.models[modelName],
          [field]: typeof value === 'string' ? value : value,
          lastPriceUpdate: new Date().toISOString().split('T')[0]
        }
      }
    }));
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

  const deleteModel = (modelName: string) => {
    // Zkontrolovat jestli je model z aiModelsConfig.json
    const isFromConfig = config.models[modelName]?.note?.includes('aiModelsConfig.json');
    
    if (isFromConfig) {
      alert('Tento model je z aiModelsConfig.json a nelze ho smazat. Upravte aiModelsConfig.json pokud ho nechcete používat.');
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

        {/* Seznam modelů */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">🤖 Modely</h2>
              <p className="text-sm text-gray-600 mt-1">
                ℹ️ Modely se načítají z <code className="bg-gray-100 px-2 py-1 rounded">aiModelsConfig.json</code>
              </p>
            </div>
            <button
              onClick={() => setShowAddModel(!showAddModel)}
              className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Vlastní model
            </button>
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

          {/* Tabulka modelů */}
          <div className="space-y-4">
            {Object.entries(config.models).map(([modelName, pricing]) => (
              <div key={modelName} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-gray-800">{modelName}</h3>
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
                
                {pricing.lastPriceUpdate && (
                  <p className="text-xs text-gray-500 mt-2">
                    Poslední aktualizace: {pricing.lastPriceUpdate}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tlačítka */}
        <div className="flex gap-4">
          <button
            onClick={handleSave}
            className="flex-1 bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
          >
            💾 Uložit
          </button>
        </div>

        {/* Success message */}
        {saved && (
          <div className="mt-4 p-4 bg-green-100 border-2 border-green-500 rounded-lg text-green-800 font-semibold text-center animate-fade-in">
            ✅ Pricing config úspěšně uložen
          </div>
        )}
      </div>
    </div>
  );
};

export default AIPricingConfigScreen;
