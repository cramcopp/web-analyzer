import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Flame, Rows3, ShieldCheck } from 'lucide-react';
import { TOOL_CATEGORIES, TOOL_PAGES } from '@/lib/tool-pages';
import ToolHubExplorer from '@/components/tool-hub-explorer';
import { PublicToolsFooter, PublicToolsHeader } from '@/components/tool-page-chrome';

export const metadata: Metadata = {
  title: 'Kostenlose SEO Tools für einzelne Checks',
  description: 'Kostenlose SEO Tools für einzelne Checks: SEO Checker, Onpage SEO, Technical SEO Audit, Robots.txt, Sitemap, SERP Preview, Keywords, Security und PageSpeed prüfen.',
  keywords: [
    'kostenlose SEO Tools',
    'SEO Checker',
    'Technical SEO Audit',
    'Onpage SEO Checker',
    'SERP Preview Tool',
    'Robots.txt Checker',
    'Sitemap Checker',
    'Keyword Checker',
  ],
  alternates: {
    canonical: '/tools',
  },
  openGraph: {
    title: 'Kostenlose SEO Tools für einzelne Checks | Website Analyzer Pro',
    description: 'Starte einzelne SEO-, Security-, Performance- und AI-Visibility-Checks oder gehe bewusst in den Full Audit.',
    url: '/tools',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kostenlose SEO Tools für einzelne Checks',
    description: 'SEO Checker, Technical SEO Audit, SERP Preview, Robots.txt, Sitemap, Keywords und weitere Website Checks.',
  },
};

function ToolsHubJsonLd() {
  const toolsUrl = 'https://website-analyzer.pro/tools';
  const featuredTools = TOOL_PAGES.slice(0, 12);
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Website Analyzer Pro',
          item: 'https://website-analyzer.pro',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Kostenlose SEO Tools',
          item: toolsUrl,
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Kostenlose SEO Tools für einzelne Checks',
      description: metadata.description,
      url: toolsUrl,
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: featuredTools.map((tool, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: `${toolsUrl}/${tool.slug}`,
          name: tool.title,
          description: tool.seoDescription,
        })),
      },
    },
  ];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
      }}
    />
  );
}

export default function ToolsHubPage() {
  const liveCount = TOOL_PAGES.filter((tool) => tool.status === 'live').length;
  const auditCount = TOOL_PAGES.filter((tool) => tool.status === 'audit').length;
  const providerCount = TOOL_PAGES.filter((tool) => tool.status === 'provider').length;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] dark:bg-zinc-950 dark:text-zinc-100">
      <PublicToolsHeader activeView="tools" />

      <main>
        <ToolsHubJsonLd />

        <section className="bg-white dark:bg-zinc-950">
          <div className="mx-auto max-w-[1536px] px-6 py-9 md:px-10 md:pb-5 md:pt-10">
            <div className="max-w-[900px]">
              <h1 className="text-[34px] font-black leading-tight tracking-tight text-[#111827] dark:text-white md:text-[36px]">
                Kostenlose SEO Tools für einzelne Checks.
              </h1>
              <p className="mt-1 text-[19px] font-medium leading-relaxed text-[#334155] dark:text-zinc-300">
                Jede Unterseite testet genau einen Bereich.
              </p>
            </div>

            <div className="mt-4 flex flex-col gap-4 rounded-lg border border-[#d9e1ec] bg-white px-5 py-3 shadow-[0_12px_34px_rgba(15,23,42,0.08)] dark:border-zinc-800 dark:bg-zinc-900 md:flex-row md:items-center">
              <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-[160px_160px_170px_1fr]">
                <div className="flex items-center gap-4">
                  <Flame className="h-4 w-4 text-[#0b63ff]" />
                  <div>
                    <p className="text-[18px] font-black leading-none">{TOOL_PAGES.length}</p>
                    <p className="mt-1 text-[13px] font-medium text-[#475569] dark:text-zinc-400">Tools verfügbar</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 border-[#d9e1ec] dark:border-zinc-800 lg:border-l lg:pl-7">
                  <Rows3 className="h-4 w-4 text-[#0aa36f]" />
                  <div>
                    <p className="text-[18px] font-black leading-none">{liveCount}</p>
                    <p className="mt-1 text-[13px] font-medium text-[#475569] dark:text-zinc-400">Schnellchecks</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 border-[#d9e1ec] dark:border-zinc-800 lg:border-l lg:pl-7">
                  <CheckCircle2 className="h-4 w-4 text-[#475569]" />
                  <div>
                    <p className="text-[18px] font-black leading-none">{auditCount}</p>
                    <p className="mt-1 text-[13px] font-medium text-[#475569] dark:text-zinc-400">Audit-Flows</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 border-[#d9e1ec] dark:border-zinc-800 lg:border-l lg:pl-7">
                  <span className="h-2 w-2 rounded-full bg-[#15a36b]" />
                  <div>
                    <p className="text-[18px] font-black leading-none">{providerCount}</p>
                    <p className="mt-1 text-[13px] font-medium text-[#475569] dark:text-zinc-400">Daten-Tools</p>
                  </div>
                </div>
              </div>

              <Link
                href="/scanner"
                className="flex min-h-[58px] items-center justify-between gap-5 rounded-md border border-[#d9e1ec] bg-[#f8fafc] px-5 text-[#172033] transition-colors hover:border-[#0b63ff] hover:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
              >
                <span className="flex items-center gap-4">
                  <ShieldCheck className="h-5 w-5 text-[#f5a400]" />
                  <span>
                    <span className="block text-[16px] font-black">Full Audit</span>
                    <span className="block text-[14px] font-medium text-[#475569] dark:text-zinc-400">Alle Bereiche prüfen</span>
                  </span>
                </span>
                <ArrowRight className="h-5 w-5 text-[#334155] dark:text-zinc-300" />
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
