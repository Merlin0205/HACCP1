/**
 * Firestore service pro správu typů auditů
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
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { AuditStructure } from '../../types';

const COLLECTION_NAME = 'auditTypes';

export interface AuditType {
  id: string;
  name: string;
  active: boolean;
  auditStructure: AuditStructure;
  createdAt: Timestamp | Date | string;
  updatedAt: Timestamp | Date | string;
}

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
 * Načte všechny typy auditů
 */
export async function fetchAllAuditTypes(): Promise<AuditType[]> {
  const q = query(
    collection(db, COLLECTION_NAME),
    orderBy('createdAt', 'asc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
    updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt
  })) as AuditType[];
}

/**
 * Načte pouze aktivní typy auditů
 */
export async function fetchActiveAuditTypes(): Promise<AuditType[]> {
  const allTypes = await fetchAllAuditTypes();
  return allTypes.filter(type => type.active);
}

/**
 * Načte konkrétní typ auditu
 */
export async function fetchAuditType(auditTypeId: string): Promise<AuditType | null> {
  const docRef = doc(db, COLLECTION_NAME, auditTypeId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    createdAt: data.createdAt?.toDate?.() || data.createdAt,
    updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
  } as AuditType;
}

/**
 * Vytvoří nový typ auditu
 */
export async function createAuditType(
  name: string,
  structure: AuditStructure,
  copyFromId?: string
): Promise<string> {
  // Generovat ID z názvu (slug)
  const id = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // odstranit diakritiku
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, ''); // odstranit úvodní/koncové podtržítka
  
  const docRef = doc(db, COLLECTION_NAME, id);
  
  // Pokud kopírujeme z existujícího typu, použít jeho strukturu
  let auditStructure = structure;
  if (copyFromId) {
    const sourceType = await fetchAuditType(copyFromId);
    if (sourceType) {
      auditStructure = sourceType.auditStructure;
    }
  }
  
  await setDoc(docRef, {
    id,
    name,
    active: true,
    auditStructure,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  
  return id;
}

/**
 * Aktualizuje typ auditu
 */
export async function updateAuditType(
  auditTypeId: string,
  updates: Partial<Pick<AuditType, 'name' | 'active' | 'auditStructure'>>
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, auditTypeId);
  
  const updateData: any = {
    ...updates,
    updatedAt: Timestamp.now()
  };
  
  // Pokud aktualizujeme název, aktualizovat i ID (vytvořit nový dokument a smazat starý)
  if (updates.name && updates.name !== auditTypeId) {
    const newId = updates.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    
    if (newId !== auditTypeId) {
      // Získat aktuální dokument
      const currentDoc = await getDoc(docRef);
      if (currentDoc.exists()) {
        const currentData = currentDoc.data();
        
        // Vytvořit nový dokument s novým ID
        const newDocRef = doc(db, COLLECTION_NAME, newId);
        await setDoc(newDocRef, {
          ...currentData,
          id: newId,
          name: updates.name,
          updatedAt: Timestamp.now()
        });
        
        // Smazat starý dokument
        await deleteDoc(docRef);
      }
      return;
    }
  }
  
  await updateDoc(docRef, updateData);
}

/**
 * Smaže typ auditu
 */
export async function deleteAuditType(auditTypeId: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, auditTypeId);
  await deleteDoc(docRef);
}

/**
 * Zkopíruje typ auditu
 */
export async function copyAuditType(
  sourceId: string,
  newName: string
): Promise<string> {
  const sourceType = await fetchAuditType(sourceId);
  if (!sourceType) {
    throw new Error(`Audit type with id ${sourceId} not found`);
  }
  
  return await createAuditType(newName, sourceType.auditStructure, sourceId);
}

/**
 * Migruje současný settings/auditStructure na první typ v auditTypes
 * Pokud už existuje typ "skolni_jidelna" nebo podobný, použije ho
 * Jinak vytvoří nový typ "Školní jídelny"
 */
export async function migrateAuditStructureToTypes(
  currentStructure: AuditStructure | null
): Promise<string | null> {
  if (!currentStructure) {
    return null;
  }
  
  // Zkontrolovat, jestli už existuje nějaký typ
  const existingTypes = await fetchAllAuditTypes();
  
  // Pokud už existují typy, použít první nebo najít "skolni_jidelna"
  if (existingTypes.length > 0) {
    const skolniJidelna = existingTypes.find(
      type => type.id === 'skolni_jidelna' || 
              type.name.toLowerCase().includes('školní') ||
              type.name.toLowerCase().includes('jideln')
    );
    
    if (skolniJidelna) {
      return skolniJidelna.id;
    }
    
    // Pokud neexistuje školní jídelna, použít první typ
    return existingTypes[0].id;
  }
  
  // Pokud neexistují žádné typy, vytvořit "Školní jídelny" z aktuální struktury
  const id = await createAuditType('Školní jídelny', currentStructure);
  return id;
}

