/**
 * Firestore service pro správu provozovatelů
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
  orderBy
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { Operator } from '../../types';
import { fetchUserMetadata } from './users';

const COLLECTION_NAME = 'operators';

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
 * Převede Firestore dokument na Operator objekt
 */
function docToOperator(docSnapshot: any): Operator {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    ...data
  } as Operator;
}

/**
 * Načte všechny provozovatele (všechna pro admina, jen své pro běžného uživatele)
 */
export async function fetchOperators(): Promise<Operator[]> {
  const userId = getCurrentUserId();
  const isAdmin = await isCurrentUserAdmin();
  
  let q;
  if (isAdmin) {
    // Admin vidí všechny provozovatele
    q = query(
      collection(db, COLLECTION_NAME),
      orderBy('operator_name', 'asc')
    );
  } else {
    // Běžný uživatel vidí jen své
    q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('operator_name', 'asc')
    );
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToOperator);
}

/**
 * Načte jednoho provozovatele
 */
export async function fetchOperator(operatorId: string): Promise<Operator | null> {
  const docRef = doc(db, COLLECTION_NAME, operatorId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  return docToOperator(docSnap);
}

/**
 * Vytvoří nového provozovatele
 */
export async function createOperator(operatorData: Omit<Operator, 'id'> & { id?: string }): Promise<string> {
  const userId = getCurrentUserId();
  
  const operatorId = operatorData.id || `operator_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const docRef = doc(db, COLLECTION_NAME, operatorId);
  
  await setDoc(docRef, {
    ...operatorData,
    id: operatorId,
    userId,
    createdAt: new Date().toISOString()
  });
  
  return operatorId;
}

/**
 * Aktualizuje provozovatele
 */
export async function updateOperator(operatorId: string, operatorData: Partial<Operator>): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, operatorId);
  
  // Odstranit id z dat
  const { id, userId, ...dataToUpdate } = operatorData as any;
  
  const finalUserId = userId || getCurrentUserId();
  
  await updateDoc(docRef, {
    ...dataToUpdate,
    userId: finalUserId,
    updatedAt: new Date().toISOString()
  });
}

/**
 * Smaže provozovatele
 */
export async function deleteOperator(operatorId: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, operatorId);
  await deleteDoc(docRef);
}

