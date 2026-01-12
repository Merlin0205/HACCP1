import React, { useState, useEffect, useMemo } from 'react';
import { Report, Audit, AuditStructure, AuditHeaderValues } from '../../types';
import { ReportEditorState, EditableNonCompliance } from '../../types/reportEditor';
import { Button } from '../ui/Button';
import { toast } from '../../utils/toast';
import { updateReportEditorState, createReport, fetchReport } from '../../services/firestore/reports';
import { UnsavedChangesModal } from './modals/UnsavedChangesModal';

import { SaveChoiceModal } from '../modals/SaveChoiceModal';
import { saveAs } from 'file-saver';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    sortableKeyboardCoordinates
} from '@dnd-kit/sortable';
import { ReportContent } from './ReportContent';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebaseConfig';
import ReactDOMServer from 'react-dom/server';

interface ReportEditorV2Props {
    report: Report;
    audit: Audit;
    auditStructure: AuditStructure;
    onBack: () => void;
    onReportCreated?: (reportId: string) => void;
}

export const ReportEditorV2: React.FC<ReportEditorV2Props> = ({
    report,
    audit,
    auditStructure,
    onBack,
    onReportCreated
}) => {
    const [editorState, setEditorState] = useState<ReportEditorState | null>(null);
    const [saving, setSaving] = useState(false);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1.0);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [showUnsavedModal, setShowUnsavedModal] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Store calculated row heights from the live editor for PDF generation
    const latestRowHeights = React.useRef<Map<string, number>>(new Map());

    const handleRowHeightsCalculated = React.useCallback((heights: Map<string, number>) => {
        latestRowHeights.current = heights;
    }, []);

    // Použít snapshot headerValues z reportu pokud existuje, jinak použít audit.headerValues
    // Použít pouze report.id a audit.id jako dependencies - headerValues se získají přímo v useMemo
    const currentHeaderValues = useMemo(() => {
        // Pokud report má snapshot, použít ho
        if (report.headerValuesSnapshot) {
            return report.headerValuesSnapshot;
        }
        // Jinak použít audit.headerValues
        return audit.headerValues;
    }, [report.id, audit.id]);

    const currentAudit: Audit = useMemo(() => {
        return {
            id: audit.id,
            premiseId: audit.premiseId,
            status: audit.status,
            createdAt: audit.createdAt,
            completedAt: audit.completedAt,
            note: audit.note,
            headerValues: currentHeaderValues,
            // Použít snapshot answers z reportu pokud existuje, jinak fallback na aktuální audit
            answers: report.answersSnapshot || audit.answers,
            auditTypeId: audit.auditTypeId,
            invoiceId: audit.invoiceId,
        };
    }, [audit.id, audit.premiseId, audit.status, audit.createdAt, audit.completedAt, audit.note, audit.auditTypeId, audit.invoiceId, audit.answers, currentHeaderValues, report.answersSnapshot]);

    // Initialize state
    useEffect(() => {
        const loadReportData = async () => {
            // Reset state while loading
            setEditorState(null);

            try {
                // Fetch fresh report data from Firestore to ensure we have the latest state
                const freshReport = await fetchReport(report.id);
                // Pozor: hned po vytvoření nové verze může Firestore vrátit "starší" snapshot (bez reportData/editorState),
                // zatímco prop `report` už obsahuje novější data (lokálně zapsaná do state).
                // Proto vybereme "lepší" objekt podle toho, jestli obsahuje editorState / summary.
                const pickBestReport = (fromProps: Report, fromDb: Report | null): Report => {
                    if (!fromDb) return fromProps;

                    const getEditorState = (r: any) => r?.smart?.editorState || r?.editorState;
                    const getSummaryText = (r: any) =>
                        r?.reportData?.summary?.evaluation_text ||
                        getEditorState(r)?.summaryOverrides?.evaluation_text ||
                        '';

                    const propsHasEditorState = Boolean(getEditorState(fromProps));
                    const dbHasEditorState = Boolean(getEditorState(fromDb));
                    const propsHasSummary = Boolean(getSummaryText(fromProps));
                    const dbHasSummary = Boolean(getSummaryText(fromDb));

                    // Preferujeme objekt, který má editorState (je to primární zdroj pro render).
                    if (propsHasEditorState && !dbHasEditorState) return fromProps;
                    if (!propsHasEditorState && dbHasEditorState) return fromDb;

                    // Pokud oba mají (nebo oba nemají) editorState, preferujeme ten, který má summary text.
                    if (propsHasSummary && !dbHasSummary) return fromProps;
                    if (!propsHasSummary && dbHasSummary) return fromDb;

                    // Jinak použít DB (default chování – čerstvá data).
                    return fromDb;
                };

                const reportData = pickBestReport(report, freshReport);
                const reportAny = reportData as any;

                // editorState může být buď v smart.editorState (novější verze) nebo přímo v reportu (starší verze)
                // Priorita: smart.editorState > editorState (novější verze mají prioritu)
                const editorStateFromReport = reportAny.smart?.editorState || reportAny.editorState;

                if (reportAny.smart?.editorState) {
                    console.log('[ReportEditorV2] editorState nalezen v smart.editorState');
                } else if (reportAny.editorState) {
                    console.log('[ReportEditorV2] editorState nalezen v report.editorState (starší formát)');
                } else {
                    console.warn('[ReportEditorV2] editorState nenalezen v reportu:', report.id);
                }

                if (editorStateFromReport) {
                    console.log('[ReportEditorV2] Načítám editorState z reportu:', report.id);
                    // Default vzhled (kvůli zpětné kompatibilitě)
                    if (!editorStateFromReport.visualTheme) {
                        editorStateFromReport.visualTheme = 'default';
                    }

                    // Validace editorState - zkontrolovat, že obsahuje nonCompliances
                    if (!editorStateFromReport.nonCompliances || !Array.isArray(editorStateFromReport.nonCompliances)) {
                        console.warn('[ReportEditorV2] editorState nemá validní nonCompliances, používám prázdný seznam');
                        editorStateFromReport.nonCompliances = [];
                    }

                    // Validace a čištění fotek v neshodách
                    editorStateFromReport.nonCompliances = editorStateFromReport.nonCompliances.map((nc: any) => {
                        if (nc.photos && Array.isArray(nc.photos)) {
                            // Filtrovat fotky, které nemají ani url ani base64
                            const validPhotos = nc.photos.filter((photo: any) => {
                                const hasUrl = photo.url && photo.url.trim() !== '';
                                const hasBase64 = photo.base64 && photo.base64.trim() !== '';
                                if (!hasUrl && !hasBase64) {
                                    console.warn('[ReportEditorV2] Foto bez url i base64 přeskočeno:', photo.id);
                                    return false;
                                }
                                return true;
                            });
                            return { ...nc, photos: validPhotos };
                        }
                        return nc;
                    });

                    // Pokud editorState nemá summaryOverrides nebo má prázdný evaluation_text,
                    // zkusit použít reportData.summary jako fallback
                    if (!editorStateFromReport.summaryOverrides?.evaluation_text) {
                        const summary = reportAny.reportData?.summary;
                        if (summary && summary.evaluation_text) {
                            console.log('[ReportEditorV2] editorState nemá evaluation_text, doplňuji z reportData.summary');
                            editorStateFromReport.summaryOverrides = {
                                ...editorStateFromReport.summaryOverrides,
                                evaluation_text: summary.evaluation_text || '',
                                key_findings: summary.key_findings || editorStateFromReport.summaryOverrides?.key_findings || [],
                                key_recommendations: summary.key_recommendations || editorStateFromReport.summaryOverrides?.key_recommendations || []
                            };
                        }
                    }

                    // Pokud editorState nemá auditorStamp (undefined), načíst ho z globálního nastavení
                    // Pokud je auditorStamp null, znamená to, že bylo smazáno a nemělo by se načítat
                    if (editorStateFromReport.auditorStamp === undefined) {
                        try {
                            const { fetchAuditorInfo } = await import('../../services/firestore/settings');
                            const auditorInfo = await fetchAuditorInfo();
                            if (auditorInfo.stampUrl) {
                                editorStateFromReport.auditorStamp = {
                                    stampUrl: auditorInfo.stampUrl,
                                    stampAlignment: 'left', // Vždy výchozí zarovnání vlevo
                                    stampWidthRatio: auditorInfo.stampWidthRatio || 0.333
                                };
                            }
                        } catch (error) {
                            console.error('[ReportEditorV2] Error loading auditor info:', error);
                        }
                    }

                    setEditorState(editorStateFromReport);
                    setIsDirty(false); // Reset dirty state při načtení editorState z reportu
                    console.log('[ReportEditorV2] editorState načten úspěšně, počet neshod:', editorStateFromReport.nonCompliances?.length || 0);
                } else {
                    // Pokud editorState neexistuje, zkusit použít reportData.summary jako fallback
                    // Toto je pro velmi staré verze reportů, které nemají editorState
                    console.warn('[ReportEditorV2] Report nemá editorState, zkouším použít reportData.summary jako fallback:', report.id);

                    const summary = reportAny.reportData?.summary;

                    if (summary) {
                        // Vytvořit minimální editorState z reportData.summary
                        // Toto je fallback pro starší verze, které nemají kompletní editorState
                        const fallbackEditorState = {
                            visualTheme: 'default',
                            nonCompliances: [], // Starší verze nemají detailní neshody v editorState
                            zoomLevel: 1.0,
                            summaryOverrides: {
                                evaluation_text: summary.evaluation_text || '',
                                key_findings: summary.key_findings || [],
                                key_recommendations: summary.key_recommendations || []
                            },
                            auditorStamp: undefined as any
                        };

                        // Načíst aktuální auditorInfo pro razítko
                        let auditorStamp: any = undefined;
                        try {
                            const { fetchAuditorInfo } = await import('../../services/firestore/settings');
                            const auditorInfo = await fetchAuditorInfo();
                            if (auditorInfo.stampUrl) {
                                auditorStamp = {
                                    stampUrl: auditorInfo.stampUrl,
                                    stampAlignment: 'left',
                                    stampWidthRatio: auditorInfo.stampWidthRatio || 0.333
                                };
                            }
                        } catch (error) {
                            console.error('[ReportEditorV2] Error loading auditor info:', error);
                        }

                        fallbackEditorState.auditorStamp = auditorStamp;

                        setEditorState(fallbackEditorState);
                        setIsDirty(false);
                        console.log('[ReportEditorV2] Použit fallback editorState z reportData.summary');
                    } else {
                        // Pokud ani reportData.summary neexistuje, zobrazit chybu
                        console.error('[ReportEditorV2] Report nemá editorState ani reportData.summary:', report.id);
                        toast.error('Tato verze reportu nemá uložená data. Report nelze zobrazit.');
                        setEditorState({
                            visualTheme: 'default',
                            nonCompliances: [],
                            zoomLevel: 1.0
                        });
                    }
                }
            } catch (error) {
                console.error('[ReportEditorV2] Error loading report data:', error);
                toast.error('Nepodařilo se načíst data reportu.');
                // Fallback to prop data if fetch fails
                const reportAny = report as any;
                // Priorita: smart.editorState > editorState (novější verze mají prioritu)
                const editorStateFromProp = reportAny.smart?.editorState || reportAny.editorState;
                if (editorStateFromProp) {
                    console.log('[ReportEditorV2] Použit editorState z prop (fallback po chybě)');
                    if (!editorStateFromProp.visualTheme) {
                        editorStateFromProp.visualTheme = 'default';
                    }
                    setEditorState(editorStateFromProp);
                    setIsDirty(false); // Reset dirty state při načtení editorState z prop
                } else {
                    // Pokud ani prop nemá editorState, vytvořit prázdný
                    console.warn('[ReportEditorV2] Ani prop nemá editorState, vytvářím prázdný');
                    setEditorState({
                        visualTheme: 'default',
                        nonCompliances: [],
                        zoomLevel: 1.0
                    });
                }
            }
        };

        loadReportData();
    }, [report.id, audit.id]);

    const handleSaveClick = () => {
        setShowSaveModal(true);
    };

    const handleOverwrite = async () => {
        if (!editorState) return;
        try {
            setSaving(true);
            // Sanitize state to remove undefined values which Firestore doesn't support
            const sanitizedState = JSON.parse(JSON.stringify(editorState));
            await updateReportEditorState(report.id, sanitizedState);
            toast.success('Změny uloženy do stávající verze');
            setShowSaveModal(false);
            setIsDirty(false); // Reset dirty state
        } catch (error) {
            console.error('Error saving report state:', error);
            toast.error('Chyba při ukládání');
        } finally {
            setSaving(false);
        }
    };

    const saveNewVersion = async (): Promise<string | null> => {
        if (!editorState) return null;
        try {
            setSaving(true);
            const { id, ...reportData } = report;
            // Sanitize state to remove undefined values which Firestore doesn't support
            const sanitizedState = JSON.parse(JSON.stringify(editorState));

            const newReportId = await createReport({
                ...reportData,
                editorState: sanitizedState,
                versionNumber: undefined,
                createdAt: undefined,
                updatedAt: undefined,
                isLatest: undefined
            } as any);

            toast.success('Vytvořena nová verze reportu');
            setIsDirty(false); // Reset dirty state
            return newReportId;

        } catch (error) {
            console.error('Error creating new version:', error);
            toast.error('Chyba při vytváření nové verze');
            return null;
        } finally {
            setSaving(false);
        }
    };

    const handleNewVersion = async () => {
        const newReportId = await saveNewVersion();
        if (newReportId) {
            setShowSaveModal(false);
            if (onReportCreated) {
                onReportCreated(newReportId);
            } else {
                window.location.reload();
            }
        }
    };

    const generatePDF = async () => {
        if (!editorState) return;
        try {
            setGeneratingPdf(true);
            toast.info('Generuji PDF, prosím čekejte...');

            const reportHtml = ReactDOMServer.renderToStaticMarkup(
                <ReportContent
                    report={report}
                    audit={currentAudit}
                    auditStructure={auditStructure}
                    editorState={editorState}
                    readOnly={true}
                    initialRowHeights={latestRowHeights.current}
                />
            );

            const fullHtml = `
                <!DOCTYPE html>
                <html lang="cs">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Audit Report</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
                    <style>
                        body { font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; overflow-wrap: break-word; word-break: break-word; }
                        ul { list-style-type: disc; padding-left: 2em; margin: 0.5em 0; }
                        ol { list-style-type: decimal; padding-left: 2em; margin: 0.5em 0; }
                        li { margin: 0.25em 0; }
                        span { white-space: pre-wrap; }
                        div { white-space: pre-wrap; }
                        p { white-space: pre-wrap; }
                        @page { size: A4; margin: 0; }
                        .break-before-page { page-break-before: always; }
                        .break-inside-avoid { page-break-inside: avoid; }
                        tr { page-break-inside: avoid; }
                        img { 
                            page-break-inside: avoid;
                            page-break-before: auto;
                            page-break-after: auto;
                        }
                        .print\\:break-inside-avoid {
                            page-break-inside: avoid !important;
                        }
                        /* Kompaktní typografie (globálně) */
                        .report-theme-compact {
                            font-size: 13.3px; /* ~10pt */
                            line-height: 1.25;
                        }
                        .report-theme-compact td,
                        .report-theme-compact th {
                            overflow-wrap: anywhere;
                            word-break: break-word;
                        }

                        /* PDF/print: zabránit "mezistránkovým" marginům, které v Chromu často vytvoří poslední prázdnou stránku */
                        @media print {
                            .page-sheet {
                                margin: 0 !important;          /* zrušit mx-auto/mb-8 pro tisk */
                                box-shadow: none !important;   /* vizuální – ať je PDF čisté */
                            }
                            /* Výjimka pro overlay razítko: přetečení nesmí vytvořit další stránku */
                            .page-sheet.has-overlay-stamp {
                                overflow: hidden !important;
                            }
                            /* Zalamovat až od druhé stránky (první nesmí vygenerovat prázdnou stránku) */
                            .page-sheet + .page-sheet {
                                break-before: page;
                                page-break-before: always;
                            }
                            /* Bez vynucení zalomení před první stránkou i kdyby tam byla třída break-before-page */
                            .break-before-page:first-child {
                                break-before: auto !important;
                                page-break-before: auto !important;
                            }
                        }
                    </style>
                </head>
                <body class="bg-white m-0 p-0">
                    ${reportHtml}
                </body>
                </html>
            `;

            const generatePdfFn = httpsCallable(functions, 'generatePdf');
            const result = await generatePdfFn({
                html: fullHtml,
                options: {
                    displayHeaderFooter: false,
                    margin: { top: '0', right: '0', bottom: '0', left: '0' }
                }
            });
            const { pdf } = result.data as { pdf: string };

            const byteCharacters = atob(pdf);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });

            saveAs(blob, `Audit_${auditStructure.audit_title}_${new Date().toISOString().split('T')[0]}.pdf`);
            toast.success('PDF úspěšně staženo');

        } catch (error) {
            console.error('Error generating PDF:', error);
            toast.error('Chyba při generování PDF. Zkuste to prosím znovu.');
        } finally {
            setGeneratingPdf(false);
        }
    };

    const handleExportPDFClick = () => {
        if (isDirty) {
            setShowUnsavedModal(true);
        } else {
            generatePDF();
        }
    };

    const handleOverwriteAndGenerate = async () => {
        // 1. Save (Overwrite)
        await handleOverwrite();
        // 2. Generate
        setShowUnsavedModal(false);
        await generatePDF();
    };

    const handleNewVersionAndGenerate = async () => {
        // 1. Save (New Version)
        const newReportId = await saveNewVersion();
        if (newReportId) {
            // 2. Generate
            setShowUnsavedModal(false);
            await generatePDF();

            // 3. Navigate/Reload
            if (onReportCreated) {
                onReportCreated(newReportId);
            } else {
                window.location.reload();
            }
        }
    };

    const handleGenerateOnly = async () => {
        setShowUnsavedModal(false);
        await generatePDF();
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id && editorState) {
            setEditorState((prevState) => {
                if (!prevState) return null;
                const oldIndex = prevState.nonCompliances.findIndex((item) => item.id === active.id);
                const newIndex = prevState.nonCompliances.findIndex((item) => item.id === over.id);
                return {
                    ...prevState,
                    nonCompliances: arrayMove(prevState.nonCompliances, oldIndex, newIndex),
                };
            });
            setIsDirty(true); // Mark as dirty
        }
    };

    const updateNonCompliance = (id: string, updates: Partial<EditableNonCompliance>) => {
        if (!editorState) return;
        setEditorState({
            ...editorState,
            nonCompliances: editorState.nonCompliances.map(nc =>
                nc.id === id ? { ...nc, ...updates } : nc
            )
        });
        setIsDirty(true); // Mark as dirty
    };

    const updateAuditorStamp = (updates: Partial<{
        stampUrl?: string | null;
        stampAlignment?: 'left' | 'center' | 'right';
        stampWidth?: number;
        stampWidthRatio?: number;
        overlayEnabled?: boolean;
        overlayPageNumber?: number;
        overlayPosition?: { x: number; y: number };
    }>) => {
        if (!editorState) return;

        // Pokud je stampUrl null, smazat razítko (nastavit na null místo undefined, aby bylo jasné, že bylo smazáno)
        if (updates.stampUrl === null) {
            setEditorState({
                ...editorState,
                auditorStamp: null as any // null znamená, že bylo smazáno (vs undefined = nebylo nikdy nastaveno)
            });
        } else if (updates.stampUrl === undefined) {
            // Pokud je undefined, jen aktualizovat ostatní vlastnosti
            setEditorState({
                ...editorState,
                auditorStamp: editorState.auditorStamp ? {
                    ...editorState.auditorStamp,
                    ...updates
                } : undefined
            });
        } else {
            // Nové razítko nebo aktualizace
            setEditorState({
                ...editorState,
                auditorStamp: {
                    ...editorState.auditorStamp,
                    ...updates
                }
            });
        }
        setIsDirty(true); // Mark as dirty
    };

    const restoreAuditorStamp = async () => {
        if (!editorState) return;
        try {
            const { fetchAuditorInfo } = await import('../../services/firestore/settings');
            const auditorInfo = await fetchAuditorInfo();
            if (auditorInfo.stampUrl) {
                updateAuditorStamp({
                    stampUrl: auditorInfo.stampUrl,
                    stampAlignment: 'left', // Vždy výchozí zarovnání vlevo
                    stampWidthRatio: auditorInfo.stampWidthRatio || 0.333
                });
            }
        } catch (error) {
            console.error('[ReportEditorV2] Error restoring auditor stamp:', error);
        }
    };

    const moveNonCompliance = (id: string, direction: 'up' | 'down') => {
        if (!editorState) return;

        const currentIndex = editorState.nonCompliances.findIndex(nc => nc.id === id);
        if (currentIndex === -1) return;

        let newIndex: number;
        if (direction === 'up') {
            if (currentIndex === 0) return; // Already at top
            newIndex = currentIndex - 1;
        } else {
            if (currentIndex === editorState.nonCompliances.length - 1) return; // Already at bottom
            newIndex = currentIndex + 1;
        }

        const newNonCompliances = [...editorState.nonCompliances];
        const [movedItem] = newNonCompliances.splice(currentIndex, 1);
        newNonCompliances.splice(newIndex, 0, movedItem);

        setEditorState({
            ...editorState,
            nonCompliances: newNonCompliances
        });
        setIsDirty(true); // Mark as dirty
    };

    if (!editorState) return <div>Načítání editoru...</div>;

    const currentVisualTheme = editorState.visualTheme || 'default';

    const setVisualTheme = (theme: 'default' | 'compact') => {
        if (currentVisualTheme === theme) return;
        setEditorState({
            ...editorState,
            visualTheme: theme
        });
        setIsDirty(true);
    };

    return (
        <div className="bg-gray-100 relative">
            {/* Sticky Header for Editor Actions */}
            <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-gray-200 shadow-sm px-6 py-3 flex justify-between items-center transition-all duration-300">
                <div className="flex items-center gap-4">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                            if (isDirty) {
                                if (confirm('Máte neuložené změny. Opravdu chcete odejít?')) {
                                    onBack();
                                }
                            } else {
                                onBack();
                            }
                        }}
                        className="!p-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </Button>
                    {isDirty && <span className="text-xs font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">● Neuloženo</span>}
                </div>
                <div className="flex items-center gap-3">
                    {/* Zoom Controls */}
                    <div className="flex items-center bg-gray-100 rounded-lg p-1 mr-4">
                        <button
                            onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.1))}
                            className="p-1.5 hover:bg-white rounded-md transition-colors text-gray-600"
                            title="Oddálit"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                        </button>
                        <span className="text-xs font-medium w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
                        <button
                            onClick={() => setZoomLevel(prev => Math.min(2.0, prev + 0.1))}
                            className="p-1.5 hover:bg-white rounded-md transition-colors text-gray-600"
                            title="Přiblížit"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        </button>
                    </div>

                    {/* Visual Theme Toggle */}
                    <div className="flex items-center bg-gray-100 rounded-lg p-1 mr-2" title="Vzhled reportu">
                        <button
                            type="button"
                            onClick={() => setVisualTheme('default')}
                            className={`px-2.5 py-1 text-xs rounded-md transition-colors ${currentVisualTheme === 'default'
                                ? 'bg-white shadow-sm text-gray-900'
                                : 'text-gray-600 hover:bg-white/70'
                                }`}
                        >
                            Aktuální
                        </button>
                        <button
                            type="button"
                            onClick={() => setVisualTheme('compact')}
                            className={`px-2.5 py-1 text-xs rounded-md transition-colors ${currentVisualTheme === 'compact'
                                ? 'bg-white shadow-sm text-gray-900'
                                : 'text-gray-600 hover:bg-white/70'
                                }`}
                        >
                            Kompaktní
                        </button>
                    </div>

                    <Button
                        variant="primary"
                        onClick={handleSaveClick}
                        isLoading={saving}
                        leftIcon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>}
                    >
                        Uložit změny
                    </Button>
                    <Button
                        variant="success"
                        onClick={handleExportPDFClick}
                        isLoading={generatingPdf}
                        leftIcon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
                    >
                        Stáhnout PDF
                    </Button>
                </div>
            </div>

            {/* Zoomable Content Area */}
            <div className="overflow-auto p-8 flex justify-center">
                <div
                    style={{
                        transform: `scale(${zoomLevel})`,
                        transformOrigin: 'top center',
                        transition: 'transform 0.2s ease-out'
                    }}
                >
                    <ReportContent
                        report={report}
                        audit={currentAudit}
                        auditStructure={auditStructure}
                        editorState={editorState}
                        setEditorState={setEditorState}
                        sensors={sensors}
                        handleDragEnd={handleDragEnd}
                        updateNonCompliance={updateNonCompliance}
                        moveNonCompliance={moveNonCompliance}
                        updateAuditorStamp={updateAuditorStamp}
                        restoreAuditorStamp={restoreAuditorStamp}
                        onRowHeightsCalculated={handleRowHeightsCalculated}
                    />
                </div>
            </div>
            {/* Save Choice Modal */}
            <SaveChoiceModal
                isOpen={showSaveModal}
                onClose={() => setShowSaveModal(false)}
                onOverwrite={handleOverwrite}
                onNewVersion={handleNewVersion}
                isSaving={saving}
            />
            {/* Unsaved Changes Modal */}
            <UnsavedChangesModal
                isOpen={showUnsavedModal}
                onClose={() => setShowUnsavedModal(false)}
                onOverwriteAndGenerate={handleOverwriteAndGenerate}
                onNewVersionAndGenerate={handleNewVersionAndGenerate}
                onGenerateOnly={handleGenerateOnly}
                isSaving={saving || generatingPdf}
            />
        </div>
    );
};
