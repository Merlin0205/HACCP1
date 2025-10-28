import React from 'react';
import { AuditItem, AuditAnswer, NonComplianceData } from '../types';
import NonComplianceForm from './NonComplianceForm';
import { PlusIcon, CheckmarkIcon, XIcon } from './icons';

interface AuditItemModalProps {
  item: AuditItem | null;
  answer: AuditAnswer;
  onClose: () => void;
  onAnswerUpdate: (itemId: string, answer: AuditAnswer) => void;
  log: (message: string) => void; // Přidáno logování
}

export const AuditItemModal: React.FC<AuditItemModalProps> = ({ item, answer, onClose, onAnswerUpdate, log }) => {
  if (!item) return null;

  const isCompliant = !answer || answer.compliant;

  const handleSetCompliant = () => {
    onAnswerUpdate(item.id, { compliant: true, nonComplianceData: [] });
  };

  const handleAddNonCompliance = () => {
    const newNc: NonComplianceData = { location: '', finding: '', recommendation: '', photos: [] };
    const newAnswer: AuditAnswer = {
      compliant: false,
      nonComplianceData: [...(answer?.nonComplianceData || []), newNc]
    };
    onAnswerUpdate(item.id, newAnswer);
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
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b flex justify-between items-center flex-shrink-0">
          <h3 className="text-xl font-bold text-gray-800">{item.title}</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-grow">
          <p className="text-gray-600 mb-6">{item.description}</p>

          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={handleSetCompliant}
              disabled={isCompliant}
              className={`w-full px-4 py-2 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${isCompliant ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800 hover:bg-green-200'}`}
            >
              <CheckmarkIcon /> Vyhovuje
            </button>
            <button
              onClick={handleAddNonCompliance}
              className="w-full px-4 py-2 text-sm font-bold rounded-lg bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
            >
              Přidat neshodu
            </button>
          </div>

          {!isCompliant && answer.nonComplianceData && (
            <div className="space-y-4">
              {answer.nonComplianceData.map((nc, index) => (
                <NonComplianceForm
                  key={index}
                  data={nc}
                  index={index}
                  onChange={(field, value) => handleNonComplianceChange(index, field, value)}
                  onRemove={() => handleRemoveNonCompliance(index)}
                  log={log}
                />
              ))}
              <button 
                onClick={handleAddNonCompliance} 
                className="mt-2 flex items-center justify-center w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 hover:border-blue-400 transition-colors"
              >
                <PlusIcon />
                <span className="ml-2 font-semibold text-sm">Přidat další neshodu</span>
              </button>
            </div>
          )}
        </div>
        
        <div className="p-4 bg-gray-50 border-t rounded-b-2xl flex-shrink-0">
            <button
                onClick={onClose}
                className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700"
            >
                Zavřít
            </button>
        </div>
      </div>
    </div>
  );
};
