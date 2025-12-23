import React from 'react';
import { EditableNonCompliance } from '../../types/reportEditor';
import { EditableText } from '../ui/EditableText';
import {
    ArrowsUpDownIcon,
    DocumentDuplicateIcon,
    Squares2X2Icon,
    ViewColumnsIcon,
    StopIcon
} from '@heroicons/react/24/outline';

interface NonComplianceItemProps {
    nc: EditableNonCompliance;
    index: number;
    updateNonCompliance?: (id: string, updates: Partial<EditableNonCompliance>) => void;
    moveNonCompliance?: (id: string, direction: 'up' | 'down') => void;
    readOnly?: boolean;
    dragHandleProps?: any;
    dragListeners?: any;
    style?: React.CSSProperties;
    innerRef?: (node: HTMLElement | null) => void;
    renderText?: boolean;
    photoSlice?: [number, number];
}

export const NonComplianceItem: React.FC<NonComplianceItemProps> = ({
    nc,
    index,
    updateNonCompliance,
    moveNonCompliance,
    readOnly = false,
    dragHandleProps,
    dragListeners,
    style,
    innerRef,
    renderText = true,
    photoSlice
}) => {
    const photoContainerRef = React.useRef<HTMLDivElement>(null);
    const [resizingPhotoId, setResizingPhotoId] = React.useState<string | null>(null);

    // Slice photos if needed
    const displayPhotos = photoSlice
        ? nc.photos?.slice(photoSlice[0], photoSlice[1])
        : nc.photos;

    return (
        <div ref={innerRef} style={style} className={`mb-6 pt-4 ${renderText ? 'border-t border-gray-200' : ''} group/item relative ${readOnly ? '' : 'hover:bg-gray-50'}`}>

            {/* Gutter Controls - Outside the content flow */}
            {!readOnly && moveNonCompliance && renderText && (
                <div className="absolute left-[-40px] top-4 flex flex-col gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity print:hidden z-50 w-8">
                    <button
                        onClick={() => moveNonCompliance(nc.id, 'up')}
                        className="p-1.5 bg-gray-100 hover:bg-blue-100 rounded text-gray-500 hover:text-blue-600 shadow-sm border border-gray-200 flex justify-center"
                        title="Přesunout nahoru"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                    </button>
                    <button
                        onClick={() => moveNonCompliance(nc.id, 'down')}
                        className="p-1.5 bg-gray-100 hover:bg-blue-100 rounded text-gray-500 hover:text-blue-600 shadow-sm border border-gray-200 flex justify-center"
                        title="Přesunout dolů"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    <button
                        onClick={() => updateNonCompliance!(nc.id, { pageBreakBefore: !nc.pageBreakBefore })}
                        className={`p-1.5 rounded shadow-sm border border-gray-200 flex justify-center ${nc.pageBreakBefore ? 'bg-blue-100 text-blue-600 border-blue-300' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        title="Nová stránka před"
                    >
                        <DocumentDuplicateIcon className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Page Break Indicator */}
            {nc.pageBreakBefore && renderText && (
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

            {/* Content - Only if renderText is true */}
            {renderText && (
                <>
                    <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-bold text-md">{index + 1}.</span>
                        <EditableText
                            tagName="h3"
                            value={nc.itemTitle}
                            onChange={(val) => updateNonCompliance?.(nc.id, { itemTitle: val })}
                            className="font-bold text-md flex-1"
                            readOnly={readOnly}
                        />
                    </div>
                    <p className="text-xs text-gray-500 mb-2">Sekce: {nc.sectionTitle}</p>

                    <div className="pl-4 border-l-4 border-red-500 mb-4 text-sm">
                        <div className="mb-1">
                            <strong>Místo: </strong>
                            <EditableText
                                tagName="span"
                                value={nc.location}
                                onChange={(val) => updateNonCompliance?.(nc.id, { location: val })}
                                readOnly={readOnly}
                            />
                        </div>
                        <div className="mb-1">
                            <strong>Zjištění: </strong>
                            <EditableText
                                tagName="span"
                                value={nc.finding}
                                onChange={(val) => updateNonCompliance?.(nc.id, { finding: val })}
                                readOnly={readOnly}
                            />
                        </div>
                        <div>
                            <strong>Doporučení: </strong>
                            <EditableText
                                tagName="span"
                                value={nc.recommendation}
                                onChange={(val) => updateNonCompliance?.(nc.id, { recommendation: val })}
                                readOnly={readOnly}
                            />
                        </div>
                    </div>
                </>
            )}

            {/* Photos */}
            {displayPhotos && displayPhotos.length > 0 && (
                <div className="mt-4 relative group/photos" ref={photoContainerRef}>
                    {/* Render photos grouped by alignment */}
                    {(() => {
                        const groups: { alignment: 'left' | 'center' | 'right', photos: any[] }[] = [];
                        let currentGroup: { alignment: 'left' | 'center' | 'right', photos: any[] } | null = null;

                        displayPhotos.forEach(photo => {
                            const alignment = photo.alignment || 'left';
                            if (!currentGroup || currentGroup.alignment !== alignment) {
                                if (currentGroup) groups.push(currentGroup);
                                currentGroup = { alignment, photos: [] };
                            }
                            currentGroup.photos.push(photo);
                        });
                        if (currentGroup) groups.push(currentGroup);

                        return groups.map((group, gIndex) => (
                            <div
                                key={gIndex}
                                className={`block -mx-2 mb-2 ${group.alignment === 'center' ? 'text-center' : group.alignment === 'right' ? 'text-right' : 'text-left'}`}
                            >
                                {group.photos.map((photo, pIndex) => {
                                    // Determine width: use widthRatio if available, else fallback to colSpan
                                    const widthRatio = photo.widthRatio ?? (photo.colSpan ? photo.colSpan / 3 : 0.333);
                                    const widthPercent = Math.min(100, Math.max(10, widthRatio * 100));

                                    return (
                                        <div
                                            key={photo.id}
                                            className="inline-block align-top relative px-2 mb-4 group/photo transition-all duration-75 ease-out print:break-inside-avoid text-left" // Reset text-align for inner content
                                            style={{ width: `${widthPercent}%` }}
                                        >
                                            <div className="relative print:break-inside-avoid block">
                                                <img
                                                    src={photo.base64 ? `data:image/jpeg;base64,${photo.base64}` : (photo.url || '')}
                                                    alt={`Fotografie neshody`}
                                                    className="mx-auto block w-auto max-w-full h-auto max-h-[180mm] print:break-inside-avoid"
                                                    draggable={false}
                                                    style={{
                                                        aspectRatio: photo.aspectRatio ? `${photo.aspectRatio}` : 'auto'
                                                    }}
                                                    onError={(e) => {
                                                        // Pokud se fotka nenačte, zobrazit placeholder nebo skrýt
                                                        console.warn('[NonComplianceItem] Chyba při načítání fotky:', photo.url || photo.id);
                                                        const target = e.target as HTMLImageElement;
                                                        target.style.display = 'none';
                                                    }}
                                                    onLoad={(e) => {
                                                        if (readOnly || !updateNonCompliance) return;
                                                        const img = e.currentTarget;
                                                        const naturalRatio = img.naturalWidth / img.naturalHeight;

                                                        // Update if ratio is missing or significantly different (>1%)
                                                        if (!photo.aspectRatio || Math.abs(photo.aspectRatio - naturalRatio) > 0.01) {
                                                            const newPhotos = [...(nc.photos || [])];
                                                            const realIndex = newPhotos.findIndex(p => p.id === photo.id);
                                                            if (realIndex !== -1) {
                                                                newPhotos[realIndex] = {
                                                                    ...newPhotos[realIndex],
                                                                    aspectRatio: naturalRatio
                                                                };
                                                                // Use a timeout to avoid update loops/rendering issues during render
                                                                setTimeout(() => {
                                                                    updateNonCompliance(nc.id, { photos: newPhotos });
                                                                }, 0);
                                                            }
                                                        }
                                                    }}
                                                />

                                                {/* Photo Controls (Width & Alignment) */}
                                                {!readOnly && updateNonCompliance && (
                                                    <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover/photo:opacity-100 transition-opacity print:hidden bg-white/90 rounded-lg shadow-sm border border-gray-200 p-1 z-10">
                                                        {/* Width Controls */}
                                                        <div className="flex gap-1 border-b border-gray-200 pb-1 mb-1">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const newPhotos = [...(nc.photos || [])];
                                                                    const realIndex = newPhotos.findIndex(p => p.id === photo.id);
                                                                    if (realIndex !== -1) {
                                                                        newPhotos[realIndex] = { ...newPhotos[realIndex], colSpan: 1, widthRatio: 0.333 };
                                                                        updateNonCompliance(nc.id, { photos: newPhotos });
                                                                    }
                                                                }}
                                                                className={`p-1 rounded hover:bg-blue-100 ${widthRatio < 0.4 ? 'text-blue-600 bg-blue-50' : 'text-gray-500'}`}
                                                                title="1/3 šířky"
                                                            >
                                                                <span className="text-[10px] font-bold">1</span>
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const newPhotos = [...(nc.photos || [])];
                                                                    const realIndex = newPhotos.findIndex(p => p.id === photo.id);
                                                                    if (realIndex !== -1) {
                                                                        newPhotos[realIndex] = { ...newPhotos[realIndex], colSpan: 2, widthRatio: 0.666 };
                                                                        updateNonCompliance(nc.id, { photos: newPhotos });
                                                                    }
                                                                }}
                                                                className={`p-1 rounded hover:bg-blue-100 ${widthRatio >= 0.4 && widthRatio < 0.8 ? 'text-blue-600 bg-blue-50' : 'text-gray-500'}`}
                                                                title="2/3 šířky"
                                                            >
                                                                <span className="text-[10px] font-bold">2</span>
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const newPhotos = [...(nc.photos || [])];
                                                                    const realIndex = newPhotos.findIndex(p => p.id === photo.id);
                                                                    if (realIndex !== -1) {
                                                                        newPhotos[realIndex] = { ...newPhotos[realIndex], colSpan: 3, widthRatio: 1.0 };
                                                                        updateNonCompliance(nc.id, { photos: newPhotos });
                                                                    }
                                                                }}
                                                                className={`p-1 rounded hover:bg-blue-100 ${widthRatio >= 0.8 ? 'text-blue-600 bg-blue-50' : 'text-gray-500'}`}
                                                                title="Plná šířka"
                                                            >
                                                                <span className="text-[10px] font-bold">3</span>
                                                            </button>
                                                        </div>

                                                        {/* Alignment Controls */}
                                                        <div className="flex gap-1 justify-center">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const newPhotos = [...(nc.photos || [])];
                                                                    const realIndex = newPhotos.findIndex(p => p.id === photo.id);
                                                                    if (realIndex !== -1) {
                                                                        newPhotos[realIndex] = { ...newPhotos[realIndex], alignment: 'left' };
                                                                        updateNonCompliance(nc.id, { photos: newPhotos });
                                                                    }
                                                                }}
                                                                className={`p-1 rounded hover:bg-gray-100 ${(!photo.alignment || photo.alignment === 'left') ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}
                                                                title="Zarovnat vlevo"
                                                            >
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h16" /></svg>
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const newPhotos = [...(nc.photos || [])];
                                                                    const realIndex = newPhotos.findIndex(p => p.id === photo.id);
                                                                    if (realIndex !== -1) {
                                                                        newPhotos[realIndex] = { ...newPhotos[realIndex], alignment: 'center' };
                                                                        updateNonCompliance(nc.id, { photos: newPhotos });
                                                                    }
                                                                }}
                                                                className={`p-1 rounded hover:bg-gray-100 ${photo.alignment === 'center' ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}
                                                                title="Zarovnat na střed"
                                                            >
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M4 18h16" /></svg>
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const newPhotos = [...(nc.photos || [])];
                                                                    const realIndex = newPhotos.findIndex(p => p.id === photo.id);
                                                                    if (realIndex !== -1) {
                                                                        newPhotos[realIndex] = { ...newPhotos[realIndex], alignment: 'right' };
                                                                        updateNonCompliance(nc.id, { photos: newPhotos });
                                                                    }
                                                                }}
                                                                className={`p-1 rounded hover:bg-gray-100 ${photo.alignment === 'right' ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}
                                                                title="Zarovnat vpravo"
                                                            >
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M4 18h16" /></svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Smooth Resize Handle */}
                                                {!readOnly && updateNonCompliance && (
                                                    <div
                                                        className="absolute top-0 right-0 bottom-0 w-4 cursor-ew-resize z-20 opacity-0 group-hover/photo:opacity-100 hover:opacity-100 print:hidden flex items-center justify-center"
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            const startX = e.clientX;
                                                            const startWidthRatio = widthRatio;
                                                            const containerWidth = photoContainerRef.current?.offsetWidth || 1000;
                                                            setResizingPhotoId(photo.id || '');

                                                            const handleMouseMove = (moveEvent: MouseEvent) => {
                                                                const currentX = moveEvent.clientX;
                                                                const diffPx = currentX - startX;
                                                                const diffRatio = diffPx / containerWidth;
                                                                let newRatio = startWidthRatio + diffRatio;

                                                                // Clamp
                                                                newRatio = Math.max(0.1, Math.min(1.0, newRatio));

                                                                const newPhotos = [...(nc.photos || [])];
                                                                const realIndex = newPhotos.findIndex(p => p.id === photo.id);
                                                                if (realIndex !== -1) {
                                                                    newPhotos[realIndex] = {
                                                                        ...newPhotos[realIndex],
                                                                        widthRatio: newRatio,
                                                                        colSpan: newRatio > 0.8 ? 3 : newRatio > 0.4 ? 2 : 1 // Approximate colSpan
                                                                    };
                                                                    updateNonCompliance(nc.id, { photos: newPhotos });
                                                                }
                                                            };

                                                            const handleMouseUp = () => {
                                                                setResizingPhotoId(null);
                                                                document.removeEventListener('mousemove', handleMouseMove);
                                                                document.removeEventListener('mouseup', handleMouseUp);
                                                            };

                                                            document.addEventListener('mousemove', handleMouseMove);
                                                            document.addEventListener('mouseup', handleMouseUp);
                                                        }}
                                                    >
                                                        <div className="w-1 h-8 bg-white border border-gray-300 rounded shadow-sm"></div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                {/* Clearfix for inline-block layout */}
                                <div className="clear-both"></div>
                            </div>
                        ));
                    })()}
                </div>
            )}
        </div>
    );
};
