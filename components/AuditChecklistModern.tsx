import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { AuditStructure, AuditData, AuditItem, AuditAnswer } from '../types';
import { ChevronDownIcon, WarningIcon, SaveIcon, MicrophoneIcon, StopIcon } from './icons';
import { getIconById, QuestionMarkIcon } from './AuditIcons';
import { AuditItemModal } from './AuditItemModal';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Card, CardHeader, CardBody } from './ui/Card';
import { BackButton } from './BackButton';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import Spinner from './Spinner';
import StickyNonComplianceHeader from './StickyNonComplianceHeader';

interface AuditChecklistModernProps {
  auditStructure: AuditStructure;
  auditData: AuditData;
  onAnswerUpdate: (itemId: string, answer: AuditAnswer) => void;
  onComplete: () => void;
  onBack: () => void;
  onSaveProgress?: () => void;
  onCompletedAtUpdate?: (completedAt: string) => void;
  onNoteUpdate?: (note: string) => void;
  onPresentPersonUpdate?: (presentPerson: string) => void;
  log: (message: string) => void;
}

const AuditChecklistModern: React.FC<AuditChecklistModernProps> = ({ 
  auditStructure, 
  auditData, 
  onAnswerUpdate, 
  onComplete, 
  onBack, 
  onSaveProgress, 
  onCompletedAtUpdate, 
  onNoteUpdate, 
  onPresentPersonUpdate,
  log 
}) => {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [isNoteExpanded, setIsNoteExpanded] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AuditItem | null>(null);
  const [isMobileNcSidebarOpen, setIsMobileNcSidebarOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Stavy pro datum dokončení a poznámku
  const [completedAt, setCompletedAt] = useState<string>(() => {
    if (auditData.completedAt) {
      return auditData.completedAt.split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  });
  const [note, setNote] = useState<string>(auditData.note || '');
  const [presentPerson, setPresentPerson] = useState<string>(() => {
    return (auditData.headerValues as any)?.present_person || '';
  });
  const [isNoteRecording, setIsNoteRecording] = useState(false);

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
      if (onSaveProgress) {
        await onSaveProgress();
      } else {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompletedAtChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setCompletedAt(newDate);
    if (onCompletedAtUpdate) {
      const isoDate = newDate ? new Date(newDate).toISOString() : '';
      onCompletedAtUpdate(isoDate);
    }
  };

  const handleNoteChange = (newNote: string) => {
    setNote(newNote);
    if (onNoteUpdate) {
      onNoteUpdate(newNote);
    }
  };

  const handlePresentPersonChange = (newValue: string) => {
    setPresentPerson(newValue);
    if (onPresentPersonUpdate) {
      onPresentPersonUpdate(newValue);
    }
  };

  const handleNoteTranscription = useCallback((transcribedText: string) => {
    const cleaned = transcribedText.trim().replace(/\.+$/, '');
    const newText = note ? `${note} ${cleaned}`.trim() : cleaned;
    handleNoteChange(newText);
  }, [note]);

  const { isRecording: isNoteRecordingActive, isTranscribing: isNoteTranscribing, error: noteError, toggleRecording: toggleNoteRecording } = useAudioRecorder(handleNoteTranscription, log);

  useEffect(() => {
    setIsNoteRecording(isNoteRecordingActive || isNoteTranscribing);
  }, [isNoteRecordingActive, isNoteTranscribing]);

  useEffect(() => {
    if (auditData.completedAt) {
      setCompletedAt(auditData.completedAt.split('T')[0]);
    }
    if (auditData.note !== undefined) {
      setNote(auditData.note);
    }
    const incomingPresentPerson = (auditData.headerValues as any)?.present_person;
    if (incomingPresentPerson !== undefined) {
      setPresentPerson(incomingPresentPerson);
    }
  }, [auditData.completedAt, auditData.note, auditData.headerValues]);

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
    <div className="w-full pb-24">
      {/* Sticky Header s přehledem neshod */}
      <StickyNonComplianceHeader 
        nonCompliantItems={nonCompliantItems}
        onItemClick={handleGoToItem}
      />
      
      <div className="max-w-7xl mx-auto">

      {/* Poznámka - collapsible sekce */}
      <div className="mb-4">
        <Card className="overflow-hidden">
          <CardHeader
            onClick={() => setIsNoteExpanded(!isNoteExpanded)}
            className="cursor-pointer hover:bg-gray-50 transition-colors px-3 py-2 sm:px-3.5 sm:py-2.5 md:px-4 md:py-2.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 flex-1 min-w-0">
                <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 rounded-full flex-shrink-0 ${note.trim() ? 'bg-blue-500' : 'bg-gray-300'}`}></span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 leading-tight">Poznámka a Přítomná osoba</h3>
                  {presentPerson.trim() && (
                    <p className="text-xs sm:text-sm text-gray-600 mt-0.5 leading-tight truncate">
                      Přítomná osoba: {presentPerson}
                    </p>
                  )}
                  {note.trim() && (
                    <p className="text-xs sm:text-sm text-gray-600 mt-0.5 leading-tight truncate">
                      {note.length > 50 ? `${note.substring(0, 50)}...` : note}
                    </p>
                  )}
                </div>
              </div>
              <ChevronDownIcon className={`h-4 w-4 sm:h-4 sm:w-4 md:h-5 md:w-5 text-gray-400 flex-shrink-0 transform transition-transform ${isNoteExpanded ? 'rotate-180' : ''}`} />
            </div>
          </CardHeader>
          
          {isNoteExpanded && (
            <CardBody className="px-3 py-2 sm:px-3.5 sm:py-2.5 md:px-4 md:py-2.5">
              <div className="mb-3">
                <label htmlFor="presentPerson" className="block text-sm font-semibold text-gray-800 mb-1">
                  Přítomná osoba
                </label>
                <input
                  id="presentPerson"
                  type="text"
                  value={presentPerson}
                  onChange={(e) => handlePresentPersonChange(e.target.value)}
                  className="w-full px-3 md:px-4 py-2 text-sm md:text-base bg-white border border-gray-300 rounded-md"
                  placeholder="Zadejte jméno osoby přítomné u auditu..."
                />
              </div>
              <div className="relative">
                <textarea
                  id="auditNote"
                  rows={4}
                  value={note}
                  onChange={e => handleNoteChange(e.target.value)}
                  className="w-full px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base bg-white border border-gray-300 rounded-md resize-y"
                  style={{ paddingRight: '64px' }}
                  placeholder={isNoteRecordingActive ? "Nahrávám..." : (isNoteTranscribing ? "Přepisuji..." : "Zadejte poznámku k auditu...")}
                  readOnly={isNoteRecordingActive || isNoteTranscribing}
                />
                <div className="absolute top-10 md:top-11 right-2 md:right-3" style={{ zIndex: 1000 }}>
                  <button 
                    onClick={toggleNoteRecording}
                    disabled={isNoteTranscribing && !isNoteRecordingActive}
                    className={`p-2 md:p-2.5 rounded-full text-white ${isNoteRecordingActive ? 'bg-red-500' : 'bg-blue-500'} disabled:bg-gray-400 disabled:cursor-not-allowed`}
                    title="Přepisovat hlasem"
                  >
                    {isNoteRecordingActive || isNoteTranscribing ? (
                      isNoteRecordingActive ? (
                        <StopIcon className="h-5 w-5 md:h-6 md:w-6" />
                      ) : (
                        <Spinner small />
                      )
                    ) : (
                      <MicrophoneIcon className="h-5 w-5 md:h-6 md:w-6" />
                    )}
                  </button>
                </div>
                {noteError && <p className="text-red-500 text-xs md:text-sm mt-1">{noteError}</p>}
              </div>
            </CardBody>
          )}
        </Card>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="space-y-2">
          {activeSections.map(section => {
            const isOpen = openSections.has(section.id);
            const hasNonCompliance = section.items.some(item => auditData.answers[item.id]?.compliant === false);
            const sectionItems = section.items.filter(i => i.active);
            const answeredCount = sectionItems.filter(item => auditData.answers[item.id] !== undefined).length;

            return (
              <Card key={section.id} className="overflow-hidden">
                <CardHeader
                  onClick={() => toggleSection(section.id)}
                  className="cursor-pointer hover:bg-gray-50 transition-colors px-3 py-2 sm:px-3.5 sm:py-2.5 md:px-4 md:py-2.5"
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
                  <CardBody className="px-3 py-2 sm:px-3.5 sm:py-2.5 md:px-4 md:py-2.5">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-2.5 md:gap-3">
                      {sectionItems.map(item => {
                        const answer = auditData.answers[item.id];
                        const isCompliant = !answer || answer.compliant;
                        const isAnswered = answer !== undefined;
                        const IconComponent = getIconById(item.icon || item.id) || QuestionMarkIcon;
                        
                        return (
                          <button
                            key={item.id}
                            title={item.title}
                            onClick={() => setSelectedItem(item)}
                            className={`
                              flex flex-col items-center justify-center 
                              p-3 sm:p-3.5 md:p-4
                              rounded-lg sm:rounded-xl border-2 transition-all
                              aspect-square text-gray-700 hover:shadow-lg hover:-translate-y-0.5
                              min-h-[80px] sm:min-h-[90px] md:min-h-[100px]
                              active:scale-95 overflow-hidden
                              ${isCompliant && isAnswered 
                                ? 'bg-green-50 border-green-300 hover:bg-green-100' 
                                : !isCompliant 
                                  ? 'bg-red-50 border-red-400 hover:bg-red-100' 
                                  : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                              }
                              ${isAnswered ? 'ring-2 ring-offset-1 sm:ring-offset-2 ring-primary/20' : ''}
                            `}
                          >
                            <IconComponent className={`h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 mb-2 sm:mb-2.5 flex-shrink-0 ${isAnswered ? 'opacity-100' : 'opacity-60'}`} />
                            <span className="text-xs sm:text-sm md:text-sm text-center leading-tight font-medium break-words line-clamp-2 px-1 overflow-hidden w-full">
                              {item.title}
                            </span>
                            {isAnswered && (
                              <div className="mt-1.5 sm:mt-2">
                                {isCompliant ? (
                                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-600 rounded-full shadow-sm ring-2 ring-green-200"></div>
                                ) : (
                                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-red-600 rounded-full shadow-sm ring-2 ring-red-200"></div>
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
    </div>
  );
};

export default AuditChecklistModern;

