/**
 * Cloud Functions for HACCP Audit Application
 * 
 * Tento soubor obsahuje všechny Firebase Cloud Functions
 * pro AI operace a backend logiku
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Inicializace Firebase Admin SDK
admin.initializeApp();

// Export všech functions
export { generateReport } from './generateReport';
export { transcribeAudio } from './transcribeAudio';
export { generatePdf } from './generatePdf';

