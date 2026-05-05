import type { Metadata } from 'next';
import PricingSection from '@/components/PricingSection';
import { PublicToolsFooter, PublicToolsHeader } from '@/components/tool-page-chrome';

export const metadata: Metadata = {
  title: 'Preise',
  description: 'Website Analyzer Pro Preise 2026: Free, Pro, Agency, Business und Add-ons für Keywords, Projekte, Seats, White Label, Backlinks und AI Visibility.',
  alternates: {
    canonical: '/preise',
  },
};

export default function PreisePage() {
  return (
    <div className="min-h-screen bg-[#F5F5F3] text-[#1A1A1A] dark:bg-zinc-950 dark:text-zinc-100">
      <PublicToolsHeader activeView="pricing" />
      <main id="pricing">
        <PricingSection />
      </main>
      <PublicToolsFooter />
    </div>
  );
}
