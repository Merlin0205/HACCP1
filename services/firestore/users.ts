/**
 * Firestore service pro správu uživatelů
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { UserMetadata, UserRole } from '../../types';

const COLLECTION_NAME = 'users';

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
 * Převede Firestore dokument na UserMetadata objekt
 */
function docToUserMetadata(docSnapshot: any): UserMetadata {
  const data = docSnapshot.data();
  return {
    userId: docSnapshot.id,
    email: data.email,
    displayName: data.displayName,
    role: data.role || UserRole.USER,
    approved: data.approved || false,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
    approvedAt: data.approvedAt?.toDate?.()?.toISOString() || data.approvedAt,
    approvedBy: data.approvedBy
  };
}

/**
 * Zkontroluje jestli existuje nějaký uživatel v systému
 * POZNÁMKA: Tato funkce může selhat kvůli security rules, pokud uživatel není admin
 * Používejte ji opatrně - pro createUserMetadata používáme jednodušší logiku
 */
export async function checkIfFirstUser(): Promise<boolean> {
  try {
    const usersSnapshot = await getDocs(collection(db, COLLECTION_NAME));
    return usersSnapshot.empty;
  } catch (error) {
    // Pokud selže kvůli permissions, předpokládáme že není první (konzervativní přístup)
    console.warn('[checkIfFirstUser] Chyba při kontrole prvního uživatele:', error);
    return false;
  }
}

/**
 * Načte metadata uživatele
 */
export async function fetchUserMetadata(userId: string): Promise<UserMetadata | null> {
  const docRef = doc(db, COLLECTION_NAME, userId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  return docToUserMetadata(docSnap);
}

/**
 * Vytvoří user document při registraci
 * 
 * STRATEGIE: Pokud uživatel nemá dokument, vytvoříme ho jako admin (první uživatel).
 * Pokud už existuje, použijeme ten existující. Pokud se ukáže, že uživatel není první,
 * admin ho může změnit na user role.
 */
export async function createUserMetadata(
  userId: string,
  email: string,
  displayName: string
): Promise<void> {
  // Zkontrolovat jestli už dokument existuje
  const existingDoc = await fetchUserMetadata(userId);
  if (existingDoc) {
    // Dokument už existuje, nic neděláme
    return;
  }
  
  // Zkusit zjistit jestli je první uživatel (může selhat kvůli permissions)
  let isFirstUser = false;
  try {
    isFirstUser = await checkIfFirstUser();
  } catch (error) {
    // Pokud selže kvůli permissions, předpokládáme že je první uživatel
    // (konzervativní přístup - lepší mít admina než žádného)
    console.log('[createUserMetadata] Nelze ověřit jestli je první uživatel, předpokládáme že ano');
    isFirstUser = true;
  }
  
  const userData: any = {
    userId,
    email,
    displayName,
    role: isFirstUser ? UserRole.ADMIN : UserRole.USER,
    approved: isFirstUser, // První uživatel je automaticky schválen
    createdAt: Timestamp.now()
  };
  
  if (isFirstUser) {
    userData.approvedAt = Timestamp.now();
    userData.approvedBy = userId; // Schválil sám sebe
  }
  
  const docRef = doc(db, COLLECTION_NAME, userId);
  await setDoc(docRef, userData);
}

/**
 * Schválí uživatele (pouze admin)
 */
export async function approveUser(userId: string, approvedBy: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, userId);
  await updateDoc(docRef, {
    approved: true,
    approvedAt: Timestamp.now(),
    approvedBy
  });
}

/**
 * Změní roli uživatele (pouze admin)
 */
export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, userId);
  await updateDoc(docRef, {
    role
  });
}

/**
 * Načte všechny uživatele (pouze admin)
 * POZNÁMKA: Tato funkce může selhat kvůli security rules, pokud uživatel není admin
 */
export async function fetchAllUsers(): Promise<UserMetadata[]> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTION_NAME));
    return snapshot.docs.map(docToUserMetadata);
  } catch (error) {
    // Pokud selže kvůli permissions, vrátit prázdný seznam
    console.warn('[fetchAllUsers] Chyba při načítání uživatelů (pravděpodobně není admin):', error);
    return [];
  }
}

