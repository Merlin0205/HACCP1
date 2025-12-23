import React, { useState, useMemo, useEffect } from 'react';
import { Timestamp } from 'firebase/firestore';
import { Invoice, InvoiceStatus } from '../../types/invoice';
import { Supplier } from '../../types';
import { Card, CardBody } from '../ui/Card';
import { TextField } from '../ui/Input';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { PageHeader } from '../PageHeader';
import { SECTION_THEMES } from '../../constants/designSystem';
import { SectionTheme } from '../../constants/designSystem';
import { AppState } from '../../types';
import { Pagination } from '../ui/Pagination';
import { PlusIcon, EditIcon, XIcon, TrashIcon, CheckmarkIcon, RefreshIcon } from '../icons';
import { listInvoicesByUser, listUnpaidInvoicesByUser, fetchSuppliers } from '../../services/firestore';
import { toast } from '../../utils/toast';
import { formatCurrency } from '../../utils/invoiceCalculations';
import { TooltipCell } from '../ui/TooltipCell';
import { DetailTooltip } from '../ui/DetailTooltip';
import { ActionIconTooltip } from '../ui/ActionIconTooltip';
import { Modal } from '../ui/Modal';

interface InvoicesPageProps {
  onSelectInvoice: (invoiceId: string) => void;
  onCreateInvoice: () => void;
  onEditInvoice?: (invoiceId: string) => void;
  onCancelInvoice?: (invoiceId: string) => void;
  onDeleteInvoice?: (invoiceId: string) => void;
  onMarkAsPaid?: (invoiceId: string) => void;
  onRestoreInvoice?: (invoiceId: string) => void;
  sectionTheme?: SectionTheme;
  refreshTrigger?: number; // Pro refresh po akcích
}

export const InvoicesPage: React.FC<InvoicesPageProps> = ({
  onSelectInvoice,
  onCreateInvoice,
  onEditInvoice,
  onCancelInvoice,
  onDeleteInvoice,
  onMarkAsPaid,
  onRestoreInvoice,
  sectionTheme = SECTION_THEMES[AppState.INVOICES],
  refreshTrigger,
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'unpaid' | 'all'>('all'); // Výchozí je "Všechny"
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [deleteConfirmInvoiceId, setDeleteConfirmInvoiceId] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | 'all'>('all');

  useEffect(() => {
    loadSuppliers();
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [activeTab, refreshTrigger, selectedSupplierId]);

  const loadSuppliers = async () => {
    try {
      const data = await fetchSuppliers();
      setSuppliers(data);
      // Najít výchozího dodavatele a nastavit ho jako vybraného
      const defaultSupplier = data.find(s => s.isDefault);
      if (defaultSupplier) {
        setSelectedSupplierId(defaultSupplier.id);
      }
    } catch (error: any) {
      console.error('[InvoicesPage] Error loading suppliers:', error);
      toast.error('Chyba při načítání dodavatelů: ' + error.message);
    }
  };

  const loadInvoices = async () => {
    try {
      setIsLoading(true);
      const data = activeTab === 'unpaid'
        ? await listUnpaidInvoicesByUser()
        : await listInvoicesByUser();
      setInvoices(data);
    } catch (error: any) {
      console.error('[InvoicesPage] Error loading invoices:', error);
      toast.error('Chyba při načítání faktur: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString?: string | Timestamp): string => {
    if (!dateString) {
      console.warn('[InvoicesPage] formatDate: dateString is empty', dateString);
      return '-';
    }
    try {
      let date: Date;
      if (dateString instanceof Timestamp) {
        date = dateString.toDate();
      } else if (typeof dateString === 'string') {
        if (dateString === '' || dateString === '-') {
          console.warn('[InvoicesPage] formatDate: dateString is empty string');
          return '-';
        }
        date = new Date(dateString);
      } else {
        console.warn('[InvoicesPage] formatDate: unknown dateString type', typeof dateString, dateString);
        return '-';
      }

      if (isNaN(date.getTime())) {
        console.warn('[InvoicesPage] formatDate: invalid date', dateString);
        return '-';
      }

      return date.toLocaleDateString('cs-CZ', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch (error) {
      console.error('[InvoicesPage] formatDate error:', error, dateString);
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
    return (
      <Badge color={config.color}>
        {config.text}
      </Badge>
    );
  };

  const filteredInvoices = useMemo(() => {
    let filtered = invoices;

    // Filtrování podle dodavatele
    if (selectedSupplierId !== 'all') {
      const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);
      if (selectedSupplier) {
        filtered = filtered.filter(invoice => {
          // Porovnat podle názvu nebo IČO dodavatele
          return (
            invoice.supplier.name === selectedSupplier.supplier_name ||
            invoice.supplier.companyId === selectedSupplier.supplier_ico
          );
        });
      }
    }

    // Vyhledávání
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(invoice => {
        return (
          invoice.invoiceNumber?.toLowerCase().includes(query) ||
          invoice.customer.name?.toLowerCase().includes(query) ||
          invoice.variableSymbol?.toLowerCase().includes(query)
        );
      });
    }

    // Seřadit podle data vystavení (nejnovější první)
    filtered = [...filtered].sort((a, b) => {
      const dateA = a.createdAt instanceof Timestamp
        ? a.createdAt.toDate().getTime()
        : new Date(a.createdAt as string).getTime();
      const dateB = b.createdAt instanceof Timestamp
        ? b.createdAt.toDate().getTime()
        : new Date(b.createdAt as string).getTime();
      return dateB - dateA;
    });

    return filtered;
  }, [invoices, searchQuery, selectedSupplierId, suppliers]);

  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredInvoices.slice(start, start + itemsPerPage);
  }, [filteredInvoices, currentPage, itemsPerPage]);

  if (isLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto pb-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <p className="mt-4 text-gray-600">Načítání faktur...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto pb-6">
      <PageHeader
        section={sectionTheme}
        title="Faktury"
        description="Přehled vydaných faktur"
        action={
          <Button
            variant="primary"
            size="lg"
            onClick={onCreateInvoice}
            leftIcon={<PlusIcon className="h-5 w-5" />}
          >
            Nová faktura
          </Button>
        }
      />

      {/* Unified Compact Filter Bar */}
      <Card className="mb-6 bg-gradient-to-r from-gray-50 to-white">
        <CardBody className="p-4">
          <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-center">
            {/* Left: Tabs as pills */}
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  setActiveTab('all');
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${activeTab === 'all'
                    ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md hover:shadow-lg'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
              >
                Všechny
              </button>
              <button
                onClick={() => {
                  setActiveTab('unpaid');
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${activeTab === 'unpaid'
                    ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md hover:shadow-lg'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
              >
                Nezaplacené
              </button>
            </div>

            {/* Middle: Supplier dropdown */}
            <div className="flex-shrink-0 w-full md:w-64">
              <div className="relative">
                <select
                  value={selectedSupplierId}
                  onChange={(e) => {
                    setSelectedSupplierId(e.target.value as string);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-10 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent appearance-none cursor-pointer hover:border-gray-300 transition-colors"
                >
                  <option value="all">Všichni dodavatelé</option>
                  {suppliers
                    .sort((a, b) => {
                      if (a.isDefault && !b.isDefault) return -1;
                      if (!a.isDefault && b.isDefault) return 1;
                      return 0;
                    })
                    .map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.supplier_name}{supplier.isDefault ? ' (Výchozí)' : ''}
                      </option>
                    ))}
                </select>
                {/* Icon - Building */}
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                {/* Chevron down */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Right: Search - flex-grow on desktop */}
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Hledat podle zákazníka, čísla faktury, VS…"
                  className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder-gray-400 hover:border-gray-300 transition-colors"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Table - Desktop */}
      <Card className="hidden md:block w-full">
        <CardBody className="p-0">
          <div className="w-full">
            <table className="w-full table-fixed">
              <thead
                style={{
                  background: `linear-gradient(to right, ${sectionTheme.colors.primary}, ${sectionTheme.colors.darkest})`
                }}
              >
                <tr>
                  <th className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 text-left text-xs md:text-[10px] xl:text-xs font-semibold text-white uppercase tracking-wider cursor-pointer hover:opacity-90 transition-opacity rounded-tl-lg">
                    Číslo faktury
                  </th>
                  <th className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 text-left text-xs md:text-[10px] xl:text-xs font-semibold text-white uppercase tracking-wider cursor-pointer hover:opacity-90 transition-opacity">
                    Zákazník
                  </th>
                  <th className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 text-left text-xs md:text-[10px] xl:text-xs font-semibold text-white uppercase tracking-wider cursor-pointer hover:opacity-90 transition-opacity">
                    Datum vystavení
                  </th>
                  <th className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 text-left text-xs md:text-[10px] xl:text-xs font-semibold text-white uppercase tracking-wider cursor-pointer hover:opacity-90 transition-opacity">
                    Splatnost
                  </th>
                  <th className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 text-left text-xs md:text-[10px] xl:text-xs font-semibold text-white uppercase tracking-wider cursor-pointer hover:opacity-90 transition-opacity">
                    Částka
                  </th>
                  <th className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 text-left text-xs md:text-[10px] xl:text-xs font-semibold text-white uppercase tracking-wider">
                    Stav
                  </th>
                  <th className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 text-right text-xs md:text-[10px] xl:text-xs font-semibold text-white uppercase tracking-wider rounded-tr-lg">
                    Akce
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {paginatedInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      {searchQuery ? 'Žádné faktury neodpovídají vyhledávání' : 'Žádné faktury'}
                    </td>
                  </tr>
                ) : (
                  paginatedInvoices.map((invoice, index) => {
                    const isLastRow = index === paginatedInvoices.length - 1;
                    return (
                      <tr
                        key={invoice.id}
                        onClick={() => onSelectInvoice(invoice.id)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 whitespace-nowrap text-sm md:text-xs xl:text-sm font-medium text-gray-900">
                          {invoice.invoiceNumber}
                        </td>
                        <TooltipCell className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 w-48 max-w-48">
                          <DetailTooltip
                            position={isLastRow ? 'top' : 'bottom'}
                            content={
                              <div className="space-y-1.5">
                                <div className="font-bold text-sm mb-2 pb-2 border-b border-gray-700">
                                  {invoice.customer.name}
                                </div>
                                {invoice.customer.street && (
                                  <div className="flex items-start gap-2">
                                    <span className="font-semibold text-gray-300 min-w-[50px]">Adresa:</span>
                                    <span className="text-white">
                                      {invoice.customer.street}, {invoice.customer.zip} {invoice.customer.city}
                                    </span>
                                  </div>
                                )}
                                {invoice.customer.companyId && (
                                  <div className="flex items-start gap-2">
                                    <span className="font-semibold text-gray-300 min-w-[50px]">IČO:</span>
                                    <span className="text-white">{invoice.customer.companyId}</span>
                                  </div>
                                )}
                                {invoice.customer.vatId && (
                                  <div className="flex items-start gap-2">
                                    <span className="font-semibold text-gray-300 min-w-[50px]">DIČ:</span>
                                    <span className="text-white">{invoice.customer.vatId}</span>
                                  </div>
                                )}
                              </div>
                            }
                          >
                            <span className="cursor-help truncate block w-full text-sm md:text-xs xl:text-sm text-gray-900">
                              {invoice.customer.name}
                            </span>
                          </DetailTooltip>
                        </TooltipCell>
                        <td className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 whitespace-nowrap text-sm md:text-xs xl:text-sm text-gray-500">
                          {formatDate(invoice.createdAt)}
                        </td>
                        <td className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 whitespace-nowrap text-sm md:text-xs xl:text-sm text-gray-500">
                          {formatDate(invoice.dueDate)}
                        </td>
                        <td className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 whitespace-nowrap text-sm md:text-xs xl:text-sm font-medium text-gray-900">
                          {formatCurrency(invoice.totals.totalWithVat, invoice.currency)}
                        </td>
                        <td className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 whitespace-nowrap">
                          {getStatusBadge(invoice.status)}
                        </td>
                        <td className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 md:gap-1">
                            {onEditInvoice && invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                              <div className="relative group/button">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEditInvoice(invoice.id);
                                  }}
                                  className="p-1 md:p-1.5 rounded-lg hover:bg-teal-50 transition-colors text-teal-600 hover:text-teal-700"
                                >
                                  <EditIcon className="h-4 w-4 md:h-3.5 md:w-3.5 xl:h-4 xl:w-4" />
                                </button>
                                <ActionIconTooltip text="Upravit" isLastRow={isLastRow} />
                              </div>
                            )}
                            {onMarkAsPaid && invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                              <div className="relative group/button">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onMarkAsPaid(invoice.id);
                                  }}
                                  className="p-1 md:p-1.5 rounded-lg hover:bg-green-50 transition-colors text-green-600 hover:text-green-700"
                                >
                                  <CheckmarkIcon className="h-4 w-4 md:h-3.5 md:w-3.5 xl:h-4 xl:w-4" />
                                </button>
                                <ActionIconTooltip text="Označit jako zaplacenou" isLastRow={isLastRow} />
                              </div>
                            )}
                            {onCancelInvoice && invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                              <div className="relative group/button">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onCancelInvoice(invoice.id);
                                  }}
                                  className="p-1 md:p-1.5 rounded-lg hover:bg-orange-50 transition-colors text-orange-600 hover:text-orange-700"
                                >
                                  <XIcon className="h-4 w-4 md:h-3.5 md:w-3.5 xl:h-4 xl:w-4" />
                                </button>
                                <ActionIconTooltip text="Stornovat" isLastRow={isLastRow} />
                              </div>
                            )}
                            {onRestoreInvoice && invoice.status === 'cancelled' && (
                              <div className="relative group/button">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onRestoreInvoice(invoice.id);
                                  }}
                                  className="p-1 md:p-1.5 rounded-lg hover:bg-blue-50 transition-colors text-blue-600 hover:text-blue-700"
                                >
                                  <RefreshIcon className="h-4 w-4 md:h-3.5 md:w-3.5 xl:h-4 xl:w-4" />
                                </button>
                                <ActionIconTooltip text="Obnovit fakturu" isLastRow={isLastRow} />
                              </div>
                            )}
                            {onDeleteInvoice && (
                              <div className="relative group/button">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirmInvoiceId(invoice.id);
                                  }}
                                  className="p-1 md:p-1.5 rounded-lg hover:bg-red-50 transition-colors text-red-600 hover:text-red-700"
                                >
                                  <TrashIcon className="h-4 w-4 md:h-3.5 md:w-3.5 xl:h-4 xl:w-4" />
                                </button>
                                <ActionIconTooltip text="Trvale smazat" isLastRow={isLastRow} />
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {filteredInvoices.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredInvoices.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(items) => {
                setItemsPerPage(items);
                setCurrentPage(1);
              }}
            />
          )}
        </CardBody>
      </Card>

      {/* Confirmation Modal for Delete */}
      <Modal
        isOpen={deleteConfirmInvoiceId !== null}
        onClose={() => setDeleteConfirmInvoiceId(null)}
        title="Smazat fakturu"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Opravdu chcete trvale smazat fakturu{' '}
            <strong>{invoices.find(inv => inv.id === deleteConfirmInvoiceId)?.invoiceNumber}</strong>?
            Tato akce je nevratná.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setDeleteConfirmInvoiceId(null)}>
              Zrušit
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (deleteConfirmInvoiceId && onDeleteInvoice) {
                  onDeleteInvoice(deleteConfirmInvoiceId);
                  setDeleteConfirmInvoiceId(null);
                }
              }}
            >
              Smazat
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

