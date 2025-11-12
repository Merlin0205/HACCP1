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
// Všechna LLM volání používají Firebase AI Logic SDK na klientovi
// Cloud Functions se používají pouze pro:
// - PDF generování (Puppeteer)
// - HTML parsing bez LLM (Cheerio)
// - Fetch HTML stránky (kvůli CORS)

export { generatePdf } from './generatePdf';
export { generateSmartReportPdf } from './generateSmartReportPdf';
export { parseGeminiPricing } from './parseGeminiPricing';
export { fetchPricingPage } from './fetchPricingPage';

