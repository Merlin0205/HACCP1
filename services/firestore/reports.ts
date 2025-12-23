/**
 * Firestore service pro správu reportů
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { Report } from '../../types';
import { fetchUserMetadata } from './users';
import { generateHumanReadableId } from '../../utils/idGenerator';

const COLLECTION_NAME = 'reports';

/**
 * Získá aktuálního uživatele
 */
function getCurrentUserId(): string {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user.uid;
}

/**
 * Převede Firestore dokument na Report objekt
 */
function docToReport(docSnapshot: any): Report {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    ...data,
    // Převést Timestamps na string
    createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
    generatedAt: data.generatedAt?.toDate?.()?.toISOString() || data.generatedAt
  } as Report;
}

/**
 * Načte všechny reporty (sdílený režim)
 */
export async function fetchReports(): Promise<Report[]> {
  const q = query(
    collection(db, COLLECTION_NAME),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToReport);
}

/**
 * Načte nejnovější report pro konkrétní audit
 */
export async function fetchReportByAudit(auditId: string): Promise<Report | null> {
  const reports = await fetchReportsByAudit(auditId);
  // Vrátit nejnovější verzi (první v seznamu, protože jsou seřazené DESC)
  return reports.length > 0 ? reports[0] : null;
}

/**
 * Načte všechny verze reportů pro konkrétní audit (seřazené podle versionNumber DESC)
 * Fallback: pokud index není hotový, použije jednodušší dotaz bez řazení podle versionNumber
 */
export async function fetchReportsByAudit(auditId: string): Promise<Report[]> {
  try {
    // Zkusit dotaz s řazením podle versionNumber (vyžaduje index)
    const q = query(
      collection(db, COLLECTION_NAME),
      where('auditId', '==', auditId),
      orderBy('versionNumber', 'desc')
    );

    const snapshot = await getDocs(q);
    const reports = snapshot.docs.map(docToReport);
    // Manuálně seřadit podle versionNumber jako fallback
    return reports.sort((a, b) => (b.versionNumber || 0) - (a.versionNumber || 0));
  } catch (error: any) {
    // Pokud dotaz selže kvůli chybějícímu indexu, použít jednodušší dotaz
    if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
      console.warn('[fetchReportsByAudit] Index není hotový, používám fallback dotaz bez řazení');

      const qFallback = query(
        collection(db, COLLECTION_NAME),
        where('auditId', '==', auditId)
      );

      const snapshotFallback = await getDocs(qFallback);
      const reports = snapshotFallback.docs.map(docToReport);
      // Seřadit klienta podle versionNumber (nebo createdAt jako fallback)
      return reports.sort((a, b) => {
        const versionDiff = (b.versionNumber || 0) - (a.versionNumber || 0);
        if (versionDiff !== 0) return versionDiff;
        // Pokud nemají versionNumber, řadit podle createdAt
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
    }
    // Pokud je jiná chyba, znovu ji vyhodit
    throw error;
  }
}

/**
 * Načte jeden report
 */
export async function fetchReport(reportId: string): Promise<Report | null> {
  const docRef = doc(db, COLLECTION_NAME, reportId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return docToReport(docSnap);
}

/**
 * Vytvoří nový report s automatickým nastavením verzí
 */
export async function createReport(reportData: Omit<Report, 'id'>): Promise<string> {
  const userId = getCurrentUserId();

  // Načíst všechny existující verze pro tento audit
  const existingReports = await fetchReportsByAudit(reportData.auditId);

  // Určit číslo verze (max + 1, nebo 1 pokud neexistují žádné verze)
  const maxVersion = existingReports.length > 0
    ? Math.max(...existingReports.map(r => r.versionNumber || 0))
    : 0;
  const versionNumber = maxVersion + 1;

  // Načíst displayName uživatele
  let createdByName = 'Neznámý';
  try {
    const userMetadata = await fetchUserMetadata(userId);
    createdByName = userMetadata?.displayName || auth.currentUser?.displayName || 'Neznámý';
  } catch (error) {
    console.warn('[createReport] Chyba při načítání displayName:', error);
    createdByName = auth.currentUser?.displayName || 'Neznámý';
  }

  // Označit všechny staré verze jako isLatest: false
  if (existingReports.length > 0) {
    const batch = writeBatch(db);
    existingReports.forEach(report => {
      const reportRef = doc(db, COLLECTION_NAME, report.id);
      batch.update(reportRef, { isLatest: false });
    });
    await batch.commit();
  }

  // Generovat human-readable ID (formát: R{YYYYMMDD}_{COUNTER})
  const reportId = await generateHumanReadableId('R', COLLECTION_NAME);
  const docRef = doc(db, COLLECTION_NAME, reportId);

  // Pokud reportData obsahuje editorState, uložit ho do smart.editorState
  const { editorState, ...dataWithoutEditorState } = reportData as any;
  const finalData: any = {
    ...dataWithoutEditorState,
    id: reportId, // Explicitně uložit ID do dokumentu
    userId,
    versionNumber,
    createdBy: userId,
    createdByName,
    isLatest: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  // Pokud je editorState v reportData, uložit ho do smart.editorState
  if (editorState !== undefined) {
    finalData.smart = {
      ...(reportData as any).smart,
      editorState
    };
  }

  // Použít setDoc s explicitním ID místo addDoc
  await setDoc(docRef, finalData);

  return reportId;
}

/**
 * Aktualizuje report
 */
export async function updateReport(reportId: string, reportData: Partial<Report>): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, reportId);

  // Odstranit id z dat
  const { id, userId, editorState, ...dataToUpdate } = reportData as any;

  // Pokud je editorState v reportData, uložit ho do smart.editorState
  const updateData: any = {
    ...dataToUpdate,
    updatedAt: Timestamp.now()
  };
  
  if (editorState !== undefined) {
    // Načíst aktuální report pro sloučení smart dat
    const currentReport = await fetchReport(reportId);
    if (currentReport) {
      updateData.smart = {
        ...currentReport.smart,
        editorState
      };
    } else {
      // Pokud report neexistuje, vytvořit nový smart objekt
      updateData.smart = {
        editorState
      };
    }
  }

  await updateDoc(docRef, updateData);
}

/**
 * Smaže report
 */
export async function deleteReport(reportId: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, reportId);
  await deleteDoc(docRef);
}

/**
 * Smaže report pro konkrétní audit
 */
export async function deleteReportByAudit(auditId: string): Promise<void> {
  const report = await fetchReportByAudit(auditId);
  if (report) {
    await deleteReport(report.id);
  }
}

/**
 * Smaže všechny reporty pro dané audity
 */
export async function deleteReportsByAuditIds(auditIds: string[]): Promise<void> {
  // Firestore má limit 10 pro 'in' operátor, takže rozdělíme na batchy
  const batches: string[][] = [];
  for (let i = 0; i < auditIds.length; i += 10) {
    batches.push(auditIds.slice(i, i + 10));
  }

  for (const batch of batches) {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('auditId', 'in', batch)
    );

    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
  }
}

/**
 * Aktualizuje pouze Smart Template metadata v reportu
 */
export async function updateReportSmartMetadata(
  reportId: string,
  smartMetadata: {
    selectedTemplateId?: string;
    selectedTemplateVersion?: string;
    lastSmartDraftPath?: string;
  }
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, reportId);

  // Načíst aktuální report
  const currentReport = await fetchReport(reportId);
  if (!currentReport) {
    throw new Error('Report not found');
  }

  // Sloučit stávající smart data s novými
  const updatedSmart = {
    ...currentReport.smart,
    ...smartMetadata
  };

  await updateDoc(docRef, {
    smart: updatedSmart,
    updatedAt: Timestamp.now()
  });
}

/**
 * Přidá novou finální verzi Smart Template do reportu
 */
export async function addSmartFinalVersion(
  reportId: string,
  versionData: {
    versionId: string;
    reportPath: string;
    pdfPath?: string;
    createdAt: string;
    createdBy: string;
    createdByName?: string;
  }
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, reportId);

  // Načíst aktuální report
  const currentReport = await fetchReport(reportId);
  if (!currentReport) {
    throw new Error('Report not found');
  }

  // Přidat novou verzi do pole finalVersions
  const updatedSmart = {
    ...currentReport.smart,
    finalVersions: [
      ...(currentReport.smart?.finalVersions || []),
      versionData
    ]
  };

  await updateDoc(docRef, {
    smart: updatedSmart,
    updatedAt: Timestamp.now()
  });
}

/**
 * Aktualizuje stav editoru reportu
 */
export async function updateReportEditorState(
  reportId: string,
  editorState: any
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, reportId);
  
  // Načíst aktuální report
  const currentReport = await fetchReport(reportId);
  if (!currentReport) {
    throw new Error('Report not found');
  }
  
  // Sloučit stávající smart data s novým editorState
  const updatedSmart = {
    ...currentReport.smart,
    editorState
  };
  
  await updateDoc(docRef, {
    smart: updatedSmart,
    updatedAt: Timestamp.now()
  });
}

/**
 * Aktualizuje stav V3 editoru (Syncfusion SFDT)
 */
export async function updateReportV3State(
  reportId: string,
  editorStateV3: string
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, reportId);
  // Ukládáme do smart.editorStateV3
  // Musíme použít dot notation pro update vnořeného pole, aby se nepřepsal celý objekt smart
  await updateDoc(docRef, {
    'smart.editorStateV3': editorStateV3,
    updatedAt: Timestamp.now()
  });
}