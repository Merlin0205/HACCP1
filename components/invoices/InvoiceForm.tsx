import React, { useState, useEffect, useMemo } from 'react';
import { Timestamp } from 'firebase/firestore';
import { Invoice, InvoiceItem, InvoiceStatus, InvoiceSupplier, BillingSettings } from '../../types/invoice';
import { Operator, Premise, Audit } from '../../types';
import { findPriceItemByName, fetchAudit } from '../../services/firestore';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { TextField, TextArea, Select } from '../ui/Input';
import { Button } from '../ui/Button';
import { BackButton } from '../BackButton';
import { PlusIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon, ReceiptIcon, UserIcon, BuildingIcon, ListIcon, CalculatorIcon } from '../icons';
import { createInvoice, updateInvoice, createOperator } from '../../services/firestore';
import { fetchBillingSettings, generateNextInvoiceNumber } from '../../services/firestore/billingSettings';
import { toast } from '../../utils/toast';
import { calculateItemTotals, calculateInvoiceTotals, formatCurrency, formatAmount } from '../../utils/invoiceCalculations';
import { SECTION_THEMES } from '../../constants/designSystem';
import { AppState } from '../../types';
import { Modal } from '../ui/Modal';
import { OperatorForm } from '../OperatorForm';
import { SupplierForm } from '../SupplierForm';
import { DetailTooltip } from '../ui/DetailTooltip';
import { Supplier } from '../../types';
import { fetchSuppliers, fetchDefaultSupplier, createSupplier } from '../../services/firestore/suppliers';

interface InvoiceFormProps {
  invoice?: Invoice | null;
  invoiceId?: string;
  initialAuditId?: string;
  initialCustomerId?: string;
  operators: Operator[];
  premises: Premise[];
  audits: Audit[];
  onSave: (invoiceId: string) => void;
  onBack: () => void;
  onNavigateToSettings?: () => void;
  onNavigateToAddOperator?: () => void;
  onOperatorAdded?: (operator: Operator) => void; // Callback po přidání zákazníka
  onSupplierAdded?: (supplier: Supplier) => void; // Callback po přidání dodavatele
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({
  invoice,
  invoiceId,
  initialAuditId,
  initialCustomerId,
  operators,
  premises,
  audits,
  onSave,
  onBack,
  onNavigateToSettings,
  onNavigateToAddOperator,
  onOperatorAdded,
  onSupplierAdded,
}) => {
  const [billingSettings, setBillingSettings] = useState<BillingSettings | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showAddOperatorModal, setShowAddOperatorModal] = useState(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [isCustomerExpanded, setIsCustomerExpanded] = useState(true); // Otevřené defaultně
  const [isItemsExpanded, setIsItemsExpanded] = useState(true); // Otevřené defaultně
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(true); // Otevřené defaultně
  const [isNotesExpanded, setIsNotesExpanded] = useState(false); // Sbalené defaultně
  const [isPremiseExpanded, setIsPremiseExpanded] = useState(false); // Sbalené defaultně, ale pokud je z auditu, otevřít
  
  // Form state
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [variableSymbol, setVariableSymbol] = useState('');
  const [constantSymbol, setConstantSymbol] = useState('308');
  const [createdAt, setCreatedAt] = useState(new Date().toISOString().split('T')[0]);
  const [taxableSupplyDate, setTaxableSupplyDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [currency, setCurrency] = useState('CZK');
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'cash' | 'card' | 'other'>('bank_transfer');
  
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customer, setCustomer] = useState({
    name: '',
    street: '',
    city: '',
    zip: '',
    country: 'Česká republika',
    companyId: '',
    vatId: '',
    contactPerson: '',
    email: '',
    phone: '',
  });
  
  const [selectedPremiseId, setSelectedPremiseId] = useState<string>('');
  const [premise, setPremise] = useState<{
    name: string;
    address: string;
    responsiblePerson?: string;
    phone?: string;
    email?: string;
  } | null>(null);
  
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [note, setNote] = useState('');
  const [footerNote, setFooterNote] = useState('');
  
  // Collapsible sections state
  const [isSupplierExpanded, setIsSupplierExpanded] = useState(false);
  // isPremiseExpanded je deklarováno výše s ostatními stavy
  
  // Validation errors
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadBillingSettings();
    loadSuppliers();
  }, []);

  // Automaticky vybrat výchozího dodavatele když se načtou dodavatelé
  useEffect(() => {
    if (suppliers.length > 0 && !invoiceId && !invoice) {
      // Pouze pokud není editace faktury
      const selectDefaultSupplier = async () => {
        const defaultSupplier = await fetchDefaultSupplier();
        if (defaultSupplier) {
          // Vždy použít výchozího dodavatele pokud existuje
          // Zkontrolovat jestli aktuálně vybraný dodavatel není výchozí
          const currentSupplier = suppliers.find(s => s.id === selectedSupplierId);
          if (!currentSupplier || !currentSupplier.isDefault || currentSupplier.id !== defaultSupplier.id) {
            setSelectedSupplierId(defaultSupplier.id);
          }
        } else if (suppliers.length > 0 && !selectedSupplierId) {
          // Pokud není výchozí a není vybrán žádný, použít prvního
          setSelectedSupplierId(suppliers[0].id);
        }
      };
      selectDefaultSupplier();
    }
  }, [suppliers, invoiceId, invoice, selectedSupplierId]);

  // Načíst dodavatele
  const loadSuppliers = async () => {
    try {
      // Nejprve zkusit migrovat z BillingSettings pokud ještě neexistují dodavatelé
      const { migrateSupplierFromBillingSettings } = await import('../../services/firestore/suppliers');
      await migrateSupplierFromBillingSettings();
      
      const loadedSuppliers = await fetchSuppliers();
      setSuppliers(loadedSuppliers);
    } catch (error: any) {
      console.error('[InvoiceForm] Error loading suppliers:', error);
      toast.error('Chyba při načítání dodavatelů: ' + error.message);
    }
  };

  // Načíst fakturu pokud editujeme
  useEffect(() => {
    if (invoiceId && !invoice) {
      const loadInvoice = async () => {
        try {
          const { getInvoice } = await import('../../services/firestore/invoices');
          const loadedInvoice = await getInvoice(invoiceId);
          if (loadedInvoice) {
            setInvoiceNumber(loadedInvoice.invoiceNumber);
            setVariableSymbol(loadedInvoice.variableSymbol);
            setConstantSymbol(loadedInvoice.constantSymbol || '308');
            setCreatedAt(loadedInvoice.createdAt instanceof Timestamp 
              ? loadedInvoice.createdAt.toDate().toISOString().split('T')[0]
              : new Date(loadedInvoice.createdAt as string).toISOString().split('T')[0]);
            setTaxableSupplyDate(loadedInvoice.taxableSupplyDate instanceof Timestamp
              ? loadedInvoice.taxableSupplyDate.toDate().toISOString().split('T')[0]
              : new Date(loadedInvoice.taxableSupplyDate as string).toISOString().split('T')[0]);
            setDueDate(loadedInvoice.dueDate instanceof Timestamp
              ? loadedInvoice.dueDate.toDate().toISOString().split('T')[0]
              : new Date(loadedInvoice.dueDate as string).toISOString().split('T')[0]);
            setCurrency(loadedInvoice.currency);
            setPaymentMethod(loadedInvoice.payment.method);
            setCustomer(loadedInvoice.customer);
            setSelectedCustomerId(loadedInvoice.customerId);
            setPremise(loadedInvoice.premise || null);
            // Pokud je premise v načtené faktuře, najít její ID v seznamu premises
            if (loadedInvoice.premise && loadedInvoice.customerId && premises.length > 0) {
              const premiseForCustomer = premises.find(p => 
                p.operatorId === loadedInvoice.customerId && 
                p.premise_name === loadedInvoice.premise?.name
              );
              if (premiseForCustomer) {
                setSelectedPremiseId(premiseForCustomer.id);
              }
            }
            setItems(loadedInvoice.items);
            setNote(loadedInvoice.note || '');
            setFooterNote(loadedInvoice.footerNote || '');
            
            // Pokud faktura nemá logoUrl nebo stampUrl, zkusit je načíst z aktuálního dodavatele
            // (může se stát, že faktura byla vytvořena před nahráním loga/razítka)
            if (suppliers.length > 0 && loadedInvoice.supplier) {
              // Najít dodavatele podle názvu nebo IČO
              const matchingSupplier = suppliers.find(s => 
                s.supplier_name === loadedInvoice.supplier.name || 
                s.supplier_ico === loadedInvoice.supplier.companyId
              );
              
              if (matchingSupplier) {
                // Pokud faktura nemá logoUrl, ale dodavatel má, použít z dodavatele
                if (!loadedInvoice.supplier.logoUrl && matchingSupplier.supplier_logoUrl) {
                  loadedInvoice.supplier.logoUrl = matchingSupplier.supplier_logoUrl;
                }
                // Pokud faktura nemá stampUrl, ale dodavatel má, použít z dodavatele
                if (!loadedInvoice.supplier.stampUrl && matchingSupplier.supplier_stampUrl) {
                  loadedInvoice.supplier.stampUrl = matchingSupplier.supplier_stampUrl;
                }
                // Nastavit selectedSupplierId pro správné zobrazení
                setSelectedSupplierId(matchingSupplier.id);
              }
            }
          }
        } catch (error: any) {
          console.error('[InvoiceForm] Error loading invoice:', error);
          toast.error('Chyba při načítání faktury: ' + error.message);
        }
      };
      loadInvoice();
    } else if (invoice) {
      // Edit mode - načíst data z faktury
      setInvoiceNumber(invoice.invoiceNumber);
      setVariableSymbol(invoice.variableSymbol);
      setConstantSymbol(invoice.constantSymbol || '308');
      setCreatedAt(invoice.createdAt instanceof Timestamp 
        ? invoice.createdAt.toDate().toISOString().split('T')[0]
        : new Date(invoice.createdAt as string).toISOString().split('T')[0]);
      setTaxableSupplyDate(invoice.taxableSupplyDate instanceof Timestamp
        ? invoice.taxableSupplyDate.toDate().toISOString().split('T')[0]
        : new Date(invoice.taxableSupplyDate as string).toISOString().split('T')[0]);
      setDueDate(invoice.dueDate instanceof Timestamp
        ? invoice.dueDate.toDate().toISOString().split('T')[0]
        : new Date(invoice.dueDate as string).toISOString().split('T')[0]);
      setCurrency(invoice.currency);
      setPaymentMethod(invoice.payment.method);
      setCustomer(invoice.customer);
      setSelectedCustomerId(invoice.customerId);
      setPremise(invoice.premise || null);
      // Pokud je premise v načtené faktuře, najít její ID v seznamu premises
      if (invoice.premise && invoice.customerId && premises.length > 0) {
        const premiseForCustomer = premises.find(p => 
          p.operatorId === invoice.customerId && 
          p.premise_name === invoice.premise?.name
        );
        if (premiseForCustomer) {
          setSelectedPremiseId(premiseForCustomer.id);
        }
      }
      setItems(invoice.items);
      setNote(invoice.note || '');
      setFooterNote(invoice.footerNote || '');
      
      // Pokud faktura nemá logoUrl nebo stampUrl, zkusit je načíst z aktuálního dodavatele
      // (může se stát, že faktura byla vytvořena před nahráním loga/razítka)
      if (suppliers.length > 0 && invoice.supplier) {
        // Najít dodavatele podle názvu nebo IČO
        const matchingSupplier = suppliers.find(s => 
          s.supplier_name === invoice.supplier.name || 
          s.supplier_ico === invoice.supplier.companyId
        );
        
        if (matchingSupplier) {
          // Pokud faktura nemá logoUrl, ale dodavatel má, použít z dodavatele
          if (!invoice.supplier.logoUrl && matchingSupplier.supplier_logoUrl) {
            invoice.supplier.logoUrl = matchingSupplier.supplier_logoUrl;
          }
          // Pokud faktura nemá stampUrl, ale dodavatel má, použít z dodavatele
          if (!invoice.supplier.stampUrl && matchingSupplier.supplier_stampUrl) {
            invoice.supplier.stampUrl = matchingSupplier.supplier_stampUrl;
          }
          // Nastavit selectedSupplierId pro správné zobrazení
          setSelectedSupplierId(matchingSupplier.id);
        }
      }
    }
  }, [invoice, invoiceId, premises, suppliers]);

  // Inicializovat novou fakturu když jsou initialAuditId/initialCustomerId
  // POZNÁMKA: Zákazníka můžeme načíst i bez billingSettings
  useEffect(() => {
    // Pouze pokud vytváříme novou fakturu (ne editujeme)
    if (invoiceId || invoice) {
      return;
    }
    
    // Pouze pokud máme initialAuditId nebo initialCustomerId
    if (!initialAuditId && !initialCustomerId) {
      return;
    }
    
    // Pouze pokud už neprobíhá inicializace
    if (isInitializing) {
      return;
    }
    
    // Pokud ještě načítáme billingSettings, počkat
    if (isLoadingSettings) {
      return;
    }
    
    setIsInitializing(true);
    initializeNewInvoice()
      .catch((error) => {
        console.error('[InvoiceForm] Error initializing invoice:', error);
      })
      .finally(() => {
        setIsInitializing(false);
      });
  }, [billingSettings, initialAuditId, initialCustomerId, operators, premises, audits, invoiceId, invoice, isLoadingSettings]);

  // Inicializovat novou fakturu i když není initialAuditId ani initialCustomerId
  // (pouze číslo faktury, variabilní symbol a splatnost)
  useEffect(() => {
    // Pouze pokud vytváříme novou fakturu (ne editujeme)
    if (invoiceId || invoice || initialAuditId || initialCustomerId) {
      return;
    }
    
    // Pouze pokud už neprobíhá inicializace
    if (isInitializing) {
      return;
    }
    
    // Pokud ještě načítáme billingSettings, počkat
    if (isLoadingSettings) {
      return;
    }
    
    // Pokud už máme číslo faktury, variabilní symbol a splatnost, neinicializovat znovu
    if (invoiceNumber && variableSymbol && dueDate) {
      return;
    }
    
    setIsInitializing(true);
    
    const initializeBasicFields = async () => {
      try {
        const today = new Date();
        
        // Vždy předvyplnit datumy
        if (!createdAt) {
          setCreatedAt(today.toISOString().split('T')[0]);
        }
        if (!taxableSupplyDate) {
          setTaxableSupplyDate(today.toISOString().split('T')[0]);
        }
        
        // Vygenerovat číslo faktury a variabilní symbol
        if (!invoiceNumber && billingSettings) {
          try {
            const newInvoiceNumber = await generateNextInvoiceNumber();
            setInvoiceNumber(newInvoiceNumber);
            // Extrahovat číselnou část pro variabilní symbol
            const numericPart = newInvoiceNumber.replace(/^[A-Za-z]+/, '');
            setVariableSymbol(numericPart || newInvoiceNumber);
          } catch (error: any) {
            console.error('[InvoiceForm] Error generating invoice number:', error);
          }
        }
        
        // Splatnost
        if (!dueDate) {
          const dueDateValue = new Date(today);
          if (billingSettings?.supplier.defaultDueDays) {
            dueDateValue.setDate(dueDateValue.getDate() + billingSettings.supplier.defaultDueDays);
          } else {
            dueDateValue.setDate(dueDateValue.getDate() + 14); // Výchozí 14 dní
          }
          setDueDate(dueDateValue.toISOString().split('T')[0]);
        }
      } catch (error: any) {
        console.error('[InvoiceForm] Error initializing basic fields:', error);
      } finally {
        setIsInitializing(false);
      }
    };
    
    initializeBasicFields();
  }, [billingSettings, invoiceId, invoice, initialAuditId, initialCustomerId, isLoadingSettings, invoiceNumber, variableSymbol, dueDate, createdAt, taxableSupplyDate]);

  const loadBillingSettings = async () => {
    try {
      setIsLoadingSettings(true);
      console.log('[InvoiceForm] Loading billing settings...');
      const settings = await fetchBillingSettings();
      console.log('[InvoiceForm] Billing settings loaded:', settings);
      if (settings) {
        setBillingSettings(settings);
        setCurrency(settings.supplier.defaultCurrency);
        setPaymentMethod(settings.supplier.defaultPaymentMethod);
      } else {
        toast.warning('Fakturační nastavení není nakonfigurováno. Prosím nastavte údaje dodavatele.');
      }
    } catch (error: any) {
      console.error('[InvoiceForm] Error loading billing settings:', error);
      toast.error('Chyba při načítání fakturačních nastavení: ' + error.message);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const initializeNewInvoice = async () => {
    try {
      const today = new Date();
      
      // Pokud není billingSettings, použít výchozí hodnoty
      if (!billingSettings) {
        // Vždy předvyplnit datumy
        if (!createdAt) {
          setCreatedAt(today.toISOString().split('T')[0]);
        }
        if (!taxableSupplyDate) {
          setTaxableSupplyDate(today.toISOString().split('T')[0]);
        }
        if (!dueDate) {
          const dueDateValue = new Date(today);
          dueDateValue.setDate(dueDateValue.getDate() + 14); // Výchozí 14 dní
          setDueDate(dueDateValue.toISOString().split('T')[0]);
        }
        setCurrency('CZK');
        setPaymentMethod('bank_transfer');
      } else {
        // Vygenerovat číslo faktury (pouze pokud ještě není nastaveno)
        if (!invoiceNumber) {
          try {
            const newInvoiceNumber = await generateNextInvoiceNumber();
            setInvoiceNumber(newInvoiceNumber);
            // Extrahovat číselnou část pro variabilní symbol (odstranit písmena na začátku)
            const numericPart = newInvoiceNumber.replace(/^[A-Za-z]+/, '');
            setVariableSymbol(numericPart || newInvoiceNumber);
          } catch (error: any) {
            console.error('[InvoiceForm] Error generating invoice number:', error);
            // Pokud selže generování čísla, použít placeholder
            const placeholderNumber = 'NOVÁ-' + new Date().getTime();
            setInvoiceNumber(placeholderNumber);
            const numericPart = placeholderNumber.replace(/^[A-Za-z]+/, '');
            setVariableSymbol(numericPart || placeholderNumber);
          }
        } else if (!variableSymbol) {
          // Pokud už máme číslo faktury, ale nemáme variabilní symbol, extrahovat číselnou část
          const numericPart = invoiceNumber.replace(/^[A-Za-z]+/, '');
          setVariableSymbol(numericPart || invoiceNumber);
        }
        
        // Vždy předvyplnit datumy (z billingSettings nebo výchozí)
        if (!createdAt) {
          setCreatedAt(today.toISOString().split('T')[0]);
        }
        if (!taxableSupplyDate) {
          setTaxableSupplyDate(today.toISOString().split('T')[0]);
        }
        if (!dueDate) {
          // Splatnost = dnes + defaultDueDays
          const dueDateValue = new Date(today);
          dueDateValue.setDate(dueDateValue.getDate() + billingSettings.supplier.defaultDueDays);
          setDueDate(dueDateValue.toISOString().split('T')[0]);
        }
        
        setCurrency(billingSettings.supplier.defaultCurrency);
        setPaymentMethod(billingSettings.supplier.defaultPaymentMethod);
      }
      
      // Pokud je initialAuditId, načíst zákazníka z auditu
      if (initialAuditId) {
        // Zkusit najít audit v lokálních datech nebo načíst z Firestore
        let audit = audits.find(a => a.id === initialAuditId);
        if (!audit) {
          try {
            audit = await fetchAudit(initialAuditId);
          } catch (error: any) {
            console.error('[InvoiceForm] Error fetching audit:', error);
          }
        }
        
        if (audit) {
          // Najít premise podle premiseId
          let premise = premises.find(p => p.id === audit!.premiseId);
          if (!premise && audit.premiseId) {
            // Pokud premise není v lokálních datech, zkusit načíst z Firestore
            try {
              const { fetchPremise } = await import('../../services/firestore');
              premise = await fetchPremise(audit.premiseId);
            } catch (error: any) {
              console.error('[InvoiceForm] Error fetching premise:', error);
            }
          }
          
          if (premise) {
            // Najít operator podle operatorId z premise
            let operator = operators.find(o => o.id === premise!.operatorId);
            if (!operator && premise.operatorId) {
              // Pokud operator není v lokálních datech, zkusit načíst z Firestore
              try {
                const { fetchOperator } = await import('../../services/firestore');
                operator = await fetchOperator(premise.operatorId);
              } catch (error: any) {
                console.error('[InvoiceForm] Error fetching operator:', error);
              }
            }
            
            if (operator) {
              setSelectedCustomerId(operator.id);
              loadCustomerData(operator);
              
              // Nastavit provozovnu (premise) - automaticky předvyplnit z auditu
              if (premise) {
                // Nastavit selectedPremiseId pokud premise existuje v seznamu
                setSelectedPremiseId(premise.id);
                setPremise({
                  name: premise.premise_name,
                  address: premise.premise_address,
                  responsiblePerson: premise.premise_responsible_person,
                  phone: premise.premise_phone,
                  email: premise.premise_email,
                });
                // Otevřít sekci provozovny pokud je načtena z auditu
                setIsPremiseExpanded(true);
              }
              
              // Nastavit datum zdanitelného plnění na datum dokončení auditu
              if (audit.completedAt) {
                const completedDate = new Date(audit.completedAt);
                setTaxableSupplyDate(completedDate.toISOString().split('T')[0]);
              }
              
              // Načíst cenu z ceníku pro "Audit" (pouze pokud ještě nejsou položky)
              if (items.length === 0) {
                try {
                  const priceItem = await findPriceItemByName('Audit');
                  if (priceItem && priceItem.active) {
                    // Přidat položku do faktury s přesnými daty z ceníku
                    const invoiceItem: InvoiceItem = {
                      id: '1',
                      name: priceItem.name, // Použít přesný název z ceníku
                      description: priceItem.description || undefined, // Použít popis z ceníku pokud existuje
                      quantity: 1,
                      unit: priceItem.unit,
                      unitPrice: priceItem.unitPrice,
                      vatRate: priceItem.vatRate,
                      ...calculateItemTotals({
                        quantity: 1,
                        unitPrice: priceItem.unitPrice,
                        vatRate: priceItem.vatRate,
                      }),
                    };
                    setItems([invoiceItem]);
                  }
                } catch (error: any) {
                  console.error('[InvoiceForm] Error loading price item:', error);
                }
              }
            }
          }
        }
      } else if (initialCustomerId) {
        // Pokud je initialCustomerId (ale není audit), načíst zákazníka
        let operator = operators.find(o => o.id === initialCustomerId);
        if (!operator) {
          // Pokud operator není v lokálních datech, zkusit načíst z Firestore
          try {
            const { fetchOperator } = await import('../../services/firestore');
            operator = await fetchOperator(initialCustomerId);
          } catch (error: any) {
            console.error('[InvoiceForm] Error fetching operator:', error);
          }
        }
        
        if (operator && !selectedCustomerId) {
          setSelectedCustomerId(operator.id);
          loadCustomerData(operator);
        }
      }
    } catch (error: any) {
      console.error('[InvoiceForm] Error initializing invoice:', error);
      toast.error('Chyba při inicializaci faktury: ' + error.message);
    }
  };

  const loadCustomerData = (operator: Operator) => {
    // Použít nová pole adresy pokud existují, jinak parsovat ze starého formátu
    let street = '';
    let city = '';
    let zip = '';
    
    if ((operator as any).operator_street && (operator as any).operator_city && (operator as any).operator_zip) {
      // Nový formát - rozdělená adresa
      street = (operator as any).operator_street || '';
      city = (operator as any).operator_city || '';
      zip = (operator as any).operator_zip || '';
    } else if (operator.operator_address) {
      // Starý formát - parsovat adresu
      const addressParts = operator.operator_address.split(',') || [];
      street = addressParts[0]?.trim() || '';
      const cityZip = addressParts[1]?.trim() || '';
      const zipMatch = cityZip?.match(/^(\d{5})\s*(.+)$/);
      zip = zipMatch ? zipMatch[1] : '';
      city = zipMatch ? zipMatch[2] : cityZip;
    }

    setCustomer({
      name: operator.operator_name || '',
      street: street,
      city: city || '',
      zip: zip || '',
      country: 'Česká republika',
      companyId: operator.operator_ico || '',
      vatId: operator.operator_dic || '',
      contactPerson: '',
      email: operator.operator_email || '',
      phone: operator.operator_phone || '',
    });
  };

  const handleCustomerChange = (operatorId: string) => {
    setSelectedCustomerId(operatorId);
    const operator = operators.find(o => o.id === operatorId);
    if (operator) {
      loadCustomerData(operator);
      // Resetovat vybranou provozovnu když se změní zákazník
      setSelectedPremiseId('');
      setPremise(null);
    }
  };

  const handlePremiseChange = (premiseId: string) => {
    setSelectedPremiseId(premiseId);
    const selectedPremise = premises.find(p => p.id === premiseId);
    if (selectedPremise) {
      setPremise({
        name: selectedPremise.premise_name,
        address: selectedPremise.premise_address,
        responsiblePerson: selectedPremise.premise_responsible_person,
        phone: selectedPremise.premise_phone,
        email: selectedPremise.premise_email,
      });
      // Otevřít sekci provozovny když se vybere
      setIsPremiseExpanded(true);
    } else {
      setPremise(null);
    }
  };

  // Načíst provozovny pro vybraného zákazníka
  const availablePremises = useMemo(() => {
    if (!selectedCustomerId) return [];
    return premises.filter(p => p.operatorId === selectedCustomerId);
  }, [premises, selectedCustomerId]);

  const handleAddItem = () => {
    const newItem: Omit<InvoiceItem, 'totalWithoutVat' | 'vatAmount' | 'totalWithVat'> = {
      id: Date.now().toString(),
      name: '',
      description: '',
      quantity: 1,
      unit: 'ks',
      unitPrice: 0,
      vatRate: 21,
    };
    const calculatedItem = calculateItemTotals(newItem);
    setItems([...items, calculatedItem]);
  };

  const handleItemChange = (itemId: string, field: keyof InvoiceItem, value: any) => {
    setItems(items.map(item => {
      if (item.id !== itemId) return item;
      
      const updatedItem = { ...item, [field]: value };
      return calculateItemTotals(updatedItem);
    }));
  };

  const handleRemoveItem = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId));
  };

  const totals = useMemo(() => {
    return calculateInvoiceTotals(items);
  }, [items]);

  const handleSubmit = async (e?: React.MouseEvent) => {
    // Prevent default form submission if called from button
    if (e) {
      e.preventDefault();
    }
    
    // Reset validation errors
    setValidationErrors({});
    
    const errors: Record<string, string> = {};
    
    // Validace
    if (!invoiceNumber.trim()) {
      errors.invoiceNumber = 'Číslo faktury je povinné';
    }
    if (!createdAt) {
      errors.createdAt = 'Datum vystavení je povinné';
    }
    if (!dueDate) {
      errors.dueDate = 'Splatnost je povinná';
    }
    if (!customer.name.trim()) {
      errors.customerName = 'Zákazník je povinný';
    }
    if (items.length === 0) {
      errors.items = 'Přidejte alespoň jednu položku';
    }
    if (items.some(item => !item.name.trim())) {
      errors.items = 'Všechny položky musí mít název';
    }
    if (!selectedSupplierId && !billingSettings) {
      errors.supplier = 'Vyberte dodavatele nebo nastavte fakturační nastavení';
    }
    
    // Pokud jsou chyby, zobrazit je a zastavit submit
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      // Scroll na první chybu
      const firstErrorField = Object.keys(errors)[0];
      const element = document.querySelector(`[data-field="${firstErrorField}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      toast.error('Prosím opravte chyby ve formuláři');
      return;
    }

    try {
      setIsSubmitting(true);
      
      console.log('[InvoiceForm] Saving invoice with dates:', {
        createdAt,
        taxableSupplyDate,
        dueDate,
        createdAtType: typeof createdAt,
        taxableSupplyDateType: typeof taxableSupplyDate,
        dueDateType: typeof dueDate,
      });
      
      // Validace dat před uložením
      if (!createdAt || createdAt === '') {
        console.error('[InvoiceForm] createdAt is empty!');
        toast.error('Datum vystavení není vyplněno');
        setIsSubmitting(false);
        return;
      }
      if (!taxableSupplyDate || taxableSupplyDate === '') {
        console.error('[InvoiceForm] taxableSupplyDate is empty!');
        toast.error('Datum zdanitelného plnění není vyplněno');
        setIsSubmitting(false);
        return;
      }
      if (!dueDate || dueDate === '') {
        console.error('[InvoiceForm] dueDate is empty!');
        toast.error('Splatnost není vyplněna');
        setIsSubmitting(false);
        return;
      }
      
      const createdAtTimestamp = Timestamp.fromDate(new Date(createdAt));
      const taxableSupplyDateTimestamp = Timestamp.fromDate(new Date(taxableSupplyDate));
      const dueDateTimestamp = Timestamp.fromDate(new Date(dueDate));
      
      console.log('[InvoiceForm] Converted timestamps:', {
        createdAt: createdAtTimestamp.toDate().toISOString(),
        taxableSupplyDate: taxableSupplyDateTimestamp.toDate().toISOString(),
        dueDate: dueDateTimestamp.toDate().toISOString(),
      });
      
      // Načíst data dodavatele
      let supplierData: InvoiceSupplier;
      if (selectedSupplierId) {
        const selectedSupplier = suppliers.find(sup => sup.id === selectedSupplierId);
        if (!selectedSupplier) {
          toast.error('Vybraný dodavatel nebyl nalezen');
          setIsSubmitting(false);
          return;
        }
        supplierData = {
          name: selectedSupplier.supplier_name,
          street: selectedSupplier.supplier_street,
          city: selectedSupplier.supplier_city,
          zip: selectedSupplier.supplier_zip,
          country: selectedSupplier.supplier_country,
          companyId: selectedSupplier.supplier_ico,
          vatId: selectedSupplier.supplier_dic,
          iban: selectedSupplier.supplier_iban,
          bankAccount: selectedSupplier.supplier_bankAccount, // deprecated, ale zachováno pro zpětnou kompatibilitu
          accountNumber: selectedSupplier.supplier_accountNumber,
          bankCode: selectedSupplier.supplier_bankCode,
          swift: selectedSupplier.supplier_swift,
          email: selectedSupplier.supplier_email,
          phone: selectedSupplier.supplier_phone,
          website: selectedSupplier.supplier_website,
          logoUrl: selectedSupplier.supplier_logoUrl,
          stampUrl: selectedSupplier.supplier_stampUrl,
        };
      } else if (billingSettings) {
        // Fallback na billingSettings pokud není vybrán dodavatel
        supplierData = {
          name: billingSettings.supplier.name,
          street: billingSettings.supplier.street,
          city: billingSettings.supplier.city,
          zip: billingSettings.supplier.zip,
          country: billingSettings.supplier.country,
          companyId: billingSettings.supplier.companyId,
          vatId: billingSettings.supplier.vatId,
          iban: billingSettings.supplier.iban,
          bankAccount: billingSettings.supplier.bankAccount, // deprecated, ale zachováno pro zpětnou kompatibilitu
          accountNumber: billingSettings.supplier.accountNumber,
          bankCode: billingSettings.supplier.bankCode,
          swift: billingSettings.supplier.swift,
          email: billingSettings.supplier.email,
          phone: billingSettings.supplier.phone,
          website: billingSettings.supplier.website,
          logoUrl: billingSettings.supplier.logoUrl,
          stampUrl: billingSettings.supplier.stampUrl,
        };
      } else {
        toast.error('Vyberte dodavatele nebo nastavte fakturační nastavení');
        setIsSubmitting(false);
        return;
      }

      const invoiceData: Omit<Invoice, 'id'> = {
        userId: '', // Will be set by service
        customerId: selectedCustomerId || 'manual',
        auditId: initialAuditId || invoice?.auditId,
        invoiceNumber,
        variableSymbol: variableSymbol || invoiceNumber,
        constantSymbol: constantSymbol || '308',
        createdAt: createdAtTimestamp,
        taxableSupplyDate: taxableSupplyDateTimestamp,
        dueDate: dueDateTimestamp,
        currency,
        status: 'issued' as InvoiceStatus, // Vždy 'issued' při vytvoření/uložení
        supplier: supplierData,
        customer,
        premise: premise || undefined,
        items,
        totals,
        payment: {
          method: paymentMethod,
          bankAccount: supplierData.bankAccount, // deprecated, ale zachováno pro zpětnou kompatibilitu
          accountNumber: supplierData.accountNumber,
          bankCode: supplierData.bankCode,
          iban: supplierData.iban,
          swift: supplierData.swift,
        },
        note: note || undefined,
        footerNote: footerNote || undefined,
        language: 'cs',
      };

      let finalInvoiceId: string;
      if (invoiceId && invoiceId !== '') {
        // Edit mode - update existing invoice
        await updateInvoice(invoiceId, invoiceData);
        finalInvoiceId = invoiceId;
      } else if (invoice) {
        // Edit mode with invoice object
        await updateInvoice(invoice.id, invoiceData);
        finalInvoiceId = invoice.id;
      } else {
        // Create mode
        finalInvoiceId = await createInvoice(invoiceData);
      }

      toast.success((invoiceId || invoice) ? 'Faktura byla aktualizována' : 'Faktura byla vytvořena');
      onSave(finalInvoiceId);
    } catch (error: any) {
      console.error('[InvoiceForm] Error saving invoice:', error);
      toast.error('Chyba při ukládání faktury: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingSettings) {
    return (
      <div className="w-full max-w-7xl mx-auto pb-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <p className="mt-4 text-gray-600">Načítání nastavení...</p>
        </div>
      </div>
    );
  }

  const sectionTheme = SECTION_THEMES[AppState.INVOICES];

  const handleSaveOperatorFromModal = async (operatorData: Omit<Operator, 'id'>) => {
    try {
      const newId = await createOperator(operatorData);
      const newOperator: Operator = { id: newId, ...operatorData };
      
      // Aktualizovat lokální state zákazníků
      if (onOperatorAdded) {
        onOperatorAdded(newOperator);
      }
      
      // Automaticky vybrat nového zákazníka
      handleCustomerChange(newId);
      
      // Zavřít modální okno
      setShowAddOperatorModal(false);
      
      toast.success('Zákazník byl přidán');
    } catch (error: any) {
      console.error('[InvoiceForm] Error saving operator:', error);
      toast.error('Chyba při přidávání zákazníka: ' + error.message);
    }
  };

  const handleSaveSupplierFromModal = async (supplierData: Omit<Supplier, 'id' | 'userId' | 'createdAt' | 'updatedAt'>, logoFile?: File, stampFile?: File) => {
    try {
      const newId = await createSupplier(supplierData);
      
      // Pokud je logo file, nahrát ho
      if (logoFile) {
        try {
          const { uploadSupplierLogo } = await import('../../services/storage');
          const logoUrl = await uploadSupplierLogo(newId, logoFile);
          // Aktualizovat dodavatele s URL loga
          const { updateSupplier } = await import('../../services/firestore/suppliers');
          await updateSupplier(newId, { supplier_logoUrl: logoUrl });
        } catch (error: any) {
          console.error('[InvoiceForm] Error uploading logo:', error);
          toast.error('Chyba při nahrávání loga: ' + error.message);
        }
      }
      
      // Pokud je stamp file, nahrát ho
      if (stampFile) {
        try {
          const { uploadSupplierStamp } = await import('../../services/storage');
          const stampUrl = await uploadSupplierStamp(newId, stampFile);
          // Aktualizovat dodavatele s URL razítka
          const { updateSupplier } = await import('../../services/firestore/suppliers');
          await updateSupplier(newId, { supplier_stampUrl: stampUrl });
        } catch (error: any) {
          console.error('[InvoiceForm] Error uploading stamp:', error);
          toast.error('Chyba při nahrávání razítka: ' + error.message);
        }
      }
      
      // Znovu načíst seznam dodavatelů, aby se získaly aktuální data včetně userId
      await loadSuppliers();
      
      // Pokud je nový dodavatel nastaven jako výchozí, automaticky ho vybrat
      // (loadSuppliers už to udělá, ale pro jistotu)
      if (supplierData.isDefault) {
        setSelectedSupplierId(newId);
      } else {
        // Pokud není výchozí, vybrat ho jen pokud není žádný jiný vybrán
        if (!selectedSupplierId) {
          setSelectedSupplierId(newId);
        }
      }
      
      if (onSupplierAdded) {
        // Načíst nového dodavatele pro callback
        const { fetchSupplier } = await import('../../services/firestore/suppliers');
        const newSupplier = await fetchSupplier(newId);
        if (newSupplier && onSupplierAdded) {
          onSupplierAdded(newSupplier);
        }
      }
      
      // Zavřít modální okno
      setShowAddSupplierModal(false);
      
      toast.success('Dodavatel byl přidán');
    } catch (error: any) {
      console.error('[InvoiceForm] Error saving supplier:', error);
      toast.error('Chyba při přidávání dodavatele: ' + error.message);
    }
  };

  const handleSupplierChange = (supplierId: string) => {
    setSelectedSupplierId(supplierId);
  };

  return (
    <div className="w-full max-w-7xl mx-auto pb-6">
      {/* Breadcrumb */}
      <div className="mb-4">
        <BackButton onClick={onBack} label="Zpět" />
      </div>

      {/* Basic Information - Moderní, kompaktní */}
      <Card className="mb-4 rounded-xl shadow-sm border-0 overflow-hidden">
        <CardHeader className="bg-gradient-to-br from-teal-50 to-cyan-50 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
              <ReceiptIcon className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">Základní údaje</h2>
          </div>
        </CardHeader>
        <CardBody className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div data-field="invoiceNumber" className="col-span-2">
              <TextField
                label="Číslo faktury"
                value={invoiceNumber}
                onChange={(e) => {
                  setInvoiceNumber(e.target.value);
                  if (!variableSymbol) {
                    const numericPart = e.target.value.replace(/^[A-Za-z]+/, '');
                    setVariableSymbol(numericPart || e.target.value);
                  }
                  if (validationErrors.invoiceNumber) {
                    setValidationErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.invoiceNumber;
                      return newErrors;
                    });
                  }
                }}
                required
                className={`text-sm ${validationErrors.invoiceNumber ? 'border-red-500' : ''}`}
              />
              {validationErrors.invoiceNumber && (
                <div className="text-red-600 text-xs mt-1">{validationErrors.invoiceNumber}</div>
              )}
            </div>
            <div data-field="variableSymbol" className="col-span-2 md:col-span-1">
              <TextField
                label="Variabilní symbol"
                value={variableSymbol}
                onChange={(e) => setVariableSymbol(e.target.value)}
                className="text-sm"
              />
            </div>
            <div data-field="constantSymbol" className="col-span-2 md:col-span-1">
              <TextField
                label="Konstantní symbol"
                value={constantSymbol}
                onChange={(e) => setConstantSymbol(e.target.value)}
                className="text-sm"
              />
            </div>
            <div data-field="createdAt" className="col-span-2 md:col-span-1">
              <TextField
                label="Datum vystavení"
                type="date"
                value={createdAt}
                onChange={(e) => {
                  setCreatedAt(e.target.value);
                  if (validationErrors.createdAt) {
                    setValidationErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.createdAt;
                      return newErrors;
                    });
                  }
                }}
                required
                className={`text-sm ${validationErrors.createdAt ? 'border-red-500' : ''}`}
              />
              {validationErrors.createdAt && (
                <div className="text-red-600 text-xs mt-1">{validationErrors.createdAt}</div>
              )}
            </div>
            <div className="col-span-2 md:col-span-1">
              <TextField
                label="Zdanit. plnění"
                type="date"
                value={taxableSupplyDate}
                onChange={(e) => setTaxableSupplyDate(e.target.value)}
                required
                className="text-sm"
              />
            </div>
            <div data-field="dueDate" className="col-span-2 md:col-span-1">
              <TextField
                label="Splatnost"
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  if (validationErrors.dueDate) {
                    setValidationErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.dueDate;
                      return newErrors;
                    });
                  }
                }}
                required
                className={`text-sm ${validationErrors.dueDate ? 'border-red-500' : ''}`}
              />
              {validationErrors.dueDate && (
                <div className="text-red-600 text-xs mt-1">{validationErrors.dueDate}</div>
              )}
            </div>
            <div className="col-span-1">
              <Select
                label="Měna"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                options={[
                  { value: 'CZK', label: 'CZK' },
                  { value: 'EUR', label: 'EUR' },
                ]}
                className="text-sm"
              />
            </div>
            <div className="col-span-2">
              <Select
                label="Způsob platby"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                options={[
                  { value: 'bank_transfer', label: 'Bankovní převod' },
                  { value: 'cash', label: 'Hotovost' },
                  { value: 'card', label: 'Karta' },
                  { value: 'other', label: 'Jiné' },
                ]}
                className="text-sm"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Dodavatel a Odběratel - vedle sebe, moderní design */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Dodavatel */}
            <Card className="rounded-xl shadow-sm border-0">
              <CardHeader className="bg-gradient-to-br from-amber-50 to-orange-50 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                    <BuildingIcon className="h-3.5 w-3.5 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">Dodavatel</h3>
                </div>
              </CardHeader>
          <CardBody className="p-4 space-y-3">
            <div className="relative group">
              <Select
                label="Vyberte dodavatele"
                value={selectedSupplierId}
                onChange={(e) => handleSupplierChange(e.target.value)}
                options={[
                  { value: '', label: '-- Vyberte --' },
                  ...suppliers.map(sup => ({ value: sup.id, label: sup.supplier_name })),
                ]}
                className="text-sm"
              />
              {selectedSupplierId && (() => {
                const selectedSupplier = suppliers.find(sup => sup.id === selectedSupplierId);
                if (!selectedSupplier) return null;
                
                return (
                  <div className="absolute inset-0 pointer-events-none">
                    <DetailTooltip
                      position="bottom"
                      content={
                        <div className="space-y-1 text-xs">
                          <div className="font-semibold text-sm border-b border-gray-700 pb-1 mb-1">
                            {selectedSupplier.supplier_name}
                          </div>
                          {selectedSupplier.supplier_street && (
                            <div className="text-gray-300"><span className="font-medium">Ulice:</span> {selectedSupplier.supplier_street}</div>
                          )}
                          {(selectedSupplier.supplier_city || selectedSupplier.supplier_zip) && (
                            <div className="text-gray-300"><span className="font-medium">Město:</span> {selectedSupplier.supplier_zip} {selectedSupplier.supplier_city}</div>
                          )}
                          {selectedSupplier.supplier_ico && (
                            <div className="text-gray-300"><span className="font-medium">IČO:</span> {selectedSupplier.supplier_ico}</div>
                          )}
                          {selectedSupplier.supplier_dic && (
                            <div className="text-gray-300"><span className="font-medium">DIČ:</span> {selectedSupplier.supplier_dic}</div>
                          )}
                        </div>
                      }
                    >
                      <div className="absolute inset-0 pointer-events-auto cursor-help"></div>
                    </DetailTooltip>
                  </div>
                );
              })()}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddSupplierModal(true)}
              leftIcon={<PlusIcon className="h-3 w-3" />}
              className="w-full text-xs"
            >
              Přidat nového dodavatele
            </Button>
          </CardBody>
        </Card>

            {/* Odběratel */}
            <Card className="rounded-xl shadow-sm border-0">
              <CardHeader className="bg-gradient-to-br from-emerald-50 to-teal-50 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <UserIcon className="h-3.5 w-3.5 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">Odběratel</h3>
                </div>
              </CardHeader>
          <CardBody className="p-4 space-y-3">
            <div className="relative group" data-field="customerName">
              <Select
                label="Vyberte zákazníka"
                value={selectedCustomerId}
                onChange={(e) => {
                  handleCustomerChange(e.target.value);
                  if (validationErrors.customerName) {
                    setValidationErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.customerName;
                      return newErrors;
                    });
                  }
                }}
                options={[
                  { value: '', label: '-- Vyberte --' },
                  ...operators.map(op => ({ value: op.id, label: op.operator_name })),
                ]}
                className={`text-sm ${validationErrors.customerName ? 'border-red-500' : ''}`}
              />
              {selectedCustomerId && (() => {
                const selectedOperator = operators.find(op => op.id === selectedCustomerId);
                if (!selectedOperator) return null;
                
                let street = '';
                let city = '';
                let zip = '';
                
                if ((selectedOperator as any).operator_street && (selectedOperator as any).operator_city && (selectedOperator as any).operator_zip) {
                  street = (selectedOperator as any).operator_street || '';
                  city = (selectedOperator as any).operator_city || '';
                  zip = (selectedOperator as any).operator_zip || '';
                } else if (selectedOperator.operator_address) {
                  const addressParts = selectedOperator.operator_address.split(',') || [];
                  street = addressParts[0]?.trim() || '';
                  const cityZip = addressParts[1]?.trim() || '';
                  const zipMatch = cityZip?.match(/^(\d{5})\s*(.+)$/);
                  zip = zipMatch ? zipMatch[1] : '';
                  city = zipMatch ? zipMatch[2] : cityZip;
                }
                
                return (
                  <div className="absolute inset-0 pointer-events-none">
                    <DetailTooltip
                      position="bottom"
                      content={
                        <div className="space-y-1 text-xs">
                          <div className="font-semibold text-sm border-b border-gray-700 pb-1 mb-1">
                            {selectedOperator.operator_name}
                          </div>
                          {street && (
                            <div className="text-gray-300"><span className="font-medium">Ulice:</span> {street}</div>
                          )}
                          {(city || zip) && (
                            <div className="text-gray-300"><span className="font-medium">Město:</span> {zip} {city}</div>
                          )}
                          {selectedOperator.operator_ico && (
                            <div className="text-gray-300"><span className="font-medium">IČO:</span> {selectedOperator.operator_ico}</div>
                          )}
                          {selectedOperator.operator_dic && (
                            <div className="text-gray-300"><span className="font-medium">DIČ:</span> {selectedOperator.operator_dic}</div>
                          )}
                        </div>
                      }
                    >
                      <div className="absolute inset-0 pointer-events-auto cursor-help"></div>
                    </DetailTooltip>
                  </div>
                );
              })()}
            </div>
            {validationErrors.customerName && (
              <div className="text-red-600 text-xs">{validationErrors.customerName}</div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddOperatorModal(true)}
              leftIcon={<PlusIcon className="h-3 w-3" />}
              className="w-full text-xs"
            >
              Přidat nového zákazníka
            </Button>
          </CardBody>
        </Card>
      </div>

      {/* Premise (optional) - vždy viditelná, může být prázdná */}
      <Card className="mb-4 rounded-xl shadow-sm border-0">
        <CardHeader className="bg-gradient-to-br from-purple-50 to-indigo-50 border-b border-gray-100 pb-3">
          <button
            type="button"
            onClick={() => setIsPremiseExpanded(!isPremiseExpanded)}
            className="w-full flex justify-between items-center text-left"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                <BuildingIcon className="h-3.5 w-3.5 text-white" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">Provozovna <span className="text-xs font-normal text-gray-500">(volitelné)</span></h3>
            </div>
            {isPremiseExpanded ? (
              <ChevronUpIcon className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDownIcon className="h-5 w-5 text-gray-500" />
            )}
          </button>
        </CardHeader>
        {isPremiseExpanded && (
          <CardBody className="p-4 space-y-3">
            {selectedCustomerId ? (
              <>
                <div className="relative group">
                  <Select
                    label="Vyberte provozovnu"
                    value={selectedPremiseId}
                    onChange={(e) => handlePremiseChange(e.target.value)}
                    options={[
                      { value: '', label: '-- Vyberte provozovnu --' },
                      ...availablePremises.map(prem => ({ value: prem.id, label: prem.premise_name })),
                    ]}
                    className="text-sm"
                    disabled={!selectedCustomerId}
                  />
                  {selectedPremiseId && premise && (() => {
                    const selectedPremise = premises.find(p => p.id === selectedPremiseId);
                    if (!selectedPremise) return null;
                    
                    return (
                      <div className="absolute inset-0 pointer-events-none">
                        <DetailTooltip
                          position="bottom"
                          content={
                            <div className="space-y-1 text-xs">
                              <div className="font-semibold text-sm border-b border-gray-700 pb-1 mb-1">
                                {selectedPremise.premise_name}
                              </div>
                              {selectedPremise.premise_address && (
                                <div className="text-gray-300"><span className="font-medium">Adresa:</span> {selectedPremise.premise_address}</div>
                              )}
                              {selectedPremise.premise_responsible_person && (
                                <div className="text-gray-300"><span className="font-medium">Odpovědná osoba:</span> {selectedPremise.premise_responsible_person}</div>
                              )}
                              {selectedPremise.premise_phone && (
                                <div className="text-gray-300"><span className="font-medium">Telefon:</span> {selectedPremise.premise_phone}</div>
                              )}
                              {selectedPremise.premise_email && (
                                <div className="text-gray-300"><span className="font-medium">Email:</span> {selectedPremise.premise_email}</div>
                              )}
                            </div>
                          }
                        >
                          <div className="absolute inset-0 pointer-events-auto cursor-help"></div>
                        </DetailTooltip>
                      </div>
                    );
                  })()}
                </div>
                {selectedPremiseId && premise && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-gray-200">
                    <TextField
                      label="Název provozovny"
                      value={premise.name}
                      onChange={(e) => setPremise({ ...premise, name: e.target.value })}
                      className="text-sm"
                    />
                    <TextField
                      label="Adresa provozovny"
                      value={premise.address}
                      onChange={(e) => setPremise({ ...premise, address: e.target.value })}
                      className="text-sm"
                    />
                    <TextField
                      label="Odpovědná osoba"
                      value={premise.responsiblePerson || ''}
                      onChange={(e) => setPremise({ ...premise, responsiblePerson: e.target.value })}
                      className="text-sm"
                    />
                    <TextField
                      label="Telefon"
                      type="tel"
                      value={premise.phone || ''}
                      onChange={(e) => setPremise({ ...premise, phone: e.target.value })}
                      className="text-sm"
                    />
                    <TextField
                      label="Email"
                      type="email"
                      value={premise.email || ''}
                      onChange={(e) => setPremise({ ...premise, email: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-gray-500 text-center py-4">
                Nejdříve vyberte odběratele pro načtení provozoven
              </div>
            )}
          </CardBody>
        )}
      </Card>

      {/* Items */}
      <Card className="mb-6 border-l-4" style={{ borderLeftColor: sectionTheme.colors.accent || '#3b82f6' }}>
        <CardHeader className="bg-gradient-to-r" style={{ 
          background: `linear-gradient(to right, ${sectionTheme.colors.accent || '#3b82f6'}15, ${sectionTheme.colors.accent || '#3b82f6'}05)` 
        }}>
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => setIsItemsExpanded(!isItemsExpanded)}
              className="flex items-center gap-3"
            >
              <ListIcon className="h-6 w-6" style={{ color: sectionTheme.colors.accent || '#3b82f6' }} />
              <h2 className="text-lg font-semibold text-gray-900">Položky</h2>
            </button>
            <div className="flex items-center gap-2">
              <Button variant="primary" size="sm" onClick={handleAddItem} leftIcon={<PlusIcon className="h-4 w-4" />}>
                Přidat položku
              </Button>
              {isItemsExpanded ? (
                <ChevronUpIcon className="h-5 w-5 text-gray-500 cursor-pointer" onClick={() => setIsItemsExpanded(false)} />
              ) : (
                <ChevronDownIcon className="h-5 w-5 text-gray-500 cursor-pointer" onClick={() => setIsItemsExpanded(true)} />
              )}
            </div>
          </div>
        </CardHeader>
        {isItemsExpanded && (
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Název</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Popis</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Množství</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Jednotka</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Cena/jednotka</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">DPH %</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Celkem</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Akce</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                      Žádné položky. Klikněte na "Přidat položku" pro přidání.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="Název položky"
                          required
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={item.description || ''}
                          onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="Popis"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={item.vatRate}
                          onChange={(e) => handleItemChange(item.id, 'vatRate', parseFloat(e.target.value))}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="0">0%</option>
                          <option value="10">10%</option>
                          <option value="15">15%</option>
                          <option value="21">21%</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        {formatAmount(item.totalWithVat)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Odstranit položku"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
        )}
      </Card>

      {/* Summary */}
      <Card className="mb-6 border-l-4" style={{ borderLeftColor: sectionTheme.colors.success || '#10b981' }}>
        <CardHeader>
          <button
            type="button"
            onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
            className="w-full flex justify-between items-center text-left"
          >
            <div className="flex items-center gap-3">
              <CalculatorIcon className="h-6 w-6" style={{ color: sectionTheme.colors.success || '#10b981' }} />
              <h2 className="text-lg font-semibold text-gray-900">Souhrn</h2>
            </div>
            {isSummaryExpanded ? (
              <ChevronUpIcon className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDownIcon className="h-5 w-5 text-gray-500" />
            )}
          </button>
        </CardHeader>
        {isSummaryExpanded && (
        <CardBody>
          <div className="bg-blue-50 p-6 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Základ podle DPH sazeb</h3>
                <div className="space-y-2">
                  {Object.keys(items.reduce((acc, item) => {
                    acc[item.vatRate] = (acc[item.vatRate] || 0) + item.totalWithoutVat;
                    return acc;
                  }, {} as Record<number, number>)).sort((a, b) => Number(b) - Number(a)).map(vatRateStr => {
                    const vatRate = Number(vatRateStr);
                    const baseForRate = items
                      .filter(item => item.vatRate === vatRate)
                      .reduce((sum, item) => sum + item.totalWithoutVat, 0);
                    
                    return (
                      <div key={vatRate} className="flex justify-between text-sm">
                        <span className="text-gray-700">Základ {vatRate}% DPH:</span>
                        <span className="font-medium">{formatAmount(baseForRate)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Celkem bez DPH:</span>
                    <span className="font-medium">{formatAmount(totals.baseWithoutVat)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">DPH celkem:</span>
                    <span className="font-medium">{formatAmount(totals.vatAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-gray-300 pt-2">
                    <span className="text-gray-700">Celkem s DPH:</span>
                    <span className="font-medium">{formatAmount(totals.totalWithVat)}</span>
                  </div>
                </div>
                <div className="pt-4 border-t-2 border-gray-400">
                  <div className="flex justify-between">
                    <span className="text-lg font-bold text-gray-900">Celková částka:</span>
                    <span className="text-2xl font-bold text-gray-900">
                      {formatCurrency(totals.totalWithVat, currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardBody>
        )}
      </Card>

      {/* Notes - Collapsible, sbalené defaultně */}
      <Card className="mb-6 rounded-xl shadow-sm border-0">
        <CardHeader className="bg-gradient-to-br from-gray-50 to-gray-100 border-b border-gray-100 pb-3">
          <button
            type="button"
            onClick={() => setIsNotesExpanded(!isNotesExpanded)}
            className="w-full flex justify-between items-center text-left"
          >
            <h2 className="text-base font-semibold text-gray-900">Poznámky</h2>
            {isNotesExpanded ? (
              <ChevronUpIcon className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDownIcon className="h-5 w-5 text-gray-500" />
            )}
          </button>
        </CardHeader>
        {isNotesExpanded && (
        <CardBody className="p-4">
          <div className="space-y-3">
            <TextArea
              label="Poznámka na faktuře"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Např. Zboží zůstává až do úplného uhrazení..."
              className="text-sm"
            />
            <TextArea
              label="Poznámka v patičce"
              value={footerNote}
              onChange={(e) => setFooterNote(e.target.value)}
              rows={2}
              placeholder="Např. Info o zápisu v OR..."
              className="text-sm"
            />
          </div>
        </CardBody>
        )}
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button variant="primary" onClick={handleSubmit} isLoading={isSubmitting}>
          {invoice ? 'Uložit změny' : 'Vygenerovat fakturu'}
        </Button>
        <Button variant="ghost" onClick={onBack}>
          Zrušit
        </Button>
      </div>

      {/* Modal pro přidání nového zákazníka */}
      <Modal
        isOpen={showAddOperatorModal}
        onClose={() => setShowAddOperatorModal(false)}
        title="Nový zákazník"
        size="3xl"
        closeOnBackdropClick={false}
      >
        <OperatorForm 
          initialData={null} 
          onSave={handleSaveOperatorFromModal} 
          onBack={() => setShowAddOperatorModal(false)} 
        />
      </Modal>

      {/* Modal pro přidání nového dodavatele */}
      <Modal
        isOpen={showAddSupplierModal}
        onClose={() => setShowAddSupplierModal(false)}
        title="Nový dodavatel"
        size="3xl"
        closeOnBackdropClick={false}
      >
        <SupplierForm 
          initialData={null} 
          onSave={handleSaveSupplierFromModal} 
          onBack={() => setShowAddSupplierModal(false)} 
        />
      </Modal>
    </div>
  );
};

