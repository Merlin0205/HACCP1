/**
 * SmartReportDesigner - vizuální editor pro úpravu ReportDocument
 */

import React, { useState } from 'react';
import { ReportDocument, Page, PageElement, TextContent, ImagesContent, TableContent } from '../../types/smartReport';
import { SmartReportRenderer } from './SmartReportRenderer';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { TextField, TextArea } from '../ui/Input';

interface SmartReportDesignerProps {
  document: ReportDocument;
  onDocumentUpdate: (document: ReportDocument) => void;
}

export const SmartReportDesigner: React.FC<SmartReportDesignerProps> = ({
  document,
  onDocumentUpdate
}) => {
  const [selectedElement, setSelectedElement] = useState<{ pageIndex: number; elementIndex: number } | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const handleTextEdit = (pageIndex: number, elementIndex: number, newText: string) => {
    const updatedDocument = { ...document };
    const element = updatedDocument.pages[pageIndex].elements[elementIndex];
    
    if (element.type === 'text') {
      (element.content as TextContent).text = newText;
      onDocumentUpdate(updatedDocument);
    }
  };

  const handleElementClick = (pageIndex: number, elementIndex: number) => {
    setSelectedElement({ pageIndex, elementIndex });
    setIsEditing(true);
  };

  const getSelectedElement = (): PageElement | null => {
    if (!selectedElement) return null;
    return document.pages[selectedElement.pageIndex].elements[selectedElement.elementIndex];
  };

  const selectedElementData = getSelectedElement();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Levý panel - Seznam sekcí */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <h5 className="font-semibold">Sekce</h5>
          </CardHeader>
          <CardBody>
            <div className="space-y-2">
              {document.pages.map((page, pageIndex) => (
                <div key={pageIndex} className="space-y-1">
                  <div className="font-semibold text-sm text-gray-700">
                    Stránka {page.pageNumber}
                  </div>
                  {page.elements.map((element, elementIndex) => (
                    <button
                      key={elementIndex}
                      onClick={() => handleElementClick(pageIndex, elementIndex)}
                      className={`w-full text-left px-2 py-1 text-xs rounded ${
                        selectedElement?.pageIndex === pageIndex && selectedElement?.elementIndex === elementIndex
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      {element.type === 'cover' && '📄 Úvodní stránka'}
                      {element.type === 'text' && '📝 Text'}
                      {element.type === 'images' && `🖼️ Obrázky (${(element.content as ImagesContent).images?.length || 0})`}
                      {element.type === 'table' && `📊 Tabulka (${(element.content as TableContent).rows?.length || 0} řádků)`}
                      {element.type === 'pageBreak' && '📄 Konec stránky'}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Prostředek - PDF Preview */}
      <div className="lg:col-span-8">
        <Card>
          <CardBody>
            <SmartReportRenderer document={document} />
          </CardBody>
        </Card>
      </div>

      {/* Pravý panel - Vlastnosti */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <h5 className="font-semibold">Vlastnosti</h5>
          </CardHeader>
          <CardBody>
            {selectedElementData && selectedElementData.type === 'text' && (
              <div className="space-y-4">
                <TextArea
                  label="Text"
                  value={(selectedElementData.content as TextContent).text}
                  onChange={(e) => {
                    if (selectedElement) {
                      handleTextEdit(selectedElement.pageIndex, selectedElement.elementIndex, e.target.value);
                    }
                  }}
                  rows={10}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false);
                    setSelectedElement(null);
                  }}
                >
                  Zavřít
                </Button>
              </div>
            )}
            {selectedElementData && selectedElementData.type !== 'text' && (
              <div className="text-sm text-gray-600">
                <p>Typ: {selectedElementData.type}</p>
                {selectedElementData.type === 'images' && (
                  <p>Počet obrázků: {(selectedElementData.content as ImagesContent).images?.length || 0}</p>
                )}
                {selectedElementData.type === 'table' && (
                  <p>Řádků: {(selectedElementData.content as TableContent).rows?.length || 0}</p>
                )}
              </div>
            )}
            {!selectedElementData && (
              <p className="text-sm text-gray-500">Vyberte element pro úpravu</p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
};


