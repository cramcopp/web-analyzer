"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "./auth-provider";
import {
  LogOut,
  LogIn,
  Menu,
  User,
  Users,
  Plus,
  Search,
  HelpCircle,
  History,
  ChevronDown,
  ChevronRight,
  Folder,
  FileText,
  Globe,
  Zap,
  CheckCircle,
  X,
  Trash2,
  Edit3,
  Save,
  AlertTriangle,
  Settings,
  CreditCard,
  ChevronUp,
  LifeBuoy,
  Star,
  Bell,
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";


const isValidUrl = (urlString: string) => {
  if (!urlString) return true; // Empty URL is allowed as a placeholder
  try {
    const url = new URL(urlString);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

export function Sidebar({
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
  onSelectProject?: (proj: any) => void;
  onOpenSettings?: () => void;
  onOpenTeam?: () => void;
  onOpenProfile?: () => void;
  onOpenPricing?: () => void;
  onLogout?: () => void;
  notifications: any[];
  setNotifications: (notifs: any[]) => void;
  isNotifOpen: boolean;
  setIsNotifOpen: (open: boolean) => void;
}) {
  const { user, userData, loading, error, signIn, signInEmail, signUpEmail, logOut } =
    useAuth();
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Trial Logic
  const isInTrial = userData?.trialUntil && new Date(userData.trialUntil) > new Date();
  const trialDaysLeft = userData?.trialUntil 
    ? Math.max(0, Math.ceil((new Date(userData.trialUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Auth view states
  const [authMode, setAuthMode] = useState<"google" | "email" | "signup">(
    "google",
  );
  const [authEmail, setAuthEmail] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [authName, setAuthName] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Real DB States
  const [history, setHistory] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [teamId, setTeamId] = useState<string | null>(null);

  // States for History Section
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [searchHistory, setSearchHistory] = useState("");

  // States for Project Creation
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectUrl, setNewProjectUrl] = useState("");

  // States for Editing/Deleting
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // User Account Menu
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  const onItemClick = (callback?: () => void) => {
    if (callback) callback();
    setIsCollapsed(true);
  };

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !user) return;

    if (newProjectUrl.trim() && !isValidUrl(newProjectUrl.trim())) {
      setValidationError("Ungültige URL (http:// oder https://)");
      return;
    }

    try {
      const resp = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName.trim(),
          url: newProjectUrl.trim(),
          teamId: teamId
        })
      });
      
      if (!resp.ok) throw new Error("Failed to create project");

      setNewProjectName("");
      setNewProjectUrl("");
      setIsCreatingProject(false);
      setValidationError(null);
      showSuccess("Projekt erstellt");
      
      // Re-fetch projects
      const projRes = await fetch('/api/projects');
      if (projRes.ok) setProjects(await projRes.json());
    } catch (e) {
      console.error("Failed to create project", e);
    }

  };

  const handleUpdateProject = async (id: string) => {
    if (!editName.trim()) {
      setValidationError("Name darf nicht leer sein");
      return;
    }
    if (editUrl.trim() && !isValidUrl(editUrl.trim())) {
      setValidationError("Ungültige URL (http:// oder https://)");
      return;
    }

    try {
      const resp = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          url: editUrl.trim(),
        })
      });
      
      if (!resp.ok) throw new Error("Failed to update project");

      setEditingProjectId(null);
      setValidationError(null);
      showSuccess("Projekt erfolgreich aktualisiert");
      
      // Re-fetch project list
      const projRes = await fetch('/api/projects');
      if (projRes.ok) setProjects(await projRes.json());
    } catch (e) {
      console.error("Failed to update project", e);
    }

  };

  const handleDeleteProject = async (id: string) => {
    try {
      const resp = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (!resp.ok) throw new Error("Failed to delete project");
      
      setConfirmDeleteId(null);
      showSuccess("Projekt gelöscht");
      
      const projRes = await fetch('/api/projects');
      if (projRes.ok) setProjects(await projRes.json());
    } catch (e) {
      console.error("Failed to delete project", e);
    }

  };

  const startEditing = (proj: any) => {
    setEditingProjectId(proj.id);
    setEditName(proj.name);
    setEditUrl(proj.url || "");
    setValidationError(null);
  };

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsAuthLoading(true);
    try {
      if (authMode === "email") {
        await signInEmail(authEmail, authPass);
      } else {
        await signUpEmail(authEmail, authPass, authName);
      }
      setAuthMode("google");
      setAuthEmail("");
      setAuthPass("");
      setAuthName("");
    } catch (err: any) {
      setAuthError(err.message || "Authentifizierung fehlgeschlagen");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const fetchedForRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      setHistory([]);
      setProjects([]);
      setTeamId(null);
      fetchedForRef.current = null;
      return;
    }
    
    // Antigravity: Prevent infinite loop/multiple fetches
    if (fetchedForRef.current === user.uid) return;
    fetchedForRef.current = user.uid;

    const fetchData = async () => {
      try {
        // 1. Fetch Reports
        const reportsRes = await fetch('/api/reports');
        if (reportsRes.ok) {
          const reportData = await reportsRes.json();
          const formatted = reportData.map((docData: any) => {
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
          formatted.sort((a: any, b: any) => b.rawDate.getTime() - a.rawDate.getTime());
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

  }, [user]);

  const filteredHistory = history.filter((h) =>
    h.url.toLowerCase().includes(searchHistory.toLowerCase()),
  );
  const displayedHistory = isHistoryExpanded
    ? filteredHistory
    : filteredHistory.slice(0, 3);

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
            <div className="mb-2">
              {user.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoURL}
                  alt="Avatar"
                  className="w-8 h-8 rounded-full shadow-sm border border-black/10 dark:border-white/10"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center font-bold text-[12px]">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          )}

          <div className="relative">
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="p-2 text-[#1A1A1A] dark:text-zinc-100 hover:text-[#D4AF37] transition-colors relative"
              title="Benachrichtigungen"
            >
              <Bell className="w-5 h-5" />
              {notifications.some(n => !n.read) && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#EB5757] border-2 border-[#F5F5F3] dark:border-zinc-950 rounded-full" />
              )}
            </button>

            {isNotifOpen && (
              <>
                <div className="fixed inset-0 z-[105]" onClick={() => setIsNotifOpen(false)} />
                <div className="absolute bottom-0 left-full ml-4 w-72 bg-white dark:bg-zinc-900 border border-[#E5E5E5] dark:border-zinc-800 shadow-2xl z-[110] overflow-hidden origin-bottom-left animate-in fade-in zoom-in-95 duration-200 text-left">
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
                </div>
              </>
            )}
          </div>

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
          {/* SUCCESS MESSAGE TOAST */}
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
                       {userData.scanCount || 0} / {userData.maxScans || 5}
                     </span>
                     <span className="text-[8px] font-bold text-[#888] uppercase tracking-widest">Scans genutzt</span>
                  </div>
                  <div className="w-full h-1 bg-black/5 dark:bg-white/5 overflow-hidden rounded-full">
                    <div 
                      className={`h-full transition-all duration-1000 rounded-full ${ ((userData.scanCount || 0) / (userData.maxScans || 5)) > 0.8 ? 'bg-[#EB5757]' : 'bg-[#D4AF37]' }`} 
                      style={{ width: `${Math.min(100, ((userData.scanCount || 0) / (userData.maxScans || 5)) * 100)}%` }}
                    />
                  </div>
                </div>

                {(!userData?.plan || userData.plan === 'free') && (
                  <button 
                    onClick={() => {
                      onItemClick(onOpenPricing);
                    }}
                    className="mt-1 text-[8px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100 hover:text-[#D4AF37] text-left transition-colors"
                  >
                    Vollzugriff freischalten →
                  </button>
                )}
              </div>

              {/* PROJEKTE SEKTION */}
              <div className="px-4 py-5 border-b border-[#E5E5E5] dark:border-zinc-800">
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-[10px] uppercase font-black text-[#888] tracking-widest flex items-center gap-1.5">
                    <Folder className="w-3 h-3" /> Projekte
                  </span>
                  <button
                    title="Neues Projekt erstellen"
                    onClick={() => {
                      setIsCreatingProject(!isCreatingProject);
                      setValidationError(null);
                    }}
                    className="text-[#888] hover:text-[#1A1A1A] dark:hover:text-zinc-100 hover:bg-black/5 dark:hover:bg-white/5 p-1 rounded-sm transition-colors"
                  >
                    {isCreatingProject ? (
                      <X className="w-3 h-3" />
                    ) : (
                      <Plus className="w-3 h-3" />
                    )}
                  </button>
                </div>

                {isCreatingProject && (
                  <div className="mb-4 px-2 py-3 bg-black/5 dark:bg-white/5 rounded-md border border-dashed border-[#D4AF37]/50 flex flex-col gap-2">
                    <span className="text-[9px] uppercase font-bold text-[#888]">
                      Projekt anlegen
                    </span>
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="Name (z.B. Müller GmbH)"
                      className="w-full bg-white dark:bg-zinc-900 border border-[#E5E5E5] dark:border-zinc-800 rounded-sm py-1.5 px-2 text-[11px] outline-none focus:border-[#D4AF37] transition-colors"
                      autoFocus
                    />
                    <input
                      type="text"
                      value={newProjectUrl}
                      onChange={(e) => setNewProjectUrl(e.target.value)}
                      placeholder="URL (https://...)"
                      className="w-full bg-white dark:bg-zinc-900 border border-[#E5E5E5] dark:border-zinc-800 rounded-sm py-1.5 px-2 text-[11px] outline-none focus:border-[#D4AF37] transition-colors"
                    />
                    {validationError && (
                      <p className="text-[9px] text-[#EB5757] font-bold mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-2.5 h-2.5" />{" "}
                        {validationError}
                      </p>
                    )}
                    <div className="flex justify-end gap-2 mt-1">
                      <button
                        onClick={() => {
                          setIsCreatingProject(false);
                          setValidationError(null);
                        }}
                        className="text-[9px] uppercase font-bold text-[#888] hover:text-[#1A1A1A] transition-colors"
                      >
                        Abbrechen
                      </button>
                      <button
                        onClick={handleCreateProject}
                        className="text-[9px] uppercase font-bold text-white bg-[#D4AF37] px-3 py-1 rounded-sm hover:opacity-80 transition-opacity"
                      >
                        Erstellen
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {projects.length > 0
                    ? projects.map((proj) => (
                        <div key={proj.id} className="group relative">
                          {editingProjectId === proj.id ? (
                            <div className="p-2 bg-white dark:bg-zinc-900 border border-[#D4AF37] rounded-md flex flex-col gap-2 shadow-sm">
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full bg-transparent border-b border-[#EEE] dark:border-zinc-800 py-1 text-[11px] font-bold outline-none"
                                autoFocus
                              />
                              <input
                                type="text"
                                value={editUrl}
                                onChange={(e) => setEditUrl(e.target.value)}
                                className="w-full bg-transparent border-b border-[#EEE] dark:border-zinc-800 py-1 text-[11px] outline-none"
                                placeholder="https://..."
                              />
                              {validationError && (
                                <p className="text-[9px] text-[#EB5757] font-bold flex items-center gap-1">
                                  <AlertTriangle className="w-2.5 h-2.5" />{" "}
                                  {validationError}
                                </p>
                              )}
                              <div className="flex justify-end gap-3 mt-1">
                                <button
                                  onClick={() => setEditingProjectId(null)}
                                  className="text-[9px] font-bold uppercase text-[#888]"
                                >
                                  Abbruch
                                </button>
                                <button
                                  onClick={() => handleUpdateProject(proj.id)}
                                  className="text-[9px] font-bold uppercase text-[#27AE60] flex items-center gap-1"
                                >
                                  <Save className="w-3 h-3" /> Speichern
                                </button>
                              </div>
                            </div>
                          ) : confirmDeleteId === proj.id ? (
                            <div className="p-3 bg-[#EB5757]/5 border border-[#EB5757]/20 rounded-md flex flex-col items-center text-center">
                              <AlertTriangle className="w-5 h-5 text-[#EB5757] mb-2" />
                              <span className="text-[10px] font-bold uppercase mb-2 text-[#EB5757]">
                                Projekt löschen?
                              </span>
                              <div className="flex gap-4">
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="text-[9px] font-bold uppercase text-[#888]"
                                >
                                  Nein
                                </button>
                                <button
                                  onClick={() => handleDeleteProject(proj.id)}
                                  className="text-[9px] font-bold uppercase text-[#EB5757] underline"
                                >
                                  Ja, löschen
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              onClick={() => onItemClick(() => onSelectProject?.(proj))}
                              className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-white dark:hover:bg-zinc-900 border border-transparent hover:border-[#E5E5E5] dark:border-zinc-800 transition-all text-left group cursor-pointer"
                            >
                              <span className="w-6 h-6 rounded bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
                                <Folder className="w-3 h-3 text-[#888]" />
                              </span>
                              <div className="flex flex-col flex-1 min-w-0">
                                <span className="text-[11px] font-bold text-[#1A1A1A] dark:text-zinc-100 uppercase tracking-wide truncate">
                                  {proj.name}
                                </span>
                                {proj.url && (
                                  <span className="text-[9px] text-[#888] truncate">
                                    {proj.url.replace(/^https?:\/\//, "")}
                                  </span>
                                )}
                              </div>

                              {/* Hover Actions */}
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditing(proj);
                                  }}
                                  className="p-1 hover:bg-[#D4AF37]/10 rounded transition-colors text-[#888] hover:text-[#D4AF37]"
                                  title="Bearbeiten"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDeleteId(proj.id);
                                  }}
                                  className="p-1 hover:bg-[#EB5757]/10 rounded transition-colors text-[#888] hover:text-[#EB5757]"
                                  title="Löschen"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    : !isCreatingProject && (
                        <button
                          onClick={() => setIsCreatingProject(true)}
                          className="w-full text-left flex items-center gap-2 p-2 rounded-md hover:bg-white dark:hover:bg-zinc-900 border border-dashed border-[#E5E5E5] dark:border-zinc-800 transition-colors opacity-70 hover:opacity-100"
                        >
                          <span className="w-6 h-6 rounded flex items-center justify-center shrink-0">
                            <Plus className="w-3 h-3 text-[#888]" />
                          </span>
                          <span className="text-[10px] font-bold text-[#888] uppercase tracking-wide">
                            Neues Projekt
                          </span>
                        </button>
                      )}
                </div>
              </div>

              {/* VERLAUF SEKTION */}
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
                        onClick={() => onItemClick(() => onLoadReport?.(scan.id))}
                        className="w-full text-left flex items-start gap-2 p-2 rounded-md hover:bg-white dark:hover:bg-zinc-900 border border-transparent hover:border-[#E5E5E5] dark:hover:border-zinc-800 transition-colors group"
                      >
                        <div className="shrink-0 mt-0.5">
                          <span
                            className={`w-2 h-2 rounded-full block ${scan.score >= 80 ? "bg-[#27AE60]" : scan.score >= 50 ? "bg-[#F2994A]" : "bg-[#EB5757]"}`}
                          ></span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] font-medium text-[#1A1A1A] dark:text-zinc-100 truncate w-full group-hover:text-[#D4AF37] transition-colors">
                            {scan.url.replace(/^https?:\/\//, "")}
                          </span>
                          <span className="text-[9px] text-[#888] mt-0.5">
                            {scan.date}
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
            </>
          ) : (
            // LOGGED OUT STATE
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-[#1A1A1A]/[0.02] dark:bg-white/[0.02] overflow-y-auto">
              <div className="w-12 h-12 rounded-full bg-[#E5E5E5] dark:bg-zinc-800 flex items-center justify-center mb-4 shrink-0">
                <Zap className="w-6 h-6 text-[#888]" />
              </div>
              <h3 className="text-[14px] font-black tracking-tighter uppercase text-[#1A1A1A] dark:text-zinc-100 mb-2">
                Analyzer Pro freischalten
              </h3>
              <p className="text-[10px] text-[#888] leading-relaxed mb-6 max-w-[200px]">
                Melde dich an, um deinen Scan-Verlauf zu speichern und Projekte
                anzulegen.
              </p>

              {authMode === "google" ? (
                <div className="w-full flex flex-col gap-3">
                  <button
                    onClick={signIn}
                    className="bg-[#1A1A1A] dark:bg-zinc-100 hover:bg-[#D4AF37] dark:hover:bg-[#D4AF37] text-white dark:text-zinc-900 w-full py-2.5 px-4 rounded-sm transition-colors flex items-center justify-center gap-2 group"
                  >
                    <LogIn className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-[9px] uppercase font-bold tracking-widest text-center">
                      Mit Google Einloggen
                    </span>
                  </button>
                  <div className="flex items-center gap-2 py-2">
                    <div className="h-px bg-[#DDD] dark:bg-zinc-800 flex-1" />
                    <span className="text-[9px] text-[#AAA] font-bold uppercase">
                      oder E-Mail
                    </span>
                    <div className="h-px bg-[#DDD] dark:bg-zinc-800 flex-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setAuthMode("email")}
                      className="border border-[#1A1A1A] dark:border-zinc-100 text-[#1A1A1A] dark:text-zinc-100 hover:bg-black/5 dark:hover:bg-white/5 w-full py-2 px-2 rounded-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <span className="text-[8px] uppercase font-bold tracking-wider">Einloggen</span>
                    </button>
                    <button
                      onClick={() => setAuthMode("signup")}
                      className="bg-black/5 dark:bg-white/5 text-[#1A1A1A] dark:text-zinc-100 hover:bg-[#D4AF37] hover:text-white dark:hover:text-zinc-900 w-full py-2 px-2 rounded-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-3 h-3" />
                      <span className="text-[8px] uppercase font-bold tracking-wider">Registrieren</span>
                    </button>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={handleAuthAction}
                  className="w-full flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
                >
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#888] mb-1">
                    {authMode === "email" ? "Anmelden" : "Registrieren"}
                  </span>

                  {authMode === "signup" && (
                    <input
                      type="text"
                      placeholder="Anzeigename"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      required
                      className="w-full bg-white dark:bg-zinc-900 border border-[#E5E5E5] dark:border-zinc-800 rounded-sm py-2 px-3 text-[11px] outline-none focus:border-[#D4AF37] transition-colors"
                    />
                  )}

                  <input
                    type="email"
                    placeholder="E-Mail"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    required
                    className="w-full bg-white dark:bg-zinc-900 border border-[#E5E5E5] dark:border-zinc-800 rounded-sm py-2 px-3 text-[11px] outline-none focus:border-[#D4AF37] transition-colors"
                  />
                  <input
                    type="password"
                    placeholder="Passwort"
                    value={authPass}
                    onChange={(e) => setAuthPass(e.target.value)}
                    required
                    className="w-full bg-white dark:bg-zinc-900 border border-[#E5E5E5] dark:border-zinc-800 rounded-sm py-2 px-3 text-[11px] outline-none focus:border-[#D4AF37] transition-colors"
                  />

                  <button
                    type="submit"
                    disabled={isAuthLoading}
                    className="bg-[#1A1A1A] dark:bg-zinc-100 hover:bg-[#D4AF37] dark:hover:bg-[#D4AF37] text-white dark:text-zinc-900 w-full py-2.5 px-4 rounded-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isAuthLoading ? (
                      <Zap className="w-3 h-3 animate-pulse" />
                    ) : (
                      <LogIn className="w-3 h-3" />
                    )}
                    <span className="text-[9px] uppercase font-bold tracking-widest">
                      {authMode === "email" ? "Einloggen" : "Registrieren"}
                    </span>
                  </button>

                  <div className="flex flex-col gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() =>
                        setAuthMode(authMode === "email" ? "signup" : "email")
                      }
                      className="text-[9px] font-bold uppercase text-[#888] hover:text-[#1A1A1A] dark:hover:text-zinc-100 transition-colors"
                    >
                      {authMode === "email"
                        ? "Noch kein Account? Hier registrieren"
                        : "Bereits einen Account? Hier einloggen"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode("google")}
                      className="text-[9px] font-black uppercase text-[#D4AF37] hover:underline"
                    >
                      Zurück zur Auswahl
                    </button>
                  </div>
                </form>
              )}

              {(error || authError) && (
                <div className="mt-4 px-3 py-2 bg-[#EB5757]/10 border border-[#EB5757]/20 rounded-md w-full">
                  <p className="text-[9px] text-[#EB5757] font-medium leading-[1.4]">
                    {error || authError}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* USER ACCOUNT SECTION (STREAMLINED) */}
          {!loading && user && (
            <div className="border-t border-[#E5E5E5] dark:border-zinc-800 p-3 mt-auto shrink-0 bg-[#F5F5F3] dark:bg-zinc-950 relative">
              {/* ACCOUNT POPOVER MENU */}
              {isAccountMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-[60]"
                    onClick={() => setIsAccountMenuOpen(false)}
                  />
                  <div className="absolute bottom-full left-4 right-4 mb-2 bg-white dark:bg-zinc-900 border border-[#E5E5E5] dark:border-zinc-800 shadow-2xl z-[70] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
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

              {/* Trial Countdown Indicator */}
              {isInTrial && (!userData?.plan || userData.plan === 'free') && (
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
                className={`w-full flex items-center gap-3 p-2 rounded-md transition-all group ${isAccountMenuOpen ? "bg-white dark:bg-zinc-900 shadow-sm border border-[#E5E5E5] dark:border-zinc-800" : "hover:bg-black/5 dark:hover:bg-white/5 border border-transparent"}`}
              >
                <div className="relative shrink-0">
                  {user.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.photoURL}
                      alt="Avatar"
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
              </button>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[#E5E5E5] dark:border-zinc-800 flex justify-between items-center shrink-0 relative">
          <ThemeToggle />
          
          <div className="relative">
            <button 
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="p-2.5 bg-black/5 dark:bg-white/5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors relative"
              title="Benachrichtigungen"
            >
              <Bell className="w-5 h-5 text-[#1A1A1A] dark:text-zinc-100" />
              {notifications.some(n => !n.read) && (
                <span className="absolute top-0 right-0 w-3 h-3 bg-[#EB5757] border-2 border-[#F5F5F3] dark:border-zinc-950 rounded-full" />
              )}
            </button>

            {isNotifOpen && (
              <>
                <div className="fixed inset-0 z-[105]" onClick={() => setIsNotifOpen(false)} />
                <div className="absolute bottom-full right-0 mb-4 w-72 bg-white dark:bg-zinc-900 border border-[#E5E5E5] dark:border-zinc-800 shadow-2xl z-[110] overflow-hidden origin-bottom-right animate-in fade-in zoom-in-95 duration-200 text-left">
                  <div className="p-4 border-b border-[#E5E5E5] dark:border-zinc-800 flex justify-between items-center bg-[#F9F9F9] dark:bg-zinc-950/50">
                    <span className="text-[10px] font-black uppercase tracking-widest">Benachrichtigungen</span>
                    <button 
                      onClick={() => setNotifications(notifications.map(n => ({...n, read: true})))}
                      className="text-[9px] font-bold uppercase text-[#D4AF37] hover:underline"
                    >
                      Alle gelesen
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
        </div>
      </aside>
    </>
  );
}
