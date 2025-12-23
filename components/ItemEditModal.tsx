import React, { useState, useEffect, useMemo } from 'react';
import { AuditItem, AuditSection } from '../types';
import { XIcon } from './icons';
import { lucideIconCategories, allLucideIcons, searchLucideIcons, LucideIconOption } from './lucideIconRegistry';
import { toast } from '../utils/toast';
// import { IconGenerationModal } from './modals/IconGenerationModal'; // Removed
// import { fetchCustomIcons } from './lucideIconRegistry'; // Removed
// import { auth } from '../firebaseConfig'; // Removed
// import { onAuthStateChanged } from 'firebase/auth'; // Removed

interface ItemEditModalProps {
  item: AuditItem;
  currentSectionId: string;
  allSections: AuditSection[];
  onSave: (updatedItem: AuditItem, newSectionId: string) => void;
  onClose: () => void;
}

export const ItemEditModal: React.FC<ItemEditModalProps> = ({ item, currentSectionId, allSections, onSave, onClose }) => {
  const [editedItem, setEditedItem] = useState<AuditItem>(item);
  const [selectedSectionId, setSelectedSectionId] = useState<string>(currentSectionId);
  const [selectedIconId, setSelectedIconId] = useState<string>(item.icon || 'check-circle-2');
  const [iconSearchQuery, setIconSearchQuery] = useState<string>('');

  // Removed AI icon generation state and effects


  useEffect(() => {
    setEditedItem(item);
    setSelectedSectionId(currentSectionId);
    setSelectedIconId(item.icon || 'check-circle-2');
    setIconSearchQuery('');
  }, [item, currentSectionId]);

  // Filtrovat ikony podle vyhledávání
  const filteredIcons: { [key: string]: LucideIconOption[] } = useMemo(() => {
    // Debug: zkontrolovat, zda jsou ikony načteny
    if (!lucideIconCategories || Object.keys(lucideIconCategories).length === 0) {
      console.warn('[ItemEditModal] lucideIconCategories je prázdný!');
      return {};
    }

    if (!iconSearchQuery.trim()) {
      return lucideIconCategories;
    }

    const searchResults = searchLucideIcons(iconSearchQuery);

    // Sloučit výsledky hledání
    // const normalizedQuery = iconSearchQuery.trim().toLowerCase();
    // const filteredCustomIcons = customIcons.filter(icon => ...); // Removed custom icons logic

    const allIconsToDisplay = [...searchResults];

    // Seskupit výsledky podle kategorií
    const grouped: { [key: string]: LucideIconOption[] } = {};
    allIconsToDisplay.forEach(icon => {
      if (!grouped[icon.category]) {
        grouped[icon.category] = [];
      }
      grouped[icon.category].push(icon);
    });
    return grouped;
  }, [iconSearchQuery]);

  const handleSave = () => {
    const itemToSave = { ...editedItem, icon: selectedIconId };
    onSave(itemToSave, selectedSectionId);
  };

  // Zjistit, zda je to nová položka nebo editace existující
  const isNewItem = item.title === "Nová položka" && !item.description && item.icon === undefined;

  // Removed handleAIIconSuggestion logic

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b flex justify-between items-center flex-shrink-0">
          <h3 className="text-xl font-bold text-gray-800">{isNewItem ? 'Přidat novou položku' : 'Upravit položku auditu'}</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-grow space-y-4">
          <div>
            <label htmlFor="item-title" className="block text-sm font-medium text-gray-700 mb-1">
              Název položky
            </label>
            <input
              id="item-title"
              type="text"
              value={editedItem.title}
              onChange={(e) => setEditedItem({ ...editedItem, title: e.target.value })}
              className="w-full px-3 py-2 bg-white text-gray-800 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-shadow"
              style={{ colorScheme: 'light' }}
            />
          </div>
          <div>
            <label htmlFor="item-description" className="block text-sm font-medium text-gray-700 mb-1">
              Popis požadavku
            </label>
            <textarea
              id="item-description"
              value={editedItem.description}
              onChange={(e) => setEditedItem({ ...editedItem, description: e.target.value })}
              className="w-full px-3 py-2 bg-white text-gray-800 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-shadow"
              rows={5}
              style={{ colorScheme: 'light' }}
            />
          </div>
          <div>
            <label htmlFor="item-section" className="block text-sm font-medium text-gray-700 mb-1">
              Sekce
            </label>
            <select
              id="item-section"
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="w-full px-3 py-2 bg-white text-gray-800 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-shadow"
              style={{ colorScheme: 'light' }}
            >
              {allSections.map(section => (
                <option key={section.id} value={section.id}>
                  {section.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="item-icon" className="block text-sm font-medium text-gray-700 mb-2">
              Ikona
            </label>

            {/* Vyhledávání ikon */}
            <div className="mb-3 flex gap-2">
              <input
                type="text"
                placeholder="Hledat ikonu podle názvu (např. voda, budova, dokument)..."
                value={iconSearchQuery}
                onChange={(e) => setIconSearchQuery(e.target.value)}
                className="w-full px-3 py-2 bg-white text-gray-800 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-shadow"
                style={{ colorScheme: 'light' }}
              />
            </div>

            <div className="border border-gray-300 rounded-lg p-3 bg-white max-h-96 overflow-y-auto">
              {(() => {
                const categoryCount = Object.keys(filteredIcons).length;
                const totalIcons = Object.values(filteredIcons).reduce((sum, icons) => sum + icons.length, 0);
                if (categoryCount === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500">
                      <p>Žádné ikony nenalezeny</p>
                      <p className="text-sm mt-1">Zkuste jiný vyhledávací termín</p>
                      <p className="text-xs mt-2 text-gray-400">
                        Debug: {totalIcons} ikon celkem, {categoryCount} kategorií
                      </p>
                    </div>
                  );
                }

                return null;
              })()}
              {Object.keys(filteredIcons).length > 0 && (
                Object.entries(filteredIcons)
                  .sort(([a], [b]) => {
                    // Ostatní podle pořadí v CATEGORY_ORDER (pokud bychom ho importovali) nebo abecedně?
                    // Pro teď necháme původní pořadí (které je dané iterací) pro ostatní
                    return 0;
                  })
                  .map(([categoryName, icons]) => (
                    <div key={categoryName} className="mb-6 last:mb-0">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2 sticky top-0 bg-white py-1 z-10">
                        {categoryName} ({icons.length})
                      </h4>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {icons.map(icon => {
                          const IconComponent = icon.component;
                          const isSelected = selectedIconId === icon.id;

                          if (!IconComponent) {
                            console.warn(`[ItemEditModal] Ikona ${icon.id} nemá komponentu`);
                            return null;
                          }

                          return (
                            <button
                              key={icon.id}
                              type="button"
                              onClick={() => setSelectedIconId(icon.id)}
                              className={`
                              flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all
                              ${isSelected
                                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }
                            `}
                              title={icon.name}
                            >
                              <IconComponent className={`h-5 w-5 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                              <span className={`text-[10px] mt-1 text-center leading-tight px-0.5 ${isSelected ? 'text-blue-600 font-semibold' : 'text-gray-600'}`}>
                                {icon.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
              )}
            </div>

            {/* Zobrazit aktuálně vybranou ikonu */}
            {selectedIconId && (
              <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Vybraná ikona:</span>
                  {(() => {
                    // Hledat ve standardních ikonách
                    const selectedIcon = allLucideIcons.find(icon => icon.id === selectedIconId);

                    if (selectedIcon) {
                      const IconComponent = selectedIcon.component;
                      if (IconComponent) {
                        return (
                          <>
                            <IconComponent className="h-5 w-5 text-blue-600" />
                            <span className="text-sm text-gray-700">{selectedIcon.name}</span>
                          </>
                        );
                      }
                    }
                    return <span className="text-sm text-gray-500">Neznámá ikona ({selectedIconId})</span>;
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t rounded-b-2xl flex-shrink-0 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors"
          >
            Zrušit
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            {isNewItem ? 'Přidat položku' : 'Uložit změny'}
          </button>
        </div>
      </div>
    </div>
  );
};
