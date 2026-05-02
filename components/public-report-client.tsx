'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Eye, FileText, Lock, ShieldCheck } from 'lucide-react';
import DataSourceBadge from './data-source-badge';

type PublicReportPayload = {
  share: {
    token: string;
    visibility: 'public' | 'password';
    branding?: {
      displayName?: string;
      primaryColor?: string;
      logoUrl?: string;
      footerNote?: string;
    } | null;
    builder?: { title?: string; sections?: string[] } | null;
    createdAt: string;
  };
  report: any;
};

function scoreCards(report: any) {
  return ['seo', 'performance', 'security', 'accessibility', 'compliance']
    .map((key) => ({ key, value: report?.[key]?.score }))
    .filter((item) => typeof item.value === 'number');
}

export default function PublicReportClient({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  const [payload, setPayload] = useState<PublicReportPayload | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadReport = async (passwordValue = '') => {
    setLoading(true);
    setError('');
    try {
      const query = passwordValue ? `?password=${encodeURIComponent(passwordValue)}` : '';
      const response = await fetch(`/api/public-reports/${token}${query}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Report konnte nicht geladen werden');
      setPayload(data);
    } catch (err: any) {
      setPayload(null);
      setError(err.message || 'Report konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/public-reports/${token}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Report konnte nicht geladen werden');
        return data;
      })
      .then((data) => {
        if (!cancelled) {
          setPayload(data);
          setError('');
        }
      })
      .catch((err: any) => {
        if (!cancelled) {
          setPayload(null);
          setError(err.message || 'Report konnte nicht geladen werden');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const branding = payload?.share.branding;
  const scores = useMemo(() => scoreCards(payload?.report), [payload]);
  const accent = branding?.primaryColor || '#D4AF37';

  if (loading) {
    return <div className="min-h-screen bg-[#F5F5F3] dark:bg-zinc-950 p-8"><div className="h-[260px] animate-pulse bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800" /></div>;
  }

  if (error && !payload) {
    const passwordRequired = error.toLowerCase().includes('passwort');
    return (
      <main className="min-h-screen bg-[#F5F5F3] dark:bg-zinc-950 flex items-center justify-center p-6">
        <section className="w-full max-w-md bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 p-8">
          <div className="flex items-center gap-3 mb-5">
            {passwordRequired ? <Lock className="w-5 h-5 text-[#D4AF37]" /> : <AlertTriangle className="w-5 h-5 text-red-500" />}
            <h1 className="text-[18px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">{passwordRequired ? 'Passwort erforderlich' : 'Report nicht verfuegbar'}</h1>
          </div>
          <p className="text-[12px] text-[#888] font-bold uppercase tracking-widest mb-5">{error}</p>
          {passwordRequired && (
            <div className="space-y-3">
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-[#EEE] dark:border-zinc-800 text-[13px] focus:outline-none focus:border-[#D4AF37]"
                placeholder="Report Passwort"
              />
              <button
                onClick={() => loadReport(password)}
                disabled={!password}
                className="w-full px-5 py-3 bg-[#1A1A1A] dark:bg-white text-white dark:text-zinc-900 text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
              >
                Report oeffnen
              </button>
            </div>
          )}
        </section>
      </main>
    );
  }

  const report = payload?.report;

  return (
    <main className="min-h-screen bg-[#F5F5F3] dark:bg-zinc-950 p-5 md:p-10">
      <section className="max-w-6xl mx-auto space-y-8">
        <header className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 p-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Eye className="w-4 h-4" style={{ color: accent }} />
                <span className="text-[10px] font-black uppercase tracking-[3px]" style={{ color: accent }}>{branding?.displayName || 'Client Portal'}</span>
                <DataSourceBadge type="real" label="Sanitized Report" />
              </div>
              <h1 className="text-[30px] md:text-[44px] font-black uppercase tracking-tighter text-[#1A1A1A] dark:text-zinc-100">
                {payload?.share.builder?.title || 'Website Audit Report'}
              </h1>
              <p className="text-[12px] text-[#888] font-bold uppercase tracking-widest mt-3 break-all">{report?.url}</p>
            </div>
            {branding?.logoUrl && <img src={branding.logoUrl} alt={branding.displayName || 'Branding'} className="h-12 max-w-[180px] object-contain" />}
          </div>
        </header>

        {scores.length > 0 && (
          <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {scores.map((score) => (
              <div key={score.key} className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 p-5">
                <span className="text-[9px] font-black uppercase tracking-widest text-[#888] block mb-2">{score.key}</span>
                <span className="text-[26px] font-black text-[#1A1A1A] dark:text-zinc-100">{score.value}</span>
              </div>
            ))}
          </section>
        )}

        {report?.overallAssessment && (
          <section className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 p-6">
            <h2 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100 mb-4">Zusammenfassung</h2>
            <p className="text-[14px] text-[#555] dark:text-zinc-400 leading-relaxed">{report.overallAssessment}</p>
          </section>
        )}

        <section className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 overflow-hidden">
          <div className="px-6 py-5 border-b border-[#EEE] dark:border-zinc-800 flex items-center gap-2">
            <FileText className="w-4 h-4" style={{ color: accent }} />
            <h2 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">Issues</h2>
          </div>
          {(report?.issues || []).length === 0 ? (
            <div className="p-8 text-[11px] text-[#888] font-bold uppercase tracking-widest">Keine Issues im freigegebenen Report.</div>
          ) : (
            <div className="divide-y divide-[#EEE] dark:divide-zinc-800">
              {report.issues.slice(0, 30).map((issue: any) => (
                <div key={issue.id} className="p-5">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: accent }}>{issue.severity}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#888]">{issue.category}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#888]">{Math.round((issue.confidence || 0) * 100)}%</span>
                  </div>
                  <p className="text-[13px] font-bold text-[#1A1A1A] dark:text-zinc-100">{issue.title}</p>
                  <p className="text-[11px] text-[#888] mt-1">{issue.fixHint}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <footer className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-[10px] text-[#888] font-bold uppercase tracking-widest">
          <span>{branding?.footerNote || 'Report ohne interne Debugdaten, Raw HTML oder Secrets.'}</span>
          <span className="flex items-center gap-2"><ShieldCheck className="w-3.5 h-3.5" /> Client Portal</span>
        </footer>
      </section>
    </main>
  );
}
