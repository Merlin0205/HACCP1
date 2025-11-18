/**
 * Firestore service pro správu typů číslování faktur
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
  runTransaction
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { InvoiceNumberingType } from '../../types';
import { fetchUserMetadata } from './users';
import { generateHumanReadableId } from '../../utils/idGenerator';

const COLLECTION_NAME = 'invoiceNumberingTypes';

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
 * Převede Firestore dokument na InvoiceNumberingType objekt
 */
function docToInvoiceNumberingType(docSnapshot: any): InvoiceNumberingType {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    ...data
  } as InvoiceNumberingType;
}

/**
 * Načte všechny typy číslování (všechny pro admina, jen své pro běžného uživatele)
 */
export async function fetchInvoiceNumberingTypes(): Promise<InvoiceNumberingType[]> {
  const userId = getCurrentUserId();
  const isAdmin = await isCurrentUserAdmin();
  
  let q;
  if (isAdmin) {
    // Admin vidí všechny typy číslování
    q = query(
      collection(db, COLLECTION_NAME),
      orderBy('name', 'asc')
    );
  } else {
    // Běžný uživatel vidí jen své
    q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('name', 'asc')
    );
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToInvoiceNumberingType);
}

/**
 * Načte jeden typ číslování
 */
export async function fetchInvoiceNumberingType(typeId: string): Promise<InvoiceNumberingType | null> {
  const docRef = doc(db, COLLECTION_NAME, typeId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  return docToInvoiceNumberingType(docSnap);
}

/**
 * Vytvoří nový typ číslování
 */
export async function createInvoiceNumberingType(
  typeData: Omit<InvoiceNumberingType, 'id' | 'userId' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<string> {
  const userId = getCurrentUserId();
  
  // Pokud je ID poskytnuto, použít ho (z lokálního state)
  // Jinak vygenerovat nové human-readable ID (formát: N{YYYYMMDD}_{COUNTER})
  let typeId = typeData.id;
  if (!typeId) {
    // Vytvořit dotaz s filtrem userId pro idGenerator
    const idQuery = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId)
    );
    typeId = await generateHumanReadableId('N', COLLECTION_NAME, idQuery);
  }
  
  const docRef = doc(db, COLLECTION_NAME, typeId);
  
  await setDoc(docRef, {
    ...typeData,
    id: typeId,
    userId,
    createdAt: new Date().toISOString()
  });
  
  return typeId;
}

/**
 * Aktualizuje typ číslování
 */
export async function updateInvoiceNumberingType(
  typeId: string,
  typeData: Partial<InvoiceNumberingType>
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, typeId);
  
  // Odstranit id z dat
  const { id, userId, ...dataToUpdate } = typeData as any;
  
  const finalUserId = userId || getCurrentUserId();
  
  await updateDoc(docRef, {
    ...dataToUpdate,
    userId: finalUserId,
    updatedAt: new Date().toISOString()
  });
}

/**
 * Smaže typ číslování
 */
export async function deleteInvoiceNumberingType(typeId: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, typeId);
  await deleteDoc(docRef);
}

/**
 * Vrátí preview čísla faktury podle typu číslování BEZ inkrementace (pouze pro zobrazení)
 */
export async function getInvoiceNumberPreview(typeId: string): Promise<string> {
  const docRef = doc(db, COLLECTION_NAME, typeId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    throw new Error('Invoice numbering type not found');
  }
  
  const type = docSnap.data() as InvoiceNumberingType;
  const { prefix, nextNumber, padding } = type;
  
  // Vygenerovat číslo faktury (bez inkrementace)
  const paddedNumber = String(nextNumber).padStart(padding, '0');
  return prefix + paddedNumber;
}

/**
 * Inkrementuje nextNumber v typu číslování (bez generování nového čísla)
 * Používá se když už máme číslo faktury (preview) a chceme jen inkrementovat čítač
 */
export async function incrementInvoiceNumberingCounter(typeId: string): Promise<void> {
  return runTransaction(db, async (transaction) => {
    const docRef = doc(db, COLLECTION_NAME, typeId);
    const docSnap = await transaction.get(docRef);
    
    if (!docSnap.exists()) {
      throw new Error('Invoice numbering type not found');
    }
    
    const type = docSnap.data() as InvoiceNumberingType;
    
    // Inkrementovat nextNumber
    const updatedType = {
      ...type,
      nextNumber: type.nextNumber + 1,
      updatedAt: new Date().toISOString()
    };
    
    // Uložit aktualizovaný typ
    transaction.set(docRef, updatedType);
  });
}

/**
 * Vygeneruje další číslo faktury podle typu číslování a inkrementuje nextNumber v transakci
 */
export async function generateNextInvoiceNumber(typeId: string): Promise<string> {
  return runTransaction(db, async (transaction) => {
    const docRef = doc(db, COLLECTION_NAME, typeId);
    const docSnap = await transaction.get(docRef);
    
    if (!docSnap.exists()) {
      throw new Error('Invoice numbering type not found');
    }
    
    const type = docSnap.data() as InvoiceNumberingType;
    const { prefix, nextNumber, padding } = type;
    
    // Vygenerovat číslo faktury
    const paddedNumber = String(nextNumber).padStart(padding, '0');
    const invoiceNumber = prefix + paddedNumber;
    
    // Inkrementovat nextNumber
    const updatedType = {
      ...type,
      nextNumber: nextNumber + 1,
      updatedAt: new Date().toISOString()
    };
    
    // Uložit aktualizovaný typ
    transaction.set(docRef, updatedType);
    
    return invoiceNumber;
  });
}

/**
 * Sníží nextNumber v typu číslování o 1 (používá se při mazání poslední faktury)
 */
export async function decrementInvoiceNumberingCounter(typeId: string): Promise<void> {
  return runTransaction(db, async (transaction) => {
    const docRef = doc(db, COLLECTION_NAME, typeId);
    const docSnap = await transaction.get(docRef);
    
    if (!docSnap.exists()) {
      throw new Error('Invoice numbering type not found');
    }
    
    const type = docSnap.data() as InvoiceNumberingType;
    
    // Snížit nextNumber (ale ne pod 1)
    const newNextNumber = Math.max(1, type.nextNumber - 1);
    
    const updatedType = {
      ...type,
      nextNumber: newNextNumber,
      updatedAt: new Date().toISOString()
    };
    
    // Uložit aktualizovaný typ
    transaction.set(docRef, updatedType);
  });
}

