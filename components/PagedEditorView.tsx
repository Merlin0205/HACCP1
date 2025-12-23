/**
 * Paged Editor View - Vizuální editor se stránkováním A4
 * 
 * Zobrazuje obsah rozdělen do stránek A4 s možností:
 * - Vizuálního náhledu stránek
 * - Drag & drop přesouvání neshod a obrázků
 * - Živého výpočtu výšky a automatického rozdělení
 */

import React, { useState, useRef, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { EditableNonCompliance } from '../types/reportEditor';

interface PagedEditorViewProps {
  data: EditableNonCompliance[];
  onDataChange: (newData: EditableNonCompliance[]) => void;
  onTextEdit: (id: string, field: 'location' | 'finding' | 'recommendation', value: string) => void;
  onPhotoResize: (ncId: string, photoId: string, width: number) => void;
  onPhotoDelete: (ncId: string, photoId: string) => void;
  onPhotoColumnToggle?: (ncId: string, photoId: string, column: 1 | 2) => void;
}

// A4 rozměry v pixelech (při 96 DPI) - SYNCHRONIZOVÁNO s tiskem
const A4_WIDTH_PX = 210 * 3.7795; // 210mm × 3.7795 px/mm = ~794px
const A4_HEIGHT_PX = 297 * 3.7795; // 297mm × 3.7795 px/mm = ~1123px
const PAGE_MARGIN_HORIZONTAL = 23; // 6mm levý/pravý (~3% z šířky) ~ 23px
const PAGE_MARGIN_VERTICAL = 38; // 10mm horní/dolní ~ 38px
const PAGE_HEADER = 50; // nadpis stránky
const AVAILABLE_HEIGHT = A4_HEIGHT_PX - (PAGE_MARGIN_VERTICAL * 2) - PAGE_HEADER; // ~997px

interface Page {
  pageNumber: number;
  items: EditableNonCompliance[];
  estimatedHeight: number;
}

const PagedEditorView: React.FC<PagedEditorViewProps> = ({
  data,
  onDataChange,
  onTextEdit,
  onPhotoResize,
  onPhotoDelete,
  onPhotoColumnToggle,
}) => {
  const [photoLayoutMode, setPhotoLayoutMode] = useState<'stack' | 'grid'>('stack');
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedPage, setSelectedPage] = useState<number>(1);

  // Výpočet stránkování - přepočítat i když se změní layout mode
  useEffect(() => {
    const calculatedPages = calculatePages(data);
    setPages(calculatedPages);
  }, [data, photoLayoutMode]);

  // Algoritmus pro rozdělení na stránky - RESPEKTUJE pageBreakBefore
  const calculatePages = (items: EditableNonCompliance[]): Page[] => {
    const pagesArray: Page[] = [];
    let currentPage: Page = { pageNumber: 1, items: [], estimatedHeight: 0 };

    items.forEach((item, index) => {
      // Odhad výšky položky
      const itemHeight = estimateItemHeight(item);

      // PRIORITA 1: Respektovat manuální page break
      if (item.pageBreakBefore && currentPage.items.length > 0) {
        // Začít novou stránku kvůli pageBreakBefore
        pagesArray.push(currentPage);
        currentPage = {
          pageNumber: pagesArray.length + 1,
          items: [item],
          estimatedHeight: itemHeight,
        };
        return;
      }

      // PRIORITA 2: Automatické stránkování podle výšky (pouze pokud není pageBreak)
      // Ale NEaplikovat pokud je stránka prázdná (položka musí někam jít)
      const hasAnyPageBreaks = items.some(i => i.pageBreakBefore);
      if (!hasAnyPageBreaks &&
        currentPage.estimatedHeight + itemHeight > AVAILABLE_HEIGHT &&
        currentPage.items.length > 0) {
        // Přidáme novou stránku kvůli přetékání
        pagesArray.push(currentPage);
        currentPage = {
          pageNumber: pagesArray.length + 1,
          items: [item],
          estimatedHeight: itemHeight,
        };
      } else {
        // Přidat na aktuální stránku
        currentPage.items.push(item);
        currentPage.estimatedHeight += itemHeight;
      }
    });

    // Přidáme poslední stránku
    if (currentPage.items.length > 0) {
      pagesArray.push(currentPage);
    }

    return pagesArray.length > 0 ? pagesArray : [{ pageNumber: 1, items: [], estimatedHeight: 0 }];
  };

  // Odhad výšky neshody - VYLEPŠENÝ (synchronizovaný s PDF)
  const estimateItemHeight = (item: EditableNonCompliance): number => {
    let height = 0;

    // Nadpis neshody: ~40px
    height += 40;

    // Text pole - přesnější výpočet
    // Místo: ~2 řádky minimum
    const locationLines = Math.max(2, Math.ceil((item.location?.length || 0) / 80));
    height += locationLines * 18 + 25; // 18px per line + label

    // Zjištění: ~3 řádky minimum
    const findingLines = Math.max(3, Math.ceil((item.finding?.length || 0) / 80));
    height += findingLines * 18 + 25;

    // Doporučení: ~3 řádky minimum  
    const recommendationLines = Math.max(3, Math.ceil((item.recommendation?.length || 0) / 80));
    height += recommendationLines * 18 + 25;

    // Fotografie - OPRAVENÝ výpočet výšky
    if (item.photos.length > 0) {
      // Label "Fotografie (X):"
      height += 30;

      if (photoLayoutMode === 'grid' && item.photos.length > 1) {
        // Grid layout - 2 sloupce
        const rows = Math.ceil(item.photos.length / 2);
        const availableWidth = A4_WIDTH_PX - PAGE_MARGIN_HORIZONTAL * 2;
        const photoWidth = availableWidth * 0.48; // 48% width (grid)
        const photoHeight = photoWidth * 0.75; // aspect ratio 4:3
        // Controls (slider + buttons) = 80px, gap mezi řádky = 12px
        height += rows * (photoHeight + 80) + (rows - 1) * 12;
      } else {
        // Stack layout - pod sebou
        item.photos.forEach(photo => {
          const availableWidth = A4_WIDTH_PX - PAGE_MARGIN_HORIZONTAL * 2;
          const photoWidth = ((photo.width || 100) / 100) * availableWidth;
          const photoHeight = photoWidth * 0.75;
          // Controls (slider + buttons) = 80px, spacing = 12px
          height += photoHeight + 80 + 12;
        });
      }
    }

    // Extra spacing
    height += 30;

    return height;
  };

  // Drag & Drop handler - ZJEDNODUŠENO podle best practices
  const handleDragEnd = (result: DropResult) => {
    const { source, destination } = result;

    // Dropped outside the list or same position
    if (!destination ||
      (source.droppableId === destination.droppableId && source.index === destination.index)) {
      return;
    }

    // Přepočítat globální indexy z lokálních indexů na stránkách
    const sourcePage = pages.find(p => `page-${p.pageNumber}` === source.droppableId);
    const destPage = pages.find(p => `page-${p.pageNumber}` === destination.droppableId);

    if (!sourcePage || !destPage) return;

    // Globální index source itemu
    const sourceItem = sourcePage.items[source.index];
    if (!sourceItem) {
      console.error('Source item not found at index:', source.index);
      return;
    }
    const sourceGlobalIndex = data.findIndex(d => d.id === sourceItem.id);

    // Globální index pro destination
    let destGlobalIndex: number;

    if (destination.index === 0 && destPage.items.length === 0) {
      // Prázdná stránka - přidat na konec
      destGlobalIndex = data.length;
    } else if (destination.index === 0) {
      // Na začátek stránky - před první item
      destGlobalIndex = data.findIndex(d => d.id === destPage.items[0].id);
    } else if (destination.index >= destPage.items.length) {
      // Za poslední item na stránce
      const lastItem = destPage.items[destPage.items.length - 1];
      destGlobalIndex = data.findIndex(d => d.id === lastItem.id) + 1;
    } else {
      // Mezi itemy - před destination.index item
      const beforeItem = destPage.items[destination.index];
      destGlobalIndex = data.findIndex(d => d.id === beforeItem.id);
    }

    // Provést přesun
    const newData = Array.from(data);
    const [movedItem] = newData.splice(sourceGlobalIndex, 1);

    // Upravit destGlobalIndex pokud je vyšší než sourceGlobalIndex
    // (protože jsme už odstranili item z původní pozice)
    const finalDestIndex = destGlobalIndex > sourceGlobalIndex
      ? destGlobalIndex - 1
      : destGlobalIndex;

    newData.splice(finalDestIndex, 0, movedItem);

    console.log('Drag result:', {
      from: { page: sourcePage.pageNumber, localIndex: source.index, globalIndex: sourceGlobalIndex },
      to: { page: destPage.pageNumber, localIndex: destination.index, globalIndex: finalDestIndex },
      item: sourceItem.itemTitle
    });

    // AKTUALIZOVAT pageBreakBefore podle nové struktury stránek
    // Přepočítat kde by měly být page breaks po této změně
    const updatedData = newData.map((item, index) => {
      // První item nemá page break
      if (index === 0) {
        return { ...item, pageBreakBefore: false };
      }

      // Zachovat existující page breaks, ale odstranit z přesunutého itemu
      // (bude mít nový page break podle nové pozice)
      if (item.id === movedItem.id) {
        // Pokud byl přesunut na začátek dest stránky a není to první item, nastavit pageBreakBefore
        const isFirstOnDestPage = destination.index === 0 && destPage.pageNumber > 1;
        return { ...item, pageBreakBefore: isFirstOnDestPage };
      }

      return item;
    });

    onDataChange(updatedData);
  };

  return (
    <div className="flex h-full">
      {/* Levý panel - Page Navigator */}
      <div className="w-48 bg-gray-100 border-r border-gray-300 p-4 overflow-y-auto">
        <h3 className="font-bold text-sm mb-3">Stránky</h3>
        <div className="space-y-2">
          {pages.map((page) => (
            <button
              key={page.pageNumber}
              onClick={() => setSelectedPage(page.pageNumber)}
              className={`w-full text-left p-3 rounded-lg transition-colors ${selectedPage === page.pageNumber
                  ? 'bg-blue-600 text-white'
                  : 'bg-white hover:bg-gray-50 border border-gray-200'
                }`}
            >
              <div className="font-semibold text-sm">Stránka {page.pageNumber}</div>
              <div className="text-xs mt-1 opacity-80">
                {page.items.length} {page.items.length === 1 ? 'položka' : 'položky'}
              </div>
              <div className="text-xs mt-1">
                <div className="bg-white/20 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-white h-full"
                    style={{ width: `${(page.estimatedHeight / AVAILABLE_HEIGHT) * 100}%` }}
                  />
                </div>
                <span className="opacity-70">
                  {Math.round((page.estimatedHeight / AVAILABLE_HEIGHT) * 100)}%
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 p-3 bg-blue-50 rounded-lg text-xs">
          <div className="font-semibold text-blue-900 mb-2">💡 Tip</div>
          <p className="text-blue-800">
            Přetáhněte položky pro změnu pořadí a automatické přepočítání stránek.
          </p>
        </div>
      </div>

      {/* Hlavní editor - A4 stránky */}
      <div className="flex-1 overflow-y-auto bg-gray-200 p-8">
        <DragDropContext onDragEnd={handleDragEnd}>
          {pages.map((page) => (
            <div
              key={page.pageNumber}
              className={`mx-auto mb-8 bg-white shadow-2xl relative flex flex-col ${selectedPage === page.pageNumber ? 'ring-4 ring-blue-500' : ''
                }`}
              style={{
                width: `${A4_WIDTH_PX}px`,
                height: `${A4_HEIGHT_PX}px`,  /* Pevná výška - ne minHeight! */
                padding: `${PAGE_MARGIN_VERTICAL}px ${PAGE_MARGIN_HORIZONTAL}px`,
              }}
            >
              {/* Page Number Badge */}
              <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold z-10">
                Stránka {page.pageNumber}
              </div>

              {/* Droppable oblast pro položky - vyplňuje celou zbývající výšku */}
              <Droppable droppableId={`page-${page.pageNumber}`}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 ${snapshot.isDraggingOver ? 'bg-blue-50 border-2 border-dashed border-blue-400 rounded-lg' : ''
                      }`}
                    style={{ minHeight: '200px' }}  /* Minimální výška i pro prázdné stránky */
                  >
                    {page.items.map((item, index) => {
                      const globalIndex = data.findIndex(d => d.id === item.id);
                      return (
                        <Draggable key={item.id} draggableId={item.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`mb-6 pt-4 border-t ${snapshot.isDragging ? 'bg-blue-50 shadow-xl' : ''
                                }`}
                            >
                              {/* Drag Handle a Nadpis - kompaktní jako preview */}
                              <div className="flex items-center gap-2 mb-2">
                                <span
                                  {...provided.dragHandleProps}
                                  className="text-gray-400 text-sm cursor-move hover:text-blue-500"
                                  title="Přetáhnout"
                                >⋮⋮</span>
                                <h3 className="font-bold text-md">{globalIndex + 1}. {item.itemTitle}</h3>
                              </div>
                              <p className="text-xs text-gray-500 mb-2">Sekce: {item.sectionTitle}</p>

                              {/* Editable Fields - kompaktní styl jako preview s červeným borderem */}
                              <div className="pl-4 border-l-4 border-red-500 mb-4 space-y-1">
                                <p className="text-sm">
                                  <strong>Místo:</strong>{' '}
                                  <span
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={(e) => onTextEdit(item.id, 'location', e.currentTarget.textContent || '')}
                                    className="outline-none focus:bg-yellow-50 hover:bg-gray-50 inline-block min-w-[50px] cursor-text"
                                  >
                                    {item.location || '-'}
                                  </span>
                                </p>
                                <p className="text-sm">
                                  <strong>Zjištění:</strong>{' '}
                                  <span
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={(e) => onTextEdit(item.id, 'finding', e.currentTarget.textContent || '')}
                                    className="outline-none focus:bg-yellow-50 hover:bg-gray-50 inline-block min-w-[50px] cursor-text"
                                  >
                                    {item.finding || '-'}
                                  </span>
                                </p>
                                <p className="text-sm">
                                  <strong>Doporučení:</strong>{' '}
                                  <span
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={(e) => onTextEdit(item.id, 'recommendation', e.currentTarget.textContent || '')}
                                    className="outline-none focus:bg-yellow-50 hover:bg-gray-50 inline-block min-w-[50px] cursor-text"
                                  >
                                    {item.recommendation || '-'}
                                  </span>
                                </p>
                              </div>

                              {/* Fotografie */}
                              {item.photos.length > 0 && (
                                <div className="mt-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <label className="block text-xs font-semibold">
                                      Fotografie ({item.photos.length}):
                                    </label>
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => setPhotoLayoutMode('stack')}
                                        className={`text-xs px-2 py-1 rounded ${photoLayoutMode === 'stack'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                          }`}
                                        title="Pod sebou"
                                      >
                                        ☰
                                      </button>
                                      <button
                                        onClick={() => setPhotoLayoutMode('grid')}
                                        className={`text-xs px-2 py-1 rounded ${photoLayoutMode === 'grid'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                          }`}
                                        title="2 sloupce"
                                      >
                                        ☷
                                      </button>
                                    </div>
                                  </div>

                                  {/* Stack Layout (pod sebou) */}
                                  {photoLayoutMode === 'stack' && (
                                    <div className="space-y-3">
                                      {item.photos.map((photo) => (
                                        <div key={photo.id} className="border border-gray-200 rounded-lg p-2">
                                          <img
                                            src={`data:image/jpeg;base64,${photo.base64}`}
                                            alt="Neshoda"
                                            className="w-full h-auto rounded mb-2"
                                            style={{ maxWidth: `${photo.width || 100}%` }}
                                          />
                                          <div className="flex items-center gap-2">
                                            <label className="text-xs text-gray-600">Šířka:</label>
                                            <input
                                              type="range"
                                              min="30"
                                              max="100"
                                              value={photo.width || 100}
                                              onChange={(e) =>
                                                onPhotoResize(item.id, photo.id, parseInt(e.target.value))
                                              }
                                              className="flex-1"
                                            />
                                            <span className="text-xs font-semibold w-12">{photo.width || 100}%</span>
                                            <button
                                              onClick={() => onPhotoDelete(item.id, photo.id)}
                                              className="text-red-600 hover:text-red-800 text-xs font-bold px-2 py-1 rounded hover:bg-red-50"
                                            >
                                              🗑
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Grid Layout (2 sloupce) */}
                                  {photoLayoutMode === 'grid' && (
                                    <div className="grid grid-cols-2 gap-3">
                                      {item.photos.map((photo) => (
                                        <div key={photo.id} className="border border-gray-200 rounded-lg p-2">
                                          <img
                                            src={`data:image/jpeg;base64,${photo.base64}`}
                                            alt="Neshoda"
                                            className="w-full h-auto rounded mb-2"
                                          />
                                          <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1">
                                              <label className="text-xs text-gray-600">Šířka:</label>
                                              <input
                                                type="range"
                                                min="30"
                                                max="100"
                                                value={photo.width || 100}
                                                onChange={(e) =>
                                                  onPhotoResize(item.id, photo.id, parseInt(e.target.value))
                                                }
                                                className="flex-1"
                                              />
                                              <span className="text-xs font-semibold w-10">{photo.width || 100}%</span>
                                            </div>
                                            <button
                                              onClick={() => onPhotoDelete(item.id, photo.id)}
                                              className="text-red-600 hover:text-red-800 text-xs font-bold px-2 py-1 rounded hover:bg-red-50 w-full"
                                            >
                                              🗑 Smazat
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}

                    {/* VIZUÁLNÍ INDIKÁTOR zbývajícího místa */}
                    <div
                      className="mt-3 border-2 border-dashed rounded-lg flex items-center justify-center transition-all"
                      style={{
                        height: `${Math.max(80, AVAILABLE_HEIGHT - page.estimatedHeight)}px`,
                        backgroundColor: snapshot.isDraggingOver ? '#dbeafe' : '#f3f4f6',
                        borderColor: snapshot.isDraggingOver ? '#3b82f6' : '#d1d5db',
                      }}
                    >
                      <div className="text-center px-4">
                        <div className={`text-2xl font-bold ${snapshot.isDraggingOver ? 'text-blue-600' : 'text-gray-500'}`}>
                          {Math.max(0, Math.round((AVAILABLE_HEIGHT - page.estimatedHeight) / AVAILABLE_HEIGHT * 100))}%
                        </div>
                        <div className="text-sm mt-1 text-gray-600">
                          {Math.max(0, Math.round(AVAILABLE_HEIGHT - page.estimatedHeight))}px volného místa
                        </div>
                        {snapshot.isDraggingOver && (
                          <div className="text-xs mt-2 text-blue-600 font-medium animate-pulse">
                            👆 Pusťte položku zde
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Empty state */}
                    {page.items.length === 0 && (
                      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                        Prázdná stránka - přetáhněte sem položku
                      </div>
                    )}
                  </div>
                )}
              </Droppable>

              {/* Page Footer - Height indicator */}
              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center text-xs text-gray-500">
                <span>Stránka {page.pageNumber}</span>
                <span className={page.estimatedHeight > AVAILABLE_HEIGHT ? 'text-red-600 font-bold' : ''}>
                  {Math.round(page.estimatedHeight)}px / {AVAILABLE_HEIGHT}px
                  {page.estimatedHeight > AVAILABLE_HEIGHT && ' ⚠️ Přetečeno!'}
                </span>
              </div>
            </div>
          ))}
        </DragDropContext>
      </div>
    </div>
  );
};

export default PagedEditorView;
