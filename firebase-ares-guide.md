# Integrace ARES do React + Firebase (Cloud Functions) – kompletní návod (MD)

> Cíl: Po zadání **IČO (8 číslic)** do formuláře v React aplikaci načíst **úplné detaily firmy/živnostníka** z **ARES** a bezpečně je vrátit klientovi přes **Firebase Cloud Function**. ARES služby jsou **veřejné (zdarma)**, ale platí provozní podmínky a limity dotazů – proto voláme ARES **ze serveru** (Functions), ne přímo z prohlížeče.

---

## 1) Rychlá orientace v ARES

- **Swagger UI (dokumentace + “Try it”)**: `https://ares.gov.cz/swagger-ui/`
- **Základní REST adresa**: `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/`
  - `GET` slouží k vyhledání **detailu subjektu** (např. dle IČO).
  - `POST` slouží k **vyhledávání seznamu** subjektů podle filtrů (paginace přes `start`, `pocet`).
- **Rychlé prohlížečové vyhledání** (uživatelská stránka, ne API):
  - `https://ares.gov.cz/ekonomicke-subjekty?ico=<IČO>` – vhodné na manuální ověření.
- **Provozní podmínky a limity**: ARES je zdarma, ale má **limity počtu dotazů** a pravidla používání – proto implementujte cache, throttling a volání pouze ze serveru.

---

## 2) Architektura řešení

1. **React (client)** – jednoduchý formulář pro zadání IČO → volá **vlastní HTTPS endpoint** ve Firebase (`/getCompanyByIco`).
2. **Firebase Cloud Functions (server)** – přijme IČO, **zvaliduje** jej (regex `^\d{8}$`), zavolá **ARES REST API**, odpověď **normalizuje** (JSON), **volitelně uloží** do **Firestore** (cache s TTL), a vrátí JSON klientovi.
3. **(Volitelné)**: Firestore/Redis cache, rate-limit, retry/backoff, logging.

**Proč ne volat ARES z prohlížeče přímo?** Kvůli CORS, kontrole limitů a bezpečnosti. (A také pro možnost cachovat a sjednotit formát odpovědi.)

---

## 3) Datové zdroje ARES – co budete potřebovat

- **Ekonomické subjekty (jádro ARES)** – hlavní služba pro identifikaci, název, adresy, status, právní formu atd. (alias `ekonomicke-subjekty`).
- Dle potřeby lze čerpat i ze zdrojů **VR (obchodní rejstřík), RŽP (živnosti), ROS** atd.

> V tomto návodu používáme **jádro ARES** (ekonomické subjekty) a **dotaz podle IČO** přes REST `GET`. Základ: `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/…` + konkrétní endpoint z dokumentace.

---

## 4) Konvence a požadavky (aby to další AI pochopilo)

- **Vstup**: `ico` – řetězec přesně **8 číslic** (např. `27074358`).
- **Validace**: pokud `ico` neodpovídá regexu `^\d{8}$`, vrať `400` + JSON `{ error: "Nevalidní IČO" }`.
- **Volání ARES**: REST `GET` na **základní REST** adresu dle dokumentace (viz níže kód), **Accept: application/json**.
- **Výstup**: sjednocený JSON objekt:
  ```json
  {
    "ico": "27074358",
    "name": "Název subjektu",
    "address": {
      "street": "Ulice 1",
      "city": "Praha",
      "zip": "11000",
      "country": "CZ"
    },
    "legalForm": "s.r.o.",
    "active": true,
    "raw": { ...původní odpověď ARES... }
  }
  ```
- **Cache**: pokud je v cache validní záznam (např. časové razítko < 7 dní), vrať cache. Jinak dotaz na ARES, ulož do cache s TTL.
- **Rate-limit**: chránit endpoint (např. 10 req/min/IP).
- **Chyby**: přemapovat HTTP kódy ARES na lidsky srozumitelný text.

---

## 5) Implementace – Firebase Functions (Node.js 18+)

### 5.1 Struktura projektu

```
functions/
  package.json
  index.js
  .env
```

### 5.2 `functions/package.json`

```json
{
  "name": "functions",
  "engines": { "node": "18" },
  "main": "index.js",
  "type": "commonjs",
  "dependencies": {
    "firebase-functions": "^4.5.0",
    "firebase-admin": "^12.0.0",
    "node-fetch": "^2.7.0"
  }
}
```

### 5.3 `functions/index.js`

```js
const functions = require("firebase-functions");
const fetch = require("node-fetch");

const ARES_BASE_URL =
  process.env.ARES_BASE_URL ||
  (functions.config().ares && functions.config().ares.base_url) ||
  "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest";

exports.getCompanyByIco = functions.https.onRequest(async (req, res) => {
  try {
    const ico = req.method === "GET" ? req.query.ico : req.body?.ico;
    if (!/^\d{8}$/.test(ico)) {
      return res.status(400).json({ error: "Nevalidní IČO (8 číslic)." });
    }

    const url = `${ARES_BASE_URL}/ekonomicke-subjekty?ico=${encodeURIComponent(ico)}`;
    const response = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!response.ok) {
      return res.status(response.status).json({ error: "Chyba při volání ARES" });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
});
```

---

## 6) React – jednoduché volání

```jsx
export async function fetchCompanyByIco(ico) {
  if (!/^\d{8}$/.test(ico)) throw new Error("IČO musí mít 8 číslic.");
  const resp = await fetch(`/__/functions/getCompanyByIco?ico=${ico}`);
  if (!resp.ok) throw new Error("Chyba při volání backendu");
  return await resp.json();
}
```

---

## 7) Deploy

```bash
firebase deploy --only functions
```

- Endpoint: `https://us-central1-<TVŮJ_PROJECT_ID>.cloudfunctions.net/getCompanyByIco`
