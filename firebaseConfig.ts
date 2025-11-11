/**
 * Firebase Configuration & Initialization
 * 
 * Tento soubor inicializuje Firebase SDK a exportuje instance
 * pro Firestore, Storage a Authentication
 */

import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

// Firebase configuration z environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Validace konfigurace
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error(
    'Firebase configuration is missing. Please check your .env file and ensure all VITE_FIREBASE_* variables are set.'
  );
}

// Inicializace Firebase
const app = initializeApp(firebaseConfig);

// Inicializace služeb
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'europe-west1'); // Region pro Cloud Functions

// Inicializace App Check (bez reCAPTCHA pro přihlášené uživatele)
// App Check se automaticky použije pro Firebase AI Logic SDK volání
if (import.meta.env.VITE_RECAPTCHA_SITE_KEY) {
  try {
    const appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
    console.log('[Firebase] ✅ App Check initialized');
  } catch (error) {
    console.warn('[Firebase] ⚠️  App Check initialization failed:', error);
    // App Check není kritické - aplikace může fungovat i bez něj
  }
} else {
  console.warn('[Firebase] ⚠️  App Check not configured - set VITE_RECAPTCHA_SITE_KEY in .env');
}

// Pro development s Firebase Emulators
// POZNÁMKA: Pro plné emulátory potřebujete Java JDK
// Prozatím můžete použít jen Functions emulátor (bez Java)
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
  // Functions emulátor (nevyžaduje Java)
  connectFunctionsEmulator(functions, 'localhost', 5001);
  console.log('[Firebase] ✅ Connected to LOCAL Functions emulator');
  
  // Pro Firestore/Auth emulátory potřebujete Java JDK
  // Pokud máte Java, odkomentujte tyto řádky:
  // connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  // connectFirestoreEmulator(db, 'localhost', 8080);
  // connectStorageEmulator(storage, 'localhost', 9199);
  console.log('[Firebase] ⚠️  Firestore/Auth používají PRODUKCI (pro emulátory nainstalujte Java JDK)');
}

export default app;

