import { parse } from 'node-html-parser';
import { 
  ScanOptions, 
  AnalysisResult, 
  LighthouseScores, 
  PsiMetrics, 
  SslCertificateData, 
  SubpageResult,
  ExternalLinkCheck,
  RedirectHop,
  RenderAuditData,
  RenderDomDiff,
  PsiStrategyResult,
  CruxRecordResult,
  GoogleInspectionResult
} from './scanner/types';
import { calculateIssueScores } from './audit/score-engine';
import { evaluateAiVisibilityChecks } from './ai-visibility';
import { getCacheJson, putCacheJson } from './cloudflare-cache';
import { getCrawlLimit, getVisibilityLimits, hasPlanRank, normalizePlan } from './plans';
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
  SubpageResult,
  ExternalLinkCheck,
  RedirectHop,
  RenderAuditData,
  RenderDomDiff,
  PsiStrategyResult,
  CruxRecordResult,
  GoogleInspectionResult
};

// --- CONFIG & UTILS ---

const USER_AGENT_PROFILES = {
  desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  mobile: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
} as const;

function requestConfig(device: 'desktop' | 'mobile' = 'desktop') {
  return {
    headers: {
      'User-Agent': USER_AGENT_PROFILES[device],
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    }
  };
}

const STEALTH_CONFIG = {
  headers: {
    'User-Agent': USER_AGENT_PROFILES.desktop,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  }
};

const RULE_VERSION = 'audit-rules-v4-provider-rendering';
const SCANNER_VERSION = 'scanner-v2.5-semrush-crawl-evidence';
let sharedBrowserPromise: Promise<any> | null = null;

type CrawlQueueEntry = {
  url: string;
  depth: number;
  source: 'sitemap' | 'link' | 'redirect' | 'seed';
  discoveredFrom?: string;
};

type CrawlAuditEnhancements = NonNullable<AnalysisResult['crawlSummary']['internalLinking']> & {
  pageAudit: NonNullable<AnalysisResult['crawlSummary']['pageAudit']>;
  depthDistribution: Record<string, number>;
  statusCodeDistribution: Record<string, number>;
  indexabilityReasons: Record<string, number>;
  nonIndexableUrls: NonNullable<AnalysisResult['crawlSummary']['nonIndexableUrls']>;
  sitemapCoverage: NonNullable<AnalysisResult['crawlSummary']['sitemapCoverage']>;
  canonicalClusters: NonNullable<AnalysisResult['crawlSummary']['canonicalClusters']>;
  canonicalIssues: NonNullable<AnalysisResult['crawlSummary']['canonicalIssues']>;
  duplicateContentClusters: NonNullable<AnalysisResult['crawlSummary']['duplicateContentClusters']>;
  hreflangSummary: NonNullable<AnalysisResult['crawlSummary']['hreflangSummary']>;
  structuredDataSummary: NonNullable<AnalysisResult['crawlSummary']['structuredDataSummary']>;
  externalLinkChecks: NonNullable<AnalysisResult['crawlSummary']['externalLinkChecks']>;
  redirectChains: NonNullable<AnalysisResult['crawlSummary']['redirectChains']>;
};

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

function countWords(text: string) {
  return (text || '')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 1).length;
}

function contentFingerprint(text: string) {
  const normalized = (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/gi, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .slice(0, 900)
    .join(' ');

  return normalized.length > 120 ? stableHash(normalized) : '';
}

function isValidHreflang(value: string) {
  const normalized = value.toLowerCase();
  if (normalized === 'x-default') return true;
  const parts = normalized.split('-');
  const language = parts[0] || '';
  const validLanguage = language.length >= 2 && language.length <= 3 && Array.from(language).every((char) => char >= 'a' && char <= 'z');
  const validRegions = parts.slice(1).every((part) => (
    part.length >= 2 &&
    part.length <= 8 &&
    Array.from(part).every((char) => (char >= 'a' && char <= 'z') || (char >= '0' && char <= '9'))
  ));
  return validLanguage && validRegions;
}

function extractHreflangs(root: any, pageUrl: string) {
  return root.querySelectorAll('link[hreflang]').map((link: any) => {
    const rel = (link.getAttribute('rel') || '').toLowerCase();
    const hreflang = (link.getAttribute('hreflang') || '').trim();
    const href = (link.getAttribute('href') || '').trim();
    const normalizedHref = href ? normalizeUrl(href, pageUrl) || href : '';
    return {
      hreflang,
      href,
      normalizedHref,
      valid: rel.includes('alternate') && Boolean(hreflang) && Boolean(href) && isValidHreflang(hreflang),
    };
  });
}

function collectSchemaTypesFromValue(value: any, output: Set<string>) {
  if (!value) return;
  if (Array.isArray(value)) {
    value.forEach((item) => collectSchemaTypesFromValue(item, output));
    return;
  }
  if (typeof value !== 'object') return;

  const type = value['@type'];
  if (typeof type === 'string') output.add(type);
  if (Array.isArray(type)) {
    type.filter((item) => typeof item === 'string').forEach((item) => output.add(item));
  }
  collectSchemaTypesFromValue(value['@graph'], output);
  Object.keys(value).forEach((key) => {
    if (key !== '@graph' && typeof value[key] === 'object') collectSchemaTypesFromValue(value[key], output);
  });
}

function extractStructuredData(root: any) {
  const schemaTypes = new Set<string>();
  let parseErrors = 0;
  const blocks = root.querySelectorAll('script[type*="ld+json"]');

  blocks.forEach((script: any) => {
    const raw = script.text || script.innerText || '';
    if (!raw.trim()) return;
    try {
      collectSchemaTypesFromValue(JSON.parse(raw), schemaTypes);
    } catch {
      parseErrors++;
    }
  });

  return {
    schemaTypes: Array.from(schemaTypes).sort(),
    parseErrors,
    jsonLdBlocks: blocks.length,
  };
}

function extractSocialTags(root: any, pageUrl: string) {
  const meta = (selector: string) => root.querySelector(selector)?.getAttribute('content') || '';
  const image = meta('meta[property="og:image"]') || meta('meta[name="twitter:image"]');
  return {
    ogTitle: meta('meta[property="og:title"]'),
    ogDescription: meta('meta[property="og:description"]'),
    ogImage: image ? normalizeUrl(image, pageUrl) || image : '',
    ogType: meta('meta[property="og:type"]') || 'website',
    twitterCard: meta('meta[name="twitter:card"]') || 'summary',
  };
}

async function fetchWithRedirectChain(
  url: string,
  options: RequestInit = {},
  maxRedirects = 8
): Promise<{ response: Response; chain: RedirectHop[]; finalUrl: string }> {
  let currentUrl = url;
  const chain: RedirectHop[] = [];

  for (let i = 0; i <= maxRedirects; i++) {
    const response = await fetch(currentUrl, {
      ...options,
      redirect: 'manual',
    });

    if (response.status < 300 || response.status >= 400) {
      return { response, chain, finalUrl: currentUrl };
    }

    const location = response.headers.get('location') || '';
    chain.push({ url: currentUrl, status: response.status, location });
    if (!location || i === maxRedirects) {
      return { response, chain, finalUrl: currentUrl };
    }

    currentUrl = normalizeUrl(location, currentUrl) || location;
  }

  const response = await fetch(currentUrl, options);
  return { response, chain, finalUrl: currentUrl };
}

async function getSharedBrowser(env: Record<string, any> | undefined) {
  if (!env?.BROWSER) throw new Error('browser_binding_missing');
  if (!sharedBrowserPromise) {
    const puppeteer = await import('@cloudflare/puppeteer');
    sharedBrowserPromise = puppeteer.launch(env.BROWSER).catch((error: unknown) => {
      sharedBrowserPromise = null;
      throw error;
    });
  }
  return sharedBrowserPromise;
}

function htmlMetricCount(html: string, pattern: RegExp) {
  return (html.match(pattern) || []).length;
}

function buildRenderDomDiff(url: string, rawHtml: string, renderedHtml: string): RenderDomDiff {
  const rawTextLength = stripHtmlForAi(rawHtml).replace(/\s+/g, ' ').trim().length;
  const renderedTextLength = stripHtmlForAi(renderedHtml).replace(/\s+/g, ' ').trim().length;
  const rawLinkCount = htmlMetricCount(rawHtml, /<a\b/gi);
  const renderedLinkCount = htmlMetricCount(renderedHtml, /<a\b/gi);
  const rawScriptCount = htmlMetricCount(rawHtml, /<script\b/gi);
  const renderedScriptCount = htmlMetricCount(renderedHtml, /<script\b/gi);
  const textDelta = Math.abs(renderedTextLength - rawTextLength);
  const linkDelta = Math.abs(renderedLinkCount - rawLinkCount);

  return {
    url,
    rawHash: stableHash(rawHtml),
    renderedHash: stableHash(renderedHtml),
    rawTextLength,
    renderedTextLength,
    rawLinkCount,
    renderedLinkCount,
    rawScriptCount,
    renderedScriptCount,
    significant: rawHtml !== renderedHtml && (textDelta > 500 || linkDelta > 5 || rawScriptCount !== renderedScriptCount),
  };
}

async function renderHtmlWithBrowser(
  url: string,
  env: Record<string, any> | undefined,
  device: 'desktop' | 'mobile',
): Promise<{ html: string; source: 'browser'; error?: never } | { html?: never; source: 'browser'; error: string }> {
  if (!env?.BROWSER) return { source: 'browser', error: 'browser_binding_missing' };

  let page: any;
  try {
    const browser = await getSharedBrowser(env);
    page = await browser.newPage();
    await page.setUserAgent(USER_AGENT_PROFILES[device]);
    await page.setViewport(device === 'mobile'
      ? { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 }
      : { width: 1365, height: 900, isMobile: false, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
    const html = await page.content();
    await page.close();
    return { source: 'browser', html };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'browser_render_failed';
    if (/create new browser|browser.*closed|disconnected|target closed|session closed/i.test(message)) {
      sharedBrowserPromise = null;
    }
    try {
      await page?.close();
    } catch {
      // Ignore browser cleanup failures.
    }
    return { source: 'browser', error: message };
  }
}

async function captureScreenshotArtifacts(
  urls: string[],
  env: Record<string, any> | undefined,
  userId: string,
  device: 'desktop' | 'mobile',
  createdAt: string,
  scanId: string,
  renderAudit: RenderAuditData,
  limit: number
): Promise<EvidenceArtifact[]> {
  const targets = Array.from(new Set(urls.filter(Boolean))).slice(0, Math.max(0, limit));
  renderAudit.screenshots = {
    requested: targets.length,
    captured: 0,
    failed: [],
  };
  if (!env?.BROWSER || !env?.AUDIT_ARTIFACTS || targets.length === 0) return [];

  const artifacts: EvidenceArtifact[] = [];
  for (const target of targets) {
    let page: any;
    try {
      const browser = await getSharedBrowser(env);
      page = await browser.newPage();
      await page.setUserAgent(USER_AGENT_PROFILES[device]);
      await page.setViewport(device === 'mobile'
        ? { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 }
        : { width: 1365, height: 900, isMobile: false, deviceScaleFactor: 1 });
      await page.goto(target, { waitUntil: 'networkidle2', timeout: 15000 });
      const screenshot = await page.screenshot({ type: 'jpeg', quality: 58, fullPage: false });
      await page.close();
      const bytes = screenshot instanceof Uint8Array
        ? screenshot
        : screenshot instanceof ArrayBuffer ? new Uint8Array(screenshot) : new Uint8Array(screenshot as ArrayLike<number>);
      const id = evidenceId(scanId, 'screenshot', target);
      const key = `evidence/${userId || 'anonymous'}/${scanId}/${id}.jpg`;
      await env.AUDIT_ARTIFACTS.put(key, bytes, {
        httpMetadata: { contentType: 'image/jpeg' },
        customMetadata: { scanId, artifactId: id, type: 'screenshot' },
      });
      renderAudit.screenshots.captured += 1;
      artifacts.push({
        id,
        type: 'screenshot',
        url: target,
        contentType: 'image/jpeg',
        storageUri: `r2://web-analyzer-audit-artifacts/${key}`,
        createdAt,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'screenshot_failed';
      renderAudit.screenshots.failed.push({ url: target, reason });
      if (/create new browser|browser.*closed|disconnected|target closed|session closed/i.test(reason)) {
        sharedBrowserPromise = null;
      }
      try {
        await page?.close();
      } catch {
        // Ignore screenshot cleanup failures.
      }
    }
  }

  return artifacts;
}

async function maybeRenderHtml(
  url: string,
  fetchedHtml: string,
  env: Record<string, any> | undefined,
  device: 'desktop' | 'mobile',
  renderMode: 'fetch' | 'browser' | 'auto',
  renderAudit: RenderAuditData,
) {
  if (renderMode === 'fetch') return fetchedHtml;

  const shouldTryBrowser = Boolean(env?.BROWSER) && (renderMode === 'browser' || /<script|__NEXT_DATA__|window\.__/i.test(fetchedHtml));
  if (!shouldTryBrowser) return fetchedHtml;

  renderAudit.pagesRequested += 1;
  const rendered = await renderHtmlWithBrowser(url, env, device);
  if (rendered.html) {
    renderAudit.used = true;
    renderAudit.pagesRendered += 1;
    const diff = buildRenderDomDiff(url, fetchedHtml, rendered.html);
    renderAudit.domDiffs = [...(renderAudit.domDiffs || []), diff].slice(0, 100);
    return rendered.html;
  }
  renderAudit.failedUrls.push({ url, reason: rendered.error || 'browser_render_failed' });
  return fetchedHtml;
}

function apiKey(env: Record<string, any> | undefined, ...keys: string[]) {
  for (const key of keys) {
    const value = env?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function psiMetric(audits: any, key: string) {
  const value = audits?.[key]?.numericValue;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

async function googleApiError(response: Response) {
  const body = await response.json().catch(() => null);
  const message = body?.error?.message || `HTTP ${response.status}`;
  const reason = body?.error?.details?.[0]?.reason || body?.error?.status;
  return reason ? `HTTP ${response.status}: ${message} (${reason})` : `HTTP ${response.status}: ${message}`;
}

async function fetchPsiResults(url: string, env: Record<string, any> | undefined): Promise<PsiStrategyResult[]> {
  const key = apiKey(env, 'PAGESPEED_API_KEY', 'GOOGLE_API_KEY');
  if (!key) return [];

  const strategies = ['mobile', 'desktop'] as const;
  return Promise.all(strategies.map(async (strategy) => {
    const params = new URLSearchParams({
      url,
      strategy,
      locale: 'de',
      key,
    });
    ['performance', 'accessibility', 'best-practices', 'seo'].forEach((category) => params.append('category', category));

    try {
      const response = await fetch(`https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`, {
        signal: AbortSignal.timeout(45000),
      });
      if (!response.ok) return { strategy, metrics: emptyPsiMetrics(), error: await googleApiError(response) };

      const data = await response.json();
      const categories = data.lighthouseResult?.categories || {};
      const audits = data.lighthouseResult?.audits || {};
      return {
        strategy,
        finalUrl: data.lighthouseResult?.finalUrl || data.id,
        performanceScore: scoreFromCategory(categories.performance),
        accessibilityScore: scoreFromCategory(categories.accessibility),
        bestPracticesScore: scoreFromCategory(categories['best-practices']),
        seoScore: scoreFromCategory(categories.seo),
        metrics: {
          fcp: psiMetric(audits, 'first-contentful-paint'),
          lcp: psiMetric(audits, 'largest-contentful-paint'),
          tbt: psiMetric(audits, 'total-blocking-time'),
          cls: psiMetric(audits, 'cumulative-layout-shift'),
          speedIndex: psiMetric(audits, 'speed-index'),
          tti: psiMetric(audits, 'interactive'),
        },
        fieldOverallCategory: data.loadingExperience?.overall_category || data.originLoadingExperience?.overall_category,
        originFallback: Boolean(data.loadingExperience?.origin_fallback || data.originLoadingExperience?.origin_fallback),
        fetchTime: data.lighthouseResult?.fetchTime,
        lighthouseVersion: data.lighthouseResult?.lighthouseVersion,
      };
    } catch (error) {
      return { strategy, metrics: emptyPsiMetrics(), error: error instanceof Error ? error.message : 'psi_fetch_failed' };
    }
  }));
}

function emptyPsiMetrics(): PsiMetrics {
  return { fcp: null, lcp: null, tbt: null, cls: null, speedIndex: null, tti: null };
}

function scoreFromCategory(category: any) {
  return typeof category?.score === 'number' ? Math.round(category.score * 100) : null;
}

async function fetchCruxRecord(url: string, env: Record<string, any> | undefined): Promise<CruxRecordResult | null> {
  const key = apiKey(env, 'CRUX_API_KEY', 'GOOGLE_API_KEY');
  if (!key) return null;

  const endpoint = `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${encodeURIComponent(key)}`;
  const candidates: { source: 'url' | 'origin'; body: Record<string, string> }[] = [
    { source: 'url', body: { url } },
    { source: 'origin', body: { origin: new URL(url).origin } },
  ];

  for (const candidate of candidates) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(candidate.body),
        signal: AbortSignal.timeout(20000),
      });
      if (response.status === 404) continue;
      if (!response.ok) return { source: candidate.source, metrics: {}, error: await googleApiError(response) };

      const data = await response.json();
      return {
        source: candidate.source,
        id: data.record?.key?.url || data.record?.key?.origin,
        formFactor: data.record?.key?.formFactor,
        collectionPeriod: data.record?.collectionPeriod,
        metrics: normalizeCruxMetrics(data.record?.metrics || {}),
      };
    } catch (error) {
      return { source: candidate.source, metrics: {}, error: error instanceof Error ? error.message : 'crux_fetch_failed' };
    }
  }

  return { source: 'origin', metrics: {}, error: 'no_crux_record' };
}

function normalizeCruxMetrics(metrics: Record<string, any>) {
  const normalized: CruxRecordResult['metrics'] = {};
  Object.entries(metrics).forEach(([key, value]) => {
    const densities = Array.isArray(value?.histogram) ? value.histogram.map((bucket: any) => Number(bucket.density) || 0) : [];
    normalized[key] = {
      percentile: value?.percentiles?.p75,
      good: densities[0],
      needsImprovement: densities[1],
      poor: densities[2],
    };
  });
  return normalized;
}

function parseMaybeJson<T = unknown>(value: unknown): T | null {
  if (!value) return null;
  if (typeof value !== 'string') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function matchSearchConsoleProperty(targetUrl: string, sites: any[]) {
  let target: URL | null = null;
  try {
    target = new URL(targetUrl);
  } catch {
    return null;
  }

  const candidates = sites
    .map((site) => String(site?.siteUrl || ''))
    .filter(Boolean)
    .filter((siteUrl) => {
      if (siteUrl.startsWith('sc-domain:')) {
        const domain = siteUrl.replace(/^sc-domain:/, '').toLowerCase();
        return target!.hostname.toLowerCase() === domain || target!.hostname.toLowerCase().endsWith(`.${domain}`);
      }
      return targetUrl.startsWith(siteUrl);
    })
    .sort((a, b) => b.length - a.length);

  return candidates[0] || null;
}

async function refreshGoogleAccessToken(
  env: Record<string, any> | undefined,
  tokens: Record<string, any>,
  userId: string
) {
  if (!tokens.refresh_token || !env?.GOOGLE_CLIENT_ID || !env?.GOOGLE_CLIENT_SECRET) return null;

  const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: tokens.refresh_token,
      grant_type: 'refresh_token',
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!refreshRes.ok) return null;
  const newTokens = await refreshRes.json();
  const merged = { ...tokens, ...newTokens };
  await env?.DB?.prepare?.('UPDATE users SET gsc_tokens_json = ?, updated_at = ? WHERE id = ?')
    .bind(JSON.stringify(merged), nowIso(), userId)
    .run()
    .catch(() => null);
  return merged;
}

async function googleJsonWithRefresh(
  url: string,
  options: RequestInit,
  env: Record<string, any> | undefined,
  tokens: Record<string, any>,
  userId: string,
  retry = false
): Promise<{ data?: any; tokens: Record<string, any>; error?: string }> {
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${tokens.access_token || ''}`);
  headers.set('Content-Type', 'application/json');

  const response = await fetch(url, { ...options, headers, signal: options.signal || AbortSignal.timeout(20000) });
  if (response.status === 401 && !retry) {
    const refreshed = await refreshGoogleAccessToken(env, tokens, userId);
    if (refreshed?.access_token) return googleJsonWithRefresh(url, options, env, refreshed, userId, true);
  }

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    return { tokens, error: error?.error?.message || `HTTP ${response.status}` };
  }

  return { tokens, data: await response.json() };
}

async function fetchGoogleInspectionResults(
  urls: string[],
  env: Record<string, any> | undefined,
  userId: string,
  limit: number
): Promise<GoogleInspectionResult | null> {
  if (!userId || !env?.DB) return null;
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return { source: 'unavailable', inspectedCount: 0, skippedCount: urls.length, results: [], error: 'google_oauth_secrets_missing' };
  }

  const row = await env.DB.prepare('SELECT gsc_tokens_json FROM users WHERE id = ? LIMIT 1')
    .bind(userId)
    .first()
    .catch(() => null) as { gsc_tokens_json?: string | null } | null;
  let tokens = parseMaybeJson<Record<string, any>>(row?.gsc_tokens_json || null);
  if (!tokens?.access_token) {
    return { source: 'unavailable', inspectedCount: 0, skippedCount: urls.length, results: [], error: 'gsc_not_connected' };
  }

  const siteList = await googleJsonWithRefresh('https://www.googleapis.com/webmasters/v3/sites', {}, env, tokens, userId);
  tokens = siteList.tokens;
  if (!siteList.data?.siteEntry?.length) {
    return { source: 'unavailable', inspectedCount: 0, skippedCount: urls.length, results: [], error: siteList.error || 'no_search_console_properties' };
  }

  const property = matchSearchConsoleProperty(urls[0], siteList.data.siteEntry);
  if (!property) {
    return { source: 'unavailable', inspectedCount: 0, skippedCount: urls.length, results: [], error: 'no_matching_search_console_property' };
  }

  const selected = Array.from(new Set(urls)).slice(0, limit);
  const results = [];
  for (const inspectionUrl of selected) {
    const inspected = await googleJsonWithRefresh('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
      method: 'POST',
      body: JSON.stringify({
        inspectionUrl,
        siteUrl: property,
        languageCode: 'de',
      }),
    }, env, tokens, userId);
    tokens = inspected.tokens;
    const indexStatus = inspected.data?.inspectionResult?.indexStatusResult;
    results.push({
      url: inspectionUrl,
      verdict: indexStatus?.verdict,
      coverageState: indexStatus?.coverageState,
      indexingState: indexStatus?.indexingState,
      robotsTxtState: indexStatus?.robotsTxtState,
      pageFetchState: indexStatus?.pageFetchState,
      googleCanonical: indexStatus?.googleCanonical,
      userCanonical: indexStatus?.userCanonical,
      lastCrawlTime: indexStatus?.lastCrawlTime,
      sitemap: indexStatus?.sitemap,
      referringUrls: indexStatus?.referringUrls,
      inspectionResultLink: inspected.data?.inspectionResult?.inspectionResultLink,
      error: inspected.error,
    });
  }

  return {
    source: 'gsc',
    property,
    inspectedCount: results.filter((result) => !result.error).length,
    skippedCount: Math.max(0, urls.length - selected.length),
    results,
  };
}

async function checkExternalLinks(pages: any[], limit = 80): Promise<ExternalLinkCheck[]> {
  const checks: { url: string; sourceUrl: string }[] = [];
  const seen = new Set<string>();

  pages.forEach((page) => {
    (page.externalLinkDetails || []).forEach((link: LinkOccurrence) => {
      const url = link.normalizedHref || link.href;
      if (!url || seen.has(url)) return;
      seen.add(url);
      checks.push({ url, sourceUrl: page.url });
    });
  });

  const selected = checks.slice(0, limit);
  const results: ExternalLinkCheck[] = [];
  for (let i = 0; i < selected.length; i += 8) {
    const batch = selected.slice(i, i + 8);
    const batchResults = await Promise.all(batch.map(async (item) => {
      try {
        let result = await fetchWithRedirectChain(item.url, { method: 'HEAD', signal: AbortSignal.timeout(8000) }, 5);
        if (result.response.status === 405 || result.response.status === 403) {
          result = await fetchWithRedirectChain(item.url, { method: 'GET', signal: AbortSignal.timeout(9000) }, 5);
        }
        return {
          url: item.url,
          sourceUrl: item.sourceUrl,
          status: result.response.status,
          ok: result.response.status < 400,
          redirectChain: result.chain,
        };
      } catch (error) {
        return {
          url: item.url,
          sourceUrl: item.sourceUrl,
          status: 'Error',
          ok: false,
          error: error instanceof Error ? error.message : 'external_link_check_failed',
        };
      }
    }));
    results.push(...batchResults);
  }

  return results;
}

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

function robotsPatternToRegex(pattern: string) {
  const trimmed = pattern.trim();
  if (!trimmed) return null;

  let pathPattern = trimmed;
  try {
    if (/^https?:\/\//i.test(pathPattern)) {
      const parsed = new URL(pathPattern);
      pathPattern = `${parsed.pathname}${parsed.search}`;
    }
  } catch {
    // Keep the original robots pattern if it is not a valid absolute URL.
  }

  const anchoredEnd = pathPattern.endsWith('$');
  const body = (anchoredEnd ? pathPattern.slice(0, -1) : pathPattern)
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');
  // robots.txt patterns are site-provided rules; metacharacters are escaped above before RegExp creation.
  // eslint-disable-next-line security/detect-non-literal-regexp
  return new RegExp(`^${body}${anchoredEnd ? '$' : ''}`);
}

function isAllowedByRobots(robotsTxt: string, path: string, userAgent = 'webanalyzer'): boolean {
  type RobotsRule = { directive: 'allow' | 'disallow'; pattern: string; regex: RegExp; length: number };
  const groups: { agents: string[]; rules: RobotsRule[] }[] = [];
  let currentAgents: string[] = [];
  let currentRules: RobotsRule[] = [];

  const flushGroup = () => {
    if (currentAgents.length > 0) {
      groups.push({ agents: currentAgents, rules: currentRules });
    }
    currentAgents = [];
    currentRules = [];
  };

  for (const rawLine of robotsTxt.split('\n')) {
    const line = rawLine.replace(/#.*/, '').trim();
    if (!line) continue;
    const separator = line.indexOf(':');
    if (separator === -1) continue;

    const directive = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (directive === 'user-agent') {
      if (currentRules.length > 0) flushGroup();
      currentAgents.push(value.toLowerCase());
      continue;
    }

    if ((directive === 'allow' || directive === 'disallow') && currentAgents.length > 0) {
      const regex = robotsPatternToRegex(value);
      if (!regex) continue;
      currentRules.push({
        directive,
        pattern: value,
        regex,
        length: value.replace(/\*/g, '').replace(/\$$/, '').length,
      });
    }
  }
  flushGroup();

  const agent = userAgent.toLowerCase();
  const exactGroups = groups.filter((group) => group.agents.some((item) => item !== '*' && agent.includes(item)));
  const applicableGroups = exactGroups.length > 0 ? exactGroups : groups.filter((group) => group.agents.includes('*'));
  const matchingRules = applicableGroups.flatMap((group) => group.rules).filter((rule) => rule.regex.test(path));
  if (matchingRules.length === 0) return true;

  matchingRules.sort((a, b) => {
    if (b.length !== a.length) return b.length - a.length;
    if (a.directive === b.directive) return 0;
    return a.directive === 'allow' ? -1 : 1;
  });

  return matchingRules[0].directive !== 'disallow';
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

export const scanSubpage = async (
  subUrl: string,
  domain: string,
  robotsTxtContent: string = '',
  options: {
    device?: 'desktop' | 'mobile';
    renderMode?: 'fetch' | 'browser' | 'auto';
    env?: Record<string, any>;
    renderAudit?: RenderAuditData;
  } = {}
): Promise<SubpageResult & { isIndexable?: boolean }> => {
    try {
      const device = options.device || 'desktop';
      const renderMode = options.renderMode || 'auto';
      const redirectResult = await fetchWithRedirectChain(subUrl, { ...requestConfig(device), signal: AbortSignal.timeout(10000) });
      const subRes = redirectResult.response;
      if (subRes.status >= 300 && subRes.status < 400) {
        return {
          error: false,
          url: subUrl,
          urlObj: redirectResult.finalUrl,
          status: subRes.status,
          links: [],
          internalLinkDetails: [],
          externalLinkDetails: [],
          xRobotsTag: subRes.headers.get('X-Robots-Tag') || '',
          redirectLocation: subRes.headers.get('location') || '',
          redirectChain: redirectResult.chain,
          headers: Object.fromEntries(subRes.headers.entries()),
        };
      }
      if (!subRes.ok) return { error: true, url: subUrl, urlObj: redirectResult.finalUrl, status: subRes.status, redirectChain: redirectResult.chain };
      
      const subContentType = subRes.headers.get('content-type') || '';
      if (subContentType && !subContentType.toLowerCase().includes('text/html')) {
        return {
          error: false,
          url: subUrl,
          urlObj: redirectResult.finalUrl,
          status: subRes.status,
          contentType: subContentType,
          title: 'Media/Document',
          links: [],
          externalLinks: [],
          internalLinkDetails: [],
          externalLinkDetails: [],
          strippedContent: '',
          xRobotsTag: subRes.headers.get('X-Robots-Tag') || '',
          redirectChain: redirectResult.chain,
          hasNextPrev: false,
          headers: Object.fromEntries(subRes.headers.entries()),
        };
      }

      const headers = Object.fromEntries(subRes.headers.entries());
      const fetchedHtml = await subRes.text();
      const subHtml = await maybeRenderHtml(subUrl, fetchedHtml, options.env, device, renderMode, options.renderAudit || {
        mode: renderMode,
        used: false,
        available: Boolean(options.env?.BROWSER),
        pagesRendered: 0,
        pagesRequested: 0,
        failedUrls: [],
        source: 'html_fetch',
      });
      const subRoot = parse(subHtml);
      const linkData = extractLinkData(subRoot, subUrl);
      const strippedContent = stripHtmlForAi(subHtml).replace(/\s+/g, ' ').trim().slice(0, 15000);
      const structuredData = extractStructuredData(subRoot);
      const headings = {
        h1: subRoot.querySelectorAll('h1').map(el => el.text.trim()),
        h2: subRoot.querySelectorAll('h2').map(el => el.text.trim()),
        h3: subRoot.querySelectorAll('h3').map(el => el.text.trim())
      };
      const images = subRoot.querySelectorAll('img').map(img => ({
        src: img.getAttribute('src') || '', alt: img.getAttribute('alt') || ''
      }));

      const subResult: SubpageResult = {
        error: false, url: subUrl, urlObj: redirectResult.finalUrl,
        title: subRoot.querySelector('title')?.text.trim() || '',
        metaDescription: subRoot.querySelector('meta[name="description"]')?.getAttribute('content') || '',
        robots: subRoot.querySelector('meta[name="robots"]')?.getAttribute('content') || 'index, follow',
        canonical: subRoot.querySelector('link[rel="canonical"]')?.getAttribute('href') || '',
        h1Count: subRoot.querySelectorAll('h1').length, status: subRes.status,
        contentType: subContentType, strippedContent, links: linkData.internal, externalLinks: linkData.external,
        internalLinkDetails: linkData.internalDetails, externalLinkDetails: linkData.externalDetails,
        xRobotsTag: subRes.headers.get('X-Robots-Tag') || '',
        redirectChain: redirectResult.chain,
        hasNextPrev: !!(subRoot.querySelector('link[rel="next"]') || subRoot.querySelector('link[rel="prev"]')),
        headings,
        images,
        imagesWithoutAlt: images.filter(img => !img.alt || img.alt.trim() === '').length,
        headers,
        htmlLang: subRoot.querySelector('html')?.getAttribute('lang') || '',
        viewport: subRoot.querySelector('meta[name="viewport"]')?.getAttribute('content') || '',
        generator: subRoot.querySelector('meta[name="generator"]')?.getAttribute('content') || '',
        hreflangs: extractHreflangs(subRoot, subUrl),
        structuredDataTypes: structuredData.schemaTypes,
        structuredDataParseErrors: structuredData.parseErrors,
        jsonLdBlocks: structuredData.jsonLdBlocks,
        wordCount: countWords(strippedContent),
        contentFingerprint: contentFingerprint(strippedContent),
      };

      const indexCheck = checkIndexability(redirectResult.finalUrl, subRes.status, subResult.robots || '', subResult.xRobotsTag || '', subContentType, strippedContent, robotsTxtContent, subResult.canonical || null, subResult.hasNextPrev);
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
    const params = new URLSearchParams(parsed.search);
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'].forEach((key) => {
      params.delete(key);
    });
    params.sort();
    parsed.search = params.toString() ? `?${params.toString()}` : '';
    return parsed.toString().replace(/^https?:\/\/www\./, '').replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
  } catch {
    return url.trim().replace(/\/$/, '').toLowerCase();
  }
}

function incrementCount(map: Record<string, number>, key: string | number | undefined) {
  const normalizedKey = String(key ?? 'unknown');
  map[normalizedKey] = (map[normalizedKey] || 0) + 1;
}

function canonicalTarget(page: any) {
  if (!page.canonical) return page.url;
  return normalizeUrl(page.canonical, page.url) || page.canonical;
}

function relContainsNoFollow(rel?: string) {
  return Boolean(rel && /\bnofollow\b/i.test(rel));
}

function linkAnchorText(link: LinkOccurrence) {
  return (link.text || link.ariaLabel || link.title || '').replace(/\s+/g, ' ').trim();
}

function buildCrawlAuditEnhancements(params: {
  mainUrl: string;
  pages: any[];
  sitemapUrls: string[];
  crawledUrls: string[];
  indexableUrls: string[];
  externalLinkChecks: ExternalLinkCheck[];
}): CrawlAuditEnhancements {
  const pageMap = new Map<string, any>();
  const depthDistribution: Record<string, number> = {};
  const statusCodeDistribution: Record<string, number> = {};
  const indexabilityReasons: Record<string, number> = {};
  const nonIndexableUrls: { url: string; reason: string }[] = [];
  const incoming = new Map<string, { sourceUrl: string; anchorText: string; rel?: string }[]>();
  const canonicalMap = new Map<string, string[]>();
  const fingerprintMap = new Map<string, { urls: string[]; wordCounts: number[] }>();
  const nofollowInternalLinks: { sourceUrl: string; targetUrl: string; anchorText: string }[] = [];
  const httpInternalLinks: { sourceUrl: string; targetUrl: string; anchorText: string }[] = [];

  params.pages.forEach((page) => {
    pageMap.set(normalizeComparableUrl(page.url), page);
    incrementCount(depthDistribution, page.crawlDepth ?? 0);
    incrementCount(statusCodeDistribution, page.status);
    const indexabilityReason = page.indexabilityReason || (page.isIndexable ? 'OK' : 'Unknown');
    incrementCount(indexabilityReasons, indexabilityReason);
    if (page.isIndexable === false) nonIndexableUrls.push({ url: page.url, reason: indexabilityReason });

    const canonical = canonicalTarget(page);
    canonicalMap.set(canonical, [...(canonicalMap.get(canonical) || []), page.url]);

    const wordCount = page.wordCount ?? countWords(page.strippedContent || page.textBasis || '');
    const fingerprint = page.contentFingerprint || contentFingerprint(page.strippedContent || page.textBasis || '');
    if (fingerprint && wordCount >= 80) {
      const current = fingerprintMap.get(fingerprint) || { urls: [], wordCounts: [] };
      current.urls.push(page.url);
      current.wordCounts.push(wordCount);
      fingerprintMap.set(fingerprint, current);
    }
  });

  params.pages.forEach((page) => {
    const sourceUrl = page.url;
    const sourceProtocol = (() => {
      try {
        return new URL(sourceUrl).protocol;
      } catch {
        return '';
      }
    })();

    (page.internalLinkDetails || []).forEach((link: LinkOccurrence) => {
      const target = link.normalizedHref || link.href;
      const targetKey = normalizeComparableUrl(target, sourceUrl);
      if (!pageMap.has(targetKey)) return;

      incoming.set(targetKey, [...(incoming.get(targetKey) || []), { sourceUrl, anchorText: linkAnchorText(link), rel: link.rel }]);

      if (relContainsNoFollow(link.rel)) {
        nofollowInternalLinks.push({ sourceUrl, targetUrl: target, anchorText: linkAnchorText(link) });
      }

      try {
        const targetUrl = new URL(target, sourceUrl);
        if (sourceProtocol === 'https:' && targetUrl.protocol === 'http:') {
          httpInternalLinks.push({ sourceUrl, targetUrl: targetUrl.toString(), anchorText: linkAnchorText(link) });
        }
      } catch {
        // Link validity is handled by the crawler itself.
      }
    });
  });

  const sitemapSet = new Set(params.sitemapUrls.map((url) => normalizeComparableUrl(url)));
  const crawledSet = new Set(params.crawledUrls.map((url) => normalizeComparableUrl(url)));
  const indexableSet = new Set(params.indexableUrls.map((url) => normalizeComparableUrl(url)));
  const notCrawledSitemapUrls = params.sitemapUrls.filter((url) => !crawledSet.has(normalizeComparableUrl(url)));

  const pageAudit = params.pages.map((page) => {
    const key = normalizeComparableUrl(page.url);
    const inlinks = incoming.get(key) || [];
    const canonical = canonicalTarget(page);
    return {
      url: page.url,
      status: page.status,
      crawlDepth: page.crawlDepth,
      crawlSource: page.crawlSource,
      isIndexable: page.isIndexable,
      indexabilityReason: page.indexabilityReason,
      titleLength: (page.title || '').trim().length,
      metaDescriptionLength: (page.metaDescription || '').trim().length,
      wordCount: page.wordCount ?? countWords(page.strippedContent || page.textBasis || ''),
      internalInlinks: inlinks.length,
      internalOutlinks: Array.isArray(page.links) ? page.links.length : 0,
      externalOutlinks: Array.isArray(page.externalLinks) ? page.externalLinks.length : 0,
      canonical: page.canonical || '',
      canonicalSelfReferenced: normalizeComparableUrl(canonical, page.url) === normalizeComparableUrl(page.url),
      hreflangCount: Array.isArray(page.hreflangs) ? page.hreflangs.length : 0,
      schemaTypes: Array.isArray(page.structuredDataTypes) ? page.structuredDataTypes : [],
    };
  });

  const orphanUrls = pageAudit
    .filter((page) => page.url !== params.mainUrl && page.internalInlinks === 0 && (sitemapSet.has(normalizeComparableUrl(page.url)) || page.crawlSource === 'sitemap'))
    .map((page) => page.url);
  const lowInlinkUrls = pageAudit
    .filter((page) => page.url !== params.mainUrl && page.isIndexable !== false && page.internalInlinks <= 1)
    .map((page) => ({ url: page.url, inlinks: page.internalInlinks }));
  const deepUrls = pageAudit
    .filter((page) => typeof page.crawlDepth === 'number' && page.crawlDepth > 3)
    .map((page) => ({ url: page.url, depth: page.crawlDepth || 0 }));
  const canonicalClusters = Array.from(canonicalMap.entries())
    .map(([canonical, urls]) => ({ canonical, urls: Array.from(new Set(urls)) }))
    .filter((cluster) => cluster.urls.length > 1);
  const duplicateContentClusters = Array.from(fingerprintMap.entries())
    .map(([fingerprint, value]) => ({
      fingerprint,
      urls: Array.from(new Set(value.urls)),
      wordCount: Math.round(value.wordCounts.reduce((sum, item) => sum + item, 0) / Math.max(1, value.wordCounts.length)),
    }))
    .filter((cluster) => cluster.urls.length > 1);
  const canonicalIssues = params.pages
    .map((page) => {
      const canonical = canonicalTarget(page);
      const target = pageMap.get(normalizeComparableUrl(canonical, page.url));
      if (!target || target.isIndexable !== false) return null;
      return { sourceUrl: page.url, canonical, targetReason: target.indexabilityReason || 'Non-indexable target' };
    })
    .filter((item): item is { sourceUrl: string; canonical: string; targetReason: string } => Boolean(item));

  let totalHreflangTags = 0;
  const invalidTags: { url: string; hreflang: string; href: string }[] = [];
  const missingSelfReferences: string[] = [];
  const missingReturnTags: { sourceUrl: string; targetUrl: string; hreflang: string }[] = [];
  params.pages.forEach((page) => {
    const hreflangs = Array.isArray(page.hreflangs) ? page.hreflangs : [];
    if (hreflangs.length === 0) return;
    totalHreflangTags += hreflangs.length;
    const hrefSet = new Set(hreflangs.map((entry: any) => normalizeComparableUrl(entry.normalizedHref || entry.href, page.url)));
    if (!hrefSet.has(normalizeComparableUrl(page.url))) missingSelfReferences.push(page.url);
    hreflangs.forEach((entry: any) => {
      if (!entry.valid) invalidTags.push({ url: page.url, hreflang: entry.hreflang || '', href: entry.href || '' });
      const target = pageMap.get(normalizeComparableUrl(entry.normalizedHref || entry.href, page.url));
      if (!target || target.url === page.url) return;
      const targetHrefs = new Set((target.hreflangs || []).map((targetEntry: any) => normalizeComparableUrl(targetEntry.normalizedHref || targetEntry.href, target.url)));
      if (!targetHrefs.has(normalizeComparableUrl(page.url))) {
        missingReturnTags.push({ sourceUrl: page.url, targetUrl: target.url, hreflang: entry.hreflang || '' });
      }
    });
  });

  const schemaTypes = new Set<string>();
  const pagesWithStructuredData: string[] = [];
  let jsonLdBlocks = 0;
  let parseErrors = 0;
  params.pages.forEach((page) => {
    (page.structuredDataTypes || []).forEach((type: string) => schemaTypes.add(type));
    if ((page.structuredDataTypes || []).length > 0) pagesWithStructuredData.push(page.url);
    jsonLdBlocks += page.jsonLdBlocks || 0;
    parseErrors += page.structuredDataParseErrors || 0;
  });

  const redirectChains = params.pages
    .filter((page) => Array.isArray(page.redirectChain) && page.redirectChain.length > 0)
    .map((page) => ({ url: page.url, chain: page.redirectChain as RedirectHop[] }));
  const brokenExternalLinks = params.externalLinkChecks.filter((item) => !item.ok);
  const depthValues = pageAudit
    .map((page) => typeof page.crawlDepth === 'number' ? page.crawlDepth : 0)
    .filter((depth) => Number.isFinite(depth));
  const linkGraphMetrics = {
    averageDepth: depthValues.length ? Number((depthValues.reduce((sum, depth) => sum + depth, 0) / depthValues.length).toFixed(2)) : 0,
    maxDepth: depthValues.length ? Math.max(...depthValues) : 0,
    orphanCount: orphanUrls.length,
    lowInlinkCount: lowInlinkUrls.length,
    topLinkedPages: pageAudit
      .map((page) => ({ url: page.url, inlinks: page.internalInlinks, depth: page.crawlDepth || 0 }))
      .sort((a, b) => b.inlinks - a.inlinks)
      .slice(0, 20),
    crawlPriorityPages: pageAudit
      .filter((page) => page.isIndexable !== false && (page.internalInlinks <= 1 || (page.crawlDepth || 0) > 3))
      .map((page) => ({
        url: page.url,
        inlinks: page.internalInlinks,
        depth: page.crawlDepth || 0,
        reason: page.internalInlinks <= 1 ? 'low_internal_authority' : 'too_deep',
      }))
      .slice(0, 50),
  };

  return {
    pageAudit,
    depthDistribution,
    statusCodeDistribution,
    indexabilityReasons,
    nonIndexableUrls,
    sitemapCoverage: {
      submitted: params.sitemapUrls.length,
      crawled: params.sitemapUrls.filter((url) => crawledSet.has(normalizeComparableUrl(url))).length,
      indexable: params.sitemapUrls.filter((url) => indexableSet.has(normalizeComparableUrl(url))).length,
      notCrawled: notCrawledSitemapUrls.slice(0, 100),
    },
    orphanUrls,
    lowInlinkUrls,
    deepUrls,
    nofollowInternalLinks: nofollowInternalLinks.slice(0, 100),
    httpInternalLinks: httpInternalLinks.slice(0, 100),
    linkGraphMetrics,
    canonicalClusters,
    canonicalIssues,
    duplicateContentClusters,
    hreflangSummary: {
      totalTags: totalHreflangTags,
      pagesWithHreflang: params.pages.filter((page) => (page.hreflangs || []).length > 0).length,
      invalidTags: invalidTags.slice(0, 100),
      missingSelfReferences: missingSelfReferences.slice(0, 100),
      missingReturnTags: missingReturnTags.slice(0, 100),
    },
    structuredDataSummary: {
      pagesWithStructuredData,
      schemaTypes: Array.from(schemaTypes).sort(),
      jsonLdBlocks,
      parseErrors,
    },
    externalLinkChecks: {
      checkedCount: params.externalLinkChecks.length,
      brokenCount: brokenExternalLinks.length,
      skippedCount: Math.max(0, new Set(params.pages.flatMap((page) => page.externalLinks || [])).size - params.externalLinkChecks.length),
      brokenLinks: brokenExternalLinks.slice(0, 100),
    },
    redirectChains,
  };
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

function buildEvidenceArtifacts(
  scanId: string,
  pages: any[],
  robotsTxt: string,
  sitemapUrls: string[],
  createdAt: string,
  renderAudit: RenderAuditData,
  psiResults: PsiStrategyResult[] = [],
  cruxRecord: CruxRecordResult | null = null,
  googleInspection: GoogleInspectionResult | null = null,
): EvidenceArtifact[] {
  const artifacts: EvidenceArtifact[] = [];

  for (const page of pages) {
    artifacts.push(makeEvidenceArtifact('headers', page.url, JSON.stringify(page.headers || {}), createdAt, scanId));
    artifacts.push(makeEvidenceArtifact('html', page.url, page.strippedContent?.slice(0, 5000), createdAt, scanId));
    if (Array.isArray(page.redirectChain) && page.redirectChain.length > 0) {
      artifacts.push(makeEvidenceArtifact('redirect_chain', page.url, JSON.stringify(page.redirectChain), createdAt, scanId));
    }
  }

  const mainUrl = pages[0]?.url || '';
  artifacts.push(makeEvidenceArtifact('robots_txt', mainUrl, robotsTxt, createdAt, scanId));
  artifacts.push(makeEvidenceArtifact('sitemap', mainUrl, JSON.stringify({ urlsFound: sitemapUrls.length, sampleUrls: sitemapUrls.slice(0, 100) }), createdAt, scanId));
  (renderAudit.domDiffs || [])
    .filter((diff) => diff.significant)
    .slice(0, 50)
    .forEach((diff) => artifacts.push(makeEvidenceArtifact('rendered_dom', diff.url, JSON.stringify(diff), createdAt, scanId)));
  if (psiResults.length > 0) {
    artifacts.push(makeEvidenceArtifact('psi', mainUrl, JSON.stringify(psiResults), createdAt, scanId));
  }
  if (cruxRecord) {
    artifacts.push(makeEvidenceArtifact('crux', mainUrl, JSON.stringify(cruxRecord), createdAt, scanId));
  }
  if (googleInspection) {
    artifacts.push(makeEvidenceArtifact('gsc', mainUrl, JSON.stringify(googleInspection), createdAt, scanId));
  }

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
  crawlAudit: CrawlAuditEnhancements;
  renderAudit: RenderAuditData;
  psiResults: PsiStrategyResult[];
  cruxRecord: CruxRecordResult | null;
  googleInspection: GoogleInspectionResult | null;
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
  const gscEvidence = (url: string) => evidenceId(params.scanId, 'gsc', url);
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
        fixHint: 'Füge einen eindeutigen, beschreibenden Title Tag hinzu.',
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
        description: `Der Title hat ${title.length} Zeichen und kann in Suchergebnissen gekürzt werden.`,
        fixHint: 'Kürze den Title auf den wichtigsten Suchintent und die zentrale Aussage.',
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
        fixHint: 'Ergänze eine klare, handlungsorientierte Beschreibung pro URL.',
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
        fixHint: 'Beschreibe Nutzen, Thema und nächsten Schritt etwas genauer.',
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
        fixHint: 'Kürze die Beschreibung auf die wichtigsten Suchergebnis-Informationen.',
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
        description: 'Die Seite hat keine H1-Überschrift.',
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
        title: 'Mehrere H1-Überschriften',
        description: `Die Seite hat ${h1Count} H1-Überschriften.`,
        fixHint: 'Nutze eine primäre H1 und strukturiere weitere Abschnitte mit H2/H3.',
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
        fixHint: 'Ergänze kurze, sinnvolle Alt-Texte für informative Bilder.',
        sourceType: 'real',
      });
      addIssue({
        issueType: 'images_missing_alt',
        category: 'accessibility',
        severity: 'medium',
        confidence: 1,
        affectedUrls: [page.url],
        evidenceRefs: [htmlEvidence(page.url)],
        title: 'Alt-Texte für Barrierefreiheit fehlen',
        description: `${imagesWithoutAlt} Bild(er) sind für Screenreader nicht ausreichend beschrieben.`,
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
        fixHint: 'Prüfe, ob diese URL bewusst konsolidiert wird. Falls nicht, korrigiere das Canonical.',
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
        description: 'Die Seite enthält eine noindex-Direktive im Meta-Robots-Tag.',
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
        description: 'Der HTTP Header X-Robots-Tag enthält noindex.',
        fixHint: 'Prüfe Server-, CDN- oder Framework-Konfiguration für X-Robots-Tag.',
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
          description: 'Die URL ist laut robots.txt für den Crawler gesperrt.',
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
        title: 'Dünnen Inhalt erkannt',
        description: `Die Seite hat nur etwa ${wordCount} auslesbare Wörter.`,
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
        title: 'Sitemap enthält nicht gecrawlte URLs',
        description: `${uncrawledSitemapUrls.length} Sitemap-URL(s) wurden in diesem Scan nicht erreicht, meist wegen Crawl-Limit oder Queue-Reihenfolge.`,
        fixHint: 'Prüfe Crawl-Limit, Sitemap-Priorität und interne Verlinkung wichtiger URLs.',
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

  if (params.crawlAudit.externalLinkChecks.brokenLinks.length > 0) {
    addIssue({
      issueType: 'broken_external_link',
      category: 'seo',
      severity: 'medium',
      confidence: 0.9,
      affectedUrls: params.crawlAudit.externalLinkChecks.brokenLinks.slice(0, 80).map((item) => item.url),
      evidenceRefs: params.crawlAudit.externalLinkChecks.brokenLinks.slice(0, 10).map((item) => htmlEvidence(item.sourceUrl)),
      title: 'Defekte externe Links',
      description: `${params.crawlAudit.externalLinkChecks.brokenLinks.length} externe Link(s) antworten nicht erfolgreich oder konnten nicht erreicht werden.`,
      fixHint: 'Prüfe verlinkte externe Ziele, ersetze tote Links oder entferne sie aus der Seite.',
      sourceType: 'real',
    });
  }

  const longRedirectChains = params.crawlAudit.redirectChains.filter((item) => item.chain.length >= 2);
  if (longRedirectChains.length > 0) {
    addIssue({
      issueType: 'long_redirect_chain',
      category: 'seo',
      severity: 'low',
      confidence: 0.95,
      affectedUrls: longRedirectChains.slice(0, 80).map((item) => item.url),
      evidenceRefs: longRedirectChains.slice(0, 10).map((item) => evidenceId(params.scanId, 'redirect_chain', item.url)),
      title: 'Lange Redirect-Kette',
      description: `${longRedirectChains.length} URL(s) haben mindestens zwei Redirect-Hops.`,
      fixHint: 'Verlinke direkt auf finale Ziel-URLs und reduziere Weiterleitungsketten.',
      sourceType: 'real',
    });
  }

  const significantDomDiffs = (params.renderAudit.domDiffs || []).filter((diff) => diff.significant);
  if (significantDomDiffs.length > 0) {
    addIssue({
      issueType: 'rendered_dom_diff',
      category: 'seo',
      severity: 'medium',
      confidence: 0.9,
      affectedUrls: significantDomDiffs.slice(0, 80).map((diff) => diff.url),
      evidenceRefs: significantDomDiffs.slice(0, 10).map((diff) => evidenceId(params.scanId, 'rendered_dom', diff.url)),
      title: 'Gerenderter DOM weicht deutlich vom HTML ab',
      description: `${significantDomDiffs.length} URL(s) liefern nach JavaScript-Rendering deutlich andere Inhalte oder Links als im initialen HTML.`,
      fixHint: 'Prüfe, ob kritische Inhalte, Links, Canonicals und Meta-Daten auch ohne spätes JavaScript stabil im HTML oder direkt nach Render verfügbar sind.',
      sourceType: 'real',
    });
  }

  if (params.googleInspection?.source === 'gsc') {
    const failedInspections = params.googleInspection.results.filter((result) => result.error);
    const notIndexed = params.googleInspection.results.filter((result) => !result.error && result.verdict && result.verdict !== 'PASS');
    const canonicalMismatches = params.googleInspection.results.filter((result) => {
      if (!result.googleCanonical || !result.userCanonical) return false;
      return normalizeComparableUrl(result.googleCanonical) !== normalizeComparableUrl(result.userCanonical);
    });
    const robotsBlocked = params.googleInspection.results.filter((result) => /BLOCKED|DISALLOWED/i.test(`${result.robotsTxtState || ''} ${result.coverageState || ''}`));

    if (notIndexed.length > 0) {
      addIssue({
        issueType: 'gsc_url_not_indexed',
        category: 'seo',
        severity: 'high',
        confidence: 0.98,
        affectedUrls: notIndexed.slice(0, 80).map((result) => result.url),
        evidenceRefs: [gscEvidence(mainUrl)],
        title: 'Google meldet nicht indexierte URLs',
        description: `${notIndexed.length} URL(s) haben in der URL Inspection keinen PASS-Verdict.`,
        fixHint: 'Prüfe Coverage State, Canonical, Robots und Sitemap-Signale in der Search Console und behebe zuerst indexierbare Zielseiten mit Business-Wert.',
        sourceType: 'gsc',
      });
    }

    if (canonicalMismatches.length > 0) {
      addIssue({
        issueType: 'gsc_canonical_mismatch',
        category: 'seo',
        severity: 'medium',
        confidence: 0.95,
        affectedUrls: canonicalMismatches.slice(0, 80).map((result) => result.url),
        evidenceRefs: [gscEvidence(mainUrl)],
        title: 'Google wählt andere Canonicals',
        description: `${canonicalMismatches.length} URL(s) haben laut Search Console einen anderen Google-Canonical als den User-Canonical.`,
        fixHint: 'Stärke Canonical-Signale durch konsistente interne Links, Sitemap-URLs, Redirects, hreflang und eindeutige Inhalte.',
        sourceType: 'gsc',
      });
    }

    if (robotsBlocked.length > 0) {
      addIssue({
        issueType: 'gsc_robots_blocked',
        category: 'seo',
        severity: 'high',
        confidence: 0.98,
        affectedUrls: robotsBlocked.slice(0, 80).map((result) => result.url),
        evidenceRefs: [gscEvidence(mainUrl)],
        title: 'Google sieht Robots-Blockaden',
        description: `${robotsBlocked.length} URL(s) haben in der URL Inspection Robots- oder Fetch-Blockade-Signale.`,
        fixHint: 'Prüfe robots.txt, Meta-Robots, X-Robots-Tag, CDN-Firewall und unterschiedliche Regeln für Googlebot.',
        sourceType: 'gsc',
      });
    }

    if (failedInspections.length > 0) {
      addIssue({
        issueType: 'gsc_inspection_partial_failure',
        category: 'seo',
        severity: 'info',
        confidence: 0.9,
        affectedUrls: failedInspections.slice(0, 80).map((result) => result.url),
        evidenceRefs: [gscEvidence(mainUrl)],
        title: 'Search Console Inspection teilweise fehlgeschlagen',
        description: `${failedInspections.length} URL Inspection Request(s) lieferten einen Provider-Fehler.`,
        fixHint: 'Prüfe Search-Console-Property, OAuth-Scope und API-Quotas.',
        sourceType: 'gsc',
      });
    }
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

  if (params.crawlAudit.orphanUrls.length > 0) {
    addIssue({
      issueType: 'orphan_sitemap_page',
      category: 'seo',
      severity: 'medium',
      confidence: 0.9,
      affectedUrls: params.crawlAudit.orphanUrls.slice(0, 80),
      evidenceRefs: [evidenceId(params.scanId, 'sitemap', mainUrl)],
      title: 'Sitemap-Seiten ohne interne Inlinks',
      description: `${params.crawlAudit.orphanUrls.length} gecrawlte Sitemap-URL(s) haben keine eingehenden internen Links im Crawl-Graph.`,
      fixHint: 'Verlinke wichtige Sitemap-Seiten aus Navigation, Hub-Seiten oder thematisch passenden Inhaltsseiten.',
      sourceType: 'real',
    });
  }

  if (params.crawlAudit.lowInlinkUrls.length > 0) {
    addIssue({
      issueType: 'low_internal_inlinks',
      category: 'seo',
      severity: 'low',
      confidence: 0.85,
      affectedUrls: params.crawlAudit.lowInlinkUrls.slice(0, 80).map((item) => item.url),
      evidenceRefs: params.crawlAudit.lowInlinkUrls.slice(0, 10).map((item) => htmlEvidence(item.url)),
      title: 'Wichtige Seiten haben wenige interne Links',
      description: `${params.crawlAudit.lowInlinkUrls.length} indexierbare Seite(n) haben maximal einen internen Inlink.`,
      fixHint: 'Stärke diese URLs mit kontextuellen Links aus passenden Seiten und Navigationselementen.',
      sourceType: 'real',
    });
  }

  if (params.crawlAudit.deepUrls.length > 0) {
    addIssue({
      issueType: 'deep_page',
      category: 'seo',
      severity: 'low',
      confidence: 0.85,
      affectedUrls: params.crawlAudit.deepUrls.slice(0, 80).map((item) => item.url),
      evidenceRefs: params.crawlAudit.deepUrls.slice(0, 10).map((item) => htmlEvidence(item.url)),
      title: 'Seiten liegen tief in der Crawl-Struktur',
      description: `${params.crawlAudit.deepUrls.length} URL(s) wurden erst ab Crawl-Tiefe 4 erreicht.`,
      fixHint: 'Bringe wichtige URLs näher an Startseite, Kategorie-/Hub-Seiten oder Navigation.',
      sourceType: 'real',
    });
  }

  if (params.crawlAudit.nofollowInternalLinks.length > 0) {
    addIssue({
      issueType: 'internal_nofollow_link',
      category: 'seo',
      severity: 'low',
      confidence: 0.9,
      affectedUrls: params.crawlAudit.nofollowInternalLinks.slice(0, 80).map((item) => item.targetUrl),
      evidenceRefs: params.crawlAudit.nofollowInternalLinks.slice(0, 10).map((item) => htmlEvidence(item.sourceUrl)),
      title: 'Interne Links mit nofollow',
      description: `${params.crawlAudit.nofollowInternalLinks.length} interne Link(s) verwenden rel="nofollow".`,
      fixHint: 'Entferne nofollow bei normalen internen Links, damit Linksignale sauber weitergegeben werden.',
      sourceType: 'real',
    });
  }

  if (params.crawlAudit.httpInternalLinks.length > 0) {
    addIssue({
      issueType: 'http_internal_link',
      category: 'seo',
      severity: 'high',
      confidence: 0.95,
      affectedUrls: params.crawlAudit.httpInternalLinks.slice(0, 80).map((item) => item.targetUrl),
      evidenceRefs: params.crawlAudit.httpInternalLinks.slice(0, 10).map((item) => htmlEvidence(item.sourceUrl)),
      title: 'Interne Links zeigen auf HTTP',
      description: `${params.crawlAudit.httpInternalLinks.length} interne Link(s) zeigen von HTTPS-Seiten auf HTTP-URLs.`,
      fixHint: 'Ersetze interne HTTP-Links konsequent durch HTTPS-Ziele.',
      sourceType: 'real',
    });
  }

  if (params.crawlAudit.canonicalIssues.length > 0) {
    addIssue({
      issueType: 'canonical_points_to_non_indexable',
      category: 'seo',
      severity: 'high',
      confidence: 0.9,
      affectedUrls: params.crawlAudit.canonicalIssues.slice(0, 80).map((item) => item.sourceUrl),
      evidenceRefs: params.crawlAudit.canonicalIssues.slice(0, 10).map((item) => htmlEvidence(item.sourceUrl)),
      title: 'Canonical zeigt auf nicht indexierbare URL',
      description: `${params.crawlAudit.canonicalIssues.length} Canonical-Ziel(e) sind im Crawl nicht indexierbar.`,
      fixHint: 'Setze Canonicals auf indexierbare Zielseiten oder mache das Ziel indexierbar.',
      sourceType: 'real',
    });
  }

  if (params.crawlAudit.duplicateContentClusters.length > 0) {
    addIssue({
      issueType: 'duplicate_content_cluster',
      category: 'seo',
      severity: 'medium',
      confidence: 0.85,
      affectedUrls: params.crawlAudit.duplicateContentClusters.flatMap((cluster) => cluster.urls).slice(0, 120),
      evidenceRefs: params.crawlAudit.duplicateContentClusters.flatMap((cluster) => cluster.urls).slice(0, 10).map(htmlEvidence),
      title: 'Potenzielle Duplicate-Content-Cluster',
      description: `${params.crawlAudit.duplicateContentClusters.length} Inhaltscluster haben nahezu gleiche auslesbare Inhalte.`,
      fixHint: 'Konsolidiere doppelte Seiten, differenziere Inhalte oder setze klare Canonical-Ziele.',
      sourceType: 'heuristic',
    });
  }

  if (params.crawlAudit.hreflangSummary.invalidTags.length > 0) {
    addIssue({
      issueType: 'invalid_hreflang',
      category: 'seo',
      severity: 'medium',
      confidence: 0.9,
      affectedUrls: params.crawlAudit.hreflangSummary.invalidTags.slice(0, 80).map((item) => item.url),
      evidenceRefs: params.crawlAudit.hreflangSummary.invalidTags.slice(0, 10).map((item) => htmlEvidence(item.url)),
      title: 'Ungültige hreflang-Tags',
      description: `${params.crawlAudit.hreflangSummary.invalidTags.length} hreflang-Tag(s) sind unvollständig oder formal ungültig.`,
      fixHint: 'Nutze gültige Sprach-/Regionscodes, absolute URLs und rel="alternate".',
      sourceType: 'real',
    });
  }

  if (params.crawlAudit.hreflangSummary.missingSelfReferences.length > 0) {
    addIssue({
      issueType: 'hreflang_missing_self_reference',
      category: 'seo',
      severity: 'low',
      confidence: 0.85,
      affectedUrls: params.crawlAudit.hreflangSummary.missingSelfReferences.slice(0, 80),
      evidenceRefs: params.crawlAudit.hreflangSummary.missingSelfReferences.slice(0, 10).map(htmlEvidence),
      title: 'hreflang-Selbstreferenz fehlt',
      description: `${params.crawlAudit.hreflangSummary.missingSelfReferences.length} Seite(n) mit hreflang verweisen nicht auf sich selbst.`,
      fixHint: 'Füge pro Sprachversion eine selbstreferenzierende hreflang-URL hinzu.',
      sourceType: 'real',
    });
  }

  if (params.crawlAudit.hreflangSummary.missingReturnTags.length > 0) {
    addIssue({
      issueType: 'hreflang_missing_return_tag',
      category: 'seo',
      severity: 'medium',
      confidence: 0.85,
      affectedUrls: params.crawlAudit.hreflangSummary.missingReturnTags.slice(0, 80).map((item) => item.sourceUrl),
      evidenceRefs: params.crawlAudit.hreflangSummary.missingReturnTags.slice(0, 10).map((item) => htmlEvidence(item.sourceUrl)),
      title: 'hreflang-Return-Tags fehlen',
      description: `${params.crawlAudit.hreflangSummary.missingReturnTags.length} hreflang-Verknüpfung(en) sind nicht reziprok.`,
      fixHint: 'Stelle sicher, dass jede Sprachversion auf alle alternativen Versionen inklusive Rückverweis zeigt.',
      sourceType: 'real',
    });
  }

  if (params.crawlAudit.structuredDataSummary.pagesWithStructuredData.length === 0) {
    addIssue({
      issueType: 'structured_data_missing',
      category: 'seo',
      severity: 'low',
      confidence: 0.85,
      affectedUrls: [mainUrl],
      evidenceRefs: [htmlEvidence(mainUrl)],
      title: 'Keine strukturierten Daten erkannt',
      description: 'Im Crawl wurde kein JSON-LD Schema-Markup erkannt.',
      fixHint: 'Ergänze passendes Organization-, LocalBusiness-, Article-, Product- oder Breadcrumb-Markup.',
      sourceType: 'real',
    });
  }

  if (params.crawlAudit.structuredDataSummary.parseErrors > 0) {
    addIssue({
      issueType: 'structured_data_parse_error',
      category: 'seo',
      severity: 'low',
      confidence: 0.9,
      affectedUrls: params.pages.filter((page) => (page.structuredDataParseErrors || 0) > 0).slice(0, 80).map((page) => page.url),
      evidenceRefs: params.pages.filter((page) => (page.structuredDataParseErrors || 0) > 0).slice(0, 10).map((page) => htmlEvidence(page.url)),
      title: 'Strukturierte Daten enthalten JSON-Fehler',
      description: `${params.crawlAudit.structuredDataSummary.parseErrors} JSON-LD Block/Blöcke konnten nicht geparst werden.`,
      fixHint: 'Validiere JSON-LD gegen schema.org und prüfe Kommas, Quotes und eingebettete HTML-Zeichen.',
      sourceType: 'real',
    });
  }

  const viewportMissing = params.pages.filter((page) => {
    const isHtml = !page.contentType || String(page.contentType).toLowerCase().includes('text/html');
    return !page.error && isHtml && !page.viewport;
  });
  if (viewportMissing.length > 0) {
    addIssue({
      issueType: 'mobile_viewport_missing',
      category: 'seo',
      severity: 'medium',
      confidence: 0.95,
      affectedUrls: viewportMissing.slice(0, 80).map((page) => page.url),
      evidenceRefs: viewportMissing.slice(0, 10).map((page) => htmlEvidence(page.url)),
      title: 'Mobile Viewport fehlt',
      description: `${viewportMissing.length} HTML-Seite(n) haben keinen viewport meta tag.`,
      fixHint: 'Setze <meta name="viewport" content="width=device-width, initial-scale=1">.',
      sourceType: 'real',
    });
  }

  const mainSocialMissing = !params.root.querySelector('meta[property="og:title"]')
    || !params.root.querySelector('meta[property="og:description"]')
    || !params.root.querySelector('meta[property="og:image"]');
  if (mainSocialMissing) {
    addIssue({
      issueType: 'open_graph_incomplete',
      category: 'seo',
      severity: 'info',
      confidence: 0.85,
      affectedUrls: [mainUrl],
      evidenceRefs: [htmlEvidence(mainUrl)],
      title: 'OpenGraph-Daten unvollständig',
      description: 'Title, Description oder Bild für Social-/Messenger-Previews fehlen.',
      fixHint: 'Ergänze og:title, og:description und og:image für bessere Snippet-Kontrolle.',
      sourceType: 'real',
    });
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
      fixHint: 'Führe eine restriktive Content-Security-Policy ein und teste sie zuerst im Report-Only-Modus.',
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
      description: 'Die CSP ist vorhanden, enthält aber breite oder riskante Direktiven.',
      fixHint: 'Vermeide unsafe-inline/unsafe-eval und definiere klare Quellen für Skripte und Inhalte.',
      sourceType: 'heuristic',
    });
  }

  const securityHeaderChecks: Array<[string, string, AuditSeverity, string, string]> = [
    ['strict-transport-security', 'missing_hsts', 'high', 'HSTS fehlt', 'Aktiviere Strict-Transport-Security für HTTPS-Hosts.'],
    ['x-content-type-options', 'missing_x_content_type_options', 'medium', 'X-Content-Type-Options fehlt', 'Setze X-Content-Type-Options: nosniff.'],
    ['referrer-policy', 'missing_referrer_policy', 'medium', 'Referrer-Policy fehlt', 'Setze eine passende Referrer-Policy, z.B. strict-origin-when-cross-origin.'],
    ['permissions-policy', 'missing_permissions_policy', 'low', 'Permissions-Policy fehlt', 'Beschränke Browser-APIs mit Permissions-Policy.'],
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
      title: 'Möglicher Mixed Content',
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
      fixHint: 'Nutze HTTPS für Seiten und Ressourcen und richte Weiterleitungen ein.',
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
      fixHint: 'Prüfe, ob Kontaktformulare oder geschützte Darstellungen sinnvoller sind.',
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
      fixHint: 'Platziere einen gut auffindbaren Link zur Datenschutzerklärung.',
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
      fixHint: 'Prüfe manuell, ob ein Consent-Mechanismus für nicht notwendige Dienste vorhanden ist.',
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
      fixHint: 'Dokumentiere Anbieter, Zweck und Consent-Abhängigkeit in CMP und Datenschutzerklärung.',
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
      title: 'Mögliches Tracking vor Consent',
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
      fixHint: 'Prüfe lokale Font-Auslieferung oder eine dokumentierte Consent-/Rechtsgrundlage.',
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
      fixHint: 'Prüfe Datenflüsse, Consent-Bedarf und Anbieterangaben.',
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
      description: `Folgende AI-Crawler sind für den Vollzugriff blockiert: ${blockedAiBots.map((check) => check.label).join(', ')}.`,
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
      description: `${check.label} ist laut robots.txt für den Vollzugriff blockiert (${check.rule}).`,
      fixHint: 'Prüfe, ob diese Blockade Teil der AI-Governance ist oder die Auffindbarkeit in AI-Systemen begrenzt.',
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
      fixHint: 'Ergänze strukturierte Daten für Organisation, Logo, Kontakt und relevante Profile.',
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
      fixHint: 'Stärke Brand-Entity-Signale mit Schema, Profilen und klarer Unternehmensstruktur.',
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
      title: 'About/Kontakt/Impressum-Struktur unvollständig',
      description: `Fehlende Vertrauensseiten: ${aiChecks.aboutContactImpressum.missing.join(', ')}.`,
      fixHint: 'Verlinke About/Über uns, Kontakt und Impressum sichtbar und konsistent.',
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
      fixHint: 'Ergänze echte Antwortformate, Definitionen oder Schrittfolgen, wenn sie fachlich passen.',
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
      title: 'Überschriftenstruktur prüfen',
      description: 'Die H1-Struktur ist auf mindestens einer Seite auffällig.',
      fixHint: 'Nutze eine klare Überschriftenhierarchie mit einer H1 und logisch folgenden H2/H3.',
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
      fixHint: 'Füge Linktext oder ein sinnvolles aria-label hinzu.',
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
      description: `${unnamedButtons} Button(s) sind für assistive Technologien nicht benannt.`,
      fixHint: 'Ergänze sichtbaren Text oder aria-label für Icon-Buttons.',
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
      fixHint: 'Verknüpfe jedes Eingabefeld mit label, aria-label oder aria-labelledby.',
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

  const successfulPsi = params.psiResults.filter((result) => !result.error);
  const primaryPsi = successfulPsi.find((result) => result.strategy === 'mobile') || successfulPsi[0];
  const hasCruxMetrics = Boolean(params.cruxRecord && Object.keys(params.cruxRecord.metrics || {}).length > 0 && !params.cruxRecord.error);

  if (successfulPsi.length === 0 && !hasCruxMetrics) {
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
  }

  if (params.psiResults.length === 0 || successfulPsi.length === 0) {
    addIssue({
      issueType: 'psi_not_connected',
      category: 'performance',
      severity: 'info',
      confidence: 1,
      affectedUrls: [mainUrl],
      evidenceRefs: [],
      title: 'PageSpeed Insights nicht verbunden',
      description: params.psiResults[0]?.error ? `PageSpeed Insights Fehler: ${params.psiResults[0].error}.` : 'PageSpeed Insights ist für diesen Scan nicht angebunden.',
      fixHint: 'Konfiguriere einen PSI Provider-Key oder kennzeichne Performance weiter als Heuristik.',
      sourceType: 'unavailable',
    });
  }

  if (!hasCruxMetrics) {
    addIssue({
      issueType: 'crux_not_available',
      category: 'performance',
      severity: 'info',
      confidence: 1,
      affectedUrls: [mainUrl],
      evidenceRefs: [],
      title: 'CrUX Felddaten nicht verfügbar',
      description: params.cruxRecord?.error ? `CrUX meldet: ${params.cruxRecord.error}.` : 'Für diesen Scan liegen keine CrUX Felddaten vor.',
      fixHint: 'Prüfe CrUX-Verfügbarkeit auf Origin-/URL-Ebene, wenn ein Provider angebunden ist.',
      sourceType: 'unavailable',
    });
  }

  if (typeof primaryPsi?.performanceScore === 'number' && primaryPsi.performanceScore < 50) {
    addIssue({
      // eslint-disable-next-line no-secrets/no-secrets
      issueType: 'low_lighthouse_performance',
      category: 'performance',
      severity: 'high',
      confidence: 0.95,
      affectedUrls: [mainUrl],
      evidenceRefs: [headerEvidence(mainUrl)],
      title: 'Niedriger Lighthouse Performance Score',
      description: `PageSpeed Insights ${primaryPsi.strategy} Performance Score: ${primaryPsi.performanceScore}.`,
      fixHint: 'Priorisiere LCP, Render-Blocking Resources, JavaScript-Ausführung und Bildoptimierung.',
      sourceType: 'provider',
    });
  }

  if (typeof primaryPsi?.metrics.lcp === 'number' && primaryPsi.metrics.lcp > 2500) {
    addIssue({
      issueType: 'poor_lcp_lab',
      category: 'performance',
      severity: primaryPsi.metrics.lcp > 4000 ? 'high' : 'medium',
      confidence: 0.95,
      affectedUrls: [mainUrl],
      evidenceRefs: [headerEvidence(mainUrl)],
      title: 'LCP im Lab-Test auffällig',
      description: `PageSpeed Insights ${primaryPsi.strategy} LCP: ${Math.round(primaryPsi.metrics.lcp)} ms.`,
      fixHint: 'Optimiere das größte sichtbare Element, Serverantwort, kritisches CSS und Bildauslieferung.',
      sourceType: 'provider',
    });
  }

  if (typeof primaryPsi?.metrics.cls === 'number' && primaryPsi.metrics.cls > 0.1) {
    addIssue({
      issueType: 'poor_cls_lab',
      category: 'performance',
      severity: primaryPsi.metrics.cls > 0.25 ? 'high' : 'medium',
      confidence: 0.95,
      affectedUrls: [mainUrl],
      evidenceRefs: [headerEvidence(mainUrl)],
      title: 'CLS im Lab-Test auffällig',
      description: `PageSpeed Insights ${primaryPsi.strategy} CLS: ${primaryPsi.metrics.cls.toFixed(3)}.`,
      fixHint: 'Reserviere Platz für Bilder, Ads, Embeds und dynamisch geladene UI-Blöcke.',
      sourceType: 'provider',
    });
  }

  return Array.from(issues.values());
}

export async function performPreflight(
  urlObj: URL,
  plan: string,
  env?: Record<string, any>,
  options: {
    device?: 'desktop' | 'mobile';
    renderMode?: 'fetch' | 'browser' | 'auto';
    renderAudit?: RenderAuditData;
    crawlLimitOverride?: number;
  } = {}
) {
  const scanPlan = normalizePlan(plan);
  const planCrawlLimit = getCrawlLimit(scanPlan);
  const overrideLimit = typeof options.crawlLimitOverride === 'number' && Number.isFinite(options.crawlLimitOverride)
    ? Math.max(0, Math.floor(options.crawlLimitOverride))
    : planCrawlLimit;
  const subpageLimit = Math.min(planCrawlLimit, overrideLimit);
  const domain = urlObj.hostname;
  const device = options.device || 'desktop';
  const renderMode = options.renderMode || 'auto';

  const robotsUrl = `${urlObj.origin}/robots.txt`;
  let robotsTxt = { status: 404, content: '', allowed: true, sitemaps: [] as string[], crawlDelay: 0 };
  const robotsCacheKey = `robots:${urlObj.origin}`;
  const cachedRobots = await getCacheJson<typeof robotsTxt>(env, robotsCacheKey).catch(() => null);
  if (cachedRobots) {
    robotsTxt = cachedRobots;
  } else {
    try {
      const res = await fetch(robotsUrl, { ...requestConfig(device), signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        robotsTxt.content = await res.text();
        robotsTxt.status = res.status;
        robotsTxt.content.split('\n').forEach(line => {
          const trimmed = line.trim();
          if (trimmed.toLowerCase().startsWith('crawl-delay:')) {
            robotsTxt.crawlDelay = parseInt(trimmed.split(/crawl-delay:/i)[1].trim()) || 0;
          }
          if (trimmed.toLowerCase().startsWith('sitemap:')) {
            robotsTxt.sitemaps.push(trimmed.split(/sitemap:/i)[1].trim());
          }
        });
        robotsTxt.allowed = isAllowedByRobots(robotsTxt.content, urlObj.pathname + urlObj.search);
        await putCacheJson(env, robotsCacheKey, robotsTxt, 60 * 60).catch(() => false);
      }
    } catch {
      // robots.txt is optional; absence is captured in the returned metadata.
    }
  }

  const sitemapCacheKey = `sitemap:${urlObj.origin}:${stableHash(robotsTxt.content || 'empty')}`;
  let sitemapUrls = await getCacheJson<string[]>(env, sitemapCacheKey).catch(() => null);
  if (!sitemapUrls) {
    sitemapUrls = await getAllUrlsBeforeCrawl(urlObj.origin, robotsTxt.content);
    await putCacheJson(env, sitemapCacheKey, sitemapUrls, 6 * 60 * 60).catch(() => false);
  }
  const fetchStartedAt = Date.now();
  const redirectResult = await fetchWithRedirectChain(urlObj.toString(), { ...requestConfig(device), signal: AbortSignal.timeout(10000) });
  const response = redirectResult.response;
  const responseTimeMs = Date.now() - fetchStartedAt;
  if (!response.ok) throw new Error(`Failed to fetch URL (Status: ${response.status})`);
  
  const fetchedHtml = await response.text();
  const html = await maybeRenderHtml(redirectResult.finalUrl, fetchedHtml, env, device, renderMode, options.renderAudit || {
    mode: renderMode,
    used: false,
    available: Boolean(env?.BROWSER),
    pagesRendered: 0,
    pagesRequested: 0,
    failedUrls: [],
    source: 'html_fetch',
  });
  const mainUrlNormalizedInPreflight = normalizeUrl(redirectResult.finalUrl, urlObj.origin) || redirectResult.finalUrl;

  const initialQueue = new Set<string>();
  sitemapUrls.forEach(u => {
    const norm = normalizeUrl(u, urlObj.origin);
    if (norm && isSameBaseDomain(new URL(norm).hostname, domain) && norm !== mainUrlNormalizedInPreflight && !norm.match(/\.(xml|pdf|png|jpg|jpeg|gif|css|js)$/i)) {
      initialQueue.add(norm);
    }
  });

  return {
    scanPlan,
    subpageLimit,
    domain,
    robotsTxt,
    sitemapUrls,
    mainUrlNormalized: mainUrlNormalizedInPreflight,
    initialQueue: Array.from(initialQueue),
    html,
    headers: Object.fromEntries(response.headers.entries()),
    responseTimeMs,
    redirectChain: redirectResult.chain,
  };
}

export async function performAnalysis({ url, plan = 'free', device = 'desktop', renderMode = 'auto', userId = '', auditId, crawlLimitOverride, env }: ScanOptions): Promise<AnalysisResult> {
  const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
  const runtimeEnv = env || process.env;
  const scanId = auditId || createScanId();
  const createdAt = nowIso();
  const crawlDevice = device === 'mobile' ? 'mobile' : 'desktop';
  const scanRenderMode = renderMode === 'browser' || renderMode === 'fetch' ? renderMode : 'auto';
  const renderAudit: RenderAuditData = {
    mode: scanRenderMode,
    used: false,
    available: Boolean(runtimeEnv?.BROWSER),
    pagesRendered: 0,
    pagesRequested: 0,
    failedUrls: [],
    source: runtimeEnv?.BROWSER ? 'cloudflare_browser_rendering' : 'html_fetch',
  };
  const preflight = await performPreflight(urlObj, plan, runtimeEnv, { device: crawlDevice, renderMode: scanRenderMode, renderAudit, crawlLimitOverride });
  const { scanPlan, subpageLimit, domain, robotsTxt, sitemapUrls, mainUrlNormalized, html, headers, responseTimeMs } = preflight;
  const root = parse(html);
  const ttfbMs = undefined;

  const rdapPromise = fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, { signal: AbortSignal.timeout(10000) }).catch(() => null);
  const psiPromise = fetchPsiResults(mainUrlNormalized, runtimeEnv);
  const cruxPromise = fetchCruxRecord(mainUrlNormalized, runtimeEnv).catch(() => null);

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
  const queue: CrawlQueueEntry[] = [];
  const enqueued = new Set<string>();
  const processed = new Set<string>();
  const fetchedUrls = new Set<string>([mainUrlNormalized]);
  const skippedUrls: { url: string; reason: string }[] = [];
  const blockedUrls: string[] = [];
  const subpageResults: SubpageResult[] = [];
  let crawlDepthReached = 0;

  const enqueue = (entry: CrawlQueueEntry) => {
    const comparable = normalizeComparableUrl(entry.url);
    if (!entry.url || processed.has(comparable) || enqueued.has(comparable)) return;
    queue.push(entry);
    enqueued.add(comparable);
  };

  processed.add(normalizeComparableUrl(mainUrlNormalized));
  preflight.initialQueue.forEach(u => enqueue({ url: u, depth: 1, source: 'sitemap', discoveredFrom: mainUrlNormalized }));

  internalLinks.forEach(l => {
    enqueue({ url: l, depth: 1, source: 'link', discoveredFrom: mainUrlNormalized });
  });

  while (queue.length > 0 && subpageResults.length < subpageLimit) {
    const entry = queue.shift()!;
    const current = entry.url;
    const comparable = normalizeComparableUrl(current);
    enqueued.delete(comparable);
    if (processed.has(comparable)) continue;
    processed.add(comparable);
    crawlDepthReached = Math.max(crawlDepthReached, entry.depth);

    let currentPath = '/';
    try {
      const currentUrl = new URL(current);
      currentPath = currentUrl.pathname + currentUrl.search;
    } catch {
      skippedUrls.push({ url: current, reason: 'malformed_url' });
      continue;
    }

    if (!isAllowedByRobots(robotsTxt.content, currentPath)) {
      blockedUrls.push(current);
      skippedUrls.push({ url: current, reason: 'robots_txt' });
      continue;
    }

    if (robotsTxt.crawlDelay > 0) await new Promise(r => setTimeout(r, Math.min(robotsTxt.crawlDelay * 1000, 3000)));

    const result = await scanSubpage(current, domain, robotsTxt.content, {
      device: crawlDevice,
      renderMode: scanRenderMode,
      env: runtimeEnv,
      renderAudit,
    });
    fetchedUrls.add(current);
    subpageResults.push({
      ...result,
      crawlDepth: entry.depth,
      discoveredFrom: entry.discoveredFrom,
      crawlSource: entry.source,
    });

    if (typeof result.status === 'number' && result.status >= 300 && result.status < 400 && result.redirectLocation) {
      const normTarget = normalizeUrl(result.redirectLocation, current);
      if (normTarget && isSameBaseDomain(new URL(normTarget).hostname, domain)) {
        enqueue({ url: normTarget, depth: entry.depth, source: 'redirect', discoveredFrom: current });
      }
    }

    if (!result.error && result.links) {
      result.links.forEach(l => {
        enqueue({ url: l, depth: entry.depth + 1, source: 'link', discoveredFrom: current });
      });
    }
  }

  for (const entry of queue) {
    skippedUrls.push({ url: entry.url, reason: 'crawl_limit' });
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
  const mainStructuredData = extractStructuredData(root);
  const socialTags = extractSocialTags(root, mainUrlNormalized);
  const mainPage = {
    error: false,
    url: mainUrlNormalized,
    urlObj: mainUrlNormalized,
    crawlDepth: 0,
    crawlSource: 'seed',
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
    redirectChain: preflight.redirectChain,
    hasNextPrev: !!(root.querySelector('link[rel="next"]') || root.querySelector('link[rel="prev"]')),
    headings: mainHeadings,
    images: imageDetails.map((image) => ({ src: image.src, alt: image.alt || '' })),
    imagesWithoutAlt,
    headers,
    htmlLang,
    viewport: root.querySelector('meta[name="viewport"]')?.getAttribute('content') || '',
    generator: root.querySelector('meta[name="generator"]')?.getAttribute('content') || '',
    hreflangs: extractHreflangs(root, mainUrlNormalized),
    structuredDataTypes: mainStructuredData.schemaTypes,
    structuredDataParseErrors: mainStructuredData.parseErrors,
    jsonLdBlocks: mainStructuredData.jsonLdBlocks,
    wordCount: countWords(bodyText),
    contentFingerprint: contentFingerprint(bodyText),
    isIndexable: mainIndex.isIndexable,
    indexabilityReason: mainIndex.reason,
    textBasis: '',
  };
  mainPage.textBasis = buildTextBasis(mainPage);

  const indexableSubpages = successfulSubpages.filter(p => p.isIndexable);
  const discoveredInternalLinks = new Set([
    ...internalLinks,
    ...successfulSubpages.flatMap((page) => page.links || []),
  ]);

  const crawledUrls = Array.from(fetchedUrls);
  const indexableUrls = [...(mainIndex.isIndexable ? [mainUrlNormalized] : []), ...indexableSubpages.map(p => p.url)];
  const brokenLinks = subpageResults
    .filter((result) => result.error || (typeof result.status === 'number' && result.status >= 400))
    .map((result) => ({ url: result.url, status: result.status }));
  const issuePages = [mainPage, ...subpageResults];
  const externalLinkCheckLimit = hasPlanRank(scanPlan, 'business')
    ? 500
    : hasPlanRank(scanPlan, 'agency') ? 120 : hasPlanRank(scanPlan, 'pro') ? 40 : 10;
  const googleInspectionLimit = hasPlanRank(scanPlan, 'business')
    ? 200
    : hasPlanRank(scanPlan, 'agency') ? 50 : hasPlanRank(scanPlan, 'pro') ? 10 : 3;
  const visibilityLimits = getVisibilityLimits(scanPlan);
  const externalLinkChecks = await checkExternalLinks(issuePages, externalLinkCheckLimit);
  const crawlAudit = buildCrawlAuditEnhancements({
    mainUrl: mainUrlNormalized,
    pages: issuePages,
    sitemapUrls,
    crawledUrls,
    indexableUrls,
    externalLinkChecks,
  });
  const aiVisibilityChecks = evaluateAiVisibilityChecks({
    root,
    html,
    robotsTxt: robotsTxt.content,
    title: mainPage.title,
    metaDescription: mainPage.metaDescription,
  });
  const [psiResults, cruxRecord] = await Promise.all([psiPromise, cruxPromise]);
  const googleInspection = await fetchGoogleInspectionResults(
    indexableUrls,
    runtimeEnv,
    userId,
    googleInspectionLimit
  );
  const screenshotEvidence = await captureScreenshotArtifacts(
    [
      mainUrlNormalized,
      ...(crawlAudit.linkGraphMetrics?.crawlPriorityPages || []).map((page) => page.url),
      ...crawlAudit.deepUrls.map((page) => page.url),
      ...crawlAudit.lowInlinkUrls.map((page) => page.url),
    ],
    runtimeEnv,
    userId,
    crawlDevice,
    createdAt,
    scanId,
    renderAudit,
    visibilityLimits.evidencePerReport
  );
  const evidence = [
    ...buildEvidenceArtifacts(scanId, issuePages, robotsTxt.content, sitemapUrls, createdAt, renderAudit, psiResults, cruxRecord, googleInspection),
    ...screenshotEvidence,
  ];
  const urlSnapshots = buildUrlSnapshots(scanId, issuePages, createdAt);
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
    crawlAudit,
    renderAudit,
    psiResults,
    cruxRecord,
    googleInspection,
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
  const psiSourceType: DataSourceType = psiResults.some((result) => !result.error) ? 'provider' : providerAvailability.psi ? 'unavailable' : 'unavailable';
  const cruxSourceType: DataSourceType = cruxRecord && !cruxRecord.error && Object.keys(cruxRecord.metrics || {}).length > 0 ? 'provider' : 'unavailable';
  const dataSources: DataSourceMap = {
    crawl: { type: 'real', label: 'Crawler' },
    issues: { type: 'real', label: 'Deterministische Regeln' },
    rankings: {
      type: providerAvailability.serp || providerAvailability.gsc ? 'provider' : 'unavailable',
      label: providerAvailability.serp || providerAvailability.gsc ? 'Rank-Provider konfiguriert, keine Facts abgerufen' : 'Rank-Provider noch nicht verbunden',
    },
    gsc: {
      type: googleInspection?.source === 'gsc' ? 'gsc' : 'unavailable',
      label: googleInspection?.source === 'gsc'
        ? `Search Console URL Inspection: ${googleInspection.inspectedCount} URL(s)`
        : googleInspection?.error ? `Search Console nicht verfügbar: ${googleInspection.error}` : 'Search Console URL Inspection nicht verbunden',
    },
    backlinks: {
      type: providerAvailability.backlink ? 'provider' : 'unavailable',
      label: providerAvailability.backlink ? 'Backlink-Provider konfiguriert, keine Facts abgerufen' : 'Backlink-Provider noch nicht verbunden',
    },
    keywordResearch: {
      type: providerAvailability.keyword ? 'provider' : 'unavailable',
      label: providerAvailability.keyword ? 'Keyword-Provider konfiguriert, keine Facts abgerufen' : 'Keyword-Provider noch nicht verbunden',
    },
    onPageKeywords: { type: 'heuristic', label: 'On-Page Worthäufigkeit' },
    competition: {
      type: providerAvailability.traffic || providerAvailability.serp ? 'provider' : 'ai_inferred',
      label: providerAvailability.traffic || providerAvailability.serp ? 'Wettbewerber-Provider konfiguriert, keine Facts abgerufen' : 'Nur KI-Hinweise, keine Provider-Fakten',
    },
    aiVisibility: { type: providerAvailability.aiVisibility ? 'provider' : 'heuristic', label: providerAvailability.aiVisibility ? 'AI Visibility Provider konfiguriert' : 'AI Visibility Heuristik' },
    psi: {
      type: psiSourceType,
      label: psiResults.some((result) => !result.error)
        ? 'PageSpeed Insights Live-Daten'
        : providerAvailability.psi ? 'PageSpeed Insights konfiguriert, aber ohne Ergebnis' : 'PageSpeed Insights nicht verbunden',
    },
    crux: {
      type: cruxSourceType,
      label: cruxSourceType === 'provider'
        ? 'CrUX Felddaten'
        : providerAvailability.crux ? 'CrUX konfiguriert, aber ohne Record' : 'CrUX nicht verbunden',
    },
  };
  const aiVisibilityChecksWithProviders: AiVisibilityCheckSet = {
    ...aiVisibilityChecks,
    aiOverviewTracking: {
      ...aiVisibilityChecks.aiOverviewTracking,
      status: providerAvailability.serp ? 'provider_configured' : 'unavailable',
      sourceType: providerAvailability.serp ? 'provider' : 'unavailable',
      provider: providerAvailability.serp ? 'SERP Provider konfiguriert' : 'SERP Provider später',
    },
    promptMonitoring: {
      ...aiVisibilityChecks.promptMonitoring,
      status: providerAvailability.aiVisibility ? 'provider_configured' : 'unavailable',
      sourceType: providerAvailability.aiVisibility ? 'provider' : 'unavailable',
      provider: providerAvailability.aiVisibility ? 'AI Visibility Provider konfiguriert' : 'AI Visibility Provider später',
    },
  };

  const rdapRes = await rdapPromise;
  let domainAge = "Unknown";
  if (rdapRes?.ok) {
    const data = await rdapRes.json();
    domainAge = data.events?.find((e: any) => e.eventAction === 'registration')?.eventDate.split('T')[0] || "Unknown";
  }

  const primaryPsi = psiResults.find((result) => !result.error && result.strategy === 'mobile') || psiResults.find((result) => !result.error);
  const psiMetrics = primaryPsi?.metrics || null;
  const lighthouseScores = primaryPsi
    ? {
        performance: primaryPsi.performanceScore ?? 0,
        accessibility: primaryPsi.accessibilityScore ?? 0,
        bestPractices: primaryPsi.bestPracticesScore ?? 0,
        seo: primaryPsi.seoScore ?? 0,
      }
    : null;
  const psiMetricsStr = primaryPsi
    ? `PSI ${primaryPsi.strategy}: Performance ${primaryPsi.performanceScore ?? 'n/a'}, LCP ${primaryPsi.metrics.lcp ?? 'n/a'} ms, CLS ${primaryPsi.metrics.cls ?? 'n/a'}.`
    : 'Nicht verfügbar: PageSpeed Insights ist nicht verbunden oder lieferte kein Ergebnis.';

  return {
    audit_id: scanId,
    userId,
    createdAt,
    scannerVersion: SCANNER_VERSION,
    plan: scanPlan,
    accountPlan: scanPlan,
    scanPlan,
    crawlLimitUsed: subpageLimit,
    visibilityLimits,
    crawlDevice,
    renderMode: scanRenderMode,
    renderAudit,
    url: mainUrlNormalized,
    urlObj: mainUrlNormalized,
    title: mainPage.title,
    metaDescription: mainPage.metaDescription,
    metaKeywords: root.querySelector('meta[name="keywords"]')?.getAttribute('content') || '',
    htmlLang,
    hreflangs: mainPage.hreflangs || [],
    generator: mainPage.generator || '',
    viewport: mainPage.viewport || '',
    viewportScalable: /user-scalable\s*=\s*no/i.test(mainPage.viewport || '') ? 'No' : 'Yes',
    robots: mainIndex.isIndexable ? 'index, follow' : 'noindex',
    h1Count: root.querySelectorAll('h1').length, h2Count: root.querySelectorAll('h2').length,
    imagesTotal, imagesWithoutAlt, lazyImages, maxDomDepth,
    headings: mainHeadings,
    imageDetails, semanticTags,
    napSignals: { googleMapsLinks: root.querySelectorAll('a[href*="google.com/maps"],a[href*="maps.google"]').length, phoneLinks: root.querySelectorAll('a[href^="tel:"]').length },
    dataLeakage: { emailsFoundCount: emailsFound.length, sampleEmails: emailsFound.slice(0, 5) },
    internalLinksCount: discoveredInternalLinks.size, externalLinksCount: externalLinks.size, totalScripts, blockingScripts, totalStylesheets,
    responseTimeMs, ttfbMs, responseTimeSource: 'real_fetch_elapsed_ms', preflight: { robotsTxt, sitemap: { status: sitemapUrls.length > 0 ? 200 : 404, url: sitemapUrls[0] || null, urlsFound: sitemapUrls.length } },
    psiMetricsStr,
    psiMetrics,
    psiResults,
    cruxRecord,
    googleInspection,
    lighthouseScores,
    safeBrowsingStr: '',
    domainAge,
    sslCertificate: { status: 'READY' },
    wienerSachtextIndex: 0, bodyText, techStack: html.includes('wp-content') ? ['WordPress'] : html.includes('__NEXT_DATA__') ? ['Next.js'] : [],
    cdn, serverInfo: headers['server'] || 'Hidden',
    legal: {
      trackingScripts,
      cmpDetected: { cookieBannerFound },
      linksInFooter: linkTexts.some((text: string) => text.includes('impressum')),
      privacyInFooter: linkTexts.some((text: string) => text.includes('datenschutz') || text.includes('privacy')),
      cookieBannerFound
    },
    social: socialTags,
    existingSchemaCount: mainStructuredData.jsonLdBlocks,
    schemaTypes: mainStructuredData.schemaTypes,
    securityHeaders, headers,
    crawlSummary: { 
      startUrl: mainUrlNormalized,
      sourceType: 'real',
      crawlLimitUsed: subpageLimit,
      visibilityLimits,
      crawlDepthReached,
      totalInternalLinks: discoveredInternalLinks.size,
      internalLinksCount: discoveredInternalLinks.size,
      scannedSubpagesCount: successfulSubpages.length, 
      crawledPagesCount: crawledUrls.length,
      indexablePagesCount: indexableUrls.length,
      sitemapUrls,
      skippedUrls,
      blockedUrls,
      crawledUrls, indexableUrls,
      depthDistribution: crawlAudit.depthDistribution,
      statusCodeDistribution: crawlAudit.statusCodeDistribution,
      indexabilityReasons: crawlAudit.indexabilityReasons,
      nonIndexableUrls: crawlAudit.nonIndexableUrls,
      sitemapCoverage: crawlAudit.sitemapCoverage,
      pageAudit: crawlAudit.pageAudit,
      internalLinking: {
        orphanUrls: crawlAudit.orphanUrls,
        lowInlinkUrls: crawlAudit.lowInlinkUrls,
        deepUrls: crawlAudit.deepUrls,
        nofollowInternalLinks: crawlAudit.nofollowInternalLinks,
        httpInternalLinks: crawlAudit.httpInternalLinks,
        linkGraphMetrics: crawlAudit.linkGraphMetrics,
      },
      canonicalClusters: crawlAudit.canonicalClusters,
      canonicalIssues: crawlAudit.canonicalIssues,
      duplicateContentClusters: crawlAudit.duplicateContentClusters,
      hreflangSummary: crawlAudit.hreflangSummary,
      structuredDataSummary: crawlAudit.structuredDataSummary,
      externalLinkChecks: crawlAudit.externalLinkChecks,
      redirectChains: crawlAudit.redirectChains,
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
