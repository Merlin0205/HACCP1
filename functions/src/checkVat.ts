/**
 * Cloud Function pro ověření DIČ přes VIES VAT API (oficiální EU ověření)
 * 
 * Volá VIES SOAP API a vrací výsledek ověření spolehlivého plátce DPH
 */

import * as functions from 'firebase-functions/v1';

const VIES_API_URL = 'https://ec.europa.eu/taxation_customs/vies/services/checkVatService';

/**
 * Rozhraní pro VIES API odpověď
 */
interface ViesResponse {
  valid: boolean;
  name?: string;
  address?: string;
  requestDate: string;
  countryCode: string;
  vatNumber: string;
}

/**
 * Rozhraní pro normalizovanou odpověď
 */
export interface VatVerificationResult {
  valid: boolean;
  verifiedAt: string;
  name?: string;
  address?: string;
  countryCode: string;
  vatNumber: string;
}

/**
 * Parsuje DIČ na countryCode a vatNumber
 * Formát: "CZ05964857" nebo "CZ 05964857" → { countryCode: "CZ", vatNumber: "05964857" }
 */
function parseVatNumber(dic: string): { countryCode: string; vatNumber: string } | null {
  if (!dic || typeof dic !== 'string') {
    return null;
  }

  // Odstranit mezery a převést na uppercase
  const cleanDic = dic.replace(/\s/g, '').toUpperCase();

  // DIČ musí mít alespoň 3 znaky (2 pro country code + 1 pro VAT number)
  if (cleanDic.length < 3) {
    return null;
  }

  // První 2 znaky jsou country code
  const countryCode = cleanDic.substring(0, 2);
  const vatNumber = cleanDic.substring(2);

  // Validace country code (musí být písmena)
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    return null;
  }

  return { countryCode, vatNumber };
}

/**
 * Parsuje SOAP XML odpověď z VIES API
 */
function parseSoapResponse(xml: string): ViesResponse | null {
  try {
    // VIES API může vracet chyby v SOAP Fault, zkontrolovat nejdřív
    const faultMatch = xml.match(/<soap:Fault>[\s\S]*?<faultstring>(.*?)<\/faultstring>/i);
    if (faultMatch) {
      console.error('[checkVat] VIES API vrátilo SOAP Fault:', faultMatch[1]);
      return null;
    }

    // Extrahovat hodnoty z XML pomocí regex (robustnější parsování)
    // VIES API používá namespace prefixy (ns2:valid, ns2:countryCode, atd.)
    // Regex musí podporovat jak s prefixem, tak bez něj
    const validMatch = xml.match(/<(?:ns2:)?valid[^>]*>(true|false)<\/(?:ns2:)?valid>/i);
    const nameMatch = xml.match(/<(?:ns2:)?name[^>]*>(.*?)<\/(?:ns2:)?name>/is);
    const addressMatch = xml.match(/<(?:ns2:)?address[^>]*>(.*?)<\/(?:ns2:)?address>/is);
    const requestDateMatch = xml.match(/<(?:ns2:)?requestDate[^>]*>(.*?)<\/(?:ns2:)?requestDate>/i);
    const countryCodeMatch = xml.match(/<(?:ns2:)?countryCode[^>]*>(.*?)<\/(?:ns2:)?countryCode>/i);
    const vatNumberMatch = xml.match(/<(?:ns2:)?vatNumber[^>]*>(.*?)<\/(?:ns2:)?vatNumber>/i);

    if (!validMatch) {
      console.error('[checkVat] Nepodařilo se najít <valid> tag v XML odpovědi');
      return null;
    }

    // Vyčistit hodnoty (odstranit mezery, CDATA, atd.)
    const cleanValue = (value: string | undefined) => {
      if (!value) return undefined;
      return value.trim().replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
    };

    return {
      valid: validMatch[1].toLowerCase() === 'true',
      name: nameMatch ? cleanValue(nameMatch[1]) : undefined,
      address: addressMatch ? cleanValue(addressMatch[1]) : undefined,
      requestDate: requestDateMatch ? requestDateMatch[1].trim() : new Date().toISOString(),
      countryCode: countryCodeMatch ? countryCodeMatch[1].trim() : '',
      vatNumber: vatNumberMatch ? vatNumberMatch[1].trim() : ''
    };
  } catch (error) {
    console.error('[checkVat] Chyba při parsování SOAP odpovědi:', error);
    return null;
  }
}

/**
 * Callable Cloud Function pro ověření DIČ přes VIES API
 */
export const checkVat = functions
  .region('europe-west1')
  .runWith({
    memory: '256MB',
    timeoutSeconds: 30
  })
  .https.onCall(async (data: { dic: string }, context: functions.https.CallableContext) => {
    // Ověření autentifikace
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Uživatel musí být přihlášen');
    }

    const { dic } = data;

    // Validace DIČ
    if (!dic || typeof dic !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'DIČ je povinné');
    }

    // Parsování DIČ
    const parsed = parseVatNumber(dic);
    if (!parsed) {
      throw new functions.https.HttpsError('invalid-argument', 'Nevalidní formát DIČ. Očekávaný formát: CZ12345678');
    }

    const { countryCode, vatNumber } = parsed;

    try {
      // SOAP payload pro VIES API
      const soapXml = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
  <soap:Body>
    <tns:checkVat>
      <tns:countryCode>${countryCode}</tns:countryCode>
      <tns:vatNumber>${vatNumber}</tns:vatNumber>
    </tns:checkVat>
  </soap:Body>
</soap:Envelope>`;

      // Volání VIES API
      const response = await fetch(VIES_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': ''
        },
        body: soapXml
      });

      if (!response.ok) {
        throw new functions.https.HttpsError('internal', `VIES API vrátilo chybu: ${response.status}`);
      }

      const xmlText = await response.text();

      // Debug log pro kontrolu odpovědi
      console.log('[checkVat] VIES API response status:', response.status);
      console.log('[checkVat] VIES API response (first 500 chars):', xmlText.substring(0, 500));

      // Parsování SOAP odpovědi
      const viesData = parseSoapResponse(xmlText);

      if (!viesData) {
        console.error('[checkVat] Nepodařilo se parsovat SOAP odpověď. XML:', xmlText.substring(0, 1000));
        throw new functions.https.HttpsError('internal', 'Nepodařilo se parsovat odpověď z VIES API');
      }

      // Normalizace odpovědi
      const result: VatVerificationResult = {
        valid: viesData.valid,
        verifiedAt: new Date().toISOString(),
        name: viesData.name,
        address: viesData.address,
        countryCode: viesData.countryCode,
        vatNumber: viesData.vatNumber
      };

      return result;
    } catch (error: any) {
      console.error('[checkVat] Chyba při volání VIES API:', error);
      console.error('[checkVat] Error stack:', error.stack);
      console.error('[checkVat] Error message:', error.message);

      // Pokud je to už HttpsError, přepošli ho
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      // Kontrola na specifické VIES chyby v XML odpovědi
      if (error.message && error.message.includes('INVALID_INPUT')) {
        throw new functions.https.HttpsError('invalid-argument', 'Nevalidní DIČ');
      }

      // Jinak generická chyba s detailnějším popisem pro debugging
      throw new functions.https.HttpsError(
        'internal',
        `Chyba při komunikaci s VIES API: ${error.message || 'Neznámá chyba'}. Zkuste to prosím později.`
      );
    }
  });

