import React, { useState, useCallback, useMemo } from 'react';
import { AuditStructure, AuditData, AuditAnswer, AuditItem, NonComplianceData } from '../types';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { WarningIcon } from './icons/WarningIcon';
import { iconMap, QuestionMarkIcon } from './AuditIcons';
import { AuditItemModal } from './AuditItemModal';

interface AuditChecklistProps {
  auditStructure: AuditStructure;
  auditData: AuditData;
  onAnswerUpdate: (itemId: string, answer: AuditAnswer) => void;
  onComplete: () => void;
}

const AuditChecklist: React.FC<AuditChecklistProps> = ({ auditStructure, auditData, onAnswerUpdate, onComplete }) => {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<AuditItem | null>(null);
  const [isMobileNcSidebarOpen, setIsMobileNcSidebarOpen] = useState(false);

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const nonCompliantItems = useMemo(() => {
    return auditStructure.audit_sections.flatMap(section =>
        section.items
            .filter(item => item.active)
            .map(item => ({ ...item, sectionId: section.id, sectionTitle: section.title }))
    ).filter(item => {
        const answer = auditData.answers[item.id];
        return answer && !answer.compliant && answer.nonComplianceData && answer.nonComplianceData.length > 0;
    });
  }, [auditData.answers, auditStructure.audit_sections]);
  
  const handleGoToItem = (sectionId: string, itemId: string) => {
      setOpenSections(prev => {
          const newSet = new Set(prev);
          newSet.add(sectionId);
          return newSet;
      });

      setIsMobileNcSidebarOpen(false);
      
      const section = auditStructure.audit_sections.find(s => s.id === sectionId);
      const item = section?.items.find(i => i.id === itemId);
      if(item) {
        setSelectedItem(item);
      }
  };
  
  const activeSections = auditStructure.audit_sections.filter(s => s.active && s.items.some(i => i.active));

  const sidebarContent = (
      <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
          {nonCompliantItems.map(item => (
              <li key={item.id}>
                  <button
                      onClick={() => handleGoToItem(item.sectionId, item.id)}
                      className="w-full text-left p-2.5 text-sm text-red-800 bg-red-50 hover:bg-red-100 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
                  >
                      <span className="font-semibold block">{item.title}</span>
                  </button>
              </li>
          ))}
      </ul>
  );

  return (
    <div className="relative w-full max-w-6xl">
        <div className="flex gap-8">
            {/* Desktop Sidebar */}
            {nonCompliantItems.length > 0 && (
                <div className="hidden md:block w-60 flex-shrink-0">
                    <div className="sticky top-28 bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <h4 className="font-bold mb-4 text-gray-700 text-center">Přehled neshod</h4>
                        {sidebarContent}
                    </div>
                </div>
            )}
            
            <div className="flex-grow min-w-0 bg-white p-6 md:p-8 rounded-2xl shadow-xl animate-fade-in-up">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">Průběh auditu</h2>
                <div className="space-y-3">
                    {activeSections.map(section => {
                        const isOpen = openSections.has(section.id);
                        const hasNonCompliance = section.items.some(item => !auditData.answers[item.id]?.compliant);

                        return (
                            <div key={section.id} className="border border-gray-200 rounded-lg">
                                <button
                                    onClick={() => toggleSection(section.id)}
                                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-t-lg transition-colors"
                                >
                                    <div className="flex items-center">
                                        {hasNonCompliance && <span className="w-3 h-3 bg-red-500 rounded-full mr-3 flex-shrink-0 animate-pulse"></span>}
                                        <h3 className="text-lg font-bold text-left text-gray-800">{section.title}</h3>
                                    </div>
                                    <ChevronDownIcon className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isOpen && (
                                    <div className="p-4">
                                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                                            {section.items.filter(i => i.active).map(item => {
                                                const answer = auditData.answers[item.id];
                                                const isCompliant = !answer || answer.compliant;
                                                const IconComponent = iconMap[item.id] || QuestionMarkIcon;
                                                
                                                return (
                                                    <button
                                                        key={item.id}
                                                        title={item.title}
                                                        onClick={() => setSelectedItem(item)}
                                                        className={`flex flex-col items-center justify-center p-2 rounded-lg border-2 aspect-square transition-all text-gray-700 hover:shadow-md hover:-translate-y-1 ${
                                                            isCompliant 
                                                            ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                                                            : 'bg-red-50 border-red-300 hover:bg-red-100'
                                                        }`}
                                                    >
                                                        <IconComponent className="h-7 w-7 mb-1.5 flex-shrink-0" />
                                                        <span className="text-xs text-center leading-tight font-medium break-all">{item.title}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                <div className="mt-8">
                    <button
                        onClick={onComplete}
                        className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform transform hover:scale-105"
                    >
                        Dokončit a vygenerovat zprávu
                    </button>
                </div>
            </div>
        </div>

        {selectedItem && (
            <AuditItemModal
                item={selectedItem}
                answer={auditData.answers[selectedItem.id]}
                onClose={() => setSelectedItem(null)}
                onAnswerUpdate={onAnswerUpdate}
            />
        )}


        {/* Mobile FAB and Sidebar */}
        {nonCompliantItems.length > 0 && (
            <div className="md:hidden">
                <button 
                    onClick={() => setIsMobileNcSidebarOpen(true)}
                    className="fixed bottom-5 right-5 bg-red-600 text-white rounded-full p-3 shadow-lg z-30 flex items-center justify-center animate-pulse"
                    aria-label="Zobrazit neshody"
                >
                    <WarningIcon className="h-7 w-7"/>
                    <span className="absolute -top-1 -right-1 bg-white text-red-600 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-red-600">
                        {nonCompliantItems.length}
                    </span>
                </button>

                {isMobileNcSidebarOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setIsMobileNcSidebarOpen(false)}>
                        <div className="fixed bottom-0 left-0 right-0 bg-white p-4 rounded-t-2xl shadow-2xl max-h-[50vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                            <h4 className="font-bold mb-3 text-gray-700 text-lg">Přehled neshod</h4>
                            {sidebarContent}
                        </div>
                    </div>
                )}
            </div>
        )}
    </div>
  );
};

export default AuditChecklist;
