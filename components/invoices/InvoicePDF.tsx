/**
 * PDF komponenta pro fakturu pomocí @react-pdf/renderer
 * Design inspirovaný iDoklad šablonou (moderní vzhled, levý barevný pruh)
 */

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { Invoice } from '../../types/invoice';
import { Timestamp } from 'firebase/firestore';
import { formatCurrency, formatAmount } from '../../utils/invoiceCalculations';

// Registrace fontů pro podporu češtiny
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf', fontWeight: 300 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf', fontWeight: 500 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
  ],
});

const PRIMARY_COLOR = '#4fd1c5'; // Teal-400 (odpovídá barvě aplikace)
const TEXT_COLOR = '#111827'; // Gray-900
const LABEL_COLOR = '#6b7280'; // Gray-500
const BORDER_COLOR = '#e5e7eb'; // Gray-200

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 60, // Místo pro patičku
    paddingLeft: 40,
    paddingRight: 40,
    fontSize: 9,
    fontFamily: 'Roboto',
    backgroundColor: '#ffffff',
    color: TEXT_COLOR,
  },
  // Barevný pruh vlevo
  leftStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 12,
    backgroundColor: PRIMARY_COLOR,
  },
  // Hlavička
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    width: 150,
    alignItems: 'flex-end',
  },
  invoiceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  invoiceNumber: {
    fontSize: 18,
    fontWeight: 300, // Light
  },
  logo: {
    width: 140,
    height: 70,
    objectFit: 'contain',
  },

  // Sekce Dodavatel / Odběratel
  partiesSection: {
    flexDirection: 'row',
    marginBottom: 15,
    gap: 40,
  },
  partyColumn: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: TEXT_COLOR,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    paddingBottom: 4,
    marginBottom: 8,
  },
  partyName: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  partyDetails: {
    fontSize: 9,
    lineHeight: 1.4,
    color: '#374151',
  },
  partyLabel: {
    color: LABEL_COLOR,
    fontSize: 8,
    marginTop: 4,
  },
  contactRow: {
    flexDirection: 'row',
    marginTop: 1,
  },
  contactLabel: {
    width: 40,
    fontSize: 9,
    color: LABEL_COLOR,
  },
  contactValue: {
    fontSize: 9,
    color: TEXT_COLOR,
  },

  // Detaily platby (Grid) - kompaktní
  paymentSection: {
    marginBottom: 15,
    padding: 6,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
  },
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  paymentColumn: {
    width: '33%', // Tři sloupce
    marginBottom: 3,
  },
  paymentLabel: {
    fontSize: 7,
    color: LABEL_COLOR,
    marginBottom: 0,
  },
  paymentValue: {
    fontSize: 8,
    fontWeight: 500,
  },

  // Tabulka položek
  table: {
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6', // Gray-100
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#4b5563', // Gray-600
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tableCell: {
    fontSize: 9,
    color: TEXT_COLOR,
  },

  // Zarovnání a šířky sloupců
  colName: { width: '35%' },
  colQty: { width: '10%', textAlign: 'right' },
  colUnit: { width: '10%', textAlign: 'center' },
  colPrice: { width: '15%', textAlign: 'right' },
  colVat: { width: '10%', textAlign: 'right' },
  colTotal: { width: '20%', textAlign: 'right' },

  // Sekce Součtů
  totalsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  totalsLeft: {
    flex: 1,
    paddingRight: 40,
  },
  totalsRight: {
    width: 220,
  },

  // Tabulka DPH
  vatTable: {
    width: '100%',
    marginTop: 10,
  },
  vatHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    paddingBottom: 2,
    marginBottom: 4,
  },
  vatRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  vatText: {
    fontSize: 8,
    color: '#374151',
  },

  // Celkem k úhradě box
  totalBox: {
    backgroundColor: PRIMARY_COLOR,
    padding: 10,
    marginTop: 10,
    borderRadius: 2,
  },
  totalBoxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  totalBoxLabel: {
    fontSize: 9,
    color: '#ffffff',
  },
  totalBoxValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  totalBoxBigLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 4,
  },
  totalBoxBigValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 4,
  },

  // QR kód a razítko
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 15,
  },
  qrContainer: {
    width: 100,
  },
  qrImage: {
    width: 80,
    height: 80,
  },
  qrLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    marginTop: 4,
    textAlign: 'center',
    width: 80,
  },
  stampContainer: {
    alignItems: 'center',
  },
  stampImage: {
    width: 140,
    height: 70,
    objectFit: 'contain',
  },
  signatureLabel: {
    fontSize: 8,
    color: LABEL_COLOR,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    paddingTop: 4,
    marginTop: 4,
    width: 120,
    textAlign: 'center',
  },

  // Patička
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 7,
    color: '#9ca3af',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 10,
  },
});

interface InvoicePDFProps {
  invoice: Invoice;
  qrCodeDataUrl?: string | null;
  logoDataUrl?: string | null;
  stampDataUrl?: string | null;
}

function formatDateForPDF(date: Timestamp | string | undefined | null): string {
  if (!date) return '-';
  try {
    let dateObj: Date;
    if (date instanceof Timestamp) {
      dateObj = date.toDate();
    } else if (typeof date === 'string') {
      if (date === '' || date === '-') return '-';
      dateObj = new Date(date);
    } else {
      return '-';
    }
    if (isNaN(dateObj.getTime())) return '-';
    return dateObj.toLocaleDateString('cs-CZ');
  } catch {
    return '-';
  }
}

export const InvoicePDF: React.FC<InvoicePDFProps> = ({
  invoice,
  qrCodeDataUrl,
  logoDataUrl,
  stampDataUrl
}) => {
  // Seskupení DPH
  const itemsByVatRate: Record<number, typeof invoice.items> = {};
  invoice.items.forEach((item) => {
    if (!itemsByVatRate[item.vatRate]) {
      itemsByVatRate[item.vatRate] = [];
    }
    itemsByVatRate[item.vatRate].push(item);
  });
  // Vlastní jméno firmy pro patičku (pokud není v supplier.footerNote)
  const footerText = invoice.footerNote ||
    `Vystavil: ${invoice.supplier.name}, ${invoice.supplier.street}, ${invoice.supplier.zip} ${invoice.supplier.city} | IČO: ${invoice.supplier.companyId}`;

  // Definice šířek sloupců podle toho, zda je plátce DPH
  const isVatPayer = invoice.supplier.isVatPayer;

  const colStyles = isVatPayer ? {
    colName: { width: '25%' },
    colQty: { width: '8%', textAlign: 'right' as const },
    colUnit: { width: '7%', textAlign: 'center' as const },
    colPrice: { width: '12%', textAlign: 'right' as const },
    colVatRate: { width: '8%', textAlign: 'right' as const },
    colBase: { width: '13%', textAlign: 'right' as const },
    colVatAmt: { width: '12%', textAlign: 'right' as const },
    colTotal: { width: '15%', textAlign: 'right' as const },
  } : {
    colName: { width: '40%' },
    colQty: { width: '10%', textAlign: 'right' as const },
    colUnit: { width: '10%', textAlign: 'center' as const },
    colPrice: { width: '20%', textAlign: 'right' as const },
    colTotal: { width: '20%', textAlign: 'right' as const },
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Barevný pruh vlevo */}
        <View style={styles.leftStripe} />

        {/* Hlavička */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.invoiceTitle}>
              {isVatPayer ? 'Faktura - daňový doklad' : 'Faktura'}
            </Text>
            <Text style={styles.invoiceNumber}>
              č. {invoice.invoiceNumber}
            </Text>
          </View>
          <View style={styles.headerRight}>
            {logoDataUrl && (
              <Image src={logoDataUrl} style={styles.logo} />
            )}
          </View>
        </View>

        {/* Dodavatel a Odběratel */}
        <View style={styles.partiesSection}>
          {/* Dodavatel */}
          <View style={styles.partyColumn}>
            <Text style={styles.sectionTitle}>Dodavatel</Text>
            <Text style={styles.partyName}>{invoice.supplier.name}</Text>
            <Text style={styles.partyDetails}>{invoice.supplier.street}</Text>
            <Text style={styles.partyDetails}>{invoice.supplier.zip} {invoice.supplier.city}</Text>
            <Text style={styles.partyDetails}>{invoice.supplier.country}</Text>

            <View style={{ marginTop: 8 }}>
              <Text style={styles.partyDetails}>IČO: {invoice.supplier.companyId}</Text>
              {invoice.supplier.vatId && <Text style={styles.partyDetails}>DIČ: {invoice.supplier.vatId}</Text>}
            </View>

            {/* Kontakty Dodavatele */}
            <View style={{ marginTop: 8 }}>
              {invoice.supplier.email && (
                <View style={styles.contactRow}>
                  <Text style={styles.contactLabel}>Email:</Text>
                  <Text style={styles.contactValue}>{invoice.supplier.email}</Text>
                </View>
              )}
              {invoice.supplier.phone && (
                <View style={styles.contactRow}>
                  <Text style={styles.contactLabel}>Tel.:</Text>
                  <Text style={styles.contactValue}>{invoice.supplier.phone}</Text>
                </View>
              )}
              {invoice.supplier.website && (
                <View style={styles.contactRow}>
                  <Text style={styles.contactLabel}>Web:</Text>
                  <Text style={styles.contactValue}>{invoice.supplier.website}</Text>
                </View>
              )}
            </View>

            {/* invoice.supplier.courtRecord removed as it does not exist on type */}
          </View>

          {/* Odběratel */}
          <View style={styles.partyColumn}>
            <Text style={styles.sectionTitle}>Odběratel</Text>
            <Text style={styles.partyName}>{invoice.customer.name}</Text>
            <Text style={styles.partyDetails}>{invoice.customer.street}</Text>
            <Text style={styles.partyDetails}>{invoice.customer.zip} {invoice.customer.city}</Text>
            <Text style={styles.partyDetails}>{invoice.customer.country}</Text>

            <View style={{ marginTop: 8 }}>
              {invoice.customer.companyId && <Text style={styles.partyDetails}>IČO: {invoice.customer.companyId}</Text>}
              {invoice.customer.vatId && <Text style={styles.partyDetails}>DIČ: {invoice.customer.vatId}</Text>}
            </View>

            {invoice.premise && (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.partyLabel}>Provozovna:</Text>
                <Text style={styles.partyDetails}>{invoice.premise.name}</Text>
                <Text style={styles.partyDetails}>{invoice.premise.address}</Text>
                {invoice.premise.responsiblePerson && (
                  <Text style={styles.partyDetails}>{invoice.premise.responsiblePerson}</Text>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Detaily platby (3 sloupce pro lepší přehlednost) */}
        <View style={styles.paymentSection}>
          <View style={styles.paymentGrid}>
            {/* Sloupec 1: Způsob úhrady */}
            <View style={styles.paymentColumn}>
              <Text style={styles.paymentLabel}>Způsob úhrady</Text>
              <Text style={styles.paymentValue}>
                {invoice.payment.method === 'bank_transfer' ? 'Převodem' :
                  invoice.payment.method === 'cash' ? 'Hotově' :
                    invoice.payment.method === 'card' ? 'Kartou' : 'Jiné'}
              </Text>

              <Text style={styles.paymentLabel}>Datum vystavení</Text>
              <Text style={styles.paymentValue}>{formatDateForPDF(invoice.createdAt)}</Text>
            </View>

            {/* Sloupec 2: Banka a DUZP */}
            <View style={styles.paymentColumn}>
              {invoice.payment.bankAccount && (
                <>
                  <Text style={styles.paymentLabel}>Bankovní účet</Text>
                  <Text style={styles.paymentValue}>
                    {invoice.payment.accountNumber
                      ? `${invoice.payment.accountNumber}/${invoice.payment.bankCode}`
                      : invoice.payment.bankAccount}
                  </Text>
                </>
              )}

              {isVatPayer && (
                <>
                  <Text style={styles.paymentLabel}>DUZP</Text>
                  <Text style={styles.paymentValue}>{formatDateForPDF(invoice.taxableSupplyDate)}</Text>
                </>
              )}
            </View>

            {/* Sloupec 3: Symboly a Splatnost */}
            <View style={styles.paymentColumn}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'baseline' }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.paymentLabel}>Variabilní symbol</Text>
                  <Text style={styles.paymentValue}>{invoice.variableSymbol}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.paymentLabel}>Konstantní symbol</Text>
                  <Text style={styles.paymentValue}>{invoice.constantSymbol || '308'}</Text>
                </View>
              </View>

              <Text style={styles.paymentLabel}>Datum splatnosti</Text>
              <Text style={styles.paymentValue}>{formatDateForPDF(invoice.dueDate)}</Text>
            </View>
          </View>

          {invoice.payment.iban && (
            <View style={{ marginTop: 3, paddingTop: 3, borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>
              <Text style={styles.paymentLabel}>IBAN / SWIFT</Text>
              <Text style={styles.paymentValue}>
                {invoice.payment.iban} {invoice.payment.swift ? `/ ${invoice.payment.swift}` : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Položky */}
        <View style={styles.table}>
          <Text style={[styles.sectionTitle, { borderBottomWidth: 0, marginBottom: 4 }]}>Položky faktury</Text>

          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, colStyles.colName]}>Název</Text>
            <Text style={[styles.tableHeaderCell, colStyles.colQty]}>Množství</Text>
            <Text style={[styles.tableHeaderCell, colStyles.colUnit]}>Mj.</Text>
            <Text style={[styles.tableHeaderCell, colStyles.colPrice]}>
              {isVatPayer ? 'Cena/mj.' : 'Cena/mj.'}
            </Text>
            {isVatPayer && (
              <>
                <Text style={[styles.tableHeaderCell, (colStyles as any).colVatRate]}>DPH %</Text>
                <Text style={[styles.tableHeaderCell, (colStyles as any).colBase]}>Bez DPH</Text>
                <Text style={[styles.tableHeaderCell, (colStyles as any).colVatAmt]}>DPH</Text>
              </>
            )}
            <Text style={[styles.tableHeaderCell, colStyles.colTotal]}>Celkem</Text>
          </View>

          {invoice.items.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <View style={colStyles.colName}>
                <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>{item.name}</Text>
                {item.description && (
                  <Text style={{ fontSize: 8, color: LABEL_COLOR, marginTop: 1 }}>{item.description}</Text>
                )}
              </View>
              <Text style={[styles.tableCell, colStyles.colQty]}>{item.quantity}</Text>
              <Text style={[styles.tableCell, colStyles.colUnit]}>{item.unit}</Text>
              <Text style={[styles.tableCell, colStyles.colPrice]}>{formatAmount(item.unitPrice)}</Text>
              {isVatPayer && (
                <>
                  <Text style={[styles.tableCell, (colStyles as any).colVatRate]}>{item.vatRate}%</Text>
                  <Text style={[styles.tableCell, (colStyles as any).colBase]}>{formatAmount(item.totalWithoutVat)}</Text>
                  <Text style={[styles.tableCell, (colStyles as any).colVatAmt]}>{formatAmount(item.vatAmount)}</Text>
                </>
              )}
              <Text style={[styles.tableCell, colStyles.colTotal]}>
                {isVatPayer ? formatAmount(item.totalWithVat) : formatAmount(item.totalWithoutVat)}
              </Text>
            </View>
          ))}
        </View>

        {/* Součty */}
        <View style={styles.totalsSection}>
          {/* Levá část: DPH tabulka + QR + Razítko */}
          <View style={styles.totalsLeft}>
            {invoice.note && (
              <View style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 8, color: LABEL_COLOR, marginBottom: 1 }}>Poznámka:</Text>
                <Text style={{ fontSize: 8 }}>{invoice.note}</Text>
              </View>
            )}

            {isVatPayer && (
              <>
                <Text style={{ fontSize: 8, fontWeight: 'bold', marginTop: 3 }}>Rekapitulace DPH</Text>
                <View style={styles.vatTable}>
                  <View style={styles.vatHeader}>
                    <Text style={[styles.vatText, { width: '20%' }]}>Sazba</Text>
                    <Text style={[styles.vatText, { width: '25%', textAlign: 'right' }]}>Základ</Text>
                    <Text style={[styles.vatText, { width: '25%', textAlign: 'right' }]}>DPH</Text>
                    <Text style={[styles.vatText, { width: '30%', textAlign: 'right' }]}>Celkem</Text>
                  </View>
                  {Object.keys(itemsByVatRate).sort((a, b) => Number(b) - Number(a)).map((rateStr) => {
                    const rate = Number(rateStr);
                    const items = itemsByVatRate[rate];
                    const base = items.reduce((sum, i) => sum + i.totalWithoutVat, 0);
                    const vat = items.reduce((sum, i) => sum + i.vatAmount, 0);
                    const total = base + vat;
                    return (
                      <View key={rate} style={styles.vatRow}>
                        <Text style={[styles.vatText, { width: '20%' }]}>{rate} %</Text>
                        <Text style={[styles.vatText, { width: '25%', textAlign: 'right' }]}>{formatAmount(base)}</Text>
                        <Text style={[styles.vatText, { width: '25%', textAlign: 'right' }]}>{formatAmount(vat)}</Text>
                        <Text style={[styles.vatText, { width: '30%', textAlign: 'right' }]}>{formatAmount(total)}</Text>
                      </View>
                    );
                  })}
                  <View style={[styles.vatRow, { borderTopWidth: 1, borderTopColor: BORDER_COLOR, paddingTop: 2, marginTop: 2 }]}>
                    <Text style={[styles.vatText, { width: '20%', fontWeight: 'bold' }]}>CELKEM</Text>
                    <Text style={[styles.vatText, { width: '25%', textAlign: 'right', fontWeight: 'bold' }]}>{formatAmount(invoice.totals.baseWithoutVat)}</Text>
                    <Text style={[styles.vatText, { width: '25%', textAlign: 'right', fontWeight: 'bold' }]}>{formatAmount(invoice.totals.vatAmount)}</Text>
                    <Text style={[styles.vatText, { width: '30%', textAlign: 'right', fontWeight: 'bold' }]}>{formatAmount(invoice.totals.totalWithVat)}</Text>
                  </View>
                </View>
              </>
            )}

            <View style={styles.bottomSection}>
              {qrCodeDataUrl && (
                <View style={styles.qrContainer}>
                  <Image src={qrCodeDataUrl} style={styles.qrImage} />
                  <Text style={styles.qrLabel}>QR Platba</Text>
                </View>
              )}

              {stampDataUrl && (
                <View style={styles.stampContainer}>
                  <Image src={stampDataUrl} style={styles.stampImage} />
                  <Text style={styles.signatureLabel}>Razítko a podpis</Text>
                </View>
              )}
            </View>
          </View>

          {/* Pravá část: Celkem */}
          <View style={styles.totalsRight}>
            {isVatPayer && (
              <View style={{ borderTopWidth: 1, borderTopColor: BORDER_COLOR, paddingTop: 8 }}>
                <View style={styles.totalBoxRow}>
                  <Text style={{ fontSize: 9 }}>Celkem bez DPH</Text>
                  <Text style={{ fontSize: 9, fontWeight: 'bold' }}>{formatAmount(invoice.totals.baseWithoutVat)}</Text>
                </View>
                <View style={styles.totalBoxRow}>
                  <Text style={{ fontSize: 9 }}>Celkem DPH</Text>
                  <Text style={{ fontSize: 9, fontWeight: 'bold' }}>{formatAmount(invoice.totals.vatAmount)}</Text>
                </View>
                <View style={[styles.totalBoxRow, { marginTop: 4 }]}>
                  <Text style={{ fontSize: 10, fontWeight: 'bold' }}>Celkem s DPH</Text>
                  <Text style={{ fontSize: 10, fontWeight: 'bold' }}>{formatAmount(invoice.totals.totalWithVat)}</Text>
                </View>
              </View>
            )}

            <View style={styles.totalBox}>
              <Text style={styles.totalBoxLabel}>Celkem k úhradě</Text>
              <Text style={styles.totalBoxBigValue}>
                {formatCurrency(invoice.totals.totalWithVat, invoice.currency)}
              </Text>
            </View>

            {/* Zobrazení "NEJSME PLÁTCI DPH!!" pokud dodavatel není plátce DPH */}
            {invoice.supplier.isVatPayer === false && (
              <View style={{ marginTop: 8, alignItems: 'center' }}>
                <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#dc2626', textAlign: 'center' }}>
                  NEJSME PLÁTCI DPH!!
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Patička */}
        <View style={styles.footer}>
          <Text>{footerText}</Text>
          <Text render={({ pageNumber, totalPages }) => (
            `Strana ${pageNumber} / ${totalPages}`
          )} fixed />
        </View>

      </Page>
    </Document>
  );
};
