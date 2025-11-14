/**
 * Cloud Function pro získání údajů o společnosti z ARES API podle IČO
 * 
 * Volá ARES REST API a vrací normalizovaná data pro formulář provozovatele
 */

import * as functions from 'firebase-functions/v1';

const ARES_BASE_URL = 'https://ares.gov.cz/ekonomicke-subjekty-v-be/rest';

/**
 * Rozhraní pro ARES API odpověď (částečné - pouze potřebná pole)
 */
interface AresResponse {
  ico?: string;
  obchodniJmeno?: string;
  nazev?: string;
  dic?: string;
  sidlo?: {
    nazevUlice?: string;
    cisloDomovni?: number;
    cisloOrientacni?: number;
    nazevObce?: string;
    nazevCastiObce?: string;
    psc?: number;
    textovaAdresa?: string; // Hotová adresa ve formátu "Ulice číslo, část obce, PSČ Město"
  };
  pravniForma?: string;
  statutarniOrgan?: Array<{
    jmeno?: string;
    prijmeni?: string;
    titulPred?: string;
    titulZa?: string;
  }>;
  aktivni?: boolean;
}

/**
 * Normalizovaná odpověď pro formulář
 * 
 * POZNÁMKA: Duplikát tohoto typu je také v services/aresService.ts
 * pro použití v React komponentách
 */
export interface CompanyData {
  operator_name: string;
  operator_address?: string; // DEPRECATED - použít operator_street, operator_city, operator_zip
  operator_street: string;
  operator_city: string;
  operator_zip: string;
  operator_statutory_body: string;
  operator_phone: string;
  operator_email: string;
  operator_ico?: string;
  operator_dic?: string;
  // Raw data z ARES pro debugování
  rawAresData?: any;
}

/**
 * Callable Cloud Function pro získání údajů o společnosti z ARES
 */
export const getCompanyByIco = functions
  .region('europe-west1')
  .runWith({
    memory: '256MB',
    timeoutSeconds: 30
  })
  .https.onCall(async (data: { ico: string }, context: functions.https.CallableContext) => {
    // Ověření autentifikace
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Uživatel musí být přihlášen');
    }

    const { ico } = data;

    // Validace IČO
    if (!ico || typeof ico !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'IČO je povinné');
    }

    if (!/^\d{8}$/.test(ico)) {
      throw new functions.https.HttpsError('invalid-argument', 'IČO musí mít přesně 8 číslic');
    }

    try {
      // Volání ARES API
      const url = `${ARES_BASE_URL}/ekonomicke-subjekty/${ico}`;
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'HACCP-Audit-App/1.0'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new functions.https.HttpsError('not-found', 'Subjekt s tímto IČO nebyl nalezen v ARES');
        }
        throw new functions.https.HttpsError('internal', `ARES API vrátilo chybu: ${response.status}`);
      }

      const aresData: AresResponse = await response.json();

      // Debug log pro kontrolu struktury
      console.log('[getCompanyByIco] ARES data:', JSON.stringify(aresData, null, 2));

      // Parsovat adresu z ARES
      const addressParts = parseAddress(aresData.sidlo);
      
      // Debug log pro kontrolu parsování
      console.log('[getCompanyByIco] Raw sidlo:', JSON.stringify(aresData.sidlo, null, 2));
      console.log('[getCompanyByIco] Parsed address:', addressParts);
      
      // Normalizace dat pro formulář
      const companyData: CompanyData = {
        operator_name: aresData.obchodniJmeno || aresData.nazev || '',
        operator_street: addressParts.street || '',
        operator_city: addressParts.city || '',
        operator_zip: addressParts.zip || '',
        operator_address: `${addressParts.street}, ${addressParts.zip} ${addressParts.city}`, // DEPRECATED - pro zpětnou kompatibilitu
        operator_statutory_body: formatStatutoryBody(aresData.statutarniOrgan),
        operator_phone: '', // ARES neobsahuje telefon
        operator_email: '', // ARES neobsahuje email
        operator_ico: aresData.ico || '',
        operator_dic: aresData.dic || '',
        // Vrátit všechna raw data z ARES pro debugování
        rawAresData: aresData
      };

      console.log('[getCompanyByIco] Final companyData:', {
        name: companyData.operator_name,
        street: companyData.operator_street,
        city: companyData.operator_city,
        zip: companyData.operator_zip,
        dic: companyData.operator_dic
      });

      return companyData;
    } catch (error: any) {
      console.error('[getCompanyByIco] Chyba při volání ARES:', error);

      // Pokud je to už HttpsError, přepošli ho
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      // Jinak generická chyba
      throw new functions.https.HttpsError(
        'internal',
        'Chyba při komunikaci s ARES. Zkuste to prosím později.'
      );
    }
  });

/**
 * Parsuje adresu z ARES struktury do objektu {street, city, zip}
 */
function parseAddress(sidlo?: AresResponse['sidlo']): { street: string; city: string; zip: string } {
  if (!sidlo) {
    console.log('[parseAddress] No sidlo provided');
    return { street: '', city: '', zip: '' };
  }

  let street = '';
  let city = '';
  let zip = '';

  // Parsovat ulici s číslem
  if (sidlo.nazevUlice) {
    street = sidlo.nazevUlice.trim();
    if (sidlo.cisloDomovni !== undefined && sidlo.cisloDomovni !== null) {
      street += ` ${sidlo.cisloDomovni}`;
    }
    if (sidlo.cisloOrientacni !== undefined && sidlo.cisloOrientacni !== null) {
      street += `/${sidlo.cisloOrientacni}`;
    }
  } else if (sidlo.textovaAdresa) {
    // Pokud nemáme nazevUlice, použít první část textové adresy
    const parts = sidlo.textovaAdresa.split(',');
    street = parts[0]?.trim() || '';
  }

  // Parsovat město
  city = (sidlo.nazevObce || '').trim();

  // Parsovat PSČ
  if (sidlo.psc !== undefined && sidlo.psc !== null) {
    zip = sidlo.psc.toString().trim();
  }

  console.log('[parseAddress] Parsed:', { street, city, zip, rawSidlo: sidlo });

  return { street, city, zip };
}

/**
 * Formátuje statutární orgán z ARES struktury do textového řetězce
 */
function formatStatutoryBody(statutarniOrgan?: AresResponse['statutarniOrgan']): string {
  if (!statutarniOrgan || statutarniOrgan.length === 0) {
    return '';
  }

  return statutarniOrgan
    .map((organ) => {
      const parts: string[] = [];
      if (organ.titulPred) parts.push(organ.titulPred);
      if (organ.jmeno) parts.push(organ.jmeno);
      if (organ.prijmeni) parts.push(organ.prijmeni);
      if (organ.titulZa) parts.push(organ.titulZa);
      return parts.join(' ');
    })
    .join(', ');
}

