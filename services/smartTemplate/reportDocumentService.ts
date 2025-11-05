/**
 * ReportDocument Service - CRUD operace pro ReportDocument ve Storage
 */

import {
  ref,
  uploadBytes,
  getBytes,
  getDownloadURL
} from 'firebase/storage';
import { storage, auth } from '../../firebaseConfig';
import { ReportDocument } from '../../types/smartReport';
import { addSmartFinalVersion, updateReportSmartMetadata } from '../firestore/reports';
import { fetchUserMetadata } from '../firestore/users';

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
 * Uloží Smart Template draft do Storage
 */
export async function saveSmartDraft(
  reportId: string,
  document: ReportDocument
): Promise<string> {
  const userId = getCurrentUserId();
  const storagePath = `users/${userId}/reports/${reportId}/smart/drafts/lastSmartDraft.json`;
  
  const storageRef = ref(storage, storagePath);
  
  // Převést ReportDocument na JSON string
  const jsonString = JSON.stringify(document);
  const blob = new Blob([jsonString], { type: 'application/json' });
  
  await uploadBytes(storageRef, blob, {
    contentType: 'application/json',
    customMetadata: {
      reportId,
      userId,
      uploadedAt: new Date().toISOString(),
      type: 'smart-draft'
    }
  });
  
  // Aktualizovat Firestore metadata
  await updateReportSmartMetadata(reportId, {
    lastSmartDraftPath: storagePath
  });
  
  return storagePath;
}

/**
 * Načte Smart Template draft ze Storage
 */
export async function loadSmartDraft(reportId: string): Promise<ReportDocument | null> {
  const userId = getCurrentUserId();
  const storagePath = `users/${userId}/reports/${reportId}/smart/drafts/lastSmartDraft.json`;
  
  try {
    const storageRef = ref(storage, storagePath);
    const bytes = await getBytes(storageRef);
    const jsonString = new TextDecoder().decode(bytes);
    const document = JSON.parse(jsonString) as ReportDocument;
    return document;
  } catch (error: any) {
    if (error.code === 'storage/object-not-found') {
      return null;
    }
    throw error;
  }
}

/**
 * Uloží Smart Template finální verzi do Storage
 */
export async function saveSmartFinalVersion(
  reportId: string,
  document: ReportDocument
): Promise<string> {
  const userId = getCurrentUserId();
  
  // Vytvořit versionId (timestamp formát: YYYY-MM-DD-HHMM)
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const versionId = `${year}-${month}-${day}-${hours}${minutes}`;
  
  const storagePath = `users/${userId}/reports/${reportId}/smart/finalVersions/${versionId}/reportDocument.json`;
  
  const storageRef = ref(storage, storagePath);
  
  // Převést ReportDocument na JSON string
  const jsonString = JSON.stringify(document);
  const blob = new Blob([jsonString], { type: 'application/json' });
  
  await uploadBytes(storageRef, blob, {
    contentType: 'application/json',
    customMetadata: {
      reportId,
      userId,
      versionId,
      uploadedAt: new Date().toISOString(),
      type: 'smart-final-version'
    }
  });
  
  // Načíst displayName uživatele
  let createdByName = 'Neznámý';
  try {
    const userMetadata = await fetchUserMetadata(userId);
    createdByName = userMetadata?.displayName || auth.currentUser?.displayName || 'Neznámý';
  } catch (error) {
    console.warn('[saveSmartFinalVersion] Chyba při načítání displayName:', error);
    createdByName = auth.currentUser?.displayName || 'Neznámý';
  }
  
  // Aktualizovat Firestore - přidat do finalVersions
  await addSmartFinalVersion(reportId, {
    versionId,
    reportPath: storagePath,
    createdAt: new Date().toISOString(),
    createdBy: userId,
    createdByName
  });
  
  return versionId;
}

/**
 * Načte Smart Template finální verzi ze Storage
 */
export async function loadSmartFinalVersion(
  reportId: string,
  versionId: string
): Promise<ReportDocument> {
  const userId = getCurrentUserId();
  const storagePath = `users/${userId}/reports/${reportId}/smart/finalVersions/${versionId}/reportDocument.json`;
  
  const storageRef = ref(storage, storagePath);
  const bytes = await getBytes(storageRef);
  const jsonString = new TextDecoder().decode(bytes);
  const document = JSON.parse(jsonString) as ReportDocument;
  
  return document;
}

/**
 * Načte seznam finálních verzí z Firestore metadata
 */
export async function listSmartFinalVersions(reportId: string): Promise<Array<{
  versionId: string;
  createdAt: string;
  createdBy: string;
  createdByName?: string;
}>> {
  const { fetchReport } = await import('../firestore/reports');
  const report = await fetchReport(reportId);
  
  if (!report || !report.smart?.finalVersions) {
    return [];
  }
  
  // Seřadit podle createdAt DESC (nejnovější první)
  return [...report.smart.finalVersions].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateB - dateA;
  });
}

/**
 * Získá download URL pro ReportDocument ze Storage
 */
export async function getReportDocumentUrl(storagePath: string): Promise<string> {
  const storageRef = ref(storage, storagePath);
  return await getDownloadURL(storageRef);
}


