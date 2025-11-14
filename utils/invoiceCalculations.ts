/**
 * Utility funkce pro výpočty faktur
 */

import { InvoiceItem, InvoiceTotals } from '../types/invoice';

/**
 * Vypočítá součty pro jednu položku faktury
 */
export function calculateItemTotals(item: Omit<InvoiceItem, 'totalWithoutVat' | 'vatAmount' | 'totalWithVat'>): InvoiceItem {
  const totalWithoutVat = item.quantity * item.unitPrice;
  const vatAmount = totalWithoutVat * (item.vatRate / 100);
  const totalWithVat = totalWithoutVat + vatAmount;
  
  return {
    ...item,
    totalWithoutVat: Math.round(totalWithoutVat * 100) / 100,
    vatAmount: Math.round(vatAmount * 100) / 100,
    totalWithVat: Math.round(totalWithVat * 100) / 100
  };
}

/**
 * Vypočítá celkové součty faktury z položek
 */
export function calculateInvoiceTotals(items: InvoiceItem[]): InvoiceTotals {
  // Seskupit položky podle DPH sazby
  const itemsByVatRate: Record<number, InvoiceItem[]> = {};
  
  items.forEach(item => {
    if (!itemsByVatRate[item.vatRate]) {
      itemsByVatRate[item.vatRate] = [];
    }
    itemsByVatRate[item.vatRate].push(item);
  });
  
  // Vypočítat základ bez DPH a DPH pro každou sazbu
  let baseWithoutVat = 0;
  let vatAmount = 0;
  
  Object.keys(itemsByVatRate).forEach(vatRateStr => {
    const vatRate = Number(vatRateStr);
    const itemsForRate = itemsByVatRate[vatRate];
    
    const baseForRate = itemsForRate.reduce((sum, item) => sum + item.totalWithoutVat, 0);
    const vatForRate = itemsForRate.reduce((sum, item) => sum + item.vatAmount, 0);
    
    baseWithoutVat += baseForRate;
    vatAmount += vatForRate;
  });
  
  const totalWithVat = baseWithoutVat + vatAmount;
  
  return {
    baseWithoutVat: Math.round(baseWithoutVat * 100) / 100,
    vatAmount: Math.round(vatAmount * 100) / 100,
    totalWithVat: Math.round(totalWithVat * 100) / 100
  };
}

/**
 * Formátuje částku s měnou
 */
export function formatCurrency(amount: number, currency: string = 'CZK'): string {
  const formatted = new Intl.NumberFormat('cs-CZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
  
  return `${formatted} ${currency}`;
}

/**
 * Formátuje částku bez měny (pouze číslo)
 */
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('cs-CZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

