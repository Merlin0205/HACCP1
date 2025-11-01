/**
 * Firebase Storage service pro správu fotek z auditů
 * 
 * Nahrazuje base64 ukládání do JSON souborů
 */

import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll
} from 'firebase/storage';
import { storage, auth } from '../firebaseConfig';

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
 * Nahraj fotku do Storage
 * 
 * @param auditId ID auditu
 * @param file Soubor k nahrání
 * @param index Index fotky (pro unikátní název)
 * @returns URL a storage path
 */
export async function uploadAuditPhoto(
  auditId: string,
  file: File,
  index: number
): Promise<{ url: string; storagePath: string }> {
  const userId = getCurrentUserId();
  const timestamp = Date.now();
  const fileName = `photo_${index}_${timestamp}.${file.name.split('.').pop()}`;
  const storagePath = `users/${userId}/audits/${auditId}/${fileName}`;
  
  const storageRef = ref(storage, storagePath);
  
  // Upload souboru
  await uploadBytes(storageRef, file, {
    contentType: file.type,
    customMetadata: {
      auditId,
      uploadedAt: new Date().toISOString()
    }
  });
  
  // Získat download URL
  const url = await getDownloadURL(storageRef);
  
  return { url, storagePath };
}

/**
 * Smaže fotku ze Storage
 * 
 * @param storagePath Cesta k souboru ve Storage
 */
export async function deleteAuditPhoto(storagePath: string): Promise<void> {
  const storageRef = ref(storage, storagePath);
  await deleteObject(storageRef);
}

/**
 * Smaže všechny fotky pro daný audit
 * 
 * @param auditId ID auditu
 */
export async function deleteAllAuditPhotos(auditId: string): Promise<void> {
  const userId = getCurrentUserId();
  const folderPath = `users/${userId}/audits/${auditId}`;
  const folderRef = ref(storage, folderPath);
  
  try {
    const listResult = await listAll(folderRef);
    const deletePromises = listResult.items.map(item => deleteObject(item));
    await Promise.all(deletePromises);
  } catch (error: any) {
    // Pokud složka neexistuje, není co mazat
    if (error.code !== 'storage/object-not-found') {
      throw error;
    }
  }
}

/**
 * Převede File na base64 string (pro preview před uploadem)
 * 
 * @param file Soubor k převedení
 * @returns Base64 string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Nahraje PDF report do Storage
 * 
 * @param reportId ID reportu
 * @param pdfBlob PDF jako Blob
 * @returns URL a storage path
 */
export async function uploadReportPdf(
  reportId: string,
  pdfBlob: Blob
): Promise<{ url: string; storagePath: string }> {
  const userId = getCurrentUserId();
  const timestamp = Date.now();
  const fileName = `report_${reportId}_${timestamp}.pdf`;
  const storagePath = `users/${userId}/reports/${fileName}`;
  
  const storageRef = ref(storage, storagePath);
  
  await uploadBytes(storageRef, pdfBlob, {
    contentType: 'application/pdf',
    customMetadata: {
      reportId,
      uploadedAt: new Date().toISOString()
    }
  });
  
  const url = await getDownloadURL(storageRef);
  
  return { url, storagePath };
}

/**
 * Smaže PDF report ze Storage
 * 
 * @param storagePath Cesta k souboru ve Storage
 */
export async function deleteReportPdf(storagePath: string): Promise<void> {
  const storageRef = ref(storage, storagePath);
  await deleteObject(storageRef);
}

