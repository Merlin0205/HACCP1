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
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const hours = String(today.getHours()).padStart(2, '0');
  const minutes = String(today.getMinutes()).padStart(2, '0');
  const seconds = String(today.getSeconds()).padStart(2, '0');
  const milliseconds = String(today.getMilliseconds()).padStart(3, '0');

  // Generovat náhodný řetězec pro zajištění unikátnosti při paralelním nahrávání
  const randomStr = Math.random().toString(36).substring(2, 7);

  // Formát: F{YYYYMMDD}_{HHMMSS}_{MS}_{RANDOM}.{ext}
  // Tím zajistíme unikátnost i při rychlém paralelním nahrávání bez nutnosti číst Storage
  const dateStr = `${year}${month}${day}`;
  const timeStr = `${hours}${minutes}${seconds}`;

  const ext = fileExtension.toLowerCase().replace(/^\./, '');
  return `F${dateStr}_${timeStr}_${milliseconds}_${randomStr}.${ext}`;
}

