import React, { useState, useMemo } from 'react';
import { AuditStructure, AuditData, AuditItem, AuditAnswer } from '../types';
import { ChevronDownIcon, WarningIcon, SaveIcon } from './icons';
import { iconMap, QuestionMarkIcon } from './AuditIcons';
import { AuditItemModal } from './AuditItemModal';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Card, CardHeader, CardBody } from './ui/Card';
import { BackButton } from './BackButton';

interface AuditChecklistProps {
  auditStructure: AuditStructure;
  auditData: AuditData;
  onAnswerUpdate: (itemId: string, answer: AuditAnswer) => void;
  onComplete: () => void;
  onBack: () => void;
  onSaveProgress?: () => void; // Callback pro uložení průběhu
  log: (message: string) => void;
}

const AuditChecklist: React.FC<AuditChecklistProps> = ({ auditStructure, auditData, onAnswerUpdate, onComplete, onBack, onSaveProgress, log }) => {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<AuditItem | null>(null);
  const [isMobileNcSidebarOpen, setIsMobileNcSidebarOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sekce začínají sbalené - žádná automatická inicializace
  // Uživatel může kliknout na sekci aby ji otevřel/zavřel

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

  const activeSections = auditStructure.audit_sections.filter(s => s.active && s.items.some(i => i.active));

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

  const handleFinishClick = () => {
    setIsConfirmModalOpen(true);
  };

  const handleConfirmFinish = () => {
    onComplete();
    setIsConfirmModalOpen(false);
  };

  const handleSaveProgress = async () => {
    setIsSaving(true);
    try {
      // Pokud je definován callback, použít ho
      if (onSaveProgress) {
        await onSaveProgress();
      } else {
        // Jinak jen simulovat uložení
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } finally {
      setIsSaving(false);
    }
  };

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
    <div className="w-full max-w-7xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Průběh auditu</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Non-Compliance Sidebar - Desktop */}
        {nonCompliantItems.length > 0 && (
            <div className="hidden lg:block w-64 flex-shrink-0">
                <Card className="sticky top-4">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <WarningIcon className="h-5 w-5 text-accent-error" />
                      <h4 className="font-bold text-gray-900">Přehled neshod</h4>
                      <span className="ml-auto px-2 py-0.5 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                        {nonCompliantItems.length}
                      </span>
                    </div>
                  </CardHeader>
                  <CardBody>
                    {sidebarContent}
                  </CardBody>
                </Card>
            </div>
        )}
        
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="space-y-2 sm:space-y-3 md:space-y-4">
            {activeSections.map(section => {
              const isOpen = openSections.has(section.id);
              const hasNonCompliance = section.items.some(item => auditData.answers[item.id]?.compliant === false);
              const sectionItems = section.items.filter(i => i.active);
              const answeredCount = sectionItems.filter(item => auditData.answers[item.id] !== undefined).length;

              return (
                <Card key={section.id} className="overflow-hidden">
                  <CardHeader
                    onClick={() => toggleSection(section.id)}
                    className="cursor-pointer hover:bg-gray-50 transition-colors px-3 py-2.5 sm:px-4 sm:py-3 md:px-6 md:py-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 flex-1 min-w-0">
                        <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 rounded-full flex-shrink-0 ${hasNonCompliance ? 'bg-accent-error animate-pulse' : 'bg-accent-success'}`}></span>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 leading-tight">{section.title}</h3>
                          <p className="text-xs sm:text-sm text-gray-600 mt-0.5 leading-tight">
                            {answeredCount} / {sectionItems.length} položek
                          </p>
                        </div>
                      </div>
                      <ChevronDownIcon className={`h-4 w-4 sm:h-4 sm:w-4 md:h-5 md:w-5 text-gray-400 flex-shrink-0 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </CardHeader>
                  
                  {isOpen && (
                    <CardBody className="px-3 py-2.5 sm:px-4 sm:py-3 md:px-6 md:py-4">
                      <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5 sm:gap-2 md:gap-3">
                        {sectionItems.map(item => {
                          const answer = auditData.answers[item.id];
                          const isCompliant = !answer || answer.compliant;
                          const isAnswered = answer !== undefined;
                          const IconComponent = iconMap[item.icon || item.id] || QuestionMarkIcon;
                          
                          return (
                            <button
                              key={item.id}
                              title={item.title}
                              onClick={() => setSelectedItem(item)}
                              className={`
                                flex flex-col items-center justify-center 
                                p-2 sm:p-2.5 md:p-3 lg:p-3.5 
                                rounded-lg sm:rounded-xl border-2 transition-all
                                aspect-square text-gray-700 hover:shadow-lg hover:-translate-y-0.5
                                min-h-[64px] sm:min-h-[72px] md:min-h-[80px]
                                active:scale-95
                                ${isCompliant && isAnswered 
                                  ? 'bg-green-50 border-green-300 hover:bg-green-100' 
                                  : !isCompliant 
                                    ? 'bg-red-50 border-red-400 hover:bg-red-100' 
                                    : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                                }
                                ${isAnswered ? 'ring-2 ring-offset-1 sm:ring-offset-2 ring-primary/20' : ''}
                              `}
                            >
                              <IconComponent className={`h-4 w-4 sm:h-5 sm:w-5 md:h-5 md:w-5 lg:h-6 lg:w-6 mb-1 sm:mb-1.5 flex-shrink-0 ${isAnswered ? 'opacity-100' : 'opacity-60'}`} />
                              <span className="text-[10px] sm:text-[11px] md:text-xs lg:text-sm text-center leading-tight font-medium break-words line-clamp-2 px-0.5">
                                {item.title}
                              </span>
                              {isAnswered && (
                                <div className="mt-1 sm:mt-1.5">
                                  {isCompliant ? (
                                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-green-600 rounded-full shadow-sm ring-2 ring-green-200"></div>
                                  ) : (
                                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-red-600 rounded-full shadow-sm ring-2 ring-red-200"></div>
                                  )}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </CardBody>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Sticky Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-20 print:hidden lg:left-64">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <BackButton
            onClick={onBack}
            className="sm:w-auto"
          />
          <div className="flex gap-3 flex-1 sm:flex-initial sm:justify-end">
            <Button
              variant="secondary"
              onClick={handleSaveProgress}
              isLoading={isSaving}
              leftIcon={<SaveIcon className="h-5 w-5" />}
            >
              Uložit průběh
            </Button>
            <Button
              variant="primary"
              onClick={handleFinishClick}
            >
              Dokončit audit
            </Button>
          </div>
        </div>
      </div>

      {/* Audit Item Modal */}
      {selectedItem && (
        <AuditItemModal
          item={selectedItem}
          answer={auditData.answers[selectedItem.id]}
          onClose={() => setSelectedItem(null)}
          onAnswerUpdate={onAnswerUpdate}
          log={log}
          auditStructure={auditStructure}
          auditId={auditData.id}
        />
      )}

      {/* Confirmation Modal */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Dokončit audit?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsConfirmModalOpen(false)}>
              Zrušit
            </Button>
            <Button variant="primary" onClick={handleConfirmFinish}>
              Dokončit a generovat
            </Button>
          </>
        }
      >
        <p className="text-gray-600">
          Opravdu chcete audit uzavřít a vygenerovat protokol? Tuto akci nelze vrátit zpět.
        </p>
      </Modal>

      {/* Mobile Non-Compliance FAB */}
      {nonCompliantItems.length > 0 && (
        <div className="lg:hidden">
          <button 
            onClick={() => setIsMobileNcSidebarOpen(true)}
            className="fixed bottom-20 right-4 bg-accent-error text-white rounded-full p-4 shadow-2xl z-30 flex items-center justify-center animate-pulse"
            aria-label="Zobrazit neshody"
          >
            <WarningIcon className="h-6 w-6"/>
            <span className="absolute -top-1 -right-1 bg-white text-accent-error text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center border-2 border-accent-error">
              {nonCompliantItems.length}
            </span>
          </button>

          {isMobileNcSidebarOpen && (
            <Modal
              isOpen={isMobileNcSidebarOpen}
              onClose={() => setIsMobileNcSidebarOpen(false)}
              title={
                <div className="flex items-center gap-2">
                  <WarningIcon className="h-5 w-5 text-accent-error" />
                  <span>Přehled neshod ({nonCompliantItems.length})</span>
                </div>
              }
              size="sm"
            >
              {sidebarContent}
            </Modal>
          )}
        </div>
      )}
    </div>
  );
};

export default AuditChecklist;
