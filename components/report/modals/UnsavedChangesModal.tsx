import React from 'react';
import { Button } from '../../ui/Button';

interface UnsavedChangesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onOverwriteAndGenerate: () => void;
    onNewVersionAndGenerate: () => void;
    onGenerateOnly: () => void;
    isSaving: boolean;
}

export const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
    isOpen,
    onClose,
    onOverwriteAndGenerate,
    onNewVersionAndGenerate,
    onGenerateOnly,
    isSaving
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all">
                <div className="p-6">
                    <div className="flex items-center justify-center w-12 h-12 mx-auto bg-yellow-100 rounded-full mb-4">
                        <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-bold text-center text-gray-900 mb-2">
                        Máte neuložené změny
                    </h3>
                    <p className="text-sm text-center text-gray-500 mb-6">
                        Chcete změny před generováním PDF uložit do databáze?
                    </p>

                    <div className="flex flex-col gap-3">
                        <Button
                            variant="primary"
                            onClick={onOverwriteAndGenerate}
                            isLoading={isSaving}
                            className="w-full justify-center"
                        >
                            Přepsat a generovat PDF
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={onNewVersionAndGenerate}
                            isLoading={isSaving}
                            className="w-full justify-center bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200"
                        >
                            Uložit jako novou verzi a generovat PDF
                        </Button>
                        <div className="relative flex py-2 items-center">
                            <div className="flex-grow border-t border-gray-200"></div>
                            <span className="flex-shrink-0 mx-4 text-gray-400 text-xs">nebo</span>
                            <div className="flex-grow border-t border-gray-200"></div>
                        </div>
                        <Button
                            variant="secondary"
                            onClick={onGenerateOnly}
                            disabled={isSaving}
                            className="w-full justify-center"
                        >
                            Generovat bez uložení
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            disabled={isSaving}
                            className="w-full justify-center text-gray-500 hover:text-gray-700"
                        >
                            Zrušit
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
