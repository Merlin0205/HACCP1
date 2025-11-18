/**
 * SupplierManagementScreen - Správa dodavatelů
 */

import React, { useState, useEffect } from 'react';
import { Supplier } from '../types';
import { fetchSuppliers, deleteSupplier, updateSupplier } from '../services/firestore/suppliers';
import { useUserRole } from '../hooks/useUserRole';
import { toast } from '../utils/toast';
import { PageHeader } from './PageHeader';
import { SECTION_THEMES } from '../constants/designSystem';
import { AppState } from '../types';
import { BackButton } from './BackButton';
import { Card, CardBody, CardHeader } from './ui/Card';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { SupplierForm } from './SupplierForm';
import { PlusIcon, EditIcon, TrashIcon } from './icons';
import { DetailTooltip } from './ui/DetailTooltip';
import { TooltipCell } from './ui/TooltipCell';
import { ActionIconTooltip } from './ui/ActionIconTooltip';
import { Pagination } from './ui/Pagination';

interface SupplierManagementScreenProps {
  onBack: () => void;
}

export const SupplierManagementScreen: React.FC<SupplierManagementScreenProps> = ({ onBack }) => {
  const { isAdmin } = useUserRole();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');

  const sectionTheme = SECTION_THEMES[AppState.SETTINGS];

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      // Nejprve zkusit migrovat z BillingSettings pokud ještě neexistují dodavatelé
      const { migrateSupplierFromBillingSettings } = await import('../services/firestore/suppliers');
      await migrateSupplierFromBillingSettings();
      
      const loadedSuppliers = await fetchSuppliers();
      setSuppliers(loadedSuppliers);
    } catch (error: any) {
      console.error('[SupplierManagementScreen] Error loading suppliers:', error);
      toast.error('Chyba při načítání dodavatelů: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingSupplier(null);
    setShowAddModal(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setShowAddModal(true);
  };

  const handleDelete = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!supplierToDelete) return;

    try {
      await deleteSupplier(supplierToDelete.id);
      toast.success('Dodavatel byl smazán');
      setSuppliers(prev => prev.filter(s => s.id !== supplierToDelete.id));
      setShowDeleteModal(false);
      setSupplierToDelete(null);
    } catch (error: any) {
      console.error('[SupplierManagementScreen] Error deleting supplier:', error);
      toast.error('Chyba při mazání dodavatele: ' + error.message);
    }
  };

  const handleSaveSupplier = async (supplierData: Omit<Supplier, 'id' | 'userId' | 'createdAt' | 'updatedAt'>, logoFile?: File, stampFile?: File) => {
    try {
      if (editingSupplier) {
        // Update existing
        await updateSupplier(editingSupplier.id, supplierData);
        
        // Pokud je logo file, nahrát ho
        if (logoFile) {
          try {
            const { uploadSupplierLogo } = await import('../services/storage');
            const logoUrl = await uploadSupplierLogo(editingSupplier.id, logoFile);
            // Aktualizovat dodavatele s URL loga
            await updateSupplier(editingSupplier.id, { supplier_logoUrl: logoUrl });
          } catch (error: any) {
            console.error('[SupplierManagementScreen] Error uploading logo:', error);
            toast.error('Chyba při nahrávání loga: ' + error.message);
          }
        }
        
        // Pokud je stamp file, nahrát ho
        if (stampFile) {
          try {
            const { uploadSupplierStamp } = await import('../services/storage');
            const stampUrl = await uploadSupplierStamp(editingSupplier.id, stampFile);
            // Aktualizovat dodavatele s URL razítka
            await updateSupplier(editingSupplier.id, { supplier_stampUrl: stampUrl });
          } catch (error: any) {
            console.error('[SupplierManagementScreen] Error uploading stamp:', error);
            toast.error('Chyba při nahrávání razítka: ' + error.message);
          }
        }
        
        toast.success('Dodavatel byl aktualizován');
        await loadSuppliers(); // Reload to get updated data
      } else {
        // Create new
        const { createSupplier } = await import('../services/firestore/suppliers');
        const newId = await createSupplier(supplierData);
        
        // Pokud je logo file, nahrát ho
        if (logoFile) {
          try {
            const { uploadSupplierLogo } = await import('../services/storage');
            const logoUrl = await uploadSupplierLogo(newId, logoFile);
            // Aktualizovat dodavatele s URL loga
            await updateSupplier(newId, { supplier_logoUrl: logoUrl });
          } catch (error: any) {
            console.error('[SupplierManagementScreen] Error uploading logo:', error);
            toast.error('Chyba při nahrávání loga: ' + error.message);
          }
        }
        
        // Pokud je stamp file, nahrát ho
        if (stampFile) {
          try {
            const { uploadSupplierStamp } = await import('../services/storage');
            const stampUrl = await uploadSupplierStamp(newId, stampFile);
            // Aktualizovat dodavatele s URL razítka
            await updateSupplier(newId, { supplier_stampUrl: stampUrl });
          } catch (error: any) {
            console.error('[SupplierManagementScreen] Error uploading stamp:', error);
            toast.error('Chyba při nahrávání razítka: ' + error.message);
          }
        }
        toast.success('Dodavatel byl přidán');
        await loadSuppliers(); // Reload to get new supplier
      }
      setShowAddModal(false);
      setEditingSupplier(null);
    } catch (error: any) {
      console.error('[SupplierManagementScreen] Error saving supplier:', error);
      toast.error('Chyba při ukládání dodavatele: ' + error.message);
    }
  };

  const handleToggleDefault = async (supplier: Supplier) => {
    try {
      await updateSupplier(supplier.id, { isDefault: !supplier.isDefault });
      toast.success(supplier.isDefault ? 'Dodavatel byl odebrán jako výchozí' : 'Dodavatel byl nastaven jako výchozí');
      await loadSuppliers(); // Reload to get updated data
    } catch (error: any) {
      console.error('[SupplierManagementScreen] Error toggling default:', error);
      toast.error('Chyba při změně výchozího dodavatele: ' + error.message);
    }
  };

  // Filter suppliers by search query
  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.supplier_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.supplier_ico?.includes(searchQuery) ||
    supplier.supplier_city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSuppliers = filteredSuppliers.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto pb-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <p className="mt-4 text-gray-600">Načítání dodavatelů...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto pb-6">
      <PageHeader
        section={sectionTheme}
        title="Správa dodavatelů"
        description="Spravujte dodavatele pro faktury"
      />

      <div className="mb-4">
        <BackButton onClick={onBack} label="Zpět" />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Dodavatelé</h2>
            <Button
              variant="primary"
              onClick={handleAdd}
              leftIcon={<PlusIcon className="h-4 w-4" />}
            >
              Nový dodavatel
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Hledat podle názvu, IČO nebo města..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset to first page when searching
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Table */}
          {paginatedSuppliers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? 'Žádní dodavatelé neodpovídají vyhledávání' : 'Žádní dodavatelé. Klikněte na "Nový dodavatel" pro přidání.'}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] xl:min-w-0">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 text-left text-xs font-medium text-gray-700 uppercase">Název</th>
                      <th className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 text-left text-xs font-medium text-gray-700 uppercase">IČO</th>
                      <th className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 text-left text-xs font-medium text-gray-700 uppercase">Město</th>
                      <th className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 text-left text-xs font-medium text-gray-700 uppercase">Výchozí</th>
                      <th className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 text-center text-xs font-medium text-gray-700 uppercase">Akce</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedSuppliers.map((supplier, index) => {
                      const isLastRow = index === paginatedSuppliers.length - 1;
                      return (
                        <tr key={supplier.id} className="hover:bg-gray-50">
                          <TooltipCell className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4">
                            <DetailTooltip
                              position={isLastRow ? 'top' : 'bottom'}
                              content={
                                <div className="space-y-1.5">
                                  <div className="font-bold text-sm mb-2 pb-2 border-b border-gray-700">
                                    {supplier.supplier_name}
                                  </div>
                                  {supplier.supplier_street && (
                                    <div className="text-gray-300 text-xs">
                                      <span className="font-semibold">Ulice:</span> {supplier.supplier_street}
                                    </div>
                                  )}
                                  {(supplier.supplier_city || supplier.supplier_zip) && (
                                    <div className="text-gray-300 text-xs">
                                      <span className="font-semibold">Město:</span> {supplier.supplier_zip} {supplier.supplier_city}
                                    </div>
                                  )}
                                  {supplier.supplier_country && (
                                    <div className="text-gray-300 text-xs">
                                      <span className="font-semibold">Stát:</span> {supplier.supplier_country}
                                    </div>
                                  )}
                                  {supplier.supplier_dic && (
                                    <div className="text-gray-300 text-xs">
                                      <span className="font-semibold">DIČ:</span> {supplier.supplier_dic}
                                    </div>
                                  )}
                                  {supplier.supplier_email && (
                                    <div className="text-gray-300 text-xs">
                                      <span className="font-semibold">Email:</span> {supplier.supplier_email}
                                    </div>
                                  )}
                                  {supplier.supplier_phone && (
                                    <div className="text-gray-300 text-xs">
                                      <span className="font-semibold">Telefon:</span> {supplier.supplier_phone}
                                    </div>
                                  )}
                                </div>
                              }
                            >
                              <span className="cursor-help truncate block w-full">
                                {supplier.supplier_name}
                              </span>
                            </DetailTooltip>
                          </TooltipCell>
                          <td className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 text-sm text-gray-900">
                            {supplier.supplier_ico}
                          </td>
                          <td className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 text-sm text-gray-900">
                            {supplier.supplier_city}
                          </td>
                          <td className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 text-sm text-gray-900">
                            <button
                              onClick={() => handleToggleDefault(supplier)}
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                supplier.isDefault
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {supplier.isDefault ? 'Ano' : 'Ne'}
                            </button>
                          </td>
                          <td className="px-3 md:px-2 xl:px-6 py-3 md:py-2 xl:py-4 text-center">
                            <div className="flex justify-center gap-2">
                              <div className="relative group/button">
                                <button
                                  onClick={() => handleEdit(supplier)}
                                  className="p-1 md:p-2 xl:p-1 text-blue-600 hover:text-blue-800 transition-colors"
                                >
                                  <EditIcon className="h-4 w-4 md:h-5 md:w-5 xl:h-4 xl:w-4" />
                                </button>
                                <ActionIconTooltip text="Upravit" isLastRow={isLastRow} />
                              </div>
                              <div className="relative group/button">
                                <button
                                  onClick={() => handleDelete(supplier)}
                                  className="p-1 md:p-2 xl:p-1 text-red-600 hover:text-red-800 transition-colors"
                                >
                                  <TrashIcon className="h-4 w-4 md:h-5 md:w-5 xl:h-4 xl:w-4" />
                                </button>
                                <ActionIconTooltip text="Smazat" isLastRow={isLastRow} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    itemsPerPage={itemsPerPage}
                    totalItems={filteredSuppliers.length}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={(newItemsPerPage) => {
                      setItemsPerPage(newItemsPerPage);
                      setCurrentPage(1);
                    }}
                  />
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingSupplier(null);
        }}
        title={editingSupplier ? 'Upravit dodavatele' : 'Nový dodavatel'}
        size="4xl"
        closeOnBackdropClick={false}
      >
        <SupplierForm
          initialData={editingSupplier}
          onSave={handleSaveSupplier}
          onBack={() => {
            setShowAddModal(false);
            setEditingSupplier(null);
          }}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSupplierToDelete(null);
        }}
        title="Smazat dodavatele"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Opravdu chcete smazat dodavatele <strong>{supplierToDelete?.supplier_name}</strong>?
          </p>
          <p className="text-sm text-gray-500">
            Tato akce je nevratná. Dodavatel bude odstraněn ze všech faktur, které ho používají.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => {
              setShowDeleteModal(false);
              setSupplierToDelete(null);
            }}>
              Zrušit
            </Button>
            <Button variant="primary" onClick={handleConfirmDelete}>
              Smazat
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

