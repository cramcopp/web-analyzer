'use client';

import React, { useState } from 'react';
import { LogIn, Zap, Plus } from 'lucide-react';
import { useAuth } from '../auth-provider';

export function SidebarAuthView() {
  const { signIn, signInEmail, signUpEmail } = useAuth();
  const [authMode, setAuthMode] = useState<'google' | 'email' | 'signup'>('google');
  const [authEmail, setAuthEmail] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [authName, setAuthName] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentifizierung fehlgeschlagen';
      setAuthError(msg);
    } finally {
      setIsAuthLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-[#1A1A1A]/[0.02] dark:bg-white/[0.02] overflow-y-auto">
      <div className="w-12 h-12 rounded-full bg-[#E5E5E5] dark:bg-zinc-800 flex items-center justify-center mb-4 shrink-0">
        <Zap className="w-6 h-6 text-[#888]" />
      </div>
      <h3 className="text-[14px] font-black tracking-tighter uppercase text-[#1A1A1A] dark:text-zinc-100 mb-2">
        Analyzer Pro freischalten
      </h3>
      <p className="text-[10px] text-[#888] leading-relaxed mb-6 max-w-[200px]">
        Melde dich an, um deinen Scan-Verlauf zu speichern und Projekte anzulegen.
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
            <span className="text-[9px] text-[#AAA] font-bold uppercase">oder E-Mail</span>
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
              onClick={() => setAuthMode(authMode === "email" ? "signup" : "email")}
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

      {authError && (
        <div className="mt-4 px-3 py-2 bg-[#EB5757]/10 border border-[#EB5757]/20 rounded-md w-full text-left">
          <p className="text-[9px] text-[#EB5757] font-medium leading-[1.4]">
            {authError}
          </p>
        </div>
      )}
    </div>
  );
}
