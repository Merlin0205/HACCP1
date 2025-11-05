/**
 * SmartReportRenderer - HTML renderer který používá STEJNÝ design jako Legacy report
 * 
 * POZNÁMKA: Tento renderer používá HTML/CSS místo @react-pdf/renderer pro preview,
 * aby report vypadal stejně jako Legacy report. @react-pdf/renderer se použije pouze pro PDF export.
 */

import React from 'react';
import { ReportDocument, PageElement, TextContent, ImagesContent, TableContent } from '../../types/smartReport';
import { Button } from '../ui/Button';

interface SmartReportRendererProps {
  document: ReportDocument;
  onDocumentUpdate?: (document: ReportDocument) => void;
}

/**
 * Renderuje textový element ve stejném stylu jako Legacy report
 */
const renderTextElement = (content: TextContent, index: number) => {
  const lines = content.text.split('\n');
  const isBold = content.style?.fontWeight === 'bold';
  const align = content.style?.align || 'left';
  const fontSize = content.style?.fontSize || 11;

  return (
    <div
      key={index}
      className={`mb-4 ${isBold ? 'font-bold' : ''}`}
      style={{
        textAlign: align,
        fontSize: `${fontSize}px`,
        lineHeight: 1.5
      }}
    >
      {lines.map((line, lineIdx) => (
        <React.Fragment key={lineIdx}>
          {line}
          {lineIdx < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </div>
  );
};

/**
 * Renderuje tabulku ve stejném stylu jako Legacy report
 */
const renderTableElement = (content: TableContent, index: number) => {
  const isSectionRow = (row: string[]) => row.length === 2 && row[1] === '';

  return (
    <table
      key={index}
      className="w-full border-collapse border border-gray-400 mb-8 text-sm"
    >
      <thead className="bg-gray-100">
        <tr>
          {content.headers.map((header, headerIdx) => (
            <th
              key={headerIdx}
              className="border border-gray-300 p-2 text-left"
              style={{ width: content.columnWidths?.[headerIdx] ? `${content.columnWidths[headerIdx]}px` : 'auto' }}
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {content.rows.map((row, rowIdx) => {
          if (isSectionRow(row)) {
            // Sekce řádek (bold, jako v Legacy)
            return (
              <tr key={rowIdx} className="bg-gray-50 print:break-inside-avoid-page">
                <td colSpan={content.headers.length} className="border border-gray-300 p-2 font-bold">
                  {row[0]}
                </td>
              </tr>
            );
          }

          return (
            <tr key={rowIdx} className="print:break-inside-avoid">
              {row.map((cell, cellIdx) => {
                const alignment = content.alignments?.[cellIdx] || 'left';
                const isStatus = cell === 'NEVYHOVUJE' || cell === 'Vyhovuje';
                const statusColor = cell === 'NEVYHOVUJE' ? 'text-red-600 font-bold' : 'text-green-600 font-bold';

                return (
                  <td
                    key={cellIdx}
                    className={`border border-gray-300 p-2 ${isStatus ? statusColor : ''}`}
                    style={{
                      textAlign: alignment === 'center' ? 'center' : alignment === 'right' ? 'right' : 'left'
                    }}
                  >
                    {cell}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

/**
 * Renderuje obrázky ve stejném stylu jako Legacy report
 */
const renderImagesElement = (content: ImagesContent, index: number) => {
  const perRow = content.perRow || 3;
  const gridCols = perRow === 1 ? 'grid-cols-1' : perRow === 2 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <div key={index} className={`mt-4 grid ${gridCols} gap-4`}>
      {content.images.map((img, imgIdx) => (
        <div key={img.id || imgIdx} className="photo-container">
          {img.base64 && (
            <img
              src={`data:image/jpeg;base64,${img.base64}`}
              alt={img.caption || 'Fotografie'}
              className="w-full h-auto rounded-md shadow-md border"
            />
          )}
          {img.caption && (
            <p className="text-xs text-gray-500 mt-2 text-center">{img.caption}</p>
          )}
        </div>
      ))}
    </div>
  );
};

/**
 * SmartReportRenderer - komponenta pro HTML preview (stejný design jako Legacy)
 */
export const SmartReportRenderer: React.FC<SmartReportRendererProps> = ({
  document,
  onDocumentUpdate
}) => {
  if (!document || !document.pages || document.pages.length === 0) {
    return (
      <div className="text-center p-12 bg-gray-50 rounded-lg">
        <p className="text-gray-600">Žádný dokument k zobrazení.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4 flex justify-between items-center print:hidden">
        <h4 className="text-lg font-semibold text-gray-900">Náhled reportu</h4>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => window.print()}
        >
          Tisk / Uložit do PDF
        </Button>
      </div>

      {/* Report HTML - STEJNÝ design jako Legacy */}
      <div className="bg-white p-8 md:p-12 font-sans text-sm print:p-0">
        {document.pages.map((page, pageIdx) => (
          <div key={pageIdx}>
            {page.elements.map((element, elemIdx) => {
              switch (element.type) {
                case 'text':
                  return renderTextElement(element.content as TextContent, elemIdx);
                case 'table':
                  return renderTableElement(element.content as TableContent, elemIdx);
                case 'images':
                  return renderImagesElement(element.content as ImagesContent, elemIdx);
                case 'pageBreak':
                  return (
                    <div
                      key={elemIdx}
                      className="print:break-before-page"
                      style={{ pageBreakBefore: 'always' }}
                    />
                  );
                default:
                  return null;
              }
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
