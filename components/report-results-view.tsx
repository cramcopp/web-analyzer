'use client';

import { memo, useMemo } from 'react';
import { 
  Download, Share2, Zap, Search, 
  ShieldCheck, UserCheck, Scale, CodeXml, Copy, Star 
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  Radar 
} from 'recharts';
import { motion, Variants } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import { ReportData } from '../types/report';
import ErrorBoundary from './error-boundary';

// Dynamic Imports for Performance Optimization
const SeoDeepDiveModule = dynamic(() => import('./seo-module'), { loading: () => <div className="h-40 animate-pulse bg-zinc-100 dark:bg-zinc-800" /> });
const SearchConsoleModule = dynamic(() => import('./search-console-module'), { loading: () => <div className="h-40 animate-pulse bg-zinc-100 dark:bg-zinc-800" /> });
const SecurityDeepDiveModule = dynamic(() => import('./security-module'), { loading: () => <div className="h-40 animate-pulse bg-zinc-100 dark:bg-zinc-800" /> });
const PerformanceDeepDiveModule = dynamic(() => import('./performance-module'), { loading: () => <div className="h-40 animate-pulse bg-zinc-100 dark:bg-zinc-800" /> });
const AccessibilityDeepDiveModule = dynamic(() => import('./accessibility-module'), { loading: () => <div className="h-40 animate-pulse bg-zinc-100 dark:bg-zinc-800" /> });
const ComplianceDeepDiveModule = dynamic(() => import('./compliance-module'), { loading: () => <div className="h-40 animate-pulse bg-zinc-100 dark:bg-zinc-800" /> });
const ContentStrategyModule = dynamic(() => import('./content-strategy-module'), { loading: () => <div className="h-40 animate-pulse bg-zinc-100 dark:bg-zinc-800" /> });
const ImplementationPlanModule = dynamic(() => import('./implementation-plan'), { loading: () => <div className="h-40 animate-pulse bg-zinc-100 dark:bg-zinc-800" /> });
const CompetitorMap = dynamic(() => import('./competitor-map'), { loading: () => <div className="h-40 animate-pulse bg-zinc-100 dark:bg-zinc-800" /> });
const QuickNav = dynamic(() => import('./quick-nav'), { ssr: false });
const ScoreCard = dynamic(() => import('./score-card'));
const DetailSection = dynamic(() => import('./detail-section'));

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" }
  }
};

function ReportResultsView({
  report,
  rawScrapeData,
  gscData,
  isGscLoading,
  onConnectGSC,
  gscError,
  onExportActionPlan,
  plan = 'free',
  setActiveView
}: {
  report: ReportData,
  rawScrapeData: any,
  gscData: any,
  isGscLoading: boolean,
  onConnectGSC: () => void,
  gscError: string | null,
  onExportActionPlan: () => void,
  plan?: string,
  setActiveView: (view: any) => void
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const techMetadata = useMemo(() => ({
    audit_id: rawScrapeData?.audit_id || '—',
    timestamp: rawScrapeData?.createdAt || '—'
  }), [rawScrapeData?.audit_id, rawScrapeData?.createdAt]);

  const radarData = useMemo(() => [
    { subject: 'SEO', A: report.seo?.score || 0, full: 100 },
    { subject: 'Security', A: report.security?.score || 0, full: 100 },
    { subject: 'Perf', A: report.performance?.score || 0, full: 100 },
    { subject: 'A11y', A: report.accessibility?.score || 0, full: 100 },
    { subject: 'Legal', A: report.compliance?.score || 0, full: 100 },
    { subject: 'Content', A: report.contentStrategy?.score || 0, full: 100 },
  ], [report]);

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-[1400px] mx-auto px-4 md:px-0"
    >
      <motion.div variants={itemVariants} className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-black/10 dark:border-white/10 print:hidden">
        <div>
           <span className="text-[10px] font-black uppercase tracking-[2.5px] text-[#D4AF37] mb-2 block">Audit abgeschlossen</span>
           <h2 className="text-[32px] md:text-[48px] font-black uppercase tracking-tighter leading-none text-[#1A1A1A] dark:text-zinc-100">Audit Bericht</h2>
           <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4">
              <p className="text-[12px] text-[#888] font-bold uppercase tracking-widest">{rawScrapeData?.urlObj ? (() => { try { return new URL(rawScrapeData.urlObj).hostname; } catch { return rawScrapeData.urlObj; } })() : '—'} • {new Date().toLocaleDateString('de-DE')}</p>
              <div className="h-4 w-[1px] bg-[#888]/30 hidden sm:block" />
              <div className="flex items-center gap-3">
                 <div className="flex flex-col">
                    <span className="text-[9px] font-black text-[#888] uppercase tracking-tighter leading-none">Gecrawlte Seiten</span>
                    <span className="text-[14px] font-black text-[#1A1A1A] dark:text-white leading-tight">{rawScrapeData?.crawlSummary?.totalInternalLinks || 1}</span>
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[9px] font-black text-[#888] uppercase tracking-tighter leading-none">Indexierbare Seiten</span>
                    <span className="text-[14px] font-black text-[#D4AF37] leading-tight">{rawScrapeData?.crawlSummary?.indexablePagesCount || 1}</span>
                 </div>
              </div>
           </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.print()}
            className="px-5 py-3 bg-[#FFFFFF] dark:bg-zinc-900 border border-[#E5E5E5] dark:border-zinc-800 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-[#F5F5F3] dark:hover:bg-zinc-800 transition-all shadow-sm"
          >
            <Download className="w-3 h-3" />
            Export PDF
          </button>
          <button 
            onClick={onExportActionPlan}
            className="px-5 py-3 bg-[#1A1A1A] dark:bg-zinc-100 text-[#FFFFFF] dark:text-zinc-900 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-[#D4AF37] transition-all shadow-xl shadow-black/5"
          >
            <Share2 className="w-3 h-3" />
            Action Plan CSV
          </button>
        </div>
      </motion.div>

      <QuickNav />

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-[60px] items-center">
        <div id="summary" className="grid grid-cols-1 md:grid-cols-2 gap-4 scroll-mt-24">
          <ScoreCard title="SEO Score" score={report.seo?.score || 0} desc="Content & Visibility" icon={<Search className="w-3 h-3" />} />
          <ScoreCard title="Security" score={report.security?.score || 0} desc="Safety & Headers" icon={<ShieldCheck className="w-3 h-3" />} />
          <ScoreCard title="Performance" score={report.performance?.score || 0} desc="Speed & Assets" icon={<Zap className="w-3 h-3" />} />
          <ScoreCard title="Accessibility" score={report.accessibility?.score || 0} desc="A11y & Structure" icon={<UserCheck className="w-3 h-3" />} />
          <ScoreCard title="Compliance" score={report.compliance?.score || 0} desc="GDPR & Legal" icon={<Scale className="w-3 h-3" />} />
          <ScoreCard title="Content Strategy" score={report.contentStrategy?.score || 0} desc="Topics & Tone" icon={<Zap className="w-3 h-3" />} />
        </div>
        <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm border border-[#E5E5E5] dark:border-zinc-800 p-8 h-[400px] flex flex-col items-center justify-center relative overflow-hidden group shadow-2xl shadow-black/5" style={{ minHeight: 200 }}>
           <div className="absolute top-4 left-6">
              <span className="text-[10px] font-black uppercase tracking-[2px] text-[#888]">Audit Radar</span>
           </div>
           <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke={isDark ? '#333' : '#EEE'} />
                <PolarAngleAxis dataKey="subject" tick={{ fill: isDark ? '#888' : '#666', fontSize: 10, fontWeight: 'bold' }} />
                <Radar
                  name="Audit"
                  dataKey="A"
                  stroke="#D4AF37"
                  fill="#D4AF37"
                  fillOpacity={0.4}
                />
              </RadarChart>
           </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <ErrorBoundary moduleName="Competitor Benchmarking">
          <CompetitorMap 
            competitors={report.competitorBenchmarking} 
            userScore={((report.seo?.score || 0) + (report.performance?.score || 0)) / 2} 
            userName={rawScrapeData?.urlObj ? (() => { try { return new URL(rawScrapeData.urlObj).hostname; } catch { return rawScrapeData.urlObj; } })() : 'website'}
          />
        </ErrorBoundary>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-[80px]">
        <DetailSection title="SEO Deep Insights" data={report.seo || { score: 0, insights: [], recommendations: [] }} badge="VISIBILITY" />
        <DetailSection title="Security Audit" data={report.security || { score: 0, insights: [], recommendations: [] }} badge="PROTECTION" />
        <DetailSection title="Performance" data={report.performance || { score: 0, insights: [], recommendations: [] }} badge="UX/SPEED" />
        <DetailSection title="Accessibility" data={report.accessibility || { score: 0, insights: [], recommendations: [] }} badge="INCLUSION" />
        <DetailSection title="Compliance" data={report.compliance || { score: 0, insights: [], recommendations: [] }} badge="LEGAL" />
        <DetailSection title="Content Strategy" data={report.contentStrategy || { score: 0, insights: [], recommendations: [] }} badge="AUTHORITY" />
      </motion.div>

      <div className="space-y-[80px] pb-20">
        <motion.div variants={itemVariants}>
          <ErrorBoundary moduleName="SEO Deep Dive">
            <SeoDeepDiveModule 
              detailedSeo={report.seo?.detailedSeo || {} as any} 
              socialData={rawScrapeData?.social} 
              crawlSummary={rawScrapeData?.crawlSummary} 
              plan={plan} 
            />
          </ErrorBoundary>
        </motion.div>
        
        <motion.div variants={itemVariants}>
          <ErrorBoundary moduleName="Google Search Console">
            <SearchConsoleModule 
              data={gscData} 
              isLoading={isGscLoading} 
              onConnect={onConnectGSC} 
              error={gscError} 
              plan={plan}
              setActiveView={setActiveView}
            />
          </ErrorBoundary>
        </motion.div>

        <motion.div variants={itemVariants}>
          <ErrorBoundary moduleName="Security Module">
            <SecurityDeepDiveModule detailedSecurity={report.security?.detailedSecurity || {} as any} />
          </ErrorBoundary>
        </motion.div>
        
        <motion.div variants={itemVariants}>
          <ErrorBoundary moduleName="Performance Module">
            <PerformanceDeepDiveModule detailedPerformance={report.performance?.detailedPerformance || {} as any} />
          </ErrorBoundary>
        </motion.div>
        
        <motion.div variants={itemVariants}>
          <ErrorBoundary moduleName="Accessibility Module">
            <AccessibilityDeepDiveModule 
              detailedAccessibility={report.accessibility?.detailedAccessibility || {} as any} 
              maxDomDepth={rawScrapeData?.maxDomDepth} 
            />
          </ErrorBoundary>
        </motion.div>
        
        <motion.div variants={itemVariants}>
          <ErrorBoundary moduleName="Compliance Module">
            <ComplianceDeepDiveModule 
              detailedCompliance={report.compliance?.detailedCompliance || {} as any} 
              legalData={rawScrapeData?.legal} 
            />
          </ErrorBoundary>
        </motion.div>

        <motion.div variants={itemVariants}>
          <ErrorBoundary moduleName="Content Strategy Module">
            <ContentStrategyModule 
              detailedContent={report.contentStrategy?.detailedContent || {} as any} 
            />
          </ErrorBoundary>
        </motion.div>

        <motion.div variants={itemVariants}>
          <ErrorBoundary moduleName="Implementation Plan">
            <ImplementationPlanModule plan={report.implementationPlan} />
          </ErrorBoundary>
        </motion.div>

        <motion.div variants={itemVariants} className="mt-24 pt-12 border-t border-[#E5E5E5] dark:border-zinc-800 break-inside-avoid">
           <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                 <CodeXml className="w-6 h-6 text-[#888]" />
                 <h4 className="text-[24px] font-black uppercase tracking-tighter text-[#1A1A1A] dark:text-zinc-100">Technischer Anhang</h4>
              </div>
              <span className="text-[9px] font-bold text-[#888] uppercase tracking-[2px]">Developer Mode</span>
           </div>
           <div className="bg-[#1A1A1A] dark:bg-zinc-950 p-6 border border-[#333] dark:border-zinc-800 overflow-hidden group rounded-lg">
              <p className="text-[11px] text-[#555] font-bold uppercase tracking-widest mb-4">Rohdaten für Entwicklung & Debugging</p>
              <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                <pre className="text-[12px] font-mono text-zinc-400 selection:bg-[#D4AF37]/30 whitespace-pre">
                  {JSON.stringify({
                    audit_id: techMetadata.audit_id,
                    timestamp: techMetadata.timestamp,
                    tech_stack: rawScrapeData?.techStack,
                    security_headers: rawScrapeData?.securityHeaders,
                    ssl_details: rawScrapeData?.sslCertificate,
                    performance_metrics: rawScrapeData?.lighthouseScores,
                    schema_types: rawScrapeData?.schemaTypes,
                    internal_links: rawScrapeData?.internalLinksCount
                  }, null, 2)}
                </pre>
              </div>
              <div className="mt-6 flex justify-end">
                 <button 
                   onClick={() => {
                     navigator.clipboard.writeText(JSON.stringify(rawScrapeData, null, 2));
                     alert('Alle Rohdaten wurden in die Zwischenablage kopiert!');
                   }}
                   className="px-4 py-2 bg-zinc-800 text-zinc-400 text-[9px] font-black uppercase tracking-widest hover:text-white transition-colors flex items-center gap-2 rounded shadow-sm"
                 >
                   <Copy className="w-3.5 h-3.5" /> Full JSON kopieren
                 </button>
              </div>
           </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default memo(ReportResultsView);
