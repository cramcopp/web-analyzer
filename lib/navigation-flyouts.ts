export type NavigationFlyoutLink = {
  label: string;
  href: string;
  badge?: string;
};

export type NavigationFlyoutSection = {
  label: string;
  links: NavigationFlyoutLink[];
};

export type NavigationFlyout = {
  title: string;
  href: string;
  sections: NavigationFlyoutSection[];
};

export const NAVIGATION_FLYOUTS: Record<string, NavigationFlyout> = {
  seo: {
    title: 'SEO',
    href: '/tools/seo',
    sections: [
      {
        label: 'Erste Schritte',
        links: [
          { label: 'SEO Checker', href: '/tools/seo-checker' },
          { label: 'On Page SEO Checker', href: '/tools/on-page-seo-checker' },
          { label: 'SERP Preview Tool', href: '/tools/serp-preview-tool' },
          { label: 'Keyword Checker', href: '/tools/keyword-checker' },
        ],
      },
      {
        label: 'Technik',
        links: [
          { label: 'Technical SEO Audit', href: '/tools/technical-seo-audit' },
          { label: 'Robots.txt Checker', href: '/tools/robots-txt-checker' },
          { label: 'XML Sitemap Checker', href: '/tools/sitemap-checker' },
          { label: 'Canonical Checker', href: '/tools/canonical-checker' },
          { label: 'Indexability Checker', href: '/tools/indexability-checker' },
        ],
      },
      {
        label: 'Links und Inhalte',
        links: [
          { label: 'Broken Link Checker', href: '/tools/broken-link-checker' },
          { label: 'Internal Link Checker', href: '/tools/internal-link-checker' },
          { label: 'Duplicate Content Checker', href: '/tools/duplicate-content-checker' },
          { label: 'Structured Data Checker', href: '/tools/structured-data-checker' },
        ],
      },
    ],
  },
  ki: {
    title: 'KI',
    href: '/tools/ki',
    sections: [
      {
        label: 'AI Visibility',
        links: [
          { label: 'AI Visibility Checker', href: '/tools/ai-visibility-checker' },
          { label: 'ChatGPT Visibility Checker', href: '/tools/chatgpt-visibility-checker' },
          { label: 'Google AI Overview Checker', href: '/tools/google-ai-overview-checker' },
          { label: 'AI Crawler Checker', href: '/tools/ai-crawler-checker' },
        ],
      },
      {
        label: 'LLM und Entitäten',
        links: [
          { label: 'LLM Robots Checker', href: '/tools/llm-robots-checker' },
          { label: 'Answer Engine Optimization Tool', href: '/tools/answer-engine-optimization' },
          { label: 'Entity Checker', href: '/tools/entity-checker' },
          { label: 'AI Snippet Checker', href: '/tools/ai-snippet-checker' },
        ],
      },
    ],
  },
  'traffic-markt': {
    title: 'Traffic & Markt',
    href: '/tools/traffic-markt',
    sections: [
      {
        label: 'Traffic Analytics',
        links: [
          { label: 'Domain Overview', href: '/tools/domain-overview' },
          { label: 'Traffic Estimator', href: '/tools/traffic-estimator' },
          { label: 'Market Overview Tool', href: '/tools/market-overview' },
          { label: 'Share of Voice Checker', href: '/tools/share-of-voice' },
        ],
      },
      {
        label: 'Wettbewerb',
        links: [
          { label: 'Competitor Checker', href: '/tools/competitor-checker' },
          { label: 'Competitor Gap Tool', href: '/tools/competitor-gap-tool' },
          { label: 'Competitor Backlink Checker', href: '/tools/competitor-backlink-checker' },
          { label: 'Rank Tracker', href: '/tools/rank-tracker' },
        ],
      },
    ],
  },
  local: {
    title: 'Local',
    href: '/tools/local',
    sections: [
      {
        label: 'Lokale Suche',
        links: [
          { label: 'Local SEO Checker', href: '/tools/local-seo-checker' },
          { label: 'Google Business Profile Checker', href: '/tools/google-business-profile-checker' },
          { label: 'Local Rank Tracker', href: '/tools/local-rank-tracker' },
          { label: 'Service Area Page Checker', href: '/tools/service-area-page-checker' },
        ],
      },
      {
        label: 'Standortdaten',
        links: [
          { label: 'NAP Consistency Checker', href: '/tools/nap-consistency-checker' },
          { label: 'Local Citation Checker', href: '/tools/local-citation-checker' },
          { label: 'Review Monitoring', href: '/tools/review-monitoring' },
        ],
      },
    ],
  },
  content: {
    title: 'Content',
    href: '/tools/content',
    sections: [
      {
        label: 'Content Qualität',
        links: [
          { label: 'Content Audit', href: '/tools/content-audit' },
          { label: 'Word Counter', href: '/tools/word-counter' },
          { label: 'Readability Checker', href: '/tools/readability-checker' },
          { label: 'Paragraph Rewriter', href: '/tools/paragraph-rewriter' },
        ],
      },
      {
        label: 'Planung',
        links: [
          { label: 'Content Brief Generator', href: '/tools/content-brief-generator' },
          { label: 'AI Title Generator', href: '/tools/ai-title-generator' },
          { label: 'Meta Description Generator', href: '/tools/meta-description-generator' },
          { label: 'Topic Cluster Planner', href: '/tools/topic-cluster-planner' },
          { label: 'Content Gap Checker', href: '/tools/content-gap-checker' },
        ],
      },
    ],
  },
  social: {
    title: 'Social',
    href: '/tools/social',
    sections: [
      {
        label: 'Previews und Tracking',
        links: [
          { label: 'Open Graph Checker', href: '/tools/open-graph-checker' },
          { label: 'Social Preview Checker', href: '/tools/social-preview-checker' },
          { label: 'UTM Builder', href: '/tools/utm-builder' },
          { label: 'Social Report', href: '/tools/social-report' },
        ],
      },
      {
        label: 'Content Distribution',
        links: [
          { label: 'Social Content Planner', href: '/tools/social-content-planner' },
          { label: 'LinkedIn Post Generator', href: '/tools/linkedin-post-generator' },
          { label: 'Instagram Caption Generator', href: '/tools/instagram-caption-generator' },
        ],
      },
    ],
  },
  anzeigen: {
    title: 'Anzeigen',
    href: '/tools/anzeigen',
    sections: [
      {
        label: 'PPC und Landingpages',
        links: [
          { label: 'Ads Landing Page Checker', href: '/tools/ads-landing-page-checker' },
          { label: 'Landing Page Quality Checker', href: '/tools/landing-page-quality-checker' },
          { label: 'Conversion Readiness Checker', href: '/tools/conversion-readiness-checker' },
          { label: 'Google Ads Keyword Checker', href: '/tools/google-ads-keyword-checker' },
        ],
      },
      {
        label: 'Kampagnen',
        links: [
          { label: 'PPC Competitor Checker', href: '/tools/ppc-competitor-checker' },
          { label: 'Ad Copy Generator', href: '/tools/ad-copy-generator' },
        ],
      },
    ],
  },
  'ki-pr': {
    title: 'KI-PR',
    href: '/tools/ki-pr',
    sections: [
      {
        label: 'Brand und Quellen',
        links: [
          { label: 'AI PR Visibility Checker', href: '/tools/ai-pr-visibility-checker' },
          { label: 'Brand Entity Checker', href: '/tools/brand-entity-checker' },
          { label: 'Source Authority Checker', href: '/tools/source-authority-checker' },
          { label: 'Citation Readiness Checker', href: '/tools/citation-readiness-checker' },
        ],
      },
      {
        label: 'PR Workflows',
        links: [
          { label: 'Press Mention Monitor', href: '/tools/press-mention-monitor' },
          { label: 'Journalist Outreach Planner', href: '/tools/journalist-outreach-planner' },
          { label: 'AI PR Report', href: '/tools/ai-pr-report' },
        ],
      },
    ],
  },
  berichte: {
    title: 'Berichte',
    href: '/tools/berichte',
    sections: [
      {
        label: 'Reports',
        links: [
          { label: 'SEO Report Generator', href: '/tools/seo-report-generator' },
          { label: 'Client Report Generator', href: '/tools/client-report-generator' },
          { label: 'Monitoring Report', href: '/tools/monitoring-report' },
          { label: 'Google Search Console Report', href: '/tools/gsc-report' },
        ],
      },
      {
        label: 'Agentur',
        links: [
          { label: 'White Label Report', href: '/tools/white-label-report' },
          { label: 'Audit Export Tool', href: '/tools/audit-export-tool' },
          { label: 'Evidence Screenshot Report', href: '/tools/evidence-screenshot-report' },
          { label: 'Team Reporting Dashboard', href: '/tools/team-reporting-dashboard' },
        ],
      },
    ],
  },
  'app-center': {
    title: 'App Center',
    href: '/projekte',
    sections: [
      {
        label: 'Workspace',
        links: [
          { label: 'Scanner', href: '/scanner' },
          { label: 'Projekte', href: '/projekte' },
          { label: 'Tool Hub', href: '/tools' },
          { label: 'Preise und Add-ons', href: '/preise' },
        ],
      },
    ],
  },
};

export const MORE_NAV_SECTIONS: NavigationFlyoutSection[] = [
  {
    label: 'Hauptkategorien',
    links: [
      { label: 'SEO', href: '/tools/seo' },
      { label: 'KI', href: '/tools/ki' },
      { label: 'Traffic & Markt', href: '/tools/traffic-markt' },
      { label: 'Local', href: '/tools/local' },
      { label: 'Content', href: '/tools/content' },
      { label: 'Social', href: '/tools/social' },
      { label: 'Anzeigen', href: '/tools/anzeigen' },
      { label: 'KI-PR', href: '/tools/ki-pr' },
      { label: 'Berichte', href: '/tools/berichte' },
    ],
  },
  {
    label: 'Plattform',
    links: [
      { label: 'Scanner', href: '/scanner' },
      { label: 'Projekte', href: '/projekte' },
      { label: 'Security & DSGVO', href: '/tools/security-dsgvo' },
      { label: 'Performance & Technik', href: '/tools/performance-technik' },
      { label: 'Preise und Add-ons', href: '/preise' },
    ],
  },
];
