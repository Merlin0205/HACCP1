import React, { useState, useMemo } from 'react';
import { Operator, Premise } from '../types';
import { Card, CardHeader, CardBody, CardFooter } from './ui/Card';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { PlusIcon, EditIcon, TrashIcon } from './icons';

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

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Header with Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Zákazníci</h1>
          <p className="text-gray-600 text-sm sm:text-base">Správa provozovatelů a pracovišť</p>
        </div>
        <Button
          variant="primary"
          size="lg"
          onClick={onAddNewOperator}
          leftIcon={<PlusIcon className="h-5 w-5" />}
        >
          Přidat zákazníka
        </Button>
      </div>

      {/* Search Bar - Sticky */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 pb-4 mb-6 pt-2">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Hledat provozovatele nebo pracoviště..."
            className="w-full pl-12 pr-12 py-3 bg-gray-50 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
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
      </div>

      {/* Stats */}
      <div className="mb-6 text-sm text-gray-600">
        {searchTerm ? (
          <span>Nalezeno: <span className="font-semibold text-gray-900">{filteredData.operators.length}</span> provozovatelů</span>
        ) : (
          <span>Celkem: <span className="font-semibold text-gray-900">{operators.length}</span> provozovatelů, <span className="font-semibold text-gray-900">{premises.length}</span> pracovišť</span>
        )}
      </div>

      {/* Operators Grid */}
      {filteredData.operators.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-20">
          {filteredData.operators.map(operator => {
            const operatorPremises = premisesByOperator.get(operator.id) || [];
            const isExpanded = expandedOperatorIds.has(operator.id);

            return (
              <Card key={operator.id} hover className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 mb-2 truncate">
                        {operator.operator_name}
                      </h3>
                      <div className="space-y-1 text-sm text-gray-600">
                        {operator.operator_ico && (
                          <div className="flex items-center gap-1.5">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="truncate">IČO: {operator.operator_ico}</span>
                          </div>
                        )}
                        {operator.operator_address && (
                          <div className="flex items-start gap-1.5">
                            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="line-clamp-2">{operator.operator_address}</span>
                          </div>
                        )}
                        {operator.operator_phone && (
                          <div className="flex items-center gap-1.5">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span>{operator.operator_phone}</span>
                          </div>
                        )}
                        {operator.operator_email && (
                          <div className="flex items-center gap-1.5">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span className="truncate">{operator.operator_email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditOperator(operator.id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
                        title="Upravit"
                      >
                        <EditIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingOperatorId(operator.id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-gray-600 hover:text-red-600"
                        title="Smazat"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </CardHeader>

                <CardBody className="flex-1">
                  <div className="mb-3">
                    <button
                      onClick={() => toggleOperator(operator.id)}
                      className="text-sm font-medium text-primary hover:text-primary-dark flex items-center gap-1"
                    >
                      <span>Pracoviště ({operatorPremises.length})</span>
                      <svg 
                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="space-y-2">
                      {operatorPremises.length > 0 ? (
                        operatorPremises.map(premise => (
                          <div
                            key={premise.id}
                            className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-primary-light hover:bg-primary-light/5 transition-all group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900 text-sm mb-1 truncate">
                                  {premise.premise_name}
                                </h4>
                                {premise.premise_address && (
                                  <p className="text-xs text-gray-600 line-clamp-1 mb-1">
                                    {premise.premise_address}
                                  </p>
                                )}
                                {premise.premise_responsible_person && (
                                  <p className="text-xs text-gray-500 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    {premise.premise_responsible_person}
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectPremise(premise.id);
                                }}
                                className="flex-shrink-0 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary-dark transition-colors shadow-sm opacity-0 group-hover:opacity-100"
                              >
                                Audity
                              </button>
                            </div>
                            <div className="flex gap-1.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditPremise(premise.id);
                                }}
                                className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors text-gray-600 hover:text-blue-600"
                                title="Upravit pracoviště"
                              >
                                <EditIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingPremiseId(premise.id);
                                }}
                                className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-gray-600 hover:text-red-600"
                                title="Smazat pracoviště"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 text-sm text-gray-500">
                          Žádná pracoviště
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddPremise(operator.id);
                        }}
                        className="w-full py-2 px-3 text-sm font-medium text-primary border border-primary rounded-lg hover:bg-primary hover:text-white transition-colors flex items-center justify-center gap-1.5"
                      >
                        <PlusIcon className="h-4 w-4" />
                        Přidat pracoviště
                      </button>
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
          {searchTerm ? (
            <>
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-gray-600 font-semibold mb-2">Žádní provozovatelé nenalezeni</p>
              <p className="text-gray-500 mb-4">Zkuste změnit vyhledávací termín</p>
              <Button variant="secondary" onClick={() => setSearchTerm('')}>
                Vymazat vyhledávání
              </Button>
            </>
          ) : (
            <>
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-gray-600 font-semibold mb-2">Zatím nemáte žádné provozovatele</p>
              <p className="text-gray-500 mb-6">Začněte kliknutím na tlačítko vpravo dole</p>
            </>
          )}
        </div>
      )}

      {/* FAB Button */}
      <button
        onClick={onAddNewOperator}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-primary-dark to-primary text-white rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 transition-all flex items-center justify-center z-50"
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
