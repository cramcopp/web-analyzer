'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, ShieldCheck, Zap, Globe, Scale, Loader2, AlertCircle, RefreshCw, UserCheck, Download, CodeXml, Share2, Filter, LayoutDashboard, LineChart as LineIcon, Activity, ExternalLink, Info, CheckCircle, X, Bell, AlertTriangle, ListChecks, ChevronUp, ChevronDown, Timer, Layout, MoveHorizontal, Lightbulb, BarChart3, MousePointer2, Eye, Rocket, Lock, Star } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, LineChart, Line, CartesianGrid } from 'recharts';
import { ThemeToggle } from '../components/theme-toggle';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import { Sidebar } from '../components/sidebar';
import { CollapsibleSection } from '../components/collapsible-section';
import { FloatingNav } from '../components/floating-nav';
import { generateReportClientSide } from './lib/generate-report';
import { useAuth } from '../components/auth-provider';
import { db, auth } from '../firebase';
import { collection, addDoc, doc, getDoc, updateDoc, increment, query, where, getDocs, limit } from 'firebase/firestore';
import PricingSection from '../components/PricingSection';
import { TeamWorkspace } from '../components/team-workspace';

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
  semanticStructure: string;
  ctaAnalysis: string;
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
  prioritizedTasks: PrioritizedTask[];
};

type DetailedSecurity = {
  sqlXssAssessment: string;
  headerAnalysis: string;
  softwareConfig: string;
  dataLeakageAssessment?: string;
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
  domComplexity: string;
  perfectionistTweaks: string;
  lighthouseMetrics?: {
    performance: number;
    accessibility?: number;
    bestPractices?: number;
    seo?: number;
  };
  coreWebVitals?: {
    fcp: { value: string, numericValue: number, status: 'good' | 'needs_improvement' | 'poor', recommendation: string };
    lcp: { value: string, numericValue: number, status: 'good' | 'needs_improvement' | 'poor', recommendation: string };
    cls: { value: string, numericValue: number, status: 'good' | 'needs_improvement' | 'poor', recommendation: string };
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
  businessIntelligence?: {
    businessNiche: string;
    targetAudience: string;
    keywordGapAnalysis: string[];
    toneAndReadabilityAlignment?: string;
  };
  overallAssessment: string;
  industryNews?: string[];
  seo: SeoReportSection;
  security: SecurityReportSection;
  performance: PerformanceReportSection;
  accessibility: AccessibilityReportSection;
  compliance: ComplianceReportSection;
};

const METRIC_DEFINITIONS: Record<string, string> = {
  FCP: "First Contentful Paint (FCP) misst die Zeit, bis das erste DOM-Element (Text, Bild, etc.) gerendert wird. Ein schneller FCP gibt dem Nutzer das Gefühl, dass die Seite sofort reagiert.",
  LCP: "Largest Contentful Paint (LCP) misst die Ladezeit des größten sichtbaren Elements (z.B. Hero-Bild oder Headline). Ein Wert unter 2.5s gilt als optimal für ein gutes Nutzererlebnis.",
  TBT: "Total Blocking Time (TBT) zeigt, wie lange der Hauptthread blockiert ist und nicht auf Eingaben reagieren kann. Niedrige Werte bedeuten eine hohe Interaktivität.",
  TTFB: "Time to First Byte (TTFB) ist die Zeit vom Request bis zum ersten empfangenen Byte. Sie reflektiert primär die Serverleistung und Netzwerklatenz.",
  CLS: "Cumulative Layout Shift (CLS) misst unerwartete Layout-Verschiebungen während des Ladens. Ein stabiles Layout (Wert < 0.1) verhindert Frustration beim Nutzer.",
  FID: "First Input Delay (FID) misst die Zeit von der ersten Interaktion (Klick) bis zur Reaktion des Browsers. Wichtig für die empfundene Geschwindigkeit."
};

const ResourceTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white/95 dark:bg-black/95 backdrop-blur-md border border-[#DDD] dark:border-white/10 p-4 shadow-2xl rounded-sm">
        <div className="flex items-center gap-2 mb-2">
           <div className="w-2 h-2 rounded-full bg-[#D4AF37]"></div>
           <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-wider">{data.name}</p>
        </div>
        <p className="text-[18px] text-[#1A1A1A] dark:text-white font-black leading-none">{data.count} <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest ml-1">Requests</span></p>
        <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5">
           <p className="text-[10px] text-[#555] dark:text-zinc-400 font-medium leading-relaxed italic">
             Diese Zahl gibt an, wie viele separate Anfragen für {data.name}-Dateien gesendet wurden. Eine hohe Anzahl kann das Laden verzögern.
           </p>
        </div>
      </div>
    );
  }
  return null;
};

function PrioritizedTasksSection({ tasks, title, accentColor }: { tasks: PrioritizedTask[], title: string, accentColor: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!tasks || tasks.length === 0) return null;

  const getPriorityScore = (prio: string) => {
    const p = prio.toLowerCase();
    if (p.includes('critical') || p.includes('high') || p.includes('hoch') || p.includes('kritisch')) return 3;
    if (p.includes('important') || p.includes('medium') || p.includes('mittel')) return 2;
    return 1;
  };

  const getPriorityColor = (prio: string) => {
    const p = prio.toLowerCase();
    if (p.includes('critical') || p.includes('high') || p.includes('hoch') || p.includes('kritisch')) return 'bg-red-500/10 text-red-600 border-red-500/20'; // Soft red
    if (p.includes('important') || p.includes('medium') || p.includes('mittel')) return 'bg-orange-500/10 text-orange-600 border-orange-500/20'; // Soft orange
    return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'; // Soft green
  };

  const getPriorityBadgeName = (prio: string) => {
    const p = prio.toLowerCase();
    if (p.includes('critical') || p.includes('high') || p.includes('hoch') || p.includes('kritisch')) return '🚨 KRITISCH';
    if (p.includes('important') || p.includes('medium') || p.includes('mittel')) return '⚠️ WICHTIG';
    return '✨ OPTIMAL';
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    return getPriorityScore(b.priority) - getPriorityScore(a.priority);
  });

  const displayedTasks = isExpanded ? sortedTasks : sortedTasks.slice(0, 3);
  const hasMore = sortedTasks.length > 3;

  return (
    <div className="border-t border-[#1A1A1A] dark:border-zinc-700 pt-[25px]">
      <div className="flex items-center justify-between gap-4 mb-[20px]">
        <h4 className="text-[14px] font-black uppercase text-[#1A1A1A] dark:text-zinc-100 tracking-wider flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-[#D4AF37]" />
          {title}
        </h4>
        {hasMore && (
           <span className="text-[10px] font-bold text-[#888] uppercase tracking-widest">{sortedTasks.length} Aufgaben total</span>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {displayedTasks.map((task, i) => (
          <div key={i} className="flex flex-col gap-2 p-4 bg-[#F9F9F9] dark:bg-zinc-900 border-l-[4px] transition-all" style={{ borderLeftColor: accentColor }}>
            <div className="flex items-start gap-4">
              <div className="shrink-0 pt-0.5">
                <span className={`text-[9px] font-black uppercase tracking-[0.5px] px-[8px] py-[3px] rounded-sm border ${getPriorityColor(task.priority)} flex items-center justify-center`}>
                  {getPriorityBadgeName(task.priority || 'PERFECTION')}
                </span>
              </div>
              <div className="flex flex-col gap-1 w-full">
                <span className="text-[12px] text-[#1A1A1A] dark:text-zinc-100 font-bold leading-[1.4]">{task.task}</span>
                {task.remediation && (
                  <div className="mt-2 bg-[#FFFFFF] dark:bg-zinc-950/50 p-3 border border-[#EEE] dark:border-zinc-800/80 w-full relative">
                    <div className="absolute top-0 left-0 w-0.5 h-full bg-[#D4AF37] opacity-60"></div>
                    <span className="text-[9px] uppercase font-black text-[#D4AF37] mb-1 block tracking-widest flex items-center gap-1.5"><Zap className="w-3 h-3"/> AI Lösung</span>
                    <p className="text-[11px] text-[#444] dark:text-zinc-400 font-medium leading-relaxed italic">{task.remediation}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-4 w-full py-3 bg-[#F5F5F3] dark:bg-zinc-800 text-[10px] font-black uppercase tracking-widest text-[#888] hover:text-[#1A1A1A] dark:hover:text-zinc-100 transition-colors border-dashed border border-[#E5E5E5] dark:border-zinc-700 flex items-center justify-center gap-2"
        >
          {isExpanded ? (
            <>Weniger anzeigen <ChevronUp className="w-3 h-3" /></>
          ) : (
            <>Alle {sortedTasks.length} Aufgaben anzeigen <ChevronDown className="w-3 h-3" /></>
          )}
        </button>
      )}
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
    const isCritical = data.value > 2500;
    const isWarning = data.value > 1500;
    
    return (
      <div className="bg-white/95 dark:bg-black/95 backdrop-blur-md border border-[#DDD] dark:border-white/10 p-4 shadow-2xl rounded-sm max-w-[240px]">
        <div className="flex items-center justify-between mb-2">
           <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-wider">{data.metric}</p>
           <span className={`w-2 h-2 rounded-full ${isCritical ? 'bg-[#EB5757]' : isWarning ? 'bg-[#F2994A]' : 'bg-[#27AE60]'}`}></span>
        </div>
        <p className="text-[20px] text-[#1A1A1A] dark:text-white font-black leading-none mb-3">
          {data.value} <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest ml-1">ms</span>
        </p>
        {definition && (
          <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/5">
            <p className="text-[10px] text-[#444] dark:text-zinc-400 leading-relaxed font-medium">
              {definition}
            </p>
          </div>
        )}
      </div>
    );
  }
  return null;
};

function FloatingScannerProgress({ progress, stepIndex, steps }: { progress: number, stepIndex: number, steps: string[] }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-1.5 bg-transparent pointer-events-none">
       <div 
         className="h-full bg-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.8)] transition-all duration-700 ease-out" 
         style={{ width: `${progress}%` }}
       />
    </div>
  );
}

function LoadingDisplay({ plan = 'free' }: { plan?: string }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const modelName = plan === 'agency' ? "WAP Enterprise v3" : plan === 'pro' ? "WAP Advanced v2" : "WAP Standard v1";

  const steps = [
    `Initialisiere ${modelName} Intelligence...`,
    "Analysiere mit Gemini-Power...",
    "Crawle Webseiteninhalte...",
    "Analysiere Unterseiten...",
    "Generiere SEO-Report...",
    "Führe Security-Audit durch...",
    "Analysiere Performance-Metriken...",
    "Prüfe Barrierefreiheit...",
    "Kombiniere KI-Erkenntnisse..."
  ];

  useEffect(() => {
    // Progress bar animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 98) return prev;
        // Slow down progress as it goes higher
        const increment = prev < 50 ? Math.random() * 8 : Math.random() * 2;
        return Math.min(prev + increment, 98);
      });
    }, 1000);

    // Text step cycling
    const stepInterval = setInterval(() => {
      setStepIndex(prev => Math.min(prev + 1, steps.length - 1));
    }, 5500);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
    };
  }, [steps.length]);

  return (
    <>
      <FloatingScannerProgress progress={progress} stepIndex={stepIndex} steps={steps} />
      <div className="py-24 flex flex-col items-center justify-center text-[#1A1A1A] dark:text-zinc-100 gap-6">
        <div className="text-center">
          <span className="text-[64px] font-black tracking-tighter leading-none text-[#1A1A1A] dark:text-white flex items-center justify-center">
            {Math.round(progress)}
            <span className="text-[24px] font-bold opacity-30 ml-2">%</span>
          </span>
        </div>
        
        <div className="w-full max-w-[400px] flex flex-col items-center">
          <p className="text-[18px] font-bold uppercase tracking-[1px] text-[#1A1A1A] dark:text-zinc-100 mb-6 h-[24px]">
            {steps[stepIndex]}
          </p>
          
          {/* Enhanced Progress Bar Container */}
          <div className="w-full h-1.5 bg-[#E5E5E5] dark:bg-zinc-800/50 rounded-full overflow-hidden mb-4 relative shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-[#D4AF37] to-[#FFD700] shadow-[0_0_10px_rgba(212,175,55,0.4)] transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-[11px] uppercase text-[#888888] dark:text-zinc-500 tracking-[1.5px] font-bold">
            KI-Analyse läuft <span className="animate-pulse">...</span>
          </p>
        </div>
      </div>
    </>
  );
}

function ReportResultsView({
  report,
  rawScrapeData,
  gscData,
  isGscLoading,
  onConnectGSC,
  gscError,
  onExportActionPlan,
  setActiveView,
  plan = 'free',
}: {
  report: any;
  rawScrapeData: any;
  gscData: any;
  isGscLoading: boolean;
  onConnectGSC: () => void;
  gscError: string | null;
  onExportActionPlan: () => void;
  plan?: string;
  setActiveView: (view: 'analyzer' | 'project' | 'settings' | 'profile' | 'pricing' | 'team') => void;
}) {
  const modelName = plan === 'agency' ? "WAP Enterprise v3" : plan === 'pro' ? "WAP Advanced v2" : "WAP Standard v1";
  
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 relative">
      {/* Sticky Upgrade Banner for Free Users */}
      {plan === 'free' && (
        <div className="sticky top-0 z-[60] bg-[#27AE60] text-white py-3 px-6 flex items-center justify-between shadow-xl -mx-4 md:mx-0 mb-8 animate-in slide-in-from-top duration-500">
           <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 animate-pulse" />
              <div className="flex flex-col">
                <span className="text-[12px] font-black uppercase tracking-widest hidden md:inline">Eingeschränkte Analyse aktiv</span>
                <span className="text-[11px] font-bold">Starte deine 7-tägige Testphase für 100% Deep-Analysis Power!</span>
              </div>
           </div>
           <button 
             onClick={() => setActiveView('pricing')}
             className="bg-[#1A1A1A] text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all flex items-center gap-2 shadow-lg"
           >
             JETZT GRATIS TESTEN
             <Rocket className="w-4 h-4" />
           </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <QuickNav />
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-black uppercase tracking-[2px] text-[#888]">WAP Intelligence</span>
            <div className="flex items-center gap-2">
               <div className={`w-2 h-2 rounded-full animate-pulse ${plan === 'free' ? 'bg-[#888]' : 'bg-[#D4AF37]'}`}></div>
               <span className="text-[12px] font-black uppercase tracking-tight text-[#1A1A1A] dark:text-zinc-100">
                 {modelName}
               </span>
            </div>
            <span className="text-[8px] font-bold text-[#AAA] uppercase mt-0.5">powered by Gemini</span>
          </div>
          <div className="h-8 w-[1px] bg-[#EEE] dark:bg-zinc-800 mx-2"></div>
          <div className={`px-4 py-2 rounded-sm border flex items-center gap-2 shadow-sm ${
            plan === 'agency' ? 'bg-gradient-to-r from-zinc-900 to-zinc-800 border-zinc-700 text-white' :
            plan === 'pro' ? 'bg-[#D4AF37] border-[#D4AF37] text-white' :
            'bg-[#F5F5F3] dark:bg-zinc-950 border-[#EEE] dark:border-zinc-800 text-[#888]'
          }`}>
            <UserCheck className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-[2px]">
              {plan === 'agency' ? 'Agency Master' : plan === 'pro' ? 'Pro Strategic' : 'Explorer Free'}
            </span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-[15px] mt-[40px] mb-[40px]">
        <ScoreCard
          title="SEO & Content"
          score={report.seo.score}
          desc="AI-gestützte Inhaltsanalyse."
          icon={<Search className="w-4 h-4" />}
        />
        <ScoreCard
          title="Sicherheit"
          score={report.security.score}
          desc="SSL, Header & Leaks."
          icon={<ShieldCheck className="w-4 h-4" />}
        />
        <ScoreCard
          title="Performance"
          score={report.performance.score}
          desc="Geschwindigkeit & Vitals."
          icon={<Zap className="w-4 h-4" />}
        />
        <ScoreCard
          title="Accessibility"
          score={report.accessibility.score}
          desc="Barrierefreiheit & UX."
          icon={<UserCheck className="w-4 h-4" />}
        />
        <ScoreCard
          title="Recht & Compliance"
          score={report.compliance.score}
          desc="DSGVO & Rechtssicherheit."
          icon={<Scale className="w-4 h-4" />}
        />
      </div>

      {report.businessIntelligence && (
        <section
          id="business-intelligence"
          className="bg-[#1A1A1A] dark:bg-zinc-950 p-[40px] text-white  mb-12 flex flex-col relative border-t-4 border-[#D4AF37]"
        >
          <h2 className="text-[18px] font-bold uppercase flex items-center gap-3 mb-[20px] text-white">
            <Activity className="w-5 h-5 text-[#D4AF37]" />
            Business Intelligence & Market Check
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[40px]">
            <div className="flex flex-col gap-[20px]">
              <div className="flex flex-col">
                <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] tracking-wider">
                  Erkannte Business Identity
                </span>
                <p className="text-[16px] font-bold text-[#D4AF37]">
                  {report.businessIntelligence.businessNiche}
                </p>
              </div>
              <div className="flex flex-col border-t border-white/10 pt-4">
                <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] tracking-wider">
                  Zielgruppe & Kundenstamm
                </span>
                <p className="text-[14px] leading-[1.6] text-white/90">
                  {report.businessIntelligence.targetAudience}
                </p>
              </div>
              {report.businessIntelligence.toneAndReadabilityAlignment && (
                <div className="flex flex-col border-t border-white/10 pt-4">
                  <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] tracking-wider flex items-center gap-2">
                    <UserCheck className="w-3 h-3 text-[#27AE60]" />{" "}
                    Zielgruppen-Check (Flesch & Tone)
                  </span>
                  <p className="text-[13px] leading-[1.6] text-white/80 italic">
                    {report.businessIntelligence.toneAndReadabilityAlignment}
                  </p>
                </div>
              )}
            </div>
            <div className="flex flex-col border-t md:border-t-0 md:border-l border-white/10 pt-[20px] md:pt-0 md:pl-[40px]">
              <span className="text-[11px] uppercase font-bold mb-[15px] text-[#888888] tracking-wider">
                Missing High-Intent Keywords (Gap Analyse)
              </span>
              <ul className="space-y-[10px]">
                {report.businessIntelligence.keywordGapAnalysis.map(
                  (keyword: any, idx: number) => {
                    const isBlurred = plan === 'free' && idx > 0;
                    return (
                      <li
                        key={idx}
                        className={`bg-white/5 p-3 flex items-start gap-3 border border-white/10 hover:border-[#D4AF37] transition-all relative overflow-hidden ${isBlurred ? 'opacity-40 grayscale pointer-events-none' : ''}`}
                      >
                        <span className="text-[#D4AF37] mt-0.5">
                          <Search className="w-4 h-4" />
                        </span>
                        <span className={`text-[13px] text-white/90 font-medium leading-[1.4] ${isBlurred ? 'blur-[4px] select-none' : ''}`}>
                          {keyword}
                        </span>
                        {isBlurred && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                             <button 
                               onClick={() => setActiveView('pricing')}
                               className="text-[8px] font-black uppercase tracking-[2px] text-[#D4AF37] border border-[#D4AF37] px-2 py-1 hover:bg-[#D4AF37] hover:text-black transition-all"
                             >
                               Unlock with Pro
                             </button>
                          </div>
                        )}
                      </li>
                    );
                  }
                )}
              </ul>
            </div>
          </div>
        </section>
      )}

      <section
        id="summary"
        className="bg-[#FFFFFF] dark:bg-zinc-900 border border-[#E5E5E5] dark:border-zinc-800 mb-12 flex flex-col md:flex-row relative overflow-hidden"
      >
        <div className="md:w-1/3 bg-[#1A1A1A] dark:bg-zinc-950 p-[40px] flex flex-col items-center justify-center text-center text-white relative">
           <div className="absolute top-0 right-0 p-4 opacity-10">
              <Activity className="w-32 h-32" />
           </div>
           <div className="relative z-10">
              <span className="text-[10px] uppercase font-black tracking-[4px] text-[#D4AF37] mb-6 block">Total Score</span>
              <div className="w-32 h-32 rounded-full border-8 border-white/5 flex items-center justify-center relative mb-6">
                 <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/10" />
                    <circle 
                      cx="64" 
                      cy="64" 
                      r="56" 
                      stroke="#D4AF37" 
                      strokeWidth="8" 
                      fill="transparent" 
                      strokeDasharray="351.85" 
                      strokeDashoffset={351.85 - (351.85 * ((report.seo.score + report.security.score + report.performance.score + report.accessibility.score + report.compliance.score) / 5) / 100)} 
                      strokeLinecap="round"
                    />
                 </svg>
                 <span className="text-[32px] font-black">{Math.round((report.seo.score + report.security.score + report.performance.score + report.accessibility.score + report.compliance.score) / 5)}</span>
              </div>
              <p className="text-[10px] uppercase font-bold text-[#888] tracking-widest">Global Health Index</p>
           </div>
        </div>
        <div className="md:w-2/3 p-[40px] flex flex-col justify-center">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-[20px]">
            <h2 className="text-[18px] font-black uppercase flex items-center gap-3 tracking-widest text-[#1A1A1A] dark:text-white">
              <RefreshCw className="w-5 h-5 text-[#D4AF37]" />
              Executive Summary
            </h2>
            <button 
              onClick={plan === 'free' ? () => setActiveView('pricing') : onExportActionPlan}
              className={`flex items-center justify-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-[2px] transition-all self-start shadow-lg ${
                plan === 'free' 
                ? 'bg-zinc-800/10 text-zinc-400 border border-zinc-200 cursor-not-allowed line-through' 
                : 'bg-[#1A1A1A] dark:bg-zinc-800 text-white dark:text-zinc-100 hover:bg-[#D4AF37] hover:text-[#1A1A1A]'
              }`}
            >
              {plan === 'free' ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-[#D4AF37]" />
                  UNLOCK CSV (PRO)
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  EXPORT PLAN (CSV)
                </>
              )}
            </button>
          </div>
          <p className="text-[#1A1A1A] dark:text-zinc-300 leading-[1.8] text-[15px] font-medium italic">
            &quot;{report.overallAssessment}&quot;
          </p>
        </div>
      </section>

      {report.industryNews && report.industryNews.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Globe className="w-5 h-5 text-[#D4AF37]" />
            <h3 className="text-[14px] font-black uppercase tracking-[2px] text-[#1A1A1A] dark:text-zinc-100">Branchen-Insights & News</h3>
            {plan === 'free' && <span className="text-[9px] font-black uppercase px-2 py-1 bg-[#D4AF37] text-white">PRO FEATURE</span>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
            {report.industryNews.slice(0, plan === 'free' ? 1 : 3).map((news: string, idx: number) => (
              <div key={idx} className="bg-[#F5F5F3] dark:bg-zinc-950 p-6 border border-[#EEE] dark:border-zinc-800 relative group">
                <div className="absolute top-0 left-0 w-1 h-0 group-hover:h-full bg-[#D4AF37] transition-all duration-300"></div>
                <p className="text-[13px] leading-relaxed text-[#444] dark:text-zinc-300 font-medium italic">&quot;{news}&quot;</p>
              </div>
            ))}
            {plan === 'free' && (
              <div className="bg-[#FFFFFF] dark:bg-zinc-900 p-6 border border-dashed border-[#DDD] dark:border-zinc-800 flex flex-col items-center justify-center text-center gap-3 opacity-60">
                 <Lock className="w-6 h-6 text-[#888]" />
                 <p className="text-[10px] font-bold text-[#888] uppercase tracking-widest">Upgrade für 3+ weitere Branchen-Updates</p>
                 <button onClick={() => setActiveView('pricing')} className="text-[9px] font-black uppercase text-[#D4AF37] border-b border-[#D4AF37]">Jetzt freischalten</button>
              </div>
            )}
          </div>
        </section>
      )}

      <div className="flex flex-col gap-10">
        {report.seo.detailedSeo && (
          <SeoDeepDiveModule
            detailedSeo={report.seo.detailedSeo}
            socialData={rawScrapeData?.social}
            crawlSummary={rawScrapeData?.crawlSummary}
            plan={plan}
          />
        )}

        <SearchConsoleModule
          data={gscData}
          isLoading={isGscLoading}
          onConnect={onConnectGSC}
          error={gscError}
          plan={plan}
          setActiveView={setActiveView}
        />

        {report.security.detailedSecurity && (
          <SecurityDeepDiveModule
            detailedSecurity={report.security.detailedSecurity}
          />
        )}

        {report.performance.detailedPerformance && (
          <PerformanceDeepDiveModule
            detailedPerformance={report.performance.detailedPerformance}
          />
        )}

        {report.accessibility.detailedAccessibility && (
          <AccessibilityDeepDiveModule
            detailedAccessibility={report.accessibility.detailedAccessibility}
            maxDomDepth={rawScrapeData?.maxDomDepth}
          />
        )}

        {report.compliance.detailedCompliance && (
          <ComplianceDeepDiveModule
            detailedCompliance={report.compliance.detailedCompliance}
            legalData={rawScrapeData?.legal}
          />
        )}
      </div>

      {/* Tiered Upsell Banners */}
      {plan === 'free' && (
        <div className="mt-20 p-10 bg-[#1A1A1A] border-t-8 border-[#D4AF37] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
            <Zap className="w-64 h-64 text-white" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="max-w-[600px] text-center md:text-left">
              <h3 className="text-[32px] font-black text-white uppercase tracking-tighter leading-none mb-4">
                Das war nur der Anfang. <br />
                <span className="text-[#D4AF37]">Entfessle die volle Power.</span>
              </h3>
              <p className="text-[14px] text-zinc-400 font-medium leading-relaxed">
                Du nutzt aktuell die Basis-KI. Mit <span className="text-white font-bold">WAP Advanced</span> erhältst du 10x tiefere Analysen, Keyword-Gap-Checks und volle Crawl-Abdeckung deiner gesamten Seite.
              </p>
            </div>
            <button 
              onClick={() => setActiveView('pricing')}
              className="px-10 py-5 bg-[#D4AF37] text-[#1A1A1A] text-[12px] font-black uppercase tracking-[2px] hover:bg-white transition-colors shadow-2xl flex items-center gap-3 shrink-0"
            >
              JETZT PRO FREISCHALTEN
              <Rocket className="w-5 h-5 animate-bounce" />
            </button>
          </div>
        </div>
      )}

      {plan === 'pro' && (
        <div className="mt-20 p-8 bg-zinc-950 border border-zinc-800 relative group text-center">
          <div className="relative z-10 flex flex-col items-center gap-4">
            <h3 className="text-[16px] font-black text-[#D4AF37] uppercase tracking-widest">Upgrade to Agency</h3>
            <p className="text-[12px] text-zinc-500 font-medium max-w-[500px]">
              Erhöhe dein Limit auf 100+ Unterseiten und schalte automatische White-Label PDF Reports für deine Kunden frei.
            </p>
            <button 
              onClick={() => setActiveView('pricing')}
              className="text-[10px] font-black uppercase tracking-[2px] text-white border-b-2 border-[#D4AF37] pb-1 hover:text-[#D4AF37] transition-colors"
            >
              Alle Agency Vorteile ansehen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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
  setActiveView,
  plan = 'free',
}: {
  project: any;
  onStartScan: (url: string) => void;
  isLoading: boolean;
  report: any | null;
  rawScrapeData: any;
  gscData: any;
  isGscLoading: boolean;
  onConnectGSC: () => void;
  gscError: string | null;
  onExportActionPlan: () => void;
  setActiveView: (view: 'analyzer' | 'project' | 'settings' | 'profile' | 'pricing' | 'team') => void;
  plan?: string;
}) {
  return (
    <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-10 border-b border-[#E5E5E5] dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 bg-[#D4AF37] text-white text-[10px] font-black uppercase tracking-widest rounded-sm shadow-sm">
              Projekt
            </span>
            <span className="text-[11px] font-bold text-[#888] uppercase tracking-widest">
              {project.id}
            </span>
          </div>
          <h2 className="text-[50px] md:text-[64px] font-black uppercase tracking-tighter leading-none mb-4 text-[#1A1A1A] dark:text-zinc-100">
            {project.name}
          </h2>
          <p className="text-[14px] text-[#888] font-medium max-w-[500px]">
            Dashboard für {project.url}. Hier kannst du alle historischen Daten
            und Analysen dieses Projekts einsehen.
          </p>
          
          {plan === 'free' && (
            <div className="mt-8 p-4 bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex flex-col sm:flex-row items-center justify-between gap-4">
               <div className="flex items-center gap-3">
                 <Star className="w-5 h-5 text-[#D4AF37] fill-[#D4AF37]" />
                 <span className="text-[11px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">
                   Sichere dir 7 Tage WAP Premium für dieses Projekt!
                 </span>
               </div>
               <button 
                 onClick={() => setActiveView('pricing')}
                 className="px-4 py-2 bg-[#D4AF37] text-white text-[9px] font-black uppercase tracking-widest hover:bg-[#1A1A1A] transition-colors"
               >
                 TRIAL STARTEN
               </button>
            </div>
          )}
        </div>
        <button
          onClick={() => onStartScan(project.url)}
          disabled={isLoading}
          className="bg-[#1A1A1A] dark:bg-zinc-100 text-white dark:text-zinc-900 px-10 py-5 text-[12px] font-black uppercase tracking-widest hover:bg-[#D4AF37] dark:hover:bg-[#D4AF37] transition-all flex items-center gap-3 shadow-xl hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Search className="w-5 h-5" />
          )}
          {isLoading ? "Analyse läuft..." : "Neuen Scan starten"}
        </button>
      </div>

      {!report && !isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-[#FFFFFF] dark:bg-zinc-900 p-8 border border-[#E5E5E5] dark:border-zinc-800 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#888] mb-8 block">
              Aktueller Score
            </span>
            <div className="flex items-end gap-2">
              <span className="text-[64px] font-black leading-none text-[#27AE60]">
                --
              </span>
              <span className="text-[24px] font-bold text-[#888] mb-2 uppercase tracking-tighter">
                / 100
              </span>
            </div>
          </div>
          <div className="bg-[#FFFFFF] dark:bg-zinc-900 p-8 border border-[#E5E5E5] dark:border-zinc-800 shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#888] mb-8 block">
              Analysen Gesamt
            </span>
            <div className="text-[64px] font-black leading-none text-[#1A1A1A] dark:text-zinc-100">
              0
            </div>
          </div>
          <div className="bg-[#FFFFFF] dark:bg-zinc-900 p-8 border border-[#E5E5E5] dark:border-zinc-800 shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#888] mb-8 block">
              Aktivität
            </span>
            <div className="flex-1 text-right">
              <span className="text-[10px] font-black uppercase tracking-[2px] text-[#888888] dark:text-zinc-500">Modus</span>
              <p className="text-[12px] font-bold text-[#1A1A1A] dark:text-zinc-100 uppercase tracking-widest">
                {plan === 'agency' ? 'WAP Enterprise v3' : plan === 'pro' ? 'WAP Advanced v2' : 'WAP Standard v1'}
              </p>
            </div>
            <div className="text-[14px] font-bold text-[#1A1A1A] dark:text-zinc-100 uppercase tracking-widest">
              Keine Daten verfügbar
            </div>
          </div>
        </div>
      )}

      {isLoading && <LoadingDisplay plan={plan} />}

      {report && !isLoading && (
        <ReportResultsView
          report={report}
          rawScrapeData={rawScrapeData}
          gscData={gscData}
          isGscLoading={isGscLoading}
          onConnectGSC={onConnectGSC}
          gscError={gscError}
          onExportActionPlan={onExportActionPlan}
          plan={plan}
          setActiveView={setActiveView}
        />
      )}
    </div>
  );
}

function SettingsView() {
  const { deleteAccount, logOut, error: authError } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
      // On success, auth listener will clear state
    } catch (err) {
      // Error handled by context
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="pb-10 border-b border-[#E5E5E5] dark:border-zinc-800">
        <h2 className="text-[50px] md:text-[64px] font-black uppercase tracking-tighter leading-none mb-4 text-[#1A1A1A] dark:text-zinc-100">
          Einstellungen
        </h2>
        <p className="text-[14px] text-[#888] font-medium">Verwalte deine Präferenzen und Systemkonfigurationen.</p>
      </div>

      <div className="max-w-[700px] flex flex-col gap-12 pb-20">
        <div className="flex flex-col gap-6">
          <h3 className="text-[12px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100 pb-2 border-b-2 border-[#1A1A1A] dark:border-zinc-100 w-fit">Allgemein</h3>
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between p-6 bg-white dark:bg-zinc-900 border border-[#E5E5E5] dark:border-zinc-800 rounded-sm">
              <div className="flex flex-col gap-1">
                <span className="text-[13px] font-bold text-[#1A1A1A] dark:text-zinc-100 uppercase">Dunkelmodus</span>
                <span className="text-[11px] text-[#888] font-medium">Automatischer Wechsel basierend auf System</span>
              </div>
              <ThemeToggle />
            </div>
            <div className="flex items-center justify-between p-6 bg-white dark:bg-zinc-900 border border-[#E5E5E5] dark:border-zinc-800 rounded-sm italic opacity-50">
              <div className="flex flex-col gap-1">
                <span className="text-[13px] font-bold text-[#1A1A1A] dark:text-zinc-100 uppercase">E-Mail Benachrichtigungen</span>
                <span className="text-[11px] text-[#888] font-medium">Wöchentlicher Report deiner Projekte</span>
              </div>
              <span className="text-[10px] font-bold text-[#888] uppercase">Bald verfügbar</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <h3 className="text-[12px] font-black uppercase tracking-widest text-[#EB5757] pb-2 border-b-2 border-[#EB5757] w-fit">Gefahrenzone</h3>
          <div className="p-6 bg-[#EB5757]/5 border border-[#EB5757]/20 rounded-sm flex flex-col gap-6">
            {!showConfirm ? (
              <div className="flex items-center justify-between gap-6">
                <div className="flex flex-col gap-1">
                  <span className="text-[13px] font-bold text-[#EB5757] uppercase">Account Löschen</span>
                  <p className="text-[11px] text-[#888] leading-relaxed">Alle deine Projekte, Scans und Einstellungen werden unwiderruflich gelöscht.</p>
                </div>
                <button 
                  onClick={() => setShowConfirm(true)}
                  className="px-6 py-3 bg-[#EB5757] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#C0392B] transition-colors shrink-0"
                >
                  Account löschen
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 py-4 animate-in fade-in zoom-in-95 duration-300">
                <AlertTriangle className="w-10 h-10 text-[#EB5757]" />
                <div className="text-center">
                  <p className="text-[14px] font-bold text-[#1A1A1A] dark:text-zinc-100 uppercase mb-1">Bist du absolut sicher?</p>
                  <p className="text-[11px] text-[#888]">Diese Aktion kann nicht rückgängig gemacht werden.</p>
                </div>
                
                {authError && (
                  <div className="w-full p-4 bg-[#EB5757]/10 border border-[#EB5757]/20 text-[#EB5757] text-[11px] font-bold text-center">
                    {authError}
                  </div>
                )}

                <div className="flex gap-4 w-full">
                  <button 
                    disabled={isDeleting}
                    onClick={handleDelete}
                    className="flex-1 py-4 bg-[#EB5757] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#C0392B] transition-colors disabled:opacity-50"
                  >
                    {isDeleting ? 'Löschen...' : 'Ja, unwiderruflich löschen'}
                  </button>
                  <button 
                    disabled={isDeleting}
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 py-4 bg-[#EEE] dark:bg-zinc-800 text-[#888] text-[10px] font-black uppercase tracking-widest hover:bg-[#DDD] dark:hover:bg-zinc-700 transition-colors"
                  >
                    Abbruch
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileView() {
  const { user, updateUser, error: authError } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.displayName || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [editPass, setEditPass] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!user) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setSuccess(false);
    try {
      await updateUser({
        displayName: editName !== user.displayName ? editName : undefined,
        email: editEmail !== user.email ? editEmail : undefined,
        password: editPass ? editPass : undefined
      });
      setSuccess(true);
      setIsEditing(false);
      setEditPass('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      // Error handled by auth-provider/context
    } finally {
      setIsUpdating(false);
    }
  };

  const isPasswordProvider = user.providerData.some(p => p.providerId === 'password');

  return (
    <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="pb-10 border-b border-[#E5E5E5] dark:border-zinc-800 flex justify-between items-end gap-6">
        <div>
          <h2 className="text-[50px] md:text-[64px] font-black uppercase tracking-tighter leading-none mb-4 text-[#1A1A1A] dark:text-zinc-100">
            Dein Profil
          </h2>
          <p className="text-[14px] text-[#888] font-medium">Personalisierung und Account-Details.</p>
        </div>
        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="px-6 py-3 bg-[#1A1A1A] dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] font-black uppercase tracking-widest hover:bg-[#D4AF37] dark:hover:bg-[#D4AF37] transition-colors"
          >
            Profil bearbeiten
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-12 items-start">
        <div className="relative group shrink-0">
          {user.photoURL ? (
            <Image 
              src={user.photoURL} 
              alt="Avatar" 
              width={180} 
              height={180} 
              className="w-[180px] h-[180px] rounded-sm grayscale group-hover:grayscale-0 transition-all duration-700 shadow-2xl border-4 border-white dark:border-zinc-900" 
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-[180px] h-[180px] bg-[#1A1A1A] dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center text-[60px] font-black rounded-sm">
              {user.email?.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="absolute top-4 right-4 px-3 py-1 bg-[#27AE60] text-white text-[10px] font-black uppercase tracking-widest rounded-sm">
            {user.emailVerified ? 'Verifiziert' : 'Aktiv'}
          </div>
        </div>

        <div className="flex-1 w-full max-w-[500px]">
          {isEditing ? (
            <form onSubmit={handleUpdate} className="flex flex-col gap-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#888]">Anzeigename</label>
                <input 
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-[#E5E5E5] dark:border-zinc-800 rounded-sm py-3 px-4 text-[14px] font-bold outline-none focus:border-[#D4AF37] transition-colors"
                />
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#888]">E-Mail Adresse</label>
                <input 
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-[#E5E5E5] dark:border-zinc-800 rounded-sm py-3 px-4 text-[14px] font-bold outline-none focus:border-[#D4AF37] transition-colors"
                />
              </div>

              {isPasswordProvider && (
                <div className="flex flex-col gap-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#888]">Neues Passwort (optional)</label>
                  <input 
                    type="password"
                    value={editPass}
                    placeholder="Leer lassen für keine Änderung"
                    onChange={(e) => setEditPass(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-[#E5E5E5] dark:border-zinc-800 rounded-sm py-3 px-4 text-[14px] font-bold outline-none focus:border-[#D4AF37] transition-colors"
                  />
                </div>
              )}

              {authError && (
                <div className="p-4 bg-[#EB5757]/10 border border-[#EB5757]/20 text-[#EB5757] text-[11px] font-bold">
                  {authError}
                </div>
              )}

              <div className="flex gap-4">
                <button 
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 px-8 py-4 bg-[#D4AF37] text-white text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isUpdating ? 'Speichert...' : 'Speichern'}
                </button>
                <button 
                  type="button"
                  onClick={() => { setIsEditing(false); setEditName(user.displayName || ''); setEditEmail(user.email || ''); }}
                  className="px-8 py-4 bg-[#EEE] dark:bg-zinc-800 text-[#888] text-[10px] font-black uppercase tracking-widest hover:bg-[#DDD] dark:hover:bg-zinc-700 transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-left-4 duration-300">
               {success && (
                 <div className="p-4 bg-[#27AE60] text-white text-[11px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-top-2">
                   Profil erfolgreich aktualisiert
                 </div>
               )}
               <div className="flex flex-col gap-2">
                 <span className="text-[10px] font-black uppercase tracking-widest text-[#888]">Anzeigename</span>
                 <div className="text-[20px] font-bold text-[#1A1A1A] dark:text-zinc-100 uppercase tracking-tight border-b border-[#DDD] dark:border-zinc-800 pb-2">{user.displayName || 'Unbekannt'}</div>
               </div>
               <div className="flex flex-col gap-2">
                 <span className="text-[10px] font-black uppercase tracking-widest text-[#888]">E-Mail Adresse</span>
                 <div className="text-[20px] font-bold text-[#1A1A1A] dark:text-zinc-100 tracking-tight border-b border-[#DDD] dark:border-zinc-800 pb-2">{user.email}</div>
               </div>
               <div className="flex flex-col gap-2">
                 <span className="text-[10px] font-black uppercase tracking-widest text-[#888]">Mitglied seit</span>
                 <div className="text-[16px] font-medium text-[#1A1A1A] dark:text-zinc-100 uppercase tracking-widest">April 2026</div>
               </div>
               <div className="flex flex-col gap-2">
                 <span className="text-[10px] font-black uppercase tracking-widest text-[#888]">Anbieter</span>
                 <div className="flex gap-2">
                   {user.providerData.map((p: any) => (
                     <span key={p.providerId} className="text-[10px] px-2 py-1 bg-black/5 dark:bg-white/5 font-bold uppercase tracking-widest">
                       {p.providerId === 'google.com' ? 'Google' : 'E-Mail'}
                     </span>
                   ))}
                 </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function WebsiteAnalyzer() {
  const { user, userData, loading: authLoading, logOut } = useAuth();
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [rawScrapeData, setRawScrapeData] = useState<any>(null);
  const [gscData, setGscData] = useState<any>(null);
  const [isGscLoading, setIsGscLoading] = useState(false);
  const [gscError, setGscError] = useState<string | null>(null);
  const [lastAnalyzedUrl, setLastAnalyzedUrl] = useState<string | null>(null);
  const [notification, setNotification] = useState<{message: string, url: string} | null>(null);
  const [notifications, setNotifications] = useState<{id: string, title: string, message: string, time: string, read: boolean}[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [activeView, setActiveView] = useState<'analyzer' | 'project' | 'settings' | 'profile' | 'pricing' | 'team'>('analyzer');
  const [selectedProject, setSelectedProject] = useState<any>(null);

  // Trial Logic
  const isInTrial = userData?.trialUntil && new Date(userData.trialUntil) > new Date();
  const effectivePlan = (userData?.plan === 'free' && isInTrial) ? 'pro' : (userData?.plan || 'free');
  
  // Calculate trial days remaining
  const trialDaysLeft = userData?.trialUntil 
    ? Math.max(0, Math.ceil((new Date(userData.trialUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const addNotification = (title: string, message: string) => {
    const newNotif = {
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
      const docRef = doc(db, 'reports', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.results) {
          try {
            const parsedReport = typeof data.results === 'string' ? JSON.parse(data.results) : data.results;
            setReport(parsedReport);
          } catch (pe) {
            console.error("Failed to parse results:", pe);
          }
        }
        if (data.rawScrapeData) {
          try {
            const parsedScrape = typeof data.rawScrapeData === 'string' ? JSON.parse(data.rawScrapeData) : data.rawScrapeData;
            setRawScrapeData(parsedScrape);
          } catch (pe) {
            console.error("Failed to parse scrape data:", pe);
          }
        }
        setLastAnalyzedUrl(data.url);
        setUrl(data.url);
        setActiveView('analyzer');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        throw new Error('Report nicht gefunden.');
      }
    } catch (e: any) {
      setError(e.message || 'Fehler beim Laden des Reports.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectProject = (proj: any) => {
    setSelectedProject(proj);
    if (proj.url) {
      setUrl(proj.url);
    }
    setActiveView('project');
  };

  const handleAnalyze = async (e?: React.FormEvent, overrideUrl?: string) => {
    if (e) e.preventDefault();
    const currentUrl = overrideUrl || url;
    if (!currentUrl) return;

    // ensure http/https
    let targetUrl = currentUrl;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    setIsLoading(true);
    setError(null);
    setReport(null);

    try {
      // Check Quota
      if (user && userData) {
        if (userData.scanCount >= userData.maxScans) {
          setError(`Limit erreicht: Du hast dein Limit von ${userData.maxScans} Scans für diesen Monat erreicht. Bitte upgrade dein Abo.`);
          setActiveView('pricing');
          setIsLoading(false);
          return;
        }
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: targetUrl,
          plan: effectivePlan
        }),
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

      // Step 2: Generate the report client-side (Required for AI Studio Proxy)
      const finalReport = await generateReportClientSide(scrapeData);
      
      setReport(finalReport);
      setLastAnalyzedUrl(targetUrl);
      
      // Trigger Notification
      setNotification({ message: 'Analyse erfolgreich abgeschlossen!', url: targetUrl });
      setTimeout(() => setNotification(null), 5000);
      addNotification('Analyse abgeschlossen', `Die Analyse für ${targetUrl} wurde erfolgreich beendet.`);

      // Save to Firebase History
      if (auth.currentUser) {
        try {
          const avgScore = Math.round((finalReport.seo.score + finalReport.security.score + finalReport.performance.score + finalReport.accessibility.score + finalReport.compliance.score) / 5);
            await addDoc(collection(db, 'reports'), {
              userId: auth.currentUser.uid,
              url: targetUrl,
              score: avgScore,
              results: JSON.stringify(finalReport),
              rawScrapeData: JSON.stringify(scrapeData),
              createdAt: new Date().toISOString()
            });

            // Increment Scan Count
            await updateDoc(doc(db, 'users', auth.currentUser.uid), {
              scanCount: increment(1)
            });
        } catch (dbError) {
          console.error("Could not save to history:", dbError);
        }
      }
      
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
    link.download = `WAP_ActionPlan_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  };

  if (authLoading) return (
    <div className="fixed inset-0 bg-[#F5F5F3] dark:bg-zinc-950 flex flex-col items-center justify-center z-[100]">
      <Zap className="w-12 h-12 text-[#D4AF37] animate-pulse mb-4" />
      <span className="text-[10px] font-black uppercase tracking-widest text-[#888]">System wird geladen...</span>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#F5F5F3] dark:bg-zinc-950 text-[#1A1A1A] dark:text-zinc-100 font-['Helvetica_Neue',_Helvetica,_Arial,_sans-serif] overflow-x-hidden transition-colors md:pl-16 relative">
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
        onLogout={() => {
          setActiveView('analyzer');
          setReport(null);
          setUrl('');
        }}
      />
      {!isLoading && report && (activeView === 'analyzer' || activeView === 'project') && <FloatingNav />}
      
      {/* SCAN FINISHED NOTIFICATION */}
      {notification && (
        <div className="fixed bottom-6 right-6 bg-[#1A1A1A] dark:bg-zinc-100 text-[#FFFFFF] dark:text-zinc-900 px-6 py-4 border border-[#333] dark:border-[#EEE] shadow-2xl z-[100] flex items-start gap-4 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="w-8 h-8 rounded-full bg-[#27AE60]/20 flex items-center justify-center shrink-0 mt-0.5">
            <CheckCircle className="w-5 h-5 text-[#27AE60]" />
          </div>
          <div className="flex flex-col">
            <h4 className="text-[13px] font-bold tracking-wide">{notification.message}</h4>
            <p className="text-[10px] opacity-70 mt-1 truncate max-w-[200px]">{notification.url}</p>
          </div>
          <button onClick={() => setNotification(null)} className="ml-2 mt-1 opacity-50 hover:opacity-100 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="max-w-[1024px] mx-auto px-10 py-[60px] flex flex-col justify-between min-h-screen">
        
        <div>
          {/* Header (Shared) */}
          <header className="mb-10 flex flex-col md:flex-row md:justify-between md:items-start gap-8">
            <div className="flex flex-col md:flex-row justify-between w-full md:items-start gap-4 md:gap-8">
              <h1 
                className="text-[50px] md:text-[82px] leading-[0.85] tracking-[-3px] font-bold uppercase max-w-[500px] cursor-pointer hover:text-[#D4AF37] transition-all duration-500" 
                onClick={() => setActiveView('analyzer')}
              >
                {activeView === 'analyzer' ? 'Website Analyzer Pro' : 'WAP'}
              </h1>
            </div>
            <div className="md:text-right flex flex-col gap-3 mt-2 md:mt-0 items-end">
              {(!userData?.plan || userData.plan === 'free') && (
                <div className="hidden md:flex items-center gap-4">
                   <button 
                     onClick={() => setActiveView('pricing')}
                     className="text-[10px] font-black uppercase tracking-[2px] text-[#D4AF37] border border-[#D4AF37]/30 px-3 py-1.5 hover:bg-[#D4AF37] hover:text-white transition-all flex items-center gap-2 group"
                   >
                     <Star className="w-3 h-3 group-hover:rotate-12 transition-transform" />
                     7 TAGE GRATIS TESTEN
                   </button>
                </div>
              )}

              {user && userData && (
                <div className="flex flex-col items-end opacity-80 mt-1">
                   <div className="flex items-baseline gap-2">
                     <span className="text-[11px] font-black tracking-tighter text-[#1A1A1A] dark:text-zinc-100">
                       {userData.scanCount || 0} / {userData.maxScans || 5}
                     </span>
                     <span className="text-[9px] font-bold text-[#888] uppercase tracking-widest">Analysen übrig</span>
                   </div>
                   <div className="w-32 h-1 bg-black/5 dark:bg-white/10 mt-1.5 overflow-hidden rounded-full">
                     <div 
                       className={`h-full transition-all duration-1000 ${ ((userData.scanCount || 0) / (userData.maxScans || 5)) > 0.8 ? 'bg-[#EB5757]' : 'bg-[#D4AF37]' }`} 
                       style={{ width: `${Math.min(100, ((userData.scanCount || 0) / (userData.maxScans || 5)) * 100)}%` }}
                     />
                   </div>
                </div>
              )}
            </div>
          </header>

          {/* View Switching */}
          {activeView === 'analyzer' && (
            <>
              {/* Trial Banner */}
              {isInTrial && (
                <div className="mb-8 p-4 bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-[#D4AF37]" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-[#D4AF37]">
                      Testphase aktiv: Noch {trialDaysLeft} Tage verbleibend
                    </span>
                  </div>
                  <button onClick={() => setActiveView('pricing')} className="text-[10px] font-bold uppercase underline text-[#D4AF37]">Jetzt upgraden</button>
                </div>
              )}

              {/* Input Form */}
              <section className="mb-[60px] mt-10 relative">
                


                <span className="text-[12px] uppercase tracking-[1px] font-semibold text-[#888888] dark:text-zinc-400 mb-[10px] block">
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
              {isLoading && <LoadingDisplay plan={effectivePlan} />}

              {/* Report Display */}
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
              onStartScan={(projUrl) => {
                handleAnalyze(undefined, projUrl);
              }}
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

          {activeView === 'team' && (
            <TeamWorkspace user={user} userData={userData} />
          )}

        </div>

        {/* Footer */}
        <footer className="mt-20 pt-6 border-t border-[#1A1A1A] dark:border-zinc-700 flex flex-col gap-6 opacity-70">
          <div className="flex flex-col sm:flex-row gap-8 sm:gap-[60px] justify-between">
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-[1px] font-semibold mb-2">Letzter Scan: {new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              <div className="flex gap-4">
                 <a href="/impressum" className="text-[10px] uppercase font-bold hover:text-[#D4AF37] transition-colors">Impressum</a>
                 <a href="/datenschutz" className="text-[10px] uppercase font-bold hover:text-[#D4AF37] transition-colors">Datenschutzerklärung</a>
                 <a href="/agb" className="text-[10px] uppercase font-bold hover:text-[#D4AF37] transition-colors">AGB</a>
              </div>
            </div>
            <div className="flex-1 sm:text-right">
              <p className="text-[11px] uppercase tracking-[1px] font-semibold mb-2">Modus: Deep Analysis (AI-Enhanced)</p>
              <p className="text-[8px] uppercase tracking-[1px] opacity-40">By using this service, you consent to our Cookie policy. Click to akzeptieren.</p>
            </div>
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

function ScoreCard({ title, score, desc, icon }: { title: string, score: number, desc: string, icon?: React.ReactNode }) {
  const getStatusColor = (s: number) => {
    if (s >= 80) return '#27AE60';
    if (s >= 50) return '#F2994A';
    return '#EB5757';
  };

  const getStatusTextClass = (s: number) => {
    if (s >= 80) return 'text-[#27AE60]';
    if (s >= 50) return 'text-[#F2994A]';
    return 'text-[#EB5757]';
  };

  return (
    <div className="border border-[#E5E5E5] dark:border-zinc-800 p-5 bg-white dark:bg-zinc-900 flex flex-col transition-all duration-300 ease-out hover:shadow-xl hover:border-[#D4AF37] group relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: getStatusColor(score) }} />
      <div className="flex items-center justify-between mb-4">
        <span className="text-[9px] uppercase font-black text-[#888] tracking-widest flex items-center gap-1.5 grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
          {icon}
          {title}
        </span>
      </div>
      <div className="flex items-end gap-2 mb-2">
        <span className={`text-[42px] font-black leading-none tracking-tighter ${getStatusTextClass(score)}`}>
          {score}
        </span>
        <span className="text-[14px] font-black opacity-30 mb-1">%</span>
      </div>
      <p className="text-[10px] leading-[1.4] text-[#888888] dark:text-zinc-400 font-bold uppercase tracking-wider">
        {desc}
      </p>
    </div>
  );
}

function CrawlerAuditModule({ crawlSummary, plan = 'free' }: { crawlSummary: any, plan?: string }) {
  if (!crawlSummary || !crawlSummary.scannedSubpages) return null;

  const displayedPages = plan === 'free' ? crawlSummary.scannedSubpages.slice(0, 1) : crawlSummary.scannedSubpages;
  const isLimited = plan === 'free' && crawlSummary.scannedSubpagesCount > 1;

  return (
    <div className="mt-10 p-6 bg-[#F9F9F9] dark:bg-zinc-900/50 border-t-2 border-[#D4AF37] relative">
      <h4 className="text-[14px] font-black uppercase text-[#1A1A1A] dark:text-zinc-100 flex items-center gap-3 tracking-[2px] mb-6">
        <Globe className="w-5 h-5 text-[#D4AF37]" />
        Site-Wide Audit (Crawling Result)
      </h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedPages.map((page: any, idx: number) => (
          <div key={idx} className="bg-white dark:bg-zinc-950 p-4 border border-[#EEE] dark:border-zinc-800 shadow-sm flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase text-[#D4AF37] tracking-widest truncate max-w-[150px]">
                {new URL(page.url).pathname}
              </span>
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-sm ${page.status === 200 ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                {page.status}
              </span>
            </div>
            <h5 className="text-[12px] font-bold text-[#1A1A1A] dark:text-zinc-100 line-clamp-1">{page.title || 'Kein Titel'}</h5>
            <div className="flex flex-col gap-1 mt-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-[#888] font-bold uppercase tracking-tighter">H1 Tags</span>
                <span className={`text-[10px] font-bold ${page.h1Count === 0 || page.h1Count > 1 ? 'text-red-500' : 'text-green-600'}`}>{page.h1Count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-[#888] font-bold uppercase tracking-tighter">Fehlende Alts</span>
                <span className={`text-[10px] font-bold ${page.imagesWithoutAlt > 0 ? 'text-orange-500' : 'text-green-600'}`}>{page.imagesWithoutAlt}</span>
              </div>
            </div>
          </div>
        ))}

        {isLimited && (
          <div className="relative bg-white/50 dark:bg-zinc-950/50 p-4 border border-dashed border-zinc-300 dark:border-zinc-800 flex flex-col items-center justify-center text-center gap-2 overflow-hidden min-h-[120px]">
            <div className="absolute inset-0 backdrop-blur-[2px] z-0"></div>
            <div className="relative z-10 flex flex-col items-center">
              <ShieldCheck className="w-5 h-5 text-[#D4AF37] mb-1" />
              <span className="text-[9px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">
                +{crawlSummary.scannedSubpagesCount - 1} Seiten gefunden
              </span>
              <p className="text-[8px] text-[#888] font-bold mt-1">NUR IN PRO VERFÜGBAR</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-6 flex items-center justify-between gap-4 text-[10px] text-[#888] font-bold uppercase tracking-widest bg-white dark:bg-zinc-950 p-3 border border-[#EEE] dark:border-zinc-800">
        <div className="flex items-center gap-4">
          <Info className="w-4 h-4 text-[#D4AF37]" />
          <span>Gefundene interne Links: {crawlSummary.totalInternalLinks} | Tiefen-Audit von {crawlSummary.scannedSubpagesCount} Seiten.</span>
        </div>
        {plan === 'free' && (
          <span className="text-[#D4AF37] flex items-center gap-2">
            <ShieldCheck className="w-3 h-3" /> EINGESCHRÄNKT
          </span>
        )}
      </div>
    </div>
  );
}

function SeoDeepDiveModule({ detailedSeo, socialData, crawlSummary, plan = 'free' }: { detailedSeo: DetailedSEO, socialData?: any, crawlSummary?: any, plan?: string }) {
  return (
    <CollapsibleSection id="seo" title="Comprehensive SEO Analysis" icon={<Search className="w-6 h-6" />} color="#1A1A1A" badge="SEO DEEP DIVE" className="mt-8">
      {crawlSummary && (
        <CrawlerAuditModule crawlSummary={crawlSummary} plan={plan} />
      )}
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
            <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] dark:text-zinc-400 tracking-wider">Lokales SEO & NAP (Name, Address, Phone)</span>
             <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-zinc-100 font-medium">{detailedSeo.localSeoNap}</p>
         </div>

         <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
            <span className="text-[11px] uppercase font-bold mb-[5px] text-[#27AE60] dark:text-[#27AE60] tracking-wider flex items-center gap-1.5"><CodeXml className="w-3 h-3"/> Strukturelle Tiefe & HTML5</span>
             <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-zinc-100 font-medium">{detailedSeo.semanticStructure}</p>
         </div>
         <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
            <span className="text-[11px] uppercase font-bold mb-[5px] text-[#F2994A] dark:text-[#F2994A] tracking-wider flex items-center gap-1.5"><Activity className="w-3 h-3"/> Call-to-Action (CTA) Check</span>
             <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-zinc-100 font-medium">{detailedSeo.ctaAnalysis}</p>
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

      <CrawlerAuditModule crawlSummary={crawlSummary} />

      <PrioritizedTasksSection 
        tasks={detailedSeo.prioritizedTasks} 
        title="Priorisierte SEO-Maßnahmen" 
        accentColor="#1A1A1A" 
      />
    </CollapsibleSection>
  );
}

function SearchConsoleModule({ data, isLoading, onConnect, error, plan = 'free', setActiveView }: { data: any, isLoading: boolean, onConnect: () => void, error: string | null, plan?: string, setActiveView: (view: 'analyzer' | 'project' | 'settings' | 'profile' | 'pricing') => void }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  if (!data && !isLoading && !error) {
    return (
      <CollapsibleSection id="gsc" title="Google Search Console Insight" icon={<Activity className="w-6 h-6" />} color="#4285F4" badge={plan === 'free' ? "STRATEGIC LOCK" : "PREMIUM DATA"} className="relative">
        <div className="flex flex-col items-center justify-center py-10 text-center relative">
          {plan === 'free' && (
            <div className="absolute inset-0 z-20 bg-white/40 dark:bg-black/40 backdrop-blur-[1.5px] flex flex-col items-center justify-center p-6 text-center">
               <div className="bg-[#1A1A1A] p-8 shadow-2xl border border-[#D4AF37]/30 max-w-[400px]">
                  <Lock className="w-10 h-10 text-[#D4AF37] mx-auto mb-4" />
                  <h4 className="text-[18px] font-black text-white uppercase tracking-tighter mb-2">Deep Performance Lock</h4>
                  <p className="text-[12px] text-zinc-400 mb-6 font-medium">Verknüpfe GSC-Daten und schalte mit <span className="text-[#D4AF37]">WAP Advanced</span> die exklusive Index-Analyse und Trend-Prognosen frei.</p>
                  <button 
                    onClick={() => setActiveView('pricing')}
                    className="w-full bg-[#D4AF37] text-black py-3 text-[10px] font-black uppercase tracking-widest hover:bg-white transition-colors"
                  >
                    UPGRADE TO UNLOCK
                  </button>
               </div>
            </div>
          )}
          <div className="w-16 h-16 bg-[#F5F5F3] dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6">
            <Activity className="w-8 h-8 text-[#4285F4] opacity-40" />
          </div>
          <h4 className="text-[16px] font-bold text-[#1A1A1A] dark:text-zinc-100 mb-2 uppercase">Echtzeit-Daten verknüpfen</h4>
          <p className="text-[13px] text-[#888888] dark:text-zinc-400 max-w-[400px] mb-8 leading-relaxed">
            Verbinden Sie Ihr Google-Konto, um Performance-Daten (Klicks, Impressionen), Indexierungsstatus und Crawling-Fehler direkt in diesen Bericht zu integrieren.
          </p>
          <button 
            disabled={plan === 'free'}
            onClick={onConnect}
            className={`px-8 py-3 text-[11px] font-bold uppercase tracking-[1px] transition-all flex items-center gap-3 active:scale-95 ${plan === 'free' ? 'bg-zinc-300 text-zinc-500 cursor-not-allowed opacity-50' : 'bg-[#4285F4] hover:bg-[#357ae8] text-white shadow-lg'}`}
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[30px] mb-[40px]">
         <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
            <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] dark:text-zinc-400 tracking-wider">SQLi / XSS Attack Surface</span>
             <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-white/90 font-medium">{detailedSecurity.sqlXssAssessment}</p>
         </div>
         <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
            <span className="text-[11px] uppercase font-bold mb-[5px] text-[#EB5757] tracking-wider flex items-center gap-1.5"><ShieldCheck className="w-3 h-3"/> Strict Security Header Check (CSP/HSTS)</span>
             <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-white/90 font-medium">{detailedSecurity.headerAnalysis}</p>
         </div>
         <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
            <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] dark:text-zinc-400 tracking-wider">Tech-Stack Identity (Information Disclosure)</span>
             <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-white/90 font-medium">{detailedSecurity.softwareConfig}</p>
         </div>
         <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
            <span className="text-[11px] uppercase font-bold mb-[5px] text-[#F2994A] tracking-wider flex items-center gap-1.5"><CodeXml className="w-3 h-3"/> Data Leakage & Email Scraping Risk</span>
             <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-white/90 font-medium">{detailedSecurity.dataLeakageAssessment}</p>
         </div>
         <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px] md:col-span-2">
            <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] dark:text-zinc-400 tracking-wider">Google Safe Browsing</span>
             <div className="flex items-center gap-2 mt-1">
                <span className={`w-2 h-2 rounded-full ${detailedSecurity.googleSafeBrowsingStatus?.toLowerCase().includes('sicher') ? 'bg-[#27AE60]' : 'bg-[#EB5757]'}`}></span>
                <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-white/90 font-medium">{detailedSecurity.googleSafeBrowsingStatus || 'Nicht geprüft'}</p>
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

function AccessibilityDeepDiveModule({ detailedAccessibility, maxDomDepth }: { detailedAccessibility: DetailedAccessibility, maxDomDepth?: number }) {
  return (
    <CollapsibleSection id="accessibility" title="Accessibility & Semantics Audit" icon={<UserCheck className="w-6 h-6" />} color="#27AE60" badge="A11Y DEEP DIVE">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[30px] mb-[40px]">
         <div className="flex flex-col gap-6">
           <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
              <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] dark:text-zinc-400 tracking-wider">Visual & Contrast / Alt-Texte</span>
               <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-zinc-100 font-medium">{detailedAccessibility.visualAndContrast}</p>
           </div>
           <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
              <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] dark:text-zinc-400 tracking-wider">Navigation, Semantics & ARIA</span>
               <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-zinc-100 font-medium">{detailedAccessibility.navigationAndSemantics}</p>
           </div>
         </div>
         
         {/* DOM Depth Visualizer */}
         <div className="bg-[#F5F5F3] dark:bg-zinc-950 p-[20px] flex flex-col justify-center border border-[#EEE] dark:border-zinc-800 min-h-[200px]">
            <span className="text-[11px] uppercase font-bold mb-[15px] text-[#888888] dark:text-zinc-400 tracking-wider text-center">DOM Structure Depth</span>
            
            <div className="flex flex-col items-center gap-4">
              <div className="relative flex items-center justify-center w-32 h-32 rounded-full border-4 shadow-sm" style={{ borderColor: maxDomDepth && maxDomDepth > 15 ? '#EB5757' : maxDomDepth && maxDomDepth > 10 ? '#F2994A' : '#27AE60' }}>
                <div className="flex flex-col items-center">
                  <span className="text-[32px] font-black leading-none" style={{ color: maxDomDepth && maxDomDepth > 15 ? '#EB5757' : maxDomDepth && maxDomDepth > 10 ? '#F2994A' : '#27AE60' }}>{maxDomDepth || 'N/A'}</span>
                  <span className="text-[10px] uppercase font-bold text-[#888888] mt-1">Levels Deep</span>
                </div>
              </div>
              
              <div className="text-center px-4 max-w-[280px]">
                {maxDomDepth && maxDomDepth > 15 ? (
                  <p className="text-[11px] text-[#EB5757] font-medium leading-relaxed">
                    <strong>Warnung:</strong> Ein sehr tiefer DOM (über 15) verschlechtert die Render-Geschwindigkeit (TBT) deulich und ist im mobilen Setup nicht ideal. Reduzieren Sie Div-Verschachtelungen.
                  </p>
                ) : maxDomDepth && maxDomDepth > 10 ? (
                  <p className="text-[11px] text-[#F2994A] font-medium leading-relaxed">
                    <strong>Hinweis:</strong> Die DOM-Verschachtelung ist erhöht. Eine flachere Struktur verbessert die Crawlbarkeit und Performance.
                  </p>
                ) : (
                  <p className="text-[11px] text-[#27AE60] font-medium leading-relaxed">
                    <strong>Exzellent:</strong> Eine flache und performante DOM-Struktur macht es Google leicht, die Seite zu verstehen ohne große Ladezeiten zu produzieren.
                  </p>
                )}
              </div>
            </div>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-10 items-start">
        {/* Left Column: Analysis & Assessment */}
        <div className="flex flex-col gap-8">
           {detailedPerformance.coreWebVitals && (
             <div className="flex flex-col gap-6">
               <div className="flex items-center justify-between mb-2">
                 <span className="text-[11px] uppercase font-black text-[#1A1A1A] dark:text-zinc-100 tracking-[1.5px] flex items-center gap-2">
                   <Activity className="w-4 h-4 text-[#D4AF37]" />
                   Core Web Vitals Insights
                 </span>
                 <div className="flex gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#27AE60]" title="Good"></span>
                    <span className="w-2 h-2 rounded-full bg-[#F2994A]" title="Needs Improvement"></span>
                    <span className="w-2 h-2 rounded-full bg-[#EB5757]" title="Poor"></span>
                 </div>
               </div>
               <div className="grid grid-cols-1 gap-4">
                 {[
                   { id: 'fcp', label: 'First Contentful Paint', data: detailedPerformance.coreWebVitals.fcp, icon: <Timer className="w-4 h-4" /> },
                   { id: 'lcp', label: 'Largest Contentful Paint', data: detailedPerformance.coreWebVitals.lcp, icon: <Layout className="w-4 h-4" /> },
                   { id: 'cls', label: 'Cumulative Layout Shift', data: detailedPerformance.coreWebVitals.cls, icon: <MoveHorizontal className="w-4 h-4" /> },
                 ].map((vital: any) => (
                   <div 
                     key={vital.id} 
                     className="bg-[#FFFFFF] dark:bg-zinc-900/50 p-4 border border-[#EEE] dark:border-zinc-800 flex flex-col relative overflow-hidden transition-all hover:bg-black/[0.02] dark:hover:bg-white/[0.02] group cursor-help"
                     title={METRIC_DEFINITIONS[vital.id.toUpperCase()]}
                   >
                     <div className={`absolute left-0 top-0 w-1.5 h-full ${vital.data?.status === 'good' ? 'bg-[#27AE60]' : vital.data?.status === 'poor' ? 'bg-[#EB5757]' : 'bg-[#F2994A]'}`} />
                     
                     <div className="flex justify-between items-center mb-3 pl-3">
                       <div className="flex items-center gap-3">
                         <div className="p-2 bg-[#F5F5F3] dark:bg-zinc-800 text-[#1A1A1A] dark:text-zinc-100">
                           {vital.icon}
                         </div>
                         <div className="flex flex-col">
                           <span className="text-[12px] font-black text-[#1A1A1A] dark:text-zinc-100 uppercase tracking-widest leading-none mb-1">{vital.id}</span>
                           <span className="text-[9px] text-[#888] uppercase font-bold tracking-wider">{vital.label}</span>
                         </div>
                       </div>
                       <div className="flex flex-col items-end">
                         <span className="text-[20px] font-black tracking-tighter" style={{ color: vital.data?.status === 'good' ? '#27AE60' : vital.data?.status === 'poor' ? '#EB5757' : '#F2994A'}}>{vital.data?.value || vital.data?.numericValue}</span>
                         <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 mt-1 ${vital.data?.status === 'good' ? 'text-[#27AE60] bg-[#27AE60]/10' : vital.data?.status === 'poor' ? 'text-[#EB5757] bg-[#EB5757]/10' : 'text-[#F2994A] bg-[#F2994A]/10'}`}>
                           {vital.data?.status?.toUpperCase() || 'N/A'}
                         </span>
                       </div>
                     </div>
                     
                     <div className="pl-3 mt-1 py-3 border-t border-[#F5F5F3] dark:border-zinc-800/50">
                        <p className="text-[11px] leading-[1.5] text-[#444] dark:text-zinc-400 font-medium">
                          <span className="uppercase text-[9px] font-black tracking-widest text-[#D4AF37] mr-2 inline-flex items-center gap-1"><Lightbulb className="w-3 h-3" /> FIX:</span> 
                          {vital.data?.recommendation}
                        </p>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
           )}

           <div className="space-y-4">
              <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
                 <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] dark:text-zinc-400 tracking-wider">General Performance Assessment</span>
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
              <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
                 <span className="text-[11px] uppercase font-bold mb-[5px] text-[#EB5757] dark:text-[#EB5757] tracking-wider flex items-center gap-2"><CodeXml className="w-3 h-3"/> DOM Complexity (Rendering Hit)</span>
                  <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-zinc-100 font-medium">{detailedPerformance.domComplexity}</p>
              </div>
              <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
                 <span className="text-[11px] uppercase font-bold mb-[5px] text-[#27AE60] dark:text-[#27AE60] tracking-wider flex items-center gap-2"><Activity className="w-3 h-3"/> Perfectionist Tweaks (Preloads, AVIF)</span>
                  <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-zinc-100 font-medium">{detailedPerformance.perfectionistTweaks}</p>
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
        </div>

        {/* Right Column: Data Visualization using Recharts */}
        <div className="bg-[#F5F5F3] dark:bg-zinc-800 p-[20px] pb-2 flex flex-col gap-[30px] shadow-sm border border-[#EEE] dark:border-zinc-700 sticky top-4">
           {detailedPerformance.chartData?.vitals && detailedPerformance.chartData.vitals.length > 0 && (
             <div className="h-[200px] w-full">
               <span className="text-[10px] uppercase font-bold text-[#1A1A1A] dark:text-[#FFFFFF] mb-[15px] block tracking-wider flex items-center gap-2">
                 <BarChart3 className="w-3 h-3" />
                 Estimated Vitals (ms)
               </span>
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
             <div className="h-[200px] w-full mt-4 border-t border-[#DDD] dark:border-white/10 pt-6">
               <span className="text-[10px] uppercase font-bold text-[#1A1A1A] dark:text-[#FFFFFF] mb-[15px] block tracking-wider flex items-center gap-2">
                 <MousePointer2 className="w-3 h-3" />
                 Resource Request Distribution
               </span>
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
    <section className="bg-[#FFFFFF] dark:bg-zinc-900 p-[30px] border-l border-black/5 flex flex-col">
      <div className="flex items-center justify-between mb-[20px]">
        <h3 className="text-[16px] font-black uppercase text-[#1A1A1A] dark:text-zinc-100 flex items-center gap-3">
           <Zap className="w-5 h-5 text-[#D4AF37]" />
           {title}
        </h3>
        <span className="text-[9px] px-2 py-1 bg-[#F5F5F3] dark:bg-zinc-950 uppercase font-bold text-[#1A1A1A] dark:text-zinc-100 tracking-wider border border-[#EEE] dark:border-zinc-800">{badge}</span>
      </div>

      <div className="space-y-6">
        <div>
          <h4 className="text-[10px] uppercase tracking-[2px] font-black text-[#888888] dark:text-zinc-400 mb-3 pb-2 border-b border-[#EEE] dark:border-zinc-800 flex items-center gap-2">
            <Eye className="w-3.5 h-3.5" />
            AI Insights
          </h4>
          <ul className="list-none flex flex-col">
            {(data.insights || []).map((insight, idx) => (
              <li key={idx} className="py-[12px] border-b border-[#EEE] dark:border-zinc-800 flex items-start justify-between gap-3 last:border-b-0">
                <div className="flex items-start gap-3">
                  <span className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${getStatusIconColor(data.score)}`}></span>
                  <span className="text-[12px] font-bold text-[#1A1A1A] dark:text-zinc-200 leading-[1.5]">{insight}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
        
        <div>
          <h4 className="text-[10px] uppercase tracking-[2px] font-black text-[#888888] dark:text-zinc-400 mb-3 pb-2 border-b border-[#EEE] dark:border-zinc-800 flex items-center gap-2">
            <Rocket className="w-3.5 h-3.5" />
            Empfohlene Maßnahmen
          </h4>
          <ul className="list-none flex flex-col">
            {(data.recommendations || []).map((rec, idx) => (
              <li key={idx} className="py-[12px] border-b border-[#EEE] dark:border-zinc-800 flex items-start justify-between gap-4 last:border-b-0">
                 <div className="flex items-start gap-3">
                   <span className="text-[9px] px-[6px] py-[2px] bg-[#1A1A1A] dark:bg-zinc-800 text-[#FFFFFF] font-black shrink-0 mt-[2px] uppercase tracking-tighter">
                     STEP {idx + 1}
                   </span>
                  <span className="text-[12px] font-bold text-[#1A1A1A] dark:text-zinc-200 leading-[1.5]">{rec}</span>
                 </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
