import { parse } from 'node-html-parser';
import { getToolPage, isToolSlug, type ToolPage, type ToolSlug } from '@/lib/tool-pages';
import type { ToolCheckItem, ToolCheckResult, ToolCheckStatus } from '@/types/tool-checks';

const FETCH_TIMEOUT_MS = 12000;
const MAX_PREVIEW_CHARS = 2200;
const TOOL_USER_AGENT = 'Website Analyzer Pro Quick Check';

type FetchTextResult = {
  url: string;
  status: number;
  ok: boolean;
  headers: Headers;
  text: string;
  ttfbMs: number;
  sizeBytes: number;
};

function normalizeUrlInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error('URL ist erforderlich');
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(withProtocol);

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Nur HTTP- und HTTPS-URLs können geprüft werden');
  }

  if (isBlockedHostname(parsed.hostname)) {
    throw new Error('Diese Zieladresse ist für serverseitige Checks nicht erlaubt');
  }

  parsed.hash = '';
  return parsed;
}

function isBlockedHostname(hostname: string) {
  const normalized = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (
    normalized === 'localhost' ||
    normalized === '0.0.0.0' ||
    normalized.endsWith('.localhost') ||
    normalized.endsWith('.local')
  ) {
    return true;
  }

  if (/^(?:127|10)\./.test(normalized)) return true;
  if (/^172\.(?:1[6-9]|2\d|3[01])\./.test(normalized)) return true;
  if (/^192\.168\./.test(normalized)) return true;
  if (/^169\.254\./.test(normalized)) return true;
  if (normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd')) return true;

  return false;
}

function scoreFromItems(items: ToolCheckItem[]) {
  if (items.length === 0) return null;

  const statusValue: Record<ToolCheckStatus, number> = {
    good: 1,
    info: 0.78,
    warning: 0.48,
    bad: 0,
  };

  const total = items.reduce((sum, item) => sum + statusValue[item.status], 0);
  return Math.round((total / items.length) * 100);
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function fetchWithTimeout(url: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    return await fetch(url, {
      redirect: 'follow',
      ...init,
      headers: {
        'User-Agent': TOOL_USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml,text/plain;q=0.9,*/*;q=0.8',
        ...(init?.headers || {}),
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchText(url: string, init?: RequestInit): Promise<FetchTextResult> {
  const started = Date.now();
  const response = await fetchWithTimeout(url, init);
  const ttfbMs = Date.now() - started;
  const text = await response.text();
  const sizeBytes = Number(response.headers.get('content-length')) || new TextEncoder().encode(text).length;

  return {
    url: response.url || url,
    status: response.status,
    ok: response.ok,
    headers: response.headers,
    text,
    ttfbMs,
    sizeBytes,
  };
}

async function fetchHtml(url: string) {
  return fetchText(url, {
    method: 'GET',
    headers: {
      Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.7',
    },
  });
}

async function fetchHeaders(url: string) {
  try {
    const head = await fetchWithTimeout(url, { method: 'HEAD' });
    if (head.status !== 405 && head.status !== 403) {
      return head;
    }
  } catch {
    // Fall back to GET below. Some servers block HEAD requests.
  }

  return fetchWithTimeout(url, { method: 'GET' });
}

function cleanText(value?: string | null) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function extractPageSignals(html: string, baseUrl: string) {
  const root = parse(html);
  const title = cleanText(root.querySelector('title')?.text);
  const description = cleanText(root.querySelector('meta[name="description"]')?.getAttribute('content'));
  const robots = cleanText(root.querySelector('meta[name="robots"]')?.getAttribute('content'));
  const viewport = cleanText(root.querySelector('meta[name="viewport"]')?.getAttribute('content'));
  const canonicalRaw = cleanText(root.querySelector('link[rel="canonical"]')?.getAttribute('href'));
  const ogTitle = cleanText(root.querySelector('meta[property="og:title"]')?.getAttribute('content'));
  const ogDescription = cleanText(root.querySelector('meta[property="og:description"]')?.getAttribute('content'));
  const h1s = root.querySelectorAll('h1').map((node) => cleanText(node.text)).filter(Boolean);
  const jsonLdCount = root.querySelectorAll('script[type="application/ld+json"]').length;

  root.querySelectorAll('script,style,noscript,svg').forEach((node) => node.remove());
  const visibleText = cleanText(root.text);
  const wordCount = visibleText ? visibleText.split(/\s+/).filter((word) => word.length > 1).length : 0;

  let canonical = canonicalRaw;
  if (canonicalRaw) {
    try {
      canonical = new URL(canonicalRaw, baseUrl).toString();
    } catch {
      canonical = canonicalRaw;
    }
  }

  return {
    title,
    description,
    robots,
    viewport,
    canonical,
    ogTitle,
    ogDescription,
    h1s,
    jsonLdCount,
    wordCount,
  };
}

function titleItem(title: string): ToolCheckItem {
  if (!title) {
    return {
      label: 'Meta Title',
      value: 'Fehlt',
      status: 'bad',
      detail: 'Ohne Title fehlt Suchmaschinen und Nutzern ein klares Seitensignal.',
    };
  }

  const length = title.length;
  const status: ToolCheckStatus = length >= 30 && length <= 60 ? 'good' : 'warning';
  return {
    label: 'Meta Title',
    value: `${length} Zeichen`,
    status,
    detail: title,
  };
}

function descriptionItem(description: string): ToolCheckItem {
  if (!description) {
    return {
      label: 'Meta Description',
      value: 'Fehlt',
      status: 'bad',
      detail: 'Eine klare Description verbessert Snippet-Kontrolle und Klickerwartung.',
    };
  }

  const length = description.length;
  const status: ToolCheckStatus = length >= 70 && length <= 160 ? 'good' : 'warning';
  return {
    label: 'Meta Description',
    value: `${length} Zeichen`,
    status,
    detail: description,
  };
}

function h1Item(h1s: string[]): ToolCheckItem {
  if (h1s.length === 0) {
    return {
      label: 'H1',
      value: 'Keine H1 gefunden',
      status: 'bad',
      detail: 'Die Seite sollte eine klare Hauptüberschrift besitzen.',
    };
  }

  if (h1s.length > 1) {
    return {
      label: 'H1',
      value: `${h1s.length} H1-Überschriften`,
      status: 'warning',
      detail: h1s.slice(0, 3).join(' | '),
    };
  }

  return {
    label: 'H1',
    value: '1 H1 gefunden',
    status: 'good',
    detail: h1s[0],
  };
}

function robotsMetaItem(robots: string): ToolCheckItem {
  if (!robots) {
    return {
      label: 'Meta Robots',
      value: 'Kein Robots-Meta',
      status: 'good',
      detail: 'Ohne noindex-Signal ist die Seite nicht per Meta-Tag blockiert.',
    };
  }

  const lower = robots.toLowerCase();
  if (lower.includes('noindex')) {
    return {
      label: 'Meta Robots',
      value: robots,
      status: 'bad',
      detail: 'Noindex verhindert die normale Indexierung dieser URL.',
    };
  }

  return {
    label: 'Meta Robots',
    value: robots,
    status: 'good',
  };
}

function canonicalItem(canonical: string): ToolCheckItem {
  if (!canonical) {
    return {
      label: 'Canonical',
      value: 'Fehlt',
      status: 'warning',
      detail: 'Ein Canonical hilft, Duplicate-Content-Signale sauber zu bündeln.',
    };
  }

  return {
    label: 'Canonical',
    value: 'Gefunden',
    status: 'good',
    detail: canonical,
  };
}

function createResult(params: Omit<ToolCheckResult, 'checkedAt' | 'costProfile'>): ToolCheckResult {
  return {
    ...params,
    checkedAt: new Date().toISOString(),
    costProfile: 'lightweight',
  };
}

async function runSeoChecker(tool: ToolSlug, rawInput: string): Promise<ToolCheckResult> {
  const target = normalizeUrlInput(rawInput);
  const page = await fetchHtml(target.toString());
  const signals = extractPageSignals(page.text, page.url);
  const items: ToolCheckItem[] = [
    {
      label: 'HTTP Status',
      value: String(page.status),
      status: page.ok ? 'good' : 'bad',
      detail: page.url,
    },
    titleItem(signals.title),
    descriptionItem(signals.description),
    h1Item(signals.h1s),
    canonicalItem(signals.canonical),
    robotsMetaItem(signals.robots),
    {
      label: 'Viewport',
      value: signals.viewport ? 'Gefunden' : 'Fehlt',
      status: signals.viewport ? 'good' : 'warning',
      detail: signals.viewport || 'Mobile Darstellung kann ohne Viewport-Meta unzuverlässig sein.',
    },
  ];

  return createResult({
    tool,
    target: page.url,
    mode: 'single-url',
    score: scoreFromItems(items),
    summary: 'Einzelne Seite geprüft. Es wurde kein Website-Crawl gestartet.',
    items,
    nextStep: 'Für technische Site-weite Probleme den SEO Audit starten.',
  });
}

async function runMetaChecker(tool: ToolSlug, rawInput: string): Promise<ToolCheckResult> {
  const target = normalizeUrlInput(rawInput);
  const page = await fetchHtml(target.toString());
  const signals = extractPageSignals(page.text, page.url);
  const items: ToolCheckItem[] = [
    titleItem(signals.title),
    descriptionItem(signals.description),
    {
      label: 'Open Graph Title',
      value: signals.ogTitle ? 'Gefunden' : 'Fehlt',
      status: signals.ogTitle ? 'good' : 'info',
      detail: signals.ogTitle || 'Optional, aber hilfreich für geteilte Links.',
    },
    {
      label: 'Open Graph Description',
      value: signals.ogDescription ? 'Gefunden' : 'Fehlt',
      status: signals.ogDescription ? 'good' : 'info',
      detail: signals.ogDescription || 'Optional, aber hilfreich für Social und Messenger Previews.',
    },
    canonicalItem(signals.canonical),
  ];

  return createResult({
    tool,
    target: page.url,
    mode: 'single-url',
    score: scoreFromItems(items),
    summary: 'Meta-Signale dieser einen URL wurden geprüft.',
    items,
    nextStep: 'Title und Description zuerst für Seiten mit Umsatz- oder Lead-Potenzial optimieren.',
  });
}

async function runPagespeedTest(tool: ToolSlug, rawInput: string): Promise<ToolCheckResult> {
  const target = normalizeUrlInput(rawInput);
  const page = await fetchHtml(target.toString());
  const encoding = page.headers.get('content-encoding') || '';
  const cacheControl = page.headers.get('cache-control') || '';
  const ttfbStatus: ToolCheckStatus = page.ttfbMs < 800 ? 'good' : page.ttfbMs < 1800 ? 'warning' : 'bad';
  const sizeStatus: ToolCheckStatus = page.sizeBytes < 220000 ? 'good' : page.sizeBytes < 750000 ? 'warning' : 'bad';
  const items: ToolCheckItem[] = [
    {
      label: 'HTTP Status',
      value: String(page.status),
      status: page.ok ? 'good' : 'bad',
      detail: page.url,
    },
    {
      label: 'TTFB',
      value: `${page.ttfbMs} ms`,
      status: ttfbStatus,
      detail: 'Zeit bis zur ersten Server-Antwort. Das ersetzt keinen Lighthouse-Labtest.',
    },
    {
      label: 'HTML Antwortgröße',
      value: formatBytes(page.sizeBytes),
      status: sizeStatus,
      detail: 'Grosse HTML-Antworten können Rendering und Crawling verlangsamen.',
    },
    {
      label: 'Komprimierung',
      value: encoding || 'Nicht im Header erkennbar',
      status: encoding ? 'good' : 'warning',
      detail: encoding ? 'Content-Encoding ist gesetzt.' : 'Prüfe gzip, br oder zstd auf dem CDN/Server.',
    },
    {
      label: 'Cache-Control',
      value: cacheControl || 'Fehlt',
      status: cacheControl ? 'good' : 'info',
      detail: cacheControl || 'Dynamische HTML-Seiten können bewusst uncached sein.',
    },
  ];

  return createResult({
    tool,
    target: page.url,
    mode: 'single-url',
    score: scoreFromItems(items),
    summary: 'Schneller Performance-Check mit einer einzigen Anfrage.',
    items,
    nextStep: 'Für Core Web Vitals und Renderdetails den vollständigen Audit nutzen.',
  });
}

async function runSecurityCheck(tool: ToolSlug, rawInput: string): Promise<ToolCheckResult> {
  const target = normalizeUrlInput(rawInput);
  const response = await fetchHeaders(target.toString());
  const finalUrl = response.url || target.toString();
  const finalProtocol = new URL(finalUrl).protocol;
  const headerChecks: Array<[string, string, string]> = [
    ['content-security-policy', 'Content-Security-Policy', 'Schützt gegen viele Script- und Injection-Risiken.'],
    ['strict-transport-security', 'Strict-Transport-Security', 'Erzwingt HTTPS für wiederkehrende Browser-Besuche.'],
    ['x-frame-options', 'X-Frame-Options', 'Reduziert Clickjacking-Risiken.'],
    ['x-content-type-options', 'X-Content-Type-Options', 'Verhindert riskantes MIME-Sniffing.'],
    ['referrer-policy', 'Referrer-Policy', 'Kontrolliert, welche Referrer-Daten weitergegeben werden.'],
    ['permissions-policy', 'Permissions-Policy', 'Beschränkt Browser-APIs wie Kamera oder Standort.'],
  ];
  const items: ToolCheckItem[] = [
    {
      label: 'HTTPS',
      value: finalProtocol === 'https:' ? 'Aktiv' : 'Nicht aktiv',
      status: finalProtocol === 'https:' ? 'good' : 'bad',
      detail: finalUrl,
    },
    {
      label: 'HTTP Status',
      value: String(response.status),
      status: response.ok ? 'good' : 'warning',
    },
    ...headerChecks.map(([header, label, detail]) => {
      const value = response.headers.get(header);
      return {
        label,
        value: value ? 'Gefunden' : 'Fehlt',
        status: value ? 'good' : 'warning',
        detail: value || detail,
      } satisfies ToolCheckItem;
    }),
  ];

  return createResult({
    tool,
    target: finalUrl,
    mode: 'single-url',
    score: scoreFromItems(items),
    summary: 'Security Header wurden mit einer Header-Anfrage geprüft.',
    items,
    nextStep: 'Fehlende Header am besten auf CDN- oder Server-Ebene setzen.',
  });
}

function getRobotsGroups(text: string) {
  return text
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((group) => group.trim())
    .filter(Boolean);
}

function findAiCrawlerBlocks(robotsText: string) {
  const agents = ['GPTBot', 'ChatGPT-User', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'CCBot'];
  const groups = getRobotsGroups(robotsText);

  return agents.filter((agent) => {
    const needle = agent.toLowerCase();
    return groups.some((group) => {
      const lines = group
        .split('\n')
        .map((line) => line.trim().toLowerCase())
        .filter((line) => line && !line.startsWith('#'));
      const hasAgent = lines.some((line) => line.startsWith('user-agent:') && line.includes(needle));
      const blocksRoot = lines.some((line) => line.startsWith('disallow:') && line.replace('disallow:', '').trim() === '/');
      return hasAgent && blocksRoot;
    });
  });
}

async function runRobotsChecker(tool: ToolSlug, rawInput: string): Promise<ToolCheckResult> {
  const target = normalizeUrlInput(rawInput);
  const robotsUrl = new URL('/robots.txt', target.origin).toString();
  const robots = await fetchText(robotsUrl, {
    headers: {
      Accept: 'text/plain,*/*;q=0.8',
    },
  });

  const disallowCount = (robots.text.match(/^disallow:/gim) || []).length;
  const sitemapCount = (robots.text.match(/^sitemap:/gim) || []).length;
  const blockedAiAgents = robots.ok ? findAiCrawlerBlocks(robots.text) : [];
  const items: ToolCheckItem[] = [
    {
      label: 'Robots.txt',
      value: robots.ok ? `HTTP ${robots.status}` : `HTTP ${robots.status}`,
      status: robots.ok ? 'good' : 'warning',
      detail: robots.url,
    },
    {
      label: 'Disallow-Regeln',
      value: `${disallowCount} gefunden`,
      status: disallowCount > 20 ? 'warning' : 'info',
      detail: disallowCount > 20 ? 'Viele Regeln sollten auf unbeabsichtigte Blockaden geprüft werden.' : 'Anzahl der sichtbaren Disallow-Zeilen.',
    },
    {
      label: 'Sitemap-Hinweise',
      value: `${sitemapCount} gefunden`,
      status: sitemapCount > 0 ? 'good' : 'warning',
      detail: sitemapCount > 0 ? 'Sitemap-Zeilen helfen Crawlern beim Einstieg.' : 'Eine Sitemap-Zeile in robots.txt ist empfehlenswert.',
    },
    {
      label: 'AI-Crawler Blockaden',
      value: blockedAiAgents.length ? blockedAiAgents.join(', ') : 'Keine Root-Blockade erkannt',
      status: blockedAiAgents.length ? 'bad' : 'good',
      detail: blockedAiAgents.length ? 'Mindestens ein AI-Crawler wird für die gesamte Domain blockiert.' : 'Es wurde keine explizite Root-Sperre für bekannte AI-Crawler erkannt.',
    },
  ];

  return createResult({
    tool,
    target: robots.url,
    mode: 'single-file',
    score: scoreFromItems(items),
    summary: 'Robots.txt separat geprüft. Es wurde keine Website gecrawlt.',
    items,
    preview: robots.text.slice(0, MAX_PREVIEW_CHARS),
    nextStep: 'Robots-Regeln nach Deployments erneut prüfen, besonders bei AI-Visibility-Änderungen.',
  });
}

async function runSitemapChecker(tool: ToolSlug, rawInput: string): Promise<ToolCheckResult> {
  const target = normalizeUrlInput(rawInput);
  const sitemapUrl = new URL('/sitemap.xml', target.origin).toString();
  const sitemap = await fetchText(sitemapUrl, {
    headers: {
      Accept: 'application/xml,text/xml,text/plain;q=0.8,*/*;q=0.5',
    },
  });

  const urlCount = (sitemap.text.match(/<url(?:\s|>)/gi) || []).length;
  const sitemapIndexCount = (sitemap.text.match(/<sitemap(?:\s|>)/gi) || []).length;
  const hasXmlSignal = /<\?xml|<urlset|<sitemapindex/i.test(sitemap.text.slice(0, 1000));
  const items: ToolCheckItem[] = [
    {
      label: 'Sitemap Status',
      value: `HTTP ${sitemap.status}`,
      status: sitemap.ok ? 'good' : 'bad',
      detail: sitemap.url,
    },
    {
      label: 'XML-Signal',
      value: hasXmlSignal ? 'Erkannt' : 'Nicht eindeutig',
      status: hasXmlSignal ? 'good' : 'warning',
      detail: 'Prüft nur die Standard-Datei /sitemap.xml.',
    },
    {
      label: 'URL-Einträge',
      value: String(urlCount),
      status: urlCount > 0 ? 'good' : sitemapIndexCount > 0 ? 'info' : 'warning',
      detail: urlCount > 0 ? 'Direkte URL-Einträge gefunden.' : 'Keine direkten URL-Einträge in dieser Datei.',
    },
    {
      label: 'Sitemap-Index',
      value: String(sitemapIndexCount),
      status: sitemapIndexCount > 0 ? 'good' : 'info',
      detail: sitemapIndexCount > 0 ? 'Diese Sitemap verweist auf weitere Sitemaps.' : 'Kein Sitemap-Index erkannt.',
    },
  ];

  return createResult({
    tool,
    target: sitemap.url,
    mode: 'single-file',
    score: scoreFromItems(items),
    summary: 'Sitemap-Datei separat geprüft. Es wurde keine URL-Liste gecrawlt.',
    items,
    preview: sitemap.text.slice(0, MAX_PREVIEW_CHARS),
    nextStep: 'Für Coverage, Statuscodes und Canonicals danach einen Plan-Crawl starten.',
  });
}

async function runAiVisibilityChecker(tool: ToolSlug, rawInput: string): Promise<ToolCheckResult> {
  const target = normalizeUrlInput(rawInput);
  const robotsUrl = new URL('/robots.txt', target.origin).toString();
  const [pageResult, robotsResult] = await Promise.allSettled([
    fetchHtml(target.toString()),
    fetchText(robotsUrl, { headers: { Accept: 'text/plain,*/*;q=0.8' } }),
  ]);

  if (pageResult.status === 'rejected') {
    throw pageResult.reason instanceof Error ? pageResult.reason : new Error('Seite konnte nicht geladen werden');
  }

  const page = pageResult.value;
  const signals = extractPageSignals(page.text, page.url);
  const robotsText = robotsResult.status === 'fulfilled' && robotsResult.value.ok ? robotsResult.value.text : '';
  const blockedAiAgents = robotsText ? findAiCrawlerBlocks(robotsText) : [];
  const items: ToolCheckItem[] = [
    {
      label: 'Seite erreichbar',
      value: `HTTP ${page.status}`,
      status: page.ok ? 'good' : 'bad',
      detail: page.url,
    },
    robotsMetaItem(signals.robots),
    {
      label: 'AI-Crawler Robots',
      value: blockedAiAgents.length ? blockedAiAgents.join(', ') : 'Keine Root-Blockade erkannt',
      status: blockedAiAgents.length ? 'bad' : robotsText ? 'good' : 'info',
      detail: robotsText ? 'Robots.txt wurde separat geprüft.' : 'Robots.txt konnte für diesen Quickcheck nicht gelesen werden.',
    },
    h1Item(signals.h1s),
    {
      label: 'Strukturierte Daten',
      value: `${signals.jsonLdCount} JSON-LD Blöcke`,
      status: signals.jsonLdCount > 0 ? 'good' : 'warning',
      detail: 'JSON-LD hilft Maschinen, Entitäten und Inhalte besser zu verstehen.',
    },
    {
      label: 'Textbasis',
      value: `${signals.wordCount} Wörter`,
      status: signals.wordCount >= 400 ? 'good' : signals.wordCount >= 150 ? 'warning' : 'bad',
      detail: 'AI Search braucht genug lesbaren Kontext auf der einzelnen Seite.',
    },
  ];

  return createResult({
    tool,
    target: page.url,
    mode: 'single-url',
    score: scoreFromItems(items),
    summary: 'AI-Visibility-Basis für eine URL geprüft, ohne die Website zu crawlen.',
    items,
    nextStep: 'Für Themenabdeckung, interne Links und Wettbewerbsvergleich das AI Visibility Add-on nutzen.',
  });
}

function normalizeKeywordInput(rawInput: string) {
  const keyword = rawInput.replace(/\s+/g, ' ').trim();
  if (!keyword) {
    throw new Error('Keyword ist erforderlich');
  }
  if (keyword.length > 120) {
    throw new Error('Keyword ist zu lang für den Schnellcheck');
  }
  return keyword;
}

function normalizeTextInput(rawInput: string) {
  const text = rawInput.replace(/\s+/g, ' ').trim();
  if (!text) {
    throw new Error('Text ist erforderlich');
  }
  if (text.length > 8000) {
    throw new Error('Text ist zu lang für den Schnellcheck');
  }
  return text;
}

function normalizeToolInput(tool: ToolPage, rawInput: string) {
  if (tool.inputMode === 'keyword') {
    return normalizeKeywordInput(rawInput);
  }

  if (tool.inputMode === 'text') {
    return normalizeTextInput(rawInput);
  }

  return normalizeUrlInput(rawInput).toString();
}

async function runKeywordChecker(tool: ToolSlug, rawInput: string): Promise<ToolCheckResult> {
  const keyword = normalizeKeywordInput(rawInput);
  const lower = keyword.toLowerCase();
  const words = keyword.split(' ').filter(Boolean);
  const questionIntent = /^(?:wer|wie|was|warum|wann|wo|welche|welcher|wieviel|wieso)\b/i.test(keyword) || keyword.includes('?');
  const commercialIntent = /\b(?:kaufen|preis|preise|kosten|agentur|tool|software|anbieter|vergleich|beste|test)\b/i.test(lower);
  const localIntent = /\b(?:in|nahe|near|berlin|hamburg|münchen|köln|frankfurt|stuttgart|düsseldorf)\b/i.test(lower);
  const intentLabel = questionIntent
    ? 'Informational'
    : commercialIntent
      ? 'Commercial'
      : localIntent
        ? 'Local'
        : 'Explorativ';
  const formatLabel = questionIntent
    ? 'FAQ oder Ratgeber'
    : commercialIntent
      ? 'Vergleichs- oder Angebotsseite'
      : localIntent
        ? 'Local Landingpage'
        : 'Ratgeber, Kategorie oder Tool-Seite';
  const items: ToolCheckItem[] = [
    {
      label: 'Keyword-Länge',
      value: `${words.length} Wort${words.length === 1 ? '' : 'e'}`,
      status: words.length >= 2 && words.length <= 5 ? 'good' : words.length === 1 ? 'info' : 'warning',
      detail: '2 bis 5 Wörter sind oft gut für eine klare Seitenintention.',
    },
    {
      label: 'Suchintention',
      value: intentLabel,
      status: 'good',
      detail: 'Lokale Heuristik ohne externe SERP- oder Volumendaten.',
    },
    {
      label: 'Longtail-Potenzial',
      value: words.length >= 3 ? 'Stark' : 'Ausbaubar',
      status: words.length >= 3 ? 'good' : 'warning',
      detail: words.length >= 3 ? 'Die Phrase ist spezifisch genug für eine fokussierte Seite.' : 'Mit Modifiern wie Ort, Zielgruppe oder Problem wird das Keyword schärfer.',
    },
    {
      label: 'Empfohlenes Format',
      value: formatLabel,
      status: 'info',
      detail: 'Das ist eine Startempfehlung, keine Ranking-Prognose.',
    },
  ];

  return createResult({
    tool,
    target: keyword,
    mode: 'keyword-local',
    score: scoreFromItems(items),
    summary: 'Keyword lokal eingeschätzt. Es wurden keine externen SERP- oder Volumendaten gekauft.',
    items,
    nextStep: 'Für Suchvolumen, Schwierigkeit und echte SERP-Daten einen Keyword-Datenprovider anbinden.',
  });
}

function buildTextPreview(tool: ToolPage, text: string, words: string[]) {
  const sentence = text.split(/[.!?]+/).map((part) => part.trim()).find(Boolean) || text.slice(0, 160);
  const shortSentence = sentence.length > 150 ? `${sentence.slice(0, 147)}...` : sentence;
  const focus = words.slice(0, 6).join(' ');

  if (tool.slug.includes('meta-description')) {
    return `Mögliche Snippet-Basis:\n${shortSentence}\n\nEmpfehlung: auf 120-155 Zeichen verdichten und einen klaren Nutzen oder nächsten Schritt nennen.`;
  }

  if (tool.slug.includes('paragraph-rewriter')) {
    return `Optimierungsrichtung:\n- Einen klaren ersten Satz setzen.\n- Lange Sätze teilen.\n- Pro Absatz nur eine Hauptaussage führen.\n\nKernbegriffe: ${focus || 'zu wenig Text'}`;
  }

  if (tool.slug.includes('entity') || tool.slug.includes('citation')) {
    return `Entity-/Citation-Hinweis:\nDer Text sollte Marke, Angebot, Zielgruppe, Ort/Markt und belastbare Fakten klar benennen. Erkennbarer Fokus: ${focus || 'zu wenig Text'}.`;
  }

  return `Textauszug:\n${shortSentence}`;
}

async function runTextUtility(tool: ToolPage, rawInput: string): Promise<ToolCheckResult> {
  const text = normalizeTextInput(rawInput);
  const words = text.split(/\s+/).filter((word) => word.length > 1);
  const sentences = text.split(/[.!?]+/).map((part) => part.trim()).filter(Boolean);
  const avgSentenceLength = sentences.length ? Math.round(words.length / sentences.length) : words.length;
  const longSentenceCount = sentences.filter((sentence) => sentence.split(/\s+/).length > 24).length;
  const statusForLength: ToolCheckStatus = words.length >= 80 ? 'good' : words.length >= 30 ? 'warning' : 'info';
  const sentenceStatus: ToolCheckStatus = avgSentenceLength <= 18 ? 'good' : avgSentenceLength <= 26 ? 'warning' : 'bad';

  const items: ToolCheckItem[] = [
    {
      label: 'Wörter',
      value: String(words.length),
      status: statusForLength,
      detail: 'Je nach Tool kann kurzer Text reichen, für Content- und Entity-Prüfungen ist mehr Kontext besser.',
    },
    {
      label: 'Zeichen',
      value: String(text.length),
      status: text.length <= 5000 ? 'good' : 'warning',
      detail: 'Der Schnellcheck verarbeitet bewusst nur einen begrenzten Ausschnitt.',
    },
    {
      label: 'Sätze',
      value: String(sentences.length || 1),
      status: sentences.length > 0 ? 'good' : 'warning',
      detail: 'Klare Satzgrenzen helfen Snippets, Reports und AI-Auswertung.',
    },
    {
      label: 'Durchschnittliche Satzlänge',
      value: `${avgSentenceLength} Wörter`,
      status: sentenceStatus,
      detail: longSentenceCount ? `${longSentenceCount} sehr lange Sätze gefunden.` : 'Die Satzlänge wirkt gut scanbar.',
    },
  ];

  return createResult({
    tool: tool.slug,
    target: tool.title,
    mode: 'text-local',
    score: scoreFromItems(items),
    summary: `${tool.title} als lokaler Text-Schnellcheck ausgeführt.`,
    items,
    preview: buildTextPreview(tool, text, words).slice(0, MAX_PREVIEW_CHARS),
    nextStep: tool.status === 'provider'
      ? 'Für Webvergleich oder echte AI-Generierung wird ein Daten- oder AI-Provider angebunden.'
      : 'Für Seitenkontext, interne Links und Evidence den passenden Audit starten.',
  });
}

async function runProviderRequired(tool: ToolPage, rawInput: string): Promise<ToolCheckResult> {
  const target = normalizeToolInput(tool, rawInput);
  const items: ToolCheckItem[] = [
    {
      label: tool.inputMode === 'url' ? 'Ziel-URL' : tool.inputMode === 'keyword' ? 'Keyword oder Thema' : 'Text',
      value: tool.inputMode === 'text' ? 'Gültige Eingabe' : target,
      status: 'good',
      detail: 'Die Eingabe ist gültig und kann für diese eigene Tool-Strecke verwendet werden.',
    },
    {
      label: 'Datenquelle',
      value: tool.status === 'planned' ? 'Geplant' : 'Provider erforderlich',
      status: tool.status === 'planned' ? 'info' : 'warning',
      detail: 'Echte Metriken werden nicht erfunden. Für dieses Tool braucht es externe Daten, Add-on-Daten oder eine spätere Integration.',
    },
    {
      label: 'Crawl-Kosten',
      value: 'Kein Full Crawl',
      status: 'good',
      detail: 'Dieser Einstieg verbraucht kein Crawl-Seitenbudget und startet keinen technischen Audit.',
    },
    {
      label: 'Produktstrecke',
      value: tool.category,
      status: 'info',
      detail: tool.checks.join(', '),
    },
  ];

  return createResult({
    tool: tool.slug,
    target: tool.inputMode === 'text' ? tool.title : target,
    mode: 'provider-required',
    score: null,
    summary: `${tool.title} ist als eigene Unterseite vorbereitet; echte Metriken brauchen eine Datenquelle.`,
    items,
    nextStep: 'Provider anbinden, Add-on freischalten oder den Nutzer gezielt in den passenden Audit führen.',
  });
}

async function runFullAuditHandoff(tool: ToolPage, rawInput: string): Promise<ToolCheckResult> {
  const target = normalizeToolInput(tool, rawInput);
  const items: ToolCheckItem[] = [
    {
      label: 'Ziel',
      value: tool.inputMode === 'text' ? 'Gültige Eingabe' : target,
      status: 'good',
      detail: 'Die Eingabe wurde validiert.',
    },
    {
      label: 'Analyse-Typ',
      value: 'Full Audit erforderlich',
      status: 'info',
      detail: 'Dieses Thema braucht mehrere URLs, Evidence oder Crawl-Zusammenhänge.',
    },
    {
      label: 'Kostenkontrolle',
      value: 'Noch kein Crawl gestartet',
      status: 'good',
      detail: 'Der Schnellcheck verbraucht kein Scan- oder Crawl-Seitenbudget.',
    },
    {
      label: 'Audit-Bereiche',
      value: tool.checks.join(', '),
      status: 'info',
    },
  ];

  return createResult({
    tool: tool.slug,
    target: tool.inputMode === 'text' ? tool.title : target,
    mode: 'provider-required',
    score: null,
    summary: `${tool.title} ist ein Audit-Einstieg, kein einzelner Schnellcheck.`,
    items,
    nextStep: 'Von hier aus sollte der Nutzer bewusst den Full Audit starten und sieht vorher, warum Crawl-Budget gebraucht wird.',
  });
}

async function runBacklinkChecker(tool: ToolSlug, rawInput: string): Promise<ToolCheckResult> {
  const target = normalizeUrlInput(rawInput);
  const items: ToolCheckItem[] = [
    {
      label: 'Domain',
      value: target.hostname,
      status: 'good',
      detail: 'Die Domain ist gültig und kann für Backlink-Daten verwendet werden.',
    },
    {
      label: 'Analyse-Modus',
      value: 'Separat vom Crawl',
      status: 'good',
      detail: 'Dieser Check startet bewusst keinen technischen Website-Audit.',
    },
    {
      label: 'Backlink-Datenprovider',
      value: 'Noch nicht verbunden',
      status: 'warning',
      detail: 'Echte Backlink-Metriken brauchen einen externen Linkindex oder eigenes Backlink-Add-on.',
    },
  ];

  return createResult({
    tool,
    target: target.origin,
    mode: 'provider-required',
    score: null,
    summary: 'Backlink-Analyse ist als eigene Tool-Strecke vorbereitet und verbrennt kein Crawl-Budget.',
    items,
    nextStep: 'Nächster Schritt: Backlink-Provider anbinden und an das Backlink Add-on koppeln.',
  });
}

export async function runLightweightToolCheck(tool: string, input: string): Promise<ToolCheckResult> {
  if (!isToolSlug(tool)) {
    throw new Error('Unbekanntes Tool');
  }

  const toolPage = getToolPage(tool);
  if (!toolPage) {
    throw new Error('Unbekanntes Tool');
  }

  switch (toolPage.engine) {
    case 'single-page-seo':
      return runSeoChecker(tool, input);
    case 'meta':
      return runMetaChecker(tool, input);
    case 'pagespeed':
      return runPagespeedTest(tool, input);
    case 'security':
      return runSecurityCheck(tool, input);
    case 'robots':
      return runRobotsChecker(tool, input);
    case 'sitemap':
      return runSitemapChecker(tool, input);
    case 'ai-visibility':
      return runAiVisibilityChecker(tool, input);
    case 'keyword-local':
      return runKeywordChecker(tool, input);
    case 'text-utility':
      return runTextUtility(toolPage, input);
    case 'url-provider':
      if (tool === 'backlink-checker') {
        return runBacklinkChecker(tool, input);
      }
      return runProviderRequired(toolPage, input);
    case 'keyword-provider':
      return runProviderRequired(toolPage, input);
    case 'full-audit':
      return runFullAuditHandoff(toolPage, input);
    case 'reporting':
      return runFullAuditHandoff(toolPage, input);
    default:
      throw new Error('Unbekanntes Tool');
  }
}
