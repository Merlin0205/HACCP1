import React, { useState, useMemo } from 'react';
import { Operator, Premise } from '../types';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedOperatorIds, setExpandedOperatorIds] = useState<Set<string>>(new Set());

  const handleDeleteOperatorRequest = (operatorId: string) => {
    setDeletingOperatorId(operatorId);
  };

  const handleDeleteOperatorConfirm = () => {
    if (deletingOperatorId) {
      onDeleteOperator(deletingOperatorId);
      setDeletingOperatorId(null);
    }
  };

  const handleDeleteOperatorCancel = () => {
    setDeletingOperatorId(null);
  };

  const handleDeletePremiseRequest = (premiseId: string) => {
    setDeletingPremiseId(premiseId);
  };

  const handleDeletePremiseConfirm = () => {
    if (deletingPremiseId) {
      onDeletePremise(deletingPremiseId);
      setDeletingPremiseId(null);
    }
  };

  const handleDeletePremiseCancel = () => {
    setDeletingPremiseId(null);
  };

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

  const premisesByOperator = useMemo(() => {
    const map = new Map<string, Premise[]>();
    premises.forEach(premise => {
      const existing = map.get(premise.operatorId) || [];
      map.set(premise.operatorId, [...existing, premise]);
    });
    return map;
  }, [premises]);

  const filteredData = useMemo(() => {
    if (!searchTerm) {
      return { operators: operators, matchingPremises: new Map<string, Premise[]>() };
    }

    const term = searchTerm.toLowerCase();
    const filteredOperators: Operator[] = [];
    const matchingPremises = new Map<string, Premise[]>();

    operators.forEach(operator => {
      const operatorMatches = 
        operator.operator_name?.toLowerCase().includes(term) ||
        operator.operator_ico?.toLowerCase().includes(term) ||
        operator.operator_address?.toLowerCase().includes(term);

      const operatorPremises = premisesByOperator.get(operator.id) || [];
      const matchingPremisesForOperator = operatorPremises.filter(premise =>
        premise.premise_name?.toLowerCase().includes(term) ||
        premise.premise_address?.toLowerCase().includes(term)
      );

      if (operatorMatches || matchingPremisesForOperator.length > 0) {
        filteredOperators.push(operator);
        if (matchingPremisesForOperator.length > 0) {
          matchingPremises.set(operator.id, matchingPremisesForOperator);
        }
      }
    });

    return { operators: filteredOperators, matchingPremises };
  }, [operators, premisesByOperator, searchTerm]);

  return (
    <>
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 text-center sm:text-left">
            Provozovatelé a pracoviště
          </h1>
          <p className="text-sm sm:text-base text-gray-600 text-center sm:text-left">
            Spravujte provozovatele a jejich pracoviště
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-4 sm:p-6 border border-blue-100 shadow-sm">
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Hledat provozovatele nebo pracoviště..."
              className="w-full pl-12 pr-12 py-3 sm:py-4 text-sm sm:text-base bg-white border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Stats and Add Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="text-sm sm:text-base text-gray-700">
              {searchTerm ? (
                <span>
                  Nalezeno: <span className="font-bold text-blue-600">{filteredData.operators.length}</span> provozovatelů
                </span>
              ) : (
                <span>
                  Celkem: <span className="font-bold text-gray-900">{operators.length}</span> provozovatelů, <span className="font-bold text-gray-900">{premises.length}</span> pracovišť
                </span>
              )}
            </div>
            <button 
              onClick={onAddNewOperator}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nový provozovatel
            </button>
          </div>
        </div>

        {/* Operators List */}
        <div className="space-y-3 sm:space-y-4">
          {filteredData.operators.length > 0 ? (
            filteredData.operators.map(operator => {
              const operatorPremises = premisesByOperator.get(operator.id) || [];
              const isExpanded = expandedOperatorIds.has(operator.id);
              const matchingPremises = filteredData.matchingPremises.get(operator.id);

              return (
                <div key={operator.id} className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow border border-gray-100 overflow-hidden">
                  {/* Operator Header */}
                  <div 
                    className="p-4 sm:p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleOperator(operator.id)}
                  >
                    <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-1 sm:mt-0">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                          <svg 
                            className={`w-5 h-5 sm:w-6 sm:h-6 text-white transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-grow min-w-0">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 truncate">
                          {operator.operator_name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            IČO: {operator.operator_ico}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="truncate max-w-[200px] sm:max-w-none">{operator.operator_address}</span>
                          </span>
                        </div>
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {operatorPremises.length} {operatorPremises.length === 1 ? 'pracoviště' : 'pracovišť'}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex-shrink-0 flex flex-col sm:flex-row gap-2" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => onEditOperator(operator.id)}
                          className="p-2 sm:px-4 sm:py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors"
                          title="Upravit"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => handleDeleteOperatorRequest(operator.id)}
                          className="p-2 sm:px-4 sm:py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                          title="Smazat"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => onAddPremise(operator.id)}
                          className="p-2 sm:px-4 sm:py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                          title="Přidat pracoviště"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Premises List */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-gray-50">
                      {operatorPremises.length > 0 ? (
                        <div className="p-4 sm:p-6 space-y-3">
                          {operatorPremises.map(premise => (
                            <div 
                              key={premise.id} 
                              className={`p-4 rounded-xl border-2 transition-all ${
                                matchingPremises?.some(p => p.id === premise.id) 
                                  ? 'bg-yellow-50 border-yellow-300 shadow-md' 
                                  : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                                <div className="flex-grow min-w-0">
                                  <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                      </svg>
                                    </div>
                                    <div className="flex-grow min-w-0">
                                      <h4 className="font-semibold text-gray-900 mb-1 truncate">{premise.premise_name}</h4>
                                      <p className="text-sm text-gray-600 mb-1 truncate">{premise.premise_address}</p>
                                      {premise.premise_responsible_person && (
                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                          </svg>
                                          {premise.premise_responsible_person}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-wrap sm:flex-nowrap gap-2">
                                  <button 
                                    onClick={() => onEditPremise(premise.id)}
                                    className="flex-1 sm:flex-none px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Upravit
                                  </button>
                                  <button 
                                    onClick={() => handleDeletePremiseRequest(premise.id)}
                                    className="flex-1 sm:flex-none px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Smazat
                                  </button>
                                  <button 
                                    onClick={() => onSelectPremise(premise.id)}
                                    className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Audity
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {/* Add Premise Button */}
                          <button
                            onClick={() => onAddPremise(operator.id)}
                            className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 font-semibold text-sm sm:text-base"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Přidat další pracoviště
                          </button>
                        </div>
                      ) : (
                        <div className="p-8 text-center">
                          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <p className="text-gray-500 mb-4">Zatím žádná pracoviště</p>
                          <button
                            onClick={() => onAddPremise(operator.id)}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                          >
                            + Přidat první pracoviště
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl border-2 border-dashed border-gray-300">
              {searchTerm ? (
                <>
                  <svg className="w-20 h-20 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-gray-600 text-lg font-semibold mb-2">Žádní provozovatelé nenalezeni</p>
                  <p className="text-gray-500 mb-4">Zkuste změnit vyhledávací termín</p>
                  <button
                    onClick={() => setSearchTerm('')}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Vymazat vyhledávání
                  </button>
                </>
              ) : (
                <>
                  <svg className="w-20 h-20 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-gray-600 text-lg font-semibold mb-2">Zatím nemáte žádné provozovatele</p>
                  <p className="text-gray-500 mb-6">Začněte kliknutím na tlačítko výše</p>
                  <button
                    onClick={onAddNewOperator}
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold shadow-lg hover:shadow-xl"
                  >
                    + Vytvořit prvního provozovatele
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Operator Modal */}
      {deletingOperatorId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900">Potvrdit smazání</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Opravdu si přejete smazat tohoto provozovatele a všechna jeho pracoviště včetně auditů? Tato akce je nevratná.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleDeleteOperatorCancel}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-800 rounded-xl hover:bg-gray-200 transition-colors font-medium"
              >
                Zrušit
              </button>
              <button
                onClick={handleDeleteOperatorConfirm}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-semibold shadow-md"
              >
                Smazat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Premise Modal */}
      {deletingPremiseId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900">Potvrdit smazání</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Opravdu si přejete smazat toto pracoviště a všechny jeho audity? Tato akce je nevratná.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleDeletePremiseCancel}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-800 rounded-xl hover:bg-gray-200 transition-colors font-medium"
              >
                Zrušit
              </button>
              <button
                onClick={handleDeletePremiseConfirm}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-semibold shadow-md"
              >
                Smazat
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
