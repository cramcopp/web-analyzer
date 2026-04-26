'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ImpressumPage() {
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
          Impressum
        </h1>

        <div className="flex flex-col gap-12 text-[14px] leading-relaxed font-medium text-[#444] dark:text-zinc-400">
          <section className="flex flex-col gap-4">
            <h2 className="text-[12px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100 border-b-2 border-[#1A1A1A] dark:border-zinc-100 w-fit pb-1">Angaben gemäß § 5 TMG</h2>
            <p>
              Website Analyzer Pro GmbH<br />
              Innovation Street 42<br />
              10117 Berlin<br />
              Deutschland
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-[12px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100 border-b-2 border-[#1A1A1A] dark:border-zinc-100 w-fit pb-1">Kontakt</h2>
            <p>
              Telefon: +49 (0) 30 12345678<br />
              E-Mail: support@webanalyzerpro.com
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-[12px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100 border-b-2 border-[#1A1A1A] dark:border-zinc-100 w-fit pb-1">Umsatzsteuer-ID</h2>
            <p>
              Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br />
              DE 123 456 789
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-[12px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100 border-b-2 border-[#1A1A1A] dark:border-zinc-100 w-fit pb-1">EU-Streitschlichtung</h2>
            <p>
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: 
              <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-[#D4AF37] underline ml-1">https://ec.europa.eu/consumers/odr/</a>.<br />
              Unsere E-Mail-Adresse finden Sie oben im Impressum.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
