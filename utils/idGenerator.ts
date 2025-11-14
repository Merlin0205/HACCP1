/**
 * Utility pro generování human-readable ID
 * Formát: {PREFIX}{YYYYMMDD}_{COUNTER}
 * 
 * Příklad: A20250811_0001, P20250811_0002, atd.
 */

import { collection, query, where, getDocs, Query } from 'firebase/firestore';
import { db } from '../firebaseConfig';

/**
 * Generuje human-readable ID s formátem: {PREFIX}{YYYYMMDD}_{COUNTER}
 * 
 * @param prefix Prefix entity (A=audit, P=premise, O=operator, F=photo, R=report, C=customer, S=supplier)
 * @param collectionName Název Firestore collection pro zjištění aktuálního counteru
 * @param customQuery Volitelný custom query pro filtrování dokumentů (např. podle userId)
 * @returns Human-readable ID
 */
export async function generateHumanReadableId(
  prefix: string,
  collectionName: string,
  customQuery?: Query
): Promise<string> {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const idPrefix = `${prefix}${dateStr}_`;
  
  try {
    // Použít custom query pokud je poskytnut, jinak vytvořit standardní query
    let q: Query;
    if (customQuery) {
      // Přidat filtry na ID k existujícímu query
      q = query(
        customQuery,
        where('id', '>=', idPrefix),
        where('id', '<', idPrefix + '\uf8ff')
      );
    } else {
      // Standardní query bez dalších filtrů
      q = query(
        collection(db, collectionName),
        where('id', '>=', idPrefix),
        where('id', '<', idPrefix + '\uf8ff')
      );
    }
    
    const snapshot = await getDocs(q);
    
    // Najít maximum counteru
    let maxCounter = 0;
    snapshot.forEach(doc => {
      const id = doc.data().id || doc.id;
      if (id.startsWith(idPrefix)) {
        const parts = id.split('_');
        if (parts.length >= 2) {
          const counterStr = parts[1];
          const counter = parseInt(counterStr, 10);
          if (!isNaN(counter) && counter > maxCounter) {
            maxCounter = counter;
          }
        }
      }
    });
    
    // Vrátit nové ID s counterem + 1
    const newCounter = maxCounter + 1;
    return `${idPrefix}${String(newCounter).padStart(4, '0')}`;
  } catch (error) {
    console.error(`[generateHumanReadableId] Chyba při generování ID pro ${prefix}:`, error);
    // Fallback na timestamp pokud selže dotaz
    return `${idPrefix}${String(1).padStart(4, '0')}`;
  }
}

