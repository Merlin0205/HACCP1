import { YooptaContentValue } from '@yoopta/editor';
import { Audit, AuditStructure, Report } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { buildSimpleTable } from './tableHelper';

export const generateInitialYooptaContent = (audit: Audit, auditStructure: AuditStructure, report: Report): YooptaContentValue => {
    const content: YooptaContentValue = {};

    const addBlock = (type: string, data: any = {}, text: string = '') => {
        const id = uuidv4();
        content[id] = {
            id,
            type,
            meta: {
                order: Object.keys(content).length,
                depth: 0,
            },
            data,
            value: [
                {
                    id: uuidv4(),
                    type: 'text',
                    children: [{ text }],
                },
            ],
        } as any;
        return id;
    };

    const mergeContent = (newContent: YooptaContentValue) => {
        Object.entries(newContent).forEach(([id, block]) => {
            (block as any).meta.order = Object.keys(content).length;
            content[id] = block;
        });
    };

    const formatDate = (dateString?: string): string => {
        if (!dateString) return 'Neuvedeno';
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? 'Neplatné datum' : date.toLocaleDateString('cs-CZ');
    };

    // 1. HLAVIČKA - stejně jako V2
    addBlock('HeadingOne', {}, auditStructure.audit_title.toUpperCase());
    addBlock('Paragraph', {}, `Datum auditu: ${formatDate(audit.completedAt)}`);
    addBlock('Paragraph', {}, `Za provozovatele přítomen: ${(audit.headerValues as any).present_person || 'Neuvedeno'}`);
    addBlock('Divider', {});

    // 2. ZPRACOVATEL AUDITU - tabulka stejně jako V2
    addBlock('HeadingTwo', {}, 'ZPRACOVATEL AUDITU');

    const auditorData = auditStructure.header_data.auditor;
    const auditorRow: string[] = [];
    const auditorValueRow: string[] = [];

    auditorData.fields.forEach(field => {
        auditorRow.push(field.label);
        const value = (audit.headerValues as any)[field.id] || '-';
        auditorValueRow.push(value);
    });

    const auditorTable = buildSimpleTable([auditorRow, auditorValueRow], true);
    mergeContent(auditorTable);
    addBlock('Divider', {});

    // 3. AUDITOVANÁ PROVOZOVNA - tabulka key-value
    addBlock('HeadingTwo', {}, auditStructure.header_data.audited_premise.title.toUpperCase());

    const premiseRows: string[][] = [['Pole', 'Hodnota']];
    auditStructure.header_data.audited_premise.fields.forEach(field => {
        const value = (audit.headerValues as any)[field.id] || '-';
        premiseRows.push([field.label, value]);
    });

    const premiseTable = buildSimpleTable(premiseRows, true);
    mergeContent(premiseTable);
    addBlock('Divider', {});

    // 4. PROVOZOVATEL - tabulka key-value
    addBlock('HeadingTwo', {}, auditStructure.header_data.operator.title.toUpperCase());

    const operatorRows: string[][] = [['Pole', 'Hodnota']];
    auditStructure.header_data.operator.fields.forEach(field => {
        const value = (audit.headerValues as any)[field.id] || '-';
        operatorRows.push([field.label, value]);
    });

    const operatorTable = buildSimpleTable(operatorRows, true);
    mergeContent(operatorTable);
    addBlock('Divider', {});

    // 5. SOUHRNNÉ HODNOCENÍ (pokud existuje)
    if (report.reportData?.summary?.evaluation_text) {
        addBlock('HeadingTwo', {}, 'SOUHRNNÉ HODNOCENÍ AUDITU');
        addBlock('Paragraph', {}, report.reportData.summary.evaluation_text);
        addBlock('Divider', {});
    }

    // 6. SEZNAM AUDITOVANÝCH POLOŽEK - velká tabulka
    addBlock('HeadingTwo', {}, 'SEZNAM AUDITOVANÝCH POLOŽEK');

    const itemsTableRows: string[][] = [
        ['Kontrolovaná oblast', 'Popis', 'Výsledek'] // Header
    ];

    auditStructure.audit_sections
        .filter(s => s.active)
        .forEach(section => {
            // Section row - merged cells (simulujeme přes text)
            itemsTableRows.push([`▶ ${section.title}`, '', '']);

            section.items
                .filter(i => i.active)
                .forEach(item => {
                    const answer = audit.answers[item.id];
                    const status = answer && !answer.compliant ? 'NEVYHOVUJE' : 'VYHOVUJE';
                    itemsTableRows.push([
                        item.title,
                        item.description || '-',
                        status
                    ]);
                });
        });

    const itemsTable = buildSimpleTable(itemsTableRows, true, 150);
    mergeContent(itemsTable);
    addBlock('Divider', {});

    // 7. DETAIL ZJIŠTĚNÝCH NESHOD
    const nonCompliances: any[] = [];
    auditStructure.audit_sections.forEach(section => {
        section.items.forEach(item => {
            const answer = audit.answers[item.id];
            if (answer && !answer.compliant && answer.nonComplianceData) {
                answer.nonComplianceData.forEach(nc => {
                    nonCompliances.push({
                        ...nc,
                        itemTitle: item.title,
                        sectionTitle: section.title
                    });
                });
            }
        });
    });

    if (nonCompliances.length > 0) {
        addBlock('HeadingTwo', {}, 'DETAIL ZJIŠTĚNÝCH NESHOD');

        nonCompliances.forEach((nc, index) => {
            addBlock('HeadingThree', {}, `${index + 1}. ${nc.itemTitle}`);
            addBlock('Paragraph', {}, `Sekce: ${nc.sectionTitle}`);
            addBlock('Callout', { theme: 'error' }, `Místo: ${nc.location || '-'}`);
            addBlock('Callout', { theme: 'error' }, `Zjištění: ${nc.finding || '-'}`);
            addBlock('Callout', { theme: 'error' }, `Doporučení: ${nc.recommendation || '-'}`);

            if (nc.photos && nc.photos.length > 0) {
                nc.photos.forEach((photo: any) => {
                    // OPRAVA: fotky jsou objekty s url nebo base64, ne pouze stringy
                    const photoSrc = photo.url || (photo.base64 ? `data:image/jpeg;base64,${photo.base64}` : '');
                    if (!photoSrc) return; // Skip if no valid source

                    const imageId = uuidv4();
                    content[imageId] = {
                        id: imageId,
                        type: 'Image',
                        meta: {
                            order: Object.keys(content).length,
                            depth: 0,
                        },
                        data: {
                            src: photoSrc,
                            alt: 'Fotodokumentace',
                            fit: 'contain',
                        },
                        value: [
                            {
                                id: uuidv4(),
                                type: 'image',
                                children: [{ text: '' }],
                            },
                        ],
                    } as any;
                });
            }
            addBlock('Divider', {});
        });
    }

    return content;
};
