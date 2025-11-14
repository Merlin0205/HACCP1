/**
 * Firestore service pro správu fakturačních nastavení
 */

import {
  doc,
  getDoc,
  setDoc,
  runTransaction,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { BillingSettings } from '../../types/invoice';

const COLLECTION_NAME = 'billingSettings';

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
 * Načte fakturační nastavení pro uživatele
 */
export async function fetchBillingSettings(userId?: string): Promise<BillingSettings | null> {
  const currentUserId = userId || getCurrentUserId();
  const docRef = doc(db, COLLECTION_NAME, currentUserId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  return docSnap.data() as BillingSettings;
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
 * Uloží fakturační nastavení pro uživatele
 */
export async function saveBillingSettings(settings: BillingSettings): Promise<void> {
  const userId = getCurrentUserId();
  const docRef = doc(db, COLLECTION_NAME, userId);
  
  // Odstranit undefined hodnoty před uložením
  const cleanedSettings = removeUndefined({
    ...settings,
    userId
  });
  
  await setDoc(docRef, cleanedSettings, { merge: true });
}

/**
 * Vygeneruje další číslo faktury podle číslování a inkrementuje nextNumber v transakci
 */
export async function generateNextInvoiceNumber(userId?: string): Promise<string> {
  const currentUserId = userId || getCurrentUserId();
  
  return runTransaction(db, async (transaction) => {
    const docRef = doc(db, COLLECTION_NAME, currentUserId);
    const docSnap = await transaction.get(docRef);
    
    if (!docSnap.exists()) {
      throw new Error('Billing settings not found. Please configure billing settings first.');
    }
    
    const settings = docSnap.data() as BillingSettings;
    const { prefix, nextNumber, padding } = settings.invoiceNumbering;
    
    // Vygenerovat číslo faktury
    const paddedNumber = String(nextNumber).padStart(padding, '0');
    const invoiceNumber = prefix + paddedNumber;
    
    // Inkrementovat nextNumber
    const updatedSettings = {
      ...settings,
      invoiceNumbering: {
        ...settings.invoiceNumbering,
        nextNumber: nextNumber + 1
      }
    };
    
    // Uložit aktualizované nastavení
    transaction.set(docRef, updatedSettings);
    
    return invoiceNumber;
  });
}

/**
 * Inkrementuje číslo faktury v transakci (použito při vytvoření faktury)
 */
export async function incrementInvoiceNumber(userId?: string): Promise<void> {
  const currentUserId = userId || getCurrentUserId();
  
  await runTransaction(db, async (transaction) => {
    const docRef = doc(db, COLLECTION_NAME, currentUserId);
    const docSnap = await transaction.get(docRef);
    
    if (!docSnap.exists()) {
      throw new Error('Billing settings not found');
    }
    
    const settings = docSnap.data() as BillingSettings;
    const updatedSettings = {
      ...settings,
      invoiceNumbering: {
        ...settings.invoiceNumbering,
        nextNumber: settings.invoiceNumbering.nextNumber + 1
      }
    };
    
    transaction.set(docRef, updatedSettings);
  });
}

