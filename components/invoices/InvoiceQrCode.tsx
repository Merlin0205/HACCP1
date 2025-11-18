/**
 * QR kód komponenta pro QR Platbu (SPAYD formát)
 * Specifikace: https://qr-platba.cz/pro-vyvojare/
 */

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Invoice } from '../../types/invoice';
import { generateSpaydPayload, getIbanFromInvoice } from '../../utils/qrUtils';

interface InvoiceQrCodeProps {
  invoice: Invoice;
}

export const InvoiceQrCode: React.FC<InvoiceQrCodeProps> = ({ invoice }) => {
  const payload = generateSpaydPayload(invoice);
  
  // Pokud není možné vygenerovat validní QR kód
  if (!payload) {
    const iban = getIbanFromInvoice(invoice);
    const amount = invoice.totals.totalWithVat.toFixed(2);
    
    // Zjistit důvod selhání
    let errorMessage = 'Chybí IBAN';
    if (iban && amount.length > 10) {
      errorMessage = 'Částka přesahuje limit';
    }
    
    return (
      <div className="w-24 h-24 print:w-20 print:h-20 border-2 border-dashed border-gray-300 rounded flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <span className="text-xs text-gray-400 block">QR Platba</span>
          <span className="text-xs text-gray-400 block mt-1">{errorMessage}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start">
      <QRCodeSVG
        value={payload}
        size={120}
        level="M"
        includeMargin={true}
        className="print:w-24 print:h-24"
      />
      <span className="text-xs print:text-xs text-gray-600 mt-1">QR Platba</span>
      {/* Pokud budeš ladit, můžeš si dočasně zobrazit payload: */}
      {/* <span className="text-[9px] break-all mt-1">{payload}</span> */}
    </div>
  );
};
