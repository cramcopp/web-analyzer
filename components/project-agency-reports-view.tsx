'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  Download,
  Eye,
  FileJson,
  FileText,
  Lock,
  MessageSquare,
  Palette,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  Users,
} from 'lucide-react';
import DataSourceBadge from './data-source-badge';
import { AgencyStat, AgencyTabButton, EmptyPanel, FieldLabel } from './agency-reporting/agency-ui';
import { getPlanConfig } from '@/lib/plans';
import type { AuditIssueStatus } from '@/types/audit';
import type { IssueComment, IssueTask, ReportBuilderConfig, ReportSectionKey, ReportVisibility, ScheduledReport, TeamBranding } from '@/types/reporting';

const TABS = [
  { id: 'share', label: 'Share Links', icon: Eye },
  { id: 'builder', label: 'Builder', icon: SlidersHorizontal },
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'scheduled', label: 'Scheduled', icon: CalendarClock },
  { id: 'tasks', label: 'Tasks', icon: MessageSquare },
  { id: 'exports', label: 'Exports', icon: Download },
] as const;

const REPORT_SECTIONS: Array<{ key: ReportSectionKey; label: string }> = [
  { key: 'summary', label: 'Executive Summary' },
  { key: 'scores', label: 'Scores' },
  { key: 'issues', label: 'Issues' },
  { key: 'evidence', label: 'Evidence Summary' },
  { key: 'crawl', label: 'Crawl Summary' },
  { key: 'recommendations', label: 'Recommendations' },
  { key: 'tasks', label: 'Client Task View' },
];

type AgencyTabId = typeof TABS[number]['id'];

function issueRows(report: any) {
  return (report?.issues || []).map((issue: any) => ({
    id: issue.id,
    issueId: issue.id,
    status: issue.status || 'open',
    severity: issue.severity,
    category: issue.category,
    title: issue.title,
    affectedUrls: issue.affectedUrls || [],
    confidence: issue.confidence,
  }));
}

function downloadFromApi(reportId: string, format: 'csv' | 'json' | 'pdf') {
  const link = document.createElement('a');
  link.href = `/api/reports/${encodeURIComponent(reportId)}/export?format=${format}`;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function builderConfig(projectId: string, title: string, sections: ReportSectionKey[], includeEvidence: boolean, includeTasks: boolean): ReportBuilderConfig {
  return {
    projectId,
    title,
    sections,
    includeEvidence,
    includeTasks,
    includeDebugData: false,
    updatedAt: new Date().toISOString(),
  };
}

export default function ProjectAgencyReportsView({
  project,
  report,
  plan = 'free',
  initialTab = 'share',
}: {
  project: { id: string; name: string; url: string };
  report: any;
  plan?: string;
  initialTab?: AgencyTabId;
}) {
  const [activeTab, setActiveTab] = useState<AgencyTabId>(initialTab);
  const [visibility, setVisibility] = useState<ReportVisibility>('private');
  const [password, setPassword] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [branding, setBranding] = useState<Partial<TeamBranding>>({ displayName: '', primaryColor: '#D4AF37', footerNote: '', logoUrl: '' });
  const [builderTitle, setBuilderTitle] = useState('Website Audit Report');
  const [sections, setSections] = useState<ReportSectionKey[]>(REPORT_SECTIONS.map((section) => section.key));
  const [includeEvidence, setIncludeEvidence] = useState(true);
  const [includeTasks, setIncludeTasks] = useState(true);
  const [issueTasks, setIssueTasks] = useState<IssueTask[]>([]);
  const [issueComments, setIssueComments] = useState<IssueComment[]>([]);
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [scheduleRecipients, setScheduleRecipients] = useState('');
  const [scheduleFrequency, setScheduleFrequency] = useState<'weekly' | 'monthly'>('weekly');
  const [activeIssueId, setActiveIssueId] = useState('');
  const [commentDraft, setCommentDraft] = useState('');

  const config = getPlanConfig(plan);
  const exportFormats = config.exports as readonly string[];
  const rows = useMemo(() => issueRows(report), [report]);
  const taskByIssue = useMemo(() => new Map(issueTasks.map((task) => [task.issueId, task])), [issueTasks]);
  const commentsByIssue = useMemo(() => {
    const grouped = new Map<string, IssueComment[]>();
    issueComments.forEach((comment) => grouped.set(comment.issueId, [...(grouped.get(comment.issueId) || []), comment]));
    return grouped;
  }, [issueComments]);
  const reportId = report?.id || report?.audit_id;

  useEffect(() => {
    async function loadAgencyData() {
      try {
        const response = await fetch(`/api/agency-reporting?projectId=${encodeURIComponent(project.id)}`);
        if (!response.ok) return;
        const data = await response.json();
        const latestBranding = (data.branding || [])[0];
        if (latestBranding) setBranding(latestBranding);
        setIssueTasks(data.issueTasks || []);
        setIssueComments(data.issueComments || []);
        setScheduledReports(data.scheduledReports || []);
      } catch {
        // Agency data is optional; report rendering still works without it.
      }
    }

    loadAgencyData();
  }, [project.id]);

  const currentBuilder = builderConfig(project.id, builderTitle, sections, includeEvidence, includeTasks);

  const createShareLink = async () => {
    if (!reportId || visibility === 'private') return;
    setIsSaving(true);
    try {
      const response = await fetch('/api/report-shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId,
          projectId: project.id,
          visibility,
          password: visibility === 'password' ? password : undefined,
          branding,
          builder: currentBuilder,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Share Link konnte nicht erstellt werden');
      setShareUrl(`${window.location.origin}${data.url}`);
    } finally {
      setIsSaving(false);
    }
  };

  const saveBranding = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/agency-reporting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'saveBranding',
          projectId: project.id,
          data: { ...branding, projectId: project.id, scope: 'project' },
        }),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const saveTask = async (row: any, patch: Partial<IssueTask>) => {
    const existing = taskByIssue.get(row.issueId);
    const nextTask: IssueTask = {
      id: existing?.id || `${project.id}_${row.issueId}`,
      projectId: project.id,
      issueId: row.issueId,
      title: row.title,
      status: (patch.status || existing?.status || row.status || 'open') as AuditIssueStatus,
      assigneeName: patch.assigneeName ?? existing?.assigneeName,
      assigneeId: patch.assigneeId ?? existing?.assigneeId,
      severity: row.severity,
      affectedUrls: row.affectedUrls,
      commentCount: commentsByIssue.get(row.issueId)?.length || existing?.commentCount || 0,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setIssueTasks((previous) => [nextTask, ...previous.filter((task) => task.issueId !== row.issueId)]);
    await fetch('/api/agency-reporting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'saveTask', projectId: project.id, data: nextTask }),
    });
  };

  const addComment = async () => {
    if (!activeIssueId || !commentDraft.trim()) return;
    const response = await fetch('/api/agency-reporting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'addComment', projectId: project.id, data: { issueId: activeIssueId, body: commentDraft } }),
    });
    const data = await response.json();
    const comment: IssueComment = {
      id: data.id || `pending_${Date.now()}`,
      projectId: project.id,
      issueId: activeIssueId,
      authorId: 'me',
      authorName: 'Team',
      body: commentDraft,
      createdAt: new Date().toISOString(),
    };
    setIssueComments((previous) => [comment, ...previous]);
    setCommentDraft('');
  };

  const saveScheduledReport = async () => {
    const recipients = scheduleRecipients.split(',').map((item) => item.trim()).filter(Boolean);
    const scheduled: ScheduledReport = {
      id: `${project.id}_${scheduleFrequency}_report`,
      projectId: project.id,
      recipients,
      frequency: scheduleFrequency,
      enabled: recipients.length > 0,
      visibility: visibility === 'private' ? 'public' : visibility,
      builder: currentBuilder,
      mailProviderConnected: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setScheduledReports((previous) => [scheduled, ...previous.filter((item) => item.id !== scheduled.id)]);
    await fetch('/api/agency-reporting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'saveScheduledReport', projectId: project.id, data: scheduled }),
    });
  };

  const toggleSection = (key: ReportSectionKey) => {
    setSections((previous) => previous.includes(key) ? previous.filter((item) => item !== key) : [...previous, key]);
  };

  if (!report) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-[#888] mb-4">
          <FileText className="w-8 h-8" />
        </div>
        <h3 className="text-[20px] font-black uppercase tracking-tighter text-[#1A1A1A] dark:text-zinc-100">Kein Report vorhanden</h3>
        <p className="text-[12px] text-[#888] font-bold uppercase tracking-widest">Erst scannen, dann Kundenreport bauen.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#EEE] dark:border-zinc-800 pb-8">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-[10px] font-black uppercase tracking-[3px] text-[#D4AF37]">Agency Reporting</span>
            <DataSourceBadge type="real" label="Sanitized Reports" />
            <DataSourceBadge type={config.whiteLabel ? 'real' : 'unavailable'} label={config.whiteLabel ? 'White Label' : 'Agency Feature'} />
          </div>
          <h2 className="text-[32px] md:text-[42px] font-black uppercase tracking-tighter leading-none text-[#1A1A1A] dark:text-zinc-100">Reports</h2>
          <p className="text-[12px] text-[#888] font-bold mt-2 uppercase tracking-widest max-w-xl">
            Share Links, Client Portal, Branding, Builder, serverseitige Exporte und Task Board aus echten Issues.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AgencyStat label="Issues" value={rows.length} />
        <AgencyStat label="Tasks" value={issueTasks.length} />
        <AgencyStat label="Comments" value={issueComments.length} />
        <AgencyStat label="Schedules" value={scheduledReports.length} />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[#EEE] dark:border-zinc-800 pb-4">
        {TABS.map((tab) => (
          <AgencyTabButton key={tab.id} active={activeTab === tab.id} icon={tab.icon} label={tab.label} onClick={() => setActiveTab(tab.id)} />
        ))}
      </div>

      {activeTab === 'share' && (
        <section className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 p-6">
          <h3 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100 mb-5 flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#D4AF37]" /> Public Share Link
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
            {(['private', 'public', 'password'] as ReportVisibility[]).map((option) => (
              <button
                key={option}
                onClick={() => setVisibility(option)}
                className={`px-4 py-3 border text-[10px] font-black uppercase tracking-widest transition-all ${visibility === option ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'border-[#EEE] dark:border-zinc-800 text-[#888] hover:text-[#1A1A1A] dark:hover:text-zinc-100'}`}
              >
                {option}
              </button>
            ))}
          </div>
          {visibility === 'password' && (
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Report Passwort"
              className="w-full mb-4 px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-[#EEE] dark:border-zinc-800 text-[13px] focus:outline-none focus:border-[#D4AF37]"
            />
          )}
          <button
            onClick={createShareLink}
            disabled={!reportId || visibility === 'private' || isSaving || (visibility === 'password' && !password)}
            className="px-6 py-3 bg-[#1A1A1A] dark:bg-white text-white dark:text-zinc-900 text-[10px] font-black uppercase tracking-widest hover:bg-[#D4AF37] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-3"
          >
            <Send className="w-4 h-4" />
            {isSaving ? 'Speichert...' : 'Client Portal Link erstellen'}
          </button>
          {shareUrl && (
            <div className="mt-5 p-4 bg-[#D4AF37]/5 border border-[#D4AF37]/20">
              <span className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37] block mb-2">Kundenlink ohne Login</span>
              <p className="text-[12px] font-bold text-[#1A1A1A] dark:text-zinc-100 break-all">{shareUrl}</p>
            </div>
          )}
        </section>
      )}

      {activeTab === 'builder' && (
        <section className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 p-6">
          <h3 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100 mb-5 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#D4AF37]" /> Report Builder
          </h3>
          <FieldLabel>Report Titel</FieldLabel>
          <input value={builderTitle} onChange={(event) => setBuilderTitle(event.target.value)} className="w-full mb-5 px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-[#EEE] dark:border-zinc-800 text-[13px] focus:outline-none focus:border-[#D4AF37]" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {REPORT_SECTIONS.map((section) => (
              <label key={section.key} className="p-4 border border-[#EEE] dark:border-zinc-800 flex items-center justify-between gap-4 cursor-pointer">
                <span className="text-[11px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">{section.label}</span>
                <input type="checkbox" checked={sections.includes(section.key)} onChange={() => toggleSection(section.key)} />
              </label>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            <label className="p-4 border border-[#EEE] dark:border-zinc-800 flex items-center justify-between gap-4">
              <span className="text-[11px] font-black uppercase tracking-widest text-[#888]">Evidence Summary</span>
              <input type="checkbox" checked={includeEvidence} onChange={(event) => setIncludeEvidence(event.target.checked)} />
            </label>
            <label className="p-4 border border-[#EEE] dark:border-zinc-800 flex items-center justify-between gap-4">
              <span className="text-[11px] font-black uppercase tracking-widest text-[#888]">Client Task View</span>
              <input type="checkbox" checked={includeTasks} onChange={(event) => setIncludeTasks(event.target.checked)} />
            </label>
          </div>
        </section>
      )}

      {activeTab === 'branding' && (
        <section className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 p-6">
          <h3 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100 mb-5 flex items-center gap-2">
            <Palette className="w-4 h-4 text-[#D4AF37]" /> White Label Branding
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><FieldLabel>Display Name</FieldLabel><input value={branding.displayName || ''} onChange={(event) => setBranding({ ...branding, displayName: event.target.value })} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-[#EEE] dark:border-zinc-800 text-[13px]" /></div>
            <div><FieldLabel>Primary Color</FieldLabel><input value={branding.primaryColor || '#D4AF37'} onChange={(event) => setBranding({ ...branding, primaryColor: event.target.value })} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-[#EEE] dark:border-zinc-800 text-[13px]" /></div>
            <div><FieldLabel>Logo URL spaeter Upload</FieldLabel><input value={branding.logoUrl || ''} onChange={(event) => setBranding({ ...branding, logoUrl: event.target.value })} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-[#EEE] dark:border-zinc-800 text-[13px]" /></div>
            <div><FieldLabel>Footer Note</FieldLabel><input value={branding.footerNote || ''} onChange={(event) => setBranding({ ...branding, footerNote: event.target.value })} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-[#EEE] dark:border-zinc-800 text-[13px]" /></div>
          </div>
          <button onClick={saveBranding} disabled={isSaving || !config.whiteLabel} className="mt-5 px-6 py-3 bg-[#1A1A1A] dark:bg-white text-white dark:text-zinc-900 text-[10px] font-black uppercase tracking-widest disabled:opacity-50 flex items-center gap-3">
            <ShieldCheck className="w-4 h-4" /> Branding speichern
          </button>
          {!config.whiteLabel && <p className="mt-3 text-[10px] text-[#888] font-bold uppercase tracking-widest">White Label Branding ist in {config.name} nicht aktiv.</p>}
        </section>
      )}

      {activeTab === 'scheduled' && (
        <section className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 p-6">
          <h3 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100 mb-5 flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-[#D4AF37]" /> Scheduled Reports per Mail
          </h3>
          <FieldLabel>Empfaenger, kommasepariert</FieldLabel>
          <input value={scheduleRecipients} onChange={(event) => setScheduleRecipients(event.target.value)} placeholder="kunde@example.com" className="w-full mb-4 px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-[#EEE] dark:border-zinc-800 text-[13px]" />
          <div className="flex flex-wrap gap-3 mb-5">
            {(['weekly', 'monthly'] as const).map((frequency) => (
              <button key={frequency} onClick={() => setScheduleFrequency(frequency)} className={`px-4 py-3 border text-[10px] font-black uppercase tracking-widest ${scheduleFrequency === frequency ? 'bg-[#1A1A1A] text-white' : 'text-[#888] border-[#EEE] dark:border-zinc-800'}`}>{frequency}</button>
            ))}
          </div>
          <button onClick={saveScheduledReport} className="px-6 py-3 bg-[#1A1A1A] dark:bg-white text-white dark:text-zinc-900 text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
            <Send className="w-4 h-4" /> Schedule speichern
          </button>
          <div className="mt-5 flex items-center gap-2"><DataSourceBadge type="unavailable" label="Mail Provider noch nicht verbunden" /></div>
        </section>
      )}

      {activeTab === 'tasks' && (
        <section className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 overflow-hidden">
          <div className="px-6 py-5 border-b border-[#EEE] dark:border-zinc-800 flex items-center justify-between gap-4">
            <h3 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">Task Board aus Issues</h3>
            <DataSourceBadge type="real" label="Audit Issues" />
          </div>
          {rows.length === 0 ? (
            <EmptyPanel>Keine Issues im aktuellen Report.</EmptyPanel>
          ) : (
            <div className="divide-y divide-[#EEE] dark:divide-zinc-800">
              {rows.slice(0, 30).map((row: any) => {
                const task = taskByIssue.get(row.issueId);
                const comments = commentsByIssue.get(row.issueId) || [];
                return (
                  <div key={row.id} className="p-5 grid grid-cols-1 xl:grid-cols-[1fr_160px_220px_140px] gap-4 items-start">
                    <div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37]">{row.severity}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#888]">{row.category}</span>
                      </div>
                      <p className="text-[13px] font-bold text-[#1A1A1A] dark:text-zinc-100">{row.title}</p>
                      <p className="text-[10px] text-[#888] font-medium break-all">{row.affectedUrls.join(' | ')}</p>
                    </div>
                    <select value={task?.status || row.status} onChange={(event) => saveTask(row, { status: event.target.value as AuditIssueStatus })} className="px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-[#EEE] dark:border-zinc-800 text-[11px] font-bold">
                      {(['new', 'open', 'fixed', 'ignored', 'reopened'] as AuditIssueStatus[]).map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                    <div className="flex items-center gap-2">
                      <UserRound className="w-4 h-4 text-[#888]" />
                      <input defaultValue={task?.assigneeName || ''} onBlur={(event) => saveTask(row, { assigneeName: event.target.value })} placeholder="Verantwortliche/r" className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-[#EEE] dark:border-zinc-800 text-[11px]" />
                    </div>
                    <button onClick={() => setActiveIssueId(row.issueId)} className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                      <MessageSquare className="w-3 h-3" /> {comments.length}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {activeIssueId && (
            <div className="p-5 border-t border-[#EEE] dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
              <FieldLabel>Kommentar zu Issue {activeIssueId}</FieldLabel>
              <div className="flex flex-col md:flex-row gap-3">
                <input value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} className="flex-1 px-4 py-3 bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 text-[13px]" />
                <button onClick={addComment} className="px-6 py-3 bg-[#1A1A1A] dark:bg-white text-white dark:text-zinc-900 text-[10px] font-black uppercase tracking-widest">Kommentar speichern</button>
              </div>
            </div>
          )}
        </section>
      )}

      {activeTab === 'exports' && (
        <section className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 p-6">
          <h3 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100 mb-5 flex items-center gap-2">
            <Download className="w-4 h-4 text-[#D4AF37]" /> Serverseitige Exporte
          </h3>
          <div className="flex flex-wrap gap-3">
            <button disabled={!reportId || !exportFormats.includes('csv')} onClick={() => downloadFromApi(reportId, 'csv')} className="px-5 py-3 bg-zinc-100 dark:bg-zinc-800 text-[10px] font-black uppercase tracking-widest disabled:opacity-50 flex items-center gap-2"><Download className="w-4 h-4" /> CSV</button>
            <button disabled={!reportId || !exportFormats.includes('json')} onClick={() => downloadFromApi(reportId, 'json')} className="px-5 py-3 bg-zinc-100 dark:bg-zinc-800 text-[10px] font-black uppercase tracking-widest disabled:opacity-50 flex items-center gap-2"><FileJson className="w-4 h-4" /> JSON</button>
            <button disabled={!reportId || !exportFormats.includes('pdf')} onClick={() => downloadFromApi(reportId, 'pdf')} className="px-5 py-3 bg-zinc-100 dark:bg-zinc-800 text-[10px] font-black uppercase tracking-widest disabled:opacity-50 flex items-center gap-2"><FileText className="w-4 h-4" /> PDF</button>
          </div>
          <p className="mt-4 text-[10px] text-[#888] font-bold uppercase tracking-widest">Public und Export Reports werden vor Ausgabe sanitisiert: keine Raw-HTML-Evidence, Admin-Secrets oder internen Debugdaten.</p>
        </section>
      )}

      <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 p-5 flex items-start gap-3">
        <Lock className="w-4 h-4 text-[#D4AF37] mt-0.5" />
        <p className="text-[11px] text-[#888] font-bold uppercase tracking-widest leading-relaxed">
          Client Portal Links funktionieren ohne Kundenlogin. Passwort-Reports pruefen das Passwort serverseitig.
        </p>
      </div>
    </div>
  );
}
