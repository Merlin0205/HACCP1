/**
 * Firestore service pro správu míst neshod
 */

import {
  collection,
  doc,
  getDocs,
  addDoc,
  setDoc,
  query,
  where,
  orderBy,
  Timestamp,
  deleteDoc
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { fetchAudits } from './audits';

const COLLECTION_NAME = 'nonComplianceLocations';

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
 * Formátuje název místa: první písmeno velké, zbytek malé, odstraní tečku na konci
 */
function formatLocationName(name: string): string {
  if (!name) return '';
  // Odstranit tečku na konci a mezery
  let formatted = name.trim().replace(/\.+$/, '');
  if (!formatted) return '';
  // První písmeno velké, zbytek malé
  return formatted.charAt(0).toUpperCase() + formatted.slice(1).toLowerCase();
}

/**
 * Načte všechna místa neshod pro aktuálního uživatele
 * - z kolekce nonComplianceLocations
 * - ze všech existujících auditů (z nonComplianceData.location) - REAL-TIME
 * Vrátí objekt s dostupnými místy a místy používanými v jakémkoliv auditu (nelze smazat)
 */
export async function getNonComplianceLocations(): Promise<{ available: string[], usedInAudits: string[], onlyInCollection: string[] }> {
  try {
    const userId = getCurrentUserId();
    const locationsSet = new Set<string>();
    const usedInAuditsSet = new Set<string>();
    const collectionOnlySet = new Set<string>();
    
    // 1. Načíst místa z kolekce nonComplianceLocations
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', userId),
        orderBy('name', 'asc')
      );
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.name && data.name.trim()) {
          const formatted = formatLocationName(data.name);
          locationsSet.add(formatted);
          collectionOnlySet.add(formatted); // Zatím označit jako pouze v kolekci
        }
      });
    } catch (error) {
      console.error('[getNonComplianceLocations] Error loading from collection:', error);
      // Pokračovat dál, i když selže načtení z kolekce
    }
    
    // 2. Načíst místa ze všech existujících auditů (REAL-TIME procházení)
    // VŠECHNY audity - dokončené i nedokončené
    try {
      const audits = await fetchAudits();
      audits.forEach(audit => {
        if (audit.answers) {
          Object.values(audit.answers).forEach((answer: any) => {
            if (answer.nonComplianceData && Array.isArray(answer.nonComplianceData)) {
              answer.nonComplianceData.forEach((nc: any) => {
                if (nc.location && nc.location.trim()) {
                  const formatted = formatLocationName(nc.location);
                  if (formatted) {
                    locationsSet.add(formatted);
                    usedInAuditsSet.add(formatted); // Přidat do použité v auditech
                    collectionOnlySet.delete(formatted); // Odstranit z "pouze v kolekci" - je použito v auditu
                  }
                }
              });
            }
          });
        }
      });
    } catch (error) {
      console.error('[getNonComplianceLocations] Error loading from audits:', error);
      // Pokračovat dál, i když selže načtení z auditů
    }
    
    // Převést Set na pole a seřadit abecedně
    const locations = Array.from(locationsSet).sort((a, b) => 
      a.localeCompare(b, 'cs', { sensitivity: 'base' })
    );
    const usedLocations = Array.from(usedInAuditsSet).sort((a, b) => 
      a.localeCompare(b, 'cs', { sensitivity: 'base' })
    );
    const onlyInCollection = Array.from(collectionOnlySet).sort((a, b) => 
      a.localeCompare(b, 'cs', { sensitivity: 'base' })
    );
    
    return { available: locations, usedInAudits: usedLocations, onlyInCollection };
  } catch (error) {
    console.error('[getNonComplianceLocations] Error:', error);
    return { available: [], usedInAudits: [], onlyInCollection: [] };
  }
}

/**
 * Přidá nové místo neshody (pokud ještě neexistuje)
 */
export async function addNonComplianceLocation(locationName: string): Promise<void> {
  try {
    const userId = getCurrentUserId();
    const formattedName = formatLocationName(locationName);
    
    if (!formattedName) {
      return;
    }

    // Zkontrolovat, jestli už neexistuje (case-insensitive)
    const { available } = await getNonComplianceLocations();
    const exists = available.some(
      loc => loc.toLowerCase() === formattedName.toLowerCase()
    );
    
    if (exists) {
      return; // Už existuje, nemusíme přidávat
    }

    // Přidat nové místo
    await addDoc(collection(db, COLLECTION_NAME), {
      userId,
      name: formattedName,
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('[addNonComplianceLocation] Error:', error);
    throw error;
  }
}

/**
 * Najde nejbližší shodu místa v existujících místech (case-insensitive)
 */
export function findBestMatchLocation(transcribedText: string, existingLocations: string[]): string | null {
  // Odstranit tečku na konci a formátovat
  const formatted = transcribedText.trim().replace(/\.+$/, '').toLowerCase();
  
  if (!formatted) {
    return null;
  }

  // Přesná shoda (case-insensitive)
  const exactMatch = existingLocations.find(
    loc => loc.toLowerCase() === formatted
  );
  if (exactMatch) {
    return exactMatch;
  }

  // Částečná shoda - začíná shodně
  const startsWithMatch = existingLocations.find(
    loc => loc.toLowerCase().startsWith(formatted) || formatted.startsWith(loc.toLowerCase())
  );
  if (startsWithMatch) {
    return startsWithMatch;
  }

  // Částečná shoda - obsahuje
  const containsMatch = existingLocations.find(
    loc => loc.toLowerCase().includes(formatted) || formatted.includes(loc.toLowerCase())
  );
  if (containsMatch) {
    return containsMatch;
  }

  return null;
}

/**
 * Smaže místo neshody z kolekce nonComplianceLocations (pouze pokud není použito v auditech)
 */
export async function deleteNonComplianceLocation(locationName: string): Promise<void> {
  try {
    const userId = getCurrentUserId();
    const formattedName = formatLocationName(locationName);
    
    if (!formattedName) {
      return;
    }

    // Zkontrolovat, jestli je místo použito v jakémkoliv auditu (nelze smazat)
    const { usedInAudits } = await getNonComplianceLocations();
    if (usedInAudits.some(loc => loc.toLowerCase() === formattedName.toLowerCase())) {
      throw new Error('Nelze smazat místo, které je použito v existujících auditech');
    }

    // Najít a smazat všechny dokumenty s tímto názvem
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      where('name', '==', formattedName)
    );
    const querySnapshot = await getDocs(q);
    
    const deletePromises = querySnapshot.docs.map(docSnapshot => 
      deleteDoc(doc(db, COLLECTION_NAME, docSnapshot.id))
    );
    
    await Promise.all(deletePromises);
  } catch (error) {
    console.error('[deleteNonComplianceLocation] Error:', error);
    throw error;
  }
}

