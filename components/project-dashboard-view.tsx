'use client';

import { memo } from 'react';
import { Zap, RefreshCw, BarChart3, Filter } from 'lucide-react';
import LoadingDisplay from './loading-display';
import ReportResultsView from './report-results-view';
import ScoreTrend from './score-trend';

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
  setActiveView
}: {
  project: any,
  onStartScan: (url: string) => void,
  isLoading: boolean,
  report: any,
  rawScrapeData: any,
  gscData: any,
  isGscLoading: boolean,
  onConnectGSC: () => void,
  gscError: string | null,
  onExportActionPlan: () => void,
  plan?: string,
  setActiveView: (view: any) => void
}) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="pb-10 border-b border-[#E5E5E5] dark:border-zinc-800 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
             <div className="w-10 h-10 bg-[#D4AF37] text-white flex items-center justify-center font-black rounded-sm shadow-lg">
                {project.name?.charAt(0).toUpperCase()}
             </div>
             <h2 className="text-[32px] md:text-[50px] font-black uppercase tracking-tighter leading-none text-[#1A1A1A] dark:text-zinc-100">
              {project.name}
            </h2>
          </div>
          <p className="text-[14px] text-[#888] font-bold uppercase tracking-widest flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#D4AF37]" />
            {project.url}
          </p>
        </div>
        {!report && !isLoading && (
          <button 
            onClick={() => onStartScan(project.url)}
            className="px-8 py-4 bg-[#D4AF37] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#1A1A1A] dark:hover:bg-zinc-100 transition-all flex items-center gap-3"
          >
            <RefreshCw className="w-4 h-4" />
            Projekt-Audit starten
          </button>
        )}
      </div>

      {!report && !isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-10">
          <div className="p-8 bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-[#888]" />
              <span className="text-[10px] font-black uppercase tracking-[2px] text-[#888888] dark:text-zinc-500">Letzter Score</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[48px] font-black tracking-tighter text-[#1A1A1A] dark:text-zinc-100">{project.lastScore || 'N/A'}</span>
              <span className="text-[14px] font-black opacity-30">%</span>
            </div>
          </div>
          <div className="p-8 bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-[#888]" />
              <span className="text-[10px] font-black uppercase tracking-[2px] text-[#888888] dark:text-zinc-500">Status</span>
            </div>
            <div className="text-[24px] font-black text-[#27AE60] uppercase tracking-tighter">Aktiv</div>
          </div>
          <div className="p-8 bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-[#888]" />
              <span className="text-[10px] font-black uppercase tracking-[2px] text-[#888888] dark:text-zinc-500">Modus</span>
            </div>
            <p className="text-[12px] font-bold text-[#1A1A1A] dark:text-zinc-100 uppercase tracking-widest">
              {plan === 'agency' ? 'WAP Enterprise v3' : plan === 'pro' ? 'WAP Advanced v2' : 'WAP Standard v1'}
            </p>
          </div>
        </div>
      )}
      
      {!report && !isLoading && <ScoreTrend url={project.url} />}

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

export default memo(ProjectDashboardView);
