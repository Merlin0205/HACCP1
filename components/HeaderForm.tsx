import React, { useState } from 'react';
import { AuditStructure, AuditHeaderValues } from '../types';

interface HeaderFormProps {
    headerData: AuditStructure['header_data'];
    initialValues: AuditHeaderValues;
    onSaveAndBack: (headerValues: AuditHeaderValues) => void; // New handler for "Save"
    onSaveAndContinue: (headerValues: AuditHeaderValues) => void; // Renamed for clarity
    onBack: () => void;
}

export const HeaderForm: React.FC<HeaderFormProps> = ({ 
    headerData, 
    initialValues, 
    onSaveAndBack,
    onSaveAndContinue, 
    onBack 
}) => {
    const [values, setValues] = useState<AuditHeaderValues>(initialValues);

    const handleChange = (id: string, value: string) => {
        setValues(prev => ({...prev, [id]: value}));
    }

    // Handles "Save and Continue to Checklist"
    const handleSubmitAndContinue = (e: React.FormEvent) => {
        e.preventDefault();
        onSaveAndContinue(values);
    }

    // Handles "Save and Go Back to List"
    const handleSaveAndBack = () => {
        onSaveAndBack(values);
    }

    const renderSection = (section: any) => (
        <div key={section.title} className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <h3 className="text-xl font-bold text-gray-700 mb-4">{section.title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {section.fields.map((field : any) => (
                    <div key={field.id}>
                        <label htmlFor={field.id} className="block text-sm font-medium text-gray-600 mb-1">{field.label}</label>
                        <input
                            type={field.type}
                            id={field.id}
                            value={values[field.id] || ''}
                            onChange={(e) => handleChange(field.id, e.target.value)}
                            className="w-full px-3 py-2 bg-white text-gray-800 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-shadow"
                            required
                        />
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <form onSubmit={handleSubmitAndContinue} className="w-full max-w-4xl space-y-6 animate-fade-in">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h2 className="text-3xl font-bold text-gray-800">Základní údaje auditu</h2>
            </div>
            
            {Object.values(headerData).map(section => section.title && renderSection(section))}

            <div className="flex gap-4">
                 <button
                    type="button"
                    onClick={onBack}
                    className="w-1/4 bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                >
                    Zpět
                </button>
                <button
                    type="button"
                    onClick={handleSaveAndBack} // New Save button
                    className="w-1/2 bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition-colors"
                >
                    Uložit
                </button>
                <button
                    type="submit"
                    className="w-1/2 bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform transform hover:scale-105"
                >
                    Pokračovat na checklist
                </button>
            </div>
        </form>
    );
};
