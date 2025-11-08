/**
 * Utility pro generování human-readable názvů fotek
 * Formát: F{YYYYMMDD}_{COUNTER}.jpg
 * 
 * Counter je per audit + den
 */

import { ref, listAll } from 'firebase/storage';
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
 * Generuje human-readable název fotky s formátem: F{YYYYMMDD}_{COUNTER}.jpg
 * Counter je per audit + den
 * 
 * @param auditId ID auditu
 * @param fileExtension Přípona souboru (jpg, png, atd.)
 * @returns Název souboru ve formátu F{YYYYMMDD}_{COUNTER}.{ext}
 */
export async function generatePhotoFilename(
  auditId: string,
  fileExtension: string = 'jpg'
): Promise<string> {
  const userId = getCurrentUserId();
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const filenamePrefix = `F${dateStr}_`;
  
  try {
    // Načíst všechny soubory ze Storage pro daný audit
    const folderPath = `users/${userId}/audits/${auditId}`;
    const folderRef = ref(storage, folderPath);
    
    let maxCounter = 0;
    
    try {
      const listResult = await listAll(folderRef);
      
      // Najít maximum counteru pro dnešní den
      listResult.items.forEach(item => {
        const fileName = item.name;
        if (fileName.startsWith(filenamePrefix)) {
          // Formát: F{YYYYMMDD}_{COUNTER}.{ext}
          const parts = fileName.split('_');
          if (parts.length >= 2) {
            const counterWithExt = parts[1];
            const counterStr = counterWithExt.split('.')[0];
            const counter = parseInt(counterStr, 10);
            if (!isNaN(counter) && counter > maxCounter) {
              maxCounter = counter;
            }
          }
        }
      });
    } catch (error: any) {
      // Pokud složka neexistuje, začneme od 1
      if (error.code !== 'storage/object-not-found') {
        console.warn('[generatePhotoFilename] Chyba při načítání fotek:', error);
      }
    }
    
    // Vrátit nový název s counterem + 1
    const newCounter = maxCounter + 1;
    const ext = fileExtension.toLowerCase().replace(/^\./, ''); // Odstranit tečku pokud je
    return `${filenamePrefix}${String(newCounter).padStart(4, '0')}.${ext}`;
  } catch (error) {
    console.error('[generatePhotoFilename] Chyba při generování názvu fotky:', error);
    // Fallback na timestamp pokud selže
    const timestamp = Date.now();
    const ext = fileExtension.toLowerCase().replace(/^\./, '');
    return `${filenamePrefix}${String(1).padStart(4, '0')}.${ext}`;
  }
}

