/**
 * Migrační skript pro převod starých audit statusů na nové
 * 
 * Spustit jednou v konzoli prohlížeče po načtení aplikace:
 * 
 * import { db } from './firebase';
 * import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
 * 
 * const migrateAuditStatuses = async () => {
 *   const auditsRef = collection(db, 'audits');
 *   const snapshot = await getDocs(auditsRef);
 *   
 *   let updated = 0;
 *   for (const auditDoc of snapshot.docs) {
 *     const data = auditDoc.data();
 *     const status = data.status;
 *     
 *     let newStatus = status;
 *     if (status === 'Nový') {
 *       newStatus = 'Nezapočatý'; // NOT_STARTED -> DRAFT
 *     } else if (status === 'Uzamčen') {
 *       newStatus = 'Dokončen'; // LOCKED -> COMPLETED
 *     }
 *     
 *     if (newStatus !== status) {
 *       await updateDoc(doc(db, 'audits', auditDoc.id), { status: newStatus });
 *       updated++;
 *       console.log(`Migrován audit ${auditDoc.id}: ${status} -> ${newStatus}`);
 *     }
 *   }
 *   
 *   console.log(`Migrace dokončena. Aktualizováno ${updated} auditů.`);
 * };
 * 
 * migrateAuditStatuses();
 */

export const MIGRATION_NOTES = `
MIGRACE AUDIT STATUSŮ:

1. Staré statusy → Nové statusy:
   - "Nový" (NOT_STARTED) → "Nezapočatý" (DRAFT)
   - "Uzamčen" (LOCKED) → "Dokončen" (COMPLETED)
   - "Probíhá" (IN_PROGRESS) → zůstává "Probíhá"
   - "Dokončen" (COMPLETED) → zůstává "Dokončen"

2. Nové statusy:
   - DRAFT = 'Nezapočatý' - nový audit, ještě není nic vyplněno
   - IN_PROGRESS = 'Probíhá' - audit je v průběhu práce
   - COMPLETED = 'Dokončen' - report byl vygenerován
   - REVISED = 'Změny' - po dokončení byly provedeny změny

3. Automatické převody:
   - Při vytvoření nového auditu: DRAFT
   - Při prvním uložení průběhu: DRAFT → IN_PROGRESS (pokud má odpovědi)
   - Při dokončení auditu: COMPLETED
   - Při změně dokončeného auditu: COMPLETED → REVISED

4. Zpětná kompatibilita:
   - Staré statusy NOT_STARTED a LOCKED jsou stále podporovány
   - Zobrazují se jako DRAFT a COMPLETED
   - Automaticky se převedou při první změně

5. Migrace existujících dat:
   - Data se automaticky převedou při první změně
   - Nebo můžete spustit migrační skript (viz výše)
`;

