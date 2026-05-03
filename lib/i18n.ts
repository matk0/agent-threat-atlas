export type Locale = "en" | "sk";

export const locale: Locale = process.env.SITE_LOCALE === "sk" ? "sk" : "en";

export const locales = {
  en: {
    domain: "atlas.matejlukasik.com",
    htmlLang: "en",
    dateLocale: "en-US",
  },
  sk: {
    domain: "atlas.matejlukasik.sk",
    htmlLang: "sk",
    dateLocale: "sk-SK",
  },
} as const satisfies Record<
  Locale,
  { domain: string; htmlLang: string; dateLocale: string }
>;

export const ui = {
  en: {
    skipToContent: "Skip to content",
    nav: {
      primary: "Primary",
      liveAtlas: "Live Atlas",
      threatCategories: "Threat Categories",
      contact: "Contact",
    },
    site: {
      tagline:
        "Daily agentic AI incidents mapped to threat categories and prevention guidance.",
      description:
        "Agent Threat Atlas tracks public agentic AI security incidents, maps them to threat categories, and keeps practical prevention guidance for teams deploying AI agents.",
      consultantRole: "Agentic AI Security Consultant",
      consultantPitch:
        "I help engineering teams design, audit, and harden production agent systems before they get into trouble.",
    },
    home: {
      title: "Live Atlas",
      description:
        "A daily-updated atlas of agentic AI incidents mapped to threat categories and prevention guidance.",
      eyebrow: "Agent Threat Atlas · updated daily",
      heading: "Live atlas of agentic AI incidents.",
      intro:
        "Public incidents, mapped to threat categories and practical prevention principles for teams deploying AI agents.",
      incidents: "Incidents",
      categories: "Categories",
      daysSinceLastIncident: "Days since last incident",
      notAvailable: "n/a",
    },
    incidents: {
      search: "Search",
      searchPlaceholder: "Vendor, source, keyword",
      severity: "Severity",
      all: "All",
      threatCategory: "Threat category",
      allCategories: "All categories",
      showing: "Showing",
      of: "of",
      threatCategories: "Threat categories",
      noMatches: "No incidents match these filters.",
      prevention: "Prevention:",
      source: "Source",
    },
    threats: {
      indexTitle: "Threat catalog",
      indexDescription:
        "Agentic AI threat categories with practical controls and related incidents.",
      eyebrow: "The catalog",
      heading: "Threat categories and controls.",
      intro:
        "Each category links real incidents to practical ways to reduce exposure.",
      threat: "Threat",
      severity: "Severity",
      recentIncidents: "Recent incidents",
      frameworks: "Frameworks",
      refs: "refs",
      back: "Threat categories",
      linkedIncidents: "linked incidents",
      whatItIs: "What it is",
      howAttacksHappen: "How attacks happen",
      howToPrevent: "How to prevent it",
      bestPractices: "Best practices",
      knownExamples: "Known examples",
      frameworkMapping: "Framework mapping",
      relatedIncidents: "Related incidents",
      categorySnapshot: "Category snapshot",
      affectedSurfaces: "Affected surfaces",
      implementationFocus: "Implementation focus",
    },
    playbooks: {
      title: "Playbooks",
      description:
        "Actionable, copy-and-adapt playbooks for designing, evaluating, and operating secure AI agents.",
      heading: "Hands-on guides for the team that ships.",
      intro:
        "Each playbook is a structured checklist you can drop into a Notion doc, RFC, or runbook tomorrow. Built around the threats in the catalog and the failure modes from the incident feed.",
      open: "Open the playbook",
      back: "Playbooks",
      mapsToThreats: "Maps to threats",
      helpTitle: "Need help applying this?",
      helpBody:
        "We run two-week engagements that turn playbooks like this into shipped controls — code, configs, and dashboards your team can own.",
      bookCall: "Book an intro call",
    },
    surfaces: {
      title: "Attack surfaces",
      description:
        "A component-by-component view of the agentic AI attack surface, from the model to the output handler.",
      heading: "Where agents get attacked.",
      intro:
        "Threats don’t live in the abstract — they live in components. This is the reverse view of the catalog: walk the agent stack and see, for each surface, what attackers target and what controls close it down.",
      referenceArchitecture: "Reference architecture",
      diagramIntro:
        "A typical agent passes data across nine surfaces. Every arrow is a trust boundary. Click any node to jump to its detail.",
      trustBoundaries:
        "Trust boundaries: every input from a less-trusted layer must be treated as adversarial. The two most-violated boundaries are Retrieval → Model and Tools → Model.",
      surface: "Surface",
      applicableThreats: "Applicable threats",
      controls: "Controls",
      layers: {
        user: "User / Caller",
        identity: "Identity & Authz",
        orchestrator: "Orchestrator / Planner",
        llm: "Model",
        memory: "Memory",
        retrieval: "Retrieval / RAG",
        tools: "Tools / MCP",
        output: "Output Handler",
        world: "External world",
      },
    },
    resources: {
      title: "Resources",
      description:
        "Curated external resources for agentic AI security: standards, papers, and recurring sources we monitor.",
      eyebrow: "Resources",
      heading: "A short, opinionated reading list.",
      intro:
        "We’d rather link you to ten things that matter than fifty that don’t. Below: the standards we map to, the research that’s shaping the field, and the sources our daily incident feed monitors.",
    },
    about: {
      title: "About",
      description:
        "What Agent Threat Atlas is, who maintains it, and how to use it.",
      eyebrow: "About",
      heading: "A working reference, kept current.",
      whatTitle: "What this site is",
      whatBody:
        "Agent Threat Atlas is a public, evolving reference for engineering and security teams adopting agentic AI. Three things, in one place: a catalog of the threats specific to agentic systems, a daily feed of real incidents from the field, and the controls that would have prevented each one. Every incident links to the threat category that explains it and to a playbook for closing the gap.",
      whyBody:
        "The Atlas exists because most agent breaches trace to a small set of well-understood failures — prompt injection, over-scoped tools, unsafe output handling, weak identity. Calling them out by name makes them addressable. The site is intentionally boring: no exhortation, no countdown timers, no sales theater. Just the catalog, the incidents, and the controls.",
      useTitle: "How to use it",
      usePrefix: "If you’re evaluating an agent feature or vendor, start at the",
      useMiddle:
        "and skim the categories that apply. If you’re hardening a live system, the",
      useSuffix:
        "are checklist-shaped and copy-paste-friendly. The",
      useEnd:
        "is worth scanning weekly — it’s how you keep your mental model current as the field moves.",
      builtTitle: "How it’s built",
      builtBody:
        "The threat catalog and playbooks are hand-written. The incident feed is automated: a daily scraper polls roughly seventy sources — CVE feeds, vendor advisories, regulators, security research blogs, trade press — and an LLM categorizer applies a strict “confirmed incidents only” filter before anything reaches the site.",
      openSourceOn: "Open source on",
      builtMapping:
        "Mapping is to OWASP LLM Top 10, NIST AI RMF, MITRE ATLAS, ISO/IEC 42001, and the EU AI Act.",
      request: "request",
      maintainerTitle: "Who maintains it",
      maintainerBody: "The Atlas is maintained by",
      maintainerSuffix:
        "If you’d like to talk about a specific agent system, the consultancy is the right door.",
      missing:
        "Spotted an incident or category that’s missing? An incorrect mitigation? A source we should be polling? Email",
      threatCategories: "Threat categories",
      incidentsIndexed: "Incidents indexed",
      playbooks: "Playbooks",
      builtBy: "Built by",
      visit: "Visit",
    },
    contact: {
      redirecting: "Redirecting to",
    },
    cta: {
      title: "About this entry",
      prefix: "The Atlas is maintained by",
      suffix:
        "as an open reference. If your team is wrestling with a specific version of this problem, get in touch.",
      contact: "Contact Matej",
    },
    severity: {
      critical: "Critical",
      high: "High",
      medium: "Medium",
      low: "Low",
    },
  },
  sk: {
    skipToContent: "Preskočiť na obsah",
    nav: {
      primary: "Hlavná navigácia",
      liveAtlas: "Živý atlas",
      threatCategories: "Kategórie hrozieb",
      contact: "Kontakt",
    },
    site: {
      tagline:
        "Denné incidenty agentickej AI mapované na kategórie hrozieb a preventívne odporúčania.",
      description:
        "Agent Threat Atlas sleduje verejné bezpečnostné incidenty agentickej AI, mapuje ich na kategórie hrozieb a udržiava praktické odporúčania pre tímy nasadzujúce AI agentov.",
      consultantRole: "Konzultant pre bezpečnosť agentickej AI",
      consultantPitch:
        "Pomáham inžinierskym tímom navrhovať, auditovať a posilňovať produkčné agentické systémy skôr, než spôsobia problém.",
    },
    home: {
      title: "Živý atlas",
      description:
        "Denne aktualizovaný atlas incidentov agentickej AI mapovaných na kategórie hrozieb a preventívne odporúčania.",
      eyebrow: "Agent Threat Atlas · denne aktualizované",
      heading: "Živý atlas bezpečnostných incidentov agentickej AI",
      intro:
        "Verejné incidenty mapované na kategórie hrozieb a praktické preventívne princípy pre tímy nasadzujúce AI agentov.",
      incidents: "Incidenty",
      categories: "Kategórie",
      daysSinceLastIncident: "Dní od posledného incidentu",
      notAvailable: "n/a",
    },
    incidents: {
      search: "Hľadať",
      searchPlaceholder: "Dodávateľ, zdroj, kľúčové slovo",
      severity: "Závažnosť",
      all: "Všetko",
      threatCategory: "Kategória hrozby",
      allCategories: "Všetky kategórie",
      showing: "Zobrazuje sa",
      of: "z",
      threatCategories: "Kategórie hrozieb",
      noMatches: "Týmto filtrom nezodpovedajú žiadne incidenty.",
      prevention: "Prevencia:",
      source: "Zdroj",
    },
    threats: {
      indexTitle: "Katalóg hrozieb",
      indexDescription:
        "Kategórie hrozieb agentickej AI s praktickými kontrolami a súvisiacimi incidentmi.",
      eyebrow: "Katalóg",
      heading: "Kategórie hrozieb a kontroly.",
      intro:
        "Každá kategória prepája reálne incidenty s praktickými spôsobmi zníženia rizika.",
      threat: "Hrozba",
      severity: "Závažnosť",
      recentIncidents: "Nedávne incidenty",
      frameworks: "Rámce",
      refs: "odkazov",
      back: "Kategórie hrozieb",
      linkedIncidents: "prepojených incidentov",
      whatItIs: "Čo to je",
      howAttacksHappen: "Ako útoky vznikajú",
      howToPrevent: "Ako tomu predchádzať",
      bestPractices: "Najlepšie postupy",
      knownExamples: "Známe príklady",
      frameworkMapping: "Mapovanie na rámce",
      relatedIncidents: "Súvisiace incidenty",
      categorySnapshot: "Prehľad kategórie",
      affectedSurfaces: "Zasiahnuté plochy",
      implementationFocus: "Implementačné zameranie",
    },
    playbooks: {
      title: "Playbooky",
      description:
        "Akčné playbooky na kopírovanie a úpravu pri návrhu, hodnotení a prevádzke bezpečných AI agentov.",
      heading: "Praktické návody pre tím, ktorý dodáva.",
      intro:
        "Každý playbook je štruktúrovaný checklist použiteľný v Notione, RFC alebo runbooku už zajtra. Vychádza z hrozieb v katalógu a zlyhaní z incidentového feedu.",
      open: "Otvoriť playbook",
      back: "Playbooky",
      mapsToThreats: "Mapuje sa na hrozby",
      helpTitle: "Potrebujete pomôcť s aplikovaním?",
      helpBody:
        "Robíme dvojtýždňové engagementy, ktoré menia takéto playbooky na dodané kontroly — kód, konfigurácie a dashboardy, ktoré môže vlastniť váš tím.",
      bookCall: "Rezervovať úvodný hovor",
    },
    surfaces: {
      title: "Útočné plochy",
      description:
        "Komponentový pohľad na útočnú plochu agentickej AI od modelu po výstupný handler.",
      heading: "Kde sú agenti napádaní.",
      intro:
        "Hrozby nežijú v abstrakte — žijú v komponentoch. Toto je opačný pohľad na katalóg: prejdite stack agenta a pri každej ploche uvidíte, čo útočníci cielia a ktoré kontroly to zatvárajú.",
      referenceArchitecture: "Referenčná architektúra",
      diagramIntro:
        "Typický agent prenáša dáta cez deväť plôch. Každá šípka je hranica dôvery. Kliknutím na uzol prejdete na detail.",
      trustBoundaries:
        "Hranice dôvery: každý vstup z menej dôveryhodnej vrstvy treba považovať za útočný. Dve najčastejšie porušované hranice sú Retrieval → Model a Tools → Model.",
      surface: "Plocha",
      applicableThreats: "Relevantné hrozby",
      controls: "Kontroly",
      layers: {
        user: "Používateľ / volajúci",
        identity: "Identita a autorizácia",
        orchestrator: "Orchestrátor / plánovač",
        llm: "Model",
        memory: "Pamäť",
        retrieval: "Retrieval / RAG",
        tools: "Nástroje / MCP",
        output: "Výstupný handler",
        world: "Externý svet",
      },
    },
    resources: {
      title: "Zdroje",
      description:
        "Kurátorsky vybrané externé zdroje k bezpečnosti agentickej AI: štandardy, články a pravidelne monitorované zdroje.",
      eyebrow: "Zdroje",
      heading: "Krátky, názorový zoznam čítania.",
      intro:
        "Radšej odkážeme na desať vecí, na ktorých záleží, než na päťdesiat, na ktorých nezáleží. Nižšie sú štandardy, na ktoré mapujeme, výskum formujúci oblasť a zdroje monitorované denným incidentovým feedom.",
    },
    about: {
      title: "O projekte",
      description:
        "Čo je Agent Threat Atlas, kto ho udržiava a ako ho používať.",
      eyebrow: "O projekte",
      heading: "Pracovná referencia, udržiavaná aktuálna.",
      whatTitle: "Čo táto stránka je",
      whatBody:
        "Agent Threat Atlas je verejná, priebežne sa vyvíjajúca referencia pre inžinierske a bezpečnostné tímy, ktoré zavádzajú agentickú AI. Na jednom mieste spája katalóg hrozieb špecifických pre agentické systémy, denný feed reálnych incidentov a kontroly, ktoré by im zabránili. Každý incident odkazuje na kategóriu hrozby, ktorá ho vysvetľuje, a na playbook na uzavretie medzery.",
      whyBody:
        "Atlas existuje preto, že väčšina prienikov cez agentov sa vracia k malej množine dobre pochopených zlyhaní — prompt injection, príliš široké nástroje, nebezpečné spracovanie výstupu, slabá identita. Keď ich pomenujeme, dajú sa riešiť. Stránka je zámerne vecná: žiadne výzvy, odpočítavania ani predajné divadlo. Len katalóg, incidenty a kontroly.",
      useTitle: "Ako ho používať",
      usePrefix: "Ak hodnotíte agentickú funkciu alebo dodávateľa, začnite v",
      useMiddle:
        "a prejdite si relevantné kategórie. Ak posilňujete živý systém,",
      useSuffix:
        "majú tvar checklistov a dajú sa ľahko kopírovať. ",
      useEnd:
        "sa oplatí prejsť každý týždeň — tak si udržíte aktuálny mentálny model, kým sa oblasť hýbe.",
      builtTitle: "Ako je postavený",
      builtBody:
        "Katalóg hrozieb a playbooky sú písané ručne. Incidentový feed je automatizovaný: denný scraper prechádza približne sedemdesiat zdrojov — CVE feedy, bezpečnostné oznámenia dodávateľov, regulátorov, bezpečnostné blogy a odborné médiá — a LLM kategorizátor používa prísny filter „iba potvrdené incidenty“ predtým, než sa čokoľvek dostane na stránku.",
      openSourceOn: "Open source na",
      builtMapping:
        "Mapovanie je na OWASP LLM Top 10, NIST AI RMF, MITRE ATLAS, ISO/IEC 42001 a EU AI Act.",
      request: "vyžiadanie",
      maintainerTitle: "Kto ho udržiava",
      maintainerBody: "Atlas udržiava",
      maintainerSuffix:
        "Ak sa chcete rozprávať o konkrétnom agentickom systéme, konzulting je správne miesto.",
      missing:
        "Našli ste chýbajúci incident alebo kategóriu? Nesprávnu mitigáciu? Zdroj, ktorý by sme mali monitorovať? Napíšte na",
      threatCategories: "Kategórie hrozieb",
      incidentsIndexed: "Indexované incidenty",
      playbooks: "Playbooky",
      builtBy: "Postavené",
      visit: "Navštíviť",
    },
    contact: {
      redirecting: "Presmerovanie na",
    },
    cta: {
      title: "O tejto položke",
      prefix: "Atlas udržiava",
      suffix:
        "ako otvorenú referenciu. Ak váš tím rieši konkrétnu verziu tohto problému, ozvite sa.",
      contact: "Kontaktovať Mateja",
    },
    severity: {
      critical: "Kritická",
      high: "Vysoká",
      medium: "Stredná",
      low: "Nízka",
    },
  },
} as const satisfies Record<Locale, Record<string, unknown>>;

export const config = locales[locale];
export const messages = ui[locale];
