'use client';

import { memo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Target, Trophy, TrendingUp } from 'lucide-react';

function CompetitorMap({ competitors, userScore, userName }: { competitors?: any[], userScore: number, userName: string }) {
  if (!competitors || competitors.length === 0) return null;

  const data = [
    { name: 'Du (' + userName + ')', x: userScore, y: userScore, z: 100, isUser: true },
    ...competitors.map(c => ({
      name: c.name,
      x: c.estimatedScores.seo,
      y: c.estimatedScores.performance,
      z: 80,
      isUser: false
    }))
  ];

  return (
    <div className="mt-12 bg-white dark:bg-zinc-900 border border-[#E5E5E5] dark:border-zinc-800 p-8 break-inside-avoid">
      <div className="flex items-center justify-between mb-8">
        <div className="flex flex-col gap-1">
           <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-[#D4AF37]" />
              <h4 className="text-[16px] font-black uppercase tracking-tighter text-[#1A1A1A] dark:text-zinc-100">Markt-Positionierung</h4>
           </div>
           <p className="text-[10px] text-[#888] font-bold uppercase tracking-widest">SEO vs. Performance im Branchenvergleich</p>
        </div>
        <div className="flex gap-4">
           <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#D4AF37]"></div>
              <span className="text-[9px] font-bold text-[#888] uppercase">Du</span>
           </div>
           <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#E5E5E5] dark:bg-zinc-800"></div>
              <span className="text-[9px] font-bold text-[#888] uppercase">Wettbewerb</span>
           </div>
        </div>
      </div>

      <div className="h-[300px] w-full relative">
        <div className="absolute top-0 right-0 p-4 flex flex-col items-end gap-1 opacity-20 pointer-events-none">
           <Trophy className="w-8 h-8 text-[#D4AF37]" />
           <span className="text-[10px] font-black uppercase tracking-widest">Market Leader</span>
        </div>
        <div className="absolute bottom-0 left-0 p-4 opacity-20 pointer-events-none">
           <span className="text-[10px] font-black uppercase tracking-widest">Underdog</span>
        </div>
        
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEE" vertical={false} />
            <XAxis 
              type="number" 
              dataKey="x" 
              name="SEO" 
              unit="%" 
              domain={[0, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#888', fontWeight: 'bold' }}
              label={{ value: 'SEO Score', position: 'bottom', offset: 0, fill: '#888', fontSize: 10, fontWeight: 'bold' }}
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              name="Performance" 
              unit="%" 
              domain={[0, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#888', fontWeight: 'bold' }}
              label={{ value: 'Performance', angle: -90, position: 'insideLeft', fill: '#888', fontSize: 10, fontWeight: 'bold' }}
            />
            <ZAxis type="number" dataKey="z" range={[100, 500]} />
            <Tooltip 
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{ backgroundColor: '#1A1A1A', border: 'none', borderRadius: '0px' }}
              itemStyle={{ color: '#D4AF37', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}
            />
            <Scatter name="Websites" data={data}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.isUser ? '#D4AF37' : '#E5E5E5'} 
                  stroke={entry.isUser ? '#D4AF37' : '#AAA'}
                  strokeWidth={entry.isUser ? 4 : 1}
                  className="transition-all duration-500 hover:scale-125"
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
         <div className="p-4 bg-[#F9F9F9] dark:bg-zinc-950 border-l-2 border-[#D4AF37]">
            <h5 className="text-[11px] font-black uppercase text-[#1A1A1A] dark:text-zinc-100 mb-1 flex items-center gap-2">
               <TrendingUp className="w-3.5 h-3.5 text-[#D4AF37]" />
               Wettbewerbs-Vorteil
            </h5>
            <p className="text-[12px] text-[#666] dark:text-zinc-400 leading-relaxed font-medium">
               Deine Seite liegt im Vergleich zum Branchendurchschnitt bei der Performance vorn. Nutze diesen Vorsprung für bessere Rankings.
            </p>
         </div>
      </div>
    </div>
  );
}

export default memo(CompetitorMap);
