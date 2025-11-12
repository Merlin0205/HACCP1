/**
 * Service pro aktualizaci ikon v audit typech
 * Přiřazuje vhodné Lucide ikony podle názvů položek auditů
 */

import { fetchAllAuditTypes, updateAuditType } from './auditTypes';
import { AuditStructure, AuditItem } from '../../types';

// Mapování názvů položek na vhodné Lucide ikony
const iconMapping: { [key: string]: string } = {
  // Infrastruktura
  'layout': 'building-2',
  'equipment': 'settings',
  'water': 'droplets',
  'floors': 'square',
  'walls': 'square',
  'ceilings': 'square',
  'windows': 'square',
  'doors': 'door-open',
  'surfaces': 'layers',
  'sinks': 'waves',
  'ventilation': 'wind',
  'lighting': 'lightbulb',
  'sewerage': 'gauge',
  'changing_room': 'shirt',
  'staff_wc': 'droplets',
  'cleaning_room': 'droplets',
  
  // Skladování
  'entry_control': 'shield-check',
  'identifiability': 'info',
  'storing': 'package',
  'cooling_eq': 'snowflake',
  'freezing_eq': 'snowflake',
  'dry_storage': 'boxes',
  'defrosting': 'thermometer',
  
  // GMP
  'process_monitoring': 'file-text',
  'cleanliness': 'check-circle-2',
  'technical_equipment': 'settings',
  'cross_contamination': 'alert-triangle',
  'distribution': 'arrow-right',
  'food_export': 'arrow-right',
  'allergens': 'alert-triangle',
  
  // Hygiena
  'health_status': 'check-circle-2',
  'personal_cleanliness': 'check-circle-2',
  'training': 'book-open',
  'behavior': 'check-circle-2',
  
  // Čištění
  'sanitation_plan': 'file-text',
  'products': 'droplets',
  'conditions': 'check-circle-2',
  'maintenance': 'wrench',
  'discarded_items': 'trash-2',
  'laundry': 'shirt',
  'waste': 'trash-2',
  
  // HACCP
  'system': 'shield-check',
  'documentation': 'file-check',
  
  // Obecné klíčová slova
  'plan': 'file-text',
  'document': 'file-text',
  'documentation': 'file-check',
  'regulation': 'file-text',
  'order': 'file-text',
  'preparation': 'droplets',
  'preparations': 'droplets',
  'sanitation': 'droplets',
  'cleaning': 'droplets',
  'maintenance': 'wrench',
  'waste': 'trash-2',
  'laundry': 'shirt',
  'training': 'book-open',
  'health': 'check-circle-2',
  'cleanliness': 'check-circle-2',
  'behavior': 'check-circle-2',
  'equipment': 'settings',
  'ventilation': 'wind',
  'lighting': 'lightbulb',
  'water': 'droplets',
  'cooling': 'snowflake',
  'freezing': 'snowflake',
  'storage': 'package',
  'distribution': 'arrow-right',
  'export': 'arrow-right',
  'contamination': 'alert-triangle',
  'allergens': 'alert-triangle',
};

/**
 * Najde vhodnou ikonu pro daný název položky
 */
function findIconForItem(title: string, itemId: string): string {
  const lowerTitle = title.toLowerCase();
  const lowerId = itemId.toLowerCase();
  
  // Nejprve zkusit najít přesný match v ID (nejvyšší priorita)
  if (iconMapping[lowerId]) {
    return iconMapping[lowerId];
  }
  
  // Pak zkusit najít podle části ID (např. infra_layout obsahuje layout)
  for (const [key, icon] of Object.entries(iconMapping)) {
    if (lowerId.includes(key) || key.includes(lowerId)) {
      return icon;
    }
  }
  
  // Pak zkusit najít v názvu
  for (const [key, icon] of Object.entries(iconMapping)) {
    if (lowerTitle.includes(key)) {
      return icon;
    }
  }
  
  // Default ikona
  return 'help-circle';
}

/**
 * Aktualizuje ikony v audit struktuře
 */
function updateIconsInStructure(structure: AuditStructure, forceUpdate: boolean = false): AuditStructure {
  const updatedSections = structure.audit_sections.map(section => ({
    ...section,
    items: section.items.map(item => {
      // Pokud už má ikonu a nechceme force update, nechat ji
      if (item.icon && !forceUpdate) {
        return item;
      }
      
      // Najít vhodnou ikonu
      const iconId = findIconForItem(item.title, item.id);
      
      return {
        ...item,
        icon: iconId
      };
    })
  }));
  
  return {
    ...structure,
    audit_sections: updatedSections
  };
}

/**
 * Aktualizuje ikony ve všech typech auditů
 * @param forceUpdate Pokud true, přepíše i existující ikony
 */
export async function updateAllAuditTypeIcons(forceUpdate: boolean = false): Promise<void> {
  try {
    const auditTypes = await fetchAllAuditTypes();
    
    console.log(`[updateAllAuditTypeIcons] Našel ${auditTypes.length} typů auditů`);
    
    let updatedCount = 0;
    
    for (const auditType of auditTypes) {
      const updatedStructure = updateIconsInStructure(auditType.auditStructure, forceUpdate);
      
      // Zkontrolovat, zda se něco změnilo
      const hasChanges = JSON.stringify(auditType.auditStructure) !== JSON.stringify(updatedStructure);
      
      if (hasChanges) {
        console.log(`[updateAllAuditTypeIcons] Aktualizuji ikony pro typ: ${auditType.name}`);
        await updateAuditType(auditType.id, {
          auditStructure: updatedStructure
        });
        console.log(`[updateAllAuditTypeIcons] ✓ Aktualizováno: ${auditType.name}`);
        updatedCount++;
      } else {
        console.log(`[updateAllAuditTypeIcons] - Žádné změny pro: ${auditType.name}`);
      }
    }
    
    console.log(`[updateAllAuditTypeIcons] ✓ Hotovo! Aktualizováno ${updatedCount} z ${auditTypes.length} typů auditů`);
  } catch (error) {
    console.error('[updateAllAuditTypeIcons] Chyba:', error);
    throw error;
  }
}

/**
 * Aktualizuje ikony v konkrétním typu auditu
 */
export async function updateAuditTypeIcons(auditTypeId: string): Promise<void> {
  try {
    const { fetchAuditType } = await import('./auditTypes');
    const auditType = await fetchAuditType(auditTypeId);
    
    if (!auditType) {
      throw new Error(`Audit typ s ID ${auditTypeId} nebyl nalezen`);
    }
    
    const updatedStructure = updateIconsInStructure(auditType.auditStructure);
    
    await updateAuditType(auditTypeId, {
      auditStructure: updatedStructure
    });
    
    console.log(`[updateAuditTypeIcons] ✓ Aktualizováno: ${auditType.name}`);
  } catch (error) {
    console.error('[updateAuditTypeIcons] Chyba:', error);
    throw error;
  }
}

