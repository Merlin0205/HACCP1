import React, { useState } from 'react';
import { Customer } from '../types';

interface CustomerDashboardProps {
  customers: Customer[];
  onSelectCustomer: (customerId: string) => void;
  onAddNewCustomer: () => void;
  onEditCustomer: (customerId: string) => void;
  onDeleteCustomer: (customerId: string) => void;
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ 
  customers, 
  onSelectCustomer, 
  onAddNewCustomer, 
  onEditCustomer, 
  onDeleteCustomer 
}) => {
  const [deletingCustomerId, setDeletingCustomerId] = useState<string | null>(null);

  const handleDeleteRequest = (customerId: string) => {
    setDeletingCustomerId(customerId);
  };

  const handleDeleteConfirm = () => {
    if (deletingCustomerId) {
      onDeleteCustomer(deletingCustomerId);
      setDeletingCustomerId(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeletingCustomerId(null);
  };

  return (
    <>
      <div className="w-full max-w-4xl bg-white p-8 rounded-2xl shadow-xl animate-fade-in">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">Správa zákazníků</h2>
        
        <div className="mb-6 text-right">
          <button 
            className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-transform transform hover:scale-105"
            onClick={onAddNewCustomer}
          >
            + Nový zákazník
          </button>
        </div>

        <div className="space-y-4">
          {customers.length > 0 ? (
            customers.map(customer => (
              <div key={customer.id} className="bg-gray-50 border border-gray-200 p-4 rounded-lg flex justify-between items-center shadow-sm">
                <div className="flex-grow">
                  <p className="font-bold text-lg text-gray-800">{customer.premise_name}</p>
                  <p className="text-sm text-gray-600">IČO: {customer.operator_ico} | Adresa: {customer.premise_address}</p>
                </div>
                <div className="flex-shrink-0 space-x-2">
                  <button 
                    onClick={() => onEditCustomer(customer.id)}
                    className="bg-yellow-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-yellow-600 transition-colors"
                  >
                    Upravit
                  </button>
                  <button 
                    onClick={() => handleDeleteRequest(customer.id)}
                    className="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Smazat
                  </button>
                  <button 
                    onClick={() => onSelectCustomer(customer.id)}
                    className="bg-green-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Zobrazit audity
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Zatím nemáte žádné zákazníky.</p>
              <p className="text-gray-400 mt-2">Začněte kliknutím na tlačítko \"+ Nový zákazník\".</p>
            </div>
          )}
        </div>
      </div>

      {deletingCustomerId && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex justify-center items-center z-50 animate-fade-in">
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full mx-4">
            <h3 className="text-xl font-bold text-gray-800">Potvrdit smazání</h3>
            <p className="my-4 text-gray-600">Opravdu si přejete smazat tohoto zákazníka a všechny jeho audity? Tato akce je nevratná.</p>
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={handleDeleteCancel}
                className="bg-gray-200 text-gray-800 font-semibold py-2 px-6 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Zrušit
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="bg-red-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-700 transition-colors"
              >
                Smazat
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
