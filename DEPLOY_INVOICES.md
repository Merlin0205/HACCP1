# Deploy fakturačního modulu na Firebase

Před testováním fakturačního modulu je potřeba nasadit následující změny na Firebase:

## 1. Firestore Security Rules

Deploy aktualizovaných security rules pro kolekce `invoices` a `billingSettings`:

```bash
firebase deploy --only firestore:rules
```

## 2. Firestore Indexes

Deploy nových indexů pro kolekci `invoices` (pro rychlejší dotazy):

```bash
firebase deploy --only firestore:indexes
```

**POZNÁMKA:** Indexy se vytvářejí asynchronně a mohou trvat několik minut. Můžete sledovat stav v Firebase Console.

## 3. Frontend (Hosting)

Deploy nových komponent a změn v kódu:

```bash
npm run build
firebase deploy --only hosting
```

## Kompletní deploy všeho najednou

Pokud chcete nasadit všechno najednou:

```bash
npm run build
firebase deploy
```

## Co bylo změněno:

### Firestore Rules (`firestore.rules`):
- Přidána pravidla pro kolekci `invoices` (čtení/zápis podle userId)
- Přidána pravidla pro kolekci `billingSettings` (vlastník může číst/zapisovat)

### Firestore Indexes (`firestore.indexes.json`):
- Index pro `invoices` kolekci: `userId + createdAt DESC`
- Index pro `invoices` kolekci: `userId + status + createdAt DESC`

### Frontend:
- Nové komponenty v `components/invoices/`
- Nové typy v `types/invoice.ts`
- Nové služby v `services/firestore/invoices.ts` a `billingSettings.ts`
- Aktualizace `App.tsx`, `Layout.tsx`, `AllAuditsScreen.tsx`

## Po deployi:

1. **Zkontrolujte Firestore Console** - měly by se zobrazit nové kolekce `invoices` a `billingSettings`
2. **Zkontrolujte indexy** - v Firestore Console → Indexes by měly být vidět nové indexy pro invoices
3. **Nastavte billing settings** - před vytvořením první faktury je potřeba nastavit fakturační údaje dodavatele (bude dostupné v Settings nebo přes API)

## Důležité:

- Indexy se vytvářejí asynchronně - může to trvat několik minut
- Pokud se indexy ještě nevytvořily, dotazy mohou být pomalejší nebo mohou vyhodit chybu
- Security rules se aplikují okamžitě po deployi


