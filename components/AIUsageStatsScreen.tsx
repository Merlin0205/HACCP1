/**
 * AI Usage Stats Screen - Statistiky a náklady na AI volání
 */

import React, { useState, useEffect, useMemo } from 'react';
import { fetchAIUsageLogs, clearAIUsageLogs } from '../services/firestore/aiUsageLogs';
import { fetchUserMetadata, fetchAllUsers } from '../services/firestore/users';
import { auth } from '../firebaseConfig';
import { toast } from '../utils/toast';
import { Pagination } from './ui/Pagination';
import { PageHeader } from './PageHeader';
import { SECTION_THEMES } from '../constants/designSystem';
import { AppState, UserRole, UserMetadata } from '../types';
import { Card, CardBody, CardHeader } from './ui/Card';
import { Button } from './ui/Button';
import { Trash2, ArrowLeft, BarChart3, DollarSign, Activity, Calendar, Filter, ChevronDown, User, Info, Clock } from 'lucide-react';
import {
  format, subDays, startOfDay, isAfter, isSameDay, parseISO,
  startOfWeek, endOfWeek, eachDayOfInterval, eachWeekOfInterval,
  eachMonthOfInterval, startOfMonth, endOfMonth, isWithinInterval,
  differenceInDays, getISOWeek, getYear
} from 'date-fns';
import { cs } from 'date-fns/locale';

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
  userId?: string;
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

// Translations for operations
const OPERATION_TRANSLATIONS: Record<string, string> = {
  'text-generation': 'Generování textu',
  'audio-transcription': 'Přepis audia',
  'image-generation': 'Generování obrázků',
  'text-embedding': 'Vektorizace textu',
  'chat-completion': 'Chat konverzace',
  'report-generation': 'Generování reportu',
  'price-update': 'Aktualizace cen',
  'receipt-analysis': 'Analýza účtenky',
  'invoice-extraction': 'Extrakce faktury',
  'audit-generation': 'Generování auditu',
};

function getOperationName(op: string): string {
  if (!op) return '';
  return OPERATION_TRANSLATIONS[op] || op;
}

interface AIUsageStats {
  logs: AIUsageLog[];
}

type TimeRange = '7d' | '30d' | '90d' | '1y' | 'custom';
type AggregationType = 'day' | 'week' | 'month';

interface ChartDataPoint {
  dateKey: string;     // Unique key for map (yyyy-MM-dd / yyyy-w / yyyy-M)
  label: string;       // Display label on Axis
  fullLabel: string;   // Tooltip label (e.g. range date)
  costCzk: number;
  tokens: number;
  orderDate: Date;     // For sorting
  operations: Record<string, number>; // Breakdown cost by operation
}

const SimpleBarChart: React.FC<{ data: ChartDataPoint[]; maxVal: number }> = ({ data, maxVal }) => {
  return (
    <div className="w-full h-64 flex items-end justify-between gap-1 sm:gap-2 pt-8 pb-2 relative z-10">
      {data.map((point, i) => {
        const heightPercent = maxVal > 0 ? (point.costCzk / maxVal) * 100 : 0;
        // Show labels sparsely if too many items
        const interval = Math.ceil(data.length / 12);
        const showLabel = i % interval === 0;

        // Prepare tooltip breakdown
        const ops = Object.entries(point.operations)
          .filter(([_, cost]) => (cost as number) > 0)
          .sort((a, b) => ((b[1] as number) - (a[1] as number))); // Sort by cost desc

        // Decide tooltip alignment logic (X-axis)
        // first 2 items -> align left
        // last 2 items -> align right
        // middle items -> center
        const xPosClass = i < 2 ? 'left-0 origin-bottom-left' : i > data.length - 3 ? 'right-0 origin-bottom-right' : 'left-1/2 -translate-x-1/2 origin-bottom';

        return (
          <div key={point.dateKey} className="flex-1 h-full flex flex-col justify-end items-center group relative min-w-[3px]">
            {/* Tooltip 
                 - absolute positioning
                 - bottom set dynamically via style to "float" above the bar
                 - z-index ensures it covers other elements
             */}
            <div
              className={`absolute mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs rounded px-3 py-2 whitespace-nowrap z-50 pointer-events-none shadow-xl border border-gray-700 hidden group-hover:block ${xPosClass}`}
              style={{ bottom: `${heightPercent}%` }}
            >
              <div className="font-semibold text-gray-200 mb-1 border-b border-gray-700 pb-1">{point.fullLabel}</div>
              <div className="flex justify-between gap-4 mb-2">
                <span className="text-gray-400">Celkem:</span>
                <span className="text-orange-400 font-bold">{formatCost(point.costCzk, 'czk')}</span>
              </div>

              {ops.length > 0 && (
                <div className="space-y-1">
                  {ops.map(([op, cost]) => {
                    const val = cost as number;
                    const percent = point.costCzk > 0 ? (val / point.costCzk) * 100 : 0;
                    return (
                      <div key={op} className="flex justify-between gap-4 text-[10px]">
                        <span className="text-gray-300">{getOperationName(op)} <span className="text-gray-500">({percent.toFixed(0)}%)</span></span>
                        <span className="text-gray-400 font-mono">{formatCost(val, 'czk')}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bar Wrapper */}
            <div className="w-full flex-1 flex items-end justify-center relative">
              {/* Bar */}
              <div
                className="w-full mx-0.5 bg-blue-200 rounded-t-sm group-hover:bg-blue-300 transition-colors relative"
                style={{ height: `${Math.max(heightPercent, 1)}%` }}
              >
                <div
                  className="absolute bottom-0 w-full bg-blue-600 rounded-t-sm opacity-90"
                  style={{ height: '100%' }}
                />
              </div>
            </div>

            {/* X Axis Label */}
            <div className="h-4 text-[9px] sm:text-[10px] text-gray-500 mt-1 rotate-0 overflow-hidden text-center w-full truncate">
              {showLabel ? point.label : ''}
            </div>
          </div>
        );
      })}
    </div>
  );
};

interface AIUsageStatsScreenProps {
  onBack: () => void;
}

const AIUsageStatsScreen: React.FC<AIUsageStatsScreenProps> = ({ onBack }) => {
  const [stats, setStats] = useState<AIUsageStats>({ logs: [] });
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [isAdmin, setIsAdmin] = useState(false);

  // New State for Redesign
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  const [users, setUsers] = useState<UserMetadata[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null); // null = Global (if admin) or Self (if user)
  const [loadingUsers, setLoadingUsers] = useState(false);

  const sectionTheme = SECTION_THEMES[AppState.SETTINGS];

  useEffect(() => {
    loadStats();
  }, [selectedUserId]); // Reload when filter changes

  // Initialize custom dates with last 30 days when switching to custom, if empty
  useEffect(() => {
    if (timeRange === 'custom' && !customStart) {
      const today = new Date();
      const past = subDays(today, 30);
      setCustomStart(format(past, 'yyyy-MM-dd'));
      setCustomEnd(format(today, 'yyyy-MM-dd'));
    }
  }, [timeRange]);

  const loadStats = async () => {
    setLoading(true);
    try {
      let logs;
      let userIsAdmin = isAdmin;

      // Zjistit roli uživatele (pokud ještě nevíme)
      if (auth.currentUser) {
        if (!isAdmin) { // Only fetch if we don't know yet
          const userMetadata = await fetchUserMetadata(auth.currentUser.uid);
          userIsAdmin = userMetadata?.role === UserRole.ADMIN;
          setIsAdmin(userIsAdmin);

          // If admin, load users list
          if (userIsAdmin) {
            loadUsersList();
          }
        }

        if (userIsAdmin) {
          // Admin: fetch specific user or global
          if (selectedUserId) {
            logs = await fetchAIUsageLogs(1000, selectedUserId);
          } else {
            logs = await fetchAIUsageLogs(1000, null);
          }
        } else {
          // Běžný uživatel vidí jen své
          logs = await fetchAIUsageLogs(1000);
        }
      } else {
        logs = await fetchAIUsageLogs(1000);
      }

      // Seřadit podle timestampu sestupně (nejnovější nahoře) - pro tabulku
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

  const loadUsersList = async () => {
    setLoadingUsers(true);
    try {
      const allUsers = await fetchAllUsers();
      setUsers(allUsers);
    } catch (err) {
      console.error("Failed to load users", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // --- Date Range Logic ---
  const getDateRange = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end = now;

    switch (timeRange) {
      case '7d': start = subDays(now, 7); break;
      case '30d': start = subDays(now, 30); break;
      case '90d': start = subDays(now, 90); break;
      case '1y': start = subDays(now, 365); break;
      case 'custom':
        start = customStart ? parseISO(customStart) : subDays(now, 30);
        end = customEnd ? parseISO(customEnd) : now;
        end = new Date(end.setHours(23, 59, 59, 999));
        start = new Date(start.setHours(0, 0, 0, 0));
        break;
      default: start = subDays(now, 30);
    }
    return { start, end };
  }, [timeRange, customStart, customEnd]);

  // --- Aggregation Logic ---

  const getAggregationDetails = (start: Date, end: Date, rangeType: TimeRange): { type: AggregationType } => {
    const daysDiff = differenceInDays(end, start);

    if (rangeType === '90d') return { type: 'week' };
    if (rangeType === '1y') return { type: 'month' };
    if (rangeType === 'custom') {
      if (daysDiff > 180) return { type: 'month' };
      if (daysDiff > 60) return { type: 'week' };
      return { type: 'day' };
    }
    return { type: 'day' }; // 7d, 30d default
  };

  // Filtered Logs for Current Range
  const filteredLogs = useMemo(() => {
    const { start, end } = getDateRange;
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];

    return stats.logs.filter(log => {
      const logDate = parseISO(log.timestamp);
      return isWithinInterval(logDate, { start, end });
    });
  }, [stats.logs, getDateRange]);

  const normalizeOperation = (op: string): string => {
    if (op === 'price-update-llm') return 'price-update';
    return op;
  };

  // Aggregated Stats for Summary Card
  const summaryStats = useMemo(() => {
    const opMap = new Map<string, { totalCzk: number; count: number; users: Map<string, number> }>();

    let totalCzk = 0;
    let totalUsd = 0;
    let totalCalls = 0;

    filteredLogs.forEach(log => {
      totalCzk += log.costCzk || 0;
      totalUsd += log.costUsd || 0;
      totalCalls++;

      // Operation Breakdown
      const op = normalizeOperation(log.operation || 'unknown');
      if (!opMap.has(op)) {
        opMap.set(op, { totalCzk: 0, count: 0, users: new Map() });
      }
      const entry = opMap.get(op)!;
      entry.totalCzk += log.costCzk || 0;
      entry.count++;

      // User Breakdown (if present)
      const uid = log.userId || 'unknown';
      entry.users.set(uid, (entry.users.get(uid) || 0) + (log.costCzk || 0));
    });

    // Transform to array for UI
    const operations = Array.from(opMap.entries()).map(([key, data]) => {
      // Top users sorting
      const topUsers = Array.from(data.users.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([uid, cost]) => {
          const user = users.find(u => u.userId === uid);
          return {
            userId: uid,
            name: user ? user.displayName : (uid === 'unknown' ? 'Neznámý' : (uid === auth.currentUser?.uid ? 'Já' : 'Uživatel')),
            cost,
            email: user?.email
          };
        });

      return {
        key,
        name: getOperationName(key),
        totalCzk: data.totalCzk,
        count: data.count,
        topUsers
      };
    }).sort((a, b) => b.totalCzk - a.totalCzk);

    return {
      totalCzk,
      totalUsd,
      totalCalls,
      operations
    };
  }, [filteredLogs, users]);


  const chartData = useMemo(() => {
    const { start, end } = getDateRange;
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return [];
    }

    const { type } = getAggregationDetails(start, end, timeRange);

    const dataMap = new Map<string, ChartDataPoint>();

    // 1. Initialize Map with ALL intervals
    if (type === 'day') {
      const intervals = eachDayOfInterval({ start, end });
      intervals.forEach(date => {
        const key = format(date, 'yyyy-MM-dd');
        dataMap.set(key, {
          dateKey: key,
          label: format(date, 'd.M.'),
          fullLabel: format(date, 'd. MMMM yyyy', { locale: cs }),
          costCzk: 0,
          tokens: 0,
          orderDate: date,
          operations: {}
        });
      });
    } else if (type === 'week') {
      const intervals = eachWeekOfInterval({ start, end }, { locale: cs });
      intervals.forEach(date => {
        const isoWeek = getISOWeek(date);
        const year = getYear(date);
        const key = `${year}-W${isoWeek}`;
        const weekStart = startOfWeek(date, { locale: cs });
        const weekEnd = endOfWeek(date, { locale: cs });

        dataMap.set(key, {
          dateKey: key,
          label: `T${isoWeek}`,
          fullLabel: `Týden ${isoWeek} (${format(weekStart, 'd.M.')} - ${format(weekEnd, 'd.M.yyyy')})`,
          costCzk: 0,
          tokens: 0,
          orderDate: date,
          operations: {}
        });
      });
    } else if (type === 'month') {
      const intervals = eachMonthOfInterval({ start, end });
      intervals.forEach(date => {
        const key = format(date, 'yyyy-MM');
        dataMap.set(key, {
          dateKey: key,
          label: format(date, 'LLL', { locale: cs }),
          fullLabel: format(date, 'LLLL yyyy', { locale: cs }),
          costCzk: 0,
          tokens: 0,
          orderDate: date,
          operations: {}
        });
      });
    }

    // 2. Fill with Data
    filteredLogs.forEach(log => {
      const logDate = parseISO(log.timestamp);
      // (Already filtered by date range in filteredLogs, but need key generation)

      let key = '';
      if (type === 'day') {
        key = format(logDate, 'yyyy-MM-dd');
      } else if (type === 'week') {
        const isoWeek = getISOWeek(logDate);
        const year = getYear(logDate);
        key = `${year}-W${isoWeek}`;
      } else if (type === 'month') {
        key = format(logDate, 'yyyy-MM');
      }

      const entry = dataMap.get(key);
      if (entry) {
        entry.costCzk += log.costCzk || 0;
        entry.tokens += log.totalTokens || 0;

        // Breakdown
        const op = normalizeOperation(log.operation || 'unknown');
        if (!entry.operations[op]) {
          entry.operations[op] = 0;
        }
        entry.operations[op] += log.costCzk || 0;
      }
    });

    return Array.from(dataMap.values()).sort((a, b) => a.orderDate.getTime() - b.orderDate.getTime());

  }, [filteredLogs, timeRange, getDateRange]);

  const maxChartValue = useMemo(() => {
    return Math.max(...chartData.map(d => d.costCzk), 0);
  }, [chartData]);

  // Stránkování - vypočítat zobrazené logy
  // UPDATED: Now paginates FILTERED logs instead of all logs to respect consistent view
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredLogs.slice(startIndex, endIndex); // <--- Changed from stats.logs
  }, [filteredLogs, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage, timeRange, customStart, customEnd]); // Reset page when filter changes

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

  const chartTotalCzk = useMemo(() => {
    return chartData.reduce((sum, d) => sum + d.costCzk, 0);
  }, [chartData]);

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto">
        <PageHeader
          section={sectionTheme}
          title="Náklady na AI"
          description="Tracking usage a nákladů na AI modely"
          onBack={onBack}
        />
        <div className="text-center p-12">Načítání statistik...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      <PageHeader
        section={sectionTheme}
        title="Náklady na AI"
        description="Tracking usage a nákladů na AI modely"
        onBack={onBack}
      />

      {/* GLOBAL FILTERS - CONTROL BAR */}
      <Card className="mb-6">
        <CardBody className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Left: Time Range Selector (Global) */}
          <div className="flex flex-col sm:flex-row gap-3 items-center w-full md:w-auto">
            <div className="flex items-center gap-2 text-gray-700 font-medium whitespace-nowrap">
              <Clock className="w-5 h-5 text-gray-500" />
              <span>Období:</span>
            </div>

            <div className="flex bg-gray-100 p-1 rounded-lg overflow-x-auto max-w-full">
              {(['7d', '30d', '90d', '1y', 'custom'] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${timeRange === range
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  {range === '7d' ? '7 dní' :
                    range === '30d' ? '30 dní' :
                      range === '90d' ? '3 měsíce' :
                        range === '1y' ? 'Rok' : 'Vlastní'}
                </button>
              ))}
            </div>

            {/* Custom inputs */}
            {timeRange === 'custom' && (
              <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                <div className="relative">
                  <input
                    type="date"
                    className="pl-8 pr-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                  />
                  <Calendar className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
                <span className="text-gray-400">-</span>
                <div className="relative">
                  <input
                    type="date"
                    className="pl-8 pr-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                  />
                  <Calendar className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
              </div>
            )}
          </div>

          {/* Right: User Selector (Admin Only) - Separated or integrated */}
          {isAdmin && (
            <div className="flex items-center gap-3 w-full md:w-auto border-t md:border-t-0 md:border-l border-gray-200 pt-4 md:pt-0 md:pl-6 mt-2 md:mt-0">
              <div className="flex items-center gap-2 text-gray-700 font-medium whitespace-nowrap min-w-fit">
                <Filter className="w-4 h-4 text-gray-500" />
                <span>Filtr:</span>
              </div>
              <div className="relative w-full md:w-[250px]">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  className="w-full pl-10 pr-4 py-1.5 bg-white border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 appearance-none shadow-sm"
                  value={selectedUserId || ''}
                  onChange={(e) => setSelectedUserId(e.target.value || null)}
                >
                  <option value="">Všichni uživatelé (Globální)</option>
                  {users.map(user => (
                    <option key={user.userId} value={user.userId}>
                      {user.displayName} ({user.email})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* NEW Summary Card - Cost Distribution */}
      <Card className="mb-6 overflow-visible">
        <CardBody className="p-0 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-100">
          {/* Left Column: Totals */}
          <div className="p-6 md:w-1/3 flex flex-col justify-center items-center text-center bg-gray-50/50">
            <div className="mb-4 p-4 bg-orange-100/50 rounded-full">
              <DollarSign className="w-8 h-8 text-orange-600" />
            </div>
            {/* Cleaned Title - Removed confusing "(30d)" suffix */}
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">Celkové náklady</h3>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {formatCost(summaryStats.totalCzk, 'czk')}
            </div>
            <div className="text-sm text-gray-400 font-medium mb-4">
              {formatCost(summaryStats.totalUsd, 'usd')}
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
              <Activity className="w-3 h-3" />
              {summaryStats.totalCalls} volání
            </div>
          </div>

          {/* Right Column: Breakdown */}
          <div className="p-6 md:w-2/3">
            <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              Rozložení nákladů
              <span className="text-xs font-normal text-gray-400 ml-auto">Top 5 operací</span>
            </h4>
            <div className="space-y-3">
              {summaryStats.operations.length === 0 ? (
                <div className="text-center py-4 text-gray-400 text-sm">Žádná data pro toto období</div>
              ) : (
                summaryStats.operations.slice(0, 5).map(op => {
                  const percent = summaryStats.totalCzk > 0 ? (op.totalCzk / summaryStats.totalCzk) * 100 : 0;
                  return (
                    <div key={op.key} className="group relative">
                      {/* Row */}
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-700">{op.name}</span>
                          {/* Tooltip Info Icon */}
                          {op.topUsers.length > 0 && isAdmin && (
                            <Info className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-gray-900">{formatCost(op.totalCzk, 'czk')}</span>
                          <span className="text-xs text-gray-400 ml-2 w-8 inline-block text-right">{percent.toFixed(0)}%</span>
                        </div>
                      </div>
                      {/* Bar */}
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      {/* Tooltip: Top Users */}
                      {op.topUsers.length > 0 && isAdmin && (
                        <div className="absolute left-0 bottom-full mb-2 w-64 bg-white rounded-lg shadow-xl border border-gray-100 p-3 opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                          <div className="text-xs font-semibold text-gray-900 mb-2 pb-2 border-b border-gray-100">
                            Top uživatelé ({op.name})
                          </div>
                          <div className="space-y-2">
                            {op.topUsers.map((u, i) => (
                              <div key={u.userId} className="flex justify-between items-center text-xs">
                                <div className="flex items-center gap-2 truncate">
                                  <span className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center text-[9px] text-gray-500 font-bold">
                                    {i + 1}
                                  </span>
                                  <div className="flex flex-col truncate">
                                    <span className="font-medium text-gray-700 truncate max-w-[120px]">{u.name}</span>
                                  </div>
                                </div>
                                <span className="font-mono text-gray-500">{formatCost(u.cost, 'czk')}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </CardBody>
      </Card>


      {/* Development Chart Trend */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Vývoj nákladů</h2>
            </div>
            {/* Range controls moved to top - only summary text remains */}
          </div>
        </CardHeader>
        <CardBody>
          <div className="mb-2">
            <div className="text-sm text-gray-500 text-right">
              Celkem za období: <span className="font-bold text-gray-900">
                {formatCost(chartTotalCzk, 'czk')}
              </span>
            </div>
          </div>

          {chartData.length > 0 ? (
            <SimpleBarChart data={chartData} maxVal={maxChartValue} />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
              Žádná data pro vybrané období
            </div>
          )}
        </CardBody>
      </Card>

      {/* Historie volání */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Historie volání
              <span className="text-xs font-normal text-gray-500 ml-2">
                (Zobrazeno {paginatedLogs.length} z {filteredLogs.length} ve vybraném období)
              </span>
            </h2>
            {stats.logs.length > 0 && (
              <Button
                variant="danger"
                size="sm"
                onClick={handleClearLog}
                leftIcon={<Trash2 className="w-4 h-4" />}
              >
                Smazat historii
              </Button>
            )}
          </div>
        </CardHeader>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Čas</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Model</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Operace</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Input</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Output</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">USD</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Kč</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedLogs.map((log, index) => (
                  <tr key={log.id || index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">{new Date(log.timestamp).toLocaleString('cs-CZ')}</td>
                    <td className="px-3 py-3 text-xs font-medium text-gray-800 truncate max-w-[150px]" title={log.model}>{log.model}</td>
                    <td className="px-3 py-3 text-xs text-gray-600 truncate max-w-[120px]" title={log.operation}>{getOperationName(log.operation)}</td>
                    <td className="px-3 py-3 text-xs text-right text-gray-600 whitespace-nowrap">{(log.promptTokens || 0).toLocaleString()}</td>
                    <td className="px-3 py-3 text-xs text-right text-gray-600 whitespace-nowrap">{(log.completionTokens || 0).toLocaleString()}</td>
                    <td className="px-3 py-3 text-xs text-right font-medium text-gray-800 whitespace-nowrap">{(log.totalTokens || 0).toLocaleString()}</td>
                    <td className="px-3 py-3 text-xs text-right font-bold text-green-600 whitespace-nowrap">{formatCost(log.costUsd || 0, 'usd')}</td>
                    <td className="px-3 py-3 text-xs text-right font-bold text-orange-600 whitespace-nowrap">{formatCost(log.costCzk || 0, 'czk')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredLogs.length === 0 && (
              <p className="text-gray-500 text-center py-8">V tomto období nebyla nalezena žádná data</p>
            )}
            {filteredLogs.length > 0 && (
              <div className="mt-4">
                <Pagination
                  currentPage={currentPage}
                  totalItems={filteredLogs.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setItemsPerPage}
                />
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Bottom Action buttons */}
      <div className="flex justify-end gap-4 mt-8">
        <Button variant="ghost" onClick={onBack} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Zpět do nastavení
        </Button>
      </div>
    </div>
  );
};

export default AIUsageStatsScreen;
