import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, FileSearch, Gauge, ShieldCheck } from 'lucide-react';
import ScannerSubpageClient from '@/components/scanner-subpage-client';
import { PublicToolsFooter, PublicToolsHeader } from '@/components/tool-page-chrome';
import { PLAN_CONFIG } from '@/lib/plans';

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
          <div className="mx-auto grid max-w-[1380px] grid-cols-1 gap-10 px-6 py-12 md:px-10 lg:grid-cols-[0.88fr_1.12fr] lg:py-16">
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

              <h1 className="break-words text-[38px] font-black leading-[1.02] tracking-tight text-[#141a28] dark:text-white sm:text-[44px] md:text-[60px]">
                Website Scanner für komplette Crawls.
              </h1>
              <p className="mt-6 max-w-[720px] text-[18px] font-medium leading-[1.55] text-[#526071] dark:text-zinc-300">
                Diese Unterseite ist bewusst der große Scan. Einzelne Tool-Unterseiten testen nur einen Bereich und sparen Crawl-Budget.
              </p>

              <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  ['Free', PLAN_CONFIG.free.crawlLimit, 'Seiten pro Crawl'],
                  ['Pro', PLAN_CONFIG.pro.crawlLimit, 'Seiten pro Crawl'],
                  ['Business', PLAN_CONFIG.business.crawlLimit, 'Seiten pro Crawl'],
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

            <ScannerSubpageClient />
          </div>
        </section>

        <section className="mx-auto grid max-w-[1380px] grid-cols-1 gap-8 px-6 py-12 md:px-10 lg:grid-cols-3">
          {[
            [Gauge, 'Crawl-Budget transparent', 'Der Scanner nutzt serverseitig deinen Account-Plan und meldet das verwendete Crawl-Limit zurück.'],
            [ShieldCheck, 'Nicht jeder Klick ist ein Crawl', 'SEO Checker, Word Counter, Robots.txt und andere Tool-Seiten bleiben leichte Einzelchecks.'],
            [CheckCircle2, 'Reports danach im Workspace', 'Der Workflow speichert Ergebnisse, Evidence und Planlimits für spätere Reports und Projekte.'],
          ].map(([Icon, title, text]) => {
            const TypedIcon = Icon as typeof Gauge;
            return (
              <article key={String(title)} className="rounded-lg border border-[#dfe3ea] bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <TypedIcon className="mb-5 h-6 w-6 text-[#D4AF37]" />
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
