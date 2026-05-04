'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  FileCode,
  FileSpreadsheet,
  GitBranch,
  Link2,
  Lock,
  Network,
  Search,
  Tags,
  Target,
} from 'lucide-react';
import type { AnalysisResult } from '@/lib/scanner/types';
import { analyzeInternalLinking, internalLinkingCsv } from '@/lib/internal-linking';
import { getPlanConfig } from '@/lib/plans';
import DataSourceBadge from './data-source-badge';
import { EmptyState, PriorityBadge, StatCard, TabButton, UrlLabel } from './linking/linking-ui';

const TABS = [
  { id: 'overview', label: 'Overview', icon: Network },
  { id: 'opportunities', label: 'Link Jobs', icon: Target },
  { id: 'matrix', label: 'Matrix', icon: ArrowRightLeft },
  { id: 'topic_hubs', label: 'Topic Hubs', icon: GitBranch },
  { id: 'orphans', label: 'Orphans', icon: AlertTriangle },
  { id: 'anchors', label: 'Anchors', icon: Tags },
  { id: 'existing', label: 'Existing', icon: Link2 },
  { id: 'export', label: 'Export', icon: FileSpreadsheet },
] as const;

type LinkingTabId = typeof TABS[number]['id'];

function urlPath(url: string) {
  try {
    return new URL(url).pathname || '/';
  } catch {
    return url;
  }
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
  const exportUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = exportUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(exportUrl);
}

export default function ProjectLinkingView({ report, plan = 'free' }: { report: AnalysisResult | null; plan?: string }) {
  const [activeTab, setActiveTab] = useState<LinkingTabId>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [exportNotice, setExportNotice] = useState('');
  const planConfig = getPlanConfig(plan);
  const canExportCsv = (planConfig.exports as readonly string[]).includes('csv');
  const analysis = useMemo(() => (report ? analyzeInternalLinking(report) : null), [report]);

  const filteredGraph = useMemo(() => {
    if (!analysis) return [];
    const query = searchTerm.toLowerCase();
    return analysis.graph.filter((page) =>
      page.url.toLowerCase().includes(query) ||
      page.title?.toLowerCase().includes(query) ||
      page.h1?.toLowerCase().includes(query)
    );
  }, [analysis, searchTerm]);

  const handleExport = () => {
    if (!canExportCsv) {
      setExportNotice('CSV Export ist in diesem Plan nicht freigeschaltet.');
      return;
    }
    if (!report) return;
    setExportNotice('');
    downloadCsv(`wap_internal_link_jobs_${new Date().toISOString().split('T')[0]}.csv`, internalLinkingCsv(report));
  };

  if (!report || !analysis) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-[#888] mb-4">
          <Network className="w-8 h-8" />
        </div>
        <h3 className="text-[20px] font-black uppercase tracking-tighter text-[#1A1A1A] dark:text-zinc-100">Keine Daten verfügbar</h3>
        <p className="text-[12px] text-[#888] font-bold uppercase tracking-widest italic">Starten Sie einen Scan, um die Verlinkungs-Analyse zu nutzen.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#EEE] dark:border-zinc-800 pb-8">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Network className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-[10px] font-black uppercase tracking-[3px] text-[#D4AF37]">BERTlinker Internal Linking</span>
            <DataSourceBadge type="real" label="Crawl Links" />
            <DataSourceBadge type="heuristic" label="Semantic Layer" />
          </div>
          <h2 className="text-[32px] md:text-[42px] font-black uppercase tracking-tighter leading-none text-[#1A1A1A] dark:text-zinc-100">Interne Verlinkung</h2>
          <p className="text-[12px] text-[#888] font-bold mt-2 uppercase tracking-widest max-w-xl">
            LinkGraph, konkrete Link-Jobs, Orphans, Topic Hubs, Anchor-Vorschläge und bestehende Links aus echten Crawl-Daten.
          </p>
        </div>
        <button
          onClick={handleExport}
          className={`px-6 py-4 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all shadow-xl ${
            canExportCsv
              ? 'bg-[#1A1A1A] dark:bg-white text-white dark:text-zinc-900 hover:bg-[#D4AF37] hover:text-white'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
          }`}
        >
          {canExportCsv ? <FileSpreadsheet className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          CSV Export
        </button>
      </div>
      {exportNotice && <p className="text-[10px] text-[#888] font-black uppercase tracking-widest">{exportNotice}</p>}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard label="URLs im LinkGraph" value={analysis.graph.length} />
        <StatCard label="Bestehende Links" value={analysis.existingLinks.length} tone="green" />
        <StatCard label="Link-Jobs" value={analysis.opportunities.length} tone="gold" />
        <StatCard label="Orphan Pages" value={analysis.orphanPages.length} tone={analysis.orphanPages.length > 0 ? 'red' : 'green'} />
        <StatCard label="Topic Hubs" value={analysis.topicHubs.length} />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[#EEE] dark:border-zinc-800 pb-4">
        {TABS.map((tab) => (
          <TabButton key={tab.id} active={activeTab === tab.id} icon={tab.icon} label={tab.label} onClick={() => setActiveTab(tab.id)} />
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 overflow-hidden">
            <div className="px-6 py-5 border-b border-[#EEE] dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h4 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">Internal Linking Overview</h4>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
                <input
                  type="text"
                  placeholder="URL suchen..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 text-[12px] focus:outline-none focus:border-[#D4AF37] transition-all"
                />
              </div>
            </div>
            {filteredGraph.length === 0 ? (
              <EmptyState>Keine URLs im aktuellen Crawl-Fenster erkannt.</EmptyState>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#F5F5F3] dark:bg-zinc-950">
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#888]">URL</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#888]">In / Out</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#888]">Depth</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#888]">Money</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEE] dark:divide-zinc-800">
                  {filteredGraph.slice(0, 14).map((page) => (
                    <tr key={page.normalizedUrl}>
                      <td className="px-6 py-4"><UrlLabel url={page.url} strong /></td>
                      <td className="px-6 py-4 text-[12px] font-black text-[#1A1A1A] dark:text-zinc-100">{page.inlinks.length} / {page.outlinks.length}</td>
                      <td className="px-6 py-4 text-[12px] font-black text-[#888]">{page.crawlDepth ?? 'n/a'}</td>
                      <td className="px-6 py-4">{page.isMoneyPage ? <DataSourceBadge type="real" label="Money Page" /> : <span className="text-[10px] text-[#888] font-bold">-</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="bg-[#1A1A1A] dark:bg-zinc-950 border border-white/5 p-6">
            <h4 className="text-[14px] font-black uppercase tracking-widest text-white mb-5">Nächste Link-Jobs</h4>
            {analysis.opportunities.length === 0 ? (
              <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest">Keine Link-Jobs im Crawl erkannt.</p>
            ) : (
              <div className="space-y-4">
                {analysis.opportunities.slice(0, 5).map((job) => (
                  <div key={`${job.sourceUrl}_${job.targetUrl}`} className="border-b border-white/10 pb-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <PriorityBadge priority={job.priority} confidence={job.confidence} />
                      <DataSourceBadge type={job.sourceType} label="Opportunity" />
                    </div>
                    <p className="text-[12px] font-black text-white truncate">{job.suggestedAnchor}</p>
                    <p className="text-[10px] text-zinc-500 font-bold mt-1 truncate">{urlPath(job.sourceUrl)} {'->'} {urlPath(job.targetUrl)}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === 'opportunities' && (
        <section className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 overflow-hidden">
          <div className="px-6 py-5 border-b border-[#EEE] dark:border-zinc-800 flex items-center justify-between gap-4">
            <h4 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">Link Opportunities</h4>
            <DataSourceBadge type="heuristic" label="title+h1+h2+textBasis" />
          </div>
          {analysis.opportunities.length === 0 ? (
            <EmptyState>Keine Link Opportunities im aktuellen Crawl-Fenster erkannt.</EmptyState>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#F5F5F3] dark:bg-zinc-950">
                  <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#888]">Quelle</th>
                  <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#888]">Ziel</th>
                  <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#888]">Anchor</th>
                  <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#888]">Priorität</th>
                  <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#888]">Grund</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEE] dark:divide-zinc-800">
                {analysis.opportunities.slice(0, 30).map((item) => (
                  <tr key={`${item.sourceUrl}-${item.targetUrl}`}>
                    <td className="px-6 py-4"><UrlLabel url={item.sourceUrl} /></td>
                    <td className="px-6 py-4"><UrlLabel url={item.targetUrl} strong /></td>
                    <td className="px-6 py-4 text-[12px] font-black text-[#D4AF37]">{item.suggestedAnchor}</td>
                    <td className="px-6 py-4"><PriorityBadge priority={item.priority} confidence={item.confidence} /></td>
                    <td className="px-6 py-4 text-[11px] text-[#888] font-bold max-w-[260px]">{item.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {activeTab === 'matrix' && (
        <section className="bg-[#1A1A1A] dark:bg-zinc-950 p-8 border border-white/5 relative overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <ArrowRightLeft className="w-5 h-5 text-[#D4AF37]" />
            <h4 className="text-[18px] font-black uppercase tracking-tighter text-white">Cross-Linking Matrix</h4>
            <DataSourceBadge type="real" label="Existing Links" />
            <DataSourceBadge type="heuristic" label="Missing Chances" />
          </div>
          {analysis.matrixPages.length === 0 ? (
            <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest">Keine Matrix-Daten verfügbar.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="p-2 border border-white/10 text-[8px] font-black text-zinc-500 uppercase">Source / Target</th>
                    {analysis.matrixPages.map((page) => (
                      <th key={page.normalizedUrl} className="p-2 border border-white/10 text-[8px] font-black text-zinc-500 uppercase whitespace-nowrap overflow-hidden max-w-[110px] text-ellipsis">
                        {urlPath(page.url)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analysis.matrix.map((row, rowIndex) => (
                    <tr key={analysis.matrixPages[rowIndex]?.normalizedUrl}>
                      <td className="p-2 border border-white/10 text-[8px] font-black text-zinc-300 uppercase whitespace-nowrap overflow-hidden max-w-[150px] text-ellipsis bg-white/5">
                        {urlPath(analysis.matrixPages[rowIndex]?.url || '')}
                      </td>
                      {row.map((cell, cellIndex) => (
                        <td key={`${cell.sourceUrl}_${cell.targetUrl}`} className="p-2 border border-white/10 text-center">
                          {rowIndex === cellIndex ? (
                            <span className="text-[8px] text-zinc-700">-</span>
                          ) : cell.existingLink ? (
                            <div className="w-2 h-2 bg-[#D4AF37] mx-auto rounded-full shadow-[0_0_8px_rgba(212,175,55,0.5)]" title="Bestehender Link" />
                          ) : cell.opportunity ? (
                            <div className="w-3 h-3 border border-[#27AE60] mx-auto rounded-full" title={cell.suggestedAnchor || 'Link Opportunity'} />
                          ) : (
                            <div className="w-1 h-1 bg-white/10 mx-auto rounded-full" />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-6 text-[10px] text-zinc-500 font-bold uppercase tracking-widest italic flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-[#D4AF37]" />
            Gold = bestehender Crawl-Link. Grün = fehlende Chance aus heuristischer Semantic Layer. Kein Random.
          </p>
        </section>
      )}

      {activeTab === 'topic_hubs' && (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {analysis.topicHubs.map((hub) => (
            <div key={hub.topic} className="p-6 bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800">
              <div className="flex items-start justify-between gap-4 mb-4">
                <h4 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">{hub.topic}</h4>
                <span className="text-[18px] font-black text-[#D4AF37]">{hub.urls.length}</span>
              </div>
              {hub.hubUrl && <UrlLabel url={hub.hubUrl} strong />}
              <div className="grid grid-cols-2 gap-3 mt-5">
                <StatCard label="Avg Inlinks" value={hub.averageInlinks} />
                <StatCard label="Orphans" value={hub.orphanCount} tone={hub.orphanCount > 0 ? 'red' : 'green'} />
              </div>
            </div>
          ))}
        </section>
      )}

      {activeTab === 'orphans' && (
        <section className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 overflow-hidden">
          <div className="px-6 py-5 border-b border-[#EEE] dark:border-zinc-800 flex items-center justify-between gap-4">
            <h4 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">Orphan Pages & Low-Inlink Targets</h4>
            <DataSourceBadge type="real" label="Crawl Depth/Inlinks" />
          </div>
          {analysis.lowInlinkTargets.length === 0 ? (
            <EmptyState>Keine Orphans oder Low-Inlink-Ziele im Crawl erkannt.</EmptyState>
          ) : (
            <table className="w-full text-left">
              <tbody className="divide-y divide-[#EEE] dark:divide-zinc-800">
                {analysis.lowInlinkTargets.slice(0, 30).map((page) => (
                  <tr key={page.normalizedUrl}>
                    <td className="px-6 py-4"><UrlLabel url={page.url} strong /></td>
                    <td className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-[#888]">Depth {page.crawlDepth ?? 'n/a'}</td>
                    <td className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-[#888]">{page.inlinks.length} Inlinks</td>
                    <td className="px-6 py-4">{page.isOrphan ? <DataSourceBadge type="real" label="Orphan" /> : <DataSourceBadge type="real" label="Low Inlink" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {activeTab === 'anchors' && (
        <section className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 overflow-hidden">
          <div className="px-6 py-5 border-b border-[#EEE] dark:border-zinc-800 flex items-center justify-between gap-4">
            <h4 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">Anchor Text Suggestions</h4>
            <DataSourceBadge type="heuristic" label="H1/Title/Existing Anchors" />
          </div>
          {analysis.anchorSuggestions.length === 0 ? (
            <EmptyState>Keine Anchor-Vorschläge vorhanden.</EmptyState>
          ) : (
            <table className="w-full text-left">
              <tbody className="divide-y divide-[#EEE] dark:divide-zinc-800">
                {analysis.anchorSuggestions.slice(0, 30).map((item) => (
                  <tr key={`${item.sourceUrl}_${item.targetUrl}`}>
                    <td className="px-6 py-4"><UrlLabel url={item.sourceUrl} /></td>
                    <td className="px-6 py-4"><UrlLabel url={item.targetUrl} strong /></td>
                    <td className="px-6 py-4">
                      <p className="text-[12px] font-black text-[#D4AF37]">{item.suggestedAnchor}</p>
                      <p className="text-[10px] text-[#888] mt-1">{item.existingAnchors.length > 0 ? item.existingAnchors.join(', ') : 'Keine bestehenden Anchors für Zielseite'}</p>
                    </td>
                    <td className="px-6 py-4"><PriorityBadge confidence={item.confidence} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {activeTab === 'existing' && (
        <section className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 overflow-hidden">
          <div className="px-6 py-5 border-b border-[#EEE] dark:border-zinc-800 flex items-center justify-between gap-4">
            <h4 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">Existing Link Check</h4>
            <DataSourceBadge type="real" label="Crawl Anchors" />
          </div>
          {analysis.existingLinks.length === 0 ? (
            <EmptyState>Keine bestehenden internen Links zwischen gecrawlten Seiten erkannt.</EmptyState>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#F5F5F3] dark:bg-zinc-950">
                  <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#888]">Quelle</th>
                  <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#888]">Ziel</th>
                  <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#888]">Anchor</th>
                  <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#888]">Quelle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEE] dark:divide-zinc-800">
                {analysis.existingLinks.slice(0, 40).map((link) => (
                  <tr key={`${link.sourceUrl}_${link.targetUrl}_${link.anchorText}`}>
                    <td className="px-6 py-4"><UrlLabel url={link.sourceUrl} /></td>
                    <td className="px-6 py-4"><UrlLabel url={link.targetUrl} strong /></td>
                    <td className="px-6 py-4 text-[12px] font-black text-[#D4AF37]">{link.anchorText || 'Kein Anchor Text'}</td>
                    <td className="px-6 py-4"><DataSourceBadge type={link.anchorSourceType} label={link.anchorSourceType === 'real' ? 'Anchor Text' : 'URL Fallback'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {activeTab === 'export' && (
        <section className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileCode className="w-4 h-4 text-[#D4AF37]" />
                <h4 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">CSV Export</h4>
              </div>
              <p className="text-[11px] text-[#888] font-bold uppercase tracking-widest max-w-2xl">
                Exportiert konkrete Link-Jobs mit sourceUrl, targetUrl, suggestedAnchor, reason, priority, confidence, sourceType und existingLink.
              </p>
            </div>
            <button
              onClick={handleExport}
              className={`px-6 py-4 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                canExportCsv
                  ? 'bg-[#1A1A1A] dark:bg-white text-white dark:text-zinc-900 hover:bg-[#D4AF37] hover:text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
              }`}
            >
              {canExportCsv ? <FileSpreadsheet className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              CSV herunterladen
            </button>
          </div>
          {!canExportCsv && <p className="mt-4 text-[10px] text-[#888] font-bold uppercase tracking-widest">In {planConfig.name} sind Exporte laut zentraler Plan-Config nicht aktiv.</p>}
        </section>
      )}
    </div>
  );
}
