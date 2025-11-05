/**
 * Script pro inicializaci default Smart Template v Firestore
 * 
 * Spustit jednou po deploy na Firebase:
 * npm run init-default-template
 * nebo
 * node scripts/initDefaultTemplate.js
 */

import { DEFAULT_TEMPLATE, DEFAULT_TEMPLATE_ID, DEFAULT_TEMPLATE_VERSION } from '../services/smartTemplate/defaultTemplate';
import { createReportTemplate, fetchReportTemplate } from '../services/firestore/reportTemplates';
import { auth } from '../firebaseConfig';

async function initializeDefaultTemplate() {
  try {
    // Zkontrolovat jestli už default template existuje
    const existing = await fetchReportTemplate(DEFAULT_TEMPLATE_ID);
    
    if (existing) {
      console.log('[INIT] Default template už existuje, přeskakuji inicializaci');
      return;
    }

    // Získat aktuálního uživatele (musí být přihlášený)
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Uživatel musí být přihlášený pro vytvoření default template');
    }

    // Vytvořit default template
    await createReportTemplate({
      id: DEFAULT_TEMPLATE_ID,
      name: 'HACCP Default Template',
      description: 'Výchozí šablona pro HACCP reporty',
      version: DEFAULT_TEMPLATE_VERSION,
      rules: DEFAULT_TEMPLATE,
      isDefault: true,
      createdBy: user.uid
    });

    console.log('[INIT] Default template úspěšně vytvořen');
  } catch (error) {
    console.error('[INIT] Chyba při inicializaci default template:', error);
    throw error;
  }
}

// Pokud je spuštěn přímo jako script
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDefaultTemplate()
    .then(() => {
      console.log('[INIT] Dokončeno');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[INIT] Chyba:', error);
      process.exit(1);
    });
}

export { initializeDefaultTemplate };


