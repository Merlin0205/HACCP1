import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { Report, Audit, AuditStructure } from '../../types';
import { ReportEditorState } from '../../types/reportEditor';

// Register fonts
Font.register({
    family: 'Roboto',
    fonts: [
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf', fontWeight: 300 },
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf', fontWeight: 500 },
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
    ],
});

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: 'Roboto',
        fontSize: 10,
        color: '#333',
    },
    header: {
        marginBottom: 20,
        borderBottomWidth: 2,
        borderBottomColor: '#333',
        paddingBottom: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    meta: {
        fontSize: 10,
        color: '#666',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0f766e', // teal-700
        marginTop: 15,
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        paddingBottom: 5,
    },
    textBlock: {
        marginBottom: 10,
        lineHeight: 1.5,
    },
    nonComplianceItem: {
        marginBottom: 15,
        padding: 10,
        backgroundColor: '#ffffff', // Changed to white to match editor
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#d1d5db', // gray-300
    },
    itemTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#b91c1c', // red-700
        marginBottom: 5,
    },
    itemMeta: {
        fontSize: 9,
        color: '#6b7280',
        marginBottom: 8,
    },
    label: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#374151',
        marginTop: 4,
    },
    value: {
        fontSize: 10,
        marginBottom: 4,
    },
    photosContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 10,
    },
    photoWrapper: {
        // width handled dynamically
        // height handled dynamically
    },
    photo: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    },
    caption: {
        fontSize: 8,
        color: '#6b7280',
        textAlign: 'center',
        marginTop: 2,
        fontStyle: 'italic'
    },
    pageNumber: {
        position: 'absolute',
        bottom: 30,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontSize: 9,
        color: '#9ca3af',
    },
});

interface ReportPDFProps {
    report: Report;
    audit: Audit;
    auditStructure: AuditStructure;
    editorState: ReportEditorState;
}

export const ReportPDF: React.FC<ReportPDFProps> = ({
    report,
    audit,
    auditStructure,
    editorState
}) => {
    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>{auditStructure.audit_title}</Text>
                    <Text style={styles.meta}>
                        Datum auditu: {new Date(report.createdAt).toLocaleDateString('cs-CZ')}
                    </Text>
                    <Text style={styles.meta}>
                        Auditor: {report.auditorSnapshot?.name || 'Neznámý auditor'}
                    </Text>
                </View>

                {/* Summary */}
                <View wrap={false}>
                    <Text style={styles.sectionTitle}>Celkové hodnocení</Text>
                    <Text style={styles.textBlock}>
                        {/* Odstranit HTML tagy a zobrazit plain text */}
                        {editorState.summaryOverrides?.evaluation_text 
                            ? editorState.summaryOverrides.evaluation_text.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() 
                            : 'Bez hodnocení'}
                    </Text>
                </View>

                {/* Non-Compliances */}
                {editorState.nonCompliances.length > 0 && (
                    <View>
                        <Text style={styles.sectionTitle}>Neshody a doporučení</Text>
                        {editorState.nonCompliances.map((nc, index) => (
                            <View
                                key={nc.id}
                                style={styles.nonComplianceItem}
                                break={nc.pageBreakBefore}
                                wrap={false}
                            >
                                <Text style={styles.itemTitle}>{index + 1}. {nc.itemTitle}</Text>
                                <Text style={styles.itemMeta}>
                                    Sekce: {nc.sectionTitle} | Místo: {nc.location}
                                </Text>

                                <Text style={styles.label}>Zjištění:</Text>
                                <Text style={styles.value}>{nc.finding}</Text>

                                <Text style={styles.label}>Doporučení:</Text>
                                <Text style={styles.value}>{nc.recommendation}</Text>

                                {/* Photos */}
                                {nc.photos && nc.photos.length > 0 && (
                                    <View style={{ marginTop: 10 }}>
                                        {(() => {
                                            // Group photos by alignment to match editor logic
                                            const groups: { alignment: 'left' | 'center' | 'right', photos: any[] }[] = [];
                                            let currentGroup: { alignment: 'left' | 'center' | 'right', photos: any[] } | null = null;

                                            nc.photos.forEach(photo => {
                                                const alignment = photo.alignment || 'left';
                                                if (!currentGroup || currentGroup.alignment !== alignment) {
                                                    if (currentGroup) groups.push(currentGroup);
                                                    currentGroup = { alignment, photos: [] };
                                                }
                                                currentGroup.photos.push(photo);
                                            });
                                            if (currentGroup) groups.push(currentGroup);

                                            return groups.map((group, gIndex) => {
                                                // Map alignment to flex justifyContent
                                                let justifyContent: 'flex-start' | 'center' | 'flex-end' = 'flex-start';
                                                if (group.alignment === 'center') justifyContent = 'center';
                                                if (group.alignment === 'right') justifyContent = 'flex-end';

                                                return (
                                                    <View
                                                        key={gIndex}
                                                        style={{
                                                            flexDirection: 'row',
                                                            flexWrap: 'wrap',
                                                            justifyContent: justifyContent,
                                                            marginBottom: 5,
                                                            marginLeft: -5, // Negative margin to offset item padding
                                                            marginRight: -5
                                                        }}
                                                    >
                                                        {group.photos.map((photo, pIndex) => {
                                                            // Determine width
                                                            const widthRatio = photo.widthRatio ?? (photo.colSpan ? photo.colSpan / 3 : 0.333);
                                                            const widthPercent = Math.min(100, Math.max(10, widthRatio * 100));

                                                            // Calculate height based on aspect ratio
                                                            // Page content width is approx 515pt (A4 minus padding)
                                                            // We use a slightly smaller width to be safe
                                                            const PAGE_CONTENT_WIDTH = 515;
                                                            const imageWidth = PAGE_CONTENT_WIDTH * widthRatio;
                                                            const aspectRatio = photo.aspectRatio || 4 / 3;
                                                            const imageHeight = imageWidth / aspectRatio;

                                                            return (
                                                                <View
                                                                    key={pIndex}
                                                                    style={{
                                                                        width: `${widthPercent}%`,
                                                                        paddingLeft: 5,
                                                                        paddingRight: 5,
                                                                        marginBottom: 10
                                                                    }}
                                                                >
                                                                    <Image
                                                                        src={photo.base64 ? `data:image/jpeg;base64,${photo.base64}` : photo.url}
                                                                        style={{
                                                                            width: '100%',
                                                                            height: imageHeight,
                                                                            objectFit: 'contain'
                                                                        }}
                                                                    />
                                                                    {photo.caption && (
                                                                        <Text style={styles.caption}>{photo.caption}</Text>
                                                                    )}
                                                                </View>
                                                            );
                                                        })}
                                                    </View>
                                                );
                                            });
                                        })()}
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                )}

                {/* Footer with Page Numbers */}
                <Text
                    style={styles.pageNumber}
                    render={({ pageNumber, totalPages }) => (
                        `Strana ${pageNumber} / ${totalPages}`
                    )}
                    fixed
                />
            </Page>
        </Document>
    );
};
