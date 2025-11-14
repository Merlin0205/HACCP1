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
  Window,
  DoorOpen,
  Layers,
  Faucet,
  Wind,
  Lightbulb,
  Pipe,
  Shirt,
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
  Trash,
  ShirtIcon,
  Gauge,
  BookOpen,
  HelpCircle
} from 'lucide-react';

// Wrapper komponenta pro konzistentní velikost ikon
const IconWrapper: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  return React.cloneElement(children as React.ReactElement, {
    className: `flex-shrink-0 ${className}`,
    size: undefined, // Odstranit size prop pokud existuje
  });
};

// Mapování ikon podle jejich ID - používají Lucide ikony
export const iconMap: { [key: string]: React.ComponentType<any> } = {
  // Základní ikony
  'home': (props: any) => <Home {...props} />,
  'checkmark': (props: any) => <CheckCircle2 {...props} />,
  'settings': (props: any) => <Settings {...props} />,
  'info': (props: any) => <Info {...props} />,
  'warning': (props: any) => <AlertTriangle {...props} />,
  'trash': (props: any) => <Trash2 {...props} />,
  'plus': (props: any) => <Plus {...props} />,
  'report': (props: any) => <FileText {...props} />,
  'checklist': (props: any) => <ClipboardCheck {...props} />,
  'clock': (props: any) => <Clock {...props} />,
  
  // Infrastruktura
  'infra_layout': (props: any) => <Building2 {...props} />,
  'infra_equipment': (props: any) => <Settings {...props} />,
  'infra_water': (props: any) => <Droplets {...props} />,
  'infra_floors': (props: any) => <Square {...props} />,
  'infra_walls': (props: any) => <Square {...props} />,
  'infra_ceilings': (props: any) => <Square {...props} />,
  'infra_windows': (props: any) => <Window {...props} />,
  'infra_doors': (props: any) => <DoorOpen {...props} />,
  'infra_surfaces': (props: any) => <Layers {...props} />,
  'infra_sinks': (props: any) => <Faucet {...props} />,
  'infra_ventilation': (props: any) => <Wind {...props} />,
  'infra_lighting': (props: any) => <Lightbulb {...props} />,
  'infra_sewerage': (props: any) => <Pipe {...props} />,
  'infra_changing_room': (props: any) => <Shirt {...props} />,
  'infra_staff_wc': (props: any) => <Droplets {...props} />,
  'infra_cleaning_room': (props: any) => <Droplets {...props} />,
  
  // Skladování
  'storage_entry_control': (props: any) => <ShieldCheck {...props} />,
  'storage_identifiability': (props: any) => <Info {...props} />,
  'storage_storing': (props: any) => <Package {...props} />,
  'storage_cooling_eq': (props: any) => <Snowflake {...props} />,
  'storage_freezing_eq': (props: any) => <Snowflake {...props} />,
  'storage_dry_storage': (props: any) => <Boxes {...props} />,
  'storage_defrosting': (props: any) => <Thermometer {...props} />,
  
  // GMP
  'gmp_process_monitoring': (props: any) => <FileText {...props} />,
  'gmp_cleanliness': (props: any) => <CheckCircle2 {...props} />,
  'gmp_technical_equipment': (props: any) => <Settings {...props} />,
  'gmp_cross_contamination': (props: any) => <AlertTriangle {...props} />,
  'gmp_distribution': (props: any) => <ArrowRight {...props} />,
  'gmp_food_export': (props: any) => <ArrowRight {...props} />,
  'gmp_allergens': (props: any) => <AlertTriangle {...props} />,
  
  // Hygiena
  'hygiene_health_status': (props: any) => <CheckCircle2 {...props} />,
  'hygiene_personal_cleanliness': (props: any) => <CheckCircle2 {...props} />,
  'hygiene_training': (props: any) => <BookOpen {...props} />,
  'hygiene_behavior': (props: any) => <CheckCircle2 {...props} />,
  
  // Čištění
  'cleaning_sanitation_plan': (props: any) => <FileText {...props} />,
  'cleaning_products': (props: any) => <Droplets {...props} />,
  'cleaning_conditions': (props: any) => <CheckCircle2 {...props} />,
  'cleaning_maintenance': (props: any) => <Wrench {...props} />,
  'cleaning_discarded_items': (props: any) => <Trash2 {...props} />,
  'cleaning_laundry': (props: any) => <Shirt {...props} />,
  'cleaning_waste': (props: any) => <Trash2 {...props} />,
  
  // HACCP
  'haccp_system': (props: any) => <ShieldCheck {...props} />,
  'haccp_documentation': (props: any) => <FileCheck {...props} />,
};

// Default ikona pro neznámé ikony
export const QuestionMarkIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <HelpCircle {...props} />
);



