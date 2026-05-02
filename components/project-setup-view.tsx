'use client';

import { useState } from 'react';
import {
  Settings, Trash2, Globe,
  Clock, ShieldCheck, AlertCircle
} from 'lucide-react';

export default function ProjectSetupView({ project }: { project: any }) {
  const [name, setName] = useState(project.name);
  const [url] = useState(project.url);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#EEE] dark:border-zinc-800 pb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Settings className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-[10px] font-black uppercase tracking-[3px] text-[#D4AF37]">Configuration</span>
          </div>
          <h2 className="text-[32px] md:text-[42px] font-black uppercase tracking-tighter leading-none text-[#1A1A1A] dark:text-zinc-100">Projekt Setup</h2>
          <p className="text-[12px] text-[#888] font-bold mt-2 uppercase tracking-widest max-w-xl">
            Verwalten Sie Ihre Projekt-Einstellungen und konfigurieren Sie die Scan-Parameter.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
         <div className="lg:col-span-2 space-y-8">
            {/* General Settings */}
            <div className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 p-8 space-y-6">
               <h3 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#D4AF37]" /> Allgemeine Infos
               </h3>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                     <label className="text-[9px] font-black uppercase tracking-widest text-[#888]">Projekt Name</label>
                     <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-[#EEE] dark:border-zinc-800 text-[13px] focus:outline-none focus:border-[#D4AF37] transition-all"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[9px] font-black uppercase tracking-widest text-[#888]">Domain URL</label>
                     <input 
                        type="text" 
                        value={url}
                        readOnly
                        className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 text-[13px] text-[#888] cursor-not-allowed"
                     />
                  </div>
               </div>

               <div className="pt-4">
                  <button className="px-8 py-3 bg-[#1A1A1A] dark:bg-white text-white dark:text-zinc-900 text-[10px] font-black uppercase tracking-widest hover:bg-[#D4AF37] hover:text-white transition-all shadow-xl">
                     Änderungen speichern
                  </button>
               </div>
            </div>

            {/* Automation Settings */}
            <div className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 p-8 space-y-6">
               <div className="flex items-center justify-between">
                  <h3 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100 flex items-center gap-2">
                     <Clock className="w-4 h-4 text-[#D4AF37]" /> Automatisierung
                  </h3>
                  <span className="text-[9px] px-2 py-1 bg-[#D4AF37]/10 text-[#D4AF37] font-black uppercase tracking-widest rounded-sm">Enterprise Only</span>
               </div>
               
               <div className="space-y-6 opacity-50">
                  <div className="flex items-center justify-between">
                     <div>
                        <p className="text-[13px] font-bold text-[#1A1A1A] dark:text-zinc-100">Wöchentlicher Auto-Scan</p>
                        <p className="text-[11px] text-[#888] font-medium">Das Projekt wird automatisch jeden Montag gescannt.</p>
                     </div>
                     <div className="w-12 h-6 bg-zinc-200 dark:bg-zinc-800 rounded-full relative">
                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                     </div>
                  </div>
                  <div className="flex items-center justify-between">
                     <div>
                        <p className="text-[13px] font-bold text-[#1A1A1A] dark:text-zinc-100">E-Mail Benachrichtigungen</p>
                        <p className="text-[11px] text-[#888] font-medium">Berichte bei Score-Änderungen über 5% senden.</p>
                     </div>
                     <div className="w-12 h-6 bg-zinc-200 dark:bg-zinc-800 rounded-full relative">
                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                     </div>
                  </div>
               </div>
            </div>

            {/* Danger Zone */}
            <div className="p-8 border border-red-500/20 bg-red-500/[0.02] space-y-6">
               <h3 className="text-[14px] font-black uppercase tracking-widest text-red-500 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Danger Zone
               </h3>
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                     <p className="text-[13px] font-bold text-[#1A1A1A] dark:text-zinc-100">Projekt löschen</p>
                     <p className="text-[11px] text-[#888] font-medium">Alle historischen Daten und Berichte werden unwiderruflich gelöscht.</p>
                  </div>
                  <button className="px-6 py-3 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all flex items-center gap-2">
                     <Trash2 className="w-4 h-4" /> Projekt entfernen
                  </button>
               </div>
            </div>
         </div>

         {/* Sidebar Info */}
         <div className="space-y-6">
            <div className="p-8 bg-[#1A1A1A] dark:bg-zinc-950 border border-white/5 space-y-6">
               <ShieldCheck className="w-10 h-10 text-[#D4AF37]" />
               <h4 className="text-[16px] font-black uppercase tracking-tighter text-white leading-tight">Datenschutz & Sicherheit</h4>
               <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest leading-relaxed">
                  Ihre Projektdaten werden verschlüsselt gespeichert und nur für Ihre persönlichen Analysen verwendet.
               </p>
               <div className="pt-4 border-t border-white/10">
                  <span className="text-[9px] font-black uppercase text-zinc-400">Owner ID</span>
                  <p className="text-[10px] font-mono text-zinc-600 truncate mt-1">USR_82736412938</p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
