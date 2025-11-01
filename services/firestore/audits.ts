/**
 * Firestore service pro správu auditů
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
import { Audit } from '../../types';

const COLLECTION_NAME = 'audits';

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
 * Převede Firestore dokument na Audit objekt
 */
function docToAudit(docSnapshot: any): Audit {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    ...data,
    // Převést Timestamps na string
    createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
    completedAt: data.completedAt?.toDate?.()?.toISOString() || data.completedAt
  } as Audit;
}

/**
 * Načte všechny audity aktuálního uživatele
 */
export async function fetchAudits(): Promise<Audit[]> {
  const userId = getCurrentUserId();
  const q = query(
    collection(db, COLLECTION_NAME),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToAudit);
}

/**
 * Načte audity pro konkrétního zákazníka
 */
export async function fetchAuditsByCustomer(customerId: string): Promise<Audit[]> {
  const userId = getCurrentUserId();
  const q = query(
    collection(db, COLLECTION_NAME),
    where('userId', '==', userId),
    where('customerId', '==', customerId),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToAudit);
}

/**
 * Načte jeden audit
 */
export async function fetchAudit(auditId: string): Promise<Audit | null> {
  const docRef = doc(db, COLLECTION_NAME, auditId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  return docToAudit(docSnap);
}

/**
 * Vytvoří nový audit
 */
export async function createAudit(auditData: Omit<Audit, 'id'>): Promise<string> {
  const userId = getCurrentUserId();
  
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...auditData,
    userId,
    createdAt: auditData.createdAt || Timestamp.now().toDate().toISOString(),
    updatedAt: Timestamp.now()
  });
  
  return docRef.id;
}

/**
 * Aktualizuje audit
 */
export async function updateAudit(auditId: string, auditData: Partial<Audit>): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, auditId);
  
  // Odstranit id z dat
  const { id, ...dataToUpdate } = auditData as any;
  
  await updateDoc(docRef, {
    ...dataToUpdate,
    updatedAt: Timestamp.now()
  });
}

/**
 * Smaže audit
 */
export async function deleteAudit(auditId: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, auditId);
  await deleteDoc(docRef);
}

/**
 * Smaže všechny audity pro daného zákazníka
 */
export async function deleteAuditsByCustomer(customerId: string): Promise<void> {
  const audits = await fetchAuditsByCustomer(customerId);
  const deletePromises = audits.map(audit => deleteAudit(audit.id));
  await Promise.all(deletePromises);
}

