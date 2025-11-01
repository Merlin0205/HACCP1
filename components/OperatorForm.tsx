import React, { useState, useEffect } from 'react';
import { Operator } from '../types';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(operatorData);
  };

  const title = initialData ? 'Upravit provozovatele' : 'Nový provozovatel';

  const renderField = (name: keyof OperatorData, label: string) => (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        id={name}
        name={name}
        value={operatorData[name] || ''}
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
          <legend className="text-xl font-semibold text-gray-800 mb-4 px-2">Provozovatel</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderField('operator_name', 'Název, obchodní firma')}
            {renderField('operator_address', 'Adresa sídla')}
            {renderField('operator_ico', 'IČO')}
            {renderField('operator_statutory_body', 'Statutární orgán')}
            {renderField('operator_phone', 'Mobil')}
            {renderField('operator_email', 'E-mail')}
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

