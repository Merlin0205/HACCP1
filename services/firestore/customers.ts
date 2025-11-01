/**
 * Firestore service pro správu zákazníků (customers)
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { Customer } from '../../types';

const COLLECTION_NAME = 'customers';

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
 * Převede Firestore dokument na Customer objekt
 */
function docToCustomer(docSnapshot: any): Customer {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    ...data
  } as Customer;
}

/**
 * Načte všechny zákazníky aktuálního uživatele
 */
export async function fetchCustomers(): Promise<Customer[]> {
  const userId = getCurrentUserId();
  const q = query(
    collection(db, COLLECTION_NAME),
    where('userId', '==', userId),
    orderBy('premise_name')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToCustomer);
}

/**
 * Načte jednoho zákazníka
 */
export async function fetchCustomer(customerId: string): Promise<Customer | null> {
  const docRef = doc(db, COLLECTION_NAME, customerId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  return docToCustomer(docSnap);
}

/**
 * Vytvoří nového zákazníka
 */
export async function createCustomer(customerData: Omit<Customer, 'id'>): Promise<string> {
  const userId = getCurrentUserId();
  
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...customerData,
    userId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  
  return docRef.id;
}

/**
 * Aktualizuje zákazníka
 */
export async function updateCustomer(customerId: string, customerData: Partial<Customer>): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, customerId);
  
  // Odstranit id z dat
  const { id, userId, ...dataToUpdate } = customerData as any;
  
  // Použít userId z customerData, nebo aktuálního uživatele
  const finalUserId = userId || getCurrentUserId();
  
  await updateDoc(docRef, {
    ...dataToUpdate,
    userId: finalUserId, // Explicitně zachovat userId (security rules vyžadují)
    updatedAt: Timestamp.now()
  });
}

/**
 * Smaže zákazníka
 */
export async function deleteCustomer(customerId: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, customerId);
  await deleteDoc(docRef);
}

