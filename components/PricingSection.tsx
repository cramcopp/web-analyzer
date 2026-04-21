'use client';

import React, { useState } from 'react';
import { 
  Check, 
  X, 
  Zap, 
  Shield, 
  Globe, 
  Rocket, 
  Star, 
  Crown, 
  ArrowRight, 
  ShieldCheck, 
  CreditCard,
  ChevronDown,
  ChevronUp,
  Info,
  Users,
  FileText,
  Search,
  Activity,
  Award
} from 'lucide-react';
import { useAuth } from './auth-provider';

interface FeatureRowProps {
  label: string;
  free: string | boolean;
  pro: string | boolean;
  agency: string | boolean;
  isMain?: boolean;
}

function FeatureRow({ label, free, pro, agency, isMain }: FeatureRowProps) {
  const renderValue = (val: string | boolean) => {
    if (typeof val === 'boolean') {
      return val ? (
        <Check className="w-5 h-5 text-[#27AE60] mx-auto" />
      ) : (
        <X className="w-5 h-5 text-[#EB5757] mx-auto opacity-20" />
      );
    }
    return <span className="text-[13px] font-bold text-[#1A1A1A] dark:text-white">{val}</span>;
  };

  return (
    <div className={`grid grid-cols-4 border-b border-[#EEE] dark:border-zinc-800 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.01] ${isMain ? 'bg-[#F9F9F9] dark:bg-zinc-950/50' : ''}`}>
      <div className={`p-4 text-[12px] font-medium text-[#444] dark:text-zinc-400 flex items-center gap-2 ${isMain ? 'font-black uppercase tracking-widest text-[#888]' : ''}`}>
        {label}
      </div>
      <div className="p-4 text-center border-l border-[#EEE] dark:border-zinc-800">{renderValue(free)}</div>
      <div className="p-4 text-center border-l border-[#EEE] dark:border-zinc-800 bg-[#D4AF37]/5">{renderValue(pro)}</div>
      <div className="p-4 text-center border-l border-[#EEE] dark:border-zinc-800">{renderValue(agency)}</div>
    </div>
  );
}

export default function PricingSection() {
  const { user, userData } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [showComparison, setShowComparison] = useState(false);

  const handleCheckout = async (planName: string) => {
    if (!user) {
      alert("Bitte logge dich zuerst ein, um ein Abo abzuschließen.");
      return;
    }

    setLoadingPlan(planName);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planName,
          interval: billingInterval,
          uid: user.uid,
          userEmail: user.email,
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Checkout failed');
      }
    } catch (err) {
      console.error(err);
      alert("Checkout fehlgeschlagen. Bitte versuche es später erneut.");
      setLoadingPlan(null);
    }
  };

  const isTrialEligible = userData?.plan === 'free' || !userData;

  return (
    <section className="py-24 px-4 md:px-10 animate-in fade-in slide-in-from-bottom-5 duration-1000 bg-[#F5F5F3] dark:bg-zinc-950 min-h-screen">
      <div className="max-w-[1240px] mx-auto">
        <div className="text-center mb-24">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 text-[#D4AF37] text-[10px] font-black uppercase tracking-[4px] rounded-full mb-8">
            <Award className="w-3.5 h-3.5" />
            WAP Enterprise Solutions
          </div>
          <h2 className="text-[56px] md:text-[80px] font-black text-[#1A1A1A] dark:text-white tracking-tighter uppercase leading-[0.85] mb-8">
            Die passenden Tools <br /><span className="text-[#D4AF37]">für jedes Projekt.</span>
          </h2>
          <p className="text-[17px] text-[#888] max-w-[700px] mx-auto font-medium leading-[1.6] italic">
            &quot;Von der ersten Analyse bis zur skalierbaren Agency-Lösung. Unsere KI-gestützte Plattform wächst mit deinem Erfolg.&quot;
          </p>

          {/* Billing Switcher (Seobility Style) */}
          <div className="mt-16 flex flex-col items-center gap-6">
            <div className="bg-white dark:bg-zinc-900 p-1.5 rounded-full inline-flex items-center shadow-xl border border-[#EEE] dark:border-zinc-800">
              <button 
                onClick={() => setBillingInterval('monthly')}
                className={`px-8 py-3 rounded-full text-[12px] font-black uppercase tracking-widest transition-all ${billingInterval === 'monthly' ? 'bg-[#1A1A1A] dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-md' : 'text-[#888] hover:text-[#1A1A1A] dark:hover:text-white'}`}
              >
                Monatlich
              </button>
              <button 
                onClick={() => setBillingInterval('yearly')}
                className={`px-8 py-3 rounded-full text-[12px] font-black uppercase tracking-widest transition-all relative ${billingInterval === 'yearly' ? 'bg-[#1A1A1A] dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-md' : 'text-[#888] hover:text-[#1A1A1A] dark:hover:text-white'}`}
              >
                Jährlich
                <span className="absolute -top-7 right-0 bg-[#27AE60] text-white text-[9px] font-black px-2 py-1 rounded-sm shadow-sm animate-bounce">
                  Best Value: -20%
                </span>
              </button>
            </div>
            <p className="text-[11px] text-[#AAA] font-bold uppercase tracking-wider">Keine versteckten Gebühren. Jederzeit kündbar.</p>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border border-[#EEE] dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl relative">
          
          {/* FREE PLAN */}
          <div className="p-10 flex flex-col border-b lg:border-b-0 lg:border-r border-[#EEE] dark:border-zinc-800 hover:bg-[#F9F9F9] dark:hover:bg-zinc-950/20 transition-colors">
            <div className="mb-10">
              <div className="text-[12px] font-black uppercase tracking-[3px] text-[#888] mb-1">Einstieg</div>
              <h3 className="text-[28px] font-black uppercase tracking-tighter text-[#1A1A1A] dark:text-white mb-6">WAP Basic</h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-[48px] font-black text-[#1A1A1A] dark:text-white">0</span>
                <span className="text-[20px] font-black text-[#1A1A1A] dark:text-white">€</span>
              </div>
              <p className="text-[11px] text-[#AAA] font-bold uppercase tracking-widest">Dauerhaft kostenlos</p>
            </div>

            <ul className="flex-1 space-y-4 mb-10">
              <li className="flex items-center gap-3 text-[13px] font-medium text-[#444] dark:text-zinc-400">
                <Check className="w-4 h-4 text-[#27AE60]" /> Single-Page Analyse
              </li>
              <li className="flex items-center gap-3 text-[13px] font-medium text-[#444] dark:text-zinc-400">
                <Check className="w-4 h-4 text-[#27AE60]" /> WAP v1 Intelligence
              </li>
              <li className="flex items-center gap-3 text-[13px] font-medium text-[#444] dark:text-zinc-400 opacity-50 italic">
                <X className="w-4 h-4 text-[#EB5757]" /> Keine Site-Wide Crawls
              </li>
            </ul>

            <button className="w-full py-4 border-2 border-[#1A1A1A] dark:border-zinc-100 text-[#1A1A1A] dark:text-white text-[11px] font-black uppercase tracking-[3px] hover:bg-[#1A1A1A] hover:text-white dark:hover:bg-white dark:hover:text-black transition-all">
              Projekt anlegen
            </button>
          </div>

          {/* PREMIUM/PRO PLAN */}
          <div className="p-10 flex flex-col border-b lg:border-b-0 lg:border-r border-[#D4AF37] bg-white dark:bg-zinc-900 relative scale-y-[1.05] shadow-[0_30px_60px_rgba(212,175,55,0.15)] z-10 border-t-4 border-t-[#D4AF37]">
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#D4AF37] text-white text-[9px] font-black px-4 py-1 uppercase tracking-[2px] whitespace-nowrap">
              Beliebteste Wahl
            </div>
            
            <div className="mb-10 text-center">
              <div className="text-[12px] font-black uppercase tracking-[3px] text-[#D4AF37] mb-1">Strategisch</div>
              <h3 className="text-[28px] font-black uppercase tracking-tighter text-[#1A1A1A] dark:text-white mb-6">WAP Premium</h3>
              <div className="flex items-baseline justify-center gap-1 mb-2">
                <span className="text-[48px] font-black text-[#1A1A1A] dark:text-white leading-none">
                  {billingInterval === 'yearly' ? '39' : '49'}
                </span>
                <span className="text-[20px] font-black text-[#1A1A1A] dark:text-white">€</span>
              </div>
              <p className="text-[11px] text-[#AAA] font-bold uppercase tracking-widest">{billingInterval === 'yearly' ? 'Pro Monat, jährlich' : 'Monatliche Abrechnung'}</p>
            </div>

            <ul className="flex-1 space-y-4 mb-10">
              <li className="flex items-center gap-3 text-[14px] font-bold text-[#1A1A1A] dark:text-white">
                <Star className="w-4 h-4 text-[#D4AF37] fill-[#D4AF37]" /> 20 Unterseiten-Crawl
              </li>
              <li className="flex items-center gap-3 text-[13px] font-medium text-[#444] dark:text-zinc-400">
                <Check className="w-4 h-4 text-[#27AE60]" /> WAP v2 Intelligence
              </li>
              <li className="flex items-center gap-3 text-[13px] font-medium text-[#444] dark:text-zinc-400">
                <Check className="w-4 h-4 text-[#27AE60]" /> Rank Tracking (täglich)
              </li>
              <li className="flex items-center gap-3 text-[13px] font-medium text-[#444] dark:text-zinc-400">
                <Check className="w-4 h-4 text-[#27AE60]" /> Search Console Sync
              </li>
              <li className="flex items-center gap-3 text-[13px] font-medium text-[#444] dark:text-zinc-400">
                <Check className="w-4 h-4 text-[#27AE60]" /> CSV Export
              </li>
            </ul>

            <button 
              onClick={() => handleCheckout('pro')}
              className="w-full py-5 bg-[#D4AF37] text-white text-[12px] font-black uppercase tracking-[3px] hover:bg-[#1A1A1A] dark:hover:bg-zinc-100 dark:hover:text-black transition-all shadow-xl flex items-center justify-center gap-2"
            >
              {loadingPlan === 'pro' ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Starten <ArrowRight className="w-4 h-4" /></>}
            </button>
            <p className="text-[9px] text-center text-[#AAA] mt-4 font-bold uppercase tracking-widest">{isTrialEligible ? "Inklusive 7 Tage Testphase" : ""}</p>
          </div>

          {/* AGENCY/ENTERPRISE PLAN */}
          <div className="p-10 flex flex-col hover:bg-[#F9F9F9] dark:hover:bg-zinc-950/20 transition-colors">
            <div className="mb-10">
              <div className="text-[12px] font-black uppercase tracking-[3px] text-[#888] mb-1">Skalierbar</div>
              <h3 className="text-[28px] font-black uppercase tracking-tighter text-[#1A1A1A] dark:text-white mb-6">WAP Agency</h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-[48px] font-black text-[#1A1A1A] dark:text-white">
                  {billingInterval === 'yearly' ? '119' : '149'}
                </span>
                <span className="text-[20px] font-black text-[#1A1A1A] dark:text-white">€</span>
              </div>
              <p className="text-[11px] text-[#AAA] font-bold uppercase tracking-widest">{billingInterval === 'yearly' ? 'Pro Monat, jährlich' : 'Monatliche Abrechnung'}</p>
            </div>

            <ul className="flex-1 space-y-4 mb-10">
              <li className="flex items-center gap-3 text-[14px] font-bold text-[#1A1A1A] dark:text-white">
                <Crown className="w-4 h-4 text-[#D4AF37] shadow-sm" /> 100+ Unterseiten
              </li>
              <li className="flex items-center gap-3 text-[14px] font-bold text-[#1A1A1A] dark:text-white">
                <Users className="w-4 h-4 text-[#D4AF37]" /> Team Workspace
              </li>
              <li className="flex items-center gap-3 text-[13px] font-medium text-[#444] dark:text-zinc-400">
                <Check className="w-4 h-4 text-[#27AE60]" /> White-Label PDF Reports
              </li>
              <li className="flex items-center gap-3 text-[13px] font-medium text-[#444] dark:text-zinc-400">
                <Check className="w-4 h-4 text-[#27AE60]" /> Multi-Domain Monitoring
              </li>
              <li className="flex items-center gap-3 text-[13px] font-medium text-[#444] dark:text-zinc-400">
                <Check className="w-4 h-4 text-[#27AE60]" /> API Zugang (Alpha)
              </li>
            </ul>

            <button 
              onClick={() => handleCheckout('agency')}
              className="w-full py-4 bg-[#1A1A1A] dark:bg-white text-white dark:text-black text-[11px] font-black uppercase tracking-[3px] hover:bg-[#D4AF37] hover:text-white transition-all"
            >
              {loadingPlan === 'agency' ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enterprise beitreten"}
            </button>
          </div>
        </div>

        {/* COMPARISON TABLE (Seobility Style) */}
        <div className="mt-20">
          <button 
            onClick={() => setShowComparison(!showComparison)}
            className="w-full flex items-center justify-between p-6 bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 text-[14px] font-black uppercase tracking-[2px] transition-colors hover:bg-[#F5F5F3] dark:hover:bg-zinc-800"
          >
            Alle Funktionen vergleichen
            {showComparison ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {showComparison && (
            <div className="bg-white dark:bg-zinc-900 border-x border-b border-[#EEE] dark:border-zinc-800 animate-in fade-in slide-in-from-top-4 duration-500 overflow-x-auto">
              <div className="min-w-[800px]">
                <div className="grid grid-cols-4 bg-[#1A1A1A] text-white text-[10px] font-black uppercase tracking-[3px]">
                  <div className="p-6">Features</div>
                  <div className="p-6 text-center border-l border-white/10">WAP Basic</div>
                  <div className="p-6 text-center border-l border-white/10 bg-[#D4AF37]/20 text-[#D4AF37]">WAP Premium</div>
                  <div className="p-6 text-center border-l border-white/10">WAP Agency</div>
                </div>

                <FeatureRow label="Analyse & Crawling" isMain={true} free="" pro="" agency="" />
                <FeatureRow label="Unterseiten pro Crawl" free="1" pro="20" agency="100+" />
                <FeatureRow label="WAP Intelligence v." free="v1" pro="v2" agency="v3+" />
                <FeatureRow label="Crawl-Häufigkeit" free="Manuell" pro="Täglich" agency="On-Demand+" />
                <FeatureRow label="Automatisches Monitoring" free={false} pro={true} agency={true} />
                
                <FeatureRow label="SEO & Inhalte" isMain={true} free="" pro="" agency="" />
                <FeatureRow label="Keyword Gap Analyse" free={false} pro={true} agency={true} />
                <FeatureRow label="Sentiment Check (KI)" free={true} pro={true} agency={true} />
                <FeatureRow label="Wettbewerbs-Tracker" free="0" pro="3" agency="unlimitiert" />
                <FeatureRow label="TF-IDF Analyse" free={false} pro={true} agency={true} />

                <FeatureRow label="Business & Team" isMain={true} free="" pro="" agency="" />
                <FeatureRow label="Team Workspace" free={false} pro={false} agency={true} />
                <FeatureRow label="Mitglieder Einladungen" free={false} pro={false} agency={true} />
                <FeatureRow label="Export-Formate" free="Keine" pro="CSV, JSON" agency="CSV, JSON, PDF" />
                <FeatureRow label="White-Label Reports" free={false} pro={false} agency={true} />
                <FeatureRow label="Rest API Support" free={false} pro={false} agency="Alpha" />

                <FeatureRow label="Support & Service" isMain={true} free="" pro="" agency="" />
                <FeatureRow label="Ticket Support" free={true} pro={true} agency={true} />
                <FeatureRow label="Priorisierter Support" free={false} pro={true} agency={true} />
                <FeatureRow label="Persönlicher Success Manager" free={false} pro={false} agency={true} />
              </div>
            </div>
          )}
        </div>

        {/* TRUST BADGES */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 border-t border-[#EEE] dark:border-zinc-800 pt-16">
          <div className="flex flex-col gap-4">
             <div className="w-12 h-12 bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
                <ShieldCheck className="w-6 h-6" />
             </div>
             <h4 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-white">DSGVO Konform</h4>
             <p className="text-[12px] text-[#888] leading-relaxed font-medium">Alle Daten werden auf europäischen Servern verarbeitet und sind zu 100% DSGVO-konform verschlüsselt.</p>
          </div>
          <div className="flex flex-col gap-4">
             <div className="w-12 h-12 bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
                <CreditCard className="w-6 h-6" />
             </div>
             <h4 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-white">Secure Payment</h4>
             <p className="text-[12px] text-[#888] leading-relaxed font-medium">Sicherer Checkout über Stripe mit 256-Bit-Verschlüsselung. Alle gängigen Kreditkarten und SEPA werden unterstützt.</p>
          </div>
          <div className="flex flex-col gap-4">
             <div className="w-12 h-12 bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
                <Rocket className="w-6 h-6" />
             </div>
             <h4 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-white">Keine Wartezeit</h4>
             <p className="text-[12px] text-[#888] leading-relaxed font-medium">Nach dem Upgrade wird dein Account sofort freigeschaltet. Keine manuelle Aktivierung durch den Support nötig.</p>
          </div>
        </div>

        {/* FAQ Preview (Short) */}
        <div className="mt-24 text-center">
           <h3 className="text-[20px] font-black uppercase tracking-[3px] mb-12">Häufig gestellte Fragen</h3>
           <div className="max-w-[700px] mx-auto grid grid-cols-1 gap-6 text-left">
              <div className="p-6 bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800">
                 <h4 className="text-[13px] font-black uppercase mb-2">Kann ich mein Abo jederzeit kündigen?</h4>
                 <p className="text-[12px] text-[#888]">Ja! Du kannst dein Abonnement mit einem Klick in deinen Profileinstellungen zum Ende des Abrechnungszeitraums kündigen.</p>
              </div>
              <div className="p-6 bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800">
                 <h4 className="text-[13px] font-black uppercase mb-2">Wie funktioniert die Testphase?</h4>
                 <p className="text-[12px] text-[#888]">Du kannst den Premium-Plan für 7 Tage kostenlos testen. Wir bitten dich beim Start eine Zahlungsmethode zu hinterlegen, buchen aber erst nach Ablauf der 7 Tage ab.</p>
              </div>
           </div>
        </div>
      </div>
    </section>
  );
}

function Loader2({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}
