/**
 * Firestore service pro správu report templates (Smart Template šablony)
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
import { ReportTemplate } from '../../types';

const COLLECTION_NAME = 'reportTemplates';

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
 * Převede Firestore dokument na ReportTemplate objekt
 */
function docToReportTemplate(docSnapshot: any): ReportTemplate {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    ...data,
    // Převést Timestamps na string
    createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
  } as ReportTemplate;
}

/**
 * Načte všechny šablony
 */
export async function fetchReportTemplates(): Promise<ReportTemplate[]> {
  // Jednoduchá query bez orderBy - třídění v JavaScriptu
  const snapshot = await getDocs(collection(db, COLLECTION_NAME));
  const templates = snapshot.docs.map(docToReportTemplate);
  
  // Třídit v JavaScriptu: nejdřív default, pak podle názvu
  return templates.sort((a, b) => {
    // Default template má prioritu
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    // Pak podle názvu
    return a.name.localeCompare(b.name);
  });
}

/**
 * Načte jednu šablonu
 */
export async function fetchReportTemplate(templateId: string): Promise<ReportTemplate | null> {
  const docRef = doc(db, COLLECTION_NAME, templateId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  return docToReportTemplate(docSnap);
}

/**
 * Vytvoří novou šablonu
 */
export async function createReportTemplate(templateData: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const userId = getCurrentUserId();
  
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...templateData,
    createdBy: userId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  
  return docRef.id;
}

/**
 * Aktualizuje šablonu
 */
export async function updateReportTemplate(templateId: string, templateData: Partial<ReportTemplate>): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, templateId);
  
  // Odstranit id z dat
  const { id, createdBy, createdAt, ...dataToUpdate } = templateData as any;
  
  await updateDoc(docRef, {
    ...dataToUpdate,
    updatedAt: Timestamp.now()
  });
}

/**
 * Smaže šablonu
 */
export async function deleteReportTemplate(templateId: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, templateId);
  await deleteDoc(docRef);
}

/**
 * Načte default šablonu (pokud existuje)
 */
export async function fetchDefaultTemplate(): Promise<ReportTemplate | null> {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('isDefault', '==', true)
  );
  
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }
  
  // Třídit v JavaScriptu: nejnovější verze má prioritu
  const templates = snapshot.docs.map(docToReportTemplate);
  templates.sort((a, b) => {
    // Nejdřív podle verze (desc)
    const versionCompare = b.version.localeCompare(a.version);
    if (versionCompare !== 0) return versionCompare;
    // Pak podle data vytvoření (desc)
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateB - dateA;
  });
  
  // Vrátit první (nejnovější) default šablonu
  return templates[0];
}

