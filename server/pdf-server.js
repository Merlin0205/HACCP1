/**
 * PDF Generation Server
 * 
 * Standalone Express server for generating PDFs from HTML using Puppeteer.
 * Run this server separately: node server/pdf-server.js
 */

import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'pdf-generator' });
});

// PDF generation endpoint
app.post('/api/generate-pdf', async (req, res) => {
    try {
        const { html, title } = req.body;

        if (!html) {
            return res.status(400).json({ error: 'HTML content is required' });
        }

        console.log(`Generating PDF: ${title || 'Untitled'}`);

        // Launch Puppeteer
        const browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
            ],
        });

        const page = await browser.newPage();

        // Set content and wait for images/resources
        await page.setContent(html, {
            waitUntil: ['networkidle0', 'load'],
            timeout: 30000,
        });

        // Generate PDF
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20mm',
                right: '20mm',
                bottom: '20mm',
                left: '20mm',
            },
            preferCSSPageSize: true,
        });

        await browser.close();

        console.log(`PDF generated successfully: ${pdfBuffer.length} bytes`);

        // Send PDF
        res.contentType('application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${encodeURIComponent(title || 'report')}.pdf"`
        );
        res.send(pdfBuffer);

    } catch (error) {
        console.error('PDF generation failed:', error);
        res.status(500).json({
            error: 'PDF generation failed',
            message: error.message,
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`┌─────────────────────────────────────────┐`);
    console.log(`│  PDF Generation Server                  │`);
    console.log(`│  Running on http://localhost:${PORT}     │`);
    console.log(`└─────────────────────────────────────────┘`);
    console.log(`\nEndpoints:`);
    console.log(`  GET  /health            - Health check`);
    console.log(`  POST /api/generate-pdf  - Generate PDF from HTML\n`);
});
