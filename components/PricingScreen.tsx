/**
 * Pricing Screen - Správa ceníku
 */

import React, { useState, useEffect } from 'react';
import { PriceItem } from '../types/pricing';
import { Card, CardBody, CardHeader } from './ui/Card';
import { TextField, TextArea } from './ui/Input';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { PageHeader } from './PageHeader';
import { SECTION_THEMES } from '../constants/designSystem';
import { AppState } from '../types';
import { PlusIcon, EditIcon, TrashIcon } from './icons';
import { fetchPriceItems, createPriceItem, updatePriceItem, deletePriceItem } from '../services/firestore';
import { toast } from '../utils/toast';
import { formatCurrency } from '../utils/invoiceCalculations';

interface PricingScreenProps {
  onBack: () => void;
}

export const PricingScreen: React.FC<PricingScreenProps> = ({ onBack }) => {
  const [priceItems, setPriceItems] = useState<PriceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<PriceItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('ks');
  const [unitPrice, setUnitPrice] = useState(0);
  const [vatRate, setVatRate] = useState(21);
  const [active, setActive] = useState(true);

  const sectionTheme = SECTION_THEMES[AppState.SETTINGS];

  useEffect(() => {
    loadPriceItems();
  }, []);

  const loadPriceItems = async () => {
    setIsLoading(true);
    try {
      const items = await fetchPriceItems();
      setPriceItems(items);
    } catch (error: any) {
      console.error('[PricingScreen] Error loading price items:', error);
      toast.error('Chyba při načítání ceníku: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewItem = () => {
    console.log('[PricingScreen] handleNewItem called');
    setEditingItem(null);
    setName('');
    setDescription('');
    setUnit('ks');
    setUnitPrice(0);
    setVatRate(21);
    setActive(true);
    setShowForm(true);
  };

  const handleEditItem = (item: PriceItem) => {
    setEditingItem(item);
    setName(item.name);
    setDescription(item.description || '');
    setUnit(item.unit);
    setUnitPrice(item.unitPrice);
    setVatRate(item.vatRate);
    setActive(item.active);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Název položky je povinný');
      return;
    }
    if (unitPrice <= 0) {
      toast.error('Cena musí být větší než 0');
      return;
    }

    setIsSaving(true);
    try {
      if (editingItem) {
        await updatePriceItem(editingItem.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          unit,
          unitPrice,
          vatRate,
          active,
        });
        toast.success('Ceníková položka byla aktualizována');
      } else {
        await createPriceItem({
          name: name.trim(),
          description: description.trim() || undefined,
          unit,
          unitPrice,
          vatRate,
          active,
        });
        toast.success('Ceníková položka byla vytvořena');
      }
      
      await loadPriceItems();
      setEditingItem(null);
      setName('');
      setDescription('');
      setUnit('ks');
      setUnitPrice(0);
      setVatRate(21);
      setActive(true);
      setShowForm(false);
    } catch (error: any) {
      console.error('[PricingScreen] Error saving price item:', error);
      toast.error('Chyba při ukládání ceníkové položky: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Opravdu chcete smazat tuto ceníkovou položku?')) {
      return;
    }

    try {
      await deletePriceItem(itemId);
      toast.success('Ceníková položka byla smazána');
      await loadPriceItems();
    } catch (error: any) {
      console.error('[PricingScreen] Error deleting price item:', error);
      toast.error('Chyba při mazání ceníkové položky: ' + error.message);
    }
  };

  const handleCancel = () => {
    setEditingItem(null);
    setName('');
    setDescription('');
    setUnit('ks');
    setUnitPrice(0);
    setVatRate(21);
    setActive(true);
    setShowForm(false);
  };

  return (
    <div className="w-full max-w-7xl mx-auto pb-6">
      <PageHeader
        section={sectionTheme}
        title="Ceník"
        description="Správa ceníkových položek pro faktury"
        action={
          !showForm && (
            <Button
              variant="primary"
              size="lg"
              onClick={handleNewItem}
              leftIcon={<PlusIcon className="h-5 w-5" />}
            >
              Nová položka
            </Button>
          )
        }
      />

      {/* Form */}
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-800">
              {editingItem ? 'Upravit položku' : 'Nová položka'}
            </h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <TextField
                  label="Název položky *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="např. audit"
                  helperText="Pro automatické použití při vytváření faktury z auditu použijte název 'audit' (malými písmeny)"
                />
              </div>
              <div className="md:col-span-2">
                <TextArea
                  label="Popis"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Volitelný popis položky"
                  rows={3}
                />
              </div>
              <TextField
                label="Jednotka *"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="ks, hod, audit..."
              />
              <TextField
                label="Cena za jednotku (bez DPH) *"
                type="number"
                value={unitPrice}
                onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
              />
              <TextField
                label="DPH (%) *"
                type="number"
                value={vatRate}
                onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
                min="0"
                max="100"
                step="0.1"
              />
              <div className="flex items-center">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Aktivní</span>
                </label>
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <Button
                variant="primary"
                onClick={handleSave}
                isLoading={isSaving}
                disabled={isSaving}
              >
                {editingItem ? 'Uložit změny' : 'Vytvořit položku'}
              </Button>
              <Button variant="secondary" onClick={handleCancel}>
                Zrušit
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* List */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-800">Ceníkové položky</h2>
        </CardHeader>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
              <p className="mt-4 text-gray-600">Načítání ceníku...</p>
            </div>
          ) : priceItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>Žádné ceníkové položky. Vytvořte první položku kliknutím na "Nová položka".</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Název
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Popis
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Jednotka
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cena bez DPH
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      DPH
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cena s DPH
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stav
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Akce
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {priceItems.map((item) => {
                    const priceWithVat = item.unitPrice * (1 + item.vatRate / 100);
                    return (
                      <tr key={item.id} className={!item.active ? 'opacity-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {item.description || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                          {formatCurrency(item.unitPrice, 'CZK')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                          {item.vatRate}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                          {formatCurrency(priceWithVat, 'CZK')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <Badge color={item.active ? 'success' : 'gray'}>
                            {item.active ? 'Aktivní' : 'Neaktivní'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEditItem(item)}
                              className="p-2 rounded-lg hover:bg-teal-50 transition-colors text-teal-600 hover:text-teal-700"
                              title="Upravit"
                            >
                              <EditIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-2 rounded-lg hover:bg-red-50 transition-colors text-red-600 hover:text-red-700"
                              title="Smazat"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

