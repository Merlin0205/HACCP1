/**
 * Firestore service pro správu faktur
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { Invoice, InvoiceStatus } from '../../types/invoice';
import { fetchUserMetadata } from './users';
import { generateHumanReadableId } from '../../utils/idGenerator';

const COLLECTION_NAME = 'invoices';

/**
 * Získá aktuálního uživatele
 */
function getCurrentUserId(): string {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user.uid;
}

/**
 * Zkontroluje, jestli je aktuální uživatel admin
 */
async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    const userId = getCurrentUserId();
    const metadata = await fetchUserMetadata(userId);
    return metadata?.role === 'admin' && metadata?.approved === true;
  } catch {
    return false;
  }
}

/**
 * Odstraní undefined hodnoty z objektu (rekurzivně)
 */
function removeUndefined(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined);
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        cleaned[key] = removeUndefined(obj[key]);
      }
    }
    return cleaned;
  }
  return obj;
}

/**
 * Převede Firestore dokument na Invoice objekt
 */
function docToInvoice(docSnapshot: any): Invoice {
  const data = docSnapshot.data();
  
  // Pomocná funkce pro konverzi Timestamp na ISO string
  const convertTimestamp = (ts: any, fieldName: string): string | undefined => {
    if (!ts) {
      console.warn(`[docToInvoice] ${fieldName} is empty/null/undefined`);
      return undefined;
    }
    // Pokud je to Firestore Timestamp instance (má metodu toDate)
    if (ts && typeof ts.toDate === 'function') {
      try {
        const isoString = ts.toDate().toISOString();
        console.log(`[docToInvoice] Converted ${fieldName} from Timestamp instance:`, isoString);
        return isoString;
      } catch (error) {
        console.error(`[docToInvoice] Error converting ${fieldName} Timestamp:`, error);
        return undefined;
      }
    }
    // Pokud je to plain object s seconds a nanoseconds (deserializovaný Timestamp)
    if (ts && typeof ts === 'object' && typeof ts.seconds === 'number') {
      try {
        // Vytvořit nový Date z seconds (nanoseconds ignorujeme pro jednoduchost)
        const date = new Date(ts.seconds * 1000);
        const isoString = date.toISOString();
        console.log(`[docToInvoice] Converted ${fieldName} from plain object Timestamp:`, isoString);
        return isoString;
      } catch (error) {
        console.error(`[docToInvoice] Error converting ${fieldName} plain object Timestamp:`, error);
        return undefined;
      }
    }
    // Pokud už je to string, vrátit ho
    if (typeof ts === 'string') {
      console.log(`[docToInvoice] ${fieldName} is already string:`, ts);
      return ts;
    }
    console.warn(`[docToInvoice] ${fieldName} has unknown type:`, typeof ts, ts);
    return undefined;
  };
  
  const createdAtConverted = convertTimestamp(data.createdAt, 'createdAt');
  const taxableSupplyDateConverted = convertTimestamp(data.taxableSupplyDate, 'taxableSupplyDate');
  const dueDateConverted = convertTimestamp(data.dueDate, 'dueDate');
  
  console.log('[docToInvoice] Converting invoice:', {
    id: docSnapshot.id,
    createdAtRaw: data.createdAt,
    createdAtConverted,
    taxableSupplyDateRaw: data.taxableSupplyDate,
    taxableSupplyDateConverted,
    dueDateRaw: data.dueDate,
    dueDateConverted,
  });
  
  return {
    id: docSnapshot.id,
    ...data,
    // Převést Timestamps na string
    createdAt: createdAtConverted,
    taxableSupplyDate: taxableSupplyDateConverted,
    dueDate: dueDateConverted,
    printedAt: convertTimestamp(data.printedAt, 'printedAt'),
    paidAt: convertTimestamp(data.paidAt, 'paidAt')
  } as Invoice;
}

/**
 * Načte všechny faktury (všechny pro admina, jen své pro běžného uživatele)
 */
export async function listInvoicesByUser(userId?: string): Promise<Invoice[]> {
  const currentUserId = userId || getCurrentUserId();
  const isAdmin = await isCurrentUserAdmin();
  
  let q;
  if (isAdmin && !userId) {
    // Admin vidí všechny faktury (pokud není specifikován userId)
    q = query(
      collection(db, COLLECTION_NAME),
      orderBy('createdAt', 'desc')
    );
  } else {
    // Běžný uživatel vidí jen své, nebo admin vidí faktury konkrétního uživatele
    q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', currentUserId),
      orderBy('createdAt', 'desc')
    );
  }
  
  const snapshot = await getDocs(q);
  const invoices = snapshot.docs.map(docToInvoice);
  
  return invoices;
}

/**
 * Načte nezaplacené faktury (status != 'paid' && status != 'cancelled')
 * POZNÁMKA: Firestore nepodporuje více než jeden != filtr, takže filtrujeme lokálně
 */
export async function listUnpaidInvoicesByUser(userId?: string): Promise<Invoice[]> {
  const currentUserId = userId || getCurrentUserId();
  const isAdmin = await isCurrentUserAdmin();
  
  let q;
  if (isAdmin && !userId) {
    // Admin vidí všechny faktury - filtrujeme lokálně
    q = query(
      collection(db, COLLECTION_NAME),
      orderBy('createdAt', 'desc')
    );
  } else {
    // Běžný uživatel vidí jen své faktury - filtrujeme lokálně
    q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', currentUserId),
      orderBy('createdAt', 'desc')
    );
  }
  
  const snapshot = await getDocs(q);
  const invoices = snapshot.docs.map(docToInvoice);
  
  // Filtrovat lokálně - vyloučit 'paid' a 'cancelled'
  return invoices.filter(invoice => 
    invoice.status !== 'paid' && invoice.status !== 'cancelled'
  );
}

/**
 * Načte jednu fakturu
 */
export async function getInvoice(invoiceId: string): Promise<Invoice | null> {
  const docRef = doc(db, COLLECTION_NAME, invoiceId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  return docToInvoice(docSnap);
}

/**
 * Vytvoří novou fakturu
 */
export async function createInvoice(invoiceData: Omit<Invoice, 'id'> & { id?: string }): Promise<string> {
  const userId = getCurrentUserId();
  
  // Vygenerovat human-readable ID (formát: I{YYYYMMDD}_{COUNTER})
  const invoiceId = invoiceData.id || await generateHumanReadableId('I', COLLECTION_NAME);
  
  const docRef = doc(db, COLLECTION_NAME, invoiceId);
  
  // Převést stringy na Timestamps pokud je potřeba
  const createdAt = invoiceData.createdAt instanceof Timestamp 
    ? invoiceData.createdAt 
    : Timestamp.fromDate(new Date(invoiceData.createdAt as string));
  
  const taxableSupplyDate = invoiceData.taxableSupplyDate instanceof Timestamp
    ? invoiceData.taxableSupplyDate
    : Timestamp.fromDate(new Date(invoiceData.taxableSupplyDate as string));
  
  const dueDate = invoiceData.dueDate instanceof Timestamp
    ? invoiceData.dueDate
    : Timestamp.fromDate(new Date(invoiceData.dueDate as string));
  
  console.log('[createInvoice] Converting dates:', {
    invoiceDataCreatedAt: invoiceData.createdAt,
    invoiceDataCreatedAtType: typeof invoiceData.createdAt,
    invoiceDataCreatedAtIsTimestamp: invoiceData.createdAt instanceof Timestamp,
    createdAtResult: createdAt.toDate().toISOString(),
    invoiceDataTaxableSupplyDate: invoiceData.taxableSupplyDate,
    taxableSupplyDateResult: taxableSupplyDate.toDate().toISOString(),
    invoiceDataDueDate: invoiceData.dueDate,
    dueDateResult: dueDate.toDate().toISOString(),
  });
  
  // Odstranit undefined hodnoty před uložením
  const cleanedData = removeUndefined({
    ...invoiceData,
    id: invoiceId,
    userId,
    createdAt,
    taxableSupplyDate,
    dueDate,
    language: invoiceData.language || 'cs',
    status: invoiceData.status || 'draft'
  });
  
  console.log('[createInvoice] Saving to Firestore:', {
    invoiceId,
    createdAt: cleanedData.createdAt?.toDate?.()?.toISOString() || cleanedData.createdAt,
    taxableSupplyDate: cleanedData.taxableSupplyDate?.toDate?.()?.toISOString() || cleanedData.taxableSupplyDate,
    dueDate: cleanedData.dueDate?.toDate?.()?.toISOString() || cleanedData.dueDate,
  });
  
  await setDoc(docRef, cleanedData);
  console.log('[createInvoice] Invoice saved successfully:', invoiceId);
  return invoiceId;
}

/**
 * Aktualizuje fakturu
 */
export async function updateInvoice(invoiceId: string, invoiceData: Partial<Invoice>): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, invoiceId);
  
  // Odstranit id z dat
  const { id, userId, createdAt, taxableSupplyDate, dueDate, ...dataToUpdate } = invoiceData as any;
  
  // Převést stringy na Timestamps pokud jsou v dataToUpdate
  const updateData: any = { ...dataToUpdate };
  
  if (dataToUpdate.createdAt && typeof dataToUpdate.createdAt === 'string') {
    updateData.createdAt = Timestamp.fromDate(new Date(dataToUpdate.createdAt));
  }
  if (dataToUpdate.taxableSupplyDate && typeof dataToUpdate.taxableSupplyDate === 'string') {
    updateData.taxableSupplyDate = Timestamp.fromDate(new Date(dataToUpdate.taxableSupplyDate));
  }
  if (dataToUpdate.dueDate && typeof dataToUpdate.dueDate === 'string') {
    updateData.dueDate = Timestamp.fromDate(new Date(dataToUpdate.dueDate));
  }
  if (dataToUpdate.paidAt && typeof dataToUpdate.paidAt === 'string') {
    updateData.paidAt = Timestamp.fromDate(new Date(dataToUpdate.paidAt));
  }
  
  // Použít userId z invoiceData, nebo aktuálního uživatele
  const finalUserId = userId || getCurrentUserId();
  
  // Odstranit undefined hodnoty před uložením
  const cleanedData = removeUndefined({
    ...updateData,
    userId: finalUserId // Explicitně zachovat userId (security rules vyžadují)
  });
  
  await updateDoc(docRef, cleanedData);
}

/**
 * Označí fakturu jako zaplacenou
 */
export async function markInvoiceAsPaid(invoiceId: string, paidAt?: Timestamp | string): Promise<void> {
  const paidAtTimestamp = paidAt 
    ? (paidAt instanceof Timestamp ? paidAt : Timestamp.fromDate(new Date(paidAt)))
    : Timestamp.now();
  
  await updateInvoice(invoiceId, {
    status: 'paid',
    paidAt: paidAtTimestamp
  });
}

/**
 * Stornuje fakturu
 */
export async function markInvoiceAsCancelled(invoiceId: string): Promise<void> {
  await updateInvoice(invoiceId, {
    status: 'cancelled'
  });
}

/**
 * Obnoví stornovanou fakturu (změní status zpět na issued)
 */
export async function restoreInvoice(invoiceId: string): Promise<void> {
  await updateInvoice(invoiceId, {
    status: 'issued'
  });
}

/**
 * Smaže fakturu
 */
export async function deleteInvoice(invoiceId: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, invoiceId);
  
  try {
    // Nejdřív zkontrolovat, jestli dokument existuje a získat data faktury
    const docSnapBefore = await getDoc(docRef);
    if (!docSnapBefore.exists()) {
      return; // Už neexistuje, považujeme za úspěch
    }
    
    const invoice = docToInvoice(docSnapBefore);
    
    // Smazat fakturu
    await deleteDoc(docRef);
    
    // Ověřit, že se skutečně smazal
    await new Promise(resolve => setTimeout(resolve, 500)); // Počkat 500ms
    const docSnapAfter = await getDoc(docRef);
    if (docSnapAfter.exists()) {
      throw new Error('Fakturu se nepodařilo smazat z Firestore');
    }
    
    // Zkontrolovat, jestli je potřeba snížit counter v číslování faktur
    try {
      await checkAndDecrementInvoiceCounter(invoice);
    } catch (error) {
      // Logovat chybu, ale nepřerušit mazání faktury
      console.error('[deleteInvoice] Chyba při kontrole counteru číslování:', error);
    }
  } catch (error: any) {
    // Pokud dokument neexistuje, ignorovat chybu (může být už smazán)
    if (error?.code === 'not-found' || error?.code === 'permission-denied') {
      // Pokud je to permission error, znovu vyhodit
      if (error?.code === 'permission-denied') {
        throw error;
      }
      // Pokud neexistuje, považujeme to za úspěch (už je smazán)
      return;
    }
    console.error('[deleteInvoice] Chyba při mazání:', error);
    throw error;
  }
}

/**
 * Pomocná funkce: Zkontroluje, jestli je smazaná faktura poslední v řadě a pokud ano, sníží counter
 */
async function checkAndDecrementInvoiceCounter(invoice: Invoice): Promise<void> {
  // Najít dodavatele podle IČO z faktury
  const { fetchSuppliers } = await import('./suppliers');
  const suppliers = await fetchSuppliers();
  const supplier = suppliers.find(s => s.supplier_ico === invoice.supplier.companyId);
  
  if (!supplier || !supplier.invoiceNumberingTypeId) {
    // Faktura nemá přiřazený typ číslování, není co dělat
    return;
  }
  
  const numberingTypeId = supplier.invoiceNumberingTypeId;
  
  // Načíst typ číslování
  const { fetchInvoiceNumberingType } = await import('./invoiceNumberingTypes');
  const numberingType = await fetchInvoiceNumberingType(numberingTypeId);
  
  if (!numberingType) {
    return;
  }
  
  // Najít všechny faktury s tímto prefixem (stejný typ číslování)
  const userId = getCurrentUserId();
  const isAdmin = await isCurrentUserAdmin();
  
  let invoicesQuery;
  if (isAdmin) {
    invoicesQuery = query(
      collection(db, COLLECTION_NAME),
      where('invoiceNumber', '>=', numberingType.prefix),
      where('invoiceNumber', '<', numberingType.prefix + '\uf8ff'), // Unicode trick pro prefix search
      orderBy('invoiceNumber', 'desc')
    );
  } else {
    invoicesQuery = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      where('invoiceNumber', '>=', numberingType.prefix),
      where('invoiceNumber', '<', numberingType.prefix + '\uf8ff'),
      orderBy('invoiceNumber', 'desc')
    );
  }
  
  const invoicesSnapshot = await getDocs(invoicesQuery);
  const invoices = invoicesSnapshot.docs.map(docToInvoice);
  
  // Filtrovat faktury, které skutečně patří k tomuto typu číslování (stejný prefix)
  const matchingInvoices = invoices.filter(inv => 
    inv.invoiceNumber.startsWith(numberingType.prefix)
  );
  
  if (matchingInvoices.length === 0) {
    // Nejsou žádné další faktury s tímto prefixem, můžeme snížit counter
    const { decrementInvoiceNumberingCounter } = await import('./invoiceNumberingTypes');
    await decrementInvoiceNumberingCounter(numberingTypeId);
    console.log('[deleteInvoice] Snížen counter číslování faktur:', numberingTypeId);
    return;
  }
  
  // Najít nejvyšší číslo faktury
  const invoiceNumbers = matchingInvoices.map(inv => {
    // Odstranit prefix a získat číselnou část
    const numberPart = inv.invoiceNumber.replace(numberingType.prefix, '');
    const number = parseInt(numberPart, 10);
    return { invoice: inv, number };
  });
  
  const maxInvoice = invoiceNumbers.reduce((max, current) => 
    current.number > max.number ? current : max
  , invoiceNumbers[0]);
  
  // Zjistit číslo smazané faktury
  const deletedInvoiceNumberPart = invoice.invoiceNumber.replace(numberingType.prefix, '');
  const deletedInvoiceNumber = parseInt(deletedInvoiceNumberPart, 10);
  
  // Pokud je smazaná faktura poslední (má nejvyšší číslo), snížit counter
  if (deletedInvoiceNumber >= maxInvoice.number) {
    const { decrementInvoiceNumberingCounter } = await import('./invoiceNumberingTypes');
    await decrementInvoiceNumberingCounter(numberingTypeId);
    console.log('[deleteInvoice] Snížen counter číslování faktur (byla smazána poslední faktura):', numberingTypeId);
  }
}

