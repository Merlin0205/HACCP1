/**
 * Wraps HTML content in a complete HTML document with print-optimized CSS
 */
export function wrapInHtml(bodyContent: string, title: string): string {
    return `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    @page { 
      size: A4; 
      margin: 20mm; 
    }
    
    * {
      box-sizing: border-box;
    }
    
    body { 
      font-family: 'Segoe UI', 'Roboto', Arial, sans-serif;
      font-size: 11pt; 
      line-height: 1.6;
      color: #333;
      max-width: 210mm;
      margin: 0 auto;
      padding: 0;
    }
    
    h1 { 
      font-size: 24pt; 
      font-weight: 700;
      margin: 0 0 10mm; 
      color: #1a1a1a;
    }
    
    h2 { 
      font-size: 18pt; 
      font-weight: 600;
      margin: 8mm 0 4mm;
      color: #2a2a2a;
    }
    
    h3 { 
      font-size: 14pt; 
      font-weight: 600;
      margin: 6mm 0 3mm;
      color: #3a3a3a;
    }
    
    p { 
      margin: 0 0 3mm; 
    }
    
    hr {
      border: none;
      border-top: 1px solid #ddd;
      margin: 5mm 0;
    }
    
    table.yoopta-table {
      width: 100%;
      border-collapse: collapse;
      margin: 5mm 0;
      page-break-inside: avoid;
    }
    
    table.yoopta-table th,
    table.yoopta-table td {
      border: 1px solid #ddd;
      padding: 3mm 4mm;
      text-align: left;
      vertical-align: top;
    }
    
    table.yoopta-table th { 
      background: #f5f5f5; 
      font-weight: 600;
      font-size: 10pt;
    }
    
    table.yoopta-table td {
      font-size: 10pt;
    }
    
    .callout {
      padding: 4mm 5mm;
      margin: 4mm 0;
      border-radius: 2mm;
      border-left: 4px solid;
      page-break-inside: avoid;
    }
    
    .callout-success { 
      background: #e8f5e9; 
      border-color: #4caf50; 
    }
    
    .callout-error { 
      background: #ffebee; 
      border-color: #f44336; 
    }
    
    .callout-warning { 
      background: #fff3e0; 
      border-color: #ff9800; 
    }
    
    .callout-info { 
      background: #e3f2fd; 
      border-color: #2196f3; 
    }
    
    img { 
      max-width: 100%; 
      height: auto;
      display: block;
      margin: 5mm 0;
      page-break-inside: avoid;
    }
    
    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  ${bodyContent}
</body>
</html>`;
}

/**
 * Escapes HTML special characters
 */
function escapeHtml(text: string): string {
    const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}
