'use client';

import { useState, memo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from './auth-provider';
import { ThemeToggle } from './theme-toggle';

function SettingsView() {
  const { deleteAccount, error: authError } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
      window.location.href = '/';
    } catch (err) {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="pb-10 border-b border-[#E5E5E5] dark:border-zinc-800">
        <h2 className="text-[50px] md:text-[64px] font-black uppercase tracking-tighter leading-none mb-4 text-[#1A1A1A] dark:text-zinc-100">
          Einstellungen
        </h2>
        <p className="text-[14px] text-[#888] font-medium">Verwalte deine Präferenzen und Systemkonfigurationen.</p>
      </div>

      <div className="max-w-[700px] flex flex-col gap-12 pb-20">
        <div className="flex flex-col gap-6">
          <h3 className="text-[12px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100 pb-2 border-b-2 border-[#1A1A1A] dark:border-zinc-100 w-fit">Allgemein</h3>
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between p-6 bg-white dark:bg-zinc-900 border border-[#E5E5E5] dark:border-zinc-800 rounded-sm">
              <div className="flex flex-col gap-1">
                <span className="text-[13px] font-bold text-[#1A1A1A] dark:text-zinc-100 uppercase">Dunkelmodus</span>
                <span className="text-[11px] text-[#888] font-medium">Automatischer Wechsel basierend auf System</span>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <h3 className="text-[12px] font-black uppercase tracking-widest text-[#EB5757] pb-2 border-b-2 border-[#EB5757] w-fit">Gefahrenzone</h3>
          <div className="p-6 bg-[#EB5757]/5 border border-[#EB5757]/20 rounded-sm flex flex-col gap-6">
            {!showConfirm ? (
              <div className="flex items-center justify-between gap-6">
                <div className="flex flex-col gap-1">
                  <span className="text-[13px] font-bold text-[#EB5757] uppercase">Account Löschen</span>
                  <p className="text-[11px] text-[#888] leading-relaxed">Alle deine Projekte, Scans und Einstellungen werden unwiderruflich gelöscht.</p>
                </div>
                <button 
                  onClick={() => setShowConfirm(true)}
                  className="px-6 py-3 bg-[#EB5757] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#C0392B] transition-colors shrink-0"
                >
                  Account löschen
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 py-4 animate-in fade-in zoom-in-95 duration-300">
                <AlertTriangle className="w-10 h-10 text-[#EB5757]" />
                <div className="text-center">
                  <p className="text-[14px] font-bold text-[#1A1A1A] dark:text-zinc-100 uppercase mb-1">Bist du absolut sicher?</p>
                  <p className="text-[11px] text-[#888]">Diese Aktion kann nicht rückgängig gemacht werden.</p>
                </div>
                
                {authError && (
                  <div className="w-full p-4 bg-[#EB5757]/10 border border-[#EB5757]/20 text-[#EB5757] text-[11px] font-bold text-center">
                    {authError.includes('CREDENTIAL_TOO_OLD_LOGIN_AGAIN') 
                      ? 'Aus Sicherheitsgründen müssen Sie sich vor dem Löschen einmal kurz ab- und wieder anmelden.' 
                      : authError}
                  </div>
                )}

                <div className="flex gap-4 w-full">
                  <button 
                    disabled={isDeleting}
                    onClick={handleDelete}
                    className="flex-1 py-4 bg-[#EB5757] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#C0392B] transition-colors disabled:opacity-50"
                  >
                    {isDeleting ? 'Löschen...' : 'Ja, unwiderruflich löschen'}
                  </button>
                  <button 
                    disabled={isDeleting}
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 py-4 bg-[#EEE] dark:bg-zinc-800 text-[#888] text-[10px] font-black uppercase tracking-widest hover:bg-[#DDD] dark:hover:bg-zinc-700 transition-colors"
                  >
                    Abbruch
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(SettingsView);
