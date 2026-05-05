import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import ToolCategoryLandingSections from '@/components/tool-category-landing';
import ToolCheckForm from '@/components/tool-check-form';
import { PublicToolsFooter, PublicToolsHeader, ToolIcon } from '@/components/tool-page-chrome';
import { getToolCategoryLanding } from '@/lib/tool-category-landing';
import {
  getToolCategory,
  getToolPage,
  getToolsForCategory,
  TOOL_CATEGORIES,
  TOOL_PAGES,
  type ToolCategory,
} from '@/lib/tool-pages';

type ToolPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return [
    ...TOOL_CATEGORIES.map((category) => ({ slug: category.slug })),
    ...TOOL_PAGES.map((tool) => ({ slug: tool.slug })),
  ];
}

export async function generateMetadata({ params }: ToolPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = getToolPage(slug);
  if (tool) {
    return {
      title: tool.title,
      description: tool.seoDescription,
      alternates: {
        canonical: `/tools/${tool.slug}`,
      },
      openGraph: {
        title: `${tool.title} | Website Analyzer Pro`,
        description: tool.seoDescription,
        url: `/tools/${tool.slug}`,
        type: 'website',
      },
    };
  }

  const category = getToolCategory(slug);
  if (category) {
    const landing = getToolCategoryLanding(category.slug);

    return {
      title: landing?.metadataTitle || category.title,
      description: landing?.metadataDescription || category.seoDescription,
      alternates: {
        canonical: `/tools/${category.slug}`,
      },
      openGraph: {
        title: `${landing?.metadataTitle || category.title} | Website Analyzer Pro`,
        description: landing?.metadataDescription || category.seoDescription,
        url: `/tools/${category.slug}`,
        type: 'website',
      },
    };
  }

  return {};
}

export default async function ToolDetailPage({ params }: ToolPageProps) {
  const { slug } = await params;
  const tool = getToolPage(slug);
  const category = getToolCategory(slug);

  if (category) {
    return <ToolCategoryDetailPage category={category} />;
  }

  if (!tool) notFound();

  const relatedTools = tool.related
    .map((relatedSlug) => getToolPage(relatedSlug))
    .filter((relatedTool): relatedTool is NonNullable<typeof relatedTool> => Boolean(relatedTool));

  return (
    <div className="min-h-screen bg-[#f4f6fb] text-[#172033] dark:bg-zinc-950 dark:text-zinc-100">
      <PublicToolsHeader activeView="tools" />

      <main>
        <section className="border-b border-[#dfe3ea] bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mx-auto grid max-w-[1380px] grid-cols-1 gap-10 px-6 py-12 md:px-10 lg:grid-cols-[0.84fr_1.16fr] lg:py-16">
            <div>
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-md bg-[#eef4ff] text-[#0b7de3] dark:bg-zinc-900">
                  <ToolIcon icon={tool.icon} className="h-6 w-6" />
                </span>
                <div>
                  <Link href="/tools" className="text-[11px] font-black uppercase tracking-[0.16em] text-[#0b7de3] hover:underline">
                    SEO Tools
                  </Link>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#7b8495]">
                    {tool.category}
                  </p>
                </div>
              </div>

              <h1 className="break-words text-[38px] font-black leading-[1.02] tracking-tight text-[#141a28] dark:text-white sm:text-[44px] md:text-[60px]">
                {tool.headline}
              </h1>
              <p className="mt-6 max-w-[680px] text-[18px] font-medium leading-[1.55] text-[#526071] dark:text-zinc-300">
                {tool.description}
              </p>

              <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {tool.checks.map((check) => (
                  <div key={check} className="flex items-center gap-3 rounded-md border border-[#dfe3ea] bg-[#f8fafc] px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#009b72]" />
                    <span className="text-[12px] font-black uppercase tracking-[0.1em] text-[#526071] dark:text-zinc-300">
                      {check}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <ToolCheckForm
              tool={tool.slug}
              title={tool.title}
              inputMode={tool.inputMode}
              placeholder={tool.placeholder}
              buttonLabel={tool.buttonLabel}
            />
          </div>
        </section>

        <section className="mx-auto grid max-w-[1380px] grid-cols-1 gap-8 px-6 py-12 md:px-10 lg:grid-cols-[0.86fr_1.14fr]">
          <div>
            <h2 className="text-[30px] font-black tracking-tight text-[#141a28] dark:text-white">
              Modular statt alles crawlen
            </h2>
            <p className="mt-3 text-[15px] font-medium leading-relaxed text-[#64748b] dark:text-zinc-400">
              Dieser Check ist ein eigener Einstieg. Er kann Leads erzeugen, intern verlinken und ein konkretes Problem prüfen, ohne direkt Scan- oder Crawl-Seitenbudget zu verbrauchen.
            </p>
            <Link
              href="/scanner"
              className="mt-6 flex w-fit items-center gap-2 rounded-md bg-[#172033] px-5 py-3 text-[12px] font-black text-white transition-colors hover:bg-[#0b7de3]"
            >
              Zum Full Audit
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {relatedTools.map((related) => (
              <Link
                key={related.slug}
                href={`/tools/${related.slug}`}
                className="group rounded-lg border border-[#dfe3ea] bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#D4AF37] hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-[#eef4ff] text-[#0b7de3] dark:bg-zinc-950">
                  <ToolIcon icon={related.icon} />
                </div>
                <p className="text-[15px] font-black text-[#172033] dark:text-zinc-100">{related.title}</p>
                <p className="mt-2 text-[12px] font-semibold leading-relaxed text-[#64748b] dark:text-zinc-400">
                  {related.description}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <PublicToolsFooter />
    </div>
  );
}

function ToolCategoryDetailPage({ category }: { category: ToolCategory }) {
  const tools = getToolsForCategory(category.slug);
  const liveTools = tools.filter((tool) => tool.status === 'live');
  const providerTools = tools.filter((tool) => tool.status === 'provider');
  const auditTools = tools.filter((tool) => tool.status === 'audit' || tool.status === 'planned');
  const landing = getToolCategoryLanding(category.slug);

  return (
    <div className="min-h-screen bg-[#f4f6fb] text-[#172033] dark:bg-zinc-950 dark:text-zinc-100">
      <PublicToolsHeader activeView="tools" />

      <main>
        <section className="border-b border-[#dfe3ea] bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mx-auto grid max-w-[1380px] grid-cols-1 gap-10 px-6 py-12 md:px-10 lg:grid-cols-[0.88fr_1.12fr] lg:py-16">
            <div>
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-md bg-[#eef4ff] text-[#0b7de3] dark:bg-zinc-900">
                  <ToolIcon icon={category.icon} className="h-6 w-6" />
                </span>
                <div>
                  <Link href="/tools" className="text-[11px] font-black uppercase tracking-[0.16em] text-[#0b7de3] hover:underline">
                    Tool Hub
                  </Link>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#7b8495]">
                    {tools.length} Unterseiten
                  </p>
                </div>
              </div>

              <h1 className="break-words text-[38px] font-black leading-[1.02] tracking-tight text-[#141a28] dark:text-white sm:text-[44px] md:text-[60px]">
                {category.headline}
              </h1>
              <p className="mt-6 max-w-[720px] text-[18px] font-medium leading-[1.55] text-[#526071] dark:text-zinc-300">
                {category.description}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                ['Live Schnellchecks', liveTools.length, 'Sofort nutzbar, ohne Full Crawl'],
                ['Daten-Tools', providerTools.length, 'Provider oder Add-on vorbereitet'],
                ['Audit-Strecken', auditTools.length, 'Führen bewusst zum Deep Scan'],
              ].map(([label, value, text]) => (
                <div key={String(label)} className="rounded-lg border border-[#dfe3ea] bg-[#f8fafc] p-5 dark:border-zinc-800 dark:bg-zinc-900">
                  <p className="text-[34px] font-black text-[#172033] dark:text-zinc-100">{String(value)}</p>
                  <p className="mt-2 text-[12px] font-black uppercase tracking-[0.12em] text-[#526071] dark:text-zinc-400">
                    {String(label)}
                  </p>
                  <p className="mt-3 text-[12px] font-semibold leading-relaxed text-[#64748b] dark:text-zinc-400">
                    {String(text)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {landing && <ToolCategoryLandingSections category={category} landing={landing} tools={tools} />}

        <section className="mx-auto max-w-[1380px] px-6 py-12 md:px-10">
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-[30px] font-black tracking-tight text-[#141a28] dark:text-white">
                {category.navTitle} Unterseiten
              </h2>
              <p className="mt-2 max-w-[720px] text-[15px] font-medium leading-relaxed text-[#64748b] dark:text-zinc-400">
                Jede Seite hat einen eigenen Suchintent und führt entweder in einen Schnellcheck, einen Datenprovider oder den passenden Audit.
              </p>
            </div>
            <Link
              href="/tools"
              className="flex w-fit items-center gap-2 rounded-md border border-[#cfd7e5] bg-white px-5 py-3 text-[12px] font-black text-[#172033] transition-colors hover:border-[#D4AF37] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            >
              Alle Tools
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {tools.map((tool) => (
              <Link
                key={tool.slug}
                href={`/tools/${tool.slug}`}
                className="group min-h-[228px] rounded-lg border border-[#dfe3ea] bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#D4AF37] hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="mb-5 flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-md bg-[#eef4ff] text-[#0b7de3] dark:bg-zinc-950">
                    <ToolIcon icon={tool.icon} />
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#7b8495]">
                    {tool.status === 'live' ? 'Live' : tool.status === 'provider' ? 'Provider' : 'Audit'}
                  </span>
                </div>
                <h3 className="text-[18px] font-black text-[#172033] dark:text-zinc-100">{tool.title}</h3>
                <p className="mt-2 text-[13px] font-medium leading-relaxed text-[#64748b] dark:text-zinc-400">
                  {tool.description}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {tool.checks.slice(0, 3).map((check) => (
                    <span
                      key={check}
                      className="rounded-sm bg-[#f0f3f8] px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-[#526071] dark:bg-zinc-950 dark:text-zinc-400"
                    >
                      {check}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <PublicToolsFooter />
    </div>
  );
}
