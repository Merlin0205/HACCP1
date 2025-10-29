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
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'ico' | 'name'>('all');
  const [showHaccpMessage, setShowHaccpMessage] = useState(false);

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

  // Filtrování zákazníků podle vyhledávacího termínu a typu
  const filteredCustomers = customers.filter(customer => {
    if (!searchTerm) return true;
    
    const term = searchTerm.toLowerCase();
    
    switch (searchType) {
      case 'ico':
        return customer.operator_ico?.toLowerCase().includes(term);
      case 'name':
        return customer.premise_name?.toLowerCase().includes(term);
      case 'all':
      default:
        return (
          customer.premise_name?.toLowerCase().includes(term) ||
          customer.operator_ico?.toLowerCase().includes(term) ||
          customer.premise_address?.toLowerCase().includes(term) ||
          customer.operator_name?.toLowerCase().includes(term)
        );
    }
  });

  return (
    <>
      <div className="w-full max-w-7xl bg-white p-4 md:p-8 rounded-2xl shadow-xl animate-fade-in">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">Správa zákazníků</h2>
        
        {/* Vyhledávací panel */}
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Vyhledávací input */}
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={
                    searchType === 'ico' ? 'Hledat podle IČO...' :
                    searchType === 'name' ? 'Hledat podle názvu zařízení...' :
                    'Hledat zákazníka (název, IČO, adresa)...'
                  }
                  className="w-full pl-12 pr-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
                <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Filtry */}
            <div className="flex gap-2">
              <button
                onClick={() => setSearchType('all')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  searchType === 'all'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-blue-100'
                }`}
              >
                🔍 Vše
              </button>
              <button
                onClick={() => setSearchType('name')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  searchType === 'name'
                    ? 'bg-green-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-green-100'
                }`}
              >
                🏢 Název
              </button>
              <button
                onClick={() => setSearchType('ico')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  searchType === 'ico'
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-purple-100'
                }`}
              >
                🔢 IČO
              </button>
            </div>
          </div>

          {/* Statistiky */}
          <div className="mt-4 flex items-center justify-between text-sm">
            <div className="text-gray-600">
              {searchTerm ? (
                <span>
                  Nalezeno: <span className="font-bold text-blue-600">{filteredCustomers.length}</span> z {customers.length} zákazníků
                </span>
              ) : (
                <span>
                  Celkem: <span className="font-bold text-gray-800">{customers.length}</span> zákazníků
                </span>
              )}
            </div>
            <button 
              className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 transition-transform transform hover:scale-105"
              onClick={onAddNewCustomer}
            >
              + Nový zákazník
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {filteredCustomers.length > 0 ? (
            filteredCustomers.map(customer => (
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
                    AUDITY
                  </button>
                  <button 
                    onClick={() => setShowHaccpMessage(true)}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-2 px-5 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg"
                  >
                    🎯 HACCP
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border-2 border-dashed border-gray-300">
              {searchTerm ? (
                <>
                  <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-gray-600 text-lg font-semibold">Žádní zákazníci nenalezeni</p>
                  <p className="text-gray-500 mt-2">Zkuste změnit vyhledávací termín nebo filtr</p>
                  <button
                    onClick={() => setSearchTerm('')}
                    className="mt-4 text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    Vymazat vyhledávání
                  </button>
                </>
              ) : (
                <>
                  <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-gray-600 text-lg font-semibold">Zatím nemáte žádné zákazníky</p>
                  <p className="text-gray-500 mt-2">Začněte kliknutím na tlačítko \"+ Nový zákazník\"</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* HACCP motivační hláška */}
      {showHaccpMessage && (
        <div className="fixed inset-0 bg-gradient-to-br from-blue-900/90 via-purple-900/90 to-pink-900/90 flex justify-center items-center z-50 animate-fade-in backdrop-blur-sm">
          <div className="bg-white p-12 rounded-3xl shadow-2xl max-w-2xl w-full mx-4 animate-bounce-in">
            {/* Velký emoji */}
            <div className="text-center mb-6">
              <div className="text-9xl mb-4 animate-pulse">🔨</div>
              <div className="flex justify-center gap-4 text-5xl">
                <span className="animate-bounce" style={{ animationDelay: '0s' }}>🔧</span>
                <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>⚙️</span>
                <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>💻</span>
                <span className="animate-bounce" style={{ animationDelay: '0.3s' }}>🛠️</span>
              </div>
            </div>

            {/* Motivační text */}
            <div className="text-center mb-8">
              <p className="text-3xl text-gray-700 font-bold mb-4">
                Ještě to nemáme, ale už se na to můžeš těšit!
              </p>
              <p className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Mákáme! 💪🔥
              </p>
            </div>

            {/* Dekorativní grafika */}
            <div className="flex justify-center gap-3 mb-8">
              <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
              <div className="w-3 h-3 rounded-full bg-purple-500 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-3 h-3 rounded-full bg-pink-500 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>

            {/* Tlačítko zavřít */}
            <div className="flex justify-center">
              <button
                onClick={() => setShowHaccpMessage(false)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 px-12 rounded-full hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-110 shadow-xl text-lg"
              >
                ✓ Zavřít
              </button>
            </div>
          </div>
        </div>
      )}

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
