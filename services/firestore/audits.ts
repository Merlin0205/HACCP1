/**
 * Firestore service pro správu auditů
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { Audit } from '../../types';
import { generateHumanReadableId } from '../../utils/idGenerator';

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
 * Načte všechny audity (sdílený režim)
 */
export async function fetchAudits(): Promise<Audit[]> {
  const q = query(
    collection(db, COLLECTION_NAME),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  const audits = snapshot.docs.map(docToAudit);
  
  return audits;
}

/**
 * Načte audity pro konkrétní pracoviště
 */
export async function fetchAuditsByPremise(premiseId: string): Promise<Audit[]> {
  // Odstraněno orderBy, aby se předešlo požadavku na kompozitní index
  const q = query(
    collection(db, COLLECTION_NAME),
    where('premiseId', '==', premiseId)
  );
  
  const snapshot = await getDocs(q);
  const audits = snapshot.docs.map(docToAudit);
  // Seřadit lokálně pokud je potřeba (nejnovější první)
  return audits.sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });
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
 * POZNÁMKA: Používáme explicitní ID místo auto-generated ID, aby se zachovalo stejné ID jako v lokálním state
 */
export async function createAudit(auditData: Omit<Audit, 'id'> & { id?: string }): Promise<string> {
  const userId = getCurrentUserId();
  
  // Pokud je ID poskytnuto, použít ho (z lokálního state)
  // Jinak vygenerovat nové human-readable ID (formát: A{YYYYMMDD}_{COUNTER})
  const auditId = auditData.id || await generateHumanReadableId('A', COLLECTION_NAME);
  
  const docRef = doc(db, COLLECTION_NAME, auditId);
  
  // Použít setDoc s explicitním ID místo addDoc
  await setDoc(docRef, {
    ...auditData,
    id: auditId, // Explicitně uložit ID do dokumentu
    userId,
    createdAt: auditData.createdAt || Timestamp.now().toDate().toISOString(),
    updatedAt: Timestamp.now()
  });
  
  return auditId;
}

/**
 * Aktualizuje audit
 */
export async function updateAudit(auditId: string, auditData: Partial<Audit>): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, auditId);
  
  // Odstranit id z dat
  const { id, userId, ...dataToUpdate } = auditData as any;
  
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
  
  try {
    // Nejdřív zkontrolovat, jestli dokument existuje
    const docSnapBefore = await getDoc(docRef);
    if (!docSnapBefore.exists()) {
      return; // Už neexistuje, považujeme za úspěch
    }
    
    await deleteDoc(docRef);
    
    // Ověřit, že se skutečně smazal
    await new Promise(resolve => setTimeout(resolve, 500)); // Počkat 500ms
    const docSnapAfter = await getDoc(docRef);
    if (docSnapAfter.exists()) {
      throw new Error('Audit se nepodařilo smazat z Firestore');
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
    console.error('[deleteAudit] Chyba při mazání:', error);
    throw error;
  }
}

/**
 * Smaže všechny audity pro dané pracoviště
 */
export async function deleteAuditsByPremise(premiseId: string): Promise<void> {
  const audits = await fetchAuditsByPremise(premiseId);
  const deletePromises = audits.map(audit => deleteAudit(audit.id));
  await Promise.all(deletePromises);
}
