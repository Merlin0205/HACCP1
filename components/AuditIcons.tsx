import React from 'react';
import { FiAlertCircle } from 'react-icons/fi';
import { iconMapById } from './iconRegistry';
import { HomeIcon, SettingsIcon, CheckmarkIcon, ReportIcon, WarningIcon, InfoIcon, TrashIcon, PlusIcon } from './icons';

export const QuestionMarkIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.79 4 4 0 .863-.293 1.66-.789 2.288l-1.07 1.072a2 2 0 01-2.828 0l-.707-.707a2 2 0 00-2.828 0l-1.07 1.072A4.5 4.5 0 006 18h12" />
    </svg>
);

// Mapování ikon podle jejich ID (používá se v item.icon)
// Kombinuje nové ikony z iconRegistry a staré pro zpětnou kompatibilitu
export const iconMap: { [key: string]: React.ComponentType<any> } = {
    ...iconMapById, // Nové ikony z iconRegistry
    
    // Zpětná kompatibilita se starými ID (item.id)
    'infra_layout': SettingsIcon,
    'infra_equipment': SettingsIcon,
    'infra_water': CheckmarkIcon,
    'infra_floors': HomeIcon,
    'infra_walls': HomeIcon,
    'infra_ceilings': HomeIcon,
    'infra_windows': HomeIcon,
    'infra_doors': HomeIcon,
    'infra_surfaces': CheckmarkIcon,
    'infra_sinks': CheckmarkIcon,
    'infra_ventilation': SettingsIcon,
    'infra_lighting': InfoIcon,
    'infra_sewerage': TrashIcon,
    'infra_changing_room': HomeIcon,
    'infra_staff_wc': TrashIcon,
    'infra_cleaning_room': TrashIcon,
    'storage_entry_control': CheckmarkIcon,
    'storage_identifiability': InfoIcon,
    'storage_storing': HomeIcon,
    'storage_cooling_eq': SettingsIcon,
    'storage_freezing_eq': SettingsIcon,
    'storage_dry_storage': HomeIcon,
    'storage_defrosting': SettingsIcon,
    'gmp_process_monitoring': ReportIcon,
    'gmp_cleanliness': CheckmarkIcon,
    'gmp_technical_equipment': SettingsIcon,
    'gmp_cross_contamination': WarningIcon,
    'gmp_distribution': PlusIcon,
    'gmp_food_export': PlusIcon,
    'gmp_allergens': WarningIcon,
    'hygiene_health_status': CheckmarkIcon,
    'hygiene_personal_cleanliness': CheckmarkIcon,
    'hygiene_training': ReportIcon,
    'hygiene_behavior': CheckmarkIcon,
    'cleaning_sanitation_plan': ReportIcon,
    'cleaning_products': TrashIcon,
    'cleaning_conditions': CheckmarkIcon,
    'cleaning_maintenance': SettingsIcon,
    'cleaning_discarded_items': TrashIcon,
    'cleaning_laundry': TrashIcon,
    'cleaning_waste': TrashIcon,
    'haccp_system': ReportIcon,
    'haccp_documentation': ReportIcon,
};
