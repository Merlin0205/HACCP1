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
  icon?: string; // ID ikony (např. 'home', 'settings', 'checkmark', atd.)
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

export interface AuditType {
  id: string;
  name: string;
  active: boolean;
  auditStructure: AuditStructure;
  createdAt: Date | string;
  updatedAt: Date | string;
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

export interface Tab {
  id: string; // unique ID tabu
  type: 'audit' | 'report' | 'audit_list';
  auditId?: string; // pouze pro audit a report
  premiseId: string;
  operatorName: string; // název provozovatele pro zobrazení
  premiseName?: string; // název pracoviště pro zobrazení (pro audit_list)
  createdAt: string; // timestamp pro řazení
}

export enum AppState {
  OPERATOR_DASHBOARD = 'operator_dashboard',
  ADD_OPERATOR = 'add_operator',
  EDIT_OPERATOR = 'edit_operator',
  ADD_PREMISE = 'add_premise',
  EDIT_PREMISE = 'edit_premise',
  AUDIT_LIST = 'audit_list',
  ALL_AUDITS = 'all_audits',
  INCOMPLETE_AUDITS = 'incomplete_audits',
  HEADER_FORM = 'header_form',
  AUDIT_IN_PROGRESS = 'audit_in_progress',
  REPORT_VIEW = 'report_view',
  SETTINGS = 'settings',
  AUDITOR_SETTINGS = 'auditor_settings',
  AI_REPORT_SETTINGS = 'ai_report_settings',
  AI_USAGE_STATS = 'ai_usage_stats',
  AI_PRICING_CONFIG = 'ai_pricing_config',
  AI_PROMPTS = 'ai_prompts',
  SMART_TEMPLATE_SETTINGS = 'smart_template_settings',
  ADMIN = 'admin',
  USER_MANAGEMENT = 'user_management'
}

export interface ReportData {
  summary: {
    title: string;
    evaluation_text: string;
    key_findings: string[];
    key_recommendations: string[];
  };
  sections: {
    section_title: string;
    evaluation: string;
    non_compliances: {
      item_title: string;
      location: string;
      finding: string;
      recommendation: string;
    }[];
  }[];
}

export interface Operator {
  id: string; 
  operator_name: string;
  operator_address: string;
  operator_ico: string;
  operator_statutory_body: string;
  operator_phone: string;
  operator_email: string;
}

export interface Premise {
  id: string;
  operatorId: string;
  premise_name: string;
  premise_address: string;
  premise_responsible_person: string;
  premise_phone: string;
  premise_email: string;
}

// Zpětná kompatibilita - deprecated, použijte Operator
export type Customer = Operator;

export enum AuditStatus {
  DRAFT = 'Nezapočatý',
  IN_PROGRESS = 'Probíhá',
  COMPLETED = 'Dokončen',
  REVISED = 'Změny',
  // Zpětná kompatibilita
  NOT_STARTED = 'Nezapočatý', // mapuje na DRAFT
  LOCKED = 'Dokončen' // mapuje na COMPLETED
}

export interface Audit {
  id: string;
  premiseId: string;
  status: AuditStatus;
  createdAt: string;
  completedAt?: string;
  headerValues: AuditHeaderValues;
  answers: {
    [itemId: string]: AuditAnswer;
  };
  auditTypeId?: string; // ID typu auditu (optional pro zpětnou kompatibilitu)
}

export enum ReportStatus {
  PENDING = 'Čeká na generování',
  GENERATING = 'Generuje se',
  DONE = 'Hotovo',
  ERROR = 'Chyba'
}

export interface AuditorInfo {
  name: string;
  phone: string;
  email: string;
  web: string;
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user'
}

export interface UserMetadata {
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
  approved: boolean;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string; // userId admina který schválil
}

export interface Report {
  id: string;
  auditId: string;
  status: ReportStatus;
  createdAt: string;
  generatedAt?: string;
  reportData?: ReportData;
  error?: string;
  usage?: any;
  auditorSnapshot?: AuditorInfo; // Údaje auditora v době generování reportu
  // Historie verzí reportů
  versionNumber?: number; // Číslo verze (1, 2, 3, ...)
  createdBy?: string; // userId uživatele, který vytvořil report
  createdByName?: string; // displayName uživatele (pro zobrazení bez joinování)
  isLatest?: boolean; // true pokud je to nejnovější verze reportu pro daný audit
  // Smart Template data
  smart?: {
    selectedTemplateId?: string;
    selectedTemplateVersion?: string;
    lastSmartDraftPath?: string;
    finalVersions?: Array<{
      versionId: string;
      reportPath: string;
      pdfPath?: string;
      createdAt: string;
      createdBy: string;
      createdByName?: string;
    }>;
  };
}

/**
 * ReportTemplate - šablona pro Smart Template systém
 */
export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  version: string;
  rules: any; // TemplateRules z types/smartReport.ts (circular dependency)
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string; // userId
}
