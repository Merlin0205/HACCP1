/**
 * Script pro migraci existujících dat z lokálních JSON souborů do Firestore
 * 
 * Použití:
 * 1. Ujistěte se, že máte Firebase project nastavený
 * 2. Vyplňte .env soubor s Firebase credentials
 * 3. Spusťte: npx ts-node scripts/migrateDataToFirestore.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Tento script vyžaduje Firebase Admin SDK
// Pro jednoduchost: můžete data migrovat manuálně přes Firebase Console
// nebo vytvořit jednoduché UI v aplikaci pro import

console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   🔥 FIREBASE DATA MIGRATION                                   ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

POZNÁMKA: Pro migraci existujících dat máte 3 možnosti:

1. ✨ DOPORUČENO: Začít s čistou databází
   - Zaregistrujte se v aplikaci
   - Vytvořte nové zákazníky a audity
   - Výhoda: Čisté prostředí, žádné legacy problémy

2. 📥 Manuální import přes Firebase Console
   - Otevřete Firebase Console → Firestore
   - Použijte "Import data" feature
   - Nahrajte JSON soubory z server/db/

3. 🛠️ Vlastní migration script
   - Nainstalujte firebase-admin SDK
   - Napište script pro čtení JSON a zápis do Firestore
   - Použijte Firebase Admin SDK credentials

════════════════════════════════════════════════════════════════

Pokud máte existující data v server/db/:
`);

// Zkontrolovat, zda existují lokální data
const dataDir = path.join(process.cwd(), 'server', 'db');

if (fs.existsSync(dataDir)) {
  console.log('\n✅ Nalezeny lokální data soubory:');
  const files = fs.readdirSync(dataDir);
  files.forEach(file => {
    if (file.endsWith('.json')) {
      const filePath = path.join(dataDir, file);
      const stats = fs.statSync(filePath);
      console.log(`   - ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
    }
  });
  
  console.log(`
  
📦 Pro import těchto dat do Firestore:

1. Otevřete Firebase Console
2. Jděte na Firestore Database
3. Vytvořte collections ručně:
   - customers
   - audits
   - reports
   - settings

4. Pro každý JSON soubor:
   - Otevřete soubor
   - Pro customers/audits/reports:
     * Každý objekt = jeden document
     * PŘIDEJTE POLE: userId = "váš-první-user-id"
   - Pro settings:
     * Vytvořte documents podle struktury

NEBO napište vlastní migration script pomocí firebase-admin.
  `);
} else {
  console.log('\n⚠️ Žádná lokální data nenalezena v server/db/');
  console.log('   Můžete začít s čistou databází.');
}

console.log(`
════════════════════════════════════════════════════════════════

🎯 DOPORUČENÝ POSTUP:

1. Deploy aplikaci na Firebase
2. Zaregistrujte se jako první uživatel
3. Vytvořte testovacího zákazníka
4. Proveďte testovací audit
5. Ověřte, že vše funguje

Pak můžete přidat další zákazníky a audity podle potřeby.

════════════════════════════════════════════════════════════════
`);

export {};

