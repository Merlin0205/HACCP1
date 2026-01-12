import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
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
import { PAGE_LAYOUT } from '../../hooks/useMeasuredBlocks';

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
    initialRowHeights?: Map<string, number>;
    onRowHeightsCalculated?: (heights: Map<string, number>) => void;
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
    updateAuditorStamp,
    initialRowHeights,
    onRowHeightsCalculated
}) => {
    // Helper to format date
    const formatDate = (dateString?: string): string => {
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? 'Neplatné datum' : date.toLocaleDateString('cs-CZ');
    };

    // Použít snapshot headerValues z reportu pokud existuje, jinak použít audit.headerValues
    const headerValues = report.headerValuesSnapshot || audit.headerValues;

    // Vizuální kabát reportu (default / compact)
    const visualTheme = editorState.visualTheme || 'default';
    const isCompact = visualTheme === 'compact';

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

    // --- Dynamic Layout Configuration ---
    // Use PAGE_LAYOUT from useMeasuredBlocks hook for consistent A4 dimensions
    // PAGE_LAYOUT.usableHeightPx = (297 - 10 - 20) * 3.78 = 1009.26px
    // This is the maximum content height before hitting the footer
    const PAGE_HEIGHT_PX = PAGE_LAYOUT.usableHeightPx;

    // Layout Themes Config
    const LAYOUT_CONFIG = {
        default: {
            tableHeaderHeight: 36,
            sectionHeaderHeight: 36,
            // Title: p-2 (16px) + text-xs/sm (14px*1.25=17.5) + border = ~34.5
            titleBaseHeight: 35,
            // Desc: py-1 (8px) + text-[7px] (9px) + border = ~18
            descBaseHeight: 18,
            lineHeightTitle: 17.5,
            lineHeightDesc: 10,
            titleFont: '12px Inter, sans-serif',
            descFont: '10px Inter, sans-serif',
            descColWidth: 498, // 66% of ~755px usable
            titleColWidth: 165, // 22% of ~755px usable
        },
        compact: {
            tableHeaderHeight: 32,
            sectionHeaderHeight: 32,
            // Title: p-1.5 (12px) + text-xs (12px*1.375=16.5) + border = ~29.5
            titleBaseHeight: 29,
            // Desc: py-0.5 (4px) + text-[10px] (10px*1.25=12.5) + border = ~17.5
            descBaseHeight: 18,
            lineHeightTitle: 16.5,
            lineHeightDesc: 14,
            titleFont: '12px Inter, sans-serif',
            descFont: '10px Inter, sans-serif',
            descColWidth: 498,
            titleColWidth: 165,
        }
    };

    const activeLayout = isCompact ? LAYOUT_CONFIG.compact : LAYOUT_CONFIG.default;

    // Canvas for text measurement
    const measureTextWidth = (text: string, font: string) => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) return 0;
        context.font = font;
        return context.measureText(text).width;
    };

    const TABLE_HEADER_HEIGHT = activeLayout.tableHeaderHeight;
    const SECTION_HEADER_HEIGHT = activeLayout.sectionHeaderHeight;
    // Base row height for single-line comparisons is the max of the two bases
    const BASE_ROW_HEIGHT = Math.max(activeLayout.titleBaseHeight, activeLayout.descBaseHeight);

    const LINE_HEIGHT_TITLE = activeLayout.lineHeightTitle;
    const LINE_HEIGHT_DESC = activeLayout.lineHeightDesc;

    // --- DOM-Based Table Row Measurement ---
    // Ref for hidden measurement container
    const tableRowMeasureRef = useRef<HTMLDivElement>(null);
    const [measuredRowHeights, setMeasuredRowHeights] = useState<Map<string, number>>(initialRowHeights || new Map());
    const [measurementComplete, setMeasurementComplete] = useState(!!(initialRowHeights && initialRowHeights.size > 0));

    // Build flat list of table elements for measurement
    const allTableItems = useMemo(() => {
        const items: { type: 'header' | 'row'; id: string; title?: string; item?: any; sectionId?: string }[] = [];
        auditStructure.audit_sections.filter(s => s.active).forEach(section => {
            items.push({ type: 'header', id: `section-${section.id}`, title: section.title });
            section.items.filter((i: any) => i.active).forEach((item: any) => {
                items.push({ type: 'row', id: item.id, item, sectionId: section.id });
            });
        });
        return items;
    }, [auditStructure]);

    // Measure actual row heights after render
    useLayoutEffect(() => {
        // If measurements are provided initially and we are in readOnly mode (likely PDF generation),
        // we can skip re-measurement or just respect the initial values.
        // However, in live editor, we want to measure always to be safe.
        // For renderToStaticMarkup, this effect won't run anyway.

        const container = tableRowMeasureRef.current;
        if (!container || allTableItems.length === 0) {
            setMeasuredRowHeights(new Map());
            setMeasurementComplete(true);
            return;
        }

        const heights = new Map<string, number>();
        allTableItems.forEach(item => {
            const el = container.querySelector(`[data-row-id="${item.id}"]`);
            if (el) {
                heights.set(item.id, el.getBoundingClientRect().height);
            }
        });
        setMeasuredRowHeights(heights);
        setMeasurementComplete(true);
        if (onRowHeightsCalculated) {
            onRowHeightsCalculated(heights);
        }
    }, [allTableItems, isCompact, visualTheme, onRowHeightsCalculated]);

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
            const location = (nc.location || '').trim();
            const finding = (nc.finding || '').trim();
            const recommendation = (nc.recommendation || '').trim();

            // Fonts for NC text - assuming same as DESC_FONT from table for consistency or slightly larger?
            // NC text usually inherits body font. Let's use 13.3px sans-serif as base.
            const NC_FONT = '13.3px Inter, sans-serif';

            // Width available for text: Page width (approx 794px) - Margins (p-8=32px*2=64px) - Border/Padding (pl-4=16px + border=4px = 20px)
            // Approx available width = 710px. Let's be safe with 700px.
            const NC_TEXT_WIDTH = 700;

            const measureLines = (text: string) => {
                if (!text) return 0;
                const width = measureTextWidth(text, NC_FONT);
                // Add 5% buffer for wrapping
                return Math.max(1, Math.ceil((width * 1.05) / NC_TEXT_WIDTH));
            };

            const locationLines = measureLines(location);
            const findingLines = measureLines(finding);
            const recommendationLines = measureLines(recommendation);

            // Height calculation:
            // For each block: Label (1 line) + Text (N lines) + Spacing
            // Label is bold, approx 20px height. Text line approx 19px.
            // Layout: 
            // - Misto Label (20px) + Text (N*19px) + mb-1 (4px)
            // - Zjisteni Label (20px) + Text (N*19px) + mb-1 (4px)
            // - Doporuceni Label (20px) + Text (N*19px)

            const BLOCK_SPACING = isCompact ? 2 : 4;
            const LABEL_HEIGHT = 20;
            const TEXT_LINE_HEIGHT = 19;

            textHeight += (LABEL_HEIGHT + locationLines * TEXT_LINE_HEIGHT + BLOCK_SPACING);
            textHeight += (LABEL_HEIGHT + findingLines * TEXT_LINE_HEIGHT + BLOCK_SPACING);
            textHeight += (LABEL_HEIGHT + recommendationLines * TEXT_LINE_HEIGHT);

            // Remove the base "textHeight += ..." from original code which was adding lines relative to base height
            // Actually NC_BASE_HEIGHT (160) likely included the red border padding and header info?
            // NC_BASE_HEIGHT includes: Index/Title (approx 30px?) + Section (20px?) + Margins.
            // Let's reset the dynamic part addition.
            // Original code: textHeight = NC_BASE_HEIGHT + (lines-1)*19.
            // Now we calculate full dynamic part.
            // Let's say basic framework overhead (Title, Section, Red Border container padding) is ~60-80px.
            // Let's adjust NC_BASE_HEIGHT to represent non-text parts.
            // NC_BASE_HEIGHT was 160.
            // If we add full height of text blocks, we should start from a lower base.
            // Let's conservatively subtract some from base or just use calculated height on top of a smaller base.

            // Refined Base: TitleRow (~24px) + SectionRow (~20px) + ContainerPadding (~20px) = ~64px.
            // Let's try starting with 70px base.
            textHeight = 70 + (LABEL_HEIGHT + locationLines * TEXT_LINE_HEIGHT + BLOCK_SPACING) +
                (LABEL_HEIGHT + findingLines * TEXT_LINE_HEIGHT + BLOCK_SPACING) +
                (LABEL_HEIGHT + recommendationLines * TEXT_LINE_HEIGHT);

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

    // --- Audit Table Pagination Logic (using measured heights) ---

    // Define renderable elements for the table
    type TableElement =
        | { type: 'header'; id: string; title: string; height: number }
        | { type: 'row'; id: string; item: any; height: number; sectionId: string };

    // Fallback estimation function (used before measurement completes)
    const estimateItemHeight = (item: any): number => {
        // Simple estimation: base height + extra per character count  
        const titleLen = (item?.title || '').length;
        const descLen = (item?.description || '').length;
        const titleLines = Math.max(1, Math.ceil(titleLen / 20));
        const descLines = Math.max(1, Math.ceil(descLen / 60));
        return BASE_ROW_HEIGHT + Math.max(0, Math.max(titleLines, descLines) - 1) * 16;
    };

    // Use measured heights or fall back to estimation
    const getRowHeight = (itemId: string, item?: any): number => {
        const measured = measuredRowHeights.get(itemId);
        if (measured !== undefined) {
            return measured;
        }
        // Fallback to estimation if not yet measured
        if (item) {
            return estimateItemHeight(item);
        }
        return SECTION_HEADER_HEIGHT;
    };

    const tablePages: TableElement[][] = useMemo(() => {
        if (!measurementComplete) return [];

        const pages: TableElement[][] = [];
        const allElements: TableElement[] = [];

        // Build elements with measured heights
        auditStructure.audit_sections.filter(s => s.active).forEach(section => {
            allElements.push({
                type: 'header',
                id: section.id,
                title: section.title,
                height: getRowHeight(`section-${section.id}`) || SECTION_HEADER_HEIGHT
            });

            section.items.filter((i: any) => i.active).forEach((item: any) => {
                allElements.push({
                    type: 'row',
                    id: item.id,
                    item: item,
                    height: getRowHeight(item.id, item),
                    sectionId: section.id
                });
            });
        });

        // Paginate using measured heights
        let currentPage: TableElement[] = [];
        let currentHeight = TABLE_HEADER_HEIGHT;

        for (const element of allElements) {
            if (currentHeight + element.height > PAGE_HEIGHT_PX) {
                if (currentPage.length > 0) {
                    pages.push(currentPage);
                    currentPage = [];
                    currentHeight = TABLE_HEADER_HEIGHT;
                }
            }
            currentPage.push(element);
            currentHeight += element.height;
        }

        if (currentPage.length > 0) {
            pages.push(currentPage);
        }

        return pages;
    }, [measurementComplete, measuredRowHeights, auditStructure, PAGE_HEIGHT_PX, TABLE_HEADER_HEIGHT, SECTION_HEADER_HEIGHT]);

    // Použít paginaci z useMemo (už je definována výše)
    // nonCompliancePages a ncPageHeights jsou již vypočítány v useMemo výše

    // --- Razítko bez neshod: zkusit ho dát na poslední stránku tabulky, pokud je tam místo ---
    // Pokud by se nevešlo, použije se fallback samostatné stránky (níže).
    const STAMP_BASE_HEIGHT_PX = 200;
    const STAMP_MARGIN_PX = 32;
    const STAMP_HEIGHT_PX = STAMP_BASE_HEIGHT_PX + STAMP_MARGIN_PX;

    // Calculate the height of the last table page from measured elements
    const lastTablePageHeight = useMemo(() => {
        if (tablePages.length === 0) return 0;
        const lastPage = tablePages[tablePages.length - 1];
        return TABLE_HEADER_HEIGHT + lastPage.reduce((sum, el) => sum + el.height, 0);
    }, [tablePages, TABLE_HEADER_HEIGHT]);

    const canEmbedStampIntoLastTablePage =
        Boolean(currentStamp?.stampUrl) &&
        (!editorState.nonCompliances || editorState.nonCompliances.length === 0) &&
        !currentStamp?.overlayEnabled &&
        !currentStamp?.pageBreakBefore &&
        tablePages.length > 0 &&
        lastTablePageHeight + STAMP_HEIGHT_PX <= PAGE_HEIGHT_PX;

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
    // Kompaktní varianta má sekce "Pracoviště" a "Provozovatel" pod sebou (vyšší, ale hustší řádky).
    // Raději lehce nadhodnotit, aby nikdy nedošlo k přetečení na 1. stránce.
    const HEADER_TABLES_HEIGHT = isCompact ? 460 : 450;
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
        <div className={`font-sans ${isCompact ? 'report-theme-compact text-xs leading-[1.25]' : 'report-theme-default text-sm'}`}>
            {blocks.map((block, idx) => {
                switch (block.type) {
                    case 'header_tables':
                        return (
                            <div key={idx}>
                                {/* Header */}
                                <h1 className="text-2xl font-bold text-center mb-4">{auditStructure.audit_title}</h1>
                                <div className={`text-center ${isCompact ? 'mb-4' : 'mb-8'} ${isCompact ? '' : 'text-base'}`}>
                                    <p><strong>Datum auditu:</strong> {formatDate(audit.completedAt)}</p>
                                    <p><strong>Za provozovatele přítomen:</strong> {(headerValues as any).present_person || 'Neuvedeno'}</p>
                                </div>

                                {/* Auditor Table */}
                                <div className={`${isCompact ? 'mb-4' : 'mb-8'} border-y-2 border-black py-2`}>
                                    <h2 className="text-sm font-bold uppercase text-center mb-2">Zpracovatel Auditu</h2>
                                    <table className={`w-full ${isCompact ? '' : 'text-sm'}`}>
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
                                                        <td key={field.id} className={`${isCompact ? 'p-0.5' : 'p-1'}`}>{auditorValueMap[field.id] || '-'}</td>
                                                    );
                                                })}
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* Header Sections (Premise & Operator) */}
                                {isCompact ? (
                                    // Kompaktní: sekce pod sebou (lepší využití šířky pro dlouhé hodnoty, hlavně "Název, obchodní firma")
                                    <div className="mb-4 space-y-4">
                                        {[auditStructure.header_data.audited_premise, auditStructure.header_data.operator].map((section, sIdx) => (
                                            <div key={sIdx}>
                                                <h2 className="text-sm font-bold uppercase border-b-2 border-black pb-1 mb-2">{section.title}</h2>
                                                {(() => {
                                                    const phoneField = section.fields.find(f => /telefon/i.test(f.label));
                                                    const emailField = section.fields.find(f => /e-?mail/i.test(f.label));
                                                    const otherFields = section.fields.filter(f => f.id !== phoneField?.id && f.id !== emailField?.id);

                                                    return (
                                                        <table className="w-full text-xs">
                                                            <tbody>
                                                                {otherFields.map(field => (
                                                                    <tr key={field.id}>
                                                                        <td className="font-semibold pr-4 py-0.5 w-44 align-top whitespace-nowrap">
                                                                            {field.label}
                                                                        </td>
                                                                        <td
                                                                            className="py-0.5 leading-snug"
                                                                            style={{
                                                                                overflowWrap: 'anywhere',
                                                                                wordBreak: 'break-word'
                                                                            }}
                                                                        >
                                                                            {headerValues[field.id] || '-'}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                                {(phoneField || emailField) && (
                                                                    <tr>
                                                                        <td className="font-semibold pr-4 py-0.5 w-44 align-top whitespace-nowrap">Kontakt</td>
                                                                        <td className="py-0.5 leading-snug">
                                                                            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
                                                                                {phoneField && (
                                                                                    <div className="min-w-0">
                                                                                        <span className="font-semibold text-gray-700">Telefon:</span>{' '}
                                                                                        <span style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                                                                                            {headerValues[phoneField.id] || '-'}
                                                                                        </span>
                                                                                    </div>
                                                                                )}
                                                                                {emailField && (
                                                                                    <div className="min-w-0">
                                                                                        <span className="font-semibold text-gray-700">E-mail:</span>{' '}
                                                                                        <span style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                                                                                            {headerValues[emailField.id] || '-'}
                                                                                        </span>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    );
                                                })()}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    // Default: původní layout vedle sebe (beze změny)
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
                                )}
                            </div>
                        );
                    case 'summary_title':
                        return (
                            <h3 key={idx} className="text-sm font-bold uppercase border-b-2 border-black pb-1 mb-4">Souhrnné hodnocení auditu</h3>
                        );
                    case 'evaluation':
                        return (
                            <div key={idx} className="mb-4">
                                <EditableText
                                    tagName="div"
                                    className={`text-gray-600 ${isCompact ? 'text-xs' : 'text-base'}`}
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
                <h2 className={`${isCompact ? 'pb-0.5 mb-1' : 'text-sm pb-1 mb-2'} font-bold uppercase border-b-2 border-black`}>SEZNAM AUDITOVANÝCH POLOŽEK</h2>
            )}
            <table className={`w-full border-collapse border border-gray-300 ${isCompact ? 'text-xs' : 'text-sm'} ${renderStampAtEnd ? (isCompact ? 'mb-2' : 'mb-4') : 'mb-auto'}`}>
                <thead>
                    <tr className="bg-gray-100">
                        <th className={`border border-gray-300 text-left w-[22%] ${isCompact ? 'p-1.5' : 'p-2'}`}>Předmět auditu</th>
                        <th className={`border border-gray-300 text-left w-[66%] ${isCompact ? 'p-1.5' : 'p-2'}`}>Popis</th>
                        <th className={`border border-gray-300 text-left w-[12%] ${isCompact ? 'p-1.5' : 'p-2'}`}>Hodnocení</th>
                    </tr>
                </thead>
                <tbody>
                    {elements.map((element, idx) => {
                        if (element.type === 'header') {
                            return (
                                <tr key={`${element.id}-header-${idx}`} className="bg-gray-50">
                                    <td colSpan={3} className={`border border-gray-300 font-bold ${isCompact ? 'p-1.5' : 'p-2'}`}>{element.title}</td>
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
                                    <td className={`border border-gray-300 ${isCompact ? 'p-1.5 leading-snug' : 'p-2 text-xs'}`}>{item.title}</td>
                                    <td className={`border border-gray-300 leading-tight text-gray-500 ${isCompact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-[7px]'}`}>{item.description}</td>
                                    <td className={`border border-gray-300 ${status.color} whitespace-nowrap ${isCompact ? 'p-1.5' : 'p-2'}`}>{status.text}</td>
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
                        updateAuditorStamp={readOnly ? (() => { }) : (updateAuditorStamp || ((_: any) => { }))}
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
        <div className={`font-sans print:bg-white ${isCompact ? 'report-theme-compact text-xs leading-[1.25]' : 'report-theme-default text-sm'}`}>
            {/* Hidden Measurement Container for DOM-based pagination */}
            <div
                ref={tableRowMeasureRef}
                style={{
                    position: 'absolute',
                    visibility: 'hidden',
                    width: `${PAGE_LAYOUT.usableWidthPx}px`,
                    left: '-9999px',
                    top: 0,
                    pointerEvents: 'none'
                }}
                aria-hidden="true"
            >
                <table className={`w-full border-collapse border border-gray-300 ${isCompact ? 'text-xs' : 'text-sm'}`}>
                    <thead>
                        <tr className="bg-gray-100">
                            <th className={`border border-gray-300 text-left w-[22%] ${isCompact ? 'p-1.5' : 'p-2'}`}>Předmět auditu</th>
                            <th className={`border border-gray-300 text-left w-[66%] ${isCompact ? 'p-1.5' : 'p-2'}`}>Popis</th>
                            <th className={`border border-gray-300 text-left w-[12%] ${isCompact ? 'p-1.5' : 'p-2'}`}>Hodnocení</th>
                        </tr>
                    </thead>
                    <tbody>
                        {allTableItems.map(item => {
                            if (item.type === 'header') {
                                return (
                                    <tr key={item.id} data-row-id={item.id} className="bg-gray-50">
                                        <td colSpan={3} className={`border border-gray-300 font-bold ${isCompact ? 'p-1.5' : 'p-2'}`}>{item.title}</td>
                                    </tr>
                                );
                            } else {
                                const answersToUse = report.answersSnapshot || audit.answers;
                                const answer = answersToUse[item.item.id];
                                const status = answer && !answer.compliant
                                    ? { text: 'NEVYHOVUJE', color: 'text-red-600 font-bold' }
                                    : { text: 'VYHOVUJE', color: 'text-black font-bold' };
                                return (
                                    <tr key={item.id} data-row-id={item.id}>
                                        <td className={`border border-gray-300 ${isCompact ? 'p-1.5 leading-snug' : 'p-2 text-xs'}`}>{item.item.title}</td>
                                        <td className={`border border-gray-300 leading-tight text-gray-500 ${isCompact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-[7px]'}`}>{item.item.description}</td>
                                        <td className={`border border-gray-300 ${status.color} whitespace-nowrap ${isCompact ? 'p-1.5' : 'p-2'}`}>{status.text}</td>
                                    </tr>
                                );
                            }
                        })}
                    </tbody>
                </table>
            </div>

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
                                            updateAuditorStamp={() => { }}
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
                                        compact={isCompact}
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
                                                    compact={isCompact}
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
                                                    compact={isCompact}
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
                                        updateAuditorStamp={() => { }}
                                        readOnly={true}
                                        pageBreakBefore={currentStamp?.pageBreakBefore || false}
                                    />
                                ) : (
                                    <NonComplianceItem
                                        nc={editorState.nonCompliances.find(i => i.id === activeId)!}
                                        index={editorState.nonCompliances.findIndex(i => i.id === activeId)}
                                        readOnly={true}
                                        compact={isCompact}
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
