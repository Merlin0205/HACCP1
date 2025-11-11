/**
 * Cloud Functions for HACCP Audit Application
 * 
 * Tento soubor obsahuje všechny Firebase Cloud Functions
 * pro AI operace a backend logiku
 * 
 * ⚠️ POZNÁMKA: Všechny AI operace byly migrovány na Firebase AI Logic SDK
 * a běží na klientovi. Cloud Functions jsou zachovány pouze pro zpětnou kompatibilitu.
 */

import * as admin from 'firebase-admin';

// Inicializace Firebase Admin SDK
admin.initializeApp();

// Export všech functions
// AI functions jsou deprecated - používají se SDK na klientovi
// export { generateReport } from './generateReport'; // DEPRECATED - používá se services/reports.ts
// export { transcribeAudio } from './transcribeAudio'; // DEPRECATED - používá se src/geminiService.ts
// export { analyzeImage } from './analyzeImage'; // DEPRECATED - používá se src/geminiService.ts
// export { generateText } from './generateText'; // DEPRECATED - nepoužívá se
// export { updateGeminiPrices } from './updateGeminiPrices'; // DEPRECATED - používá se services/firestore/priceUpdater.ts

// Aktivní functions (nepoužívají AI)
export { generatePdf } from './generatePdf';
export { generateSmartReportPdf } from './generateSmartReportPdf';
export { parseGeminiPricing } from './parseGeminiPricing';
export { fetchPricingPage } from './fetchPricingPage';

