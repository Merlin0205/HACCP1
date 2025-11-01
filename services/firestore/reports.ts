/**
 * Firestore service pro správu reportů
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
import { Report } from '../../types';

const COLLECTION_NAME = 'reports';

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
 * Převede Firestore dokument na Report objekt
 */
function docToReport(docSnapshot: any): Report {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    ...data,
    // Převést Timestamps na string
    createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
    generatedAt: data.generatedAt?.toDate?.()?.toISOString() || data.generatedAt
  } as Report;
}

/**
 * Načte všechny reporty aktuálního uživatele
 */
export async function fetchReports(): Promise<Report[]> {
  const userId = getCurrentUserId();
  const q = query(
    collection(db, COLLECTION_NAME),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToReport);
}

/**
 * Načte report pro konkrétní audit
 */
export async function fetchReportByAudit(auditId: string): Promise<Report | null> {
  const userId = getCurrentUserId();
  const q = query(
    collection(db, COLLECTION_NAME),
    where('userId', '==', userId),
    where('auditId', '==', auditId)
  );
  
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return null;
  }
  
  return docToReport(snapshot.docs[0]);
}

/**
 * Načte jeden report
 */
export async function fetchReport(reportId: string): Promise<Report | null> {
  const docRef = doc(db, COLLECTION_NAME, reportId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  return docToReport(docSnap);
}

/**
 * Vytvoří nový report
 */
export async function createReport(reportData: Omit<Report, 'id'>): Promise<string> {
  const userId = getCurrentUserId();
  
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...reportData,
    userId,
    createdAt: reportData.createdAt || Timestamp.now().toDate().toISOString(),
    updatedAt: Timestamp.now()
  });
  
  return docRef.id;
}

/**
 * Aktualizuje report
 */
export async function updateReport(reportId: string, reportData: Partial<Report>): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, reportId);
  
  // Odstranit id z dat
  const { id, ...dataToUpdate } = reportData as any;
  
  await updateDoc(docRef, {
    ...dataToUpdate,
    updatedAt: Timestamp.now()
  });
}

/**
 * Smaže report
 */
export async function deleteReport(reportId: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, reportId);
  await deleteDoc(docRef);
}

/**
 * Smaže report pro daný audit
 */
export async function deleteReportByAudit(auditId: string): Promise<void> {
  const report = await fetchReportByAudit(auditId);
  if (report) {
    await deleteReport(report.id);
  }
}

/**
 * Smaže všechny reporty pro dané audity
 */
export async function deleteReportsByAuditIds(auditIds: string[]): Promise<void> {
  const userId = getCurrentUserId();
  const q = query(
    collection(db, COLLECTION_NAME),
    where('userId', '==', userId),
    where('auditId', 'in', auditIds.slice(0, 10)) // Firestore limit je 10
  );
  
  const snapshot = await getDocs(q);
  const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletePromises);
}

