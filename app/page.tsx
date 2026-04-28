'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Globe, Loader2, AlertCircle, CheckCircle, X, Zap, Star } from 'lucide-react';
import { Sidebar } from '../components/sidebar';
import { FloatingNav } from '../components/floating-nav';
import { generateReportClientSide } from './lib/generate-report';
import { useAuth } from '../components/auth-provider';
import PricingSection from '../components/PricingSection';
import TeamWorkspace from '../components/team-workspace';
import LoadingDisplay from '../components/loading-display';
import ReportResultsView from '../components/report-results-view';
import ProjectDashboardView from '../components/project-dashboard-view';
import SettingsView from '../components/settings-view';
import ProfileView from '../components/profile-view';
import { ReportData, PrioritizedTask, GscData } from '../types/report';
import { AnalysisResult } from '../lib/scanner';
import { Notification, Project } from '../types/common';
import { useTrial } from '../hooks/use-trial';

export default function WebsiteAnalyzer() {
  const { user, userData, loading: authLoading } = useAuth();
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
  const [activeView, setActiveView] = useState<'analyzer' | 'project' | 'settings' | 'profile' | 'pricing' | 'team'>('analyzer');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const { effectivePlan, trialDaysLeft, showTrialBadge, isInTrial } = useTrial();

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

  const handleLoadReport = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await fetch(`/api/reports/${id}`);
      if (!resp.ok) throw new Error('Report nicht gefunden.');
      const data = await resp.json();
      
      if (data.results) setReport(typeof data.results === 'string' ? JSON.parse(data.results) : data.results);
      if (data.rawScrapeData) setRawScrapeData(typeof data.rawScrapeData === 'string' ? JSON.parse(data.rawScrapeData) : data.rawScrapeData);
      
      setLastAnalyzedUrl(data.url);
      setUrl(data.url);
      setActiveView('analyzer');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Fehler beim Laden des Reports.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectProject = async (proj: Project) => {
    setSelectedProject(proj);
    if (proj.url) {
      setUrl(proj.url);
      // Automatically load latest report for this URL
      try {
        const resp = await fetch(`/api/reports?url=${encodeURIComponent(proj.url)}`);
        if (resp.ok) {
          const reports = await resp.json();
          if (reports && reports.length > 0) {
             const latest = reports.sort((a: any, b: any) => 
               new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
             )[0];
             
             if (latest.results) setReport(typeof latest.results === 'string' ? JSON.parse(latest.results) : latest.results);
             if (latest.rawScrapeData) setRawScrapeData(typeof latest.rawScrapeData === 'string' ? JSON.parse(latest.rawScrapeData) : latest.rawScrapeData);
             setLastAnalyzedUrl(proj.url);
          } else {
             setReport(null);
             setRawScrapeData(null);
          }
        }
      } catch (e) {
        console.error("Error loading latest report for project:", e);
      }
    }
    setActiveView('project');
  };

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

    try { new URL(targetUrl); } catch (err) {
      setError('Bitte gib eine gültige URL ein.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setReport(null);

    try {
      if (user && userData && (userData.scanCount || 0) >= (userData.maxScans || 5)) {
        if (userData.plan === 'free') {
          setActiveView('pricing');
          setIsLoading(false);
          return;
        } else {
          setError(`Limit von ${userData.maxScans} Scans erreicht.`);
          setIsLoading(false);
          return;
        }
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl, plan: effectivePlan }),
      });

      const scrapeData = await response.json();
      if (!response.ok) throw new Error(scrapeData.error || 'Website konnte nicht geladen werden.');
      
      if (scrapeData._cached && scrapeData._cachedReport) {
        setRawScrapeData(scrapeData);
        setReport(scrapeData._cachedReport);
        setLastAnalyzedUrl(targetUrl);
        addNotification('Analyse geladen', `Vorheriger Bericht für ${targetUrl} wurde aus dem Cache geladen.`);
        setIsLoading(false);
        return;
      }

      setRawScrapeData(scrapeData);
      const finalReport = await generateReportClientSide(scrapeData, effectivePlan);
      setReport(finalReport);
      setLastAnalyzedUrl(targetUrl);
      addNotification('Analyse abgeschlossen', `Bericht für ${targetUrl} ist bereit.`);

      if (user) {
        const avgScore = Math.round((
          (finalReport.seo?.score || 0) + 
          (finalReport.security?.score || 0) + 
          (finalReport.performance?.score || 0) + 
          (finalReport.accessibility?.score || 0) + 
          (finalReport.compliance?.score || 0) +
          (finalReport.contentStrategy?.score || 0)
        ) / 6);
        
        // Technical optimization: Prune large fields before saving to stay under Firestore limits
        const storageData = { ...scrapeData };
        delete storageData.bodyText; 

        await fetch('/api/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: targetUrl,
            score: avgScore,
            results: JSON.stringify(finalReport),
            rawScrapeData: JSON.stringify(storageData),
            seoScore: finalReport.seo?.score || 0,
            performanceScore: finalReport.performance?.score || 0,
            securityScore: finalReport.security?.score || 0,
            accessibilityScore: finalReport.accessibility?.score || 0,
            complianceScore: finalReport.compliance?.score || 0
          })
        });

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


  const handleConnectGSC = async () => {
    try {
      const resp = await fetch('/api/auth/google/url');
      const { url } = await resp.json();
      window.open(url, 'GSC Auth', 'width=600,height=700');
    } catch (err) {
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
    <main className="min-h-screen bg-[#F5F5F3] dark:bg-zinc-950 text-[#1A1A1A] dark:text-zinc-100 font-sans overflow-x-hidden md:pl-16 relative transition-colors duration-500">
      <Sidebar 
        onLoadReport={handleLoadReport}
        onSelectProject={handleSelectProject}
        onOpenSettings={() => setActiveView('settings')}
        onOpenProfile={() => setActiveView('profile')}
        onOpenPricing={() => setActiveView('pricing')}
        isNotifOpen={isNotifOpen}
        setIsNotifOpen={setIsNotifOpen}
        notifications={notifications}
        setNotifications={setNotifications}
        onLogout={() => { setActiveView('analyzer'); setReport(null); setUrl(''); }}
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
          <header className="mb-10 flex flex-col md:flex-row md:justify-between md:items-start gap-8">
            <h1 
              className="text-[40px] sm:text-[50px] md:text-[82px] leading-[0.85] tracking-[-3px] font-bold uppercase max-w-[200px] sm:max-w-[500px] cursor-pointer hover:text-[#D4AF37] transition-all duration-500" 
              onClick={() => setActiveView('analyzer')}
            >
              {activeView === 'analyzer' ? 'Website Analyzer Pro' : 'WAP'}
            </h1>
            <div className="md:text-right flex flex-col gap-3 items-end">
              {(!userData?.plan || userData.plan === 'free') && (
                <button 
                  onClick={() => setActiveView('pricing')}
                  className="text-[10px] font-black uppercase tracking-[2px] text-[#D4AF37] border border-[#D4AF37]/30 px-3 py-1.5 hover:bg-[#D4AF37] hover:text-white transition-all flex items-center gap-2 group"
                >
                  <Star className="w-3 h-3 group-hover:rotate-12 transition-transform" />
                  7 TAGE GRATIS TESTEN
                </button>
              )}
              {user && userData && (
                <div className="flex flex-col items-end opacity-80 mt-1">
                   <span className="text-[11px] font-black tracking-tighter">{userData?.scanCount || 0} / {userData?.maxScans || 5} <span className="text-[9px] font-bold text-[#888] uppercase ml-1">Analysen übrig</span></span>
                   <div className="w-32 h-1 bg-black/5 dark:bg-white/10 mt-1.5 overflow-hidden rounded-full">
                     <div 
                       className={`h-full transition-all duration-1000 ${ ((userData?.scanCount || 0) / (userData?.maxScans || 5)) > 0.8 ? 'bg-[#EB5757]' : 'bg-[#D4AF37]' }`} 
                       style={{ width: `${Math.min(100, ((userData?.scanCount || 0) / (userData?.maxScans || 5)) * 100)}%` }}
                     />
                   </div>
                </div>
              )}
            </div>
          </header>

          {activeView === 'analyzer' && (
            <>
              {isInTrial && (
                <div className="mb-8 p-4 bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-widest text-[#D4AF37]">Testphase aktiv: Noch {trialDaysLeft} Tage verbleibend</span>
                  <button onClick={() => setActiveView('pricing')} className="text-[10px] font-bold uppercase underline text-[#D4AF37]">Jetzt upgraden</button>
                </div>
              )}
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

              {isLoading && <LoadingDisplay plan={effectivePlan} />}
              {report && !isLoading && (
                <ReportResultsView 
                  report={report} 
                  rawScrapeData={rawScrapeData} 
                  gscData={gscData} 
                  isGscLoading={isGscLoading} 
                  onConnectGSC={handleConnectGSC} 
                  gscError={gscError} 
                  onExportActionPlan={exportActionPlanToCSV} 
                  plan={effectivePlan} 
                  setActiveView={setActiveView} 
                />
              )}
            </>
          )}

          {activeView === 'project' && selectedProject && (
            <ProjectDashboardView 
              project={selectedProject} 
              onStartScan={(url) => handleAnalyze(undefined, url)} 
              isLoading={isLoading} 
              report={report && lastAnalyzedUrl === selectedProject.url ? report : null} 
              rawScrapeData={rawScrapeData} 
              gscData={gscData} 
              isGscLoading={isGscLoading} 
              onConnectGSC={handleConnectGSC} 
              gscError={gscError} 
              onExportActionPlan={exportActionPlanToCSV} 
              plan={effectivePlan} 
              setActiveView={setActiveView} 
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
  );
}
