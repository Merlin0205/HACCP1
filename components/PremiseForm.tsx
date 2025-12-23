import React, { useState, useEffect } from 'react';
import { Premise } from '../types';
import { Card, CardBody } from './ui/Card';
import { TextField, Select } from './ui/Input';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { WarningIcon } from './icons';
import { fetchActiveAuditTypes } from '../services/firestore/auditTypes';
import { useUnsavedChanges } from '../contexts/UnsavedChangesContext';
import { PageHeader } from './PageHeader';
import { SECTION_THEMES } from '../constants/designSystem';
import { AppState } from '../types';
import { fetchOperator } from '../services/firestore/operators';

type PremiseData = Omit<Premise, 'id'>;

interface PremiseFormProps {
  initialData: Premise | null;
  operatorId: string;
  premises?: Premise[]; // Seznam existujících pracovišť pro kontrolu duplicit
  onSave: (premiseData: PremiseData) => void;
  onBack: () => void;
}

interface AuditTypeOption {
  value: string;
  label: string;
}

export const PremiseForm: React.FC<PremiseFormProps> = ({ initialData, operatorId, premises = [], onSave, onBack }) => {
  const { setDirty } = useUnsavedChanges();
  const defaultPremiseData: PremiseData = {
    operatorId: operatorId,
    premise_name: '',
    premise_address: '',
    premise_responsible_person: '',
    premise_phone: '',
    premise_email: '',
    auditTypeId: ''
  };

  const [premiseData, setPremiseData] = useState<PremiseData>(defaultPremiseData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [auditTypes, setAuditTypes] = useState<AuditTypeOption[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [operatorName, setOperatorName] = useState<string>('');
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  // Načíst jméno operátora pro breadcrumbs
  useEffect(() => {
    const loadOperator = async () => {
      try {
        const op = await fetchOperator(operatorId);
        if (op) setOperatorName(op.operator_name);
      } catch (e) {
        console.error('Error loading operator name', e);
      }
    };
    if (operatorId) loadOperator();
  }, [operatorId]);

  // Načíst aktivní typy auditů
  useEffect(() => {
    const loadAuditTypes = async () => {
      try {
        setLoadingTypes(true);
        const types = await fetchActiveAuditTypes();
        setAuditTypes(types.map(type => ({
          value: type.id,
          label: type.name
        })));
      } catch (error) {
        console.error('[PremiseForm] Error loading audit types:', error);
      } finally {
        setLoadingTypes(false);
      }
    };
    loadAuditTypes();
  }, []);

  useEffect(() => {
    if (initialData) {
      const { id, ...dataToEdit } = initialData;
      setPremiseData({ ...defaultPremiseData, ...dataToEdit });
    } else {
      setPremiseData({ ...defaultPremiseData, operatorId });
    }
  }, [initialData, operatorId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPremiseData(prev => ({ ...prev, [name]: value }));
    setDirty(true);
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPremiseData(prev => ({ ...prev, [name]: value }));
    setDirty(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Nastavit dirty na false OKAMŽITĚ při kliknutí na "Uložit", aby se nezobrazilo modální okno
    // o neuložených změnách při navigaci po uložení
    setDirty(false);

    // Validace - auditTypeId je povinné
    if (!premiseData.auditTypeId) {
      setDirty(true); // Vrátit dirty na true, protože validace selhala
      return;
    }

    // Kontrola duplicitního pracoviště (pouze při vytváření nového)
    // Kontroluje se kombinace premise_name + premise_address
    if (!initialData && premiseData.premise_name && premiseData.premise_address) {
      const duplicate = premises.find(
        p => 
          p.premise_name?.trim().toLowerCase() === premiseData.premise_name?.trim().toLowerCase() &&
          p.premise_address?.trim().toLowerCase() === premiseData.premise_address?.trim().toLowerCase()
      );
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
      await onSave(premiseData);
    } catch (error) {
      setDirty(true); // V případě chyby vrátit dirty na true
      console.error('Error saving premise:', error);
    } finally {
      setIsSubmitting(false);
      setShowDuplicateModal(false);
    }
  };

  const title = initialData ? 'Upravit pracoviště' : 'Nové pracoviště';

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Duplicate Premise Warning Modal */}
      <Modal
        isOpen={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        title="Duplicitní pracoviště"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 text-amber-600 bg-amber-50 p-4 rounded-lg">
            <WarningIcon className="h-6 w-6 flex-shrink-0" />
            <div>
              <p className="font-medium">Pracoviště s touto kombinací již existuje!</p>
              <p className="text-sm mt-1 text-amber-700">
                V systému již máte uložené pracoviště s názvem "{premiseData.premise_name}" a adresou "{premiseData.premise_address}".
                Opravdu chcete vytvořit další se stejnou kombinací?
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="ghost" onClick={() => {
              setShowDuplicateModal(false);
              // Ponechat dirty na true, protože uživatel zrušil uložení
            }}>
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

      {/* Header */}
      {/* Header with Breadcrumbs */}
      <PageHeader
        section={SECTION_THEMES[AppState.OPERATOR_DASHBOARD]}
        title={title}
        description="Vyplňte údaje o pracovišti"
        breadcrumbs={[
          { label: 'Domů', onClick: onBack },
          { label: 'Zákazníci', onClick: onBack },
          { label: operatorName || 'Zákazník', onClick: onBack }, // Ideally navigate to customer detail but back is fine
          { label: initialData ? initialData.premise_name : 'Nové pracoviště', isActive: true }
        ]}
        onBack={onBack}
      />

      {/* Form */}
      <Card>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Auditované pracoviště</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextField
                  label="Provozovna"
                  name="premise_name"
                  value={premiseData.premise_name || ''}
                  onChange={handleChange}
                  required
                />
                <TextField
                  label="Adresa"
                  name="premise_address"
                  value={premiseData.premise_address || ''}
                  onChange={handleChange}
                  required
                />
                <TextField
                  label="Odpovědná osoba"
                  name="premise_responsible_person"
                  value={premiseData.premise_responsible_person || ''}
                  onChange={handleChange}
                />
                <TextField
                  label="Telefon"
                  name="premise_phone"
                  type="tel"
                  value={premiseData.premise_phone || ''}
                  onChange={handleChange}
                />
                <TextField
                  label="E-mail"
                  name="premise_email"
                  type="email"
                  value={premiseData.premise_email || ''}
                  onChange={handleChange}
                />
                <Select
                  label="Typ auditu"
                  name="auditTypeId"
                  value={premiseData.auditTypeId || ''}
                  onChange={handleSelectChange}
                  options={[
                    { value: '', label: loadingTypes ? 'Načítání...' : 'Vyberte typ auditu' },
                    ...auditTypes
                  ]}
                  required
                  error={!premiseData.auditTypeId ? 'Typ auditu je povinný' : undefined}
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
    </div>
  );
};
