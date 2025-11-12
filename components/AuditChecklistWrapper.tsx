import React, { useState, useEffect } from 'react';
import { AuditStructure, AuditData, AuditItem, AuditAnswer } from '../types';
import AuditChecklist from './AuditChecklist';
import AuditChecklistModern from './AuditChecklistModern';

interface AuditChecklistWrapperProps {
  auditStructure: AuditStructure;
  auditData: AuditData;
  onAnswerUpdate: (itemId: string, answer: AuditAnswer) => void;
  onComplete: () => void;
  onBack: () => void;
  onSaveProgress?: () => void;
  onCompletedAtUpdate?: (completedAt: string) => void;
  onNoteUpdate?: (note: string) => void;
  log: (message: string) => void;
}

const AuditChecklistWrapper: React.FC<AuditChecklistWrapperProps> = (props) => {
  const [designVersion, setDesignVersion] = useState<'classic' | 'modern'>(() => {
    // Načíst z localStorage, default je 'classic'
    const saved = localStorage.getItem('auditDesignVersion');
    return (saved === 'modern' || saved === 'classic') ? saved : 'classic';
  });

  const [completedAtLocal, setCompletedAtLocal] = useState<string>(() => {
    if (props.auditData.completedAt) {
      return props.auditData.completedAt.split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  });

  useEffect(() => {
    if (props.auditData.completedAt) {
      setCompletedAtLocal(props.auditData.completedAt.split('T')[0]);
    }
  }, [props.auditData.completedAt]);

  const handleToggleDesign = () => {
    const newVersion = designVersion === 'classic' ? 'modern' : 'classic';
    setDesignVersion(newVersion);
    localStorage.setItem('auditDesignVersion', newVersion);
  };

  const handleCompletedAtChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setCompletedAtLocal(newDate);
    if (props.onCompletedAtUpdate) {
      const isoDate = newDate ? new Date(newDate).toISOString() : '';
      props.onCompletedAtUpdate(isoDate);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Toggle přepínač - společný pro oba designy */}
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Průběh auditu</h1>
            {designVersion === 'modern' && (
              <div className="flex items-center gap-2">
                <label htmlFor="completedAt" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  Datum dokončení:
                </label>
                <input
                  type="date"
                  id="completedAt"
                  value={completedAtLocal}
                  onChange={handleCompletedAtChange}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${designVersion === 'classic' ? 'text-gray-900' : 'text-gray-500'}`}>
              Starý design
            </span>
            <button
              onClick={handleToggleDesign}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                designVersion === 'modern' ? 'bg-blue-600' : 'bg-gray-300'
              }`}
              aria-label="Přepnout design"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                  designVersion === 'modern' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${designVersion === 'modern' ? 'text-gray-900' : 'text-gray-500'}`}>
              Nový design
            </span>
          </div>
        </div>
      </div>

      {/* Render vybrané komponenty */}
      <div className={designVersion === 'classic' ? '[&_h1]:hidden' : ''}>
        {designVersion === 'classic' ? (
          <AuditChecklist {...props} />
        ) : (
          <AuditChecklistModern {...props} />
        )}
      </div>
    </div>
  );
};

export default AuditChecklistWrapper;

