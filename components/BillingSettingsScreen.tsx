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
import { Supplier } from '../types';
import { fetchSuppliers, setDefaultSupplier } from '../services/firestore/suppliers';
import { Modal } from './ui/Modal';
import { SupplierForm } from './SupplierForm';
import { PlusIcon } from './icons';
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
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // Suppliers management
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  
  // Invoice numbering
  const [invoicePrefix, setInvoicePrefix] = useState('');
  const [invoiceNextNumber, setInvoiceNextNumber] = useState(1);
  const [invoicePadding, setInvoicePadding] = useState(5);
  
  // Defaults
  const [defaultDueDays, setDefaultDueDays] = useState(14);
  const [defaultCurrency, setDefaultCurrency] = useState('CZK');
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<'bank_transfer' | 'cash' | 'card' | 'other'>('bank_transfer');

  const sectionTheme = SECTION_THEMES[AppState.SETTINGS];

  useEffect(() => {
    loadSettings();
    loadPriceItems();
    loadSuppliers();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const settings = await fetchBillingSettings();
      if (settings) {
        setInvoicePrefix(settings.invoiceNumbering.prefix || '');
        setInvoiceNextNumber(settings.invoiceNumbering.nextNumber || 1);
        setInvoicePadding(settings.invoiceNumbering.padding || 5);
        
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
    console.log('[BillingSettingsScreen] handleSave called');
    
    // Reset validation errors
    setValidationErrors({});
    
    const errors: Record<string, string> = {};
    
    // Validace povinných polí
    if (!invoicePrefix.trim()) {
      errors.invoicePrefix = 'Prefix čísla faktury je povinný';
    }
    if (invoiceNextNumber < 1) {
      errors.invoiceNextNumber = 'Další číslo faktury musí být alespoň 1';
    }
    if (invoicePadding < 1) {
      errors.invoicePadding = 'Délka čísla faktury musí být alespoň 1';
    }
    
    // Pokud jsou chyby, zobrazit je a zastavit submit
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      const firstErrorField = Object.keys(errors)[0];
      const element = document.querySelector(`[data-field="${firstErrorField}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      toast.error('Prosím opravte chyby ve formuláři');
      return;
    }

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
          prefix: invoicePrefix.trim(),
          nextNumber: invoiceNextNumber,
          padding: invoicePadding,
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
      await loadSuppliers();
    } catch (error: any) {
      console.error('[BillingSettingsScreen] Error setting default supplier:', error);
      toast.error('Chyba při nastavování výchozího dodavatele: ' + error.message);
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
          <h2 className="text-lg font-semibold text-gray-900">Číslování faktur</h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div data-field="invoicePrefix">
              <TextField
                label="Prefix"
                value={invoicePrefix}
                onChange={(e) => {
                  setInvoicePrefix(e.target.value);
                  if (validationErrors.invoicePrefix) {
                    setValidationErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.invoicePrefix;
                      return newErrors;
                    });
                  }
                }}
                placeholder="např. F nebo 2025-"
                required
                error={validationErrors.invoicePrefix}
              />
            </div>
            <div data-field="invoiceNextNumber">
              <TextField
                label="Další číslo"
                type="number"
                value={invoiceNextNumber}
                onChange={(e) => {
                  setInvoiceNextNumber(parseInt(e.target.value) || 1);
                  if (validationErrors.invoiceNextNumber) {
                    setValidationErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.invoiceNextNumber;
                      return newErrors;
                    });
                  }
                }}
                min={1}
                required
                error={validationErrors.invoiceNextNumber}
              />
            </div>
            <div data-field="invoicePadding">
              <TextField
                label="Počet číslic (padding)"
                type="number"
                value={invoicePadding}
                onChange={(e) => {
                  setInvoicePadding(parseInt(e.target.value) || 5);
                  if (validationErrors.invoicePadding) {
                    setValidationErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.invoicePadding;
                      return newErrors;
                    });
                  }
                }}
                min={1}
                max={10}
                required
                error={validationErrors.invoicePadding}
              />
            </div>
          </div>
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Příklad: {invoicePrefix}{String(invoiceNextNumber).padStart(invoicePadding, '0')}
            </p>
          </div>
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
        size="3xl"
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
    </div>
  );
};

