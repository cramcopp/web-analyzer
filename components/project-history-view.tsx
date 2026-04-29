'use client';

import { useState, useEffect } from 'react';
import { Calendar, BarChart3, ChevronRight, Zap, Search, ShieldCheck } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

export default function ProjectHistoryView({ url, onSelectReport }: { url: string, onSelectReport: (report: any) => void }) {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch(`/api/reports?url=${encodeURIComponent(url)}`);
        if (res.ok) {
          const data = await res.json();
          const parsed = data.map((r: any) => {
            const results = typeof r.results === 'string' ? JSON.parse(r.results) : r.results;
            return {
              ...r,
              results,
              seoScore: r.seoScore ?? results?.seo?.score ?? 0,
              performanceScore: r.performanceScore ?? results?.performance?.score ?? 0,
              securityScore: r.securityScore ?? results?.security?.score ?? 0,
              accessibilityScore: r.accessibilityScore ?? results?.accessibility?.score ?? 0,
              complianceScore: r.complianceScore ?? results?.compliance?.score ?? 0
            };
          });
          const sorted = parsed.sort((a: any, b: any) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setReports(sorted);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    if (url) fetchHistory();
  }, [url]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-zinc-100 dark:bg-zinc-800 rounded-sm" />
        ))}
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-[#888] mb-4">
          <Calendar className="w-8 h-8" />
        </div>
        <h3 className="text-[20px] font-black uppercase tracking-tighter text-[#1A1A1A] dark:text-zinc-100">Keine Historie</h3>
        <p className="text-[12px] text-[#888] font-bold uppercase tracking-widest">Es wurden noch keine Scans für dieses Projekt durchgeführt.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[18px] font-black uppercase tracking-tighter text-[#1A1A1A] dark:text-zinc-100">Scan-Verlauf</h3>
        <span className="text-[10px] font-bold text-[#888] uppercase tracking-widest">{reports.length} Einträge gefunden</span>
      </div>

      {reports.length >= 2 && (
        <div className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 p-8 mb-8">
           <h4 className="text-[12px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100 mb-6">Projektentwicklung</h4>
           <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={[...reports].reverse()}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEE" />
                    <XAxis 
                      dataKey="createdAt" 
                      tickFormatter={(val) => new Date(val).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 9, fill: '#888', fontWeight: 'bold' }} 
                    />
                    <YAxis 
                      hide 
                      domain={[0, 100]} 
                    />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#1A1A1A', border: 'none', borderRadius: '0px' }}
                      itemStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}
                      labelStyle={{ color: '#888', fontSize: '9px', marginBottom: '4px' }}
                      labelFormatter={(val) => new Date(val).toLocaleDateString('de-DE')}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: '#888' }} />
                    <Line type="monotone" name="Global Score" dataKey="score" stroke="#1A1A1A" strokeWidth={4} dot={{ r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" name="SEO" dataKey="seoScore" stroke="#D4AF37" strokeWidth={2} dot={{ r: 3, strokeWidth: 0 }} />
                    <Line type="monotone" name="Performance" dataKey="performanceScore" stroke="#27AE60" strokeWidth={2} dot={{ r: 3, strokeWidth: 0 }} />
                    <Line type="monotone" name="Security" dataKey="securityScore" stroke="#2D9CDB" strokeWidth={2} dot={{ r: 3, strokeWidth: 0 }} />
                 </LineChart>
              </ResponsiveContainer>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {reports.map((report, index) => {
          const date = new Date(report.createdAt).toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          // Calculate trend if not the last item
          const nextReport = reports[index + 1];
          const trend = nextReport ? report.score - nextReport.score : null;

          return (
            <div 
              key={report.id}
              className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:border-[#D4AF37] transition-all cursor-pointer"
              onClick={() => {
                if (report.status !== 'scanning') onSelectReport(report);
              }}
            >
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-[#F5F5F3] dark:bg-zinc-950 flex flex-col items-center justify-center relative">
                  {report.status === 'scanning' ? (
                    <RefreshCw className="w-6 h-6 text-[#D4AF37] animate-spin" />
                  ) : (
                    <>
                      <span className="text-[24px] font-black text-[#1A1A1A] dark:text-zinc-100">{report.score || '0'}</span>
                      <span className="text-[8px] font-bold text-[#888] uppercase">Score</span>
                    </>
                  )}
                  {report.status !== 'scanning' && trend !== null && trend !== 0 && (
                    <div className={`absolute -top-2 -right-2 px-1.5 py-0.5 text-[8px] font-black rounded-sm shadow-sm ${trend > 0 ? 'bg-[#27AE60] text-white' : 'bg-[#EB5757] text-white'}`}>
                      {trend > 0 ? '+' : ''}{trend}%
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span className="text-[14px] font-black text-[#1A1A1A] dark:text-zinc-100">
                      {report.status === 'scanning' ? `Scan läuft... (${report.progress || 0}%)` : date}
                    </span>
                  </div>
                  {report.status === 'scanning' ? (
                    <div className="w-48 h-1 bg-zinc-100 dark:bg-zinc-800 mt-2 rounded-full overflow-hidden">
                      <div className="h-full bg-[#D4AF37] animate-pulse" style={{ width: `${report.progress || 0}%` }} />
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 mt-1">
                      <div className="flex items-center gap-1.5">
                        <Search className="w-3 h-3 text-[#888]" />
                        <span className="text-[9px] font-bold text-[#888] uppercase">SEO: {report.seoScore}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-3 h-3 text-[#888]" />
                        <span className="text-[9px] font-bold text-[#888] uppercase">Perf: {report.performanceScore}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3 h-3 text-[#888]" />
                        <span className="text-[9px] font-bold text-[#888] uppercase">Sec: {report.securityScore}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button 
                className={`px-5 py-2.5 text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                  report.status === 'scanning' 
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed' 
                    : 'bg-[#1A1A1A] dark:bg-zinc-800 text-white group-hover:bg-[#D4AF37]'
                }`}
                disabled={report.status === 'scanning'}
              >
                {report.status === 'scanning' ? 'Warten...' : 'Bericht ansehen'}
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
