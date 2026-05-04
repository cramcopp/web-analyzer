'use client';

import { FormEvent, useState } from 'react';
import {
  Activity,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  FileText,
  Globe2,
  LineChart,
  LockKeyhole,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Zap,
} from 'lucide-react';

interface MarketingHomeProps {
  onStartScan: (url: string) => void;
  onOpenAnalyzer: () => void;
  onOpenPricing: () => void;
  onSignIn: () => void;
  user?: any | null;
}

const platformAreas = [
  {
    title: 'WAP One',
    text: 'SEO, Technik, Security, DSGVO, Content und AI Visibility in einem Audit.',
    icon: Sparkles,
    tone: 'bg-[#eaf8ef] text-[#118557]',
    href: '/tools',
  },
  {
    title: 'SEO Audit',
    text: 'Crawling, Meta-Daten, Struktur, Indexierung, interne Links und Prioritäten.',
    icon: Search,
    tone: 'bg-[#e8f2ff] text-[#0b7de3]',
    href: '/tools/seo-checker',
  },
  {
    title: 'KI-Sichtbarkeit',
    text: 'Prüfe, ob Inhalte für ChatGPT, Gemini, Perplexity und AI Search lesbar sind.',
    icon: BrainCircuit,
    tone: 'bg-[#f2ecff] text-[#8656ff]',
    href: '/tools/ai-visibility-checker',
  },
  {
    title: 'Security & DSGVO',
    text: 'Header, SSL, Cookies, Datenschutz-Hinweise und Compliance-Risiken.',
    icon: ShieldCheck,
    tone: 'bg-[#fff3df] text-[#bd7714]',
    href: '/tools/security-check',
  },
  {
    title: 'Performance',
    text: 'Core-Web-Vitals-nahe Checks, Ladezeiten, Ressourcen und UX-Bremsen.',
    icon: Zap,
    tone: 'bg-[#fff0f0] text-[#cf3f3f]',
    href: '/tools/pagespeed-test',
  },
  {
    title: 'Agentur Reports',
    text: 'White-Label Reports, Kundenfreigaben, Exporte und wiederkehrendes Monitoring.',
    icon: FileText,
    tone: 'bg-[#e8fbf8] text-[#0d8f83]',
    href: '/preise',
  },
];

const scanAreas = [
  'SEO & Indexierung',
  'Performance',
  'Security',
  'DSGVO',
  'Accessibility',
  'Content Strategie',
  'AI Visibility',
  'Monitoring',
];

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[680px] rounded-[18px] border border-white/70 bg-white p-3 shadow-[0_28px_80px_rgba(23,32,51,0.18)]">
      <div className="overflow-hidden rounded-[12px] border border-[#d9e1ec] bg-[#f6f8fc]">
        <div className="flex h-11 items-center justify-between border-b border-[#d9e1ec] bg-white px-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#111827] text-[11px] font-black text-[#D4AF37]">
              W
            </span>
            <div>
              <p className="text-[12px] font-black text-[#172033]">Website Audit</p>
              <p className="text-[9px] font-bold text-[#7b8495]">cafe-husum.de</p>
            </div>
          </div>
          <button className="rounded-md bg-[#0b7de3] px-3 py-1.5 text-[10px] font-black text-white">
            Neues Crawling
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-md border border-[#d9e1ec] bg-white p-4">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#7b8495]">
                  Global Health
                </p>
                <p className="text-[34px] font-black leading-none text-[#172033]">
                  87<span className="text-[16px] text-[#7b8495]">%</span>
                </p>
              </div>
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-[11px] border-[#D4AF37] border-l-[#e6edf5] text-[13px] font-black text-[#172033]">
                +14
              </div>
            </div>
            <div className="space-y-3">
              {[
                ['SEO', '92%', 'bg-[#0b7de3]'],
                ['Security', '96%', 'bg-[#1aa66a]'],
                ['Performance', '81%', 'bg-[#D4AF37]'],
                ['DSGVO', '74%', 'bg-[#ef6461]'],
              ].map(([label, value, color]) => (
                <div key={label} className="grid grid-cols-[90px_1fr_42px] items-center gap-3">
                  <span className="text-[10px] font-black uppercase tracking-wide text-[#334155]">
                    {label}
                  </span>
                  <span className="h-2 overflow-hidden rounded-full bg-[#edf2f7]">
                    <span className={`block h-full rounded-full ${color}`} style={{ width: value }} />
                  </span>
                  <span className="text-right text-[10px] font-black text-[#172033]">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-[#d9e1ec] bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#7b8495]">
                AI Action Plan
              </p>
              <BrainCircuit className="h-4 w-4 text-[#8656ff]" />
            </div>
            <div className="space-y-3">
              {[
                ['High', 'Canonical-Konflikte beheben'],
                ['High', 'Cookie Consent rechtssicher prüfen'],
                ['Medium', 'Core Web Vitals priorisieren'],
                ['Medium', 'AI-Crawler nicht blockieren'],
              ].map(([priority, task], index) => (
                <div key={task} className="flex items-start gap-3 rounded-md bg-[#f6f8fc] p-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-white text-[10px] font-black text-[#D4AF37] shadow-sm">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-[11px] font-black text-[#172033]">{task}</p>
                    <p className="text-[9px] font-bold uppercase tracking-wide text-[#7b8495]">
                      {priority} Impact
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-[#d9e1ec] bg-white p-4 lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#7b8495]">
                Sichtbarkeit & Monitoring
              </p>
              <span className="text-[10px] font-black text-[#0a9b74]">+8.4%</span>
            </div>
            <div className="flex h-24 items-end gap-2">
              {[28, 36, 32, 48, 44, 54, 62, 58, 68, 76, 72, 84].map((height, index) => (
                <span
                  key={index}
                  className="flex-1 rounded-t-sm bg-[#0b7de3]"
                  style={{ height: `${height}%`, opacity: 0.35 + index * 0.045 }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MarketingHome({
  onStartScan,
  onOpenAnalyzer,
  onOpenPricing,
  onSignIn,
  user,
}: MarketingHomeProps) {
  const [domain, setDomain] = useState('');

  const submitHeroScan = (event: FormEvent) => {
    event.preventDefault();
    const value = domain.trim();
    if (!value) return;
    onStartScan(value);
  };

  return (
    <div className="min-h-screen bg-[#f4f6fb] pt-14 text-[#172033] dark:bg-zinc-950 dark:text-zinc-100">
      <section className="relative overflow-hidden border-b border-[#dfe3ea] bg-[linear-gradient(115deg,#e9f7f5_0%,#f4f6fb_42%,#f7f0df_100%)] dark:border-zinc-800 dark:bg-[linear-gradient(115deg,#0f172a_0%,#09090b_55%,#1d1606_100%)]">
        <div className="absolute right-0 top-0 hidden h-full w-[38%] bg-[repeating-linear-gradient(0deg,rgba(11,125,227,0.28)_0px,rgba(11,125,227,0.28)_2px,transparent_2px,transparent_10px)] opacity-50 lg:block" />
        <div className="relative mx-auto grid max-w-[1380px] grid-cols-1 items-center gap-12 px-6 py-20 md:px-10 md:py-28 lg:grid-cols-[0.88fr_1.12fr]">
          <div className="max-w-[640px]">
            <h1 className="text-[48px] font-black leading-[0.95] tracking-tight text-[#141a28] dark:text-white sm:text-[64px] lg:text-[76px]">
              Sichtbarkeit gewinnen, bevor Probleme Umsatz kosten.
            </h1>
            <p className="mt-7 max-w-[560px] text-[19px] font-medium leading-[1.45] text-[#384152] dark:text-zinc-300">
              Website Analyzer Pro scannt SEO, Performance, Security, DSGVO, Content und AI Visibility und macht daraus einen priorisierten Maßnahmenplan.
            </p>

            <form
              onSubmit={submitHeroScan}
              className="mt-9 flex max-w-[620px] flex-col gap-3 rounded-[10px] border border-[#cfd7e5] bg-white p-2 shadow-xl shadow-[#172033]/10 dark:border-zinc-800 dark:bg-zinc-950 sm:flex-row"
            >
              <div className="flex min-h-12 flex-1 items-center gap-3 px-3">
                <Globe2 className="h-5 w-5 shrink-0 text-[#0b7de3]" />
                <input
                  value={domain}
                  onChange={(event) => setDomain(event.target.value)}
                  placeholder="https://deine-website.de"
                  className="min-w-0 flex-1 bg-transparent text-[15px] font-bold text-[#172033] outline-none placeholder:text-[#8a94a6] dark:text-zinc-100"
                />
              </div>
              <button
                type="submit"
                className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#009b72] px-6 text-[13px] font-black text-white transition-colors hover:bg-[#087f61]"
              >
                Kostenlos scannen
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="mt-6 flex flex-wrap gap-3">
              {scanAreas.slice(0, 6).map((area) => (
                <span
                  key={area}
                  className="rounded-full border border-[#d8dde8] bg-white/70 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-[#526071] dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-400"
                >
                  {area}
                </span>
              ))}
            </div>
          </div>

          <ProductPreview />
        </div>
      </section>

      <section className="border-b border-[#dfe3ea] bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-[1380px] flex-col gap-6 px-6 py-8 md:px-10 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-[13px] font-black uppercase tracking-[0.16em] text-[#7b8495]">
            Gebaut für Betreiber, Freelancer und Agenturen, die Audits nicht nur sehen, sondern verkaufen müssen.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {['Lead Audit', 'AI Plan', 'White Label', 'Monitoring'].map((label) => (
              <div key={label} className="flex items-center gap-2 text-[12px] font-black text-[#172033] dark:text-zinc-200">
                <CheckCircle2 className="h-4 w-4 text-[#009b72]" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1380px] px-6 py-16 md:px-10">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-[34px] font-black tracking-tight text-[#141a28] dark:text-white md:text-[46px]">
              Eine Plattform für den kompletten Website-Check.
            </h2>
            <p className="mt-3 max-w-[720px] text-[16px] font-medium leading-relaxed text-[#5d6878] dark:text-zinc-400">
              Die Navigation ist nach Arbeitsbereichen aufgebaut: erst Überblick, dann tiefe Module, dann Reports und wiederkehrendes Monitoring.
            </p>
          </div>
          <button
            onClick={onOpenAnalyzer}
            className="flex w-fit items-center gap-2 rounded-md border border-[#cfd7e5] bg-white px-5 py-3 text-[12px] font-black text-[#172033] shadow-sm transition-colors hover:border-[#D4AF37] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
          >
            Scanner öffnen
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {platformAreas.map((area) => {
            const Icon = area.icon;
            return (
              <a
                key={area.title}
                href={area.href}
                className="group min-h-[154px] rounded-lg border border-[#dfe3ea] bg-white p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#D4AF37] hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className={`mb-5 flex h-10 w-10 items-center justify-center rounded-md ${area.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-[17px] font-black text-[#172033] dark:text-white">{area.title}</h3>
                <p className="mt-2 text-[14px] font-medium leading-relaxed text-[#5d6878] dark:text-zinc-400">
                  {area.text}
                </p>
                <span className="mt-5 flex items-center gap-1 text-[11px] font-black uppercase tracking-wide text-[#0b7de3] opacity-0 transition-opacity group-hover:opacity-100">
                  Bereich ansehen
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </a>
            );
          })}
        </div>
      </section>

      <section className="bg-[#172033] text-white dark:bg-black">
        <div className="mx-auto grid max-w-[1380px] grid-cols-1 gap-10 px-6 py-16 md:px-10 lg:grid-cols-[0.92fr_1.08fr]">
          <div>
            <h2 className="text-[34px] font-black tracking-tight md:text-[46px]">
              Von Scan zu Umsatz: Reports, die Kunden verstehen.
            </h2>
            <p className="mt-4 max-w-[620px] text-[16px] font-medium leading-relaxed text-[#c7d2e3]">
              Der Scanner ist der Einstieg. Das Geld entsteht über klare Prioritäten, wiederkehrende Audits, White-Label-Auswertungen und Agentur-Workflows.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4">
              {[
                ['50+', 'Scan-Signale'],
                ['8', 'Audit-Bereiche'],
                ['24/7', 'Monitoring ready'],
                ['AI', 'Maßnahmenplan'],
              ].map(([metric, label]) => (
                <div key={label} className="border-t border-white/15 pt-4">
                  <p className="text-[32px] font-black text-[#D4AF37]">{metric}</p>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#9aa8bd]">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              [Target, 'Prioritäten statt Datenfriedhof', 'Tasks werden nach Impact und Risiko sortiert.'],
              [Users, 'Agenturfähig', 'Reports, Kundenfreigaben und Team-Workspace sind eingebaut.'],
              [Activity, 'Monitoring', 'Wiederkehrende Scans zeigen, was sich verbessert oder verschlechtert.'],
              [LockKeyhole, 'Mehr als SEO', 'Security, DSGVO und Accessibility gehören direkt zum Audit.'],
            ].map(([Icon, title, text]) => {
              const TypedIcon = Icon as typeof Target;
              return (
                <div key={String(title)} className="rounded-lg border border-white/10 bg-white/[0.04] p-6">
                  <TypedIcon className="mb-5 h-6 w-6 text-[#D4AF37]" />
                  <h3 className="text-[16px] font-black">{String(title)}</h3>
                  <p className="mt-2 text-[13px] font-medium leading-relaxed text-[#b6c2d4]">
                    {String(text)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1380px] grid-cols-1 gap-10 px-6 py-16 md:px-10 lg:grid-cols-[1fr_0.9fr]">
        <div>
          <h2 className="text-[34px] font-black tracking-tight text-[#141a28] dark:text-white md:text-[46px]">
            Bereit für den ersten vermarktbaren Audit?
          </h2>
          <p className="mt-4 max-w-[680px] text-[16px] font-medium leading-relaxed text-[#5d6878] dark:text-zinc-400">
            Starte mit einem kostenlosen Kurzscan. Danach kannst du den vollständigen Report speichern, exportieren und als Projekt weiter überwachen.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={onOpenAnalyzer}
              className="flex items-center justify-center gap-2 rounded-md bg-[#009b72] px-6 py-4 text-[13px] font-black text-white transition-colors hover:bg-[#087f61]"
            >
              Scanner starten
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={onOpenPricing}
              className="flex items-center justify-center gap-2 rounded-md border border-[#cfd7e5] bg-white px-6 py-4 text-[13px] font-black text-[#172033] transition-colors hover:border-[#D4AF37] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            >
              Pakete ansehen
            </button>
            {!user && (
              <button
                onClick={onSignIn}
                className="flex items-center justify-center gap-2 rounded-md px-6 py-4 text-[13px] font-black text-[#0b7de3] transition-colors hover:bg-[#e8f2ff]"
              >
                Einloggen
              </button>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-[#dfe3ea] bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-5 text-[12px] font-black uppercase tracking-[0.16em] text-[#7b8495]">
            Empfohlener Funnel
          </p>
          <div className="space-y-4">
            {[
              [Globe2, 'Domain eingeben', 'Niedrige Einstiegshürde für kalten Traffic.'],
              [BarChart3, 'Top-Probleme zeigen', 'Sofort Wert liefern, aber nicht alles verschenken.'],
              [BrainCircuit, 'AI Action Plan freischalten', 'Lead oder Upgrade für den vollständigen Report.'],
              [LineChart, 'Monitoring verkaufen', 'Aus einmaligem Scan wird wiederkehrender Umsatz.'],
            ].map(([Icon, title, text]) => {
              const TypedIcon = Icon as typeof Globe2;
              return (
                <div key={String(title)} className="flex gap-4 border-b border-[#edf1f6] pb-4 last:border-b-0 last:pb-0 dark:border-zinc-800">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#f4f6fb] text-[#0b7de3] dark:bg-zinc-950">
                    <TypedIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[14px] font-black text-[#172033] dark:text-white">{String(title)}</p>
                    <p className="mt-1 text-[13px] font-medium leading-relaxed text-[#5d6878] dark:text-zinc-400">
                      {String(text)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
