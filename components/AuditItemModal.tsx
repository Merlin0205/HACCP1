import React, { useMemo, useState } from 'react';
import { AuditItem, AuditAnswer, NonComplianceData, AuditStructure } from '../types';
import NonComplianceForm from './NonComplianceForm';
import { PlusIcon, CheckmarkIcon, TrashIcon } from './icons';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Card, CardBody } from './ui/Card';

interface AuditItemModalProps {
  item: AuditItem | null;
  answer: AuditAnswer;
  onClose: () => void;
  onAnswerUpdate: (itemId: string, answer: AuditAnswer) => void;
  log: (message: string) => void;
  auditStructure?: AuditStructure;
  auditId?: string; // ID auditu pro upload fotek na Storage
}

export const AuditItemModal: React.FC<AuditItemModalProps> = ({ item, answer, onClose, onAnswerUpdate, log, auditStructure, auditId }) => {
  if (!item) return null;

  const [activeNonComplianceIndex, setActiveNonComplianceIndex] = useState(0);

  // Najít sectionTitle podle item.id
  const sectionTitle = useMemo(() => {
    if (!auditStructure) return '';
    for (const section of auditStructure.audit_sections) {
      if (section.items.some(i => i.id === item.id)) {
        return section.title;
      }
    }
    return '';
  }, [auditStructure, item.id]);

  const isCompliant = !answer || answer.compliant;
  const nonComplianceData = answer?.nonComplianceData || [];
  const activeNonCompliance = nonComplianceData[activeNonComplianceIndex];

  // Po přidání nové neshody přepnout na ni
  React.useEffect(() => {
    if (nonComplianceData.length > 0 && activeNonComplianceIndex >= nonComplianceData.length) {
      setActiveNonComplianceIndex(nonComplianceData.length - 1);
    }
  }, [nonComplianceData.length, activeNonComplianceIndex]);

  const handleSetCompliant = () => {
    onAnswerUpdate(item.id, { compliant: true, nonComplianceData: [] });
    setActiveNonComplianceIndex(0);
  };

  const handleAddNonCompliance = () => {
    const newNc: NonComplianceData = { location: '', finding: '', recommendation: '', photos: [] };
    const newAnswer: AuditAnswer = {
      compliant: false,
      nonComplianceData: [...nonComplianceData, newNc]
    };
    onAnswerUpdate(item.id, newAnswer);
    setActiveNonComplianceIndex(nonComplianceData.length); // Přepnout na novou neshodu
  };

  const handleNonComplianceChange = (index: number, field: keyof NonComplianceData, value: any) => {
    if (answer && answer.nonComplianceData) {
      const updatedNonComplianceData = [...answer.nonComplianceData];
      updatedNonComplianceData[index] = { ...updatedNonComplianceData[index], [field]: value };
      onAnswerUpdate(item.id, { ...answer, nonComplianceData: updatedNonComplianceData });
    }
  };

  const handleRemoveNonCompliance = (index: number) => {
    if (answer && answer.nonComplianceData) {
      const updatedNonComplianceData = answer.nonComplianceData.filter((_, i) => i !== index);
      const isNowCompliant = updatedNonComplianceData.length === 0;
      onAnswerUpdate(item.id, { compliant: isNowCompliant, nonComplianceData: updatedNonComplianceData });
      
      // Upravit aktivní index po smazání
      if (updatedNonComplianceData.length === 0) {
        setActiveNonComplianceIndex(0);
      } else if (activeNonComplianceIndex >= updatedNonComplianceData.length) {
        setActiveNonComplianceIndex(updatedNonComplianceData.length - 1);
      } else if (activeNonComplianceIndex > index) {
        setActiveNonComplianceIndex(activeNonComplianceIndex - 1);
      }
    }
  };

  const handleClose = async () => {
    // Před zavřením uložit všechna nová místa z nonComplianceData
    // ALE pouze pokud nejsou v blacklistu
    if (answer && answer.nonComplianceData) {
      const { getNonComplianceLocations, addNonComplianceLocation, getBlacklist } = await import('../services/firestore/nonComplianceLocations');
      
      // Načíst blacklist
      const blacklist = await getBlacklist();
      const blacklistSet = new Set(blacklist.map(loc => loc.toLowerCase()));
      
      for (const nc of answer.nonComplianceData) {
        if (nc.location && nc.location.trim()) {
          // Formátovat místo (první písmeno velké, zbytek malé, odstranit tečku)
          let formatted = nc.location.trim().replace(/\.+$/, '');
          if (!formatted) continue;
          formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1).toLowerCase();
          
          // Pokud je místo v blacklistu, přeskočit (neukládat)
          if (blacklistSet.has(formatted.toLowerCase())) {
            continue;
          }
          
          // Zkontrolovat, jestli už existuje
          const { available } = await getNonComplianceLocations();
          const exists = available.some(loc => loc.toLowerCase() === formatted.toLowerCase());
          
          if (!exists) {
            try {
              await addNonComplianceLocation(formatted);
            } catch (error) {
              console.error('[AuditItemModal] Error saving new location:', error);
            }
          }
        }
      }
    }
    
    onClose();
  };

  // Funkce pro získání prvních slov z popisu pro tooltip
  const getFindingPreview = (finding: string, maxWords: number = 8): string => {
    if (!finding) return 'Bez popisu';
    const words = finding.trim().split(/\s+/);
    if (words.length <= maxWords) return finding;
    return words.slice(0, maxWords).join(' ') + '...';
  };

  return (
    <Modal
      isOpen={true}
      onClose={handleClose}
      title={item.title}
      size="md"
      responsiveSize={{ mobile: 'md', desktop: '4xl' }}
      footer={
        <Button variant="primary" onClick={handleClose} className="w-full sm:w-auto">
          Zavřít
        </Button>
      }
    >
      <div className="space-y-4 md:space-y-6">
        {/* Description */}
        <div className="bg-gray-50 rounded-xl p-3 md:p-4">
          <p className="text-gray-700 leading-relaxed text-sm md:text-base">{item.description}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
          <Button
            variant={isCompliant ? 'primary' : 'secondary'}
            onClick={handleSetCompliant}
            disabled={isCompliant}
            fullWidth
            leftIcon={<CheckmarkIcon className="h-4 w-4 md:h-5 md:w-5" />}
            className="!bg-green-600 hover:!bg-green-700 !text-white disabled:!bg-green-500 disabled:!opacity-100"
          >
            Vyhovuje
          </Button>
          <Button
            variant="danger"
            onClick={handleAddNonCompliance}
            fullWidth
            className="text-sm md:text-base py-2.5 md:py-3"
          >
            Přidat neshodu
          </Button>
        </div>

        {/* Non-Compliance Forms */}
        {!isCompliant && nonComplianceData.length > 0 && (
          <div className="space-y-4">
            {/* Přepínač mezi neshodami */}
            {nonComplianceData.length > 1 && (
              <div className="flex flex-wrap gap-2 md:gap-3 pb-2 border-b border-gray-200">
                {nonComplianceData.map((nc, index) => {
                  const isActive = index === activeNonComplianceIndex;
                  const location = nc.location || 'Bez místa';
                  const findingPreview = getFindingPreview(nc.finding);
                  
                  return (
                    <button
                      key={index}
                      onClick={() => setActiveNonComplianceIndex(index)}
                      className={`
                        relative flex items-center justify-center min-w-[44px] md:min-w-[48px] h-10 md:h-11 px-3 md:px-4 rounded-lg font-semibold text-sm md:text-base transition-all
                        ${isActive 
                          ? 'bg-red-600 text-white shadow-md' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }
                      `}
                    >
                      {index + 1}
                      {isActive && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Aktuální neshoda */}
            {activeNonCompliance && (
              <Card className="border-l-4 border-accent-error">
                <CardBody className="p-3 md:p-4">
                  <div className="flex justify-between items-center mb-3 md:mb-4">
                    <h4 className="font-semibold text-gray-700 text-base md:text-lg">
                      Detail neshody #{activeNonComplianceIndex + 1}
                    </h4>
                    {nonComplianceData.length > 1 && (
                      <button 
                        onClick={() => handleRemoveNonCompliance(activeNonComplianceIndex)} 
                        className="p-2 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-full transition-colors border border-red-200"
                        aria-label="Smazat neshodu"
                        title="Smazat neshodu"
                      >
                        <TrashIcon className="h-5 w-5 md:h-6 md:w-6" />
                      </button>
                    )}
                  </div>
                  <NonComplianceForm
                    data={activeNonCompliance}
                    index={activeNonComplianceIndex}
                    onChange={(field, value) => handleNonComplianceChange(activeNonComplianceIndex, field, value)}
                    onRemove={() => handleRemoveNonCompliance(activeNonComplianceIndex)}
                    log={log}
                    itemTitle={item.title}
                    itemDescription={item.description}
                    sectionTitle={sectionTitle}
                    auditId={auditId}
                  />
                </CardBody>
              </Card>
            )}

            {/* Tlačítko pro přidání další neshody */}
            <Button
              variant="ghost"
              onClick={handleAddNonCompliance}
              fullWidth
              leftIcon={<PlusIcon className="h-4 w-4 md:h-5 md:w-5" />}
              className="border-2 border-dashed border-gray-300 hover:border-primary text-sm md:text-base py-2.5 md:py-3"
            >
              Přidat další neshodu
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
