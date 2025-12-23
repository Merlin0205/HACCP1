import React from 'react';
import { EditableNonCompliance } from '../types/reportEditor';
import { getAuditorInfo } from './AuditorSettingsScreen';

interface PrintableReportProps {
  title: string;
  date: string;
  auditor: string;
  nonCompliances: EditableNonCompliance[];
}

/**
 * WYSIWYG Printable Report - používá CSS @media print pro stránkování
 * Podle best practices z jak_na_to.md:
 * - Jednoduchý HTML/CSS přístup
 * - CSS page-break-before/after pro stránkování
 * - break-inside: avoid pro zachování integrity sekcí
 * - STEJNÝ vzhled v editoru i PDF
 */
export const PrintableReport: React.FC<PrintableReportProps> = ({
  title,
  date,
  auditor,
  nonCompliances
}) => {
  return (
    <div className="printable-report">
      <style>{`
        /* Print-specific styles */
        @media print {
          @page {
            size: A4;
            margin: 10mm 6mm;
          }
          
          body {
            margin: 0;
            padding: 0;
          }
          
          .page-break {
            page-break-before: always;
            break-before: page;
          }
          
          .avoid-break {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          .printable-report {
            width: 100%;
            max-width: 210mm;
          }
        }
        
        /* Screen preview styles - simulují print */
        .printable-report {
          font-family: 'Arial', sans-serif;
          max-width: 794px; /* A4 width at 96 DPI */
          margin: 0 auto;
          background: white;
          color: black;
        }
        
        .report-header {
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 2px solid #333;
        }
        
        .report-title {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 8px;
        }
        
        .report-meta {
          font-size: 12px;
          color: #666;
        }
        
        .non-compliance-item {
          margin-bottom: 20px;
          padding: 15px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        
        .item-title {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 10px;
          color: #c62828;
        }
        
        .item-section {
          margin-bottom: 12px;
        }
        
        .section-label {
          font-size: 11px;
          font-weight: bold;
          color: #666;
          margin-bottom: 4px;
        }
        
        .section-content {
          font-size: 12px;
          line-height: 1.5;
          white-space: pre-wrap;
        }
        
        .photos-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin-top: 10px;
        }
        
        .photos-stack {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 10px;
        }
        
        .photo-container {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        .photo-container img {
          width: 100%;
          height: auto;
          display: block;
          border-radius: 4px;
        }
      `}</style>

      {/* Report Header */}
      <div className="report-header avoid-break">
        <div className="report-title">{title}</div>
        <div className="report-meta">
          <div>Datum: {date}</div>
          <div>Auditor: {auditor}</div>
        </div>
      </div>

      {/* Non-compliances */}
      {nonCompliances.map((item, index) => (
        <div
          key={item.id}
          className={`non-compliance-item avoid-break ${item.pageBreakBefore ? 'page-break' : ''
            }`}
        >
          <div className="item-title">
            {index + 1}. {item.itemTitle}
          </div>

          {/* Místo */}
          {item.location && (
            <div className="item-section">
              <div className="section-label">Místo:</div>
              <div className="section-content">{item.location}</div>
            </div>
          )}

          {/* Zjištění */}
          {item.finding && (
            <div className="item-section">
              <div className="section-label">Zjištění:</div>
              <div className="section-content">{item.finding}</div>
            </div>
          )}

          {/* Doporučení */}
          {item.recommendation && (
            <div className="item-section">
              <div className="section-label">Doporučení:</div>
              <div className="section-content">{item.recommendation}</div>
            </div>
          )}

          {/* Fotografie */}
          {item.photos.length > 0 && (
            <div className="item-section">
              <div className="section-label">Fotografie ({item.photos.length}):</div>
              <div className={item.photos.length > 1 ? 'photos-grid' : 'photos-stack'}>
                {item.photos.map((photo) => (
                  <div key={photo.id} className="photo-container">
                    <img
                      src={`data:image/jpeg;base64,${photo.base64}`}
                      alt="Neshoda"
                      style={{ maxWidth: `${photo.width || 100}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

import { AuditorInfo } from '../types';

/**
 * Utility funkce pro generování HTML stringu pro Puppeteer
 */
export const generatePrintableHTML = (
  title: string,
  date: string,
  auditorInfo: AuditorInfo,
  nonCompliances: EditableNonCompliance[]
): string => {
  console.log('[PrintableReport] Používám údaje auditora:', auditorInfo);

  const escapeHtml = (text: string) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const itemsHTML = nonCompliances.map((item, index) => `
    <div class="non-compliance-item avoid-break ${item.pageBreakBefore ? 'page-break' : ''
    }">
      <div class="item-title">${index + 1}. ${escapeHtml(item.itemTitle)}</div>
      
      ${item.location ? `
        <div class="item-section">
          <div class="section-label">Místo:</div>
          <div class="section-content">${escapeHtml(item.location)}</div>
        </div>
      ` : ''}
      
      ${item.finding ? `
        <div class="item-section">
          <div class="section-label">Zjištění:</div>
          <div class="section-content">${escapeHtml(item.finding)}</div>
        </div>
      ` : ''}
      
      ${item.recommendation ? `
        <div class="item-section">
          <div class="section-label">Doporučení:</div>
          <div class="section-content">${escapeHtml(item.recommendation)}</div>
        </div>
      ` : ''}
      
      ${item.photos.length > 0 ? `
        <div class="item-section">
          <div class="section-label">Fotografie (${item.photos.length}):</div>
          <div class="${item.photos.length > 1 ? 'photos-grid' : 'photos-stack'}">
            ${item.photos.map(photo => `
              <div class="photo-container">
                <img 
                  src="data:image/jpeg;base64,${photo.base64}" 
                  alt="Neshoda"
                  style="max-width: ${photo.width || 100}%"
                />
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    @page {
      size: A4;
      margin: 10mm 6mm;
    }
    
    body {
      margin: 0;
      padding: 20px;
      font-family: 'Arial', sans-serif;
    }
    
    .page-break {
      page-break-before: always;
      break-before: page;
    }
    
    .avoid-break {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    
    .printable-report {
      max-width: 794px;
      margin: 0 auto;
      background: white;
      color: black;
    }
    
    .report-header {
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #333;
    }
    
    .report-title {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    
    .report-meta {
      font-size: 12px;
      color: #666;
    }
    
    .non-compliance-item {
      margin-bottom: 20px;
      padding: 15px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    
    .item-title {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 10px;
      color: #c62828;
    }
    
    .item-section {
      margin-bottom: 12px;
    }
    
    .section-label {
      font-size: 11px;
      font-weight: bold;
      color: #666;
      margin-bottom: 4px;
    }
    
    .section-content {
      font-size: 12px;
      line-height: 1.5;
      white-space: pre-wrap;
    }
    
    .photos-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin-top: 10px;
    }
    
    .photos-stack {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 10px;
    }
    
    .photo-container {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    
    .photo-container img {
      width: 100%;
      height: auto;
      display: block;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="printable-report">
    <div class="report-header avoid-break">
      <div class="report-title">${escapeHtml(title)}</div>
      <div class="report-meta">
        <div>Datum: ${escapeHtml(date)}</div>
      </div>
      <div style="margin-top: 12px; border-top: 1px solid #ddd; padding-top: 8px;">
        <div style="font-weight: bold; font-size: 12px; margin-bottom: 4px;">ZPRACOVATEL AUDITU</div>
        <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
          <tr>
            <th style="text-align: left; padding: 2px; font-weight: bold;">Auditor</th>
            <th style="text-align: left; padding: 2px; font-weight: bold;">Telefon</th>
            <th style="text-align: left; padding: 2px; font-weight: bold;">E-mail</th>
            <th style="text-align: left; padding: 2px; font-weight: bold;">Web</th>
          </tr>
          <tr>
            <td style="padding: 2px;">${escapeHtml(auditorInfo.name)}</td>
            <td style="padding: 2px;">${escapeHtml(auditorInfo.phone)}</td>
            <td style="padding: 2px;">${escapeHtml(auditorInfo.email)}</td>
            <td style="padding: 2px;">${escapeHtml(auditorInfo.web)}</td>
          </tr>
        </table>
      </div>
    </div>
    
    ${itemsHTML}
  </div>
</body>
</html>
  `;
};
