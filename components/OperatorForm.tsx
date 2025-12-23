import React, { useState, useEffect } from 'react';
import { Operator } from '../types';
import { Card, CardBody } from './ui/Card';
import { TextField } from './ui/Input';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { BackIcon, RefreshIcon, CheckmarkIcon, WarningIcon } from './icons';
import { DetailTooltip } from './ui/DetailTooltip';
import { Tooltip } from 'flowbite-react';
import { fetchCompanyByIco } from '../services/aresService';
import { checkVat } from '../services/viesService';
import { toast } from '../utils/toast';
import { useUnsavedChanges } from '../contexts/UnsavedChangesContext';
import { PageHeader } from './PageHeader';
import { SECTION_THEMES } from '../constants/designSystem';
import { AppState } from '../types';

type OperatorData = Omit<Operator, 'id'>;

// Komponenta pro ikonu ověření DIČ s tooltipem
const VatVerificationIcon: React.FC<{
  verification: NonNullable<Operator['vatVerification']>;
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

interface OperatorFormProps {
  initialData: Operator | null;
  operators?: Operator[]; // Seznam existujících provozovatelů pro kontrolu duplicit
  onSave: (operatorData: OperatorData) => void;
  onBack: () => void;
}

export const OperatorForm: React.FC<OperatorFormProps> = ({ initialData, operators = [], onSave, onBack }) => {
  const { setDirty } = useUnsavedChanges();
  const title = initialData ? 'Upravit provozovatele' : 'Nový provozovatel';
  const defaultOperatorData: OperatorData = {
    operator_name: '',
    operator_street: '',
    operator_city: '',
    operator_zip: '',
    operator_ico: '',
    operator_dic: '',
    operator_statutory_body: '',
    operator_phone: '',
    operator_email: ''
  };

  const [operatorData, setOperatorData] = useState<OperatorData>(defaultOperatorData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingAres, setIsLoadingAres] = useState(false);
  const [isCheckingVat, setIsCheckingVat] = useState(false);
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [rawAresData, setRawAresData] = useState<any>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  useEffect(() => {
    if (initialData) {
      const { id, ...dataToEdit } = initialData;
      setOperatorData({ ...defaultOperatorData, ...dataToEdit });
    } else {
      setOperatorData(defaultOperatorData);
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setOperatorData(prev => ({ ...prev, [name]: value }));
    setDirty(true);
  };

  const handleFetchFromAres = async () => {
    const ico = operatorData.operator_ico?.trim();

    if (!ico || !/^\d{8}$/.test(ico)) {
      toast.error('IČO musí mít přesně 8 číslic');
      return;
    }

    setIsLoadingAres(true);
    try {
      const companyData = await fetchCompanyByIco(ico);

      // Uložit raw data pro debugování
      // Uložit raw data pro debugování
      if (companyData.rawAresData) {
        setRawAresData(companyData.rawAresData);
        // setShowDebugModal(true); // Zobrazit debug okno - vypnuto na žádost uživatele
      }

      // Automaticky předvyplnit všechna pole
      setOperatorData(prev => ({
        ...prev,
        operator_name: companyData.operator_name || prev.operator_name,
        operator_street: companyData.operator_street || prev.operator_street,
        operator_city: companyData.operator_city || prev.operator_city,
        operator_zip: companyData.operator_zip || prev.operator_zip,
        operator_statutory_body: companyData.operator_statutory_body || prev.operator_statutory_body,
        operator_dic: companyData.operator_dic || prev.operator_dic,
        // IČO už je vyplněné uživatelem, ale můžeme ho přepsat pokud se liší
        operator_ico: companyData.operator_ico || prev.operator_ico,
        // Telefon a email ponecháme původní hodnoty (ARES je neobsahuje)
      }));
      setDirty(true);

      toast.success('Údaje byly načteny z ARES');
    } catch (error: any) {
      toast.error(error.message || 'Chyba při načítání dat z ARES');
    } finally {
      setIsLoadingAres(false);
    }
  };

  // Kontrola, zda je IČO validní pro aktivaci tlačítka
  const isIcoValid = operatorData.operator_ico?.trim().length === 8 && /^\d{8}$/.test(operatorData.operator_ico.trim());

  // Kontrola, zda je DIČ vyplněné pro aktivaci tlačítka ověření
  const isDicValid = operatorData.operator_dic && operatorData.operator_dic.trim().length >= 3;

  const handleCheckVat = async () => {
    const dic = operatorData.operator_dic?.trim();

    if (!dic || dic.length < 3) {
      toast.error('DIČ musí být vyplněné');
      return;
    }

    setIsCheckingVat(true);
    try {
      const result = await checkVat(dic);

      // Uložit výsledek ověření do operatorData
      setOperatorData(prev => ({
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
      setDirty(true);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Nastavit dirty na false OKAMŽITĚ při kliknutí na "Uložit", aby se nezobrazilo modální okno
    // o neuložených změnách při navigaci po uložení
    setDirty(false);

    // Kontrola duplicitního IČO (pouze při vytváření nového)
    if (!initialData && operatorData.operator_ico) {
      const duplicate = operators.find(o => o.operator_ico === operatorData.operator_ico);
      if (duplicate) {
        setDirty(true); // Vrátit dirty na true, protože uživatel ještě neuložil (zobrazí se modální okno duplicity)
        setShowDuplicateModal(true);
        return;
      }
    }

    await performSave();
  };

  const performSave = async () => {
    setIsSubmitting(true);
    try {
      setDirty(false); // Nastavit dirty na false PŘED uložením, aby nedošlo k blokování navigace
      await onSave(operatorData);
    } catch (error) {
      setDirty(true); // V případě chyby vrátit dirty na true
      console.error('Error saving operator:', error);
    } finally {
      setIsSubmitting(false);
      setShowDuplicateModal(false);
    }
  };

  return (
    <div className="w-full">
      {/* ... (existing JSX) ... */}

      {/* Duplicate IČO Warning Modal */}
      <Modal
        isOpen={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        title="Duplicitní IČO"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 text-amber-600 bg-amber-50 p-4 rounded-lg">
            <WarningIcon className="h-6 w-6 flex-shrink-0" />
            <div>
              <p className="font-medium">Provozovatel s tímto IČO již existuje!</p>
              <p className="text-sm mt-1 text-amber-700">
                V systému již máte uloženého provozovatele s IČO {operatorData.operator_ico}.
                Opravdu chcete vytvořit dalšího se stejným IČO?
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="ghost" onClick={() => setShowDuplicateModal(false)}>
              Zrušit
            </Button>
            <Button
              variant="primary"
              onClick={performSave}
              isLoading={isSubmitting}
            >
              Přesto uložit
            </Button>
          </div>
        </div>
      </Modal>

      {/* Header with Breadcrumbs */}
      <PageHeader
        section={SECTION_THEMES[AppState.OPERATOR_DASHBOARD]}
        title={title}
        description="Vyplňte údaje o provozovateli"
        breadcrumbs={[
          { label: 'Domů', onClick: onBack },
          { label: 'Zákazníci', onClick: onBack },
          { label: initialData ? initialData.operator_name : 'Nový zákazník', isActive: true }
        ]}
        onBack={onBack}
      />


      {/* Form */}
      <Card>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Provozovatel</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextField
                  label="Název, obchodní firma"
                  name="operator_name"
                  value={operatorData.operator_name || ''}
                  onChange={handleChange}
                  required
                />
                <div className="w-full">
                  <div className="flex gap-2 items-center">
                    <div className="flex-1">
                      <TextField
                        label="IČO"
                        name="operator_ico"
                        value={operatorData.operator_ico || ''}
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
                <TextField
                  label="Ulice"
                  name="operator_street"
                  value={operatorData.operator_street || ''}
                  onChange={handleChange}
                  required
                />
                <TextField
                  label="Město"
                  name="operator_city"
                  value={operatorData.operator_city || ''}
                  onChange={handleChange}
                  required
                />
                <TextField
                  label="PSČ"
                  name="operator_zip"
                  value={operatorData.operator_zip || ''}
                  onChange={handleChange}
                  required
                />
                <div className="w-full">
                  <div className="flex gap-2 items-center">
                    <div className="flex-1">
                      <TextField
                        label="DIČ"
                        name="operator_dic"
                        value={operatorData.operator_dic || ''}
                        onChange={handleChange}
                      />
                    </div>
                    {/* Ikona výsledku ověření hned vedle pole */}
                    {operatorData.vatVerification && !isCheckingVat && (
                      <div className="flex items-center px-1" style={{ marginTop: '28px' }}>
                        <VatVerificationIcon
                          verification={operatorData.vatVerification}
                          dic={operatorData.operator_dic || ''}
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
                  name="operator_statutory_body"
                  value={operatorData.operator_statutory_body || ''}
                  onChange={handleChange}
                />
                <TextField
                  label="Telefon"
                  name="operator_phone"
                  type="tel"
                  value={operatorData.operator_phone || ''}
                  onChange={handleChange}
                />
                <TextField
                  label="E-mail"
                  name="operator_email"
                  type="email"
                  value={operatorData.operator_email || ''}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
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
        </CardBody>
      </Card>

      {/* Debug Modal - zobrazí raw data z ARES */}
      <Modal
        isOpen={showDebugModal}
        onClose={() => setShowDebugModal(false)}
        title="Debug: Raw data z ARES API"
        size="xl"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            Níže jsou všechna raw data, která vrátilo ARES API. Použijte toto k identifikaci struktury a úpravě parsování.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 overflow-auto max-h-[600px]">
            <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap break-words">
              {rawAresData ? JSON.stringify(rawAresData, null, 2) : 'Žádná data'}
            </pre>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="ghost" onClick={() => setShowDebugModal(false)}>
              Zavřít
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
