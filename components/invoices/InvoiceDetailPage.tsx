import React, { useState, useEffect } from 'react';
import { Timestamp } from 'firebase/firestore';
import { Invoice, InvoiceStatus } from '../../types/invoice';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { BackButton } from '../BackButton';
import { getInvoice, markInvoiceAsPaid, markInvoiceAsCancelled } from '../../services/firestore';
import { toast } from '../../utils/toast';
import { formatCurrency, formatAmount } from '../../utils/invoiceCalculations';
import { SECTION_THEMES } from '../../constants/designSystem';
import { AppState } from '../../types';
import { ActionIconTooltip } from '../ui/ActionIconTooltip';
import { EditIcon, XIcon, RefreshIcon } from '../icons';
import { Modal } from '../ui/Modal';
import { InvoiceQrCode } from './InvoiceQrCode';
import { fetchSuppliers } from '../../services/firestore/suppliers';

interface InvoiceDetailPageProps {
  invoiceId: string;
  onBack: () => void;
  onEdit: (invoiceId: string) => void;
  onSelectAudit?: (auditId: string) => void;
  onRestoreInvoice?: (invoiceId: string) => void;
}

export const InvoiceDetailPage: React.FC<InvoiceDetailPageProps> = ({
  invoiceId,
  onBack,
  onEdit,
  onSelectAudit,
  onRestoreInvoice,
}) => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAsPaid, setIsMarkingAsPaid] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    console.log('[InvoiceDetailPage] useEffect triggered, invoiceId:', invoiceId);
    loadInvoice();
  }, [invoiceId]);

  const loadInvoice = async () => {
    console.log('[InvoiceDetailPage] loadInvoice called with invoiceId:', invoiceId);
    try {
      setIsLoading(true);
      const data = await getInvoice(invoiceId);
      console.log('[InvoiceDetailPage] getInvoice returned:', data);
      if (!data) {
        console.error('[InvoiceDetailPage] Invoice not found:', invoiceId);
        toast.error('Faktura nenalezena');
        onBack();
        return;
      }
      console.log('[InvoiceDetailPage] Loaded invoice data:', {
        createdAt: data.createdAt,
        taxableSupplyDate: data.taxableSupplyDate,
        dueDate: data.dueDate,
        createdAtType: typeof data.createdAt,
        taxableSupplyDateType: typeof data.taxableSupplyDate,
        dueDateType: typeof data.dueDate,
      });
      
      // Pokud faktura nemá logoUrl nebo stampUrl, zkusit je načíst z aktuálního dodavatele
      // (může se stát, že faktura byla vytvořena před nahráním loga/razítka)
      if (data.supplier && (!data.supplier.logoUrl || !data.supplier.stampUrl)) {
        try {
          const suppliers = await fetchSuppliers();
          // Najít dodavatele podle názvu nebo IČO
          const matchingSupplier = suppliers.find(s => 
            s.supplier_name === data.supplier.name || 
            s.supplier_ico === data.supplier.companyId
          );
          
          if (matchingSupplier) {
            // Pokud faktura nemá logoUrl, ale dodavatel má, použít z dodavatele
            if (!data.supplier.logoUrl && matchingSupplier.supplier_logoUrl) {
              data.supplier.logoUrl = matchingSupplier.supplier_logoUrl;
            }
            // Pokud faktura nemá stampUrl, ale dodavatel má, použít z dodavatele
            if (!data.supplier.stampUrl && matchingSupplier.supplier_stampUrl) {
              data.supplier.stampUrl = matchingSupplier.supplier_stampUrl;
            }
          }
        } catch (error: any) {
          console.error('[InvoiceDetailPage] Error loading suppliers:', error);
          // Pokračovat i když se nepodařilo načíst dodavatele
        }
      }
      
      setInvoice(data);
    } catch (error: any) {
      console.error('[InvoiceDetailPage] Error loading invoice:', error);
      toast.error('Chyba při načítání faktury: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!invoice) return;
    
    try {
      setIsMarkingAsPaid(true);
      await markInvoiceAsPaid(invoice.id);
      await loadInvoice(); // Reload invoice
      toast.success('Faktura byla označena jako zaplacená');
    } catch (error: any) {
      console.error('[InvoiceDetailPage] Error marking as paid:', error);
      toast.error('Chyba při označení faktury: ' + error.message);
    } finally {
      setIsMarkingAsPaid(false);
    }
  };

  const handleCancelClick = () => {
    setShowCancelConfirm(true);
  };

  const handleCancelConfirm = async () => {
    if (!invoice) return;
    
    try {
      await markInvoiceAsCancelled(invoice.id);
      await loadInvoice(); // Reload invoice
      toast.success('Faktura byla stornována');
      setShowCancelConfirm(false);
    } catch (error: any) {
      console.error('[InvoiceDetailPage] Error cancelling invoice:', error);
      toast.error('Chyba při stornování faktury: ' + error.message);
    }
  };

  const handleRestoreClick = () => {
    if (!invoice || !onRestoreInvoice) return;
    onRestoreInvoice(invoice.id);
  };

  const formatDate = (dateString?: string | Timestamp): string => {
    if (!dateString) return '-';
    try {
      let date: Date;
      if (dateString instanceof Timestamp) {
        date = dateString.toDate();
      } else if (typeof dateString === 'string') {
        // Pokud je to ISO string, parsovat ho
        if (dateString === '' || dateString === '-') return '-';
        date = new Date(dateString);
      } else {
        return '-';
      }
      
      if (isNaN(date.getTime())) {
        console.warn('[InvoiceDetailPage] Invalid date:', dateString);
        return '-';
      }
      
      return date.toLocaleDateString('cs-CZ', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch (error) {
      console.error('[InvoiceDetailPage] Error formatting date:', dateString, error);
      return '-';
    }
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    const badgeConfig: Record<InvoiceStatus, { color: 'gray' | 'blue' | 'success' | 'warning', text: string }> = {
      draft: { color: 'gray', text: 'Draft' },
      issued: { color: 'blue', text: 'Nezaplacená' },
      paid: { color: 'success', text: 'Zaplacená' },
      cancelled: { color: 'warning', text: 'Stornovaná' },
    };
    
    const config = badgeConfig[status] || badgeConfig.draft;
    return <Badge color={config.color} className="print:hidden">{config.text}</Badge>;
  };

  console.log('[InvoiceDetailPage] Render state:', { isLoading, invoice: !!invoice, invoiceId });
  
  if (isLoading) {
    console.log('[InvoiceDetailPage] Rendering loading state');
    return (
      <div className="w-full max-w-7xl mx-auto pb-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <p className="mt-4 text-gray-600">Načítání faktury...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    console.log('[InvoiceDetailPage] Rendering "not found" state');
    return (
      <div className="w-full max-w-7xl mx-auto pb-6">
        <div className="text-center py-12">
          <p className="text-gray-600">Faktura nenalezena</p>
          <Button onClick={onBack} className="mt-4">Zpět na faktury</Button>
        </div>
      </div>
    );
  }
  
  console.log('[InvoiceDetailPage] Rendering invoice:', invoice.invoiceNumber);

  // Seskupit položky podle DPH sazeb pro souhrn
  const itemsByVatRate: Record<number, typeof invoice.items> = {};
  invoice.items.forEach(item => {
    if (!itemsByVatRate[item.vatRate]) {
      itemsByVatRate[item.vatRate] = [];
    }
    itemsByVatRate[item.vatRate].push(item);
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-5xl mx-auto pb-6 bg-white print:bg-white print:pb-0 print:pt-0 invoice-document-container">
      {/* Breadcrumb */}
      <div className="mb-6 print:hidden no-print">
        <BackButton onClick={onBack} label="Zpět na faktury" />
      </div>

      {/* Action buttons */}
      <div className="mb-6 print:hidden flex gap-2 no-print">
        <Button variant="primary" onClick={handlePrint} className="print:hidden">
          Tisknout / PDF
        </Button>
        {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
          <Button variant="success" onClick={handleMarkAsPaid} disabled={isMarkingAsPaid} className="print:hidden">
            {isMarkingAsPaid ? 'Označuji...' : 'Označit jako zaplacenou'}
          </Button>
        )}
        <div className="ml-auto print:hidden">
          {getStatusBadge(invoice.status)}
        </div>
      </div>

      {/* Invoice Document */}
      <div className="bg-white p-6 print:p-0 print:pt-0 border border-gray-200 print:border-0 shadow-sm print:shadow-none">
        {/* Header */}
        <div className="flex justify-between items-start mb-4 print:mb-3 border-b border-gray-300 pb-2 print:pb-1.5">
          <div className="flex-1">
            <h1 className="text-lg print:text-base font-bold text-gray-900 mb-1 print:mb-0.5">
              Faktura - daňový doklad č. {invoice.invoiceNumber}
            </h1>
          </div>
          {/* Logo placeholder */}
          <div className="w-32 h-16 print:w-26 print:h-13 ml-4 flex-shrink-0">
            {invoice.supplier.logoUrl ? (
              <img src={invoice.supplier.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
            ) : (
              <div className="w-full h-full border-2 border-dashed border-gray-300 rounded flex items-center justify-center bg-gray-50">
                <span className="text-xs text-gray-400">Logo</span>
              </div>
            )}
          </div>
        </div>

        {/* Supplier and Customer */}
        <div className="grid grid-cols-2 gap-6 print:gap-4 mb-4 print:mb-3">
          {/* Supplier */}
          <div>
            <h2 className="text-xs print:text-xs font-bold text-gray-900 uppercase mb-2 print:mb-1.5">Dodavatel</h2>
            <div className="text-xs print:text-xs text-gray-700 space-y-0.5 print:space-y-0.5">
              <p className="font-semibold">{invoice.supplier.name}</p>
              <p>{invoice.supplier.street}</p>
              <p>{invoice.supplier.zip} {invoice.supplier.city}</p>
              <p>{invoice.supplier.country}</p>
              <p className="mt-1 print:mt-0.5">IČO: {invoice.supplier.companyId}</p>
              {invoice.supplier.vatId && <p>DIČ: {invoice.supplier.vatId}</p>}
              {invoice.supplier.email && <p>Email: {invoice.supplier.email}</p>}
              {invoice.supplier.phone && <p>Tel.: {invoice.supplier.phone}</p>}
              {invoice.supplier.website && <p>Web: {invoice.supplier.website}</p>}
            </div>
            
            {/* Platební údaje a datumy pod dodavatelem */}
            <div className="mt-3 print:mt-2 pt-2 print:pt-1.5 border-t border-gray-200">
              <div className="text-xs print:text-xs text-gray-700 space-y-0.5 print:space-y-0.5">
                <p><span className="font-semibold">Způsob úhrady:</span> {
                  invoice.payment.method === 'bank_transfer' ? 'Převodem' :
                  invoice.payment.method === 'cash' ? 'Hotovost' :
                  invoice.payment.method === 'card' ? 'Karta' : 'Jiné'
                }</p>
                {(invoice.payment.accountNumber && invoice.payment.bankCode) ? (
                  <p><span className="font-semibold">Bankovní účet:</span> {invoice.payment.accountNumber}/{invoice.payment.bankCode}</p>
                ) : invoice.payment.bankAccount && (
                  <p><span className="font-semibold">Bankovní účet:</span> {invoice.payment.bankAccount}</p>
                )}
                {invoice.payment.iban && invoice.payment.iban.trim() !== '' && (
                  <p><span className="font-semibold">IBAN:</span> {invoice.payment.iban}</p>
                )}
                {invoice.payment.swift && invoice.payment.swift.trim() !== '' && (
                  <p><span className="font-semibold">SWIFT:</span> {invoice.payment.swift}</p>
                )}
                <p><span className="font-semibold">Variabilní symbol:</span> {invoice.variableSymbol}</p>
                <p><span className="font-semibold">Konstantní symbol:</span> {invoice.constantSymbol || '308'}</p>
                <p><span className="font-semibold">Datum vystavení:</span> {formatDate(invoice.createdAt)}</p>
                <p><span className="font-semibold">DUZP:</span> {formatDate(invoice.taxableSupplyDate)}</p>
                <p><span className="font-semibold">Datum splatnosti:</span> {formatDate(invoice.dueDate)}</p>
              </div>
            </div>
          </div>

          {/* Customer */}
          <div>
            <h2 className="text-xs print:text-xs font-bold text-gray-900 uppercase mb-2 print:mb-1.5">Odběratel</h2>
            <div className="text-xs print:text-xs text-gray-700 space-y-0.5 print:space-y-0.5">
              <p className="font-semibold">{invoice.customer.name}</p>
              <p>{invoice.customer.street}</p>
              <p>{invoice.customer.zip} {invoice.customer.city}</p>
              <p>{invoice.customer.country}</p>
              {invoice.customer.companyId && <p className="mt-1 print:mt-0.5">IČO: {invoice.customer.companyId}</p>}
              {invoice.customer.vatId && <p>DIČ: {invoice.customer.vatId}</p>}
            </div>
            {invoice.premise && (
              <div className="mt-3 print:mt-2 pt-2 print:pt-1.5 border-t border-gray-200">
                <h3 className="text-xs print:text-xs font-semibold text-gray-900 uppercase mb-0.5 print:mb-0.5">Provozovna</h3>
                <div className="text-xs print:text-xs text-gray-700 space-y-0.5 print:space-y-0.5">
                  <p className="font-medium">{invoice.premise.name}</p>
                  <p>{invoice.premise.address}</p>
                  {invoice.premise.responsiblePerson && <p>Odpovědná osoba: {invoice.premise.responsiblePerson}</p>}
                </div>
              </div>
            )}
          </div>
        </div>


        {/* Terms and Conditions */}
        {invoice.note && (
          <div className="mb-3 print:mb-2 text-xs print:text-xs text-gray-700">
            <p className="font-semibold mb-0.5 print:mb-0.5">Fakturujeme Vám za dodané zboží či služby:</p>
            <p className="whitespace-pre-wrap">{invoice.note}</p>
          </div>
        )}

        {/* Items Table */}
        <div className="mb-4 print:mb-3">
          <h3 className="text-xs print:text-xs font-bold text-gray-900 uppercase mb-1.5 print:mb-1">Položky faktury</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 print:bg-gray-50">
                <th className="border border-gray-300 px-2 py-1 print:px-1.5 print:py-0.5 text-left text-xs print:text-xs font-bold text-gray-900 uppercase">Název</th>
                <th className="border border-gray-300 px-2 py-1 print:px-1.5 print:py-0.5 text-center text-xs print:text-xs font-bold text-gray-900 uppercase">Množství</th>
                <th className="border border-gray-300 px-2 py-1 print:px-1.5 print:py-0.5 text-center text-xs print:text-xs font-bold text-gray-900 uppercase">Jednotka</th>
                <th className="border border-gray-300 px-2 py-1 print:px-1.5 print:py-0.5 text-right text-xs print:text-xs font-bold text-gray-900 uppercase">Cena/jednotka</th>
                <th className="border border-gray-300 px-2 py-1 print:px-1.5 print:py-0.5 text-right text-xs print:text-xs font-bold text-gray-900 uppercase">DPH %</th>
                <th className="border border-gray-300 px-2 py-1 print:px-1.5 print:py-0.5 text-right text-xs print:text-xs font-bold text-gray-900 uppercase">Bez DPH</th>
                <th className="border border-gray-300 px-2 py-1 print:px-1.5 print:py-0.5 text-right text-xs print:text-xs font-bold text-gray-900 uppercase">DPH</th>
                <th className="border border-gray-300 px-2 py-1 print:px-1.5 print:py-0.5 text-right text-xs print:text-xs font-bold text-gray-900 uppercase">Celkem</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id}>
                  <td className="border border-gray-300 px-2 py-1.5 print:px-1.5 print:py-1 text-xs print:text-xs">
                    <div className="font-medium text-gray-900">{item.name}</div>
                    {item.description && (
                      <div className="text-gray-600 text-xs print:text-xs mt-0.5">{item.description}</div>
                    )}
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5 print:px-1.5 print:py-1 text-xs print:text-xs text-center text-gray-900">{item.quantity}</td>
                  <td className="border border-gray-300 px-2 py-1.5 print:px-1.5 print:py-1 text-xs print:text-xs text-center text-gray-900">{item.unit}</td>
                  <td className="border border-gray-300 px-2 py-1.5 print:px-1.5 print:py-1 text-xs print:text-xs text-right text-gray-900">{formatAmount(item.unitPrice)}</td>
                  <td className="border border-gray-300 px-2 py-1.5 print:px-1.5 print:py-1 text-xs print:text-xs text-right text-gray-900">{item.vatRate}%</td>
                  <td className="border border-gray-300 px-2 py-1.5 print:px-1.5 print:py-1 text-xs print:text-xs text-right text-gray-900">{formatAmount(item.totalWithoutVat)}</td>
                  <td className="border border-gray-300 px-2 py-1.5 print:px-1.5 print:py-1 text-xs print:text-xs text-right text-gray-900">{formatAmount(item.vatAmount)}</td>
                  <td className="border border-gray-300 px-2 py-1.5 print:px-1.5 print:py-1 text-xs print:text-xs text-right font-medium text-gray-900">{formatAmount(item.totalWithVat)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-2 gap-6 print:gap-4 mb-4 print:mb-3">
          {/* Left: Base by VAT rates */}
          <div>
            <h3 className="text-xs print:text-xs font-bold text-gray-900 uppercase mb-2 print:mb-1.5">Základ podle DPH sazeb</h3>
            <table className="w-full border-collapse mb-3 print:mb-2">
              <thead>
                <tr className="bg-gray-100 print:bg-gray-50">
                  <th className="border border-gray-300 px-2 py-1 print:px-1.5 print:py-0.5 text-left text-xs print:text-xs font-bold text-gray-900 uppercase">Základ</th>
                  <th className="border border-gray-300 px-2 py-1 print:px-1.5 print:py-0.5 text-right text-xs print:text-xs font-bold text-gray-900 uppercase">DPH sazba</th>
                  <th className="border border-gray-300 px-2 py-1 print:px-1.5 print:py-0.5 text-right text-xs print:text-xs font-bold text-gray-900 uppercase">Celkem</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(itemsByVatRate).sort((a, b) => Number(b) - Number(a)).map(vatRateStr => {
                  const vatRate = Number(vatRateStr);
                  const itemsForRate = itemsByVatRate[vatRate];
                  const baseForRate = itemsForRate.reduce((sum, item) => sum + item.totalWithoutVat, 0);
                  const vatForRate = itemsForRate.reduce((sum, item) => sum + item.vatAmount, 0);
                  const totalForRate = baseForRate + vatForRate;
                  
                  return (
                    <tr key={vatRate}>
                      <td className="border border-gray-300 px-2 py-1 print:px-1.5 print:py-0.5 text-xs print:text-xs text-gray-900">{formatAmount(baseForRate)}</td>
                      <td className="border border-gray-300 px-2 py-1 print:px-1.5 print:py-0.5 text-xs print:text-xs text-right text-gray-900">{vatRate}%</td>
                      <td className="border border-gray-300 px-2 py-1 print:px-1.5 print:py-0.5 text-xs print:text-xs text-right font-medium text-gray-900">{formatAmount(totalForRate)}</td>
                    </tr>
                  );
                })}
                <tr className="bg-gray-100 print:bg-gray-50 font-bold">
                  <td className="border border-gray-300 px-2 py-1 print:px-1.5 print:py-0.5 text-xs print:text-xs text-gray-900">CELKEM</td>
                  <td className="border border-gray-300 px-2 py-1 print:px-1.5 print:py-0.5 text-xs print:text-xs text-right text-gray-900">{formatAmount(invoice.totals.vatAmount)}</td>
                  <td className="border border-gray-300 px-2 py-1 print:px-1.5 print:py-0.5 text-xs print:text-xs text-right text-gray-900">{formatAmount(invoice.totals.totalWithVat)}</td>
                </tr>
              </tbody>
            </table>
            {/* QR kód a Razítko vedle sebe */}
            <div className="flex items-start gap-6 print:gap-5 mb-2 print:mb-1.5">
              {/* QR kód - vlevo s malým odsazením */}
              <div className="flex-shrink-0">
                <InvoiceQrCode invoice={invoice} />
              </div>
              {/* Razítko - vedle QR kódu, o pár pixelů níž */}
              <div className="flex-shrink-0 pt-2 print:pt-1.5">
                {invoice.supplier.stampUrl ? (
                  <div className="w-[180px] h-28 print:w-[156px] print:h-[80px] overflow-hidden bg-white">
                    <img
                      src={invoice.supplier.stampUrl}
                      alt="Razítko"
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-[180px] h-28 print:w-[156px] print:h-[80px] border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center bg-gray-50 p-1.5 print:p-1">
                    <span className="text-xs print:text-xs text-gray-500 font-semibold text-center leading-tight">Razítko</span>
                    <span className="text-xs print:text-xs text-gray-400 text-center leading-tight mt-0.5 print:mt-0.5">podpis</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Summary */}
          <div>
            <div className="bg-teal-50 print:bg-teal-100 border-2 border-teal-500 print:border-teal-600 p-3 print:p-2 rounded-lg print:rounded">
              <div className="space-y-1.5 print:space-y-1 mb-2 print:mb-1.5">
                <div className="flex justify-between text-xs print:text-xs">
                  <span className="text-gray-700">Celkem bez DPH:</span>
                  <span className="font-semibold text-gray-900">{formatAmount(invoice.totals.baseWithoutVat)}</span>
                </div>
                <div className="flex justify-between text-xs print:text-xs">
                  <span className="text-gray-700">DPH celkem:</span>
                  <span className="font-semibold text-gray-900">{formatAmount(invoice.totals.vatAmount)}</span>
                </div>
                <div className="flex justify-between text-xs print:text-xs border-t border-teal-600 pt-1.5 print:pt-1">
                  <span className="text-gray-700 font-semibold">Celkem s DPH:</span>
                  <span className="font-bold text-gray-900">{formatAmount(invoice.totals.totalWithVat)}</span>
                </div>
              </div>
              <div className="pt-2 print:pt-1.5 border-t-2 border-teal-600">
                <div className="flex justify-between items-center">
                  <span className="text-sm print:text-xs font-bold text-gray-900">Celkem k úhradě:</span>
                  <span className="text-lg print:text-base font-bold text-teal-700 print:text-teal-800">
                    {formatCurrency(invoice.totals.totalWithVat, invoice.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        {invoice.footerNote && (
          <div className="mb-2 print:mb-1.5 text-xs print:text-xs text-gray-600 italic">
            <p className="whitespace-pre-wrap">{invoice.footerNote}</p>
          </div>
        )}

      </div>

      {/* Actions */}
      <div className="flex gap-2 print:hidden mt-6 no-print">
        <div className="relative group/button print:hidden">
          <button
            onClick={() => onEdit(invoice.id)}
            className="p-2 rounded-lg hover:bg-teal-50 transition-colors text-teal-600 hover:text-teal-700 print:hidden"
            title="Upravit"
          >
            <EditIcon className="h-5 w-5" />
          </button>
          <ActionIconTooltip text="Upravit" />
        </div>
        {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
          <div className="relative group/button print:hidden">
            <button
              onClick={handleCancelClick}
              className="p-2 rounded-lg hover:bg-red-50 transition-colors text-red-600 hover:text-red-700 print:hidden"
              title="Stornovat"
            >
              <XIcon className="h-5 w-5" />
            </button>
            <ActionIconTooltip text="Stornovat" />
          </div>
        )}
        {invoice.status === 'cancelled' && onRestoreInvoice && (
          <div className="relative group/button print:hidden">
            <button
              onClick={handleRestoreClick}
              className="p-2 rounded-lg hover:bg-blue-50 transition-colors text-blue-600 hover:text-blue-700 print:hidden"
              title="Obnovit fakturu"
            >
              <RefreshIcon className="h-5 w-5" />
            </button>
            <ActionIconTooltip text="Obnovit fakturu" />
          </div>
        )}
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          @page {
            margin: 0.5cm;
            size: A4;
          }
          /* Skrýt všechny části aplikace */
          header,
          nav,
          aside,
          [class*="sidebar"],
          [class*="Sidebar"],
          [class*="MobileMenu"],
          [class*="TabBar"] {
            display: none !important;
            visibility: hidden !important;
          }
          /* Skrýt všechny divy kromě těch s fakturou */
          body > div > header,
          body > div > aside {
            display: none !important;
            visibility: hidden !important;
          }
          /* Skrýt všechny tlačítka, ikony a badge v no-print kontejnerech */
          .no-print,
          .no-print button,
          .no-print svg,
          .no-print [class*="Badge"],
          .no-print * {
            display: none !important;
            visibility: hidden !important;
          }
          /* Zobrazit pouze invoice-document-container */
          .invoice-document-container {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            padding-top: 0 !important;
            background: white !important;
          }
          /* Odstranit šedé pozadí pouze u hlavního kontejneru a body */
          body,
          html {
            background: white !important;
          }
          /* Obnovit bílé pozadí pro celý dokument */
          .invoice-document-container,
          .invoice-document-container > div,
          .invoice-document-container > div > div {
            background: white !important;
            padding-top: 0 !important;
            margin-top: 0 !important;
          }
          /* Zajistit bílé pozadí pro hlavní kontejnery, ale ne pro všechny elementy */
          .invoice-document-container > div > div {
            background: white !important;
          }
          /* Zajistit bílé pozadí pro všechny divy, které nemají specifické třídy */
          .invoice-document-container div:not([class*="bg-"]):not([class*="print:bg-"]) {
            background-color: white !important;
          }
          /* Zachovat šedé boxy pro čísla faktury atd., ale odstranit šedé pozadí u krajů */
          .invoice-document-container {
            background: white !important;
          }
          /* Skrýt prvky s print:hidden */
          .print\\:hidden,
          [class*="print:hidden"],
          button.print\\:hidden,
          .print\\:hidden button,
          .print\\:hidden * {
            display: none !important;
            visibility: hidden !important;
          }
          /* Pro tabulky a grid použít správné display */
          .invoice-document-container table {
            display: table !important;
          }
          .invoice-document-container tr {
            display: table-row !important;
          }
          .invoice-document-container td,
          .invoice-document-container th {
            display: table-cell !important;
          }
          .invoice-document-container .grid {
            display: grid !important;
          }
          .invoice-document-container .flex {
            display: flex !important;
          }
          body {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          /* Zobrazit main obsah s fakturou */
          main {
            display: block !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          .print\\:bg-white {
            background: white !important;
          }
          .print\\:bg-gray-50 {
            background: #f9fafb !important;
          }
          .print\\:bg-gray-100 {
            background: #f3f4f6 !important;
          }
          .print\\:bg-gray-200 {
            background: #e5e7eb !important;
          }
          .print\\:bg-teal-100 {
            background: #ccfbf1 !important;
          }
          .print\\:border-gray-600 {
            border-color: #4b5563 !important;
          }
          .print\\:border-teal-600 {
            border-color: #0d9488 !important;
          }
          .print\\:text-gray-700 {
            color: #374151 !important;
          }
          .print\\:text-teal-800 {
            color: #115e59 !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          .print\\:p-3 {
            padding: 0.75rem !important;
          }
          .print\\:p-4 {
            padding: 1rem !important;
          }
          .print\\:px-3 {
            padding-left: 0.75rem !important;
            padding-right: 0.75rem !important;
          }
          .print\\:py-2 {
            padding-top: 0.5rem !important;
            padding-bottom: 0.5rem !important;
          }
          .print\\:mb-2 {
            margin-bottom: 0.5rem !important;
          }
          .print\\:mb-3 {
            margin-bottom: 0.75rem !important;
          }
          .print\\:mb-4 {
            margin-bottom: 1rem !important;
          }
          .print\\:mb-6 {
            margin-bottom: 1.5rem !important;
          }
          .print\\:mt-3 {
            margin-top: 0.75rem !important;
          }
          .print\\:mt-4 {
            margin-top: 1rem !important;
          }
          .print\\:mt-6 {
            margin-top: 1.5rem !important;
          }
          .print\\:pt-1 {
            padding-top: 0.25rem !important;
          }
          .print\\:pt-3 {
            padding-top: 0.75rem !important;
          }
          .print\\:pt-4 {
            padding-top: 1rem !important;
          }
          .print\\:pb-3 {
            padding-bottom: 0.75rem !important;
          }
          .print\\:text-xs {
            font-size: 0.75rem !important;
          }
          .print\\:text-sm {
            font-size: 0.875rem !important;
          }
          .print\\:text-base {
            font-size: 1rem !important;
          }
          .print\\:text-xl {
            font-size: 1.25rem !important;
          }
          .print\\:text-2xl {
            font-size: 1.5rem !important;
          }
          .print\\:gap-2 {
            gap: 0.5rem !important;
          }
          .print\\:gap-6 {
            gap: 1.5rem !important;
          }
          .print\\:space-y-2 > * + * {
            margin-top: 0.5rem !important;
          }
          .print\\:rounded {
            border-radius: 0.25rem !important;
          }
        }
      `}</style>

      {/* Confirmation Modal for Cancel */}
      <Modal
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        title="Stornovat fakturu"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Opravdu chcete stornovat fakturu{' '}
            <strong>{invoice.invoiceNumber}</strong>?
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowCancelConfirm(false)}>
              Zrušit
            </Button>
            <Button
              variant="danger"
              onClick={handleCancelConfirm}
            >
              Stornovat
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
