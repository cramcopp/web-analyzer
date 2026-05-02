'use client';

import React, { useState, useEffect } from 'react';
import {
  Check, 
  X, 
  Rocket, 
  Star, 
  Crown, 
  ArrowRight, 
  ShieldCheck, 
  CreditCard,
  ChevronDown,
  ChevronUp,
  Users,
  Award,
  Loader2
} from 'lucide-react';
import { useAuth } from './auth-provider';
import { PLAN_CONFIG, formatExports } from '@/lib/plans';

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
  const { free, pro, agency } = PLAN_CONFIG;


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
        }),
      });


      const data = await response.json();
      if (data.url) {
        const checkoutLink = document.createElement('a');
        checkoutLink.href = data.url;
        checkoutLink.rel = 'noopener noreferrer';
        document.body.appendChild(checkoutLink);
        checkoutLink.click();
        checkoutLink.remove();
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
    <section className="py-24 px-4 md:px-10 animate-in fade-in slide-in-from-bottom-5 duration-1000 bg-[#F5F5F3] dark:bg-zinc-950 min-h-screen relative">


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
              <h3 className="text-[28px] font-black uppercase tracking-tighter text-[#1A1A1A] dark:text-white mb-6">{free.name}</h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-[48px] font-black text-[#1A1A1A] dark:text-white">0</span>
                <span className="text-[20px] font-black text-[#1A1A1A] dark:text-white">€</span>
              </div>
              <p className="text-[11px] text-[#AAA] font-bold uppercase tracking-widest">Dauerhaft kostenlos</p>
            </div>

            <ul className="flex-1 space-y-4 mb-10">
              <li className="flex items-center gap-3 text-[13px] font-medium text-[#444] dark:text-zinc-400">
                <Check className="w-4 h-4 text-[#27AE60]" /> {free.crawlLimit} Unterseiten-Crawl
              </li>
              <li className="flex items-center gap-3 text-[13px] font-medium text-[#444] dark:text-zinc-400">
                <Check className="w-4 h-4 text-[#27AE60]" /> WAP v1 Intelligence
              </li>
              <li className="flex items-center gap-3 text-[13px] font-medium text-[#444] dark:text-zinc-400 opacity-50 italic">
                <X className="w-4 h-4 text-[#EB5757]" /> Kein Monitoring
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
              <h3 className="text-[28px] font-black uppercase tracking-tighter text-[#1A1A1A] dark:text-white mb-6">{pro.name}</h3>
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
                <Star className="w-4 h-4 text-[#D4AF37] fill-[#D4AF37]" /> {pro.crawlLimit} Unterseiten-Crawl
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
              <h3 className="text-[28px] font-black uppercase tracking-tighter text-[#1A1A1A] dark:text-white mb-6">{agency.name}</h3>
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
                <Crown className="w-4 h-4 text-[#D4AF37] shadow-sm" /> {agency.crawlLimit} Unterseiten
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
          <div 
            className="w-full flex items-center justify-between p-6 bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 text-[14px] font-black uppercase tracking-[2px] transition-colors"
          >
            Alle Funktionen im Detail
          </div>

            <div className="bg-white dark:bg-zinc-900 border-x border-b border-[#EEE] dark:border-zinc-800 animate-in fade-in slide-in-from-top-4 duration-500 overflow-x-auto">
              <div className="min-w-[800px]">
                <div className="grid grid-cols-4 bg-[#1A1A1A] dark:bg-zinc-800 text-white text-[10px] font-black uppercase tracking-[3px]">
                  <div className="p-6">Features</div>
                  <div className="p-6 text-center border-l border-white/10">WAP Basic</div>
                  <div className="p-6 text-center border-l border-white/10 bg-[#D4AF37]/20 text-[#D4AF37]">WAP Premium</div>
                  <div className="p-6 text-center border-l border-white/10">WAP Agency</div>
                </div>

                <FeatureRow label="Analyse & Crawling" isMain={true} free="" pro="" agency="" />
                <FeatureRow label="Unterseiten pro Crawl" free={String(free.crawlLimit)} pro={String(pro.crawlLimit)} agency={String(agency.crawlLimit)} />
                <FeatureRow label="WAP Intelligence v." free="v1" pro="v2" agency="v3+" />
                <FeatureRow label="Crawl-Häufigkeit" free="Manuell" pro="Täglich" agency="On-Demand+" />
                <FeatureRow label="Automatisches Monitoring" free={false} pro={true} agency={true} />
                
                <FeatureRow label="SEO & Inhalte" isMain={true} free="" pro="" agency="" />
                <FeatureRow label="Keyword Gap Analyse" free={false} pro={true} agency={true} />
                <FeatureRow label="Sentiment Check (KI)" free={true} pro={true} agency={true} />
                <FeatureRow label="Wettbewerbs-Tracker" free={String(free.competitors)} pro={String(pro.competitors)} agency={String(agency.competitors)} />
                <FeatureRow label="TF-IDF Analyse" free={false} pro={true} agency={true} />

                <FeatureRow label="Business & Team" isMain={true} free="" pro="" agency="" />
                <FeatureRow label="Team Workspace" free={false} pro={false} agency={true} />
                <FeatureRow label="Mitglieder Einladungen" free={false} pro={false} agency={true} />
                <FeatureRow label="Export-Formate" free={formatExports(free.exports)} pro={formatExports(pro.exports)} agency={formatExports(agency.exports)} />
                <FeatureRow label="White-Label Reports" free={free.whiteLabel} pro={pro.whiteLabel} agency={agency.whiteLabel} />
                <FeatureRow label="Rest API Support" free={free.api} pro={pro.api} agency={agency.api ? 'Alpha' : false} />

                <FeatureRow label="Support & Service" isMain={true} free="" pro="" agency="" />
                <FeatureRow label="Ticket Support" free={true} pro={true} agency={true} />
                <FeatureRow label="Priorisierter Support" free={false} pro={true} agency={true} />
                <FeatureRow label="Persönlicher Success Manager" free={false} pro={false} agency={true} />
            </div>
        </div>
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

        {/* FAQ Section */}
        <div className="mt-40 max-w-[850px] mx-auto">
           <div className="text-center mb-16">
             <h3 className="text-[28px] md:text-[34px] font-black uppercase tracking-[4px] mb-4 text-[#1A1A1A] dark:text-white">Häufig gestellte Fragen</h3>
             <p className="text-[14px] text-[#888] font-medium uppercase tracking-widest">Alles, was du über Website Analyzer Pro wissen musst</p>
           </div>
           
           <div className="flex flex-col gap-4">
              <AccordionItem 
                question="Kann ich mein Abo jederzeit kündigen?" 
                answer="Ja, absolut! Du kannst dein Abonnement jederzeit mit nur einem Klick in deinen Profileinstellungen zum Ende des aktuellen Abrechnungszeitraums kündigen. Es gibt keine Mindestlaufzeiten über den gebuchten Zeitraum hinaus."
              />
              <AccordionItem 
                question="Wie funktioniert die 7-tägige Testphase?" 
                answer="Du kannst den Premium-Plan für 7 Tage völlig kostenlos und ohne Einschränkungen testen. Wir bitten dich beim Start eine Zahlungsmethode zu hinterlegen, buchen aber erst nach Ablauf der 7 Tage ab. Kündigst du vor Ablauf der 7 Tage, zahlst du keinen Cent."
              />
              <AccordionItem 
                question="Welche Zahlungsmethoden werden akzeptiert?" 
                answer="Wir bieten maximale Flexibilität beim Bezahlen. Über unseren Partner Stripe akzeptieren wir alle gängigen Kreditkarten (Visa, Mastercard, American Express), SEPA-Lastschrift, Google Pay und Apple Pay."
              />
              <AccordionItem 
                question="Sind meine Daten und die meiner Kunden sicher?" 
                answer="Datenschutz hat bei uns höchste Priorität. Alle Analysen und Nutzerdaten werden auf verschlüsselten Servern in Frankfurt am Main (Deutschland) gespeichert. Wir sind zu 100% DSGVO-konform und geben keine Daten an Dritte weiter."
              />
              <AccordionItem 
                question="Kann ich zwischen den Plänen wechseln?" 
                answer="Ja, du kannst jederzeit zwischen den Plänen (Basic, Premium, Agency) wechseln. Bei einem Upgrade wird der Differenzbetrag für den laufenden Zeitraum anteilig berechnet, sodass du sofort von den neuen Funktionen profitierst."
              />
              <AccordionItem 
                question="Gibt es einen Rabatt für jährliche Zahlung?" 
                answer="Ja! Wenn du dich für die jährliche Abrechnung entscheidest, sparst du ca. 20% im Vergleich zur monatlichen Zahlung. Dies ist die beste Option für langfristig orientierte SEO-Strategen und Agenturen."
              />
           </div>
        </div>
      </div>
      {/* Sticky Subscription Bar (Scroll Appearance) */}
      <StickyAboBar 
        billingInterval={billingInterval} 
        onCheckout={handleCheckout} 
        loadingPlan={loadingPlan}
      />
    </section>
  );
}


function StickyAboBar({ billingInterval, onCheckout, loadingPlan }: { billingInterval: string, onCheckout: (plan: string) => void, loadingPlan: string | null }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 800) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[70] transition-all duration-500 max-w-[95%] md:max-w-none ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
      <div className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 shadow-2xl rounded-sm p-4 flex flex-col md:flex-row items-center gap-6">
        <div className="hidden lg:flex flex-col">
          <span className="text-[10px] font-black uppercase text-[#D4AF37] tracking-[2px]">Einfach abschließen</span>
          <span className="text-[12px] font-black uppercase text-[#1A1A1A] dark:text-white">Wähle dein WAP Abo</span>
        </div>
        
        <div className="flex items-center gap-3 md:gap-4 overflow-x-auto md:overflow-visible w-full md:w-auto">
          {/* Pro Sticky */}
          <button 
            onClick={() => onCheckout('pro')}
            className="flex items-center gap-3 px-6 py-3 bg-[#D4AF37] text-white rounded-sm hover:-translate-y-0.5 transition-all shadow-lg whitespace-nowrap min-w-fit"
          >
            <div className="flex flex-col items-start leading-none text-left">
              <span className="text-[9px] font-black uppercase opacity-80">Premium</span>
              <span className="text-[13px] font-black">{billingInterval === 'yearly' ? '39' : '49'}€ / Mo</span>
            </div>
            {loadingPlan === 'pro' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-4 h-4 ml-2" />}
          </button>

          {/* Agency Sticky */}
          <button 
            onClick={() => onCheckout('agency')}
            className="flex items-center gap-3 px-6 py-3 bg-[#1A1A1A] dark:bg-white text-white dark:text-black rounded-sm hover:-translate-y-0.5 transition-all shadow-lg whitespace-nowrap min-w-fit"
          >
             <div className="flex flex-col items-start leading-none text-left">
              <span className="text-[9px] font-black uppercase opacity-70">Agency</span>
              <span className="text-[13px] font-black">{billingInterval === 'yearly' ? '119' : '149'}€ / Mo</span>
            </div>
            {loadingPlan === 'agency' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crown className="w-4 h-4 ml-2 text-[#D4AF37]" />}
          </button>
        </div>

        <div className="hidden md:flex flex-col items-end pr-4 border-l border-[#EEE] dark:border-zinc-800 pl-4">
           <span className="text-[9px] font-black text-[#27AE60] uppercase tracking-widest whitespace-nowrap flex items-center gap-1.5">
             <ShieldCheck className="w-3 h-3" /> 7 Tage Trial
           </span>
           <span className="text-[10px] text-[#888] font-bold uppercase tracking-tighter italic">Jederzeit kündbar</span>
        </div>
      </div>
    </div>
  );
}

function AccordionItem({ question, answer }: { question: string, answer: string }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="border border-[#EEE] dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden transition-all duration-300">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 text-left flex items-center justify-between hover:bg-[#F9F9F9] dark:hover:bg-zinc-950/50 transition-colors"
      >
        <span className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-white">{question}</span>
        {isOpen ? <ChevronUp className="w-5 h-5 text-[#D4AF37]" /> : <ChevronDown className="w-5 h-5 text-[#888]" />}
      </button>
      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? 'max-h-[500px] border-t border-[#EEE] dark:border-zinc-800' : 'max-h-0'}`}>
        <div className="p-6 text-[13px] text-[#555] dark:text-zinc-400 font-medium leading-relaxed bg-[#F9F9F9] dark:bg-zinc-950/20">
          {answer}
        </div>
      </div>
    </div>
  );
}

