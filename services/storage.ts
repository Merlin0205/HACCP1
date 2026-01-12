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
import { generatePhotoFilename } from '../utils/photoIdGenerator';
import { Report } from '../types';

/**
 * Nahraj logo dodavatele do Storage
 * 
 * @param supplierId ID dodavatele
 * @param file Soubor s logem
 * @returns URL loga
 */
export async function uploadSupplierLogo(
  supplierId: string,
  file: File
): Promise<string> {
  const userId = getCurrentUserId();

  // Získat příponu souboru
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'png';

  // Název souboru: logo.{ext}
  const fileName = `logo.${fileExtension}`;
  const storagePath = `suppliers/${supplierId}/${fileName}`;

  const storageRef = ref(storage, storagePath);

  // Upload souboru
  await uploadBytes(storageRef, file);

  // Získat download URL
  const url = await getDownloadURL(storageRef);

  return url;
}

/**
 * Nahraj razítko dodavatele do Storage
 * 
 * @param supplierId ID dodavatele
 * @param file Soubor s razítkem
 * @returns URL razítka
 */
export async function uploadSupplierStamp(
  supplierId: string,
  file: File
): Promise<string> {
  const userId = getCurrentUserId();

  // Získat příponu souboru
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'png';

  // Název souboru: stamp.{ext}
  const fileName = `stamp.${fileExtension}`;
  const storagePath = `suppliers/${supplierId}/${fileName}`;

  const storageRef = ref(storage, storagePath);

  // Upload souboru
  await uploadBytes(storageRef, file);

  // Získat download URL
  const url = await getDownloadURL(storageRef);

  return url;
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
 * Nahraj fotku do Storage
 * 
 * @param auditId ID auditu
 * @param file Soubor k nahrání
 * @param index Index fotky (nepoužívá se, zachován pro kompatibilitu)
 * @returns URL a storage path
 */
export async function uploadAuditPhoto(
  auditId: string,
  file: File,
  index: number
): Promise<{ url: string; storagePath: string }> {
  // Generovat human-readable název fotky (formát: F{YYYYMMDD}_{COUNTER}.{ext})
  const fileExtension = file.name.split('.').pop() || 'jpg';
  const fileName = await generatePhotoFilename(auditId, fileExtension);
  const storagePath = `audits/${auditId}/${fileName}`;

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
  const folderPath = `audits/${auditId}`;
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
  const timestamp = Date.now();
  const fileName = `report_${reportId}_${timestamp}.pdf`;
  const storagePath = `reports/${fileName}`;

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

/**
 * Nahraj razítko auditora do Storage (globální, nezávislé na uživateli)
 * 
 * @param file Soubor s razítkem
 * @returns URL razítka
 */
export async function uploadAuditorStamp(
  file: File
): Promise<string> {
  // Získat příponu souboru
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'png';

  // Název souboru: stamp.{ext}
  // Storage path: auditor/stamp.{ext} (globální, ne pod userId)
  const fileName = `stamp.${fileExtension}`;
  const storagePath = `auditor/${fileName}`;

  const storageRef = ref(storage, storagePath);

  // Upload souboru
  await uploadBytes(storageRef, file, {
    contentType: file.type,
    customMetadata: {
      uploadedAt: new Date().toISOString(),
      type: 'auditor_stamp'
    }
  });

  // Získat download URL
  const url = await getDownloadURL(storageRef);

  return url;
}

/**
 * Smaže razítko auditora ze Storage (globální)
 */
export async function deleteAuditorStamp(): Promise<void> {
  // Zkusit smazat všechny možné formáty razítka
  const extensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
  const deletePromises = extensions.map(async (ext) => {
    try {
      const storagePath = `auditor/stamp.${ext}`;
      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef);
    } catch (error: any) {
      // Ignorovat chyby pokud soubor neexistuje
      if (error.code !== 'storage/object-not-found') {
        throw error;
      }
    }
  });

  await Promise.all(deletePromises);
}


/**
 * Smaže všechny fyzické soubory spojené s reportem (PDF, koncepty)
 * 
 * @param report Report objekt
 */
export async function deleteAllReportFiles(report: Report): Promise<void> {
  const promises: Promise<void>[] = [];

  // 1. Smazat lastSmartDraftPath
  if (report.smart?.lastSmartDraftPath) {
    promises.push(
      deleteReportPdf(report.smart.lastSmartDraftPath)
        .catch(err => console.warn(`[deleteAllReportFiles] Failed to delete draft: ${report.smart?.lastSmartDraftPath}`, err))
    );
  }

  // 2. Smazat finalVersions
  if (report.smart?.finalVersions && Array.isArray(report.smart.finalVersions)) {
    report.smart.finalVersions.forEach(version => {
      // Smazat reportPath
      if (version.reportPath) {
        promises.push(
          deleteReportPdf(version.reportPath)
            .catch(err => console.warn(`[deleteAllReportFiles] Failed to delete reportPath: ${version.reportPath}`, err))
        );
      }
      // Smazat pdfPath
      if (version.pdfPath) {
        promises.push(
          deleteReportPdf(version.pdfPath)
            .catch(err => console.warn(`[deleteAllReportFiles] Failed to delete pdfPath: ${version.pdfPath}`, err))
        );
      }
    });
  }

  await Promise.all(promises);
}
