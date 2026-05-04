import type { Metadata } from 'next';
import Link from 'next/link';
import { TOOL_CATEGORIES, TOOL_PAGES } from '@/lib/tool-pages';
import ToolHubExplorer from '@/components/tool-hub-explorer';
import { PublicToolsFooter, PublicToolsHeader, ToolIcon } from '@/components/tool-page-chrome';

export const metadata: Metadata = {
  title: 'Kostenlose SEO Tools',
  description: 'Kostenlose SEO Tools für einzelne Checks: SEO Checker, PageSpeed Test, Security Header, Robots.txt, Sitemap, AI Visibility, Keywords und Backlinks.',
  alternates: {
    canonical: '/tools',
  },
};

export default function ToolsHubPage() {
  const liveTools = TOOL_PAGES.filter((tool) => tool.status === 'live');

  return (
    <div className="min-h-screen bg-[#f4f6fb] text-[#172033] dark:bg-zinc-950 dark:text-zinc-100">
      <PublicToolsHeader />

      <main>
        <section className="border-b border-[#dfe3ea] bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mx-auto grid max-w-[1380px] grid-cols-1 gap-10 px-6 py-14 md:px-10 lg:grid-cols-[0.9fr_1.1fr] lg:py-20">
            <div>
              <h1 className="text-[44px] font-black leading-[0.98] tracking-tight text-[#141a28] dark:text-white md:text-[64px]">
                Kostenlose SEO Tools für einzelne Checks.
              </h1>
              <p className="mt-6 max-w-[640px] text-[18px] font-medium leading-[1.55] text-[#526071] dark:text-zinc-300">
                Jede Unterseite testet genau einen Bereich. So entstehen SEO-Landingpages, klare interne Verlinkung und weniger Crawl-Kosten pro Nutzeraktion.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {TOOL_CATEGORIES.map((category) => (
                  <Link
                    key={category.slug}
                    href={`/tools/${category.slug}`}
                    className="rounded-md border border-[#d8dde8] bg-[#f8fafc] px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-[#526071] transition-colors hover:border-[#D4AF37] hover:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
                  >
                    {category.navTitle}
                  </Link>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {liveTools.slice(0, 8).map((tool) => (
                <Link
                  key={tool.slug}
                  href={`/tools/${tool.slug}`}
                  className="group rounded-lg border border-[#dfe3ea] bg-[#f8fafc] p-5 transition-all hover:-translate-y-0.5 hover:border-[#D4AF37] hover:bg-white hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-900/80"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-white text-[#0b7de3] shadow-sm dark:bg-zinc-950">
                    <ToolIcon icon={tool.icon} />
                  </div>
                  <h2 className="text-[16px] font-black text-[#172033] dark:text-zinc-100">{tool.title}</h2>
                  <p className="mt-2 text-[13px] font-semibold leading-relaxed text-[#64748b] dark:text-zinc-400">
                    {tool.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1380px] px-6 py-14 md:px-10">
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-[34px] font-black tracking-tight text-[#141a28] dark:text-white">
                Alle Tool-Unterseiten
              </h2>
              <p className="mt-2 max-w-[720px] text-[15px] font-medium leading-relaxed text-[#64748b] dark:text-zinc-400">
                Suche nach einzelnen Checks, filtere nach Bereichen und starte nur den Test, den du wirklich brauchst.
              </p>
            </div>
          </div>

          <ToolHubExplorer categories={TOOL_CATEGORIES} tools={TOOL_PAGES} />
        </section>
      </main>

      <PublicToolsFooter />
    </div>
  );
}
