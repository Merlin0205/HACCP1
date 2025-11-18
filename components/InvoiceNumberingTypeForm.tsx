/**
 * InvoiceNumberingTypeForm - Formulář pro přidání/úpravu typu číslování faktur
 */

import React, { useState, useEffect } from 'react';
import { InvoiceNumberingType } from '../types';
import { Card, CardBody } from './ui/Card';
import { TextField } from './ui/Input';
import { Button } from './ui/Button';

type InvoiceNumberingTypeData = Omit<InvoiceNumberingType, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;

interface InvoiceNumberingTypeFormProps {
  initialData: InvoiceNumberingType | null;
  onSave: (typeData: InvoiceNumberingTypeData) => void;
  onBack: () => void;
}

export const InvoiceNumberingTypeForm: React.FC<InvoiceNumberingTypeFormProps> = ({ 
  initialData, 
  onSave, 
  onBack 
}) => {
  const defaultTypeData: InvoiceNumberingTypeData = {
    name: '',
    prefix: '',
    nextNumber: 1,
    padding: 3
  };

  const [typeData, setTypeData] = useState<InvoiceNumberingTypeData>(defaultTypeData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      const { id, userId, createdAt, updatedAt, ...dataToEdit } = initialData;
      setTypeData(dataToEdit);
    } else {
      setTypeData(defaultTypeData);
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setTypeData(prev => ({
      ...prev,
      [name]: type === 'number' ? (parseInt(value) || 0) : value
    }));
    
    // Vymazat chybu pro toto pole
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!typeData.name.trim()) {
      newErrors.name = 'Název typu číslování je povinný';
    }

    if (!typeData.prefix.trim()) {
      newErrors.prefix = 'Prefix je povinný';
    }

    if (typeData.nextNumber < 1) {
      newErrors.nextNumber = 'Další číslo musí být alespoň 1';
    }

    if (typeData.padding < 1 || typeData.padding > 10) {
      newErrors.padding = 'Počet číslic musí být mezi 1 a 10';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(typeData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const exampleNumber = typeData.prefix 
    ? `${typeData.prefix}${String(typeData.nextNumber).padStart(typeData.padding, '0')}`
    : '';

  return (
    <div className="w-full">
      <p className="text-gray-600 mb-6">Vyplňte údaje o typu číslování faktur</p>

      <Card>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <TextField
                label="Název typu číslování"
                name="name"
                value={typeData.name}
                onChange={handleChange}
                placeholder="např. Standardní faktury, Zálohy, Dobropisy"
                required
                error={errors.name}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <TextField
                  label="Prefix"
                  name="prefix"
                  value={typeData.prefix}
                  onChange={handleChange}
                  placeholder="např. FA, 2025-, ZAL"
                  required
                  error={errors.prefix}
                />
                <TextField
                  label="Další číslo"
                  name="nextNumber"
                  type="number"
                  value={typeData.nextNumber}
                  onChange={handleChange}
                  min={1}
                  required
                  error={errors.nextNumber}
                />
                <TextField
                  label="Počet číslic (padding)"
                  name="padding"
                  type="number"
                  value={typeData.padding}
                  onChange={handleChange}
                  min={1}
                  max={10}
                  required
                  error={errors.padding}
                />
              </div>

              {exampleNumber && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Příklad:</span> {exampleNumber}
                  </p>
                </div>
              )}
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

