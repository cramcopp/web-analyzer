'use client';

import React, { useState } from 'react';
import { History, Search, RefreshCw } from 'lucide-react';
import { HistoryItem } from '../../types/common';

interface SidebarHistoryProps {
  history: HistoryItem[];
  onLoadReport?: (id: string) => void;
  onItemClick: (callback?: () => void) => void;
}

export function SidebarHistory({ history, onLoadReport, onItemClick }: SidebarHistoryProps) {
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [searchHistory, setSearchHistory] = useState("");

  const filteredHistory = history.filter((h) =>
    h.url.toLowerCase().includes(searchHistory.toLowerCase()),
  );
  
  const displayedHistory = isHistoryExpanded
    ? filteredHistory
    : filteredHistory.slice(0, 3);

  return (
    <div className="px-4 py-5">
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-[10px] uppercase font-black text-[#888] tracking-widest flex items-center gap-1.5">
          <History className="w-3 h-3" /> Verlauf
        </span>
        <button
          onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
          className="text-[#888] hover:text-[#1A1A1A] dark:hover:text-zinc-100 transition-colors text-[9px] uppercase font-bold"
        >
          {isHistoryExpanded ? "Weniger" : "Alle sehen"}
        </button>
      </div>

      {isHistoryExpanded && (
        <div className="relative mb-3 px-1">
          <Search className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-[#888]" />
          <input
            type="text"
            placeholder="Scans suchen..."
            value={searchHistory}
            onChange={(e) => setSearchHistory(e.target.value)}
            className="w-full bg-white dark:bg-zinc-900 border border-[#E5E5E5] dark:border-zinc-800 rounded-md py-1.5 pl-8 pr-3 text-[11px] outline-none focus:border-[#D4AF37] transition-colors placeholder:text-[#AAA]"
          />
        </div>
      )}

      <div className="flex flex-col gap-1">
        {displayedHistory.length > 0 ? (
          displayedHistory.map((scan, i) => (
            <button
              key={i}
              onClick={() => {
                if (scan.status !== 'scanning') onItemClick(() => onLoadReport?.(scan.id));
              }}
              className={`w-full text-left flex items-start gap-2 p-2 rounded-md border border-transparent transition-colors group ${
                scan.status === 'scanning' ? 'cursor-wait bg-black/5 dark:bg-white/5' : 'hover:bg-white dark:hover:bg-zinc-900 hover:border-[#E5E5E5] dark:hover:border-zinc-800'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {scan.status === 'scanning' ? (
                  <RefreshCw className="w-2.5 h-2.5 text-[#D4AF37] animate-spin" />
                ) : (
                  <span
                    className={`w-2 h-2 rounded-full block ${scan.score >= 80 ? "bg-[#27AE60]" : scan.score >= 50 ? "bg-[#F2994A]" : "bg-[#EB5757]"}`}
                  ></span>
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-medium text-[#1A1A1A] dark:text-zinc-100 truncate w-full group-hover:text-[#D4AF37] transition-colors">
                  {scan.url.replace(/^https?:\/\//, "")}
                </span>
                <span className="text-[9px] text-[#888] mt-0.5">
                  {scan.status === 'scanning' ? `Scan läuft (${scan.progress || 0}%)` : scan.date}
                </span>
              </div>
            </button>
          ))
        ) : (
          <span className="text-[10px] text-[#888] italic px-2 py-1">
            Keine Scans gefunden.
          </span>
        )}
      </div>
    </div>
  );
}
