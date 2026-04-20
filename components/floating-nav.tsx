'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, Search, Activity, ShieldCheck, Zap, UserCheck, Scale
} from 'lucide-react';

export function FloatingNav() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('summary');

  useEffect(() => {
    const handleScroll = () => {
      const sectionIds = ['summary', 'seo', 'gsc', 'security', 'performance', 'accessibility', 'compliance'];
      let current = sectionIds[0];

      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          // Adjust threshold - if top of element is near top of screen
          if (rect.top <= 250) {
            current = id;
          }
        }
      }
      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Run initially to set the correct state
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const sections = [
    { id: 'summary', name: 'Zusammenfassung', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'seo', name: 'SEO', icon: <Search className="w-5 h-5" /> },
    { id: 'gsc', name: 'Search Console', icon: <Activity className="w-5 h-5" /> },
    { id: 'security', name: 'Sicherheit', icon: <ShieldCheck className="w-5 h-5" /> },
    { id: 'performance', name: 'Performance', icon: <Zap className="w-5 h-5" /> },
    { id: 'accessibility', name: 'Barrierefrei', icon: <UserCheck className="w-5 h-5" /> },
    { id: 'compliance', name: 'Legal / DSGVO', icon: <Scale className="w-5 h-5" /> },
  ];

  return (
    <div className="fixed bottom-[40px] left-1/2 transform -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-bottom-[60px] duration-700 delay-300">
      <div className="bg-[#FFFFFF] text-[#1A1A1A] shadow-[0_15px_40px_rgba(0,0,0,0.12)] rounded-full px-12 h-[60px] flex items-center justify-center gap-[45px] border border-[#E5E5E5]">
        {sections.map((section) => {
          const isActive = activeSection === section.id;
          return (
            <div
              key={section.id}
              className="relative flex items-center justify-center cursor-pointer group h-full"
              onMouseEnter={() => setHoveredNode(section.id)}
              onMouseLeave={() => setHoveredNode(null)}
              onClick={() => {
                const el = document.getElementById(section.id);
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <div className={`transition-all duration-300 group-hover:-translate-y-1 ${isActive ? 'opacity-100 text-[#000000]' : 'opacity-40 hover:opacity-100'}`}>
                {section.icon}
              </div>
              
              {isActive && (
                <motion.div
                  layoutId="activeNavIndicator"
                  className="absolute bottom-[8px] w-[5px] h-[5px] bg-[#1A1A1A] rounded-full"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}

              {/* Tooltip */}
              <AnimatePresence>
                {hoveredNode === section.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full mb-6 px-4 py-2 bg-[#1A1A1A] text-white text-[10px] font-bold uppercase tracking-widest rounded-lg whitespace-nowrap z-50 shadow-xl pointer-events-none"
                  >
                    <div className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 border-x-[6px] border-x-transparent border-t-[6px] border-t-[#1A1A1A]"></div>
                    {section.name}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
