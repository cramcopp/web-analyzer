import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, FileSearch, Gauge, ShieldCheck } from 'lucide-react';
import ScannerSubpageClient from '@/components/scanner-subpage-client';
import { PublicToolsFooter, PublicToolsHeader } from '@/components/tool-page-chrome';

export const metadata: Metadata = {
  title: 'Website Scanner',
  description: 'Starte den Website Analyzer Full Audit für SEO, Technik, Security, DSGVO, Performance, Content und AI Visibility als eigene Scanner-Unterseite.',
  alternates: {
    canonical: '/scanner',
  },
};

export default function ScannerPage() {
  return (
    <div className="min-h-screen bg-[#f4f6fb] text-[#172033] dark:bg-zinc-950 dark:text-zinc-100">
      <PublicToolsHeader activeView="scanner" />

      <main>
        <section className="border-b border-[#dfe3ea] bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mx-auto grid max-w-[1180px] grid-cols-1 gap-10 px-6 py-10 md:px-10 lg:grid-cols-[0.72fr_1.28fr] lg:py-12">
            <div>
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-md bg-[#eef4ff] text-[#0b7de3] dark:bg-zinc-900">
                  <FileSearch className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#0b7de3]">
                    Full Audit
                  </p>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#7b8495]">
                    eigener Scanner Einstieg
                  </p>
                </div>
              </div>

              <h1 className="break-words text-[36px] font-black leading-[1.02] tracking-tight text-[#141a28] dark:text-white sm:text-[42px] md:text-[54px]">
                Website Scanner für komplette Crawls.
              </h1>
              <p className="mt-5 max-w-[660px] text-[16px] font-medium leading-[1.55] text-[#526071] dark:text-zinc-300">
                Diese Unterseite ist bewusst der große Scan. Einzelne Tool-Unterseiten testen nur einen Bereich und sparen Crawl-Budget.
              </p>

              <p className="mt-6 border-l-4 border-[#D4AF37] pl-4 text-[13px] font-black uppercase tracking-[0.12em] text-[#64748b] dark:text-zinc-400">
                Full Audit, KI-Bericht und gespeicherter Report in einem Ablauf.
              </p>
            </div>

            <ScannerSubpageClient />
          </div>
        </section>

        <section className="hidden">
          {[
            [Gauge, 'Crawl-Budget transparent', 'Der Scanner nutzt serverseitig deinen Account-Plan und meldet das verwendete Crawl-Limit zurück.'],
            [ShieldCheck, 'Nicht jeder Klick ist ein Crawl', 'SEO Checker, Word Counter, Robots.txt und andere Tool-Seiten bleiben leichte Einzelchecks.'],
            [CheckCircle2, 'Reports danach im Workspace', 'Der Workflow speichert Ergebnisse, Evidence und Planlimits für spätere Reports und Projekte.'],
          ].map(([Icon, title, text]) => {
            const TypedIcon = Icon as typeof Gauge;
            return (
              <article key={String(title)} className="rounded-md border border-[#dfe3ea] bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <TypedIcon className="mb-4 h-5 w-5 text-[#D4AF37]" />
                <h2 className="text-[18px] font-black text-[#172033] dark:text-zinc-100">{String(title)}</h2>
                <p className="mt-2 text-[13px] font-medium leading-relaxed text-[#64748b] dark:text-zinc-400">
                  {String(text)}
                </p>
              </article>
            );
          })}
        </section>

        <section className="border-y border-[#dfe3ea] bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mx-auto flex max-w-[1380px] flex-col gap-5 px-6 py-10 md:px-10 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-[28px] font-black tracking-tight text-[#141a28] dark:text-white">
                Nur einen Bereich testen?
              </h2>
              <p className="mt-2 max-w-[720px] text-[14px] font-medium leading-relaxed text-[#64748b] dark:text-zinc-400">
                Nutze die Tool-Unterseiten, wenn du keinen kompletten Website-Crawl brauchst.
              </p>
            </div>
            <Link
              href="/tools"
              className="flex w-fit items-center gap-2 rounded-md bg-[#172033] px-5 py-3 text-[12px] font-black text-white transition-colors hover:bg-[#0b7de3]"
            >
              Tool Hub öffnen
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <PublicToolsFooter />
    </div>
  );
}
