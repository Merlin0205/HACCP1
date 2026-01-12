import { useRef, useLayoutEffect, useState, useCallback, ReactNode } from 'react';

/**
 * Content block abstraction for pagination.
 * All content (summary, table rows, non-compliance items) is represented as blocks.
 */
export interface ContentBlock {
    id: string;
    type: 'summary_header' | 'summary_text' | 'table_section_header' | 'table_row' | 'table_header' | 'nc_header' | 'nc_item' | 'stamp' | 'generic';
    content: ReactNode;
    measuredHeight?: number;
    forcePageBreakBefore?: boolean;
    /** If true, this block can be split across pages (not implemented yet) */
    canSplit?: boolean;
}

/**
 * A4 Page Layout Configuration.
 * All dimensions in millimeters, converted to pixels at 96 DPI (1mm = 3.78px).
 */
export const PAGE_LAYOUT = {
    // Physical dimensions (mm)
    pageHeightMm: 297,
    pageWidthMm: 210,

    // Margins (mm) - must match PageSheet CSS
    marginTopMm: 10,
    marginBottomMm: 20, // Includes footer space
    marginLeftMm: 5,
    marginRightMm: 5,

    // Conversion factor
    mmToPx: 3.78, // 96 DPI

    // Derived values (pixels)
    get usableHeightPx(): number {
        return (this.pageHeightMm - this.marginTopMm - this.marginBottomMm) * this.mmToPx;
    },
    get usableWidthPx(): number {
        return (this.pageWidthMm - this.marginLeftMm - this.marginRightMm) * this.mmToPx;
    },
    get pageHeightPx(): number {
        return this.pageHeightMm * this.mmToPx;
    }
};

/**
 * Pagination result - blocks distributed into pages.
 */
export interface PaginatedResult {
    pages: ContentBlock[][];
    totalPages: number;
}

/**
 * Paginates blocks based on measured heights and page capacity.
 */
export function paginateBlocks(blocks: ContentBlock[], pageHeightPx: number): PaginatedResult {
    const pages: ContentBlock[][] = [];
    let currentPage: ContentBlock[] = [];
    let currentHeight = 0;

    for (const block of blocks) {
        const blockHeight = block.measuredHeight || 0;

        // Handle forced page break
        if (block.forcePageBreakBefore && currentPage.length > 0) {
            pages.push(currentPage);
            currentPage = [];
            currentHeight = 0;
        }

        // Check if block fits on current page
        if (currentHeight + blockHeight <= pageHeightPx) {
            currentPage.push(block);
            currentHeight += blockHeight;
        } else {
            // Block doesn't fit - start new page
            if (currentPage.length > 0) {
                pages.push(currentPage);
            }
            currentPage = [block];
            currentHeight = blockHeight;

            // Edge case: block is taller than page (shouldn't happen, but handle gracefully)
            if (blockHeight > pageHeightPx) {
                console.warn(`[useMeasuredBlocks] Block ${block.id} (${blockHeight}px) is taller than page (${pageHeightPx}px)`);
            }
        }
    }

    if (currentPage.length > 0) {
        pages.push(currentPage);
    }

    return {
        pages,
        totalPages: pages.length
    };
}

/**
 * Hook that measures content blocks and paginates them.
 * 
 * Usage:
 * ```tsx
 * const { measurementContainer, paginatedResult, isReady } = useMeasuredBlocks(blocks);
 * 
 * return (
 *   <>
 *     {measurementContainer}
 *     {isReady && paginatedResult.pages.map((pageBlocks, i) => (
 *       <PageSheet key={i}>
 *         {pageBlocks.map(block => block.content)}
 *       </PageSheet>
 *     ))}
 *   </>
 * );
 * ```
 */
export function useMeasuredBlocks(blocks: ContentBlock[]) {
    const measureRef = useRef<HTMLDivElement>(null);
    const [paginatedResult, setPaginatedResult] = useState<PaginatedResult>({ pages: [], totalPages: 0 });
    const [isReady, setIsReady] = useState(false);

    // Measure blocks after render
    useLayoutEffect(() => {
        const container = measureRef.current;
        if (!container || blocks.length === 0) {
            setPaginatedResult({ pages: [], totalPages: 0 });
            setIsReady(true);
            return;
        }

        // Measure each block
        const measuredBlocks = blocks.map(block => {
            const el = container.querySelector(`[data-block-id="${block.id}"]`);
            if (el) {
                const height = el.getBoundingClientRect().height;
                return { ...block, measuredHeight: height };
            }
            return block;
        });

        // Paginate based on measured heights
        const result = paginateBlocks(measuredBlocks, PAGE_LAYOUT.usableHeightPx);
        setPaginatedResult(result);
        setIsReady(true);
    }, [blocks]);

    // Measurement container (hidden, but rendered to measure heights)
    const measurementContainer = (
        <div
            ref={measureRef}
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
            {blocks.map(block => (
                <div key={block.id} data-block-id={block.id}>
                    {block.content}
                </div>
            ))}
        </div>
    );

    return {
        measurementContainer,
        paginatedResult,
        isReady
    };
}

