'use client';

import React from 'react';
import { Bell } from 'lucide-react';
import { Notification } from '../../types/common';

interface SidebarNotificationsProps {
  notifications: Notification[];
  setNotifications: (notifs: Notification[]) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  align?: 'left' | 'right';
}

export function SidebarNotifications({
  notifications,
  setNotifications,
  isOpen,
  setIsOpen,
  align = 'left'
}: SidebarNotificationsProps) {
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 bg-black/5 dark:bg-white/5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors relative"
        title="Benachrichtigungen"
      >
        <Bell className="w-5 h-5 text-[#1A1A1A] dark:text-zinc-100" />
        {notifications.some(n => !n.read) && (
          <span className="absolute top-0 right-0 w-3 h-3 bg-[#EB5757] border-2 border-[#F5F5F3] dark:border-zinc-950 rounded-full" />
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[105]" onClick={() => setIsOpen(false)} />
          <div className={`absolute bottom-full ${align === 'right' ? 'right-0' : 'left-full ml-4'} mb-4 w-72 bg-white dark:bg-zinc-900 border border-[#E5E5E5] dark:border-zinc-800 shadow-2xl z-[110] overflow-hidden origin-bottom-${align} animate-in fade-in zoom-in-95 duration-200 text-left`}>
            <div className="p-4 border-b border-[#E5E5E5] dark:border-zinc-800 flex justify-between items-center bg-[#F9F9F9] dark:bg-zinc-950/50">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-white">Benachrichtigungen</span>
              <button 
                onClick={() => setNotifications(notifications.map(n => ({...n, read: true})))}
                className="text-[9px] font-bold uppercase text-[#D4AF37] hover:underline"
              >
                Gelesen
              </button>
            </div>
            <div className="max-h-[300px] overflow-y-auto scrollbar-thin">
              {notifications.length > 0 ? (
                notifications.map(n => (
                  <div 
                    key={n.id} 
                    className={`p-4 border-b border-[#F0F0F0] dark:border-zinc-800 last:border-0 transition-colors ${!n.read ? 'bg-[#D4AF37]/5' : ''} hover:bg-[#F9F9F9] dark:hover:bg-zinc-800/30 font-sans`}
                  >
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <span className="text-[11px] font-black uppercase tracking-tight leading-none text-[#1A1A1A] dark:text-zinc-100">{n.title}</span>
                      <span className="text-[9px] text-[#888] font-bold whitespace-nowrap">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-[#555] dark:text-zinc-400 leading-[1.4] line-clamp-2">{n.message}</p>
                  </div>
                ))
              ) : (
                <div className="p-10 text-center flex flex-col items-center">
                  <Bell className="w-10 h-10 text-[#DDD] dark:text-zinc-800 mb-4 opacity-50" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#AAA]">Keine Nachrichten</p>
                </div>
              )}
            </div>
            {notifications.length > 0 && (
              <button 
                onClick={() => setNotifications([])}
                className="w-full py-3 bg-[#F5F5F3] dark:bg-zinc-950 text-[9px] font-black uppercase tracking-widest text-[#888] hover:text-[#EB5757] transition-colors border-t border-[#E5E5E5] dark:border-zinc-800"
              >
                Verlauf löschen
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
