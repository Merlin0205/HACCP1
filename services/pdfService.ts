/**
 * PDF Service - používá Puppeteer backend podle best practices
 * Místo window.print() posíláme HTML na server kde Puppeteer generuje PDF
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:9002';

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

export const generatePDF = async (
  html: string,
  options?: GeneratePDFOptions
): Promise<Blob> => {
  try {
    console.log('[PDF Service] Odesílání HTML na server pro generování PDF...');
    
    const response = await fetch(`${API_BASE_URL}/api/generate-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
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
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Chyba při generování PDF');
    }

    console.log('[PDF Service] PDF úspěšně vygenerováno');
    return await response.blob();
  } catch (error) {
    console.error('[PDF Service] Chyba:', error);
    throw error;
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
