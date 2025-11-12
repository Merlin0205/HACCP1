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

      // Normalizace dat pro formulář
      const companyData: CompanyData = {
        operator_name: aresData.obchodniJmeno || aresData.nazev || '',
        operator_address: formatAddress(aresData.sidlo),
        operator_statutory_body: formatStatutoryBody(aresData.statutarniOrgan),
        operator_phone: '', // ARES neobsahuje telefon
        operator_email: '', // ARES neobsahuje email
        operator_ico: aresData.ico || '',
        operator_dic: aresData.dic || '',
        // Vrátit všechna raw data z ARES pro debugování
        rawAresData: aresData
      };

      console.log('[getCompanyByIco] Formatted address:', companyData.operator_address);

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
 * Formátuje adresu z ARES struktury do textového řetězce
 * Používá textovaAdresa pokud je k dispozici, jinak sestaví z částí
 */
function formatAddress(sidlo?: AresResponse['sidlo']): string {
  if (!sidlo) {
    return '';
  }

  // Pokud máme hotovou textovou adresu, použijeme ji (ale upravíme formát PSČ a odstraníme část obce)
  if (sidlo.textovaAdresa) {
    // ARES vrací: "U Městského dvora 158/15, Nový Svět, 77900 Olomouc"
    // Chceme: "U Městského dvora 158/15, 779 00 Olomouc" (bez části obce)
    
    // Najít ulici s číslem (první část před první čárkou)
    const parts = sidlo.textovaAdresa.split(',');
    const streetPart = parts[0]?.trim() || '';
    
    // Najít PSČ a město (poslední část)
    const lastPart = parts[parts.length - 1]?.trim() || '';
    
    // Extrahovat PSČ a město z poslední části
    const psc = sidlo.psc?.toString() || '';
    let formattedPsc = psc;
    if (psc.length === 5) {
      formattedPsc = `${psc.substring(0, 3)} ${psc.substring(3)}`;
    }
    
    // Město je v poslední části po PSČ
    const city = sidlo.nazevObce || lastPart.replace(psc, '').trim();
    
    // Sestavit finální adresu: "Ulice číslo, PSČ Město"
    if (streetPart && city) {
      return `${streetPart}, ${formattedPsc} ${city}`;
    }
    
    // Fallback: použít původní textovou adresu s upraveným PSČ
    if (psc.length === 5) {
      const formattedPscFallback = `${psc.substring(0, 3)} ${psc.substring(3)}`;
      return sidlo.textovaAdresa.replace(psc, formattedPscFallback);
    }
    return sidlo.textovaAdresa;
  }

  // Pokud nemáme textovou adresu, sestavíme z částí
  const parts: string[] = [];

  // Ulice s číslem
  if (sidlo.nazevUlice) {
    let street = sidlo.nazevUlice;
    if (sidlo.cisloDomovni) {
      street += ` ${sidlo.cisloDomovni}`;
    }
    if (sidlo.cisloOrientacni) {
      street += `/${sidlo.cisloOrientacni}`;
    }
    parts.push(street);
  }

  // PSČ a město (formát: "PSČ Město")
  if (sidlo.nazevObce) {
    let cityPart = '';
    if (sidlo.psc) {
      // PSČ formát: "779 00" (s mezerou po třetí číslici)
      const psc = sidlo.psc.toString();
      if (psc.length === 5) {
        // Formátovat PSČ: "77900" -> "779 00"
        cityPart = `${psc.substring(0, 3)} ${psc.substring(3)}`;
      } else {
        cityPart = psc;
      }
      cityPart += ` ${sidlo.nazevObce}`;
    } else {
      cityPart = sidlo.nazevObce;
    }
    parts.push(cityPart);
  }

  // Spojit části čárkou: "Ulice číslo, PSČ Město"
  return parts.join(', ');
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

