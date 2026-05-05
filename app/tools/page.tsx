import type { Metadata } from 'next';
import Link from 'next/link';
import { TOOL_CATEGORIES, TOOL_PAGES } from '@/lib/tool-pages';
import ToolHubExplorer from '@/components/tool-hub-explorer';
import { PublicToolsFooter, PublicToolsHeader } from '@/components/tool-page-chrome';

export const metadata: Metadata = {
  title: 'Kostenlose SEO Tools',
  description: 'Kostenlose SEO Tools für einzelne Checks: SEO Checker, PageSpeed Test, Security Header, Robots.txt, Sitemap, AI Visibility, Keywords und Backlinks.',
  alternates: {
    canonical: '/tools',
  },
};

export default function ToolsHubPage() {
  return (
    <div className="min-h-screen bg-[#f4f6fb] text-[#172033] dark:bg-zinc-950 dark:text-zinc-100">
      <PublicToolsHeader activeView="tools" />

      <main>
        <section className="border-b border-[#dfe3ea] bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mx-auto max-w-[1380px] px-6 py-9 md:px-10 md:py-11">
            <div className="max-w-[820px]">
              <h1 className="text-[34px] font-black leading-[1.02] tracking-tight text-[#141a28] dark:text-white md:text-[48px]">
                Kostenlose SEO Tools für einzelne Checks.
              </h1>
              <p className="mt-4 max-w-[650px] text-[15px] font-medium leading-[1.6] text-[#526071] dark:text-zinc-300">
                Jede Unterseite testet genau einen Bereich. So entstehen SEO-Landingpages, klare interne Verlinkung und weniger Crawl-Kosten pro Nutzeraktion.
              </p>
            </div>

            <div className="mt-7 border-t border-[#e5ebf3] pt-5 dark:border-zinc-800">
              <div className="flex flex-wrap gap-x-5 gap-y-3">
                {TOOL_CATEGORIES.map((category) => (
                  <Link
                    key={category.slug}
                    href={`/tools/${category.slug}`}
                    className="text-[11px] font-black uppercase tracking-[0.12em] text-[#526071] underline-offset-4 transition-colors hover:text-[#0b7de3] hover:underline dark:text-zinc-400"
                  >
                    {category.navTitle}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1380px] px-6 py-8 md:px-10">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-[28px] font-black tracking-tight text-[#141a28] dark:text-white md:text-[32px]">
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
