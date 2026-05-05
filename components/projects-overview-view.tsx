'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, FolderKanban } from 'lucide-react';
import DataSourceBadge from './data-source-badge';
import ProjectFavicon, { getProjectDomain } from './project-favicon';
import type { Project } from '@/types/common';

export default function ProjectsOverviewView({
  onSelectProject,
  targetTab,
}: {
  onSelectProject: (project: Project) => void;
  targetTab?: string;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const targetLabel = targetTab && targetTab !== 'overview'
    ? targetTab.replaceAll('_', ' ')
    : null;

  useEffect(() => {
    async function loadProjects() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/projects');
        if (!response.ok) throw new Error('Projekte konnten nicht geladen werden');
        const data = await response.json();
        setProjects((data || []).sort((a: Project, b: Project) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Projekte konnten nicht geladen werden');
      } finally {
        setLoading(false);
      }
    }

    loadProjects();
  }, []);

  return (
    <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#EEE] dark:border-zinc-800 pb-8">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <FolderKanban className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-[10px] font-black uppercase tracking-[3px] text-[#D4AF37]">Projekte</span>
            <DataSourceBadge type={projects.length > 0 ? 'real' : 'unavailable'} label={projects.length > 0 ? 'Projekt-Datenbank' : 'Keine Projekte'} />
          </div>
          <h2 className="text-[32px] md:text-[46px] font-black uppercase tracking-tighter leading-none text-[#1A1A1A] dark:text-zinc-100">Projektübersicht</h2>
          <p className="text-[12px] text-[#888] font-bold uppercase tracking-widest leading-relaxed max-w-xl mt-4">
            {targetLabel
              ? `Wähle ein Projekt aus. Danach öffnet die App direkt den Bereich ${targetLabel}.`
              : 'Wähle ein Projekt aus. Danach öffnet die App den gewünschten Projektbereich mit echten Crawl- und Providerdaten.'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="h-[280px] bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 animate-pulse" />
      ) : error ? (
        <div className="min-h-[260px] bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 p-8 flex flex-col items-center justify-center text-center gap-4">
          <DataSourceBadge type="unavailable" label="Projekt-API nicht verfügbar" />
          <p className="text-[12px] text-[#888] font-bold uppercase tracking-widest">{error}</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="min-h-[260px] bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 p-8 flex flex-col items-center justify-center text-center gap-4">
          <FolderKanban className="w-10 h-10 text-[#888]" />
          <h3 className="text-[18px] font-black uppercase tracking-tighter text-[#1A1A1A] dark:text-zinc-100">Keine Projekte vorhanden</h3>
          <p className="text-[11px] text-[#888] font-bold uppercase tracking-widest max-w-md">
            Lege ein Projekt auf der Projektseite an oder starte zuerst eine Website-Analyse.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => onSelectProject(project)}
              className="group border border-[#EEE] bg-white p-5 text-left transition-all hover:border-[#D4AF37]/60 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 gap-3">
                  <ProjectFavicon url={project.url} name={project.name} className="h-10 w-10" iconClassName="h-5 w-5" />
                  <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-3 text-[#888]">
                    <span className="truncate text-[9px] font-black uppercase tracking-widest">{getProjectDomain(project.url) || 'Keine URL'}</span>
                  </div>
                  <h3 className="truncate text-[20px] font-black uppercase tracking-tighter text-[#1A1A1A] dark:text-zinc-100">{project.name}</h3>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-[#888]">
                    Letzter Scan: {project.lastScanAt ? new Date(project.lastScanAt).toLocaleDateString('de-DE') : 'Nicht verfügbar'}
                  </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-[#888] group-hover:text-[#D4AF37] group-hover:translate-x-1 transition-all shrink-0" />
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
