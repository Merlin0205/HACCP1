/**
 * Typy pro fakturační modul
 */

import { Timestamp } from 'firebase/firestore';

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'cancelled';

export interface InvoiceSupplier {
  name: string;
  street: string;
  city: string;
  zip: string;
  country: string;
  companyId: string; // IČO
  vatId?: string; // DIČ
  iban?: string;
  bankAccount?: string; // číslo účtu v lokálním formátu (deprecated - použij accountNumber a bankCode)
  accountNumber?: string; // číslo účtu (bez kódu banky)
  bankCode?: string; // kód banky (např. "0100", "0300")
  swift?: string;
  email?: string;
  phone?: string;
  website?: string;
  logoUrl?: string; // URL loga v PDF
  stampUrl?: string; // URL razítka v PDF
  isVatPayer?: boolean; // plátce DPH (true = je plátce, false = není plátce)
}

export interface InvoiceCustomer {
  name: string;
  street: string;
  city: string;
  zip: string;
  country: string;
  companyId?: string; // IČO (pokud má)
  vatId?: string; // DIČ (pokud má)
  contactPerson?: string;
  email?: string;
  phone?: string;
}

export interface InvoicePremise {
  name: string; // premise_name
  address: string; // premise_address
  responsiblePerson?: string; // premise_responsible_person
  phone?: string; // premise_phone
  email?: string; // premise_email
}

export interface InvoiceItem {
  id: string; // lokální ID řádku (např. "1", "2" nebo uuid)
  name: string; // text položky (např. "HACCP audit ŠKOLNÍ JÍDELNA")
  description?: string; // doplňující popis
  quantity: number;
  unit: string; // např. "ks", "hod"
  unitPrice: number; // cena za jednotku bez DPH
  vatRate: number; // např. 0, 10, 15, 21
  totalWithoutVat: number; // quantity * unitPrice
  vatAmount: number; // vypočtená DPH
  totalWithVat: number; // totalWithoutVat + vatAmount
}

export interface InvoiceTotals {
  baseWithoutVat: number; // součet všech položek bez DPH
  vatAmount: number; // celková DPH
  totalWithVat: number; // celkem v měně dokladu
  rounding?: number; // případné zaokrouhlení
  totalInCzk?: number; // volitelné, pokud je měna EUR a přepočet do CZK
}

export interface InvoicePayment {
  method: 'bank_transfer' | 'cash' | 'card' | 'other';
  bankAccount?: string; // zobrazuje se na faktuře (deprecated - použij accountNumber a bankCode)
  accountNumber?: string; // číslo účtu (bez kódu banky)
  bankCode?: string; // kód banky (např. "0100", "0300")
  iban?: string;
  swift?: string;
  qrPaymentData?: string; // generovaný payload pro QR (budoucí rozšíření)
}

export interface Invoice {
  id: string; // Human-readable ID: I{YYYYMMDD}_{COUNTER}
  userId: string; // vlastník dat (stejný princip jako u audits/customers)
  customerId: string; // reference na /customers/{customerId} nebo /operators/{operatorId}
  auditId?: string; // volitelná reference na /audits/{auditId}

  // Základní identifikace dokladu
  invoiceNumber: string; // textové číslo faktury, zobrazuje se na PDF (např. 170002 nebo F2025001)
  variableSymbol: string; // VS (číselná část invoiceNumber, např. 2025001)
  constantSymbol?: string; // KS (konstantní symbol, výchozí "308")
  createdAt: Timestamp | string; // datum vystavení (issue date)
  taxableSupplyDate: Timestamp | string; // datum zdanitelného plnění
  dueDate: Timestamp | string; // splatnost (maturity)
  currency: string; // např. "CZK" / "EUR"
  exchangeRate?: number; // volitelné, pro přepočet (např. 27.06)

  status: InvoiceStatus;

  // Dodavatel (provider) – snapshot v okamžiku vystavení
  supplier: InvoiceSupplier;

  // Odběratel (customer) – snapshot z /customers v okamžiku vystavení
  customer: InvoiceCustomer;

  // Provozovna (premise) – volitelné, snapshot z /premises v okamžiku vystavení
  premise?: InvoicePremise;

  // Položky faktury
  items: InvoiceItem[];

  // Součty (předpočítané kvůli rychlému renderu)
  totals: InvoiceTotals;

  payment: InvoicePayment;

  note?: string; // volný text (např. "Zboží zůstává až do úplného uhrazení...")
  footerNote?: string; // poznámka dole (např. info o zápisu v OR)
  language: 'cs' | 'en'; // zatím stačí 'cs'
  pdfUrl?: string; // URL v Firebase Storage na vygenerované PDF (budoucí krok)

  // Audit metadata
  printedBy?: string; // jméno uživatele, který fakturu vystavil
  printedAt?: Timestamp | string; // datum prvního vystavení PDF
  paidAt?: Timestamp | string; // datum zaplacení (pokud je status 'paid')
}

export interface BillingSettings {
  userId: string;
  supplier: InvoiceSupplier & {
    defaultPaymentMethod: 'bank_transfer' | 'cash' | 'card' | 'other';
    defaultDueDays: number; // např. 14
    defaultCurrency: string; // "CZK"
  };
  invoiceNumbering: {
    prefix: string; // např. "" nebo "2025-"
    nextNumber: number;
    padding: number; // počet číslic, např. 5 → 00001
  };
}

