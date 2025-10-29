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

export enum AppState {
  CUSTOMER_DASHBOARD = 'customer_dashboard',
  ADD_CUSTOMER = 'add_customer',
  EDIT_CUSTOMER = 'edit_customer',
  AUDIT_LIST = 'audit_list',
  HEADER_FORM = 'header_form',
  AUDIT_IN_PROGRESS = 'audit_in_progress',
  REPORT_VIEW = 'report_view',
  SETTINGS = 'settings',
  AUDITOR_SETTINGS = 'auditor_settings',
  AI_REPORT_SETTINGS = 'ai_report_settings',
  AI_USAGE_STATS = 'ai_usage_stats',
  AI_PRICING_CONFIG = 'ai_pricing_config',
  ADMIN = 'admin'
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

export interface Customer {
  id: string; 
  operator_name: string;
  operator_address: string;
  operator_ico: string;
  operator_statutory_body: string;
  operator_phone: string;
  operator_email: string;
  premise_name: string;
  premise_address: string;
  premise_responsible_person: string;
  premise_phone: string;
  premise_email: string;
}

export enum AuditStatus {
  NOT_STARTED = 'Nový',
  IN_PROGRESS = 'Probíhá',
  COMPLETED = 'Dokončen',
  LOCKED = 'Uzamčen' 
}

export interface Audit {
  id: string;
  customerId: string;
  status: AuditStatus;
  createdAt: string;
  completedAt?: string;
  headerValues: AuditHeaderValues;
  answers: {
    [itemId: string]: AuditAnswer;
  };
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
}
