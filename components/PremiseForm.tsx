import React, { useState, useEffect } from 'react';
import { Premise } from '../types';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(premiseData);
  };

  const title = initialData ? 'Upravit pracoviště' : 'Nové pracoviště';

  const renderField = (name: keyof PremiseData, label: string) => (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        id={name}
        name={name}
        value={premiseData[name] || ''}
        onChange={handleChange}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        required
      />
    </div>
  );

  return (
    <div className="w-full max-w-4xl bg-white p-8 rounded-2xl shadow-xl animate-fade-in">
      <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">{title}</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <fieldset className="border-t-2 border-blue-500 pt-4">
          <legend className="text-xl font-semibold text-gray-800 mb-4 px-2">Auditované pracoviště</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderField('premise_name', 'Provozovna')}
            {renderField('premise_address', 'Adresa')}
            {renderField('premise_responsible_person', 'Odpovědná osoba')}
            {renderField('premise_phone', 'Mobil')}
            {renderField('premise_email', 'E-mail')}
          </div>
        </fieldset>

        <div className="flex justify-between pt-6">
          <button type="button" onClick={onBack} className="bg-gray-300 text-gray-800 font-bold py-2 px-6 rounded-lg hover:bg-gray-400 transition-colors">Zpět</button>
          <button type="submit" className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors">Uložit</button>
        </div>
      </form>
    </div>
  );
};

