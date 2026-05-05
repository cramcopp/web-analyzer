'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Globe2,
  Loader2,
  LockKeyhole,
  Search,
} from 'lucide-react';
import { useAuth } from './auth-provider';

type ScanStartResult = {
  audit_id: string;
  status: string;
  mode?: string;
  scanPlan?: string;
  crawlLimitUsed?: number;
  monthlyCrawlPagesLimit?: number;
};

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export default function ScannerSubpageClient() {
  const { user, signIn } = useAuth();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanStartResult | null>(null);

  useEffect(() => {
    const initialUrl = new URLSearchParams(window.location.search).get('url');
    if (initialUrl) {
      setUrl(initialUrl);
    }
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const targetUrl = normalizeUrl(url);
    if (!targetUrl) return;

    try {
      new URL(targetUrl);
    } catch {
      setError('Bitte gib eine gültige URL ein.');
      return;
    }

    if (!user) {
      setError('Bitte logge dich ein, damit der Full Audit deinem Account und deinen Planlimits zugeordnet werden kann.');
      await signIn();
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Scan konnte nicht gestartet werden.');
      }

      setResult(data);
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : 'Unbekannter Fehler beim Starten des Scans.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-[#d6deea] bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <form onSubmit={submit} className="border-b border-[#e3e8f0] p-5 dark:border-zinc-800 sm:p-6">
        <label className="mb-3 block text-[11px] font-black uppercase tracking-[0.16em] text-[#6f7b8d]">
          Website Full Audit
        </label>
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-md border border-[#cfd7e5] bg-[#f8fafc] px-4 dark:border-zinc-700 dark:bg-zinc-950">
            <Globe2 className="h-4 w-4 shrink-0 text-[#0b7de3]" />
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://deine-domain.de"
              disabled={loading}
              className="min-w-0 flex-1 bg-transparent text-[15px] font-bold text-[#172033] outline-none placeholder:text-[#8a94a6] dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#009b72] px-6 text-[13px] font-black text-white transition-colors hover:bg-[#087f61] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : user ? <Search className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}
            {user ? 'Full Audit starten' : 'Einloggen und scannen'}
          </button>
        </div>
      </form>

      <div className="p-5 sm:p-6">
        {!error && !result && !loading && (
          <div className="grid min-h-[220px] place-items-center rounded-md border border-dashed border-[#d5deea] bg-[#f8fafc] p-8 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
            <div>
              <p className="text-[18px] font-black text-[#172033] dark:text-zinc-100">
                Scanner ist eine echte Full-Audit-Unterseite.
              </p>
              <p className="mx-auto mt-2 max-w-[520px] text-[13px] font-semibold leading-relaxed text-[#64748b] dark:text-zinc-400">
                Einzelne Tool-Seiten starten nur Kurzchecks. Diese Seite startet bewusst den Crawl und zählt ihn in dein Scan- und Crawl-Budget.
              </p>
            </div>
          </div>
        )}

        {loading && (
          <div className="grid min-h-[220px] place-items-center rounded-md bg-[#f8fafc] p-8 text-center dark:bg-zinc-900/50">
            <Loader2 className="mb-4 h-8 w-8 animate-spin text-[#0b7de3]" />
            <p className="text-[13px] font-black uppercase tracking-[0.14em] text-[#64748b]">Workflow wird gestartet</p>
          </div>
        )}

        {error && (
          <div className="rounded-md border border-[#f0b9b7] bg-[#fff1f0] p-5 text-[#a42520] dark:border-red-900/70 dark:bg-red-950/25 dark:text-red-300">
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-[13px] font-bold leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {result && (
          <div className="rounded-md border border-[#ccebdc] bg-[#f0fbf6] p-5 text-[#116b47] dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  <p className="text-[14px] font-black text-[#172033] dark:text-zinc-100">Scan gestartet</p>
                </div>
                <p className="mt-2 break-all text-[12px] font-bold">Audit-ID: {result.audit_id}</p>
                <p className="mt-1 text-[12px] font-bold">
                  Plan: {(result.scanPlan || 'free').toUpperCase()} · Crawl-Limit: {result.crawlLimitUsed?.toLocaleString('de-DE') || 'Planlimit'}
                </p>
              </div>
              <Link
                href="/"
                className="flex w-fit items-center gap-2 rounded-md bg-[#172033] px-4 py-2 text-[12px] font-black text-white transition-colors hover:bg-[#0b7de3]"
              >
                Workspace öffnen
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
