'use client';

import {
  AlertCircle,
  Link as LinkIcon,
  PlugZap,
  ShieldCheck,
} from 'lucide-react';
import DataSourceBadge from './data-source-badge';
import { useProviderStatus } from '@/hooks/use-provider-status';

export default function ProjectBacklinksView({ report }: { report: any }) {
  const providerStatus = useProviderStatus();
  if (!report) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-[#888] mb-4">
          <LinkIcon className="w-8 h-8" />
        </div>
        <h3 className="text-[20px] font-black uppercase tracking-tighter text-[#1A1A1A] dark:text-zinc-100">Keine Daten verfuegbar</h3>
        <p className="text-[12px] text-[#888] font-bold uppercase tracking-widest italic">Starten Sie einen Scan, um das Projekt zu laden.</p>
      </div>
    );
  }

  const providerFacts = report.backlinkFacts || [];
  const backlinkProviderConfigured = Boolean(providerStatus?.availability.backlink || report?.providerAvailability?.backlink);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#EEE] dark:border-zinc-800 pb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <LinkIcon className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-[10px] font-black uppercase tracking-[3px] text-[#D4AF37]">Off-Page Intelligence</span>
            <DataSourceBadge type={backlinkProviderConfigured ? 'provider' : 'unavailable'} label={backlinkProviderConfigured ? 'Provider konfiguriert' : 'Provider fehlt'} />
          </div>
          <h2 className="text-[32px] md:text-[42px] font-black uppercase tracking-tighter leading-none text-[#1A1A1A] dark:text-zinc-100">Backlinks</h2>
          <p className="text-[12px] text-[#888] font-bold mt-2 uppercase tracking-widest max-w-xl">
            Backlink-Daten werden erst angezeigt, wenn ein echter Provider angebunden ist.
          </p>
        </div>
      </div>

      {providerFacts.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 p-10 flex flex-col items-center text-center gap-5">
          <div className="w-14 h-14 bg-zinc-50 dark:bg-zinc-950 rounded-full flex items-center justify-center text-zinc-400">
            <PlugZap className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h3 className="text-[18px] font-black uppercase tracking-tighter text-[#1A1A1A] dark:text-zinc-100">Backlink-Provider noch nicht verbunden</h3>
            <p className="text-[12px] text-[#888] font-bold uppercase tracking-widest max-w-xl">
              {backlinkProviderConfigured ? 'Provider-Key ist vorhanden, aber es wurden noch keine Backlink-Facts abgerufen.' : 'Keine Domain-Ratings, Referring-Domains, Toxic-Link-Werte oder Ankertext-Statistiken werden simuliert.'}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <DataSourceBadge type={backlinkProviderConfigured ? 'provider' : 'unavailable'} label={backlinkProviderConfigured ? 'Majestic/DataForSEO konfiguriert' : 'Majestic/DataForSEO fehlt'} />
            <DataSourceBadge type="unavailable" label="Keine Mock-Backlinks" />
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 overflow-hidden">
          <div className="px-6 py-5 border-b border-[#EEE] dark:border-zinc-800 flex items-center justify-between">
            <h4 className="text-[12px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">Provider Backlinks</h4>
            <DataSourceBadge type="provider" />
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#F5F5F3] dark:bg-zinc-950 border-b border-[#EEE] dark:border-zinc-800">
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#888]">Quelle</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#888]">Ziel</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#888]">Anchor</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#888]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEE] dark:divide-zinc-800">
              {providerFacts.map((link: any) => (
                <tr key={`${link.sourceUrl}-${link.targetUrl}`} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4 text-[12px] font-bold text-[#1A1A1A] dark:text-zinc-100 break-all">{link.sourceUrl}</td>
                  <td className="px-6 py-4 text-[12px] font-bold text-[#888] break-all">{link.targetUrl}</td>
                  <td className="px-6 py-4 text-[12px] font-bold text-[#888]">{link.anchor || 'Nicht verfuegbar'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase ${link.lost ? 'text-red-500' : 'text-[#27AE60]'}`}>
                      {link.lost ? <AlertCircle className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                      {link.lost ? 'Lost' : 'Aktiv'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
