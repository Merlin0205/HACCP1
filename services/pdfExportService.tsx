/**
 * PDF Export Service
 * 
 * Generuje PDF soubor pomocí @react-pdf/renderer
 * Bez potřeby window.print() - přímý export do PDF
 */

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, pdf } from '@react-pdf/renderer';
import { Audit, AuditStructure, Report } from '../types';
import { EditableNonCompliance } from '../types/reportEditor';

// PDF Styly
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 8,
    borderBottom: '2pt solid black',
    paddingBottom: 4,
  },
  table: {
    width: '100%',
    marginBottom: 15,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1pt solid #ccc',
  },
  tableCell: {
    padding: 5,
    fontSize: 9,
  },
  tableCellBold: {
    padding: 5,
    fontSize: 9,
    fontWeight: 'bold',
    width: '30%',
  },
  nonComplianceItem: {
    marginBottom: 15,
    paddingTop: 10,
    borderTop: '1pt solid #ddd',
  },
  nonComplianceTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  nonComplianceDetail: {
    marginLeft: 10,
    paddingLeft: 10,
    borderLeft: '3pt solid #ef4444',
    marginBottom: 8,
  },
  fieldLabel: {
    fontWeight: 'bold',
    fontSize: 9,
  },
  fieldValue: {
    fontSize: 9,
    marginBottom: 4,
  },
  photo: {
    marginTop: 8,
    marginBottom: 8,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  photoGridItem: {
    width: '48%',
    marginBottom: 8,
  },
});

interface PDFDocumentProps {
  audit: Audit;
  auditStructure: AuditStructure;
  report: Report;
  nonCompliances: EditableNonCompliance[];
}

// PDF Dokument komponenta
const ReportPDFDocument: React.FC<PDFDocumentProps> = ({
  audit,
  auditStructure,
  report,
  nonCompliances,
}) => {
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Neuvedeno';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 'Neplatné datum' : date.toLocaleDateString('cs-CZ');
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Hlavička */}
        <Text style={styles.title}>{auditStructure.audit_title}</Text>
        <Text style={styles.subtitle}>
          Datum auditu: {formatDate(audit.completedAt)}
        </Text>
        <Text style={styles.subtitle}>
          Za provozovatele: {audit.headerValues.operator_name || 'Neuvedeno'}
        </Text>

        {/* Zpracovatel auditu */}
        <Text style={styles.sectionTitle}>ZPRACOVATEL AUDITU</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            {auditStructure.header_data.auditor.fields.map(field => (
              <Text key={field.id} style={{ ...styles.tableCell, fontWeight: 'bold', flex: 1 }}>
                {field.label}
              </Text>
            ))}
          </View>
          <View style={styles.tableRow}>
            {auditStructure.header_data.auditor.fields.map(field => (
              <Text key={field.id} style={{ ...styles.tableCell, flex: 1 }}>
                {(audit.headerValues as any)[field.id] || '-'}
              </Text>
            ))}
          </View>
        </View>

        {/* Auditovaná provozovna */}
        <Text style={styles.sectionTitle}>{auditStructure.header_data.audited_premise.title}</Text>
        <View style={styles.table}>
          {auditStructure.header_data.audited_premise.fields.map(field => (
            <View key={field.id} style={styles.tableRow}>
              <Text style={styles.tableCellBold}>{field.label}</Text>
              <Text style={styles.tableCell}>{(audit.headerValues as any)[field.id] || '-'}</Text>
            </View>
          ))}
        </View>

        {/* Provozovatel */}
        <Text style={styles.sectionTitle}>{auditStructure.header_data.operator.title}</Text>
        <View style={styles.table}>
          {auditStructure.header_data.operator.fields.map(field => (
            <View key={field.id} style={styles.tableRow}>
              <Text style={styles.tableCellBold}>{field.label}</Text>
              <Text style={styles.tableCell}>{(audit.headerValues as any)[field.id] || '-'}</Text>
            </View>
          ))}
        </View>

        {/* AI Souhrnné hodnocení */}
        {report.reportData?.summary && (
          <View>
            <Text style={styles.sectionTitle}>SOUHRNNÉ HODNOCENÍ</Text>
            <Text style={styles.fieldValue}>
              {report.reportData.summary.evaluation_text || 'Žádné hodnocení'}
            </Text>
          </View>
        )}
      </Page>

      {/* Nová stránka - Seznam položek */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>SEZNAM AUDITOVANÝCH POLOŽEK</Text>
        <View style={styles.table}>
          {auditStructure.audit_sections.filter(s => s.active).map(section => (
            <View key={section.id}>
              <View style={{ ...styles.tableRow, backgroundColor: '#f3f4f6' }}>
                <Text style={{ ...styles.tableCell, fontWeight: 'bold', flex: 1 }}>
                  {section.title}
                </Text>
              </View>
              {section.items.filter(i => i.active).map(item => {
                const answer = audit.answers[item.id];
                const status = answer && !answer.compliant ? 'NEVYHOVUJE' : 'Vyhovuje';
                const color = answer && !answer.compliant ? '#dc2626' : '#16a34a';
                return (
                  <View key={item.id} style={styles.tableRow}>
                    <Text style={{ ...styles.tableCell, flex: 3 }}>{item.title}</Text>
                    <Text style={{ ...styles.tableCell, flex: 1, color, fontWeight: 'bold' }}>
                      {status}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </Page>

      {/* Nové stránky - Detail neshod s respektováním page breaks */}
      {nonCompliances.length > 0 && (
        <>
          <Page size="A4" style={styles.page}>
            <Text style={styles.sectionTitle}>DETAIL ZJIŠTĚNÝCH NESHOD</Text>
            
            {nonCompliances.map((nc, index) => (
              <View 
                key={nc.id} 
                style={styles.nonComplianceItem}
                break={nc.pageBreakBefore || (index > 0 && index % 2 === 0)}
                wrap={false}
              >
                <Text style={styles.nonComplianceTitle}>
                  {index + 1}. {nc.itemTitle}
                </Text>
                <Text style={{ fontSize: 8, color: '#666', marginBottom: 5 }}>
                  Sekce: {nc.sectionTitle}
                </Text>

                <View style={styles.nonComplianceDetail}>
                  <View style={{ marginBottom: 5 }}>
                    <Text style={styles.fieldLabel}>Místo:</Text>
                    <Text style={styles.fieldValue}>{nc.location || '-'}</Text>
                  </View>

                  <View style={{ marginBottom: 5 }}>
                    <Text style={styles.fieldLabel}>Zjištění:</Text>
                    <Text style={styles.fieldValue}>{nc.finding || '-'}</Text>
                  </View>

                  <View>
                    <Text style={styles.fieldLabel}>Doporučení:</Text>
                    <Text style={styles.fieldValue}>{nc.recommendation || '-'}</Text>
                  </View>
                </View>

                {/* Fotografie - Grid Layout pokud jsou 2+ */}
                {nc.photos.length > 0 && (
                  <View>
                    {nc.photos.length === 1 ? (
                      <Image
                        src={`data:image/jpeg;base64,${nc.photos[0].base64}`}
                        style={{
                          ...styles.photo,
                          width: `${nc.photos[0].width || 100}%`,
                          maxWidth: '100%',
                        }}
                      />
                    ) : (
                      <View style={styles.photoGrid}>
                        {nc.photos.map((photo) => (
                          <View key={photo.id} style={styles.photoGridItem}>
                            <Image
                              src={`data:image/jpeg;base64,${photo.base64}`}
                              style={{ width: '100%' }}
                            />
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>
            ))}
          </Page>
        </>
      )}
    </Document>
  );
};

/**
 * Exportuje report do PDF
 */
export async function exportReportToPDF(
  audit: Audit,
  auditStructure: AuditStructure,
  report: Report,
  nonCompliances: EditableNonCompliance[]
): Promise<Blob> {
  const pdfDoc = (
    <ReportPDFDocument
      audit={audit}
      auditStructure={auditStructure}
      report={report}
      nonCompliances={nonCompliances}
    />
  );

  const blob = await pdf(pdfDoc).toBlob();
  return blob;
}

/**
 * Stáhne PDF jako soubor
 */
export async function downloadReportPDF(
  audit: Audit,
  auditStructure: AuditStructure,
  report: Report,
  nonCompliances: EditableNonCompliance[],
  filename?: string
): Promise<void> {
  const blob = await exportReportToPDF(audit, auditStructure, report, nonCompliances);
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `report_${audit.id}_${Date.now()}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
