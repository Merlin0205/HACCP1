import React, { useState } from 'react';
import { AuditStructure, AuditHeaderValues } from '../types';
import { Card, CardHeader, CardBody } from './ui/Card';
import { TextField } from './ui/Input';
import { Button } from './ui/Button';
import { BackIcon } from './icons';

interface HeaderFormProps {
    headerData: AuditStructure['header_data'];
    initialValues: AuditHeaderValues;
    onSaveAndBack: (headerValues: AuditHeaderValues) => void;
    onSaveAndContinue: (headerValues: AuditHeaderValues) => void;
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
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (id: string, value: string) => {
        setValues(prev => ({...prev, [id]: value}));
    };

    const handleSubmitAndContinue = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onSaveAndContinue(values);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveAndBack = async () => {
        setIsSubmitting(true);
        try {
            await onSaveAndBack(values);
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderSection = (section: any) => (
        <Card key={section.title}>
            <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
            </CardHeader>
            <CardBody>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {section.fields.map((field: any) => (
                        <TextField
                            key={field.id}
                            label={field.label}
                            type={field.type}
                            value={values[field.id] || ''}
                            onChange={(e) => handleChange(field.id, e.target.value)}
                            required
                        />
                    ))}
                </div>
            </CardBody>
        </Card>
    );

    return (
        <div className="w-full max-w-5xl mx-auto">
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
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Základní údaje auditu</h1>
                <p className="text-gray-600">Vyplňte základní informace před zahájením auditu</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitAndContinue} className="space-y-6">
                {Object.values(headerData).map(section => section.title && renderSection(section))}

                {/* Footer Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
                    <Button
                        variant="ghost"
                        onClick={onBack}
                        disabled={isSubmitting}
                        className="sm:w-auto"
                    >
                        Zrušit
                    </Button>
                    <div className="flex gap-3 flex-1 sm:flex-initial sm:justify-end">
                        <Button
                            variant="secondary"
                            type="button"
                            onClick={handleSaveAndBack}
                            isLoading={isSubmitting}
                            disabled={isSubmitting}
                        >
                            Uložit
                        </Button>
                        <Button
                            variant="primary"
                            type="submit"
                            isLoading={isSubmitting}
                            disabled={isSubmitting}
                        >
                            Pokračovat na checklist
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
};
