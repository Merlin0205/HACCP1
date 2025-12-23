/**
 * InvoicePreview - HTML náhled faktury ve stylu PDF
 * Design inspirovaný PDF šablonou (moderní vzhled, levý barevný pruh)
 */

import React from 'react';
import { Invoice } from '../../types/invoice';
import { Timestamp } from 'firebase/firestore';
import { formatCurrency, formatAmount } from '../../utils/invoiceCalculations';
import { InvoiceQrCode } from './InvoiceQrCode';

interface InvoicePreviewProps {
    invoice: Invoice;
}

const formatDate = (dateString?: string | Timestamp): string => {
    if (!dateString) return '-';
    try {
        let date: Date;
        if (dateString instanceof Timestamp) {
            date = dateString.toDate();
        } else if (typeof dateString === 'string') {
            if (dateString === '' || dateString === '-') return '-';
            date = new Date(dateString);
        } else {
            return '-';
        }

        if (isNaN(date.getTime())) {
            return '-';
        }

        return date.toLocaleDateString('cs-CZ', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    } catch (error) {
        return '-';
    }
};

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({ invoice }) => {
    // Seskupit položky podle DPH sazeb pro souhrn
    const itemsByVatRate: Record<number, typeof invoice.items> = {};
    invoice.items.forEach(item => {
        if (!itemsByVatRate[item.vatRate]) {
            itemsByVatRate[item.vatRate] = [];
        }
        itemsByVatRate[item.vatRate].push(item);
    });

    return (
        <div className="relative bg-white border border-gray-200 shadow-sm">
            {/* Barevný pruh vlevo - stejný jako v PDF */}
            <div className="absolute top-0 left-0 bottom-0 w-3 bg-teal-400" />

            {/* Obsah s paddingem (ponechání místa pro pruh) */}
            <div className="pl-10 pr-10 py-10">

                {/* Hlavička */}
                <div className="flex justify-between items-start mb-6">
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-gray-900 mb-1">
                            {invoice.supplier.isVatPayer ? 'Faktura - daňový doklad' : 'Faktura'}
                        </h1>
                        <p className="text-2xl font-light text-gray-700">
                            č. {invoice.invoiceNumber}
                        </p>
                    </div>
                    {/* Logo */}
                    <div className="w-36 h-18 ml-4 flex-shrink-0">
                        {invoice.supplier.logoUrl ? (
                            <img src={invoice.supplier.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                        ) : (
                            <div className="w-full h-full border-2 border-dashed border-gray-300 rounded flex items-center justify-center bg-gray-50">
                                <span className="text-xs text-gray-400">Logo</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Dodavatel a Odběratel */}
                <div className="grid grid-cols-2 gap-10 mb-6">
                    {/* Dodavatel */}
                    <div>
                        <h2 className="text-xs font-bold text-gray-900 border-b border-gray-200 pb-1 mb-2 uppercase">Dodavatel</h2>
                        <p className="text-sm font-bold mb-0.5">{invoice.supplier.name}</p>
                        <p className="text-xs text-gray-700">{invoice.supplier.street}</p>
                        <p className="text-xs text-gray-700">{invoice.supplier.zip} {invoice.supplier.city}</p>
                        <p className="text-xs text-gray-700">{invoice.supplier.country}</p>

                        <div className="mt-2">
                            <p className="text-xs text-gray-700">IČO: {invoice.supplier.companyId}</p>
                            {invoice.supplier.vatId && <p className="text-xs text-gray-700">DIČ: {invoice.supplier.vatId}</p>}
                        </div>

                        {/* Kontakty */}
                        <div className="mt-2 space-y-0.5">
                            {invoice.supplier.email && (
                                <div className="flex gap-2 text-xs">
                                    <span className="text-gray-500 w-12">Email:</span>
                                    <span className="text-gray-900">{invoice.supplier.email}</span>
                                </div>
                            )}
                            {invoice.supplier.phone && (
                                <div className="flex gap-2 text-xs">
                                    <span className="text-gray-500 w-12">Tel.:</span>
                                    <span className="text-gray-900">{invoice.supplier.phone}</span>
                                </div>
                            )}
                            {invoice.supplier.website && (
                                <div className="flex gap-2 text-xs">
                                    <span className="text-gray-500 w-12">Web:</span>
                                    <span className="text-gray-900">{invoice.supplier.website}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Odběratel */}
                    <div>
                        <h2 className="text-xs font-bold text-gray-900 border-b border-gray-200 pb-1 mb-2 uppercase">Odběratel</h2>
                        <p className="text-sm font-bold mb-0.5">{invoice.customer.name}</p>
                        <p className="text-xs text-gray-700">{invoice.customer.street}</p>
                        <p className="text-xs text-gray-700">{invoice.customer.zip} {invoice.customer.city}</p>
                        <p className="text-xs text-gray-700">{invoice.customer.country}</p>

                        <div className="mt-2">
                            {invoice.customer.companyId && <p className="text-xs text-gray-700">IČO: {invoice.customer.companyId}</p>}
                            {invoice.customer.vatId && <p className="text-xs text-gray-700">DIČ: {invoice.customer.vatId}</p>}
                        </div>

                        {/* Provozovna */}
                        {invoice.premise && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-0.5">Provozovna</p>
                                <p className="text-xs font-medium text-gray-900">{invoice.premise.name}</p>
                                <p className="text-xs text-gray-700">{invoice.premise.address}</p>
                                {invoice.premise.responsiblePerson && (
                                    <p className="text-xs text-gray-700">{invoice.premise.responsiblePerson}</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Detaily platby - Grid (3 sloupce jako v PDF) */}
                <div className="bg-gray-50 p-3 rounded mb-6">
                    <div className="grid grid-cols-3 gap-4">
                        {/* Sloupec 1 */}
                        <div className="space-y-2">
                            <div>
                                <p className="text-[7px] text-gray-500 uppercase">Způsob úhrady</p>
                                <p className="text-xs font-medium text-gray-900">
                                    {invoice.payment.method === 'bank_transfer' ? 'Převodem' :
                                        invoice.payment.method === 'cash' ? 'Hotově' :
                                            invoice.payment.method === 'card' ? 'Kartou' : 'Jiné'}
                                </p>
                            </div>
                            <div>
                                <p className="text-[7px] text-gray-500 uppercase">Datum vystavení</p>
                                <p className="text-xs font-medium text-gray-900">{formatDate(invoice.createdAt)}</p>
                            </div>
                        </div>

                        {/* Sloupec 2 */}
                        <div className="space-y-2">
                            {(invoice.payment.accountNumber && invoice.payment.bankCode) || invoice.payment.bankAccount ? (
                                <div>
                                    <p className="text-[7px] text-gray-500 uppercase">Bankovní účet</p>
                                    <p className="text-xs font-medium text-gray-900">
                                        {invoice.payment.accountNumber
                                            ? `${invoice.payment.accountNumber}/${invoice.payment.bankCode}`
                                            : invoice.payment.bankAccount}
                                    </p>
                                </div>
                            ) : null}
                            {invoice.supplier.isVatPayer && (
                                <div>
                                    <p className="text-[7px] text-gray-500 uppercase">DUZP</p>
                                    <p className="text-xs font-medium text-gray-900">{formatDate(invoice.taxableSupplyDate)}</p>
                                </div>
                            )}
                        </div>

                        {/* Sloupec 3 */}
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <p className="text-[7px] text-gray-500 uppercase">Var. symbol</p>
                                    <p className="text-xs font-medium text-gray-900">{invoice.variableSymbol}</p>
                                </div>
                                <div className="flex-1">
                                    <p className="text-[7px] text-gray-500 uppercase">Konst. symbol</p>
                                    <p className="text-xs font-medium text-gray-900">{invoice.constantSymbol || '308'}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-[7px] text-gray-500 uppercase">Datum splatnosti</p>
                                <p className="text-xs font-medium text-gray-900">{formatDate(invoice.dueDate)}</p>
                            </div>
                        </div>
                    </div>

                    {/* IBAN/SWIFT pokud existuje */}
                    {invoice.payment.iban && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="text-[7px] text-gray-500 uppercase">IBAN / SWIFT</p>
                            <p className="text-xs font-medium text-gray-900">
                                {invoice.payment.iban} {invoice.payment.swift ? `/ ${invoice.payment.swift}` : ''}
                            </p>
                        </div>
                    )}
                </div>

                {/* Tabulka položek */}
                <div className="mb-5">
                    <h3 className="text-xs font-bold text-gray-900 pb-1 mb-2 uppercase">Položky faktury</h3>

                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-gray-300 px-2 py-1.5 text-left text-[8px] font-bold text-gray-600 uppercase">Název</th>
                                <th className="border border-gray-300 px-2 py-1.5 text-right text-[8px] font-bold text-gray-600 uppercase">Množství</th>
                                <th className="border border-gray-300 px-2 py-1.5 text-center text-[8px] font-bold text-gray-600 uppercase">Mj.</th>
                                <th className="border border-gray-300 px-2 py-1.5 text-right text-[8px] font-bold text-gray-600 uppercase">
                                    {invoice.supplier.isVatPayer ? 'Cena za m.j.' : 'Cena/mj.'}
                                </th>
                                {invoice.supplier.isVatPayer && (
                                    <>
                                        <th className="border border-gray-300 px-2 py-1.5 text-right text-[8px] font-bold text-gray-600 uppercase">DPH %</th>
                                        <th className="border border-gray-300 px-2 py-1.5 text-right text-[8px] font-bold text-gray-600 uppercase">Bez DPH</th>
                                        <th className="border border-gray-300 px-2 py-1.5 text-right text-[8px] font-bold text-gray-600 uppercase">DPH</th>
                                    </>
                                )}
                                <th className="border border-gray-300 px-2 py-1.5 text-right text-[8px] font-bold text-gray-600 uppercase">Celkem</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.items.map((item) => (
                                <tr key={item.id} className="border-b border-gray-100">
                                    <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-900">
                                        <div className="font-bold">{item.name}</div>
                                        {item.description && (
                                            <div className="text-[10px] text-gray-500 mt-0.5">{item.description}</div>
                                        )}
                                    </td>
                                    <td className="border border-gray-300 px-2 py-1.5 text-xs text-right text-gray-900">{item.quantity}</td>
                                    <td className="border border-gray-300 px-2 py-1.5 text-xs text-center text-gray-900">{item.unit}</td>
                                    <td className="border border-gray-300 px-2 py-1.5 text-xs text-right text-gray-900">{formatAmount(item.unitPrice)}</td>
                                    {invoice.supplier.isVatPayer && (
                                        <>
                                            <td className="border border-gray-300 px-2 py-1.5 text-xs text-right text-gray-900">{item.vatRate}%</td>
                                            <td className="border border-gray-300 px-2 py-1.5 text-xs text-right text-gray-900">{formatAmount(item.totalWithoutVat)}</td>
                                            <td className="border border-gray-300 px-2 py-1.5 text-xs text-right text-gray-900">{formatAmount(item.vatAmount)}</td>
                                        </>
                                    )}
                                    <td className="border border-gray-300 px-2 py-1.5 text-xs text-right text-gray-900">
                                        {invoice.supplier.isVatPayer ? formatAmount(item.totalWithVat) : formatAmount(item.totalWithoutVat)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Součty */}
                <div className="grid grid-cols-2 gap-10 mt-4">
                    {/* Levá část: Poznámka + DPH tabulka + QR + Razítko */}
                    <div>
                        {invoice.note && (
                            <div className="mb-3">
                                <p className="text-xs text-gray-500 mb-1">Poznámka:</p>
                                <p className="text-xs text-gray-900">{invoice.note}</p>
                            </div>
                        )}

                        {invoice.supplier.isVatPayer && (
                            <>
                                <p className="text-xs font-bold text-gray-900 mt-2 mb-2">Rekapitulace DPH</p>
                                <table className="w-full mb-4">
                                    <thead>
                                        <tr className="border-b border-gray-300">
                                            <th className="text-[8px] text-left text-gray-600 pb-1">Sazba</th>
                                            <th className="text-[8px] text-right text-gray-600 pb-1">Základ</th>
                                            <th className="text-[8px] text-right text-gray-600 pb-1">DPH</th>
                                            <th className="text-[8px] text-right text-gray-600 pb-1">Celkem</th>
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
                                                <tr key={vatRate} className="text-xs text-gray-700">
                                                    <td className="py-0.5">{vatRate} %</td>
                                                    <td className="text-right py-0.5">{formatAmount(baseForRate)}</td>
                                                    <td className="text-right py-0.5">{formatAmount(vatForRate)}</td>
                                                    <td className="text-right py-0.5">{formatAmount(totalForRate)}</td>
                                                </tr>
                                            );
                                        })}
                                        <tr className="text-xs font-bold text-gray-900 border-t border-gray-200">
                                            <td className="py-1">CELKEM</td>
                                            <td className="text-right py-1">{formatAmount(invoice.totals.baseWithoutVat)}</td>
                                            <td className="text-right py-1">{formatAmount(invoice.totals.vatAmount)}</td>
                                            <td className="text-right py-1">{formatAmount(invoice.totals.totalWithVat)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </>
                        )}

                        {/* QR kód a Razítko */}
                        <div className="flex items-start gap-6 mt-6">
                            {/* QR kód */}
                            <div className="flex-shrink-0">
                                <InvoiceQrCode invoice={invoice} />
                            </div>

                            {/* Razítko */}
                            <div className="flex-shrink-0">
                                {invoice.supplier.stampUrl ? (
                                    <div className="w-[180px] h-28 overflow-hidden bg-white">
                                        <img
                                            src={invoice.supplier.stampUrl}
                                            alt="Razítko"
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-[180px] h-28 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center bg-gray-50 p-1.5">
                                        <span className="text-xs text-gray-500 font-semibold text-center leading-tight">Razítko</span>
                                        <span className="text-xs text-gray-400 text-center leading-tight mt-0.5">podpis</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Pravá část: Celkem - s barvou jako v PDF */}
                    <div>
                        {invoice.supplier.isVatPayer && (
                            <div className="border-t border-gray-300 pt-3 mb-3">
                                <div className="flex justify-between py-1">
                                    <span className="text-xs text-gray-900">Celkem bez DPH</span>
                                    <span className="text-xs font-bold text-gray-900">{formatAmount(invoice.totals.baseWithoutVat)}</span>
                                </div>
                                <div className="flex justify-between py-1">
                                    <span className="text-xs text-gray-900">Celkem DPH</span>
                                    <span className="text-xs font-bold text-gray-900">{formatAmount(invoice.totals.vatAmount)}</span>
                                </div>
                                <div className="flex justify-between py-1 mt-1">
                                    <span className="text-sm font-bold text-gray-900">Celkem s DPH</span>
                                    <span className="text-sm font-bold text-gray-900">{formatAmount(invoice.totals.totalWithVat)}</span>
                                </div>
                            </div>
                        )}

                        {/* Celkem k úhradě - barevný box jako v PDF */}
                        <div className="bg-teal-400 p-4 rounded shadow-sm">
                            <p className="text-xs text-white mb-1">Celkem k úhradě</p>
                            <p className="text-xl font-bold text-white">
                                {formatCurrency(invoice.totals.totalWithVat, invoice.currency)}
                            </p>
                        </div>

                        {/* NEJSME PLÁTCI DPH!! - pokud je to relevantní */}
                        {invoice.supplier.isVatPayer === false && (
                            <div className="mt-3 text-center">
                                <p className="text-sm font-bold text-red-600">NEJSME PLÁTCI DPH!!</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Patička */}
                {invoice.footerNote && (
                    <div className="mt-8 pt-4 border-t border-gray-100 text-center">
                        <p className="text-[9px] text-gray-400">{invoice.footerNote}</p>
                    </div>
                )}
            </div>
        </div>
    );
};
