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
 * Migruje strukturu - aktualizuje "Mobil" na "Telefon"
 */
function migrateAuditStructure(structure: AuditStructure): { migrated: AuditStructure; needsUpdate: boolean } {
  let needsUpdate = false;
  const migratedStructure = JSON.parse(JSON.stringify(structure)); // Deep copy
  
  // Aktualizovat labely v header_data
  ['auditor', 'audited_premise', 'operator'].forEach(sectionKey => {
    if (migratedStructure.header_data?.[sectionKey]?.fields) {
      migratedStructure.header_data[sectionKey].fields.forEach((field: any) => {
        if (field.label === 'Mobil') {
          field.label = 'Telefon';
          needsUpdate = true;
        }
      });
    }
  });
  
  return { migrated: migratedStructure, needsUpdate };
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
  const types = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
    updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt
  })) as AuditType[];
  
  // Migrace: Aktualizovat všechny typy auditů, které mají "Mobil" v labelech
  const updatePromises = types.map(async (type) => {
    const { migrated, needsUpdate } = migrateAuditStructure(type.auditStructure);
    if (needsUpdate) {
      await updateAuditType(type.id, { auditStructure: migrated });
      return { ...type, auditStructure: migrated };
    }
    return type;
  });
  
  return Promise.all(updatePromises);
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
  const auditType = {
    id: docSnap.id,
    ...data,
    createdAt: data.createdAt?.toDate?.() || data.createdAt,
    updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
  } as AuditType;
  
  // Migrace: Aktualizovat strukturu pokud obsahuje "Mobil"
  const { migrated, needsUpdate } = migrateAuditStructure(auditType.auditStructure);
  if (needsUpdate) {
    await updateAuditType(auditTypeId, { auditStructure: migrated });
    return { ...auditType, auditStructure: migrated };
  }
  
  return auditType;
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
    reportTextNoNonCompliances: '',
    reportTextWithNonCompliances: '',
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
  updates: Partial<Pick<AuditType, 'name' | 'active' | 'auditStructure' | 'reportTextNoNonCompliances' | 'reportTextWithNonCompliances'>>
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
          reportTextNoNonCompliances: updates.reportTextNoNonCompliances ?? currentData.reportTextNoNonCompliances ?? '',
          reportTextWithNonCompliances: updates.reportTextWithNonCompliances ?? currentData.reportTextWithNonCompliances ?? '',
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

