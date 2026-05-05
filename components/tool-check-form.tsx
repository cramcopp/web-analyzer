'use client';

import { FormEvent, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Info, Loader2, XCircle } from 'lucide-react';
import Link from 'next/link';
import type { ToolInputMode, ToolCheckItem, ToolCheckResult, ToolCheckStatus } from '@/types/tool-checks';

type ToolCheckFormProps = {
  tool: string;
  title: string;
  inputMode: ToolInputMode;
  placeholder: string;
  buttonLabel: string;
};

function statusStyles(status: ToolCheckStatus) {
  switch (status) {
    case 'good':
      return {
        row: 'border-[#ccebdc] bg-[#f0fbf6] text-[#116b47] dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300',
        icon: CheckCircle2,
      };
    case 'warning':
      return {
        row: 'border-[#f0d99b] bg-[#fff8e6] text-[#8a5a00] dark:border-yellow-900/70 dark:bg-yellow-950/25 dark:text-yellow-300',
        icon: AlertCircle,
      };
    case 'bad':
      return {
        row: 'border-[#f0b9b7] bg-[#fff1f0] text-[#a42520] dark:border-red-900/70 dark:bg-red-950/25 dark:text-red-300',
        icon: XCircle,
      };
    case 'info':
    default:
      return {
        row: 'border-[#d5deea] bg-[#f6f8fc] text-[#42526a] dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300',
        icon: Info,
      };
  }
}

function ResultItem({ item }: { item: ToolCheckItem }) {
  const styles = statusStyles(item.status);
  const Icon = styles.icon;

  return (
    <div className={`rounded-md border p-4 ${styles.row}`}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] font-black text-[#172033] dark:text-zinc-100">{item.label}</p>
            <p className="text-[12px] font-black">{item.value}</p>
          </div>
          {item.detail && (
            <p className="mt-2 break-words text-[12px] font-semibold leading-relaxed opacity-80">
              {item.detail}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ToolCheckForm({
  tool,
  title,
  inputMode,
  placeholder,
  buttonLabel,
}: ToolCheckFormProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ToolCheckResult | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const value = input.trim();
    if (!value) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/tools/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool, input: value }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Check konnte nicht ausgeführt werden.');
      }
      setResult(data);
    } catch (checkError) {
      setError(checkError instanceof Error ? checkError.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-[#d6deea] bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <form onSubmit={submit} className="border-b border-[#e3e8f0] p-4 dark:border-zinc-800 sm:p-6">
        <label className="mb-3 block text-[11px] font-black uppercase tracking-[0.16em] text-[#6f7b8d] dark:text-zinc-400">
          {inputMode === 'keyword' ? 'Keyword' : inputMode === 'text' ? 'Text' : 'URL'}
        </label>
        <div className="flex flex-col gap-3 lg:flex-row">
          {inputMode === 'text' ? (
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={placeholder}
              disabled={loading}
              rows={5}
              className="min-h-[132px] min-w-0 flex-1 resize-y rounded-md border border-[#cfd7e5] bg-[#f8fafc] px-4 py-3 text-[14px] font-semibold leading-relaxed text-[#172033] outline-none transition-colors placeholder:text-[#8a94a6] focus:border-[#0b7de3] disabled:bg-[#eef2f7] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-500 dark:disabled:bg-zinc-900"
            />
          ) : (
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={placeholder}
              disabled={loading}
              className="min-h-12 min-w-0 flex-1 rounded-md border border-[#cfd7e5] bg-[#f8fafc] px-4 text-[15px] font-bold text-[#172033] outline-none transition-colors placeholder:text-[#8a94a6] focus:border-[#0b7de3] disabled:bg-[#eef2f7] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-500 dark:disabled:bg-zinc-900"
            />
          )}
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#009b72] px-6 text-[13px] font-black text-white transition-colors hover:bg-[#087f61] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            {buttonLabel}
          </button>
        </div>
      </form>

      <div className="p-4 sm:p-6">
        {!result && !error && !loading && (
          <div className="grid min-h-[220px] place-items-center rounded-md border border-dashed border-[#d5deea] bg-[#f8fafc] p-8 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
            <div>
              <p className="text-[18px] font-black text-[#172033] dark:text-zinc-100">{title}</p>
              <p className="mx-auto mt-2 max-w-[480px] text-[13px] font-semibold leading-relaxed text-[#64748b] dark:text-zinc-400">
                Dieser Schnellcheck arbeitet separat und startet keinen Full Audit Crawl.
              </p>
            </div>
          </div>
        )}

        {loading && (
          <div className="grid min-h-[220px] place-items-center rounded-md bg-[#f8fafc] p-8 text-center dark:bg-zinc-900/50">
            <Loader2 className="mb-4 h-8 w-8 animate-spin text-[#0b7de3]" />
            <p className="text-[13px] font-black uppercase tracking-[0.14em] text-[#64748b]">Check läuft</p>
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
          <div className="space-y-5">
            <div className="flex flex-col gap-4 border-b border-[#e3e8f0] pb-5 dark:border-zinc-800 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="break-words text-[13px] font-black uppercase tracking-[0.14em] text-[#6f7b8d]">
                  {result.target}
                </p>
                <h2 className="mt-2 text-[24px] font-black tracking-tight text-[#172033] dark:text-zinc-100">
                  {result.summary}
                </h2>
              </div>
              <div className="flex min-h-20 min-w-20 shrink-0 flex-col items-center justify-center rounded-md border border-[#d6deea] bg-[#f8fafc] px-4 dark:border-zinc-800 dark:bg-zinc-900">
                <span className="text-[11px] font-black uppercase tracking-[0.12em] text-[#6f7b8d]">Score</span>
                <span className="text-[28px] font-black text-[#172033] dark:text-zinc-100">
                  {result.score === null ? 'N/A' : result.score}
                </span>
              </div>
            </div>

            <div className="grid gap-3">
              {result.items.map((item) => (
                <ResultItem key={`${item.label}-${item.value}`} item={item} />
              ))}
            </div>

            {result.preview && (
              <div className="rounded-md border border-[#d6deea] bg-[#111827] p-4 dark:border-zinc-800">
                <p className="mb-3 text-[11px] font-black uppercase tracking-[0.16em] text-[#9aa8bd]">
                  Dateiausschnitt
                </p>
                <pre className="max-h-[320px] overflow-auto whitespace-pre-wrap break-words text-[12px] leading-relaxed text-[#dce5f2]">
                  {result.preview}
                </pre>
              </div>
            )}

            {result.nextStep && (
              <div className="flex flex-col gap-3 rounded-md border border-[#d6deea] bg-[#f8fafc] p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[13px] font-bold leading-relaxed text-[#42526a] dark:text-zinc-300">
                  {result.nextStep}
                </p>
                <Link
                  href="/scanner"
                  className="flex w-fit items-center gap-2 rounded-md bg-[#172033] px-4 py-2 text-[12px] font-black text-white transition-colors hover:bg-[#0b7de3]"
                >
                  Full Audit
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
