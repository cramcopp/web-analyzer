'use client';

import { memo } from 'react';
import { Activity, Lock, ExternalLink, Loader2, AlertCircle, Info, Globe, LineChart as LineIcon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from 'next-themes';
import { CollapsibleSection } from './collapsible-section';

const GscTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const dateStr = label ? new Date(label[0]).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    
    return (
      <div className="bg-white dark:bg-[#111] border border-[#DDD] dark:border-[#333] p-3 shadow-2xl min-w-[150px]">
        <p className="text-[11px] font-bold text-[#888] dark:text-[#A1A1AA] mb-2 uppercase tracking-wider">{dateStr}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between mt-1">
             <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                <span className="text-[12px] text-[#1A1A1A] dark:text-zinc-300 capitalize">{entry.name === 'clicks' ? 'Klicks' : 'Impressionen'}</span>
             </div>
             <span className="text-[14px] font-bold ml-4" style={{ color: entry.color }}>{entry.value.toLocaleString('de-DE')}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

function SearchConsoleModule({ data, isLoading, onConnect, error, plan = 'free', setActiveView }: { data: any, isLoading: boolean, onConnect: () => void, error: string | null, plan?: string, setActiveView: (view: any) => void }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  if (!data && !isLoading && !error) {
    return (
      <CollapsibleSection id="gsc" title="Google Search Console Insight" icon={<Activity className="w-6 h-6" />} color="#4285F4" badge={plan === 'free' ? "STRATEGIC LOCK" : "PREMIUM DATA"} className="relative">
        <div className="flex flex-col items-center justify-center py-10 text-center relative">
          {plan === 'free' && (
            <div className="absolute inset-0 z-20 bg-white/40 dark:bg-black/40 backdrop-blur-[1.5px] flex flex-col items-center justify-center p-6 text-center">
               <div className="bg-[#1A1A1A] p-8 shadow-2xl border border-[#D4AF37]/30 max-w-[400px]">
                  <Lock className="w-10 h-10 text-[#D4AF37] mx-auto mb-4" />
                  <h4 className="text-[18px] font-black text-white uppercase tracking-tighter mb-2">Deep Performance Lock</h4>
                  <p className="text-[12px] text-zinc-400 mb-6 font-medium">Verknüpfe GSC-Daten und schalte mit <span className="text-[#D4AF37]">WAP Advanced</span> die exklusive Index-Analyse frei.</p>
                  <button 
                    onClick={() => setActiveView('pricing')}
                    className="w-full bg-[#D4AF37] text-black py-3 text-[10px] font-black uppercase tracking-widest hover:bg-white transition-colors"
                  >
                    UPGRADE TO UNLOCK
                  </button>
               </div>
            </div>
          )}
          <div className="w-16 h-16 bg-[#F5F5F3] dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6">
            <Activity className="w-8 h-8 text-[#4285F4] opacity-40" />
          </div>
          <h4 className="text-[16px] font-bold text-[#1A1A1A] dark:text-zinc-100 mb-2 uppercase">Echtzeit-Daten verknüpfen</h4>
          <p className="text-[13px] text-[#888888] dark:text-zinc-400 max-w-[400px] mb-8 leading-relaxed">
            Verbinden Sie Ihr Google-Konto, um Performance-Daten (Klicks, Impressionen) zu integrieren.
          </p>
          <button 
            disabled={plan === 'free'}
            onClick={onConnect}
            className={`px-8 py-3 text-[11px] font-bold uppercase tracking-[1px] transition-all flex items-center gap-3 active:scale-95 ${plan === 'free' ? 'bg-zinc-300 text-zinc-500 cursor-not-allowed opacity-50' : 'bg-[#4285F4] hover:bg-[#357ae8] text-white shadow-lg'}`}
          >
            <ExternalLink className="w-4 h-4" />
            Mit Search Console verbinden
          </button>
        </div>
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection id="gsc" title="Google Search Console Insight" icon={<Activity className="w-6 h-6" />} color="#4285F4" badge="REAL-TIME DATA">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-full py-20 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#4285F4]" />
          <p className="text-[11px] uppercase font-bold text-[#888888] tracking-widest">Rufe Google-Daten ab...</p>
        </div>
      ) : error ? (
        <div className="p-6 border border-[#EB5757]/30 bg-[#EB5757]/5 text-[#EB5757] flex flex-col items-center gap-3 text-center">
           <AlertCircle className="w-6 h-6" />
           <p className="text-[14px] font-bold">{error}</p>
           <button onClick={onConnect} className="text-[10px] uppercase font-bold border-b border-[#EB5757] mt-2">Erneut versuchen</button>
        </div>
      ) : (
        <div className="animate-in fade-in duration-500">
           <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10 pb-10 border-b border-[#EEE] dark:border-zinc-800">
              <div className="flex flex-col">
                 <span className="text-[10px] uppercase font-bold text-[#888888] mb-1">Klicks (30 Tage)</span>
                 <span className="text-[32px] font-bold text-[#4285F4]">{data.performanceTotals.clicks.toLocaleString()}</span>
              </div>
              <div className="flex flex-col">
                 <span className="text-[10px] uppercase font-bold text-[#888888] mb-1">Impressionen</span>
                 <span className="text-[32px] font-bold text-[#1A1A1A] dark:text-zinc-100">{data.performanceTotals.impressions.toLocaleString()}</span>
              </div>
              <div className="flex flex-col">
                 <span className="text-[10px] uppercase font-bold text-[#888888] mb-1">Index-Status</span>
                 <div className="flex items-center gap-2 mt-2">
                    <span className={`w-3 h-3 rounded-full ${data.inspection?.indexStatusResult?.verdict === 'PASS' ? 'bg-[#27AE60]' : 'bg-[#EB5757]'}`}></span>
                    <span className="text-[13px] font-bold text-[#1A1A1A] dark:text-zinc-100 uppercase">
                       {data.inspection?.indexStatusResult?.verdict === 'PASS' ? 'Indiziert' : 'Probleme erkannt'}
                    </span>
                 </div>
              </div>
              <div className="flex flex-col">
                 <span className="text-[10px] uppercase font-bold text-[#888888] mb-1">Mobile Usability</span>
                 <div className="flex items-center gap-2 mt-2">
                    <span className={`w-3 h-3 rounded-full ${data.inspection?.mobileUsabilityResult?.verdict === 'PASS' ? 'bg-[#27AE60]' : 'bg-[#F2994A]'}`}></span>
                    <span className="text-[13px] font-bold text-[#1A1A1A] dark:text-zinc-100 uppercase">
                       {data.inspection?.mobileUsabilityResult?.verdict === 'PASS' ? 'Optimiert' : 'Warnung'}
                    </span>
                 </div>
              </div>
           </div>

           <div className="mb-10">
              <h4 className="text-[11px] uppercase font-bold text-[#888888] mb-6 flex items-center gap-2">
                 <LineIcon className="w-4 h-4" />
                 Performance-Trend (Letzte 30 Tage)
              </h4>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                   <LineChart data={data.performance} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#3F3F46' : '#eee'} />
                      <XAxis 
                        dataKey="keys" 
                        tickFormatter={(keys) => {
                          if (!keys || !keys[0]) return '';
                          const d = new Date(keys[0]);
                          return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.`;
                        }}
                        fontSize={10}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: isDark ? '#A1A1AA' : '#888' }}
                        dy={10}
                      />
                      <YAxis 
                        fontSize={10} 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: isDark ? '#A1A1AA' : '#888' }} 
                        tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                        dx={-10}
                      />
                      <Tooltip 
                        content={<GscTooltip />} 
                        cursor={{ stroke: isDark ? '#3F3F46' : '#eee', strokeWidth: 1, strokeDasharray: '3 3' }} 
                      />
                      <Line 
                        name="clicks"
                        type="monotone" 
                        dataKey="clicks" 
                        stroke="#4285F4" 
                        strokeWidth={3} 
                        dot={false} 
                        activeDot={{ r: 6, strokeWidth: 0, fill: '#4285F4' }} 
                      />
                      <Line 
                        name="impressions"
                        type="monotone" 
                        dataKey="impressions" 
                        stroke="#D4AF37" 
                        strokeWidth={2} 
                        dot={false} 
                        activeDot={{ r: 6, strokeWidth: 0, fill: '#D4AF37' }} 
                        opacity={0.8}
                      />
                   </LineChart>
                </ResponsiveContainer>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 break-inside-avoid">
              <div className="bg-[#F5F5F3] dark:bg-zinc-950 p-6 border border-[#EEE] dark:border-zinc-800">
                 <h5 className="text-[12px] font-bold uppercase mb-4 flex items-center gap-2">
                    <Info className="w-4 h-4 text-[#4285F4]" />
                    URL-Inspektion Detail
                 </h5>
                 <div className="space-y-4">
                    <div className="flex flex-col">
                       <span className="text-[10px] uppercase font-bold text-[#888888]">Abdeckung (Coverage)</span>
                       <p className="text-[12px] font-medium mt-1">{data.inspection?.indexStatusResult?.coverageState || 'Unbekannt'}</p>
                    </div>
                    <div className="flex flex-col">
                       <span className="text-[10px] uppercase font-bold text-[#888888]">Crawl-Zeitpunkt</span>
                       <p className="text-[12px] font-medium mt-1">{data.inspection?.indexStatusResult?.lastCrawlTime ? new Date(data.inspection.indexStatusResult.lastCrawlTime).toLocaleString('de-DE') : '-'}</p>
                    </div>
                 </div>
              </div>
              <div className="bg-[#F5F5F3] dark:bg-zinc-950 p-6 border border-[#EEE] dark:border-zinc-800">
                 <h5 className="text-[12px] font-bold uppercase mb-4 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#4285F4]" />
                    Sitemaps Status
                 </h5>
                 <ul className="space-y-3">
                    {data.sitemaps && data.sitemaps.length > 0 ? (
                      data.sitemaps.map((s: any, idx: number) => (
                        <li key={idx} className="flex flex-col pb-2 border-b border-black/5 last:border-0 last:pb-0">
                           <span className="text-[11px] font-bold truncate max-w-[250px]">{s.path}</span>
                           <span className="text-[10px] text-[#888888] uppercase font-bold mt-1">Status: {s.errors === '0' ? 'OK' : 'Fehler'}</span>
                        </li>
                      ))
                    ) : (
                      <p className="text-[11px] text-[#888888] italic">Keine Sitemaps hinterlegt.</p>
                    )}
                 </ul>
              </div>
           </div>
        </div>
      )}
    </CollapsibleSection>
  );
}

export default memo(SearchConsoleModule);
