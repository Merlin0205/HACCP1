import React from 'react';
import {
  Home,
  Settings,
  CheckCircle2,
  FileText,
  AlertTriangle,
  Info,
  Trash2,
  Plus,
  Building2,
  Droplets,
  Square,
  DoorOpen,
  Layers,
  Wind,
  Lightbulb,
  Package,
  Snowflake,
  Thermometer,
  Boxes,
  RefreshCw,
  ClipboardCheck,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  FileCheck,
  Wrench,
  BookOpen,
  HelpCircle,
  Waves,
  Gauge,
  Shirt
} from 'lucide-react';
import { iconMapById } from './iconRegistry';

// Wrapper pro konzistentní velikost ikon - Lucide ikony automaticky respektují className
export const QuestionMarkIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <HelpCircle {...props} />
);

// Mapování kebab-case ID ikon (z databáze) na Lucide komponenty
const iconIdToComponent: { [key: string]: React.ComponentType<any> } = {
  // Základní ikony
  'home': Home,
  'checkmark': CheckCircle2,
  'check-circle-2': CheckCircle2,
  'settings': Settings,
  'info': Info,
  'warning': AlertTriangle,
  'alert-triangle': AlertTriangle,
  'trash': Trash2,
  'trash-2': Trash2,
  'plus': Plus,
  'report': FileText,
  'file-text': FileText,
  'checklist': ClipboardCheck,
  'clipboard-check': ClipboardCheck,
  'clock': RefreshCw,
  'refresh-cw': RefreshCw,
  'help-circle': HelpCircle,
  
  // Infrastruktura
  'building-2': Building2,
  'droplets': Droplets,
  'square': Square,
  'door-open': DoorOpen,
  'layers': Layers,
  'waves': Waves,
  'wind': Wind,
  'lightbulb': Lightbulb,
  'gauge': Gauge,
  'shirt': Shirt,
  
  // Skladování
  'shield-check': ShieldCheck,
  'package': Package,
  'snowflake': Snowflake,
  'thermometer': Thermometer,
  'boxes': Boxes,
  
  // GMP a další
  'arrow-right': ArrowRight,
  'file-check': FileCheck,
  'wrench': Wrench,
  'book-open': BookOpen,
};

// Mapování ikon podle jejich ID - používají Lucide ikony pro konzistentní velikosti
export const iconMap: { [key: string]: React.ComponentType<any> } = {
  ...iconMapById, // Nové ikony z iconRegistry (pokud existují)
  
  // Základní ikony
  'home': Home,
  'checkmark': CheckCircle2,
  'check-circle-2': CheckCircle2,
  'settings': Settings,
  'info': Info,
  'warning': AlertTriangle,
  'alert-triangle': AlertTriangle,
  'trash': Trash2,
  'trash-2': Trash2,
  'plus': Plus,
  'report': FileText,
  'file-text': FileText,
  'checklist': ClipboardCheck,
  'clipboard-check': ClipboardCheck,
  'clock': RefreshCw,
  'refresh-cw': RefreshCw,
  'help-circle': HelpCircle,
  
  // Infrastruktura - podle ID položek
  'infra_layout': Building2,
  'infra_equipment': Settings,
  'infra_water': Droplets,
  'infra_floors': Square,
  'infra_walls': Square,
  'infra_ceilings': Square,
  'infra_windows': Square,
  'infra_doors': DoorOpen,
  'infra_surfaces': Layers,
  'infra_sinks': Waves,
  'infra_ventilation': Wind,
  'infra_lighting': Lightbulb,
  'infra_sewerage': Gauge,
  'infra_changing_room': Shirt,
  'infra_staff_wc': Droplets,
  'infra_cleaning_room': Droplets,
  
  // Skladování
  'storage_entry_control': ShieldCheck,
  'storage_identifiability': Info,
  'storage_storing': Package,
  'storage_cooling_eq': Snowflake,
  'storage_freezing_eq': Snowflake,
  'storage_dry_storage': Boxes,
  'storage_defrosting': Thermometer,
  
  // GMP
  'gmp_process_monitoring': FileText,
  'gmp_cleanliness': CheckCircle2,
  'gmp_technical_equipment': Settings,
  'gmp_cross_contamination': AlertTriangle,
  'gmp_distribution': ArrowRight,
  'gmp_food_export': ArrowRight,
  'gmp_allergens': AlertTriangle,
  
  // Hygiena
  'hygiene_health_status': CheckCircle2,
  'hygiene_personal_cleanliness': CheckCircle2,
  'hygiene_training': BookOpen,
  'hygiene_behavior': CheckCircle2,
  
  // Čištění
  'cleaning_sanitation_plan': FileText,
  'cleaning_products': Droplets,
  'cleaning_conditions': CheckCircle2,
  'cleaning_maintenance': Wrench,
  'cleaning_discarded_items': Trash2,
  'cleaning_laundry': Shirt,
  'cleaning_waste': Trash2,
  
  // HACCP
  'haccp_system': ShieldCheck,
  'haccp_documentation': FileCheck,
  
  // Přidat mapování pro kebab-case ID z databáze
  ...iconIdToComponent,
};

/**
 * Získá ikonu podle ID (podporuje jak camelCase, tak kebab-case)
 */
export function getIconById(iconId?: string): React.ComponentType<any> {
  if (!iconId) {
    return QuestionMarkIcon;
  }
  
  // Zkusit najít přesný match
  if (iconMap[iconId]) {
    return iconMap[iconId];
  }
  
  // Pokud není nalezeno, vrátit default
  return QuestionMarkIcon;
}
