import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { ToolIcon } from '@/components/tool-page-chrome';
import type { ToolCategory, ToolPage } from '@/lib/tool-pages';
import type { ToolCategoryLanding } from '@/lib/tool-category-landing';

type ToolCategoryLandingSectionsProps = {
  category: ToolCategory;
  landing: ToolCategoryLanding;
  tools: ToolPage[];
};

function statusLabel(status: ToolPage['status']) {
  if (status === 'live') return 'Live';
  if (status === 'provider') return 'Provider';
  if (status === 'planned') return 'Geplant';
  return 'Audit';
}

function statusClassName(status: ToolPage['status']) {
  if (status === 'live') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-300';
  }
  if (status === 'provider') {
    return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/25 dark:text-blue-300';
  }
  if (status === 'planned') {
    return 'border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300';
  }
  return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-300';
}

function getToolsBySlug(slugs: string[], toolMap: Map<string, ToolPage>) {
  return slugs.map((slug) => toolMap.get(slug)).filter((tool): tool is ToolPage => Boolean(tool));
}

function ToolCard({ tool, compact = false }: { tool: ToolPage; compact?: boolean }) {
  return (
    <Link
      href={`/tools/${tool.slug}`}
      className={`group flex flex-col rounded-lg border border-[#dfe3ea] bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#D4AF37] hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-900 ${
        compact ? 'min-h-[170px] p-5' : 'min-h-[236px] p-6'
      }`}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#eef4ff] text-[#0b7de3] dark:bg-zinc-950">
          <ToolIcon icon={tool.icon} />
        </span>
        <span className={`rounded-sm border px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em] ${statusClassName(tool.status)}`}>
          {statusLabel(tool.status)}
        </span>
      </div>
      <h3 className="text-[18px] font-black text-[#172033] dark:text-zinc-100">{tool.title}</h3>
      <p className="mt-2 text-[13px] font-medium leading-relaxed text-[#64748b] dark:text-zinc-400">
        {compact ? tool.headline : tool.description}
      </p>
      {!compact && (
        <div className="mt-auto pt-5">
          <p className="text-[12px] font-black text-[#0b7de3]">
            Tool öffnen
            <ArrowRight className="ml-1 inline h-3.5 w-3.5 align-[-2px] transition-transform group-hover:translate-x-0.5" />
          </p>
        </div>
      )}
    </Link>
  );
}

function CategoryJsonLd({
  category,
  landing,
  topTools,
}: {
  category: ToolCategory;
  landing: ToolCategoryLanding;
  topTools: ToolPage[];
}) {
  const categoryUrl = `https://website-analyzer.pro/tools/${category.slug}`;
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Tools',
          item: 'https://website-analyzer.pro/tools',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: category.title,
          item: categoryUrl,
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: landing.metadataTitle,
      description: landing.metadataDescription,
      url: categoryUrl,
      itemListElement: topTools.map((tool, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `https://website-analyzer.pro/tools/${tool.slug}`,
        name: tool.title,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: landing.faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
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

export default function ToolCategoryLandingSections({
  category,
  landing,
  tools,
}: ToolCategoryLandingSectionsProps) {
  const toolMap = new Map(tools.map((tool) => [tool.slug, tool]));
  const topTools = getToolsBySlug(landing.primaryToolSlugs, toolMap);

  return (
    <>
      <CategoryJsonLd category={category} landing={landing} topTools={topTools} />

      <section className="border-b border-[#dfe3ea] bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto grid max-w-[1380px] grid-cols-1 gap-10 px-6 py-12 md:px-10 lg:grid-cols-[0.82fr_1.18fr]">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#0b7de3]">
              {landing.eyebrow}
            </p>
            <h2 className="mt-3 text-[34px] font-black leading-[1.05] tracking-tight text-[#141a28] dark:text-white md:text-[44px]">
              {landing.detailHeadline}
            </h2>
          </div>
          <div className="space-y-4">
            {landing.intro.map((paragraph) => (
              <p
                key={paragraph}
                className="text-[16px] font-medium leading-[1.75] text-[#526071] dark:text-zinc-300"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1380px] px-6 py-12 md:px-10">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-[30px] font-black tracking-tight text-[#141a28] dark:text-white">
              {landing.topToolsTitle}
            </h2>
            <p className="mt-2 max-w-[720px] text-[15px] font-medium leading-relaxed text-[#64748b] dark:text-zinc-400">
              {landing.topToolsDescription}
            </p>
          </div>
          <Link
            href="/scanner"
            className="flex w-fit items-center gap-2 rounded-md bg-[#172033] px-5 py-3 text-[12px] font-black text-white transition-colors hover:bg-[#0b7de3]"
          >
            Full Audit starten
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {topTools.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>
      </section>

      <section className="border-y border-[#dfe3ea] bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-[1380px] px-6 py-12 md:px-10">
          <div className="mb-8">
            <h2 className="text-[30px] font-black tracking-tight text-[#141a28] dark:text-white">
              {landing.groupsTitle}
            </h2>
            <p className="mt-2 max-w-[780px] text-[15px] font-medium leading-relaxed text-[#64748b] dark:text-zinc-400">
              {landing.groupsDescription}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {landing.groups.map((group) => {
              const groupTools = getToolsBySlug(group.toolSlugs, toolMap);

              return (
                <div
                  key={group.title}
                  className="rounded-lg border border-[#dfe3ea] bg-[#f8fafc] p-6 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <h3 className="text-[22px] font-black tracking-tight text-[#172033] dark:text-zinc-100">
                    {group.title}
                  </h3>
                  <p className="mt-2 text-[14px] font-medium leading-relaxed text-[#64748b] dark:text-zinc-400">
                    {group.description}
                  </p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {groupTools.map((tool) => (
                      <Link
                        key={tool.slug}
                        href={`/tools/${tool.slug}`}
                        className="flex items-center justify-between gap-3 rounded-md border border-[#dfe3ea] bg-white px-4 py-3 transition-colors hover:border-[#D4AF37] dark:border-zinc-800 dark:bg-zinc-950"
                      >
                        <span className="text-[13px] font-black text-[#172033] dark:text-zinc-100">
                          {tool.shortTitle}
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-[#0b7de3]" />
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1380px] px-6 py-12 md:px-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="text-[30px] font-black tracking-tight text-[#141a28] dark:text-white">
              {landing.decisionTitle}
            </h2>
            <p className="mt-3 text-[15px] font-medium leading-relaxed text-[#64748b] dark:text-zinc-400">
              {landing.decisionDescription}
            </p>
          </div>
          <div className="grid gap-4">
            {landing.crawlDecision.map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-[#dfe3ea] bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-[18px] font-black text-[#172033] dark:text-zinc-100">{item.label}</h3>
                    <p className="mt-1 text-[13px] font-bold text-[#526071] dark:text-zinc-300">
                      {item.bestFor}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.examples.map((example) => (
                      <span
                        key={example}
                        className="rounded-sm bg-[#eef4ff] px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-[#0b7de3] dark:bg-blue-950/30 dark:text-blue-300"
                      >
                        {example}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="mt-4 text-[13px] font-medium leading-relaxed text-[#64748b] dark:text-zinc-400">
                  {item.costLogic}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#dfe3ea] bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-[1380px] px-6 py-12 md:px-10">
          <div className="mb-8">
            <h2 className="text-[30px] font-black tracking-tight text-[#141a28] dark:text-white">
              {landing.workflowsTitle}
            </h2>
            <p className="mt-2 max-w-[760px] text-[15px] font-medium leading-relaxed text-[#64748b] dark:text-zinc-400">
              {landing.workflowsDescription}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {landing.workflows.map((workflow) => {
              const workflowTools = getToolsBySlug(workflow.toolSlugs, toolMap);

              return (
                <div
                  key={workflow.title}
                  className="rounded-lg border border-[#dfe3ea] bg-[#f8fafc] p-6 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <h3 className="text-[19px] font-black text-[#172033] dark:text-zinc-100">{workflow.title}</h3>
                  <p className="mt-2 text-[13px] font-medium leading-relaxed text-[#64748b] dark:text-zinc-400">
                    {workflow.description}
                  </p>
                  <div className="mt-5 space-y-2">
                    {workflowTools.map((tool) => (
                      <Link
                        key={tool.slug}
                        href={`/tools/${tool.slug}`}
                        className="flex items-center gap-3 text-[13px] font-black text-[#172033] transition-colors hover:text-[#0b7de3] dark:text-zinc-100 dark:hover:text-blue-300"
                      >
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-[#009b72]" />
                        {tool.title}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1380px] px-6 py-12 md:px-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[0.82fr_1.18fr]">
          <div>
            <h2 className="text-[30px] font-black tracking-tight text-[#141a28] dark:text-white">
              {landing.faqTitle}
            </h2>
            <p className="mt-3 text-[15px] font-medium leading-relaxed text-[#64748b] dark:text-zinc-400">
              {landing.faqDescription}
            </p>
          </div>
          <div className="grid gap-4">
            {landing.faqs.map((faq) => (
              <div
                key={faq.question}
                className="rounded-lg border border-[#dfe3ea] bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <h3 className="text-[16px] font-black text-[#172033] dark:text-zinc-100">{faq.question}</h3>
                <p className="mt-2 text-[13px] font-medium leading-relaxed text-[#64748b] dark:text-zinc-400">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
