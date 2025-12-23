import { v4 as uuidv4 } from 'uuid';
import type { YooptaContentValue } from '@yoopta/editor';

/**
 * Builds a Yoopta Table block programmatically from a 2D array of strings.
 * 
 * @param rows - 2D array where each inner array is a table row
 * @param hasHeaderRow - If true, first row will be styled as header
 * @param columnWidth - Default width for each column in pixels
 * @returns YooptaContentValue with a single Table block
 * 
 * @example
 * const table = buildSimpleTable([
 *   ['Header A', 'Header B'],
 *   ['Value 1', 'Value 2']
 * ], true);
 */
export function buildSimpleTable(
    rows: string[][],
    hasHeaderRow = true,
    columnWidth = 200
): YooptaContentValue {
    const tableBlockId = uuidv4();
    const tableElementId = uuidv4();

    const tableRows = rows.map((row, rowIndex) => ({
        id: uuidv4(),
        type: 'table-row',
        children: row.map((cellText) => ({
            id: uuidv4(),
            type: 'table-data-cell',
            props: {
                asHeader: hasHeaderRow && rowIndex === 0,
                width: columnWidth
            },
            children: [{ text: cellText }]
        }))
    }));

    return {
        [tableBlockId]: {
            id: tableBlockId,
            type: 'Table',
            meta: {
                order: 0,
                depth: 0
            },
            value: [
                {
                    id: tableElementId,
                    type: 'table',
                    props: {
                        headerRow: hasHeaderRow,
                        headerColumn: false
                    },
                    children: tableRows
                }
            ]
        }
    };
}
