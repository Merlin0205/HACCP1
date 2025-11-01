/**
 * PDF Service - používá Firebase Cloud Functions (Puppeteer)
 * MIGRACE NA FIREBASE CLOUD FUNCTIONS
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebaseConfig';

interface GeneratePDFOptions {
  format?: 'A4' | 'Letter';
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  printBackground?: boolean;
}

interface GeneratePDFRequest {
  html: string;
  options?: GeneratePDFOptions;
}

interface GeneratePDFResponse {
  pdf: string; // base64 encoded PDF
  contentType: string;
}

/**
 * Callable Cloud Function reference
 */
const generatePdfFunction = httpsCallable<GeneratePDFRequest, GeneratePDFResponse>(
  functions,
  'generatePdf'
);

export const generatePDF = async (
  html: string,
  options?: GeneratePDFOptions
): Promise<Blob> => {
  try {
    console.log('[PDF Service] Odesílání HTML na Cloud Functions pro generování PDF...');
    
    const result = await generatePdfFunction({
      html,
      options: {
        format: 'A4',
        margin: {
          top: '10mm',
          right: '6mm',
          bottom: '10mm',
          left: '6mm',
        },
        printBackground: true,
        ...options,
      },
    });

    // Převést base64 na Blob
    const pdfData = result.data.pdf;
    const binaryString = atob(pdfData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    console.log('[PDF Service] PDF úspěšně vygenerováno');
    return new Blob([bytes], { type: result.data.contentType || 'application/pdf' });
  } catch (error: any) {
    console.error('[PDF Service] Chyba:', error);
    const errorMessage = error.message || error.code || 'Chyba při generování PDF';
    throw new Error(errorMessage);
  }
};

export const downloadPDF = (blob: Blob, filename: string = 'report.pdf') => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  console.log('[PDF Service] PDF staženo:', filename);
};
