import type { AiCrawlerAccessCheck, AiCrawlerBot, AiVisibilityCheckSet, AiVisibilitySignalCheck } from '@/types/ai-visibility';

const AI_CRAWLERS: Array<{ bot: AiCrawlerBot; label: string }> = [
  { bot: 'GPTBot', label: 'GPTBot' },
  { bot: 'OAI-SearchBot', label: 'OAI-SearchBot' },
  { bot: 'Google-Extended', label: 'Google-Extended' },
  { bot: 'PerplexityBot', label: 'PerplexityBot' },
];

type RobotsGroup = {
  agents: string[];
  disallow: string[];
  allow: string[];
};

function parseRobotsGroups(robotsTxt: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;

  robotsTxt.split('\n').forEach((rawLine) => {
    const line = rawLine.split('#')[0].trim();
    if (!line) return;
    const separator = line.indexOf(':');
    if (separator === -1) return;

    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    const normalizedValue = value.toLowerCase();

    if (key === 'user-agent') {
      if (!current || current.disallow.length > 0 || current.allow.length > 0) {
        current = { agents: [], disallow: [], allow: [] };
        groups.push(current);
      }
      current.agents.push(normalizedValue);
    }

    if (key === 'disallow' && current) current.disallow.push(normalizedValue);
    if (key === 'allow' && current) current.allow.push(normalizedValue);
  });

  return groups;
}

function rootBlockedRule(robotsTxt: string, botName: AiCrawlerBot) {
  const bot = botName.toLowerCase();
  const groups = parseRobotsGroups(robotsTxt);
  const matchingGroups = groups.filter((group) => group.agents.some((agent) => agent === '*' || agent === bot));

  for (const group of matchingGroups) {
    const hasRootAllow = group.allow.some((rule) => rule === '/' || rule === '/*');
    if (hasRootAllow) return null;
    const blockedRule = group.disallow.find((rule) => rule === '/' || rule === '/*');
    if (blockedRule) return `Disallow: ${blockedRule}`;
  }

  return null;
}

function crawlerAccess(robotsTxt: string): AiCrawlerAccessCheck[] {
  return AI_CRAWLERS.map(({ bot, label }) => {
    const blockedRule = rootBlockedRule(robotsTxt, bot);
    return {
      bot,
      label,
      status: blockedRule ? 'blocked' : 'allowed',
      rule: blockedRule || 'Kein robots.txt Vollblock erkannt',
      sourceType: 'heuristic',
      confidence: robotsTxt ? 0.9 : 0.65,
    };
  });
}

function signalCheck(params: {
  key: string;
  label: string;
  signals: string[];
  missing: string[];
  confidence: number;
}): AiVisibilitySignalCheck {
  return {
    key: params.key,
    label: params.label,
    status: params.missing.length > 0 ? 'warning' : 'ok',
    signals: params.signals,
    missing: params.missing,
    sourceType: 'heuristic',
    confidence: params.confidence,
  };
}

function hasPattern(value: string, pattern: RegExp) {
  return pattern.test(value);
}

export function evaluateAiVisibilityChecks(params: {
  root: any;
  html: string;
  robotsTxt: string;
  title?: string;
  metaDescription?: string;
}) : AiVisibilityCheckSet {
  const root = params.root;
  const html = params.html || '';
  const title = params.title || '';
  const metaDescription = params.metaDescription || '';
  const anchorTexts = root.querySelectorAll('a[href]').map((link: any) => `${link.text || ''} ${link.getAttribute('href') || ''}`.toLowerCase());
  const jsonLd = root.querySelectorAll('script[type="application/ld+json"]').map((node: any) => node.text || '').join('\n');
  const headings = {
    h1: root.querySelectorAll('h1').map((node: any) => node.text?.trim()).filter(Boolean),
    h2: root.querySelectorAll('h2').map((node: any) => node.text?.trim()).filter(Boolean),
  };

  const hasOrganizationSchema = hasPattern(jsonLd, /"@type"\s*:\s*"?(?:Organization|LocalBusiness|Corporation|ProfessionalService)"?/i);
  const hasLogoSchema = hasPattern(jsonLd, /"logo"\s*:/i);
  const hasContactSchema = hasPattern(jsonLd, /"contactPoint"\s*:/i);
  const hasSameAs = hasPattern(jsonLd, /"sameAs"\s*:/i) || root.querySelectorAll('a[rel~="me"]').length > 0;
  const hasAbout = anchorTexts.some((text: string) => text.includes('about') || text.includes('ueber') || text.includes('über') || text.includes('\u00fcber') || text.includes('unternehmen'));
  const hasContact = anchorTexts.some((text: string) => text.includes('kontakt') || text.includes('contact'));
  const hasImpressum = anchorTexts.some((text: string) => text.includes('impressum'));
  const hasPrivacy = anchorTexts.some((text: string) => text.includes('datenschutz') || text.includes('privacy'));
  const hasFaq = hasPattern(html, /faq|fragen|schema.org\/FAQPage/i);
  const hasDefinition = hasPattern(html, /definition|was ist|was sind|bedeutet|glossar/i);
  const hasHowTo = hasPattern(html, /howto|how-to|anleitung|schritt|schema.org\/HowTo/i);
  const hasReadableTitle = title.trim().length >= 10;
  const hasReadableMeta = metaDescription.trim().length >= 50;
  const hasHeadingStructure = headings.h1.length === 1 && headings.h2.length > 0;
  const hasEntityBasics = hasReadableTitle && hasAbout && hasContact && hasImpressum;

  return {
    sourceType: 'heuristic',
    crawlerAccess: crawlerAccess(params.robotsTxt || ''),
    organizationSchema: signalCheck({
      key: 'organization_schema',
      label: 'Organization Schema Check',
      signals: [
        ...(hasOrganizationSchema ? ['Organization/LocalBusiness Schema'] : []),
        ...(hasLogoSchema ? ['Logo Schema'] : []),
        ...(hasContactSchema ? ['ContactPoint Schema'] : []),
      ],
      missing: [
        ...(!hasOrganizationSchema ? ['Organization oder LocalBusiness Schema'] : []),
        ...(!hasLogoSchema ? ['Logo im Schema'] : []),
        ...(!hasContactSchema ? ['ContactPoint im Schema'] : []),
      ],
      confidence: 0.82,
    }),
    sameAsLinks: signalCheck({
      key: 'same_as_links',
      label: 'SameAs Links Check',
      signals: hasSameAs ? ['sameAs oder rel=me erkannt'] : [],
      missing: hasSameAs ? [] : ['sameAs Profile oder rel=me Links'],
      confidence: 0.76,
    }),
    aboutContactImpressum: signalCheck({
      key: 'about_contact_impressum',
      label: 'About/Kontakt/Impressum Struktur',
      signals: [
        ...(hasAbout ? ['About/Über-Seite verlinkt'] : []),
        ...(hasContact ? ['Kontakt verlinkt'] : []),
        ...(hasImpressum ? ['Impressum verlinkt'] : []),
        ...(hasPrivacy ? ['Datenschutz verlinkt'] : []),
      ],
      missing: [
        ...(!hasAbout ? ['About/Über-Seite'] : []),
        ...(!hasContact ? ['Kontakt-Seite'] : []),
        ...(!hasImpressum ? ['Impressum'] : []),
      ],
      confidence: 0.78,
    }),
    brandEntity: signalCheck({
      key: 'brand_entity',
      label: 'Brand Entity Audit',
      signals: [
        ...(hasReadableTitle ? ['Klarer Title'] : []),
        ...(hasOrganizationSchema ? ['Organization Schema'] : []),
        ...(hasSameAs ? ['SameAs Profile'] : []),
        ...(hasEntityBasics ? ['DACH-Vertrauensstruktur'] : []),
      ],
      missing: [
        ...(!hasReadableTitle ? ['Aussagekräftiger Title'] : []),
        ...(!hasOrganizationSchema ? ['Organization Schema'] : []),
        ...(!hasSameAs ? ['SameAs Profile'] : []),
        ...(!hasEntityBasics ? ['About/Kontakt/Impressum als Entity-Signale'] : []),
      ],
      confidence: 0.72,
    }),
    snippetReadiness: signalCheck({
      key: 'ai_snippet_readiness',
      label: 'AI Snippet Readiness',
      signals: [
        ...(hasReadableTitle ? ['Title nutzbar'] : []),
        ...(hasReadableMeta ? ['Meta Description nutzbar'] : []),
        ...(hasHeadingStructure ? ['H1/H2-Struktur'] : []),
        ...(hasFaq || hasDefinition || hasHowTo ? ['Antwortformat erkannt'] : []),
      ],
      missing: [
        ...(!hasReadableTitle ? ['Klarer Seitentitel'] : []),
        ...(!hasReadableMeta ? ['Beschreibende Meta Description'] : []),
        ...(!hasHeadingStructure ? ['Eine H1 plus H2-Struktur'] : []),
        ...(!(hasFaq || hasDefinition || hasHowTo) ? ['FAQ/Definition/HowTo Antwortformat'] : []),
      ],
      confidence: 0.7,
    }),
    faqDefinitionHowTo: signalCheck({
      key: 'faq_definition_howto',
      label: 'FAQ/Definition/HowTo Eignung',
      signals: [
        ...(hasFaq ? ['FAQ-Signale'] : []),
        ...(hasDefinition ? ['Definition-Signale'] : []),
        ...(hasHowTo ? ['HowTo/Anleitungs-Signale'] : []),
      ],
      missing: hasFaq || hasDefinition || hasHowTo ? [] : ['FAQ, Definition oder HowTo-Struktur'],
      confidence: 0.68,
    }),
    aiOverviewTracking: {
      key: 'ai_overview_tracking',
      label: 'AI Overview Tracking',
      status: 'unavailable',
      sourceType: 'unavailable',
      provider: 'SERP Provider später',
    },
    promptMonitoring: {
      key: 'prompt_monitoring',
      label: 'Prompt Monitoring',
      status: 'unavailable',
      sourceType: 'unavailable',
      provider: 'AI Visibility Provider später',
    },
  };
}
