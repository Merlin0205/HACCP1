/**
 * API služba pro generování reportů
 */

import { api } from './client';
import { Audit, AuditStructure, ReportData } from '../types';

export interface GenerateReportRequest {
  auditData: Audit;
  auditStructure: AuditStructure;
}

export interface GenerateReportResponse {
  result: ReportData;
  usage?: any;
}

/**
 * Vygeneruje report pomocí AI
 * 
 * Timeout je nastaven na 60 sekund kvůli AI zpracování
 */
export async function generateReport(
  request: GenerateReportRequest
): Promise<GenerateReportResponse> {
  return api.post<GenerateReportResponse>(
    '/api/generate-report',
    request,
    {
      timeout: 60000, // 60 sekund pro AI generování
      retries: 1, // Pouze 1 retry kvůli dlouhému zpracování
    }
  );
}

export const reportsApi = {
  generate: generateReport,
};
