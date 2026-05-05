'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, CheckCircle2, FolderKanban, Globe2, Loader2, LockKeyhole, Plus } from 'lucide-react';
import { useAuth } from './auth-provider';
import type { Project } from '@/types/common';

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export default function ProjectsSubpageClient() {
  const { user, signIn } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadProjects = async () => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Projekte konnten nicht geladen werden.');
      }
      setProjects((data || []).sort((a: Project, b: Project) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (projectError) {
      setError(projectError instanceof Error ? projectError.message : 'Projekte konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProjects();
  }, [user]);

  const createProject = async (event: FormEvent) => {
    event.preventDefault();

    if (!user) {
      setError('Bitte logge dich ein, damit Projekte deinem Account und deinen Planlimits zugeordnet werden können.');
      await signIn();
      return;
    }

    const targetUrl = normalizeUrl(url);
    if (!name.trim()) {
      setError('Bitte gib einen Projektnamen ein.');
      return;
    }

    if (targetUrl) {
      try {
        new URL(targetUrl);
      } catch {
        setError('Bitte gib eine gültige Projekt-URL ein.');
        return;
      }
    }

    setCreating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), url: targetUrl }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.details || data.error || 'Projekt konnte nicht erstellt werden.');
      }

      setName('');
      setUrl('');
      setSuccess('Projekt wurde erstellt.');
      await loadProjects();
    } catch (projectError) {
      setError(projectError instanceof Error ? projectError.message : 'Projekt konnte nicht erstellt werden.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.82fr_1.18fr]">
      <section className="rounded-lg border border-[#d6deea] bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-6">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-md bg-[#eef4ff] text-[#0b7de3] dark:bg-zinc-900">
            <FolderKanban className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[14px] font-black text-[#172033] dark:text-zinc-100">Projekt anlegen</p>
            <p className="text-[12px] font-semibold text-[#64748b] dark:text-zinc-400">Eigene Unterseite, eigene Projektlogik.</p>
          </div>
        </div>

        <form onSubmit={createProject} className="space-y-4">
          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-[#6f7b8d]">
              Projektname
            </label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Kunde oder Domain"
              className="min-h-12 w-full rounded-md border border-[#cfd7e5] bg-[#f8fafc] px-4 text-[14px] font-bold text-[#172033] outline-none transition-colors placeholder:text-[#8a94a6] focus:border-[#0b7de3] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-[#6f7b8d]">
              Website
            </label>
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://deine-domain.de"
              className="min-h-12 w-full rounded-md border border-[#cfd7e5] bg-[#f8fafc] px-4 text-[14px] font-bold text-[#172033] outline-none transition-colors placeholder:text-[#8a94a6] focus:border-[#0b7de3] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-[#009b72] px-6 text-[13px] font-black text-white transition-colors hover:bg-[#087f61] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : user ? <Plus className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}
            {user ? 'Projekt erstellen' : 'Einloggen und erstellen'}
          </button>
        </form>

        {error && (
          <div className="mt-5 rounded-md border border-[#f0b9b7] bg-[#fff1f0] p-4 text-[#a42520] dark:border-red-900/70 dark:bg-red-950/25 dark:text-red-300">
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-[13px] font-bold leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mt-5 rounded-md border border-[#ccebdc] bg-[#f0fbf6] p-4 text-[#116b47] dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
            <div className="flex gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-[13px] font-bold leading-relaxed">{success}</p>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-[#d6deea] bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-[24px] font-black tracking-tight text-[#141a28] dark:text-white">Deine Projekte</h2>
            <p className="mt-2 text-[13px] font-semibold leading-relaxed text-[#64748b] dark:text-zinc-400">
              Projekte sind getrennt von Tool-Unterseiten und sammeln Scans, Keywords, Monitoring und Reports.
            </p>
          </div>
          <Link
            href="/"
            className="flex w-fit items-center gap-2 rounded-md border border-[#cfd7e5] bg-[#f8fafc] px-4 py-2 text-[12px] font-black text-[#172033] transition-colors hover:border-[#D4AF37] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
          >
            Workspace
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {!user ? (
          <div className="grid min-h-[260px] place-items-center rounded-md border border-dashed border-[#d5deea] bg-[#f8fafc] p-8 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
            <div>
              <LockKeyhole className="mx-auto mb-4 h-8 w-8 text-[#0b7de3]" />
              <p className="text-[18px] font-black text-[#172033] dark:text-zinc-100">Login erforderlich</p>
              <p className="mx-auto mt-2 max-w-[460px] text-[13px] font-semibold leading-relaxed text-[#64748b] dark:text-zinc-400">
                Projekte gehören zu einem Account, damit Planlimits, Teams und Reports korrekt bleiben.
              </p>
            </div>
          </div>
        ) : loading ? (
          <div className="grid min-h-[260px] place-items-center rounded-md bg-[#f8fafc] p-8 dark:bg-zinc-900/50">
            <Loader2 className="h-8 w-8 animate-spin text-[#0b7de3]" />
          </div>
        ) : projects.length === 0 ? (
          <div className="grid min-h-[260px] place-items-center rounded-md border border-dashed border-[#d5deea] bg-[#f8fafc] p-8 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
            <div>
              <FolderKanban className="mx-auto mb-4 h-8 w-8 text-[#7b8495]" />
              <p className="text-[18px] font-black text-[#172033] dark:text-zinc-100">Noch keine Projekte</p>
              <p className="mx-auto mt-2 max-w-[460px] text-[13px] font-semibold leading-relaxed text-[#64748b] dark:text-zinc-400">
                Lege links dein erstes Projekt an oder starte zuerst einen Website Scanner Audit.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {projects.map((project) => (
              <Link
                key={project.id}
                href="/"
                className="group rounded-md border border-[#dfe3ea] bg-[#f8fafc] p-4 transition-colors hover:border-[#D4AF37] dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="mb-3 flex items-center gap-2 text-[#7b8495]">
                  <Globe2 className="h-4 w-4 text-[#D4AF37]" />
                  <span className="truncate text-[10px] font-black uppercase tracking-[0.12em]">{project.url || 'Keine URL'}</span>
                </div>
                <h3 className="truncate text-[17px] font-black text-[#172033] dark:text-zinc-100">{project.name}</h3>
                <p className="mt-2 text-[11px] font-bold text-[#64748b] dark:text-zinc-400">
                  Letzter Scan: {project.lastScanAt ? new Date(project.lastScanAt).toLocaleDateString('de-DE') : 'Noch nicht gestartet'}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
