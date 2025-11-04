import React, { useState, useMemo, Fragment } from 'react';
import { Operator, Premise } from '../types';
import { Card, CardHeader, CardBody } from './ui/Card';
import { TextField } from './ui/Input';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { PlusIcon, EditIcon, TrashIcon, ChevronDownIcon } from './icons';
import { PageHeader } from './PageHeader';
import { SECTION_THEMES } from '../constants/designSystem';
import { AppState } from '../types';

interface OperatorDashboardProps {
  operators: Operator[];
  premises: Premise[];
  onSelectPremise: (premiseId: string) => void;
  onAddNewOperator: () => void;
  onEditOperator: (operatorId: string) => void;
  onDeleteOperator: (operatorId: string) => void;
  onAddPremise: (operatorId: string) => void;
  onEditPremise: (premiseId: string) => void;
  onDeletePremise: (premiseId: string) => void;
}

type SortField = 'name' | 'ico' | 'address' | 'premises';
type SortDirection = 'asc' | 'desc';

export const OperatorDashboard: React.FC<OperatorDashboardProps> = ({ 
  operators, 
  premises,
  onSelectPremise, 
  onAddNewOperator, 
  onEditOperator, 
  onDeleteOperator,
  onAddPremise,
  onEditPremise,
  onDeletePremise
}) => {
  const [deletingOperatorId, setDeletingOperatorId] = useState<string | null>(null);
  const [deletingPremiseId, setDeletingPremiseId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOperatorIds, setExpandedOperatorIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const premisesByOperator = useMemo(() => {
    const map = new Map<string, Premise[]>();
    premises.forEach(premise => {
      const existing = map.get(premise.operatorId) || [];
      map.set(premise.operatorId, [...existing, premise]);
    });
    return map;
  }, [premises]);

  const filteredAndSortedOperators = useMemo(() => {
    let filtered = operators;

    // Vyhledávání
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(operator => {
        const operatorMatches = 
          operator.operator_name?.toLowerCase().includes(query) ||
          operator.operator_ico?.toLowerCase().includes(query) ||
          operator.operator_address?.toLowerCase().includes(query);
        
        const operatorPremises = premisesByOperator.get(operator.id) || [];
        const premiseMatches = operatorPremises.some(premise =>
          premise.premise_name?.toLowerCase().includes(query) ||
          premise.premise_address?.toLowerCase().includes(query)
        );

        return operatorMatches || premiseMatches;
      });
    }

    // Řazení
    filtered = [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.operator_name || '';
          bValue = b.operator_name || '';
          break;
        case 'ico':
          aValue = a.operator_ico || '';
          bValue = b.operator_ico || '';
          break;
        case 'address':
          aValue = a.operator_address || '';
          bValue = b.operator_address || '';
          break;
        case 'premises':
          aValue = (premisesByOperator.get(a.id) || []).length;
          bValue = (premisesByOperator.get(b.id) || []).length;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [operators, premisesByOperator, searchQuery, sortField, sortDirection]);

  const toggleOperator = (operatorId: string) => {
    setExpandedOperatorIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(operatorId)) {
        newSet.delete(operatorId);
      } else {
        newSet.add(operatorId);
      }
      return newSet;
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon: React.FC<{ field: SortField }> = ({ field }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 ml-1 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 ml-1 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto">
      <PageHeader
        section={SECTION_THEMES[AppState.OPERATOR_DASHBOARD]}
        title="Zákazníci"
        description="Správa provozovatelů a pracovišť"
        action={
          <Button
            variant="primary"
            size="lg"
            onClick={onAddNewOperator}
            leftIcon={<PlusIcon className="h-5 w-5" />}
          >
            Přidat zákazníka
          </Button>
        }
      />

      {/* Filters */}
      <Card className="mb-6">
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField
              label="Vyhledávání"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Název, IČO, adresa..."
              leftIcon={
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
            <div className="flex items-end justify-end">
              <p className="text-sm text-gray-600">
                Zobrazeno: <span className="font-semibold text-primary">{filteredAndSortedOperators.length}</span> z <span className="font-semibold text-primary">{operators.length}</span>
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Celkem: <span className="font-semibold text-primary">{operators.length}</span> provozovatelů,{' '}
              <span className="font-semibold text-primary">{premises.length}</span> pracovišť
            </p>
          </div>
        </CardBody>
      </Card>

      {/* Table - Desktop */}
      <Card className="overflow-hidden hidden md:block">
        <CardBody className="p-0 overflow-x-auto">
          <table className="w-full">
            <thead className={`bg-gradient-to-r ${SECTION_THEMES[AppState.OPERATOR_DASHBOARD].colors.gradient}`}>
              <tr>
                <th
                  className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider cursor-pointer hover:bg-emerald-600/80 transition-colors rounded-tl-lg"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    PROVOZOVATEL
                    <SortIcon field="name" />
                  </div>
                </th>
                <th
                  className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider cursor-pointer hover:bg-emerald-600/80 transition-colors"
                  onClick={() => handleSort('ico')}
                >
                  <div className="flex items-center gap-2">
                    IČO
                    <SortIcon field="ico" />
                  </div>
                </th>
                <th
                  className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider cursor-pointer hover:bg-emerald-600/80 transition-colors"
                  onClick={() => handleSort('address')}
                >
                  <div className="flex items-center gap-2">
                    ADRESA
                    <SortIcon field="address" />
                  </div>
                </th>
                <th
                  className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider cursor-pointer hover:bg-emerald-600/80 transition-colors"
                  onClick={() => handleSort('premises')}
                >
                  <div className="flex items-center gap-2">
                    PRACOVIŠTĚ
                    <SortIcon field="premises" />
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                  KONTAKT
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider rounded-tr-lg">
                  AKCE
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredAndSortedOperators.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 mb-1">Žádní provozovatelé nenalezeni</p>
                      <p className="text-sm text-gray-600">Zkuste upravit vyhledávání nebo vytvořte nového provozovatele</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndSortedOperators.map((operator, index) => {
                  const operatorPremises = premisesByOperator.get(operator.id) || [];
                  const isExpanded = expandedOperatorIds.has(operator.id);
                  const isLastRow = index === filteredAndSortedOperators.length - 1;

                  return (
                    <Fragment key={operator.id}>
                      <tr className="hover:bg-primary-light/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            <div className="relative group inline-block">
                              <span className="cursor-help">{operator.operator_name || '-'}</span>
                              {/* Tooltip s kompletními informacemi */}
                              <div className={`absolute left-0 ${isLastRow ? 'bottom-full mb-2' : 'top-full mt-2'} px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] min-w-[250px] max-w-[350px]`}>
                                <div className="space-y-1.5">
                                  <div className="font-bold text-sm mb-2 pb-2 border-b border-gray-700">{operator.operator_name || 'Neznámý provozovatel'}</div>
                                  {operator.operator_ico && (
                                    <div className="flex items-start gap-2">
                                      <span className="font-semibold text-gray-300 min-w-[50px]">IČO:</span>
                                      <span className="text-white">{operator.operator_ico}</span>
                                    </div>
                                  )}
                                  {operator.operator_address && (
                                    <div className="flex items-start gap-2">
                                      <span className="font-semibold text-gray-300 min-w-[50px]">Adresa:</span>
                                      <span className="text-white">{operator.operator_address}</span>
                                    </div>
                                  )}
                                  {operator.operator_phone && (
                                    <div className="flex items-start gap-2">
                                      <span className="font-semibold text-gray-300 min-w-[50px]">Telefon:</span>
                                      <span className="text-white">{operator.operator_phone}</span>
                                    </div>
                                  )}
                                  {operator.operator_email && (
                                    <div className="flex items-start gap-2">
                                      <span className="font-semibold text-gray-300 min-w-[50px]">Email:</span>
                                      <span className="text-white break-all">{operator.operator_email}</span>
                                    </div>
                                  )}
                                  <div className="flex items-start gap-2 pt-1 border-t border-gray-700">
                                    <span className="font-semibold text-gray-300 min-w-[50px]">Pracovišť:</span>
                                    <span className="text-white">{operatorPremises.length}</span>
                                  </div>
                                </div>
                                {/* Šipka tooltipu */}
                                <div className={`absolute ${isLastRow ? 'top-full' : 'bottom-full'} left-4 w-0 h-0 border-l-4 border-r-4 ${isLastRow ? 'border-t-4 border-transparent border-t-gray-900' : 'border-b-4 border-transparent border-b-gray-900'}`}></div>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {operator.operator_ico || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
                          <div className="truncate" title={operator.operator_address || ''}>
                            {operator.operator_address || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {operatorPremises.length > 0 ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleOperator(operator.id);
                              }}
                              className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer group"
                              title={isExpanded ? "Skrýt pracoviště" : "Zobrazit pracoviště"}
                            >
                              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold group-hover:bg-green-200 transition-colors">
                                {operatorPremises.length}
                              </span>
                              <span className="text-sm text-gray-600">pracovišť</span>
                              <ChevronDownIcon 
                                className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                              />
                            </button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                                0
                              </span>
                              <span className="text-sm text-gray-400">pracovišť</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <div className="flex flex-col gap-1">
                            {operator.operator_phone && (
                              <div className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <span className="truncate">{operator.operator_phone}</span>
                              </div>
                            )}
                            {operator.operator_email && (
                              <div className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span className="truncate">{operator.operator_email}</span>
                              </div>
                            )}
                            {!operator.operator_phone && !operator.operator_email && <span>-</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditOperator(operator.id);
                              }}
                              className="p-2 rounded-lg hover:bg-blue-50 transition-colors text-blue-600 hover:text-blue-700"
                              title="Upravit"
                            >
                              <EditIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingOperatorId(operator.id);
                              }}
                              className="p-2 rounded-lg hover:bg-red-50 transition-colors text-red-600 hover:text-red-700"
                              title="Smazat"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {/* Collapsible sekce s pracovišti */}
                      {(() => {
                        const hasPremises = operatorPremises.length > 0;
                        const isExpanded = expandedOperatorIds.has(operator.id);
                        
                        if (!hasPremises || !isExpanded) return null;
                        
                        return (
                          <>
                            {operatorPremises.map((premise, premiseIndex) => {
                              const isLastPremise = premiseIndex === operatorPremises.length - 1 && isLastRow;
                              return (
                                <tr key={premise.id} className="bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-purple-50/80 hover:from-blue-100/90 hover:via-indigo-100/70 hover:to-purple-100/90 transition-all duration-200 border-l-4 border-blue-500/30 shadow-sm">
                                  <td className="px-6 py-3.5">
                                    <div className="flex items-center gap-2 pl-4">
                                      <div className="relative group">
                                        <span className="font-semibold text-gray-900 text-sm cursor-help">{premise.premise_name || 'N/A'}</span>
                                        {/* Tooltip s kompletními informacemi o pracovišti */}
                                        <div className={`absolute left-0 ${isLastPremise ? 'bottom-full mb-2' : 'top-full mt-2'} px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] min-w-[250px] max-w-[350px]`}>
                                          <div className="space-y-1.5">
                                            <div className="font-bold text-sm mb-2 pb-2 border-b border-gray-700">{premise.premise_name || 'Neznámé pracoviště'}</div>
                                            {premise.premise_address && (
                                              <div className="flex items-start gap-2">
                                                <span className="font-semibold text-gray-300 min-w-[60px]">Adresa:</span>
                                                <span className="text-white">{premise.premise_address}</span>
                                              </div>
                                            )}
                                            {premise.premise_responsible_person && (
                                              <div className="flex items-start gap-2">
                                                <span className="font-semibold text-gray-300 min-w-[60px]">Odpovědná osoba:</span>
                                                <span className="text-white">{premise.premise_responsible_person}</span>
                                              </div>
                                            )}
                                            {premise.premise_phone && (
                                              <div className="flex items-start gap-2">
                                                <span className="font-semibold text-gray-300 min-w-[60px]">Telefon:</span>
                                                <span className="text-white">{premise.premise_phone}</span>
                                              </div>
                                            )}
                                            {premise.premise_email && (
                                              <div className="flex items-start gap-2">
                                                <span className="font-semibold text-gray-300 min-w-[60px]">Email:</span>
                                                <span className="text-white break-all">{premise.premise_email}</span>
                                              </div>
                                            )}
                                          </div>
                                          {/* Šipka tooltipu */}
                                          <div className={`absolute ${isLastPremise ? 'top-full' : 'bottom-full'} left-4 w-0 h-0 border-l-4 border-r-4 ${isLastPremise ? 'border-t-4 border-transparent border-t-gray-900' : 'border-b-4 border-transparent border-b-gray-900'}`}></div>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-3.5 text-sm text-gray-400 font-medium">-</td>
                                  <td className="px-6 py-3.5 text-sm text-gray-700">
                                    <div className="flex items-center gap-2">
                                      <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                      </svg>
                                      <span className="font-medium">{premise.premise_address || '-'}</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-3.5 text-sm text-gray-400 font-medium">-</td>
                                  <td className="px-6 py-3.5 text-sm text-gray-700">
                                    <div className="flex flex-col gap-2">
                                      {premise.premise_phone && (
                                        <div className="flex items-center gap-2">
                                          <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                          </svg>
                                          <span className="truncate font-medium">{premise.premise_phone}</span>
                                        </div>
                                      )}
                                      {premise.premise_email && (
                                        <div className="flex items-center gap-2">
                                          <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                          </svg>
                                          <span className="truncate font-medium">{premise.premise_email}</span>
                                        </div>
                                      )}
                                      {!premise.premise_phone && !premise.premise_email && <span>-</span>}
                                    </div>
                                  </td>
                                  <td className="px-6 py-3.5 whitespace-nowrap text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onSelectPremise(premise.id);
                                        }}
                                        className="p-1 rounded hover:bg-emerald-50 transition-colors text-emerald-600 hover:text-emerald-700"
                                        title="Zobrazit audity"
                                      >
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onEditPremise(premise.id);
                                        }}
                                        className="p-1 rounded hover:bg-blue-50 transition-colors text-blue-600 hover:text-blue-700"
                                        title="Upravit pracoviště"
                                      >
                                        <EditIcon className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeletingPremiseId(premise.id);
                                        }}
                                        className="p-1 rounded hover:bg-red-50 transition-colors text-red-600 hover:text-red-700"
                                        title="Smazat pracoviště"
                                      >
                                        <TrashIcon className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                            <tr className="bg-gradient-to-r from-slate-50/80 to-slate-100/60">
                              <td colSpan={6} className="px-6 py-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAddPremise(operator.id);
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                                >
                                  <PlusIcon className="h-3.5 w-3.5" />
                                  Přidat pracoviště
                                </button>
                              </td>
                            </tr>
                          </>
                        );
                      })()}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {/* Cards - Mobile */}
      <div className="md:hidden space-y-3 mb-20">
        {filteredAndSortedOperators.length === 0 ? (
          <Card>
            <CardBody className="py-16 text-center">
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-lg font-semibold text-gray-900 mb-1">Žádní provozovatelé nenalezeni</p>
                <p className="text-sm text-gray-600">Zkuste upravit vyhledávání nebo vytvořte nového provozovatele</p>
              </div>
            </CardBody>
          </Card>
        ) : (
          filteredAndSortedOperators.map((operator) => {
            const operatorPremises = premisesByOperator.get(operator.id) || [];
            const isExpanded = expandedOperatorIds.has(operator.id);

            return (
              <Fragment key={operator.id}>
                <Card
                  onClick={() => toggleOperator(operator.id)}
                  className="cursor-pointer hover:shadow-lg transition-all"
                >
                  <CardBody>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="relative group">
                          <h3 className="text-base font-bold text-gray-900 mb-1 cursor-help">{operator.operator_name}</h3>
                          {/* Tooltip s kompletními informacemi */}
                          <div className="absolute left-0 top-full mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] min-w-[250px] max-w-[350px]">
                            <div className="space-y-1.5">
                              <div className="font-bold text-sm mb-2 pb-2 border-b border-gray-700">{operator.operator_name || 'Neznámý provozovatel'}</div>
                              {operator.operator_ico && (
                                <div className="flex items-start gap-2">
                                  <span className="font-semibold text-gray-300 min-w-[50px]">IČO:</span>
                                  <span className="text-white">{operator.operator_ico}</span>
                                </div>
                              )}
                              {operator.operator_address && (
                                <div className="flex items-start gap-2">
                                  <span className="font-semibold text-gray-300 min-w-[50px]">Adresa:</span>
                                  <span className="text-white">{operator.operator_address}</span>
                                </div>
                              )}
                              {operator.operator_phone && (
                                <div className="flex items-start gap-2">
                                  <span className="font-semibold text-gray-300 min-w-[50px]">Telefon:</span>
                                  <span className="text-white">{operator.operator_phone}</span>
                                </div>
                              )}
                              {operator.operator_email && (
                                <div className="flex items-start gap-2">
                                  <span className="font-semibold text-gray-300 min-w-[50px]">Email:</span>
                                  <span className="text-white break-all">{operator.operator_email}</span>
                                </div>
                              )}
                              <div className="flex items-start gap-2 pt-1 border-t border-gray-700">
                                <span className="font-semibold text-gray-300 min-w-[50px]">Pracovišť:</span>
                                <span className="text-white">{operatorPremises.length}</span>
                              </div>
                            </div>
                            {/* Šipka tooltipu */}
                            <div className="absolute bottom-full left-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
                          </div>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          {operator.operator_ico && (
                            <div className="flex items-center gap-2">
                              <span>IČO: {operator.operator_ico}</span>
                            </div>
                          )}
                          {operator.operator_address && (
                            <div className="flex items-start gap-2">
                              <span className="line-clamp-2">{operator.operator_address}</span>
                            </div>
                          )}
                          {(operator.operator_phone || operator.operator_email) && (
                            <div className="flex flex-wrap gap-3 mt-2">
                              {operator.operator_phone && (
                                <div className="flex items-center gap-1 text-xs">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                  </svg>
                                  <span>{operator.operator_phone}</span>
                                </div>
                              )}
                              {operator.operator_email && (
                                <div className="flex items-center gap-1 text-xs">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                  <span className="truncate">{operator.operator_email}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="px-2.5 py-1 bg-primary-light/20 text-primary rounded-full text-xs font-semibold">
                            {operatorPremises.length} pracovišť
                          </span>
                          <svg 
                            className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditOperator(operator.id);
                          }}
                          className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                          title="Upravit"
                        >
                          <EditIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingOperatorId(operator.id);
                          }}
                          className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                          title="Smazat"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                    {isExpanded && operatorPremises.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleOperator(operator.id);
                          }}
                          className="w-full flex items-center justify-between p-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <svg className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            </div>
                            <span className="text-sm font-semibold text-blue-900">
                              Pracoviště ({operatorPremises.length} {operatorPremises.length === 1 ? 'pracoviště' : operatorPremises.length >= 2 && operatorPremises.length <= 4 ? 'pracoviště' : 'pracovišť'})
                            </span>
                          </div>
                          <svg
                            className={`h-4 w-4 text-blue-700 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <div className="mt-2 space-y-2">
                          {operatorPremises.map((premise) => (
                            <div
                              key={premise.id}
                              className="p-2.5 bg-white rounded-lg border-2 border-blue-200"
                            >
                              <div className="flex items-center gap-2 mb-1.5">
                                <div className="w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center flex-shrink-0 bg-blue-100 text-blue-900">
                                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                </div>
                                <div className="relative group">
                                  <span className="font-semibold text-gray-900 text-sm cursor-help">
                                    {premise.premise_name}
                                  </span>
                                  {/* Tooltip s kompletními informacemi o pracovišti */}
                                  <div className="absolute left-0 top-full mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] min-w-[250px] max-w-[350px]">
                                    <div className="space-y-1.5">
                                      <div className="font-bold text-sm mb-2 pb-2 border-b border-gray-700">{premise.premise_name || 'Neznámé pracoviště'}</div>
                                      {premise.premise_address && (
                                        <div className="flex items-start gap-2">
                                          <span className="font-semibold text-gray-300 min-w-[60px]">Adresa:</span>
                                          <span className="text-white">{premise.premise_address}</span>
                                        </div>
                                      )}
                                      {premise.premise_responsible_person && (
                                        <div className="flex items-start gap-2">
                                          <span className="font-semibold text-gray-300 min-w-[60px]">Odpovědná osoba:</span>
                                          <span className="text-white">{premise.premise_responsible_person}</span>
                                        </div>
                                      )}
                                      {premise.premise_phone && (
                                        <div className="flex items-start gap-2">
                                          <span className="font-semibold text-gray-300 min-w-[60px]">Telefon:</span>
                                          <span className="text-white">{premise.premise_phone}</span>
                                        </div>
                                      )}
                                      {premise.premise_email && (
                                        <div className="flex items-start gap-2">
                                          <span className="font-semibold text-gray-300 min-w-[60px]">Email:</span>
                                          <span className="text-white break-all">{premise.premise_email}</span>
                                        </div>
                                      )}
                                    </div>
                                    {/* Šipka tooltipu */}
                                    <div className="absolute bottom-full left-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectPremise(premise.id);
                                  }}
                                  className="flex-1 px-3 py-1.5 bg-gradient-to-br from-primary to-primary-dark text-white text-xs rounded-lg font-medium hover:shadow-md transition-all"
                                >
                                  Zobrazit audity
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEditPremise(premise.id);
                                  }}
                                  className="px-2 py-1.5 bg-blue-50 text-blue-700 text-xs rounded-lg border border-blue-200"
                                  title="Upravit"
                                >
                                  <EditIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletingPremiseId(premise.id);
                                  }}
                                  className="px-2 py-1.5 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200"
                                  title="Smazat"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddPremise(operator.id);
                            }}
                            className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors shadow-sm"
                          >
                            <PlusIcon className="h-3.5 w-3.5" />
                            Přidat pracoviště
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          fullWidth
                          onClick={(e) => {
                            e.stopPropagation();
                            // Pokud má pouze jedno pracoviště, otevřeme ho přímo
                            if (operatorPremises.length === 1) {
                              onSelectPremise(operatorPremises[0].id);
                            } else {
                              toggleOperator(operator.id);
                            }
                          }}
                          leftIcon={
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          }
                        >
                          {operatorPremises.length === 1 ? 'Zobrazit audity' : 'Zobrazit pracoviště'}
                        </Button>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </Fragment>
            );
          })
        )}
      </div>

      {/* FAB Button for Mobile */}
      <button
        onClick={onAddNewOperator}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-primary-dark to-primary text-white rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 transition-all flex items-center justify-center z-50"
        aria-label="Přidat nového provozovatele"
      >
        <PlusIcon className="h-6 w-6" />
      </button>

      {/* Delete Operator Modal */}
      <Modal
        isOpen={!!deletingOperatorId}
        onClose={() => setDeletingOperatorId(null)}
        title="Smazat provozovatele?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeletingOperatorId(null)}>
              Zrušit
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (deletingOperatorId) {
                  onDeleteOperator(deletingOperatorId);
                  setDeletingOperatorId(null);
                }
              }}
            >
              Smazat
            </Button>
          </>
        }
      >
        <p className="text-gray-600">
          Opravdu si přejete smazat tohoto provozovatele a všechna jeho pracoviště včetně auditů? Tato akce je nevratná.
        </p>
      </Modal>

      {/* Delete Premise Modal */}
      <Modal
        isOpen={!!deletingPremiseId}
        onClose={() => setDeletingPremiseId(null)}
        title="Smazat pracoviště?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeletingPremiseId(null)}>
              Zrušit
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (deletingPremiseId) {
                  onDeletePremise(deletingPremiseId);
                  setDeletingPremiseId(null);
                }
              }}
            >
              Smazat
            </Button>
          </>
        }
      >
        <p className="text-gray-600">
          Opravdu si přejete smazat toto pracoviště a všechny jeho audity? Tato akce je nevratná.
        </p>
      </Modal>
    </div>
  );
};
