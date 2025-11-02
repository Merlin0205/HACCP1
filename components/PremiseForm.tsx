import React, { useState, useEffect } from 'react';
import { Premise } from '../types';
import { Card, CardBody } from './ui/Card';
import { TextField } from './ui/Input';
import { Button } from './ui/Button';
import { BackIcon } from './icons';

type PremiseData = Omit<Premise, 'id'>;

interface PremiseFormProps {
  initialData: Premise | null;
  operatorId: string;
  onSave: (premiseData: PremiseData) => void;
  onBack: () => void;
}

export const PremiseForm: React.FC<PremiseFormProps> = ({ initialData, operatorId, onSave, onBack }) => {
  const defaultPremiseData: PremiseData = {
    operatorId: operatorId,
    premise_name: '',
    premise_address: '',
    premise_responsible_person: '',
    premise_phone: '',
    premise_email: ''
  };

  const [premiseData, setPremiseData] = useState<PremiseData>(defaultPremiseData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      const { id, ...dataToEdit } = initialData;
      setPremiseData({ ...defaultPremiseData, ...dataToEdit });
    } else {
      setPremiseData({ ...defaultPremiseData, operatorId });
    }
  }, [initialData, operatorId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPremiseData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(premiseData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = initialData ? 'Upravit pracoviště' : 'Nové pracoviště';

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={onBack}
          leftIcon={<BackIcon className="h-5 w-5" />}
          className="mb-4"
        >
          Zpět
        </Button>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-600">Vyplňte údaje o pracovišti</p>
      </div>

      {/* Form */}
      <Card>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Auditované pracoviště</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextField
                  label="Provozovna"
                  name="premise_name"
                  value={premiseData.premise_name || ''}
                  onChange={handleChange}
                  required
                />
                <TextField
                  label="Adresa"
                  name="premise_address"
                  value={premiseData.premise_address || ''}
                  onChange={handleChange}
                  required
                />
                <TextField
                  label="Odpovědná osoba"
                  name="premise_responsible_person"
                  value={premiseData.premise_responsible_person || ''}
                  onChange={handleChange}
                />
                <TextField
                  label="Mobil"
                  name="premise_phone"
                  type="tel"
                  value={premiseData.premise_phone || ''}
                  onChange={handleChange}
                />
                <TextField
                  label="E-mail"
                  name="premise_email"
                  type="email"
                  value={premiseData.premise_email || ''}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <Button variant="ghost" onClick={onBack} disabled={isSubmitting}>
                Zrušit
              </Button>
              <Button
                variant="primary"
                type="submit"
                isLoading={isSubmitting}
                disabled={isSubmitting}
              >
                Uložit
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
};
