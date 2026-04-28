'use client';

import React, { useState } from 'react';
import { 
  User, Settings, Users, CreditCard, LifeBuoy, LogOut, ChevronUp, Star 
} from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '../auth-provider';
import { useTrial } from '../../hooks/use-trial';

interface SidebarAccountMenuProps {
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
  onOpenTeam?: () => void;
  onOpenPricing?: () => void;
  onLogout?: () => void;
  onItemClick: (callback?: () => void) => void;
  isCollapsed?: boolean;
}

export function SidebarAccountMenu({
  onOpenProfile,
  onOpenSettings,
  onOpenTeam,
  onOpenPricing,
  onLogout,
  onItemClick,
  isCollapsed
}: SidebarAccountMenuProps) {
  const { user, userData, logOut } = useAuth();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const { trialDaysLeft, showTrialBadge } = useTrial();

  if (!user) return null;

  return (
    <div className={isCollapsed ? "mt-auto relative w-full flex justify-center mb-2" : "border-t border-[#E5E5E5] dark:border-zinc-800 p-3 mt-auto shrink-0 bg-[#F5F5F3] dark:bg-zinc-950 relative"}>
      {isAccountMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-[60]"
            onClick={() => setIsAccountMenuOpen(false)}
          />
          <div className={`absolute shadow-2xl z-[70] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 bg-white dark:bg-zinc-900 border border-[#E5E5E5] dark:border-zinc-800 ${
            isCollapsed ? "bottom-0 left-full ml-4 w-56 mb-0" : "bottom-full left-4 right-4 mb-2"
          }`}>
            <div className="p-3 border-b border-[#F0F0F0] dark:border-zinc-800 bg-[#F9F9F9] dark:bg-zinc-950/50">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#888]">
                Account Menü
              </span>
            </div>
            <div className="flex flex-col py-1">
              <button
                onClick={() => {
                  onItemClick(onOpenProfile);
                  setIsAccountMenuOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-2.5 text-[11px] font-bold uppercase tracking-tight text-[#1A1A1A] dark:text-zinc-100 hover:bg-[#F5F5F3] dark:hover:bg-zinc-800 transition-colors text-left group"
              >
                <User className="w-4 h-4 text-[#888] group-hover:text-[#D4AF37]" />{" "}
                Profil
              </button>
              <button
                onClick={() => {
                  onItemClick(onOpenSettings);
                  setIsAccountMenuOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-2.5 text-[11px] font-bold uppercase tracking-tight text-[#1A1A1A] dark:text-zinc-100 hover:bg-[#F5F5F3] dark:hover:bg-zinc-800 transition-colors text-left group"
              >
                <Settings className="w-4 h-4 text-[#888] group-hover:text-[#D4AF37]" />{" "}
                Einstellungen
              </button>
              {userData?.plan === 'agency' && (
                <button
                  onClick={() => {
                    onItemClick(onOpenTeam);
                    setIsAccountMenuOpen(false);
                  }}
                  className="flex items-center gap-3 px-4 py-2.5 text-[11px] font-bold uppercase tracking-tight text-[#1A1A1A] dark:text-zinc-100 hover:bg-[#F5F5F3] dark:hover:bg-zinc-800 transition-colors text-left group"
                >
                  <Users className="w-4 h-4 text-[#888] group-hover:text-[#D4AF37]" />{" "}
                  Team Workspace
                </button>
              )}
              <button 
                onClick={() => {
                  onItemClick(onOpenPricing);
                  setIsAccountMenuOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-2.5 text-[11px] font-bold uppercase tracking-tight text-[#1A1A1A] dark:text-zinc-100 hover:bg-[#F5F5F3] dark:hover:bg-zinc-800 transition-colors text-left group"
              >
                <CreditCard className="w-4 h-4 text-[#888] group-hover:text-[#D4AF37]" />{" "}
                Abonnement
              </button>
              <button className="flex items-center gap-3 px-4 py-2.5 text-[11px] font-bold uppercase tracking-tight text-[#1A1A1A] dark:text-zinc-100 hover:bg-[#F5F5F3] dark:hover:bg-zinc-800 transition-colors text-left group border-b border-[#F0F0F0] dark:border-zinc-800">
                <LifeBuoy className="w-4 h-4 text-[#888] group-hover:text-[#D4AF37]" />{" "}
                Hilfe & Support
              </button>
              <button
                onClick={() => {
                  logOut();
                  onLogout?.();
                  setIsAccountMenuOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-3 text-[11px] font-black uppercase tracking-tighter text-[#EB5757] hover:bg-[#EB5757]/5 transition-colors text-left group"
              >
                <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />{" "}
                Abmelden
              </button>
            </div>
          </div>
        </>
      )}

      {!isCollapsed && showTrialBadge && (
        <div className="mx-2 mb-2 p-2 bg-[#D4AF37]/5 border border-[#D4AF37]/10 rounded-md">
           <div className="flex items-center justify-between mb-1">
              <span className="text-[8px] font-black uppercase tracking-[2px] text-[#D4AF37]">Testphase</span>
              <Star className="w-2.5 h-2.5 text-[#D4AF37] animate-pulse fill-[#D4AF37]/20" />
           </div>
           <div className="h-1 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#D4AF37] to-[#B8860B] transition-all duration-1000" 
                style={{ width: `${(trialDaysLeft / 7) * 100}%` }}
              ></div>
           </div>
           <p className="text-[9px] font-bold text-[#888] mt-1.5 uppercase tracking-tighter">
              Noch {trialDaysLeft} Tage <span className="text-[#D4AF37]">Premium</span>
           </p>
        </div>
      )}
      
      <button
        onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
        className={isCollapsed ? "relative rounded-full hover:opacity-80 transition-opacity" : `w-full flex items-center gap-3 p-2 rounded-md transition-all group ${isAccountMenuOpen ? "bg-white dark:bg-zinc-900 shadow-sm border border-[#E5E5E5] dark:border-zinc-800" : "hover:bg-black/5 dark:hover:bg-white/5 border border-transparent"}`}
      >
        {isCollapsed ? (
          <div className="relative">
            {user.photoURL ? (
              <Image
                src={user.photoURL}
                alt="Avatar"
                width={32}
                height={32}
                className="w-8 h-8 rounded-full shadow-sm border border-black/10 dark:border-white/10"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center font-bold text-[12px]">
                {user.email?.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#27AE60] border-2 border-[#F5F5F3] dark:border-zinc-950 rounded-full" />
          </div>
        ) : (
          <>
            <div className="relative shrink-0">
              {user.photoURL ? (
                <Image
                  src={user.photoURL}
                  alt="Avatar"
                  width={36}
                  height={36}
                  className="w-9 h-9 rounded-full shadow-sm border border-white dark:border-zinc-800"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center font-black text-[14px]">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#27AE60] border-2 border-[#F5F5F3] dark:border-zinc-950 rounded-full" />
            </div>

            <div className="flex flex-col overflow-hidden text-left flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[12px] font-black truncate text-[#1A1A1A] dark:text-zinc-100 uppercase tracking-tighter leading-none">
                  {user.displayName || "Nutzer"}
                </span>
                {userData?.plan && (
                  <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-[2px] leading-none tracking-widest ${
                    userData.plan === 'agency' ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border border-zinc-700 shadow-sm' :
                    userData.plan === 'pro' ? 'bg-[#D4AF37] text-white shadow-sm' :
                    'bg-[#F5F5F3] dark:bg-zinc-800 text-[#888]'
                  }`}>
                    {userData.plan}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-[#888] truncate font-medium">
                {user.email}
              </span>
            </div>

            <ChevronUp
              className={`w-4 h-4 text-[#AAA] transition-transform duration-300 ${isAccountMenuOpen ? "rotate-180" : ""}`}
            />
          </>
        )}
      </button>
    </div>
  );
}
