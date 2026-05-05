'use client';

import { useState } from 'react';
import {
  ArrowRight,
  Brain,
  Building2,
  Check,
  Crown,
  FileSearch,
  Gauge,
  Globe2,
  Link2,
  Loader2,
  Plus,
  Rocket,
  ShieldCheck,
  Sparkles,
  Tags,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from './auth-provider';
import {
  ADDON_CONFIG,
  ADDON_ORDER,
  PLAN_CONFIG,
  formatApiAccess,
  formatExports,
  formatMonitoring,
  normalizeAddonQuantities,
  type AddonKey,
  type PlanType,
} from '@/lib/plans';

const PLAN_KEYS: PlanType[] = ['free', 'pro', 'agency', 'business'];

const PLAN_META: Record<PlanType, { eyebrow: string; icon: typeof FileSearch; cta: string; tone: string }> = {
  free: {
    eyebrow: 'Einstieg',
    icon: FileSearch,
    cta: 'Aktueller Startplan',
    tone: 'border-[#E5E5E5] dark:border-zinc-800',
  },
  pro: {
    eyebrow: 'Wachstum',
    icon: Rocket,
    cta: 'Pro starten',
    tone: 'border-[#D4AF37] shadow-[0_24px_70px_rgba(212,175,55,0.16)]',
  },
  agency: {
    eyebrow: 'Agentur',
    icon: Users,
    cta: 'Agency buchen',
    tone: 'border-[#172033] dark:border-zinc-100',
  },
  business: {
    eyebrow: 'High End',
    icon: Building2,
    cta: 'Business buchen',
    tone: 'border-[#0B7DE3] shadow-[0_24px_70px_rgba(11,125,227,0.12)]',
  },
};

const ADDON_META: Record<AddonKey, { icon: typeof Tags }> = {
  keywords_100: { icon: Tags },
  project_100_keywords: { icon: Plus },
  team_seat: { icon: Users },
  white_label_domain: { icon: Globe2 },
  backlinks: { icon: Link2 },
  ai_visibility: { icon: Brain },
};

const COMPARISON_ROWS = [
  ['Scans pro Monat', 'scanLimitMonthly'],
  ['Seiten pro Crawl', 'crawlLimit'],
  ['Crawl-Seiten pro Monat', 'monthlyCrawlPages'],
  ['Sichtbare Detailseiten', 'visibleDetailPages'],
  ['Issue-URLs sichtbar', 'issueUrlsVisible'],
  ['Screenshots/Evidence', 'evidencePerReport'],
  ['Projekte', 'projects'],
  ['Rank-Keywords', 'rankKeywords'],
  ['Wettbewerber', 'competitors'],
  ['Nutzer/Seats', 'seats'],
] as const;

function numberValue(value: number) {
  return new Intl.NumberFormat('de-DE').format(value);
}

function priceLabel(plan: PlanType, interval: 'monthly' | 'yearly') {
  const config = PLAN_CONFIG[plan];
  const price = interval === 'yearly' ? config.yearlyMonthlyPrice : config.monthlyPrice;
  return price === 0 ? '0' : String(price);
}

function BooleanValue({ value }: { value: boolean }) {
  return value ? (
    <Check className="mx-auto h-4 w-4 text-[#27AE60]" />
  ) : (
    <X className="mx-auto h-4 w-4 text-[#EB5757] opacity-30" />
  );
}

function CellValue({ value }: { value: string | number | boolean }) {
  if (typeof value === 'boolean') return <BooleanValue value={value} />;
  return <span className="text-[12px] font-black text-[#1A1A1A] dark:text-zinc-100">{typeof value === 'number' ? numberValue(value) : value}</span>;
}

export default function PricingSection() {
  const { user, userData } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<PlanType | null>(null);
  const [loadingAddon, setLoadingAddon] = useState<AddonKey | null>(null);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const addOnQuantities = normalizeAddonQuantities(userData?.addOns);

  const handleCheckout = async (planName: PlanType) => {
    if (planName === 'free') return;
    if (!user) {
      alert('Bitte logge dich zuerst ein, um ein Abo abzuschließen.');
      return;
    }

    setLoadingPlan(planName);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planName, interval: billingInterval }),
      });

      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || 'Checkout failed');
      window.location.assign(data.url);
    } catch (err) {
      console.error(err);
      alert('Checkout fehlgeschlagen. Bitte versuche es später erneut.');
      setLoadingPlan(null);
    }
  };

  const handleAddonCheckout = async (addonKey: AddonKey) => {
    if (!user) {
      alert('Bitte logge dich zuerst ein, um ein Add-on zu buchen.');
      return;
    }

    if (!userData?.plan || userData.plan === 'free') {
      alert('Add-ons benötigen zuerst einen aktiven bezahlten Plan.');
      return;
    }

    setLoadingAddon(addonKey);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkoutType: 'addon', addonKey, quantity: 1 }),
      });

      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || 'Checkout failed');
      window.location.assign(data.url);
    } catch (err) {
      console.error(err);
      alert('Add-on Checkout fehlgeschlagen. Bitte versuche es später erneut.');
      setLoadingAddon(null);
    }
  };

  return (
    <section className="bg-[#F5F5F3] px-4 py-12 text-[#1A1A1A] dark:bg-zinc-950 dark:text-zinc-100 md:px-10 md:py-14">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-10 flex flex-col gap-6 border-b border-[#E5E5E5] pb-8 dark:border-zinc-800 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[3px] text-[#D4AF37]">
              <Sparkles className="h-3.5 w-3.5" />
              Abo-Plan 2026
            </div>
            <h2 className="max-w-[760px] text-[38px] font-black uppercase leading-[0.95] tracking-tight md:text-[56px]">
              Crawlen gross, sichtbar passend zum Plan.
            </h2>
            <p className="mt-5 max-w-[720px] text-[13px] font-bold uppercase leading-relaxed tracking-[0.12em] text-[#7b8495]">
              Scanner bewertet alle gecrawlten Seiten. Detailseiten, Issue-URLs, Evidence und Exporte werden separat je Plan freigeschaltet.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 lg:w-auto lg:items-end">
            <div className="inline-flex w-full rounded-md border border-[#E5E5E5] bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900 lg:w-auto">
              {(['monthly', 'yearly'] as const).map((interval) => (
                <button
                  key={interval}
                  onClick={() => setBillingInterval(interval)}
                  className={`flex-1 px-5 py-3 text-[11px] font-black uppercase tracking-widest transition-colors lg:flex-none ${
                    billingInterval === interval
                      ? 'bg-[#1A1A1A] text-white dark:bg-zinc-100 dark:text-zinc-950'
                      : 'text-[#888] hover:text-[#1A1A1A] dark:hover:text-zinc-100'
                  }`}
                >
                  {interval === 'monthly' ? 'Monatlich' : 'Jährlich'}
                </button>
              ))}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#27AE60]">
              Jährlich reduziert den monatlichen Preis.
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          {PLAN_KEYS.map((plan) => {
            const config = PLAN_CONFIG[plan];
            const meta = PLAN_META[plan];
            const Icon = meta.icon;
            const isPaid = plan !== 'free';
            const isCurrent = userData?.plan === plan || (!userData?.plan && plan === 'free');

            return (
              <article key={plan} className={`flex min-h-[460px] flex-col border bg-white p-5 shadow-sm dark:bg-zinc-900 ${meta.tone}`}>
                <div className="mb-7 flex items-start justify-between gap-4">
                  <div>
                    <span className="mb-2 block text-[10px] font-black uppercase tracking-[3px] text-[#888]">{meta.eyebrow}</span>
                    <h3 className="text-[26px] font-black uppercase tracking-tight">{config.name}</h3>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center bg-[#F5F5F3] text-[#D4AF37] dark:bg-zinc-950">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>

                <div className="mb-7">
                  <div className="flex items-baseline gap-1">
                    <span className="text-[48px] font-black leading-none">{priceLabel(plan, billingInterval)}</span>
                    <span className="text-[18px] font-black">EUR</span>
                  </div>
                  <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-[#888]">
                    {plan === 'free' ? 'dauerhaft kostenlos' : billingInterval === 'yearly' ? 'pro Monat, jährlich' : 'monatlich kündbar'}
                  </p>
                </div>

                <div className="mb-7 grid grid-cols-2 gap-2 text-[11px]">
                  <div className="border border-[#EEE] p-3 dark:border-zinc-800">
                    <span className="block text-[8px] font-black uppercase tracking-widest text-[#888]">Crawl</span>
                    <strong className="mt-1 block text-[14px]">{numberValue(config.crawlLimit)}</strong>
                  </div>
                  <div className="border border-[#EEE] p-3 dark:border-zinc-800">
                    <span className="block text-[8px] font-black uppercase tracking-widest text-[#888]">Sichtbar</span>
                    <strong className="mt-1 block text-[14px]">{numberValue(config.visibleDetailPages)}</strong>
                  </div>
                </div>

                <ul className="mb-8 flex-1 space-y-3 text-[12px] font-bold text-[#555] dark:text-zinc-400">
                  <li className="flex items-center gap-2"><Gauge className="h-4 w-4 text-[#D4AF37]" /> {numberValue(config.scanLimitMonthly)} Scans pro Monat</li>
                  <li className="flex items-center gap-2"><FileSearch className="h-4 w-4 text-[#D4AF37]" /> {numberValue(config.monthlyCrawlPages)} Crawl-Seiten/Monat</li>
                  <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#D4AF37]" /> {numberValue(config.issueUrlsVisible)} Issue-URLs sichtbar</li>
                  <li className="flex items-center gap-2"><Users className="h-4 w-4 text-[#D4AF37]" /> {numberValue(config.seats)} Seat{config.seats === 1 ? '' : 's'}</li>
                  {config.whiteLabel && <li className="flex items-center gap-2"><Crown className="h-4 w-4 text-[#D4AF37]" /> White Label aktiv</li>}
                </ul>

                <button
                  onClick={() => handleCheckout(plan)}
                  disabled={!isPaid || isCurrent || loadingPlan === plan}
                  className={`flex w-full items-center justify-center gap-2 px-5 py-4 text-[11px] font-black uppercase tracking-[2px] transition-all ${
                    isPaid && !isCurrent
                      ? 'bg-[#1A1A1A] text-white hover:bg-[#D4AF37] dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-[#D4AF37]'
                      : 'border border-[#E5E5E5] text-[#888] dark:border-zinc-800'
                  }`}
                >
                  {loadingPlan === plan ? <Loader2 className="h-4 w-4 animate-spin" /> : isCurrent ? 'Aktueller Plan' : meta.cta}
                  {isPaid && !isCurrent && loadingPlan !== plan && <ArrowRight className="h-4 w-4" />}
                </button>
              </article>
            );
          })}
        </div>

        <section className="mt-10 border border-[#E5E5E5] bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-[#E5E5E5] p-6 dark:border-zinc-800">
            <h3 className="text-[18px] font-black uppercase tracking-widest">Limit-Vergleich</h3>
            <p className="mt-2 text-[11px] font-bold uppercase tracking-widest text-[#888]">
              Gecrawlte Seiten sind die Analysebasis. Sichtbare Detailseiten, Issue-URLs und Evidence sind eigene Ausgabe-Limits.
            </p>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[980px]">
              <div className="grid grid-cols-5 bg-[#1A1A1A] text-[10px] font-black uppercase tracking-[2px] text-white dark:bg-zinc-800">
                <div className="p-4">Limit</div>
                {PLAN_KEYS.map((plan) => <div key={plan} className="border-l border-white/10 p-4 text-center">{PLAN_CONFIG[plan].name}</div>)}
              </div>
              {COMPARISON_ROWS.map(([label, key]) => (
                <div key={key} className="grid grid-cols-5 border-b border-[#EEE] text-center dark:border-zinc-800">
                  <div className="p-4 text-left text-[12px] font-black uppercase tracking-widest text-[#555] dark:text-zinc-400">{label}</div>
                  {PLAN_KEYS.map((plan) => (
                    <div key={plan} className="border-l border-[#EEE] p-4 dark:border-zinc-800">
                      <CellValue value={PLAN_CONFIG[plan][key]} />
                    </div>
                  ))}
                </div>
              ))}
              <div className="grid grid-cols-5 border-b border-[#EEE] text-center dark:border-zinc-800">
                <div className="p-4 text-left text-[12px] font-black uppercase tracking-widest text-[#555] dark:text-zinc-400">API</div>
                {PLAN_KEYS.map((plan) => <div key={plan} className="border-l border-[#EEE] p-4 dark:border-zinc-800"><CellValue value={formatApiAccess(PLAN_CONFIG[plan].api)} /></div>)}
              </div>
              <div className="grid grid-cols-5 border-b border-[#EEE] text-center dark:border-zinc-800">
                <div className="p-4 text-left text-[12px] font-black uppercase tracking-widest text-[#555] dark:text-zinc-400">White Label</div>
                {PLAN_KEYS.map((plan) => <div key={plan} className="border-l border-[#EEE] p-4 dark:border-zinc-800"><BooleanValue value={PLAN_CONFIG[plan].whiteLabel} /></div>)}
              </div>
              <div className="grid grid-cols-5 border-b border-[#EEE] text-center dark:border-zinc-800">
                <div className="p-4 text-left text-[12px] font-black uppercase tracking-widest text-[#555] dark:text-zinc-400">Monitoring</div>
                {PLAN_KEYS.map((plan) => <div key={plan} className="border-l border-[#EEE] p-4 dark:border-zinc-800"><CellValue value={formatMonitoring(PLAN_CONFIG[plan].monitoring)} /></div>)}
              </div>
              <div className="grid grid-cols-5 text-center">
                <div className="p-4 text-left text-[12px] font-black uppercase tracking-widest text-[#555] dark:text-zinc-400">Exporte</div>
                {PLAN_KEYS.map((plan) => <div key={plan} className="border-l border-[#EEE] p-4 dark:border-zinc-800"><CellValue value={formatExports(PLAN_CONFIG[plan].exports)} /></div>)}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-[24px] font-black uppercase tracking-widest">Add-ons</h3>
              <p className="mt-2 max-w-[760px] text-[11px] font-bold uppercase tracking-widest text-[#888]">
                Monatliche Erweiterungen für Keywords, Projekte, Seats, White-Label-Domain, Backlinks und AI Visibility.
              </p>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#555] dark:text-zinc-400">
              Aktive Add-ons: {ADDON_ORDER.reduce((sum, key) => sum + (addOnQuantities[key] || 0), 0)}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {ADDON_ORDER.map((addonKey) => {
              const addon = ADDON_CONFIG[addonKey];
              const Icon = ADDON_META[addonKey].icon;
              const quantity = addOnQuantities[addonKey] || 0;
              const requiresPaidPlan = !userData?.plan || userData.plan === 'free';

              return (
                <article key={addonKey} className="flex min-h-[250px] flex-col border border-[#E5E5E5] bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <span className="mb-2 block text-[10px] font-black uppercase tracking-[3px] text-[#D4AF37]">Add-on</span>
                      <h4 className="text-[18px] font-black uppercase tracking-tight">{addon.name}</h4>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center bg-[#F5F5F3] text-[#D4AF37] dark:bg-zinc-950">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>

                  <p className="mb-5 flex-1 text-[12px] font-bold leading-relaxed text-[#555] dark:text-zinc-400">
                    {addon.description}
                  </p>

                  <div className="mb-5 flex items-end justify-between gap-4 border-t border-[#EEE] pt-4 dark:border-zinc-800">
                    <div>
                      <span className="block text-[10px] font-black uppercase tracking-widest text-[#888]">Preis</span>
                      <strong className="text-[28px] font-black">{addon.monthlyPrice} EUR</strong>
                      <span className="ml-1 text-[10px] font-black uppercase tracking-widest text-[#888]">/ Monat</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] font-black uppercase tracking-widest text-[#888]">Aktiv</span>
                      <strong className="text-[16px] font-black">{quantity}x</strong>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAddonCheckout(addonKey)}
                    disabled={requiresPaidPlan || loadingAddon === addonKey}
                    className={`flex w-full items-center justify-center gap-2 px-5 py-3 text-[10px] font-black uppercase tracking-[2px] transition-all ${
                      requiresPaidPlan
                        ? 'border border-[#E5E5E5] text-[#888] dark:border-zinc-800'
                        : 'bg-[#1A1A1A] text-white hover:bg-[#D4AF37] dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-[#D4AF37]'
                    }`}
                  >
                    {loadingAddon === addonKey ? <Loader2 className="h-4 w-4 animate-spin" /> : requiresPaidPlan ? 'Plan benötigt' : 'Add-on buchen'}
                    {!requiresPaidPlan && loadingAddon !== addonKey && <ArrowRight className="h-4 w-4" />}
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="border-l-4 border-[#D4AF37] bg-white p-5 dark:bg-zinc-900">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#888]">Gecrawlt</span>
            <p className="mt-2 text-[13px] font-bold leading-relaxed text-[#555] dark:text-zinc-400">Der Scanner bewertet bis zum Seiten-pro-Crawl-Limit und zählt diese Seiten ins monatliche Crawl-Budget.</p>
          </div>
          <div className="border-l-4 border-[#0B7DE3] bg-white p-5 dark:bg-zinc-900">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#888]">Sichtbar</span>
            <p className="mt-2 text-[13px] font-bold leading-relaxed text-[#555] dark:text-zinc-400">Reports zeigen je Plan nur die freigeschalteten Detailseiten, Issue-URLs und Evidence-Artefakte.</p>
          </div>
          <div className="border-l-4 border-[#27AE60] bg-white p-5 dark:bg-zinc-900">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#888]">Business</span>
            <p className="mt-2 text-[13px] font-bold leading-relaxed text-[#555] dark:text-zinc-400">Business ist ein eigener High-End-Plan mit Business-Checkout, Full API, 50 Seats und 5 Mio. Crawl-Seiten.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
