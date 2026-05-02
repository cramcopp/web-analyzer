'use client';

import { Archive, FileSearch, Globe2, ShieldCheck } from 'lucide-react';
import DataSourceBadge from './data-source-badge';
import type { EvidenceArtifact, UrlSnapshot } from '@/types/audit';

type ProjectEvidenceReport = {
  evidence?: EvidenceArtifact[];
  urlSnapshots?: UrlSnapshot[];
};

function formatDate(value?: string) {
  if (!value) return 'Nicht verfuegbar';
  return new Date(value).toLocaleString('de-DE');
}

export default function ProjectEvidenceView({ report }: { report: ProjectEvidenceReport | null }) {
  const evidence = report?.evidence || [];
  const snapshots = report?.urlSnapshots || [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#EEE] dark:border-zinc-800 pb-8">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Archive className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-[10px] font-black uppercase tracking-[3px] text-[#D4AF37]">Evidence Engine</span>
            <DataSourceBadge type={evidence.length > 0 || snapshots.length > 0 ? 'real' : 'unavailable'} label={evidence.length > 0 || snapshots.length > 0 ? 'Audit Evidence' : 'Keine Evidence'} />
          </div>
          <h2 className="text-[32px] md:text-[42px] font-black uppercase tracking-tighter leading-none text-[#1A1A1A] dark:text-zinc-100">Evidence</h2>
          <p className="text-[12px] text-[#888] font-bold mt-2 uppercase tracking-widest max-w-xl">
            Nachweis-Artefakte und URL-Snapshots aus dem Crawl. Rohes HTML wird hier bewusst nicht als Debugdump angezeigt.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800">
          <span className="text-[9px] font-black uppercase tracking-widest text-[#888] block mb-2">Evidence Artifacts</span>
          <span className="text-[28px] font-black text-[#1A1A1A] dark:text-zinc-100">{evidence.length}</span>
        </div>
        <div className="p-5 bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800">
          <span className="text-[9px] font-black uppercase tracking-widest text-[#888] block mb-2">URL Snapshots</span>
          <span className="text-[28px] font-black text-[#1A1A1A] dark:text-zinc-100">{snapshots.length}</span>
        </div>
        <div className="p-5 bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800">
          <span className="text-[9px] font-black uppercase tracking-widest text-[#888] block mb-2">Quelle</span>
          <DataSourceBadge type={evidence.length > 0 || snapshots.length > 0 ? 'real' : 'unavailable'} />
        </div>
      </div>

      {evidence.length === 0 && snapshots.length === 0 ? (
        <section className="min-h-[280px] bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 p-8 flex flex-col items-center justify-center text-center gap-4">
          <FileSearch className="w-10 h-10 text-[#888]" />
          <h3 className="text-[18px] font-black uppercase tracking-tighter text-[#1A1A1A] dark:text-zinc-100">Keine Evidence verfuegbar</h3>
          <p className="text-[11px] text-[#888] font-bold uppercase tracking-widest max-w-md">
            Starte einen neuen Scan. Diese Ansicht zeigt nur gespeicherte Crawl-Artefakte und URL-Snapshots.
          </p>
        </section>
      ) : (
        <>
          <section className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800">
            <div className="px-6 py-5 border-b border-[#EEE] dark:border-zinc-800 flex items-center justify-between gap-4">
              <h3 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">Artifacts</h3>
              <DataSourceBadge type={evidence.length > 0 ? 'real' : 'unavailable'} />
            </div>
            {evidence.length === 0 ? (
              <p className="p-6 text-[11px] text-[#888] font-bold uppercase tracking-widest">Keine Evidence Artifacts im aktuellen Report.</p>
            ) : (
              <div className="divide-y divide-[#EEE] dark:divide-zinc-800">
                {evidence.map((artifact) => (
                  <article key={artifact.id} className="p-6 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37]">{artifact.type}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#888] font-mono">{artifact.id}</span>
                      </div>
                      <p className="font-mono text-[11px] text-[#1A1A1A] dark:text-zinc-100 truncate">{artifact.url}</p>
                      <p className="text-[10px] text-[#888] font-bold uppercase tracking-widest mt-2">Erfasst: {formatDate(artifact.createdAt)}</p>
                    </div>
                    <div className="lg:text-right text-[10px] text-[#888] font-bold uppercase tracking-widest space-y-1">
                      {artifact.storageUri && <p>Storage URI vorhanden</p>}
                      {artifact.inlineValue && <p>Inline Value gespeichert, im UI ausgeblendet</p>}
                      {artifact.checksum && <p className="font-mono normal-case tracking-normal">Checksum: {artifact.checksum}</p>}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800">
            <div className="px-6 py-5 border-b border-[#EEE] dark:border-zinc-800 flex items-center justify-between gap-4">
              <h3 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">URL Snapshots</h3>
              <DataSourceBadge type={snapshots.length > 0 ? 'real' : 'unavailable'} />
            </div>
            {snapshots.length === 0 ? (
              <p className="p-6 text-[11px] text-[#888] font-bold uppercase tracking-widest">Keine URL Snapshots im aktuellen Report.</p>
            ) : (
              <div className="divide-y divide-[#EEE] dark:divide-zinc-800">
                {snapshots.map((snapshot) => (
                  <article key={snapshot.id} className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <Globe2 className="w-4 h-4 text-[#D4AF37]" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-[#888]">{snapshot.statusCode}</span>
                          <span className="text-[9px] font-black uppercase tracking-widest text-[#888]">{snapshot.contentType || 'Content-Type unbekannt'}</span>
                        </div>
                        <p className="font-mono text-[11px] text-[#1A1A1A] dark:text-zinc-100 truncate">{snapshot.url}</p>
                        <h4 className="text-[14px] font-black text-[#1A1A1A] dark:text-zinc-100 mt-3">{snapshot.title || 'Title nicht verfuegbar'}</h4>
                        <p className="text-[11px] text-[#888] mt-1">{snapshot.metaDescription || 'Meta Description nicht verfuegbar'}</p>
                      </div>
                      <div className="shrink-0">
                        <DataSourceBadge type="real" label="Snapshot" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-[#EEE] dark:border-zinc-800">
                        <span className="text-[8px] font-black uppercase tracking-widest text-[#888] block mb-1">Internal Links</span>
                        <span className="text-[16px] font-black">{snapshot.internalLinks?.length || 0}</span>
                      </div>
                      <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-[#EEE] dark:border-zinc-800">
                        <span className="text-[8px] font-black uppercase tracking-widest text-[#888] block mb-1">External Links</span>
                        <span className="text-[16px] font-black">{snapshot.externalLinks?.length || 0}</span>
                      </div>
                      <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-[#EEE] dark:border-zinc-800">
                        <span className="text-[8px] font-black uppercase tracking-widest text-[#888] block mb-1">Images</span>
                        <span className="text-[16px] font-black">{snapshot.images?.length || 0}</span>
                      </div>
                      <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-[#EEE] dark:border-zinc-800">
                        <span className="text-[8px] font-black uppercase tracking-widest text-[#888] block mb-1">H1</span>
                        <span className="text-[16px] font-black">{snapshot.headings?.h1?.length || 0}</span>
                      </div>
                    </div>
                    {snapshot.canonical && (
                      <p className="text-[10px] text-[#888] font-bold uppercase tracking-widest mt-4 flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" /> Canonical: <span className="font-mono normal-case tracking-normal truncate">{snapshot.canonical}</span>
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
