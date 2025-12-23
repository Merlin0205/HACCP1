/**
 * Firestore service pro správu pracovišť
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
import { Premise } from '../../types';
import { generateHumanReadableId } from '../../utils/idGenerator';

const COLLECTION_NAME = 'premises';

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
 * Převede Firestore dokument na Premise objekt
 */
function docToPremise(docSnapshot: any): Premise {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    ...data
  } as Premise;
}

/**
 * Načte všechna pracoviště (sdílený režim)
 */
export async function fetchPremises(): Promise<Premise[]> {
  const q = query(
    collection(db, COLLECTION_NAME),
    orderBy('premise_name', 'asc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToPremise);
}

/**
 * Načte pracoviště pro konkrétního provozovatele
 */
export async function fetchPremisesByOperator(operatorId: string): Promise<Premise[]> {
  // Odstraněno orderBy, aby se předešlo požadavku na kompozitní index
  const q = query(
    collection(db, COLLECTION_NAME),
    where('operatorId', '==', operatorId)
  );
  
  const snapshot = await getDocs(q);
  const premises = snapshot.docs.map(docToPremise);
  // Seřadit lokálně pokud je potřeba (podle názvu vzestupně)
  return premises.sort((a, b) => {
    const nameA = a.premise_name || '';
    const nameB = b.premise_name || '';
    return nameA.localeCompare(nameB, 'cs');
  });
}

/**
 * Načte jedno pracoviště
 */
export async function fetchPremise(premiseId: string): Promise<Premise | null> {
  const docRef = doc(db, COLLECTION_NAME, premiseId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  return docToPremise(docSnap);
}

/**
 * Vytvoří nové pracoviště
 */
export async function createPremise(premiseData: Omit<Premise, 'id'> & { id?: string }): Promise<string> {
  const userId = getCurrentUserId();
  
  // Pokud je ID poskytnuto, použít ho (z lokálního state)
  // Jinak vygenerovat nové human-readable ID (formát: P{YYYYMMDD}_{COUNTER})
  const premiseId = premiseData.id || await generateHumanReadableId('P', COLLECTION_NAME);
  
  const docRef = doc(db, COLLECTION_NAME, premiseId);
  
  await setDoc(docRef, {
    ...premiseData,
    id: premiseId,
    userId,
    createdAt: new Date().toISOString()
  });
  
  return premiseId;
}

/**
 * Aktualizuje pracoviště
 */
export async function updatePremise(premiseId: string, premiseData: Partial<Premise>): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, premiseId);
  
  // Odstranit id z dat
  const { id, userId, ...dataToUpdate } = premiseData as any;

  await updateDoc(docRef, {
    ...dataToUpdate,
    updatedAt: new Date().toISOString()
  });
}

/**
 * Smaže pracoviště
 */
export async function deletePremise(premiseId: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, premiseId);
  await deleteDoc(docRef);
}

/**
 * Smaže všechna pracoviště pro daného provozovatele
 */
export async function deletePremisesByOperator(operatorId: string): Promise<void> {
  const premises = await fetchPremisesByOperator(operatorId);
  const deletePromises = premises.map(premise => deletePremise(premise.id));
  await Promise.all(deletePromises);
}
