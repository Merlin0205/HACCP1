/**
 * Services Index - Export všech API služeb
 */

export { api, apiRequest, ApiError } from './client';
export type { ApiRequestConfig } from './client';

export { fetchAppData, saveAppData, appDataApi } from './appData';
export type { AppData } from './appData';

export { generateReport, reportsApi } from './reports';
export type { GenerateReportRequest, GenerateReportResponse } from './reports';
