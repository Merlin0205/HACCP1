import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { generateHumanReadableId } from '../../utils/idGenerator';
import { PriceItem } from '../../types/pricing';

const COLLECTION_NAME = 'pricing';

function getCurrentUserId(): string {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user.uid;
}

function docToPriceItem(docSnapshot: any): PriceItem {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    ...data,
    createdAt: data.createdAt?.toDate?.() || data.createdAt,
    updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
  } as PriceItem;
}

/**
 * Načte všechny ceníkové položky pro aktuálního uživatele
 */
export async function fetchPriceItems(): Promise<PriceItem[]> {
  const userId = getCurrentUserId();
  // Dočasně použít jednodušší dotaz bez orderBy, dokud se index nestaví
  // Po dokončení indexu můžeme přidat zpět orderBy('createdAt', 'desc')
  const q = query(
    collection(db, COLLECTION_NAME),
    where('userId', '==', userId)
  );
  
  const snapshot = await getDocs(q);
  const items = snapshot.docs.map(docToPriceItem);
  // Seřadit lokálně podle createdAt (desc)
  return items.sort((a, b) => {
    const aDate = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt as any)?.seconds || 0;
    const bDate = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt as any)?.seconds || 0;
    return bDate - aDate;
  });
}

/**
 * Načte jednu ceníkovou položku
 */
export async function fetchPriceItem(itemId: string): Promise<PriceItem | null> {
  const docRef = doc(db, COLLECTION_NAME, itemId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  return docToPriceItem(docSnap);
}

/**
 * Vytvoří novou ceníkovou položku
 */
export async function createPriceItem(data: Omit<PriceItem, 'id' | 'userId' | 'createdAt'>): Promise<string> {
  const userId = getCurrentUserId();
  const itemId = await generateHumanReadableId('PR', COLLECTION_NAME);
  
  await setDoc(doc(db, COLLECTION_NAME, itemId), {
    ...data,
    id: itemId,
    userId,
    createdAt: Timestamp.now(),
  });
  
  return itemId;
}

/**
 * Aktualizuje ceníkovou položku
 */
export async function updatePriceItem(itemId: string, data: Partial<Omit<PriceItem, 'id' | 'userId' | 'createdAt'>>): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, itemId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Smaže ceníkovou položku
 */
export async function deletePriceItem(itemId: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, itemId);
  await deleteDoc(docRef);
}

/**
 * Najde ceníkovou položku podle názvu (např. "audit")
 * Hledá case-insensitive - načte všechny aktivní položky a filtruje lokálně
 */
export async function findPriceItemByName(name: string): Promise<PriceItem | null> {
  const userId = getCurrentUserId();
  const q = query(
    collection(db, COLLECTION_NAME),
    where('userId', '==', userId),
    where('active', '==', true)
  );
  
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }
  
  // Filtrovat lokálně case-insensitive
  const items = snapshot.docs.map(docToPriceItem);
  const found = items.find(item => item.name.toLowerCase() === name.toLowerCase());
  
  return found || null;
}

