import { AuditStructure, HeaderData } from './types';

// Fix: Define a type for the raw structure to ensure type safety, especially for the HeaderField union type.
type RawAuditStructure = {
  audit_title: string;
  header_data: HeaderData;
  audit_sections: Array<{
    id: string;
    title: string;
    items: Array<{
      id: string;
      title: string;
      description: string;
    }>;
  }>;
};

const rawStructure: RawAuditStructure = {
  "audit_title": "VNITŘNÍ HYGIENICKÝ AUDIT POTRAVINÁŘSKÉHO PODNIKU",
  "header_data": {
    "audited_premise": {
      "title": "AUDITOVANÉ PRACOVIŠTĚ",
      "fields": [
        { "id": "premise_name", "label": "Provozovna", "type": "text" },
        { "id": "premise_address", "label": "Adresa", "type": "text" },
        { "id": "premise_responsible_person", "label": "Odpovědná osoba", "type": "text" },
        { "id": "premise_phone", "label": "Mobil", "type": "tel" },
        { "id": "premise_email", "label": "E-mail", "type": "email" }
      ]
    },
    "operator": {
      "title": "PROVOZOVATEL",
      "fields": [
        { "id": "operator_name", "label": "Název, obchodní firma", "type": "text" },
        { "id": "operator_address", "label": "Adresa sídla", "type": "text" },
        { "id": "operator_ico", "label": "IČO", "type": "text" },
        { "id": "operator_statutory_body", "label": "Statutární orgán", "type": "text" },
        { "id": "operator_phone", "label": "Mobil", "type": "tel" },
        { "id": "operator_email", "label": "E-mail", "type": "email" }
      ]
    },
    "auditor": {
      "title": "ZPRACOVATEL AUDITU",
      "fields": [
        { "id": "auditor_name", "label": "Auditor", "type": "text" },
        { "id": "auditor_phone", "label": "Mobil", "type": "tel" },
        { "id": "auditor_email", "label": "E-mail", "type": "email" },
        { "id": "auditor_web", "label": "Web", "type": "url" }
      ]
    },
    "audit_meta": {
      "fields": [
        { "id": "audit_date", "label": "Datum provedení", "type": "date" },
        { "id": "operator_representative", "label": "Za provozovatele", "type": "text" }
      ]
    }
  },
  "audit_sections": [
    {
      "id": "infrastructure",
      "title": "INFRASTRUKTURA (BUDOVY A ZAŘÍZENÍ)",
      "items": [
        { "id": "infra_layout", "title": "USPOŘÁDÁNÍ PROVOZU", "description": "Uspořádání, vnější úprava, konstrukce, poloha a velikost provozu umožňující uplatnění správné hygienické praxe včetně ochrany před kontaminací. Důsledné oddělení nečistých a čistých úseků prostorově nebo časově s dostatečnou kapacitou na provedení odpovídající sanitace v mezičase. Zajištění jednosměrného výrobního procesu, oddělení chlazených prostor a topných zařízení." },
        { "id": "infra_equipment", "title": "ZAŘÍZENÍ", "description": "Všechny předměty, instalace a zařízení přicházející do styku s potravinami jsou konstruovány a navrženy z takových materiálů, aby bylo vyloučeno riziko kontaminace a současně byly snadno čistitelné, popřípadě dezinfikovatelné." },
        { "id": "infra_water", "title": "PITNÁ VODA", "description": "Dostatečné zásobování pitnou vodou." },
        { "id": "infra_floors", "title": "PODLAHY", "description": "Snadno čistitelné, popřípadě dezinfikovatelné při použití odolných, nenasákavých omyvatelných a netoxických materiálů. Podle vhodnosti umožňují vyhovující odvod vody z povrchu." },
        { "id": "infra_walls", "title": "STĚNY", "description": "Snadno čistitelné, popřípadě dezinfikovatelné při použití odolných, nenasákavých omyvatelných a netoxických materiálů až do výšky odpovídající pracovním operacím." },
        { "id": "infra_ceilings", "title": "STROPY", "description": "Navrženy a opatřeny tak, aby se zabránilo hromadění nečistot, omezila se kondenzace, růst plísní a odlučování částeček." },
        { "id": "infra_windows", "title": "OKNA A JINÉ OTVORY", "description": "Konstruovány tak, aby se zabránilo hromadění nečistot. Okna a jiné otvory otvíratelné do venkovního prostředí jsou vybaveny sítěmi proti hmyzu, které lze při čištění lehce vyjmout." },
        { "id": "infra_doors", "title": "DVEŘE", "description": "Snadno čistitelné, popřípadě dezinfikovatelné při použití odolných, nenasákavých omyvatelných a netoxických materiálů." },
        { "id": "infra_surfaces", "title": "POVRCHY", "description": "Povrchy (včetně povrchů zařízení) v oblastech, kde se manipuluje s potravinami, a zejména povrchy přicházející do styku s potravinami jsou snadno čistitelné a dezinfikovatelné při použití hladkých, odolných, nenasákavých omyvatelných, korozivzdorných a netoxických materiálů." },
        { "id": "infra_sinks", "title": "UMÝVADLA", "description": "Dostatečný počet vhodně rozmístěných, označených, vybavených přívodem teplé a studené tekoucí pitné vody, vhodnými prostředky na mytí rukou, hygienickým osoušením a nášlapným odpadkovým košem. Hygienické papírové ručníky jsou vhodně uloženy v zásobnících; nejsou položeny na parapetu, na topení, na umývadle apod." },
        { "id": "infra_ventilation", "title": "VĚTRÁNÍ", "description": "Vhodné a dostatečné prostředky pro přirozené nebo nucené větrání. Snadný přístup k filtrům a ostatním součástem vyžadujícím čištění nebo výměnu. Zpracovaný Plán kontrol a čištění." },
        { "id": "infra_lighting", "title": "OSVĚTLENÍ", "description": "Dostatečné přirozené nebo umělé osvětlení. Ochrana před kontaminací potravin v případě rozbití osvětlení." },
        { "id": "infra_sewerage", "title": "KANALIZACE", "description": "Odpovídající požadovanému účelu s cílem zabránit riziku kontaminace." },
        { "id": "infra_changing_room", "title": "ŠATNA", "description": "Stavebně oddělená se snadno čistitelnou a dezinfikovatelnou podlahou, umožňující oddělené ukládání pracovního a civilního oděvu." },
        { "id": "infra_staff_wc", "title": "WC PRO ZAMĚSTNANCE", "description": "Záchodová předsíň je zřízena před místností se záchodem a je vybavena umývadlem s tekoucí teplou a studenou pitnou vodou, vhodnými prostředky na mytí rukou, hygienickým osoušením a nášlapným odpadkovým košem. Prostory jsou snadno čistitelné a dezinfikovatelné a nejsou přímo přístupné z prostor, kde probíhá manipulace s potravinami." },
        { "id": "infra_cleaning_room", "title": "ÚKLIDOVÁ MÍSTNOST", "description": "Konstruovaná z korozivzdorných materiálů, snadno čistitelná a omyvatelná s dostatečným přívodem teplé a studené pitné vody, vybavená výlevkou, háčky na zavěšení mopů a smetáků, vhodným prostorem pro uložení čistících a dezinfekčních přípravků a skladováním pracovního vybavení a nářadí. Dostatečně přirozeně nebo nuceně odvětraná. Omyvatelný obklad stěn je do minimální výšky 150 cm od podlahy." }
      ]
    },
    {
      "id": "storage_handling",
      "title": "SKLADOVÁNÍ, MANIPULACE S POTRAVINAMI",
      "items": [
        { "id": "storage_entry_control", "title": "VSTUPNÍ KONTROLA", "description": "Ověření dodavatelé. Kontrola přepravních automobilů. Při příjmu kontrola množství, celistvosti balení, doby použitelnosti, vizuální kontrola vzhledu, barvy, jakosti." },
        { "id": "storage_identifiability", "title": "IDENTIFIKOVATELNOST SUROVIN", "description": "Všechny suroviny a potraviny jsou po celou dobu označené/ identifikovatelné – původní etiketou výrobce nebo dle pokynů platné legislativy. Ke všem potravinám a surovinám je v provozovně k dispozici dokumentace (dodací listy apod.)." },
        { "id": "storage_storing", "title": "SKLADOVÁNÍ", "description": "Zajištění podmínek, které chrání před kontaminací a zabraňují kažení. Dodržování požadavků stanovených výrobci a platnými právními předpisy (teplota, vlhkost, doba spotřeby apod.). Prevence ovlivnění smyslových vlastností. Uzavřená balení." },
        { "id": "storage_cooling_eq", "title": "CHLADÍCÍ ZAŘÍZENÍ", "description": "Dostatečný počet. Čistota. Vhodná údržba. Monitoring teplot." },
        { "id": "storage_freezing_eq", "title": "MRAZÍCÍ ZAŘÍZENÍ", "description": "Dostatečný počet. Čistota. Vhodná údržba. Monitoring teplot." },
        { "id": "storage_dry_storage", "title": "SUCHÉ SKLADY", "description": "Odpovídající kapacita. Čistota, regulace škůdců. Monitoring teplot popřípadě vlhkosti." },
        { "id": "storage_defrosting", "title": "ROZMRAZOVÁNÍ", "description": "Minimalizace rizika růstu patogenních mikroorganismů nebo tvorby toxinů v potravinách." }
      ]
    },
    {
      "id": "gmp",
      "title": "SPRÁVNÁ VÝROBNÍ PRAXE",
      "items": [
        { "id": "gmp_process_monitoring", "title": "SLEDOVÁNÍ VÝROBNÍHO PROCESU", "description": "" },
        { "id": "gmp_cleanliness", "title": "ČISTOTA PROVOZU", "description": "Celý provoz je udržován v čistotě a v dobrém stavu." },
        { "id": "gmp_technical_equipment", "title": "TECHNICKÉ VYBAVENÍ", "description": "Odpovídající kapacitě provozovny." },
        { "id": "gmp_cross_contamination", "title": "KŘÍŽOVÁ KONTAMINACE", "description": "Na všech stupních výroby, zpracování a distribuce je zajištěna ochrana proti jakékoliv kontaminaci." },
        { "id": "gmp_distribution", "title": "UVÁDĚNÍ POTRAVIN DO OBĚHU", "description": "Zajištění teplotního řetězce. Informování spotřebitele." },
        { "id": "gmp_food_export", "title": "VÝVOZ STRAVY", "description": "Kontrola čistoty transportních obalů. Oddělené plnění (provozní nebo časové). Doklad pro odběratele. Čistota dopravního prostředku." },
        { "id": "gmp_allergens", "title": "ALERGENY", "description": "Je povinností provozovatele vyznačit u nebalených potravin na viditelném místě písemný výčet stanovených alergenů obsažený v nabízených pokrmech, pokud alergen není přímo v názvu potraviny nebo jídla. Zavedená opatření v co největší míře zabraňují či omezují křížovou kontaminaci." }
      ]
    },
    {
      "id": "hygiene_training",
      "title": "OSOBNÍ HYGIENA ZAMĚSTNANCŮ A ŠKOLENÍ",
      "items": [
        { "id": "hygiene_health_status", "title": "ZDRAVOTNÍ STAV", "description": "Zaměstnanci mají znalosti o svých povinnostech s ohledem na průjmová, horečnatá, hnisavá a jiná infekční onemocnění. Každý zaměstnanec, který manipuluje s nebalenými potravinami, je zdravotně způsobilý a má vystavený platný zdravotní průkaz." },
        { "id": "hygiene_personal_cleanliness", "title": "OSOBNÍ ČISTOTA", "description": "Zaměstnanci mají čistý pracovní oděv, pečují o své ruce, nehty, nenosí při práci šperky, ukládají si pracovní a občanský oděvu odděleně." },
        { "id": "hygiene_training", "title": "ŠKOLENÍ", "description": "Zaměstnavatel zajišťuje pravidelné proškolení všech zaměstnanců s ohledem na jejich pracovní náplň. Plán školení: při náboru nových zaměstnanců, stálí 1x ročně a při zjištění nedostatků." },
        { "id": "hygiene_behavior", "title": "CHOVÁNÍ PRACOVNÍKŮ", "description": "Zaměstnanci dodržují zásady správného hygienického chování v prostorách, kde se manipuluje s nebalenými potravinami." }
      ]
    },
    {
      "id": "cleaning_disinfection",
      "title": "ČIŠTĚNÍ A DEZINFEKCE / PROVOZNÍ HYGIENA",
      "items": [
        { "id": "cleaning_sanitation_plan", "title": "SANITAČNÍ ŘÁD", "description": "Je sestaven trvalý písemný rozpis čistících a dezinfekčních postupů včetně používaných dezinfekčních přípravků a jejich technických údajů, aby bylo zajištěno, že veškeré prostory budou řádně čištěny a že kritickým oblastem, zařízením a materiálům bude věnována zvláštní pozornost." },
        { "id": "cleaning_products", "title": "PŘÍPRAVKY", "description": "Pracovníci jsou proškoleni o dezinfekčních postupech a přípravcích a dodržují pokyny výrobce. Střídají se dezinfekce s různými aktivními látkami jako prevence vzniku rezistence. Při manipulaci s chemickými látkami jsou používány aplikační pomůcky a ochranné pracovní pomůcky. Přípravky jsou vhodné do potravinářství. K dispozici bezpečnostní listy a technické údaje – např. účinná látka, doporučená doba působení, koncentrace, teplota vody, skladování." },
        { "id": "cleaning_conditions", "title": "PODMÍNKY PRO SANITACI", "description": "V provozních místnostech nejsou překážky bránící řádnému čištění (uložené přepravky na podlaze, nevhodné umístění zařizovacích předmětů, skladování čistících a dezinfekčních přípravků na podlaze apod.)." },
        { "id": "cleaning_maintenance", "title": "PRAVIDELNÁ ÚDRŽBA", "description": "Podle potřeby jsou řádně čištěny stroje a zařízení včetně „mrtvých prostor“. Provádí se kontrola povrchů a pravidelná údržba." },
        { "id": "cleaning_discarded_items", "title": "VYŘAZENÉ PŘEDMĚTY", "description": "Staré nepotřebné a vyřazené předměty a zařízení se v co nejkratší době odstraňují pryč z provozovny, případně se ihned likvidují." },
        { "id": "cleaning_laundry", "title": "NAKLÁDÁNÍ S PRÁDLEM", "description": "Prádelna musí být rozdělena stavebně nebo funkčně na „nečistou“ (špinavou) a „čistou“ část. V místnostech pro praní a skladování použitého prádla musí být podlaha a stěny do výše minimálně 150 cm omyvatelné a dezinfikovatelné. Použité prádlo se ukládá do obalů, které zabraňují kontaminaci okolí nečistotami z tohoto prádla. Používají se obaly vhodné k praní nebo omyvatelné a dezinfikovatelné nebo na jedno použití. Použité prádlo v obalech se skladuje ve vyčleněném větratelném prostoru. Sušení prádla probíhá v prostorách k tomu určených mimo hygienická zařízení (WC, předsíňka, sprcha, šatna, úklidová místnost) a prostory kde je manipulováno s potravinami. Utěrky se nesuší na topení apod. Čisté prádlo se skladuje v uzavíratelných pravidelně dezinfikovaných skříních." },
        { "id": "cleaning_waste", "title": "NAKLÁDÁNÍ S ODPADY", "description": "Potravinářské odpady, nepoživatelné vedlejší produkty - zbytky pokrmů a jiný odpad - plasty, sklo, papír (dále jen „odpady“) jsou odstraňovány z prostor, kde se nacházejí potraviny co nejrychleji, aby nedocházelo k jejich hromadění. Odpady se ukládají do označených uzavíratelných nádob, které jsou udržovány v čistotě a bezvadném technickém stavu a jsou snadno čistitelné a dezinfikovatelné. Odpadní kontejnery se uchovávají v uzavřeném dobře větratelném snadno čistitelném a dezinfikovatelném vyhrazeném prostoru odděleně od skladů potravin při co nejnižší teplotě chráněné před hmyzem a hlodavci." }
      ]
    },
    {
      "id": "haccp",
      "title": "SYSTÉM HACCP",
      "items": [
        { "id": "haccp_system", "title": "HACCP", "description": "Jsou vypracovány a uplatňovány postupy založené na principech HACCP." },
        { "id": "haccp_documentation", "title": "DOKUMENTACE", "description": "Dokumenty a záznamy jsou řádně vedeny a uchovávány po nezbytnou dobu." }
      ]
    }
  ]
};

// Add 'active: true' to all sections and items by default
const enrichedStructure: AuditStructure = {
  ...rawStructure,
  audit_sections: rawStructure.audit_sections.map(section => ({
    ...section,
    active: true,
    items: section.items.map(item => ({
      ...item,
      active: true,
    })),
  })),
};


export const DEFAULT_AUDIT_STRUCTURE: AuditStructure = enrichedStructure;