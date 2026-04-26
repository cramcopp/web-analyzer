'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DatenschutzPage() {
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
          Datenschutz
        </h1>

        <div className="flex flex-col gap-12 text-[14px] leading-relaxed font-medium text-[#444] dark:text-zinc-400">
          <section className="flex flex-col gap-4">
            <h2 className="text-[12px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100 border-b-2 border-[#1A1A1A] dark:border-zinc-100 w-fit pb-1">1. Datenschutz auf einen Blick</h2>
            <p>
              Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-[12px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100 border-b-2 border-[#1A1A1A] dark:border-zinc-100 w-fit pb-1">2. Datenerfassung auf dieser Website</h2>
            <h3 className="text-[11px] font-bold uppercase">Wer ist verantwortlich für die Datenerfassung auf dieser Website?</h3>
            <p>
              Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen Kontaktdaten können Sie dem Impressum dieser Website entnehmen.
            </p>
            <h3 className="text-[11px] font-bold uppercase">Wie erfassen wir Ihre Daten?</h3>
            <p>
              Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen. Hierbei kann es sich z. B. um Daten handeln, die Sie in ein Kontaktformular eingeben. Andere Daten werden automatisch oder nach Ihrer Einwilligung beim Besuch der Website durch unsere IT-Systeme erfasst.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-[12px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100 border-b-2 border-[#1A1A1A] dark:border-zinc-100 w-fit pb-1">3. Analyse-Tools und Tools von Drittanbietern</h2>
            <p>
              Beim Besuch dieser Website kann Ihr Surf-Verhalten statistisch ausgewertet werden. Das geschieht vor allem mit sogenannten Analyseprogrammen. Detaillierte Informationen zu diesen Analyseprogrammen finden Sie in der folgenden Datenschutzerklärung.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-[12px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100 border-b-2 border-[#1A1A1A] dark:border-zinc-100 w-fit pb-1">4. Google Search Console & Gemini API</h2>
            <p>
              Diese Anwendung nutzt die Google Search Console API sowie die Google Gemini API zur Analyse Ihrer Webseiten. Dabei werden Daten an Google-Server übertragen. Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
