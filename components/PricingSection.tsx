'use client';

import React from 'react';
import { Check, Zap, Shield, Globe, Rocket, Star, Crown, ArrowRight, ShieldCheck, CreditCard } from 'lucide-react';
import { useAuth } from './auth-provider';

interface PricingCardProps {
  title: string;
  price: string;
  description: string;
  features: string[];
  isPopular?: boolean;
  buttonText: string;
  icon: React.ReactNode;
  accentColor: string;
  trialBadge?: string;
  onAction?: () => void;
}

function PricingCard({ title, price, description, features, isPopular, buttonText, icon, accentColor, trialBadge, onAction }: PricingCardProps) {
  return (
    <div className={`relative flex flex-col p-8 bg-white dark:bg-zinc-900 border transition-all duration-500 overflow-hidden group ${
      isPopular 
        ? 'border-[#D4AF37] shadow-[0_20px_50px_rgba(212,175,55,0.15)] scale-105 z-10' 
        : 'border-[#EEE] dark:border-zinc-800'
    }`}>
      {isPopular && (
        <div className="absolute -top-1 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent"></div>
      )}
      
      {trialBadge && (
        <div className="absolute top-4 right-[-35px] rotate-45 bg-[#D4AF37] text-white text-[8px] font-black px-10 py-1 uppercase tracking-widest shadow-sm">
          {trialBadge}
        </div>
      )}

      {isPopular && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-[#D4AF37] text-white text-[9px] font-black px-4 py-1 uppercase tracking-[2px] flex items-center gap-1.5 rounded-full shadow-lg">
          <Star className="w-3 h-3 fill-white" />
          Empfehlung
        </div>
      )}

      <div className="mb-8 mt-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-[#F5F5F3] dark:bg-zinc-800 text-[#1A1A1A] dark:text-white group-hover:bg-[#1A1A1A] group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black transition-colors duration-500">
            {icon}
          </div>
          <div>
            <h3 className="text-[16px] font-black uppercase tracking-tighter text-[#1A1A1A] dark:text-white">{title}</h3>
            <p className="text-[10px] text-[#888] font-bold uppercase tracking-wider">{description}</p>
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-[48px] font-black tracking-tighter text-[#1A1A1A] dark:text-white">{price}</span>
          <span className="text-[14px] font-bold text-[#888] uppercase tracking-widest">/ mtl.</span>
        </div>
      </div>

      <div className="w-full h-[1px] bg-[#EEE] dark:bg-zinc-800 mb-8"></div>

      <ul className="flex-1 space-y-4 mb-10">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-3">
            <div className="mt-1 bg-[#27AE60]/10 p-0.5 rounded-full">
              <Check className="w-3 h-3 text-[#27AE60]" />
            </div>
            <span className="text-[12px] font-medium text-[#666] dark:text-zinc-400 leading-tight">{feature}</span>
          </li>
        ))}
      </ul>

      <button 
        onClick={onAction}
        className={`w-full py-4 text-[11px] font-black uppercase tracking-[3px] transition-all flex items-center justify-center gap-3 relative overflow-hidden group/btn ${
          isPopular 
            ? 'bg-[#1A1A1A] dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-[#D4AF37] dark:hover:bg-[#D4AF37] hover:text-white' 
            : 'bg-transparent border-2 border-[#1A1A1A] dark:border-white text-[#1A1A1A] dark:text-white hover:bg-[#1A1A1A] hover:text-white dark:hover:bg-white dark:hover:text-black'
        }`}
      >
        <span className="relative z-10 flex items-center gap-3">
          {buttonText}
          <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
        </span>
      </button>
    </div>
  );
}

export default function PricingSection({ onActionComplete }: { onActionComplete?: () => void }) {
  const { user, userData, loading: authLoading } = useAuth();
  const [loadingPlan, setLoadingPlan] = React.useState<string | null>(null);
  const [billingInterval, setBillingInterval] = React.useState<'monthly' | 'yearly'>('monthly');

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
    <section className="py-20 px-4 md:px-10 animate-in fade-in slide-in-from-bottom-5 duration-1000">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#D4AF37]/10 text-[#D4AF37] text-[10px] font-black uppercase tracking-[3px] rounded-full mb-6">
            <Crown className="w-3 h-3" />
            Pricing & Strategy
          </div>
          <h2 className="text-[48px] md:text-[64px] font-black text-[#1A1A1A] dark:text-white tracking-tighter uppercase leading-[0.9] mb-8">
            Wähle deine <br /><span className="text-[#D4AF37]">Intelligence-Stufe</span>
          </h2>
          <p className="text-[15px] text-[#888] max-w-[650px] mx-auto font-medium leading-relaxed italic">
            &quot;Die besten SEO-Entscheidungen werden auf Basis von Daten getroffen, nicht auf Vermutungen. Wähle den Plan, der dein Wachstum beschleunigt.&quot;
          </p>

          {/* Billing Toggle */}
          <div className="mt-12 flex items-center justify-center gap-6">
            <span className={`text-[12px] font-black uppercase tracking-widest ${billingInterval === 'monthly' ? 'text-[#1A1A1A] dark:text-white' : 'text-[#888]'}`}>Monatlich</span>
            <button 
              onClick={() => setBillingInterval(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
              className="w-16 h-8 bg-[#F5F5F3] dark:bg-zinc-800 rounded-full p-1 relative transition-colors duration-500 border border-[#EEE] dark:border-zinc-700"
            >
              <div className={`w-6 h-6 bg-[#D4AF37] shadow-lg transition-transform duration-300 ${billingInterval === 'yearly' ? 'translate-x-8' : 'translate-x-0'}`}></div>
            </button>
            <div className="flex items-center gap-3">
              <span className={`text-[12px] font-black uppercase tracking-widest ${billingInterval === 'yearly' ? 'text-[#1A1A1A] dark:text-white' : 'text-[#888]'}`}>Jährlich</span>
              <span className="bg-[#27AE60] text-white text-[9px] font-black px-2 py-1 uppercase tracking-widest">Spare 20%</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          <PricingCard
            title="WAP Standard v1"
            price="0 €"
            description="Explorer Tier"
            icon={<Globe className="w-6 h-6" />}
            accentColor="#888888"
            buttonText="Kostenlos starten"
            features={[
              "Single Page Analysis",
              "WAP Standard v1 Intelligence",
              "Grundlegendes SEO-Audit",
              "Sentiment Check (KI)",
              "Limitierte Branchen-News"
            ]}
          />

          <PricingCard
            title="WAP Advanced v2"
            price={billingInterval === 'yearly' ? '39.20€' : '49 €'}
            description={billingInterval === 'yearly' ? 'Jährliche Abrechnung' : 'The Strategic Choice'}
            isPopular={true}
            trialBadge={isTrialEligible ? "7 TAGE GRATIS" : undefined}
            icon={<Zap className="w-6 h-6" />}
            accentColor="#D4AF37"
            buttonText={loadingPlan === 'pro' ? 'Wird geladen...' : (isTrialEligible ? "Testphase starten" : "Jetzt Upgraden")}
            onAction={() => handleCheckout('pro')}
            features={[
              "Full Site-Wide Audit (20 Pages)",
              "WAP Advanced v2 Intelligence",
              "Keyword Gap Analysis",
              "Search Console Integration",
              "Automatisierte Task-Liste",
              "CSV & JSON Export"
            ]}
          />

          <PricingCard
            title="WAP Enterprise v3"
            price={billingInterval === 'yearly' ? '119.20€' : '149 €'}
            description={billingInterval === 'yearly' ? 'Jährliche Abrechnung' : 'Agency Power'}
            icon={<Crown className="w-6 h-6" />}
            accentColor="#1A1A1A"
            buttonText={loadingPlan === 'agency' ? 'Wird geladen...' : "Enterprise beitreten"}
            onAction={() => handleCheckout('agency')}
            features={[
              "Deep Crawler (100+ Pages)",
              "WAP Enterprise Intelligence+",
              "White-Label PDF Berichte",
              "Multi-Domain Monitoring",
              "Priorisierter KI-Zugriff",
              "Persönlicher Support"
            ]}
          />
        </div>
        
        <div className="mt-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 border-t border-[#EEE] dark:border-zinc-800 pt-16">
          <div className="flex flex-col gap-4">
             <div className="w-12 h-12 bg-[#F5F5F3] dark:bg-zinc-800 flex items-center justify-center text-[#D4AF37]">
                <ShieldCheck className="w-6 h-6" />
             </div>
             <h4 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-white">Maximale Sicherheit</h4>
             <p className="text-[12px] text-[#888] leading-relaxed font-medium">Alle Zahlungen werden über Stripe abgewickelt. Wir speichern keine Kreditkartendaten auf unseren Servern.</p>
          </div>
          <div className="flex flex-col gap-4">
             <div className="w-12 h-12 bg-[#F5F5F3] dark:bg-zinc-800 flex items-center justify-center text-[#D4AF37]">
                <CreditCard className="w-6 h-6" />
             </div>
             <h4 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-white">Volle Kontrolle</h4>
             <p className="text-[12px] text-[#888] leading-relaxed font-medium">Keine Mindestlaufzeit. Du kannst dein Abonnement jederzeit mit einem Klick in deinem Dashboard kündigen.</p>
          </div>
          <div className="flex flex-col gap-4">
             <div className="w-12 h-12 bg-[#F5F5F3] dark:bg-zinc-800 flex items-center justify-center text-[#D4AF37]">
                <Rocket className="w-6 h-6" />
             </div>
             <h4 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-white">Sofortiger Zugriff</h4>
             <p className="text-[12px] text-[#888] leading-relaxed font-medium">Nach dem Upgrade oder Trial-Start werden alle Funktionen sofort und ohne Wartezeit freigeschaltet.</p>
          </div>
        </div>

        <div className="mt-16 bg-[#1A1A1A] p-10 text-center flex flex-col items-center justify-center relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
           <p className="text-[10px] font-black uppercase tracking-[4px] text-[#D4AF37] mb-4 relative z-10">Hast du Fragen?</p>
           <h3 className="text-[24px] font-black text-white uppercase tracking-tighter mb-8 relative z-10">Brauchst du ein individuelles Angebot für dein Unternehmen?</h3>
           <button className="bg-white text-black px-10 py-4 text-[11px] font-black uppercase tracking-[3px] hover:bg-[#D4AF37] transition-all relative z-10">
              Kontakt aufnehmen
           </button>
        </div>
      </div>
    </section>
  );
}
