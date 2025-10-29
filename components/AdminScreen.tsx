import React, { useState } from 'react';
import { AuditStructure, AuditSection, AuditItem } from '../types';
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

    const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

    const handleToggleItem = (itemId: string) => {
        const updatedItems = section.items.map(item =>
            item.id === itemId ? { ...item, active: !item.active } : item
        );
        onUpdateSection({ ...section, items: updatedItems });
    };

    const handleDeleteItem = (itemId: string) => {
        if(window.confirm('Opravdu si přejete smazat tuto položku?')) {
            const updatedItems = section.items.filter(item => item.id !== itemId);
            onUpdateSection({ ...section, items: updatedItems });
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
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-t-lg flex-wrap gap-y-2">
                <div className="flex items-center gap-2 md:gap-4 flex-grow">
                    <button {...dragProps} className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hidden sm:block"><DragHandleIcon /></button>
                    <button onClick={() => setIsOpen(!isOpen)} className="p-1">
                        {isOpen ? <ArrowUpIcon /> : <ArrowDownIcon />}
                    </button>
                     {isEditing ? (
                        <input 
                            type="text"
                            value={editedTitle}
                            onChange={(e) => setEditedTitle(e.target.value)}
                            onBlur={handleSaveTitle}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                            className="text-lg font-bold text-gray-800 border-b-2 border-blue-500 bg-white focus:outline-none flex-grow"
                            autoFocus
                        />
                    ) : (
                        <h3 className="text-lg font-bold text-gray-800">{section.title}</h3>
                    )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {isEditing ? (
                        <button onClick={handleSaveTitle} className="p-2 text-green-600 hover:bg-green-100 rounded-full"><SaveIcon /></button>
                    ) : (
                        <button onClick={() => setIsEditing(true)} className="p-2 text-gray-500 hover:bg-gray-200 rounded-full"><EditIcon /></button>
                    )}
                    <button onClick={() => onDeleteSection(section.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-full"><TrashIcon /></button>
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
                        <PlusIcon />
                        <span className="ml-2 font-semibold text-sm">Přidat položku</span>
                      </button>
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
                 <p className="text-gray-700 truncate">{item.title}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={onEditRequest} className="p-2 text-gray-500 hover:bg-gray-200 rounded-full"><EditIcon /></button>
                <button onClick={onDelete} className="p-2 text-red-500 hover:bg-red-100 rounded-full"><TrashIcon /></button>
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
    const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
    const [editingItemInfo, setEditingItemInfo] = useState<{ item: AuditItem; sectionId: string } | null>(null);

    const handleUpdateSection = (updatedSection: AuditSection) => {
        setAuditStructure(prev => ({
            ...prev,
            audit_sections: prev.audit_sections.map(sec =>
                sec.id === updatedSection.id ? updatedSection : sec
            )
        }));
    };

    const handleDeleteSection = (sectionId: string) => {
        if (window.confirm('Opravdu si přejete smazat celou sekci včetně všech jejích položek?')) {
            setAuditStructure(prev => ({
                ...prev,
                audit_sections: prev.audit_sections.filter(sec => sec.id !== sectionId)
            }));
        }
    };
    
    const handleAddItem = (sectionId: string) => {
        const newItem: AuditItem = {
            id: `custom-${Date.now()}`,
            title: "Nová položka",
            description: "",
            active: true
        };
        setAuditStructure(prev => ({
            ...prev,
            audit_sections: prev.audit_sections.map(sec =>
                sec.id === sectionId ? {...sec, items: [...sec.items, newItem]} : sec
            )
        }));
    };

    const handleAddSection = () => {
        const newSection: AuditSection = {
            id: `custom-sec-${Date.now()}`,
            title: "Nová sekce",
            items: [],
            active: true,
        };
        setAuditStructure(prev => ({
            ...prev,
            audit_sections: [...prev.audit_sections, newSection]
        }));
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

        setAuditStructure(prev => {
            const sections = [...prev.audit_sections];
            const draggedIndex = sections.findIndex(sec => sec.id === draggedSectionId);
            const targetIndex = sections.findIndex(sec => sec.id === targetSectionId);
            
            const [removed] = sections.splice(draggedIndex, 1);
            sections.splice(targetIndex, 0, removed);
            
            return { ...prev, audit_sections: sections };
        });
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
        
        setAuditStructure(prev => {
            let newSections = [...prev.audit_sections];

            if (oldSectionId === newSectionId) {
                // Just update item in the same section
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
                // Move item to a new section
                // 1. Remove from old section
                newSections = newSections.map(section => 
                    section.id === oldSectionId
                        ? { ...section, items: section.items.filter(item => item.id !== updatedItem.id) } 
                        : section
                );

                // 2. Add to new section
                newSections = newSections.map(section => 
                    section.id === newSectionId
                        ? { ...section, items: [...section.items, updatedItem] }
                        : section
                );
            }
            return {...prev, audit_sections: newSections };
        });
        
        setEditingItemInfo(null);
    };

    const handleCloseEditModal = () => {
        setEditingItemInfo(null);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">Správa bodů auditu</h1>
                    <p className="text-gray-600 mt-2">Zde můžete zapnout nebo vypnout celé sekce nebo jednotlivé položky, které se objeví v průběhu auditu. Můžete také měnit jejich pořadí, upravovat texty, přidávat nové a mazat stávající. Změny se ukládají automaticky do vašeho prohlížeče.</p>
                </div>

                {/* Content */}
                <div className="bg-white rounded-2xl shadow-xl p-6">
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
            </div>
        </div>
    );
};

export default AdminScreen;
