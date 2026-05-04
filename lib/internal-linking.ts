import type { LinkOccurrence } from '@/types/audit';
import type { DataSourceType } from '@/types/data-source';

export interface InternalLinkReference extends LinkOccurrence {
  sourceUrl: string;
  targetUrl: string;
  sourceNormalized: string;
  targetNormalized: string;
  anchorText: string;
  anchorSourceType: DataSourceType;
}

export interface LinkGraphNode {
  url: string;
  normalizedUrl: string;
  title?: string;
  h1?: string;
  h2: string[];
  textBasis: string;
  inlinks: InternalLinkReference[];
  outlinks: InternalLinkReference[];
  externalLinks: string[];
  crawlDepth: number | null;
  isOrphan: boolean;
  isMoneyPage: boolean;
  importanceScore: number;
}

export interface LinkOpportunity {
  sourceUrl: string;
  targetUrl: string;
  suggestedAnchor: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  confidence: number;
  sourceType: DataSourceType;
  existingLink: boolean;
}

export interface TopicHub {
  topic: string;
  hubUrl?: string;
  urls: string[];
  orphanCount: number;
  averageInlinks: number;
}

export interface AnchorTextSuggestion {
  sourceUrl: string;
  targetUrl: string;
  suggestedAnchor: string;
  existingAnchors: string[];
  reason: string;
  confidence: number;
  sourceType: DataSourceType;
}

export interface CrossLinkMatrixCell {
  sourceUrl: string;
  targetUrl: string;
  existingLink: boolean;
  opportunity: boolean;
  suggestedAnchor?: string;
  priority?: LinkOpportunity['priority'];
  confidence?: number;
}

export interface InternalLinkingAnalysis {
  graph: LinkGraphNode[];
  opportunities: LinkOpportunity[];
  topicHubs: TopicHub[];
  orphanPages: LinkGraphNode[];
  existingLinks: InternalLinkReference[];
  anchorSuggestions: AnchorTextSuggestion[];
  lowInlinkTargets: LinkGraphNode[];
  matrixPages: LinkGraphNode[];
  matrix: CrossLinkMatrixCell[][];
}

const STOP_WORDS = new Set([
  'aber', 'alle', 'auch', 'auf', 'aus', 'bei', 'das', 'den', 'der', 'die', 'ein', 'eine', 'für', 'mit',
  'nicht', 'oder', 'sich', 'und', 'von', 'wie', 'wir', 'you', 'your', 'the', 'and', 'for', 'with',
]);

export function normalizeUrlForGraph(url: string) {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    parsed.search = '';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return String(url || '').replace(/\/$/, '');
  }
}

function words(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\wäöüß\s-]/gi, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word));
}

function tokenize(value: string) {
  return new Set(words(value));
}

function overlapScore(a: string, b: string) {
  const left = tokenize(a);
  const right = tokenize(b);
  if (left.size === 0 || right.size === 0) return 0;
  let overlap = 0;
  left.forEach((word) => {
    if (right.has(word)) overlap++;
  });
  return overlap / Math.min(left.size, right.size);
}

function pathLabel(url: string) {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    return (parts.at(-1) || parts.at(0) || 'startseite').replace(/[-_]/g, ' ');
  } catch {
    return url;
  }
}

function inferAnchor(target: Pick<LinkGraphNode, 'h1' | 'title' | 'url'>) {
  if (target.h1 && target.h1.length <= 80) return target.h1;
  if (target.title && target.title.length <= 80) return target.title;
  return pathLabel(target.url);
}

function pageTextBasis(page: any) {
  const headings = page.headings || { h1: [], h2: [] };
  return (
    page.textBasis ||
    [page.title, headings.h1?.join(' '), headings.h2?.join(' '), page.strippedContent?.slice(0, 500)]
      .filter(Boolean)
      .join('\n')
  ).trim();
}

function pageLinks(page: any) {
  return page.internalLinks || page.links || [];
}

function linkDetailsForPage(page: any, sourceUrl: string): InternalLinkReference[] {
  const details = Array.isArray(page.internalLinkDetails) ? page.internalLinkDetails : [];
  if (details.length > 0) {
    return details.map((detail: LinkOccurrence) => ({
      ...detail,
      sourceUrl,
      targetUrl: detail.normalizedHref || detail.href,
      sourceNormalized: normalizeUrlForGraph(sourceUrl),
      targetNormalized: normalizeUrlForGraph(detail.normalizedHref || detail.href),
      anchorText: detail.text || detail.ariaLabel || detail.title || pathLabel(detail.normalizedHref || detail.href),
      anchorSourceType: detail.text || detail.ariaLabel || detail.title ? 'real' : 'heuristic',
    }));
  }

  return pageLinks(page).map((url: string) => ({
    href: url,
    normalizedHref: url,
    text: '',
    sourceUrl,
    targetUrl: url,
    sourceNormalized: normalizeUrlForGraph(sourceUrl),
    targetNormalized: normalizeUrlForGraph(url),
    anchorText: pathLabel(url),
    anchorSourceType: 'heuristic',
  }));
}

function calculateDepth(startUrl: string, pages: any[]) {
  const normalizedStart = normalizeUrlForGraph(startUrl);
  const adjacency = new Map<string, string[]>();
  pages.forEach((page) => {
    adjacency.set(normalizeUrlForGraph(page.url), pageLinks(page).map((link: string) => normalizeUrlForGraph(link)));
  });

  const depth = new Map<string, number>([[normalizedStart, 0]]);
  const queue = [normalizedStart];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDepth = depth.get(current) || 0;
    (adjacency.get(current) || []).forEach((target) => {
      if (!depth.has(target) && adjacency.has(target)) {
        depth.set(target, currentDepth + 1);
        queue.push(target);
      }
    });
  }
  return depth;
}

function moneyPageSet(report: any) {
  const marked = report?.moneyPages || report?.markedMoneyPages || report?.importantUrls || [];
  return new Set((Array.isArray(marked) ? marked : []).map((url: string) => normalizeUrlForGraph(url)));
}

function collectPages(report: any) {
  const crawlPages = report?.crawlSummary?.scannedSubpages || [];
  const snapshotPages = report?.urlSnapshots || [];
  const pagesByUrl = new Map<string, any>();

  [...crawlPages, ...snapshotPages].forEach((page: any) => {
    if (page?.url) pagesByUrl.set(normalizeUrlForGraph(page.url), page);
  });

  if (report?.url && !pagesByUrl.has(normalizeUrlForGraph(report.url))) {
    pagesByUrl.set(normalizeUrlForGraph(report.url), {
      url: report.url,
      title: report.title,
      headings: report.headings,
      links: report.crawlSummary?.crawledUrls || [],
      textBasis: [report.title, report.headings?.h1?.join(' '), report.headings?.h2?.join(' '), report.bodyText?.slice(0, 500)].filter(Boolean).join('\n'),
    });
  }

  return Array.from(pagesByUrl.values());
}

export function buildInternalLinkGraph(report: any): LinkGraphNode[] {
  const pages = collectPages(report);
  const depth = calculateDepth(report?.url || pages[0]?.url || '', pages);
  const moneyPages = moneyPageSet(report);
  const nodesByUrl = new Map<string, LinkGraphNode>();

  pages.forEach((page) => {
    const normalized = normalizeUrlForGraph(page.url);
    const headings = page.headings || { h1: [], h2: [] };
    nodesByUrl.set(normalized, {
      url: page.url,
      normalizedUrl: normalized,
      title: page.title,
      h1: headings.h1?.[0],
      h2: headings.h2 || [],
      textBasis: pageTextBasis(page),
      inlinks: [],
      outlinks: linkDetailsForPage(page, page.url),
      externalLinks: page.externalLinks || [],
      crawlDepth: depth.get(normalized) ?? null,
      isOrphan: false,
      isMoneyPage: Boolean(page.isMoneyPage || moneyPages.has(normalized)),
      importanceScore: 0,
    });
  });

  nodesByUrl.forEach((node) => {
    node.outlinks.forEach((link) => {
      nodesByUrl.get(link.targetNormalized)?.inlinks.push(link);
    });
  });

  nodesByUrl.forEach((node) => {
    node.isOrphan = node.crawlDepth !== 0 && node.inlinks.length === 0;
    node.importanceScore =
      node.inlinks.length * 2 +
      node.outlinks.length +
      (node.crawlDepth === 0 ? 10 : 0) +
      (node.isMoneyPage ? 15 : 0);
  });

  return Array.from(nodesByUrl.values()).sort((a, b) => a.url.localeCompare(b.url));
}

function reasonForOpportunity(target: LinkGraphNode, similarity: number) {
  if (target.isOrphan) return 'Zielseite ist im Crawl als Orphan erkannt und passt thematisch zur Quellseite.';
  if (target.isMoneyPage) return 'Markierte Money Page hat thematische Nähe und kann interne Linkstärke gebrauchen.';
  if (target.inlinks.length <= 1) return 'Zielseite hat wenige interne Inlinks und thematische Nähe zur Quellseite.';
  return `Thematische Nähe erkannt (${Math.round(similarity * 100)}%).`;
}

function priorityFor(confidence: number, target: LinkGraphNode): LinkOpportunity['priority'] {
  if (target.isOrphan || target.isMoneyPage || confidence >= 0.55) return 'high';
  if (confidence >= 0.34 || target.inlinks.length <= 1) return 'medium';
  return 'low';
}

export function findLinkOpportunities(report: any): LinkOpportunity[] {
  const graph = buildInternalLinkGraph(report);
  const opportunities: LinkOpportunity[] = [];

  graph.forEach((source) => {
    const sourceLinks = new Set(source.outlinks.map((link) => link.targetNormalized));
    graph.forEach((target) => {
      if (source.normalizedUrl === target.normalizedUrl) return;
      const existingLink = sourceLinks.has(target.normalizedUrl);
      const similarity = overlapScore(source.textBasis, target.textBasis);
      const lowInlinkBoost = target.inlinks.length === 0 ? 0.22 : target.inlinks.length === 1 ? 0.12 : 0;
      const moneyBoost = target.isMoneyPage ? 0.12 : 0;
      const depthPenalty = target.crawlDepth !== null && target.crawlDepth > 3 ? -0.04 : 0;
      const confidence = Math.max(0, Math.min(0.95, similarity + lowInlinkBoost + moneyBoost + depthPenalty));
      if (existingLink || confidence < 0.18) return;

      opportunities.push({
        sourceUrl: source.url,
        targetUrl: target.url,
        suggestedAnchor: inferAnchor(target),
        reason: reasonForOpportunity(target, similarity),
        priority: priorityFor(confidence, target),
        confidence: Number(confidence.toFixed(2)),
        sourceType: 'heuristic',
        existingLink,
      });
    });
  });

  return opportunities
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 150);
}

function topicKey(page: LinkGraphNode) {
  try {
    const firstSegment = new URL(page.url).pathname.split('/').filter(Boolean)[0];
    if (firstSegment) return firstSegment.replace(/[-_]/g, ' ');
  } catch {
    // Fall back to title terms when a legacy report contains a malformed URL.
  }
  return words([page.h1, page.title].filter(Boolean).join(' '))[0] || 'root';
}

function buildTopicHubs(graph: LinkGraphNode[]): TopicHub[] {
  const groups = new Map<string, LinkGraphNode[]>();
  graph.forEach((page) => {
    const key = topicKey(page);
    groups.set(key, [...(groups.get(key) || []), page]);
  });

  return Array.from(groups.entries())
    .map(([topic, pages]) => {
      const hub = [...pages].sort((a, b) => b.importanceScore - a.importanceScore)[0];
      return {
        topic,
        hubUrl: hub?.url,
        urls: pages.map((page) => page.url),
        orphanCount: pages.filter((page) => page.isOrphan).length,
        averageInlinks: Number((pages.reduce((sum, page) => sum + page.inlinks.length, 0) / pages.length).toFixed(1)),
      };
    })
    .sort((a, b) => b.urls.length - a.urls.length || b.orphanCount - a.orphanCount);
}

function buildAnchorSuggestions(graph: LinkGraphNode[], opportunities: LinkOpportunity[]): AnchorTextSuggestion[] {
  const nodesByUrl = new Map(graph.map((node) => [node.normalizedUrl, node]));
  return opportunities.slice(0, 80).map((opportunity) => {
    const target = nodesByUrl.get(normalizeUrlForGraph(opportunity.targetUrl));
    const existingAnchors = Array.from(new Set((target?.inlinks || []).map((link) => link.anchorText).filter(Boolean))).slice(0, 5);
    return {
      sourceUrl: opportunity.sourceUrl,
      targetUrl: opportunity.targetUrl,
      suggestedAnchor: opportunity.suggestedAnchor,
      existingAnchors,
      reason: existingAnchors.length > 0 ? 'Vorschlag orientiert sich an echten bestehenden Anchor-Texten und Seitentitel.' : 'Vorschlag nutzt H1, Title oder URL-Pfad der Zielseite.',
      confidence: opportunity.confidence,
      sourceType: 'heuristic',
    };
  });
}

function buildMatrix(graph: LinkGraphNode[], opportunities: LinkOpportunity[], limit = 10) {
  const matrixPages = [...graph]
    .sort((a, b) => b.importanceScore - a.importanceScore || a.url.localeCompare(b.url))
    .slice(0, limit);
  const opportunitiesByPair = new Map(opportunities.map((item) => [`${normalizeUrlForGraph(item.sourceUrl)}|${normalizeUrlForGraph(item.targetUrl)}`, item]));

  const matrix = matrixPages.map((source) => {
    const existingTargets = new Set(source.outlinks.map((link) => link.targetNormalized));
    return matrixPages.map((target) => {
      const opportunity = opportunitiesByPair.get(`${source.normalizedUrl}|${target.normalizedUrl}`);
      return {
        sourceUrl: source.url,
        targetUrl: target.url,
        existingLink: source.normalizedUrl !== target.normalizedUrl && existingTargets.has(target.normalizedUrl),
        opportunity: Boolean(opportunity),
        suggestedAnchor: opportunity?.suggestedAnchor,
        priority: opportunity?.priority,
        confidence: opportunity?.confidence,
      };
    });
  });

  return { matrixPages, matrix };
}

export function analyzeInternalLinking(report: any): InternalLinkingAnalysis {
  const graph = buildInternalLinkGraph(report);
  const opportunities = findLinkOpportunities(report);
  const existingLinks = graph.flatMap((node) => node.outlinks.filter((link) => graph.some((target) => target.normalizedUrl === link.targetNormalized)));
  const topicHubs = buildTopicHubs(graph);
  const orphanPages = graph.filter((page) => page.isOrphan);
  const lowInlinkTargets = graph
    .filter((page) => page.crawlDepth !== 0 && page.inlinks.length <= 1)
    .sort((a, b) => a.inlinks.length - b.inlinks.length || b.importanceScore - a.importanceScore);
  const anchorSuggestions = buildAnchorSuggestions(graph, opportunities);
  const { matrixPages, matrix } = buildMatrix(graph, opportunities);

  return { graph, opportunities, topicHubs, orphanPages, existingLinks, anchorSuggestions, lowInlinkTargets, matrixPages, matrix };
}

export function internalLinkingCsv(report: any) {
  const rows = [
    ['sourceUrl', 'targetUrl', 'suggestedAnchor', 'reason', 'priority', 'confidence', 'sourceType', 'existingLink'],
    ...findLinkOpportunities(report).map((item) => [
      item.sourceUrl,
      item.targetUrl,
      item.suggestedAnchor,
      item.reason,
      item.priority,
      String(item.confidence),
      item.sourceType,
      String(item.existingLink),
    ]),
  ];
  return rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
}
