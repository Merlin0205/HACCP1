/**
 * API služba pro generování reportů - MIGRACE NA FIREBASE CLOUD FUNCTIONS
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebaseConfig';
import { Audit, AuditStructure, ReportData } from '../types';

export interface GenerateReportRequest {
  auditData: Audit;
  auditStructure: AuditStructure;
}

export interface GenerateReportResponse {
  result: ReportData;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Callable Cloud Function reference
 */
const generateReportFunction = httpsCallable<GenerateReportRequest, GenerateReportResponse>(
  functions,
  'generateReport'
);

/**
 * Vygeneruje report pomocí AI přes Cloud Functions
 */
export async function generateReport(
  request: GenerateReportRequest
): Promise<GenerateReportResponse> {
  try {
    const result = await generateReportFunction(request);
    return result.data;
  } catch (error: any) {
    console.error('[generateReport] Cloud Function error:', error);
    
    // Převést Firebase error na standardní Error
    const errorMessage = error.message || error.code || 'Chyba při generování reportu';
    throw new Error(errorMessage);
  }
}

export const reportsApi = {
  generate: generateReport,
};
