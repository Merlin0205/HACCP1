/**
 * Service pro získání údajů o společnosti z ARES API
 * 
 * Wrapper pro volání Cloud Function getCompanyByIco
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebaseConfig';

/**
 * Normalizovaná data o společnosti z ARES pro formulář provozovatele
 */
export interface CompanyData {
  operator_name: string;
  operator_address: string;
  operator_statutory_body: string;
  operator_phone: string;
  operator_email: string;
  operator_ico?: string;
  operator_dic?: string;
  // Raw data z ARES pro debugování
  rawAresData?: any;
}

/**
 * Získá údaje o společnosti z ARES podle IČO
 * 
 * @param ico IČO společnosti (8 číslic)
 * @returns Normalizovaná data pro formulář provozovatele
 * @throws Error pokud dojde k chybě při volání nebo validaci
 */
export async function fetchCompanyByIco(ico: string): Promise<CompanyData> {
  // Validace IČO na klientovi
  if (!ico || typeof ico !== 'string') {
    throw new Error('IČO je povinné');
  }

  if (!/^\d{8}$/.test(ico)) {
    throw new Error('IČO musí mít přesně 8 číslic');
  }

  try {
    const getCompanyByIcoFunction = httpsCallable<{ ico: string }, CompanyData>(
      functions,
      'getCompanyByIco'
    );

    const result = await getCompanyByIcoFunction({ ico });
    
    if (!result.data) {
      throw new Error('Nepodařilo se získat data z ARES');
    }

    return result.data;
  } catch (error: any) {
    // Přemapování Firebase HttpsError na běžné Error s českými hláškami
    if (error.code === 'unauthenticated') {
      throw new Error('Musíte být přihlášeni');
    }
    
    if (error.code === 'invalid-argument') {
      throw new Error(error.message || 'Nevalidní IČO');
    }
    
    if (error.code === 'not-found') {
      throw new Error('Subjekt s tímto IČO nebyl nalezen v ARES');
    }
    
    if (error.code === 'internal' || error.code === 'unknown') {
      throw new Error(error.message || 'Chyba při komunikaci s ARES. Zkuste to prosím později.');
    }

    // Generická chyba
    throw new Error(error.message || 'Nepodařilo se načíst data z ARES');
  }
}

