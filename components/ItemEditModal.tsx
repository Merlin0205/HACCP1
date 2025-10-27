import React, { useState, useEffect } from 'react';
import { AuditItem, AuditSection } from '../types';
import { XIcon } from './icons/XIcon';

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

  useEffect(() => {
    setEditedItem(item);
    setSelectedSectionId(currentSectionId);
  }, [item, currentSectionId]);

  const handleSave = () => {
    onSave(editedItem, selectedSectionId);
  };

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
          <h3 className="text-xl font-bold text-gray-800">Upravit položku auditu</h3>
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
            Uložit změny
          </button>
        </div>
      </div>
    </div>
  );
};