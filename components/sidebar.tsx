"use client";

import React, { useState, useEffect, memo } from "react";
import { useAuth } from "./auth-provider";
import { usePathname } from "next/navigation";
import {
  Menu,
  Zap,
} from "lucide-react";
import Image from "next/image";
import { ThemeToggle } from "./theme-toggle";
import { Notification, Project, HistoryItem } from "../types/common";

// Sub-Components
import { SidebarNotifications } from "./sidebar/notifications-popover";
import { SidebarAuthView } from "./sidebar/auth-view";
import { SidebarProjects } from "./sidebar/projects-view";
import { SidebarHistory } from "./sidebar/history-view";
import { SidebarAccountMenu } from "./sidebar/account-menu";

export const Sidebar = memo(function Sidebar({
  onLoadReport,
  onSelectProject,
  onOpenSettings,
  onOpenTeam,
  onOpenProfile,
  onOpenPricing,
  onLogout,
  notifications,
  setNotifications,
  isNotifOpen,
  setIsNotifOpen,
}: {
  onLoadReport?: (id: string) => void;
  onSelectProject?: (proj: Project) => void;
  onOpenSettings?: () => void;
  onOpenTeam?: () => void;
  onOpenProfile?: () => void;
  onOpenPricing?: () => void;
  onLogout?: () => void;
  notifications: Notification[];
  setNotifications: (notifs: Notification[]) => void;
  isNotifOpen: boolean;
  setIsNotifOpen: (open: boolean) => void;
}) {
  const { user, userData, loading } = useAuth();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Real DB States
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const onItemClick = (callback?: () => void) => {
    if (callback) callback();
    setIsCollapsed(true);
  };

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };


  useEffect(() => {
    if (!user) {
      setHistory([]);
      setProjects([]);
      setTeamId(null);
      return;
    }

    const fetchData = async () => {
      try {
        // 1. Fetch Reports
        const reportsRes = await fetch('/api/reports');
        if (reportsRes.ok) {
          const reportData = await reportsRes.json();
          const formatted: HistoryItem[] = reportData.map((docData: any) => {
            const dateObj = new Date(docData.createdAt);
            const today = new Date();
            const isToday =
              dateObj.getDate() === today.getDate() &&
              dateObj.getMonth() === today.getMonth() &&
              dateObj.getFullYear() === today.getFullYear();
            const dateStr = isToday
              ? `Heute, ${dateObj.getHours().toString().padStart(2, "0")}:${dateObj.getMinutes().toString().padStart(2, "0")}`
              : dateObj.toLocaleDateString("de-DE");

            return {
              id: docData.id,
              url: docData.url,
              score: docData.score || 0,
              date: dateStr,
              rawDate: dateObj,
            };
          });
          formatted.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
          setHistory(formatted);
        }

        // 2. Fetch Projects
        const projectsRes = await fetch('/api/projects');
        if (projectsRes.ok) {
          const projs = await projectsRes.json();
          const sorted = projs.map((p: any) => ({
            ...p,
            rawDate: new Date(p.createdAt)
          })).sort((a: any, b: any) => b.rawDate.getTime() - a.rawDate.getTime());
          setProjects(sorted.slice(0, 5));
        }

        // 3. Fetch Team
        const teamRes = await fetch('/api/teams');
        if (teamRes.ok) {
          const team = await teamRes.json();
          if (team) setTeamId(team.id);
        }
      } catch (err) {
        console.error("Sidebar data fetch error", err);
      }
    };

    fetchData();
  }, [user, pathname]);

  if (isCollapsed) {
    return (
      <aside className="fixed left-0 top-0 h-screen w-16 bg-[#F5F5F3] dark:bg-zinc-950 border-r border-[#E5E5E5] dark:border-zinc-800 flex flex-col z-50 transition-colors items-center py-6 shadow-sm">
        <button
          onClick={() => setIsCollapsed(false)}
          className="text-[#1A1A1A] dark:text-zinc-100 hover:text-[#D4AF37] transition-colors mb-auto"
          title="Sidebar ausklappen"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col gap-5 items-center mt-auto pb-8 w-full relative">
          {!loading && user && (
            <SidebarAccountMenu 
              onOpenProfile={onOpenProfile}
              onOpenSettings={onOpenSettings}
              onOpenTeam={onOpenTeam}
              onOpenPricing={onOpenPricing}
              onLogout={onLogout}
              onItemClick={onItemClick}
              isCollapsed={true}
            />
          )}

          <SidebarNotifications 
            notifications={notifications}
            setNotifications={setNotifications}
            isOpen={isNotifOpen}
            setIsOpen={setIsNotifOpen}
            align="left"
          />

          <ThemeToggle />
        </div>
      </aside>
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40 md:hidden"
        onClick={() => setIsCollapsed(true)}
      />
      <aside className="fixed left-0 top-0 h-screen w-72 bg-[#F5F5F3] dark:bg-zinc-950 border-r border-[#E5E5E5] dark:border-zinc-800 flex flex-col z-50 transition-colors shadow-2xl">
        <div className="p-5 flex justify-between items-start border-b border-[#E5E5E5] dark:border-zinc-800 shrink-0">
          <div>
            <h1 className="text-[18px] font-black uppercase tracking-tighter leading-none mb-1">
              Analyzer Pro
            </h1>
            <p className="text-[9px] text-[#888] font-bold uppercase tracking-widest">
              Enterprise Edition
            </p>
          </div>
          <button
            onClick={() => setIsCollapsed(true)}
            className="text-[#888] hover:text-[#1A1A1A] dark:hover:text-zinc-100 transition-colors bg-black/5 dark:bg-white/5 p-1 rounded-sm"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col scrollbar-thin relative">
          {successMessage && (
            <div className="absolute top-2 left-4 right-4 bg-[#27AE60] text-white py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-center shadow-lg animate-in fade-in slide-in-from-top-2 z-20">
              {successMessage}
            </div>
          )}

          {!loading && user ? (
            <>
              {/* USAGE AND TRIAL SECTION */}
              <div className="mx-4 mb-2 p-3 bg-white dark:bg-zinc-900 border border-[#E5E5E5] dark:border-zinc-800 rounded-sm flex flex-col gap-2 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#D4AF37]"></div>
                
                {(!userData?.plan || userData.plan === 'free') && (
                  <span className="text-[9px] font-black uppercase text-[#27AE60] tracking-widest flex items-center gap-1.5 mb-1">
                    <Zap className="w-3 h-3 animate-pulse" /> 7 Tage gratis testen
                  </span>
                )}
                
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                     <span className="text-[14px] font-black tracking-tighter text-[#1A1A1A] dark:text-zinc-100 leading-none">
                       {userData?.scanCount || 0} / {userData?.maxScans || 5}
                     </span>
                     <span className="text-[8px] font-bold text-[#888] uppercase tracking-widest">Scans genutzt</span>
                  </div>
                  <div className="w-full h-1 bg-black/5 dark:bg-white/5 overflow-hidden rounded-full">
                    <div 
                      className={`h-full transition-all duration-1000 rounded-full ${ ((userData?.scanCount || 0) / (userData?.maxScans || 5)) > 0.8 ? 'bg-[#EB5757]' : 'bg-[#D4AF37]' }`} 
                      style={{ width: `${Math.min(100, ((userData?.scanCount || 0) / (userData?.maxScans || 5)) * 100)}%` }}
                    />
                  </div>
                </div>

                {(!userData?.plan || userData.plan === 'free') && (
                  <button 
                    onClick={() => onItemClick(onOpenPricing)}
                    className="mt-1 text-[8px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100 hover:text-[#D4AF37] text-left transition-colors"
                  >
                    Vollzugriff freischalten →
                  </button>
                )}
              </div>

              <SidebarProjects 
                projects={projects}
                setProjects={setProjects}
                onSelectProject={onSelectProject}
                onItemClick={onItemClick}
                showSuccess={showSuccess}
                teamId={teamId}
              />

              <SidebarHistory 
                history={history}
                onLoadReport={onLoadReport}
                onItemClick={onItemClick}
              />
            </>
          ) : (
            <SidebarAuthView />
          )}

          {!loading && user && (
            <SidebarAccountMenu 
              onOpenProfile={onOpenProfile}
              onOpenSettings={onOpenSettings}
              onOpenTeam={onOpenTeam}
              onOpenPricing={onOpenPricing}
              onLogout={onLogout}
              onItemClick={onItemClick}
            />
          )}
        </div>

        <div className="p-4 border-t border-[#E5E5E5] dark:border-zinc-800 flex justify-between items-center shrink-0 relative">
          <ThemeToggle />
          
          <SidebarNotifications 
            notifications={notifications}
            setNotifications={setNotifications}
            isOpen={isNotifOpen}
            setIsOpen={setIsNotifOpen}
            align="right"
          />
        </div>
      </aside>
    </>
  );
});
