'use client';

import { useState, useEffect, memo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Calendar } from 'lucide-react';

function ScoreTrend({ url }: { url: string }) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch(`/api/reports?url=${encodeURIComponent(url)}`);
        if (res.ok) {
          const data = await res.json();
          const sorted = data.map((p: any) => ({
            score: p.score,
            date: new Date(p.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
            rawDate: new Date(p.createdAt)
          })).sort((a: any, b: any) => a.rawDate.getTime() - b.rawDate.getTime());
          setHistory(sorted);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    if (url) fetchHistory();
  }, [url]);

  if (loading || history.length < 2) return null;

  return (
    <div className="w-full h-full flex flex-col break-inside-avoid animate-in fade-in duration-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex flex-col gap-1">
           <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#D4AF37]" />
              <h4 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">Score Trend</h4>
           </div>
           <p className="text-[10px] text-[#888] font-bold uppercase tracking-widest">Verlauf der letzten Audits</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F5F5F3] dark:bg-zinc-950 border border-[#EEE] dark:border-zinc-800">
           <Calendar className="w-3.5 h-3.5 text-[#888]" />
           <span className="text-[9px] font-black text-[#888] uppercase">{history[0].date} — {history[history.length-1].date}</span>
        </div>
      </div>

      <div className="flex-1 w-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEE" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 9, fill: '#888', fontWeight: 'bold' }} 
            />
            <YAxis 
              hide 
              domain={[0, 100]} 
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1A1A1A', border: 'none', borderRadius: '0px' }}
              itemStyle={{ color: '#D4AF37', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}
              labelStyle={{ color: '#888', fontSize: '9px', marginBottom: '4px' }}
            />
            <Line 
              type="monotone" 
              dataKey="score" 
              stroke="#D4AF37" 
              strokeWidth={4} 
              dot={{ r: 4, fill: '#D4AF37', strokeWidth: 0 }} 
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default memo(ScoreTrend);
