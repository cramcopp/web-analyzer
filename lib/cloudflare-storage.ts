import { getMonthlyCrawlPageLimit, getMonthlyScanLimit, normalizeAddonKey, normalizeAddonQuantities, normalizePlan, type AddonKey } from './plans';
import { compareScans } from './monitoring/diff';
import type { AnalysisResult } from './scanner/types';
import type { AuditIssue, EvidenceArtifact, UrlSnapshot } from '@/types/audit';
import type {
  AiVisibilityFact,
  BacklinkFact,
  CompetitorFact,
  KeywordFact,
  RankFact,
  TrafficFact,
} from '@/types/provider-facts';

type D1PreparedStatement = {
  bind(...values: unknown[]): D1PreparedStatement;
  run<T = unknown>(): Promise<T>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results?: T[] } | T[]>;
};

type D1DatabaseBinding = {
  prepare(query: string): D1PreparedStatement;
  batch?(statements: D1PreparedStatement[]): Promise<unknown[]>;
};

type R2ObjectBody = {
  text(): Promise<string>;
};

type R2BucketBinding = {
  put(key: string, value: string | Uint8Array | ArrayBuffer, options?: Record<string, unknown>): Promise<unknown>;
  get(key: string): Promise<R2ObjectBody | null>;
  delete?(key: string): Promise<void>;
};

export type CloudflareStorageEnv = {
  DB?: D1DatabaseBinding;
  AUDIT_ARTIFACTS?: R2BucketBinding;
  REPORT_EXPORTS?: R2BucketBinding;
};

type SessionUser = {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
};

type StoredReportRow = {
  id: string;
  user_id: string | null;
  project_id: string | null;
  url: string;
  status: string;
  progress: number | null;
  plan: string | null;
  score: number | null;
  summary_json: string | null;
  results_json: string | null;
  raw_artifact_key: string | null;
  result_artifact_key: string | null;
  created_at: string;
  updated_at: string | null;
  completed_at: string | null;
  error: string | null;
};

const AUDIT_BUCKET_URI = 'r2://web-analyzer-audit-artifacts';
const REPORT_BUCKET_URI = 'r2://web-analyzer-report-exports';

function nowIso() {
  return new Date().toISOString();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
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

function safeJson(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return JSON.stringify({ unavailable: true });
  }
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function compactJson(value: unknown, maxLength = 900_000) {
  const serialized = safeJson(value);
  if (serialized.length <= maxLength) return serialized;

  const parsed = parseMaybeJson<Record<string, unknown>>(serialized);
  if (!parsed) return serialized.slice(0, maxLength);

  delete parsed.bodyText;
  delete parsed.rawScrapeData;
  if (isObject(parsed.crawlSummary) && Array.isArray(parsed.crawlSummary.scannedSubpages)) {
    parsed.crawlSummary.scannedSubpages = parsed.crawlSummary.scannedSubpages.map((page) => {
      if (!isObject(page)) return page;
      return {
        url: page.url,
        title: page.title,
        metaDescription: page.metaDescription,
        status: page.status,
        h1Count: page.h1Count,
        imagesWithoutAlt: page.imagesWithoutAlt,
        crawlDepth: page.crawlDepth,
        discoveredFrom: page.discoveredFrom,
        crawlSource: page.crawlSource,
        isIndexable: page.isIndexable,
        indexabilityReason: page.indexabilityReason,
        canonical: page.canonical,
        wordCount: page.wordCount,
        hreflangs: Array.isArray(page.hreflangs) ? page.hreflangs.slice(0, 20) : [],
        structuredDataTypes: page.structuredDataTypes,
        structuredDataParseErrors: page.structuredDataParseErrors,
        jsonLdBlocks: page.jsonLdBlocks,
        redirectChain: Array.isArray(page.redirectChain) ? page.redirectChain.slice(0, 10) : [],
        links: Array.isArray(page.links) ? page.links.slice(0, 100) : [],
        headings: page.headings,
      };
    });
  }

  const compact = safeJson(parsed);
  return compact.length > maxLength ? compact.slice(0, maxLength) : compact;
}

function normalizeScore(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : null;
}

function averageScore(source: Record<string, unknown>) {
  const keys = ['seo', 'performance', 'security', 'accessibility', 'compliance', 'contentStrategy'];
  const scores = keys
    .map((key) => {
      const section = source[key];
      return isObject(section) ? normalizeScore(section.score) : null;
    })
    .filter((score): score is number => score !== null);

  if (scores.length === 0) return null;
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

async function sha256(value: string) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256Binary(value: string | Uint8Array) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  const digestInput = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const buffer = await crypto.subtle.digest('SHA-256', digestInput);
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function getDb(env?: CloudflareStorageEnv | Record<string, unknown> | null) {
  const db = (env as CloudflareStorageEnv | undefined)?.DB;
  return db && typeof db.prepare === 'function' ? db : null;
}

function getAuditBucket(env?: CloudflareStorageEnv | Record<string, unknown> | null) {
  const bucket = (env as CloudflareStorageEnv | undefined)?.AUDIT_ARTIFACTS;
  return bucket && typeof bucket.put === 'function' && typeof bucket.get === 'function' ? bucket : null;
}

function getReportBucket(env?: CloudflareStorageEnv | Record<string, unknown> | null) {
  const bucket = (env as CloudflareStorageEnv | undefined)?.REPORT_EXPORTS;
  return bucket && typeof bucket.put === 'function' && typeof bucket.get === 'function' ? bucket : null;
}

export function hasCloudflareD1(env?: CloudflareStorageEnv | Record<string, unknown> | null) {
  return Boolean(getDb(env));
}

export function hasCloudflareAuditR2(env?: CloudflareStorageEnv | Record<string, unknown> | null) {
  return Boolean(getAuditBucket(env));
}

export function hasCloudflareReportR2(env?: CloudflareStorageEnv | Record<string, unknown> | null) {
  return Boolean(getReportBucket(env));
}

async function runBatch(db: D1DatabaseBinding, statements: D1PreparedStatement[], chunkSize = 50) {
  for (let index = 0; index < statements.length; index += chunkSize) {
    const chunk = statements.slice(index, index + chunkSize);
    if (db.batch) {
      await db.batch(chunk);
    } else {
      await Promise.all(chunk.map((statement) => statement.run()));
    }
  }
}

async function putJson(
  bucket: R2BucketBinding | null,
  bucketUri: string,
  key: string,
  value: unknown,
  metadata: Record<string, string> = {}
) {
  if (!bucket) return null;
  const body = safeJson(value);
  const checksum = await sha256(body);
  await bucket.put(key, body, {
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
    customMetadata: { ...metadata, checksum },
  });

  return {
    key,
    storageUri: `${bucketUri}/${key}`,
    checksum,
    bytes: new TextEncoder().encode(body).byteLength,
  };
}

function base64ToBytes(value: string) {
  if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(value, 'base64'));
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function putBinary(
  bucket: R2BucketBinding | null,
  bucketUri: string,
  key: string,
  value: Uint8Array,
  contentType: string,
  metadata: Record<string, string> = {}
) {
  if (!bucket) return null;
  const checksum = await sha256Binary(value);
  await bucket.put(key, value, {
    httpMetadata: { contentType },
    customMetadata: { ...metadata, checksum },
  });

  return {
    key,
    storageUri: `${bucketUri}/${key}`,
    checksum,
    bytes: value.byteLength,
  };
}

async function getJson<T = unknown>(bucket: R2BucketBinding | null, key: string | null | undefined) {
  if (!bucket || !key) return null;
  const object = await bucket.get(key);
  if (!object) return null;
  return parseMaybeJson<T>(await object.text());
}

function buildReportSummary(result: AnalysisResult | Record<string, unknown>) {
  return {
    audit_id: result.audit_id,
    userId: result.userId,
    url: result.url,
    urlObj: result.urlObj || result.url,
    createdAt: result.createdAt || nowIso(),
    scannerVersion: result.scannerVersion,
    plan: result.plan,
    accountPlan: result.accountPlan,
    scanPlan: result.scanPlan || result.plan,
    crawlLimitUsed: result.crawlLimitUsed,
    visibilityLimits: result.visibilityLimits,
    crawlDevice: result.crawlDevice,
    renderMode: result.renderMode,
    renderAudit: result.renderAudit,
    psiMetricsStr: result.psiMetricsStr,
    psiMetrics: result.psiMetrics,
    psiResults: result.psiResults,
    cruxRecord: result.cruxRecord,
    googleInspection: result.googleInspection,
    lighthouseScores: result.lighthouseScores,
    scanDiff: result.scanDiff,
    status: result.status || 'completed',
    progress: result.progress ?? 100,
    title: result.title,
    metaDescription: result.metaDescription,
    crawlSummary: result.crawlSummary,
    issues: Array.isArray(result.issues) ? result.issues : [],
    evidence: Array.isArray(result.evidence) ? result.evidence : [],
    urlSnapshots: Array.isArray(result.urlSnapshots) ? result.urlSnapshots : [],
    scoreBreakdown: result.scoreBreakdown,
    dataSources: result.dataSources,
    providerAvailability: result.providerAvailability,
    providerStatuses: result.providerStatuses,
    keywordFacts: Array.isArray(result.keywordFacts) ? result.keywordFacts : [],
    rankFacts: Array.isArray(result.rankFacts) ? result.rankFacts : [],
    backlinkFacts: Array.isArray(result.backlinkFacts) ? result.backlinkFacts : [],
    competitorFacts: Array.isArray(result.competitorFacts) ? result.competitorFacts : [],
    trafficFacts: Array.isArray(result.trafficFacts) ? result.trafficFacts : [],
    aiVisibilityFacts: Array.isArray(result.aiVisibilityFacts) ? result.aiVisibilityFacts : [],
    seo: result.seo,
    performance: result.performance,
    security: result.security,
    accessibility: result.accessibility,
    compliance: result.compliance,
    contentStrategy: result.contentStrategy,
    aiVisibility: result.aiVisibility,
  };
}

function getCrawledPagesCount(result: AnalysisResult | Record<string, unknown>) {
  const crawlSummary = isObject(result.crawlSummary) ? result.crawlSummary : {};
  const crawledPagesCount = typeof crawlSummary.crawledPagesCount === 'number' ? crawlSummary.crawledPagesCount : null;
  const crawledUrls = Array.isArray(crawlSummary.crawledUrls) ? crawlSummary.crawledUrls : [];
  const scannedSubpagesCount = typeof crawlSummary.scannedSubpagesCount === 'number' ? crawlSummary.scannedSubpagesCount : null;

  if (crawledPagesCount !== null && Number.isFinite(crawledPagesCount)) return crawledPagesCount;
  if (crawledUrls.length > 0) return crawledUrls.length;
  if (scannedSubpagesCount !== null && Number.isFinite(scannedSubpagesCount)) return scannedSubpagesCount + 1;
  return 1;
}

function reportLikeToRaw(report: Record<string, unknown>) {
  const raw = parseMaybeJson<Record<string, unknown>>(report.rawScrapeData);
  if (raw) return raw;
  return report.crawlSummary || report.issues || report.evidence ? report : null;
}

function reportLikeToResults(report: Record<string, unknown>) {
  return parseMaybeJson<Record<string, unknown>>(report.results);
}

function toReportRow(row: StoredReportRow, raw: Record<string, unknown> | null, results: Record<string, unknown> | null) {
  const summary = parseMaybeJson<Record<string, unknown>>(row.summary_json) || {};
  const mergedRaw = raw || summary;
  const mergedResults = results || parseMaybeJson<Record<string, unknown>>(row.results_json) || summary;
  const scanPlan = normalizePlan(
    (typeof mergedRaw.scanPlan === 'string' ? mergedRaw.scanPlan : null) ||
    (typeof mergedRaw.plan === 'string' ? mergedRaw.plan : null) ||
    row.plan ||
    (typeof summary.scanPlan === 'string' ? summary.scanPlan : null) ||
    'free'
  );
  const accountPlan = normalizePlan(
    (typeof mergedRaw.accountPlan === 'string' ? mergedRaw.accountPlan : null) ||
    scanPlan
  );

  return {
    ...mergedRaw,
    ...summary,
    id: row.id,
    audit_id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    url: row.url,
    urlObj: row.url,
    status: row.status,
    progress: row.progress ?? (row.status === 'completed' ? 100 : 0),
    plan: scanPlan,
    accountPlan,
    scanPlan,
    score: row.score,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    error: row.error,
    results: { ...mergedResults, plan: scanPlan, accountPlan, scanPlan },
    rawScrapeData: { ...mergedRaw, plan: scanPlan, accountPlan, scanPlan },
    artifactStorage: {
      raw: row.raw_artifact_key ? `${AUDIT_BUCKET_URI}/${row.raw_artifact_key}` : null,
      results: row.result_artifact_key ? `${AUDIT_BUCKET_URI}/${row.result_artifact_key}` : null,
    },
  };
}

export function defaultUserProfile(user: SessionUser, existing?: Record<string, unknown> | null) {
  const createdAt = String(existing?.createdAt || nowIso());
  const plan = normalizePlan(typeof existing?.plan === 'string' ? existing.plan : 'free');
  return {
    ...(existing || {}),
    uid: user.uid,
    id: user.uid,
    email: user.email || existing?.email || null,
    displayName: user.displayName || existing?.displayName || null,
    photoURL: user.photoURL || existing?.photoURL || null,
    role: existing?.role || 'user',
    plan,
    scanCount: typeof existing?.scanCount === 'number' ? existing.scanCount : 0,
    maxScans: typeof existing?.maxScans === 'number' ? existing.maxScans : getMonthlyScanLimit(plan),
    crawlPagesCount: typeof existing?.crawlPagesCount === 'number' ? existing.crawlPagesCount : 0,
    maxCrawlPages: typeof existing?.maxCrawlPages === 'number' ? existing.maxCrawlPages : getMonthlyCrawlPageLimit(plan),
    addOns: normalizeAddonQuantities(existing?.addOns),
    stripeAddonSubscriptions: existing?.stripeAddonSubscriptions || {},
    lastScanReset: existing?.lastScanReset || createdAt,
    stripeCustomerId: existing?.stripeCustomerId || null,
    gscTokens: existing?.gscTokens || null,
    createdAt,
    updatedAt: nowIso(),
  };
}

function toUserProfile(row: Record<string, unknown> | null) {
  if (!row) return null;
  const profile = parseMaybeJson<Record<string, unknown>>(row.profile_json) || {};
  return {
    ...profile,
    uid: row.id,
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    photoURL: row.photo_url,
    role: row.role || profile.role || 'user',
    plan: row.plan || profile.plan || 'free',
    scanCount: typeof row.scan_count === 'number' ? row.scan_count : profile.scanCount || 0,
    maxScans: typeof row.max_scans === 'number' ? row.max_scans : profile.maxScans || getMonthlyScanLimit(row.plan as string || 'free'),
    crawlPagesCount: typeof row.crawl_pages_count === 'number' ? row.crawl_pages_count : profile.crawlPagesCount || 0,
    maxCrawlPages: typeof row.max_crawl_pages === 'number' ? row.max_crawl_pages : profile.maxCrawlPages || getMonthlyCrawlPageLimit(row.plan as string || 'free'),
    addOns: normalizeAddonQuantities(parseMaybeJson(row.add_ons_json) || profile.addOns),
    stripeAddonSubscriptions: parseMaybeJson<Record<string, unknown>>(row.stripe_addon_subscriptions_json) || profile.stripeAddonSubscriptions || {},
    lastScanReset: row.last_scan_reset || profile.lastScanReset,
    stripeCustomerId: row.stripe_customer_id || profile.stripeCustomerId,
    gscTokens: row.gsc_tokens_json || profile.gscTokens,
    createdAt: row.created_at || profile.createdAt,
    updatedAt: row.updated_at || profile.updatedAt,
  };
}

export async function getCloudflareUserProfile(env: CloudflareStorageEnv | Record<string, unknown> | undefined, userId: string) {
  const db = getDb(env);
  if (!db) return null;

  const row = await db.prepare('SELECT * FROM users WHERE id = ? LIMIT 1').bind(userId).first<Record<string, unknown>>();
  return toUserProfile(row);
}

export async function upsertCloudflareUserProfile(
  env: CloudflareStorageEnv | Record<string, unknown> | undefined,
  user: SessionUser,
  profile: Record<string, unknown> = {}
) {
  const db = getDb(env);
  if (!db) return false;

  const normalized = defaultUserProfile(user, profile);
  const now = nowIso();
  await db.prepare(`
    INSERT INTO users (
      id, email, display_name, photo_url, role, plan, scan_count, max_scans,
      crawl_pages_count, max_crawl_pages, add_ons_json, stripe_addon_subscriptions_json,
      last_scan_reset, stripe_customer_id, gsc_tokens_json, profile_json, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      email = excluded.email,
      display_name = excluded.display_name,
      photo_url = excluded.photo_url,
      role = excluded.role,
      plan = excluded.plan,
      scan_count = excluded.scan_count,
      max_scans = excluded.max_scans,
      crawl_pages_count = excluded.crawl_pages_count,
      max_crawl_pages = excluded.max_crawl_pages,
      add_ons_json = excluded.add_ons_json,
      stripe_addon_subscriptions_json = excluded.stripe_addon_subscriptions_json,
      last_scan_reset = excluded.last_scan_reset,
      stripe_customer_id = excluded.stripe_customer_id,
      gsc_tokens_json = COALESCE(excluded.gsc_tokens_json, users.gsc_tokens_json),
      profile_json = excluded.profile_json,
      updated_at = excluded.updated_at
  `).bind(
    user.uid,
    normalized.email,
    normalized.displayName,
    normalized.photoURL,
    normalized.role,
    normalized.plan,
    normalized.scanCount,
    normalized.maxScans,
    normalized.crawlPagesCount,
    normalized.maxCrawlPages,
    safeJson(normalized.addOns),
    safeJson(normalized.stripeAddonSubscriptions),
    normalized.lastScanReset,
    normalized.stripeCustomerId || null,
    normalized.gscTokens || null,
    safeJson(normalized),
    normalized.createdAt,
    now
  ).run();

  return true;
}

export async function patchCloudflareUserProfile(
  env: CloudflareStorageEnv | Record<string, unknown> | undefined,
  userId: string,
  data: Record<string, unknown>
) {
  const db = getDb(env);
  if (!db) return false;

  const existing = await getCloudflareUserProfile(env, userId);
  const merged = { ...(existing || {}), ...data, updatedAt: nowIso() };

  await db.prepare(`
    UPDATE users
    SET display_name = COALESCE(?, display_name),
        photo_url = COALESCE(?, photo_url),
        plan = COALESCE(?, plan),
        scan_count = COALESCE(?, scan_count),
        max_scans = COALESCE(?, max_scans),
        crawl_pages_count = COALESCE(?, crawl_pages_count),
        max_crawl_pages = COALESCE(?, max_crawl_pages),
        add_ons_json = COALESCE(?, add_ons_json),
        stripe_addon_subscriptions_json = COALESCE(?, stripe_addon_subscriptions_json),
        last_scan_reset = COALESCE(?, last_scan_reset),
        stripe_customer_id = COALESCE(?, stripe_customer_id),
        gsc_tokens_json = COALESCE(?, gsc_tokens_json),
        profile_json = ?,
        updated_at = ?
    WHERE id = ?
  `).bind(
    data.displayName ?? null,
    data.photoURL ?? null,
    data.plan ?? null,
    data.scanCount ?? null,
    data.maxScans ?? null,
    data.crawlPagesCount ?? null,
    data.maxCrawlPages ?? null,
    data.addOns !== undefined ? safeJson(normalizeAddonQuantities(data.addOns)) : null,
    data.stripeAddonSubscriptions !== undefined ? safeJson(data.stripeAddonSubscriptions) : null,
    data.lastScanReset ?? null,
    data.stripeCustomerId ?? null,
    data.gscTokens ?? null,
    safeJson(merged),
    merged.updatedAt,
    userId
  ).run();

  return true;
}

export async function updateCloudflareStripeSubscription(
  env: CloudflareStorageEnv | Record<string, unknown> | undefined,
  userId: string,
  data: Record<string, unknown> & { plan?: string; maxScans?: number; maxCrawlPages?: number }
) {
  const db = getDb(env);
  if (!db) return false;

  const existing = await getCloudflareUserProfile(env, userId);
  const now = nowIso();
  const plan = normalizePlan(String(data.plan || existing?.plan || 'free'));
  const maxScans = typeof data.maxScans === 'number' ? data.maxScans : getMonthlyScanLimit(plan);
  const maxCrawlPages = typeof data.maxCrawlPages === 'number' ? data.maxCrawlPages : getMonthlyCrawlPageLimit(plan);
  const merged = {
    ...(existing || { uid: userId, id: userId, role: 'user', scanCount: 0 }),
    ...data,
    plan,
    maxScans,
    maxCrawlPages,
    lastScanReset: data.lastScanReset || now,
    updatedAt: now,
  };

  await db.prepare(`
    INSERT INTO users (
      id, email, display_name, photo_url, role, plan, scan_count, max_scans,
      crawl_pages_count, max_crawl_pages, add_ons_json, stripe_addon_subscriptions_json,
      last_scan_reset, stripe_customer_id, gsc_tokens_json, profile_json, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      plan = excluded.plan,
      max_scans = excluded.max_scans,
      max_crawl_pages = excluded.max_crawl_pages,
      add_ons_json = excluded.add_ons_json,
      stripe_addon_subscriptions_json = excluded.stripe_addon_subscriptions_json,
      last_scan_reset = excluded.last_scan_reset,
      stripe_customer_id = COALESCE(excluded.stripe_customer_id, users.stripe_customer_id),
      profile_json = excluded.profile_json,
      updated_at = excluded.updated_at
  `).bind(
    userId,
    existing?.email || null,
    existing?.displayName || null,
    existing?.photoURL || null,
    existing?.role || 'user',
    plan,
    existing?.scanCount || 0,
    maxScans,
    existing?.crawlPagesCount || 0,
    maxCrawlPages,
    safeJson(normalizeAddonQuantities(existing?.addOns)),
    safeJson(existing?.stripeAddonSubscriptions || {}),
    String(data.lastScanReset || now),
    data.stripeCustomerId || existing?.stripeCustomerId || null,
    existing?.gscTokens || null,
    safeJson(merged),
    existing?.createdAt || now,
    now
  ).run();

  return true;
}

type StripeAddonSubscriptionRecord = {
  addonKey: AddonKey;
  quantity: number;
  status?: string | null;
  updatedAt: string;
};

export async function updateCloudflareStripeAddonSubscription(
  env: CloudflareStorageEnv | Record<string, unknown> | undefined,
  userId: string,
  data: {
    subscriptionId: string;
    addonKey: string;
    quantity?: number;
    status?: string | null;
    active: boolean;
  }
) {
  if (!data.subscriptionId || !userId) return false;

  const addonKey = normalizeAddonKey(data.addonKey);
  if (!addonKey) return false;

  const existing = await getCloudflareUserProfile(env, userId);
  if (!existing) return false;

  const now = nowIso();
  const addOns = normalizeAddonQuantities(existing.addOns);
  const subscriptions = {
    ...(existing.stripeAddonSubscriptions || {}),
  } as Record<string, StripeAddonSubscriptionRecord>;

  const previous = subscriptions[data.subscriptionId];
  if (previous?.addonKey) {
    const previousQuantity = Math.max(0, Math.floor(Number(previous.quantity) || 0));
    addOns[previous.addonKey] = Math.max((addOns[previous.addonKey] || 0) - previousQuantity, 0);
  }

  if (data.active) {
    const quantity = Math.max(1, Math.floor(Number(data.quantity) || 1));
    addOns[addonKey] = (addOns[addonKey] || 0) + quantity;
    subscriptions[data.subscriptionId] = {
      addonKey,
      quantity,
      status: data.status || null,
      updatedAt: now,
    };
  } else {
    delete subscriptions[data.subscriptionId];
  }

  const compactAddOns = normalizeAddonQuantities(addOns);
  const updated = await patchCloudflareUserProfile(env, userId, {
    addOns: compactAddOns,
    stripeAddonSubscriptions: subscriptions,
  });
  return updated;
}

export async function getCloudflareUserByEmail(
  env: CloudflareStorageEnv | Record<string, unknown> | undefined,
  email: string
) {
  const db = getDb(env);
  if (!db) return null;

  const row = await db.prepare('SELECT * FROM users WHERE lower(email) = lower(?) LIMIT 1').bind(email).first<Record<string, unknown>>();
  return toUserProfile(row);
}

export async function getCloudflareUsersByIds(
  env: CloudflareStorageEnv | Record<string, unknown> | undefined,
  userIds: string[]
) {
  const db = getDb(env);
  const ids = Array.from(new Set(userIds.filter(Boolean))).slice(0, 50);
  if (!db || ids.length === 0) return [];

  const placeholders = ids.map(() => '?').join(', ');
  const response = await db.prepare(`SELECT * FROM users WHERE id IN (${placeholders})`).bind(...ids).all<Record<string, unknown>>();
  const rows = Array.isArray(response) ? response : response.results || [];
  return rows.map(toUserProfile).filter(Boolean);
}

export async function deleteCloudflareUserData(
  env: CloudflareStorageEnv | Record<string, unknown> | undefined,
  userId: string
) {
  const db = getDb(env);
  if (!db) return false;

  const tables = [
    'ai_visibility_facts',
    'traffic_facts',
    'competitor_facts',
    'backlink_facts',
    'rank_facts',
    'keyword_facts',
    'provider_facts',
    'scheduled_reports',
    'report_branding',
    'issue_comments',
    'issue_tasks',
    'report_shares',
    'scan_diffs',
    'uptime_checks',
    'alert_events',
    'alert_rules',
    'scheduled_scans',
    'url_snapshots',
    'evidence_artifacts',
    'issues',
    'scans',
    'projects',
  ];

  await runBatch(db, tables.map((table) => db.prepare(`DELETE FROM ${table} WHERE user_id = ?`).bind(userId)), 20);
  await db.prepare('DELETE FROM teams WHERE owner_id = ? OR members_json LIKE ?').bind(userId, `%${userId}%`).run();
  await db.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
  return true;
}

export async function incrementCloudflareUserScanCount(
  env: CloudflareStorageEnv | Record<string, unknown> | undefined,
  user: SessionUser,
  amount = 1
) {
  const db = getDb(env);
  if (!db) return false;

  const now = nowIso();
  const existing = await getCloudflareUserProfile(env, user.uid);
  if (!existing) {
    await upsertCloudflareUserProfile(env, user);
  }
  await db.prepare(`
    UPDATE users
    SET scan_count = COALESCE(scan_count, 0) + ?,
        updated_at = ?
    WHERE id = ?
  `).bind(amount, now, user.uid).run();
  return true;
}

export async function incrementCloudflareUserCrawlPageCount(
  env: CloudflareStorageEnv | Record<string, unknown> | undefined,
  userId: string,
  amount = 0,
  plan?: string | null
) {
  const db = getDb(env);
  if (!db || !userId || amount <= 0) return false;

  const scanPlan = normalizePlan(plan || 'free');
  const now = nowIso();
  // eslint-disable-next-line no-secrets/no-secrets
  await db.prepare(`
    UPDATE users
    SET crawl_pages_count = COALESCE(crawl_pages_count, 0) + ?,
        max_crawl_pages = COALESCE(max_crawl_pages, ?),
        updated_at = ?
    WHERE id = ?
  `).bind(amount, getMonthlyCrawlPageLimit(scanPlan), now, userId).run();
  return true;
}

function projectFromRow(row: Record<string, unknown>) {
  const settings = parseMaybeJson<Record<string, unknown>>(row.settings_json) || {};
  return {
    ...settings,
    id: row.id,
    userId: row.user_id,
    teamId: row.team_id,
    name: row.name,
    url: row.url,
    plan: row.plan,
    crawlLimit: row.crawl_limit,
    lastScore: row.last_score,
    lastScanAt: row.last_scan_at,
    members: parseMaybeJson<string[]>(row.members_json) || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function queryCloudflareProjects(
  env: CloudflareStorageEnv | Record<string, unknown> | undefined,
  userId: string
) {
  const db = getDb(env);
  if (!db) return [];

  const response = await db.prepare(`
    SELECT * FROM projects
    WHERE user_id = ? OR members_json LIKE ?
    ORDER BY datetime(created_at) DESC
  `).bind(userId, `%${userId}%`).all<Record<string, unknown>>();
  const rows = Array.isArray(response) ? response : response.results || [];
  return rows.map(projectFromRow);
}

export async function getCloudflareProject(
  env: CloudflareStorageEnv | Record<string, unknown> | undefined,
  projectId: string,
  userId: string
) {
  const db = getDb(env);
  if (!db) return null;

  const row = await db.prepare('SELECT * FROM projects WHERE id = ? LIMIT 1').bind(projectId).first<Record<string, unknown>>();
  if (!row) return null;
  const members = parseMaybeJson<string[]>(row.members_json) || [];
  if (row.user_id !== userId && !members.includes(userId)) return { forbidden: true };
  return projectFromRow(row);
}

export async function upsertCloudflareProject(
  env: CloudflareStorageEnv | Record<string, unknown> | undefined,
  project: Record<string, unknown> & { id: string; userId: string; name: string }
) {
  const db = getDb(env);
  if (!db) return false;

  const now = nowIso();
  const createdAt = String(project.createdAt || now);
  const members = Array.isArray(project.members) ? project.members : [project.userId];

  await db.prepare(`
    INSERT INTO projects (
      id, user_id, team_id, name, url, plan, crawl_limit, last_score,
      last_scan_at, members_json, settings_json, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      team_id = excluded.team_id,
      name = excluded.name,
      url = excluded.url,
      plan = excluded.plan,
      crawl_limit = excluded.crawl_limit,
      last_score = excluded.last_score,
      last_scan_at = excluded.last_scan_at,
      members_json = excluded.members_json,
      settings_json = excluded.settings_json,
      updated_at = excluded.updated_at
  `).bind(
    project.id,
    project.userId,
    project.teamId || null,
    project.name,
    project.url || null,
    project.plan || 'free',
    project.crawlLimit || null,
    project.lastScore || null,
    project.lastScanAt || null,
    safeJson(members),
    safeJson(project),
    createdAt,
    String(project.updatedAt || now)
  ).run();

  return true;
}

export async function patchCloudflareProject(
  env: CloudflareStorageEnv | Record<string, unknown> | undefined,
  projectId: string,
  userId: string,
  data: Record<string, unknown>
) {
  const db = getDb(env);
  if (!db) return false;

  const existing = await getCloudflareProject(env, projectId, userId);
  if (!existing || 'forbidden' in existing) return false;

  await upsertCloudflareProject(env, {
    ...existing,
    ...data,
    id: projectId,
    userId: String(existing.userId),
    name: String(data.name || existing.name || 'Projekt'),
    updatedAt: nowIso(),
  });
  return true;
}

export async function deleteCloudflareProject(
  env: CloudflareStorageEnv | Record<string, unknown> | undefined,
  projectId: string,
  userId: string
) {
  const db = getDb(env);
  if (!db) return false;

  const existing = await getCloudflareProject(env, projectId, userId);
  if (!existing || 'forbidden' in existing) return false;

  await db.prepare('DELETE FROM projects WHERE id = ?').bind(projectId).run();
  return true;
}

function teamFromRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    members: parseMaybeJson<string[]>(row.members_json) || [],
    admins: parseMaybeJson<string[]>(row.admins_json) || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function queryCloudflareTeamForMember(
  env: CloudflareStorageEnv | Record<string, unknown> | undefined,
  userId: string
) {
  const db = getDb(env);
  if (!db) return null;

  const row = await db.prepare(`
    SELECT * FROM teams
    WHERE owner_id = ? OR members_json LIKE ?
    ORDER BY datetime(created_at) DESC
    LIMIT 1
  `).bind(userId, `%${userId}%`).first<Record<string, unknown>>();

  return row ? teamFromRow(row) : null;
}

export async function getCloudflareTeam(
  env: CloudflareStorageEnv | Record<string, unknown> | undefined,
  teamId: string
) {
  const db = getDb(env);
  if (!db) return null;

  const row = await db.prepare('SELECT * FROM teams WHERE id = ? LIMIT 1').bind(teamId).first<Record<string, unknown>>();
  return row ? teamFromRow(row) : null;
}

export async function createCloudflareTeam(
  env: CloudflareStorageEnv | Record<string, unknown> | undefined,
  team: { id: string; name: string; ownerId: string; members: string[]; admins: string[]; createdAt?: string }
) {
  const db = getDb(env);
  if (!db) return false;

  const now = nowIso();
  await db.prepare(`
    INSERT INTO teams (id, owner_id, name, members_json, admins_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    team.id,
    team.ownerId,
    team.name,
    safeJson(team.members),
    safeJson(team.admins),
    team.createdAt || now,
    now
  ).run();
  return true;
}

export async function updateCloudflareTeam(
  env: CloudflareStorageEnv | Record<string, unknown> | undefined,
  teamId: string,
  data: { name?: string; members?: string[]; admins?: string[] }
) {
  const db = getDb(env);
  if (!db) return false;

  const existing = await getCloudflareTeam(env, teamId);
  if (!existing) return false;

  const updated = {
    name: data.name || String(existing.name),
    members: data.members || existing.members,
    admins: data.admins || existing.admins,
  };

  await db.prepare(`
    UPDATE teams
    SET name = ?, members_json = ?, admins_json = ?, updated_at = ?
    WHERE id = ?
  `).bind(
    updated.name,
    safeJson(updated.members),
    safeJson(updated.admins),
    nowIso(),
    teamId
  ).run();
  return true;
}

export async function deleteCloudflareTeam(
  env: CloudflareStorageEnv | Record<string, unknown> | undefined,
  teamId: string,
  ownerId: string
) {
  const db = getDb(env);
  if (!db) return false;

  const team = await getCloudflareTeam(env, teamId);
  if (!team || team.ownerId !== ownerId) return false;

  await db.prepare('DELETE FROM teams WHERE id = ?').bind(teamId).run();
  return true;
}

const monitoringTables = {
  scheduledScans: 'scheduled_scans',
  alertRules: 'alert_rules',
  alertEvents: 'alert_events',
  uptimeChecks: 'uptime_checks',
  scanDiffs: 'scan_diffs',
} as const;

type MonitoringCollection = keyof typeof monitoringTables;

function isMonitoringCollection(collection: string): collection is MonitoringCollection {
  return collection in monitoringTables;
}

function monitoringFromRow(row: Record<string, unknown>) {
  const data = parseMaybeJson<Record<string, unknown>>(row.data_json) || {};
  return {
    ...data,
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
    checkedAt: row.checked_at,
  };
}

export async function queryCloudflareMonitoring(
  env: CloudflareStorageEnv | Record<string, unknown> | undefined,
  input: { userId: string; projectId: string }
) {
  const db = getDb(env);
  if (!db) return null;

  const entries = await Promise.all(Object.entries(monitoringTables).map(async ([key, table]) => {
    const response = await db.prepare(`
      SELECT * FROM ${table}
      WHERE user_id = ? AND project_id = ?
      ORDER BY datetime(created_at) DESC
      LIMIT 100
    `).bind(input.userId, input.projectId).all<Record<string, unknown>>();
    const rows = Array.isArray(response) ? response : response.results || [];
    return [key, rows.map(monitoringFromRow)];
  }));

  return Object.fromEntries(entries);
}

export async function upsertCloudflareMonitoringItem(
  env: CloudflareStorageEnv | Record<string, unknown> | undefined,
  input: {
    collection: string;
    id: string;
    userId: string;
    projectId: string;
    data: Record<string, unknown>;
  }
) {
  const db = getDb(env);
  if (!db || !isMonitoringCollection(input.collection)) return false;

  const table = monitoringTables[input.collection];
  const now = nowIso();
  const data: Record<string, any> = {
    ...input.data,
    id: input.id,
    userId: input.userId,
    projectId: input.projectId,
    updatedAt: now,
    createdAt: input.data.createdAt || now,
  };

  if (input.collection === 'scheduledScans') {
    await db.prepare(`
      INSERT INTO scheduled_scans (id, user_id, project_id, url, frequency, plan, enabled, next_run_at, last_run_at, data_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET url = excluded.url, frequency = excluded.frequency, plan = excluded.plan,
        enabled = excluded.enabled, next_run_at = excluded.next_run_at, last_run_at = excluded.last_run_at,
        data_json = excluded.data_json, updated_at = excluded.updated_at
    `).bind(
      input.id,
      input.userId,
      input.projectId,
      data.url || '',
      data.frequency || 'weekly',
      data.plan || 'free',
      data.enabled === false ? 0 : 1,
      data.nextRunAt || null,
      data.lastRunAt || null,
      safeJson(data),
      data.createdAt,
      data.updatedAt
    ).run();
    return true;
  }

  if (input.collection === 'alertRules') {
    await db.prepare(`
      INSERT INTO alert_rules (id, user_id, project_id, type, enabled, threshold, data_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET type = excluded.type, enabled = excluded.enabled, threshold = excluded.threshold,
        data_json = excluded.data_json, updated_at = excluded.updated_at
    `).bind(
      input.id,
      input.userId,
      input.projectId,
      data.type || 'score_drop',
      data.enabled === false ? 0 : 1,
      data.threshold || null,
      safeJson(data),
      data.createdAt,
      data.updatedAt
    ).run();
    return true;
  }

  if (input.collection === 'alertEvents') {
    await db.prepare(`
      INSERT INTO alert_events (id, user_id, project_id, type, severity, title, description, issue_id, url, status, data_json, created_at, resolved_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET status = excluded.status, data_json = excluded.data_json, resolved_at = excluded.resolved_at
    `).bind(
      input.id,
      input.userId,
      input.projectId,
      data.type || 'score_drop',
      data.severity || 'medium',
      data.title || 'Alert',
      data.description || '',
      data.issueId || null,
      data.url || null,
      data.status || 'open',
      safeJson(data),
      data.createdAt,
      data.resolvedAt || null
    ).run();
    return true;
  }

  if (input.collection === 'uptimeChecks') {
    await db.prepare(`
      INSERT INTO uptime_checks (id, user_id, project_id, url, status, status_code, response_time_ms, data_json, checked_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET status = excluded.status, status_code = excluded.status_code,
        response_time_ms = excluded.response_time_ms, data_json = excluded.data_json, checked_at = excluded.checked_at
    `).bind(
      input.id,
      input.userId,
      input.projectId,
      data.url || '',
      data.status || 'unknown',
      data.statusCode || null,
      data.responseTimeMs || null,
      safeJson(data),
      data.checkedAt || now,
      data.createdAt
    ).run();
    return true;
  }

  await db.prepare(`
    INSERT INTO ${table} (
      id, user_id, project_id, previous_scan_id, current_scan_id, new_issues_json,
      open_issues_json, fixed_issues_json, ignored_issues_json, reopened_issues_json,
      score_delta_json, data_json, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      new_issues_json = excluded.new_issues_json,
      open_issues_json = excluded.open_issues_json,
      fixed_issues_json = excluded.fixed_issues_json,
      ignored_issues_json = excluded.ignored_issues_json,
      reopened_issues_json = excluded.reopened_issues_json,
      score_delta_json = excluded.score_delta_json,
      data_json = excluded.data_json
  `).bind(
    input.id,
    input.userId,
    input.projectId,
    data.previousScanId || null,
    data.currentScanId || input.id,
    safeJson(data.newIssues || []),
    safeJson(data.openIssues || []),
    safeJson(data.fixedIssues || []),
    safeJson(data.ignoredIssues || []),
    safeJson(data.reopenedIssues || []),
    safeJson(data.scoreDelta || {}),
    safeJson(data),
    data.createdAt
  ).run();

  return true;
}

export async function queryCloudflareDueScheduledScans(
  env: CloudflareStorageEnv | Record<string, unknown> | undefined
) {
  const db = getDb(env);
  if (!db) return [];

  const now = nowIso();
  const response = await db.prepare(`
    SELECT * FROM scheduled_scans
    WHERE enabled = 1 AND (next_run_at IS NULL OR datetime(next_run_at) <= datetime(?))
    ORDER BY datetime(next_run_at) ASC
    LIMIT 50
  `).bind(now).all<Record<string, unknown>>();
  const rows = Array.isArray(response) ? response : response.results || [];
  return rows.map(monitoringFromRow);
}

export async function updateCloudflareScheduledScanRun(
  env: CloudflareStorageEnv | Record<string, unknown> | undefined,
  input: { id: string; lastRunAt: string; nextRunAt: string }
) {
  const db = getDb(env);
  if (!db) return false;

  await db.prepare(`
    UPDATE scheduled_scans
    SET last_run_at = ?, next_run_at = ?, updated_at = ?
    WHERE id = ?
  `).bind(input.lastRunAt, input.nextRunAt, nowIso(), input.id).run();
  return true;
}

export async function queryCloudflareAgencyData(
  env: CloudflareStorageEnv | Record<string, unknown> | undefined,
  input: { userId: string; projectId: string }
) {
  const db = getDb(env);
  if (!db) return null;

  const [brandingRows, taskRows, commentRows, scheduledRows] = await Promise.all([
    db.prepare('SELECT * FROM report_branding WHERE user_id = ? AND project_id = ? ORDER BY datetime(updated_at) DESC')
      .bind(input.userId, input.projectId).all<Record<string, unknown>>(),
    db.prepare('SELECT * FROM issue_tasks WHERE user_id = ? AND project_id = ? ORDER BY datetime(updated_at) DESC')
      .bind(input.userId, input.projectId).all<Record<string, unknown>>(),
    db.prepare('SELECT * FROM issue_comments WHERE user_id = ? AND project_id = ? ORDER BY datetime(created_at) DESC')
      .bind(input.userId, input.projectId).all<Record<string, unknown>>(),
    db.prepare('SELECT * FROM scheduled_reports WHERE user_id = ? AND project_id = ? ORDER BY datetime(updated_at) DESC')
      .bind(input.userId, input.projectId).all<Record<string, unknown>>(),
  ]);

  const unwrap = (response: { results?: Record<string, unknown>[] } | Record<string, unknown>[]) =>
    (Array.isArray(response) ? response : response.results || []);

  return {
    branding: unwrap(brandingRows).map((row) => ({ ...(parseMaybeJson(row.data_json) || {}), ...row, id: row.id, userId: row.user_id, projectId: row.project_id })),
    issueTasks: unwrap(taskRows).map((row) => ({
      id: row.id,
      userId: row.user_id,
      projectId: row.project_id,
      issueId: row.issue_id,
      title: row.title,
      status: row.status,
      assigneeId: row.assignee_id,
      assigneeName: row.assignee_name,
      severity: row.severity,
      affectedUrls: parseMaybeJson(row.affected_urls_json) || [],
      commentCount: row.comment_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    issueComments: unwrap(commentRows).map((row) => ({
      id: row.id,
      userId: row.user_id,
      projectId: row.project_id,
      issueId: row.issue_id,
      authorId: row.author_id,
      authorName: row.author_name,
      body: row.body,
      createdAt: row.created_at,
    })),
    scheduledReports: unwrap(scheduledRows).map((row) => ({
      id: row.id,
      userId: row.user_id,
      projectId: row.project_id,
      recipients: parseMaybeJson(row.recipients_json) || [],
      frequency: row.frequency,
      enabled: row.enabled === 1,
      visibility: row.visibility,
      builder: parseMaybeJson(row.builder_json),
      lastSentAt: row.last_sent_at,
      mailProviderConnected: row.mail_provider_connected === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
  };
}

export async function upsertCloudflareAgencyItem(
  env: CloudflareStorageEnv | Record<string, unknown> | undefined,
  input: { action: string; id: string; userId: string; projectId: string; data: Record<string, unknown> }
) {
  const db = getDb(env);
  if (!db) return false;

  const now = nowIso();
  const data: Record<string, any> = {
    ...input.data,
    id: input.id,
    userId: input.userId,
    projectId: input.projectId,
  };

  if (input.action === 'saveBranding') {
    await db.prepare(`
      INSERT INTO report_branding (id, user_id, team_id, project_id, scope, display_name, primary_color, logo_url, footer_note, data_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET display_name = excluded.display_name, primary_color = excluded.primary_color,
        logo_url = excluded.logo_url, footer_note = excluded.footer_note, data_json = excluded.data_json, updated_at = excluded.updated_at
    `).bind(
      input.id,
      input.userId,
      data.teamId || input.userId,
      input.projectId,
      data.scope || 'project',
      data.displayName || null,
      data.primaryColor || null,
      data.logoUrl || null,
      data.footerNote || null,
      safeJson({ ...data, updatedAt: now }),
      now
    ).run();
    return true;
  }

  if (input.action === 'saveTask') {
    await db.prepare(`
      INSERT INTO issue_tasks (id, user_id, project_id, issue_id, title, status, assignee_id, assignee_name, severity, affected_urls_json, comment_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET title = excluded.title, status = excluded.status, assignee_id = excluded.assignee_id,
        assignee_name = excluded.assignee_name, severity = excluded.severity, affected_urls_json = excluded.affected_urls_json,
        comment_count = excluded.comment_count, updated_at = excluded.updated_at
    `).bind(
      input.id,
      input.userId,
      input.projectId,
      data.issueId || '',
      data.title || 'Issue Task',
      data.status || 'new',
      data.assigneeId || null,
      data.assigneeName || null,
      data.severity || null,
      safeJson(data.affectedUrls || []),
      data.commentCount || 0,
      data.createdAt || now,
      now
    ).run();
    return true;
  }

  if (input.action === 'addComment') {
    await db.prepare(`
      INSERT INTO issue_comments (id, user_id, project_id, issue_id, author_id, author_name, body, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      input.id,
      input.userId,
      input.projectId,
      data.issueId || '',
      data.authorId || input.userId,
      data.authorName || null,
      data.body || '',
      data.createdAt || now
    ).run();
    await db.prepare('UPDATE issue_tasks SET comment_count = comment_count + 1, updated_at = ? WHERE issue_id = ? AND project_id = ?')
      .bind(now, data.issueId || '', input.projectId)
      .run();
    return true;
  }

  if (input.action === 'saveScheduledReport') {
    await db.prepare(`
      INSERT INTO scheduled_reports (id, user_id, project_id, recipients_json, frequency, enabled, visibility, builder_json, last_sent_at, mail_provider_connected, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET recipients_json = excluded.recipients_json, frequency = excluded.frequency,
        enabled = excluded.enabled, visibility = excluded.visibility, builder_json = excluded.builder_json,
        last_sent_at = excluded.last_sent_at, mail_provider_connected = excluded.mail_provider_connected,
        updated_at = excluded.updated_at
    `).bind(
      input.id,
      input.userId,
      input.projectId,
      safeJson(data.recipients || []),
      data.frequency || 'weekly',
      data.enabled === false ? 0 : 1,
      data.visibility || 'private',
      data.builder ? safeJson(data.builder) : null,
      data.lastSentAt || null,
      data.mailProviderConnected ? 1 : 0,
      data.createdAt || now,
      now
    ).run();
    return true;
  }

  return false;
}

export async function createCloudflareScanPlaceholder(
  env: CloudflareStorageEnv | Record<string, unknown> | undefined,
  input: {
    id: string;
    userId: string;
    projectId?: string;
    url: string;
    plan?: string;
    status?: string;
    progress?: number;
    createdAt?: string;
  }
) {
  const db = getDb(env);
  if (!db) return false;

  const createdAt = input.createdAt || nowIso();
  const scanPlan = normalizePlan(input.plan || 'free');
  const summary = {
    audit_id: input.id,
    userId: input.userId,
    projectId: input.projectId || null,
    url: input.url,
    urlObj: input.url,
    plan: scanPlan,
    accountPlan: scanPlan,
    scanPlan,
    status: input.status || 'scanning',
    progress: input.progress ?? 0,
    createdAt,
  };

  await db.prepare(`
    INSERT INTO scans (
      id, user_id, project_id, url, status, progress, plan, summary_json, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      user_id = excluded.user_id,
      project_id = excluded.project_id,
      url = excluded.url,
      status = excluded.status,
      progress = excluded.progress,
      plan = excluded.plan,
      summary_json = excluded.summary_json,
      updated_at = excluded.updated_at
  `).bind(
    input.id,
    input.userId,
    input.projectId || null,
    input.url,
    input.status || 'scanning',
    input.progress ?? 0,
    scanPlan,
    safeJson(summary),
    createdAt,
    nowIso()
  ).run();

  return true;
}

export async function storeCloudflareScanArtifacts(
  env: CloudflareStorageEnv | Record<string, unknown> | undefined,
  result: AnalysisResult,
  context: { scanId?: string; userId?: string } = {}
) {
  const bucket = getAuditBucket(env);
  if (!bucket) return result;

  const scanId = context.scanId || result.audit_id;
  const userId = context.userId || result.userId || 'anonymous';
  const evidence = await Promise.all((result.evidence || []).map(async (artifact) => {
    if (!artifact.inlineValue) return artifact;

    if (artifact.type === 'screenshot' && artifact.contentType?.startsWith('image/')) {
      const extension = artifact.contentType.includes('png') ? 'png' : 'jpg';
      const stored = await putBinary(
        bucket,
        AUDIT_BUCKET_URI,
        `evidence/${userId}/${scanId}/${artifact.id}.${extension}`,
        base64ToBytes(artifact.inlineValue),
        artifact.contentType,
        {
          scanId,
          artifactId: artifact.id,
          type: artifact.type,
        }
      );

      return {
        ...artifact,
        storageUri: stored?.storageUri || artifact.storageUri,
        checksum: stored?.checksum || artifact.checksum,
        inlineValue: undefined,
      };
    }

    const stored = await putJson(
      bucket,
      AUDIT_BUCKET_URI,
      `evidence/${userId}/${scanId}/${artifact.id}.json`,
      {
        ...artifact,
        scanId,
      },
      {
        scanId,
        artifactId: artifact.id,
        type: artifact.type,
      }
    );

    return {
      ...artifact,
      storageUri: stored?.storageUri || artifact.storageUri,
      checksum: stored?.checksum || artifact.checksum,
      contentType: 'application/json',
      inlineValue: undefined,
    };
  }));

  return {
    ...result,
    evidence,
  };
}

function issueStatements(db: D1DatabaseBinding, issues: AuditIssue[], userId: string, projectId: string | null) {
  const now = nowIso();
  return issues.map((issue) => db.prepare(`
    INSERT INTO issues (
      id, scan_id, user_id, project_id, issue_type, category, severity, confidence,
      status, title, description, fix_hint, business_impact, source_type,
      affected_urls_json, evidence_refs_json, rule_version, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      severity = excluded.severity,
      confidence = excluded.confidence,
      status = CASE WHEN issues.status IN ('ignored', 'fixed') THEN issues.status ELSE excluded.status END,
      title = excluded.title,
      description = excluded.description,
      fix_hint = excluded.fix_hint,
      business_impact = excluded.business_impact,
      source_type = excluded.source_type,
      affected_urls_json = excluded.affected_urls_json,
      evidence_refs_json = excluded.evidence_refs_json,
      rule_version = excluded.rule_version,
      updated_at = excluded.updated_at
  `).bind(
    issue.id,
    issue.scanId,
    userId,
    projectId,
    issue.issueType,
    issue.category,
    issue.severity,
    issue.confidence,
    issue.status || 'new',
    issue.title,
    issue.description,
    issue.fixHint,
    issue.businessImpact || null,
    issue.sourceType,
    safeJson(issue.affectedUrls),
    safeJson(issue.evidenceRefs),
    issue.ruleVersion,
    issue.createdAt || now,
    now
  ));
}

function evidenceStatements(db: D1DatabaseBinding, scanId: string, evidence: EvidenceArtifact[], userId: string, projectId: string | null) {
  return evidence.map((artifact) => db.prepare(`
    INSERT INTO evidence_artifacts (
      id, scan_id, user_id, project_id, type, url, storage_uri, checksum, inline_preview, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      storage_uri = excluded.storage_uri,
      checksum = excluded.checksum,
      inline_preview = excluded.inline_preview
  `).bind(
    artifact.id,
    scanId,
    userId,
    projectId,
    artifact.type,
    artifact.url,
    artifact.storageUri || null,
    artifact.checksum || null,
    artifact.inlineValue ? artifact.inlineValue.slice(0, 1000) : null,
    artifact.createdAt
  ));
}

function snapshotStatements(db: D1DatabaseBinding, snapshots: UrlSnapshot[], userId: string, projectId: string | null) {
  return snapshots.map((snapshot) => db.prepare(`
    INSERT INTO url_snapshots (
      id, scan_id, user_id, project_id, url, status_code, content_type, title,
      meta_description, canonical, robots_meta, x_robots_tag, headers_json,
      internal_links_json, external_links_json, images_json, headings_json,
      text_basis, captured_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      status_code = excluded.status_code,
      content_type = excluded.content_type,
      title = excluded.title,
      meta_description = excluded.meta_description,
      canonical = excluded.canonical,
      robots_meta = excluded.robots_meta,
      x_robots_tag = excluded.x_robots_tag,
      headers_json = excluded.headers_json,
      internal_links_json = excluded.internal_links_json,
      external_links_json = excluded.external_links_json,
      images_json = excluded.images_json,
      headings_json = excluded.headings_json,
      text_basis = excluded.text_basis,
      captured_at = excluded.captured_at
  `).bind(
    snapshot.id,
    snapshot.scanId,
    userId,
    projectId,
    snapshot.url,
    String(snapshot.statusCode),
    snapshot.contentType || null,
    snapshot.title || null,
    snapshot.metaDescription || null,
    snapshot.canonical || null,
    snapshot.robotsMeta || null,
    snapshot.xRobotsTag || null,
    safeJson(snapshot.headers),
    safeJson(snapshot.internalLinks),
    safeJson(snapshot.externalLinks),
    safeJson(snapshot.images),
    safeJson(snapshot.headings),
    snapshot.textBasis ? snapshot.textBasis.slice(0, 2000) : null,
    snapshot.capturedAt
  ));
}

function factStatements(db: D1DatabaseBinding, result: AnalysisResult, userId: string) {
  const keywordFacts = (result.keywordFacts || []).map((fact: KeywordFact) => db.prepare(`
    INSERT INTO keyword_facts (
      id, project_id, user_id, keyword, region, language, device, volume, cpc,
      competition, difficulty, intent, provider, fetched_at, confidence
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      volume = excluded.volume,
      cpc = excluded.cpc,
      competition = excluded.competition,
      difficulty = excluded.difficulty,
      intent = excluded.intent,
      fetched_at = excluded.fetched_at,
      confidence = excluded.confidence
  `).bind(
    `${fact.projectId}:${fact.keyword}:${fact.region}:${fact.language}:${fact.device}:${fact.provider}`,
    fact.projectId,
    userId,
    fact.keyword,
    fact.region,
    fact.language,
    fact.device,
    fact.volume,
    fact.cpc,
    fact.competition,
    fact.difficulty,
    fact.intent || null,
    fact.provider,
    fact.fetchedAt,
    fact.confidence
  ));

  const rankFacts = (result.rankFacts || []).map((fact: RankFact) => db.prepare(`
    INSERT INTO rank_facts (
      id, project_id, user_id, keyword, domain, url, rank, previous_rank,
      serp_features_json, region, device, provider, checked_at, confidence
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      rank = excluded.rank,
      previous_rank = excluded.previous_rank,
      serp_features_json = excluded.serp_features_json,
      checked_at = excluded.checked_at,
      confidence = excluded.confidence
  `).bind(
    `${fact.projectId}:${fact.keyword}:${fact.domain}:${fact.region}:${fact.device}:${fact.provider}`,
    fact.projectId,
    userId,
    fact.keyword,
    fact.domain,
    fact.url || null,
    fact.rank,
    fact.previousRank ?? null,
    safeJson(fact.serpFeatures),
    fact.region,
    fact.device,
    fact.provider,
    fact.checkedAt,
    fact.confidence
  ));

  const backlinkFacts = (result.backlinkFacts || []).map((fact: BacklinkFact) => db.prepare(`
    INSERT INTO backlink_facts (
      id, project_id, user_id, source_url, source_domain, target_url, anchor,
      nofollow, first_seen, last_seen, lost, authority_metric, provider, fetched_at, confidence
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      anchor = excluded.anchor,
      nofollow = excluded.nofollow,
      last_seen = excluded.last_seen,
      lost = excluded.lost,
      authority_metric = excluded.authority_metric,
      fetched_at = excluded.fetched_at,
      confidence = excluded.confidence
  `).bind(
    `${fact.projectId}:${fact.sourceUrl}:${fact.targetUrl}:${fact.provider}`,
    fact.projectId,
    userId,
    fact.sourceUrl,
    fact.sourceDomain,
    fact.targetUrl,
    fact.anchor || null,
    fact.nofollow ? 1 : 0,
    fact.firstSeen || null,
    fact.lastSeen || null,
    fact.lost ? 1 : 0,
    fact.authorityMetric ?? null,
    fact.provider,
    fact.fetchedAt,
    fact.confidence
  ));

  const competitorFacts = (result.competitorFacts || []).map((fact: CompetitorFact) => db.prepare(`
    INSERT INTO competitor_facts (id, project_id, user_id, competitor_domain, source, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET source = excluded.source
  `).bind(
    `${fact.projectId}:${fact.competitorDomain}:${fact.source}`,
    fact.projectId,
    userId,
    fact.competitorDomain,
    String(fact.source),
    fact.createdAt
  ));

  const trafficFacts = (result.trafficFacts || []).map((fact: TrafficFact) => db.prepare(`
    INSERT INTO traffic_facts (
      id, project_id, user_id, domain, channel, visits_estimate, region,
      provider, fetched_at, confidence
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      visits_estimate = excluded.visits_estimate,
      fetched_at = excluded.fetched_at,
      confidence = excluded.confidence
  `).bind(
    `${fact.projectId}:${fact.domain}:${fact.channel}:${fact.region}:${fact.provider}`,
    fact.projectId,
    userId,
    fact.domain,
    fact.channel,
    fact.visitsEstimate,
    fact.region,
    fact.provider,
    fact.fetchedAt,
    fact.confidence
  ));

  const aiVisibilityFacts = (result.aiVisibilityFacts || []).map((fact: AiVisibilityFact) => db.prepare(`
    INSERT INTO ai_visibility_facts (
      id, project_id, user_id, prompt, brand_mentioned, competitors_mentioned_json,
      source, provider, checked_at, confidence
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      brand_mentioned = excluded.brand_mentioned,
      competitors_mentioned_json = excluded.competitors_mentioned_json,
      checked_at = excluded.checked_at,
      confidence = excluded.confidence
  `).bind(
    `${fact.projectId}:${fact.prompt}:${fact.provider}`,
    fact.projectId,
    userId,
    fact.prompt,
    fact.brandMentioned ? 1 : 0,
    safeJson(fact.competitorsMentioned),
    String(fact.source),
    fact.provider,
    fact.checkedAt,
    fact.confidence
  ));

  return [
    ...keywordFacts,
    ...rankFacts,
    ...backlinkFacts,
    ...competitorFacts,
    ...trafficFacts,
    ...aiVisibilityFacts,
  ];
}

async function buildScanDiffIfPossible(
  db: D1DatabaseBinding,
  projectId: string | null,
  userId: string,
  current: AnalysisResult
) {
  const currentUrl = current.urlObj || current.url || '';
  if (!projectId && !userId) return null;

  const previousRow = projectId ? await db.prepare(`
    SELECT id, summary_json
    FROM scans
    WHERE project_id = ? AND id <> ? AND status = 'completed'
    ORDER BY datetime(completed_at) DESC, datetime(created_at) DESC
    LIMIT 1
  `).bind(projectId, current.audit_id).first<{ id: string; summary_json: string | null }>() : await db.prepare(`
    SELECT id, summary_json
    FROM scans
    WHERE user_id = ? AND url = ? AND id <> ? AND status = 'completed'
    ORDER BY datetime(completed_at) DESC, datetime(created_at) DESC
    LIMIT 1
  `).bind(userId, currentUrl, current.audit_id).first<{ id: string; summary_json: string | null }>();

  const previousScan = previousRow?.summary_json
    ? parseMaybeJson<Record<string, unknown>>(previousRow.summary_json)
    : null;

  return compareScans(projectId || `user:${userId}:${stableHash(currentUrl)}`, previousScan as any, current);
}

async function writeScanDiffIfPossible(
  db: D1DatabaseBinding,
  projectId: string | null,
  userId: string,
  diff: ReturnType<typeof compareScans> | null
) {
  if (!projectId || !diff) return;

  await upsertCloudflareMonitoringItem({ DB: db }, {
    collection: 'scanDiffs',
    id: diff.id,
    userId,
    projectId,
    data: diff as unknown as Record<string, unknown>,
  });
}

export async function writeCloudflareScanResult(
  env: CloudflareStorageEnv | Record<string, unknown> | undefined,
  result: AnalysisResult,
  context: { scanId?: string; userId?: string; projectId?: string; plan?: string } = {}
) {
  const db = getDb(env);
  if (!db) return false;

  const storedResult = await storeCloudflareScanArtifacts(env, result, context);
  const scanId = context.scanId || storedResult.audit_id;
  const userId = context.userId || storedResult.userId || '';
  const projectId = context.projectId || null;
  const scanPlan = normalizePlan(storedResult.scanPlan || storedResult.plan || context.plan || 'free');
  storedResult.plan = scanPlan;
  storedResult.accountPlan = storedResult.accountPlan || scanPlan;
  storedResult.scanPlan = scanPlan;
  const createdAt = storedResult.createdAt || nowIso();
  const now = nowIso();
  const scanDiff = await buildScanDiffIfPossible(db, projectId, userId, storedResult);
  storedResult.scanDiff = scanDiff;
  const auditBucket = getAuditBucket(env);
  const rawArtifact = await putJson(
    auditBucket,
    AUDIT_BUCKET_URI,
    `scans/${userId || 'anonymous'}/${scanId}/analysis.json`,
    storedResult,
    { scanId, kind: 'analysis' }
  );
  const summary = buildReportSummary(storedResult);
  const score = averageScore(summary as Record<string, unknown>);

  // eslint-disable-next-line no-secrets/no-secrets
  await db.prepare(`
    INSERT INTO scans (
      id, user_id, project_id, url, status, progress, plan, score, summary_json,
      raw_artifact_key, created_at, updated_at, completed_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      user_id = excluded.user_id,
      project_id = excluded.project_id,
      url = excluded.url,
      status = excluded.status,
      progress = excluded.progress,
      plan = excluded.plan,
      score = excluded.score,
      summary_json = excluded.summary_json,
      raw_artifact_key = COALESCE(excluded.raw_artifact_key, scans.raw_artifact_key),
      updated_at = excluded.updated_at,
      completed_at = excluded.completed_at,
      error = NULL
  `).bind(
    scanId,
    userId || null,
    projectId,
    storedResult.url,
    'completed',
    100,
    scanPlan,
    score,
    compactJson(summary),
    rawArtifact?.key || null,
    createdAt,
    now,
    now
  ).run();

  const statements = [
    ...issueStatements(db, storedResult.issues || [], userId, projectId),
    ...evidenceStatements(db, scanId, storedResult.evidence || [], userId, projectId),
    ...snapshotStatements(db, storedResult.urlSnapshots || [], userId, projectId),
    ...factStatements(db, storedResult, userId),
  ];

  await runBatch(db, statements);
  await writeScanDiffIfPossible(db, projectId, userId, scanDiff);
  await incrementCloudflareUserCrawlPageCount(env, userId, getCrawledPagesCount(storedResult), scanPlan);
  return true;
}

export async function markCloudflareScanError(
  env: CloudflareStorageEnv | Record<string, unknown> | undefined,
  input: { scanId: string; userId?: string; projectId?: string; url: string; plan?: string; message: string }
) {
  const db = getDb(env);
  if (!db) return false;
  const scanPlan = normalizePlan(input.plan || 'free');

  await db.prepare(`
    INSERT INTO scans (id, user_id, project_id, url, status, progress, plan, error, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'error', 100, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      status = 'error',
      progress = 100,
      error = excluded.error,
      updated_at = excluded.updated_at
  `).bind(
    input.scanId,
    input.userId || null,
    input.projectId || null,
    input.url,
    scanPlan,
    input.message,
    nowIso(),
    nowIso()
  ).run();

  return true;
}

export async function upsertCloudflareReportDocument(
  env: CloudflareStorageEnv | Record<string, unknown> | undefined,
  reportId: string,
  report: Record<string, unknown>,
  context: { userId: string; projectId?: string; url?: string; plan?: string }
) {
  const db = getDb(env);
  if (!db) return false;

  const auditBucket = getAuditBucket(env);
  const raw = reportLikeToRaw(report);
  const results = reportLikeToResults(report);
  const rawArtifact = raw
    ? await putJson(auditBucket, AUDIT_BUCKET_URI, `scans/${context.userId}/${reportId}/raw-report.json`, raw, { scanId: reportId, kind: 'raw-report' })
    : null;
  const resultArtifact = results
    ? await putJson(auditBucket, AUDIT_BUCKET_URI, `scans/${context.userId}/${reportId}/ai-report.json`, results, { scanId: reportId, kind: 'ai-report' })
    : null;
  const summarySource = raw || results || report;
  const scanPlan = normalizePlan(
    context.plan ||
    (typeof report.scanPlan === 'string' ? report.scanPlan : null) ||
    (typeof report.plan === 'string' ? report.plan : null) ||
    (isObject(raw) && typeof raw.scanPlan === 'string' ? raw.scanPlan : null) ||
    'free'
  );
  const summary = buildReportSummary({ ...summarySource, ...report, audit_id: reportId, userId: context.userId, plan: scanPlan, accountPlan: scanPlan, scanPlan } as Record<string, unknown>);
  const url = String(context.url || report.url || report.urlObj || summary.url || '');
  const status = String(report.status || summary.status || 'completed');
  const progress = typeof report.progress === 'number' ? report.progress : status === 'completed' ? 100 : 0;
  const score = normalizeScore(report.score) ?? averageScore(summary as Record<string, unknown>);
  const createdAt = String(report.createdAt || summary.createdAt || nowIso());

  // eslint-disable-next-line no-secrets/no-secrets
  await db.prepare(`
    INSERT INTO scans (
      id, user_id, project_id, url, status, progress, plan, score,
      summary_json, results_json, raw_artifact_key, result_artifact_key,
      created_at, updated_at, completed_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      project_id = COALESCE(excluded.project_id, scans.project_id),
      url = excluded.url,
      status = excluded.status,
      progress = excluded.progress,
      plan = excluded.plan,
      score = excluded.score,
      summary_json = excluded.summary_json,
      results_json = COALESCE(excluded.results_json, scans.results_json),
      raw_artifact_key = COALESCE(excluded.raw_artifact_key, scans.raw_artifact_key),
      result_artifact_key = COALESCE(excluded.result_artifact_key, scans.result_artifact_key),
      updated_at = excluded.updated_at,
      completed_at = COALESCE(excluded.completed_at, scans.completed_at)
  `).bind(
    reportId,
    context.userId,
    context.projectId || (typeof report.projectId === 'string' ? report.projectId : null),
    url,
    status,
    progress,
    scanPlan,
    score,
    compactJson(summary),
    results ? compactJson(results) : null,
    rawArtifact?.key || null,
    resultArtifact?.key || null,
    createdAt,
    nowIso(),
    status === 'completed' ? nowIso() : null
  ).run();

  return true;
}

export async function getCloudflareReport(
  env: CloudflareStorageEnv | Record<string, unknown> | undefined,
  reportId: string,
  userId?: string | null
) {
  const db = getDb(env);
  if (!db) return null;

  const row = await db.prepare('SELECT * FROM scans WHERE id = ? LIMIT 1').bind(reportId).first<StoredReportRow>();
  if (!row) return null;
  if (userId && row.user_id && row.user_id !== userId) {
    return { forbidden: true };
  }

  const auditBucket = getAuditBucket(env);
  const raw = await getJson<Record<string, unknown>>(auditBucket, row.raw_artifact_key);
  const results = await getJson<Record<string, unknown>>(auditBucket, row.result_artifact_key);
  return toReportRow(row, raw, results);
}

export async function queryCloudflareReports(
  env: CloudflareStorageEnv | Record<string, unknown> | undefined,
  filters: { userId: string; url?: string | null; projectId?: string | null; limit?: number }
) {
  const db = getDb(env);
  if (!db) return [];

  const clauses = ['user_id = ?'];
  const values: unknown[] = [filters.userId];
  if (filters.url) {
    clauses.push('url = ?');
    values.push(filters.url);
  }
  if (filters.projectId) {
    clauses.push('project_id = ?');
    values.push(filters.projectId);
  }

  values.push(Math.min(Math.max(filters.limit || 50, 1), 100));
  const query = `
    SELECT * FROM scans
    WHERE ${clauses.join(' AND ')}
    ORDER BY datetime(created_at) DESC
    LIMIT ?
  `;
  const response = await db.prepare(query).bind(...values).all<StoredReportRow>();
  const rows = Array.isArray(response) ? response : response.results || [];
  return rows.map((row) => toReportRow(row, null, null));
}

function shareFromRow(row: Record<string, unknown>) {
  return {
    token: row.token,
    reportId: row.report_id,
    projectId: row.project_id,
    userId: row.user_id,
    visibility: row.visibility,
    passwordHash: row.password_hash,
    branding: parseMaybeJson(row.branding_json),
    builder: parseMaybeJson(row.builder_json),
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

export async function getCloudflareReportShare(
  env: CloudflareStorageEnv | Record<string, unknown> | undefined,
  token: string
) {
  const db = getDb(env);
  if (!db) return null;

  const row = await db.prepare('SELECT * FROM report_shares WHERE token = ? LIMIT 1').bind(token).first<Record<string, unknown>>();
  return row ? shareFromRow(row) : null;
}

export async function queryCloudflareReportShares(
  env: CloudflareStorageEnv | Record<string, unknown> | undefined,
  input: { userId: string; reportId?: string | null }
) {
  const db = getDb(env);
  if (!db) return [];

  const clauses = ['user_id = ?'];
  const values: unknown[] = [input.userId];
  if (input.reportId) {
    clauses.push('report_id = ?');
    values.push(input.reportId);
  }

  const response = await db.prepare(`
    SELECT * FROM report_shares
    WHERE ${clauses.join(' AND ')}
    ORDER BY datetime(created_at) DESC
    LIMIT 100
  `).bind(...values).all<Record<string, unknown>>();
  const rows = Array.isArray(response) ? response : response.results || [];
  return rows.map(shareFromRow);
}

function factRows<T>(response: { results?: T[] } | T[]) {
  return Array.isArray(response) ? response : response.results || [];
}

export async function queryCloudflareProviderFacts(
  env: CloudflareStorageEnv | Record<string, unknown> | undefined,
  input: { userId: string; projectId: string }
) {
  const db = getDb(env);
  if (!db) {
    return {
      keywordFacts: [],
      rankFacts: [],
      backlinkFacts: [],
      competitorFacts: [],
      trafficFacts: [],
      aiVisibilityFacts: [],
    };
  }

  const [keywordRows, rankRows, backlinkRows, competitorRows, trafficRows, aiVisibilityRows] = await Promise.all([
    db.prepare('SELECT * FROM keyword_facts WHERE user_id = ? AND project_id = ? ORDER BY datetime(fetched_at) DESC LIMIT 500')
      .bind(input.userId, input.projectId).all<Record<string, unknown>>(),
    db.prepare('SELECT * FROM rank_facts WHERE user_id = ? AND project_id = ? ORDER BY datetime(checked_at) DESC LIMIT 500')
      .bind(input.userId, input.projectId).all<Record<string, unknown>>(),
    db.prepare('SELECT * FROM backlink_facts WHERE user_id = ? AND project_id = ? ORDER BY datetime(fetched_at) DESC LIMIT 500')
      .bind(input.userId, input.projectId).all<Record<string, unknown>>(),
    db.prepare('SELECT * FROM competitor_facts WHERE user_id = ? AND project_id = ? ORDER BY datetime(created_at) DESC LIMIT 200')
      .bind(input.userId, input.projectId).all<Record<string, unknown>>(),
    db.prepare('SELECT * FROM traffic_facts WHERE user_id = ? AND project_id = ? ORDER BY datetime(fetched_at) DESC LIMIT 200')
      .bind(input.userId, input.projectId).all<Record<string, unknown>>(),
    db.prepare('SELECT * FROM ai_visibility_facts WHERE user_id = ? AND project_id = ? ORDER BY datetime(checked_at) DESC LIMIT 200')
      .bind(input.userId, input.projectId).all<Record<string, unknown>>(),
  ]);

  return {
    keywordFacts: factRows(keywordRows).map((row) => ({
      type: 'keyword_fact',
      projectId: row.project_id,
      userId: row.user_id,
      keyword: row.keyword,
      region: row.region,
      language: row.language,
      device: row.device,
      volume: row.volume,
      cpc: row.cpc,
      competition: row.competition,
      difficulty: row.difficulty,
      intent: row.intent || undefined,
      provider: row.provider,
      fetchedAt: row.fetched_at,
      confidence: row.confidence,
    })),
    rankFacts: factRows(rankRows).map((row) => ({
      type: 'rank_fact',
      projectId: row.project_id,
      userId: row.user_id,
      keyword: row.keyword,
      domain: row.domain,
      url: row.url || undefined,
      rank: row.rank,
      previousRank: row.previous_rank,
      serpFeatures: parseMaybeJson<string[]>(row.serp_features_json) || [],
      region: row.region,
      device: row.device,
      provider: row.provider,
      checkedAt: row.checked_at,
      confidence: row.confidence,
    })),
    backlinkFacts: factRows(backlinkRows).map((row) => ({
      type: 'backlink_fact',
      projectId: row.project_id,
      userId: row.user_id,
      sourceUrl: row.source_url,
      sourceDomain: row.source_domain,
      targetUrl: row.target_url,
      anchor: row.anchor || undefined,
      nofollow: row.nofollow === 1,
      firstSeen: row.first_seen || undefined,
      lastSeen: row.last_seen || undefined,
      lost: row.lost === 1,
      authorityMetric: row.authority_metric,
      provider: row.provider,
      fetchedAt: row.fetched_at,
      confidence: row.confidence,
    })),
    competitorFacts: factRows(competitorRows).map((row) => ({
      type: 'competitor_fact',
      projectId: row.project_id,
      userId: row.user_id,
      competitorDomain: row.competitor_domain,
      source: row.source,
      createdAt: row.created_at,
    })),
    trafficFacts: factRows(trafficRows).map((row) => ({
      type: 'traffic_fact',
      projectId: row.project_id,
      userId: row.user_id,
      domain: row.domain,
      channel: row.channel,
      visitsEstimate: row.visits_estimate,
      region: row.region,
      provider: row.provider,
      fetchedAt: row.fetched_at,
      confidence: row.confidence,
    })),
    aiVisibilityFacts: factRows(aiVisibilityRows).map((row) => ({
      type: 'ai_visibility_fact',
      projectId: row.project_id,
      userId: row.user_id,
      prompt: row.prompt,
      brandMentioned: row.brand_mentioned === 1,
      competitorsMentioned: parseMaybeJson<string[]>(row.competitors_mentioned_json) || [],
      source: row.source,
      provider: row.provider,
      checkedAt: row.checked_at,
      confidence: row.confidence,
    })),
  };
}

export async function upsertCloudflareReportShare(
  env: CloudflareStorageEnv | Record<string, unknown> | undefined,
  share: Record<string, unknown> & { token: string; reportId: string; userId: string; visibility: string }
) {
  const db = getDb(env);
  if (!db) return false;

  await db.prepare(`
    INSERT INTO report_shares (
      token, report_id, project_id, user_id, visibility, password_hash,
      branding_json, builder_json, created_at, expires_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(token) DO UPDATE SET
      visibility = excluded.visibility,
      password_hash = excluded.password_hash,
      branding_json = excluded.branding_json,
      builder_json = excluded.builder_json,
      expires_at = excluded.expires_at
  `).bind(
    share.token,
    share.reportId,
    share.projectId || null,
    share.userId,
    share.visibility,
    share.passwordHash || null,
    share.branding ? safeJson(share.branding) : null,
    share.builder ? safeJson(share.builder) : null,
    share.createdAt || nowIso(),
    share.expiresAt || null
  ).run();

  return true;
}

export async function putReportExport(
  env: CloudflareStorageEnv | Record<string, unknown> | undefined,
  key: string,
  value: unknown
) {
  return putJson(getReportBucket(env), REPORT_BUCKET_URI, key, value, { kind: 'report-export' });
}

export async function putReportExportText(
  env: CloudflareStorageEnv | Record<string, unknown> | undefined,
  key: string,
  value: string | Uint8Array,
  contentType: string
) {
  const bucket = getReportBucket(env);
  if (!bucket) return null;

  const checksum = await sha256Binary(value);
  await bucket.put(key, value, {
    httpMetadata: { contentType },
    customMetadata: { kind: 'report-export', checksum },
  });

  return {
    key,
    storageUri: `${REPORT_BUCKET_URI}/${key}`,
    checksum,
    bytes: typeof value === 'string' ? new TextEncoder().encode(value).byteLength : value.byteLength,
  };
}
