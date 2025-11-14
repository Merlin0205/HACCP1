# Fakturace – návrh modulu pro HACCP Audit Assistant

Cíl: Navrhnout kompletní FE/BE strukturu pro **vydané faktury** tak, aby:

- seděla na stávající design aplikace (HACCP Audit – Firebase verze),
- využívala stávající datový model (Firestore, `generateHumanReadableId`),
- umožnila **manuální vystavení faktury** na základě zákazníka / auditu,
- uměla **spravovat seznam faktur** (nezaplacené / všechny),
- připravila podklady pro pozdější generování PDF ve vzhledu podobném vzorové faktuře (iDoklad).

Tento dokument je připraven jako podklad pro Cursor AI – implementace v rámci existující codebase.

---

## 1. Datový model – Firestore

### 1.1 Kolekce `/invoices/{invoiceId}`

ID bude používat stejný human–readable formát jako ostatní entity:

- `I{YYYYMMDD}_{COUNTER}` – např. `I20250403_0001`

Pole (minimální, ale připravené na rozšíření):

```ts
// Firestore: /invoices/{invoiceId}
{
  userId: string;                 // vlastník dat (stejný princip jako u audits/customers)
  customerId: string;             // reference na /customers/{customerId}
  auditId?: string;               // volitelná reference na /audits/{auditId}

  // Základní identifikace dokladu
  invoiceNumber: string;          // textové číslo faktury, zobrazuje se na PDF (např. 170002)
  variableSymbol: string;         // VS (standardně stejné jako invoiceNumber)
  constantSymbol?: string;        // KS (např. 0308)
  createdAt: Timestamp;           // datum vystavení (issue date)
  taxableSupplyDate: Timestamp;   // datum zdanitelného plnění
  dueDate: Timestamp;             // splatnost (maturity)
  currency: string;               // např. "CZK" / "EUR"
  exchangeRate?: number;          // volitelné, pro přepočet (např. 27.06)

  status: 'draft' | 'issued' | 'paid' | 'cancelled';

  // Dodavatel (provider) – snapshot v okamžiku vystavení
  supplier: {
    name: string;
    street: string;
    city: string;
    zip: string;
    country: string;
    companyId: string;            // IČO
    vatId?: string;               // DIČ
    iban?: string;
    bankAccount?: string;        // číslo účtu v lokálním formátu
    swift?: string;
    email?: string;
    phone?: string;
    website?: string;
    logoUrl?: string;            // URL loga v PDF
  };

  // Odběratel (customer) – snapshot z /customers v okamžiku vystavení
  customer: {
    name: string;
    street: string;
    city: string;
    zip: string;
    country: string;
    companyId?: string;          // IČO (pokud má)
    vatId?: string;              // DIČ (pokud má)
    contactPerson?: string;
    email?: string;
    phone?: string;
  };

  // Položky faktury
  items: Array<{
    id: string;                  // lokální ID řádku (např. "1", "2" nebo uuid)
    name: string;                // text položky (např. "HACCP audit ŠKOLNÍ JÍDELNA")
    description?: string;        // doplňující popis
    quantity: number;
    unit: string;                // např. "ks", "hod"
    unitPrice: number;           // cena za jednotku bez DPH
    vatRate: number;             // např. 0, 10, 15, 21
    totalWithoutVat: number;     // quantity * unitPrice
    vatAmount: number;           // vypočtená DPH
    totalWithVat: number;        // totalWithoutVat + vatAmount
  }>;

  // Součty (předpočítané kvůli rychlému renderu)
  totals: {
    baseWithoutVat: number;      // součet všech položek bez DPH
    vatAmount: number;           // celková DPH
    totalWithVat: number;        // celkem v měně dokladu
    rounding?: number;           // případné zaokrouhlení
    totalInCzk?: number;         // volitelné, pokud je měna EUR a přepočet do CZK
  };

  payment: {
    method: 'bank_transfer' | 'cash' | 'card' | 'other';
    bankAccount?: string;        // zobrazuje se na faktuře
    iban?: string;
    swift?: string;
    qrPaymentData?: string;      // generovaný payload pro QR (budoucí rozšíření)
  };

  note?: string;                 // volný text (např. "Zboží zůstává až do úplného uhrazení...")
  footerNote?: string;           // poznámka dole (např. info o zápisu v OR)
  language: 'cs' | 'en';         // zatím stačí 'cs'
  pdfUrl?: string;               // URL v Firebase Storage na vygenerované PDF (budoucí krok)

  // Audit metadata
  printedBy?: string;            // jméno uživatele, který fakturu vystavil
  printedAt?: Timestamp;         // datum prvního vystavení PDF
}
```

### 1.2 Kolekce `/settings/{documentId}` – rozšíření o defaulty pro fakturaci

Do `settings` (nebo nové kolekce `/billingSettings/{userId}`) přidat konfiguraci fakturačních údajů dodavatele:

```ts
// Např. settings/billing_{userId}
{
  userId: string;
  supplier: {
    name: string;
    street: string;
    city: string;
    zip: string;
    country: string;
    companyId: string;
    vatId?: string;
    iban?: string;
    bankAccount?: string;
    swift?: string;
    email?: string;
    phone?: string;
    website?: string;
    logoUrl?: string;
    defaultPaymentMethod: 'bank_transfer' | 'cash' | 'card' | 'other';
    defaultDueDays: number; // např. 14
    defaultCurrency: string; // "CZK"
  };
  invoiceNumbering: {
    prefix: string;   // např. "" nebo "2025-"
    nextNumber: number;
    padding: number;  // počet číslic, např. 5 → 00001
  };
}
```

Cursor pak může implementovat utilitu, která:

1. Načte `billingSettings` pro aktuálního uživatele.
2. Vygeneruje nové `invoiceNumber` podle `prefix + padded(nextNumber)`.
3. Zvedne `nextNumber` v transakci.

---

## 2. Firestore service layer

Vytvořit nový service modul v `services/firestore/invoices.ts`:

```ts
// services/firestore/invoices.ts
import { doc, collection, getDoc, getDocs, query, where, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { generateHumanReadableId } from '../../utils/idGenerator';
import { Invoice } from '../../types/invoice';

const COLLECTION_NAME = 'invoices';

export async function createInvoice(data: Omit<Invoice, 'invoiceId'>): Promise<string> {
  const invoiceId = generateHumanReadableId('I', COLLECTION_NAME);
  await setDoc(doc(db, COLLECTION_NAME, invoiceId), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return invoiceId;
}

export async function getInvoice(invoiceId: string) { ... }
export async function listInvoicesByUser(userId: string) { ... }
export async function listUnpaidInvoicesByUser(userId: string) { ... }
export async function markInvoiceAsPaid(invoiceId: string, paidAt: Timestamp) { ... }
```

`Invoice` typ dát do `types/invoice.ts` (stejně jako jiné typy v projektu).

---

## 3. UX / UI – menu a stránky

### 3.1 Levé menu – nový bod „Faktury“

V komponentě, která renderuje sidebar (pravděpodobně `components/Sidebar` nebo podobně – podle struktury projektu) přidat nový item:

- Ikona: např. `ReceiptLong` / `DocumentText` / `CurrencyDollar` podle použitých ikon v appce.
- Text: **„Faktury“**
- Route: `/invoices`

Struktura levého menu pak bude:

- Nezapočaté
- Probíhající
- Audity vše
- Zákazníci
- **Faktury**
- Nastavení

### 3.2 Routing

Přidat nové route do routeru (v `App.tsx` nebo místě, kde se definuje `react-router-dom`):

```tsx
<Route path="/invoices" element={<InvoicesPage />} />
<Route path="/invoices/:invoiceId" element={<InvoiceDetailPage />} />
```

---

## 4. InvoicesPage – seznam faktur

### 4.1 Layout

Vycházet z layoutu „Nezapočaté audity“ (viz screenshot):

- Nadpis: **Faktury**
- Podtitul: „Přehled vydaných faktur“
- Komponenta pro hledání (stejný styl jako vyhledávání auditů):
  - Placeholder: „Hledat podle zákazníka, čísla faktury, VS…“
- Pod tím **card/grid** se seznamem faktur (tabulka).

### 4.2 Filtry / záložky

Nahoře pod nadpis dát **taby**:

- `Nezaplacené` – default (status != 'paid' && status != 'cancelled')
- `Všechny` – všechny faktury

Technicky může jít o jednoduché tlačítka se `state`, nebo `Tabs` komponenta.

### 4.3 Tabulka faktur

Sloupce:

- Číslo faktury (invoiceNumber)
- Zákazník (customer.name)
- Provozovna (customer.premise_name – pokud je k dispozici z customers)
- Datum vystavení (createdAt)
- Splatnost (dueDate)
- Částka (totals.totalWithVat + currency)
- Stav (badge: `Nezaplacená`, `Zaplacená`, `Stornovaná`, `Draft`)
- Akce (např. ikonka oka → detail)

Jednotlivý řádek bude clickable (navigace do `/invoices/:invoiceId`).

Zápatí tabulky – stejné stránkování jako u auditů (20 / stránka, atd.) – může se reuse komponenta, která už existuje.

---

## 5. InvoiceDetailPage – detail dokladu

### 5.1 Layout

Struktura:

- Breadcrumb / odkaz „← Zpět na faktury“.
- Hlavní hlavička:

  - Levý blok:
    - Číslo faktury (velkým písmem)
    - Stav (badge)
    - Tlačítka:
      - „Stáhnout PDF“ (zatím může být disabled / TODO)
      - „Označit jako zaplacenou“ (pokud není `status === 'paid'`)
  - Pravý blok:
    - Zákazník (jméno, adresa)
    - Odkaz na audit (pokud `auditId` existuje) – kliknutím otevře detail auditu v novém tabu.

- Sekce „Dodavatel“ – snapshot údajů (jako na faktuře).  
- Sekce „Odběratel“ – údaje zákazníka.  
- Sekce „Fakturační údaje“:
  - datum vystavení, zdanitelné plnění, splatnost, VS, KS, způsob platby.
- Sekce „Položky“ – tabulka položek (stejný obsah jako bude v PDF).
- Sekce „Součty“ – blok podobný modrému bloku na vzorové faktuře:  
  - Základ 0 % / 10 % / 15 % / 21 % (podle reálné DPH)  
  - Celkem bez DPH, DPH, Celkem s DPH  
  - Celková částka velkým číslem (např. `9 908,00 EUR`).

### 5.2 Akce

- Tlačítko „Upravit“ – otevře **InvoiceEditForm** (stejná stránka nebo modál).  
- Tlačítko „Označit jako zaplacenou“ – vyvolá aktualizaci `status` → 'paid' + přidá `paidAt` (nové pole, pokud chceš – viz Firestore).  
- Tlačítko „Stornovat“ – nastaví `status` → 'cancelled' (volitelné, budoucí).

---

## 6. Vystavení faktury z auditu

### 6.1 UX v seznamu auditů

V kartě / řádku auditu (v „Probíhající“ nebo „Audity vše“) přidat:

- Pokud je audit **dokončený** a **nemá fakturu**:
  - zobrazit ikonu (např. 🧾) / button „Vystavit fakturu“.
- Pokud audit **už má fakturu**:
  - zobrazit text/odkaz „Faktura: {invoiceNumber}“ → kliknutí otevře `/invoices/{invoiceId}`.

Implementace:

- Do Firestore `audits` přidat volitelné pole `invoiceId?: string`.
- Při vytvoření faktury z auditu:
  - vyplnit `invoice.auditId = auditId`
  - zapsat `audits/{auditId}.invoiceId = newInvoiceId`.

### 6.2 Flow vytvoření faktury

Když uživatel klikne „Vystavit fakturu“ u dokončeného auditu:

1. Načíst audit (`/audits/{auditId}`) + navázaného zákazníka (`/customers/{customerId}`).  
2. Načíst fakturační nastavení (`billingSettings`).  
3. Otevřít **InvoiceCreatePage** / modál s předvyplněnými údaji:

   - Dodavatel (z billingSettings, readonly nebo editovatelné podle preferencí).
   - Odběratel (z `customers` – jméno, adresa, IČ/DIČ).  
   - Fakturační data:
     - datum vystavení = dnešní datum,
     - datum zdanitelného plnění = datum provedení auditu (`completedAt`),
     - splatnost = `createdAt + defaultDueDays`,
     - měna = default z settings (např. CZK),
     - VS + číslo faktury = vygenerované z `invoiceNumbering`.

   - Položky:
     - jedna defaultní položka:
       - název: „HACCP audit – {název provozovny}“,
       - quantity: 1,
       - unit: "ks",
       - unitPrice: ruční zadání (uživatel vyplní),
       - vatRate: 21 (případně 0, pokud budeš fakturovat bez DPH).

4. Uživatel může přidat další položky, upravit ceny, sazby DPH.  
5. Po uložení:
   - vytvořit dokument v `/invoices`,
   - aktualizovat `/audits/{auditId}.invoiceId`,
   - přesměrovat na `/invoices/{invoiceId}`.

---

## 7. Manuální vystavení faktury (bez auditu)

Na stránce „Faktury“ přidat vpravo nahoře tlačítko:

- „Nová faktura“

Flow:

1. Otevře **InvoiceCreatePage** s prázdným formulářem.
2. Uživatel vybere zákazníka:
   - buď z dropdownu existujících `/customers`,
   - nebo tlačítko „+ Nový zákazník“ (otevře create customer modál / redirect na Customers).
3. Ostatní kroky stejné jako při vystavení z auditu, jen `auditId` nebude vyplněno.

---

## 8. Fakturační formulář – komponenta `InvoiceForm`

### 8.1 Umístění

Do `components/invoices/InvoiceForm.tsx` (nová složka `components/invoices`).

### 8.2 Sekce formuláře

Rozděleno do cardů (stejný styl jako zbytek app):

1. **Základní informace**  
   - Číslo faktury (readonly, generované – s možností ručně přepsat)  
   - Datum vystavení  
   - Datum zdanitelného plnění  
   - Splatnost  
   - Měna (select: CZK / EUR)  
   - VS, KS  
   - Způsob platby

2. **Dodavatel** (read-only s možností tlačítka „Upravit v nastavení“ → odkaz do Settings).

3. **Odběratel**  
   - Select „Zákazník“ (název) – po vybrání předvyplní adresu, IČ, DIČ.  
   - Možnost ruční úpravy (např. inputy: jméno, ulice, město, PSČ, stát, IČO, DIČ).

4. **Položky**  
   - Tabulka:
     - Název položky
     - Popis (volitelné)
     - Množství
     - Jednotka
     - Cena za jednotku bez DPH
     - Sazba DPH (%)
     - Řádkový součet (bez/DPH/celkem)
   - Tlačítko „+ Přidat položku“  
   - Při změně hodnot přepočítat `totals` ve state.

5. **Souhrn**  
   - Přehled základu a DPH dle sazeb (0 / 10 / 15 / 21)  
   - Celkem bez DPH, DPH, Celkem s DPH  
   - Celková částka velkým číslem.

6. **Poznámky**  
   - Textarea „Poznámka na faktuře“ (např. „Zboží zůstává až do úplného uhrazení…“)  
   - Textarea „Poznámka v patičce“ (info o zápisu v OR apod.).

7. **Akce**  
   - Tlačítko „Uložit / vystavit fakturu“  
   - Tlačítko „Zrušit“

---

## 9. Design PDF (budoucí krok, ale ovlivňuje data)

Cíl je přiblížit se vzorové faktuře (iDoklad):

- Header:
  - vlevo logo + název „Invoice – tax document“ + číslo faktury,
  - vpravo čárový kód (volitelné do budoucna).
- Levý blok – dodavatel (Vitatrade s.r.o. styl).  
- Pravý blok – účet a zákazník.  
- Blok „Date of issue / maturity / taxable supply / symbol (VS, KS) / payment“.  
- Tabulka položek (název, množství, jednotka, cena, sazba DPH, bez DPH, DPH, celkem).  
- Dole souhrnná tabulka základů / DPH / celkem.  
- Velké **Total amount: X CZK/EUR**.  
- QR platba (do budoucna).  
- Patička s kontakty a textem o zápisu v OR.

Pro implementaci PDF lze použít:

- buď rozšířit stávající `generatePdf.ts`,  
- nebo vytvořit novou Cloud Function `generateInvoicePdf.ts`, která vezme `/invoices/{invoiceId}` + `billingSettings` a vygeneruje PDF do Storage (`/users/{userId}/invoices/{invoiceId}.pdf`).

Zatím v tomto kroku stačí:

- připravit datový model tak, aby obsahoval vše potřebné,
- v UI mít placeholder tlačítko „Stáhnout PDF (brzy)“.

---

## 10. Shrnutí úkolů pro implementaci (pro Cursor)

1. **Datový model a typy**
   - Vytvořit `types/invoice.ts` s rozhraním `Invoice` podle sekce 1.1.
   - Přidat `billingSettings` do Firestore (`settings` nebo nová kolekce) + typ.

2. **Firestore služby**
   - Nový modul `services/firestore/invoices.ts` s CRUD pro faktury.
   - Rozšířit `services/firestore/settings.ts` (pokud existuje) o načítání/uložení `billingSettings`.

3. **Sidebar + routing**
   - Přidat položku „Faktury“ do sidebaru.
   - Přidat route `/invoices` a `/invoices/:invoiceId`.

4. **Komponenty**
   - `components/invoices/InvoicesPage.tsx` – seznam faktur s tabem „Nezaplacené / Všechny“.
   - `components/invoices/InvoiceDetailPage.tsx` – detail faktury.
   - `components/invoices/InvoiceForm.tsx` – formulář pro vytvoření/úpravu faktury.
   - Případně `components/invoices/InvoiceListTable.tsx` jako samostatnou tabulku.

5. **Napojení na audity**
   - Do `audits` kolekce přidat pole `invoiceId?: string`.
   - V komponentě pro seznam/detaily auditů:
     - pokud audit dokončený a nemá `invoiceId` → zobrazit tlačítko „Vystavit fakturu“.
     - pokud má `invoiceId` → zobrazit odkaz na fakturu.
   - Implementovat flow pro vytvoření faktury z auditu (prefill dat).

6. **Napojení na zákazníky**
   - V `InvoiceForm` přidat select pro výběr zákazníka z `/customers`.
   - Při změně zákazníka předvyplnit adresu a IČ/DIČ.

7. **Stavy faktur**
   - Implementovat `status` (`draft`, `issued`, `paid`, `cancelled`).
   - Akce „Označit jako zaplacenou“ v detailu faktury.

8. **Design a UI konzistence**
   - Použít stejné barevné schéma, typografii a card layout jako u auditů.
   - Integrovat ikony odpovídající stylu app (např. z používané icon library).

Tento dokument může Cursor AI použít jako přesný návod k implementaci bez dalšího upřesnění.
