import {
  BrainCircuit,
  BarChart3,
  CheckCircle2,
  Eye,
  FileText,
  Link2,
  LockKeyhole,
  MapPin,
  Megaphone,
  Network,
  Search,
  ShieldCheck,
  Target,
  Terminal,
  Users,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import type { ToolPage } from '@/lib/tool-pages';
import PublicSiteNav from './public-site-nav';

const iconMap = {
  search: Search,
  zap: Zap,
  shield: ShieldCheck,
  fileText: FileText,
  terminal: Terminal,
  sitemap: Network,
  brain: BrainCircuit,
  target: Target,
  link: Link2,
  chart: BarChart3,
  map: MapPin,
  megaphone: Megaphone,
  users: Users,
  eye: Eye,
  lock: LockKeyhole,
  check: CheckCircle2,
} satisfies Record<ToolPage['icon'], typeof Search>;

export function ToolIcon({
  icon,
  className = 'h-5 w-5',
}: {
  icon: ToolPage['icon'];
  className?: string;
}) {
  const Icon = iconMap[icon];
  return <Icon className={className} />;
}

export function PublicToolsHeader({ activeView = 'tools' }: { activeView?: string }) {
  return (
    <>
      <PublicSiteNav activeView={activeView} compact />
      <div className="h-11" aria-hidden="true" />
    </>
  );
}

export function PublicToolsFooter() {
  return (
    <footer className="bg-[#F5F5F3] px-6 py-8 text-[#1A1A1A] dark:bg-zinc-950 dark:text-zinc-100 md:px-10">
      <div className="mx-auto flex max-w-[1380px] flex-col gap-6 border-t border-[#1A1A1A] pt-6 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#64748b] dark:border-zinc-700 dark:text-zinc-400 md:flex-row md:items-start md:justify-between">
        <div>
          <p>Website Analyzer Pro</p>
          <p className="mt-2 max-w-[680px] normal-case tracking-normal">
            Kurzchecks, Full Crawls, Projekte, Reports und Add-ons bleiben sauber getrennt.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 md:justify-end">
          <Link href="/scanner" className="hover:text-[#D4AF37]">Scanner</Link>
          <Link href="/projekte" className="hover:text-[#D4AF37]">Projekte</Link>
          <Link href="/tools" className="hover:text-[#D4AF37]">Tools</Link>
          <Link href="/preise" className="hover:text-[#D4AF37]">Preise</Link>
          <Link href="/impressum" className="hover:text-[#D4AF37]">Impressum</Link>
          <Link href="/datenschutz" className="hover:text-[#D4AF37]">Datenschutz</Link>
          <Link href="/agb" className="hover:text-[#D4AF37]">AGB</Link>
        </div>
      </div>
    </footer>
  );
}
