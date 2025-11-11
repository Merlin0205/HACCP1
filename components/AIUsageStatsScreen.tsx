/**
 * AI Usage Stats Screen - Statistiky a náklady na AI volání
 */

import React, { useState, useEffect, useMemo } from 'react';
import { fetchAIUsageLogs, clearAIUsageLogs } from '../services/firestore/aiUsageLogs';
import { toast } from '../utils/toast';
import { Pagination } from './ui/Pagination';

interface AIUsageLog {
  id: string;
  timestamp: string;
  model: string;
  operation: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  costCzk: number;
  source?: 'sdk' | 'cloud-functions';
}

/**
 * Formátuje náklady s více desetinnými místy pro velmi malé hodnoty
 */
function formatCost(value: number, currency: 'usd' | 'czk'): string {
  if (value === 0) {
    return currency === 'usd' ? '$0.00' : '0.00 Kč';
  }
  
  // Pro hodnoty menší než 0.0001 použijeme více desetinných míst
  if (value < 0.0001) {
    return currency === 'usd' 
      ? `$${value.toFixed(8)}`
      : `${value.toFixed(8)} Kč`;
  }
  
  // Pro hodnoty menší než 0.01 použijeme 6 desetinných míst
  if (value < 0.01) {
    return currency === 'usd'
      ? `$${value.toFixed(6)}`
      : `${value.toFixed(6)} Kč`;
  }
  
  // Pro větší hodnoty použijeme 4 desetinná místa
  return currency === 'usd'
    ? `$${value.toFixed(4)}`
    : `${value.toFixed(4)} Kč`;
}

interface AIUsageStats {
  logs: AIUsageLog[];
}

interface AIUsageStatsScreenProps {
  onBack: () => void;
}

const AIUsageStatsScreen: React.FC<AIUsageStatsScreenProps> = ({ onBack }) => {
  const [stats, setStats] = useState<AIUsageStats>({ logs: [] });
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const logs = await fetchAIUsageLogs(1000); // Načíst maximálně 1000 záznamů
      // Seřadit podle timestampu sestupně (nejnovější nahoře)
      const sortedLogs = logs.sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return dateB - dateA; // Sestupně
      });
      setStats({ logs: sortedLogs });
    } catch (error) {
      console.error('Chyba při načítání AI usage stats:', error);
      toast.error('Chyba při načítání statistik');
    } finally {
      setLoading(false);
    }
  };

  // Stránkování - vypočítat zobrazené logy
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return stats.logs.slice(startIndex, endIndex);
  }, [stats.logs, currentPage, itemsPerPage]);

  // Resetovat na první stránku při změně počtu položek na stránku
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  const handleClearLog = async () => {
    if (confirm('Opravdu chcete smazat celou historii nákladů?')) {
      try {
        await clearAIUsageLogs();
        setStats({ logs: [] });
        toast.success('Historie byla smazána');
      } catch (error) {
        console.error('Chyba při mazání logu:', error);
        toast.error('Chyba při mazání historie');
      }
    }
  };

  // Vypočítat celkové náklady
  const totalStats = stats.logs.reduce((acc, log) => {
    acc.totalTokens += log.totalTokens || 0;
    acc.promptTokens += log.promptTokens || 0;
    acc.completionTokens += log.completionTokens || 0;
    acc.costUsd += log.costUsd || 0;
    acc.costCzk += log.costCzk || 0;
    return acc;
  }, { totalTokens: 0, promptTokens: 0, completionTokens: 0, costUsd: 0, costCzk: 0 });

  // Statistiky podle modelu
  const byModel = stats.logs.reduce((acc, log) => {
    if (!acc[log.model]) {
      acc[log.model] = { count: 0, tokens: 0, costUsd: 0, costCzk: 0 };
    }
    acc[log.model].count++;
    acc[log.model].tokens += log.totalTokens || 0;
    acc[log.model].costUsd += log.costUsd || 0;
    acc[log.model].costCzk += log.costCzk || 0;
    return acc;
  }, {} as Record<string, { count: number; tokens: number; costUsd: number; costCzk: number; }>);

  if (loading) {
    return <div className="text-center p-12">Načítání statistik...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">💰 Náklady na AI</h1>
              <p className="text-gray-600 mt-2">Tracking usage a nákladů na AI modely</p>
            </div>
            <button
              onClick={onBack}
              className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
              ← Zpět
            </button>
          </div>
        </div>

        {/* Celkové náklady */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="text-sm text-gray-600 mb-1">Celkem volání</div>
            <div className="text-3xl font-bold text-blue-600">{stats.logs.length}</div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="text-sm text-gray-600 mb-1">Celkem tokenů</div>
            <div className="text-3xl font-bold text-purple-600">{totalStats.totalTokens.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="text-sm text-gray-600 mb-1">Náklady USD</div>
            <div className="text-3xl font-bold text-green-600">{formatCost(totalStats.costUsd, 'usd')}</div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="text-sm text-gray-600 mb-1">Náklady Kč</div>
            <div className="text-3xl font-bold text-orange-600">{formatCost(totalStats.costCzk, 'czk')}</div>
          </div>
        </div>

        {/* Statistiky podle modelu */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">📊 Podle modelu</h2>
          <div className="space-y-4">
            {Object.entries(byModel).map(([model, data]) => (
              <div key={model} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-gray-800">{model}</h3>
                  <span className="text-sm text-gray-600">{data.count}× volání</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Tokeny:</span>
                    <span className="font-bold ml-2">{(data.tokens || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">USD:</span>
                    <span className="font-bold ml-2">{formatCost(data.costUsd || 0, 'usd')}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Kč:</span>
                    <span className="font-bold ml-2">{formatCost(data.costCzk || 0, 'czk')}</span>
                  </div>
                </div>
              </div>
            ))}
            {Object.keys(byModel).length === 0 && (
              <p className="text-gray-500 text-center py-4">Zatím žádná volání AI</p>
            )}
          </div>
        </div>

        {/* Historie volání */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-800">📜 Historie volání</h2>
            {stats.logs.length > 0 && (
              <button
                onClick={handleClearLog}
                className="bg-red-100 text-red-600 font-semibold py-2 px-4 rounded-lg hover:bg-red-200 transition-colors"
              >
                🗑️ Smazat historii
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Čas</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Model</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Operace</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Input</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Output</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Total</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase">USD</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Kč</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedLogs.map((log, index) => (
                  <tr key={log.id || index} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{new Date(log.timestamp).toLocaleString('cs-CZ')}</td>
                    <td className="px-3 py-2 text-xs font-medium text-gray-800 truncate max-w-[150px]" title={log.model}>{log.model}</td>
                    <td className="px-3 py-2 text-xs text-gray-600 truncate max-w-[120px]" title={log.operation}>{log.operation}</td>
                    <td className="px-3 py-2 text-xs text-right text-gray-600 whitespace-nowrap">{(log.promptTokens || 0).toLocaleString()}</td>
                    <td className="px-3 py-2 text-xs text-right text-gray-600 whitespace-nowrap">{(log.completionTokens || 0).toLocaleString()}</td>
                    <td className="px-3 py-2 text-xs text-right font-medium text-gray-800 whitespace-nowrap">{(log.totalTokens || 0).toLocaleString()}</td>
                    <td className="px-3 py-2 text-xs text-right font-bold text-green-600 whitespace-nowrap">{formatCost(log.costUsd || 0, 'usd')}</td>
                    <td className="px-3 py-2 text-xs text-right font-bold text-orange-600 whitespace-nowrap">{formatCost(log.costCzk || 0, 'czk')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {stats.logs.length === 0 && (
              <p className="text-gray-500 text-center py-8">Zatím žádná volání AI</p>
            )}
            {stats.logs.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={stats.logs.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIUsageStatsScreen;
