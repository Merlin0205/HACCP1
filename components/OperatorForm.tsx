import React, { useState, useEffect } from 'react';
import { Operator } from '../types';
import { Card, CardBody } from './ui/Card';
import { TextField } from './ui/Input';
import { Button } from './ui/Button';
import { BackIcon } from './icons';

type OperatorData = Omit<Operator, 'id'>;

interface OperatorFormProps {
  initialData: Operator | null;
  onSave: (operatorData: OperatorData) => void;
  onBack: () => void;
}

export const OperatorForm: React.FC<OperatorFormProps> = ({ initialData, onSave, onBack }) => {
  const defaultOperatorData: OperatorData = {
    operator_name: '',
    operator_address: '',
    operator_ico: '',
    operator_statutory_body: '',
    operator_phone: '',
    operator_email: ''
  };

  const [operatorData, setOperatorData] = useState<OperatorData>(defaultOperatorData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      const { id, ...dataToEdit } = initialData;
      setOperatorData({ ...defaultOperatorData, ...dataToEdit });
    } else {
      setOperatorData(defaultOperatorData);
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setOperatorData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(operatorData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = initialData ? 'Upravit provozovatele' : 'Nový provozovatel';

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
        <p className="text-gray-600">Vyplňte údaje o provozovateli</p>
      </div>

      {/* Form */}
      <Card>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Provozovatel</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextField
                  label="Název, obchodní firma"
                  name="operator_name"
                  value={operatorData.operator_name || ''}
                  onChange={handleChange}
                  required
                />
                <TextField
                  label="IČO"
                  name="operator_ico"
                  value={operatorData.operator_ico || ''}
                  onChange={handleChange}
                  required
                />
                <TextField
                  label="Adresa sídla"
                  name="operator_address"
                  value={operatorData.operator_address || ''}
                  onChange={handleChange}
                  required
                />
                <TextField
                  label="Statutární orgán"
                  name="operator_statutory_body"
                  value={operatorData.operator_statutory_body || ''}
                  onChange={handleChange}
                />
                <TextField
                  label="Mobil"
                  name="operator_phone"
                  type="tel"
                  value={operatorData.operator_phone || ''}
                  onChange={handleChange}
                />
                <TextField
                  label="E-mail"
                  name="operator_email"
                  type="email"
                  value={operatorData.operator_email || ''}
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
