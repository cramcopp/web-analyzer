'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Globe, Loader2, AlertCircle, CheckCircle, X, Zap, Star } from 'lucide-react';
import { Sidebar } from '../components/sidebar';
import { FloatingNav } from '../components/floating-nav';
import TopNav from '../components/top-nav';
import MarketingHome from '../components/marketing-home';
import { generateReportClientSide } from './lib/generate-report';
import { useAuth } from '../components/auth-provider';
import PricingSection from '../components/PricingSection';
import TeamWorkspace from '../components/team-workspace';
import LoadingDisplay from '../components/loading-display';
import ReportResultsView from '../components/report-results-view';
import ProjectDashboardView from '../components/project-dashboard-view';
import DashboardHomeView from '../components/dashboard-home-view';
import ProjectsOverviewView from '../components/projects-overview-view';
import SettingsView from '../components/settings-view';
import ProfileView from '../components/profile-view';
import { ReportData, PrioritizedTask, GscData } from '../types/report';
import { AnalysisResult } from '../lib/scanner';
import { Notification, Project } from '../types/common';
import { useTrial } from '../hooks/use-trial';
import { getMonthlyCrawlPageLimit, getMonthlyScanLimit, normalizePlan } from '../lib/plans';
import { normalizeStoredReport } from '../lib/report-normalizer';

type ActiveView = 'home' | 'dashboard' | 'analyzer' | 'projects' | 'project' | 'settings' | 'profile' | 'pricing' | 'team';
type ProjectNavTab =
  | 'overview'
  | 'audit'
  | 'issues'
  | 'evidence'
  | 'keywords'
  | 'rankings'
  | 'linking'
  | 'backlinks'
  | 'competition'
  | 'ai_visibility'
  | 'ai_plan'
  | 'monitoring'
  | 'reports'
  | 'tasks'
  | 'tools'
  | 'history'
  | 'settings';

const PROJECT_TABS: ProjectNavTab[] = [
  'overview',
  'audit',
  'issues',
  'evidence',
  'keywords',
  'rankings',
  'linking',
  'backlinks',
  'competition',
  'ai_visibility',
  'ai_plan',
  'monitoring',
  'reports',
  'tasks',
  'tools',
  'history',
  'settings',
];

function normalizeProjectTab(value?: string | null): ProjectNavTab {
  return PROJECT_TABS.includes(value as ProjectNavTab) ? value as ProjectNavTab : 'overview';
}

function normalizeAppView(value?: string | null): ActiveView {
  if (value === 'dashboard') return 'dashboard';
  if (value === 'analyzer' || value === 'projects' || value === 'settings' || value === 'profile' || value === 'pricing' || value === 'team') return value;
  return 'home';
}

export default function WebsiteAnalyzer() {
  const { user, userData, loading: authLoading, signIn, logOut } = useAuth();
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [rawScrapeData, setRawScrapeData] = useState<AnalysisResult | null>(null);
  const [gscData, setGscData] = useState<GscData | null>(null);
  const [isGscLoading, setIsGscLoading] = useState(false);
  const [gscError, setGscError] = useState<string | null>(null);
  const [lastAnalyzedUrl, setLastAnalyzedUrl] = useState<string | null>(null);
  const [notification, setNotification] = useState<{message: string, url: string} | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectInitialTab, setProjectInitialTab] = useState<ProjectNavTab>('overview');
  const urlStateInitialized = useRef(false);

  const { trialDaysLeft, showTrialBadge } = useTrial();
  const accountPlan = normalizePlan(userData?.plan || 'free');
  const rawPlanData = rawScrapeData as (AnalysisResult & {
    scanPlan?: string;
    plan?: string;
  }) | null;
  const currentReportPlan = normalizePlan(
    rawPlanData?.scanPlan ||
    rawPlanData?.plan ||
    (report as any)?.scanPlan ||
    (report as any)?.plan ||
    accountPlan
  );
  const scanLimitMonthly = getMonthlyScanLimit(accountPlan);
  const scanCount = userData?.scanCount || 0;
  const scanUsageRatio = scanLimitMonthly > 0 ? scanCount / scanLimitMonthly : 0;
  const crawlPagesCount = userData?.crawlPagesCount || 0;
  const crawlPagesLimitMonthly = getMonthlyCrawlPageLimit(accountPlan);
  const crawlUsageRatio = crawlPagesLimitMonthly > 0 ? crawlPagesCount / crawlPagesLimitMonthly : 0;

  const addNotification = (title: string, message: string) => {
    const newNotif: Notification = {
      id: Date.now().toString(),
      title,
      message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const syncRootUrl = useCallback((query: string, replace = false) => {
    if (typeof window === 'undefined') return;
    const nextUrl = query ? `/?${query}` : '/';
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (currentUrl === nextUrl) return;
    const method = replace ? 'replaceState' : 'pushState';
    window.history[method]({}, '', nextUrl);
  }, []);

  const navigateToView = useCallback((view: string, replace = false) => {
    const nextView = normalizeAppView(view);
    setActiveView(nextView);
    if (nextView !== 'project') {
      setProjectInitialTab('overview');
    }
    syncRootUrl(nextView === 'home' ? '' : `view=${nextView}`, replace);
  }, [syncRootUrl]);

  const loadLatestReportForProject = useCallback(async (proj: Project) => {
    if (!proj.url) {
      setReport(null);
      setRawScrapeData(null);
      setLastAnalyzedUrl(null);
      return;
    }

    setUrl(proj.url);
    try {
      const resp = await fetch(`/api/reports?url=${encodeURIComponent(proj.url)}`);
      if (!resp.ok) return;
      const reports = await resp.json();
      if (reports && reports.length > 0) {
        const latest = reports.sort((a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
        const normalized = normalizeStoredReport(latest);
        setReport(normalized.results);
        setRawScrapeData(normalized.rawScrapeData);
        setLastAnalyzedUrl(proj.url);
      } else {
        setReport(null);
        setRawScrapeData(null);
        setLastAnalyzedUrl(null);
      }
    } catch (e) {
      console.error("Error loading latest report for project:", e);
    }
  }, []);

  const selectProject = useCallback(async (
    proj: Project,
    tab: ProjectNavTab = 'overview',
    updateUrl = true,
    replace = false
  ) => {
    setSelectedProject(proj);
    setProjectInitialTab(tab);
    setActiveView('project');
    if (updateUrl) {
      syncRootUrl(`project=${encodeURIComponent(proj.id)}&tab=${encodeURIComponent(tab)}`, replace);
    }
    await loadLatestReportForProject(proj);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [loadLatestReportForProject, syncRootUrl]);

  const handleLoadReport = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await fetch(`/api/reports/${id}`);
      if (!resp.ok) throw new Error('Report nicht gefunden.');
      const data = await resp.json();
      const normalized = normalizeStoredReport(data);
      setReport(normalized.results);
      setRawScrapeData(normalized.rawScrapeData);
      setLastAnalyzedUrl(normalized.url || data.url);
      setUrl(normalized.url || data.url);
      setActiveView('analyzer');
      syncRootUrl('view=analyzer');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Fehler beim Laden des Reports.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectProject = useCallback((proj: Project) => {
    void selectProject(proj, 'overview', true);
  }, [selectProject]);

  const openProjectSection = useCallback((tab: ProjectNavTab) => {
    setProjectInitialTab(tab);
    if (selectedProject) {
      setActiveView('project');
      syncRootUrl(`project=${encodeURIComponent(selectedProject.id)}&tab=${encodeURIComponent(tab)}`);
      return;
    }
    setActiveView('projects');
    syncRootUrl(`view=projects&tab=${encodeURIComponent(tab)}`);
  }, [selectedProject, syncRootUrl]);

  const applyUrlState = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const tab = normalizeProjectTab(params.get('tab'));
    const projectId = params.get('project');

    if (projectId) {
      try {
        const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}`);
        if (!response.ok) throw new Error('Projekt konnte nicht geladen werden.');
        const project = await response.json();
        await selectProject(project, tab, false, true);
        return;
      } catch (projectError) {
        console.error('Project route hydration failed:', projectError);
        setProjectInitialTab(tab);
        setActiveView('projects');
        return;
      }
    }

    const requestedView = params.get('view');
    const nextView = normalizeAppView(requestedView);
    setProjectInitialTab(tab);
    setActiveView(nextView);
  }, [selectProject]);

  useEffect(() => {
    if (authLoading) return;
    if (!urlStateInitialized.current) {
      urlStateInitialized.current = true;
      queueMicrotask(() => {
        void applyUrlState();
      });
    }

    const onPopState = () => {
      void applyUrlState();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [applyUrlState, authLoading]);

  const fetchGSCData = useCallback(async (targetUrl: string) => {
    setIsGscLoading(true);
    setGscError(null);
    try {
      const resp = await fetch(`/api/search-console/stats?url=${encodeURIComponent(targetUrl)}`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Fehler beim Laden von GSC Daten');
      setGscData(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setGscError(msg);
    } finally {
      setIsGscLoading(false);
    }
  }, []);

  const handleAnalyze = async (e?: React.FormEvent, overrideUrl?: string) => {
    if (e) e.preventDefault();
    const currentUrl = overrideUrl || url;
    if (!currentUrl) return;

    let targetUrl = currentUrl.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    try { new URL(targetUrl); } catch {
      setError('Bitte gib eine gültige URL ein.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setReport(null);
    setRawScrapeData(null);

    try {
      if (!user) {
        setError('Bitte logge dich ein, damit der Full Audit deinem Account und deinen Planlimits zugeordnet werden kann.');
        setIsLoading(false);
        void signIn();
        return;
      }

      if (user && userData && scanCount >= scanLimitMonthly) {
        if (accountPlan === 'free') {
          navigateToView('pricing');
          setIsLoading(false);
          return;
        } else {
          setError(`Limit von ${scanLimitMonthly} Scans erreicht.`);
          setIsLoading(false);
          return;
        }
      }

      if (user && userData && crawlPagesCount >= crawlPagesLimitMonthly) {
        if (accountPlan === 'free') {
          navigateToView('pricing');
          setIsLoading(false);
          return;
        }
        setError(`Limit von ${crawlPagesLimitMonthly} Crawl-Seiten erreicht.`);
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: targetUrl,
          projectId: selectedProject && (selectedProject.url === currentUrl || selectedProject.url === targetUrl) ? selectedProject.id : undefined,
        }),
      });

      let scrapeData = await response.json();
      if (!response.ok) throw new Error(scrapeData.details || scrapeData.error || 'Website konnte nicht geladen werden.');
      
      // --- ASYNC POLLING FOR WORKFLOW ---
      if (scrapeData.status === 'processing' && scrapeData.audit_id) {
        const auditId = scrapeData.audit_id;
        let isDone = false;
        let attempts = 0;
        
        while (!isDone && attempts < 60) { // Max 5 minutes (60 * 5s)
          await new Promise(r => setTimeout(r, 5000));
          attempts++;
          
          try {
            const pollResp = await fetch(`/api/reports/${auditId}`);
            if (pollResp.ok) {
              const pollData = await pollResp.json();
              if (pollData.crawlSummary) {
                scrapeData = pollData;
                isDone = true;
              }
            }
          } catch (e) {
            console.error("Polling error:", e);
          }
        }
        
        if (!isDone) throw new Error('Analyse dauert zu lange. Bitte schau später in deinem Dashboard nach.');
      }

      if (scrapeData._cached && scrapeData._cachedReport) {
        setRawScrapeData(scrapeData);
        setReport(scrapeData._cachedReport);
        setLastAnalyzedUrl(targetUrl);
        addNotification('Analyse geladen', `Vorheriger Bericht für ${targetUrl} wurde aus dem Cache geladen.`);
        setIsLoading(false);
        return;
      }

      setRawScrapeData(scrapeData);
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
        url: scrapeData.url || targetUrl
      };
      setReport(reportWithAuditId);
      setLastAnalyzedUrl(targetUrl);
      addNotification('Analyse abgeschlossen', `Bericht für ${targetUrl} ist bereit.`);

      if (user) {
        const avgScore = Math.round((
          (reportWithAuditId.seo?.score || 0) +
          (reportWithAuditId.security?.score || 0) +
          (reportWithAuditId.performance?.score || 0) +
          (reportWithAuditId.accessibility?.score || 0) +
          (reportWithAuditId.compliance?.score || 0) +
          (reportWithAuditId.contentStrategy?.score || 0)
        ) / 6);
        
        // Keep API payloads small; full scan artifacts are stored in R2.
        const storageData = { ...scrapeData };
        delete storageData.bodyText; 

        const savePayload = {
          url: targetUrl,
          score: avgScore,
          results: JSON.stringify(reportWithAuditId),
          rawScrapeData: JSON.stringify(storageData),
          seoScore: reportWithAuditId.seo?.score || 0,
          performanceScore: reportWithAuditId.performance?.score || 0,
          securityScore: reportWithAuditId.security?.score || 0,
          accessibilityScore: reportWithAuditId.accessibility?.score || 0,
          complianceScore: reportWithAuditId.compliance?.score || 0
        };
        const existingReportId = scrapeData.audit_id || reportWithAuditId.audit_id;
        const saveResponse = existingReportId
          ? await fetch(`/api/reports/${existingReportId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(savePayload)
            })
          : null;

        if (!saveResponse?.ok) {
          await fetch('/api/reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(savePayload)
          });
        }

        if (selectedProject && selectedProject.url === targetUrl) {
          await fetch(`/api/projects/${selectedProject.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lastScore: avgScore, lastScanAt: new Date().toISOString() })
          });
        }
      }
      fetchGSCData(targetUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fehler bei der Analyse';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartScanFromNav = (target: string) => {
    const value = target.trim();
    if (!value) return;
    if (activeView === 'home') {
      window.location.assign(`/scanner?url=${encodeURIComponent(value)}&start=1`);
      return;
    }
    setUrl(value);
    setActiveView('analyzer');
    syncRootUrl('view=analyzer');
    void handleAnalyze(undefined, value);
  };

  const handleLogout = () => {
    void logOut();
    setActiveView('home');
    setReport(null);
    setRawScrapeData(null);
    setUrl('');
    setSelectedProject(null);
    syncRootUrl('');
  };

  const handleConnectGSC = async () => {
    try {
      const resp = await fetch('/api/auth/google/url');
      const { url } = await resp.json();
      window.open(url, 'GSC Auth', 'width=600,height=700');
    } catch {
      setGscError('Fehler beim Starten der Google-Verbindung.');
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'GSC_AUTH_SUCCESS' && lastAnalyzedUrl) fetchGSCData(lastAnalyzedUrl);
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [lastAnalyzedUrl, fetchGSCData]);

  const exportActionPlanToCSV = () => {
    if (!report) return;
    const rows = [['Category', 'Priority', 'Task', 'Remediation']];
    const addTasks = (cat: string, tasks?: PrioritizedTask[]) => {
      tasks?.forEach(t => rows.push([cat, `"${t.priority}"`, `"${t.task}"`, `"${t.remediation || ''}"`]));
    };
    addTasks('SEO', report.seo?.detailedSeo?.prioritizedTasks);
    addTasks('Security', report.security?.detailedSecurity?.prioritizedTasks);
    addTasks('Performance', report.performance?.detailedPerformance?.prioritizedTasks);
    addTasks('Accessibility', report.accessibility?.detailedAccessibility?.prioritizedTasks);
    addTasks('Legal', report.compliance?.detailedCompliance?.prioritizedTasks);
    addTasks('Content Strategy', report.contentStrategy?.detailedContent?.prioritizedTasks);

    const csvContent = "\ufeff" + rows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `WAP_ActionPlan_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (authLoading) return (
    <div className="fixed inset-0 bg-[#F5F5F3] dark:bg-zinc-950 flex flex-col items-center justify-center z-[100]">
      <Zap className="w-12 h-12 text-[#D4AF37] animate-pulse mb-4" />
      <span className="text-[10px] font-black uppercase tracking-widest text-[#888]">System wird geladen...</span>
    </div>
  );

  return (
    <>
      <TopNav
        mode={activeView === 'home' ? 'marketing' : 'app'}
        activeView={activeView}
        user={user}
        userData={userData}
        onNavigate={(view) => navigateToView(view)}
        onStartScan={handleStartScanFromNav}
        onSignIn={signIn}
        onLogout={handleLogout}
      />

      {activeView === 'home' ? (
        <MarketingHome
          user={user}
          onStartScan={handleStartScanFromNav}
          onOpenAnalyzer={() => window.location.assign('/scanner')}
          onOpenPricing={() => window.location.assign('/preise')}
          onOpenDashboard={() => navigateToView('dashboard')}
          onOpenProjects={() => navigateToView('projects')}
          onSignIn={signIn}
        />
      ) : (
    <main className="min-h-screen bg-[#F5F5F3] dark:bg-zinc-950 text-[#1A1A1A] dark:text-zinc-100 font-sans overflow-x-hidden pt-14 md:pl-[72px] relative transition-colors duration-500">
      <Sidebar 
        onLoadReport={handleLoadReport}
        onSelectProject={handleSelectProject}
        onOpenDashboard={() => { setProjectInitialTab('overview'); navigateToView('dashboard'); }}
        onOpenProjects={() => navigateToView('projects')}
        onOpenScanner={() => navigateToView('analyzer')}
        onOpenProjectTab={(tab) => openProjectSection(tab as ProjectNavTab)}
        onOpenSettings={() => navigateToView('settings')}
        onOpenTeam={() => navigateToView('team')}
        onOpenProfile={() => navigateToView('profile')}
        onOpenPricing={() => navigateToView('pricing')}
        onOpenHome={() => navigateToView('home')}
        activeSection={activeView}
        activeProjectTab={projectInitialTab}
        isNotifOpen={isNotifOpen}
        setIsNotifOpen={setIsNotifOpen}
        notifications={notifications}
        setNotifications={setNotifications}
        onLogout={handleLogout}
      />
      {!isLoading && report && (activeView === 'analyzer' || activeView === 'project') && <FloatingNav />}
      
      {notification && (
        <div className="fixed bottom-6 right-6 bg-[#1A1A1A] dark:bg-zinc-100 text-white dark:text-zinc-900 px-6 py-4 border border-[#333] dark:border-[#EEE] shadow-2xl z-[100] flex items-start gap-4 animate-in slide-in-from-bottom-5 duration-300">
          <CheckCircle className="w-5 h-5 text-[#27AE60] mt-0.5" />
          <div className="flex flex-col">
            <h4 className="text-[13px] font-bold">{notification.message}</h4>
            <p className="text-[10px] opacity-70 truncate max-w-[200px]">{notification.url}</p>
          </div>
          <button onClick={() => setNotification(null)}><X className="w-4 h-4 opacity-50 hover:opacity-100" /></button>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto px-6 md:px-10 py-10 md:py-[60px] flex flex-col justify-between min-h-screen">
        <div>
          <header className="mb-8 flex flex-col gap-6 border-b border-[#dfe3ea] pb-7 dark:border-zinc-800 md:flex-row md:items-end md:justify-between">
            <div>
            <h1 
              className="max-w-[760px] cursor-pointer text-[34px] font-black uppercase leading-[0.95] tracking-tight text-[#172033] transition-all duration-500 hover:text-[#D4AF37] dark:text-zinc-100 sm:text-[44px] md:text-[56px]"
              onClick={() => navigateToView('dashboard')}
            >
              {activeView === 'analyzer' ? 'SEO Audit & AI Scanner' : activeView === 'dashboard' ? 'Dashboard' : 'WAP Workspace'}
            </h1>
            <p className="mt-3 max-w-[720px] text-[13px] font-bold uppercase tracking-[0.12em] text-[#7b8495]">
              {activeView === 'analyzer'
                ? 'Domain eingeben, Deep-Scan starten und daraus einen vermarktbaren Maßnahmenplan machen.'
                : activeView === 'dashboard'
                ? 'Schneller Zugriff auf Projekte, Full Audit und letzte Arbeitsbereiche.'
                : 'Projekte, Reports, Monitoring und Team-Workflows.'}
            </p>
            </div>
            <div className="md:text-right flex flex-col gap-3 items-end">
              {(!userData?.plan || userData.plan === 'free') && (
                <button 
                  onClick={() => navigateToView('pricing')}
                  className="text-[10px] font-black uppercase tracking-[2px] text-[#D4AF37] border border-[#D4AF37]/30 px-3 py-1.5 hover:bg-[#D4AF37] hover:text-white transition-all flex items-center gap-2 group"
                >
                  <Star className="w-3 h-3 group-hover:rotate-12 transition-transform" />
                  7 TAGE GRATIS TESTEN
                </button>
              )}
              {user && userData && (
                <div className="flex flex-col items-end opacity-80 mt-1">
                   <span className="text-[11px] font-black tracking-tighter">{scanCount} / {scanLimitMonthly} <span className="text-[9px] font-bold text-[#888] uppercase ml-1">Analysen genutzt</span></span>
                   <div className="w-32 h-1 bg-black/5 dark:bg-white/10 mt-1.5 overflow-hidden rounded-full">
                      <div
                        className={`h-full transition-all duration-1000 ${ scanUsageRatio > 0.8 ? 'bg-[#EB5757]' : 'bg-[#D4AF37]' }`}
                       style={{ width: `${Math.min(100, scanUsageRatio * 100)}%` }}
                     />
                   </div>
                   <span className="mt-2 text-[10px] font-black tracking-tighter">{crawlPagesCount} / {crawlPagesLimitMonthly} <span className="text-[8px] font-bold text-[#888] uppercase ml-1">Crawl-Seiten</span></span>
                   <div className="w-32 h-1 bg-black/5 dark:bg-white/10 mt-1.5 overflow-hidden rounded-full">
                      <div
                        className={`h-full transition-all duration-1000 ${ crawlUsageRatio > 0.8 ? 'bg-[#EB5757]' : 'bg-[#27AE60]' }`}
                       style={{ width: `${Math.min(100, crawlUsageRatio * 100)}%` }}
                     />
                   </div>
                </div>
              )}
            </div>
          </header>

          {activeView === 'dashboard' && (
            <DashboardHomeView
              selectedProject={selectedProject}
              onSelectProject={handleSelectProject}
              onOpenProjects={() => navigateToView('projects')}
              onOpenScanner={() => navigateToView('analyzer')}
              onOpenPricing={() => navigateToView('pricing')}
              onSignIn={signIn}
              user={user}
              userData={userData}
            />
          )}

          {activeView === 'analyzer' && (
            <>
              {showTrialBadge && (
                <div className="mb-8 p-4 bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-widest text-[#D4AF37]">Testphase aktiv: Noch {trialDaysLeft} Tage verbleibend</span>
                  <button onClick={() => navigateToView('pricing')} className="text-[10px] font-bold uppercase underline text-[#D4AF37]">Jetzt upgraden</button>
                </div>
              )}
              <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                  ['SEO Audit', 'Crawl, Indexierung, Struktur und Onpage-Prioritäten.'],
                  ['KI-Sichtbarkeit', 'AI-Crawler, semantische Lücken und LLM-Lesbarkeit.'],
                  ['Security & DSGVO', 'Header, SSL, Cookies, Datenschutz und Risiken.'],
                  ['Agentur Reports', 'White-Label Exporte, Kundenlinks und Monitoring.'],
                ].map(([title, text]) => (
                  <button
                    key={title}
                    onClick={() => title === 'Agentur Reports' ? openProjectSection('reports') : undefined}
                    className="group min-h-[128px] rounded-lg border border-[#dfe3ea] bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#D4AF37] hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <span className="mb-4 block h-1.5 w-12 rounded-full bg-[#D4AF37]" />
                    <h3 className="text-[15px] font-black text-[#172033] dark:text-zinc-100">{title}</h3>
                    <p className="mt-2 text-[12px] font-semibold leading-relaxed text-[#667085] dark:text-zinc-400">{text}</p>
                  </button>
                ))}
              </section>
              <section className="mb-[60px] mt-10 relative">
                <span className="text-[12px] uppercase tracking-[1px] font-semibold text-[#888888] mb-[10px] block">Website oder Git-URL</span>
                <form onSubmit={handleAnalyze} className="flex flex-col md:flex-row items-end gap-6">
                  <div className="relative w-full flex-grow">
                    <Globe className="w-6 h-6 absolute right-2 bottom-3 opacity-20" />
                    <input 
                      type="text" 
                      placeholder="https://deine-website.de" 
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="w-full bg-transparent border-none border-b-[3px] border-[#1A1A1A] dark:border-zinc-50 text-[24px] md:text-[32px] py-[10px] pr-10 font-light outline-none rounded-none placeholder:text-[#888888] dark:placeholder:text-zinc-500 focus:border-[#D4AF37] transition-colors"
                      disabled={isLoading}
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={isLoading || !url}
                    className="bg-[#1A1A1A] dark:bg-zinc-100 hover:bg-[#D4AF37] text-white dark:text-zinc-900 px-8 py-5 uppercase text-[12px] tracking-[2px] font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-3 w-full md:w-auto"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Analysieren
                  </button>
                </form>
                {error && <div className="mt-6 p-4 border border-[#EB5757]/30 bg-[#EB5757]/5 text-[#EB5757] flex items-start gap-3"><AlertCircle className="w-5 h-5 mt-0.5" /><p className="text-sm font-semibold">{error}</p></div>}
                <p className="text-[11px] text-[#888888] uppercase tracking-[1px] font-semibold max-w-[500px] mt-8 leading-[1.6]">KI-gestützte Analyse für SEO, Security, Performance & DSGVO.</p>
              </section>

              {isLoading && <LoadingDisplay plan={accountPlan} />}
              {report && !isLoading && (
                <ReportResultsView 
                  report={report} 
                  rawScrapeData={rawScrapeData} 
                  gscData={gscData} 
                  isGscLoading={isGscLoading} 
                  onConnectGSC={handleConnectGSC} 
                  gscError={gscError} 
                  onExportActionPlan={exportActionPlanToCSV} 
                  plan={currentReportPlan}
                  setActiveView={navigateToView}
                />
              )}
            </>
          )}

          {activeView === 'projects' && <ProjectsOverviewView onSelectProject={handleSelectProject} targetTab={projectInitialTab} />}

          {activeView === 'project' && selectedProject && (
            <ProjectDashboardView 
              key={`${selectedProject.id}-${projectInitialTab}`}
              project={selectedProject} 
              initialTab={projectInitialTab}
              onSelectProject={handleSelectProject}
              onStartScan={(url) => handleAnalyze(undefined, url)} 
              isLoading={isLoading} 
              report={report && lastAnalyzedUrl === selectedProject.url ? report : null} 
              rawScrapeData={rawScrapeData} 
              gscData={gscData} 
              isGscLoading={isGscLoading} 
              onConnectGSC={handleConnectGSC} 
              gscError={gscError} 
              onExportActionPlan={exportActionPlanToCSV} 
              plan={currentReportPlan}
              setActiveView={navigateToView}
            />
          )}

          {activeView === 'settings' && <SettingsView />}
          {activeView === 'profile' && <ProfileView />}
          {activeView === 'pricing' && <PricingSection />}
          {activeView === 'team' && <TeamWorkspace user={user} userData={userData} />}
        </div>

        <footer className="mt-20 pt-6 border-t border-[#1A1A1A] dark:border-zinc-700 flex flex-col gap-6 opacity-70 print:hidden">
          <div className="flex flex-col sm:flex-row gap-8 justify-between">
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-[1px] font-semibold mb-2">Letzter Scan: {new Date().toLocaleDateString('de-DE')}</p>
              <div className="flex gap-4">
                <a href="/impressum" className="text-[10px] uppercase font-bold hover:text-[#D4AF37]">Impressum</a>
                <a href="/datenschutz" className="text-[10px] uppercase font-bold hover:text-[#D4AF37]">Datenschutz</a>
                <a href="/agb" className="text-[10px] uppercase font-bold hover:text-[#D4AF37]">AGB</a>
              </div>
            </div>
            <div className="flex-1 sm:text-right">
              <p className="text-[11px] uppercase tracking-[1px] font-semibold mb-2">Modus: Deep Analysis (AI-Enhanced)</p>
              <p className="text-[8px] uppercase tracking-[1px] opacity-40">By using this service, you consent to our Cookie policy.</p>
            </div>
          </div>
        </footer>
      </div>
    </main>
      )}
    </>
  );
}
