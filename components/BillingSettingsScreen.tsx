import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader } from './ui/Card';
import { TextField, Select } from './ui/Input';
import { Button } from './ui/Button';
import { PageHeader } from './PageHeader';
import { SECTION_THEMES } from '../constants/designSystem';
import { AppState } from '../types';
import { fetchBillingSettings, saveBillingSettings } from '../services/firestore/billingSettings';
import { toast } from '../utils/toast';
import { fetchPriceItems } from '../services/firestore';
import { PriceItem } from '../types/pricing';
import { Supplier, InvoiceNumberingType } from '../types';
import { fetchSuppliers } from '../services/firestore/suppliers';
import {
  fetchInvoiceNumberingTypes,
  createInvoiceNumberingType,
  updateInvoiceNumberingType,
  deleteInvoiceNumberingType
} from '../services/firestore/invoiceNumberingTypes';
import { Modal } from './ui/Modal';
import { InvoiceNumberingTypeForm } from './InvoiceNumberingTypeForm';
import { PlusIcon, EditIcon, TrashIcon } from './icons';
import { ActionIconTooltip } from './ui/ActionIconTooltip';
import { Truck } from 'lucide-react';

interface BillingSettingsScreenProps {
  onBack: () => void;
  onNavigateToPricing?: () => void;
  onNavigateToSuppliers?: () => void;
}

export const BillingSettingsScreen: React.FC<BillingSettingsScreenProps> = ({
  onBack,
  onNavigateToPricing,
  onNavigateToSuppliers
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [priceItems, setPriceItems] = useState<PriceItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

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
      const currentSettings = await fetchBillingSettings();

      await saveBillingSettings({
        supplier: {
          ...currentSettings?.supplier,
          name: currentSettings?.supplier?.name || '',
          companyId: currentSettings?.supplier?.companyId || '',
          vatId: currentSettings?.supplier?.vatId || '',
          street: currentSettings?.supplier?.street || '',
          city: currentSettings?.supplier?.city || '',
          zip: currentSettings?.supplier?.zip || '',
          country: currentSettings?.supplier?.country || 'Česká republika',
          email: currentSettings?.supplier?.email || '',
          phone: currentSettings?.supplier?.phone || '',
          website: currentSettings?.supplier?.website || '',
          bankAccount: currentSettings?.supplier?.bankAccount || '',
          bankCode: currentSettings?.supplier?.bankCode || '',
          iban: currentSettings?.supplier?.iban || '',
          swift: currentSettings?.supplier?.swift || '',
          accountNumber: currentSettings?.supplier?.accountNumber || '',

          defaultDueDays,
          defaultCurrency,
          defaultPaymentMethod,

          isVatPayer: currentSettings?.supplier?.isVatPayer || false,
          logoUrl: currentSettings?.supplier?.logoUrl || '',
          stampUrl: currentSettings?.supplier?.stampUrl || ''
        },
        invoiceNumbering: currentSettings?.invoiceNumbering || {
          prefix: '',
          nextNumber: 1,
          padding: 4
        }
      } as any);

      toast.success('Nastavení bylo úspěšně uloženo');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error('Chyba při ukládání nastavení: ' + error.message);
    } finally {
      setIsSaving(false);
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

  const handleSaveNumberingType = async (data: Omit<InvoiceNumberingType, 'id'>) => {
    try {
      if (editingNumberingType) {
        await updateInvoiceNumberingType(editingNumberingType.id, data);
        toast.success('Typ číslování byl aktualizován');
      } else {
        await createInvoiceNumberingType(data);
        toast.success('Typ číslování byl vytvořen');
      }
      loadInvoiceNumberingTypes();
      setShowAddNumberingTypeModal(false);
    } catch (error: any) {
      toast.error('Chyba při ukládání: ' + error.message);
    }
  };

  const handleConfirmDeleteNumberingType = async () => {
    if (!numberingTypeToDelete) return;
    try {
      await deleteInvoiceNumberingType(numberingTypeToDelete.id);
      toast.success('Typ číslování byl smazán');
      loadInvoiceNumberingTypes();
      setShowDeleteNumberingTypeModal(false);
    } catch (error: any) {
      toast.error('Chyba při mazání: ' + error.message);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto">
      <PageHeader
        section={sectionTheme}
        title="Nastavení fakturace"
        description="Správa fakturačních údajů, číslování a ceníku"
        onBack={onBack}
      />

      {/* Dodavatelé */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                <Truck size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Správa dodavatelů</h2>
                <p className="text-sm text-gray-500">Evidence firem a fakturačních údajů</p>
              </div>
            </div>
            {onNavigateToSuppliers && (
              <Button variant="secondary" onClick={onNavigateToSuppliers}>
                Spravovat dodavatele
              </Button>
            )}
          </div>
        </CardHeader>
        <CardBody>
          <div className="text-sm text-gray-600">
            <p>
              V systému je evidováno <strong>{suppliers.length}</strong> dodavatelů.
              {suppliers.length > 0 && (
                <span> Výchozí dodavatel: <strong>{suppliers.find(s => s.isDefault)?.supplier_name || 'Nenastaven'}</strong>.</span>
              )}
            </p>
          </div>
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
          <h2 className="text-lg font-semibold text-gray-900">Výchozí hodnoty faktur</h2>
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
