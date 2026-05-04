import type { ToolCategorySlug, ToolSlug } from '@/lib/tool-pages';

export type ToolCategoryLanding = {
  slug: ToolCategorySlug;
  eyebrow: string;
  metadataTitle: string;
  metadataDescription: string;
  detailHeadline: string;
  intro: string[];
  topToolsTitle: string;
  topToolsDescription: string;
  primaryToolSlugs: ToolSlug[];
  groupsTitle: string;
  groupsDescription: string;
  groups: Array<{
    title: string;
    description: string;
    toolSlugs: ToolSlug[];
  }>;
  workflowsTitle: string;
  workflowsDescription: string;
  workflows: Array<{
    title: string;
    description: string;
    toolSlugs: ToolSlug[];
  }>;
  decisionTitle: string;
  decisionDescription: string;
  crawlDecision: Array<{
    label: string;
    bestFor: string;
    costLogic: string;
    examples: string[];
  }>;
  faqTitle: string;
  faqDescription: string;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
};

const CATEGORY_LANDINGS: Partial<Record<ToolCategorySlug, ToolCategoryLanding>> = {
  seo: {
    slug: 'seo',
    eyebrow: 'SEO Tool Suite',
    metadataTitle: 'SEO Tools kostenlos: Onpage, Technik, Keywords & Backlinks',
    metadataDescription:
      'Kostenlose SEO Tools für einzelne Checks, technische Audits, Keywords, Sitemaps, Robots.txt, Canonicals, interne Links und Backlinks.',
    detailHeadline: 'SEO Checks, Audits und Providerdaten sauber getrennt',
    intro: [
      'Die SEO Tools sind bewusst modular aufgebaut. Du kannst eine einzelne URL, eine Datei oder ein Keyword prüfen, ohne sofort einen kompletten Website-Crawl zu starten.',
      'Für größere Probleme führt dieselbe Struktur in den Full Audit: technische Crawls, interne Verlinkung, Duplicate Content, Broken Links, Reports und Monitoring bleiben verbunden, verbrauchen aber nur dann Crawl-Budget, wenn der Nutzer es wirklich braucht.',
    ],
    topToolsTitle: 'Beliebte SEO Tools',
    topToolsDescription:
      'Diese Einstiege beantworten konkrete Suchintents und führen nur bei Bedarf in den größeren Audit.',
    primaryToolSlugs: [
      'seo-checker',
      'on-page-seo-checker',
      'keyword-checker',
      'robots-txt-checker',
      'sitemap-checker',
      'canonical-checker',
    ],
    groupsTitle: 'SEO Aufgaben nach Suchintent',
    groupsDescription:
      'Jede Gruppe bündelt eigene Unterseiten. Das stärkt interne Verlinkung und verhindert, dass ein kleiner Check unnötig einen Full Crawl startet.',
    groups: [
      {
        title: 'Onpage SEO und Snippets',
        description:
          'Prüfe die wichtigsten Signale einer einzelnen Seite: Title, Description, H1, Canonical, Indexierbarkeit und sichtbare Textbasis.',
        toolSlugs: ['seo-checker', 'on-page-seo-checker', 'meta-title-checker', 'serp-preview-tool'],
      },
      {
        title: 'Technik und Indexierung',
        description:
          'Kontrolliere Crawler-Zugriff, Sitemaps, Canonicals und technische Signale getrennt, bevor ein großer Crawl nötig ist.',
        toolSlugs: ['robots-txt-checker', 'sitemap-checker', 'canonical-checker', 'indexability-checker'],
      },
      {
        title: 'Keywords und Chancen',
        description:
          'Bewerte Suchintention und Keyword-Ideen schnell lokal; Wettbewerbs- und Gap-Daten bleiben als Provider-Strecke vorbereitet.',
        toolSlugs: ['keyword-checker', 'keyword-gap-checker', 'structured-data-checker'],
      },
      {
        title: 'Links, Autorität und Crawl-Probleme',
        description:
          'Interne Links, Broken Links, Duplicate Content und Backlink-Daten sind eigene Strecken, damit große Crawls und Providerkosten planbar bleiben.',
        toolSlugs: ['internal-link-checker', 'broken-link-checker', 'duplicate-content-checker', 'backlink-checker'],
      },
    ],
    workflowsTitle: 'Typische SEO Workflows',
    workflowsDescription:
      'Die Tools funktionieren einzeln, aber sie können auch bewusst nacheinander genutzt werden.',
    workflows: [
      {
        title: 'Landingpage vor Kampagne prüfen',
        description:
          'Starte mit Onpage, Snippet und Canonical. Danach ist klar, ob die Seite überhaupt crawlbar, indexierbar und klickfähig wirkt.',
        toolSlugs: ['seo-checker', 'serp-preview-tool', 'canonical-checker'],
      },
      {
        title: 'Technischen Relaunch absichern',
        description:
          'Robots.txt, Sitemap und Indexierbarkeit zeigen schnell, ob Deployment oder Migration Suchmaschinen blockieren könnten.',
        toolSlugs: ['robots-txt-checker', 'sitemap-checker', 'indexability-checker'],
      },
      {
        title: 'Full Audit gezielt auslösen',
        description:
          'Wenn einzelne Checks Hinweise auf systemische Probleme liefern, geht es bewusst in Site Audit, Broken Links oder interne Verlinkung.',
        toolSlugs: ['site-audit', 'technical-seo-audit', 'internal-link-checker'],
      },
    ],
    decisionTitle: 'Schnellcheck, Full Audit oder Add-on?',
    decisionDescription:
      'Die Entscheidung ist Teil des Produkts. Nutzer sehen früh, ob ein leichter Check reicht oder ob Crawl-Budget, Providerdaten oder ein Report gebraucht werden.',
    crawlDecision: [
      {
        label: 'Schnellcheck',
        bestFor: 'Eine URL, ein Keyword oder eine Datei',
        costLogic: 'Kein Full Crawl, kaum Infrastrukturkosten, ideal für SEO-Landingpages.',
        examples: ['SEO Checker', 'Robots.txt Checker', 'Keyword Checker'],
      },
      {
        label: 'Full Audit',
        bestFor: 'Viele Seiten, interne Links, Broken Links, Duplicate Content',
        costLogic: 'Verbraucht Crawl-Seitenbudget und nutzt Planlimits sichtbar im Report.',
        examples: ['Technical SEO Audit', 'Site Audit', 'Internal Link Checker'],
      },
      {
        label: 'Provider oder Add-on',
        bestFor: 'Backlinks, Keyword-Gaps, Wettbewerberdaten und externe Metriken',
        costLogic: 'Providerkosten bleiben getrennt und können später als Add-on abgerechnet werden.',
        examples: ['Backlink Checker', 'Keyword Gap Checker', 'Link Building Tool'],
      },
    ],
    faqTitle: 'Häufige Fragen zu SEO Tools',
    faqDescription: 'Diese Antworten sind auch als strukturierte FAQ-Daten eingebunden.',
    faqs: [
      {
        question: 'Startet jedes SEO Tool einen kompletten Website-Crawl?',
        answer:
          'Nein. Die Schnellchecks prüfen gezielt eine URL, ein Keyword oder eine Datei. Ein Full Crawl wird erst gestartet, wenn der Nutzer bewusst einen Audit auswählt.',
      },
      {
        question: 'Warum sind SEO Tools und Site Audit getrennt?',
        answer:
          'Die Trennung spart Crawl-Budget und macht die Unterseiten für Suchmaschinen klarer. Einzelne Probleme bekommen eigene Landingpages, der Full Audit bleibt für ganze Websites.',
      },
      {
        question: 'Welche SEO Checks funktionieren sofort ohne Datenprovider?',
        answer:
          'SEO Checker, On Page SEO Checker, Meta Checker, Robots.txt Checker, Sitemap Checker, Canonical Checker, Indexability Checker und Keyword Checker laufen als leichte Checks.',
      },
      {
        question: 'Wann brauche ich den Full Audit?',
        answer:
          'Wenn du viele Seiten prüfen willst, interne Linkstrukturen brauchst, Broken Links finden möchtest oder Reports mit Planlimits und Evidence erzeugen willst.',
      },
    ],
  },
  ki: {
    slug: 'ki',
    eyebrow: 'AI Visibility Suite',
    metadataTitle: 'KI SEO Tools: AI Visibility, ChatGPT & LLM-Crawler prüfen',
    metadataDescription:
      'KI SEO Tools für AI Visibility, ChatGPT Sichtbarkeit, LLM-Crawler, AI Overviews, Entitäten, Answer Engine Optimization und AI Content Briefings.',
    detailHeadline: 'AI Visibility, Crawler-Zugriff und Answer Engines getrennt prüfen',
    intro: [
      'KI-Sichtbarkeit ist nicht ein einzelner Score. Manche Fragen sind technische Basischecks, etwa robots.txt, Noindex, strukturierte Daten und Textbasis. Andere brauchen SERP-, Quellen- oder Providerdaten.',
      'Diese Kategorie trennt leichte AI-Checks von kostenintensiven Datenstrecken. So können Nutzer AI Visibility testen, ohne sofort einen kompletten Crawl oder externe AI-Providerkosten auszulösen.',
    ],
    topToolsTitle: 'Beliebte KI Tools',
    topToolsDescription:
      'Diese Tools prüfen AI Search Grundlagen, LLM-Crawler-Zugriff und Content-Signale für Answer Engines als eigene Einstiege.',
    primaryToolSlugs: [
      'ai-visibility-checker',
      'chatgpt-visibility-checker',
      'llm-robots-checker',
      'ai-crawler-checker',
      'answer-engine-optimization',
      'entity-checker',
    ],
    groupsTitle: 'KI Aufgaben nach Sichtbarkeitsproblem',
    groupsDescription:
      'AI Search braucht technische Freigabe, klare Entitäten, gute Antwortformate und später echte SERP- oder Quellenmessung. Jede Aufgabe bekommt deshalb eine eigene Unterseite.',
    groups: [
      {
        title: 'AI Visibility Grundlagen',
        description:
          'Prüfe, ob Seiten für AI Search technisch lesbar wirken und ob grundlegende Signale wie Robots, Noindex, H1 und Textbasis stimmen.',
        toolSlugs: ['ai-visibility-checker', 'chatgpt-visibility-checker', 'ai-crawler-checker'],
      },
      {
        title: 'LLM-Crawler und Zugriff',
        description:
          'Kontrolliere AI-Bot-Regeln separat, damit GPTBot, ClaudeBot, PerplexityBot oder Google-Extended nicht unbeabsichtigt blockiert werden.',
        toolSlugs: ['llm-robots-checker', 'ai-crawler-checker', 'chatgpt-visibility-checker'],
      },
      {
        title: 'Answer Engine und Entitäten',
        description:
          'Plane Inhalte so, dass Fragen, Themen, Begriffe und kurze Antworten für AI Answers klarer auswertbar werden.',
        toolSlugs: ['answer-engine-optimization', 'entity-checker', 'ai-snippet-checker'],
      },
      {
        title: 'Briefings und AI Overview Daten',
        description:
          'Lokale Briefings laufen sofort; AI Overview Potenzial und echte SERP-Quellen bleiben bewusst eine Provider-Strecke.',
        toolSlugs: ['ai-content-brief-generator', 'google-ai-overview-checker', 'answer-engine-optimization'],
      },
    ],
    workflowsTitle: 'Typische KI Workflows',
    workflowsDescription:
      'KI-Tools funktionieren einzeln, lassen sich aber gut als Reifegrad-Kette nutzen: Zugriff, Inhalt, Quellen und Messung.',
    workflows: [
      {
        title: 'AI Crawlability prüfen',
        description:
          'Erst prüfen, ob AI-Crawler Zugriff haben, dann die einzelne Seite auf Noindex, JSON-LD und Textbasis testen.',
        toolSlugs: ['llm-robots-checker', 'ai-crawler-checker', 'ai-visibility-checker'],
      },
      {
        title: 'AI Answer Content vorbereiten',
        description:
          'Aus einem Thema wird ein Answer-Engine-Plan, danach werden Entitäten und Snippet-Klarheit geprüft.',
        toolSlugs: ['answer-engine-optimization', 'entity-checker', 'ai-snippet-checker'],
      },
      {
        title: 'Providerdaten gezielt nachziehen',
        description:
          'Wenn die Basis stimmt, können AI Overview, Quellen und echte SERP-Daten als Add-on oder Providerstrecke ergänzt werden.',
        toolSlugs: ['google-ai-overview-checker', 'ai-content-brief-generator', 'ai-visibility-checker'],
      },
    ],
    decisionTitle: 'Lokaler AI Check, Full Audit oder AI Add-on?',
    decisionDescription:
      'AI Visibility braucht klare Kostenlogik: technische Basischecks sind leicht, Site-weite Auswertungen brauchen Crawls, echte AI- und SERP-Daten brauchen Provider.',
    crawlDecision: [
      {
        label: 'Lokaler AI Check',
        bestFor: 'Eine URL, ein Text oder ein AI-relevantes Thema',
        costLogic: 'Schnell nutzbar ohne Full Crawl und ohne externe AI-Generierung.',
        examples: ['AI Visibility Checker', 'Entity Checker', 'AI Snippet Checker'],
      },
      {
        label: 'Full Audit',
        bestFor: 'Viele Seiten, interne Links, strukturierte Daten und Content-Basis',
        costLogic: 'Nutzt Crawl-Seitenbudget, wenn AI-Signale über die gesamte Website priorisiert werden sollen.',
        examples: ['AI Crawler Checker', 'ChatGPT Visibility Checker', 'Content Audit'],
      },
      {
        label: 'AI Visibility Add-on',
        bestFor: 'AI Overviews, Quellen, Wettbewerber und echte SERP-/LLM-Metriken',
        costLogic: 'Provider- und AI-Kosten bleiben separat abrechenbar und werden nicht mit kleinen Checks vermischt.',
        examples: ['Google AI Overview Checker', 'AI Content Brief', 'AI PR Visibility'],
      },
    ],
    faqTitle: 'Häufige Fragen zu KI SEO Tools',
    faqDescription: 'Die wichtigsten Unterschiede zwischen AI-Checks, Crawls und Providerdaten.',
    faqs: [
      {
        question: 'Sind KI SEO Tools dasselbe wie normale SEO Tools?',
        answer:
          'Nein. Klassische SEO prüft vor allem Suchmaschinen-Signale. KI SEO ergänzt Crawler-Zugriff, Entitäten, Antwortklarheit, Quellenfähigkeit und AI-Search-Signale.',
      },
      {
        question: 'Braucht AI Visibility immer einen Datenprovider?',
        answer:
          'Nicht für die Basis. Robots, Noindex, strukturierte Daten, H1 und Textbasis lassen sich leicht prüfen. AI Overview Tracking, Quellen und Wettbewerberdaten brauchen später Provider.',
      },
      {
        question: 'Warum gibt es eigene Seiten für ChatGPT, LLM Robots und AI Crawler?',
        answer:
          'Weil Nutzer danach getrennt suchen und weil die Checks unterschiedliche Kosten auslösen. Ein robots.txt Check ist nicht dasselbe wie eine AI-Overview-Messung.',
      },
      {
        question: 'Wann lohnt sich das AI Visibility Add-on?',
        answer:
          'Wenn du nicht nur technische Bereitschaft prüfen willst, sondern echte Quellen, AI Overview Potenzial, Wettbewerber und wiederkehrendes Monitoring brauchst.',
      },
    ],
  },
  content: {
    slug: 'content',
    eyebrow: 'Content Tool Suite',
    metadataTitle: 'Content Tools: Briefings, Lesbarkeit, Wortzähler & SEO Texte',
    metadataDescription:
      'Content Tools für Content Audits, SEO Briefings, Title Ideen, Meta Descriptions, Wortzähler, Lesbarkeit, Topic Cluster und Content Gaps.',
    detailHeadline: 'Content Checks, Briefings und Textqualität ohne unnötigen Crawl',
    intro: [
      'Content-Arbeit beginnt oft mit einem Text, einem Keyword oder einer einzelnen URL. Deshalb laufen viele Content Tools lokal und sofort, statt für jede Idee ein großes Audit zu starten.',
      'Wenn Wettbewerbsdaten, Content-Gaps oder Plagiatsprüfungen nötig werden, bleibt das als Provider- oder Add-on-Strecke getrennt. So bleiben kostenlose Tools nützlich und kostenintensive Daten sauber kontrollierbar.',
    ],
    topToolsTitle: 'Beliebte Content Tools',
    topToolsDescription:
      'Diese Tools helfen bei Textqualität, Briefings, Snippets und Content-Struktur, bevor ein großer Content Audit nötig wird.',
    primaryToolSlugs: [
      'content-audit',
      'content-brief-generator',
      'ai-title-generator',
      'meta-description-generator',
      'word-counter',
      'readability-checker',
    ],
    groupsTitle: 'Content Aufgaben nach Arbeitsphase',
    groupsDescription:
      'Von der ersten Idee über Textqualität bis zur Wettbewerbsanalyse: jede Content-Aufgabe bekommt einen eigenen Einstieg und eigene interne Links.',
    groups: [
      {
        title: 'Textqualität und Lesbarkeit',
        description:
          'Zähle Wörter, prüfe Sätze, erkenne lange Absätze und entscheide, ob ein Text genug Kontext für SEO und AI Answers liefert.',
        toolSlugs: ['word-counter', 'readability-checker', 'paragraph-rewriter', 'content-audit'],
      },
      {
        title: 'Briefings und Themenplanung',
        description:
          'Aus Keyword, Intent und Themenidee entstehen Briefings, Cluster und Unterseiten, ohne sofort externe SERP-Daten zu kaufen.',
        toolSlugs: ['content-brief-generator', 'topic-cluster-planner', 'ai-title-generator'],
      },
      {
        title: 'Titles, Descriptions und Snippets',
        description:
          'Bereite klickstarke Titles und Descriptions vor und prüfe kurze Antworttexte für Such- und AI-Snippets.',
        toolSlugs: ['ai-title-generator', 'meta-description-generator', 'content-audit'],
      },
      {
        title: 'Gaps, Originalität und Providerdaten',
        description:
          'Content-Gaps und Plagiate brauchen Webindex- oder SERP-Daten und bleiben deshalb eigene Provider-Strecken.',
        toolSlugs: ['content-gap-checker', 'plagiarism-checker', 'topic-cluster-planner'],
      },
    ],
    workflowsTitle: 'Typische Content Workflows',
    workflowsDescription:
      'Die Content Tools können als kleiner Schreibprozess genutzt werden: Idee, Briefing, Textprüfung und optional Gap-Daten.',
    workflows: [
      {
        title: 'SEO Briefing erstellen',
        description:
          'Starte mit Keyword und Intent, erstelle ein Briefing und plane anschließend Topic Cluster oder Unterseiten.',
        toolSlugs: ['content-brief-generator', 'topic-cluster-planner', 'ai-title-generator'],
      },
      {
        title: 'Text vor Veröffentlichung prüfen',
        description:
          'Wortzahl, Lesbarkeit und Content Audit zeigen, ob der Text kurz genug, klar genug und technisch sauber eingebettet ist.',
        toolSlugs: ['word-counter', 'readability-checker', 'content-audit'],
      },
      {
        title: 'Wettbewerbslücken nachziehen',
        description:
          'Wenn der eigene Text steht, können Content Gap und Plagiatsprüfung als Providerdaten ergänzt werden.',
        toolSlugs: ['content-gap-checker', 'plagiarism-checker', 'content-audit'],
      },
    ],
    decisionTitle: 'Textcheck, Content Audit oder Providerdaten?',
    decisionDescription:
      'Content-Kosten hängen stark davon ab, ob nur lokaler Text geprüft wird oder externe SERP-, Wettbewerbs- und Webindexdaten nötig sind.',
    crawlDecision: [
      {
        label: 'Textcheck',
        bestFor: 'Absätze, Snippets, Briefings und einzelne Texte',
        costLogic: 'Läuft lokal, startet keinen Crawl und eignet sich für kostenlose Einstiegsseiten.',
        examples: ['Word Counter', 'Readability Checker', 'Paragraph Rewriter'],
      },
      {
        label: 'Content Audit',
        bestFor: 'Eine URL oder viele Seiten mit Content- und Strukturproblemen',
        costLogic: 'Eine URL ist leicht, ganze Content-Inventare laufen bewusst über Crawl- und Reportlimits.',
        examples: ['Content Audit', 'Topic Cluster Planner', 'SEO Report'],
      },
      {
        label: 'Providerdaten',
        bestFor: 'Content-Gaps, Plagiate, SERP-Vergleich und Wettbewerber',
        costLogic: 'Externe Daten bleiben getrennt und können später als Add-on abgerechnet werden.',
        examples: ['Content Gap Checker', 'Plagiarism Checker', 'AI Content Brief'],
      },
    ],
    faqTitle: 'Häufige Fragen zu Content Tools',
    faqDescription: 'Kurze Antworten zu Textchecks, Briefings und datenintensiven Content-Analysen.',
    faqs: [
      {
        question: 'Startet der Word Counter oder Readability Checker einen Crawl?',
        answer:
          'Nein. Diese Tools prüfen nur den eingegebenen Text und verbrauchen kein Crawl-Seitenbudget.',
      },
      {
        question: 'Wann brauche ich einen Content Audit statt eines Textchecks?',
        answer:
          'Wenn eine URL oder viele Seiten mit Title, Description, Textbasis, Struktur und technischen Signalen bewertet werden sollen.',
      },
      {
        question: 'Warum sind Content Gap und Plagiarism Checker Provider-Strecken?',
        answer:
          'Weil dafür externe SERP-, Wettbewerbs- oder Webindexdaten nötig sind. Diese Kosten sollen sauber von kostenlosen Textchecks getrennt bleiben.',
      },
      {
        question: 'Kann ich Content Tools für AI Search nutzen?',
        answer:
          'Ja. Gute Wortzahl, klare Sätze, eindeutige Entitäten und kurze Antwortformate helfen auch bei AI Answers und AI Visibility.',
      },
    ],
  },
  'traffic-markt': {
    slug: 'traffic-markt',
    eyebrow: 'Traffic & Market Intelligence',
    metadataTitle: 'Traffic & Markt Tools: Wettbewerber, Domain Overview & Share of Voice',
    metadataDescription:
      'Traffic und Markt Tools für Wettbewerberanalyse, Domain Overview, Traffic Estimator, Share of Voice, Keyword- und Content-Gaps sowie Rankingdaten.',
    detailHeadline: 'Markt-, Wettbewerber- und Trafficdaten getrennt vom Website-Crawl',
    intro: [
      'Traffic- und Marktdaten kommen selten direkt aus einem technischen Crawl. Sie brauchen Rankingdaten, SERP-Daten, Clickstream-Schätzungen oder Wettbewerberprovider.',
      'Darum sind diese Unterseiten vor allem klare Datenstrecken: Nutzer verstehen, welche Analyse vorbereitet wird, welche Provider später nötig sind und warum ein Full Audit nicht automatisch Trafficdaten kaufen sollte.',
    ],
    topToolsTitle: 'Beliebte Traffic & Markt Tools',
    topToolsDescription:
      'Diese Seiten schaffen eigene Einstiege für Wettbewerber, Traffic, Marktgröße, Share of Voice und Rankingdaten.',
    primaryToolSlugs: [
      'competitor-checker',
      'domain-overview',
      'traffic-estimator',
      'market-overview',
      'share-of-voice',
      'competitor-gap-tool',
    ],
    groupsTitle: 'Traffic- und Marktdaten nach Analyseziel',
    groupsDescription:
      'Traffic & Markt ist bewusst datengetrieben. Die Gruppen zeigen, welche Auswertung später Provider, Add-ons oder Keyword-Budgets braucht.',
    groups: [
      {
        title: 'Domain und Traffic Überblick',
        description:
          'Bereite Domain Overview, Traffic-Schätzung und Marktüberblick als eigene Datenansicht vor.',
        toolSlugs: ['domain-overview', 'traffic-estimator', 'market-overview'],
      },
      {
        title: 'Wettbewerber und Gaps',
        description:
          'Erkenne Wettbewerber, Keyword-Gaps, Content-Gaps und strategische Lücken, ohne technische Crawl-Fehler damit zu vermischen.',
        toolSlugs: ['competitor-checker', 'competitor-gap-tool', 'share-of-voice'],
      },
      {
        title: 'Rankings und Sichtbarkeit',
        description:
          'Rankings und Share of Voice sind laufende Keyword-Budgets und gehören nicht in einmalige Crawl-Limits.',
        toolSlugs: ['rank-tracker', 'share-of-voice', 'traffic-estimator'],
      },
      {
        title: 'Backlink- und Authority-Chancen',
        description:
          'Link-Gaps und Wettbewerber-Backlinks werden als Backlink-Add-on vorbereitet, nicht als technischer Crawl.',
        toolSlugs: ['competitor-backlink-checker', 'competitor-gap-tool', 'domain-overview'],
      },
    ],
    workflowsTitle: 'Typische Traffic & Markt Workflows',
    workflowsDescription:
      'Diese Kategorie ist der strategische Layer über den Audits: erst Markt verstehen, dann technische und Content-Arbeit priorisieren.',
    workflows: [
      {
        title: 'Wettbewerbsumfeld klären',
        description:
          'Starte mit Wettbewerber- und Marktüberblick, danach lassen sich Gaps und Share of Voice gezielt vorbereiten.',
        toolSlugs: ['competitor-checker', 'market-overview', 'competitor-gap-tool'],
      },
      {
        title: 'Domain-Potenzial einschätzen',
        description:
          'Domain Overview, Traffic Estimator und Rank Tracking bilden die Basis für Wachstums- und Monitoring-Entscheidungen.',
        toolSlugs: ['domain-overview', 'traffic-estimator', 'rank-tracker'],
      },
      {
        title: 'Add-ons sinnvoll verkaufen',
        description:
          'Wenn Nutzer Wettbewerberdaten, Backlink-Gaps oder Share of Voice brauchen, ist klar, welches Add-on oder welcher Provider nötig wird.',
        toolSlugs: ['share-of-voice', 'competitor-backlink-checker', 'competitor-gap-tool'],
      },
    ],
    decisionTitle: 'Providerdaten, Keyword-Budget oder Full Audit?',
    decisionDescription:
      'Traffic & Markt trennt Strategie von Technik: Der Crawl findet Website-Probleme, Providerdaten erklären Markt, Rankings und Wettbewerber.',
    crawlDecision: [
      {
        label: 'Providerdaten',
        bestFor: 'Traffic-Schätzungen, Wettbewerber, SERP-Daten und Markttrends',
        costLogic: 'Externe Daten werden vorbereitet und später gezielt angebunden, statt verdeckt im Audit zu laufen.',
        examples: ['Domain Overview', 'Traffic Estimator', 'Market Overview'],
      },
      {
        label: 'Keyword-Budget',
        bestFor: 'Rank Tracking, Share of Voice und laufendes Monitoring',
        costLogic: 'Rankings skalieren über Keywords und Zeit, nicht über Crawl-Seiten.',
        examples: ['Rank Tracker', 'Share of Voice', 'Competitor Gap'],
      },
      {
        label: 'Full Audit',
        bestFor: 'Technische Probleme, interne Links und konkrete Website-Fixes',
        costLogic: 'Der Audit wird ausgelöst, wenn Marktchancen in technische oder Content-Aufgaben übersetzt werden.',
        examples: ['Site Audit', 'Technical SEO Audit', 'Content Audit'],
      },
    ],
    faqTitle: 'Häufige Fragen zu Traffic & Markt Tools',
    faqDescription: 'Warum Trafficdaten, Rankings und Wettbewerber nicht in denselben Topf wie Crawls gehören.',
    faqs: [
      {
        question: 'Warum sind viele Traffic & Markt Tools als Provider markiert?',
        answer:
          'Weil Traffic, Rankings, Share of Voice und Wettbewerberdaten externe Datenquellen brauchen. Ein Website-Crawl kann diese Werte nicht zuverlässig allein liefern.',
      },
      {
        question: 'Ist ein Domain Overview dasselbe wie ein Site Audit?',
        answer:
          'Nein. Domain Overview beschreibt Markt, Traffic, Keywords und Authority. Ein Site Audit findet technische und inhaltliche Probleme auf der eigenen Website.',
      },
      {
        question: 'Warum braucht Rank Tracking ein eigenes Keyword-Budget?',
        answer:
          'Rankings werden regelmäßig pro Keyword geprüft. Das skaliert anders als Crawl-Seiten und sollte deshalb separat limitiert und abgerechnet werden.',
      },
      {
        question: 'Wie helfen diese Seiten beim Verkaufen von Add-ons?',
        answer:
          'Sie zeigen klar, welche Datenstrecke fehlt: Backlinks, Wettbewerber, Share of Voice oder Rankingdaten. Daraus lassen sich später echte Add-ons ableiten.',
      },
    ],
  },
};

export function getToolCategoryLanding(slug: ToolCategorySlug) {
  return CATEGORY_LANDINGS[slug];
}
