'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AGBPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#F5F5F3] dark:bg-zinc-950 text-[#1A1A1A] dark:text-zinc-100 font-sans p-8 md:p-20">
      <div className="max-w-[800px] mx-auto">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#888] hover:text-[#D4AF37] transition-colors mb-12"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück
        </button>

        <h1 className="text-[50px] md:text-[82px] leading-[0.85] tracking-[-3px] font-bold uppercase mb-16">
          AGB
        </h1>

        <div className="flex flex-col gap-12 text-[14px] leading-relaxed font-medium text-[#444] dark:text-zinc-400">
          <section className="flex flex-col gap-4">
            <h2 className="text-[12px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100 border-b-2 border-[#1A1A1A] dark:border-zinc-100 w-fit pb-1">1. Geltungsbereich</h2>
            <p>
              Für die Geschäftsbeziehung zwischen der Website Analyzer Pro GmbH und dem Kunden gelten ausschließlich die nachfolgenden Allgemeinen Geschäftsbedingungen in ihrer zum Zeitpunkt der Bestellung gültigen Fassung.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-[12px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100 border-b-2 border-[#1A1A1A] dark:border-zinc-100 w-fit pb-1">2. Leistungsbeschreibung</h2>
            <p>
              Website Analyzer Pro bietet ein Tool zur Analyse von Webseiten hinsichtlich SEO, Security, Performance und DSGVO-Konformität. Die genauen Leistungsumfänge ergeben sich aus der jeweiligen Paketbeschreibung (Free, Pro, Agency, Business).
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-[12px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100 border-b-2 border-[#1A1A1A] dark:border-zinc-100 w-fit pb-1">3. Vertragsschluss</h2>
            <p>
              Der Vertrag kommt durch die Registrierung und Auswahl eines Abonnements auf unserer Plattform zustande. Bei kostenpflichtigen Abonnements erfolgt der Vertragsschluss mit Abschluss des Zahlungsvorgangs über unseren Partner Stripe.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-[12px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100 border-b-2 border-[#1A1A1A] dark:border-zinc-100 w-fit pb-1">4. Zahlungsbedingungen & Kündigung</h2>
            <p>
              Die Abrechnung erfolgt monatlich oder jährlich im Voraus. Abonnements können jederzeit zum Ende der jeweiligen Laufzeit gekündigt werden. Eine Rückerstattung bereits gezahlter Beträge ist ausgeschlossen.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-[12px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100 border-b-2 border-[#1A1A1A] dark:border-zinc-100 w-fit pb-1">5. Haftung</h2>
            <p>
              Die Analyseergebnisse stellen Empfehlungen dar und erheben keinen Anspruch auf Vollständigkeit oder rechtliche Verbindlichkeit. Die Umsetzung der Empfehlungen erfolgt auf eigene Gefahr des Kunden.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
