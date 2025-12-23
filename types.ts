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
  reportTextNoNonCompliances?: string; // HTML text když nejsou neshody
  reportTextWithNonCompliances?: string; // HTML text když jsou neshody
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface PhotoWithAnalysis {
  file?: File; // Optional - pouze pro preview před uploadem
  base64?: string; // Optional - pouze pro preview před uploadem nebo backward compatibility
  storagePath?: string; // Cesta ve Storage (users/{userId}/audits/{auditId}/photo_xxx.jpg)
  url?: string; // Download URL z Storage
  analysis?: string;
  isAnalyzing?: boolean;
  isUploading?: boolean; // Nový flag pro upload state
  widthRatio?: number; // Custom width ratio (0-1) for report editor
  colSpan?: 1 | 2 | 3; // Legacy grid span, kept for backward compatibility or defaults
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
  reportId?: string; // pouze pro report (kanonická routa /reports/:reportId)
  premiseId: string;
  operatorName: string; // název provozovatele pro zobrazení
  premiseName?: string; // název pracoviště pro zobrazení (pro audit_list)
  createdAt: string; // timestamp pro řazení
  // Nové pro lepší UX:
  auditDate?: string; // Datum auditu pro zobrazení v tooltip
  status?: string; // Status auditu pro vizuální indikaci
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
  IN_PROGRESS_AUDITS = 'in_progress_audits',
  HEADER_FORM = 'header_form',
  AUDIT_IN_PROGRESS = 'audit_in_progress',
  REPORT_VIEW = 'report_view',
  INVOICES = 'invoices',
  INVOICE_DETAIL = 'invoice_detail',
  INVOICE_CREATE = 'invoice_create',
  INVOICE_EDIT = 'invoice_edit',
  SETTINGS = 'settings',
  AUDITOR_SETTINGS = 'auditor_settings',
  AI_REPORT_SETTINGS = 'ai_report_settings',
  AI_USAGE_STATS = 'ai_usage_stats',
  AI_PRICING_CONFIG = 'ai_pricing_config',
  AI_PROMPTS = 'ai_prompts',

  PRICING = 'pricing',
  BILLING_SETTINGS = 'billing_settings',
  SUPPLIER_MANAGEMENT = 'supplier_management',
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
  operator_address?: string; // DEPRECATED - použít operator_street, operator_city, operator_zip
  operator_street: string;
  operator_city: string;
  operator_zip: string;
  operator_ico: string;
  operator_dic?: string;
  operator_statutory_body: string;
  operator_phone: string;
  operator_email: string;
  vatVerification?: {
    valid: boolean;
    verifiedAt: string;
    name?: string;
    address?: string;
    countryCode?: string;
    vatNumber?: string;
  };
}

export interface InvoiceNumberingType {
  id: string;
  userId: string; // vlastník dat
  name: string; // název typu číslování (např. "Standardní faktury", "Zálohy", "Dobropisy")
  prefix: string; // prefix čísla faktury (např. "FA", "2025-", "ZAL")
  nextNumber: number; // další číslo faktury
  padding: number; // počet číslic (padding), např. 3 → 001, 5 → 00001
  createdAt?: string;
  updatedAt?: string;
}

export interface Supplier {
  id: string;
  userId: string; // vlastník dat
  supplier_name: string; // název dodavatele
  supplier_street: string;
  supplier_city: string;
  supplier_zip: string;
  supplier_country: string; // defaultně "Česká republika"
  supplier_ico: string; // IČO
  supplier_dic?: string; // DIČ
  supplier_statutory_body?: string; // statutární orgán
  supplier_phone?: string;
  supplier_email?: string;
  supplier_website?: string;
  supplier_iban?: string;
  supplier_bankAccount?: string; // číslo účtu v lokálním formátu (deprecated - použij supplier_accountNumber a supplier_bankCode)
  supplier_accountNumber?: string; // číslo účtu (bez kódu banky)
  supplier_bankCode?: string; // kód banky (např. "0100", "0300")
  supplier_swift?: string;
  supplier_logoUrl?: string; // URL loga v PDF
  supplier_stampUrl?: string; // URL razítka v PDF
  isDefault?: boolean; // výchozí dodavatel pro uživatele
  isVatPayer?: boolean; // plátce DPH (true = je plátce, false = není plátce)
  invoiceNumberingTypeId?: string; // ID typu číslování faktur přiřazeného k dodavateli
  createdAt?: string;
  updatedAt?: string;
  vatVerification?: {
    valid: boolean;
    verifiedAt: string;
    name?: string;
    address?: string;
    countryCode?: string;
    vatNumber?: string;
  };
}

export interface Premise {
  id: string;
  operatorId: string;
  premise_name: string;
  premise_address: string;
  premise_responsible_person: string;
  premise_phone: string;
  premise_email: string;
  auditTypeId?: string; // ID typu auditu přiřazeného k pracovišti
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
  note?: string; // Poznámka k auditu (free text s možností audio transkripce)
  headerValues: AuditHeaderValues;
  answers: {
    [itemId: string]: AuditAnswer;
  };
  auditTypeId?: string; // ID typu auditu (optional pro zpětnou kompatibilitu)
  invoiceId?: string; // Reference na fakturu (pokud byla vystavena)
}

// Alias pro zpětnou kompatibilitu
export type AuditData = Audit;

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
  stampUrl?: string; // URL razítka v Firebase Storage
  stampAlignment?: 'left' | 'center' | 'right'; // Zarovnání razítka (výchozí: 'left')
  stampWidthRatio?: number; // Šířka razítka jako ratio 0.1-1.0 (výchozí: 0.333 = 1/3 šířky)
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
  headerValuesSnapshot?: AuditHeaderValues; // Snapshot headerValues v době generování reportu
  answersSnapshot?: Record<string, AuditAnswer>; // Snapshot audit.answers v době generování reportu
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
    // Editor State - pro nový ReportEditorV2
    editorState?: any; // ReportEditorState (any kvůli circular dependency, ale v kódu přetypujeme)
    editorStateV3?: string; // Syncfusion SFDT JSON string
    // V4 Tiptap Document (JSONContent format)
    tiptapDocument?: any; // TiptapDocumentState from types/reportEditor.ts
  }
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
