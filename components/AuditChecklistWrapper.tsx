import React, { useState, useEffect } from 'react';
import { AuditStructure, AuditData, AuditAnswer } from '../types';
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
  onPresentPersonUpdate?: (presentPerson: string) => void;
  log: (message: string) => void;
}

const AuditChecklistWrapper: React.FC<AuditChecklistWrapperProps> = (props) => {
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
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Průběh auditu</h1>
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
          </div>
        </div>
      </div>

      {/* Pouze nový design (starý design odstraněn) */}
      <AuditChecklistModern {...props} />
    </div>
  );
};

export default AuditChecklistWrapper;

