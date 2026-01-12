import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { AuditStructure, AuditSection, AuditItem, AuditType } from '../types';
import {
    ChevronUp,
    ChevronDown,
    Trash2,
    Edit,
    Save,
    Plus,
    GripVertical,
    Check,
    X,
    Copy,
    Search,
    Filter,
    AlertTriangle
} from 'lucide-react';
import { ItemEditModal } from './ItemEditModal';
import { AuditTypeCard } from './AuditTypeCard';
import { TextField } from './ui/Input';
import { Button } from './ui/Button';
import { Card, CardBody } from './ui/Card';
import { Badge } from './ui/Badge';
import { ToggleSwitch } from 'flowbite-react';
import {
    fetchAllAuditTypes,
    fetchAuditType,
    createAuditType,
    updateAuditType,
    deleteAuditType,
    copyAuditType,
    migrateAuditStructureToTypes
} from '../services/firestore/auditTypes';

import { fetchAuditStructure } from '../services/firestore/settings';
import { toast } from '../utils/toast';
import { PageHeader } from './PageHeader';
import { SECTION_THEMES } from '../constants/designSystem';
import { AppState } from '../types';
import { Modal } from './ui/Modal';
import { EditableText } from './ui/EditableText';

interface AdminScreenProps {
    auditStructure: AuditStructure;
    setAuditStructure: React.Dispatch<React.SetStateAction<AuditStructure>>;
    onBack: () => void;
}

const CustomToggle: React.FC<{ checked: boolean; onChange: () => void; className?: string; title?: string }> = ({ checked, onChange, className = '', title }) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={(e) => {
            e.stopPropagation();
            onChange();
        }}
        className={`
            relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2
            ${checked ? 'bg-blue-600' : 'bg-gray-200'}
            ${className}
        `}
        title={title}
    >
        <span className="sr-only">Use setting</span>
        <span
            aria-hidden="true"
            className={`
                pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                ${checked ? 'translate-x-5' : 'translate-x-0'}
            `}
        />
    </button>
);

const SectionAdmin: React.FC<{
    section: AuditSection;
    onUpdateSection: (updatedSection: AuditSection) => void;
    onDeleteSection: (sectionId: string) => void;
    onAddItem: (sectionId: string) => void;
    onEditItemRequest: (item: AuditItem) => void;
    dragProps: any;
}> = ({ section, onUpdateSection, onDeleteSection, onAddItem, onEditItemRequest, dragProps }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState(section.title);
    const [showDeleteItemModal, setShowDeleteItemModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [showDeleteSectionModal, setShowDeleteSectionModal] = useState(false);

    const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

    const handleToggleItem = (itemId: string) => {
        const updatedItems = section.items.map(item =>
            item.id === itemId ? { ...item, active: !item.active } : item
        );
        onUpdateSection({ ...section, items: updatedItems });
    };

    const handleDeleteItem = (itemId: string) => {
        setItemToDelete(itemId);
        setShowDeleteItemModal(true);
    };

    const confirmDeleteItem = () => {
        if (itemToDelete) {
            const updatedItems = section.items.filter(item => item.id !== itemToDelete);
            onUpdateSection({ ...section, items: updatedItems });
            setShowDeleteItemModal(false);
            setItemToDelete(null);
        }
    };

    const handleSaveTitle = () => {
        onUpdateSection({ ...section, title: editedTitle });
        setIsEditing(false);
    };

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, itemId: string) => {
        setDraggedItemId(itemId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetItemId: string) => {
        e.preventDefault();
        if (!draggedItemId || draggedItemId === targetItemId) return;

        const items = [...section.items];
        const draggedIndex = items.findIndex(item => item.id === draggedItemId);
        const targetIndex = items.findIndex(item => item.id === targetItemId);

        const [removed] = items.splice(draggedIndex, 1);
        items.splice(targetIndex, 0, removed);

        onUpdateSection({ ...section, items });
        setDraggedItemId(null);
    };


    return (
        <div className="border border-gray-200 rounded-lg bg-white mb-4 shadow-sm">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-t-lg border-b border-gray-200">
                <div className="flex items-center gap-2 md:gap-4 flex-grow min-w-0">
                    <button {...dragProps} className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 hidden sm:block">
                        <GripVertical className="w-5 h-5" />
                    </button>
                    <button onClick={() => setIsOpen(!isOpen)} className="p-1 text-gray-600 hover:text-gray-800">
                        {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                    {isEditing ? (
                        <div className="flex items-center gap-2 flex-grow">
                            <input
                                type="text"
                                value={editedTitle}
                                onChange={(e) => setEditedTitle(e.target.value)}
                                onBlur={handleSaveTitle}
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                                className="text-lg font-bold text-gray-800 border-b-2 border-blue-500 bg-white focus:outline-none flex-grow min-w-0 px-2 py-1"
                                autoFocus
                            />
                            <Button size="sm" variant="primary" onClick={handleSaveTitle} className="py-0.5 px-2 text-xs">
                                <Save className="w-4 h-4" />
                            </Button>
                        </div>
                    ) : (
                        <h3 className="text-lg font-bold text-gray-800 truncate flex-grow min-w-0 cursor-pointer hover:text-blue-600" onClick={() => setIsOpen(!isOpen)}>
                            {section.title}
                        </h3>
                    )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    {!isEditing && (
                        <button onClick={() => setIsEditing(true)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-colors" title="Upravit název sekce">
                            <Edit className="w-5 h-5" />
                        </button>
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteSectionModal(true);
                        }}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-full transition-colors"
                        title="Smazat sekci"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                    <div className="ml-2">
                        <CustomToggle
                            checked={section.active}
                            onChange={() => onUpdateSection({ ...section, active: !section.active })}
                            title={section.active ? "Deaktivovat sekci" : "Aktivovat sekci"}
                        />
                    </div>
                </div>
            </div>
            {isOpen && (
                <div className={`p-4 space-y-2 transition-all ${!section.active ? 'opacity-50' : ''}`}>
                    {section.items.length === 0 ? (
                        <div className="text-center py-4 text-gray-500 italic">
                            Žádné položky v této sekci
                        </div>
                    ) : (
                        section.items.map(item => (
                            <div
                                key={item.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, item.id)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, item.id)}
                                className="flex items-center justify-between p-3 border border-gray-200 bg-white hover:bg-gray-50 rounded-lg shadow-sm transition-colors group"
                            >
                                <ItemAdmin
                                    item={item}
                                    onEditRequest={() => onEditItemRequest(item)}
                                    onDelete={() => handleDeleteItem(item.id)}
                                    onToggle={() => handleToggleItem(item.id)}
                                />
                            </div>
                        ))
                    )}
                    <Button
                        variant="secondary"
                        onClick={() => onAddItem(section.id)}
                        fullWidth
                        className="mt-4 border-dashed"
                        leftIcon={<Plus className="w-5 h-5" />}
                    >
                        Přidat položku
                    </Button>
                </div>
            )}

            {/* Modal pro smazání položky */}
            <Modal
                isOpen={showDeleteItemModal}
                onClose={() => setShowDeleteItemModal(false)}
                title="Smazat položku?"
            >
                <div className="space-y-4">
                    <p className="text-gray-600">
                        Opravdu si přejete smazat položku "{section.items.find(i => i.id === itemToDelete)?.title}"? Tato akce je nevratná.
                    </p>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="ghost" onClick={() => setShowDeleteItemModal(false)}>
                            Zrušit
                        </Button>
                        <Button variant="danger" onClick={confirmDeleteItem}>
                            Smazat
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Modal pro smazání sekce */}
            <Modal
                isOpen={showDeleteSectionModal}
                onClose={() => setShowDeleteSectionModal(false)}
                title="Smazat sekci?"
            >
                <div className="space-y-4">
                    <p className="text-gray-600">
                        Opravdu si přejete smazat sekci "{section.title}" včetně všech jejích položek ({section.items.length} položek)? Tato akce je nevratná.
                    </p>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="ghost" onClick={() => setShowDeleteSectionModal(false)}>
                            Zrušit
                        </Button>
                        <Button variant="danger" onClick={() => {
                            onDeleteSection(section.id);
                            setShowDeleteSectionModal(false);
                        }}>
                            Smazat
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

const ItemAdmin: React.FC<{
    item: AuditItem;
    onEditRequest: () => void;
    onDelete: () => void;
    onToggle: () => void;
}> = ({ item, onEditRequest, onDelete, onToggle }) => {
    return (
        <>
            <div className="flex items-center gap-3 flex-grow min-w-0">
                <span className="cursor-grab active:cursor-grabbing text-gray-400 hidden sm:block hover:text-gray-600">
                    <GripVertical className="w-4 h-4" />
                </span>
                <div className="flex flex-col">
                    <p className="text-gray-800 font-medium truncate" title={item.title}>
                        {item.title}
                    </p>
                    {item.description && (
                        <p className="text-xs text-gray-500 truncate max-w-md">
                            {item.description}
                        </p>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onEditRequest();
                    }}
                    className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                    title="Upravit položku"
                >
                    <Edit className="w-4 h-4" />
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                    title="Smazat položku"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
                <div className="ml-2">
                    <CustomToggle
                        checked={item.active}
                        onChange={onToggle}
                        className="scale-75 origin-right"
                    />
                </div>
            </div>
        </>
    );
};

const AdminScreen: React.FC<AdminScreenProps> = ({ auditStructure, setAuditStructure, onBack }) => {
    const [auditTypes, setAuditTypes] = useState<AuditType[]>([]);
    const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
    const [loadingTypes, setLoadingTypes] = useState(true);
    const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
    const [editingItemInfo, setEditingItemInfo] = useState<{ item: AuditItem; sectionId: string } | null>(null);
    const [saving, setSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [initialStructure, setInitialStructure] = useState<AuditStructure>(auditStructure);
    const [showAddTypeModal, setShowAddTypeModal] = useState(false);
    const [newTypeName, setNewTypeName] = useState('');
    const [copyFromTypeId, setCopyFromTypeId] = useState<string>('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [typeToDelete, setTypeToDelete] = useState<string | null>(null);
    const [showEditNameModal, setShowEditNameModal] = useState(false);
    const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
    const [editedTypeName, setEditedTypeName] = useState('');
    const [showCopyModal, setShowCopyModal] = useState(false);
    const [copyingTypeId, setCopyingTypeId] = useState<string | null>(null);
    const [copyNewName, setCopyNewName] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [reportTextNoNonCompliances, setReportTextNoNonCompliances] = useState<string>('');
    const [reportTextWithNonCompliances, setReportTextWithNonCompliances] = useState<string>('');
    const [initialReportTexts, setInitialReportTexts] = useState<{ noNonCompliances: string; withNonCompliances: string }>({ noNonCompliances: '', withNonCompliances: '' });

    // Načíst typy auditů při startu
    useEffect(() => {
        const loadAuditTypes = async () => {
            try {
                setLoadingTypes(true);
                const types = await fetchAllAuditTypes();
                // Přetypování pro kompatibilitu s types.ts
                setAuditTypes(types as unknown as AuditType[]);

                // Pokud neexistují žádné typy, migrovat současnou strukturu
                if (types.length === 0) {
                    const currentStructure = await fetchAuditStructure();
                    if (currentStructure) {
                        const migratedId = await migrateAuditStructureToTypes(currentStructure);
                        if (migratedId) {
                            const migratedType = await fetchAuditType(migratedId);
                            if (migratedType) {
                                setAuditTypes([migratedType as unknown as AuditType]);
                                setSelectedTypeId(migratedId);
                                setAuditStructure(migratedType.auditStructure);
                                setInitialStructure(migratedType.auditStructure);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('[AdminScreen] Error loading audit types:', error);
                toast.error('Chyba při načítání typů auditů');
            } finally {
                setLoadingTypes(false);
            }
        };

        loadAuditTypes();
    }, []);

    // Načíst strukturu při změně vybraného typu
    useEffect(() => {
        const loadSelectedType = async () => {
            if (!selectedTypeId) return;

            try {
                const type = await fetchAuditType(selectedTypeId);
                if (type) {
                    setAuditStructure(type.auditStructure);
                    setInitialStructure(type.auditStructure);
                    setReportTextNoNonCompliances(type.reportTextNoNonCompliances || '');
                    setReportTextWithNonCompliances(type.reportTextWithNonCompliances || '');
                    setInitialReportTexts({
                        noNonCompliances: type.reportTextNoNonCompliances || '',
                        withNonCompliances: type.reportTextWithNonCompliances || ''
                    });
                    setHasUnsavedChanges(false);
                }
            } catch (error) {
                console.error('[AdminScreen] Error loading selected type:', error);
                toast.error('Chyba při načítání typu auditu');
            }
        };

        loadSelectedType();
    }, [selectedTypeId]);

    // Aktualizovat initialStructure když se auditStructure načte z Firestore
    useEffect(() => {
        if (selectedTypeId) {
            setInitialStructure(auditStructure);
            setHasUnsavedChanges(false);
        }
    }, [selectedTypeId]); // Pouze při změně typu

    // Detekce neuložených změn
    const hasChanges = JSON.stringify(auditStructure) !== JSON.stringify(initialStructure) ||
        reportTextNoNonCompliances !== initialReportTexts.noNonCompliances ||
        reportTextWithNonCompliances !== initialReportTexts.withNonCompliances;
    useEffect(() => {
        setHasUnsavedChanges(hasChanges);
    }, [hasChanges, reportTextNoNonCompliances, reportTextWithNonCompliances]);

    // Filtrování a vyhledávání typů
    const filteredTypes = useMemo(() => {
        let filtered = auditTypes;

        // Filtr podle statusu
        if (filterStatus === 'active') {
            filtered = filtered.filter(t => t.active);
        } else if (filterStatus === 'inactive') {
            filtered = filtered.filter(t => !t.active);
        }

        // Vyhledávání
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(t =>
                t.name.toLowerCase().includes(query) ||
                t.auditStructure.audit_title?.toLowerCase().includes(query)
            );
        }

        return filtered;
    }, [auditTypes, filterStatus, searchQuery]);

    // Uložit do Firestore při kliknutí na tlačítko Uložit
    const saveToFirestore = useCallback(async (newStructure: AuditStructure) => {
        if (!selectedTypeId) {
            toast.error('Není vybrán typ auditu');
            return;
        }

        try {
            setSaving(true);
            console.log('[AdminScreen] Ukládám změny:', {
                auditTypeId: selectedTypeId,
                reportTextNoNonCompliances: reportTextNoNonCompliances?.substring(0, 50) + '...',
                reportTextWithNonCompliances: reportTextWithNonCompliances?.substring(0, 50) + '...'
            });

            await updateAuditType(selectedTypeId, {
                auditStructure: newStructure,
                reportTextNoNonCompliances: reportTextNoNonCompliances || '',
                reportTextWithNonCompliances: reportTextWithNonCompliances || ''
            });

            setInitialStructure(newStructure);
            setInitialReportTexts({
                noNonCompliances: reportTextNoNonCompliances,
                withNonCompliances: reportTextWithNonCompliances
            });
            setHasUnsavedChanges(false);
            setLastSaved(new Date());

            // Aktualizovat lokální state
            setAuditTypes(prev => prev.map(t =>
                t.id === selectedTypeId
                    ? {
                        ...t,
                        auditStructure: newStructure,
                        reportTextNoNonCompliances: reportTextNoNonCompliances || '',
                        reportTextWithNonCompliances: reportTextWithNonCompliances || '',
                        updatedAt: new Date()
                    }
                    : t
            ));

            toast.success('Změny byly uloženy');
        } catch (error) {
            console.error('[AdminScreen] Error saving audit structure:', error);
            toast.error('Chyba při ukládání struktury auditu: ' + (error instanceof Error ? error.message : String(error)));
            setHasUnsavedChanges(true);
        } finally {
            setSaving(false);
        }
    }, [selectedTypeId, reportTextNoNonCompliances, reportTextWithNonCompliances]);

    // Varování při odchodu pokud jsou neuložené změny
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges || saving) {
                e.preventDefault();
                e.returnValue = 'Máte neuložené změny. Opravdu chcete opustit stránku?';
                return e.returnValue;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges, saving]);

    const handleUpdateSection = (updatedSection: AuditSection) => {
        const newStructure = {
            ...auditStructure,
            audit_sections: auditStructure.audit_sections.map(sec =>
                sec.id === updatedSection.id ? updatedSection : sec
            )
        };
        setAuditStructure(newStructure);
        setHasUnsavedChanges(true);
    };

    const handleDeleteSection = (sectionId: string) => {
        const newStructure = {
            ...auditStructure,
            audit_sections: auditStructure.audit_sections.filter(sec => sec.id !== sectionId)
        };
        setAuditStructure(newStructure);
        setHasUnsavedChanges(true);
    };

    const handleAddItem = (sectionId: string) => {
        const newItem: AuditItem = {
            id: `custom-${Date.now()}`,
            title: "Nová položka",
            description: "",
            active: true,
            icon: 'checkmark' // Výchozí ikona
        };
        // Otevřít modal pro editaci nové položky
        setEditingItemInfo({ item: newItem, sectionId });
    };

    const handleAddSection = () => {
        const newSection: AuditSection = {
            id: `custom-sec-${Date.now()}`,
            title: "Nová sekce",
            items: [],
            active: true,
        };
        const newStructure = {
            ...auditStructure,
            audit_sections: [...auditStructure.audit_sections, newSection]
        };
        setAuditStructure(newStructure);
        setHasUnsavedChanges(true);
    };

    const handleSectionDragStart = (e: React.DragEvent<HTMLButtonElement>, sectionId: string) => {
        setDraggedSectionId(sectionId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleSectionDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handleSectionDrop = (e: React.DragEvent<HTMLDivElement>, targetSectionId: string) => {
        e.preventDefault();
        if (!draggedSectionId || draggedSectionId === targetSectionId) return;

        const newStructure = {
            ...auditStructure,
            audit_sections: (() => {
                const sections = [...auditStructure.audit_sections];
                const draggedIndex = sections.findIndex(sec => sec.id === draggedSectionId);
                const targetIndex = sections.findIndex(sec => sec.id === targetSectionId);

                const [removed] = sections.splice(draggedIndex, 1);
                sections.splice(targetIndex, 0, removed);

                return sections;
            })()
        };
        setAuditStructure(newStructure);
        setHasUnsavedChanges(true);
        setDraggedSectionId(null);
    };

    const handleEditItemRequest = (itemToEdit: AuditItem) => {
        const section = auditStructure.audit_sections.find(s => s.items.some(i => i.id === itemToEdit.id));
        if (section) {
            setEditingItemInfo({ item: itemToEdit, sectionId: section.id });
        }
    };

    const handleSaveEditedItem = (updatedItem: AuditItem, newSectionId: string) => {
        const oldSectionId = editingItemInfo!.sectionId;
        const isNewItem = !auditStructure.audit_sections
            .flatMap(s => s.items)
            .some(item => item.id === updatedItem.id);

        const newStructure = {
            ...auditStructure,
            audit_sections: (() => {
                let newSections = [...auditStructure.audit_sections];

                if (isNewItem) {
                    // Nová položka - přidat do sekce
                    newSections = newSections.map(section =>
                        section.id === newSectionId
                            ? { ...section, items: [...section.items, updatedItem] }
                            : section
                    );
                } else if (oldSectionId === newSectionId) {
                    // Existující položka ve stejné sekci - aktualizovat
                    newSections = newSections.map(section =>
                        section.id === oldSectionId
                            ? {
                                ...section,
                                items: section.items.map(item =>
                                    item.id === updatedItem.id ? updatedItem : item
                                ),
                            }
                            : section
                    );
                } else {
                    // Existující položka v jiné sekci - přesunout
                    newSections = newSections.map(section =>
                        section.id === oldSectionId
                            ? { ...section, items: section.items.filter(item => item.id !== updatedItem.id) }
                            : section
                    );

                    newSections = newSections.map(section =>
                        section.id === newSectionId
                            ? { ...section, items: [...section.items, updatedItem] }
                            : section
                    );
                }
                return newSections;
            })()
        };

        setAuditStructure(newStructure);
        setHasUnsavedChanges(true);
        setEditingItemInfo(null);
    };



    const handleManualSave = async () => {
        await saveToFirestore(auditStructure);
    };

    const handleCloseEditModal = () => {
        setEditingItemInfo(null);
    };

    const handleTypeSelect = async (typeId: string) => {
        if (hasUnsavedChanges) {
            const confirm = window.confirm('Máte neuložené změny. Opravdu chcete přepnout na jiný typ? Změny budou ztraceny.');
            if (!confirm) return;
        }
        setSelectedTypeId(typeId);
    };

    const handleToggleTypeActive = async (typeId: string) => {
        const type = auditTypes.find(t => t.id === typeId);
        if (!type) return;

        try {
            await updateAuditType(typeId, { active: !type.active });
            setAuditTypes(prev => prev.map(t =>
                t.id === typeId ? { ...t, active: !t.active } : t
            ));
            toast.success(`Typ "${type.name}" byl ${!type.active ? 'aktivován' : 'deaktivován'}`);
        } catch (error) {
            console.error('[AdminScreen] Error toggling type active:', error);
            toast.error('Chyba při změně stavu typu');
        }
    };

    const handleEditTypeName = async (typeId: string, newName?: string) => {
        const type = auditTypes.find(t => t.id === typeId);
        if (!type) return;

        // Pokud je předán nový název, použít ho (inline editace)
        if (newName !== undefined && newName.trim() && newName !== type.name) {
            try {
                await updateAuditType(typeId, { name: newName.trim() });
                const updatedTypes = await fetchAllAuditTypes();
                setAuditTypes(updatedTypes as unknown as AuditType[]);

                // Pokud byl upravený typ aktuálně vybraný, aktualizovat
                if (typeId === selectedTypeId) {
                    const updatedType = updatedTypes.find(t => t.id === typeId);
                    if (updatedType) {
                        setSelectedTypeId(updatedType.id); // ID se může změnit při změně názvu
                    }
                }

                toast.success('Název typu byl aktualizován');
            } catch (error) {
                console.error('[AdminScreen] Error updating type name:', error);
                toast.error('Chyba při aktualizaci názvu typu');
            }
        } else {
            // Pokud není předán název, otevřít modal pro editaci
            setEditingTypeId(typeId);
            setEditedTypeName(type.name);
            setShowEditNameModal(true);
        }
    };

    const handleSaveTypeName = async () => {
        if (!editingTypeId || !editedTypeName.trim()) {
            toast.error('Zadejte název typu');
            return;
        }

        try {
            await updateAuditType(editingTypeId, { name: editedTypeName.trim() });
            const updatedTypes = await fetchAllAuditTypes();
            setAuditTypes(updatedTypes as unknown as AuditType[]);

            // Pokud byl upravený typ aktuálně vybraný, aktualizovat
            if (editingTypeId === selectedTypeId) {
                const updatedType = updatedTypes.find(t => t.id === editingTypeId);
                if (updatedType) {
                    setSelectedTypeId(updatedType.id); // ID se může změnit při změně názvu
                }
            }

            setShowEditNameModal(false);
            setEditingTypeId(null);
            setEditedTypeName('');
            toast.success('Název typu byl aktualizován');
        } catch (error) {
            console.error('[AdminScreen] Error updating type name:', error);
            toast.error('Chyba při aktualizaci názvu typu');
        }
    };

    const handleAddType = async () => {
        if (!newTypeName.trim()) {
            toast.error('Zadejte název typu auditu');
            return;
        }

        try {
            let structureToUse = auditStructure;

            // Pokud se kopíruje z jiného typu, načíst jeho strukturu
            if (copyFromTypeId) {
                const sourceType = await fetchAuditType(copyFromTypeId);
                if (sourceType) {
                    structureToUse = sourceType.auditStructure;
                }
            }

            const newTypeId = await createAuditType(newTypeName.trim(), structureToUse, copyFromTypeId || undefined);
            const newType = await fetchAuditType(newTypeId);

            if (newType) {
                setAuditTypes(prev => [...prev, newType as unknown as AuditType]);
                setSelectedTypeId(newTypeId);
                setAuditStructure(newType.auditStructure);
                setInitialStructure(newType.auditStructure);
                setHasUnsavedChanges(false);
                setShowAddTypeModal(false);
                setNewTypeName('');
                setCopyFromTypeId('');
                toast.success(`Typ "${newType.name}" byl vytvořen`);
            }
        } catch (error) {
            console.error('[AdminScreen] Error creating audit type:', error);
            toast.error('Chyba při vytváření typu auditu');
        }
    };

    const handleDeleteType = async () => {
        if (!typeToDelete) return;

        const type = auditTypes.find(t => t.id === typeToDelete);
        if (!type) return;

        try {
            await deleteAuditType(typeToDelete);
            setAuditTypes(prev => prev.filter(t => t.id !== typeToDelete));

            // Pokud byl smazán aktuálně vybraný typ, vybrat první dostupný
            if (selectedTypeId === typeToDelete) {
                const remainingTypes = auditTypes.filter(t => t.id !== typeToDelete);
                if (remainingTypes.length > 0) {
                    const firstType = remainingTypes[0];
                    setSelectedTypeId(firstType.id);
                    setAuditStructure(firstType.auditStructure);
                    setInitialStructure(firstType.auditStructure);
                } else {
                    setSelectedTypeId(null);
                }
            }

            setShowDeleteModal(false);
            setTypeToDelete(null);
            toast.success(`Typ "${type.name}" byl smazán`);
        } catch (error) {
            console.error('[AdminScreen] Error deleting audit type:', error);
            toast.error('Chyba při mazání typu auditu');
        }
    };

    const handleCopyType = (typeId: string) => {
        const type = auditTypes.find(t => t.id === typeId);
        if (!type) return;
        setCopyingTypeId(typeId);
        setCopyNewName(`${type.name} (kopie)`);
        setShowCopyModal(true);
    };

    const handleConfirmCopy = async () => {
        if (!copyingTypeId || !copyNewName.trim()) {
            toast.error('Zadejte název pro kopii');
            return;
        }

        try {
            const newTypeId = await copyAuditType(copyingTypeId, copyNewName.trim());
            const newType = await fetchAuditType(newTypeId);

            if (newType) {
                setAuditTypes(prev => [...prev, newType as unknown as AuditType]);
                toast.success(`Kopie "${newType.name}" byla vytvořena`);
                setShowCopyModal(false);
                setCopyingTypeId(null);
                setCopyNewName('');
            }
        } catch (error) {
            console.error('[AdminScreen] Error copying audit type:', error);
            toast.error('Chyba při kopírování typu auditu');
        }
    };

    return (
        <div className="w-full max-w-7xl mx-auto">
            <PageHeader
                section={SECTION_THEMES[AppState.SETTINGS]}
                title="Administrace Auditů"
                description="Správa typů auditů a jejich struktury"
                onBack={onBack}
            />

            {/* Výběr typu auditu */}
            <Card className="mb-6">
                <CardBody>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold text-gray-800">Typy auditů</h2>
                            <Badge color="gray">{auditTypes.length}</Badge>
                        </div>
                        <div className="flex gap-2">

                            <Button
                                variant="primary"
                                onClick={() => setShowAddTypeModal(true)}
                                leftIcon={<Plus className="w-4 h-4" />}
                            >
                                Nový typ auditu
                            </Button>
                        </div>
                    </div>

                    {/* Filtry */}
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="relative flex-grow">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:border-blue-300 focus:ring focus:ring-blue-200 sm:text-sm transition duration-150 ease-in-out"
                                placeholder="Hledat typ auditu..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant={filterStatus === 'all' ? 'primary' : 'secondary'}
                                onClick={() => setFilterStatus('all')}
                                size="sm"
                            >
                                Všechny
                            </Button>
                            <Button
                                variant={filterStatus === 'active' ? 'primary' : 'secondary'}
                                onClick={() => setFilterStatus('active')}
                                size="sm"
                            >
                                Aktivní
                            </Button>
                            <Button
                                variant={filterStatus === 'inactive' ? 'primary' : 'secondary'}
                                onClick={() => setFilterStatus('inactive')}
                                size="sm"
                            >
                                Neaktivní
                            </Button>
                        </div>
                    </div>

                    {/* Grid typů auditů */}
                    {loadingTypes ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">Načítání typů auditů...</p>
                        </div>
                    ) : filteredTypes.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                            <p className="text-gray-600">Žádné typy auditů nenalezeny</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredTypes.map(type => (
                                <AuditTypeCard
                                    key={type.id}
                                    type={type}
                                    isSelected={selectedTypeId === type.id}
                                    onSelect={() => handleTypeSelect(type.id)}
                                    onToggleActive={() => handleToggleTypeActive(type.id)}
                                    onEditName={(newName) => handleEditTypeName(type.id, newName)}
                                    onDelete={() => {
                                        setTypeToDelete(type.id);
                                        setShowDeleteModal(true);
                                    }}
                                    onCopy={() => handleCopyType(type.id)}
                                />
                            ))}
                        </div>
                    )}
                </CardBody>
            </Card>

            {/* Editor struktury auditu */}
            {selectedTypeId && (
                <Card>
                    <CardBody>
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">
                                    Editor struktury: {auditTypes.find(t => t.id === selectedTypeId)?.name}
                                </h2>
                                <p className="text-gray-500 text-sm mt-1">
                                    Upravte sekce a položky auditu. Změny se ukládají tlačítkem "Uložit změny".
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                {hasUnsavedChanges && (
                                    <span className="text-amber-600 font-medium flex items-center gap-1 animate-pulse">
                                        <AlertTriangle className="w-4 h-4" />
                                        Neuložené změny
                                    </span>
                                )}
                                <Button
                                    variant="primary"
                                    onClick={handleManualSave}
                                    disabled={saving || !hasUnsavedChanges}
                                    isLoading={saving}
                                    leftIcon={<Save className="w-4 h-4" />}
                                >
                                    {saving ? 'Ukládám...' : 'Uložit změny'}
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {auditStructure.audit_sections.map((section) => (
                                <div
                                    key={section.id}
                                    draggable
                                    onDragStart={(e) => handleSectionDragStart(e as any, section.id)}
                                    onDragOver={handleSectionDragOver}
                                    onDrop={(e) => handleSectionDrop(e, section.id)}
                                >
                                    <SectionAdmin
                                        section={section}
                                        onUpdateSection={handleUpdateSection}
                                        onDeleteSection={() => handleDeleteSection(section.id)}
                                        onAddItem={handleAddItem}
                                        onEditItemRequest={handleEditItemRequest}
                                        dragProps={{
                                            draggable: true,
                                            onDragStart: (e: any) => handleSectionDragStart(e, section.id)
                                        }}
                                    />
                                </div>
                            ))}

                            <Button
                                variant="ghost"
                                onClick={handleAddSection}
                                fullWidth
                                className="py-4 border-2 border-dashed border-gray-300 hover:border-blue-400 text-gray-600 hover:text-blue-600"
                                leftIcon={<Plus className="w-6 h-6" />}
                            >
                                Přidat novou sekci
                            </Button>
                        </div>

                        {/* Sekce pro texty reportu */}
                        <div className="mt-8 pt-8 border-t-2 border-gray-200">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Texty pro report</h3>
                            <p className="text-sm text-gray-600 mb-6">
                                Nastavte texty, které se zobrazí v reportu podle toho, zda byly nalezeny neshody.
                            </p>

                            <div className="space-y-6">
                                {/* Text když nejsou neshody */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Text když nejsou neshody
                                    </label>
                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                        {/* WYSIWYG šířka – odpovídá šířce obsahu stránky v reportu (A4 210mm - 2×5mm padding = 200mm) */}
                                        <div className="mx-auto" style={{ width: '200mm', maxWidth: '100%' }}>
                                            <EditableText
                                                value={reportTextNoNonCompliances}
                                                onChange={(val) => {
                                                    setReportTextNoNonCompliances(val);
                                                    setHasUnsavedChanges(true);
                                                }}
                                                className="min-h-[200px] font-sans text-sm text-gray-700 bg-white rounded border border-gray-200 p-3"
                                                placeholder="Zadejte text, který se zobrazí v reportu když všechny položky vyhovují..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Text když jsou neshody */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Text když jsou neshody
                                    </label>
                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                        <div className="mx-auto" style={{ width: '200mm', maxWidth: '100%' }}>
                                            <EditableText
                                                value={reportTextWithNonCompliances}
                                                onChange={(val) => {
                                                    setReportTextWithNonCompliances(val);
                                                    setHasUnsavedChanges(true);
                                                }}
                                                className="min-h-[200px] font-sans text-sm text-gray-700 bg-white rounded border border-gray-200 p-3"
                                                placeholder="Zadejte text, který se zobrazí v reportu když byly nalezeny neshody..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            )}

            {/* Modals */}

            {/* Modal pro přidání nového typu */}
            <Modal
                isOpen={showAddTypeModal}
                onClose={() => setShowAddTypeModal(false)}
                title="Nový typ auditu"
            >
                <div className="space-y-4">
                    <TextField
                        label="Název typu auditu"
                        value={newTypeName}
                        onChange={(e) => setNewTypeName(e.target.value)}
                        placeholder="Např. Školní jídelna"
                        autoFocus
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Kopírovat strukturu z (volitelné)
                        </label>
                        <select
                            value={copyFromTypeId}
                            onChange={(e) => setCopyFromTypeId(e.target.value)}
                            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        >
                            <option value="">-- Prázdný audit --</option>
                            {auditTypes.map(type => (
                                <option key={type.id} value={type.id}>
                                    {type.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="ghost" onClick={() => setShowAddTypeModal(false)}>
                            Zrušit
                        </Button>
                        <Button variant="primary" onClick={handleAddType}>
                            Vytvořit
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Modal pro smazání typu */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title="Smazat typ auditu?"
            >
                <div className="space-y-4">
                    <p className="text-gray-600">
                        Opravdu si přejete smazat typ auditu "{auditTypes.find(t => t.id === typeToDelete)?.name}"?
                        Tato akce je nevratná a smaže i definici struktury tohoto auditu.
                    </p>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
                            Zrušit
                        </Button>
                        <Button variant="danger" onClick={handleDeleteType}>
                            Smazat
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Modal pro editaci názvu */}
            <Modal
                isOpen={showEditNameModal}
                onClose={() => setShowEditNameModal(false)}
                title="Upravit název typu"
            >
                <div className="space-y-4">
                    <TextField
                        label="Název typu auditu"
                        value={editedTypeName}
                        onChange={(e) => setEditedTypeName(e.target.value)}
                        autoFocus
                    />
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="ghost" onClick={() => setShowEditNameModal(false)}>
                            Zrušit
                        </Button>
                        <Button variant="primary" onClick={handleSaveTypeName}>
                            Uložit
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Modal pro kopírování typu */}
            <Modal
                isOpen={showCopyModal}
                onClose={() => setShowCopyModal(false)}
                title="Vytvořit kopii typu"
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-500 mb-2">
                        Vytvoří se nový typ auditu se stejnou strukturou jako "{auditTypes.find(t => t.id === copyingTypeId)?.name}".
                    </p>
                    <TextField
                        label="Název nové kopie"
                        value={copyNewName}
                        onChange={(e) => setCopyNewName(e.target.value)}
                        autoFocus
                    />
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="ghost" onClick={() => setShowCopyModal(false)}>
                            Zrušit
                        </Button>
                        <Button variant="primary" onClick={handleConfirmCopy}>
                            Vytvořit kopii
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Modal pro editaci položky */}
            {editingItemInfo && (
                <ItemEditModal
                    item={editingItemInfo.item}
                    currentSectionId={editingItemInfo.sectionId}
                    allSections={auditStructure.audit_sections}
                    onSave={handleSaveEditedItem}
                    onClose={handleCloseEditModal}
                />
            )}
        </div>
    );
};

export default AdminScreen;
