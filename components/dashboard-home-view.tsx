'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ChevronDown, FileSearch, FolderKanban, Gauge, LockKeyhole, Search } from 'lucide-react';
import ProjectFavicon, { getProjectDomain } from './project-favicon';
import type { Project } from '@/types/common';

type DashboardHomeViewProps = {
  selectedProject: Project | null;
  onSelectProject: (project: Project) => void;
  onOpenProjects: () => void;
  onOpenScanner: () => void;
  onOpenPricing: () => void;
  onSignIn: () => void;
  user?: any | null;
  userData?: any | null;
};

export default function DashboardHomeView({
  selectedProject,
  onSelectProject,
  onOpenProjects,
  onOpenScanner,
  onOpenPricing,
  onSignIn,
  user,
  userData,
}: DashboardHomeViewProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    async function loadProjects() {
      if (!user) {
        await Promise.resolve();
        setProjects([]);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/projects');
        if (!response.ok) throw new Error('Projekte konnten nicht geladen werden.');
        const data = await response.json();
        setProjects((data || []).sort((a: Project, b: Project) => {
          const aDate = new Date(a.lastScanAt || a.createdAt || 0).getTime();
          const bDate = new Date(b.lastScanAt || b.createdAt || 0).getTime();
          return bDate - aDate;
        }));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Projekte konnten nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    }

    void loadProjects();
  }, [user]);

  const visibleProjects = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return projects;
    return projects.filter((project) => {
      const domain = getProjectDomain(project.url).toLowerCase();
      return project.name.toLowerCase().includes(needle) || domain.includes(needle) || project.url.toLowerCase().includes(needle);
    });
  }, [projects, query]);

  const activeProject = selectedProject || projects[0] || null;
  const planLabel = userData?.plan ? String(userData.plan).toUpperCase() : 'FREE';

  if (!user) {
    return (
      <section className="max-w-[980px] space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="border-l-4 border-[#0b7de3] bg-white px-6 py-6 shadow-sm dark:bg-zinc-900">
          <div className="flex items-start gap-4">
            <LockKeyhole className="mt-1 h-5 w-5 text-[#0b7de3]" />
            <div>
              <h2 className="text-[26px] font-black tracking-tight text-[#172033] dark:text-zinc-100">
                Dashboard braucht einen Login.
              </h2>
              <p className="mt-2 max-w-[620px] text-[14px] font-semibold leading-relaxed text-[#64748b] dark:text-zinc-400">
                Nach dem Login kommst du hier direkt zu Projekten, letzten Scans und Full Audit.
              </p>
              <button
                onClick={onSignIn}
                className="mt-5 rounded-md bg-[#172033] px-5 py-3 text-[12px] font-black text-white transition-colors hover:bg-[#0b7de3]"
              >
                Einloggen
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          <div className="relative max-w-[620px]">
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="flex w-full items-center justify-between gap-4 rounded-md border border-[#cfd7e5] bg-white px-4 py-3 text-left shadow-sm transition-colors hover:border-[#0b7de3] dark:border-zinc-800 dark:bg-zinc-900"
            >
              <span className="flex min-w-0 items-center gap-3">
                {activeProject ? (
                  <ProjectFavicon url={activeProject.url} name={activeProject.name} className="h-9 w-9" iconClassName="h-4 w-4" />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#eef4ff] text-[#0b7de3] dark:bg-zinc-950">
                    <FolderKanban className="h-4 w-4" />
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-black text-[#172033] dark:text-zinc-100">
                    {activeProject ? activeProject.name : loading ? 'Projekte werden geladen...' : 'Kein Projekt ausgewaehlt'}
                  </span>
                  <span className="block truncate text-[12px] font-semibold text-[#7b8495]">
                    {activeProject ? getProjectDomain(activeProject.url) || activeProject.url : 'Waehle ein Projekt aus'}
                  </span>
                </span>
              </span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-[#64748b] transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-md border border-[#cfd7e5] bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
                <div className="border-b border-[#e3e8f0] p-3 dark:border-zinc-800">
                  <div className="flex items-center gap-2 rounded-md border border-[#cfd7e5] bg-[#f8fafc] px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
                    <Search className="h-4 w-4 text-[#7b8495]" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Suche nach Projekt oder URL"
                      className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold outline-none placeholder:text-[#9aa8bd] dark:text-zinc-100"
                    />
                  </div>
                </div>
                <p className="border-b border-[#e3e8f0] bg-[#f8fafc] px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#64748b] dark:border-zinc-800 dark:bg-zinc-900">
                  Projekte
                </p>
                <div className="max-h-[340px] overflow-y-auto">
                  {error ? (
                    <p className="px-4 py-4 text-[12px] font-bold text-[#b91c1c]">{error}</p>
                  ) : visibleProjects.length === 0 ? (
                    <p className="px-4 py-4 text-[12px] font-bold text-[#64748b]">
                      {loading ? 'Lade Projekte...' : 'Keine Projekte gefunden.'}
                    </p>
                  ) : (
                    visibleProjects.map((project) => (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          onSelectProject(project);
                        }}
                        className="flex w-full items-center justify-between gap-3 border-b border-[#eef2f7] px-4 py-3 text-left transition-colors hover:bg-[#f8fafc] dark:border-zinc-900 dark:hover:bg-zinc-900"
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <ProjectFavicon url={project.url} name={project.name} className="h-9 w-9" iconClassName="h-4 w-4" />
                          <span className="min-w-0">
                            <span className="block truncate text-[13px] font-black text-[#172033] dark:text-zinc-100">{project.name}</span>
                            <span className="block truncate text-[12px] font-medium text-[#0b7de3]">{project.url}</span>
                          </span>
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-[#9aa8bd]" />
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <button onClick={onOpenScanner} className="group border-l-4 border-[#009b72] bg-white px-5 py-5 text-left shadow-sm transition-colors hover:bg-[#f8fafc] dark:bg-zinc-900 dark:hover:bg-zinc-900/70">
              <FileSearch className="mb-4 h-5 w-5 text-[#009b72]" />
              <span className="block text-[15px] font-black text-[#172033] dark:text-zinc-100">Full Audit starten</span>
              <span className="mt-2 block text-[12px] font-semibold leading-relaxed text-[#64748b]">Kompletter Crawl mit KI-Bericht.</span>
            </button>
            <button onClick={onOpenProjects} className="group border-l-4 border-[#0b7de3] bg-white px-5 py-5 text-left shadow-sm transition-colors hover:bg-[#f8fafc] dark:bg-zinc-900 dark:hover:bg-zinc-900/70">
              <FolderKanban className="mb-4 h-5 w-5 text-[#0b7de3]" />
              <span className="block text-[15px] font-black text-[#172033] dark:text-zinc-100">Alle Projekte</span>
              <span className="mt-2 block text-[12px] font-semibold leading-relaxed text-[#64748b]">Domains, Reports und Monitoring.</span>
            </button>
            <button onClick={onOpenPricing} className="group border-l-4 border-[#D4AF37] bg-white px-5 py-5 text-left shadow-sm transition-colors hover:bg-[#f8fafc] dark:bg-zinc-900 dark:hover:bg-zinc-900/70">
              <Gauge className="mb-4 h-5 w-5 text-[#D4AF37]" />
              <span className="block text-[15px] font-black text-[#172033] dark:text-zinc-100">{planLabel} Plan</span>
              <span className="mt-2 block text-[12px] font-semibold leading-relaxed text-[#64748b]">Limits und Abo verwalten.</span>
            </button>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between border-b border-[#dfe3ea] pb-3 dark:border-zinc-800">
              <h2 className="text-[14px] font-black uppercase tracking-[0.14em] text-[#172033] dark:text-zinc-100">Letzte Projekte</h2>
              <button onClick={onOpenProjects} className="text-[11px] font-black uppercase tracking-[0.12em] text-[#0b7de3] hover:underline">
                Alle anzeigen
              </button>
            </div>
            <div className="divide-y divide-[#e3e8f0] dark:divide-zinc-800">
              {projects.slice(0, 6).map((project) => (
                <button
                  key={project.id}
                  onClick={() => onSelectProject(project)}
                  className="flex w-full items-center justify-between gap-4 py-4 text-left transition-colors hover:bg-white/70 dark:hover:bg-zinc-900/60"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <ProjectFavicon url={project.url} name={project.name} className="h-9 w-9" iconClassName="h-4 w-4" />
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-black text-[#172033] dark:text-zinc-100">{project.name}</span>
                      <span className="block truncate text-[12px] font-semibold text-[#64748b]">{getProjectDomain(project.url) || project.url}</span>
                    </span>
                  </span>
                  <span className="shrink-0 text-[12px] font-black text-[#172033] dark:text-zinc-100">
                    {typeof project.lastScore === 'number' ? `${project.lastScore}%` : 'Start'}
                  </span>
                </button>
              ))}
              {!loading && projects.length === 0 && (
                <div className="py-8">
                  <p className="text-[14px] font-bold text-[#64748b]">Noch keine Projekte vorhanden.</p>
                  <button onClick={onOpenProjects} className="mt-3 text-[12px] font-black uppercase tracking-[0.12em] text-[#0b7de3] hover:underline">
                    Projekt anlegen
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-4 border-t border-[#dfe3ea] pt-6 dark:border-zinc-800 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#7b8495]">Heute wichtig</p>
            <h3 className="mt-2 text-[24px] font-black tracking-tight text-[#172033] dark:text-zinc-100">Weniger suchen, schneller ins Projekt.</h3>
          </div>
          <div className="space-y-3 text-[13px] font-semibold leading-relaxed text-[#64748b] dark:text-zinc-400">
            <p>Der Projekt-Switcher oben bringt dich direkt ins jeweilige Dashboard.</p>
            <p>Der Scanner bleibt der grosse Full Audit. Einzeltools bleiben auf den Tool-Seiten.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
