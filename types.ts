export interface HeaderField {
  id: string;
  label: string;
  type: 'text' | 'tel' | 'email' | 'url' | 'date';
}

export interface HeaderSection {
  title: string;
  fields: HeaderField[];
}

export interface HeaderData {
  audited_premise: HeaderSection;
  operator: HeaderSection;
  auditor: HeaderSection;
  audit_meta: {
    fields: HeaderField[];
  };
}

export interface AuditItem {
  id: string;
  title: string;
  description: string;
  active: boolean;
}

export interface AuditSection {
  id: string;
  title: string;
  items: AuditItem[];
  active: boolean;
}

export interface AuditStructure {
  audit_title: string;
  header_data: HeaderData;
  audit_sections: AuditSection[];
}

export interface PhotoWithAnalysis {
  file: File;
  base64?: string;
  analysis?: string;
  isAnalyzing?: boolean;
}

export interface NonComplianceData {
  location: string;
  finding: string;
  recommendation: string;
  photos: PhotoWithAnalysis[];
}

export interface AuditAnswer {
  compliant: boolean;
  nonComplianceData?: NonComplianceData[];
}

export interface AuditHeaderValues {
  [fieldId: string]: string;
}

export interface AuditData {
  headerValues: AuditHeaderValues;
  answers: {
    [itemId: string]: AuditAnswer;
  };
}

export enum AppState {
  WELCOME = 'welcome',
  START = 'start',
  HEADER_FORM = 'header_form',
  IN_PROGRESS = 'in-progress',
  SUMMARY = 'summary',
  ADMIN = 'admin'
}

export interface SavedAudit {
  auditData: AuditData;
  auditStructure: AuditStructure;
}

export interface AIUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUSD: number;
  costCZK: number;
  model: string;
}

export interface AIResponse<T> {
  result: T;
  usage: AIUsage | null;
}


// Kept for legacy compatibility in case some components use it, but should be phased out
export enum QuestionType {
  TEXT = 'text',
  DATE = 'date',
  NUMBER = 'number',
  TEXTAREA = 'textarea',
  CHECKBOX = 'checkbox',
  TIME_RANGE = 'time_range',
  CHOICE = 'choice',
  COMPLEX_TEXT = 'complex_text'
}
// This is a new file that will be created
export const ROBOTO_FONT_BASE64 = `...`; // Content will be in the new file
