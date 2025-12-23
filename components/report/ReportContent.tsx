import React, { useState, useEffect, useMemo } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragOverlay,
    DragStartEvent
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Report, Audit, AuditStructure, AuditorInfo } from '../../types';
import { EditableNonCompliance, ReportEditorState, AuditorStamp } from '../../types/reportEditor';
import { EditableText } from '../ui/EditableText';
import { SortableItem } from './SortableItem';
import { NonComplianceItem } from './NonComplianceItem';
import { fetchAuditorInfo } from '../../services/firestore/settings';
import ConfirmationModal from '../ConfirmationModal';
import { DocumentDuplicateIcon } from '@heroicons/react/24/outline';

interface ReportContentProps {
    report: Report;
    audit: Audit;
    auditStructure: AuditStructure;
    editorState: ReportEditorState;
    setEditorState?: (state: ReportEditorState) => void;
    readOnly?: boolean;
    sensors?: any;
    handleDragEnd?: (event: DragEndEvent) => void;
    updateNonCompliance?: (id: string, updates: Partial<EditableNonCompliance>) => void;
    moveNonCompliance?: (id: string, direction: 'up' | 'down') => void;
    restoreAuditorStamp?: () => void;
    updateAuditorStamp?: (updates: Partial<{
        stampUrl?: string | null;
        stampAlignment?: 'left' | 'center' | 'right';
        stampWidth?: number;
        stampWidthRatio?: number;
        pageBreakBefore?: boolean;
        overlayEnabled?: boolean;
        overlayPageNumber?: number;
        overlayPosition?: { x: number; y: number };
    }>) => void;
}

// Stamp Item Component - stejná struktura jako NonComplianceItem
const StampItem: React.FC<{
    stamp: {
        stampUrl: string;
        stampAlignment?: 'left' | 'center' | 'right';
        stampWidthRatio?: number;
        pageBreakBefore?: boolean;
        overlayEnabled?: boolean;
        overlayPageNumber?: number;
        overlayPosition?: { x: number; y: number };
    };
    updateAuditorStamp: (updates: Partial<{
        stampUrl?: string | null;
        stampAlignment?: 'left' | 'center' | 'right';
        stampWidth?: number;
        stampWidthRatio?: number;
        pageBreakBefore?: boolean;
        overlayEnabled?: boolean;
        overlayPageNumber?: number;
        overlayPosition?: { x: number; y: number };
    }>) => void;
    readOnly?: boolean;
    pageBreakBefore?: boolean;
}> = ({ stamp, updateAuditorStamp, readOnly = false, pageBreakBefore = false }) => {
    const stampContainerRef = React.useRef<HTMLDivElement>(null);
    const [resizingStamp, setResizingStamp] = React.useState(false);
    const [showDeleteStampModal, setShowDeleteStampModal] = React.useState(false);

    const handleDeleteStamp = () => {
        setShowDeleteStampModal(true);
    };

    const confirmDeleteStamp = () => {
        updateAuditorStamp({ stampUrl: null });
        setShowDeleteStampModal(false);
    };

    return (
        <div className={`mb-6 pt-4 border-t border-gray-200 group/item relative ${readOnly ? '' : 'hover:bg-gray-50'}`}>
            {/* Gutter Controls - stejné jako u neshod */}
            {!readOnly && (
                <div className="absolute left-[-40px] top-4 flex flex-col gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity print:hidden z-50 w-8">
                    <button
                        onClick={() => updateAuditorStamp({ pageBreakBefore: !pageBreakBefore })}
                        className={`p-1.5 rounded shadow-sm border border-gray-200 flex justify-center ${pageBreakBefore ? 'bg-blue-100 text-blue-600 border-blue-300' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        title="Nová stránka před"
                    >
                        <DocumentDuplicateIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => updateAuditorStamp({
                            overlayEnabled: !stamp.overlayEnabled,
                            overlayPosition: stamp.overlayPosition || { x: 80, y: 120 }
                        })}
                        className={`p-1.5 rounded shadow-sm border border-gray-200 flex justify-center ${stamp.overlayEnabled ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        title={stamp.overlayEnabled ? 'Zrušit volné umístění (overlay)' : 'Volné umístění (overlay)'}
                    >
                        <span className="text-[10px] font-bold">↔</span>
                    </button>
                </div>
            )}

            {/* Page Break Indicator - stejné jako u neshod */}
            {pageBreakBefore && (
                <div className={`flex items-center gap-4 mb-4 ${readOnly ? 'print:break-before-page' : ''}`}>
                    {!readOnly && (
                        <>
                            <div className="h-px bg-blue-300 flex-1 border-dashed border-t border-blue-300"></div>
                            <span className="text-xs font-bold text-blue-500 uppercase tracking-wider bg-blue-50 px-2 py-1 rounded">Nová stránka</span>
                            <div className="h-px bg-blue-300 flex-1 border-dashed border-t border-blue-300"></div>
                        </>
                    )}
                </div>
            )}

            {/* Razítko obsah */}
            <div className="relative group/stamp" ref={stampContainerRef}>
                <div
                    className={`block -mx-2 mb-2 ${(stamp.stampAlignment || 'right') === 'center' ? 'text-center' : (stamp.stampAlignment || 'right') === 'right' ? 'text-right' : 'text-left'}`}
                >
                    <div
                        className="inline-block align-top relative px-2 mb-4 group/stampphoto transition-all duration-75 ease-out print:break-inside-avoid text-left"
                        style={{ width: `${Math.min(100, Math.max(10, (stamp.stampWidthRatio || 0.333) * 100))}%` }}
                    >
                        <div className="relative print:break-inside-avoid block">
                            <img
                                src={stamp.stampUrl}
                                alt="Razítko auditora"
                                className="mx-auto block w-full h-auto max-h-[180mm] print:break-inside-avoid"
                                draggable={false}
                            />

                            {/* Controls (Width & Alignment & Delete) */}
                            {!readOnly && (
                                <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover/stampphoto:opacity-100 transition-opacity print:hidden bg-white/90 rounded-lg shadow-sm border border-gray-200 p-1 z-10">
                                    {/* Delete Button */}
                                    {!showDeleteStampModal ? (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteStamp();
                                            }}
                                            className="p-1 rounded hover:bg-red-100 text-red-600 border-b border-gray-200 pb-1 mb-1"
                                            title="Smazat razítko"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    ) : (
                                        <div className="w-48 p-3 bg-white border-b border-gray-200 mb-1">
                                            <p className="text-xs text-gray-700 mb-2">Smazat razítko?</p>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        confirmDeleteStamp();
                                                    }}
                                                    className="flex-1 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                                >
                                                    Smazat
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setShowDeleteStampModal(false);
                                                    }}
                                                    className="flex-1 px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                                >
                                                    Zrušit
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {/* Šířku měníme plynule tažením za roh (viz resize handle) */}

                                    {/* Alignment Controls */}
                                    <div className="flex gap-1 justify-center border-t border-gray-200 pt-1 mt-1">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                updateAuditorStamp({ stampAlignment: 'left' });
                                            }}
                                            className={`p-1 rounded hover:bg-gray-100 ${(!stamp.stampAlignment || stamp.stampAlignment === 'left') ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}
                                            title="Zarovnat vlevo"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h16" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                updateAuditorStamp({ stampAlignment: 'center' });
                                            }}
                                            className={`p-1 rounded hover:bg-gray-100 ${stamp.stampAlignment === 'center' ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}
                                            title="Zarovnat na střed"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M4 18h16" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                updateAuditorStamp({ stampAlignment: 'right' });
                                            }}
                                            className={`p-1 rounded hover:bg-gray-100 ${stamp.stampAlignment === 'right' ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}
                                            title="Zarovnat vpravo"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M4 18h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Smooth Resize Handle (bottom-right corner) */}
                            {!readOnly && (
                                <div
                                    className="absolute bottom-1 right-1 w-4 h-4 cursor-nwse-resize z-20 opacity-0 group-hover/stampphoto:opacity-100 hover:opacity-100 print:hidden flex items-center justify-center"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();

                                        const startX = e.clientX;
                                        const startWidthRatio = stamp.stampWidthRatio || 0.333;
                                        // šířka stránky (vnitřní obsah PageSheet) – stabilní reference
                                        const pageEl = stampContainerRef.current?.offsetParent as HTMLElement | null;
                                        const pageWidth = pageEl?.clientWidth || 800;

                                        setResizingStamp(true);

                                        const handleMouseMove = (moveEvent: MouseEvent) => {
                                            const currentX = moveEvent.clientX;
                                            const diffPx = currentX - startX;
                                            const diffRatio = diffPx / pageWidth;
                                            let newRatio = startWidthRatio + diffRatio;
                                            newRatio = Math.max(0.1, Math.min(1.0, newRatio));
                                            updateAuditorStamp({ stampWidthRatio: newRatio });
                                        };

                                        const handleMouseUp = () => {
                                            setResizingStamp(false);
                                            document.removeEventListener('mousemove', handleMouseMove);
                                            document.removeEventListener('mouseup', handleMouseUp);
                                        };

                                        document.addEventListener('mousemove', handleMouseMove);
                                        document.addEventListener('mouseup', handleMouseUp);
                                    }}
                                >
                                    <div className="w-3 h-3 border-r-2 border-b-2 border-blue-500/70"></div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Overlay razítka - volné umístění nad obsahem stránky (může překrývat text)
const StampOverlay: React.FC<{
    stamp: {
        stampUrl: string;
        stampAlignment?: 'left' | 'center' | 'right';
        stampWidthRatio?: number;
        overlayPosition?: { x: number; y: number };
    };
    readOnly: boolean;
    pageNumber: number;
    totalPages: number;
    updateAuditorStamp?: (updates: Partial<{
        overlayEnabled?: boolean;
        overlayPageNumber?: number;
        overlayPosition?: { x: number; y: number };
        stampWidthRatio?: number;
    }>) => void;
}> = ({ stamp, readOnly, pageNumber, totalPages, updateAuditorStamp }) => {
    const layerRef = React.useRef<HTMLDivElement>(null);
    const floatingRef = React.useRef<HTMLDivElement>(null);
    const [dragging, setDragging] = React.useState(false);

    const pos = stamp.overlayPosition || { x: 80, y: 120 };

    const onMouseDown = (e: React.MouseEvent) => {
        if (readOnly) return;
        if (!updateAuditorStamp) return;
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startY = e.clientY;
        const startPos = stamp.overlayPosition || { x: 80, y: 120 };

        setDragging(true);

        const onMove = (ev: MouseEvent) => {
            const dx = ev.clientX - startX;
            const dy = ev.clientY - startY;

            // Clamp na skutečný rozměr stránky, aby šlo dát razítko úplně k pravému okraji
            const layer = layerRef.current;
            const maxW = layer?.clientWidth ?? 800;
            const maxH = layer?.clientHeight ?? 1100;
            // Pozn.: výška/šířka razítka se mění podle poměru šířky a reálného obrázku,
            // proto clamp děláme podle skutečného rozměru elementu (ne jen podle ratio).
            const measured = floatingRef.current?.getBoundingClientRect();
            const stampW = measured?.width ?? maxW * (stamp.stampWidthRatio || 0.333);
            const stampH = measured?.height ?? 200;

            const nextX = Math.max(0, Math.min(maxW - stampW, startPos.x + dx));
            // Důležité: razítko smí zasahovat do patičky, ale nesmí přetéct mimo stránku,
            // jinak Chrome/Puppeteer vytiskne další (prázdnou) stránku.
            const nextY = Math.max(0, Math.min(maxH - stampH, startPos.y + dy));

            updateAuditorStamp({ overlayPosition: { x: nextX, y: nextY } });
        };

        const onUp = () => {
            setDragging(false);
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    };

    return (
        // Vrstva přes celou stránku – stabilní šířka, aby se razítko \"nezmenšovalo\" u okraje
        <div ref={layerRef} className="absolute inset-0 z-50 print:z-50 pointer-events-none">
          <div
              ref={floatingRef}
              className="absolute pointer-events-auto"
              style={{
                  left: pos.x,
                  top: pos.y,
                  width: `${Math.min(100, Math.max(10, (stamp.stampWidthRatio || 0.333) * 100))}%`,
                  cursor: readOnly ? 'default' : (dragging ? 'grabbing' : 'grab')
              }}
              onMouseDown={onMouseDown}
          >
            {!readOnly && updateAuditorStamp && (
                <div
                    className="absolute -top-10 left-0 flex items-center gap-1 bg-white/95 border border-gray-200 rounded-lg shadow-sm px-2 py-1 print:hidden"
                    onMouseDown={(e) => {
                        // aby šlo klikat do tlačítek bez roztažení drag
                        e.stopPropagation();
                    }}
                >
                    <button
                        className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
                        title="Předchozí stránka"
                        onClick={() => updateAuditorStamp({ overlayPageNumber: Math.max(1, pageNumber - 1) })}
                    >
                        ←
                    </button>
                    <span className="text-xs text-gray-600">
                        Strana {pageNumber}/{totalPages}
                    </span>
                    <button
                        className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
                        title="Další stránka"
                        onClick={() => updateAuditorStamp({ overlayPageNumber: Math.min(totalPages, pageNumber + 1) })}
                    >
                        →
                    </button>
                    <button
                        className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
                        title="Reset pozice"
                        onClick={() => updateAuditorStamp({ overlayPosition: { x: 80, y: 120 } })}
                    >
                        Reset
                    </button>
                    <button
                        className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700 hover:bg-purple-200"
                        title="Vypnout volné umístění"
                        onClick={() => updateAuditorStamp({ overlayEnabled: false })}
                    >
                        Overlay off
                    </button>
                </div>
            )}
            <div className="relative">
                <div
                    className={`${(stamp.stampAlignment || 'right') === 'center' ? 'text-center' : (stamp.stampAlignment || 'right') === 'right' ? 'text-right' : 'text-left'}`}
                >
                    <div className="inline-block align-top relative px-2 mb-4 text-left">
                        <img
                            src={stamp.stampUrl}
                            alt="Razítko auditora"
                            className="mx-auto block w-full h-auto max-h-[180mm]"
                            draggable={false}
                        />
                    </div>
                </div>

                {/* Smooth Resize Handle (bottom-right corner) */}
                {!readOnly && updateAuditorStamp && (
                    <div
                        className="absolute bottom-1 right-1 w-4 h-4 cursor-nwse-resize z-20 opacity-80 hover:opacity-100 print:hidden flex items-center justify-center"
                        onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();

                            const startX = e.clientX;
                            const startWidthRatio = stamp.stampWidthRatio || 0.333;
                            const layerWidth = layerRef.current?.clientWidth || 800;

                            const handleMouseMove = (moveEvent: MouseEvent) => {
                                const currentX = moveEvent.clientX;
                                const diffPx = currentX - startX;
                                const diffRatio = diffPx / layerWidth;
                                let newRatio = startWidthRatio + diffRatio;
                                newRatio = Math.max(0.1, Math.min(1.0, newRatio));
                                updateAuditorStamp({ stampWidthRatio: newRatio });
                            };

                            const handleMouseUp = () => {
                                document.removeEventListener('mousemove', handleMouseMove);
                                document.removeEventListener('mouseup', handleMouseUp);
                            };

                            document.addEventListener('mousemove', handleMouseMove);
                            document.addEventListener('mouseup', handleMouseUp);
                        }}
                    >
                        <div className="w-3 h-3 border-r-2 border-b-2 border-blue-500/70"></div>
                    </div>
                )}
            </div>
          </div>
        </div>
    );
};

// A4 Page Container Component
const PageSheet: React.FC<{ children: React.ReactNode; className?: string; id?: string; pageNumber?: number; totalPages?: number }> = ({ children, className, id, pageNumber, totalPages }) => (
    <div
        id={id}
        className={`page-sheet bg-white shadow-lg mx-auto mb-8 relative ${className || ''}`}
        style={{
            width: '210mm',
            height: '297mm', // Fixed height for exact A4
            paddingTop: '10mm',
            paddingRight: '5mm',
            paddingBottom: '20mm',
            paddingLeft: '5mm',
            boxSizing: 'border-box',
            overflow: 'visible' // Allow gutter controls to hang out
        }}
    >
        {children}

        {/* Internal Footer */}
        {pageNumber && totalPages && (
            <div
                className="absolute bottom-0 left-0 w-full text-center text-[10px] text-gray-500 font-sans"
                style={{ height: '20mm', lineHeight: '20mm' }}
            >
                Strana {pageNumber} z {totalPages}
            </div>
        )}
    </div>
);

export const ReportContent: React.FC<ReportContentProps> = ({
    report,
    audit,
    auditStructure,
    editorState,
    setEditorState,
    readOnly = false,
    sensors,
    handleDragEnd,
    updateNonCompliance,
    moveNonCompliance,
    restoreAuditorStamp,
    updateAuditorStamp
}) => {
    // Helper to format date
    const formatDate = (dateString?: string): string => {
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? 'Neplatné datum' : date.toLocaleDateString('cs-CZ');
    };

    // Použít snapshot headerValues z reportu pokud existuje, jinak použít audit.headerValues
    const headerValues = report.headerValuesSnapshot || audit.headerValues;

    const [activeId, setActiveId] = useState<string | null>(null);
    const [resizingStamp, setResizingStamp] = useState(false);
    const [restoringStamp, setRestoringStamp] = useState(false);
    const [showDeleteStampModal, setShowDeleteStampModal] = useState(false);
    const stampContainerRef = React.useRef<HTMLDivElement>(null);
    const deleteStampButtonRef = React.useRef<HTMLButtonElement>(null);
    const [fallbackStamp, setFallbackStamp] = useState<any>(undefined);
    
    // Načíst razítko z globálního nastavení, pokud není v editorState
    useEffect(() => {
        if (editorState.auditorStamp === undefined && !fallbackStamp && !readOnly) {
            fetchAuditorInfo().then(auditorInfo => {
                if (auditorInfo.stampUrl) {
                    setFallbackStamp({
                        stampUrl: auditorInfo.stampUrl,
                        stampAlignment: 'left',
                        stampWidthRatio: auditorInfo.stampWidthRatio || 0.333
                    });
                }
            }).catch(error => {
                console.error('[ReportContent] Error loading fallback stamp:', error);
            });
        }
    }, [editorState.auditorStamp, fallbackStamp, readOnly]);
    
    // Pro razítko použít hodnotu z editorState.auditorStamp
    // null znamená, že bylo smazáno, undefined znamená, že nebylo nikdy nastaveno
    // Pokud není v editorState, použít fallbackStamp
    // Defaultně zarovnat vpravo, pokud není nastaveno
    let currentStamp = editorState.auditorStamp === null ? undefined : (editorState.auditorStamp || fallbackStamp);
    if (currentStamp && !currentStamp.stampAlignment) {
        currentStamp = { ...currentStamp, stampAlignment: 'right' }; // Defaultně vpravo
    }

    // Funkce pro obnovení razítka z globálního nastavení
    const handleRestoreStamp = async () => {
        if (!updateAuditorStamp) return;
        setRestoringStamp(true);
        try {
            const auditorInfo = await fetchAuditorInfo();
            if (auditorInfo.stampUrl) {
                updateAuditorStamp({
                    stampUrl: auditorInfo.stampUrl,
                    stampAlignment: 'left', // Vždy výchozí zarovnání vlevo
                    stampWidthRatio: auditorInfo.stampWidthRatio || 0.333
                });
            }
        } catch (error) {
            console.error('[ReportContent] Error restoring stamp:', error);
        } finally {
            setRestoringStamp(false);
        }
    };

    // Funkce pro smazání razítka
    const handleDeleteStamp = () => {
        if (!updateAuditorStamp) return;
        setShowDeleteStampModal(true);
    };

    const confirmDeleteStamp = () => {
        if (!updateAuditorStamp) return;
        updateAuditorStamp({ stampUrl: null });
        setShowDeleteStampModal(false);
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    // Pagination Constants
    // Usable height: 297mm - 10mm (top) - 20mm (bottom footer) = 267mm ~= 1009px
    // Reducing to 900px to ensure absolutely no overflow (safety buffer for footer)
    const PAGE_HEIGHT_PX = 950;
    // Pozn.: stránkování tabulky je ručně počítané. Tyto konstanty musí co nejvíc odpovídat reálnému renderu,
    // jinak budou vznikat zbytečné mezery (příliš velký odhad) nebo přetečení (příliš malý odhad).
    // V tabulce máme:
    // - 1. sloupec: text-xs + p-2 (typicky 1 řádek, občas 2+ u delších názvů)
    // - 2. sloupec (Popis): text-[7px] + leading-tight + px-2 py-1
    // - 3. sloupec: status VYHOVUJE/NEVYHOVUJE s p-2 (typicky 1 řádek)
    const TABLE_HEADER_HEIGHT = 36;
    const SECTION_HEADER_HEIGHT = 36;
    const BASE_ROW_HEIGHT = 32; // minimální výška řádku daná paddingem a 3. sloupcem

    const CHARS_PER_LINE_TITLE = 26; // úzký sloupec (22%)
    const LINE_HEIGHT_TITLE = 16;    // text-xs ~ 12px font, ~16px line-height

    const CHARS_PER_LINE_DESC = 200; // široký sloupec (66%) a malé písmo
    const LINE_HEIGHT_DESC = 9;      // 7px + leading-tight (~8-9px)

    // --- Non-Compliance Pagination Logic (v useMemo pro dynamické přepočítávání) ---
    const NC_HEADER_HEIGHT = 40; // "DETAIL ZJIŠTĚNÝCH NESHOD"
    const NC_BASE_HEIGHT = 160;

    // Extended type for rendering split items
    type RenderableNCItem = EditableNonCompliance & {
        renderText?: boolean;
        photoSlice?: [number, number];
        uniqueKey?: string;
    };

    // Paginace neshod a razítka - přepočítává se při každé změně editorState
    const { nonCompliancePages, pageHeights: ncPageHeights } = useMemo(() => {
        const nonCompliancePages: RenderableNCItem[][] = [];
        const pageHeights: number[] = [];
        let currentNCPage: RenderableNCItem[] = [];
        let currentNCHeight = NC_HEADER_HEIGHT;

        editorState.nonCompliances.forEach((nc, ncIndex) => {
            // 1. Calculate component heights more accurately
            let textHeight = NC_BASE_HEIGHT;

            // Add height for each text field based on estimated length
            const location = nc.location || '';
            const finding = nc.finding || '';
            const recommendation = nc.recommendation || '';

            // Each field can wrap, estimate lines (assuming ~60 chars per line in the red box)
            const locationLines = Math.max(1, Math.ceil(location.length / 60));
            const findingLines = Math.max(1, Math.ceil(finding.length / 60));
            const recommendationLines = Math.max(1, Math.ceil(recommendation.length / 60));

            // Add height for wrapped lines (16px line height approximately)
            textHeight += (locationLines - 1) * 16;
            textHeight += (findingLines - 1) * 16;
            textHeight += (recommendationLines - 1) * 16;

            // 3. Process Photos (Layout Engine)
            type PhotoRow = {
                height: number;
                startIndex: number;
                endIndex: number;
            };

            const calculatePhotoRows = (photos: any[]): PhotoRow[] => {
                const rows: PhotoRow[] = [];
                if (!photos || photos.length === 0) return rows;

                const CONTENT_WIDTH_PX = 750;
                const DEFAULT_ASPECT_RATIO = 4 / 3;
                const MAX_HEIGHT_PX = 680;

                let currentRowHeight = 0;
                let currentWidthSum = 0;
                let rowStartIndex = 0;
                let previousAlignment: string | undefined = undefined;

                for (let i = 0; i < photos.length; i++) {
                    const photo = photos[i];
                    const widthRatio = photo.widthRatio ?? (photo.colSpan ? photo.colSpan / 3 : 0.333);
                    const currentAlignment = photo.alignment || 'left';

                    const aspectRatio = photo.aspectRatio || DEFAULT_ASPECT_RATIO;
                    const estimatedHeight = (widthRatio * CONTENT_WIDTH_PX) / aspectRatio;
                    const photoHeight = Math.min(estimatedHeight, MAX_HEIGHT_PX) + 20;

                    const alignmentChanged = previousAlignment !== undefined && previousAlignment !== currentAlignment;

                    if (currentWidthSum + widthRatio > 1.01 || alignmentChanged) {
                        rows.push({
                            height: currentRowHeight,
                            startIndex: rowStartIndex,
                            endIndex: i
                        });
                        currentRowHeight = photoHeight;
                        currentWidthSum = widthRatio;
                        rowStartIndex = i;
                    } else {
                        currentWidthSum += widthRatio;
                        currentRowHeight = Math.max(currentRowHeight, photoHeight);
                    }
                    previousAlignment = currentAlignment;
                }
                if (currentWidthSum > 0) {
                    rows.push({
                        height: currentRowHeight,
                        startIndex: rowStartIndex,
                        endIndex: photos.length
                    });
                }
                return rows;
            };

            const photoRows = calculatePhotoRows(nc.photos || []);

            // 2. Process Text Part
            let remainingPhotosStartIndex = 0;
            let isTextRendered = false;

            // Force break check
            if (nc.pageBreakBefore) {
                if (currentNCPage.length > 0) {
                    nonCompliancePages.push(currentNCPage);
                    pageHeights.push(currentNCHeight);
                    currentNCPage = [];
                    currentNCHeight = 0;
                }
            }

            // Check if text fits
            if (currentNCHeight + textHeight > PAGE_HEIGHT_PX) {
                if (currentNCPage.length > 0) {
                    nonCompliancePages.push(currentNCPage);
                    pageHeights.push(currentNCHeight);
                    currentNCPage = [];
                    currentNCHeight = 0;
                }
            }

            let heightAfterText = currentNCHeight + textHeight;

            if (photoRows.length > 0) {
                const firstPhotoRowHeight = photoRows[0].height;
                if (heightAfterText + firstPhotoRowHeight > PAGE_HEIGHT_PX) {
                    if (currentNCPage.length > 0) {
                        nonCompliancePages.push(currentNCPage);
                        pageHeights.push(currentNCHeight);
                        currentNCPage = [];
                        currentNCHeight = 0;
                        heightAfterText = textHeight;
                    }
                }
            }

            let rowsOnThisPage = 0;
            let photosOnThisPage = 0;

            for (const row of photoRows) {
                if (heightAfterText + row.height <= PAGE_HEIGHT_PX) {
                    heightAfterText += row.height;
                    rowsOnThisPage++;
                    photosOnThisPage = row.endIndex;
                } else {
                    break;
                }
            }

            currentNCPage.push({
                ...nc,
                renderText: true,
                photoSlice: [0, photosOnThisPage],
                uniqueKey: `${nc.id}-part1`
            });
            currentNCHeight = heightAfterText;
            remainingPhotosStartIndex = photosOnThisPage;
            isTextRendered = true;

            let currentRowIndex = rowsOnThisPage;

            while (remainingPhotosStartIndex < (nc.photos?.length || 0)) {
                nonCompliancePages.push(currentNCPage);
                pageHeights.push(currentNCHeight);
                currentNCPage = [];
                currentNCHeight = 0;

                let nextHeight = 0;
                let sliceStart = remainingPhotosStartIndex;
                let sliceEnd = remainingPhotosStartIndex;

                while (currentRowIndex < photoRows.length) {
                    const row = photoRows[currentRowIndex];
                    if (nextHeight + row.height <= PAGE_HEIGHT_PX) {
                        nextHeight += row.height;
                        sliceEnd = row.endIndex;
                        currentRowIndex++;
                    } else {
                        break;
                    }
                }

                if (sliceEnd === sliceStart && currentRowIndex < photoRows.length) {
                    const row = photoRows[currentRowIndex];
                    nextHeight += row.height;
                    sliceEnd = row.endIndex;
                    currentRowIndex++;
                }

                currentNCPage.push({
                    ...nc,
                    renderText: false,
                    photoSlice: [sliceStart, sliceEnd],
                    uniqueKey: `${nc.id}-part-${sliceStart}`
                });

                currentNCHeight = nextHeight;
                remainingPhotosStartIndex = sliceEnd;
            }
        });

        if (currentNCPage.length > 0) {
            nonCompliancePages.push(currentNCPage);
            pageHeights.push(currentNCHeight);
        }

        // Přidat razítko (v toku dokumentu) jen pokud není zapnuté volné umístění (overlay)
        if (currentStamp?.stampUrl && !currentStamp.overlayEnabled) {
            const STAMP_BASE_HEIGHT = 200;
            const STAMP_MARGIN = 32;
            const stampHeight = STAMP_BASE_HEIGHT + STAMP_MARGIN;
            
            if (currentStamp.pageBreakBefore) {
                nonCompliancePages.push([]);
                pageHeights.push(0);
            } else {
                if (nonCompliancePages.length > 0) {
                    const lastPageIndex = nonCompliancePages.length - 1;
                    const lastPageHeight = pageHeights[lastPageIndex] || 0;
                    
                    if (lastPageHeight + stampHeight > PAGE_HEIGHT_PX) {
                        nonCompliancePages.push([]);
                        pageHeights.push(0);
                    }
                } else {
                    nonCompliancePages.push([]);
                    pageHeights.push(NC_HEADER_HEIGHT);
                }
            }
            
            const lastPage = nonCompliancePages[nonCompliancePages.length - 1];
            lastPage.push({
                id: '__stamp__',
                sectionTitle: '',
                itemTitle: '',
                location: '',
                finding: '',
                recommendation: '',
                photos: [],
                pageBreakBefore: currentStamp.pageBreakBefore || false,
                renderText: true,
                uniqueKey: '__stamp__'
            } as RenderableNCItem);
            
            const lastPageIndex = nonCompliancePages.length - 1;
            if (pageHeights[lastPageIndex] !== undefined) {
                pageHeights[lastPageIndex] += stampHeight;
            } else {
                pageHeights[lastPageIndex] = stampHeight + (lastPageIndex === 0 ? NC_HEADER_HEIGHT : 0);
            }
        }

        return { nonCompliancePages, pageHeights };
    }, [
        // Přepočítat při změně neshod nebo jejich vlastností (včetně velikosti obrázků)
        JSON.stringify(editorState.nonCompliances.map(nc => ({
            id: nc.id,
            location: nc.location,
            finding: nc.finding,
            recommendation: nc.recommendation,
            photos: nc.photos?.map(p => ({
                id: p.id,
                widthRatio: p.widthRatio,
                colSpan: p.colSpan,
                aspectRatio: p.aspectRatio,
                alignment: p.alignment
            })),
            pageBreakBefore: nc.pageBreakBefore
        }))),
        // Přepočítat při změně razítka
        currentStamp?.stampUrl,
        currentStamp?.pageBreakBefore,
        currentStamp?.stampWidthRatio,
        currentStamp?.stampAlignment,
        // Důležité: bez tohohle může po zapnutí overlay zůstat staré "__stamp__" v memo cache (dvojité razítko)
        currentStamp?.overlayEnabled,
        currentStamp?.overlayPageNumber,
        // pozice mění jen overlay, ale chceme, aby se render synchronizoval se state (bez "duchů")
        JSON.stringify(currentStamp?.overlayPosition || null)
    ]);

    // --- Audit Table Pagination Logic ---

    const estimateItemHeight = (item: any) => {
        const titleText: string = (item?.title || '').toString();
        const descText: string = (item?.description || '').toString();

        const titleLines = Math.max(1, Math.ceil(titleText.length / CHARS_PER_LINE_TITLE));
        const descLines = descText.trim() === '' ? 1 : Math.max(1, Math.ceil(descText.length / CHARS_PER_LINE_DESC));

        // Výška buňky se odvíjí od počtu řádků. Řádek tabulky je max z buněk.
        const titleHeight = BASE_ROW_HEIGHT + Math.max(0, titleLines - 1) * LINE_HEIGHT_TITLE;
        const descHeight = BASE_ROW_HEIGHT + Math.max(0, descLines - 1) * LINE_HEIGHT_DESC;
        const statusHeight = BASE_ROW_HEIGHT; // status je vždy 1 řádek

        return Math.max(titleHeight, descHeight, statusHeight);
    };

    // Define renderable elements for the table
    type TableElement =
        | { type: 'header'; id: string; title: string; height: number }
        | { type: 'row'; id: string; item: any; height: number; sectionId: string };

    const tablePages: TableElement[][] = [];
    const tablePageHeights: number[] = [];
    let currentTablePage: TableElement[] = [];
    let currentTableHeight = TABLE_HEADER_HEIGHT;

    // Flatten structure into elements
    const allElements: TableElement[] = [];
    auditStructure.audit_sections.filter(s => s.active).forEach(section => {
        // Add Section Header
        allElements.push({
            type: 'header',
            id: section.id,
            title: section.title,
            height: SECTION_HEADER_HEIGHT
        });

        // Add Items
        section.items.filter((i: any) => i.active).forEach((item: any) => {
            allElements.push({
                type: 'row',
                id: item.id,
                item: item,
                height: estimateItemHeight(item),
                sectionId: section.id
            });
        });
    });

    // Distribute elements to pages - sekce se nesmí rozdělit na více stránek
    for (let i = 0; i < allElements.length; i++) {
        const element = allElements[i];

        if (element.type === 'header') {
            // Vypočítat celkovou výšku celé sekce (header + všechny rows)
            let sectionTotalHeight = element.height;
            let sectionEndIndex = i + 1;
            
            // Najít všechny rows patřící k této sekci
            while (sectionEndIndex < allElements.length && 
                   allElements[sectionEndIndex].type === 'row' && 
                   allElements[sectionEndIndex].sectionId === element.id) {
                sectionTotalHeight += allElements[sectionEndIndex].height;
                sectionEndIndex++;
            }
            
            // Zkontrolovat, jestli se celá sekce vejde na aktuální stránku
            if (currentTableHeight + sectionTotalHeight > PAGE_HEIGHT_PX) {
                // Celá sekce se nevejde - přesunout na novou stránku
                if (currentTablePage.length > 0) {
                    tablePages.push(currentTablePage);
                    tablePageHeights.push(currentTableHeight);
                    currentTablePage = [];
                    currentTableHeight = TABLE_HEADER_HEIGHT;
                }
            }
            
            // Přidat celou sekci najednou (header + všechny rows)
            currentTablePage.push(element);
            currentTableHeight += element.height;
            
            // Přidat všechny rows sekce
            for (let k = i + 1; k < sectionEndIndex; k++) {
                currentTablePage.push(allElements[k]);
                currentTableHeight += allElements[k].height;
            }
            
            // Přeskočit rows, které jsme už přidali
            i = sectionEndIndex - 1;
        } else {
            // Toto by se nemělo stát, protože všechny rows jsou zpracovány společně s jejich headerem
            // Ale pro jistotu přidáme fallback
            if (currentTableHeight + element.height > PAGE_HEIGHT_PX) {
                if (currentTablePage.length > 0) {
                    tablePages.push(currentTablePage);
                    tablePageHeights.push(currentTableHeight);
                    currentTablePage = [];
                    currentTableHeight = TABLE_HEADER_HEIGHT;
                }
            }
            currentTablePage.push(element);
            currentTableHeight += element.height;
        }
    }

    if (currentTablePage.length > 0) {
        tablePages.push(currentTablePage);
        tablePageHeights.push(currentTableHeight);
    }

    // Použít paginaci z useMemo (už je definována výše)
    // nonCompliancePages a ncPageHeights jsou již vypočítány v useMemo výše

    // --- Razítko bez neshod: zkusit ho dát na poslední stránku tabulky, pokud je tam místo ---
    // Pokud by se nevešlo, použije se fallback samostatné stránky (níže).
    const STAMP_BASE_HEIGHT_PX = 200;
    const STAMP_MARGIN_PX = 32;
    const STAMP_HEIGHT_PX = STAMP_BASE_HEIGHT_PX + STAMP_MARGIN_PX;

    const canEmbedStampIntoLastTablePage =
        Boolean(currentStamp?.stampUrl) &&
        (!editorState.nonCompliances || editorState.nonCompliances.length === 0) &&
        !currentStamp?.overlayEnabled &&
        !currentStamp?.pageBreakBefore &&
        tablePages.length > 0 &&
        (tablePageHeights[tablePageHeights.length - 1] || 0) + STAMP_HEIGHT_PX <= PAGE_HEIGHT_PX;

    // Calculate Total Pages
    const totalPages = 1 + tablePages.length + (nonCompliancePages.length > 0 ? nonCompliancePages.length : 0);

    // --- Render Functions ---

    // --- Summary Pagination Logic ---

    // --- Summary Pagination Logic ---

    const estimateHtmlHeight = (html: string, widthChars: number = 95): number => {
        if (!html) return 0;

        // 1. Handle Lists specifically
        if (html.includes('<li')) {
            const listItems = html.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
            let totalHeight = 0;
            // Base padding for ul/ol
            totalHeight += 10;

            for (const item of listItems) {
                // Strip tags to get text content of the item
                const text = item.replace(/<[^>]*>/g, '');
                // Estimate lines for this item
                const lines = Math.max(1, Math.ceil(text.length / widthChars));
                // Line height (20) + margin between items (4)
                totalHeight += lines * 24;
            }
            return totalHeight;
        }

        // 2. Handle Paragraphs/Divs
        const text = html.replace(/<[^>]*>/g, '');
        const lines = Math.ceil(text.length / widthChars);
        const pCount = (html.match(/<p/g) || []).length;
        const brCount = (html.match(/<br/g) || []).length;
        const hCount = (html.match(/<h/g) || []).length;

        let height = lines * 20;
        height += pCount * 10; // Margin for paragraphs
        height += brCount * 20;
        height += hCount * 10;

        return Math.max(20, height);
    };

    type SummaryBlock =
        | { type: 'header_tables'; height: number }
        | { type: 'summary_title'; height: number }
        | { type: 'evaluation'; height: number; value: string }
        | { type: 'findings'; height: number; value: string }
        | { type: 'recommendations'; height: number; value: string };

    const rawSummaryBlocks: SummaryBlock[] = [];
    const summaryPages: SummaryBlock[][] = [];

    // 1. Header Tables (Fixed approx height)
    // Title (40) + Date/Op (40) + Auditor (120) + Premise/Op (180) + Margins
    const HEADER_TABLES_HEIGHT = 450;
    rawSummaryBlocks.push({ type: 'header_tables', height: HEADER_TABLES_HEIGHT });

    // 2. Summary Title
    rawSummaryBlocks.push({ type: 'summary_title', height: 50 });

    // 3. Evaluation
    const evalText = editorState.summaryOverrides?.evaluation_text || '';
    rawSummaryBlocks.push({
        type: 'evaluation',
        height: estimateHtmlHeight(evalText) + 40,
        value: evalText
    });

    // Helper to format array of strings as HTML list if needed
    const formatAsHtmlList = (items: string[] | undefined): string => {
        if (!items || items.length === 0) return '';

        // If it's a single item that looks like HTML, return it as is
        if (items.length === 1 && /<[a-z][\s\S]*>/i.test(items[0])) {
            return items[0];
        }

        // Otherwise, treat as list of plain strings and wrap in ul/li
        const validItems = items.filter(i => i && i.trim() !== '');
        if (validItems.length === 0) return '';

        return `<ul>${validItems.map(item => `<li>${item}</li>`).join('')}</ul>`;
    };

    // 4. Findings
    const findingsText = formatAsHtmlList(editorState.summaryOverrides?.key_findings);
    rawSummaryBlocks.push({
        type: 'findings',
        height: estimateHtmlHeight(findingsText) + 40,
        value: findingsText
    });

    // 5. Recommendations
    const recommendationsText = formatAsHtmlList(editorState.summaryOverrides?.key_recommendations);
    rawSummaryBlocks.push({
        type: 'recommendations',
        height: estimateHtmlHeight(recommendationsText) + 40,
        value: recommendationsText
    });

    // Distribute summary blocks to pages with splitting
    let currentSummaryPage: SummaryBlock[] = [];
    let currentSummaryHeight = 0;

    for (const block of rawSummaryBlocks) {
        // Check if block fits
        if (currentSummaryHeight + block.height <= PAGE_HEIGHT_PX) {
            currentSummaryPage.push(block);
            currentSummaryHeight += block.height;
            continue;
        }

        // Block doesn't fit.
        // Option 1: Move to next page if it fits there (and current page is not empty)
        if (currentSummaryPage.length > 0 && block.height <= PAGE_HEIGHT_PX) {
            summaryPages.push(currentSummaryPage);
            currentSummaryPage = [];
            currentSummaryHeight = 0;
            currentSummaryPage.push(block);
            currentSummaryHeight += block.height;
            continue;
        }

        // Option 2: Block is too big for a single page OR it doesn't fit on current page and we want to fill current page
        // We need to split it.
        // Only split 'findings' and 'recommendations' if they are lists
        if ((block.type === 'findings' || block.type === 'recommendations') && block.value.includes('<li')) {
            const listItems = block.value.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];

            // Create a temporary list to accumulate items for the current chunk
            let currentChunkItems: string[] = [];
            let currentChunkHeight = 40; // Header height

            let isFirstChunk = true;

            for (const item of listItems) {
                const itemHeight = estimateHtmlHeight(`<ul>${item}</ul>`) - 10; // remove ul padding from estimate

                // Check if adding this item exceeds page
                // Note: +20 for closing </ul> padding/margin safety
                if (currentSummaryHeight + currentChunkHeight + itemHeight > PAGE_HEIGHT_PX) {
                    // Push current chunk
                    if (currentChunkItems.length > 0) {
                        currentSummaryPage.push({
                            type: block.type,
                            height: currentChunkHeight,
                            value: `<ul>${currentChunkItems.join('')}</ul>`
                        });
                    }

                    // Start new page
                    summaryPages.push(currentSummaryPage);
                    currentSummaryPage = [];
                    currentSummaryHeight = 0;

                    // Reset chunk
                    currentChunkItems = [];
                    currentChunkHeight = 0; // No header for continuation chunks? Or maybe small margin
                    isFirstChunk = false;
                }

                currentChunkItems.push(item);
                currentChunkHeight += itemHeight;
            }

            // Push remaining items
            if (currentChunkItems.length > 0) {
                currentSummaryPage.push({
                    type: block.type,
                    height: currentChunkHeight,
                    value: `<ul>${currentChunkItems.join('')}</ul>`
                });
                currentSummaryHeight += currentChunkHeight;
            }

        } else {
            // Can't split (e.g. big text block or header tables). 
            // Just push to next page and hope for best (or it will overflow).
            if (currentSummaryPage.length > 0) {
                summaryPages.push(currentSummaryPage);
                currentSummaryPage = [];
                currentSummaryHeight = 0;
            }
            currentSummaryPage.push(block);
            currentSummaryHeight += block.height;
        }
    }

    if (currentSummaryPage.length > 0) {
        summaryPages.push(currentSummaryPage);
    }


    // --- Render Functions ---

    const renderSummaryPage = (blocks: SummaryBlock[], pageIndex: number) => (
        <div className="font-sans text-sm">
            {blocks.map((block, idx) => {
                switch (block.type) {
                    case 'header_tables':
                        return (
                            <div key={idx}>
                                {/* Header */}
                                <h1 className="text-2xl font-bold text-center mb-4">{auditStructure.audit_title}</h1>
                                <div className="text-center mb-8 text-base">
                                    <p><strong>Datum auditu:</strong> {formatDate(audit.completedAt)}</p>
                                    <p><strong>Za provozovatele přítomen:</strong> {(headerValues as any).present_person || 'Neuvedeno'}</p>
                                </div>

                                {/* Auditor Table */}
                                <div className="mb-8 border-y-2 border-black py-2">
                                    <h2 className="text-sm font-bold uppercase text-center mb-2">Zpracovatel Auditu</h2>
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-left">
                                                {auditStructure.header_data.auditor.fields.map(field => (
                                                    <th key={field.id} className="font-bold p-1">{field.label}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                {auditStructure.header_data.auditor.fields.map(field => {
                                                    const auditorInfo = report?.auditorSnapshot || {
                                                        name: (headerValues as any)['auditor_name'] || '-',
                                                        phone: (headerValues as any)['auditor_phone'] || '-',
                                                        email: (headerValues as any)['auditor_email'] || '-',
                                                        web: (headerValues as any)['auditor_web'] || '-',
                                                    };
                                                    const auditorValueMap: { [key: string]: string } = {
                                                        'auditor_name': auditorInfo.name,
                                                        'auditor_phone': auditorInfo.phone,
                                                        'auditor_email': auditorInfo.email,
                                                        'auditor_web': auditorInfo.web
                                                    };
                                                    return (
                                                        <td key={field.id} className="p-1">{auditorValueMap[field.id] || '-'}</td>
                                                    );
                                                })}
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* Header Sections (Premise & Operator) */}
                                <div className="grid grid-cols-2 gap-x-12 mb-8">
                                    {[auditStructure.header_data.audited_premise, auditStructure.header_data.operator].map((section, sIdx) => (
                                        <div key={sIdx} className="mb-4">
                                            <h2 className="text-sm font-bold uppercase border-b-2 border-black pb-1 mb-2">{section.title}</h2>
                                            <table className="w-full text-sm">
                                                <tbody>
                                                    {section.fields.map(field => (
                                                        <tr key={field.id}>
                                                            <td className="font-bold pr-4 py-1 align-top w-40">{field.label}</td>
                                                            <td className="py-1">{headerValues[field.id] || '-'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    case 'summary_title':
                        return (
                            <h3 key={idx} className="text-xl font-bold text-gray-800 border-b-2 border-gray-300 pb-2 mb-4">Souhrnné hodnocení auditu</h3>
                        );
                    case 'evaluation':
                        return (
                            <div key={idx} className="mb-4">
                                <EditableText
                                    tagName="div"
                                    className="text-gray-600"
                                    value={block.value}
                                    onChange={(val) => setEditorState?.({
                                        ...editorState,
                                        summaryOverrides: { ...editorState.summaryOverrides, evaluation_text: val }
                                    })}
                                    placeholder="Zde napište celkové hodnocení..."
                                    readOnly={readOnly}
                                />
                            </div>
                        );
                    case 'findings':
                    case 'recommendations':
                        // Tyto sekce už nejsou použity - ignorujeme je
                        return null;
                    default:
                        return null;
                }
            })}
        </div>
    );

    const renderAuditTablePage = (elements: TableElement[], pageIndex: number, renderStampAtEnd: boolean) => (
        <div className="mt-0 h-full flex flex-col">
            {pageIndex === 0 && (
                <h2 className="text-sm font-bold uppercase border-b-2 border-black pb-1 mb-2">SEZNAM AUDITOVANÝCH POLOŽEK</h2>
            )}
            <table className={`w-full text-sm border-collapse border border-gray-300 ${renderStampAtEnd ? 'mb-4' : 'mb-auto'}`}>
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border border-gray-300 p-2 text-left w-[22%]">Předmět auditu</th>
                        <th className="border border-gray-300 p-2 text-left w-[66%]">Popis</th>
                        <th className="border border-gray-300 p-2 text-left w-[12%]">Hodnocení</th>
                    </tr>
                </thead>
                <tbody>
                    {elements.map((element, idx) => {
                        if (element.type === 'header') {
                            return (
                                <tr key={`${element.id}-header-${idx}`} className="bg-gray-50">
                                    <td colSpan={3} className="border border-gray-300 p-2 font-bold">{element.title}</td>
                                </tr>
                            );
                        } else {
                            const item = element.item;
                            // Použít snapshot answers z reportu pokud existuje, jinak fallback na aktuální audit
                            const answersToUse = report.answersSnapshot || audit.answers;
                            const answer = answersToUse[item.id];
                            const status = answer && !answer.compliant
                                ? { text: 'NEVYHOVUJE', color: 'text-red-600 font-bold' }
                                : { text: 'VYHOVUJE', color: 'text-black font-bold' };

                            return (
                                <tr key={item.id}>
                                    <td className="border border-gray-300 p-2 text-xs">{item.title}</td>
                                    <td className="border border-gray-300 px-2 py-1 text-[7px] leading-tight text-gray-500">{item.description}</td>
                                    <td className={`border border-gray-300 p-2 ${status.color} whitespace-nowrap`}>{status.text}</td>
                                </tr>
                            );
                        }
                    })}
                </tbody>
            </table>

            {renderStampAtEnd && currentStamp?.stampUrl && (
                <div className="mt-2 break-inside-avoid">
                    <StampItem
                        stamp={currentStamp}
                        updateAuditorStamp={readOnly ? (() => {}) : (updateAuditorStamp || ((_: any) => {}))}
                        readOnly={readOnly}
                        pageBreakBefore={false}
                    />
                </div>
            )}
        </div>
    );

    const overlayTargetPageNumber =
        currentStamp?.overlayEnabled
            ? Math.max(1, Math.min(totalPages, currentStamp.overlayPageNumber || totalPages))
            : null;

    return (
        <div className="font-sans text-sm print:bg-white">
            {/* Summary Pages (Header + Summary Sections) */}
            {summaryPages.map((pageBlocks, idx) => (
                <PageSheet
                    key={`summary-page-${idx}`}
                    className={`print:shadow-none print:m-0 print:p-0 print:w-full print:min-h-0 print:mb-0 break-before-page ${currentStamp?.stampUrl && currentStamp.overlayEnabled && overlayTargetPageNumber === (1 + idx) ? 'has-overlay-stamp' : ''}`}
                    pageNumber={1 + idx}
                    totalPages={totalPages}
                >
                    {renderSummaryPage(pageBlocks, idx)}
                    {currentStamp?.stampUrl && currentStamp.overlayEnabled && overlayTargetPageNumber === (1 + idx) && (
                        <StampOverlay
                            stamp={currentStamp}
                            readOnly={readOnly}
                            pageNumber={1 + idx}
                            totalPages={totalPages}
                            updateAuditorStamp={readOnly ? undefined : (updateAuditorStamp as any)}
                        />
                    )}
                </PageSheet>
            ))}

            {/* Audit Table Pages */}
            {tablePages.map((pageSections, idx) => (
                <PageSheet
                    key={`table-page-${idx}`}
                    className={`print:shadow-none print:m-0 print:p-0 print:w-full print:min-h-0 print:mb-0 break-before-page ${currentStamp?.stampUrl && currentStamp.overlayEnabled && overlayTargetPageNumber === (1 + summaryPages.length + idx) ? 'has-overlay-stamp' : ''}`}
                    pageNumber={1 + summaryPages.length + idx}
                    totalPages={totalPages}
                >
                    {renderAuditTablePage(pageSections, idx, canEmbedStampIntoLastTablePage && idx === tablePages.length - 1)}
                    {currentStamp?.stampUrl && currentStamp.overlayEnabled && overlayTargetPageNumber === (1 + summaryPages.length + idx) && (
                        <StampOverlay
                            stamp={currentStamp}
                            readOnly={readOnly}
                            pageNumber={1 + summaryPages.length + idx}
                            totalPages={totalPages}
                            updateAuditorStamp={readOnly ? undefined : (updateAuditorStamp as any)}
                        />
                    )}
                </PageSheet>
            ))}

            {/* Non-Compliances */}
            {/* Zobrazit sekci s neshodami pokud jsou nějaké neshody */}
            {editorState.nonCompliances && editorState.nonCompliances.length > 0 ? (readOnly ? (
                // Read-only view (PDF generation)
                <>
                    {nonCompliancePages.map((pageItems, pageIdx) => (
                        <PageSheet
                            key={`nc-page-${pageIdx}`}
                            className={`print:shadow-none print:m-0 print:p-0 print:w-full print:min-h-0 print:mb-0 break-before-page ${currentStamp?.stampUrl && currentStamp.overlayEnabled && overlayTargetPageNumber === (1 + summaryPages.length + tablePages.length + pageIdx) ? 'has-overlay-stamp' : ''}`}
                            pageNumber={1 + summaryPages.length + tablePages.length + pageIdx}
                            totalPages={totalPages}
                        >
                            {pageIdx === 0 && (
                                <h2 className="text-sm font-bold uppercase border-b-2 border-black pb-1 mb-2">DETAIL ZJIŠTĚNÝCH NESHOD</h2>
                            )}
                            {pageItems.map((nc, index) => {
                                // Zkontrolovat, zda je to razítko
                                if (nc.id === '__stamp__') {
                                    if (currentStamp?.overlayEnabled) return null;
                                    return (
                                        <StampItem
                                            key="__stamp__"
                                            stamp={currentStamp!}
                                            updateAuditorStamp={() => {}}
                                            readOnly={true}
                                            pageBreakBefore={nc.pageBreakBefore || false}
                                        />
                                    );
                                }
                                
                                return (
                                    <NonComplianceItem
                                        key={nc.id}
                                        nc={nc}
                                        index={editorState.nonCompliances.findIndex(i => i.id === nc.id)}
                                        readOnly={true}
                                        renderText={nc.renderText}
                                        photoSlice={nc.photoSlice}
                                    />
                                );
                            })}
                            {currentStamp?.stampUrl && currentStamp.overlayEnabled && overlayTargetPageNumber === (1 + summaryPages.length + tablePages.length + pageIdx) && (
                                <StampOverlay
                                    stamp={currentStamp}
                                    readOnly={readOnly}
                                    pageNumber={1 + summaryPages.length + tablePages.length + pageIdx}
                                    totalPages={totalPages}
                                    updateAuditorStamp={readOnly ? undefined : (updateAuditorStamp as any)}
                                />
                            )}
                        </PageSheet>
                    ))}
                </>
            ) : (
                // Editable view with DnD
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={(event) => {
                        setActiveId(null);
                        handleDragEnd!(event);
                    }}
                >
                    <SortableContext
                        items={[
                            ...editorState.nonCompliances.map(nc => nc.id),
                            ...((currentStamp?.stampUrl && !currentStamp?.overlayEnabled) ? ['__stamp__'] : [])
                        ]}
                        strategy={verticalListSortingStrategy}
                    >
                        {nonCompliancePages.map((pageItems, pageIdx) => {
                            // Zkontrolovat, zda první položka na stránce má pageBreakBefore
                            const firstItem = pageItems[0];
                            const hasPageBreak = firstItem?.pageBreakBefore && pageIdx > 0;
                            
                            return (
                            <PageSheet
                                key={`nc-page-edit-${pageIdx}`}
                                className={`${hasPageBreak ? 'break-before-page' : (pageIdx > 0 ? 'break-before-page' : '')} ${currentStamp?.stampUrl && currentStamp.overlayEnabled && overlayTargetPageNumber === (1 + summaryPages.length + tablePages.length + pageIdx) ? 'has-overlay-stamp' : ''}`}
                                pageNumber={1 + summaryPages.length + tablePages.length + pageIdx}
                                totalPages={totalPages}
                            >
                                {pageIdx === 0 && (
                                    <h2 className="text-sm font-bold uppercase border-b-2 border-black pb-1 mb-2">DETAIL ZJIŠTĚNÝCH NESHOD</h2>
                                )}
                                {pageItems.map((nc) => {
                                    // Zkontrolovat, zda je to razítko
                                    if (nc.id === '__stamp__') {
                                        if (currentStamp?.overlayEnabled) return null;
                                        return (
                                            <StampItem
                                                key="__stamp__"
                                                stamp={currentStamp!}
                                                updateAuditorStamp={updateAuditorStamp!}
                                                readOnly={readOnly}
                                                pageBreakBefore={nc.pageBreakBefore || false}
                                            />
                                        );
                                    }

                                    const isMainPart = nc.renderText !== false;

                                    if (isMainPart) {
                                        return (
                                            <SortableItem
                                                key={nc.uniqueKey || nc.id}
                                                id={nc.id}
                                                nc={nc}
                                                index={editorState.nonCompliances.findIndex(i => i.id === nc.id)}
                                                updateNonCompliance={updateNonCompliance!}
                                                moveNonCompliance={moveNonCompliance!}
                                                renderText={nc.renderText}
                                                photoSlice={nc.photoSlice}
                                            />
                                        );
                                    } else {
                                        return (
                                            <NonComplianceItem
                                                key={nc.uniqueKey || nc.id}
                                                nc={nc}
                                                index={editorState.nonCompliances.findIndex(i => i.id === nc.id)}
                                                updateNonCompliance={updateNonCompliance!}
                                                renderText={false}
                                                photoSlice={nc.photoSlice}
                                            // No drag props for continuations
                                            />
                                        );
                                    }
                                })}
                                {pageItems.length === 0 && <div className="text-gray-400 italic p-4 text-center">Žádné neshody na této stránce</div>}
                                {currentStamp?.stampUrl && currentStamp.overlayEnabled && overlayTargetPageNumber === (1 + summaryPages.length + tablePages.length + pageIdx) && (
                                    <StampOverlay
                                        stamp={currentStamp}
                                        readOnly={readOnly}
                                        pageNumber={1 + summaryPages.length + tablePages.length + pageIdx}
                                        totalPages={totalPages}
                                        updateAuditorStamp={readOnly ? undefined : (updateAuditorStamp as any)}
                                    />
                                )}
                            </PageSheet>
                            );
                        })}
                    </SortableContext>
                    <DragOverlay>
                        {activeId ? (
                            <div className="bg-white shadow-2xl border-2 border-blue-500 rounded-lg opacity-90 p-4 rotate-2 cursor-grabbing">
                                {activeId === '__stamp__' ? (
                                    <StampItem
                                        stamp={currentStamp!}
                                        updateAuditorStamp={() => {}}
                                        readOnly={true}
                                        pageBreakBefore={currentStamp?.pageBreakBefore || false}
                                    />
                                ) : (
                                    <NonComplianceItem
                                        nc={editorState.nonCompliances.find(i => i.id === activeId)!}
                                        index={editorState.nonCompliances.findIndex(i => i.id === activeId)}
                                        readOnly={true}
                                    />
                                )}
                            </div>
                        ) : null
                        }
                    </DragOverlay >
                </DndContext >
            )) : null}
            
            {/* Razítko bez neshod: fallback na samostatnou stránku pouze pokud se nevešlo na poslední stránku tabulky */}
            {currentStamp?.stampUrl && (!editorState.nonCompliances || editorState.nonCompliances.length === 0) && !currentStamp.overlayEnabled && !canEmbedStampIntoLastTablePage && (
                <PageSheet
                    key="stamp-only-page"
                    className={currentStamp.pageBreakBefore ? 'break-before-page' : ''}
                    pageNumber={1 + summaryPages.length + tablePages.length}
                    totalPages={totalPages}
                >
                    {readOnly ? (
                        // Read-only view (PDF generation)
                        <div className={`mt-8 ${currentStamp.pageBreakBefore ? 'break-before-page' : ''}`}>
                            <div
                                className={`block ${currentStamp.stampAlignment === 'center' ? 'text-center' : currentStamp.stampAlignment === 'right' ? 'text-right' : 'text-left'}`}
                            >
                                <div
                                    className="inline-block"
                                    style={{ width: `${Math.min(100, Math.max(10, (currentStamp.stampWidthRatio || 0.333) * 100))}%` }}
                                >
                                    <img
                                        src={currentStamp.stampUrl}
                                        alt="Razítko auditora"
                                        className="mx-auto block w-auto max-w-full h-auto"
                                        draggable={false}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        // Editable view with controls
                        <div className={`mt-8 relative group/stamp ${currentStamp.pageBreakBefore ? 'break-before-page' : ''}`} ref={stampContainerRef}>
                            <div
                                className={`block -mx-2 mb-2 ${currentStamp.stampAlignment === 'center' ? 'text-center' : currentStamp.stampAlignment === 'right' ? 'text-right' : 'text-left'}`}
                            >
                                <div
                                    className="inline-block align-top relative px-2 mb-4 group/stampphoto transition-all duration-75 ease-out print:break-inside-avoid text-left"
                                    style={{ width: `${Math.min(100, Math.max(10, (currentStamp.stampWidthRatio || 0.333) * 100))}%` }}
                                >
                                    <div className="relative print:break-inside-avoid block">
                                        <img
                                            src={currentStamp.stampUrl}
                                            alt="Razítko auditora"
                                            className="mx-auto block w-auto max-w-full h-auto max-h-[180mm] print:break-inside-avoid"
                                            draggable={false}
                                        />

                                        {/* Controls (Width & Alignment & Delete) */}
                                        {!readOnly && updateAuditorStamp && (
                                            <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover/stampphoto:opacity-100 transition-opacity print:hidden bg-white/90 rounded-lg shadow-sm border border-gray-200 p-1 z-10">
                                                {/* Overlay toggle */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        updateAuditorStamp({
                                                            overlayEnabled: !currentStamp.overlayEnabled,
                                                            overlayPosition: currentStamp.overlayPosition || { x: 80, y: 120 }
                                                        });
                                                    }}
                                                    className={`p-1 rounded hover:bg-purple-100 ${currentStamp.overlayEnabled ? 'text-purple-700 bg-purple-50' : 'text-gray-500'}`}
                                                    title={currentStamp.overlayEnabled ? 'Zrušit volné umístění (overlay)' : 'Volné umístění (overlay)'}
                                                >
                                                    <span className="text-[10px] font-bold">↔</span>
                                                </button>
                                                {/* Delete Button with inline confirmation */}
                                                {!showDeleteStampModal ? (
                                                    <button
                                                        ref={deleteStampButtonRef}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteStamp();
                                                        }}
                                                        className="p-1 rounded hover:bg-red-100 text-red-600"
                                                        title="Smazat razítko"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                ) : (
                                                    <div className="bg-white border border-gray-300 rounded p-2 shadow-lg min-w-[120px]">
                                                        <p className="text-xs text-gray-700 mb-2">Smazat razítko?</p>
                                                        <div className="flex gap-1">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    confirmDeleteStamp();
                                                                }}
                                                                className="flex-1 px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                                                            >
                                                                Ano
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setShowDeleteStampModal(false);
                                                                }}
                                                                className="flex-1 px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                                            >
                                                                Ne
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Šířku měníme plynule tažením za roh (resize handle). */}

                                                {/* Alignment Controls */}
                                                <div className="flex gap-1 justify-center border-t border-gray-200 pt-1 mt-1">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            updateAuditorStamp({ stampAlignment: 'left' });
                                                        }}
                                                        className={`p-1 rounded hover:bg-gray-100 ${(!currentStamp.stampAlignment || currentStamp.stampAlignment === 'left') ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}
                                                        title="Vlevo"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            updateAuditorStamp({ stampAlignment: 'center' });
                                                        }}
                                                        className={`p-1 rounded hover:bg-gray-100 ${currentStamp.stampAlignment === 'center' ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}
                                                        title="Na střed"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            updateAuditorStamp({ stampAlignment: 'right' });
                                                        }}
                                                        className={`p-1 rounded hover:bg-gray-100 ${currentStamp.stampAlignment === 'right' ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}
                                                        title="Vpravo"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                                        </svg>
                                                    </button>
                                                </div>

                                                {/* Page Break Control */}
                                                <div className="flex gap-1 justify-center border-t border-gray-200 pt-1 mt-1">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            updateAuditorStamp({ pageBreakBefore: !currentStamp.pageBreakBefore });
                                                        }}
                                                        className={`p-1.5 rounded shadow-sm border border-gray-200 flex justify-center ${currentStamp.pageBreakBefore ? 'bg-blue-100 text-blue-600 border-blue-300' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                                        title={currentStamp.pageBreakBefore ? 'Zrušit novou stránku před razítkem' : 'Vynutit novou stránku před razítkem'}
                                                    >
                                                        <DocumentDuplicateIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Smooth Resize Handle (bottom-right corner) */}
                                        {!readOnly && updateAuditorStamp && (
                                            <div
                                                className="absolute bottom-1 right-1 w-4 h-4 cursor-nwse-resize z-20 opacity-80 hover:opacity-100 print:hidden flex items-center justify-center"
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();

                                                    const startX = e.clientX;
                                                    const startWidthRatio = currentStamp.stampWidthRatio || 0.333;
                                                    const pageEl = stampContainerRef.current?.offsetParent as HTMLElement | null;
                                                    const pageWidth = pageEl?.clientWidth || 800;
                                                    setResizingStamp(true);

                                                    const handleMouseMove = (moveEvent: MouseEvent) => {
                                                        const diffPx = moveEvent.clientX - startX;
                                                        const diffRatio = diffPx / pageWidth;
                                                        let newRatio = startWidthRatio + diffRatio;
                                                        newRatio = Math.max(0.1, Math.min(1.0, newRatio));
                                                        updateAuditorStamp({ stampWidthRatio: newRatio });
                                                    };
                                                    const handleMouseUp = () => {
                                                        setResizingStamp(false);
                                                        document.removeEventListener('mousemove', handleMouseMove);
                                                        document.removeEventListener('mouseup', handleMouseUp);
                                                    };
                                                    document.addEventListener('mousemove', handleMouseMove);
                                                    document.addEventListener('mouseup', handleMouseUp);
                                                }}
                                            >
                                                <div className="w-3 h-3 border-r-2 border-b-2 border-blue-500/70"></div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </PageSheet>
            )}

            {/* Placeholder po smazání razítka – pouze v editoru, nikdy netisknout */}
            {!readOnly && editorState.auditorStamp === null && (
                <div className="print:hidden mx-auto mb-8" style={{ width: '210mm' }}>
                    <div className="border border-dashed border-gray-300 rounded-lg bg-white px-4 py-3 text-sm text-gray-700 flex items-center justify-between">
                        <div>
                            <div className="font-semibold">Razítko bylo smazáno</div>
                            <div className="text-xs text-gray-500">Klikni na „Obnovit razítko“ pro načtení z nastavení auditora.</div>
                        </div>
                        <button
                            type="button"
                            onClick={() => restoreAuditorStamp?.()}
                            className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700"
                        >
                            Obnovit razítko
                        </button>
                    </div>
                </div>
            )}

        </div >
    );
};
