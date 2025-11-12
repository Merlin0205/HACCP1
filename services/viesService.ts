/**
 * Service pro ověření DIČ přes VIES VAT API
 * 
 * Wrapper pro volání Cloud Function checkVat
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebaseConfig';
import { VatVerificationResult } from '../functions/src/checkVat';

/**
 * Ověří DIČ přes VIES VAT API
 * 
 * @param dic DIČ ve formátu "CZ05964857" nebo "CZ 05964857"
 * @returns Výsledek ověření s datem a statusem
 * @throws Error pokud dojde k chybě při volání nebo validaci
 */
export async function checkVat(dic: string): Promise<VatVerificationResult> {
  // Validace DIČ na klientovi
  if (!dic || typeof dic !== 'string') {
    throw new Error('DIČ je povinné');
  }

  const cleanDic = dic.trim();
  if (cleanDic.length < 3) {
    throw new Error('Nevalidní formát DIČ. Očekávaný formát: CZ12345678');
  }

  try {
    const checkVatFunction = httpsCallable<{ dic: string }, VatVerificationResult>(
      functions,
      'checkVat'
    );

    const result = await checkVatFunction({ dic: cleanDic });
    
    if (!result.data) {
      throw new Error('Nepodařilo se získat výsledek ověření z VIES');
    }

    return result.data;
  } catch (error: any) {
    // Přemapování Firebase HttpsError na běžné Error s českými hláškami
    if (error.code === 'unauthenticated') {
      throw new Error('Musíte být přihlášeni');
    }
    
    if (error.code === 'invalid-argument') {
      throw new Error(error.message || 'Nevalidní formát DIČ');
    }
    
    if (error.code === 'internal' || error.code === 'unknown') {
      throw new Error(error.message || 'Chyba při komunikaci s VIES API. Zkuste to prosím později.');
    }

    // Generická chyba
    throw new Error(error.message || 'Nepodařilo se ověřit DIČ');
  }
}

