/**
 * AI Model Service
 * 
 * Správa dostupných modelů z Firebase AI Logic SDK
 * Synchronizuje seznam dostupných modelů a ukládá je do Firestore
 */

import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { listAvailableModels } from './aiLogic';
import { fetchAllGeminiModels, DEFAULT_GEMINI_MODELS } from './firestore/settings';

const COLLECTION_NAME = 'settings';
const DOC_ID = 'aiModelsList';

/**
 * Synchronizuje dostupné modely z Firebase AI Logic SDK
 * Poznámka: SDK nemá přímou metodu listModels(), použijeme výchozí modely
 */
export async function syncAvailableModels(): Promise<string[]> {
  try {
    // Firebase AI Logic SDK nemá přímou metodu listModels()
    // Použijeme výchozí modely z DEFAULT_GEMINI_MODELS
    const defaultModels = Object.keys(DEFAULT_GEMINI_MODELS);
    
    // Uložit do Firestore
    await setDoc(
      doc(db, COLLECTION_NAME, DOC_ID),
      {
        models: defaultModels,
        lastSync: Timestamp.now(),
        source: 'default',
      },
      { merge: true }
    );
    
    console.log(`[AI Model Service] ✅ Synchronizováno ${defaultModels.length} výchozích modelů`);
    return defaultModels;
  } catch (error) {
    console.error('[AI Model Service] Chyba při synchronizaci modelů:', error);
    // Fallback na výchozí modely
    return Object.keys(DEFAULT_GEMINI_MODELS);
  }
}

/**
 * Načte dostupné modely (z Firestore cache nebo SDK)
 */
export async function getAvailableModels(): Promise<string[]> {
  try {
    // Zkusit načíst z Firestore cache
    const docRef = doc(db, COLLECTION_NAME, DOC_ID);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      const lastSync = data.lastSync?.toDate();
      const now = new Date();
      
      // Pokud je cache starší než 24 hodin, aktualizovat
      if (lastSync && (now.getTime() - lastSync.getTime()) < 24 * 60 * 60 * 1000) {
        return data.models || [];
      }
    }
    
    // Synchronizovat z SDK
    return await syncAvailableModels();
  } catch (error) {
    console.error('[AI Model Service] Chyba při načítání modelů:', error);
    // Fallback na výchozí modely
    return Object.keys(DEFAULT_GEMINI_MODELS);
  }
}

/**
 * Zkontroluje, zda je model dostupný
 */
export async function isModelAvailable(modelName: string): Promise<boolean> {
  const availableModels = await getAvailableModels();
  return availableModels.includes(modelName);
}

