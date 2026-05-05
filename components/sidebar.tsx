"use client";

import React, { useState, useEffect, memo } from "react";
import Link from "next/link";
import { useAuth } from "./auth-provider";
import { usePathname } from "next/navigation";
import {
  Activity,
  BrainCircuit,
  CreditCard,
  FileText,
  FolderKanban,
  Globe2,
  Grid2X2,
  LayoutDashboard,
  MapPin,
  Megaphone,
  Network,
  Menu,
  MessageCircle,
  Search,
  Settings,
  ShieldCheck,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { Notification, Project, HistoryItem } from "../types/common";
import { getMonthlyCrawlPageLimit, getMonthlyScanLimit } from "../lib/plans";
import { normalizeStoredReports } from "../lib/report-normalizer";
import { NAVIGATION_FLYOUTS, type NavigationFlyout } from "../lib/navigation-flyouts";

// Sub-Components
import { SidebarNotifications } from "./sidebar/notifications-popover";
import { SidebarAuthView } from "./sidebar/auth-view";
import { SidebarProjects } from "./sidebar/projects-view";
import { SidebarHistory } from "./sidebar/history-view";
import { SidebarAccountMenu } from "./sidebar/account-menu";

function CollapsedNavigationFlyout({
  flyout,
  onKeepOpen,
  onClose,
}: {
  flyout: NavigationFlyout;
  onKeepOpen: () => void;
  onClose: () => void;
}) {
  return (
    <div
      onMouseEnter={onKeepOpen}
      onMouseLeave={onClose}
      className="fixed left-[72px] top-14 z-[70] hidden h-[calc(100vh-3.5rem)] w-[320px] overflow-y-auto border-r border-[#dfe3ea] bg-white px-5 py-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 md:block"
    >
      <Link
        href={flyout.href}
        className="mb-5 block text-[18px] font-black text-[#172033] transition-colors hover:text-[#0b7de3] dark:text-zinc-100"
      >
        {flyout.title}
      </Link>

      <div className="space-y-6">
        {flyout.sections.map((section) => (
          <section key={section.label}>
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-[#7b8495]">
              {section.label}
            </p>
            <div className="grid gap-1">
              {section.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center justify-between gap-3 rounded-sm px-3 py-2 text-[14px] font-semibold leading-tight text-[#172033] transition-colors hover:bg-[#f4f6fb] hover:text-[#0b7de3] dark:text-zinc-100 dark:hover:bg-zinc-900"
                >
                  <span>{link.label}</span>
                  {link.badge && (
                    <span className="rounded-sm bg-[#ff5c35] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">
                      {link.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export const Sidebar = memo(function Sidebar({
  onLoadReport,
  onSelectProject,
  onOpenDashboard,
  onOpenProjects,
  onOpenProjectTab,
  onOpenSettings,
  onOpenTeam,
  onOpenProfile,
  onOpenPricing,
  onOpenHome,
  onLogout,
  activeSection,
  notifications,
  setNotifications,
  isNotifOpen,
  setIsNotifOpen,
}: {
  onLoadReport?: (id: string) => void;
  onSelectProject?: (proj: Project) => void;
  onOpenDashboard?: () => void;
  onOpenProjects?: () => void;
  onOpenProjectTab?: (tab: string) => void;
  onOpenSettings?: () => void;
  onOpenTeam?: () => void;
  onOpenProfile?: () => void;
  onOpenPricing?: () => void;
  onOpenHome?: () => void;
  onLogout?: () => void;
  activeSection?: string;
  notifications: Notification[];
  setNotifications: (notifs: Notification[]) => void;
  isNotifOpen: boolean;
  setIsNotifOpen: (open: boolean) => void;
}) {
  const { user, userData, loading } = useAuth();
  const scanLimitMonthly = getMonthlyScanLimit(userData?.plan || 'free');
  const scanCount = userData?.scanCount || 0;
  const scanUsageRatio = scanLimitMonthly > 0 ? scanCount / scanLimitMonthly : 0;
  const crawlPagesLimitMonthly = getMonthlyCrawlPageLimit(userData?.plan || 'free');
  const crawlPagesCount = userData?.crawlPagesCount || 0;
  const crawlUsageRatio = crawlPagesLimitMonthly > 0 ? crawlPagesCount / crawlPagesLimitMonthly : 0;
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [hoveredFlyoutId, setHoveredFlyoutId] = useState<string | null>(null);

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

  const mainNavItems = [
    { id: 'home', label: 'Home', icon: LayoutDashboard, action: onOpenHome },
    { id: 'seo', label: 'SEO', icon: Search, action: onOpenDashboard },
    { id: 'audit', label: 'Audit', icon: ShieldCheck, action: () => { onOpenProjectTab?.('audit'); } },
    { id: 'ai_visibility', label: 'KI', icon: BrainCircuit, action: () => { onOpenProjectTab?.('ai_visibility'); } },
    { id: 'traffic', label: 'Traffic', icon: Activity, action: () => { onOpenProjectTab?.('rankings'); } },
    { id: 'content', label: 'Content', icon: FileText, action: () => { onOpenProjectTab?.('keywords'); } },
    { id: 'linking', label: 'Links', icon: Network, action: () => { onOpenProjectTab?.('linking'); } },
    { id: 'competition', label: 'Markt', icon: Trophy, action: () => { onOpenProjectTab?.('competition'); } },
    { id: 'monitoring', label: 'Monitor', icon: Globe2, action: () => { onOpenProjectTab?.('monitoring'); } },
    { id: 'reports', label: 'Reports', icon: FileText, action: () => { onOpenProjectTab?.('reports'); } },
    { id: 'projects', label: 'Projekte', icon: FolderKanban, action: onOpenProjects },
    { id: 'team', label: 'Team', icon: Users, action: onOpenTeam },
    { id: 'billing', label: 'Preise', icon: CreditCard, action: onOpenPricing },
    { id: 'settings', label: 'Setup', icon: Settings, action: onOpenSettings },
  ];

  const openHref = (href: string) => {
    window.location.assign(href);
  };

  const collapsedNavItems: Array<{
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    action?: () => void;
    href?: string;
    flyoutId?: string;
  }> = [
    { id: 'home', label: 'Home', icon: LayoutDashboard, action: onOpenHome },
    { id: 'seo', label: 'SEO', icon: Search, href: '/tools/seo', flyoutId: 'seo' },
    { id: 'ki', label: 'KI', icon: BrainCircuit, href: '/tools/ki', flyoutId: 'ki' },
    { id: 'traffic-markt', label: 'Traffic & Markt', icon: Activity, href: '/tools/traffic-markt', flyoutId: 'traffic-markt' },
    { id: 'local', label: 'Local', icon: MapPin, href: '/tools/local', flyoutId: 'local' },
    { id: 'content', label: 'Content', icon: FileText, href: '/tools/content', flyoutId: 'content' },
    { id: 'social', label: 'Social', icon: MessageCircle, href: '/tools/social', flyoutId: 'social' },
    { id: 'anzeigen', label: 'Anzeigen', icon: Megaphone, href: '/tools/anzeigen', flyoutId: 'anzeigen' },
    { id: 'ki-pr', label: 'KI-PR', icon: Zap, href: '/tools/ki-pr', flyoutId: 'ki-pr' },
    { id: 'berichte', label: 'Berichte', icon: FileText, href: '/tools/berichte', flyoutId: 'berichte' },
    { id: 'app-center', label: 'App Center', icon: Grid2X2, href: '/projekte', flyoutId: 'app-center' },
  ];

  const activeFlyout = hoveredFlyoutId ? NAVIGATION_FLYOUTS[hoveredFlyoutId] : null;


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
          const formatted: HistoryItem[] = normalizeStoredReports(reportData).map((docData: any) => {
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
              status: docData.status,
              progress: docData.progress
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
      <>
        <aside className="fixed left-0 top-14 z-50 hidden h-[calc(100vh-3.5rem)] w-[72px] flex-col items-center border-r border-[#dfe3ea] bg-[#f4f6fb] py-3 text-[#5f6b7a] shadow-sm transition-colors dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 md:flex">
          <nav className="flex w-full flex-1 flex-col items-center gap-1 overflow-y-auto px-1 pb-3">
            {collapsedNavItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                activeSection === item.id ||
                pathname === item.href ||
                Boolean(item.href && pathname?.startsWith(`${item.href}/`)) ||
                (activeSection === 'analyzer' && item.id === 'seo') ||
                (activeSection === 'project' && item.id === 'app-center') ||
                (activeSection === 'projects' && item.id === 'app-center');
              return (
                <button
                  key={item.id}
                  onMouseEnter={() => setHoveredFlyoutId(item.flyoutId || null)}
                  onFocus={() => setHoveredFlyoutId(item.flyoutId || null)}
                  onClick={() => {
                    if ('action' in item && item.action) {
                      onItemClick(item.action);
                      return;
                    }
                    if (item.href) openHref(item.href);
                  }}
                  title={item.label}
                  className={`group flex min-h-[54px] w-full flex-col items-center justify-center gap-1 rounded-md px-1 py-2 text-center text-[10px] font-bold transition-colors ${
                    isActive
                      ? 'bg-white text-[#0b7de3] shadow-sm dark:bg-zinc-900 dark:text-[#D4AF37]'
                      : 'hover:bg-white hover:text-[#172033] dark:hover:bg-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-[#D4AF37]' : ''}`} />
                  <span className="max-w-full leading-[1.05]">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex w-full flex-col items-center gap-3 border-t border-[#dfe3ea] px-2 pt-3 dark:border-zinc-800">
            <button
              onClick={() => setIsCollapsed(false)}
              className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-[#172033] shadow-sm transition-colors hover:text-[#D4AF37] dark:bg-zinc-900 dark:text-zinc-100"
              title="Workspace ausklappen"
            >
              <Menu className="w-5 h-5" />
            </button>

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

        {activeFlyout && (
          <CollapsedNavigationFlyout
            flyout={activeFlyout}
            onKeepOpen={() => setHoveredFlyoutId(hoveredFlyoutId)}
            onClose={() => setHoveredFlyoutId(null)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40 md:hidden"
        onClick={() => setIsCollapsed(true)}
      />
      <aside className="fixed left-0 top-14 z-50 flex h-[calc(100vh-3.5rem)] w-72 flex-col border-r border-[#dfe3ea] bg-[#f4f6fb] shadow-2xl transition-colors dark:border-zinc-800 dark:bg-zinc-950">
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
              <nav className="px-4 pt-4 pb-3 border-b border-[#E5E5E5] dark:border-zinc-800 mb-4">
                <span className="text-[9px] font-black text-[#888] uppercase tracking-[3px] mb-3 block">Hauptnavigation</span>
                <div className="flex flex-col gap-1">
                  {mainNavItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => onItemClick(item.action)}
                        className="group flex items-center gap-3 px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#777] hover:text-[#1A1A1A] dark:hover:text-zinc-100 hover:bg-black/5 dark:hover:bg-white/5 transition-all text-left"
                      >
                        <Icon className="w-4 h-4 text-[#888] group-hover:text-[#D4AF37] transition-colors" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </nav>

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
                       {scanCount} / {scanLimitMonthly}
                     </span>
                     <span className="text-[8px] font-bold text-[#888] uppercase tracking-widest">Scans genutzt</span>
                  </div>
                  <div className="w-full h-1 bg-black/5 dark:bg-white/5 overflow-hidden rounded-full">
                     <div
                       className={`h-full transition-all duration-1000 rounded-full ${ scanUsageRatio > 0.8 ? 'bg-[#EB5757]' : 'bg-[#D4AF37]' }`}
                      style={{ width: `${Math.min(100, scanUsageRatio * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                     <span className="text-[13px] font-black tracking-tighter text-[#1A1A1A] dark:text-zinc-100 leading-none">
                       {crawlPagesCount} / {crawlPagesLimitMonthly}
                     </span>
                     <span className="text-[8px] font-bold text-[#888] uppercase tracking-widest">Crawl-Seiten</span>
                  </div>
                  <div className="w-full h-1 bg-black/5 dark:bg-white/5 overflow-hidden rounded-full">
                     <div
                       className={`h-full transition-all duration-1000 rounded-full ${ crawlUsageRatio > 0.8 ? 'bg-[#EB5757]' : 'bg-[#27AE60]' }`}
                      style={{ width: `${Math.min(100, crawlUsageRatio * 100)}%` }}
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
