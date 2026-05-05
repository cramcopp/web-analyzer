'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Bell,
  LayoutDashboard,
  LogIn,
  Search,
  Sparkles,
} from 'lucide-react';
import { ThemeToggle } from './theme-toggle';

type NavView =
  | 'home'
  | 'dashboard'
  | 'analyzer'
  | 'projects'
  | 'settings'
  | 'profile'
  | 'pricing'
  | 'team';

interface TopNavProps {
  mode?: 'marketing' | 'app';
  activeView?: string;
  user?: any | null;
  userData?: any | null;
  onNavigate: (view: NavView) => void;
  onStartScan: (url: string) => void;
  onSignIn: () => void;
  onLogout: () => void;
}

export default function TopNav({
  mode = 'app',
  activeView,
  user,
  userData,
  onNavigate,
  onStartScan,
  onSignIn,
  onLogout,
}: TopNavProps) {
  const [query, setQuery] = useState('');
  const [accountOpen, setAccountOpen] = useState(false);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    onStartScan(value);
    setQuery('');
  };

  const planLabel = userData?.plan ? String(userData.plan).toUpperCase() : 'FREE';
  const avatarLabel =
    user?.displayName?.charAt(0)?.toUpperCase() ||
    user?.email?.charAt(0)?.toUpperCase() ||
    'W';

  return (
    <header className="fixed inset-x-0 top-0 z-[60] h-14 border-b border-[#dfe3ea] bg-white/95 text-[#172033] shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 dark:text-zinc-100">
      <div className="flex h-full items-center gap-4 px-4 md:px-6">
        <button
          onClick={() => onNavigate('home')}
          className="flex min-w-fit items-center gap-2 text-left"
          aria-label="Zur Startseite"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#111827] text-[13px] font-black text-[#D4AF37] shadow-sm dark:bg-white dark:text-[#111827]">
            W
          </span>
          <span className="hidden leading-none sm:block">
            <span className="block text-[15px] font-black tracking-tight">Website Analyzer</span>
            <span className="block text-[8px] font-black uppercase tracking-[0.22em] text-[#7b8495]">
              Pro
            </span>
          </span>
        </button>

        <form
          onSubmit={submitSearch}
          className={`mx-auto hidden h-9 max-w-[560px] flex-1 items-center overflow-hidden rounded-md border border-[#d8dde8] bg-[#f7f9fc] md:flex ${
            mode === 'marketing' ? 'lg:max-w-[460px]' : ''
          }`}
        >
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Website, Aufgabe oder Keyword eingeben"
            className="h-full min-w-0 flex-1 bg-transparent px-4 text-[13px] font-medium text-[#172033] outline-none placeholder:text-[#7b8495] dark:text-zinc-100"
          />
          <button
            type="submit"
            className="flex h-full w-11 items-center justify-center bg-[#0b7de3] text-white transition-colors hover:bg-[#086ac1]"
            aria-label="Scan starten"
          >
            <Search className="h-4 w-4" />
          </button>
        </form>

        <nav className="hidden items-center gap-1 lg:flex">
          <button
            onClick={() => onNavigate('dashboard')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-[12px] font-bold transition-colors ${
              activeView === 'analyzer' || activeView === 'dashboard'
                ? 'bg-[#eef4ff] text-[#0b7de3] dark:bg-zinc-900'
                : 'text-[#334155] hover:bg-[#f0f3f8] dark:text-zinc-300 dark:hover:bg-zinc-900'
            }`}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            Dashboard
          </button>
          {mode === 'marketing' ? (
            <Link
              href="/scanner"
              className={`rounded-md px-3 py-2 text-[12px] font-bold transition-colors ${
                activeView === 'scanner' || activeView === 'analyzer'
                  ? 'bg-[#eef4ff] text-[#0b7de3] dark:bg-zinc-900'
                  : 'text-[#334155] hover:bg-[#f0f3f8] dark:text-zinc-300 dark:hover:bg-zinc-900'
              }`}
            >
              Scanner
            </Link>
          ) : (
            <button
              onClick={() => onNavigate('analyzer')}
              className={`rounded-md px-3 py-2 text-[12px] font-bold transition-colors ${
                activeView === 'analyzer'
                  ? 'bg-[#eef4ff] text-[#0b7de3] dark:bg-zinc-900'
                  : 'text-[#334155] hover:bg-[#f0f3f8] dark:text-zinc-300 dark:hover:bg-zinc-900'
              }`}
            >
              Scanner
            </button>
          )}
          {mode === 'marketing' ? (
            <Link
              href="/projekte"
              className={`rounded-md px-3 py-2 text-[12px] font-bold transition-colors ${
                activeView === 'projects'
                  ? 'bg-[#eef4ff] text-[#0b7de3] dark:bg-zinc-900'
                  : 'text-[#334155] hover:bg-[#f0f3f8] dark:text-zinc-300 dark:hover:bg-zinc-900'
              }`}
            >
              Projekte
            </Link>
          ) : (
            <button
              onClick={() => onNavigate('projects')}
              className="rounded-md px-3 py-2 text-[12px] font-bold text-[#334155] transition-colors hover:bg-[#f0f3f8] dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Projekte
            </button>
          )}
          <Link
            href="/tools"
            className={`rounded-md px-3 py-2 text-[12px] font-bold transition-colors ${
              activeView === 'tools'
                ? 'bg-[#eef4ff] text-[#0b7de3] dark:bg-zinc-900'
                : 'text-[#334155] hover:bg-[#f0f3f8] dark:text-zinc-300 dark:hover:bg-zinc-900'
            }`}
          >
            Tools
          </Link>
          <Link
            href="/preise"
            className={`rounded-md px-3 py-2 text-[12px] font-bold transition-colors ${
              activeView === 'pricing'
                ? 'bg-[#eef4ff] text-[#0b7de3] dark:bg-zinc-900'
                : 'text-[#334155] hover:bg-[#f0f3f8] dark:text-zinc-300 dark:hover:bg-zinc-900'
            }`}
          >
            Preise
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          {user ? (
            <>
              <button
                onClick={() => onNavigate('pricing')}
                aria-label={`${planLabel} Plan und Abo offnen`}
                className="hidden items-center gap-2 rounded-md border border-[#d8dde8] px-3 py-2 text-[11px] font-black uppercase tracking-wide text-[#4b5563] transition-colors hover:border-[#D4AF37] hover:text-[#172033] dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 md:flex"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#D4AF37]" />
                {planLabel}
              </button>
              <button className="hidden h-9 w-9 items-center justify-center rounded-md text-[#64748b] transition-colors hover:bg-[#f0f3f8] dark:hover:bg-zinc-900 md:flex">
                <Bell className="h-4 w-4" />
              </button>
              <div className="relative">
                <button
                  onClick={() => setAccountOpen((open) => !open)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#6265e9] text-[13px] font-black text-white"
                  aria-label="Account"
                >
                  {avatarLabel}
                </button>
                {accountOpen && (
                  <div className="absolute right-0 top-11 w-56 rounded-md border border-[#d8dde8] bg-white p-2 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
                    <button
                      onClick={() => {
                        setAccountOpen(false);
                        onNavigate('profile');
                      }}
                      className="w-full rounded-sm px-3 py-2 text-left text-[12px] font-bold text-[#172033] hover:bg-[#f4f6fb] dark:text-zinc-100 dark:hover:bg-zinc-900"
                    >
                      Profil öffnen
                    </button>
                    <button
                      onClick={() => {
                        setAccountOpen(false);
                        onNavigate('settings');
                      }}
                      className="w-full rounded-sm px-3 py-2 text-left text-[12px] font-bold text-[#172033] hover:bg-[#f4f6fb] dark:text-zinc-100 dark:hover:bg-zinc-900"
                    >
                      Einstellungen
                    </button>
                    <button
                      onClick={() => {
                        setAccountOpen(false);
                        onLogout();
                      }}
                      className="w-full rounded-sm px-3 py-2 text-left text-[12px] font-bold text-[#b91c1c] hover:bg-[#fff1f1]"
                    >
                      Abmelden
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <button
                onClick={onSignIn}
                className="hidden items-center gap-2 rounded-md border border-[#d8dde8] px-3 py-2 text-[12px] font-bold text-[#334155] transition-colors hover:bg-[#f0f3f8] dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 sm:flex"
              >
                <LogIn className="h-3.5 w-3.5" />
                Login
              </button>
              {mode === 'marketing' ? (
                <Link
                  href="/preise"
                  aria-label="Abo und Preise ansehen"
                  className="flex items-center gap-2 rounded-md bg-[#009b72] px-4 py-2 text-[12px] font-black text-white transition-colors hover:bg-[#087f61]"
                >
                  Gratis testen
                  <ArrowRight className="hidden h-3.5 w-3.5 sm:block" />
                </Link>
              ) : (
                <button
                  onClick={() => onNavigate('pricing')}
                  aria-label="Abo und Preise ansehen"
                  className="flex items-center gap-2 rounded-md bg-[#009b72] px-4 py-2 text-[12px] font-black text-white transition-colors hover:bg-[#087f61]"
                >
                  Gratis testen
                  <ArrowRight className="hidden h-3.5 w-3.5 sm:block" />
                </button>
              )}
            </>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
