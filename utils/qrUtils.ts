/**
 * Utility funkce pro generování QR plateb (SPAYD formát)
 * Specifikace: https://qr-platba.cz/pro-vyvojare/
 */

import { Invoice } from '../types/invoice';
import { Timestamp } from 'firebase/firestore';

/**
 * Vyčistí text podle specifikace QR Platby.
 * Povolené znaky: 0-9, A-Z (velká), mezera, $, %, *, +, -, ., /, :
 * Specifikace: https://qr-platba.cz/pro-vyvojare/specifikace-formatu/
 */
export function sanitizeForQrPayment(input: string): string {
  if (!input) return '';

  // 1) Unicode normalizace a odstranění diakritiky
  let result = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // 2) NBSP -> mezera
  result = result.replace(/\u00A0/g, ' ');

  // 3) Sloučení whitespace na jednu mezeru
  result = result.replace(/\s+/g, ' ').trim();

  // 4) Převod na velká písmena (podle specifikace)
  result = result.toUpperCase();

  // 5) Povolené znaky podle specifikace: 0-9, A-Z, mezera, $, %, *, +, -, ., /, :
  result = result.replace(/[^0-9A-Z $%*+\-./:]/g, '');

  return result;
}

/**
 * Zajistí, že VS bude jen číslo bez zbytečných nul a mezer.
 * Max 10 znaků podle specifikace (X-VS).
 */
export function normalizeVariableSymbol(vs: string | undefined | null): string | undefined {
  if (!vs) return undefined;
  const onlyDigits = vs.replace(/\D/g, '');
  if (!onlyDigits) return undefined;
  const normalized = String(parseInt(onlyDigits, 10)); // odstranění úvodních nul
  // Max 10 znaků podle specifikace
  return normalized.length <= 10 ? normalized : undefined;
}

/**
 * Formátuje datum do formátu YYYYMMDD pro SPAYD.
 */
export function formatDateForSpayd(date: Timestamp | string | undefined | null): string | null {
  if (!date) return null;

  try {
    let dateObj: Date;
    if (date instanceof Timestamp) {
      dateObj = date.toDate();
    } else if (typeof date === 'string') {
      dateObj = new Date(date);
    } else {
      return null;
    }

    if (isNaN(dateObj.getTime())) return null;

    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');

    return `${year}${month}${day}`;
  } catch {
    return null;
  }
}

/**
 * Převede domácí formát čísla účtu (číslo/kód banky) na IBAN.
 * Pro české účty: CZ + 2 kontrolní číslice + 4 číslice kódu banky + až 16 číslic čísla účtu.
 * Pokud není možné převést, vrátí null.
 */
export function convertToIban(accountNumber: string, bankCode: string): string | null {
  const cleanAccount = accountNumber.replace(/\s/g, '');
  const cleanBankCode = bankCode.trim().padStart(4, '0').substring(0, 4);
  
  // Pokud už je IBAN, použijeme ho
  if (cleanAccount.startsWith('CZ') && cleanAccount.length >= 24) {
    return cleanAccount.toUpperCase();
  }
  
  // Pro převod domácího formátu na IBAN potřebujeme:
  // - 4 číslice kódu banky (máme)
  // - až 16 číslic čísla účtu (doplníme nulami zleva)
  // - 2 kontrolní číslice (vypočítáme)
  
  // Doplníme číslo účtu nulami zleva na 16 číslic
  const paddedAccount = cleanAccount.padStart(16, '0').substring(0, 16);
  
  // Základní IBAN bez kontrolních číslic: CZ00 + bankCode + accountNumber
  const baseIban = `CZ00${cleanBankCode}${paddedAccount}`;
  
  // Výpočet kontrolních číslic IBAN (modulo 97)
  // Přesuneme první 4 znaky na konec a převedeme na čísla (A=10, B=11, ..., Z=35)
  const rearranged = baseIban.substring(4) + 'CZ00';
  let numeric = '';
  for (let i = 0; i < rearranged.length; i++) {
    const char = rearranged[i];
    if (char >= '0' && char <= '9') {
      numeric += char;
    } else if (char >= 'A' && char <= 'Z') {
      numeric += (char.charCodeAt(0) - 55).toString();
    }
  }
  
  // Modulo 97
  let remainder = 0;
  for (let i = 0; i < numeric.length; i++) {
    remainder = (remainder * 10 + parseInt(numeric[i])) % 97;
  }
  
  // Kontrolní číslice = 98 - remainder (formátované na 2 číslice)
  const checkDigits = String(98 - remainder).padStart(2, '0');
  
  return `CZ${checkDigits}${cleanBankCode}${paddedAccount}`;
}

/**
 * Získá IBAN z invoice supplier dat (zkusí různé zdroje)
 */
export function getIbanFromInvoice(invoice: Invoice): string | null {
  // 1) IBAN (priorita - pokud už máme IBAN)
  if (invoice.supplier.iban) {
    const accValue = invoice.supplier.iban.replace(/\s/g, '').toUpperCase();
    // Ověření, že je to validní IBAN (začíná CZ a má správnou délku)
    if (accValue.startsWith('CZ') && accValue.length >= 24) {
      return accValue;
    }
  }
  
  // 2) Zkusit převést accountNumber + bankCode na IBAN
  if (invoice.supplier.accountNumber && invoice.supplier.bankCode) {
    const iban = convertToIban(invoice.supplier.accountNumber, invoice.supplier.bankCode);
    if (iban) {
      return iban;
    }
  }
  
  // 3) Fallback bankAccount (pokud už je IBAN)
  if (invoice.supplier.bankAccount) {
    const bankAccount = invoice.supplier.bankAccount.replace(/\s/g, '').toUpperCase();
    if (bankAccount.startsWith('CZ') && bankAccount.length >= 24) {
      return bankAccount;
    }
  }
  
  return null;
}

/**
 * Vygeneruje SPAYD payload pro QR platbu z invoice dat
 * Vrací null pokud není možné vygenerovat validní QR kód (chybí IBAN, částka přesahuje limit, atd.)
 */
export function generateSpaydPayload(invoice: Invoice): string | null {
  // ACC – číslo účtu (MUSÍ být IBAN podle specifikace)
  const accValue = getIbanFromInvoice(invoice);
  
  if (!accValue || !accValue.startsWith('CZ')) {
    return null; // Chybí IBAN
  }

  // AM – částka s tečkou (max 10 znaků = 9 999 999,99)
  const amount = invoice.totals.totalWithVat.toFixed(2);
  if (amount.length > 10) {
    return null; // Částka přesahuje limit
  }

  // CC – měna (právě 3 znaky, ISO 4217)
  const currency = (invoice.currency || 'CZK').trim().toUpperCase().substring(0, 3);

  // X-VS – variabilní symbol (pro české podmínky, max 10 znaků)
  const rawVs =
    invoice.variableSymbol ??
    invoice.invoiceNumber?.replace(/^[A-Za-z]+/, '') ??
    '';
  const variableSymbol = normalizeVariableSymbol(rawVs);

  // X-KS – konstantní symbol (pro české podmínky, max 10 znaků)
  const rawKs = (invoice.constantSymbol || '308').toString();
  const ksDigits = rawKs.replace(/\D/g, '');
  const constantSymbol = ksDigits.length > 0 && ksDigits.length <= 10 ? ksDigits : undefined;

  // DT – datum splatnosti (volitelné, formát YYYYMMDD)
  const dueDate = formatDateForSpayd(invoice.dueDate);

  // MSG – zpráva pro příjemce (max 60 znaků, pouze povolené znaky)
  let message = `FAKTURA ${invoice.invoiceNumber}`;
  message = sanitizeForQrPayment(message);
  // Omezit na 60 znaků podle specifikace
  if (message.length > 60) {
    message = message.substring(0, 60);
  }

  // PT – typ platby (pro okamžitou platbu)
  const isInstantPayment = invoice.totals.totalWithVat <= 400000 && currency === 'CZK';

  // Sestavení SPAYD payloadu podle specifikace
  // Formát: SPD*1.0*ACC:...*AM:...*CC:...*X-VS:...*X-KS:...*DT:...*PT:IP*MSG:...
  const parts: string[] = [
    'SPD',
    '1.0',
    `ACC:${accValue}`,
    `AM:${amount}`,
    `CC:${currency}`,
  ];

  // X-VS (pro české podmínky - všechny banky v ČR to zpracují)
  if (variableSymbol) {
    parts.push(`X-VS:${variableSymbol}`);
  }

  // X-KS (pro české podmínky - všechny banky v ČR to zpracují)
  if (constantSymbol) {
    parts.push(`X-KS:${constantSymbol}`);
  }

  // DT (datum splatnosti)
  if (dueDate) {
    parts.push(`DT:${dueDate}`);
  }

  // PT:IP (okamžitá platba - pokud splňuje podmínky)
  if (isInstantPayment) {
    parts.push('PT:IP');
  }

  // MSG (zpráva pro příjemce)
  if (message) {
    parts.push(`MSG:${message}`);
  }

  return parts.join('*');
}

