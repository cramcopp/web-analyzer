import type { DataSourceType } from '@/types/data-source';
import { getEffectivePlanConfig, getPlanConfig, type PlanType } from './plans';

export type FeatureKey =
  | 'monitoring'
  | 'whiteLabel'
  | 'api'
  | 'keywordProvider'
  | 'rankProvider'
  | 'backlinkProvider'
  | 'trafficProvider'
  | 'aiVisibilityProvider';

export type ProductPillar = 'semrush' | 'seobility' | 'bertlinker';

export type RoadmapStatus =
  | 'active'
  | 'foundation'
  | 'provider_required'
  | 'planned'
  | 'later'
  | 'not_now';

export interface RoadmapFeature {
  key: string;
  label: string;
  pillar: ProductPillar;
  status: RoadmapStatus;
  dataSource: DataSourceType;
  route?: string;
  providerRequired?: boolean;
  note: string;
}

export interface NotNowFeature {
  key: string;
  label: string;
  reason: string;
}

export const FEATURE_DATA_SOURCES: Record<FeatureKey, DataSourceType> = {
  monitoring: 'real',
  whiteLabel: 'real',
  api: 'real',
  keywordProvider: 'unavailable',
  rankProvider: 'unavailable',
  backlinkProvider: 'unavailable',
  trafficProvider: 'unavailable',
  aiVisibilityProvider: 'heuristic',
};

export function hasPlanFeature(plan: string | null | undefined, feature: FeatureKey, addOns?: unknown): boolean {
  const config = getEffectivePlanConfig(plan, addOns);

  switch (feature) {
    case 'monitoring':
      return Boolean(config.monitoring);
    case 'whiteLabel':
      return config.whiteLabel;
    case 'api':
      return Boolean(config.api);
    case 'keywordProvider':
      return config.rankKeywords > 0;
    case 'rankProvider':
      return config.rankKeywords > 0;
    case 'backlinkProvider':
      return config.backlinkAddon;
    case 'trafficProvider':
      return getPlanConfig(plan).rankKeywords > 0;
    case 'aiVisibilityProvider':
      return config.aiVisibilityAddon;
    default:
      return false;
  }
}

export function getPlanFeatureSummary(plan: PlanType, addOns?: unknown) {
  const config = getEffectivePlanConfig(plan, addOns);

  return {
    plan,
    name: config.name,
    scanLimitMonthly: config.scanLimitMonthly,
    crawlLimit: config.crawlLimit,
    monthlyCrawlPages: config.monthlyCrawlPages,
    visibleDetailPages: config.visibleDetailPages,
    issueUrlsVisible: config.issueUrlsVisible,
    evidencePerReport: config.evidencePerReport,
    projects: config.projects,
    rankKeywords: config.rankKeywords,
    competitors: config.competitors,
    seats: config.seats,
    exports: config.exports,
    monitoring: config.monitoring,
    whiteLabel: config.whiteLabel,
    whiteLabelCustomDomain: config.whiteLabelCustomDomain,
    backlinkAddon: config.backlinkAddon,
    aiVisibilityAddon: config.aiVisibilityAddon,
    monthlyAddonPrice: config.monthlyAddonPrice,
    addOns: config.addOns,
    api: config.api,
  };
}

export const PRODUCT_POSITIONING = {
  decision: 'Kein billiger Semrush-Klon.',
  market: 'DACH-fokussiertes Website-Governance- und Audit-SaaS für Agenturen, Freelancer und KMU.',
  pillars: [
    'Semrush-inspirierter externer Datenlayer für SEO, Keywords, Rankings, Backlinks, Wettbewerber und AI Visibility.',
    'Seobility-inspirierter laufender Betrieb mit Monitoring, Alerts, Reports, White Label und KMU-Verständlichkeit.',
    'BERTlinker-inspiriertes Spezialmodul für interne Verlinkung, Topic Hubs, semantische Linkjobs und Export.',
  ],
  guardrails: [
    'Keine Fake-Daten als echte Produktdaten anzeigen.',
    'Providerpflichtige Features bleiben unavailable, bis ein echter Provider verbunden ist.',
    'Heuristiken werden als heuristic markiert.',
    'Abgelenkte Feature-Familien bleiben explizit not_now.',
  ],
} as const;

export const PRODUCT_ROADMAP: RoadmapFeature[] = [
  {
    key: 'domain_overview',
    label: 'Domain Overview',
    pillar: 'semrush',
    status: 'foundation',
    dataSource: 'real',
    route: 'Dashboard / Projekte',
    note: 'Projektübersicht, Audit-Scores und Crawl-Fakten sind vorbereitet; externe Marktwerte bleiben providerpflichtig.',
  },
  {
    key: 'organic_research',
    label: 'Organic Research',
    pillar: 'semrush',
    status: 'provider_required',
    dataSource: 'unavailable',
    providerRequired: true,
    route: 'Keywords / Rankings',
    note: 'Keine organischen Keyword- oder Rankingdaten ohne SERP-/Keyword-Provider.',
  },
  {
    key: 'keyword_overview',
    label: 'Keyword Overview',
    pillar: 'semrush',
    status: 'provider_required',
    dataSource: 'unavailable',
    providerRequired: true,
    route: 'Keywords',
    note: 'Volumen, CPC, Difficulty und Intent kommen nur aus echten Keyword Facts.',
  },
  {
    key: 'keyword_magic',
    label: 'Keyword Magic / Keyword Research',
    pillar: 'semrush',
    status: 'provider_required',
    dataSource: 'unavailable',
    providerRequired: true,
    route: 'Keywords',
    note: 'Keyword Research zeigt unavailable, solange kein DataForSEO- oder vergleichbarer Provider verbunden ist.',
  },
  {
    key: 'keyword_gap',
    label: 'Keyword Gap',
    pillar: 'semrush',
    status: 'provider_required',
    dataSource: 'unavailable',
    providerRequired: true,
    route: 'Wettbewerber / Keywords',
    note: 'Gap-Daten brauchen echte Domain-, Keyword- und Ranking-Facts für beide Seiten.',
  },
  {
    key: 'keyword_strategy_builder',
    label: 'Keyword Strategy Builder',
    pillar: 'semrush',
    status: 'planned',
    dataSource: 'unavailable',
    route: 'Keywords',
    note: 'Erst nach stabilen Keyword Facts und Clustering sinnvoll.',
  },
  {
    key: 'position_tracking',
    label: 'Position Tracking',
    pillar: 'semrush',
    status: 'provider_required',
    dataSource: 'unavailable',
    providerRequired: true,
    route: 'Rankings / Monitoring',
    note: 'Rank Facts sind modelliert; echte Positionen brauchen SERP-Provider oder GSC.',
  },
  {
    key: 'site_audit',
    label: 'Site Audit',
    pillar: 'semrush',
    status: 'active',
    dataSource: 'real',
    route: 'Audit / Issues / Evidence',
    note: 'Scanner erzeugt deterministische Issues mit Evidence und Confidence.',
  },
  {
    key: 'on_page_seo_checker',
    label: 'On Page SEO Checker',
    pillar: 'semrush',
    status: 'foundation',
    dataSource: 'real',
    route: 'Audit',
    note: 'Meta-, Heading-, Canonical-, Noindex-, Sitemap- und Content-Regeln sind Issue-basiert vorbereitet.',
  },
  {
    key: 'backlink_analytics',
    label: 'Backlink Analytics',
    pillar: 'semrush',
    status: 'provider_required',
    dataSource: 'unavailable',
    providerRequired: true,
    route: 'Backlinks',
    note: 'Backlink Facts existieren als Modell; UI zeigt unavailable ohne Provider.',
  },
  {
    key: 'backlink_audit',
    label: 'Backlink Audit',
    pillar: 'semrush',
    status: 'later',
    dataSource: 'unavailable',
    providerRequired: true,
    route: 'Backlinks',
    note: 'Später nach stabiler Backlink-Erfassung und Risiko-Metriken.',
  },
  {
    key: 'traffic_analytics',
    label: 'Traffic Analytics',
    pillar: 'semrush',
    status: 'later',
    dataSource: 'unavailable',
    providerRequired: true,
    route: 'Wettbewerber',
    note: 'Traffic Estimates bleiben deaktiviert, bis Similarweb oder ein anderer echter Provider angebunden ist.',
  },
  {
    key: 'market_explorer_lite',
    label: 'Market Explorer später',
    pillar: 'semrush',
    status: 'later',
    dataSource: 'unavailable',
    providerRequired: true,
    route: 'Wettbewerber',
    note: 'Nur fokussierte Wettbewerber-/Kategorie-Sicht später; kein Full Market Explorer jetzt.',
  },
  {
    key: 'competitor_monitoring',
    label: 'Competitor Monitoring / EyeOn',
    pillar: 'semrush',
    status: 'foundation',
    dataSource: 'real',
    route: 'Wettbewerber / Monitoring',
    note: 'Competitor Facts und Monitoring-Struktur sind vorbereitet; externe Marktmetriken bleiben providerpflichtig.',
  },
  {
    key: 'ai_visibility_toolkit',
    label: 'AI Visibility Toolkit',
    pillar: 'semrush',
    status: 'foundation',
    dataSource: 'heuristic',
    route: 'AI Visibility',
    note: 'AI-Crawler-, robots.txt-, Entity-, Schema- und Snippet-Checks sind heuristisch markiert.',
  },
  {
    key: 'reports_dashboards_client_portal_api',
    label: 'Reports, Dashboards, Client Portal, API',
    pillar: 'semrush',
    status: 'foundation',
    dataSource: 'real',
    route: 'Reports / Settings',
    note: 'Share Links, Public Reports, Exporte und API-Grundlagen sind vorbereitet; API-Ausbau bleibt kontrolliert.',
  },
  {
    key: 'website_audit',
    label: 'Website Audit',
    pillar: 'seobility',
    status: 'active',
    dataSource: 'real',
    route: 'Audit',
    note: 'Laufender Audit-Betrieb basiert auf echten Crawl-Ergebnissen und Issues.',
  },
  {
    key: 'crawl_overview',
    label: 'Crawl Overview',
    pillar: 'seobility',
    status: 'foundation',
    dataSource: 'real',
    route: 'Audit / Evidence',
    note: 'URL Snapshots, Linkdaten und Crawl Summary sind verfügbar, wenn ein Scan existiert.',
  },
  {
    key: 'technical_seo_checks',
    label: 'Technical SEO Checks',
    pillar: 'seobility',
    status: 'active',
    dataSource: 'real',
    route: 'Issues',
    note: 'Technische SEO-Regeln landen als Audit Issues mit Severity und Confidence.',
  },
  {
    key: 'meta_content_checks',
    label: 'Meta & Content Checks',
    pillar: 'seobility',
    status: 'active',
    dataSource: 'real',
    route: 'Audit / Issues',
    note: 'Title, Description, H1, Duplicate- und Thin-Content-Regeln sind issue-basiert.',
  },
  {
    key: 'ranking_monitoring',
    label: 'Ranking Monitoring',
    pillar: 'seobility',
    status: 'provider_required',
    dataSource: 'unavailable',
    providerRequired: true,
    route: 'Rankings / Monitoring',
    note: 'Keine Rankings ohne SERP-Provider oder GSC.',
  },
  {
    key: 'keyword_checker_research',
    label: 'Keyword Checker / Keyword Research',
    pillar: 'seobility',
    status: 'provider_required',
    dataSource: 'unavailable',
    providerRequired: true,
    route: 'Keywords',
    note: 'Keyword-Volumen und Difficulty werden nicht simuliert.',
  },
  {
    key: 'tf_idf_content_tool',
    label: 'TF-IDF Content Tool',
    pillar: 'seobility',
    status: 'later',
    dataSource: 'unavailable',
    route: 'Keywords / Audit',
    note: 'Später, wenn Content-Korpus und Wettbewerberdaten belastbar sind.',
  },
  {
    key: 'competitor_analysis',
    label: 'Competitor Analysis',
    pillar: 'seobility',
    status: 'foundation',
    dataSource: 'heuristic',
    route: 'Wettbewerber',
    note: 'Heuristische Wettbewerber-Sicht existiert; echte Marktwerte bleiben providerpflichtig.',
  },
  {
    key: 'backlink_monitoring',
    label: 'Backlink Monitoring',
    pillar: 'seobility',
    status: 'provider_required',
    dataSource: 'unavailable',
    providerRequired: true,
    route: 'Backlinks / Monitoring',
    note: 'Backlink Monitoring braucht echte Backlink Facts.',
  },
  {
    key: 'uptime_monitoring_alerts',
    label: 'Uptime Monitoring, E-Mail Alerts',
    pillar: 'seobility',
    status: 'foundation',
    dataSource: 'real',
    route: 'Monitoring',
    note: 'Collections und Alerttypen sind vorbereitet; Versandkanal kann später angebunden werden.',
  },
  {
    key: 'ai_overview_tracking',
    label: 'AI Overview Tracking',
    pillar: 'seobility',
    status: 'later',
    dataSource: 'unavailable',
    providerRequired: true,
    route: 'AI Visibility',
    note: 'Später über SERP-Provider, keine erfundenen AI-Overview-Daten.',
  },
  {
    key: 'white_label_share_members_free_check',
    label: 'White Label Reports, Share URLs, Member Accounts, Free SEO Check',
    pillar: 'seobility',
    status: 'foundation',
    dataSource: 'real',
    route: 'Reports / Team / Dashboard',
    note: 'Agentur- und KMU-Basis ist vorbereitet.',
  },
  {
    key: 'csv_excel_import',
    label: 'CSV/Excel Import später',
    pillar: 'bertlinker',
    status: 'later',
    dataSource: 'unavailable',
    route: 'Interne Verlinkung',
    note: 'Import kommt später; aktuell wird aus echten Crawl-Daten gerechnet.',
  },
  {
    key: 'semantic_internal_link_opportunities',
    label: 'Semantic Internal Link Opportunities',
    pillar: 'bertlinker',
    status: 'foundation',
    dataSource: 'heuristic',
    route: 'Interne Verlinkung',
    note: 'Heuristische Link Opportunities nutzen Title, Headings und Textbasis; Embeddings sind vorbereitet.',
  },
  {
    key: 'cross_linking_matrix',
    label: 'Cross-Linking Matrix',
    pillar: 'bertlinker',
    status: 'active',
    dataSource: 'real',
    route: 'Interne Verlinkung',
    note: 'Matrix basiert auf vorhandenen Links und fehlenden Chancen, nicht auf Zufall.',
  },
  {
    key: 'topic_hubs',
    label: 'Topic Hubs',
    pillar: 'bertlinker',
    status: 'foundation',
    dataSource: 'heuristic',
    route: 'Interne Verlinkung',
    note: 'Topic Hubs werden aus Crawl- und Textbasis heuristisch vorbereitet.',
  },
  {
    key: 'existing_link_orphan_anchor_priority',
    label: 'Existing Link Check, Orphan Pages, Anchor Suggestions, Link Priority Score',
    pillar: 'bertlinker',
    status: 'foundation',
    dataSource: 'real',
    route: 'Interne Verlinkung',
    note: 'LinkGraph, Inlinks, Outlinks, Orphans, Anchors und Prioritäten kommen aus Crawl-Daten.',
  },
  {
    key: 'csv_export_shareable_dashboard',
    label: 'Excel/CSV Export, Shareable Dashboard',
    pillar: 'bertlinker',
    status: 'foundation',
    dataSource: 'real',
    route: 'Interne Verlinkung / Reports',
    note: 'CSV-Export und sharebare Reports sind vorbereitet; Excel folgt später.',
  },
  {
    key: 'multi_language_link_status',
    label: 'Multi-language Support, Link Implementation Status',
    pillar: 'bertlinker',
    status: 'planned',
    dataSource: 'unavailable',
    route: 'Interne Verlinkung',
    note: 'Geplant für Link-Workflow und mehrsprachige Projekte, ohne aktuelle Scheindaten.',
  },
];

export const NOT_NOW_FEATURES: NotNowFeature[] = [
  { key: 'ppc_research', label: 'PPC Research', reason: 'Lenkt vom Website-Governance- und Audit-Kern ab.' },
  { key: 'pla_research', label: 'PLA Research', reason: 'Kein aktueller DACH-Audit-SaaS-Kernnutzen.' },
  { key: 'social_poster', label: 'Social Poster', reason: 'Würde Produktfokus und Datenmodell verwässern.' },
  { key: 'social_analytics', label: 'Social Analytics', reason: 'Nicht Teil der Audit-, Monitoring- oder Governance-Datenwahrheit.' },
  { key: 'full_market_explorer', label: 'Full Market Explorer', reason: 'Später nur fokussiert, nicht als grosser Semrush-Klon.' },
  { key: 'audience_demographics', label: 'Audience Demographics', reason: 'Provider- und Datenschutzkomplexität ohne jetzige Priorität.' },
  { key: 'app_marketplace', label: 'App Marketplace', reason: 'Vor stabilen Datenmodellen nicht sinnvoll.' },
  { key: 'pr_suite', label: 'PR Suite', reason: 'Nicht Teil des Website-Governance-Produkts.' },
  { key: 'large_api', label: 'Riesige API vor stabilen Datenmodellen', reason: 'API bleibt klein, erst Datenmodelle und Evidence Engine stabilisieren.' },
];

export function getRoadmapByPillar(pillar: ProductPillar) {
  return PRODUCT_ROADMAP.filter((feature) => feature.pillar === pillar);
}

export function getRoadmapByStatus(status: RoadmapStatus) {
  return PRODUCT_ROADMAP.filter((feature) => feature.status === status);
}
