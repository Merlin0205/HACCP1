/**
 * Firestore service pro správu nastavení aplikace
 */

import {
  doc,
  getDoc,
  setDoc,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { AuditStructure, AuditorInfo } from '../../types';

const COLLECTION_NAME = 'settings';

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
 * Načte audit strukturu
 */
export async function fetchAuditStructure(): Promise<AuditStructure | null> {
  const docRef = doc(db, COLLECTION_NAME, 'auditStructure');
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  return docSnap.data() as AuditStructure;
}

/**
 * Uloží audit strukturu
 */
export async function saveAuditStructure(structure: AuditStructure): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, 'auditStructure');
  await setDoc(docRef, {
    ...structure,
    updatedAt: Timestamp.now()
  });
}

/**
 * Načte informace o auditorovi (user-specific)
 */
export async function fetchAuditorInfo(): Promise<AuditorInfo> {
  const userId = getCurrentUserId();
  const docRef = doc(db, 'users', userId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    // Vrátit výchozí hodnoty
    return {
      name: 'Bc. Sylva Polzer, hygienický konzultant',
      phone: '603 398 774',
      email: 'sylvapolzer@avlyspol.cz',
      web: 'www.avlyspol.cz'
    };
  }
  
  const data = docSnap.data();
  return data.auditorInfo || {
    name: 'Bc. Sylva Polzer, hygienický konzultant',
    phone: '603 398 774',
    email: 'sylvapolzer@avlyspol.cz',
    web: 'www.avlyspol.cz'
  };
}

/**
 * Uloží informace o auditorovi
 */
export async function saveAuditorInfo(auditorInfo: AuditorInfo): Promise<void> {
  const userId = getCurrentUserId();
  const docRef = doc(db, 'users', userId);
  
  await setDoc(docRef, {
    auditorInfo,
    updatedAt: Timestamp.now()
  }, { merge: true });
}

/**
 * Načte AI report config
 */
export async function fetchAIReportConfig(): Promise<any> {
  const docRef = doc(db, COLLECTION_NAME, 'aiReportConfig');
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    // Výchozí konfigurace
    return {
      staticPositiveReport: {
        evaluation_text: "Audit prokázal výborný hygienický stav provozovny.",
        key_findings: ["Všechny oblasti vyhovují"],
        key_recommendations: ["Udržovat standard"]
      },
      aiPromptTemplate: "Vygeneruj report pro tyto neshody: {{neshody}}",
      useAI: true
    };
  }
  
  return docSnap.data();
}

/**
 * Uloží AI report config
 */
export async function saveAIReportConfig(config: any): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, 'aiReportConfig');
  await setDoc(docRef, {
    ...config,
    updatedAt: Timestamp.now()
  });
}

/**
 * Načte AI pricing config
 */
export async function fetchAIPricingConfig(): Promise<any> {
  const docRef = doc(db, COLLECTION_NAME, 'aiPricingConfig');
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return {
      usdToCzk: 25,
      models: {
        'gemini-2.0-flash-exp': { inputPrice: 0, outputPrice: 0 },
        'gemini-2.5-flash': { inputPrice: 0.30, outputPrice: 2.50 }
      }
    };
  }
  
  return docSnap.data();
}

/**
 * Uloží AI pricing config
 */
export async function saveAIPricingConfig(config: any): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, 'aiPricingConfig');
  await setDoc(docRef, {
    ...config,
    updatedAt: Timestamp.now()
  });
}

/**
 * Načte AI models config
 */
export async function fetchAIModelsConfig(): Promise<any> {
  const docRef = doc(db, COLLECTION_NAME, 'aiModelsConfig');
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return {
      models: {
        'report-generation': 'gemini-2.0-flash-exp',
        'audio-transcription': 'gemini-2.0-flash-exp'
      }
    };
  }
  
  return docSnap.data();
}

/**
 * Uloží AI models config
 */
export async function saveAIModelsConfig(config: any): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, 'aiModelsConfig');
  await setDoc(docRef, {
    ...config,
    updatedAt: Timestamp.now()
  });
}

