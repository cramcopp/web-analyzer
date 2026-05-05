'use client';

import Link from 'next/link';
import { ArrowRight, ChevronDown, Grid2X2, Search } from 'lucide-react';
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

const statusLabel: Record<ToolStatus, string> = {
  live: 'Live',
  provider: 'Live',
  audit: 'Live',
  planned: 'Geplant',
};

const actionLabel: Record<ToolStatus, string> = {
  live: 'Direkt nutzbar',
  provider: 'Datenquelle vorbereitet',
  audit: 'Deep Scan Einstieg',
  planned: 'Roadmap Seite',
};

const seoFeaturedOrder = new Map(
  [
    'seo-checker',
    'technical-seo-audit',
    'site-audit',
    'on-page-seo-checker',
    'keyword-checker',
    'serp-preview-tool',
  ].map((slug, index) => [slug, index]),
);

function normalize(value: string) {
  return value.toLocaleLowerCase('de-DE');
}

function formatChip(value: string) {
  return value
    .toLocaleLowerCase('de-DE')
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase('de-DE') + part.slice(1))
    .join(' ');
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
  const defaultCategory = categories[0]?.slug ?? 'all';
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>(defaultCategory);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [visibleState, setVisibleState] = useState({ count: 6, key: '' });
  const deferredQuery = useDeferredValue(query);
  const searchTerm = normalize(deferredQuery.trim());
  const filterKey = `${categoryFilter}:${statusFilter}:${searchTerm}`;

  const categoryBySlug = useMemo(() => {
    return new Map(categories.map((category) => [category.slug, category]));
  }, [categories]);

  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      const categoryMatches = categoryFilter === 'all' || tool.categorySlug === categoryFilter;
      const statusMatches = statusFilter === 'all' || tool.status === statusFilter;
      return categoryMatches && statusMatches && matchesSearch(tool, searchTerm);
    }).sort((toolA, toolB) => {
      if (categoryFilter !== 'seo' || statusFilter !== 'all' || searchTerm) {
        return 0;
      }

      const orderA = seoFeaturedOrder.get(toolA.slug) ?? Number.MAX_SAFE_INTEGER;
      const orderB = seoFeaturedOrder.get(toolB.slug) ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });
  }, [categoryFilter, searchTerm, statusFilter, tools]);

  const visibleCount = visibleState.key === filterKey ? visibleState.count : 6;
  const visibleTools = filteredTools.slice(0, visibleCount);

  return (
    <div>
      <div className="border-b border-[#d6deeb] bg-white pt-4">
        <div className="flex gap-8 overflow-x-auto">
          {categories.map((category) => (
            <button
              key={category.slug}
              type="button"
              onClick={() => setCategoryFilter(category.slug)}
              aria-pressed={categoryFilter === category.slug}
              className={`relative shrink-0 pb-4 text-[14px] font-semibold transition-colors ${
                categoryFilter === category.slug
                  ? 'text-[#0b63ff] after:absolute after:bottom-[-1px] after:left-0 after:h-0.5 after:w-full after:bg-[#0b63ff]'
                  : 'text-[#0f172a] hover:text-[#0b63ff]'
              }`}
            >
              {category.navTitle}
            </button>
          ))}
        </div>
      </div>

      <div className="py-5">
        <h2 className="text-[24px] font-black tracking-tight text-[#111827]">
          Alle Tool-Unterseiten
        </h2>

        <div className="mt-5 rounded-lg border border-[#d9e1ec] bg-white p-3 shadow-[0_10px_32px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1 lg:max-w-[540px]">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#64748b]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tool suchen..."
                className="h-11 w-full rounded-md border border-[#d9e1ec] bg-white pl-11 pr-4 text-[14px] font-medium text-[#0f172a] outline-none transition-colors placeholder:text-[#64748b] focus:border-[#0b63ff]"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {statusFilters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setStatusFilter(filter.value)}
                  aria-pressed={statusFilter === filter.value}
                  className={`h-11 min-w-[70px] rounded-md border px-4 text-[14px] font-semibold transition-colors ${
                    statusFilter === filter.value
                      ? 'border-[#0b63ff] bg-white text-[#0b63ff] shadow-sm'
                      : 'border-[#d9e1ec] bg-white text-[#0f172a] hover:border-[#0b63ff]'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              aria-pressed={categoryFilter === 'all'}
              className={`flex h-11 items-center gap-2 rounded-md border px-4 text-[14px] font-semibold transition-colors ${
                categoryFilter === 'all'
                  ? 'border-[#0b63ff] bg-white text-[#0b63ff] shadow-sm'
                  : 'border-[#d9e1ec] bg-white text-[#0b63ff] hover:border-[#0b63ff]'
              }`}
            >
              <Grid2X2 className="h-4 w-4" />
              Alle Kategorien
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>

        {visibleTools.length > 0 ? (
          <>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {visibleTools.map((tool) => {
                const category = categoryBySlug.get(tool.categorySlug);
                const extraChecks = Math.max(0, tool.checks.length - 3);

                return (
                  <Link
                    key={tool.slug}
                    href={`/tools/${tool.slug}`}
                    className="group flex min-h-[140px] rounded-lg border border-[#d9e1ec] bg-white p-5 shadow-[0_10px_26px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-0.5 hover:border-[#0b63ff] hover:shadow-[0_16px_34px_rgba(15,23,42,0.10)]"
                  >
                    <div className="flex min-w-0 flex-1 gap-5">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#0b63ff] text-white shadow-[0_12px_24px_rgba(11,99,255,0.24)]">
                        <ToolIcon icon={tool.icon} className="h-6 w-6" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-[13px] font-medium text-[#475569]">
                          <span className="h-2 w-2 rounded-full bg-[#15a36b]" />
                          {statusLabel[tool.status]}
                        </div>
                        <h3 className="mt-1 text-[18px] font-black leading-tight text-[#111827]">
                          {tool.title}
                        </h3>
                        <p className="mt-2 line-clamp-2 text-[13px] font-medium leading-relaxed text-[#334155]">
                          {tool.description}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {tool.checks.slice(0, 3).map((check) => (
                            <span
                              key={check}
                              className="rounded-md border border-[#d9e1ec] bg-[#f4f7fb] px-3 py-1 text-[11px] font-medium text-[#334155]"
                            >
                              {formatChip(check)}
                            </span>
                          ))}
                          {extraChecks > 0 && (
                            <span className="rounded-md border border-[#d9e1ec] bg-[#f4f7fb] px-3 py-1 text-[11px] font-medium text-[#334155]">
                              +{extraChecks}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="ml-4 flex shrink-0 flex-col items-end justify-between">
                      <span className="rounded-full border border-[#d9e1ec] bg-[#f8fafc] px-3 py-1 text-[12px] font-medium text-[#334155]">
                        {category?.navTitle ?? tool.category}
                      </span>
                      <span className="flex items-center gap-2 text-[13px] font-semibold text-[#0f172a] transition-colors group-hover:text-[#0b63ff]">
                        {actionLabel[tool.status]}
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>

            {visibleCount < filteredTools.length && (
              <div className="mt-5 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleState({ count: visibleCount + 12, key: filterKey })}
                  className="flex items-center gap-2 rounded-md px-4 py-2 text-[14px] font-medium text-[#334155] transition-colors hover:bg-white hover:text-[#0b63ff]"
                >
                  Weitere Tools laden
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-[#cfd7e5] bg-white p-8 text-center">
            <p className="text-[18px] font-black text-[#172033]">Keine Tools gefunden</p>
            <p className="mx-auto mt-2 max-w-[520px] text-[13px] font-semibold leading-relaxed text-[#64748b]">
              Passe Suche, Kategorie oder Status an.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
