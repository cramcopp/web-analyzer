import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BarChart3, FolderKanban, LineChart, Users } from 'lucide-react';
import ProjectsSubpageClient from '@/components/projects-subpage-client';
import { PublicToolsFooter, PublicToolsHeader } from '@/components/tool-page-chrome';
import { PLAN_CONFIG } from '@/lib/plans';

export const metadata: Metadata = {
  title: 'SEO Projekte',
  description: 'SEO Projekte als echte Unterseite: verwalte Domains, Scans, Keywords, Monitoring, Reports und Team-Workflows getrennt von einzelnen Tool-Checks.',
  alternates: {
    canonical: '/projekte',
  },
};

export default function ProjektePage() {
  return (
    <div className="min-h-screen bg-[#f4f6fb] text-[#172033] dark:bg-zinc-950 dark:text-zinc-100">
      <PublicToolsHeader activeView="projects" />

      <main>
        <section className="border-b border-[#dfe3ea] bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mx-auto grid max-w-[1380px] grid-cols-1 gap-10 px-6 py-12 md:px-10 lg:grid-cols-[0.88fr_1.12fr] lg:py-16">
            <div>
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-md bg-[#eef4ff] text-[#0b7de3] dark:bg-zinc-900">
                  <FolderKanban className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#0b7de3]">
                    Projekte
                  </p>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#7b8495]">
                    Domain-Workspace statt Tool-Liste
                  </p>
                </div>
              </div>

              <h1 className="break-words text-[38px] font-black leading-[1.02] tracking-tight text-[#141a28] dark:text-white sm:text-[44px] md:text-[60px]">
                Projekte für Scans, Monitoring und Reports.
              </h1>
              <p className="mt-6 max-w-[720px] text-[18px] font-medium leading-[1.55] text-[#526071] dark:text-zinc-300">
                Ein Projekt bündelt eine Domain, wiederkehrende Audits, Keywords, Wettbewerber, Teamrechte und Kundenberichte. Das ist bewusst mehr als ein einzelner Kurzcheck.
              </p>

              <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  ['Free', PLAN_CONFIG.free.projects, 'Projekt'],
                  ['Agency', PLAN_CONFIG.agency.projects, 'Projekte'],
                  ['Business', PLAN_CONFIG.business.projects, 'Projekte'],
                ].map(([label, value, text]) => (
                  <div key={String(label)} className="rounded-md border border-[#dfe3ea] bg-[#f8fafc] p-4 dark:border-zinc-800 dark:bg-zinc-900">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#7b8495]">{String(label)}</p>
                    <p className="mt-2 text-[24px] font-black text-[#172033] dark:text-zinc-100">
                      {Number(value).toLocaleString('de-DE')}
                    </p>
                    <p className="mt-1 text-[11px] font-bold text-[#64748b] dark:text-zinc-400">{String(text)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid content-start gap-4">
              {[
                [BarChart3, 'Audits speichern', 'Jeder Scan kann später im Projektverlauf und in Reports weitergenutzt werden.'],
                [LineChart, 'Monitoring vorbereiten', 'Projekte sind die Grundlage für wöchentliche, tägliche oder Business-Monitorings.'],
                [Users, 'Teamfähig skalieren', 'Seats, Kundenfreigaben und White Label hängen an Projekten statt an losen Tool-Checks.'],
              ].map(([Icon, title, text]) => {
                const TypedIcon = Icon as typeof BarChart3;
                return (
                  <article key={String(title)} className="rounded-lg border border-[#dfe3ea] bg-[#f8fafc] p-6 dark:border-zinc-800 dark:bg-zinc-900">
                    <TypedIcon className="mb-5 h-6 w-6 text-[#D4AF37]" />
                    <h2 className="text-[18px] font-black text-[#172033] dark:text-zinc-100">{String(title)}</h2>
                    <p className="mt-2 text-[13px] font-medium leading-relaxed text-[#64748b] dark:text-zinc-400">
                      {String(text)}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1380px] px-6 py-12 md:px-10">
          <ProjectsSubpageClient />
        </section>

        <section className="border-y border-[#dfe3ea] bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mx-auto flex max-w-[1380px] flex-col gap-5 px-6 py-10 md:px-10 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-[28px] font-black tracking-tight text-[#141a28] dark:text-white">
                Erst testen, dann als Projekt führen.
              </h2>
              <p className="mt-2 max-w-[720px] text-[14px] font-medium leading-relaxed text-[#64748b] dark:text-zinc-400">
                Für einzelne Fragen reichen Tool-Seiten. Für wiederkehrende Arbeit nutzt du Projekte.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/scanner"
                className="flex w-fit items-center gap-2 rounded-md bg-[#172033] px-5 py-3 text-[12px] font-black text-white transition-colors hover:bg-[#0b7de3]"
              >
                Scanner öffnen
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/tools"
                className="flex w-fit items-center gap-2 rounded-md border border-[#cfd7e5] bg-white px-5 py-3 text-[12px] font-black text-[#172033] transition-colors hover:border-[#D4AF37] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              >
                Tool Hub
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicToolsFooter />
    </div>
  );
}
