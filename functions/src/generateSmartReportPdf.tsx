/**
 * Cloud Function pro generování PDF z Smart Template ReportDocument
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

// Typy pro ReportDocument (musí být kompatibilní s types/smartReport.ts)
interface ReportDocument {
  metadata: {
    templateId: string;
    templateVersion: string;
    generatedAt: string;
    auditId: string;
  };
  pages: Array<{
    pageNumber: number;
    elements: Array<{
      type: 'cover' | 'text' | 'images' | 'table' | 'pageBreak';
      content?: any;
    }>;
  }>;
}

// PDF Styly
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  cover: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  coverTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  coverSubtitle: {
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  text: {
    marginBottom: 10,
    lineHeight: 1.5,
  },
  textBold: {
    fontWeight: 'bold',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  imageItem: {
    width: '48%',
    marginBottom: 8,
  },
  image: {
    width: '100%',
    marginBottom: 4,
  },
  imageCaption: {
    fontSize: 9,
    color: '#666',
    textAlign: 'center',
  },
  table: {
    width: '100%',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  tableHeader: {
    backgroundColor: '#f0f0f0',
    fontWeight: 'bold',
  },
  tableCell: {
    padding: 5,
    fontSize: 9,
    flex: 1,
  },
});

// React komponenta pro PDF renderování
const ReportPDFDocument: React.FC<{ document: ReportDocument }> = ({ document }: { document: ReportDocument }) => {
  const renderElement = (element: any, index: number) => {
    switch (element.type) {
      case 'cover':
        return (
          <Page key="cover" size="A4" style={styles.cover}>
            <View>
              <Text style={styles.coverTitle}>{element.content.title}</Text>
              {element.content.subtitle && <Text style={styles.coverSubtitle}>{element.content.subtitle}</Text>}
              {element.content.auditDate && <Text style={styles.coverSubtitle}>Datum auditu: {element.content.auditDate}</Text>}
              {element.content.operatorName && <Text style={styles.coverSubtitle}>Provozovatel: {element.content.operatorName}</Text>}
              {element.content.premiseName && <Text style={styles.coverSubtitle}>Pracoviště: {element.content.premiseName}</Text>}
              {element.content.auditorInfo && (
                <View style={{ marginTop: 30 }}>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 5 }}>Zpracovatel auditu:</Text>
                  <Text style={{ fontSize: 10 }}>Jméno: {element.content.auditorInfo.name}</Text>
                  <Text style={{ fontSize: 10 }}>Telefon: {element.content.auditorInfo.phone}</Text>
                  <Text style={{ fontSize: 10 }}>Email: {element.content.auditorInfo.email}</Text>
                  <Text style={{ fontSize: 10 }}>Web: {element.content.auditorInfo.web}</Text>
                </View>
              )}
            </View>
          </Page>
        );
      case 'text':
        return (
          <Text key={index} style={styles.text}>
            {element.content.text}
          </Text>
        );
      case 'images':
        return (
          <View key={index} style={styles.imageGrid}>
            {element.content.images.map((img: any, idx: number) => (
              <View key={img.id || idx} style={styles.imageItem}>
                {img.base64 && (
                  <>
                    <Image src={`data:image/jpeg;base64,${img.base64}`} style={styles.image} />
                    {img.caption && <Text style={styles.imageCaption}>{img.caption}</Text>}
                  </>
                )}
              </View>
            ))}
          </View>
        );
      case 'table':
        return (
          <View key={index} style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              {element.content.headers.map((header: string, idx: number) => (
                <Text key={idx} style={styles.tableCell}>{header}</Text>
              ))}
            </View>
            {element.content.rows.map((row: string[], rowIdx: number) => (
              <View key={rowIdx} style={styles.tableRow}>
                {row.map((cell: string, cellIdx: number) => (
                  <Text key={cellIdx} style={styles.tableCell}>{cell}</Text>
                ))}
              </View>
            ))}
          </View>
        );
      case 'pageBreak':
        return <View key={index} style={{ marginTop: 20 }} />;
      default:
        return null;
    }
  };

  return (
    <Document>
      {document.pages.map((page: any, pageIdx: number) => {
        // Cover page je samostatná stránka
        const coverElement = page.elements.find((e: any) => e.type === 'cover');
        if (coverElement) {
          return renderElement(coverElement, pageIdx);
        }

        // Ostatní stránky
        return (
          <Page key={pageIdx} size="A4" style={styles.page}>
            {page.elements.map((element: any, elemIdx: number) => renderElement(element, elemIdx))}
          </Page>
        );
      })}
    </Document>
  );
};

/**
 * Callable Cloud Function pro generování PDF z ReportDocument
 */
export const generateSmartReportPdf = functions
  .region('europe-west1')
  .runWith({
    memory: '2GB',
    timeoutSeconds: 60
  })
  .https.onCall(async (data: any, context: functions.https.CallableContext) => {
    // Ověření autentifikace
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { reportDocument, reportId } = data;

    if (!reportDocument) {
      throw new functions.https.HttpsError('invalid-argument', 'reportDocument is required');
    }

    if (!reportId) {
      throw new functions.https.HttpsError('invalid-argument', 'reportId is required');
    }

    try {
      const userId = context.auth.uid;
      const timestamp = Date.now();
      const fileName = `smart-report-${reportId}-${timestamp}.pdf`;
      const storagePath = `users/${userId}/reports/${reportId}/smart/pdf/${fileName}`;

      console.log('[generateSmartReportPdf] Generating PDF from ReportDocument...');

      // Renderovat PDF pomocí @react-pdf/renderer
      const pdfDoc = <ReportPDFDocument document={reportDocument} />;
      const pdfInstance = pdf(pdfDoc);
      const pdfBuffer = await pdfInstance.toBuffer();

      console.log('[generateSmartReportPdf] PDF generated, uploading to Storage...');

      // Uložit do Storage
      const bucket = admin.storage().bucket();
      const file = bucket.file(storagePath);

      await file.save(pdfBuffer, {
        metadata: {
          contentType: 'application/pdf',
          customMetadata: {
            reportId,
            userId,
            uploadedAt: new Date().toISOString(),
            type: 'smart-pdf'
          }
        }
      });

      console.log('[generateSmartReportPdf] PDF uploaded to Storage');

      // Vrátit pouze storagePath - frontend použije getDownloadURL z Storage SDK
      // (getSignedUrl vyžaduje oprávnění iam.serviceAccounts.signBlob)

      // Aktualizovat Firestore - přidat pdfPath do finalVersions
      // Najdeme nejnovější finální verzi a přidáme pdfPath
      const reportRef = admin.firestore().collection('reports').doc(reportId);
      const reportDoc = await reportRef.get();

      if (reportDoc.exists) {
        const reportData = reportDoc.data();
        const smartData = reportData?.smart || {};
        const finalVersions = smartData.finalVersions || [];

        // Pokud existují finální verze, přidat pdfPath k nejnovější
        if (finalVersions.length > 0) {
          const latestVersion = finalVersions[finalVersions.length - 1];
          latestVersion.pdfPath = storagePath;

          await reportRef.update({
            'smart.finalVersions': finalVersions
          });
        }
      }

      return {
        storagePath
      };
    } catch (error: any) {
      console.error('[generateSmartReportPdf] Error:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to generate PDF');
    }
  });

