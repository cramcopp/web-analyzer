import type { IssueHistoryEntry, ScanDiff } from '@/types/monitoring';

export function IssueList({ title, issues, emptyLabel }: { title: string; issues: IssueHistoryEntry[]; emptyLabel: string }) {
  return (
    <div className="border border-[#EEE] dark:border-zinc-800">
      <div className="px-4 py-3 border-b border-[#EEE] dark:border-zinc-800 flex items-center justify-between gap-3">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">{title}</h4>
        <span className="text-[11px] font-black text-[#D4AF37]">{issues.length}</span>
      </div>
      {issues.length === 0 ? (
        <p className="p-4 text-[11px] text-[#888] font-bold uppercase tracking-widest">{emptyLabel}</p>
      ) : (
        <div className="divide-y divide-[#EEE] dark:divide-zinc-800">
          {issues.slice(0, 8).map((issue) => (
            <div key={`${issue.status}_${issue.issueId}`} className="p-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37]">{issue.status}</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-[#888]">{issue.severity}</span>
              </div>
              <p className="text-[12px] font-bold text-[#1A1A1A] dark:text-zinc-100">{issue.title}</p>
              <p className="text-[10px] text-[#888] mt-1 truncate">{issue.affectedUrls[0] || 'URL nicht verfügbar'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ScoreDeltaList({ diff }: { diff: ScanDiff | null }) {
  if (!diff || Object.keys(diff.scoreDelta).length === 0) {
    return <p className="text-[11px] text-[#888] font-bold uppercase tracking-widest">Noch kein Score-Vergleich verfügbar.</p>;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {Object.entries(diff.scoreDelta).map(([key, value]) => (
        <div key={key} className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-[#EEE] dark:border-zinc-800">
          <span className="text-[9px] font-black uppercase tracking-widest text-[#888] block mb-2">{key}</span>
          <span className={`text-[18px] font-black ${value < 0 ? 'text-red-500' : value > 0 ? 'text-[#27AE60]' : 'text-[#888]'}`}>
            {value > 0 ? '+' : ''}{value}
          </span>
        </div>
      ))}
    </div>
  );
}
