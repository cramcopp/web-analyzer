'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, ShieldCheck, Zap, Globe, Scale, Loader2, AlertCircle, RefreshCw, UserCheck, Download, CodeXml, Share2, Filter, LayoutDashboard, LineChart as LineIcon, Activity, ExternalLink, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, LineChart, Line, CartesianGrid } from 'recharts';
import { ThemeToggle } from '../components/theme-toggle';
import { useTheme } from 'next-themes';
import { Sidebar } from '../components/sidebar';
import { CollapsibleSection } from '../components/collapsible-section';

type PrioritizedTask = {
  priority: string;
  task: string;
  remediation?: string;
};

type DetailedSEO = {
  keywordAnalysis: string;
  metaTagsAssessment: string;
  linkStructure: string;
  mobileFriendly: string;
  localSeoNap: string;
  contentQuality: {
    readabilityAssessment: string;
    duplicateContentIssues: string;
  };
  technicalSeo?: {
    sitemapStatus: string;
    robotsTxtStatus: string;
    canonicalStatus: string;
    hreflangStatus?: string;
  };
  suggestedSchemaMarkup?: string;
  prioritizedTasks: PrioritizedTask[];
};

type DetailedSecurity = {
  sqlXssAssessment: string;
  headerAnalysis: string;
  softwareConfig: string;
  googleSafeBrowsingStatus?: string;
  prioritizedTasks: PrioritizedTask[];
};

type ChartDataFormat = {
  vitals: { metric: string, value: number }[];
  resources: { name: string, count: number }[];
};

type DetailedPerformance = {
  coreVitalsAssessment: string;
  resourceOptimization: string;
  serverAndCache: string;
  lighthouseMetrics?: {
    performance: number;
    accessibility?: number;
    bestPractices?: number;
    seo?: number;
  };
  cachingAnalysis?: {
    browserCaching: string;
    serverCaching: string;
    cdnStatus: string;
  };
  chartData?: ChartDataFormat;
  prioritizedTasks: PrioritizedTask[];
};

type DetailedAccessibility = {
  visualAndContrast: string;
  navigationAndSemantics: string;
  prioritizedTasks: PrioritizedTask[];
};

type DetailedCompliance = {
  gdprAssessment: string;
  cookieBannerStatus: string;
  policyLinksStatus: string;
  prioritizedTasks: PrioritizedTask[];
};

type ReportSection = {
  score: number;
  insights: string[];
  recommendations: string[];
};

type SeoReportSection = ReportSection & {
  detailedSeo: DetailedSEO;
};

type SecurityReportSection = ReportSection & {
  detailedSecurity?: DetailedSecurity;
};

type PerformanceReportSection = ReportSection & {
  detailedPerformance?: DetailedPerformance;
};

type AccessibilityReportSection = ReportSection & {
  detailedAccessibility?: DetailedAccessibility;
};

type ComplianceReportSection = ReportSection & {
  detailedCompliance?: DetailedCompliance;
};

type ReportData = {
  overallAssessment: string;
  industryNews?: string[];
  seo: SeoReportSection;
  security: SecurityReportSection;
  performance: PerformanceReportSection;
  accessibility: AccessibilityReportSection;
  compliance: ComplianceReportSection;
};

const METRIC_DEFINITIONS: Record<string, string> = {
  FCP: "First Contentful Paint: Der Zeitpunkt, an dem der erste Text oder das erste Bild gerendert wird. Wichtig für die wahrgenommene Ladegeschwindigkeit.",
  LCP: "Largest Contentful Paint: Misst, wann der Hauptinhalt der Seite (z.B. Hero-Image) geladen ist. Zentraler Nutzerwahrnehmungswert.",
  TBT: "Total Blocking Time: Die Summe aller Zeitspannen, in denen der Browser-Hauptthread blockiert war. Kritisch für die Interaktivität.",
  TTFB: "Time to First Byte: Die Zeit, bis der Browser das erste Byte vom Server empfängt. Ein Indikator für Server-Antwortzeiten.",
  CLS: "Cumulative Layout Shift: Misst die visuelle Stabilität. Verhindert unerwartete Sprünge des Layouts beim Laden.",
  FID: "First Input Delay: Misst die Verzögerung bis zur ersten Nutzerinteraktion. Wichtig für die Reaktionsfähigkeit."
};

const ResourceTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-[#111] border border-[#DDD] dark:border-[#333] p-3 shadow-2xl">
        <p className="text-[11px] font-bold text-[#D4AF37] mb-1 uppercase tracking-wider">{data.name}</p>
        <p className="text-[14px] text-[#1A1A1A] dark:text-white font-bold">{data.count} Requests</p>
        <p className="text-[10px] text-[#888] dark:text-white/50 mt-1 italic">Anzahl der geladenen {data.name}-Ressourcen.</p>
      </div>
    );
  }
  return null;
};

function PrioritizedTasksSection({ tasks, title, accentColor }: { tasks: PrioritizedTask[], title: string, accentColor: string }) {
  const [filter, setFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [sort, setSort] = useState<'PRIORITY' | 'ALPHA'>('PRIORITY');

  if (!tasks || tasks.length === 0) return null;

  const getPriorityScore = (prio: string) => {
    const p = prio.toLowerCase();
    if (p.includes('critical') || p.includes('high') || p.includes('hoch') || p.includes('kritisch')) return 3;
    if (p.includes('medium') || p.includes('mittel')) return 2;
    return 1;
  };

  const getPriorityColor = (prio: string) => {
    const p = prio.toLowerCase();
    if (p.includes('critical') || p.includes('high') || p.includes('hoch') || p.includes('kritisch')) return 'bg-[#EB5757] text-[#FFFFFF]';
    if (p.includes('medium') || p.includes('mittel')) return 'bg-[#F2994A] text-[#FFFFFF]';
    return 'bg-[#27AE60] text-[#FFFFFF]';
  };

  const filteredTasks = tasks.filter(t => {
    if (filter === 'ALL') return true;
    const p = t.priority.toLowerCase();
    if (filter === 'HIGH') return p.includes('high') || p.includes('hoch') || p.includes('critical') || p.includes('kritisch');
    if (filter === 'MEDIUM') return p.includes('medium') || p.includes('mittel');
    if (filter === 'LOW') return p.includes('low') || p.includes('niedrig');
    return true;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sort === 'PRIORITY') {
      return getPriorityScore(b.priority) - getPriorityScore(a.priority);
    }
    return a.task.localeCompare(b.task);
  });

  return (
    <div className="border-t border-[#1A1A1A] dark:border-zinc-700 pt-[30px]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-[25px]">
        <h4 className="text-[14px] font-bold uppercase text-[#1A1A1A] dark:text-zinc-100 tracking-wide">{title}</h4>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 mr-4">
             <Filter className="w-3.5 h-3.5 text-[#888888]" />
             <span className="text-[10px] font-bold uppercase text-[#888888] tracking-wider">Filter & Sort</span>
          </div>

          <div className="flex p-1 bg-[#F5F5F3] dark:bg-zinc-800 rounded-sm">
            {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-[9px] font-bold uppercase tracking-wider transition-all ${
                  filter === f 
                    ? 'bg-[#1A1A1A] dark:bg-zinc-100 text-[#FFFFFF] dark:text-zinc-900 shadow-sm' 
                    : 'text-[#888888] hover:text-[#1A1A1A] dark:hover:text-zinc-100'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex p-1 bg-[#F5F5F3] dark:bg-zinc-800 rounded-sm">
            <button
              onClick={() => setSort('PRIORITY')}
              className={`px-3 py-1 text-[9px] font-bold uppercase tracking-wider transition-all ${
                sort === 'PRIORITY' 
                  ? 'bg-[#1A1A1A] dark:bg-zinc-100 text-[#FFFFFF] dark:text-zinc-900 shadow-sm' 
                  : 'text-[#888888] hover:text-[#1A1A1A] dark:hover:text-zinc-100'
              }`}
            >
              Prio
            </button>
            <button
              onClick={() => setSort('ALPHA')}
              className={`px-3 py-1 text-[9px] font-bold uppercase tracking-wider transition-all ${
                sort === 'ALPHA' 
                  ? 'bg-[#1A1A1A] dark:bg-zinc-100 text-[#FFFFFF] dark:text-zinc-900 shadow-sm' 
                  : 'text-[#888888] hover:text-[#1A1A1A] dark:hover:text-zinc-100'
              }`}
            >
              A-Z
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {sortedTasks.length > 0 ? (
          sortedTasks.map((task, i) => (
            <div key={i} className="flex flex-col gap-2 p-5 bg-[#F5F5F3] dark:bg-zinc-950 border-l-[3px] transition-all hover:translate-x-1" style={{ borderLeftColor: accentColor }}>
              <div className="flex items-start gap-4">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 mt-0.5 shrink-0 ${getPriorityColor(task.priority)}`}>
                  {task.priority || 'LOW'}
                </span>
                <span className="text-[13px] text-[#1A1A1A] dark:text-zinc-100 font-medium leading-relaxed">{task.task}</span>
              </div>
              {task.remediation && (
                <p className="text-[12px] text-[#888888] dark:text-zinc-400 leading-[1.6] mt-2 border-t border-white/10 pt-2">
                  <strong className="text-[#1A1A1A] dark:text-zinc-100 uppercase text-[10px] tracking-wider">Remediation:</strong> {task.remediation}
                </p>
              )}
            </div>
          ))
        ) : (
          <div className="p-10 text-center bg-[#F5F5F3] dark:bg-zinc-950 border border-dashed border-[#DDD] dark:border-zinc-800">
            <span className="text-[12px] text-[#888888] uppercase font-bold tracking-widest italic opacity-50">Keine Aufgaben für diesen Filter gefunden</span>
          </div>
        )}
      </div>
    </div>
  );
}

const GscTooltip = ({ active, payload, label }: any) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  if (active && payload && payload.length) {
    const dateStr = label ? new Date(label[0]).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    
    return (
      <div className="bg-white dark:bg-[#111] border border-[#DDD] dark:border-[#333] p-3 shadow-2xl min-w-[150px]">
        <p className="text-[11px] font-bold text-[#888] dark:text-[#A1A1AA] mb-2 uppercase tracking-wider">{dateStr}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between mt-1">
             <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                <span className="text-[12px] text-[#1A1A1A] dark:text-zinc-300 capitalize">{entry.name === 'clicks' ? 'Klicks' : 'Impressionen'}</span>
             </div>
             <span className="text-[14px] font-bold ml-4" style={{ color: entry.color }}>{entry.value.toLocaleString('de-DE')}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const PerformanceTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const definition = METRIC_DEFINITIONS[data.metric] || "";
    return (
      <div className="bg-white dark:bg-[#111] border border-[#DDD] dark:border-[#333] p-3 shadow-2xl max-w-[220px]">
        <p className="text-[11px] font-bold text-[#D4AF37] mb-1 uppercase tracking-wider">{data.metric}</p>
        <p className="text-[16px] text-[#1A1A1A] dark:text-white font-bold mb-2">{data.value} ms</p>
        {definition && (
          <p className="text-[10px] text-[#888] dark:text-white/70 leading-relaxed border-t border-[#EEE] dark:border-[#333] pt-2 italic">
            {definition}
          </p>
        )}
      </div>
    );
  }
  return null;
};

export default function WebsiteAnalyzer() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [rawScrapeData, setRawScrapeData] = useState<any>(null);
  const [gscData, setGscData] = useState<any>(null);
  const [isGscLoading, setIsGscLoading] = useState(false);
  const [gscError, setGscError] = useState<string | null>(null);
  const [lastAnalyzedUrl, setLastAnalyzedUrl] = useState<string | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    // ensure http/https
    let targetUrl = url;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    setIsLoading(true);
    setError(null);
    setReport(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('API Error (Not JSON):', text);
        throw new Error(`Serverfehler: Die Antwort ist kein JSON. (Status: ${response.status})`);
      }

      const scrapeData = await response.json();
      setRawScrapeData(scrapeData);

      if (!response.ok) {
        throw new Error(scrapeData.error || 'Fehler beim Analysieren der Website.');
      }

      // Dynamic import to avoid breaking Next.js SSR
      const { GoogleGenAI, Type } = await import('@google/genai');

      // Prepare Gemini API Request
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
      const prompt = `Du bist ein hochkarätiger Webseiten-Analyst, SEO-Experte, Performance-Guru, Security-Auditor und Accessibility-Spezialist.
      Analysiere die folgenden Metadaten, Header und Textinhalte einer Website und erstelle einen ausführlichen Bericht (in Deutsch).
      Bewerte streng nach den Kategorien (Score 0-100) UND fülle die detaillierten "detailedSeo", "detailedSecurity", "detailedPerformance" und "detailedAccessibility" Deep-Dive Module aus.
      
      Spezifische Anforderungen für das SEO-Modul:
      - Analysiere relevante Keywords (aus Text und Metadaten).
      - Bewerte Meta-Tags (Title, Description, Robots, Viewport).
      - Bewerte interne und externe Links.
      - Analysiere mobile User-Experience.
      - Untersuche lokale SEO-Faktoren (NAP: Name, Address, Phone Konsistenz in Text/Links).
      - Führe eine technische SEO-Prüfung durch: Analysiere Canonical-Tags, robots.txt Verfügbarkeit, Sitemap-Status und internationale Hreflang-Tags.
      - Fülle das "technicalSeo" Objekt mit spezifischen Informationen zu Sitemap, robots.txt, Canonical Tags und Hreflang-Implementierung (Feld "hreflangStatus").
      - Generiere einen Vorschlag für valides JSON-LD Schema Markup (z.B. Organization, WebSite oder LocalBusiness), das die Seite implementieren sollte, um Rich Snippets zu verbessern. Setze diesen Vorschlag in das Feld "suggestedSchemaMarkup".
      - Erstelle eine Liste von priorisierten Handlungsempfehlungen.

      Spezifische Anforderungen für das Security-Modul:
      - Analysiere Security Header (z.B. Content-Security-Policy, X-Frame-Options, HSTS).
      - Bewerte Angriffsflächen für SQL-Injection (SQLi) und XSS in Bezug auf gefundene Formulare.
      - Finde potenziell veraltete Software-Versionen oder unsichere Konfigurationen anhand von Headern und Metadaten (Generator).
      - Erstelle eine Liste priorisierter Security-Tasks inkl. klarer Anleitungen zur Behebung (Remediation).

      Spezifische Anforderungen für das Performance-Modul:
      - Analysiere Ladegeschwindigkeits-Faktoren (z.B. Basis-Antwortzeit des Servers, Time to Interactive Schätzung).
      - Identifiziere Engpässe wie unoptimierte Bilder (Lazy-Loading Ratio), blockierendes JavaScript/CSS.
      - Führe eine TIEFE Caching-Analyse durch: Untersuche "Cache-Control", "Expires" und "ETag" Header für das Browser-Caching.
      - Identifiziere Server-seitige Caching-Strategien oder CDN-Nutzung anhand von Headern (z.B. X-Cache, Via, CF-Cache-Status).
      - Fülle das "cachingAnalysis" Objekt mit spezifischen Details zu Browser-Caching, Server-Caching und CDN-Status.
      - Bewerte die Caching-Strategie und Server Performance anhand der HTTP-Header.
      - Fülle das "chartData" Objekt basierend auf den bereitgestellten Rohdaten: Für "resources" setze exakt die gezählten Scripts, Styles und Images ein. Für "vitals" MUSST du die Milsisekunden-Werte FCP (First Contentful Paint), LCP (Largest Contentful Paint) und TBT (Total Blocking Time) EXAKT 1:1 aus dem unten bereitgestellten "Google PageSpeed Insights" String übernehmen (sofern vorhanden)!
      - Erstelle eine Liste priorisierter Performance-Tasks inkl. klarer Anleitungen zur Behebung (Remediation).

      Spezifische Anforderungen für das Accessibility-Modul:
      - Bewerte die Bild-Zugänglichkeit (fehlende Alt-Texte).
      - Prüfe semantische HTML-Struktur und ARIA-Nutzung.
      - Analysiere potenzielle Farbkontrast-Probleme, leere Buttons/Links und Tastaturnavigation (z.B. deaktivierter Zoom).
      - Erstelle eine Liste priorisierter A11y-Tasks inkl. klarer Anleitungen zur Behebung.

      Spezifische Anforderungen für das Legal/Compliance-Modul (Fokus DSGVO/BSG/TMG):
      - Analysiere das Vorhandensein eines Impressums, Datenschutzhinweisen (Privacy Policy) und AGB (Terms of Service).
      - Identifiziere das Fehlen eines Cookie-Consent-Banners basierend auf den Rohdaten.
      - Bewerte die Sicherheit der Formulare (DSGVO-Konforme Übertragung/Pflichtfelder).
      - Erstelle spezifische Empfehlungen und priorisierte Aufgaben für die Rechtssicherheit.

      Spezifische Anforderungen für Realtime Industry News:
      - Nutze das eingebundene Google Search Tool, um aktuelle Nachrichten, Trends, Sicherheitslücken oder Google-Updates zu suchen, die exakt zur Branche oder Technologie der analysierten URL passen.
      - Fasse 2-3 hochaktuelle Fakten in das Array "industryNews" zusammen.
      
      WICHTIGE REGEL ZU CODE-VORSCHLÄGEN:
      - Es dürfen absolut KEINE Code-Vorschläge, Code-Beispiele, HTML, CSS, JavaScript oder JSON Snippets in den Lösungsansätzen, Empfehlungen oder Actionables enthalten sein.
      - Gib rein strategische und inhaltliche Anweisungen in Fließtext.
      - (Ausnahme: Das Feld "suggestedSchemaMarkup" MUSS reiner JSON-LD Code sein).

      URL: ${scrapeData.urlObj}
      Title: ${scrapeData.title}
      Meta Description: ${scrapeData.metaDescription}
      Meta Keywords: ${scrapeData.metaKeywords}
      HTML Lang Attribute: ${scrapeData.htmlLang}
      Generator (Software): ${scrapeData.generator}
      Viewport: ${scrapeData.viewport}
      Viewport Zoom allowed: ${scrapeData.viewportScalable}
      Robots: ${scrapeData.robots}
      Forms found: ${scrapeData.formsCount} (${(scrapeData.formDetails || []).join(' | ')})
      H1 count: ${scrapeData.h1Count}, H2 count: ${scrapeData.h2Count}
      Images Total: ${scrapeData.imagesTotal}, Images missing ALT: ${scrapeData.imagesWithoutAlt}, Images Lazy-Loaded: ${scrapeData.lazyImages}
      ARIA Attributes Count: ${scrapeData.ariaCount}
      Empty Buttons/Links: ${scrapeData.emptyButtonsLinks}
      Internal Links: ${scrapeData.internalLinksCount}, External Links: ${scrapeData.externalLinksCount}
      
      Technical SEO signals:
      - Canonical URL detected: ${scrapeData.technicalSeo?.canonical || 'None'}
      - robots.txt found: ${scrapeData.technicalSeo?.robotsTxtFound ? 'YES' : 'NO'}
      - Sitemap mentioned in robots.txt: ${scrapeData.technicalSeo?.sitemapMentionedInRobots ? 'YES' : 'NO'}
      - Hreflang tags detected: ${JSON.stringify(scrapeData.technicalSeo?.hreflangs || [])}
      
      Social & Schema Context:
      - OpenGraph Title: ${scrapeData.social?.ogTitle || 'None'}
      - OpenGraph Description: ${scrapeData.social?.ogDescription || 'None'}
      - OpenGraph Image: ${scrapeData.social?.ogImage || 'None'}
      - OpenGraph Type: ${scrapeData.social?.ogType || 'None'}
      - Existing JSON-LD Schema Blocks: ${scrapeData.existingSchemaCount}
      
      Scripts (Total / Blocking): ${scrapeData.totalScripts} / ${scrapeData.blockingScripts}
      Stylesheets: ${scrapeData.totalStylesheets}
      Server Response Time (TTFB approx): ${scrapeData.responseTimeMs}ms
      
      ${scrapeData.psiMetricsStr}
      
      Google Safe Browsing Status:
      ${scrapeData.safeBrowsingStr || 'Nicht geprüft'}

      HTTP Headers: ${JSON.stringify(scrapeData.headers)}
      First 80 Links found: ${scrapeData.linkSummary}
      
      Legal signals:
      - Impressum Link detected: ${scrapeData.legal?.impressesumLink ? 'YES' : 'NO'}
      - Privacy Policy Link detected: ${scrapeData.legal?.privacyLink ? 'YES' : 'NO'}
      - Terms of Service Link detected: ${scrapeData.legal?.tosLink ? 'YES' : 'NO'}
      - Cookie Banner logic detected: ${scrapeData.legal?.cookieBannerFound ? 'YES' : 'NO'}
      - Prominence: Privacy Link in footer? ${scrapeData.legal?.privacyInFooter ? 'YES' : 'NO'}
      - Tracking Scripts detected: ${JSON.stringify(scrapeData.legal?.trackingScripts)}
      - CMP (Consent Management Platform) detected: ${JSON.stringify(scrapeData.legal?.cmpDetected)}

      Content Signals:
      - Flesch Reading Ease Score: ${scrapeData.fleschScore}
      - Multiple H1 Headings: ${scrapeData.contentAudit?.duplicateH1s ? 'YES' : 'NO'}
      - Duplicate H2 Headings: ${scrapeData.contentAudit?.duplicateH2s ? 'YES' : 'NO'}
      - Identical H1 and H2 text: ${scrapeData.contentAudit?.identicalHeadings ? 'YES' : 'NO'}

      Excerpt of Body Text (max 15000 chars):
      ${scrapeData.bodyText}
      `;

      const aiResponse = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overallAssessment: { type: Type.STRING, description: "Kurze Zusammenfassung der Analyse und des Gesamteindrucks." },
              industryNews: { type: Type.ARRAY, items: { type: Type.STRING }, description: "2-3 aktuelle News/Insights zur ermittelten Branche." },
              seo: {
                type: Type.OBJECT,
                properties: {
                  score: { type: Type.INTEGER, description: "Bewertung von 0 bis 100" },
                  insights: { type: Type.ARRAY, items: { type: Type.STRING } },
                  recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
                  detailedSeo: {
                    type: Type.OBJECT,
                    properties: {
                      keywordAnalysis: { type: Type.STRING },
                      metaTagsAssessment: { type: Type.STRING },
                      linkStructure: { type: Type.STRING },
                      mobileFriendly: { type: Type.STRING },
                      localSeoNap: { type: Type.STRING },
                      contentQuality: {
                        type: Type.OBJECT,
                        properties: {
                          readabilityAssessment: { type: Type.STRING },
                          duplicateContentIssues: { type: Type.STRING }
                        },
                        required: ["readabilityAssessment", "duplicateContentIssues"]
                      },
                      technicalSeo: {
                        type: Type.OBJECT,
                        properties: {
                          sitemapStatus: { type: Type.STRING, description: "Informationen zur XML-Sitemap (Vorhanden vs. Fehlend)." },
                          robotsTxtStatus: { type: Type.STRING, description: "Bewertung der robots.txt Direktiven." },
                          canonicalStatus: { type: Type.STRING, description: "Einschätzung der Canonical-Tag Implementierung." },
                          hreflangStatus: { type: Type.STRING, description: "Analyse der internationalen Hreflang-Tags." }
                        },
                        required: ["sitemapStatus", "robotsTxtStatus", "canonicalStatus", "hreflangStatus"]
                      },
                      suggestedSchemaMarkup: { type: Type.STRING, description: "Valider JSON-LD Code als String." },
                      prioritizedTasks: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            priority: { type: Type.STRING },
                            task: { type: Type.STRING }
                          }
                        }
                      }
                    },
                    required: ["keywordAnalysis", "metaTagsAssessment", "linkStructure", "mobileFriendly", "localSeoNap", "contentQuality", "technicalSeo", "prioritizedTasks"]
                  }
                },
                required: ["score", "insights", "recommendations", "detailedSeo"]
              },
              security: {
                type: Type.OBJECT,
                properties: {
                  score: { type: Type.INTEGER },
                  insights: { type: Type.ARRAY, items: { type: Type.STRING } },
                  recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
                  detailedSecurity: {
                    type: Type.OBJECT,
                    properties: {
                      sqlXssAssessment: { type: Type.STRING },
                      headerAnalysis: { type: Type.STRING },
                      softwareConfig: { type: Type.STRING },
                      googleSafeBrowsingStatus: { type: Type.STRING, description: "Zusammenfassung des Google Safe Browsing Status." },
                      prioritizedTasks: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            priority: { type: Type.STRING },
                            task: { type: Type.STRING },
                            remediation: { type: Type.STRING }
                          }
                        }
                      }
                    },
                    required: ["sqlXssAssessment", "headerAnalysis", "softwareConfig", "prioritizedTasks"]
                  }
                },
                required: ["score", "insights", "recommendations", "detailedSecurity"]
              },
              performance: {
                type: Type.OBJECT,
                properties: {
                  score: { type: Type.INTEGER },
                  insights: { type: Type.ARRAY, items: { type: Type.STRING } },
                  recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
                  detailedPerformance: {
                    type: Type.OBJECT,
                    properties: {
                      coreVitalsAssessment: { type: Type.STRING, description: "Einschätzung von Metriken wie FCP, LCP, TTI basierend auf den Daten." },
                      resourceOptimization: { type: Type.STRING, description: "Bewertung von blockierenden Skripten, unoptimierten Bildern und CSS." },
                      serverAndCache: { type: Type.STRING, description: "Server Reaktionszeit, Caching-Header und Komprimierung (GZIP/Brotli)." },
                      lighthouseMetrics: {
                        type: Type.OBJECT,
                        properties: {
                          performance: { type: Type.INTEGER },
                          accessibility: { type: Type.INTEGER },
                          bestPractices: { type: Type.INTEGER },
                          seo: { type: Type.INTEGER }
                        },
                        required: ["performance", "accessibility", "bestPractices", "seo"]
                      },
                      cachingAnalysis: {
                        type: Type.OBJECT,
                        properties: {
                          browserCaching: { type: Type.STRING, description: "Details zu Cache-Control, Expires, ETag." },
                          serverCaching: { type: Type.STRING, description: "Details zu Server-seitigem Caching (z.B. Varnish, Nginx)." },
                          cdnStatus: { type: Type.STRING, description: "Erkennung von CDNs wie Cloudflare, Akamai, CloudFront." }
                        },
                        required: ["browserCaching", "serverCaching", "cdnStatus"]
                      },
                      chartData: {
                        type: Type.OBJECT,
                        properties: {
                          vitals: {
                            type: Type.ARRAY,
                            items: {
                              type: Type.OBJECT,
                              properties: {
                                metric: { type: Type.STRING, description: "Z.B. TTFB, LCP, TBT" },
                                value: { type: Type.INTEGER, description: "Wert in Millisekunden (geschätzt oder vom System gegeben)" }
                              }
                            }
                          },
                          resources: {
                            type: Type.ARRAY,
                            items: {
                              type: Type.OBJECT,
                              properties: {
                                name: { type: Type.STRING, description: "Z.B. Scripts, Styles, Images" },
                                count: { type: Type.INTEGER, description: "Anzahl" }
                              }
                            }
                          }
                        },
                        required: ["vitals", "resources"]
                      },
                      prioritizedTasks: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            priority: { type: Type.STRING, description: "High, Medium, oder Low" },
                            task: { type: Type.STRING },
                            remediation: { type: Type.STRING }
                          }
                        }
                      }
                    },
                    required: ["coreVitalsAssessment", "resourceOptimization", "serverAndCache", "lighthouseMetrics", "cachingAnalysis", "chartData", "prioritizedTasks"]
                  }
                },
                required: ["score", "insights", "recommendations", "detailedPerformance"]
              },
              accessibility: {
                type: Type.OBJECT,
                properties: {
                  score: { type: Type.INTEGER },
                  insights: { type: Type.ARRAY, items: { type: Type.STRING } },
                  recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
                  detailedAccessibility: {
                    type: Type.OBJECT,
                    properties: {
                      visualAndContrast: { type: Type.STRING, description: "Bilder, Alt-Texte und visuelle Zugänglichkeit (Kontraste)." },
                      navigationAndSemantics: { type: Type.STRING, description: "Tastaturnavigation, ARIA-Tags, semantische Struktur, leere Buttons." },
                      prioritizedTasks: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            priority: { type: Type.STRING, description: "High, Medium, oder Low" },
                            task: { type: Type.STRING },
                            remediation: { type: Type.STRING }
                          }
                        }
                      }
                    },
                    required: ["visualAndContrast", "navigationAndSemantics", "prioritizedTasks"]
                  }
                },
                required: ["score", "insights", "recommendations", "detailedAccessibility"]
              },
              compliance: {
                type: Type.OBJECT,
                properties: {
                  score: { type: Type.INTEGER },
                  insights: { type: Type.ARRAY, items: { type: Type.STRING } },
                  recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
                  detailedCompliance: {
                    type: Type.OBJECT,
                    properties: {
                      gdprAssessment: { type: Type.STRING, description: "Allgemeine DSGVO-Einschätzung basierend auf Formularen, Skripten und Text." },
                      cookieBannerStatus: { type: Type.STRING, description: "Status des Cookie-Banners (Vorhanden/Gefunden vs. Fehlend)." },
                      policyLinksStatus: { type: Type.STRING, description: "Einschätzung zu Impressum, Datenschutzerklärung und AGB." },
                      prioritizedTasks: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            priority: { type: Type.STRING },
                            task: { type: Type.STRING },
                            remediation: { type: Type.STRING }
                          }
                        }
                      }
                    },
                    required: ["gdprAssessment", "cookieBannerStatus", "policyLinksStatus", "prioritizedTasks"]
                  }
                },
                required: ["score", "insights", "recommendations", "detailedCompliance"]
              }
            },
            required: ["overallAssessment", "industryNews", "seo", "security", "performance", "accessibility", "compliance"]
          }
        }
      });

      if (!aiResponse.text) {
         throw new Error("No text returned from Gemini");
      }

      const finalReport = JSON.parse(aiResponse.text.trim());
      setReport(finalReport);
      setLastAnalyzedUrl(targetUrl);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGSCData = useCallback(async (targetUrl: string) => {
    setIsGscLoading(true);
    setGscError(null);
    try {
      const resp = await fetch(`/api/search-console/stats?url=${encodeURIComponent(targetUrl)}`);
      
      const contentType = resp.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await resp.text();
        console.error('GSC API Error (Not JSON):', text);
        throw new Error(`GSC Serverfehler: Antwort ist kein JSON. (Status: ${resp.status})`);
      }

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Fehler beim Laden von GSC Daten');
      setGscData(data);
    } catch (err: any) {
      setGscError(err.message);
      console.error(err);
    } finally {
      setIsGscLoading(false);
    }
  }, []);

  const handleConnectGSC = async () => {
    try {
      const resp = await fetch('/api/auth/google/url');
      const { url } = await resp.json();
      const popup = window.open(url, 'GSC Auth', 'width=600,height=700');
      if (!popup) {
        alert('Bitte erlaube Popups für die Google-Verbindung.');
      }
    } catch (err) {
      setGscError('Fehler beim Starten der Google-Verbindung.');
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'GSC_AUTH_SUCCESS') {
        if (lastAnalyzedUrl) {
          fetchGSCData(lastAnalyzedUrl);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [lastAnalyzedUrl, fetchGSCData]);

  const exportActionPlanToCSV = () => {
    if (!report) return;

    const rows = [
      ['Category', 'Priority', 'Task', 'Remediation']
    ];

    const addTasks = (category: string, tasks?: PrioritizedTask[]) => {
      if (!tasks) return;
      tasks.forEach(t => {
        const safeTask = `"${(t.task || '').replace(/"/g, '""')}"`;
        const safeRemediation = `"${(t.remediation || '').replace(/"/g, '""')}"`;
        const safePriority = `"${(t.priority || '').replace(/"/g, '""')}"`;
        rows.push([category, safePriority, safeTask, safeRemediation]);
      });
    };

    addTasks('SEO', report.seo.detailedSeo?.prioritizedTasks);
    addTasks('Security', report.security.detailedSecurity?.prioritizedTasks);
    addTasks('Performance', report.performance.detailedPerformance?.prioritizedTasks);
    addTasks('Accessibility', report.accessibility.detailedAccessibility?.prioritizedTasks);
    addTasks('Legal/Compliance', report.compliance.detailedCompliance?.prioritizedTasks);

    const csvContent = "\ufeff" + rows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const blobUrl = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `AuraScan_ActionPlan_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  };

  return (
    <main className="min-h-screen bg-[#F5F5F3] dark:bg-zinc-950 text-[#1A1A1A] dark:text-zinc-100 font-['Helvetica_Neue',_Helvetica,_Arial,_sans-serif] overflow-x-hidden transition-colors pl-0 md:pl-64">
      <Sidebar />
      <div className="max-w-[1024px] mx-auto px-10 py-[60px] flex flex-col justify-between min-h-screen">
        
        <div>
          {/* Header */}
          <header className="mb-10 flex flex-col md:flex-row md:justify-between md:items-start gap-8">
            <div className="flex flex-col md:flex-row justify-between w-full md:items-start gap-4 md:gap-8">
              <h1 className="text-[50px] md:text-[82px] leading-[0.85] tracking-[-3px] font-bold uppercase max-w-[500px]">
                Website Analyzer Pro
              </h1>
            </div>
            <div className="md:text-right flex flex-col gap-1 mt-2 md:mt-0 opacity-80 text-[#1A1A1A] dark:text-zinc-100 dark:text-zinc-400">
              <p className="text-[11px] opacity-50 uppercase tracking-[1px] font-semibold">VERSION 4.2.0 (GOLD)</p>
              <p className="text-[14px] font-bold uppercase tracking-[1px]">BERLIN, DE</p>
            </div>
          </header>

          {/* Input Form */}
          <section className="mb-[60px] mt-10 relative">
            <span className="text-[12px] uppercase tracking-[1px] font-semibold text-[#888888] dark:text-zinc-400 dark:text-zinc-400 mb-[10px] block">
              Webseite oder Git-Repository URL
            </span>
            <form onSubmit={handleAnalyze} className="flex flex-col md:flex-row items-end gap-6 relative">
              <div className="relative w-full flex-grow">
                <Globe className="w-6 h-6 text-[#1A1A1A] dark:text-zinc-100 dark:text-zinc-400 absolute right-2 bottom-3 opacity-20" />
                <input 
                  type="text" 
                  placeholder="https://deine-website.de" 
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full bg-transparent border-none border-b-[3px] border-[#1A1A1A] dark:border-zinc-700 dark:border-zinc-50 text-[24px] md:text-[32px] py-[10px] pr-10 font-light outline-none rounded-none placeholder:text-[#888888] dark:text-zinc-400/30 dark:placeholder:text-zinc-500 focus:ring-0 focus:border-[#D4AF37] dark:focus:border-[#D4AF37] transition-colors"
                  disabled={isLoading}
                />
              </div>
              <button 
                type="submit" 
                disabled={isLoading || !url}
                className="bg-[#1A1A1A] dark:bg-zinc-100 hover:bg-[#D4AF37] dark:hover:bg-[#D4AF37] text-[#FFFFFF] dark:text-zinc-900 px-8 py-5 text-center uppercase text-[12px] tracking-[2px] font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shrink-0 rounded-none w-full md:w-auto"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Analysieren
              </button>
            </form>
            {error && (
              <div className="mt-6 p-4 border border-[#EB5757]/30 bg-[#EB5757]/5 text-[#EB5757] flex items-start gap-3 rounded-none">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm font-semibold">{error}</p>
              </div>
            )}
            
            <p className="text-[11px] text-[#888888] dark:text-zinc-400 uppercase tracking-[1px] font-semibold max-w-[500px] mt-8 leading-[1.6]">
              Dein All-in-One Scanner für SEO, Security, Performance & aktuelles deutsches Recht (DSGVO). 
              Gib einfach eine URL ein, und überlasse der KI die Analyse.
            </p>
          </section>

          {/* Loading State */}
          {isLoading && (
            <div className="py-24 flex flex-col items-center justify-center text-[#1A1A1A] dark:text-zinc-100 gap-6">
               <div className="relative">
                 <div className="w-16 h-16 border-4 border-[#1A1A1A] dark:border-zinc-700/10 rounded-full"></div>
                 <div className="w-16 h-16 border-4 border-[#1A1A1A] dark:border-zinc-700 rounded-full animate-spin border-t-transparent absolute top-0 left-0"></div>
               </div>
               <div className="text-center">
                 <p className="text-[18px] font-bold uppercase tracking-[1px] text-[#1A1A1A] dark:text-zinc-100 mb-2">Deep Scan in Progress...</p>
                 <p className="text-[12px] uppercase text-[#888888] dark:text-zinc-400 tracking-[1px]">Dies kann bis zu 45 Sekunden dauern.</p>
               </div>
            </div>
          )}

          {/* Report Display */}
          {report && !isLoading && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">

              {/* Score Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-[20px] mt-[60px] mb-[60px]">
                <ScoreCard title="SEO & AI View" score={report.seo.score} desc="Semantische Struktur." />
                <ScoreCard title="Security" score={report.security.score} desc="Vulnerabilities & SSL." />
                <ScoreCard title="Performance" score={report.performance.score} desc="Rendering & Speed." />
                <ScoreCard title="Accessibility" score={report.accessibility.score} desc="A11y & Kontraste." />
                <ScoreCard title="Recht & DSGVO" score={report.compliance.score} desc="Impressum & Privacy." />
              </div>

              {/* Overall Assessment */}
              <section id="summary" className="bg-[#FFFFFF] dark:bg-zinc-900 p-[40px] border-l border-black/5 dark:border-white/5 mb-12 flex flex-col relative">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-[20px]">
                  <h2 className="text-[18px] font-bold uppercase flex items-center gap-3">
                    <RefreshCw className="w-5 h-5 text-[#888888] dark:text-zinc-400" />
                    Executive Summary
                  </h2>
                  <button 
                    onClick={exportActionPlanToCSV}
                    className="flex items-center justify-center gap-2 bg-[#D4AF37] hover:bg-[#1A1A1A] dark:bg-zinc-800 text-[#1A1A1A] dark:text-zinc-100 hover:text-[#FFFFFF] px-4 py-2 text-[10px] font-bold uppercase tracking-[1px] transition-colors self-start"
                  >
                    <Download className="w-4 h-4" />
                    Export Action Plan (CSV)
                  </button>
                </div>
                <p className="text-[#1A1A1A] dark:text-zinc-100 leading-[1.6] text-[14px]">
                  {report.overallAssessment}
                </p>
                {report.industryNews && report.industryNews.length > 0 && (
                  <div className="mt-[30px] pt-[20px] border-t border-[#EEE] dark:border-zinc-800">
                    <h3 className="text-[12px] font-bold uppercase tracking-[1px] text-[#888888] dark:text-zinc-400 mb-4 flex items-center gap-2">
                       <Globe className="w-4 h-4" />
                       Real-Time Industry News & Context (via Google Search)
                    </h3>
                    <ul className="flex flex-col gap-3">
                      {(report.industryNews || []).map((news, i) => (
                        <li key={i} className="text-[#1A1A1A] dark:text-zinc-100 text-[13px] leading-[1.6] flex items-start gap-3">
                          <span className="text-[#D4AF37] font-bold mt-[-1px]">›</span>
                          <span>{news}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>

              {/* Advanced Modules */}
              <div className="flex flex-col gap-10">
                {report.seo.detailedSeo && (
                   <SeoDeepDiveModule detailedSeo={report.seo.detailedSeo} socialData={rawScrapeData?.social} />
                )}

                <SearchConsoleModule 
                  data={gscData} 
                  isLoading={isGscLoading} 
                  onConnect={handleConnectGSC} 
                  error={gscError} 
                />

                {report.security.detailedSecurity && (
                   <SecurityDeepDiveModule detailedSecurity={report.security.detailedSecurity} />
                )}

                {report.performance.detailedPerformance && (
                   <PerformanceDeepDiveModule detailedPerformance={report.performance.detailedPerformance} />
                )}

                {report.accessibility.detailedAccessibility && (
                   <AccessibilityDeepDiveModule detailedAccessibility={report.accessibility.detailedAccessibility} />
                )}

                {report.compliance.detailedCompliance && (
                   <ComplianceDeepDiveModule 
                    detailedCompliance={report.compliance.detailedCompliance} 
                    legalData={rawScrapeData?.legal}
                   />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-20 pt-6 border-t border-[#1A1A1A] dark:border-zinc-700 flex flex-col sm:flex-row gap-8 sm:gap-[60px] opacity-70">
          <div className="flex-1">
            <p className="text-[11px] uppercase tracking-[1px] font-semibold">Letzter Scan: {new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
          </div>
          <div className="flex-1">
            <p className="text-[11px] uppercase tracking-[1px] font-semibold">Modus: Deep Analysis (AI-Enhanced)</p>
          </div>
        </footer>
      </div>
    </main>
  );
}

function QuickNav() {
  const sections = [
    { id: 'summary', name: 'Zusammenfassung', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'seo', name: 'SEO', icon: <Search className="w-4 h-4" /> },
    { id: 'gsc', name: 'Search Console', icon: <Activity className="w-4 h-4" /> },
    { id: 'security', name: 'Sicherheit', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'performance', name: 'Performance', icon: <Zap className="w-4 h-4" /> },
    { id: 'accessibility', name: 'Barrierefreiheit', icon: <UserCheck className="w-4 h-4" /> },
    { id: 'compliance', name: 'Recht/DSGVO', icon: <Scale className="w-4 h-4" /> },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-[#F5F5F3]/80 dark:bg-zinc-950/80 backdrop-blur-md border-b-[1px] border-black/5 dark:border-white/5 py-4 mb-8 -mx-10 px-10">
      <div className="flex items-center gap-8 overflow-x-auto no-scrollbar scroll-smooth">
        <span className="text-[10px] uppercase font-black text-[#D4AF37] whitespace-nowrap tracking-widest">Reports</span>
        <div className="flex items-center gap-6">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="flex items-center gap-2 text-[11px] uppercase font-bold text-[#888888] hover:text-[#1A1A1A] dark:hover:text-zinc-100 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
            >
              <span className="opacity-50">{s.icon}</span>
              {s.name}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}

function ScoreCard({ title, score, desc }: { title: string, score: number, desc: string }) {
  const getStatus = (s: number) => {
    if (s >= 80) return 'text-[#27AE60]';
    if (s >= 50) return 'text-[#F2994A]';
    return 'text-[#EB5757]';
  };

  return (
    <div className="border-t border-[#1A1A1A] dark:border-zinc-700 pt-[15px] bg-transparent flex flex-col transition-all duration-300 ease-out hover:translate-y-[-4px] group">
      <span className="text-[12px] uppercase font-bold mb-[5px] text-[#1A1A1A] dark:text-zinc-100 group-hover:text-[#D4AF37] transition-colors">{title}</span>
      <span className={`text-[48px] font-bold leading-none mb-1 tracking-tight ${getStatus(score)}`}>
        {score}.
      </span>
      <p className="text-[11px] leading-[1.4] text-[#888888] dark:text-zinc-400 mt-2">
        {desc}
      </p>
    </div>
  );
}

function SeoDeepDiveModule({ detailedSeo, socialData }: { detailedSeo: DetailedSEO, socialData?: any }) {
  return (
    <CollapsibleSection id="seo" title="Comprehensive SEO Analysis" icon={<Search className="w-6 h-6" />} color="#1A1A1A" badge="SEO DEEP DIVE" className="mt-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[40px] mb-[40px]">
         <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
            <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] dark:text-zinc-400 tracking-wider">Keywords & Inhaltsrelevanz</span>
             <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-zinc-100 font-medium">{detailedSeo.keywordAnalysis}</p>
         </div>
         <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
            <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] dark:text-zinc-400 tracking-wider">Meta-Tags & Struktur</span>
             <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-zinc-100 font-medium">{detailedSeo.metaTagsAssessment}</p>
         </div>
         <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
            <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] dark:text-zinc-400 tracking-wider">Link-Profil (Intern/Extern)</span>
             <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-zinc-100 font-medium">{detailedSeo.linkStructure}</p>
         </div>
         <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
            <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] dark:text-zinc-400 tracking-wider">Mobile UX & Viewport</span>
             <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-zinc-100 font-medium">{detailedSeo.mobileFriendly}</p>
         </div>
         <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px] md:col-span-2">
            <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] dark:text-zinc-400 tracking-wider">Lokales SEO (NAP-Daten)</span>
             <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-zinc-100 font-medium">{detailedSeo.localSeoNap}</p>
         </div>

         {detailedSeo.contentQuality && (
           <>
             <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
                <span className="text-[11px] uppercase font-bold mb-[5px] text-[#27AE60] tracking-wider">Lesbarkeit & Flesch-Score</span>
                 <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-zinc-100 font-medium">{detailedSeo.contentQuality.readabilityAssessment}</p>
             </div>
             <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
                <span className="text-[11px] uppercase font-bold mb-[5px] text-[#EB5757] tracking-wider">Content-Duplikate & Fokus</span>
                 <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-zinc-100 font-medium">{detailedSeo.contentQuality.duplicateContentIssues}</p>
             </div>
           </>
         )}

         {detailedSeo.technicalSeo && (
           <div className="flex flex-col gap-6 md:col-span-2 mt-4 p-4 bg-[#F5F5F3] dark:bg-zinc-950 border border-[#EEE] dark:border-zinc-800">
             <h4 className="text-[12px] font-bold uppercase tracking-wider text-[#1A1A1A] dark:text-zinc-100 mb-2 border-b border-[#EEE] dark:border-zinc-800 pb-2">Technisches SEO Deep-Dive</h4>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="flex flex-col">
                   <span className="text-[10px] uppercase font-bold text-[#888888] dark:text-zinc-400 mb-1">XML Sitemap</span>
                   <p className="text-[12px] text-[#1A1A1A] dark:text-zinc-100 leading-relaxed font-medium">{detailedSeo.technicalSeo.sitemapStatus}</p>
                </div>
                <div className="flex flex-col">
                   <span className="text-[10px] uppercase font-bold text-[#888888] dark:text-zinc-400 mb-1">Robots.txt</span>
                   <p className="text-[12px] text-[#1A1A1A] dark:text-zinc-100 leading-relaxed font-medium">{detailedSeo.technicalSeo.robotsTxtStatus}</p>
                </div>
                <div className="flex flex-col">
                   <span className="text-[10px] uppercase font-bold text-[#888888] dark:text-zinc-400 mb-1">Canonical Tag</span>
                   <p className="text-[12px] text-[#1A1A1A] dark:text-zinc-100 leading-relaxed font-medium">{detailedSeo.technicalSeo.canonicalStatus}</p>
                </div>
                <div className="flex flex-col">
                   <span className="text-[10px] uppercase font-bold text-[#888888] dark:text-zinc-400 mb-1">Hreflang (International)</span>
                   <p className="text-[12px] text-[#1A1A1A] dark:text-zinc-100 leading-relaxed font-medium">{detailedSeo.technicalSeo.hreflangStatus}</p>
                </div>
             </div>
           </div>
         )}
      </div>

      {detailedSeo.suggestedSchemaMarkup && (
        <div className="mt-8 pt-8 border-t border-[#EEE] dark:border-zinc-700">
           <div className="flex items-center justify-between mb-4">
             <h4 className="text-[14px] font-bold uppercase text-[#1A1A1A] dark:text-zinc-100 flex items-center gap-2 tracking-wide">
               <CodeXml className="w-5 h-5 text-[#D4AF37]" />
               Vorgeschlagenes Schema Markup (JSON-LD)
             </h4>
             <button 
               onClick={() => {
                 navigator.clipboard.writeText(detailedSeo.suggestedSchemaMarkup || '');
               }}
               className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 bg-[#1A1A1A] dark:bg-zinc-800 text-white hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition-colors"
             >
               Kopieren
             </button>
           </div>
           <div className="bg-[#1A1A1A] dark:bg-zinc-950 p-6 rounded-sm border border-white/5 overflow-x-auto max-h-[300px]">
             <pre className="text-[12px] text-[#A9B7C6] font-mono leading-relaxed whitespace-pre-wrap">
               {detailedSeo.suggestedSchemaMarkup}
             </pre>
           </div>
           <p className="text-[11px] text-[#888888] dark:text-zinc-400 mt-3 italic leading-relaxed">
             Dieses Markup hilft Suchmaschinen dabei, den Kontext Ihrer Inhalte besser zu verstehen (z.B. für Rich Snippets in den Google Suchergebnissen).
           </p>
        </div>
      )}

      {socialData && (
        <div className="mt-8 pt-8 border-t border-[#EEE] dark:border-zinc-700">
           <h4 className="text-[14px] font-bold uppercase text-[#1A1A1A] dark:text-zinc-100 flex items-center gap-3 tracking-wide mb-8">
             <Share2 className="w-5 h-5 text-[#D4AF37]" />
             Social Media Preview (OpenGraph)
           </h4>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
             {/* Card Preview */}
             <div className="bg-[#FFFFFF] dark:bg-zinc-950 border border-[#EEE] dark:border-zinc-800 rounded-none overflow-hidden shadow-sm max-w-[450px]">
               {socialData.ogImage ? (
                 <div className="w-full h-[230px] relative bg-[#F5F5F3] dark:bg-zinc-900 border-b border-[#EEE] dark:border-zinc-800">
                   <img 
                     src={socialData.ogImage} 
                     alt="Social Preview" 
                     className="w-full h-full object-cover"
                     referrerPolicy="no-referrer"
                   />
                 </div>
               ) : (
                 <div className="w-full h-[230px] bg-[#F5F5F3] dark:bg-zinc-900 flex flex-col items-center justify-center border-b border-[#EEE] dark:border-zinc-800">
                   <Share2 className="w-12 h-12 text-[#DDD] dark:text-zinc-800 mb-3" />
                   <span className="text-[10px] uppercase font-bold text-[#AAA]">Kein OG-Bild gefunden</span>
                 </div>
               )}
               <div className="p-6">
                 <p className="text-[11px] text-[#888888] uppercase font-bold tracking-[1.5px] mb-2 truncate">
                   {socialData.ogType || 'WEBSITE'}
                 </p>
                 <h5 className="text-[18px] font-bold text-[#1A1A1A] dark:text-zinc-100 line-clamp-2 leading-[1.3] mb-3">
                   {socialData.ogTitle || 'Titellose Vorschau'}
                 </h5>
                 <p className="text-[14px] text-[#666] dark:text-zinc-400 line-clamp-3 leading-relaxed">
                   {socialData.ogDescription || 'Keine OpenGraph-Beschreibung für Social Media verfügbar. Dies kann sich negativ auf die Klickrate bei Klicks aus sozialen Netzwerken auswirken.'}
                 </p>
               </div>
             </div>

             {/* Data Table */}
             <div className="flex flex-col gap-6 justify-center">
               <div className="flex flex-col border-b border-[#EEE] dark:border-zinc-800 pb-3">
                 <span className="text-[10px] uppercase font-bold text-[#888888] dark:text-zinc-400 tracking-wider">OpenGraph Titel</span>
                 <span className="text-[13px] font-medium text-[#1A1A1A] dark:text-zinc-100 mt-2">{socialData.ogTitle || 'Nicht definiert'}</span>
               </div>
               <div className="flex flex-col border-b border-[#EEE] dark:border-zinc-800 pb-3">
                 <span className="text-[10px] uppercase font-bold text-[#888888] dark:text-zinc-400 tracking-wider">OpenGraph Beschreibung</span>
                 <span className="text-[13px] font-medium text-[#1A1A1A] dark:text-zinc-100 mt-2">{socialData.ogDescription || 'Nicht definiert'}</span>
               </div>
               <div className="flex flex-col">
                 <span className="text-[10px] uppercase font-bold text-[#888888] dark:text-zinc-400 tracking-wider">OG Bild-URL</span>
                 <p className="text-[11px] font-medium text-[#D4AF37] mt-2 break-all bg-[#D4AF37]/5 dark:bg-[#D4AF37]/10 p-3 italic font-mono">
                   {socialData.ogImage || 'Kein Bild-Tag gefunden'}
                 </p>
               </div>
             </div>
           </div>
        </div>
      )}

      <PrioritizedTasksSection 
        tasks={detailedSeo.prioritizedTasks} 
        title="Priorisierte SEO-Maßnahmen" 
        accentColor="#1A1A1A" 
      />
    </CollapsibleSection>
  );
}

function SearchConsoleModule({ data, isLoading, onConnect, error }: { data: any, isLoading: boolean, onConnect: () => void, error: string | null }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  if (!data && !isLoading && !error) {
    return (
      <CollapsibleSection id="gsc" title="Google Search Console Insight" icon={<Activity className="w-6 h-6" />} color="#4285F4" badge="PREMIUM DATA">
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-16 h-16 bg-[#F5F5F3] dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6">
            <Activity className="w-8 h-8 text-[#4285F4] opacity-40" />
          </div>
          <h4 className="text-[16px] font-bold text-[#1A1A1A] dark:text-zinc-100 mb-2 uppercase">Echtzeit-Daten verknüpfen</h4>
          <p className="text-[13px] text-[#888888] dark:text-zinc-400 max-w-[400px] mb-8 leading-relaxed">
            Verbinden Sie Ihr Google-Konto, um Performance-Daten (Klicks, Impressionen), Indexierungsstatus und Crawling-Fehler direkt in diesen Bericht zu integrieren.
          </p>
          <button 
            onClick={onConnect}
            className="bg-[#4285F4] hover:bg-[#357ae8] text-white px-8 py-3 text-[11px] font-bold uppercase tracking-[1px] transition-all flex items-center gap-3 active:scale-95"
          >
            <ExternalLink className="w-4 h-4" />
            Mit Search Console verbinden
          </button>
        </div>
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection id="gsc" title="Google Search Console Insight" icon={<Activity className="w-6 h-6" />} color="#4285F4" badge="REAL-TIME DATA">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-full py-20 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#4285F4]" />
          <p className="text-[11px] uppercase font-bold text-[#888888] tracking-widest">Rufe Google-Daten ab...</p>
        </div>
      ) : error ? (
        <div className="p-6 border border-[#EB5757]/30 bg-[#EB5757]/5 text-[#EB5757] flex flex-col items-center gap-3 text-center">
           <AlertCircle className="w-6 h-6" />
           <p className="text-[14px] font-bold">{error}</p>
           <button onClick={onConnect} className="text-[10px] uppercase font-bold border-b border-[#EB5757] mt-2">Erneut versuchen</button>
        </div>
      ) : (
        <div className="animate-in fade-in duration-500">
           {/* Summary Stats */}
           <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10 pb-10 border-b border-[#EEE] dark:border-zinc-800">
              <div className="flex flex-col">
                 <span className="text-[10px] uppercase font-bold text-[#888888] mb-1">Klicks (30 Tage)</span>
                 <span className="text-[32px] font-bold text-[#4285F4]">{data.performanceTotals.clicks.toLocaleString()}</span>
              </div>
              <div className="flex flex-col">
                 <span className="text-[10px] uppercase font-bold text-[#888888] mb-1">Impressionen</span>
                 <span className="text-[32px] font-bold text-[#1A1A1A] dark:text-zinc-100">{data.performanceTotals.impressions.toLocaleString()}</span>
              </div>
              <div className="flex flex-col">
                 <span className="text-[10px] uppercase font-bold text-[#888888] mb-1">Index-Status</span>
                 <div className="flex items-center gap-2 mt-2">
                    <span className={`w-3 h-3 rounded-full ${data.inspection?.indexStatusResult?.verdict === 'PASS' ? 'bg-[#27AE60]' : 'bg-[#EB5757]'}`}></span>
                    <span className="text-[13px] font-bold text-[#1A1A1A] dark:text-zinc-100 uppercase">
                       {data.inspection?.indexStatusResult?.verdict === 'PASS' ? 'Indiziert' : 'Probleme erkannt'}
                    </span>
                 </div>
              </div>
              <div className="flex flex-col">
                 <span className="text-[10px] uppercase font-bold text-[#888888] mb-1">Mobile Usability</span>
                 <div className="flex items-center gap-2 mt-2">
                    <span className={`w-3 h-3 rounded-full ${data.inspection?.mobileUsabilityResult?.verdict === 'PASS' ? 'bg-[#27AE60]' : 'bg-[#F2994A]'}`}></span>
                    <span className="text-[13px] font-bold text-[#1A1A1A] dark:text-zinc-100 uppercase">
                       {data.inspection?.mobileUsabilityResult?.verdict === 'PASS' ? 'Optimiert' : 'Warnung'}
                    </span>
                 </div>
              </div>
           </div>

           {/* Performance Graph */}
           <div className="mb-10">
              <h4 className="text-[11px] uppercase font-bold text-[#888888] mb-6 flex items-center gap-2">
                 <LineIcon className="w-4 h-4" />
                 Performance-Trend (Letzte 30 Tage)
              </h4>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={data.performance} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#3F3F46' : '#eee'} />
                      <XAxis 
                        dataKey="keys" 
                        tickFormatter={(keys) => {
                          if (!keys || !keys[0]) return '';
                          const d = new Date(keys[0]);
                          return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.`;
                        }}
                        fontSize={10}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: isDark ? '#A1A1AA' : '#888' }}
                        dy={10}
                      />
                      <YAxis 
                        fontSize={10} 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: isDark ? '#A1A1AA' : '#888' }} 
                        tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                        dx={-10}
                      />
                      <Tooltip 
                        content={<GscTooltip />} 
                        cursor={{ stroke: isDark ? '#3F3F46' : '#eee', strokeWidth: 1, strokeDasharray: '3 3' }} 
                      />
                      <Line 
                        name="clicks"
                        type="monotone" 
                        dataKey="clicks" 
                        stroke="#4285F4" 
                        strokeWidth={3} 
                        dot={false} 
                        activeDot={{ r: 6, strokeWidth: 0, fill: '#4285F4' }} 
                      />
                      <Line 
                        name="impressions"
                        type="monotone" 
                        dataKey="impressions" 
                        stroke="#D4AF37" 
                        strokeWidth={2} 
                        dot={false} 
                        activeDot={{ r: 6, strokeWidth: 0, fill: '#D4AF37' }} 
                        opacity={0.8}
                      />
                   </LineChart>
                </ResponsiveContainer>
              </div>
           </div>

           {/* Inspection Deep Dive */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-[#F5F5F3] dark:bg-zinc-950 p-6 border border-[#EEE] dark:border-zinc-800">
                 <h5 className="text-[12px] font-bold uppercase mb-4 flex items-center gap-2">
                    <Info className="w-4 h-4 text-[#4285F4]" />
                    URL-Inspektion Detail
                 </h5>
                 <div className="space-y-4">
                    <div className="flex flex-col">
                       <span className="text-[10px] uppercase font-bold text-[#888888]">Abdeckung (Coverage)</span>
                       <p className="text-[12px] font-medium mt-1">{data.inspection?.indexStatusResult?.coverageState || 'Unbekannt'}</p>
                    </div>
                    <div className="flex flex-col">
                       <span className="text-[10px] uppercase font-bold text-[#888888]">Crawl-Zeitpunkt (Letzter)</span>
                       <p className="text-[12px] font-medium mt-1">{data.inspection?.indexStatusResult?.lastCrawlTime ? new Date(data.inspection.indexStatusResult.lastCrawlTime).toLocaleString('de-DE') : '-'}</p>
                    </div>
                 </div>
              </div>
              <div className="bg-[#F5F5F3] dark:bg-zinc-950 p-6 border border-[#EEE] dark:border-zinc-800">
                 <h5 className="text-[12px] font-bold uppercase mb-4 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#4285F4]" />
                    Sitemaps Status
                 </h5>
                 <ul className="space-y-3">
                   {data.sitemaps && data.sitemaps.length > 0 ? (
                     data.sitemaps.map((s: any, idx: number) => (
                       <li key={idx} className="flex flex-col pb-2 border-b border-black/5 last:border-0 last:pb-0">
                          <span className="text-[11px] font-bold truncate max-w-[250px]">{s.path}</span>
                          <span className="text-[10px] text-[#888888] uppercase font-bold mt-1">Status: {s.errors === '0' ? 'OK' : 'Fehler'} ({s.type})</span>
                       </li>
                     ))
                   ) : (
                     <p className="text-[11px] text-[#888888] italic">Keine Sitemaps in Search Console hinterlegt.</p>
                   )}
                 </ul>
              </div>
           </div>
        </div>
      )}
    </CollapsibleSection>
  );
}

function SecurityDeepDiveModule({ detailedSecurity }: { detailedSecurity: DetailedSecurity }) {
  return (
    <CollapsibleSection id="security" title="Vulnerability & Security Audit" icon={<ShieldCheck className="w-6 h-6" />} color="#EB5757" badge="SEC DEEP DIVE">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-[30px] mb-[40px]">
         <div className="flex flex-col border-t border-white/20 pt-[15px]">
            <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] dark:text-zinc-400 tracking-wider">SQLi / XSS Attack Surface</span>
             <p className="text-[13px] leading-[1.6] text-white/90 font-medium">{detailedSecurity.sqlXssAssessment}</p>
         </div>
         <div className="flex flex-col border-t border-white/20 pt-[15px]">
            <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] dark:text-zinc-400 tracking-wider">Security Header (CSP, TLS)</span>
             <p className="text-[13px] leading-[1.6] text-white/90 font-medium">{detailedSecurity.headerAnalysis}</p>
         </div>
         <div className="flex flex-col border-t border-white/20 pt-[15px]">
            <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] dark:text-zinc-400 tracking-wider">Software Config & Versions</span>
             <p className="text-[13px] leading-[1.6] text-white/90 font-medium">{detailedSecurity.softwareConfig}</p>
         </div>
         <div className="flex flex-col border-t border-white/20 pt-[15px]">
            <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] dark:text-zinc-400 tracking-wider">Google Safe Browsing</span>
             <div className="flex items-center gap-2 mt-1">
                <span className={`w-2 h-2 rounded-full ${detailedSecurity.googleSafeBrowsingStatus?.toLowerCase().includes('sicher') ? 'bg-[#27AE60]' : 'bg-[#EB5757]'}`}></span>
                <p className="text-[13px] leading-[1.6] text-white/90 font-medium">{detailedSecurity.googleSafeBrowsingStatus || 'Nicht geprüft'}</p>
             </div>
         </div>
      </div>

      <PrioritizedTasksSection 
        tasks={detailedSecurity.prioritizedTasks} 
        title="Priorisierte Sicherheits-Patches & Remediation" 
        accentColor="#EB5757" 
      />
    </CollapsibleSection>
  );
}

function AccessibilityDeepDiveModule({ detailedAccessibility }: { detailedAccessibility: DetailedAccessibility }) {
  return (
    <CollapsibleSection id="accessibility" title="Accessibility & A11y Audit" icon={<UserCheck className="w-6 h-6" />} color="#27AE60" badge="A11Y DEEP DIVE">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[30px] mb-[40px]">
         <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
            <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] dark:text-zinc-400 tracking-wider">Visual & Contrast / Alt-Texte</span>
             <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-zinc-100 font-medium">{detailedAccessibility.visualAndContrast}</p>
         </div>
         <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
            <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] dark:text-zinc-400 tracking-wider">Navigation, Semantics & ARIA</span>
             <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-zinc-100 font-medium">{detailedAccessibility.navigationAndSemantics}</p>
         </div>
      </div>

      <PrioritizedTasksSection 
        tasks={detailedAccessibility.prioritizedTasks} 
        title="Priorisierte Accessibility Fixes" 
        accentColor="#27AE60" 
      />
    </CollapsibleSection>
  );
}

function PerformanceDeepDiveModule({ detailedPerformance }: { detailedPerformance: DetailedPerformance }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <CollapsibleSection id="performance" title="Performance & Speed Audit" icon={<Zap className="w-6 h-6" />} color="#D4AF37" badge="PERF DEEP DIVE">
      <div className="flex flex-col gap-8 mb-10">
         {/* Lighthouse Dashboard */}
         {detailedPerformance.lighthouseMetrics && (
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Performance', value: detailedPerformance.lighthouseMetrics.performance, color: '#D4AF37' },
                { label: 'Accessibility', value: detailedPerformance.lighthouseMetrics.accessibility, color: '#27AE60' },
                { label: 'Best Practices', value: detailedPerformance.lighthouseMetrics.bestPractices, color: '#4285F4' },
                { label: 'SEO', value: detailedPerformance.lighthouseMetrics.seo, color: '#1A1A1A' }
              ].map((score, idx) => (
                <div key={idx} className="bg-[#F5F5F3] dark:bg-zinc-950 p-4 border border-[#EEE] dark:border-zinc-800 flex flex-col items-center justify-center text-center">
                   <div className="relative w-16 h-16 flex items-center justify-center mb-2">
                     <svg className="w-full h-full transform -rotate-90">
                       <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-[#EEE] dark:text-zinc-800" />
                       <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={175.9} strokeDashoffset={175.9 - (175.9 * (score.value || 0) / 100)} className="transition-all duration-1000 ease-out" style={{ color: score.color }} />
                     </svg>
                     <span className="absolute text-[14px] font-bold text-[#1A1A1A] dark:text-zinc-100">{score.value}</span>
                   </div>
                   <span className="text-[10px] uppercase font-bold text-[#888888]">{score.label}</span>
                </div>
              ))}
           </div>
         )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[30px] mb-[40px]">
         {/* Left Column: Text Analysis */}
         <div className="flex flex-col gap-[20px]">
           <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
              <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] dark:text-zinc-400 tracking-wider">Core Web Vitals Check</span>
               <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-zinc-100 font-medium">{detailedPerformance.coreVitalsAssessment}</p>
           </div>
           <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
              <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] dark:text-zinc-400 tracking-wider">Resource Optimization</span>
               <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-zinc-100 font-medium">{detailedPerformance.resourceOptimization}</p>
           </div>
           <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
              <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] dark:text-zinc-400 tracking-wider">Server Response & Cache</span>
               <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-zinc-100 font-medium">{detailedPerformance.serverAndCache}</p>
           </div>

           {detailedPerformance.cachingAnalysis && (
             <div className="mt-4 pt-4 border-t-2 border-dashed border-[#EEE] dark:border-zinc-800 flex flex-col gap-4">
                <div className="flex flex-col">
                   <span className="text-[10px] uppercase font-bold text-[#D4AF37] mb-1">Browser Caching</span>
                   <p className="text-[12px] text-[#1A1A1A] dark:text-zinc-100 italic leading-relaxed">{detailedPerformance.cachingAnalysis.browserCaching}</p>
                </div>
                <div className="flex flex-col">
                   <span className="text-[10px] uppercase font-bold text-[#D4AF37] mb-1">Server-Side Caching</span>
                   <p className="text-[12px] text-[#1A1A1A] dark:text-zinc-100 italic leading-relaxed">{detailedPerformance.cachingAnalysis.serverCaching}</p>
                </div>
                <div className="flex flex-col">
                   <span className="text-[10px] uppercase font-bold text-[#D4AF37] mb-1">CDN & Edge Detection</span>
                   <p className="text-[12px] text-[#1A1A1A] dark:text-zinc-100 italic leading-relaxed">{detailedPerformance.cachingAnalysis.cdnStatus}</p>
                </div>
             </div>
           )}
         </div>

         {/* Right Column: Data Visualization using Recharts */}
         <div className="bg-[#F5F5F3] dark:bg-zinc-800 p-[20px] pb-2 flex flex-col gap-[30px] shadow-sm border border-[#EEE] dark:border-zinc-700">
            {detailedPerformance.chartData?.vitals && detailedPerformance.chartData.vitals.length > 0 && (
              <div className="h-[180px] w-full">
                <span className="text-[10px] uppercase font-bold text-[#1A1A1A] dark:text-[#FFFFFF] mb-[10px] block tracking-wider">Estimated Vitals (ms)</span>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={detailedPerformance.chartData.vitals} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                    <XAxis type="number" fontSize={10} tick={{ fill: isDark ? '#A1A1AA' : '#888' }} stroke={isDark ? '#3F3F46' : '#E5E7EB'} />
                    <YAxis dataKey="metric" type="category" width={50} fontSize={10} tick={{ fill: isDark ? '#F4F4F5' : '#1A1A1A' }} stroke={isDark ? '#3F3F46' : '#E5E7EB'} />
                    <Tooltip content={<PerformanceTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} />
                    <Bar dataKey="value" fill="#D4AF37" radius={[0, 4, 4, 0]}>
                       {(detailedPerformance.chartData.vitals || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.value > 2500 ? '#EB5757' : entry.value > 1500 ? '#F2994A' : '#27AE60'} />
                       ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {detailedPerformance.chartData?.resources && detailedPerformance.chartData.resources.length > 0 && (
              <div className="h-[180px] w-full mt-4 border-t border-[#DDD] dark:border-white/10 pt-4">
                <span className="text-[10px] uppercase font-bold text-[#1A1A1A] dark:text-[#FFFFFF] mb-[10px] block tracking-wider">Resource Request Count</span>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={detailedPerformance.chartData.resources} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" fontSize={10} tick={{ fill: isDark ? '#A1A1AA' : '#1A1A1A' }} stroke={isDark ? '#3F3F46' : '#E5E7EB'} />
                    <YAxis fontSize={10} tick={{ fill: isDark ? '#A1A1AA' : '#888' }} stroke={isDark ? '#3F3F46' : '#E5E7EB'} />
                    <Tooltip content={<ResourceTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} />
                    <Bar dataKey="count" fill="#D4AF37" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
         </div>
      </div>

      <PrioritizedTasksSection 
        tasks={detailedPerformance.prioritizedTasks} 
        title="Priorisierte Speed-Optimierungen" 
        accentColor="#D4AF37" 
      />
    </CollapsibleSection>
  );
}

function ComplianceDeepDiveModule({ detailedCompliance, legalData }: { detailedCompliance: DetailedCompliance, legalData?: any }) {
  return (
    <CollapsibleSection id="compliance" title="Legal & Compliance Audit" icon={<Scale className="w-6 h-6" />} color="#888888" badge="LEGAL DEEP DIVE">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[30px] mb-[40px]">
         <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
            <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] dark:text-zinc-400 tracking-wider">Cookie-Banner Status</span>
             <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-zinc-100 font-medium">{detailedCompliance.cookieBannerStatus}</p>
         </div>
         <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
            <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] dark:text-zinc-400 tracking-wider">Rechtliche Links (Impressum/Privacy)</span>
             <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-zinc-100 font-medium">{detailedCompliance.policyLinksStatus}</p>
         </div>
         <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
            <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] dark:text-zinc-400 tracking-wider">DSGVO-Gesamtbewertung</span>
             <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-zinc-100 font-medium">{detailedCompliance.gdprAssessment}</p>
         </div>
      </div>

      {legalData && (
        <div className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-[#F5F5F3] dark:bg-zinc-950 p-6 border border-[#EEE] dark:border-zinc-800">
            <h4 className="text-[12px] font-bold uppercase text-[#1A1A1A] dark:text-zinc-100 mb-4 tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#27AE60]" />
              Tracking & Consent Management
            </h4>
            <div className="space-y-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#888888] block mb-2">Gefundene CMPs (Consent Manager)</span>
                <div className="flex flex-wrap gap-2">
                  {legalData.cmpDetected && Object.entries(legalData.cmpDetected).some(([_, v]) => v) ? (
                    Object.entries(legalData.cmpDetected).filter(([_, v]) => v).map(([k]) => (
                      <span key={k} className="text-[10px] px-2 py-1 bg-[#27AE60] text-white uppercase font-bold">
                        {k.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] px-2 py-1 bg-[#888888] text-white uppercase font-bold">Kein CMP-Skript gefunden</span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#888888] block mb-2">Erkannte Tracking-Skripte</span>
                <div className="flex flex-wrap gap-2">
                  {legalData.trackingScripts && Object.entries(legalData.trackingScripts).some(([_, v]) => v) ? (
                    Object.entries(legalData.trackingScripts).filter(([_, v]) => v).map(([k]) => (
                      <span key={k} className="text-[10px] px-2 py-1 bg-[#D4AF37] text-white uppercase font-bold">
                        {k.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] p-2 bg-[#EEE] dark:bg-zinc-800 text-[#888] uppercase font-bold line-through">Kein aktives Tracking erkannt</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#F5F5F3] dark:bg-zinc-950 p-6 border border-[#EEE] dark:border-zinc-800">
            <h4 className="text-[12px] font-bold uppercase text-[#1A1A1A] dark:text-zinc-100 mb-4 tracking-wider flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#1A1A1A] dark:text-zinc-100" />
              Sichtbarkeit & Links
            </h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-[#EEE] dark:border-zinc-800">
                <span className="text-[11px] font-medium">Link in Footer vorhanden?</span>
                <span className={`text-[10px] font-bold uppercase ${legalData.linksInFooter ? 'text-[#27AE60]' : 'text-[#EB5757]'}`}>
                  {legalData.linksInFooter ? 'JA' : 'NEIN'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#EEE] dark:border-zinc-800">
                <span className="text-[11px] font-medium">Privacy Link prominent (Footer)?</span>
                <span className={`text-[10px] font-bold uppercase ${legalData.privacyInFooter ? 'text-[#27AE60]' : 'text-[#EB5757]'}`}>
                  {legalData.privacyInFooter ? 'JA' : 'NEIN'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-[11px] font-medium">Cookie Banner aktiv?</span>
                <span className={`text-[10px] font-bold uppercase ${legalData.cookieBannerFound ? 'text-[#27AE60]' : 'text-[#EB5757]'}`}>
                  {legalData.cookieBannerFound ? 'JA' : 'NEIN'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <PrioritizedTasksSection 
        tasks={detailedCompliance.prioritizedTasks} 
        title="Priorisierte Compliance-Aufgaben" 
        accentColor="#1A1A1A" 
      />
    </CollapsibleSection>
  );
}

function DetailSection({ title, data, badge }: { title: string, data: ReportSection, badge: string }) {
  if (!data) return null;

  const getStatusIconColor = (score: number) => {
    if (score >= 70) return 'bg-[#27AE60]';
    if (score >= 40) return 'bg-[#F2994A]';
    return 'bg-[#EB5757]';
  };

  return (
    <section className="bg-[#FFFFFF] dark:bg-zinc-900 p-[40px] border-l border-black/5 flex flex-col">
      <div className="flex items-center justify-between mb-[30px]">
        <h3 className="text-[18px] font-bold uppercase text-[#1A1A1A] dark:text-zinc-100">{title}</h3>
        <span className="text-[9px] px-2 py-1 bg-[#F5F5F3] dark:bg-zinc-950 uppercase font-bold text-[#1A1A1A] dark:text-zinc-100 tracking-wider">{badge}</span>
      </div>

      <div className="space-y-8">
        <div>
          <h4 className="text-[11px] uppercase tracking-wider font-bold text-[#888888] dark:text-zinc-400 mb-4 pb-2 border-b border-[#EEE] dark:border-zinc-800">Erkenntnisse</h4>
          <ul className="list-none flex flex-col">
            {(data.insights || []).map((insight, idx) => (
              <li key={idx} className="py-[15px] border-b border-[#EEE] dark:border-zinc-800 flex items-start justify-between gap-3 last:border-b-0">
                <div className="flex items-start gap-3">
                  <span className={`w-2 h-2 rounded-full mt-2 shrink-0 ${getStatusIconColor(data.score)}`}></span>
                  <span className="text-[13px] font-medium text-[#1A1A1A] dark:text-zinc-100 leading-[1.6]">{insight}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
        
        <div>
          <h4 className="text-[11px] uppercase tracking-wider font-bold text-[#888888] dark:text-zinc-400 mb-4 pb-2 border-b border-[#EEE] dark:border-zinc-800">Maßnahmen</h4>
          <ul className="list-none flex flex-col">
            {(data.recommendations || []).map((rec, idx) => (
              <li key={idx} className="py-[15px] border-b border-[#EEE] dark:border-zinc-800 flex items-start justify-between gap-4 last:border-b-0">
                 <div className="flex items-start gap-3">
                   <span className="text-[9px] px-[6px] py-[3px] bg-[#1A1A1A] dark:bg-zinc-800 text-[#FFFFFF] font-bold shrink-0 mt-[2px] uppercase">
                     #{idx + 1}
                   </span>
                  <span className="text-[13px] font-medium text-[#1A1A1A] dark:text-zinc-100 leading-[1.6]">{rec}</span>
                 </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
