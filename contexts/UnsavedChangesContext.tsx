import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import ConfirmationModal from '../components/ConfirmationModal';

interface UnsavedChangesContextType {
    isDirty: boolean;
    setDirty: (dirty: boolean) => void;
    checkUnsavedChanges: (action: () => void) => void;
}

const UnsavedChangesContext = createContext<UnsavedChangesContextType | undefined>(undefined);

export const useUnsavedChanges = () => {
    const context = useContext(UnsavedChangesContext);
    if (!context) {
        throw new Error('useUnsavedChanges must be used within an UnsavedChangesProvider');
    }
    return context;
};

export const UnsavedChangesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isDirty, setIsDirty] = useState(false);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
    const [showModal, setShowModal] = useState(false);

    // Prevent browser tab closing
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isDirty]);

    const checkUnsavedChanges = useCallback((action: () => void) => {
        if (isDirty) {
            setPendingAction(() => action);
            setShowModal(true);
        } else {
            action();
        }
    }, [isDirty]);

    const handleConfirm = () => {
        setShowModal(false);
        setIsDirty(false); // Reset dirty state as we are navigating away
        if (pendingAction) {
            pendingAction();
            setPendingAction(null);
        }
    };

    const handleCancel = () => {
        setShowModal(false);
        setPendingAction(null);
    };

    return (
        <UnsavedChangesContext.Provider value={{ isDirty, setDirty: setIsDirty, checkUnsavedChanges }}>
            {children}
            <ConfirmationModal
                isOpen={showModal}
                title="Máte neuložené změny"
                message="Pokud odejdete, vaše změny budou ztraceny. Opravdu chcete pokračovat?"
                confirmButtonText="Odejít bez uložení"
                cancelButtonText="Zůstat"
                confirmButtonVariant="danger"
                onConfirm={handleConfirm}
                onCancel={handleCancel}
            />
        </UnsavedChangesContext.Provider>
    );
};
