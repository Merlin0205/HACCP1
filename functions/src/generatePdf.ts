/**
 * Cloud Function pro generování PDF pomocí Puppeteer
 * Migrace z server/index.js - endpoint /api/generate-pdf
 */

import * as functions from 'firebase-functions/v1';
import puppeteer from 'puppeteer';

/**
 * Callable Cloud Function pro generování PDF
 */
export const generatePdf = functions
  .region('europe-west1')
  .runWith({
    memory: '2GB',
    timeoutSeconds: 60
  })
  .https.onCall(async (data: any, context: functions.https.CallableContext) => {
    // Ověření autentifikace
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { html, options = {} } = data;

    if (!html) {
      throw new functions.https.HttpsError('invalid-argument', 'HTML content is required');
    }

    try {
      console.log('[generatePdf] Starting Puppeteer...');

      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();

      console.log('[generatePdf] Loading HTML content...');
      await page.setContent(html, {
        waitUntil: 'networkidle0'
      });

      console.log('[generatePdf] Generating PDF...');
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '0',
          right: '0',
          bottom: '0',
          left: '0'
        },
        printBackground: true,
        preferCSSPageSize: false,
        ...options
      });

      await browser.close();
      console.log('[generatePdf] PDF generated successfully');

      // Vrátit jako base64 string
      return {
        pdf: pdfBuffer.toString('base64'),
        contentType: 'application/pdf'
      };
    } catch (error: any) {
      console.error('[generatePdf] Error:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

