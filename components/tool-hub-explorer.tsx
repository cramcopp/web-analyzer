'use client';

import Link from 'next/link';
import { ArrowRight, Search, SlidersHorizontal, X } from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';
import { ToolIcon } from '@/components/tool-page-chrome';
import type { ToolCategory, ToolCategorySlug, ToolPage, ToolStatus } from '@/lib/tool-pages';

type CategoryFilter = ToolCategorySlug | 'all';
type StatusFilter = ToolStatus | 'all';

type ToolHubExplorerProps = {
  categories: ToolCategory[];
  tools: ToolPage[];
};

const statusFilters: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'Alle' },
  { value: 'live', label: 'Live' },
  { value: 'provider', label: 'Provider' },
  { value: 'audit', label: 'Audit' },
  { value: 'planned', label: 'Geplant' },
];

const statusMeta: Record<ToolStatus, { label: string; description: string; className: string }> = {
  live: {
    label: 'Live Check',
    description: 'Direkt nutzbar',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-300',
  },
  provider: {
    label: 'Provider',
    description: 'Datenquelle vorbereitet',
    className: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/25 dark:text-blue-300',
  },
  audit: {
    label: 'Audit',
    description: 'Deep Scan Einstieg',
    className: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-300',
  },
  planned: {
    label: 'Geplant',
    description: 'Roadmap Seite',
    className: 'border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300',
  },
};

function normalize(value: string) {
  return value.toLocaleLowerCase('de-DE');
}

function matchesSearch(tool: ToolPage, term: string) {
  if (!term) return true;
  return [
    tool.title,
    tool.shortTitle,
    tool.headline,
    tool.description,
    tool.seoDescription,
    tool.category,
    tool.status,
    ...tool.checks,
  ]
    .join(' ')
    .toLocaleLowerCase('de-DE')
    .includes(term);
}

export default function ToolHubExplorer({ categories, tools }: ToolHubExplorerProps) {
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const deferredQuery = useDeferredValue(query);
  const searchTerm = normalize(deferredQuery.trim());

  const categoryCounts = useMemo(() => {
    return new Map(
      categories.map((category) => [
        category.slug,
        tools.filter((tool) => tool.categorySlug === category.slug).length,
      ]),
    );
  }, [categories, tools]);

  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      const categoryMatches = categoryFilter === 'all' || tool.categorySlug === categoryFilter;
      const statusMatches = statusFilter === 'all' || tool.status === statusFilter;
      return categoryMatches && statusMatches && matchesSearch(tool, searchTerm);
    });
  }, [categoryFilter, searchTerm, statusFilter, tools]);

  const liveCount = tools.filter((tool) => tool.status === 'live').length;
  const providerCount = tools.filter((tool) => tool.status === 'provider').length;
  const auditCount = tools.filter((tool) => tool.status === 'audit' || tool.status === 'planned').length;
  const statSummary = [
    { label: 'Unterseiten', value: tools.length, text: 'eigene URLs' },
    { label: 'Live Checks', value: liveCount, text: 'sofort testbar' },
    { label: 'Daten & Audits', value: providerCount + auditCount, text: 'für Deep Scans' },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-[#dfe3ea] bg-white/80 px-4 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="grid gap-3 sm:grid-cols-3">
          {statSummary.map((stat) => (
            <div
              key={stat.label}
              className="flex min-w-0 items-baseline gap-2 border-[#eef2f7] sm:border-r sm:pr-4 sm:last:border-r-0 dark:border-zinc-800"
            >
              <p className="text-[22px] font-black leading-none text-[#172033] dark:text-zinc-100">{stat.value}</p>
              <p className="min-w-0 truncate text-[12px] font-black uppercase tracking-[0.1em] text-[#526071] dark:text-zinc-400">
                {stat.label}
              </p>
              <p className="hidden text-[12px] font-semibold text-[#8a94a6] md:block">
                {stat.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-[#dfe3ea] bg-white/90 p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-zinc-800 dark:bg-zinc-900/90">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7b8495]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tool, Thema oder Problem suchen"
              className="h-9 w-full rounded-md border border-[#cfd7e5] bg-[#f8fafc] pl-11 pr-11 text-[14px] font-bold text-[#172033] outline-none transition-colors placeholder:text-[#8a94a6] focus:border-[#0b7de3] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Suche löschen"
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#64748b] transition-colors hover:bg-[#eef2f7] hover:text-[#172033] dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex min-w-fit flex-wrap gap-2">
            {statusFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setStatusFilter(filter.value)}
                aria-pressed={statusFilter === filter.value}
                className={`min-h-8 rounded-md border px-3 text-[12px] font-black transition-colors ${
                  statusFilter === filter.value
                    ? 'border-[#0b7de3] bg-[#0b7de3] text-white dark:border-blue-400 dark:bg-blue-400 dark:text-[#172033]'
                    : 'border-[#d8dde8] bg-[#f8fafc] text-[#526071] hover:border-[#D4AF37] hover:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-[#7b8495]">
          <SlidersHorizontal className="h-4 w-4" />
          Kategorien
        </div>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            aria-pressed={categoryFilter === 'all'}
            className={`min-h-8 shrink-0 rounded-md border px-3 text-[12px] font-black transition-colors ${
              categoryFilter === 'all'
                ? 'border-[#0b7de3] bg-[#eef4ff] text-[#0b7de3] dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300'
                : 'border-[#d8dde8] bg-[#f8fafc] text-[#526071] hover:border-[#D4AF37] hover:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900'
            }`}
          >
            Alle Kategorien
          </button>
          {categories.map((category) => (
            <button
              key={category.slug}
              type="button"
              onClick={() => setCategoryFilter(category.slug)}
              aria-pressed={categoryFilter === category.slug}
              className={`min-h-8 shrink-0 rounded-md border px-3 text-[12px] font-black transition-colors ${
                categoryFilter === category.slug
                  ? 'border-[#0b7de3] bg-[#eef4ff] text-[#0b7de3] dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300'
                  : 'border-[#d8dde8] bg-[#f8fafc] text-[#526071] hover:border-[#D4AF37] hover:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900'
              }`}
            >
              {category.navTitle} <span className="ml-1 text-[#8a94a6]">{categoryCounts.get(category.slug)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[20px] font-black tracking-tight text-[#141a28] dark:text-white md:text-[22px]">
            {filteredTools.length} passende Tools
          </h2>
          <p className="mt-1 text-[12px] font-semibold leading-relaxed text-[#64748b] dark:text-zinc-400">
            Direkte Checks sparen Crawl-Budget. Der Full Audit bleibt für komplette Webseiten und große Reports.
          </p>
        </div>
        <Link
          href="/scanner"
          className="flex w-fit items-center gap-2 rounded-md bg-[#009b72] px-4 py-2.5 text-[12px] font-black text-white transition-colors hover:bg-[#087f5f]"
        >
          Full Audit starten
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {filteredTools.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredTools.map((tool) => {
            const meta = statusMeta[tool.status];

            return (
              <Link
                key={tool.slug}
                href={`/tools/${tool.slug}`}
                className="group flex min-h-[158px] flex-col rounded-md border border-[#dfe3ea] bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:border-[#D4AF37] hover:bg-[#fbfcfe] hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-900/80"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#eef4ff] text-[#0b7de3] dark:bg-zinc-950">
                      <ToolIcon icon={tool.icon} className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[9px] font-black uppercase tracking-[0.14em] text-[#7b8495]">
                        {tool.category}
                      </p>
                      <h3 className="mt-0.5 text-[16px] font-black leading-tight text-[#172033] dark:text-zinc-100">
                        {tool.title}
                      </h3>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-sm border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] ${meta.className}`}
                  >
                    {meta.label}
                  </span>
                </div>
                <p className="overflow-hidden text-[12px] font-medium leading-[1.45] text-[#64748b] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] dark:text-zinc-400">
                  {tool.description}
                </p>
                <div className="mt-auto pt-3">
                  <div className="mb-2 flex flex-wrap gap-1">
                    {tool.checks.slice(0, 3).map((check) => (
                      <span
                        key={check}
                        className="rounded-sm bg-[#f0f3f8] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-[#526071] dark:bg-zinc-950 dark:text-zinc-400"
                      >
                        {check}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] font-black text-[#0b7de3]">
                    {meta.description}
                    <ArrowRight className="ml-1 inline h-3.5 w-3.5 align-[-2px] transition-transform group-hover:translate-x-0.5" />
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-[#cfd7e5] bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-[18px] font-black text-[#172033] dark:text-zinc-100">Keine Tools gefunden</p>
          <p className="mx-auto mt-2 max-w-[520px] text-[13px] font-semibold leading-relaxed text-[#64748b] dark:text-zinc-400">
            Passe Suche, Kategorie oder Status an. Die Unterseiten bleiben getrennte Einstiege, damit nicht jede Idee einen Full Crawl auslöst.
          </p>
        </div>
      )}
    </div>
  );
}
