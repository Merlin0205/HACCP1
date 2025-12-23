import React from 'react';
import { Button } from '../ui/Button';

interface SaveChoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onOverwrite: () => void;
    onNewVersion: () => void;
    isSaving: boolean;
}

export const SaveChoiceModal: React.FC<SaveChoiceModalProps> = ({
    isOpen,
    onClose,
    onOverwrite,
    onNewVersion,
    isSaving
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
            <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
                <h3 className="text-lg font-bold mb-4">Uložit změny</h3>
                <p className="text-gray-600 mb-6">
                    Chcete přepsat stávající verzi reportu, nebo vytvořit novou verzi?
                </p>

                <div className="flex flex-col gap-3">
                    <Button
                        variant="primary"
                        onClick={onOverwrite}
                        disabled={isSaving}
                        className="w-full justify-center"
                    >
                        {isSaving ? 'Ukládám...' : 'Přepsat stávající verzi'}
                    </Button>

                    <Button
                        variant="secondary"
                        onClick={onNewVersion}
                        disabled={isSaving}
                        className="w-full justify-center"
                    >
                        {isSaving ? 'Ukládám...' : 'Vytvořit novou verzi'}
                    </Button>

                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={isSaving}
                        className="w-full justify-center mt-2"
                    >
                        Zrušit
                    </Button>
                </div>
            </div>
        </div>
    );
};
