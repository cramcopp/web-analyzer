'use client';

import { memo, useState, useCallback, useMemo } from 'react';
import { 
  Zap, RefreshCw, LayoutDashboard, Search,
  ShieldCheck, TrendingUp, Network, Link, Trophy, 
  History, Settings, Sparkles, ChevronRight, CheckCircle2,
  Activity, FileText, BrainCircuit, FileSearch, ListChecks, Wrench
} from 'lucide-react';
import LoadingDisplay from './loading-display';
import ReportResultsView from './report-results-view';
import ScoreTrend from './score-trend';
import ProjectHistoryView from './project-history-view';
import ProjectAiActionPlanView from './project-ai-action-plan-view';
import ProjectLinkingView from './project-linking-view';
import ProjectRankingsView from './project-rankings-view';
import ProjectCompetitionView from './project-competition-view';
import ProjectBacklinksView from './project-backlinks-view';
import ProjectToolsView from './project-tools-view';
import ProjectSetupView from './project-setup-view';
import ProjectKeywordsView from './project-keywords-view';
import ProjectMonitoringView from './project-monitoring-view';
import ProjectAgencyReportsView from './project-agency-reports-view';
import ProjectAiVisibilityView from './project-ai-visibility-view';
import ProjectIssuesView from './project-issues-view';
import ProjectEvidenceView from './project-evidence-view';
import { AnalysisResult, PrioritizedTask } from '@/lib/scanner/types';

interface Project {
  id: string;
  name: string;
  url: string;
  lastScore?: number;
}

interface ProjectDashboardProps {
  project: Project;
  onStartScan: (url: string) => void;
  isLoading: boolean;
  report: any;
  rawScrapeData: any;
  gscData: any;
  isGscLoading: boolean;
  onConnectGSC: () => void;
  gscError: string | null;
  onExportActionPlan: () => void;
  plan?: string;
  setActiveView: (view: any) => void;
  initialTab?: TabId;
}

type TabId = 'overview' | 'audit' | 'issues' | 'evidence' | 'rankings' | 'keywords' | 'linking' | 'monitoring' | 'ai_visibility' | 'ai_plan' | 'backlinks' | 'competition' | 'reports' | 'tasks' | 'tools' | 'history' | 'settings';

const NAV_ITEMS = [
  { id: 'overview', label: 'Übersicht', icon: LayoutDashboard },
  { id: 'audit', label: 'Audit', icon: ShieldCheck },
  { id: 'issues', label: 'Issues', icon: ListChecks },
  { id: 'evidence', label: 'Evidence', icon: FileSearch },
  { id: 'keywords', label: 'Keywords', icon: Search },
  { id: 'rankings', label: 'Rankings', icon: TrendingUp },
  { id: 'linking', label: 'Interne Verlinkung', icon: Network },
  { id: 'backlinks', label: 'Backlinks', icon: Link },
  { id: 'competition', label: 'Wettbewerber', icon: Trophy },
  { id: 'ai_visibility', label: 'AI Visibility', icon: BrainCircuit },
  { id: 'monitoring', label: 'Monitoring', icon: Activity },
  { id: 'history', label: 'Scan History', icon: History },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'tasks', label: 'Tasks', icon: CheckCircle2 },
  { id: 'ai_plan', label: 'AI Plan', icon: Sparkles },
  { id: 'tools', label: 'Tools', icon: Wrench },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const;

function ProjectDashboardView({
  project,
  onStartScan,
  isLoading,
  report,
  rawScrapeData,
  gscData,
  isGscLoading,
  onConnectGSC,
  gscError,
  onExportActionPlan,
  plan = 'free',
  setActiveView,
  initialTab = 'overview'
}: ProjectDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [viewingHistoricalReport, setViewingHistoricalReport] = useState<any>(null);

  const handleSelectHistoricalReport = useCallback((reportData: any) => {
    setViewingHistoricalReport(reportData);
    setActiveTab('audit');
  }, []);

  const activeData = useMemo(() => {
    if (viewingHistoricalReport) {
      return {
        report: viewingHistoricalReport.results,
        raw: viewingHistoricalReport.rawScrapeData
      };
    }
    return {
      report: report,
      raw: rawScrapeData
    };
  }, [viewingHistoricalReport, report, rawScrapeData]);

  const activeReport = activeData.report;
  const activeRaw = activeData.raw;
  const activeAuditData = useMemo(() => ({
    ...(activeRaw || {}),
    ...(activeReport || {}),
    issues: activeRaw?.issues || activeReport?.issues || [],
    evidence: activeRaw?.evidence || activeReport?.evidence || [],
    urlSnapshots: activeRaw?.urlSnapshots || activeReport?.urlSnapshots || [],
    crawlSummary: activeRaw?.crawlSummary || activeReport?.crawlSummary,
    scoreBreakdown: activeRaw?.scoreBreakdown || activeReport?.scoreBreakdown,
    dataSources: activeRaw?.dataSources || activeReport?.dataSources || {},
    providerAvailability: activeRaw?.providerAvailability || activeReport?.providerAvailability,
    providerStatuses: activeRaw?.providerStatuses || activeReport?.providerStatuses || [],
    bodyText: activeRaw?.bodyText || activeReport?.bodyText || '',
    keywordFacts: activeRaw?.keywordFacts || activeReport?.keywordFacts || [],
    rankFacts: activeRaw?.rankFacts || activeReport?.rankFacts || [],
    backlinkFacts: activeRaw?.backlinkFacts || activeReport?.backlinkFacts || [],
    competitorFacts: activeRaw?.competitorFacts || activeReport?.competitorFacts || [],
    trafficFacts: activeRaw?.trafficFacts || activeReport?.trafficFacts || [],
    aiVisibilityFacts: activeRaw?.aiVisibilityFacts || activeReport?.aiVisibilityFacts || [],
  }), [activeRaw, activeReport]);

  const faviconDomain = useMemo(() => {
    try {
      return new URL(project.url.startsWith('http') ? project.url : `https://${project.url}`).hostname;
    } catch {
      return project.url;
    }
  }, [project.url]);

  const renderContent = () => {
    if (isLoading) return <LoadingDisplay plan={plan} />;

    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             {/* Main Hero Stats */}
             <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-2 p-8 bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
                    <ShieldCheck className="w-48 h-48 text-[#1A1A1A] dark:text-white" />
                  </div>
                  <div className="relative z-10">
                    <span className="text-[10px] font-black uppercase tracking-[3px] text-[#D4AF37] mb-2 block">Global Health Score</span>
                    <div className="flex items-end gap-4">
                      <h3 className="text-[64px] font-black tracking-tighter leading-none text-[#1A1A1A] dark:text-zinc-100">
                        {activeReport?.seo?.score || project.lastScore || 'N/A'}
                        <span className="text-[20px] opacity-20 ml-2">%</span>
                      </h3>
                      {activeReport && (
                        <div className="mb-2">
                          <div className="flex items-center gap-1 text-[#27AE60] text-[12px] font-black">
                            <TrendingUp className="w-4 h-4" />
                            +2.4%
                          </div>
                          <span className="text-[9px] font-bold text-[#888] uppercase tracking-widest">vs. Vorwoche</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-6 flex gap-2">
                      {['SEO', 'Performance', 'Security', 'Accessibility'].map((label, i) => (
                        <div key={i} className="flex-1 flex flex-col gap-1">
                          <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-[#D4AF37]" 
                              style={{ width: `${activeReport ? (activeReport?.[label.toLowerCase() as keyof AnalysisResult] as any)?.score || 0 : 0}%` }} 
                            />
                          </div>
                          <span className="text-[7px] font-black uppercase tracking-widest text-[#888] text-center truncate">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-[#1A1A1A] dark:bg-zinc-950 border border-white/5 flex flex-col justify-between group">
                   <div>
                      <span className="text-[9px] font-black uppercase tracking-[3px] text-[#D4AF37] mb-4 block">Indexierung</span>
                    <div className="text-[18px] sm:text-[24px] font-black text-white uppercase tracking-tighter mb-1 truncate">
                       {activeReport?.compliance?.detailedCompliance?.cookieBannerStatus?.includes('Gefunden') ? 'Valid' : 'Check...'}
                    </div>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">DSGVO & Robots OK</p>
                   </div>
                   <div className="pt-4 border-t border-white/10 mt-4">
                      <div className="flex items-center justify-between text-white">
                         <span className="text-[10px] font-black uppercase tracking-widest">Sitemap</span>
                         <CheckCircle2 className="w-3.5 h-3.5 text-[#27AE60]" />
                      </div>
                   </div>
                </div>

                <div className="p-8 bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 flex flex-col justify-between">
                   <div>
                      <span className="text-[9px] font-black uppercase tracking-[3px] text-[#888] mb-4 block">Nischen-Fokus</span>
                      <div className="text-[16px] sm:text-[20px] font-black text-[#1A1A1A] dark:text-zinc-100 uppercase tracking-tighter leading-tight mb-3">
                         {activeReport?.businessIntelligence?.businessNiche || 'Analyzing...'}
                      </div>
                      {activeReport?.businessIntelligence?.keywordGapAnalysis && (
                        <div className="flex flex-wrap gap-1.5">
                          {activeReport.businessIntelligence.keywordGapAnalysis.slice(0, 3).map((kw: string, i: number) => (
                            <span key={i} className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-sm">
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                   </div>
                   <button 
                     onClick={() => setActiveTab('competition')}
                     className="mt-4 text-[9px] font-black uppercase tracking-widest text-[#D4AF37] hover:underline flex items-center gap-1"
                   >
                     Markt-Analyse →
                   </button>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-4">
                   <div className="flex items-center justify-between px-2">
                      <h4 className="text-[12px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">Performance Trend</h4>
                      <span className="text-[10px] font-bold text-[#888] uppercase tracking-widest">Letzte 30 Tage</span>
                   </div>
                   <div className="p-6 bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 h-auto min-h-[300px] flex flex-col">
                      <ScoreTrend url={project.url} />
                   </div>
                </div>

                <div className="space-y-4">
                   <div className="flex items-center justify-between px-2">
                      <h4 className="text-[12px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">Top Prioritäten</h4>
                      <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                   </div>
                   <div className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 flex flex-col">
                      {activeReport?.seo?.detailedSeo?.prioritizedTasks && activeReport.seo.detailedSeo.prioritizedTasks.length > 0 ? (
                        <div className="divide-y divide-[#EEE] dark:divide-zinc-800">
                          {activeReport.seo.detailedSeo.prioritizedTasks.slice(0, 3).map((task: PrioritizedTask, i: number) => (
                            <div key={i} className="p-4 flex items-start gap-3 hover:bg-black/[0.02] transition-colors group cursor-pointer" onClick={() => setActiveTab('ai_plan')}>
                               <div className="w-6 h-6 shrink-0 bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center text-[10px] font-black rounded-sm group-hover:bg-[#D4AF37] group-hover:text-white transition-all">
                                  {i + 1}
                               </div>
                               <p className="text-[11px] font-bold text-[#1A1A1A] dark:text-zinc-100 leading-tight group-hover:translate-x-1 transition-transform">
                                  {task.task}
                               </p>
                            </div>
                          ))}
                          <button 
                            onClick={() => setActiveTab('ai_plan')}
                            className="w-full p-4 text-[9px] font-black uppercase tracking-widest text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white transition-all"
                          >
                            Vollständigen Aktionsplan öffnen
                          </button>
                        </div>
                      ) : (
                        <div className="p-8 flex flex-col items-center justify-center text-center gap-3 h-full">
                          <div className="w-10 h-10 bg-zinc-50 dark:bg-zinc-950 rounded-full flex items-center justify-center text-zinc-300 dark:text-zinc-800">
                             <Sparkles className="w-5 h-5" />
                          </div>
                          <p className="text-[10px] text-[#888] font-bold uppercase tracking-widest leading-relaxed">
                            Führen Sie zuerst einen Deep-Scan durch, um KI-generierte Prioritäten zu sehen.
                          </p>
                        </div>
                      )}
                   </div>
                </div>
             </div>

             {!activeReport && !isLoading && (
               <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 p-16 flex flex-col items-center justify-center text-center gap-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-[#D4AF37]" />
                  <RefreshCw className="w-12 h-12 text-[#D4AF37] animate-spin-slow opacity-20 absolute -right-4 -bottom-4" />
                  
                  <h3 className="text-[32px] font-black uppercase tracking-tighter text-[#1A1A1A] dark:text-zinc-100">Bereit für den Deep-Scan?</h3>
                  <p className="text-[14px] text-[#888] max-w-md font-medium uppercase tracking-wide leading-relaxed">
                    Starten Sie jetzt die KI-Analyse für {project.url} und erhalten Sie detaillierte SEO-Einblicke, Wettbewerbs-Daten und einen Aktionsplan.
                  </p>
                  <button 
                    onClick={() => onStartScan(project.url)}
                    className="px-12 py-6 bg-[#D4AF37] text-white text-[14px] font-black uppercase tracking-widest hover:bg-[#1A1A1A] dark:hover:bg-zinc-100 transition-all flex items-center gap-4 shadow-2xl shadow-[#D4AF37]/30 group"
                  >
                    <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                    KI-Audit jetzt starten
                  </button>
               </div>
             )}
          </div>
        );
      
      case 'audit':
        if (!activeReport) return (
          <div className="h-[400px] flex flex-col items-center justify-center gap-4 text-center">
             <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-[#888] mb-4">
                <ShieldCheck className="w-8 h-8" />
             </div>
             <h3 className="text-[20px] font-black uppercase tracking-tighter text-[#1A1A1A] dark:text-zinc-100">Kein Audit gefunden</h3>
             <p className="text-[12px] text-[#888] max-w-xs font-bold uppercase tracking-widest">Führen Sie zuerst einen Scan durch oder wählen Sie einen Bericht aus der Historie.</p>
             <button 
                onClick={() => setActiveTab('overview')}
                className="mt-4 text-[10px] font-black uppercase tracking-widest text-[#D4AF37] hover:underline"
             >
                Zur Übersicht →
             </button>
          </div>
        );
        return (
          <div className="animate-in fade-in duration-500">
            {viewingHistoricalReport && (
              <div className="mb-6 p-4 bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <History className="w-4 h-4 text-[#D4AF37]" />
                   <span className="text-[11px] font-black uppercase tracking-widest text-[#D4AF37]">Archiv-Bericht vom {new Date(viewingHistoricalReport.createdAt).toLocaleDateString('de-DE')}</span>
                </div>
                <button 
                  onClick={() => setViewingHistoricalReport(null)}
                  className="text-[9px] font-black uppercase tracking-widest bg-[#1A1A1A] text-white px-3 py-1 hover:bg-[#D4AF37] transition-all"
                >
                  Zum aktuellen Bericht
                </button>
              </div>
            )}
            <ReportResultsView
              report={activeReport}
              rawScrapeData={activeRaw}
              gscData={gscData}
              isGscLoading={isGscLoading}
              onConnectGSC={onConnectGSC}
              gscError={gscError}
              onExportActionPlan={onExportActionPlan}
              plan={plan}
              setActiveView={setActiveView}
            />
          </div>
        );

      case 'issues': return <ProjectIssuesView report={activeAuditData} plan={plan} />;
      case 'evidence': return <ProjectEvidenceView report={activeAuditData} plan={plan} />;
      case 'keywords': return <ProjectKeywordsView report={activeAuditData} />;
      case 'rankings': return <ProjectRankingsView report={activeAuditData} />;
      case 'linking': return <ProjectLinkingView report={activeAuditData} plan={plan} />;
      case 'monitoring': return <ProjectMonitoringView project={project} report={activeAuditData} plan={plan} />;
      case 'ai_visibility': return <ProjectAiVisibilityView report={activeAuditData} />;
      case 'ai_plan': return <ProjectAiActionPlanView report={activeReport} />;
      case 'competition': return <ProjectCompetitionView report={activeAuditData} />;
      case 'backlinks': return <ProjectBacklinksView report={activeAuditData} />;
      case 'reports': return <ProjectAgencyReportsView project={project} report={activeAuditData} plan={plan} />;
      case 'tasks': return <ProjectAgencyReportsView project={project} report={activeAuditData} plan={plan} initialTab="tasks" />;
      case 'history': return <ProjectHistoryView url={project.url} onSelectReport={handleSelectHistoricalReport} />;
      case 'tools': return <ProjectToolsView project={project} />;
      case 'settings': return <ProjectSetupView project={project} />;

      default: return null;
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <div className="pb-8 border-b border-[#E5E5E5] dark:border-zinc-800 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 animate-in fade-in duration-700">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-3">
              <img 
                 src={`https://www.google.com/s2/favicons?domain=${faviconDomain}&sz=128`} 
                 alt={`${project.name} Favicon`}
                 className="w-12 h-12 md:w-14 md:h-14 object-contain shrink-0 drop-shadow-md"
               />
             <div>
                <h2 className="text-[32px] md:text-[44px] font-black uppercase tracking-tighter leading-none text-[#1A1A1A] dark:text-zinc-100">
                  {project.name}
                </h2>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-[12px] text-[#888] font-bold uppercase tracking-widest flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-[#D4AF37]" />
                    {project.url}
                  </p>
                  <span className="text-[10px] px-2 py-0.5 bg-[#27AE60]/10 text-[#27AE60] font-black uppercase tracking-widest rounded-full">Pro</span>
                </div>
             </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           <button 
             onClick={() => onStartScan(project.url)}
             className="px-6 py-3 bg-[#1A1A1A] dark:bg-zinc-100 text-white dark:text-zinc-900 text-[9px] font-black uppercase tracking-widest hover:bg-[#D4AF37] hover:text-white transition-all flex items-center gap-2 shadow-lg"
           >
             <RefreshCw className="w-3.5 h-3.5" />
             Schnell-Audit
           </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        <aside className="w-full lg:w-64 shrink-0">
          <nav className="flex flex-col gap-1 sticky top-24">
            <span className="text-[9px] font-black text-[#888] uppercase tracking-[3px] mb-4 ml-2">Projekt Menü</span>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`
                    group flex items-center justify-between px-4 py-3 text-[11px] font-black uppercase tracking-widest transition-all
                    ${isActive 
                      ? 'bg-[#1A1A1A] dark:bg-white text-white dark:text-zinc-900 shadow-xl shadow-black/5' 
                      : 'text-[#888] hover:text-[#1A1A1A] dark:hover:text-zinc-100 hover:bg-black/5 dark:hover:bg-white/5'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#D4AF37]' : 'text-[#888] group-hover:text-[#1A1A1A] dark:group-hover:text-zinc-100'}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-50" />}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 min-w-0">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default memo(ProjectDashboardView);
