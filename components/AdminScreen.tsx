import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { AuditStructure, AuditSection, AuditItem, AuditType } from '../types';
import { 
    ArrowUpIcon, 
    ArrowDownIcon, 
    TrashIcon, 
    EditIcon, 
    SaveIcon, 
    PlusIcon, 
    DragHandleIcon 
} from './icons';
import { ItemEditModal } from './ItemEditModal';
import { AuditTypeCard } from './AuditTypeCard';
import { TextField } from './ui/Input';
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

interface AdminScreenProps {
  auditStructure: AuditStructure;
  setAuditStructure: React.Dispatch<React.SetStateAction<AuditStructure>>;
}

const Switch: React.FC<{ checked: boolean; onChange: () => void, id: string }> = ({ checked, onChange, id }) => (
    <label htmlFor={id} className="flex items-center cursor-pointer">
        <div className="relative">
            <input id={id} type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
            <div className={`block w-14 h-8 rounded-full ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${checked ? 'translate-x-6' : ''}`}></div>
        </div>
    </label>
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
        
        onUpdateSection({...section, items });
        setDraggedItemId(null);
    };


    return (
        <div className="border border-gray-200 rounded-lg bg-white">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-t-lg">
                <div className="flex items-center gap-2 md:gap-4 flex-grow min-w-0">
                    <button {...dragProps} className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hidden sm:block"><DragHandleIcon /></button>
                    <button onClick={() => setIsOpen(!isOpen)} className="p-1 text-gray-600 hover:text-gray-800">
                        {isOpen ? <ArrowUpIcon /> : <ArrowDownIcon />}
                    </button>
                     {isEditing ? (
                        <input 
                            type="text"
                            value={editedTitle}
                            onChange={(e) => setEditedTitle(e.target.value)}
                            onBlur={handleSaveTitle}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                            className="text-lg font-bold text-gray-800 border-b-2 border-blue-500 bg-white focus:outline-none flex-grow min-w-0"
                            autoFocus
                        />
                    ) : (
                        <h3 className="text-lg font-bold text-gray-800 truncate flex-grow min-w-0">{section.title}</h3>
                    )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {isEditing ? (
                        <button onClick={handleSaveTitle} className="p-2 text-green-600 hover:bg-green-100 rounded-full transition-colors" title="Uložit název">
                            <SaveIcon className="h-5 w-5" />
                        </button>
                    ) : (
                        <button onClick={() => setIsEditing(true)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-colors" title="Upravit název sekce">
                            <EditIcon className="h-5 w-5" />
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
                        <TrashIcon className="h-5 w-5" />
                    </button>
                    <Switch 
                        id={`section-${section.id}`}
                        checked={section.active} 
                        onChange={() => onUpdateSection({ ...section, active: !section.active })}
                    />
                </div>
            </div>
            {isOpen && (
                <div className={`p-4 space-y-1 transition-all ${!section.active ? 'opacity-50 pointer-events-none' : ''}`}>
                    {section.items.map(item => (
                        <div 
                            key={item.id} 
                            draggable
                            onDragStart={(e) => handleDragStart(e, item.id)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, item.id)}
                            className="flex items-center justify-between p-2 border-l-4 border-gray-200 hover:bg-gray-50 rounded-r-md gap-2"
                        >
                            <ItemAdmin
                                item={item}
                                onEditRequest={() => onEditItemRequest(item)}
                                onDelete={() => handleDeleteItem(item.id)}
                                onToggle={() => handleToggleItem(item.id)}
                             />
                        </div>
                    ))}
                     <button 
                        onClick={() => onAddItem(section.id)} 
                        className="mt-2 flex items-center justify-center w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 hover:border-blue-400 transition-colors"
                      >
                        <PlusIcon className="w-5 h-5" />
                        <span className="ml-2 font-semibold text-sm">Přidat položku</span>
                      </button>
                </div>
            )}

            {/* Modal pro smazání položky */}
            {showDeleteItemModal && itemToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Smazat položku?</h2>
                        <p className="text-gray-600 mb-6">
                            Opravdu si přejete smazat položku "{section.items.find(i => i.id === itemToDelete)?.title}"? Tato akce je nevratná.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteItemModal(false);
                                    setItemToDelete(null);
                                }}
                                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
                            >
                                Zrušit
                            </button>
                            <button
                                onClick={confirmDeleteItem}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                            >
                                Smazat
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal pro smazání sekce */}
            {showDeleteSectionModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Smazat sekci?</h2>
                        <p className="text-gray-600 mb-6">
                            Opravdu si přejete smazat sekci "{section.title}" včetně všech jejích položek ({section.items.length} položek)? Tato akce je nevratná.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteSectionModal(false)}
                                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
                            >
                                Zrušit
                            </button>
                            <button
                                onClick={() => {
                                    onDeleteSection(section.id);
                                    setShowDeleteSectionModal(false);
                                }}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                            >
                                Smazat
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
            <div className="flex items-center gap-2 flex-grow min-w-0">
                 <span className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hidden sm:block"><DragHandleIcon /></span>
                 <p className="text-gray-700 truncate" title={item.title}>
                     {item.title}
                 </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onEditRequest(); // Otevřít modal pro kompletní editaci
                    }}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Upravit položku"
                >
                    <EditIcon className="h-3.5 w-3.5" />
                </button>
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }} 
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Smazat položku"
                >
                    <TrashIcon className="h-3.5 w-3.5" />
                </button>
                <Switch 
                    id={`item-${item.id}`}
                    checked={item.active} 
                    onChange={onToggle}
                />
            </div>
        </>
    );
};

const AdminScreen: React.FC<AdminScreenProps> = ({ auditStructure, setAuditStructure }) => {
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

    // Načíst typy auditů při startu
    useEffect(() => {
        const loadAuditTypes = async () => {
            try {
                setLoadingTypes(true);
                const types = await fetchAllAuditTypes();
                setAuditTypes(types);
                
                // Pokud neexistují žádné typy, migrovat současnou strukturu
                if (types.length === 0) {
                    const currentStructure = await fetchAuditStructure();
                    if (currentStructure) {
                        const migratedId = await migrateAuditStructureToTypes(currentStructure);
                        if (migratedId) {
                            const migratedType = await fetchAuditType(migratedId);
                            if (migratedType) {
                                setAuditTypes([migratedType]);
                                setSelectedTypeId(migratedId);
                                setAuditStructure(migratedType.auditStructure);
                                setInitialStructure(migratedType.auditStructure);
                            }
                        }
                    }
                } else {
                    // NENASTAVOVAT automaticky vybraný typ - nechat uživatele vybrat
                    // Pokud jsou typy načtené, zobrazí se grid karet
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
    const hasChanges = JSON.stringify(auditStructure) !== JSON.stringify(initialStructure);
    useEffect(() => {
        setHasUnsavedChanges(hasChanges);
    }, [hasChanges]);

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
            await updateAuditType(selectedTypeId, { auditStructure: newStructure });
            setInitialStructure(newStructure);
            setHasUnsavedChanges(false);
            setLastSaved(new Date());
            
            // Aktualizovat lokální state
            setAuditTypes(prev => prev.map(t => 
                t.id === selectedTypeId 
                    ? { ...t, auditStructure: newStructure, updatedAt: new Date() }
                    : t
            ));
            
            toast.success('Změny byly uloženy');
        } catch (error) {
            console.error('[AdminScreen] Error saving audit structure:', error);
            toast.error('Chyba při ukládání struktury auditu');
            setHasUnsavedChanges(true);
        } finally {
            setSaving(false);
        }
    }, [selectedTypeId]);

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
                setAuditTypes(updatedTypes);
                
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
            setAuditTypes(updatedTypes);
            
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
                setAuditTypes(prev => [...prev, newType]);
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
                setAuditTypes(prev => [...prev, newType]);
                setShowCopyModal(false);
                setCopyingTypeId(null);
                setCopyNewName('');
                toast.success(`Typ "${newType.name}" byl vytvořen`);
            }
        } catch (error) {
            console.error('[AdminScreen] Error copying audit type:', error);
            toast.error('Chyba při kopírování typu auditu');
        }
    };

    const selectedType = auditTypes.find(t => t.id === selectedTypeId);

    if (loadingTypes) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 md:p-6 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Načítání typů auditů...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header - zobrazit pouze když není vybrán typ */}
                {!selectedTypeId && (
                    <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-800">Správa typů auditů</h1>
                                <p className="text-gray-600 mt-2">Zde můžete spravovat různé typy auditů, jejich sekce a položky. Můžete zapnout nebo vypnout celé sekce nebo jednotlivé položky, měnit jejich pořadí, upravovat texty, přidávat nové a mazat stávající. Po dokončení změn klikněte na tlačítko "Uložit".</p>
                            </div>
                        </div>

                        {/* Filtry a vyhledávání */}
                        <div className="mt-4 flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                                <TextField
                                    label="Vyhledávání"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Hledat podle názvu typu..."
                                    leftIcon={
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    }
                                />
                            </div>
                            <div className="flex items-end gap-2">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setFilterStatus('all')}
                                        className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                                            filterStatus === 'all'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        Všechny
                                    </button>
                                    <button
                                        onClick={() => setFilterStatus('active')}
                                        className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                                            filterStatus === 'active'
                                                ? 'bg-green-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        Aktivní
                                    </button>
                                    <button
                                        onClick={() => setFilterStatus('inactive')}
                                        className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                                            filterStatus === 'inactive'
                                                ? 'bg-gray-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        Neaktivní
                                    </button>
                                </div>
                                <button
                                    onClick={() => setShowAddTypeModal(true)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center gap-2"
                                >
                                    <PlusIcon className="h-5 w-5" />
                                    Přidat typ
                                </button>
                            </div>
                        </div>

                        <div className="mt-3 flex items-center gap-3 text-sm">
                            {saving && (
                                <span className="text-blue-600 font-semibold flex items-center gap-2">
                                    <span className="animate-spin">⏳</span> Ukládám...
                                </span>
                            )}
                            {!saving && lastSaved && (
                                <span className="text-green-600 font-semibold">
                                    ✓ Uloženo {lastSaved.toLocaleTimeString('cs-CZ')}
                                </span>
                            )}
                            {hasUnsavedChanges && !saving && (
                                <span className="text-orange-600 font-semibold">
                                    ⚠ Neuložené změny
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Grid s kartami typů */}
                {!selectedTypeId ? (
                    <div>
                        {filteredTypes.length === 0 ? (
                            <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <PlusIcon className="h-10 w-10 text-gray-400" />
                                </div>
                                <p className="text-gray-600 text-lg mb-4">
                                    {searchQuery || filterStatus !== 'all' 
                                        ? 'Žádné typy neodpovídají vyhledávání'
                                        : 'Žádné typy auditů'}
                                </p>
                                {(!searchQuery && filterStatus === 'all') && (
                                    <button
                                        onClick={() => setShowAddTypeModal(true)}
                                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold inline-flex items-center gap-2"
                                    >
                                        <PlusIcon className="h-5 w-5" />
                                        Vytvořit první typ
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredTypes.map(type => (
                                    <AuditTypeCard
                                        key={type.id}
                                        type={type}
                                        isSelected={type.id === selectedTypeId}
                                        onSelect={handleTypeSelect}
                                        onEditName={handleEditTypeName}
                                        onToggleActive={handleToggleTypeActive}
                                        onDelete={(id) => {
                                            setTypeToDelete(id);
                                            setShowDeleteModal(true);
                                        }}
                                        onCopy={handleCopyType}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    // Detail vybraného typu
                    <div className="bg-white rounded-2xl shadow-xl p-6">
                        {/* Navigační banner */}
                        <div className="mb-6 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border-l-4 border-blue-600 rounded-lg shadow-sm">
                            <div className="p-4">
                                <div className="flex items-center justify-between flex-wrap gap-3">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setSelectedTypeId(null)}
                                            className="px-4 py-2 bg-white hover:bg-blue-100 text-blue-700 font-semibold rounded-lg shadow-sm transition-all duration-200 flex items-center gap-2 border border-blue-200 hover:border-blue-400"
                                        >
                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                            </svg>
                                            Zpět na seznam typů
                                        </button>
                                        <div className="h-8 w-px bg-blue-300"></div>
                                        <div>
                                            <div className="text-xs text-gray-600 font-medium uppercase tracking-wide">Správa bodů pro typ</div>
                                            <div className="text-lg font-bold text-gray-800 mt-0.5">{selectedType?.name}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {auditStructure.audit_sections.map(section => (
                                <div 
                                    key={section.id}
                                    onDragOver={handleSectionDragOver}
                                    onDrop={(e) => handleSectionDrop(e, section.id)}
                                >
                                    <SectionAdmin
                                        section={section}
                                        onUpdateSection={handleUpdateSection}
                                        onDeleteSection={handleDeleteSection}
                                        onAddItem={handleAddItem}
                                        onEditItemRequest={handleEditItemRequest}
                                        dragProps={{
                                            draggable: true,
                                            onDragStart: (e: React.DragEvent<HTMLButtonElement>) => handleSectionDragStart(e, section.id)
                                        }}
                                    />
                                </div>
                            ))}
                        </div>

                        <button 
                            onClick={handleAddSection} 
                            className="mt-6 flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-700 font-bold hover:bg-gray-50 hover:border-blue-400 transition-colors"
                        >
                            <PlusIcon className="w-5 h-5" />
                            <span className="ml-2">Přidat novou sekci</span>
                        </button>

                        {/* Tlačítko Uložit */}
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <button
                                onClick={handleManualSave}
                                disabled={saving || !hasUnsavedChanges}
                                className={`w-full font-bold py-3 px-6 rounded-lg transition-colors ${
                                    saving || !hasUnsavedChanges
                                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                            >
                                {saving ? '⏳ Ukládám...' : '💾 Uložit změny'}
                            </button>
                        </div>

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
                )}
            </div>

            {/* Modal pro přidání nového typu */}
            {showAddTypeModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Přidat nový typ auditu</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Název typu:
                                </label>
                                <input
                                    type="text"
                                    value={newTypeName}
                                    onChange={(e) => setNewTypeName(e.target.value)}
                                    placeholder="Např. Školní jídelny"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Zkopírovat strukturu z:
                                </label>
                                <select
                                    value={copyFromTypeId}
                                    onChange={(e) => setCopyFromTypeId(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Vytvořit prázdnou strukturu</option>
                                    {auditTypes.map(type => (
                                        <option key={type.id} value={type.id}>
                                            {type.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => {
                                    setShowAddTypeModal(false);
                                    setNewTypeName('');
                                    setCopyFromTypeId('');
                                }}
                                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
                            >
                                Zrušit
                            </button>
                            <button
                                onClick={handleAddType}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                            >
                                Vytvořit
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal pro editaci názvu typu */}
            {showEditNameModal && editingTypeId && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Upravit název typu</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nový název:
                                </label>
                                <input
                                    type="text"
                                    value={editedTypeName}
                                    onChange={(e) => setEditedTypeName(e.target.value)}
                                    placeholder="Název typu"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => {
                                    setShowEditNameModal(false);
                                    setEditingTypeId(null);
                                    setEditedTypeName('');
                                }}
                                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
                            >
                                Zrušit
                            </button>
                            <button
                                onClick={handleSaveTypeName}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                            >
                                Uložit
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal pro kopírování typu */}
            {showCopyModal && copyingTypeId && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Kopírovat typ auditu</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Název nového typu:
                                </label>
                                <input
                                    type="text"
                                    value={copyNewName}
                                    onChange={(e) => setCopyNewName(e.target.value)}
                                    placeholder="Název kopie"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => {
                                    setShowCopyModal(false);
                                    setCopyingTypeId(null);
                                    setCopyNewName('');
                                }}
                                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
                            >
                                Zrušit
                            </button>
                            <button
                                onClick={handleConfirmCopy}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                            >
                                Kopírovat
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal pro smazání typu */}
            {showDeleteModal && typeToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Smazat typ auditu?</h2>
                        <p className="text-gray-600 mb-6">
                            Opravdu si přejete smazat typ "{auditTypes.find(t => t.id === typeToDelete)?.name}"? Tato akce je nevratná.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setTypeToDelete(null);
                                }}
                                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
                            >
                                Zrušit
                            </button>
                            <button
                                onClick={handleDeleteType}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                            >
                                Smazat
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminScreen;
