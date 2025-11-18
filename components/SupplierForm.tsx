import React, { useState, useEffect } from 'react';
import { Supplier, InvoiceNumberingType } from '../types';
import { Card, CardBody, CardHeader } from './ui/Card';
import { TextField, Select } from './ui/Input';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { BackIcon, RefreshIcon, CheckmarkIcon, WarningIcon } from './icons';
import { DetailTooltip } from './ui/DetailTooltip';
import { Tooltip } from 'flowbite-react';
import { fetchCompanyByIco } from '../services/aresService';
import { checkVat } from '../services/viesService';
import { toast } from '../utils/toast';
import { uploadSupplierLogo, uploadSupplierStamp } from '../services/storage';
import { fileToBase64 } from '../services/storage';
import { fetchInvoiceNumberingTypes } from '../services/firestore/invoiceNumberingTypes';

type SupplierData = Omit<Supplier, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;

// Komponenta pro ikonu ověření DIČ s tooltipem
const VatVerificationIcon: React.FC<{
  verification: NonNullable<Supplier['vatVerification']>;
  dic: string; // DIČ z formuláře
  formatDate: (date: string) => string;
}> = ({ verification, dic, formatDate }) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const tooltipRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isVisible && wrapperRef.current && tooltipRef.current) {
      const updatePosition = () => {
        if (!wrapperRef.current || !tooltipRef.current) return;
        
        const rect = wrapperRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const scrollX = window.scrollX || window.pageXOffset;
        const scrollY = window.scrollY || window.pageYOffset;

        // Pozice tooltipu nad ikonou
        let left = rect.left + scrollX + rect.width / 2;
        let top = rect.top + scrollY - tooltipRect.height - 8;

        // Zajistit, že tooltip není mimo obrazovku
        const padding = 10;
        const tooltipWidth = tooltipRect.width;
        if (left + tooltipWidth / 2 > window.innerWidth + scrollX - padding) {
          left = window.innerWidth + scrollX - tooltipWidth - padding;
        }
        if (left - tooltipWidth / 2 < scrollX + padding) {
          left = scrollX + padding + tooltipWidth / 2;
        }

        tooltipRef.current.style.left = `${left - tooltipWidth / 2}px`;
        tooltipRef.current.style.top = `${top}px`;
      };

      // Počkat na render tooltipu
      setTimeout(updatePosition, 0);
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);

      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isVisible]);

  const tooltipContent = (
    <div className="space-y-1.5">
      <div className="font-semibold text-sm mb-2 pb-2 border-b border-gray-700">
        {verification.valid ? 'Plátce DPH' : 'Není plátce DPH'}
      </div>
      <div className="text-gray-300 text-xs">
        DIČ: {dic || verification.countryCode || ''}{verification.vatNumber || ''}
      </div>
      <div className="text-gray-300 text-xs">
        Ověřeno: {formatDate(verification.verifiedAt)}
      </div>
      {verification.name && (
        <div className="text-gray-300 text-xs mt-1">
          {verification.name}
        </div>
      )}
    </div>
  );

  return (
    <>
      <div 
        ref={wrapperRef}
        className="inline-flex items-center cursor-help"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={(e) => {
          // Zajistit, že kliknutí na ikonu nezpůsobí focus na input
          e.stopPropagation();
        }}
      >
        {verification.valid ? (
          <div className="text-green-600 flex items-center justify-center">
            <CheckmarkIcon className="h-6 w-6" />
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <WarningIcon className="h-6 w-6 text-red-600" />
          </div>
        )}
      </div>
      {isVisible && (
        <div 
          ref={tooltipRef}
          className="fixed px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl pointer-events-none z-[10000]"
          style={{
            minWidth: '200px',
            maxWidth: '350px',
          }}
          onMouseEnter={() => setIsVisible(true)}
          onMouseLeave={() => setIsVisible(false)}
        >
          {tooltipContent}
          {/* Šipka tooltipu */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-t-4 border-transparent border-t-gray-900 w-0 h-0 border-l-4 border-r-4" />
        </div>
      )}
    </>
  );
};

interface SupplierFormProps {
  initialData: Supplier | null;
  onSave: (supplierData: SupplierData, logoFile?: File, stampFile?: File) => void;
  onBack: () => void;
}

export const SupplierForm: React.FC<SupplierFormProps> = ({ initialData, onSave, onBack }) => {
  const defaultSupplierData: SupplierData = {
    supplier_name: '',
    supplier_street: '',
    supplier_city: '',
    supplier_zip: '',
    supplier_country: 'Česká republika',
    supplier_ico: '',
    supplier_dic: '',
    supplier_statutory_body: '',
    supplier_phone: '',
    supplier_email: '',
    supplier_website: '',
    supplier_iban: '',
    supplier_bankAccount: '',
    supplier_accountNumber: '',
    supplier_bankCode: '',
    supplier_swift: '',
    supplier_logoUrl: '',
    supplier_stampUrl: '',
    isDefault: false,
    isVatPayer: true // výchozí hodnota: je plátce DPH
  };

  const [supplierData, setSupplierData] = useState<SupplierData>(defaultSupplierData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingAres, setIsLoadingAres] = useState(false);
  const [isCheckingVat, setIsCheckingVat] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [stampPreview, setStampPreview] = useState<string | null>(null);
  const [isUploadingStamp, setIsUploadingStamp] = useState(false);
  const [stampFile, setStampFile] = useState<File | null>(null);
  const [invoiceNumberingTypes, setInvoiceNumberingTypes] = useState<InvoiceNumberingType[]>([]);

  useEffect(() => {
    loadInvoiceNumberingTypes();
  }, []);

  useEffect(() => {
    if (initialData) {
      const { id, userId, createdAt, updatedAt, ...dataToEdit } = initialData;
      
      // Migrace starého formátu bankAccount na nový (accountNumber + bankCode)
      if (dataToEdit.supplier_bankAccount && !dataToEdit.supplier_accountNumber) {
        const parts = dataToEdit.supplier_bankAccount.split('/');
        if (parts.length === 2) {
          dataToEdit.supplier_accountNumber = parts[0].trim();
          dataToEdit.supplier_bankCode = parts[1].trim();
        }
      }
      
      setSupplierData({ ...defaultSupplierData, ...dataToEdit });
      // Načíst preview loga pokud existuje
      if (initialData.supplier_logoUrl) {
        setLogoPreview(initialData.supplier_logoUrl);
      } else {
        setLogoPreview(null);
      }
      // Načíst preview razítka pokud existuje
      if (initialData.supplier_stampUrl) {
        setStampPreview(initialData.supplier_stampUrl);
      } else {
        setStampPreview(null);
      }
    } else {
      setSupplierData(defaultSupplierData);
      setLogoPreview(null);
      setStampPreview(null);
    }
  }, [initialData]);

  const loadInvoiceNumberingTypes = async () => {
    try {
      const types = await fetchInvoiceNumberingTypes();
      setInvoiceNumberingTypes(types);
    } catch (error: any) {
      console.error('[SupplierForm] Error loading invoice numbering types:', error);
      // Nezobrazovat chybu uživateli, jen logovat
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setSupplierData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleFetchFromAres = async () => {
    const ico = supplierData.supplier_ico?.trim();
    
    if (!ico || !/^\d{8}$/.test(ico)) {
      toast.error('IČO musí mít přesně 8 číslic');
      return;
    }

    setIsLoadingAres(true);
    try {
      const companyData = await fetchCompanyByIco(ico);
      
      // Log pro kontrolu co se načítá
      console.log('[SupplierForm] Načtená data z ARES:', {
        name: companyData.operator_name,
        street: companyData.operator_street,
        city: companyData.operator_city,
        zip: companyData.operator_zip,
        statutory_body: companyData.operator_statutory_body,
        dic: companyData.operator_dic,
        ico: companyData.operator_ico
      });
      
      // Automaticky předvyplnit všechna pole z ARES
      // Použít hodnoty z ARES pokud existují (i když jsou prázdné stringy)
      setSupplierData(prev => {
        const newData = { ...prev };
        
        // Použít hodnoty z ARES - použít i prázdné stringy pokud existují
        if (companyData.operator_name !== undefined) {
          newData.supplier_name = companyData.operator_name || '';
        }
        if (companyData.operator_street !== undefined) {
          newData.supplier_street = companyData.operator_street || '';
        }
        if (companyData.operator_city !== undefined) {
          newData.supplier_city = companyData.operator_city || '';
        }
        if (companyData.operator_zip !== undefined) {
          newData.supplier_zip = companyData.operator_zip || '';
        }
        if (companyData.operator_statutory_body !== undefined) {
          newData.supplier_statutory_body = companyData.operator_statutory_body || '';
        }
        if (companyData.operator_dic !== undefined) {
          newData.supplier_dic = companyData.operator_dic || '';
        }
        if (companyData.operator_ico !== undefined) {
          newData.supplier_ico = companyData.operator_ico || '';
        }
        
        console.log('[SupplierForm] Updated supplierData:', {
          name: newData.supplier_name,
          street: newData.supplier_street,
          city: newData.supplier_city,
          zip: newData.supplier_zip,
          dic: newData.supplier_dic
        });
        
        return newData;
      });

      toast.success('Údaje byly načteny z ARES');
    } catch (error: any) {
      toast.error(error.message || 'Chyba při načítání dat z ARES');
    } finally {
      setIsLoadingAres(false);
    }
  };

  // Kontrola, zda je IČO validní pro aktivaci tlačítka
  const isIcoValid = supplierData.supplier_ico?.trim().length === 8 && /^\d{8}$/.test(supplierData.supplier_ico.trim());

  // Kontrola, zda je DIČ vyplněné pro aktivaci tlačítka ověření
  const isDicValid = supplierData.supplier_dic && supplierData.supplier_dic.trim().length >= 3;

  const handleCheckVat = async () => {
    const dic = supplierData.supplier_dic?.trim();
    
    if (!dic || dic.length < 3) {
      toast.error('DIČ musí být vyplněné');
      return;
    }

    setIsCheckingVat(true);
    try {
      const result = await checkVat(dic);
      
      // Uložit výsledek ověření do supplierData
      setSupplierData(prev => ({
        ...prev,
        vatVerification: {
          valid: result.valid,
          verifiedAt: result.verifiedAt,
          name: result.name,
          address: result.address,
          countryCode: result.countryCode,
          vatNumber: result.vatNumber
        }
      }));

      if (result.valid) {
        toast.success('DIČ je platné - subjekt je plátce DPH');
      } else {
        toast.error('DIČ není platné - subjekt není plátce DPH');
      }
    } catch (error: any) {
      toast.error(error.message || 'Chyba při ověřování DIČ');
    } finally {
      setIsCheckingVat(false);
    }
  };

  // Formátování data pro tooltip
  const formatVerificationDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('cs-CZ', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validace typu souboru
    if (!file.type.startsWith('image/')) {
      toast.error('Soubor musí být obrázek');
      return;
    }

    // Validace velikosti (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Obrázek musí být menší než 5MB');
      return;
    }

    setIsUploadingLogo(true);
    try {
      // Vytvořit preview
      const preview = await fileToBase64(file);
      setLogoPreview(preview);

      // Pokud je to editace existujícího dodavatele, nahrát logo okamžitě
      if (initialData?.id) {
        const logoUrl = await uploadSupplierLogo(initialData.id, file);
        setSupplierData(prev => ({ ...prev, supplier_logoUrl: logoUrl }));
        toast.success('Logo bylo nahráno');
      } else {
        // Pro nového dodavatele uložit file pro pozdější upload
        setLogoFile(file);
        toast.info('Logo bude nahráno po uložení dodavatele');
      }
    } catch (error: any) {
      console.error('[SupplierForm] Error uploading logo:', error);
      toast.error('Chyba při nahrávání loga: ' + error.message);
      setLogoPreview(null);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleStampUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validace typu souboru
    if (!file.type.startsWith('image/')) {
      toast.error('Soubor musí být obrázek');
      return;
    }

    // Validace velikosti (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Obrázek musí být menší než 5MB');
      return;
    }

    setIsUploadingStamp(true);
    try {
      // Vytvořit preview
      const preview = await fileToBase64(file);
      setStampPreview(preview);

      // Pokud je to editace existujícího dodavatele, nahrát razítko okamžitě
      if (initialData?.id) {
        const stampUrl = await uploadSupplierStamp(initialData.id, file);
        setSupplierData(prev => ({ ...prev, supplier_stampUrl: stampUrl }));
        toast.success('Razítko bylo nahráno');
      } else {
        // Pro nového dodavatele uložit file pro pozdější upload
        setStampFile(file);
        toast.info('Razítko bude nahráno po uložení dodavatele');
      }
    } catch (error: any) {
      console.error('[SupplierForm] Error uploading stamp:', error);
      toast.error('Chyba při nahrávání razítka: ' + error.message);
      setStampPreview(null);
    } finally {
      setIsUploadingStamp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Předat supplierData, logoFile a stampFile (pokud existují) do onSave callbacku
      await onSave(supplierData, logoFile || undefined, stampFile || undefined);
      // Po úspěšném uložení vymazat files
      setLogoFile(null);
      setStampFile(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sekce: Základní údaje */}
        <Card className="border-l-4" style={{ borderLeftColor: '#14b8a6' }}>
          <CardHeader className="bg-gradient-to-r" style={{ 
            background: 'linear-gradient(to right, #14b8a615, #14b8a605)' 
          }}>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#14b8a6' }}></div>
              Základní údaje
            </h3>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField
                label="Název, obchodní firma"
                name="supplier_name"
                value={supplierData.supplier_name || ''}
                onChange={handleChange}
                required
              />
              <div className="w-full">
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <TextField
                      label="IČO"
                      name="supplier_ico"
                      value={supplierData.supplier_ico || ''}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div style={{ marginTop: '28px' }}>
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={handleFetchFromAres}
                      disabled={!isIcoValid || isLoadingAres}
                      isLoading={isLoadingAres}
                      className="px-3"
                      style={{ backgroundColor: '#6366f1', borderColor: '#6366f1' }}
                      title={isIcoValid ? 'Načíst údaje z ARES' : 'Zadejte platné IČO (8 číslic)'}
                    >
                      {!isLoadingAres && <RefreshIcon className="h-4 w-4 text-white" />}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="w-full">
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <TextField
                      label="DIČ"
                      name="supplier_dic"
                      value={supplierData.supplier_dic || ''}
                      onChange={handleChange}
                    />
                  </div>
                  {/* Ikona výsledku ověření hned vedle pole */}
                  {supplierData.vatVerification && !isCheckingVat && (
                    <div className="flex items-center px-1" style={{ marginTop: '28px' }}>
                      <VatVerificationIcon 
                        verification={supplierData.vatVerification}
                        dic={supplierData.supplier_dic || ''}
                        formatDate={formatVerificationDate}
                      />
                    </div>
                  )}
                  <div style={{ marginTop: '28px' }}>
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={handleCheckVat}
                      disabled={!isDicValid || isCheckingVat}
                      isLoading={isCheckingVat}
                      className="px-3"
                      style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                      title={isDicValid ? 'Ověřit DIČ přes VIES' : 'Zadejte DIČ pro ověření'}
                    >
                      {!isCheckingVat && <RefreshIcon className="h-4 w-4 text-white" />}
                    </Button>
                  </div>
                </div>
              </div>
              <TextField
                label="Statutární orgán"
                name="supplier_statutory_body"
                value={supplierData.supplier_statutory_body || ''}
                onChange={handleChange}
              />
              {/* Toggle switch pro Plátce DPH */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex flex-col">
                  <label htmlFor="isVatPayer" className="text-sm font-semibold text-gray-900 cursor-pointer">
                    Plátce DPH
                  </label>
                  <span className="text-xs text-gray-500 mt-0.5">Označte pokud je dodavatel plátce DPH</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="isVatPayer"
                    checked={supplierData.isVatPayer !== false}
                    onChange={(e) => setSupplierData(prev => ({ ...prev, isVatPayer: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                </label>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Sekce: Adresa */}
        <Card className="border-l-4" style={{ borderLeftColor: '#3b82f6' }}>
          <CardHeader className="bg-gradient-to-r" style={{ 
            background: 'linear-gradient(to right, #3b82f615, #3b82f605)' 
          }}>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#3b82f6' }}></div>
              Adresa
            </h3>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField
                label="Ulice"
                name="supplier_street"
                value={supplierData.supplier_street || ''}
                onChange={handleChange}
                required
              />
              <TextField
                label="Město"
                name="supplier_city"
                value={supplierData.supplier_city || ''}
                onChange={handleChange}
                required
              />
              <TextField
                label="PSČ"
                name="supplier_zip"
                value={supplierData.supplier_zip || ''}
                onChange={handleChange}
                required
              />
              <TextField
                label="Stát"
                name="supplier_country"
                value={supplierData.supplier_country || 'Česká republika'}
                onChange={handleChange}
                required
              />
            </div>
          </CardBody>
        </Card>

        {/* Sekce: Kontakt */}
        <Card className="border-l-4" style={{ borderLeftColor: '#8b5cf6' }}>
          <CardHeader className="bg-gradient-to-r" style={{ 
            background: 'linear-gradient(to right, #8b5cf615, #8b5cf605)' 
          }}>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#8b5cf6' }}></div>
              Kontakt
            </h3>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField
                label="Telefon"
                name="supplier_phone"
                type="tel"
                value={supplierData.supplier_phone || ''}
                onChange={handleChange}
              />
              <TextField
                label="E-mail"
                name="supplier_email"
                type="email"
                value={supplierData.supplier_email || ''}
                onChange={handleChange}
              />
              <TextField
                label="Web"
                name="supplier_website"
                type="url"
                value={supplierData.supplier_website || ''}
                onChange={handleChange}
              />
            </div>
          </CardBody>
        </Card>

        {/* Sekce: Bankovní údaje */}
        <Card className="border-l-4" style={{ borderLeftColor: '#10b981' }}>
          <CardHeader className="bg-gradient-to-r" style={{ 
            background: 'linear-gradient(to right, #10b98115, #10b98105)' 
          }}>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10b981' }}></div>
              Bankovní údaje
            </h3>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField
                label="Číslo účtu"
                name="supplier_accountNumber"
                value={supplierData.supplier_accountNumber || ''}
                onChange={handleChange}
                placeholder="např. 1358989898"
              />
              <TextField
                label="Kód banky"
                name="supplier_bankCode"
                value={supplierData.supplier_bankCode || ''}
                onChange={handleChange}
                placeholder="např. 0300"
              />
              <TextField
                label="IBAN"
                name="supplier_iban"
                value={supplierData.supplier_iban || ''}
                onChange={handleChange}
              />
              <TextField
                label="SWIFT"
                name="supplier_swift"
                value={supplierData.supplier_swift || ''}
                onChange={handleChange}
              />
            </div>
          </CardBody>
        </Card>

        {/* Sekce: Dokumenty */}
        <Card className="border-l-4" style={{ borderLeftColor: '#f59e0b' }}>
          <CardHeader className="bg-gradient-to-r" style={{ 
            background: 'linear-gradient(to right, #f59e0b15, #f59e0b05)' 
          }}>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#f59e0b' }}></div>
              Dokumenty
            </h3>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Logo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logo dodavatele <span className="text-xs text-gray-500 font-normal">(Storage)</span>
                </label>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={isUploadingLogo}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 disabled:opacity-50"
                  />
                  {isUploadingLogo && (
                    <p className="text-xs text-gray-500">Nahrávám logo...</p>
                  )}
                  {logoPreview && (
                    <div className="w-full border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-50">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="w-full h-auto max-h-32 object-contain"
                      />
                    </div>
                  )}
                  {supplierData.supplier_logoUrl && !logoPreview && (
                    <p className="text-xs text-gray-500">Logo: {supplierData.supplier_logoUrl.substring(0, 40)}...</p>
                  )}
                </div>
              </div>

              {/* Razítko */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Razítko <span className="text-xs text-gray-500 font-normal">(Storage)</span>
                </label>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleStampUpload}
                    disabled={isUploadingStamp}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 disabled:opacity-50"
                  />
                  {isUploadingStamp && (
                    <p className="text-xs text-gray-500">Nahrávám razítko...</p>
                  )}
                  {stampPreview && (
                    <div className="w-full border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-50">
                      <img
                        src={stampPreview}
                        alt="Razítko preview"
                        className="w-full h-auto max-h-32 object-contain"
                      />
                    </div>
                  )}
                  {supplierData.supplier_stampUrl && !stampPreview && (
                    <p className="text-xs text-gray-500">Razítko: {supplierData.supplier_stampUrl.substring(0, 40)}...</p>
                  )}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Sekce: Nastavení */}
        <Card className="border-l-4" style={{ borderLeftColor: '#ec4899' }}>
          <CardHeader className="bg-gradient-to-r" style={{ 
            background: 'linear-gradient(to right, #ec489915, #ec489905)' 
          }}>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#ec4899' }}></div>
              Nastavení
            </h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <Select
                label="Typ číslování faktur"
                name="invoiceNumberingTypeId"
                value={supplierData.invoiceNumberingTypeId || ''}
                onChange={(e) => setSupplierData(prev => ({ ...prev, invoiceNumberingTypeId: e.target.value || undefined }))}
                options={[
                  { value: '', label: '-- Vyberte typ číslování --' },
                  ...invoiceNumberingTypes.map(type => ({
                    value: type.id,
                    label: `${type.name} (${type.prefix}${String(type.nextNumber).padStart(type.padding, '0')})`
                  }))
                ]}
              />
              {/* Toggle switch pro Výchozí dodavatel */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex flex-col">
                  <label htmlFor="isDefault" className="text-sm font-semibold text-gray-900 cursor-pointer">
                    Nastavit jako výchozího dodavatele
                  </label>
                  <span className="text-xs text-gray-500 mt-0.5">Tento dodavatel bude automaticky vybrán při vytváření nové faktury</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="isDefault"
                    name="isDefault"
                    checked={supplierData.isDefault || false}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
                </label>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button variant="ghost" onClick={onBack} disabled={isSubmitting}>
            Zrušit
          </Button>
          <Button
            variant="primary"
            type="submit"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            Uložit
          </Button>
        </div>
      </form>
    </div>
  );
};

