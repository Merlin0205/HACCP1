import type { YooptaContentValue } from '@yoopta/editor';

/**
 * Converts a Yoopta block to HTML string
 */
function yooptaBlockToHtml(block: any): string {
    const { type, value, data } = block;

    switch (type) {
        case 'HeadingOne':
            return `<h1>${extractText(value)}</h1>`;

        case 'HeadingTwo':
            return `<h2>${extractText(value)}</h2>`;

        case 'HeadingThree':
            return `<h3>${extractText(value)}</h3>`;

        case 'Paragraph':
            return `<p>${extractText(value)}</p>`;

        case 'Table':
            return renderTable(value[0]);

        case 'Callout':
            const theme = data?.theme || 'info';
            return `<div class="callout callout-${theme}">${extractText(value)}</div>`;

        case 'Image':
            return `<img src="${data?.src || ''}" alt="${data?.alt || 'Image'}" />`;

        case 'Divider':
            return '<hr />';

        default:
            return `<p>${extractText(value)}</p>`;
    }
}

/**
 * Renders a Yoopta table element to HTML
 */
function renderTable(tableElement: any): string {
    if (!tableElement || !tableElement.children) {
        return '';
    }

    const rows = tableElement.children.map((row: any) => {
        const cells = row.children.map((cell: any) => {
            const tag = cell.props?.asHeader ? 'th' : 'td';
            const text = cell.children?.[0]?.text || '';
            return `<${tag}>${text}</${tag}>`;
        }).join('');
        return `<tr>${cells}</tr>`;
    }).join('');

    return `<table class="yoopta-table">${rows}</table>`;
}

/**
 * Extracts plain text from Yoopta value array
 */
function extractText(value: any[]): string {
    if (!Array.isArray(value)) return '';
    return value
        .map(v => v.children?.[0]?.text || '')
        .filter(Boolean)
        .join('');
}

/**
 * Converts entire Yoopta content to HTML
 */
export function yooptaToHtml(content: YooptaContentValue): string {
    return Object.values(content)
        .sort((a: any, b: any) => (a.meta?.order || 0) - (b.meta?.order || 0))
        .map(block => yooptaBlockToHtml(block))
        .join('\n');
}
