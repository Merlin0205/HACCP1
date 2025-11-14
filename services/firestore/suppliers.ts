/**
 * Firestore service pro správu dodavatelů
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
  where,
  orderBy
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { Supplier } from '../../types';
import { fetchUserMetadata } from './users';
import { generateHumanReadableId } from '../../utils/idGenerator';

const COLLECTION_NAME = 'suppliers';

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
 * Zkontroluje, jestli je aktuální uživatel admin
 */
async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    const userId = getCurrentUserId();
    const metadata = await fetchUserMetadata(userId);
    return metadata?.role === 'admin' && metadata?.approved === true;
  } catch {
    return false;
  }
}

/**
 * Převede Firestore dokument na Supplier objekt
 */
function docToSupplier(docSnapshot: any): Supplier {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    ...data
  } as Supplier;
}

/**
 * Načte všechny dodavatele (všechna pro admina, jen své pro běžného uživatele)
 */
export async function fetchSuppliers(): Promise<Supplier[]> {
  const userId = getCurrentUserId();
  const isAdmin = await isCurrentUserAdmin();
  
  let q;
  if (isAdmin) {
    // Admin vidí všechny dodavatele
    q = query(
      collection(db, COLLECTION_NAME),
      orderBy('supplier_name', 'asc')
    );
  } else {
    // Běžný uživatel vidí jen své
    q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('supplier_name', 'asc')
    );
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToSupplier);
}

/**
 * Načte jednoho dodavatele
 */
export async function fetchSupplier(supplierId: string): Promise<Supplier | null> {
  const docRef = doc(db, COLLECTION_NAME, supplierId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  return docToSupplier(docSnap);
}

/**
 * Načte výchozího dodavatele pro uživatele
 */
export async function fetchDefaultSupplier(userId?: string): Promise<Supplier | null> {
  const currentUserId = userId || getCurrentUserId();
  
  // Nejprve zkusit najít dodavatele s isDefault = true
  const defaultQ = query(
    collection(db, COLLECTION_NAME),
    where('userId', '==', currentUserId),
    where('isDefault', '==', true)
  );
  
  const defaultSnapshot = await getDocs(defaultQ);
  if (!defaultSnapshot.empty) {
    // Vrátit prvního výchozího dodavatele
    return docToSupplier(defaultSnapshot.docs[0]);
  }
  
  // Pokud není výchozí, vrátit prvního dodavatele uživatele
  const allQ = query(
    collection(db, COLLECTION_NAME),
    where('userId', '==', currentUserId),
    orderBy('supplier_name', 'asc')
  );
  
  const allSnapshot = await getDocs(allQ);
  if (allSnapshot.empty) {
    return null;
  }
  
  // Vrátit prvního dodavatele
  return docToSupplier(allSnapshot.docs[0]);
}

/**
 * Vytvoří nového dodavatele
 */
export async function createSupplier(supplierData: Omit<Supplier, 'id'> & { id?: string }): Promise<string> {
  const userId = getCurrentUserId();
  
  // Pokud je ID poskytnuto, použít ho (z lokálního state)
  // Jinak vygenerovat nové human-readable ID (formát: S{YYYYMMDD}_{COUNTER})
  // Pro generování ID použít dotaz s filtrem userId, aby pravidla fungovala správně
  let supplierId = supplierData.id;
  if (!supplierId) {
    // Vytvořit dotaz s filtrem userId pro idGenerator
    const idQuery = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId)
    );
    supplierId = await generateHumanReadableId('S', COLLECTION_NAME, idQuery);
  }
  
  const docRef = doc(db, COLLECTION_NAME, supplierId);
  
  // Pokud je nastaven jako výchozí, zrušit výchozí u ostatních dodavatelů uživatele
  if (supplierData.isDefault) {
    await unsetOtherDefaultSuppliers(userId);
  }
  
  await setDoc(docRef, {
    ...supplierData,
    id: supplierId,
    userId,
    createdAt: new Date().toISOString()
  });
  
  return supplierId;
}

/**
 * Aktualizuje dodavatele
 */
export async function updateSupplier(supplierId: string, supplierData: Partial<Supplier>): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, supplierId);
  
  // Odstranit id z dat
  const { id, userId, ...dataToUpdate } = supplierData as any;
  
  const finalUserId = userId || getCurrentUserId();
  
  // Pokud je nastaven jako výchozí, zrušit výchozí u ostatních dodavatelů uživatele
  if (supplierData.isDefault) {
    await unsetOtherDefaultSuppliers(finalUserId, supplierId);
  }
  
  await updateDoc(docRef, {
    ...dataToUpdate,
    userId: finalUserId,
    updatedAt: new Date().toISOString()
  });
}

/**
 * Smaže dodavatele
 */
export async function deleteSupplier(supplierId: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, supplierId);
  await deleteDoc(docRef);
}

/**
 * Nastaví dodavatele jako výchozího (zruší výchozí u ostatních)
 */
export async function setDefaultSupplier(supplierId: string): Promise<void> {
  const userId = getCurrentUserId();
  
  // Zrušit výchozí u ostatních dodavatelů
  await unsetOtherDefaultSuppliers(userId, supplierId);
  
  // Nastavit tohoto dodavatele jako výchozího
  const docRef = doc(db, COLLECTION_NAME, supplierId);
  await updateDoc(docRef, {
    isDefault: true,
    updatedAt: new Date().toISOString()
  });
}

/**
 * Zruší výchozí u ostatních dodavatelů uživatele
 */
async function unsetOtherDefaultSuppliers(userId: string, excludeSupplierId?: string): Promise<void> {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('userId', '==', userId),
    where('isDefault', '==', true)
  );
  
  const snapshot = await getDocs(q);
  const updates = snapshot.docs
    .filter(doc => doc.id !== excludeSupplierId)
    .map(doc => updateDoc(doc.ref, { isDefault: false }));
  
  await Promise.all(updates);
}

/**
 * Migruje dodavatele z BillingSettings do suppliers collection
 * Vytvoří prvního dodavatele z BillingSettings pokud ještě neexistují žádní dodavatelé
 */
export async function migrateSupplierFromBillingSettings(): Promise<Supplier | null> {
  const userId = getCurrentUserId();
  
  // Zkontrolovat, jestli už existují dodavatelé (přímo dotazem, ne přes fetchSuppliers aby se předešlo rekurzi)
  const q = query(
    collection(db, COLLECTION_NAME),
    where('userId', '==', userId),
    orderBy('supplier_name', 'asc')
  );
  const snapshot = await getDocs(q);
  
  if (snapshot.docs.length > 0) {
    // Už existují dodavatelé, nic nedělat
    return null;
  }
  
  // Načíst BillingSettings
  try {
    const { fetchBillingSettings } = await import('./billingSettings');
    const billingSettings = await fetchBillingSettings();
    
    if (!billingSettings || !billingSettings.supplier) {
      // Není nastaveno BillingSettings, nic nedělat
      return null;
    }
    
    // Vytvořit dodavatele z BillingSettings
    const supplierData: Omit<Supplier, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
      supplier_name: billingSettings.supplier.name || '',
      supplier_street: billingSettings.supplier.street || '',
      supplier_city: billingSettings.supplier.city || '',
      supplier_zip: billingSettings.supplier.zip || '',
      supplier_country: billingSettings.supplier.country || 'Česká republika',
      supplier_ico: billingSettings.supplier.companyId || '',
      supplier_dic: billingSettings.supplier.vatId,
      supplier_statutory_body: '',
      supplier_phone: billingSettings.supplier.phone,
      supplier_email: billingSettings.supplier.email,
      supplier_website: billingSettings.supplier.website,
      supplier_iban: billingSettings.supplier.iban,
      supplier_bankAccount: billingSettings.supplier.bankAccount,
      supplier_swift: billingSettings.supplier.swift,
      supplier_logoUrl: billingSettings.supplier.logoUrl,
      isDefault: true // První dodavatel je automaticky výchozí
    };
    
    const supplierId = await createSupplier(supplierData);
    const newSupplier: Supplier = {
      id: supplierId,
      userId,
      ...supplierData,
      createdAt: new Date().toISOString()
    };
    
    console.log('[migrateSupplierFromBillingSettings] Vytvořen první dodavatel z BillingSettings:', supplierId);
    return newSupplier;
  } catch (error: any) {
    console.error('[migrateSupplierFromBillingSettings] Error migrating supplier:', error);
    // Nechceme vyhodit chybu, jen logovat
    return null;
  }
}

