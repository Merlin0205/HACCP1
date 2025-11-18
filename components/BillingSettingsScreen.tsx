/**
 * Billing Settings Screen - Nastavení faktur
 */

import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader } from './ui/Card';
import { TextField, Select, TextArea } from './ui/Input';
import { Button } from './ui/Button';
import { PageHeader } from './PageHeader';
import { SECTION_THEMES } from '../constants/designSystem';
import { AppState } from '../types';
import { BackButton } from './BackButton';
import { fetchBillingSettings, saveBillingSettings } from '../services/firestore/billingSettings';
import { BillingSettings } from '../types/invoice';
import { toast } from '../utils/toast';
import { fetchPriceItems } from '../services/firestore';
import { PriceItem } from '../types/pricing';
import { Supplier, InvoiceNumberingType } from '../types';
import { fetchSuppliers, setDefaultSupplier } from '../services/firestore/suppliers';
import { 
  fetchInvoiceNumberingTypes, 
  createInvoiceNumberingType, 
  updateInvoiceNumberingType, 
  deleteInvoiceNumberingType 
} from '../services/firestore/invoiceNumberingTypes';
import { Modal } from './ui/Modal';
import { SupplierForm } from './SupplierForm';
import { InvoiceNumberingTypeForm } from './InvoiceNumberingTypeForm';
import { PlusIcon, EditIcon, TrashIcon } from './icons';
import { DetailTooltip } from './ui/DetailTooltip';
import { TooltipCell } from './ui/TooltipCell';
import { ActionIconTooltip } from './ui/ActionIconTooltip';

interface BillingSettingsScreenProps {
  onBack: () => void;
  onNavigateToPricing?: () => void;
}

export const BillingSettingsScreen: React.FC<BillingSettingsScreenProps> = ({ 
  onBack, 
  onNavigateToPricing 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [priceItems, setPriceItems] = useState<PriceItem[]>([]);
  
  // Suppliers management
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  
  // Invoice numbering types management
  const [invoiceNumberingTypes, setInvoiceNumberingTypes] = useState<InvoiceNumberingType[]>([]);
  const [showAddNumberingTypeModal, setShowAddNumberingTypeModal] = useState(false);
  const [editingNumberingType, setEditingNumberingType] = useState<InvoiceNumberingType | null>(null);
  const [showDeleteNumberingTypeModal, setShowDeleteNumberingTypeModal] = useState(false);
  const [numberingTypeToDelete, setNumberingTypeToDelete] = useState<InvoiceNumberingType | null>(null);
  
  // Defaults
  const [defaultDueDays, setDefaultDueDays] = useState(14);
  const [defaultCurrency, setDefaultCurrency] = useState('CZK');
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<'bank_transfer' | 'cash' | 'card' | 'other'>('bank_transfer');

  const sectionTheme = SECTION_THEMES[AppState.SETTINGS];

  useEffect(() => {
    loadSettings();
    loadPriceItems();
    loadSuppliers();
    loadInvoiceNumberingTypes();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const settings = await fetchBillingSettings();
      if (settings) {
        setDefaultDueDays(settings.supplier.defaultDueDays || 14);
        setDefaultCurrency(settings.supplier.defaultCurrency || 'CZK');
        setDefaultPaymentMethod(settings.supplier.defaultPaymentMethod || 'bank_transfer');
      }
    } catch (error: any) {
      console.error('[BillingSettingsScreen] Error loading settings:', error);
      toast.error('Chyba při načítání nastavení: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadInvoiceNumberingTypes = async () => {
    try {
      const types = await fetchInvoiceNumberingTypes();
      setInvoiceNumberingTypes(types);
    } catch (error: any) {
      console.error('[BillingSettingsScreen] Error loading invoice numbering types:', error);
      toast.error('Chyba při načítání typů číslování: ' + error.message);
    }
  };

  const loadSuppliers = async () => {
    try {
      // Nejprve zkusit migrovat z BillingSettings pokud ještě neexistují dodavatelé
      const { migrateSupplierFromBillingSettings } = await import('../services/firestore/suppliers');
      await migrateSupplierFromBillingSettings();
      
      const loadedSuppliers = await fetchSuppliers();
      setSuppliers(loadedSuppliers);
    } catch (error: any) {
      console.error('[BillingSettingsScreen] Error loading suppliers:', error);
      toast.error('Chyba při načítání dodavatelů: ' + error.message);
    }
  };

  const loadPriceItems = async () => {
    try {
      const items = await fetchPriceItems();
      setPriceItems(items);
    } catch (error: any) {
      console.error('[BillingSettingsScreen] Error loading price items:', error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Načíst výchozího dodavatele pro defaultní hodnoty
      const { fetchDefaultSupplier } = await import('../services/firestore/suppliers');
      const defaultSupplier = await fetchDefaultSupplier();
      
      const settings: BillingSettings = {
        userId: '', // Will be set by service
        supplier: {
          name: defaultSupplier?.supplier_name || '',
          street: defaultSupplier?.supplier_street || '',
          city: defaultSupplier?.supplier_city || '',
          zip: defaultSupplier?.supplier_zip || '',
          country: defaultSupplier?.supplier_country || 'Česká republika',
          companyId: defaultSupplier?.supplier_ico || '',
          vatId: defaultSupplier?.supplier_dic || undefined,
          iban: defaultSupplier?.supplier_iban || undefined,
          bankAccount: defaultSupplier?.supplier_bankAccount || undefined,
          accountNumber: defaultSupplier?.supplier_accountNumber || undefined,
          bankCode: defaultSupplier?.supplier_bankCode || undefined,
          swift: defaultSupplier?.supplier_swift || undefined,
          email: defaultSupplier?.supplier_email || undefined,
          phone: defaultSupplier?.supplier_phone || undefined,
          website: defaultSupplier?.supplier_website || undefined,
          logoUrl: defaultSupplier?.supplier_logoUrl || undefined,
          defaultPaymentMethod,
          defaultDueDays,
          defaultCurrency,
        },
        invoiceNumbering: {
          prefix: '', // Deprecated - používáme typy číslování
          nextNumber: 1,
          padding: 3,
        },
      };

      await saveBillingSettings(settings);
      await loadSettings();
      
      toast.success('Nastavení faktur bylo úspěšně uloženo');
    } catch (error: any) {
      console.error('[BillingSettingsScreen] Error saving settings:', error);
      toast.error('Chyba při ukládání nastavení: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSupplier = () => {
    setEditingSupplier(null);
    setShowAddSupplierModal(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setShowAddSupplierModal(true);
  };

  const handleSaveSupplier = async (supplierData: Omit<Supplier, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    try {
      const { createSupplier, updateSupplier } = await import('../services/firestore/suppliers');
      
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, supplierData);
        toast.success('Dodavatel byl aktualizován');
      } else {
        await createSupplier(supplierData);
        toast.success('Dodavatel byl přidán');
      }
      
      await loadSuppliers();
      setShowAddSupplierModal(false);
      setEditingSupplier(null);
    } catch (error: any) {
      console.error('[BillingSettingsScreen] Error saving supplier:', error);
      toast.error('Chyba při ukládání dodavatele: ' + error.message);
    }
  };

  const handleSetDefault = async (supplierId: string) => {
    try {
      await setDefaultSupplier(supplierId);
      toast.success('Výchozí dodavatel byl nastaven');
      // Aktualizovat lokální stav - odznačit všechny ostatní jako výchozí
      setSuppliers(prev => prev.map(s => ({
        ...s,
        isDefault: s.id === supplierId
      })));
    } catch (error: any) {
      console.error('[BillingSettingsScreen] Error setting default supplier:', error);
      toast.error('Chyba při nastavování výchozího dodavatele: ' + error.message);
      // Načíst znovu dodavatele pro obnovení správného stavu
      await loadSuppliers();
    }
  };

  const handleAddNumberingType = () => {
    setEditingNumberingType(null);
    setShowAddNumberingTypeModal(true);
  };

  const handleEditNumberingType = (type: InvoiceNumberingType) => {
    setEditingNumberingType(type);
    setShowAddNumberingTypeModal(true);
  };

  const handleDeleteNumberingType = (type: InvoiceNumberingType) => {
    setNumberingTypeToDelete(type);
    setShowDeleteNumberingTypeModal(true);
  };

  const handleConfirmDeleteNumberingType = async () => {
    if (!numberingTypeToDelete) return;

    try {
      await deleteInvoiceNumberingType(numberingTypeToDelete.id);
      toast.success('Typ číslování byl smazán');
      setInvoiceNumberingTypes(prev => prev.filter(t => t.id !== numberingTypeToDelete.id));
      setShowDeleteNumberingTypeModal(false);
      setNumberingTypeToDelete(null);
    } catch (error: any) {
      console.error('[BillingSettingsScreen] Error deleting numbering type:', error);
      toast.error('Chyba při mazání typu číslování: ' + error.message);
    }
  };

  const handleSaveNumberingType = async (typeData: Omit<InvoiceNumberingType, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingNumberingType) {
        await updateInvoiceNumberingType(editingNumberingType.id, typeData);
        toast.success('Typ číslování byl aktualizován');
      } else {
        await createInvoiceNumberingType(typeData);
        toast.success('Typ číslování byl přidán');
      }
      
      await loadInvoiceNumberingTypes();
      setShowAddNumberingTypeModal(false);
      setEditingNumberingType(null);
    } catch (error: any) {
      console.error('[BillingSettingsScreen] Error saving numbering type:', error);
      toast.error('Chyba při ukládání typu číslování: ' + error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto pb-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <p className="mt-4 text-gray-600">Načítání nastavení...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto pb-6">
      <PageHeader
        section={sectionTheme}
        title="Nastavení faktur"
        description="Správa údajů dodavatele, číslování faktur a ceníku"
      />

      <div className="mb-4">
        <BackButton onClick={onBack} label="Zpět" />
      </div>

      {/* Dodavatelé */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Dodavatelé</h2>
            <Button
              variant="primary"
              onClick={handleAddSupplier}
              leftIcon={<PlusIcon className="h-4 w-4" />}
            >
              Nový dodavatel
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          {suppliers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Žádní dodavatelé. Klikněte na "Nový dodavatel" pro přidání.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] xl:min-w-0">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 text-left text-xs font-medium text-gray-700 uppercase">Název</th>
                    <th className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 text-left text-xs font-medium text-gray-700 uppercase">IČO</th>
                    <th className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 text-left text-xs font-medium text-gray-700 uppercase">Město</th>
                    <th className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 text-left text-xs font-medium text-gray-700 uppercase">Výchozí</th>
                    <th className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 text-center text-xs font-medium text-gray-700 uppercase">Akce</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {suppliers.map((supplier, index) => {
                    const isLastRow = index === suppliers.length - 1;
                    return (
                      <tr key={supplier.id} className="hover:bg-gray-50">
                        <TooltipCell className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4">
                          <DetailTooltip
                            position={isLastRow ? 'top' : 'bottom'}
                            content={
                              <div className="space-y-1.5">
                                <div className="font-bold text-sm mb-2 pb-2 border-b border-gray-700">
                                  {supplier.supplier_name}
                                </div>
                                {supplier.supplier_street && (
                                  <div className="text-gray-300 text-xs">
                                    <span className="font-semibold">Ulice:</span> {supplier.supplier_street}
                                  </div>
                                )}
                                {(supplier.supplier_city || supplier.supplier_zip) && (
                                  <div className="text-gray-300 text-xs">
                                    <span className="font-semibold">Město:</span> {supplier.supplier_zip} {supplier.supplier_city}
                                  </div>
                                )}
                                {supplier.supplier_country && (
                                  <div className="text-gray-300 text-xs">
                                    <span className="font-semibold">Stát:</span> {supplier.supplier_country}
                                  </div>
                                )}
                                {supplier.supplier_ico && (
                                  <div className="text-gray-300 text-xs">
                                    <span className="font-semibold">IČO:</span> {supplier.supplier_ico}
                                  </div>
                                )}
                                {supplier.supplier_dic && (
                                  <div className="text-gray-300 text-xs">
                                    <span className="font-semibold">DIČ:</span> {supplier.supplier_dic}
                                  </div>
                                )}
                                {supplier.supplier_email && (
                                  <div className="text-gray-300 text-xs">
                                    <span className="font-semibold">Email:</span> {supplier.supplier_email}
                                  </div>
                                )}
                                {supplier.supplier_phone && (
                                  <div className="text-gray-300 text-xs">
                                    <span className="font-semibold">Telefon:</span> {supplier.supplier_phone}
                                  </div>
                                )}
                              </div>
                            }
                          >
                            <span className="cursor-help truncate block w-full">
                              {supplier.supplier_name}
                            </span>
                          </DetailTooltip>
                        </TooltipCell>
                        <td className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 text-sm text-gray-900">
                          {supplier.supplier_ico}
                        </td>
                        <td className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 text-sm text-gray-900">
                          {supplier.supplier_city}
                        </td>
                        <td className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 text-sm text-gray-900">
                          {supplier.isDefault ? (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                              <svg className="h-3 w-3 mr-1 fill-current" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              Výchozí
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSetDefault(supplier.id)}
                              className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors"
                            >
                              Nastavit jako výchozí
                            </button>
                          )}
                        </td>
                        <td className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 text-center">
                          <div className="flex justify-center gap-2">
                            <div className="relative group/button">
                              <button
                                onClick={() => handleEditSupplier(supplier)}
                                className="p-1 md:p-2 xl:p-1 text-blue-600 hover:text-blue-800 transition-colors"
                              >
                                <svg className="h-4 w-4 md:h-5 md:w-5 xl:h-4 xl:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <ActionIconTooltip text="Upravit" isLastRow={isLastRow} />
                            </div>
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

      {/* Číslování faktur */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Číslování faktur</h2>
            <Button
              variant="primary"
              onClick={handleAddNumberingType}
              leftIcon={<PlusIcon className="h-4 w-4" />}
            >
              Nový typ číslování
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          {invoiceNumberingTypes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Žádné typy číslování. Klikněte na "Nový typ číslování" pro přidání.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] xl:min-w-0">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 text-left text-xs font-medium text-gray-700 uppercase">Název</th>
                    <th className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 text-left text-xs font-medium text-gray-700 uppercase">Prefix</th>
                    <th className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 text-left text-xs font-medium text-gray-700 uppercase">Další číslo</th>
                    <th className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 text-left text-xs font-medium text-gray-700 uppercase">Počet číslic</th>
                    <th className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 text-left text-xs font-medium text-gray-700 uppercase">Příklad</th>
                    <th className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 text-center text-xs font-medium text-gray-700 uppercase">Akce</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invoiceNumberingTypes.map((type, index) => {
                    const isLastRow = index === invoiceNumberingTypes.length - 1;
                    const exampleNumber = `${type.prefix}${String(type.nextNumber).padStart(type.padding, '0')}`;
                    return (
                      <tr key={type.id} className="hover:bg-gray-50">
                        <td className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 text-sm text-gray-900">
                          {type.name}
                        </td>
                        <td className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 text-sm text-gray-900">
                          {type.prefix}
                        </td>
                        <td className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 text-sm text-gray-900">
                          {type.nextNumber}
                        </td>
                        <td className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 text-sm text-gray-900">
                          {type.padding}
                        </td>
                        <td className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 text-sm text-gray-900 font-mono">
                          {exampleNumber}
                        </td>
                        <td className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 text-center">
                          <div className="flex justify-center gap-2">
                            <div className="relative group/button">
                              <button
                                onClick={() => handleEditNumberingType(type)}
                                className="p-1 md:p-2 xl:p-1 text-blue-600 hover:text-blue-800 transition-colors"
                              >
                                <EditIcon className="h-4 w-4 md:h-5 md:w-5 xl:h-4 xl:w-4" />
                              </button>
                              <ActionIconTooltip text="Upravit" isLastRow={isLastRow} />
                            </div>
                            <div className="relative group/button">
                              <button
                                onClick={() => handleDeleteNumberingType(type)}
                                className="p-1 md:p-2 xl:p-1 text-red-600 hover:text-red-800 transition-colors"
                              >
                                <TrashIcon className="h-4 w-4 md:h-5 md:w-5 xl:h-4 xl:w-4" />
                              </button>
                              <ActionIconTooltip text="Smazat" isLastRow={isLastRow} />
                            </div>
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

      {/* Výchozí hodnoty */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Výchozí hodnoty</h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TextField
              label="Výchozí splatnost (dny)"
              type="number"
              value={defaultDueDays}
              onChange={(e) => setDefaultDueDays(parseInt(e.target.value) || 14)}
              min={1}
            />
            <Select
              label="Výchozí měna"
              value={defaultCurrency}
              onChange={(e) => setDefaultCurrency(e.target.value)}
              options={[
                { value: 'CZK', label: 'CZK' },
                { value: 'EUR', label: 'EUR' }
              ]}
            />
            <Select
              label="Výchozí způsob platby"
              value={defaultPaymentMethod}
              onChange={(e) => setDefaultPaymentMethod(e.target.value as any)}
              options={[
                { value: 'bank_transfer', label: 'Bankovní převod' },
                { value: 'cash', label: 'Hotovost' },
                { value: 'card', label: 'Karta' },
                { value: 'other', label: 'Jiné' }
              ]}
            />
          </div>
        </CardBody>
      </Card>

      {/* Ceník */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Ceník</h2>
            {onNavigateToPricing && (
              <Button variant="ghost" size="sm" onClick={onNavigateToPricing}>
                Spravovat ceník
              </Button>
            )}
          </div>
        </CardHeader>
        <CardBody>
          {priceItems.length === 0 ? (
            <p className="text-gray-500 text-sm">Žádné položky v ceníku. Klikněte na "Spravovat ceník" pro přidání položek.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Název</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jednotka</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cena/jedn.</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">DPH (%)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aktivní</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {priceItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                        {item.unitPrice.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                        {item.vatRate}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.active ? 'Ano' : 'Ne'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Action buttons */}
      <div className="flex justify-end gap-4">
        <Button variant="ghost" onClick={onBack}>
          Zrušit
        </Button>
        <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
          Uložit nastavení
        </Button>
      </div>

      {/* Modal pro přidání/úpravu dodavatele */}
      <Modal
        isOpen={showAddSupplierModal}
        onClose={() => {
          setShowAddSupplierModal(false);
          setEditingSupplier(null);
        }}
        title={editingSupplier ? 'Upravit dodavatele' : 'Nový dodavatel'}
        size="4xl"
        closeOnBackdropClick={false}
      >
        <SupplierForm
          initialData={editingSupplier}
          onSave={handleSaveSupplier}
          onBack={() => {
            setShowAddSupplierModal(false);
            setEditingSupplier(null);
          }}
        />
      </Modal>

      {/* Modal pro přidání/úpravu typu číslování */}
      <Modal
        isOpen={showAddNumberingTypeModal}
        onClose={() => {
          setShowAddNumberingTypeModal(false);
          setEditingNumberingType(null);
        }}
        title={editingNumberingType ? 'Upravit typ číslování' : 'Nový typ číslování'}
        size="lg"
        closeOnBackdropClick={false}
      >
        <InvoiceNumberingTypeForm
          initialData={editingNumberingType}
          onSave={handleSaveNumberingType}
          onBack={() => {
            setShowAddNumberingTypeModal(false);
            setEditingNumberingType(null);
          }}
        />
      </Modal>

      {/* Modal pro smazání typu číslování */}
      <Modal
        isOpen={showDeleteNumberingTypeModal}
        onClose={() => {
          setShowDeleteNumberingTypeModal(false);
          setNumberingTypeToDelete(null);
        }}
        title="Smazat typ číslování"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Opravdu chcete smazat typ číslování <strong>{numberingTypeToDelete?.name}</strong>?
          </p>
          <p className="text-sm text-gray-500">
            Tato akce je nevratná. Typ číslování bude odstraněn ze všech dodavatelů, které ho používají.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => {
              setShowDeleteNumberingTypeModal(false);
              setNumberingTypeToDelete(null);
            }}>
              Zrušit
            </Button>
            <Button variant="primary" onClick={handleConfirmDeleteNumberingType}>
              Smazat
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

