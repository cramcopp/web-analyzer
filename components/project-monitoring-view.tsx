'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  Clock3,
  History,
  ListChecks,
  Power,
  ServerCrash,
} from 'lucide-react';
import DataSourceBadge from './data-source-badge';
import { IssueList, ScoreDeltaList } from './monitoring/monitoring-ui';
import { DEFAULT_ALERT_TYPES, alertLabel, isProviderBackedAlert, providerAvailable, ruleThreshold } from '@/lib/monitoring/config';
import { compareScans } from '@/lib/monitoring/diff';
import type { AuditIssue } from '@/types/audit';
import type { AlertEvent, AlertRule, ScanDiff, ScheduledScan, UptimeCheck } from '@/types/monitoring';

const MONITORING_TABS = [
  { id: 'monitoring', label: 'Monitoring', icon: Activity },
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'uptime', label: 'Uptime', icon: ServerCrash },
  { id: 'scan_history', label: 'Scan History', icon: History },
  { id: 'issue_history', label: 'Issue History', icon: ListChecks },
] as const;

type MonitoringTabId = typeof MONITORING_TABS[number]['id'];

type ScoreCarrier = {
  audit_id?: string;
  seo?: { score?: number };
  performance?: { score?: number };
  security?: { score?: number };
  accessibility?: { score?: number };
  compliance?: { score?: number };
  contentStrategy?: { score?: number };
  issues?: AuditIssue[];
};

function parseJson(value: unknown) {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseReportPayload(report: any): ScoreCarrier {
  const results = parseJson(report?.results) as any;
  const raw = parseJson(report?.rawScrapeData) as any;
  return {
    ...results,
    ...raw,
    audit_id: raw?.audit_id || results?.audit_id || report?.audit_id || report?.id,
    issues: raw?.issues || results?.issues || report?.issues || [],
    seo: raw?.seo || results?.seo || report?.seo,
    performance: raw?.performance || results?.performance || report?.performance,
    security: raw?.security || results?.security || report?.security,
    accessibility: raw?.accessibility || results?.accessibility || report?.accessibility,
    compliance: raw?.compliance || results?.compliance || report?.compliance,
    contentStrategy: raw?.contentStrategy || results?.contentStrategy || report?.contentStrategy,
  };
}

function formatDate(value?: string) {
  if (!value) return 'Nicht verfuegbar';
  return new Date(value).toLocaleString('de-DE');
}

function scoreValue(scan: ScoreCarrier, key: keyof Pick<ScoreCarrier, 'seo' | 'performance' | 'security' | 'accessibility' | 'compliance' | 'contentStrategy'>) {
  switch (key) {
    case 'seo':
      return typeof scan.seo?.score === 'number' ? scan.seo.score : null;
    case 'performance':
      return typeof scan.performance?.score === 'number' ? scan.performance.score : null;
    case 'security':
      return typeof scan.security?.score === 'number' ? scan.security.score : null;
    case 'accessibility':
      return typeof scan.accessibility?.score === 'number' ? scan.accessibility.score : null;
    case 'compliance':
      return typeof scan.compliance?.score === 'number' ? scan.compliance.score : null;
    case 'contentStrategy':
      return typeof scan.contentStrategy?.score === 'number' ? scan.contentStrategy.score : null;
    default:
      return null;
  }
}

export default function ProjectMonitoringView({ project, report }: { project: { id: string; url: string }; report: any }) {
  const [scheduledScans, setScheduledScans] = useState<ScheduledScan[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [alertEvents, setAlertEvents] = useState<AlertEvent[]>([]);
  const [uptimeChecks, setUptimeChecks] = useState<UptimeCheck[]>([]);
  const [scanDiffs, setScanDiffs] = useState<ScanDiff[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<MonitoringTabId>('monitoring');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadMonitoring() {
      setLoading(true);
      try {
        const [monitoringRes, reportsRes] = await Promise.all([
          fetch(`/api/monitoring?projectId=${encodeURIComponent(project.id)}`),
          fetch(`/api/reports?url=${encodeURIComponent(project.url)}`),
        ]);

        if (monitoringRes.ok) {
          const monitoring = await monitoringRes.json();
          setScheduledScans(monitoring.scheduledScans || []);
          setAlertRules(monitoring.alertRules || []);
          setAlertEvents(monitoring.alertEvents || []);
          setUptimeChecks(monitoring.uptimeChecks || []);
          setScanDiffs((monitoring.scanDiffs || []).sort((a: ScanDiff, b: ScanDiff) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        }

        if (reportsRes.ok) {
          const data = await reportsRes.json();
          setReports(data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        }
      } finally {
        setLoading(false);
      }
    }

    loadMonitoring();
  }, [project.id, project.url]);

  const computedScanDiff = useMemo(() => {
    if (reports.length >= 2) {
      return compareScans(project.id, parseReportPayload(reports[1]), parseReportPayload(reports[0]));
    }
    if (report?.issues?.length) {
      return compareScans(project.id, null, report);
    }
    return null;
  }, [project.id, report, reports]);

  const latestDiff = scanDiffs[0] || computedScanDiff;
  const activeSchedule = scheduledScans.find((scan) => scan.enabled);
  const latestUptime = uptimeChecks[0];
  const currentIssues = (report?.issues || []) as AuditIssue[];
  const openCurrentIssues = currentIssues.filter((issue) => issue.status !== 'ignored' && issue.status !== 'fixed');
  const ignoredCurrentIssues = currentIssues.filter((issue) => issue.status === 'ignored');

  const enableMonitoring = async () => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const nextRunAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const schedule: ScheduledScan = {
        id: 'pending_schedule',
        projectId: project.id,
        url: project.url,
        frequency: 'weekly',
        enabled: true,
        nextRunAt,
        createdAt: now,
        updatedAt: now,
      };

      await fetch('/api/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collection: 'scheduledScans',
          projectId: project.id,
          data: schedule,
        }),
      });

      const existingTypes = new Set(alertRules.map((rule) => rule.type));
      const newRules: AlertRule[] = DEFAULT_ALERT_TYPES
        .filter((type) => !existingTypes.has(type))
        .map((type) => ({
          id: `pending_${type}`,
          projectId: project.id,
          type,
          enabled: providerAvailable(type, report),
          threshold: ruleThreshold(type),
          createdAt: now,
          updatedAt: now,
        }));

      await Promise.all(newRules.map((rule) => fetch('/api/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collection: 'alertRules',
          projectId: project.id,
          data: rule,
        }),
      })));

      if (computedScanDiff) {
        await fetch('/api/monitoring', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            collection: 'scanDiffs',
            projectId: project.id,
            data: computedScanDiff,
          }),
        });
        setScanDiffs((previous) => [computedScanDiff, ...previous.filter((diff) => diff.currentScanId !== computedScanDiff.currentScanId)]);
      }

      setScheduledScans((previous) => [schedule, ...previous]);
      setAlertRules((previous) => [...previous, ...newRules]);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-[300px] animate-pulse bg-zinc-100 dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800" />;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#EEE] dark:border-zinc-800 pb-8">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-[10px] font-black uppercase tracking-[3px] text-[#D4AF37]">Ongoing SEO Operations</span>
            <DataSourceBadge type="real" label="scheduledScans" />
            <DataSourceBadge type="real" label="scanDiffs" />
          </div>
          <h2 className="text-[32px] md:text-[42px] font-black uppercase tracking-tighter leading-none text-[#1A1A1A] dark:text-zinc-100">Monitoring</h2>
          <p className="text-[12px] text-[#888] font-bold mt-2 uppercase tracking-widest max-w-xl">
            Geplante Scans, Alerts, Uptime, Scan-Historie und Issue-Historie ohne simulierte Ereignisse.
          </p>
        </div>
        <button
          onClick={enableMonitoring}
          disabled={saving || Boolean(activeSchedule)}
          className="px-6 py-4 bg-[#1A1A1A] dark:bg-white text-white dark:text-zinc-900 text-[10px] font-black uppercase tracking-widest hover:bg-[#D4AF37] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-3"
        >
          <Power className="w-4 h-4" />
          {activeSchedule ? 'Monitoring aktiv' : saving ? 'Speichert...' : 'Monitoring aktivieren'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="p-6 bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800">
          <CalendarClock className="w-5 h-5 text-[#D4AF37] mb-4" />
          <span className="text-[9px] font-black uppercase tracking-widest text-[#888] block mb-2">Scheduled Scans</span>
          <span className="text-[24px] font-black text-[#1A1A1A] dark:text-zinc-100">{scheduledScans.length}</span>
        </div>
        <div className="p-6 bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800">
          <Bell className="w-5 h-5 text-[#D4AF37] mb-4" />
          <span className="text-[9px] font-black uppercase tracking-widest text-[#888] block mb-2">Alert Rules</span>
          <span className="text-[24px] font-black text-[#1A1A1A] dark:text-zinc-100">{alertRules.length}</span>
        </div>
        <div className="p-6 bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800">
          <ServerCrash className="w-5 h-5 text-[#D4AF37] mb-4" />
          <span className="text-[9px] font-black uppercase tracking-widest text-[#888] block mb-2">Uptime</span>
          <span className="text-[24px] font-black text-[#1A1A1A] dark:text-zinc-100">{latestUptime?.status || 'unknown'}</span>
        </div>
        <div className="p-6 bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800">
          <History className="w-5 h-5 text-[#D4AF37] mb-4" />
          <span className="text-[9px] font-black uppercase tracking-widest text-[#888] block mb-2">Scan History</span>
          <span className="text-[24px] font-black text-[#1A1A1A] dark:text-zinc-100">{reports.length}</span>
        </div>
        <div className="p-6 bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800">
          <ListChecks className="w-5 h-5 text-[#D4AF37] mb-4" />
          <span className="text-[9px] font-black uppercase tracking-widest text-[#888] block mb-2">Issue Status</span>
          <span className="text-[24px] font-black text-[#1A1A1A] dark:text-zinc-100">{openCurrentIssues.length}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[#EEE] dark:border-zinc-800 pb-4">
        {MONITORING_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${
                active
                  ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] dark:bg-white dark:text-zinc-900 dark:border-white'
                  : 'bg-white dark:bg-zinc-900 text-[#888] border-[#EEE] dark:border-zinc-800 hover:text-[#D4AF37]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'monitoring' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 p-6">
            <h3 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100 mb-5 flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-[#D4AF37]" /> Geplante Scans
            </h3>
            {activeSchedule ? (
              <div className="space-y-4">
                <div className="p-5 bg-[#1A1A1A] dark:bg-zinc-950 border border-white/5">
                  <h4 className="text-[13px] font-black uppercase tracking-widest text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#27AE60]" /> Aktiv
                  </h4>
                  <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest mt-2">
                    Frequenz: {activeSchedule.frequency} {activeSchedule.nextRunAt ? `| Naechster Lauf: ${formatDate(activeSchedule.nextRunAt)}` : ''}
                  </p>
                </div>
                <DataSourceBadge type="real" label="scheduledScans" />
              </div>
            ) : (
              <p className="text-[11px] text-[#888] font-bold uppercase tracking-widest">Noch kein geplanter Scan fuer dieses Projekt.</p>
            )}
          </section>

          <section className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 p-6">
            <h3 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100 mb-5 flex items-center gap-2">
              <Clock3 className="w-4 h-4 text-[#D4AF37]" /> Collections
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {['scheduledScans', 'alertRules', 'alertEvents', 'uptimeChecks', 'scanDiffs'].map((collection) => (
                <div key={collection} className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-[#EEE] dark:border-zinc-800">
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#888]">{collection}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 p-6">
            <h3 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100 mb-5 flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#D4AF37]" /> Alert-Regeln
            </h3>
            <div className="space-y-3">
              {DEFAULT_ALERT_TYPES.map((type) => {
                const rule = alertRules.find((candidate) => candidate.type === type);
                const connected = providerAvailable(type, report);
                return (
                  <div key={type} className="border border-[#EEE] dark:border-zinc-800 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <p className="text-[12px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">{alertLabel(type)}</p>
                      <p className="text-[10px] text-[#888] font-bold uppercase tracking-widest mt-1">
                        {rule ? (rule.enabled ? 'Aktiv' : 'Pausiert') : 'Noch nicht angelegt'}
                        {rule?.threshold ? ` | Schwellwert: ${rule.threshold}` : ''}
                      </p>
                    </div>
                    {isProviderBackedAlert(type) && !connected ? (
                      <DataSourceBadge type="unavailable" label="Provider noch nicht verbunden" />
                    ) : (
                      <DataSourceBadge type="real" label="Alert-Regel" />
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 p-6">
            <h3 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100 mb-5 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#D4AF37]" /> Alert-Events
            </h3>
            {alertEvents.length === 0 ? (
              <p className="text-[11px] text-[#888] font-bold uppercase tracking-widest">Keine Alert-Events vorhanden. Es werden keine Ereignisse simuliert.</p>
            ) : (
              <div className="space-y-3">
                {alertEvents.map((event) => (
                  <div key={event.id} className="border border-[#EEE] dark:border-zinc-800 p-4">
                    <span className="text-[10px] font-black uppercase text-[#D4AF37]">{alertLabel(event.type)}</span>
                    <p className="text-[13px] font-bold text-[#1A1A1A] dark:text-zinc-100">{event.title}</p>
                    <p className="text-[10px] text-[#888] mt-2 uppercase tracking-widest">{event.status} | {formatDate(event.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === 'uptime' && (
        <section className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 p-6">
          <h3 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100 mb-5 flex items-center gap-2">
            <ServerCrash className="w-4 h-4 text-[#D4AF37]" /> Uptime
          </h3>
          {uptimeChecks.length === 0 ? (
            <p className="text-[11px] text-[#888] font-bold uppercase tracking-widest">Noch kein Uptime Check vorhanden. Keine Statuswerte werden simuliert.</p>
          ) : (
            <div className="space-y-3">
              {uptimeChecks.map((check) => (
                <div key={check.id} className="border border-[#EEE] dark:border-zinc-800 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <p className="text-[12px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">{check.status}</p>
                    <p className="text-[10px] text-[#888] font-bold uppercase tracking-widest mt-1">{check.url}</p>
                  </div>
                  <p className="text-[10px] text-[#888] font-bold uppercase tracking-widest">
                    {check.statusCode ? `${check.statusCode} | ` : ''}{check.responseTimeMs ? `${check.responseTimeMs} ms | ` : ''}{formatDate(check.checkedAt || check.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'scan_history' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 p-6">
            <h3 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100 mb-5 flex items-center gap-2">
              <History className="w-4 h-4 text-[#D4AF37]" /> Scan History
            </h3>
            {reports.length === 0 ? (
              <p className="text-[11px] text-[#888] font-bold uppercase tracking-widest">Noch keine gespeicherten Scans fuer dieses Projekt.</p>
            ) : (
              <div className="space-y-3">
                {reports.slice(0, 8).map((item) => {
                  const payload = parseReportPayload(item);
                  return (
                    <div key={item.id || payload.audit_id} className="border border-[#EEE] dark:border-zinc-800 p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <p className="text-[12px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">{payload.audit_id || item.id}</p>
                        <p className="text-[10px] text-[#888] font-bold uppercase tracking-widest">{formatDate(item.createdAt)}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        {(['seo', 'performance', 'security'] as const).map((key) => (
                          <div key={key} className="bg-zinc-50 dark:bg-zinc-950 p-3">
                            <span className="text-[8px] font-black uppercase tracking-widest text-[#888] block mb-1">{key}</span>
                            <span className="text-[14px] font-black text-[#1A1A1A] dark:text-zinc-100">{scoreValue(payload, key) ?? '-'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 p-6">
            <h3 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100 mb-5 flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#D4AF37]" /> Scan Diff
            </h3>
            <ScoreDeltaList diff={latestDiff} />
          </section>
        </div>
      )}

      {activeTab === 'issue_history' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="p-4 bg-red-500/5 border border-red-500/10">
              <span className="text-[20px] font-black text-red-500">{latestDiff?.newIssues.length || 0}</span>
              <p className="text-[9px] font-black uppercase tracking-widest text-[#888]">New</p>
            </div>
            <div className="p-4 bg-zinc-500/5 border border-zinc-500/10">
              <span className="text-[20px] font-black text-[#1A1A1A] dark:text-zinc-100">{latestDiff?.openIssues.length || openCurrentIssues.length}</span>
              <p className="text-[9px] font-black uppercase tracking-widest text-[#888]">Open</p>
            </div>
            <div className="p-4 bg-[#27AE60]/5 border border-[#27AE60]/10">
              <span className="text-[20px] font-black text-[#27AE60]">{latestDiff?.fixedIssues.length || 0}</span>
              <p className="text-[9px] font-black uppercase tracking-widest text-[#888]">Fixed</p>
            </div>
            <div className="p-4 bg-zinc-500/5 border border-zinc-500/10">
              <span className="text-[20px] font-black text-[#888]">{latestDiff?.ignoredIssues.length || ignoredCurrentIssues.length}</span>
              <p className="text-[9px] font-black uppercase tracking-widest text-[#888]">Ignored</p>
            </div>
            <div className="p-4 bg-[#D4AF37]/5 border border-[#D4AF37]/10">
              <span className="text-[20px] font-black text-[#D4AF37]">{latestDiff?.reopenedIssues.length || 0}</span>
              <p className="text-[9px] font-black uppercase tracking-widest text-[#888]">Reopened</p>
            </div>
          </div>

          {!latestDiff ? (
            <section className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 p-6">
              <p className="text-[11px] text-[#888] font-bold uppercase tracking-widest">Mindestens ein Scan ist noetig, um Issue-Historie zu berechnen.</p>
            </section>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <IssueList title="Neue Probleme" issues={latestDiff.newIssues} emptyLabel="Keine neuen Probleme im letzten Vergleich." />
              <IssueList title="Geloeste Probleme" issues={latestDiff.fixedIssues} emptyLabel="Keine geloesten Probleme im letzten Vergleich." />
              <IssueList title="Offene Probleme" issues={latestDiff.openIssues} emptyLabel="Keine weiter offenen Probleme im letzten Vergleich." />
              <IssueList title="Reopened / Ignored" issues={[...latestDiff.reopenedIssues, ...latestDiff.ignoredIssues]} emptyLabel="Keine reopened oder ignored Probleme." />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
