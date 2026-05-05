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
  compact?: boolean;
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
  compact = false,
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
  const navButtonClass = compact ? 'relative flex h-full items-center px-3 text-[14px]' : 'px-3 py-2 text-[12px]';
  const activeNavClass = compact
    ? 'text-[#0b63ff] after:absolute after:bottom-[-1px] after:left-3 after:right-3 after:h-0.5 after:bg-[#0b63ff]'
    : 'bg-[#eef4ff] text-[#0b7de3] dark:bg-zinc-900';
  const inactiveNavClass = compact
    ? 'text-[#0f172a] hover:text-[#0b63ff]'
    : 'text-[#334155] hover:bg-[#f0f3f8] dark:text-zinc-300 dark:hover:bg-zinc-900';
  const actionButtonClass = compact ? 'px-5 py-3 text-[14px]' : 'px-4 py-2 text-[12px]';

  return (
    <header className={`fixed inset-x-0 top-0 z-[60] border-b border-[#dfe3ea] bg-white/95 text-[#172033] shadow-sm backdrop-blur ${compact ? 'h-[70px]' : 'h-14 dark:border-zinc-800 dark:bg-zinc-950/95 dark:text-zinc-100'}`}>
      <div className={`flex h-full items-center px-4 md:px-6 ${compact ? 'gap-7' : 'gap-4'}`}>
        <button
          onClick={() => onNavigate('home')}
          className="flex min-w-fit items-center gap-2 text-left"
          aria-label="Zur Startseite"
        >
          <span className={`flex items-center justify-center rounded-md font-black shadow-sm ${compact ? 'h-10 w-12 bg-transparent text-[42px] leading-none text-[#0f172a] shadow-none' : 'h-8 w-8 bg-[#111827] text-[13px] text-[#D4AF37] dark:bg-white dark:text-[#111827]'}`}>
            W
          </span>
          {compact ? (
            <span className="hidden whitespace-nowrap text-[18px] font-black tracking-tight text-[#0f172a] sm:block">
              Website Analyzer Pro
            </span>
          ) : (
            <span className="hidden leading-none sm:block">
              <span className="block text-[15px] font-black tracking-tight">Website Analyzer</span>
              <span className="block text-[8px] font-black uppercase tracking-[0.22em] text-[#7b8495]">
                Pro
              </span>
            </span>
          )}
        </button>

        <form
          onSubmit={submitSearch}
          className={`mx-auto hidden flex-1 items-center overflow-hidden border border-[#d8dde8] bg-[#f7f9fc] md:flex ${
            compact ? 'relative h-10 max-w-[405px] rounded-xl bg-white shadow-[0_8px_26px_rgba(15,23,42,0.08)]' : 'h-9 max-w-[560px] rounded-md'
          } ${
            mode === 'marketing' ? (compact ? 'lg:max-w-[405px]' : 'lg:max-w-[460px]') : ''
          }`}
        >
          {compact && <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-[#64748b]" />}
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={compact ? 'Suche nach Projekten, URLs, Reports...' : 'Website, Aufgabe oder Keyword eingeben'}
            className={`h-full min-w-0 flex-1 bg-transparent font-medium text-[#172033] outline-none placeholder:text-[#7b8495] ${compact ? 'pl-10 pr-20 text-[13px]' : 'px-4 text-[13px] dark:text-zinc-100'}`}
          />
          {compact ? (
            <kbd className="mr-2 rounded-md border border-[#d9e1ec] bg-[#f8fafc] px-2 py-1 text-[11px] font-medium text-[#334155]">
              Strg + K
            </kbd>
          ) : (
            <button
              type="submit"
              className="flex h-full w-11 items-center justify-center bg-[#0b7de3] text-white transition-colors hover:bg-[#086ac1]"
              aria-label="Scan starten"
            >
              <Search className="h-4 w-4" />
            </button>
          )}
        </form>

        <nav className={`hidden items-center lg:flex ${compact ? 'h-full gap-5' : 'gap-1'}`}>
          <button
            onClick={() => onNavigate('dashboard')}
            className={`flex items-center gap-1.5 rounded-md font-bold transition-colors ${navButtonClass} ${
              activeView === 'analyzer' || activeView === 'dashboard'
                ? activeNavClass
                : inactiveNavClass
            }`}
          >
            <LayoutDashboard className={compact ? 'hidden' : 'h-3.5 w-3.5'} />
            Dashboard
          </button>
          {mode === 'marketing' ? (
            <Link
              href="/scanner"
              className={`rounded-md font-bold transition-colors ${navButtonClass} ${
                activeView === 'scanner' || activeView === 'analyzer'
                  ? activeNavClass
                  : inactiveNavClass
              }`}
            >
              Scanner
            </Link>
          ) : (
            <button
              onClick={() => onNavigate('analyzer')}
              className={`rounded-md font-bold transition-colors ${navButtonClass} ${
                activeView === 'analyzer'
                  ? activeNavClass
                  : inactiveNavClass
              }`}
            >
              Scanner
            </button>
          )}
          {mode === 'marketing' ? (
            <Link
              href="/projekte"
              className={`rounded-md font-bold transition-colors ${navButtonClass} ${
                activeView === 'projects'
                  ? activeNavClass
                  : inactiveNavClass
              }`}
            >
              Projekte
            </Link>
          ) : (
            <button
              onClick={() => onNavigate('projects')}
              className={`rounded-md font-bold transition-colors ${navButtonClass} ${inactiveNavClass}`}
            >
              Projekte
            </button>
          )}
          <Link
            href="/tools"
            className={`rounded-md font-bold transition-colors ${navButtonClass} ${
              activeView === 'tools'
                ? activeNavClass
                : inactiveNavClass
            }`}
          >
            Tools
          </Link>
          <Link
            href="/preise"
            className={`rounded-md font-bold transition-colors ${navButtonClass} ${
              activeView === 'pricing'
                ? activeNavClass
                : inactiveNavClass
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
                className={`hidden items-center gap-2 rounded-md border border-[#d8dde8] font-black uppercase tracking-wide text-[#4b5563] transition-colors hover:border-[#D4AF37] hover:text-[#172033] md:flex ${compact ? 'px-3 py-2 text-[11px]' : 'px-3 py-2 text-[11px] dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100'}`}
              >
                <Sparkles className="h-3.5 w-3.5 text-[#D4AF37]" />
                {planLabel}
              </button>
              <button className={`hidden items-center justify-center rounded-md text-[#64748b] transition-colors hover:bg-[#f0f3f8] md:flex ${compact ? 'h-10 w-10' : 'h-9 w-9 dark:hover:bg-zinc-900'}`}>
                <Bell className="h-4 w-4" />
              </button>
              <div className="relative">
                <button
                  onClick={() => setAccountOpen((open) => !open)}
                  className={`flex items-center justify-center rounded-full bg-[#6265e9] font-black text-white ${compact ? 'h-10 w-10 text-[13px]' : 'h-9 w-9 text-[13px]'}`}
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
                className={`hidden items-center gap-2 rounded-md border border-[#d8dde8] font-bold text-[#0f172a] transition-colors hover:bg-[#f0f3f8] sm:flex ${compact ? 'border-0 px-2.5 py-2 text-[14px]' : 'px-3 py-2 text-[12px] dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900'}`}
              >
                <LogIn className={compact ? 'hidden' : 'h-3.5 w-3.5'} />
                Login
              </button>
              {mode === 'marketing' ? (
                <Link
                  href="/preise"
                  aria-label="Abo und Preise ansehen"
                  className={`flex items-center gap-2 rounded-md bg-[#009b72] font-black text-white transition-colors hover:bg-[#087f61] ${actionButtonClass}`}
                >
                  Gratis testen
                  <ArrowRight className={compact ? 'hidden' : 'hidden h-3.5 w-3.5 sm:block'} />
                </Link>
              ) : (
                <button
                  onClick={() => onNavigate('pricing')}
                  aria-label="Abo und Preise ansehen"
                  className={`flex items-center gap-2 rounded-md bg-[#009b72] font-black text-white transition-colors hover:bg-[#087f61] ${actionButtonClass}`}
                >
                  Gratis testen
                  <ArrowRight className={compact ? 'hidden' : 'hidden h-3.5 w-3.5 sm:block'} />
                </button>
              )}
            </>
          )}
          <ThemeToggle compact={compact} />
        </div>
      </div>
    </header>
  );
}
