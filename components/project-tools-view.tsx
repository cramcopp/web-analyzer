'use client';

import { useState } from 'react';
import { 
  Wrench, FileCode, Terminal, Eye, Settings, Copy 
} from 'lucide-react';

export default function ProjectToolsView({ project }: { project: any }) {
  const [activeTool, setActiveTool] = useState<'sitemap' | 'robots' | 'meta'>('sitemap');
  const [copied, setCopied] = useState<string | null>(null);

  // eslint-disable-next-line no-secrets/no-secrets
  const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${project.url}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

  const robotsContent = `User-agent: *
Allow: /
Sitemap: ${project.url}/sitemap.xml`;

  const handleCopy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1800);
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#EEE] dark:border-zinc-800 pb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Wrench className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-[10px] font-black uppercase tracking-[3px] text-[#D4AF37]">Power Utilities</span>
          </div>
          <h2 className="text-[32px] md:text-[42px] font-black uppercase tracking-tighter leading-none text-[#1A1A1A] dark:text-zinc-100">SEO Tools</h2>
          <p className="text-[12px] text-[#888] font-bold mt-2 uppercase tracking-widest max-w-xl">
            Praktische Helfer zur Optimierung Ihrer technischen SEO-Grundlagen.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        {[
          { id: 'sitemap', label: 'Sitemap Generator', icon: FileCode },
          { id: 'robots', label: 'Robots.txt Editor', icon: Terminal },
          { id: 'meta', label: 'Meta Tag Preview', icon: Eye },
        ].map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id as any)}
            className={`
              flex items-center gap-3 px-6 py-4 text-[11px] font-black uppercase tracking-widest transition-all
              ${activeTool === tool.id 
                ? 'bg-[#1A1A1A] dark:bg-white text-white dark:text-zinc-900 shadow-xl' 
                : 'bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 text-[#888] hover:border-[#D4AF37]'}
            `}
          >
            <tool.icon className="w-4 h-4" />
            {tool.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 p-8 min-h-[400px]">
        {activeTool === 'sitemap' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <h3 className="text-[18px] font-black uppercase tracking-tighter text-[#1A1A1A] dark:text-zinc-100">XML Sitemap Generator</h3>
              <button 
                onClick={() => handleCopy(sitemapContent, 'sitemap')}
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#D4AF37] hover:underline"
              >
                <Copy className="w-3.5 h-3.5" /> {copied === 'sitemap' ? 'Kopiert' : 'Code kopieren'}
              </button>
            </div>
            <div className="bg-[#1A1A1A] p-6 rounded-sm">
               <pre className="text-[12px] text-zinc-400 font-mono overflow-x-auto">
                 {sitemapContent}
               </pre>
            </div>
            <p className="text-[11px] text-[#888] font-medium leading-relaxed max-w-2xl italic">
              Laden Sie diese Datei als <b>sitemap.xml</b> in Ihr Root-Verzeichnis hoch, um Suchmaschinen bei der Indexierung zu helfen.
            </p>
          </div>
        )}

        {activeTool === 'robots' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <h3 className="text-[18px] font-black uppercase tracking-tighter text-[#1A1A1A] dark:text-zinc-100">Robots.txt Generator</h3>
              <button 
                onClick={() => handleCopy(robotsContent, 'robots')}
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#D4AF37] hover:underline"
              >
                <Copy className="w-3.5 h-3.5" /> {copied === 'robots' ? 'Kopiert' : 'Code kopieren'}
              </button>
            </div>
            <div className="bg-[#1A1A1A] p-6 rounded-sm">
               <pre className="text-[12px] text-zinc-400 font-mono">
                 {robotsContent}
               </pre>
            </div>
            <div className="p-4 bg-blue-500/5 border border-blue-500/10 flex items-start gap-3">
               <Settings className="w-4 h-4 text-blue-500 mt-0.5" />
               <p className="text-[11px] text-blue-700 font-bold uppercase tracking-widest leading-snug">
                  Hinweis: Diese Konfiguration erlaubt allen Crawlern den Zugriff auf Ihre gesamte Seite.
               </p>
            </div>
          </div>
        )}

        {activeTool === 'meta' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <h3 className="text-[18px] font-black uppercase tracking-tighter text-[#1A1A1A] dark:text-zinc-100">Google SERP Preview</h3>
            
            <div className="max-w-xl space-y-4">
               <div className="space-y-1">
                  <div className="text-[14px] text-[#1a0dab] dark:text-blue-400 font-medium hover:underline cursor-pointer">
                    {project.name} | SEO & Performance Audit
                  </div>
                  <div className="text-[12px] text-[#006621] dark:text-green-500">
                    {project.url} <span className="text-[10px]">▼</span>
                  </div>
                  <div className="text-[13px] text-[#4d5156] dark:text-zinc-400 leading-snug">
                    Platzhalter fuer eine manuell gepflegte Meta Description. Keine Ranking-, Traffic- oder Backlink-Fakten ohne Providerdaten.
                  </div>
               </div>

               <div className="pt-8 border-t border-[#EEE] dark:border-zinc-800">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[#888] mb-4">Meta Tags Generieren</h4>
                  <div className="bg-[#F5F5F3] dark:bg-zinc-950 p-4 font-mono text-[11px] text-[#1A1A1A] dark:text-zinc-400">
                     {`<title>${project.name} | Profi SEO Audit</title>`}<br/>
                     {`<meta name="description" content="KI-gestützte SEO-Analyse für ${project.name}." />`}
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
