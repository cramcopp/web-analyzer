'use client';

import { memo, useState } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip } from 'recharts';
import { Target, Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import DataSourceBadge from './data-source-badge';
import { SafeResponsiveContainer } from './safe-responsive-container';

// Custom dot that renders stably on hover (no CSS scale on SVG elements)
function CustomDot(props: any) {
  const { cx, cy, payload } = props;
  const [hovered, setHovered] = useState(false);
  const isUser = payload?.isUser;
  const r = hovered ? (isUser ? 14 : 11) : (isUser ? 10 : 8);

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: 'pointer' }}
    >
      <circle
        cx={cx}
        cy={cy}
        r={r + 4}
        fill="transparent"
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={isUser ? '#D4AF37' : '#E5E5E5'}
        stroke={isUser ? '#B8952B' : '#999'}
        strokeWidth={isUser ? 3 : 1.5}
        style={{ transition: 'r 0.15s ease' }}
      />
      {/* Name label above dot */}
      {hovered && (
        <text
          x={cx}
          y={cy - r - 6}
          textAnchor="middle"
          fontSize={9}
          fontWeight="bold"
          fill={isUser ? '#D4AF37' : '#555'}
          style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}
        >
          {payload.name}
        </text>
      )}
    </g>
  );
}

function CompetitorMap({ competitors, userScore, userName }: { competitors?: any[], userScore: number, userName: string }) {
  if (!competitors || competitors.length === 0) return null;

  // User data point — x = SEO score (from parent: avg of seo+perf), y = performance
  // We use userScore for both axes as proxy (it's passed as avg of seo+performance)
  const userSeo = userScore;
  const userPerf = userScore;

  const competitorData = competitors
  .filter(c => typeof c.estimatedScores?.seo === 'number' && typeof c.estimatedScores?.performance === 'number')
  .map(c => ({
    name: c.name,
    url: c.url || '',
    x: c.estimatedScores.seo,
    y: c.estimatedScores.performance,
    z: 80,
    isUser: false,
  }));
  if (competitorData.length === 0) return null;

  const data = [
    { name: userName || 'Du', x: userSeo, y: userPerf, z: 100, isUser: true },
    ...competitorData,
  ];

  // AI-inferred competitive analysis. Do not present this as provider truth.
  const avgCompSeo = competitorData.reduce((s, c) => s + c.x, 0) / (competitorData.length || 1);
  const avgCompPerf = competitorData.reduce((s, c) => s + c.y, 0) / (competitorData.length || 1);
  const seoDiff = userSeo - avgCompSeo;
  const perfDiff = userPerf - avgCompPerf;
  const overallDiff = (seoDiff + perfDiff) / 2;

  let analysisIcon = <Minus className="w-3.5 h-3.5 text-[#888]" />;
  let analysisTitle = 'Im Branchendurchschnitt';
  let analysisText = '';
  let borderColor = '#888';

  if (overallDiff > 5) {
    analysisIcon = <TrendingUp className="w-3.5 h-3.5 text-[#27AE60]" />;
    analysisTitle = 'Wettbewerbs-Vorteil';
    analysisText = `KI-Hinweis: Der Schaetzwert liegt ueber dem Vergleichsschnitt (SEO +${seoDiff.toFixed(0)} Pkt., Performance +${perfDiff.toFixed(0)} Pkt.). Bitte mit Provider-Daten verifizieren.`;
    borderColor = '#27AE60';
  } else if (overallDiff < -5) {
    analysisIcon = <TrendingDown className="w-3.5 h-3.5 text-[#EB5757]" />;
    analysisTitle = 'Aufholbedarf';
    analysisText = `KI-Hinweis: Der Schaetzwert liegt ${Math.abs(seoDiff).toFixed(0)} SEO-Punkte und ${Math.abs(perfDiff).toFixed(0)} Performance-Punkte unter dem Vergleichsschnitt. Bitte mit Provider-Daten verifizieren.`;
    borderColor = '#EB5757';
  } else {
    analysisText = `KI-Hinweis: Der Schaetzwert liegt nah am Vergleichsschnitt (SEO ${seoDiff > 0 ? '+' : ''}${seoDiff.toFixed(0)}, Performance ${perfDiff > 0 ? '+' : ''}${perfDiff.toFixed(0)}). Bitte mit Provider-Daten verifizieren.`;
  }

  return (
    <div className="mt-12 bg-white dark:bg-zinc-900 border border-[#E5E5E5] dark:border-zinc-800 p-8 break-inside-avoid">
      <div className="flex items-center justify-between mb-8">
        <div className="flex flex-col gap-1">
           <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-[#D4AF37]" />
              <h4 className="text-[16px] font-black uppercase tracking-tighter text-[#1A1A1A] dark:text-zinc-100">Markt-Positionierung</h4>
              <DataSourceBadge type="ai_inferred" />
           </div>
           <p className="text-[10px] text-[#888] font-bold uppercase tracking-widest">SEO vs. Performance im Branchenvergleich</p>
        </div>
        <div className="flex gap-4">
           <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#D4AF37]"></div>
              <span className="text-[9px] font-bold text-[#888] uppercase">Du</span>
           </div>
           <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#E5E5E5] dark:bg-zinc-600"></div>
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
        
        <SafeResponsiveContainer height={300}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 30, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEE" vertical={false} />
            <XAxis 
              type="number" 
              dataKey="x" 
              name="SEO Score" 
              unit="%" 
              domain={[0, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#888', fontWeight: 'bold' }}
              label={{ value: 'SEO Score', position: 'bottom', offset: 10, fill: '#888', fontSize: 10, fontWeight: 'bold' }}
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
            <ZAxis type="number" dataKey="z" range={[60, 60]} />
            <Tooltip 
              cursor={false}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                if (!d) return null;
                return (
                  <div style={{ background: '#1A1A1A', padding: '8px 12px', border: 'none', borderRadius: 0 }}>
                    <p style={{ color: d.isUser ? '#D4AF37' : '#E5E5E5', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', marginBottom: 4 }}>{d.name}</p>
                    <p style={{ color: '#888', fontSize: 10, fontWeight: 700 }}>SEO: {d.x}%</p>
                    <p style={{ color: '#888', fontSize: 10, fontWeight: 700 }}>Perf: {d.y}%</p>
                    {d.url && <p style={{ color: '#555', fontSize: 9, marginTop: 4 }}>{d.url}</p>}
                  </div>
                );
              }}
            />
            <Scatter name="Websites" data={data} shape={<CustomDot />} />
          </ScatterChart>
        </SafeResponsiveContainer>
      </div>

      {/* Competitor Legend Table */}
      <div className="mt-6 border-t border-[#F0F0F0] dark:border-zinc-800 pt-5">
        <p className="text-[9px] font-black uppercase tracking-widest text-[#888] mb-3">Wettbewerber im Detail</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {competitorData.map((c, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-[#F9F9F9] dark:bg-zinc-950 border border-[#E5E5E5] dark:border-zinc-800">
              <div className="w-2 h-2 rounded-full bg-[#E5E5E5] dark:bg-zinc-600 shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-black uppercase truncate text-[#1A1A1A] dark:text-zinc-100">{c.name}</span>
                {c.url && <span className="text-[8px] text-[#888] truncate">{c.url.replace(/^https?:\/\//, '')}</span>}
              </div>
              <div className="ml-auto flex gap-2 shrink-0">
                <span className="text-[9px] font-bold text-[#888]">SEO <span className="text-[#1A1A1A] dark:text-zinc-100">{c.x}</span></span>
                <span className="text-[9px] font-bold text-[#888]">Perf <span className="text-[#1A1A1A] dark:text-zinc-100">{c.y}</span></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Real competitive analysis */}
      <div className="mt-4">
        <div className="p-4 bg-[#F9F9F9] dark:bg-zinc-950" style={{ borderLeft: `2px solid ${borderColor}` }}>
          <h5 className="text-[11px] font-black uppercase text-[#1A1A1A] dark:text-zinc-100 mb-1 flex items-center gap-2">
            {analysisIcon}
            {analysisTitle}
          </h5>
          <p className="text-[12px] text-[#666] dark:text-zinc-400 leading-relaxed font-medium">
            {analysisText}
          </p>
        </div>
      </div>
    </div>
  );
}

export default memo(CompetitorMap);
