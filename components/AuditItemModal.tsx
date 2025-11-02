import React from 'react';
import { AuditItem, AuditAnswer, NonComplianceData } from '../types';
import NonComplianceForm from './NonComplianceForm';
import { PlusIcon, CheckmarkIcon } from './icons';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Card, CardBody } from './ui/Card';

interface AuditItemModalProps {
  item: AuditItem | null;
  answer: AuditAnswer;
  onClose: () => void;
  onAnswerUpdate: (itemId: string, answer: AuditAnswer) => void;
  log: (message: string) => void;
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
    <Modal
      isOpen={true}
      onClose={onClose}
      title={item.title}
      size="lg"
      footer={
        <Button variant="primary" onClick={onClose} fullWidth>
          Zavřít
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Description */}
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-gray-700 leading-relaxed">{item.description}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant={isCompliant ? 'primary' : 'secondary'}
            onClick={handleSetCompliant}
            disabled={isCompliant}
            fullWidth
            leftIcon={<CheckmarkIcon className="h-5 w-5" />}
            className={isCompliant ? 'bg-accent-success hover:bg-green-700' : ''}
          >
            Vyhovuje
          </Button>
          <Button
            variant="danger"
            onClick={handleAddNonCompliance}
            fullWidth
          >
            Přidat neshodu
          </Button>
        </div>

        {/* Non-Compliance Forms */}
        {!isCompliant && answer.nonComplianceData && (
          <div className="space-y-4">
            {answer.nonComplianceData.map((nc, index) => (
              <Card key={index} className="border-l-4 border-accent-error">
                <CardBody>
                  <NonComplianceForm
                    data={nc}
                    index={index}
                    onChange={(field, value) => handleNonComplianceChange(index, field, value)}
                    onRemove={() => handleRemoveNonCompliance(index)}
                    log={log}
                  />
                </CardBody>
              </Card>
            ))}
            <Button
              variant="ghost"
              onClick={handleAddNonCompliance}
              fullWidth
              leftIcon={<PlusIcon className="h-5 w-5" />}
              className="border-2 border-dashed border-gray-300 hover:border-primary"
            >
              Přidat další neshodu
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
