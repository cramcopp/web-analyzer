import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Flame, Rows3, ShieldCheck } from 'lucide-react';
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
  const liveCount = TOOL_PAGES.filter((tool) => tool.status === 'live').length;
  const developmentCount = TOOL_PAGES.length - liveCount;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a]">
      <PublicToolsHeader activeView="tools" />

      <main>
        <section className="bg-white">
          <div className="mx-auto max-w-[1536px] px-6 py-9 md:px-10 md:pb-5 md:pt-10">
            <div className="max-w-[900px]">
              <h1 className="text-[34px] font-black leading-tight tracking-tight text-[#111827] md:text-[36px]">
                Kostenlose SEO Tools für einzelne Checks.
              </h1>
              <p className="mt-1 text-[19px] font-medium leading-relaxed text-[#334155]">
                Jede Unterseite testet genau einen Bereich.
              </p>
            </div>

            <div className="mt-4 flex flex-col gap-4 rounded-lg border border-[#d9e1ec] bg-white px-5 py-3 shadow-[0_12px_34px_rgba(15,23,42,0.08)] md:flex-row md:items-center">
              <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-[160px_160px_170px_1fr]">
                <div className="flex items-center gap-4">
                  <Flame className="h-4 w-4 text-[#0b63ff]" />
                  <div>
                    <p className="text-[18px] font-black leading-none">{TOOL_PAGES.length}</p>
                    <p className="mt-1 text-[13px] font-medium text-[#475569]">Tools verfügbar</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 border-[#d9e1ec] lg:border-l lg:pl-7">
                  <Rows3 className="h-4 w-4 text-[#0aa36f]" />
                  <div>
                    <p className="text-[18px] font-black leading-none">{liveCount}</p>
                    <p className="mt-1 text-[13px] font-medium text-[#475569]">Live & ready</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 border-[#d9e1ec] lg:border-l lg:pl-7">
                  <CheckCircle2 className="h-4 w-4 text-[#475569]" />
                  <div>
                    <p className="text-[18px] font-black leading-none">{developmentCount}</p>
                    <p className="mt-1 text-[13px] font-medium text-[#475569]">In Entwicklung</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 border-[#d9e1ec] lg:border-l lg:pl-7">
                  <span className="h-2 w-2 rounded-full bg-[#15a36b]" />
                  <p className="text-[14px] font-medium text-[#475569]">Alle Systeme online</p>
                </div>
              </div>

              <Link
                href="/scanner"
                className="flex min-h-[58px] items-center justify-between gap-5 rounded-md border border-[#d9e1ec] bg-[#f8fafc] px-5 text-[#172033] transition-colors hover:border-[#0b63ff] hover:bg-white"
              >
                <span className="flex items-center gap-4">
                  <ShieldCheck className="h-5 w-5 text-[#f5a400]" />
                  <span>
                    <span className="block text-[16px] font-black">Full Audit</span>
                    <span className="block text-[14px] font-medium text-[#475569]">Alle Bereiche prüfen</span>
                  </span>
                </span>
                <ArrowRight className="h-5 w-5 text-[#334155]" />
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1536px] px-6 pb-10 md:px-10">
          <ToolHubExplorer categories={TOOL_CATEGORIES} tools={TOOL_PAGES} />
        </section>
      </main>

      <PublicToolsFooter />
    </div>
  );
}
