import React, { useState, useEffect } from 'react';
import { AuditType } from '../types';
import { EditIcon, TrashIcon, CheckmarkIcon, PlusIcon } from './icons';
import { Card } from './ui/Card';

interface AuditTypeCardProps {
  type: AuditType;
  isSelected: boolean;
  onSelect: (typeId: string) => void;
  onEditName: (typeId: string, newName?: string) => void;
  onToggleActive: (typeId: string) => void;
  onDelete: (typeId: string) => void;
  onCopy: (typeId: string) => void;
}

export const AuditTypeCard: React.FC<AuditTypeCardProps> = ({
  type,
  isSelected,
  onSelect,
  onEditName,
  onToggleActive,
  onDelete,
  onCopy,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(type.name);

  // Aktualizovat editedName když se změní type.name z props
  useEffect(() => {
    if (!isEditingName) {
      setEditedName(type.name);
    }
  }, [type.name, isEditingName]);

  // Vypočítat statistiky
  const totalSections = type.auditStructure.audit_sections.length;
  const activeSections = type.auditStructure.audit_sections.filter(s => s.active).length;
  const totalItems = type.auditStructure.audit_sections.reduce((sum, s) => sum + s.items.length, 0);
  const activeItems = type.auditStructure.audit_sections.reduce(
    (sum, s) => sum + s.items.filter(i => i.active).length,
    0
  );

  const handleNameBlur = async () => {
    if (editedName.trim() && editedName !== type.name) {
      // Zavolá se editace přes callback s novým názvem
      await onEditName(type.id, editedName.trim());
    }
    setIsEditingName(false);
    // Nastavit zpět na původní název, pokud se změnil přes props
    setEditedName(type.name);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameBlur();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
      setEditedName(type.name);
    }
  };

  return (
    <Card
      className={`transition-all duration-200 ${
        isSelected
          ? 'ring-2 ring-blue-500 shadow-lg'
          : 'hover:shadow-lg'
      } ${
        !type.active ? 'opacity-60' : ''
      }`}
      hover={true}
      onClick={() => onSelect(type.id)}
    >
      <div className="p-5">
        {/* Header s názvem a statusem */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 flex items-center gap-2">
            {isEditingName ? (
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onBlur={handleNameBlur}
                onKeyDown={handleNameKeyDown}
                className="flex-1 px-2 py-1 text-lg font-bold text-gray-800 border-2 border-blue-500 rounded focus:outline-none"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                <h3 className="text-lg font-bold text-gray-800 truncate">
                  {type.name}
                </h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingName(true);
                  }}
                  className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors flex-shrink-0"
                  title="Upravit název typu"
                >
                  <EditIcon className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
          <div
            className={`ml-3 px-2.5 py-1 rounded-full text-xs font-semibold ${
              type.active
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {type.active ? 'Aktivní' : 'Neaktivní'}
          </div>
        </div>

        {/* Statistiky */}
        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-gray-600 text-xs">Sekce</div>
            <div className="font-semibold text-gray-800">
              {activeSections} / {totalSections}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-gray-600 text-xs">Položky</div>
            <div className="font-semibold text-gray-800">
              {activeItems} / {totalItems}
            </div>
          </div>
        </div>

        {/* Akční tlačítka */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(type.id);
            }}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Upravit celý audit (sekce a položky)"
          >
            <EditIcon className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleActive(type.id);
            }}
            className={`p-2 rounded-lg transition-colors ${
              type.active
                ? 'text-red-600 hover:bg-red-50'
                : 'text-green-600 hover:bg-green-50'
            }`}
            title={type.active ? 'Deaktivovat' : 'Aktivovat'}
          >
            {type.active ? (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <CheckmarkIcon className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCopy(type.id);
            }}
            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            title="Kopírovat typ"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(type.id);
            }}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Smazat typ"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>
  );
};

