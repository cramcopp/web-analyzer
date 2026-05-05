'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Globe2,
  Loader2,
  LockKeyhole,
  Search,
} from 'lucide-react';
import { useAuth } from './auth-provider';
import LoadingDisplay from './loading-display';
import ReportResultsView from './report-results-view';
import { generateReportClientSide } from '@/app/lib/generate-report';
import { getMonthlyCrawlPageLimit, getMonthlyScanLimit, normalizePlan } from '@/lib/plans';
import type { AnalysisResult } from '@/lib/scanner';
import type { GscData, PrioritizedTask, ReportData } from '@/types/report';

function initialSearchParam(name: string) {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get(name) || '';
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function averageReportScore(report: ReportData) {
  return Math.round((
    (report.seo?.score || 0) +
    (report.security?.score || 0) +
    (report.performance?.score || 0) +
    (report.accessibility?.score || 0) +
    (report.compliance?.score || 0) +
    (report.contentStrategy?.score || 0)
  ) / 6);
}

export default function ScannerSubpageClient() {
  const { user, userData, signIn } = useAuth();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [rawScrapeData, setRawScrapeData] = useState<AnalysisResult | null>(null);
  const [gscData, setGscData] = useState<GscData | null>(null);
  const [isGscLoading, setIsGscLoading] = useState(false);
  const [gscError, setGscError] = useState<string | null>(null);
  const autoStartPending = useRef(false);

  const accountPlan = normalizePlan(userData?.plan || 'free');
  const scanLimitMonthly = getMonthlyScanLimit(accountPlan);
  const scanCount = userData?.scanCount || 0;
  const crawlPagesLimitMonthly = getMonthlyCrawlPageLimit(accountPlan);
  const crawlPagesCount = userData?.crawlPagesCount || 0;

  useEffect(() => {
    queueMicrotask(() => {
      const initialUrl = initialSearchParam('url');
      autoStartPending.current = initialSearchParam('start') === '1';
      if (initialUrl) setUrl(initialUrl);
    });
  }, []);

  const fetchGSCData = useCallback(async (targetUrl: string) => {
    setIsGscLoading(true);
    setGscError(null);
    try {
      const resp = await fetch(`/api/search-console/stats?url=${encodeURIComponent(targetUrl)}`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Fehler beim Laden von GSC Daten');
      setGscData(data);
    } catch (err: unknown) {
      setGscError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setIsGscLoading(false);
    }
  }, []);

  const startFullAudit = useCallback(async (overrideUrl?: string) => {
    const targetUrl = normalizeUrl(overrideUrl || url);
    if (!targetUrl) return;

    try {
      new URL(targetUrl);
    } catch {
      setError('Bitte gib eine gueltige URL ein.');
      return;
    }

    if (!user) {
      setError('Bitte logge dich ein, damit der Full Audit deinem Account und deinen Planlimits zugeordnet werden kann.');
      await signIn();
      return;
    }

    if (userData && scanCount >= scanLimitMonthly) {
      if (accountPlan === 'free') {
        window.location.assign('/preise');
        return;
      }
      setError(`Limit von ${scanLimitMonthly} Scans erreicht.`);
      return;
    }

    if (userData && crawlPagesCount >= crawlPagesLimitMonthly) {
      if (accountPlan === 'free') {
        window.location.assign('/preise');
        return;
      }
      setError(`Limit von ${crawlPagesLimitMonthly} Crawl-Seiten erreicht.`);
      return;
    }

    setUrl(targetUrl);
    setLoading(true);
    setError(null);
    setReport(null);
    setRawScrapeData(null);
    setGscData(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });

      let scrapeData = await response.json();
      if (!response.ok) throw new Error(scrapeData.details || scrapeData.error || 'Website konnte nicht geladen werden.');

      if (scrapeData.status === 'processing' && scrapeData.audit_id) {
        const auditId = scrapeData.audit_id;
        let completed = false;

        for (let attempt = 0; attempt < 60 && !completed; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
          const pollResp = await fetch(`/api/reports/${auditId}`);
          if (pollResp.ok) {
            const pollData = await pollResp.json();
            if (pollData.crawlSummary || pollData.rawScrapeData || pollData.results) {
              scrapeData = typeof pollData.rawScrapeData === 'string'
                ? JSON.parse(pollData.rawScrapeData)
                : pollData.rawScrapeData || pollData;
              completed = true;
            }
          }
        }

        if (!completed) {
          throw new Error('Analyse dauert zu lange. Bitte oeffne spaeter dein Dashboard.');
        }
      }

      if (scrapeData._cached && scrapeData._cachedReport) {
        setRawScrapeData(scrapeData);
        setReport(scrapeData._cachedReport);
        await fetchGSCData(targetUrl);
        return;
      }

      const scanPlanData = scrapeData as AnalysisResult & {
        scanPlan?: string;
        plan?: string;
        accountPlan?: string;
        crawlLimitUsed?: number;
        visibilityLimits?: AnalysisResult['visibilityLimits'];
        scannerVersion?: string;
      };
      const reportScanPlan = normalizePlan(scanPlanData.scanPlan || scanPlanData.plan || accountPlan);
      const finalReport = await generateReportClientSide(scrapeData, reportScanPlan);
      const reportWithAuditId = {
        ...finalReport,
        plan: reportScanPlan,
        accountPlan: scanPlanData.accountPlan || reportScanPlan,
        scanPlan: reportScanPlan,
        crawlLimitUsed: scanPlanData.crawlLimitUsed || scrapeData.crawlSummary?.crawlLimitUsed,
        visibilityLimits: scanPlanData.visibilityLimits || scrapeData.crawlSummary?.visibilityLimits,
        scannerVersion: scanPlanData.scannerVersion,
        audit_id: finalReport.audit_id || scrapeData.audit_id,
        url: scrapeData.url || targetUrl,
      } as ReportData & { audit_id?: string };

      setRawScrapeData(scrapeData);
      setReport(reportWithAuditId);

      const avgScore = averageReportScore(reportWithAuditId);
      const storageData = { ...scrapeData };
      delete storageData.bodyText;

      const savePayload = {
        audit_id: scrapeData.audit_id || reportWithAuditId.audit_id,
        url: targetUrl,
        score: avgScore,
        results: JSON.stringify(reportWithAuditId),
        rawScrapeData: JSON.stringify(storageData),
        seoScore: reportWithAuditId.seo?.score || 0,
        performanceScore: reportWithAuditId.performance?.score || 0,
        securityScore: reportWithAuditId.security?.score || 0,
        accessibilityScore: reportWithAuditId.accessibility?.score || 0,
        complianceScore: reportWithAuditId.compliance?.score || 0,
      };

      const existingReportId = scrapeData.audit_id || reportWithAuditId.audit_id;
      const saveResponse = existingReportId
        ? await fetch(`/api/reports/${existingReportId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(savePayload),
          })
        : null;

      if (!saveResponse?.ok) {
        await fetch('/api/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(savePayload),
        });
      }

      await fetchGSCData(targetUrl);
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : 'Unbekannter Fehler beim Full Audit.');
    } finally {
      setLoading(false);
    }
  }, [
    accountPlan,
    crawlPagesCount,
    crawlPagesLimitMonthly,
    fetchGSCData,
    scanCount,
    scanLimitMonthly,
    signIn,
    url,
    user,
    userData,
  ]);

  useEffect(() => {
    if (!autoStartPending.current || !url) return;
    autoStartPending.current = false;
    queueMicrotask(() => {
      void startFullAudit(url);
    });
  }, [startFullAudit, url]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'GSC_AUTH_SUCCESS' && url) {
        void fetchGSCData(url);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [fetchGSCData, url]);

  const connectGSC = async () => {
    try {
      const resp = await fetch('/api/auth/google/url');
      const { url: authUrl } = await resp.json();
      window.open(authUrl, 'GSC Auth', 'width=600,height=700');
    } catch {
      setGscError('Fehler beim Starten der Google-Verbindung.');
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void startFullAudit();
  };

  const exportActionPlanToCSV = () => {
    if (!report) return;
    const rows = [['Category', 'Priority', 'Task', 'Remediation']];
    const addTasks = (cat: string, tasks?: PrioritizedTask[]) => {
      tasks?.forEach((task) => rows.push([cat, `"${task.priority}"`, `"${task.task}"`, `"${task.remediation || ''}"`]));
    };
    addTasks('SEO', report.seo?.detailedSeo?.prioritizedTasks);
    addTasks('Security', report.security?.detailedSecurity?.prioritizedTasks);
    addTasks('Performance', report.performance?.detailedPerformance?.prioritizedTasks);
    addTasks('Accessibility', report.accessibility?.detailedAccessibility?.prioritizedTasks);
    addTasks('Legal', report.compliance?.detailedCompliance?.prioritizedTasks);
    addTasks('Content Strategy', report.contentStrategy?.detailedContent?.prioritizedTasks);

    const csvContent = `\ufeff${rows.map((row) => row.join(',')).join('\n')}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `WAP_ActionPlan_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const openAppView = (view: string) => {
    if (view === 'pricing') {
      window.location.assign('/preise');
      return;
    }
    if (view === 'projects') {
      window.location.assign('/?view=projects');
      return;
    }
    window.location.assign('/?view=dashboard');
  };

  return (
    <div className="space-y-6">
      <div className="border-l-4 border-[#0b7de3] bg-white shadow-sm dark:bg-zinc-950">
        <form onSubmit={submit} className="border-b border-[#e3e8f0] p-5 dark:border-zinc-800 sm:p-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-[0.16em] text-[#6f7b8d]">
                Website Full Audit
              </label>
              <p className="mt-2 text-[13px] font-semibold text-[#64748b] dark:text-zinc-400">
                Voller Crawl, KI-Bericht, Evidence und Aktionsplan in einem Ablauf.
              </p>
            </div>
            <Link href="/?view=dashboard" className="text-[11px] font-black uppercase tracking-[0.14em] text-[#0b7de3] hover:underline">
              Dashboard oeffnen
            </Link>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-md border border-[#cfd7e5] bg-[#f8fafc] px-4 dark:border-zinc-700 dark:bg-zinc-950">
              <Globe2 className="h-4 w-4 shrink-0 text-[#0b7de3]" />
              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://deine-domain.de"
                disabled={loading}
                className="min-w-0 flex-1 bg-transparent text-[15px] font-bold text-[#172033] outline-none placeholder:text-[#8a94a6] dark:text-zinc-100 dark:placeholder:text-zinc-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#009b72] px-6 text-[13px] font-black text-white transition-colors hover:bg-[#087f61] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : user ? <Search className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}
              {user ? 'Full Audit starten' : 'Einloggen und scannen'}
            </button>
          </div>
        </form>

        {!loading && !report && (
          <div className="p-5 sm:p-6">
            {error ? (
              <div className="rounded-md border border-[#f0b9b7] bg-[#fff1f0] p-5 text-[#a42520] dark:border-red-900/70 dark:bg-red-950/25 dark:text-red-300">
                <div className="flex gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <p className="text-[13px] font-bold leading-relaxed">{error}</p>
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-[#d5deea] bg-[#f8fafc] p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
                <p className="text-[16px] font-black text-[#172033] dark:text-zinc-100">Full Audit bereit</p>
                <p className="mt-2 max-w-[620px] text-[13px] font-semibold leading-relaxed text-[#64748b] dark:text-zinc-400">
                  Einzelne Tool-Seiten bleiben Schnellchecks. Diese Seite startet den kompletten Crawl und erstellt danach den KI-Bericht.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {loading && <LoadingDisplay plan={accountPlan} />}

      {report && !loading && (
        <ReportResultsView
          report={report}
          rawScrapeData={rawScrapeData}
          gscData={gscData}
          isGscLoading={isGscLoading}
          onConnectGSC={connectGSC}
          gscError={gscError}
          onExportActionPlan={exportActionPlanToCSV}
          plan={normalizePlan((report as any).scanPlan || (report as any).plan || accountPlan)}
          setActiveView={openAppView}
        />
      )}
    </div>
  );
}
