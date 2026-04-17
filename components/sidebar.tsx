'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './auth-provider';
import { 
  LayoutDashboard, Search, Activity, ShieldCheck, Zap, UserCheck, Scale, 
  LogOut, LogIn, Mail, FolderHeart 
} from 'lucide-react';
import { ThemeToggle } from './theme-toggle';

export function Sidebar() {
  const { user, loading, signIn, logOut } = useAuth();
  const [activeSection, setActiveSection] = useState('summary');

  // Track scroll position to update active section
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['summary', 'seo', 'gsc', 'security', 'performance', 'accessibility', 'compliance'];
      let currentSection = sections[0];
      
      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const rect = el.getBoundingClientRect();
          // Adjust threshold - if top of element is near top of screen
          if (rect.top <= 200) {
            currentSection = section;
          }
        }
      }
      setActiveSection(currentSection);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { id: 'summary', name: 'Zusammenfassung', icon: <LayoutDashboard className="w-4 h-4" />, color: '#D4AF37' },
    { id: 'seo', name: 'SEO Deep Dive', icon: <Search className="w-4 h-4" />, color: '#1A1A1A' },
    { id: 'gsc', name: 'Search Console', icon: <Activity className="w-4 h-4" />, color: '#4285F4' },
    { id: 'security', name: 'Sicherheit', icon: <ShieldCheck className="w-4 h-4" />, color: '#EB5757' },
    { id: 'performance', name: 'Performance', icon: <Zap className="w-4 h-4" />, color: '#D4AF37' },
    { id: 'accessibility', name: 'Barrierefrei', icon: <UserCheck className="w-4 h-4" />, color: '#27AE60' },
    { id: 'compliance', name: 'Legal / DSGVO', icon: <Scale className="w-4 h-4" />, color: '#888888' },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-[#F5F5F3] dark:bg-zinc-950 border-r border-[#E5E5E5] dark:border-zinc-800 flex flex-col z-50 transition-colors">
      <div className="p-6">
        <h1 className="text-[20px] font-black uppercase tracking-tighter leading-none mb-1">Analyzer Pro</h1>
        <p className="text-[10px] text-[#888] font-bold uppercase tracking-widest">Enterprise Edition</p>
      </div>

      <nav className="flex-1 overflow-y-auto pt-4 px-4 flex flex-col gap-2">
        <span className="text-[10px] uppercase font-black text-[#D4AF37] tracking-widest px-2 mb-2">Reports</span>
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all text-[12px] font-bold uppercase tracking-wider
                ${isActive 
                  ? 'bg-white dark:bg-zinc-900 shadow-sm text-[#1A1A1A] dark:text-zinc-100' 
                  : 'text-[#888] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#1A1A1A] dark:hover:text-zinc-100'
                }`}
            >
              <span style={{ color: isActive ? item.color : 'inherit' }}>{item.icon}</span>
              {item.name}
              {isActive && (
                <div 
                  className="absolute left-0 w-1 h-6 rounded-r-md" 
                  style={{ backgroundColor: item.color }} 
                />
              )}
            </a>
          );
        })}

        <div className="mt-8 border-t border-[#E5E5E5] dark:border-zinc-800 pt-6">
          <span className="text-[10px] uppercase font-black text-[#888] tracking-widest px-2 mb-2 block">Dein Account</span>
          
          {!loading && user ? (
            <div className="flex flex-col gap-2 px-2">
              <div className="flex items-center gap-3 py-2 mb-2">
                {user.photoURL ? (
                   // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full shadow-sm" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center font-bold text-[12px]">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col overflow-hidden">
                  <span className="text-[11px] font-bold truncate text-[#1A1A1A] dark:text-zinc-100">{user.displayName || 'Nutzer'}</span>
                  <span className="text-[9px] text-[#888] truncate">{user.email}</span>
                </div>
              </div>
              
              <button className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#888] hover:text-[#1A1A1A] dark:hover:text-zinc-100 transition-colors w-full text-left py-2">
                <FolderHeart className="w-4 h-4" /> Projekte & Verlauf
              </button>
              
              <button 
                onClick={logOut}
                className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#EB5757] hover:opacity-70 transition-opacity w-full text-left py-2 mt-2"
              >
                <LogOut className="w-4 h-4" /> Abmelden
              </button>
            </div>
          ) : (
            <button 
              onClick={signIn}
              className="flex items-center gap-2 px-2 py-2 w-full text-left text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A] dark:text-zinc-100 hover:text-[#D4AF37] transition-colors"
            >
              <LogIn className="w-4 h-4" /> Mit Google Anmelden
            </button>
          )}
        </div>
      </nav>

      <div className="p-4 border-t border-[#E5E5E5] dark:border-zinc-800 flex justify-between items-center">
         <ThemeToggle />
         <span className="text-[9px] font-bold uppercase text-[#888]">v1.2.0</span>
      </div>
    </aside>
  );
}
