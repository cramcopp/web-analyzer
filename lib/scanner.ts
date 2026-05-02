import { parse } from 'node-html-parser';
import { 
  ScanOptions, 
  AnalysisResult, 
  LighthouseScores, 
  PsiMetrics, 
  SslCertificateData, 
  SubpageResult 
} from './scanner/types';
import { calculateIssueScores } from './audit/score-engine';
import { evaluateAiVisibilityChecks } from './ai-visibility';
import { getCrawlLimit } from './plans';
import { getProviderAvailability, getProviderStatuses } from './providers';
import type { AuditCategory, AuditIssue, AuditSeverity, EvidenceArtifact, LinkOccurrence, UrlSnapshot } from '@/types/audit';
import type { AiVisibilityCheckSet } from '@/types/ai-visibility';
import type { DataSourceMap, DataSourceType } from '@/types/data-source';

export type { 
  ScanOptions, 
  AnalysisResult, 
  LighthouseScores, 
  PsiMetrics, 
  SslCertificateData, 
  SubpageResult 
};

// --- CONFIG & UTILS ---

const STEALTH_CONFIG = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  }
};

const RULE_VERSION = 'audit-rules-v1';

function nowIso() {
  return new Date().toISOString();
}

function createScanId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `scan_${Date.now().toString(36)}`;
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function stableId(prefix: string, ...parts: string[]) {
  return `${prefix}_${stableHash(parts.join('|'))}`;
}

function clampConfidence(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function normalizeUrl(url: string, base: string): string | null {
  try {
    const absolute = new URL(url, base);
    absolute.hash = ''; // Remove fragments
    return absolute.toString();
  } catch { return null; }
}

export function isSameBaseDomain(host1: string, host2: string): boolean {
  const getBase = (h: string) => h.replace(/^www\./, '').toLowerCase();
  return getBase(host1) === getBase(host2);
}

export function stripHtmlForAi(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractLinkData(root: any, url: string) {
  const links = root.querySelectorAll('a[href]');
  const internal = new Set<string>();
  const external = new Set<string>();
  const internalDetails: LinkOccurrence[] = [];
  const externalDetails: LinkOccurrence[] = [];
  const origin = new URL(url).origin;
  const domain = new URL(url).hostname;

  links.forEach((link: any) => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || /^(?:mailto|tel|javascript):/i.test(href)) return;

    const norm = normalizeUrl(href, origin);
    if (!norm) return;

    try {
      const detail: LinkOccurrence = {
        href,
        normalizedHref: norm,
        text: (link.text || '').replace(/\s+/g, ' ').trim(),
        title: link.getAttribute('title') || undefined,
        ariaLabel: link.getAttribute('aria-label') || undefined,
        rel: link.getAttribute('rel') || undefined,
        target: link.getAttribute('target') || undefined,
      };
      if (isSameBaseDomain(new URL(norm).hostname, domain)) {
        internal.add(norm);
        internalDetails.push(detail);
      } else {
        external.add(norm);
        externalDetails.push(detail);
      }
    } catch {
      // Ignore malformed links during crawl extraction.
    }
  });

  return { internal: Array.from(internal), external: Array.from(external), internalDetails, externalDetails };
}

function buildTextBasis(page: {
  title?: string;
  headings?: { h1?: string[]; h2?: string[] };
  strippedContent?: string;
}) {
  return [
    page.title || '',
    ...(page.headings?.h1 || []),
    ...(page.headings?.h2 || []),
    (page.strippedContent || '').slice(0, 500),
  ]
    .filter(Boolean)
    .join('\n')
    .trim();
}

// FIX: Rekursiver Sitemap-Scanner!
async function getAllUrlsBeforeCrawl(origin: string, robotsTxt: string): Promise<string[]> {
  const sitemaps: string[] = [];
  robotsTxt.split('\n').forEach(line => {
    if (line.toLowerCase().startsWith('sitemap:')) {
      sitemaps.push(line.split(/sitemap:/i)[1].trim());
    }
  });

  if (sitemaps.length === 0) sitemaps.push(`${origin}/sitemap.xml`);

  const urls = new Set<string>();
  const visitedSitemaps = new Set<string>();

  async function fetchSitemap(sitemapUrl: string) {
    if (visitedSitemaps.has(sitemapUrl)) return;
    visitedSitemaps.add(sitemapUrl);
    try {
      const res = await fetch(sitemapUrl, { ...STEALTH_CONFIG, signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const text = await res.text();
        const matches = text.match(/<loc>(.*?)<\/loc>/g);
        if (matches) {
          for (const m of matches) {
            const u = m.replace(/<\/?loc>/g, '').trim();
            if (u.endsWith('.xml')) {
              // Es ist ein Sitemap-Index! Rekursiv weitergraben.
              await fetchSitemap(u);
            } else {
              urls.add(u);
            }
          }
        }
      }
    } catch {
      // Missing or blocked sitemap files are represented by an empty sitemap list.
    }
  }

  // Alle gefundenen Start-Sitemaps abklappern
  for (const sm of sitemaps) {
    await fetchSitemap(sm);
  }
  return Array.from(urls);
}

function isAllowedByRobots(robotsTxt: string, path: string): boolean {
  // Minimal robots.txt logic
  const lines = robotsTxt.split('\n');
  let userAgentApplies = true;
  for (const line of lines) {
    const l = line.toLowerCase().trim();
    if (l.startsWith('user-agent:')) {
      const ua = l.split(':')[1].trim();
      userAgentApplies = (ua === '*' || ua === 'webanalyzer');
    }
    if (userAgentApplies && l.startsWith('disallow:')) {
      const dis = l.split(':')[1].trim();
      if (dis && path.startsWith(dis)) return false;
    }
  }
  return true;
}

function isSoft404(text: string): boolean {
  const indicators = ['page not found', 'seite nicht gefunden', '404 -', 'error 404'];
  const low = text.toLowerCase();
  return indicators.some(i => low.includes(i)) && text.length < 1000;
}

export function checkIndexability(
  url: string, 
  status: number, 
  robotsMeta: string, 
  xRobots: string, 
  contentType: string, 
  text: string, 
  robotsTxtContent: string, 
  can: string | null, 
  hasNextPrev: boolean = false
) {
  if (status >= 400) return { isIndexable: false, reason: `HTTP ${status}` };
  if (contentType && !contentType.includes('text/html')) return { isIndexable: false, reason: "Non-HTML Content" };
  
  const robots = (robotsMeta + ',' + xRobots).toLowerCase();
  if (robots.includes('noindex')) return { isIndexable: false, reason: "Meta Noindex" };

  try {
    const urlObj = new URL(url);
    if (!isAllowedByRobots(robotsTxtContent, urlObj.pathname + urlObj.search)) {
      return { isIndexable: false, reason: "robots.txt Disallow" };
    }
  } catch {
    // Malformed URLs are treated as non-blocked by this minimal robots check.
  }

  if (isSoft404(text)) return { isIndexable: false, reason: "Soft-404 Detection" };
  if (!can || can.trim() === '') return { isIndexable: true, reason: "OK (No Canonical)" };

  try {
    const clean = (u: string) => u.replace(/^https?:\/\/(www\.)?/, '').split('?')[0].replace(/\/$/, '');
    const absoluteCanonical = new URL(can, url).href;
    if (clean(url) === clean(absoluteCanonical)) return { isIndexable: true, reason: "OK (Canonical Match)" };
    if (url.includes('?') && hasNextPrev) return { isIndexable: true, reason: "OK (Pagination Exception)" };
    return { isIndexable: false, reason: `Canonical Mismatch` };
  } catch {
    return { isIndexable: true, reason: "OK (Broken Canonical fallback)" };
  }
}


// --- MAIN ANALYZER ---

export const scanSubpage = async (subUrl: string, domain: string, robotsTxtContent: string = ''): Promise<SubpageResult & { isIndexable?: boolean }> => {
    try {
      const subRes = await fetch(subUrl, { ...STEALTH_CONFIG, signal: AbortSignal.timeout(10000) });
      if (subRes.status >= 300 && subRes.status < 400) {
        return { error: false, url: subUrl, urlObj: subUrl, status: subRes.status, links: [], internalLinkDetails: [], externalLinkDetails: [], xRobotsTag: subRes.headers.get('X-Robots-Tag') || '', redirectLocation: subRes.headers.get('location') || '', headers: Object.fromEntries(subRes.headers.entries()) };
      }
      if (!subRes.ok) return { error: true, url: subUrl, status: subRes.status };
      
      const subContentType = subRes.headers.get('content-type') || '';
      if (subContentType && !subContentType.toLowerCase().includes('text/html')) {
        return { error: false, url: subUrl, urlObj: subUrl, status: subRes.status, contentType: subContentType, title: 'Media/Document', links: [], externalLinks: [], internalLinkDetails: [], externalLinkDetails: [], strippedContent: '', xRobotsTag: subRes.headers.get('X-Robots-Tag') || '', hasNextPrev: false, headers: Object.fromEntries(subRes.headers.entries()) };
      }

      const headers = Object.fromEntries(subRes.headers.entries());
      const subHtml = await subRes.text();
      const subRoot = parse(subHtml);
      const linkData = extractLinkData(subRoot, subUrl);
      const strippedContent = stripHtmlForAi(subHtml).replace(/\s+/g, ' ').trim().slice(0, 15000);
      const headings = {
        h1: subRoot.querySelectorAll('h1').map(el => el.text.trim()),
        h2: subRoot.querySelectorAll('h2').map(el => el.text.trim()),
        h3: subRoot.querySelectorAll('h3').map(el => el.text.trim())
      };
      const images = subRoot.querySelectorAll('img').map(img => ({
        src: img.getAttribute('src') || '', alt: img.getAttribute('alt') || ''
      }));

      const subResult: SubpageResult = {
        error: false, url: subUrl, urlObj: subUrl,
        title: subRoot.querySelector('title')?.text.trim() || '',
        metaDescription: subRoot.querySelector('meta[name="description"]')?.getAttribute('content') || '',
        robots: subRoot.querySelector('meta[name="robots"]')?.getAttribute('content') || 'index, follow',
        canonical: subRoot.querySelector('link[rel="canonical"]')?.getAttribute('href') || '',
        h1Count: subRoot.querySelectorAll('h1').length, status: subRes.status,
        contentType: subContentType, strippedContent, links: linkData.internal, externalLinks: linkData.external,
        internalLinkDetails: linkData.internalDetails, externalLinkDetails: linkData.externalDetails,
        xRobotsTag: subRes.headers.get('X-Robots-Tag') || '',
        hasNextPrev: !!(subRoot.querySelector('link[rel="next"]') || subRoot.querySelector('link[rel="prev"]')),
        headings,
        images,
        imagesWithoutAlt: images.filter(img => !img.alt || img.alt.trim() === '').length,
        headers,
        htmlLang: subRoot.querySelector('html')?.getAttribute('lang') || '',
      };

      const indexCheck = checkIndexability(subUrl, subRes.status, subResult.robots || '', subResult.xRobotsTag || '', subContentType, strippedContent, robotsTxtContent, subResult.canonical || null, subResult.hasNextPrev);
      return { ...subResult, isIndexable: indexCheck.isIndexable, indexabilityReason: indexCheck.reason, textBasis: buildTextBasis(subResult) };
    } catch {
      return { error: true, url: subUrl, urlObj: subUrl, status: 'Error' };
    }
};

export const calculateHeuristicScores = (root: any, mainIndex: any, headers: Record<string, string> = {}) => {
    const allImages = root.querySelectorAll('img');
    const imagesTotal = allImages.length;
    const imagesWithoutAlt = allImages.filter((img: any) => !img.getAttribute('alt') || img.getAttribute('alt').trim() === '').length;
    const scripts = root.querySelectorAll('script');
    const blockingScripts = scripts.filter((s: any) => !s.getAttribute('async') && !s.getAttribute('defer') && s.getAttribute('src')).length;
    const totalStylesheets = root.querySelectorAll('link[rel="stylesheet"]').length;

    const calculateMaxDepth = (node: any): number => {
      if (!node.childNodes || node.childNodes.length === 0) return 1;
      let max = 0;
      node.childNodes.forEach((child: any) => {
        if (child.nodeType === 1) max = Math.max(max, calculateMaxDepth(child));
      });
      return 1 + max;
    };
    const maxDomDepth = calculateMaxDepth(root);

    let seo = 50; 
    if (root.querySelector('title')) seo += 10;
    if (root.querySelector('meta[name="description"]')) seo += 10;
    if (root.querySelectorAll('h1').length === 1) seo += 10;
    if (imagesTotal > 0 && imagesWithoutAlt === 0) seo += 10;
    if (mainIndex.isIndexable) seo += 10;

    let performance = 100;
    if (blockingScripts > 3) performance -= 20;
    if (maxDomDepth > 30) performance -= 20;
    if (totalStylesheets > 10) performance -= 20;

    let accessibility = 100;
    if (imagesWithoutAlt > 0) accessibility -= Math.min(30, imagesWithoutAlt * 3);
    if (root.querySelectorAll('h1').length === 0) accessibility -= 10;

    let compliance = 100;
    const htmlText = root.text.toLowerCase();
    if (!htmlText.includes('impressum')) compliance -= 15;
    if (!htmlText.includes('datenschutz') && !htmlText.includes('privacy')) compliance -= 15;

    const csp = headers['content-security-policy'] || '';
    let security = 100;
    if (!csp) security -= 18;
    if (csp && (/unsafe-inline/i.test(csp) || /\*/.test(csp))) security -= 8;
    if (!headers['strict-transport-security']) security -= 16;
    if (!headers['x-content-type-options']) security -= 8;
    if (!headers['referrer-policy']) security -= 6;
    if (!headers['permissions-policy']) security -= 6;
    if (!headers['x-frame-options'] && !/frame-ancestors/i.test(csp)) security -= 8;
    if (headers.server) security -= 3;

    return {
      seo: Math.max(0, Math.min(100, seo)),
      performance: Math.max(0, Math.min(100, performance)),
      security: Math.max(0, Math.min(100, security)),
      accessibility: Math.max(0, Math.min(100, accessibility)),
      compliance: Math.max(0, Math.min(100, compliance))
    };
};

function evidenceId(scanId: string, type: string, url: string) {
  return stableId('evidence', scanId, type, url);
}
function snapshotId(scanId: string, url: string) {
  return stableId('snapshot', scanId, url);
}

function normalizeComparableUrl(url: string, base?: string) {
  try {
    const parsed = base ? new URL(url, base) : new URL(url);
    parsed.hash = '';
    parsed.search = '';
    return parsed.toString().replace(/^https?:\/\/www\./, '').replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
  } catch {
    return url.trim().replace(/\/$/, '').toLowerCase();
  }
}

function makeEvidenceArtifact(type: EvidenceArtifact['type'], url: string, inlineValue: string | undefined, createdAt: string, scanId: string): EvidenceArtifact {
  const value = inlineValue || '';
  return {
    id: evidenceId(scanId, type, url),
    type,
    url,
    inlineValue: value || undefined,
    checksum: value ? stableHash(value) : undefined,
    createdAt,
  };
}

function buildEvidenceArtifacts(scanId: string, pages: any[], robotsTxt: string, sitemapUrls: string[], createdAt: string): EvidenceArtifact[] {
  const artifacts: EvidenceArtifact[] = [];

  for (const page of pages) {
    artifacts.push(makeEvidenceArtifact('headers', page.url, JSON.stringify(page.headers || {}), createdAt, scanId));
    artifacts.push(makeEvidenceArtifact('html', page.url, page.strippedContent?.slice(0, 5000), createdAt, scanId));
  }

  const mainUrl = pages[0]?.url || '';
  artifacts.push(makeEvidenceArtifact('robots_txt', mainUrl, robotsTxt, createdAt, scanId));
  artifacts.push(makeEvidenceArtifact('sitemap', mainUrl, JSON.stringify({ urlsFound: sitemapUrls.length, sampleUrls: sitemapUrls.slice(0, 100) }), createdAt, scanId));

  return artifacts;
}

function buildUrlSnapshots(scanId: string, pages: any[], capturedAt: string): UrlSnapshot[] {
  return pages.map((page) => ({
    id: snapshotId(scanId, page.url),
    scanId,
    url: page.url,
    statusCode: page.status,
    contentType: page.contentType,
    title: page.title,
    metaDescription: page.metaDescription,
    canonical: page.canonical,
    robotsMeta: page.robots,
    xRobotsTag: page.xRobotsTag,
    headers: page.headers || {},
    internalLinks: page.links || [],
    externalLinks: page.externalLinks || [],
    internalLinkDetails: page.internalLinkDetails || [],
    externalLinkDetails: page.externalLinkDetails || [],
    images: (page.images || []).map((image: any) => ({ src: image.src, alt: image.alt || null })),
    headings: page.headings || { h1: [], h2: [], h3: [] },
    textBasis: page.textBasis || buildTextBasis(page),
    capturedAt,
  }));
}

function getHeader(headers: Record<string, string>, name: string) {
  return headers[name.toLowerCase()] || headers[name] || '';
}

function generateAuditIssues(params: {
  scanId: string;
  pages: any[];
  root: any;
  html: string;
  headers: Record<string, string>;
  robotsTxt: string;
  sitemapUrls: string[];
  crawledUrls: string[];
  brokenLinks: { url: string; status: number | string }[];
  mainIndex: { isIndexable: boolean; reason: string };
  maxDomDepth: number;
  blockingScripts: number;
  totalStylesheets: number;
  aiVisibilityChecks: AiVisibilityCheckSet;
  createdAt: string;
}): AuditIssue[] {
  const issues = new Map<string, AuditIssue>();

  const addIssue = (issue: {
    issueType: string;
    category: AuditCategory;
    severity: AuditSeverity;
    confidence: number;
    affectedUrls: string[];
    evidenceRefs: string[];
    title: string;
    description: string;
    fixHint: string;
    businessImpact?: string;
    sourceType: DataSourceType;
  }) => {
    const affectedUrls = Array.from(new Set(issue.affectedUrls.filter(Boolean)));
    const id = stableId('issue', params.scanId, issue.category, issue.issueType, affectedUrls.join(','));
    issues.set(id, {
      id,
      scanId: params.scanId,
      issueType: issue.issueType,
      category: issue.category,
      severity: issue.severity,
      confidence: clampConfidence(issue.confidence),
      affectedUrls,
      evidenceRefs: issue.evidenceRefs,
      ruleVersion: RULE_VERSION,
      title: issue.title,
      description: issue.description,
      fixHint: issue.fixHint,
      businessImpact: issue.businessImpact,
      sourceType: issue.sourceType,
      status: 'new',
      createdAt: params.createdAt,
    });
  };

  const htmlEvidence = (url: string) => evidenceId(params.scanId, 'html', url);
  const headerEvidence = (url: string) => evidenceId(params.scanId, 'headers', url);
  const mainUrl = params.pages[0]?.url || '';
  const crawledSet = new Set(params.crawledUrls.map((url) => normalizeComparableUrl(url)));

  for (const page of params.pages) {
    const isHtml = !page.contentType || String(page.contentType).toLowerCase().includes('text/html');
    if (!isHtml || page.error) continue;

    const title = (page.title || '').trim();
    const metaDescription = (page.metaDescription || '').trim();
    const h1Count = page.h1Count ?? page.headings?.h1?.length ?? 0;
    const imagesWithoutAlt = page.imagesWithoutAlt ?? (page.images || []).filter((image: any) => !image.alt || image.alt.trim() === '').length;
    const robots = `${page.robots || ''},${page.xRobotsTag || ''}`.toLowerCase();
    const wordCount = (page.strippedContent || '').split(/\s+/).filter(Boolean).length;

    if (!title) {
      addIssue({
        issueType: 'missing_title',
        category: 'seo',
        severity: 'high',
        confidence: 1,
        affectedUrls: [page.url],
        evidenceRefs: [htmlEvidence(page.url)],
        title: 'Title Tag fehlt',
        description: 'Die Seite hat keinen auslesbaren HTML Title.',
        fixHint: 'Fuege einen eindeutigen, beschreibenden Title Tag hinzu.',
        sourceType: 'real',
      });
    } else if (title.length < 30) {
      addIssue({
        issueType: 'title_too_short',
        category: 'seo',
        severity: 'low',
        confidence: 0.95,
        affectedUrls: [page.url],
        evidenceRefs: [htmlEvidence(page.url)],
        title: 'Title Tag ist sehr kurz',
        description: `Der Title hat nur ${title.length} Zeichen.`,
        fixHint: 'Erweitere den Title mit konkretem Nutzen, Thema und Brand-Kontext.',
        sourceType: 'real',
      });
    } else if (title.length > 60) {
      addIssue({
        issueType: 'title_too_long',
        category: 'seo',
        severity: 'low',
        confidence: 0.95,
        affectedUrls: [page.url],
        evidenceRefs: [htmlEvidence(page.url)],
        title: 'Title Tag ist lang',
        description: `Der Title hat ${title.length} Zeichen und kann in Suchergebnissen gekuerzt werden.`,
        fixHint: 'Kuerze den Title auf den wichtigsten Suchintent und die zentrale Aussage.',
        sourceType: 'real',
      });
    }

    if (!metaDescription) {
      addIssue({
        issueType: 'missing_meta_description',
        category: 'seo',
        severity: 'medium',
        confidence: 1,
        affectedUrls: [page.url],
        evidenceRefs: [htmlEvidence(page.url)],
        title: 'Meta Description fehlt',
        description: 'Die Seite hat keine Meta Description.',
        fixHint: 'Ergaenze eine klare, handlungsorientierte Beschreibung pro URL.',
        sourceType: 'real',
      });
    } else if (metaDescription.length < 70) {
      addIssue({
        issueType: 'meta_description_too_short',
        category: 'seo',
        severity: 'low',
        confidence: 0.9,
        affectedUrls: [page.url],
        evidenceRefs: [htmlEvidence(page.url)],
        title: 'Meta Description ist kurz',
        description: `Die Meta Description hat nur ${metaDescription.length} Zeichen.`,
        fixHint: 'Beschreibe Nutzen, Thema und naechsten Schritt etwas genauer.',
        sourceType: 'real',
      });
    } else if (metaDescription.length > 160) {
      addIssue({
        issueType: 'meta_description_too_long',
        category: 'seo',
        severity: 'low',
        confidence: 0.9,
        affectedUrls: [page.url],
        evidenceRefs: [htmlEvidence(page.url)],
        title: 'Meta Description ist lang',
        description: `Die Meta Description hat ${metaDescription.length} Zeichen.`,
        fixHint: 'Kuerze die Beschreibung auf die wichtigsten Suchergebnis-Informationen.',
        sourceType: 'real',
      });
    }

    if (h1Count === 0) {
      addIssue({
        issueType: 'missing_h1',
        category: 'seo',
        severity: 'medium',
        confidence: 1,
        affectedUrls: [page.url],
        evidenceRefs: [htmlEvidence(page.url)],
        title: 'H1 fehlt',
        description: 'Die Seite hat keine H1-Ueberschrift.',
        fixHint: 'Setze genau eine gut sichtbare H1, die den Seiteninhalt beschreibt.',
        sourceType: 'real',
      });
    } else if (h1Count > 1) {
      addIssue({
        issueType: 'multiple_h1',
        category: 'seo',
        severity: 'low',
        confidence: 1,
        affectedUrls: [page.url],
        evidenceRefs: [htmlEvidence(page.url)],
        title: 'Mehrere H1-Ueberschriften',
        description: `Die Seite hat ${h1Count} H1-Ueberschriften.`,
        fixHint: 'Nutze eine primaere H1 und strukturiere weitere Abschnitte mit H2/H3.',
        sourceType: 'real',
      });
    }

    if (imagesWithoutAlt > 0) {
      addIssue({
        issueType: 'images_missing_alt',
        category: 'seo',
        severity: 'medium',
        confidence: 1,
        affectedUrls: [page.url],
        evidenceRefs: [htmlEvidence(page.url)],
        title: 'Bilder ohne Alt-Text',
        description: `${imagesWithoutAlt} Bild(er) haben keinen Alt-Text.`,
        fixHint: 'Ergaenze kurze, sinnvolle Alt-Texte fuer informative Bilder.',
        sourceType: 'real',
      });
      addIssue({
        issueType: 'images_missing_alt',
        category: 'accessibility',
        severity: 'medium',
        confidence: 1,
        affectedUrls: [page.url],
        evidenceRefs: [htmlEvidence(page.url)],
        title: 'Alt-Texte fuer Barrierefreiheit fehlen',
        description: `${imagesWithoutAlt} Bild(er) sind fuer Screenreader nicht ausreichend beschrieben.`,
        fixHint: 'Beschreibe informative Bilder und lasse rein dekorative Bilder mit leerem alt-Attribut.',
        sourceType: 'real',
      });
    }

    if (!page.canonical) {
      addIssue({
        issueType: 'missing_canonical',
        category: 'seo',
        severity: 'low',
        confidence: 0.95,
        affectedUrls: [page.url],
        evidenceRefs: [htmlEvidence(page.url)],
        title: 'Canonical fehlt',
        description: 'Die Seite hat kein Canonical-Tag.',
        fixHint: 'Setze ein selbstreferenzielles Canonical oder ein bewusstes Ziel-Canonical.',
        sourceType: 'real',
      });
    } else if (normalizeComparableUrl(page.canonical, page.url) !== normalizeComparableUrl(page.url)) {
      addIssue({
        issueType: 'canonical_mismatch',
        category: 'seo',
        severity: 'medium',
        confidence: 0.95,
        affectedUrls: [page.url],
        evidenceRefs: [htmlEvidence(page.url)],
        title: 'Canonical zeigt auf andere URL',
        description: `Das Canonical verweist auf ${page.canonical}.`,
        fixHint: 'Pruefe, ob diese URL bewusst konsolidiert wird. Falls nicht, korrigiere das Canonical.',
        sourceType: 'real',
      });
    }

    if ((page.robots || '').toLowerCase().includes('noindex')) {
      addIssue({
        issueType: 'noindex_detected',
        category: 'seo',
        severity: page.url === mainUrl ? 'critical' : 'high',
        confidence: 1,
        affectedUrls: [page.url],
        evidenceRefs: [htmlEvidence(page.url)],
        title: 'Noindex-Meta erkannt',
        description: 'Die Seite enthaelt eine noindex-Direktive im Meta-Robots-Tag.',
        fixHint: 'Entferne noindex, wenn die Seite organisch auffindbar sein soll.',
        sourceType: 'real',
      });
    }

    if ((page.xRobotsTag || '').toLowerCase().includes('noindex')) {
      addIssue({
        issueType: 'x_robots_noindex',
        category: 'seo',
        severity: page.url === mainUrl ? 'critical' : 'high',
        confidence: 1,
        affectedUrls: [page.url],
        evidenceRefs: [headerEvidence(page.url)],
        title: 'X-Robots-Tag noindex erkannt',
        description: 'Der HTTP Header X-Robots-Tag enthaelt noindex.',
        fixHint: 'Pruefe Server-, CDN- oder Framework-Konfiguration fuer X-Robots-Tag.',
        sourceType: 'real',
      });
    }

    if (robots.includes('noindex') || String(page.indexabilityReason || '').toLowerCase().includes('robots.txt')) {
      if (String(page.indexabilityReason || '').toLowerCase().includes('robots.txt')) {
        addIssue({
          issueType: 'robots_blocked',
          category: 'seo',
          severity: 'high',
          confidence: 1,
          affectedUrls: [page.url],
          evidenceRefs: [evidenceId(params.scanId, 'robots_txt', mainUrl)],
          title: 'robots.txt blockiert URL',
          description: 'Die URL ist laut robots.txt fuer den Crawler gesperrt.',
          fixHint: 'Passe robots.txt an, falls diese URL gecrawlt werden soll.',
          sourceType: 'real',
        });
      }
    }

    if (wordCount > 0 && wordCount < 300) {
      addIssue({
        issueType: 'thin_content',
        category: 'content',
        severity: 'medium',
        confidence: 0.85,
        affectedUrls: [page.url],
        evidenceRefs: [htmlEvidence(page.url)],
        title: 'Duennen Inhalt erkannt',
        description: `Die Seite hat nur etwa ${wordCount} auslesbare Woerter.`,
        fixHint: 'Erweitere die Seite um hilfreiche, einzigartige Inhalte passend zum Suchintent.',
        sourceType: 'heuristic',
      });
    }
  }

  if (params.sitemapUrls.length === 0) {
    addIssue({
      issueType: 'sitemap_missing',
      category: 'seo',
      severity: 'medium',
      confidence: 0.9,
      affectedUrls: [mainUrl],
      evidenceRefs: [evidenceId(params.scanId, 'sitemap', mainUrl)],
      title: 'Sitemap nicht gefunden',
      description: 'Es wurde keine Sitemap aus robots.txt oder /sitemap.xml gefunden.',
      fixHint: 'Stelle eine aktuelle XML-Sitemap bereit und referenziere sie in robots.txt.',
      sourceType: 'real',
    });
  } else {
    const uncrawledSitemapUrls = params.sitemapUrls
      .filter((url) => {
        try {
          return isSameBaseDomain(new URL(url).hostname, new URL(mainUrl).hostname);
        } catch {
          return false;
        }
      })
      .filter((url) => !crawledSet.has(normalizeComparableUrl(url)))
      .slice(0, 20);

    if (uncrawledSitemapUrls.length > 0) {
      addIssue({
        issueType: 'sitemap_url_not_crawled',
        category: 'seo',
        severity: 'info',
        confidence: 0.8,
        affectedUrls: uncrawledSitemapUrls,
        evidenceRefs: [evidenceId(params.scanId, 'sitemap', mainUrl)],
        title: 'Sitemap enthaelt nicht gecrawlte URLs',
        description: `${uncrawledSitemapUrls.length} Sitemap-URL(s) wurden in diesem Scan nicht erreicht, meist wegen Crawl-Limit oder Queue-Reihenfolge.`,
        fixHint: 'Pruefe Crawl-Limit, Sitemap-Prioritaet und interne Verlinkung wichtiger URLs.',
        sourceType: 'real',
      });
    }
  }

  for (const broken of params.brokenLinks) {
    addIssue({
      issueType: 'broken_internal_link',
      category: 'seo',
      severity: 'high',
      confidence: 1,
      affectedUrls: [broken.url],
      evidenceRefs: [htmlEvidence(broken.url)],
      title: 'Defekter interner Link',
      description: `Die interne URL antwortete mit Status ${broken.status}.`,
      fixHint: 'Aktualisiere, leite weiter oder entferne interne Links auf diese URL.',
      sourceType: 'real',
    });
  }

  const titleMap = new Map<string, string[]>();
  const metaMap = new Map<string, string[]>();
  for (const page of params.pages) {
    if (page.title) titleMap.set(page.title, [...(titleMap.get(page.title) || []), page.url]);
    if (page.metaDescription) metaMap.set(page.metaDescription, [...(metaMap.get(page.metaDescription) || []), page.url]);
  }
  for (const [title, urls] of titleMap.entries()) {
    if (urls.length > 1) {
      addIssue({
        issueType: 'duplicate_title',
        category: 'seo',
        severity: 'medium',
        confidence: 1,
        affectedUrls: urls,
        evidenceRefs: urls.map(htmlEvidence),
        title: 'Doppelter Title',
        description: `Der Title "${title}" kommt auf mehreren URLs vor.`,
        fixHint: 'Vergib eindeutige Title pro URL.',
        sourceType: 'real',
      });
    }
  }
  for (const [meta, urls] of metaMap.entries()) {
    if (urls.length > 1) {
      addIssue({
        issueType: 'duplicate_meta_description',
        category: 'seo',
        severity: 'low',
        confidence: 1,
        affectedUrls: urls,
        evidenceRefs: urls.map(htmlEvidence),
        title: 'Doppelte Meta Description',
        description: `Die Meta Description "${meta.slice(0, 120)}" kommt auf mehreren URLs vor.`,
        fixHint: 'Schreibe pro Seite eine eigene Beschreibung.',
        sourceType: 'real',
      });
    }
  }

  const csp = getHeader(params.headers, 'content-security-policy');
  if (!csp) {
    addIssue({
      issueType: 'missing_csp',
      category: 'security',
      severity: 'high',
      confidence: 1,
      affectedUrls: [mainUrl],
      evidenceRefs: [headerEvidence(mainUrl)],
      title: 'Content-Security-Policy fehlt',
      description: 'Es wurde kein CSP-Header gefunden.',
      fixHint: 'Fuehre eine restriktive Content-Security-Policy ein und teste sie zuerst im Report-Only-Modus.',
      sourceType: 'real',
    });
  } else if (!/default-src|script-src/i.test(csp) || /unsafe-inline|unsafe-eval/i.test(csp)) {
    addIssue({
      issueType: 'weak_csp',
      category: 'security',
      severity: 'medium',
      confidence: 0.85,
      affectedUrls: [mainUrl],
      evidenceRefs: [headerEvidence(mainUrl)],
      title: 'CSP wirkt schwach',
      description: 'Die CSP ist vorhanden, enthaelt aber breite oder riskante Direktiven.',
      fixHint: 'Vermeide unsafe-inline/unsafe-eval und definiere klare Quellen fuer Skripte und Inhalte.',
      sourceType: 'heuristic',
    });
  }

  const securityHeaderChecks: Array<[string, string, AuditSeverity, string, string]> = [
    ['strict-transport-security', 'missing_hsts', 'high', 'HSTS fehlt', 'Aktiviere Strict-Transport-Security fuer HTTPS-Hosts.'],
    ['x-content-type-options', 'missing_x_content_type_options', 'medium', 'X-Content-Type-Options fehlt', 'Setze X-Content-Type-Options: nosniff.'],
    ['referrer-policy', 'missing_referrer_policy', 'medium', 'Referrer-Policy fehlt', 'Setze eine passende Referrer-Policy, z.B. strict-origin-when-cross-origin.'],
    ['permissions-policy', 'missing_permissions_policy', 'low', 'Permissions-Policy fehlt', 'Beschraenke Browser-APIs mit Permissions-Policy.'],
    ['x-frame-options', 'missing_x_frame_options', 'medium', 'X-Frame-Options fehlt', 'Setze X-Frame-Options oder frame-ancestors in der CSP.'],
  ];

  for (const [headerName, issueType, severity, title, fixHint] of securityHeaderChecks) {
    if (!getHeader(params.headers, headerName)) {
      addIssue({
        issueType,
        category: 'security',
        severity,
        confidence: 1,
        affectedUrls: [mainUrl],
        evidenceRefs: [headerEvidence(mainUrl)],
        title,
        description: `Der HTTP Header ${headerName} wurde nicht gefunden.`,
        fixHint,
        sourceType: 'real',
      });
    }
  }

  if (mainUrl.startsWith('https://') && /http:\/\/[^"'\s)]+/i.test(params.html)) {
    addIssue({
      issueType: 'mixed_content',
      category: 'security',
      severity: 'medium',
      confidence: 0.8,
      affectedUrls: [mainUrl],
      evidenceRefs: [htmlEvidence(mainUrl)],
      title: 'Moeglicher Mixed Content',
      description: 'Im HTML wurden unsichere http:// Ressourcen gefunden.',
      fixHint: 'Ersetze Ressourcen-URLs durch HTTPS oder relative URLs.',
      sourceType: 'heuristic',
    });
  }

  if (mainUrl.startsWith('http://') || params.pages.some((page) => [...(page.links || []), ...(page.externalLinks || [])].some((link) => String(link).startsWith('http://')))) {
    addIssue({
      issueType: 'insecure_http_url',
      category: 'security',
      severity: mainUrl.startsWith('http://') ? 'high' : 'medium',
      confidence: 0.9,
      affectedUrls: [mainUrl],
      evidenceRefs: [htmlEvidence(mainUrl)],
      title: 'Unsichere HTTP-URL erkannt',
      description: 'Mindestens eine URL nutzt HTTP statt HTTPS.',
      fixHint: 'Nutze HTTPS fuer Seiten und Ressourcen und richte Weiterleitungen ein.',
      sourceType: 'real',
    });
  }

  const serverHeader = getHeader(params.headers, 'server');
  if (serverHeader && serverHeader.toLowerCase() !== 'hidden') {
    addIssue({
      issueType: 'server_header_leak',
      category: 'security',
      severity: 'low',
      confidence: 0.85,
      affectedUrls: [mainUrl],
      evidenceRefs: [headerEvidence(mainUrl)],
      title: 'Server-Header gibt Technologie preis',
      description: `Der Server-Header lautet "${serverHeader}".`,
      fixHint: 'Reduziere technische Detailinformationen in Response-Headern.',
      sourceType: 'real',
    });
  }

  const emails = Array.from(new Set(params.html.match(/[\w.%+-]+@[\w.-]+\.[A-Z]{2,}/gi) || []));
  if (emails.length > 0) {
    addIssue({
      issueType: 'exposed_email_addresses',
      category: 'security',
      severity: 'low',
      confidence: 0.95,
      affectedUrls: [mainUrl],
      evidenceRefs: [htmlEvidence(mainUrl)],
      title: 'E-Mail-Adressen im HTML gefunden',
      description: `${emails.length} E-Mail-Adresse(n) sind direkt im HTML auslesbar.`,
      fixHint: 'Pruefe, ob Kontaktformulare oder geschuetzte Darstellungen sinnvoller sind.',
      sourceType: 'real',
    });
  }

  const anchorTexts = params.root.querySelectorAll('a[href]').map((link: any) => `${link.text} ${link.getAttribute('href') || ''}`.toLowerCase());
  const hasImpressum = anchorTexts.some((text: string) => text.includes('impressum'));
  const hasPrivacy = anchorTexts.some((text: string) => text.includes('datenschutz') || text.includes('privacy'));
  const hasCookieBanner = /cookie|consent|onetrust|usercentrics|cmp/i.test(params.html);
  const hasTracking = /googletagmanager|google-analytics|gtag\(|fbq\(|facebook\.net|matomo|plausible|hotjar/i.test(params.html);
  const hasGoogleFonts = /fonts\.googleapis\.com|fonts\.gstatic\.com/i.test(params.html);
  const hasThirdPartyEmbeds = params.root.querySelectorAll('iframe[src],script[src]').some((node: any) => {
    const src = node.getAttribute('src') || '';
    if (!src || src.startsWith('/')) return false;
    try {
      return !isSameBaseDomain(new URL(src, mainUrl).hostname, new URL(mainUrl).hostname);
    } catch {
      return false;
    }
  });

  if (!hasImpressum) {
    addIssue({
      issueType: 'missing_impressum_link',
      category: 'compliance',
      severity: 'medium',
      confidence: 0.8,
      affectedUrls: [mainUrl],
      evidenceRefs: [htmlEvidence(mainUrl)],
      title: 'Impressum-Link nicht erkannt',
      description: 'Im Crawl wurde kein klarer Impressum-Link gefunden.',
      fixHint: 'Platziere einen gut auffindbaren Impressum-Link, typischerweise im Footer.',
      sourceType: 'heuristic',
    });
  }

  if (!hasPrivacy) {
    addIssue({
      issueType: 'missing_privacy_policy_link',
      category: 'compliance',
      severity: 'medium',
      confidence: 0.8,
      affectedUrls: [mainUrl],
      evidenceRefs: [htmlEvidence(mainUrl)],
      title: 'Datenschutz-Link nicht erkannt',
      description: 'Im Crawl wurde kein klarer Datenschutz-Link gefunden.',
      fixHint: 'Platziere einen gut auffindbaren Link zur Datenschutzerklaerung.',
      sourceType: 'heuristic',
    });
  }

  if (!hasCookieBanner) {
    addIssue({
      issueType: 'cookie_banner_not_detected',
      category: 'compliance',
      severity: hasTracking ? 'high' : 'low',
      confidence: 0.7,
      affectedUrls: [mainUrl],
      evidenceRefs: [htmlEvidence(mainUrl)],
      title: 'Cookie-Banner nicht erkannt',
      description: 'Es wurde kein Consent- oder Cookie-Banner erkannt.',
      fixHint: 'Pruefe manuell, ob ein Consent-Mechanismus fuer nicht notwendige Dienste vorhanden ist.',
      sourceType: 'heuristic',
    });
  }

  if (hasTracking) {
    addIssue({
      issueType: 'tracking_scripts_detected',
      category: 'compliance',
      severity: 'medium',
      confidence: 0.9,
      affectedUrls: [mainUrl],
      evidenceRefs: [htmlEvidence(mainUrl)],
      title: 'Tracking-Skripte erkannt',
      description: 'Es wurden Skripte typischer Tracking-Anbieter erkannt.',
      fixHint: 'Dokumentiere Anbieter, Zweck und Consent-Abhaengigkeit in CMP und Datenschutzerklaerung.',
      sourceType: 'real',
    });
  }

  if (hasTracking && !hasCookieBanner) {
    addIssue({
      issueType: 'possible_tracking_before_consent',
      category: 'compliance',
      severity: 'high',
      confidence: 0.65,
      affectedUrls: [mainUrl],
      evidenceRefs: [htmlEvidence(mainUrl)],
      title: 'Moegliches Tracking vor Consent',
      description: 'Tracking-Skripte wurden erkannt, aber kein Consent-Banner.',
      fixHint: 'Verifiziere im Browser, dass nicht notwendige Skripte erst nach Einwilligung laden.',
      sourceType: 'heuristic',
    });
  }

  if (hasGoogleFonts) {
    addIssue({
      issueType: 'external_google_fonts',
      category: 'compliance',
      severity: 'low',
      confidence: 0.95,
      affectedUrls: [mainUrl],
      evidenceRefs: [htmlEvidence(mainUrl)],
      title: 'Externe Google Fonts erkannt',
      description: 'Die Seite bindet Google Fonts von externen Google-Domains ein.',
      fixHint: 'Pruefe lokale Font-Auslieferung oder eine dokumentierte Consent-/Rechtsgrundlage.',
      sourceType: 'real',
    });
  }

  if (hasThirdPartyEmbeds) {
    addIssue({
      issueType: 'third_party_embeds_detected',
      category: 'compliance',
      severity: 'low',
      confidence: 0.85,
      affectedUrls: [mainUrl],
      evidenceRefs: [htmlEvidence(mainUrl)],
      title: 'Drittanbieter-Embeds erkannt',
      description: 'Es wurden externe Skripte oder iframes gefunden.',
      fixHint: 'Pruefe Datenfluesse, Consent-Bedarf und Anbieterangaben.',
      sourceType: 'heuristic',
    });
  }

  const aiChecks = params.aiVisibilityChecks;
  const blockedAiBots = aiChecks.crawlerAccess.filter((check) => check.status === 'blocked');
  if (blockedAiBots.length > 0) {
    addIssue({
      issueType: 'ai_crawler_access_blocked',
      category: 'ai_visibility',
      severity: 'medium',
      confidence: 0.9,
      affectedUrls: [mainUrl],
      evidenceRefs: [evidenceId(params.scanId, 'robots_txt', mainUrl)],
      title: 'AI-Crawler in robots.txt blockiert',
      description: `Folgende AI-Crawler sind fuer den Vollzugriff blockiert: ${blockedAiBots.map((check) => check.label).join(', ')}.`,
      fixHint: 'Entscheide bewusst, welche AI-Crawler Zugriff erhalten sollen, und dokumentiere die Governance-Regel.',
      sourceType: 'heuristic',
    });
  }

  const botIssueTypes: Record<string, string> = {
    GPTBot: 'ai_crawler_gptbot_blocked',
    'OAI-SearchBot': 'ai_crawler_oai_searchbot_blocked',
    'Google-Extended': 'ai_crawler_google_extended_blocked',
    PerplexityBot: 'ai_crawler_perplexitybot_blocked',
  };
  blockedAiBots.forEach((check) => {
    addIssue({
      issueType: botIssueTypes[check.bot] || 'ai_crawler_blocked',
      category: 'ai_visibility',
      severity: check.bot === 'Google-Extended' ? 'info' : 'low',
      confidence: check.confidence,
      affectedUrls: [mainUrl],
      evidenceRefs: [evidenceId(params.scanId, 'robots_txt', mainUrl)],
      title: `${check.label} Zugriff blockiert`,
      description: `${check.label} ist laut robots.txt fuer den Vollzugriff blockiert (${check.rule}).`,
      fixHint: 'Pruefe, ob diese Blockade Teil der AI-Governance ist oder die Auffindbarkeit in AI-Systemen begrenzt.',
      sourceType: 'heuristic',
    });
  });

  if (aiChecks.organizationSchema.status === 'warning') {
    addIssue({
      issueType: 'organization_schema_missing',
      category: 'ai_visibility',
      severity: 'low',
      confidence: aiChecks.organizationSchema.confidence,
      affectedUrls: [mainUrl],
      evidenceRefs: [htmlEvidence(mainUrl)],
      title: 'Organization Schema nicht erkannt',
      description: `Fehlende Entity-Signale: ${aiChecks.organizationSchema.missing.join(', ')}.`,
      fixHint: 'Ergaenze strukturierte Daten fuer Organisation, Logo, Kontakt und relevante Profile.',
      sourceType: 'heuristic',
    });
  }

  if (aiChecks.sameAsLinks.status === 'warning') {
    addIssue({
      issueType: 'same_as_links_missing',
      category: 'ai_visibility',
      severity: 'info',
      confidence: aiChecks.sameAsLinks.confidence,
      affectedUrls: [mainUrl],
      evidenceRefs: [htmlEvidence(mainUrl)],
      title: 'SameAs-Signale fehlen',
      description: 'Es wurden keine sameAs-Profile oder rel=me-Verweise erkannt.',
      fixHint: 'Verbinde verifizierbare Profile im Organization Schema mit sameAs.',
      sourceType: 'heuristic',
    });
  }

  if (aiChecks.brandEntity.status === 'warning') {
    addIssue({
      issueType: 'brand_entity_structure_weak',
      category: 'ai_visibility',
      severity: 'low',
      confidence: aiChecks.brandEntity.confidence,
      affectedUrls: [mainUrl],
      evidenceRefs: [htmlEvidence(mainUrl)],
      title: 'Brand-Entity-Struktur ist unklar',
      description: `Fehlende Brand-Entity-Signale: ${aiChecks.brandEntity.missing.join(', ')}.`,
      fixHint: 'Staerke Brand-Entity-Signale mit Schema, Profilen und klarer Unternehmensstruktur.',
      sourceType: 'heuristic',
    });
  }

  if (aiChecks.aboutContactImpressum.status === 'warning') {
    addIssue({
      issueType: 'about_contact_impressum_structure_weak',
      category: 'ai_visibility',
      severity: 'low',
      confidence: aiChecks.aboutContactImpressum.confidence,
      affectedUrls: [mainUrl],
      evidenceRefs: [htmlEvidence(mainUrl)],
      title: 'About/Kontakt/Impressum-Struktur unvollstaendig',
      description: `Fehlende Vertrauensseiten: ${aiChecks.aboutContactImpressum.missing.join(', ')}.`,
      fixHint: 'Verlinke About/Ueber uns, Kontakt und Impressum sichtbar und konsistent.',
      sourceType: 'heuristic',
    });
  }

  if (aiChecks.snippetReadiness.status === 'warning') {
    addIssue({
      issueType: 'ai_snippet_readiness_weak',
      category: 'ai_visibility',
      severity: 'info',
      confidence: aiChecks.snippetReadiness.confidence,
      affectedUrls: [mainUrl],
      evidenceRefs: [htmlEvidence(mainUrl)],
      title: 'AI-Snippet-Eignung ausbaubar',
      description: `Fehlende Snippet-Signale: ${aiChecks.snippetReadiness.missing.join(', ')}.`,
      fixHint: 'Baue beantwortbare Abschnitte mit klaren Definitionen, FAQs oder Schrittfolgen auf.',
      sourceType: 'heuristic',
    });
  }

  if (aiChecks.faqDefinitionHowTo.status === 'warning') {
    addIssue({
      issueType: 'faq_definition_howto_missing',
      category: 'ai_visibility',
      severity: 'info',
      confidence: aiChecks.faqDefinitionHowTo.confidence,
      affectedUrls: [mainUrl],
      evidenceRefs: [htmlEvidence(mainUrl)],
      title: 'FAQ/Definition/HowTo-Eignung fehlt',
      description: 'Es wurden keine klaren FAQ-, Definitions- oder HowTo-Strukturen erkannt.',
      fixHint: 'Ergaenze echte Antwortformate, Definitionen oder Schrittfolgen, wenn sie fachlich passen.',
      sourceType: 'heuristic',
    });
  }

  const htmlLangMissingUrls = params.pages.filter((page) => !page.htmlLang).map((page) => page.url);
  if (htmlLangMissingUrls.length > 0) {
    addIssue({
      issueType: 'missing_html_lang',
      category: 'accessibility',
      severity: 'medium',
      confidence: 1,
      affectedUrls: htmlLangMissingUrls,
      evidenceRefs: htmlLangMissingUrls.map(htmlEvidence),
      title: 'HTML lang fehlt',
      description: 'Mindestens eine Seite hat kein lang-Attribut am HTML-Element.',
      fixHint: 'Setze z.B. <html lang="de"> passend zur Seitensprache.',
      sourceType: 'real',
    });
  }

  const headingIssues = params.pages.filter((page) => {
    const h1Count = page.h1Count ?? page.headings?.h1?.length ?? 0;
    return h1Count === 0 || h1Count > 1;
  }).map((page) => page.url);
  if (headingIssues.length > 0) {
    addIssue({
      issueType: 'poor_heading_structure',
      category: 'accessibility',
      severity: 'low',
      confidence: 0.85,
      affectedUrls: headingIssues,
      evidenceRefs: headingIssues.map(htmlEvidence),
      title: 'Ueberschriftenstruktur pruefen',
      description: 'Die H1-Struktur ist auf mindestens einer Seite auffaellig.',
      fixHint: 'Nutze eine klare Ueberschriftenhierarchie mit einer H1 und logisch folgenden H2/H3.',
      sourceType: 'heuristic',
    });
  }

  const emptyLinks = params.root.querySelectorAll('a[href]').filter((link: any) => {
    const text = (link.text || '').trim();
    const label = link.getAttribute('aria-label') || link.getAttribute('title') || '';
    return !text && !label;
  }).length;
  if (emptyLinks > 0) {
    addIssue({
      issueType: 'empty_links',
      category: 'accessibility',
      severity: 'medium',
      confidence: 1,
      affectedUrls: [mainUrl],
      evidenceRefs: [htmlEvidence(mainUrl)],
      title: 'Leere Links erkannt',
      description: `${emptyLinks} Link(s) haben keinen lesbaren Namen.`,
      fixHint: 'Fuege Linktext oder ein sinnvolles aria-label hinzu.',
      sourceType: 'real',
    });
  }

  const unnamedButtons = params.root.querySelectorAll('button').filter((button: any) => {
    const text = (button.text || '').trim();
    const label = button.getAttribute('aria-label') || button.getAttribute('title') || '';
    return !text && !label;
  }).length;
  if (unnamedButtons > 0) {
    addIssue({
      issueType: 'buttons_without_accessible_name',
      category: 'accessibility',
      severity: 'medium',
      confidence: 1,
      affectedUrls: [mainUrl],
      evidenceRefs: [htmlEvidence(mainUrl)],
      title: 'Buttons ohne Accessible Name',
      description: `${unnamedButtons} Button(s) sind fuer assistive Technologien nicht benannt.`,
      fixHint: 'Ergaenze sichtbaren Text oder aria-label fuer Icon-Buttons.',
      sourceType: 'real',
    });
  }

  const labelsFor = new Set(params.root.querySelectorAll('label[for]').map((label: any) => label.getAttribute('for')));
  const unlabeledInputs = params.root.querySelectorAll('input,textarea,select').filter((input: any) => {
    const type = (input.getAttribute('type') || '').toLowerCase();
    if (type === 'hidden' || type === 'submit' || type === 'button') return false;
    const id = input.getAttribute('id');
    return !(input.getAttribute('aria-label') || input.getAttribute('aria-labelledby') || (id && labelsFor.has(id)));
  }).length;
  if (unlabeledInputs > 0) {
    addIssue({
      issueType: 'form_inputs_without_label',
      category: 'accessibility',
      severity: 'medium',
      confidence: 1,
      affectedUrls: [mainUrl],
      evidenceRefs: [htmlEvidence(mainUrl)],
      title: 'Formularfelder ohne Label',
      description: `${unlabeledInputs} Formularfeld(er) haben kein erkennbares Label.`,
      fixHint: 'Verknuepfe jedes Eingabefeld mit label, aria-label oder aria-labelledby.',
      sourceType: 'real',
    });
  }

  if (params.blockingScripts > 3) {
    addIssue({
      issueType: 'high_blocking_scripts',
      category: 'performance',
      severity: 'medium',
      confidence: 0.9,
      affectedUrls: [mainUrl],
      evidenceRefs: [htmlEvidence(mainUrl)],
      title: 'Viele blockierende Skripte',
      description: `${params.blockingScripts} Skript(e) laden ohne async oder defer.`,
      fixHint: 'Lade nicht-kritische Skripte asynchron, defer oder nach Interaktion.',
      sourceType: 'real',
    });
  }

  if (params.maxDomDepth > 30) {
    addIssue({
      issueType: 'excessive_dom_depth',
      category: 'performance',
      severity: 'low',
      confidence: 0.85,
      affectedUrls: [mainUrl],
      evidenceRefs: [htmlEvidence(mainUrl)],
      title: 'Hohe DOM-Tiefe',
      description: `Die maximale DOM-Tiefe liegt bei ${params.maxDomDepth}.`,
      fixHint: 'Vereinfache verschachtelte Layout-Strukturen in kritischen Bereichen.',
      sourceType: 'heuristic',
    });
  }

  if (params.totalStylesheets > 10) {
    addIssue({
      issueType: 'too_many_stylesheets',
      category: 'performance',
      severity: 'low',
      confidence: 0.9,
      affectedUrls: [mainUrl],
      evidenceRefs: [htmlEvidence(mainUrl)],
      title: 'Viele Stylesheets',
      description: `${params.totalStylesheets} Stylesheets wurden gefunden.`,
      fixHint: 'Konsolidiere CSS und priorisiere kritische Styles.',
      sourceType: 'real',
    });
  }

  addIssue({
    issueType: 'missing_real_performance_data',
    category: 'performance',
    severity: 'info',
    confidence: 1,
    affectedUrls: [mainUrl],
    evidenceRefs: [headerEvidence(mainUrl)],
    title: 'Keine echten Lab-/Felddaten angebunden',
    description: 'Der Scan hat keine PSI- oder CrUX-Metriken geladen.',
    fixHint: 'Verbinde PageSpeed Insights und CrUX, bevor konkrete Core-Web-Vitals behauptet werden.',
    sourceType: 'unavailable',
  });

  addIssue({
    issueType: 'psi_not_connected',
    category: 'performance',
    severity: 'info',
    confidence: 1,
    affectedUrls: [mainUrl],
    evidenceRefs: [],
    title: 'PageSpeed Insights nicht verbunden',
    description: 'PageSpeed Insights ist fuer diesen Scan nicht angebunden.',
    fixHint: 'Konfiguriere einen PSI Provider-Key oder kennzeichne Performance weiter als Heuristik.',
    sourceType: 'unavailable',
  });

  addIssue({
    issueType: 'crux_not_available',
    category: 'performance',
    severity: 'info',
    confidence: 1,
    affectedUrls: [mainUrl],
    evidenceRefs: [],
    title: 'CrUX Felddaten nicht verfuegbar',
    description: 'Fuer diesen Scan liegen keine CrUX Felddaten vor.',
    fixHint: 'Pruefe CrUX-Verfuegbarkeit auf Origin-/URL-Ebene, wenn ein Provider angebunden ist.',
    sourceType: 'unavailable',
  });

  return Array.from(issues.values());
}

export async function performPreflight(urlObj: URL, plan: string) {
  const subpageLimit = getCrawlLimit(plan);
  const domain = urlObj.hostname;

  const robotsUrl = `${urlObj.origin}/robots.txt`;
  let robotsTxt = { status: 404, content: '', allowed: true, sitemaps: [] as string[], crawlDelay: 0 };
  try {
    const res = await fetch(robotsUrl, { ...STEALTH_CONFIG, signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      robotsTxt.content = await res.text();
      robotsTxt.status = res.status;
      robotsTxt.content.split('\n').forEach(line => {
        if (line.toLowerCase().trim().startsWith('crawl-delay:')) {
          robotsTxt.crawlDelay = parseInt(line.split(/crawl-delay:/i)[1].trim()) || 0;
        }
      });
    }
  } catch {
    // robots.txt is optional; absence is captured in the returned metadata.
  }

  const sitemapUrls = await getAllUrlsBeforeCrawl(urlObj.origin, robotsTxt.content);
  const fetchStartedAt = Date.now();
  const response = await fetch(urlObj.toString(), { ...STEALTH_CONFIG, signal: AbortSignal.timeout(10000) });
  const responseTimeMs = Date.now() - fetchStartedAt;
  if (!response.ok) throw new Error(`Failed to fetch URL (Status: ${response.status})`);
  
  const html = await response.text();
  const mainUrlNormalizedInPreflight = normalizeUrl(urlObj.toString(), urlObj.origin) || urlObj.toString();

  const initialQueue = new Set<string>();
  sitemapUrls.forEach(u => {
    const norm = normalizeUrl(u, urlObj.origin);
    // FIX: XMLs, Bilder und PDFs knallhart aus der Warteschlange werfen!
    if (norm && isSameBaseDomain(new URL(norm).hostname, domain) && norm !== mainUrlNormalizedInPreflight && !norm.match(/\.(xml|pdf|png|jpg|jpeg|gif|css|js)$/i)) {
      initialQueue.add(norm);
    }
  });

  return { subpageLimit, domain, robotsTxt, sitemapUrls, mainUrlNormalized: mainUrlNormalizedInPreflight, initialQueue: Array.from(initialQueue), html, headers: Object.fromEntries(response.headers.entries()), responseTimeMs };
}

export async function performAnalysis({ url, plan = 'free', userId = '', auditId, env }: ScanOptions): Promise<AnalysisResult> {
  const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
  const runtimeEnv = env || process.env;
  const scanId = auditId || createScanId();
  const createdAt = nowIso();
  const preflight = await performPreflight(urlObj, plan);
  const { subpageLimit, domain, robotsTxt, sitemapUrls, mainUrlNormalized, html, headers, responseTimeMs } = preflight;
  const root = parse(html);
  const ttfbMs = undefined;

  const rdapPromise = fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, { signal: AbortSignal.timeout(10000) }).catch(() => null);

  // Headers & CDN
  const securityHeaders: Record<string, string> = {
    'Content-Security-Policy': headers['content-security-policy'] ? 'Present' : 'Missing',
    'Strict-Transport-Security': headers['strict-transport-security'] ? 'Present' : 'Missing',
    'X-Frame-Options': headers['x-frame-options'] || 'Missing',
    'X-Content-Type-Options': headers['x-content-type-options'] || 'Missing',
    'Referrer-Policy': headers['referrer-policy'] || 'Missing'
  };
  const cdn = headers['cf-ray'] ? 'Cloudflare' : headers['x-vercel-id'] ? 'Vercel' : headers['x-akamai-transformed'] ? 'Akamai' : headers['server']?.includes('Cloudfront') ? 'Amazon CloudFront' : 'None detected';

  // --- DATA EXTRACTION (MAIN PAGE) ---
  
  // Images
  const allImages = root.querySelectorAll('img');
  const imagesTotal = allImages.length;
  const imageDetails = allImages.map((img: any) => ({
    src: img.getAttribute('src') || '',
    alt: img.getAttribute('alt') || null
  }));
  const imagesWithoutAlt = imageDetails.filter(img => !img.alt || img.alt.trim() === '').length;
  const lazyImages = allImages.filter((img: any) => img.getAttribute('loading') === 'lazy').length;

  // Type-Safe Indexability Check
  const robotsMeta = root.querySelector('meta[name="robots"]')?.getAttribute('content') || '';
  const xRobots = headers['x-robots-tag'] || '';
  const contentType = headers['content-type'] || 'text/html';
  const canonical = root.querySelector('link[rel="canonical"]')?.getAttribute('href') || null;

  const mainIndex = checkIndexability(
    mainUrlNormalized, 
    200, 
    robotsMeta, 
    xRobots, 
    contentType, 
    html, 
    robotsTxt.content, 
    canonical
  );

  // Links
  const mainLinkData = extractLinkData(root, mainUrlNormalized);
  const internalLinks = new Set(mainLinkData.internal);
  const externalLinks = new Set(mainLinkData.external);

  // Scripts & Styles
  const scripts = root.querySelectorAll('script');
  const totalScripts = scripts.length;
  const blockingScripts = scripts.filter((s: any) => !s.getAttribute('async') && !s.getAttribute('defer') && s.getAttribute('src')).length;
  const totalStylesheets = root.querySelectorAll('link[rel="stylesheet"]').length;

  // DOM Depth
  const calculateMaxDepth = (node: any): number => {
    if (!node.childNodes || node.childNodes.length === 0) return 1;
    let max = 0;
    node.childNodes.forEach((child: any) => {
      if (child.nodeType === 1) { // Element node
        max = Math.max(max, calculateMaxDepth(child));
      }
    });
    return 1 + max;
  };
  const maxDomDepth = calculateMaxDepth(root);

  // Semantic Tags
  const semanticTags = {
    main: root.querySelectorAll('main').length,
    article: root.querySelectorAll('article').length,
    section: root.querySelectorAll('section').length,
    nav: root.querySelectorAll('nav').length,
    header: root.querySelectorAll('header').length,
    footer: root.querySelectorAll('footer').length,
    aside: root.querySelectorAll('aside').length
  };


  // Queue Engine
  const queue = new Set<string>();
  const processed = new Set<string>();
  const subpageResults: SubpageResult[] = [];

  processed.add(mainUrlNormalized);
  preflight.initialQueue.forEach(u => queue.add(u));

  internalLinks.forEach(l => {
    if (!processed.has(l)) queue.add(l);
  });

  while (queue.size > 0 && subpageResults.length < subpageLimit) {
    const current = Array.from(queue).shift()!;
    queue.delete(current);
    if (processed.has(current)) continue;
    processed.add(current);

    if (robotsTxt.crawlDelay > 0) await new Promise(r => setTimeout(r, Math.min(robotsTxt.crawlDelay * 1000, 3000)));

    const result = await scanSubpage(current, domain, robotsTxt.content);
    subpageResults.push(result);

    if (typeof result.status === 'number' && result.status >= 300 && result.status < 400 && result.redirectLocation) {
      const normTarget = normalizeUrl(result.redirectLocation, current);
      if (normTarget && isSameBaseDomain(new URL(normTarget).hostname, domain) && !processed.has(normTarget)) queue.add(normTarget);
    }

    if (!result.error && result.links) {
      result.links.forEach(l => {
        if (!processed.has(l)) queue.add(l);
      });
    }
  }

  // Final Evaluation
  const successfulSubpages = subpageResults.filter(r => !r.error).map(r => {
    const { error: _error, strippedContent: _strippedContent, ...rest } = r;
    return rest;
  });
  const htmlStripped = stripHtmlForAi(html);
  const bodyText = htmlStripped.replace(/\s+/g, ' ').trim().slice(0, 500000);
  const mainHeadings = {
    h1: root.querySelectorAll('h1').map(el => el.text.trim()),
    h2: root.querySelectorAll('h2').map(el => el.text.trim()),
    h3: root.querySelectorAll('h3').map(el => el.text.trim())
  };
  const htmlLang = root.querySelector('html')?.getAttribute('lang') || '';
  const mainPage = {
    error: false,
    url: mainUrlNormalized,
    urlObj: mainUrlNormalized,
    title: root.querySelector('title')?.text.trim() || '',
    metaDescription: root.querySelector('meta[name="description"]')?.getAttribute('content') || '',
    robots: robotsMeta || 'index, follow',
    canonical: canonical || '',
    h1Count: root.querySelectorAll('h1').length,
    status: 200,
    contentType,
    strippedContent: bodyText.slice(0, 15000),
    links: Array.from(internalLinks),
    externalLinks: Array.from(externalLinks),
    internalLinkDetails: mainLinkData.internalDetails,
    externalLinkDetails: mainLinkData.externalDetails,
    xRobotsTag: xRobots,
    hasNextPrev: !!(root.querySelector('link[rel="next"]') || root.querySelector('link[rel="prev"]')),
    headings: mainHeadings,
    images: imageDetails.map((image) => ({ src: image.src, alt: image.alt || '' })),
    imagesWithoutAlt,
    headers,
    htmlLang,
    isIndexable: mainIndex.isIndexable,
    indexabilityReason: mainIndex.reason,
    textBasis: '',
  };
  mainPage.textBasis = buildTextBasis(mainPage);

  const indexableSubpages = successfulSubpages.filter(p => p.isIndexable);

  const crawledUrls = Array.from(processed);
  const indexableUrls = [...(mainIndex.isIndexable ? [mainUrlNormalized] : []), ...indexableSubpages.map(p => p.url)];
  const brokenLinks = subpageResults
    .filter((result) => result.error || (typeof result.status === 'number' && result.status >= 400))
    .map((result) => ({ url: result.url, status: result.status }));
  const issuePages = [mainPage, ...subpageResults];
  const evidence = buildEvidenceArtifacts(scanId, issuePages, robotsTxt.content, sitemapUrls, createdAt);
  const urlSnapshots = buildUrlSnapshots(scanId, issuePages, createdAt);
  const aiVisibilityChecks = evaluateAiVisibilityChecks({
    root,
    html,
    robotsTxt: robotsTxt.content,
    title: mainPage.title,
    metaDescription: mainPage.metaDescription,
  });
  const issues = generateAuditIssues({
    scanId,
    pages: issuePages,
    root,
    html,
    headers,
    robotsTxt: robotsTxt.content,
    sitemapUrls,
    crawledUrls,
    brokenLinks,
    mainIndex,
    maxDomDepth,
    blockingScripts,
    totalStylesheets,
    aiVisibilityChecks,
    createdAt,
  });
  const { scores, breakdown: scoreBreakdown } = calculateIssueScores(issues);
  const emailsFound = Array.from(new Set(html.match(/[\w.%+-]+@[\w.-]+\.[A-Z]{2,}/gi) || []));
  const cookieBannerFound = /cookie|consent|onetrust|usercentrics|cmp/i.test(html);
  const trackingScripts = {
    googleTagManager: /googletagmanager/i.test(html),
    googleAnalytics: /google-analytics|gtag\(/i.test(html),
    metaPixel: /facebook\.net|fbq\(/i.test(html),
    matomo: /matomo/i.test(html),
  };
  const linkTexts = root.querySelectorAll('a[href]').map((link: any) => `${link.text} ${link.getAttribute('href') || ''}`.toLowerCase());
  const providerAvailability = getProviderAvailability(runtimeEnv);
  const providerStatuses = getProviderStatuses(runtimeEnv);
  const dataSources: DataSourceMap = {
    crawl: { type: 'real', label: 'Crawler' },
    issues: { type: 'real', label: 'Deterministische Regeln' },
    rankings: {
      type: providerAvailability.serp || providerAvailability.gsc ? 'provider' : 'unavailable',
      label: providerAvailability.serp || providerAvailability.gsc ? 'Rank-Provider konfiguriert, keine Facts abgerufen' : 'Rank-Provider noch nicht verbunden',
    },
    backlinks: {
      type: providerAvailability.backlink ? 'provider' : 'unavailable',
      label: providerAvailability.backlink ? 'Backlink-Provider konfiguriert, keine Facts abgerufen' : 'Backlink-Provider noch nicht verbunden',
    },
    keywordResearch: {
      type: providerAvailability.keyword ? 'provider' : 'unavailable',
      label: providerAvailability.keyword ? 'Keyword-Provider konfiguriert, keine Facts abgerufen' : 'Keyword-Provider noch nicht verbunden',
    },
    onPageKeywords: { type: 'heuristic', label: 'On-Page Worthaeufigkeit' },
    competition: {
      type: providerAvailability.traffic || providerAvailability.serp ? 'provider' : 'ai_inferred',
      label: providerAvailability.traffic || providerAvailability.serp ? 'Wettbewerber-Provider konfiguriert, keine Facts abgerufen' : 'Nur KI-Hinweise, keine Provider-Fakten',
    },
    aiVisibility: { type: providerAvailability.aiVisibility ? 'provider' : 'heuristic', label: providerAvailability.aiVisibility ? 'AI Visibility Provider konfiguriert' : 'AI Visibility Heuristik' },
    psi: { type: providerAvailability.psi ? 'provider' : 'unavailable', label: providerAvailability.psi ? 'PageSpeed Insights konfiguriert' : 'PageSpeed Insights nicht verbunden' },
    crux: { type: providerAvailability.crux ? 'provider' : 'unavailable', label: providerAvailability.crux ? 'CrUX konfiguriert' : 'CrUX nicht verbunden' },
  };
  const aiVisibilityChecksWithProviders: AiVisibilityCheckSet = {
    ...aiVisibilityChecks,
    aiOverviewTracking: {
      ...aiVisibilityChecks.aiOverviewTracking,
      status: providerAvailability.serp ? 'provider_configured' : 'unavailable',
      sourceType: providerAvailability.serp ? 'provider' : 'unavailable',
      provider: providerAvailability.serp ? 'SERP Provider konfiguriert' : 'SERP Provider spaeter',
    },
    promptMonitoring: {
      ...aiVisibilityChecks.promptMonitoring,
      status: providerAvailability.aiVisibility ? 'provider_configured' : 'unavailable',
      sourceType: providerAvailability.aiVisibility ? 'provider' : 'unavailable',
      provider: providerAvailability.aiVisibility ? 'AI Visibility Provider konfiguriert' : 'AI Visibility Provider spaeter',
    },
  };

  const rdapRes = await rdapPromise;
  let domainAge = "Unknown";
  if (rdapRes?.ok) {
    const data = await rdapRes.json();
    domainAge = data.events?.find((e: any) => e.eventAction === 'registration')?.eventDate.split('T')[0] || "Unknown";
  }

  return {
    audit_id: scanId,
    userId,
    createdAt,
    url: mainUrlNormalized,
    urlObj: mainUrlNormalized,
    title: mainPage.title,
    metaDescription: mainPage.metaDescription,
    metaKeywords: '', htmlLang, hreflangs: [], generator: '', viewport: '', viewportScalable: 'Yes',
    robots: mainIndex.isIndexable ? 'index, follow' : 'noindex',
    h1Count: root.querySelectorAll('h1').length, h2Count: root.querySelectorAll('h2').length,
    imagesTotal, imagesWithoutAlt, lazyImages, maxDomDepth,
    headings: mainHeadings,
    imageDetails, semanticTags,
    napSignals: { googleMapsLinks: root.querySelectorAll('a[href*="google.com/maps"],a[href*="maps.google"]').length, phoneLinks: root.querySelectorAll('a[href^="tel:"]').length },
    dataLeakage: { emailsFoundCount: emailsFound.length, sampleEmails: emailsFound.slice(0, 5) },
    internalLinksCount: internalLinks.size, externalLinksCount: externalLinks.size, totalScripts, blockingScripts, totalStylesheets,
    responseTimeMs, ttfbMs, responseTimeSource: 'real_fetch_elapsed_ms', preflight: { robotsTxt, sitemap: { status: sitemapUrls.length > 0 ? 200 : 404, url: sitemapUrls[0] || null, urlsFound: sitemapUrls.length } },
    psiMetricsStr: 'Nicht verfuegbar: PageSpeed Insights ist nicht verbunden.', psiMetrics: null, lighthouseScores: null, safeBrowsingStr: '', domainAge, sslCertificate: { status: 'READY' },
    wienerSachtextIndex: 0, bodyText, techStack: html.includes('wp-content') ? ['WordPress'] : html.includes('__NEXT_DATA__') ? ['Next.js'] : [],
    cdn, serverInfo: headers['server'] || 'Hidden',
    legal: {
      trackingScripts,
      cmpDetected: { cookieBannerFound },
      linksInFooter: linkTexts.some((text: string) => text.includes('impressum')),
      privacyInFooter: linkTexts.some((text: string) => text.includes('datenschutz') || text.includes('privacy')),
      cookieBannerFound
    },
    social: { ogTitle: '', ogDescription: '', ogImage: '', ogType: 'website', twitterCard: 'summary' },
    existingSchemaCount: 0, schemaTypes: [], securityHeaders, headers,
    crawlSummary: { 
      totalInternalLinks: internalLinks.size, 
      scannedSubpagesCount: successfulSubpages.length, 
      indexablePagesCount: indexableUrls.length,
      crawledUrls, indexableUrls,
      scannedSubpages: successfulSubpages as any[], 
      brokenLinks
    },
    issues,
    evidence,
    urlSnapshots,
    scoreBreakdown,
    dataSources,
    providerAvailability,
    providerStatuses,
    keywordFacts: [],
    rankFacts: [],
    backlinkFacts: [],
    competitorFacts: [],
    trafficFacts: [],
    aiVisibilityFacts: [],
    seo: { score: scores.seo, insights: [], recommendations: [], detailedSeo: {} as any },
    performance: { score: scores.performance, insights: [], recommendations: [], detailedPerformance: {} as any },
    security: { score: scores.security, insights: [], recommendations: [], detailedSecurity: {} as any },
    accessibility: { score: scores.accessibility, insights: [], recommendations: [], detailedAccessibility: {} as any },
    compliance: { score: scores.compliance, insights: [], recommendations: [], detailedCompliance: {} as any },
    contentStrategy: { score: scores.contentStrategy, insights: [], recommendations: [], detailedContent: {} as any },
    aiVisibility: {
      score: scores.aiVisibility,
      insights: [],
      recommendations: [],
      sourceType: 'heuristic',
      checks: aiVisibilityChecksWithProviders,
    },
    apiEndpoints: []
  };
}
