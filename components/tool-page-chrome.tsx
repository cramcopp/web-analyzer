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

export function PublicToolsHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#dfe3ea] bg-white/95 text-[#172033] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 dark:text-zinc-100">
      <div className="mx-auto flex h-14 max-w-[1380px] items-center gap-4 px-6 md:px-10">
        <Link href="/" className="flex min-w-fit items-center gap-2" aria-label="Website Analyzer Startseite">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#111827] text-[13px] font-black text-[#D4AF37] dark:bg-white dark:text-[#111827]">
            W
          </span>
          <span className="hidden leading-none sm:block">
            <span className="block text-[15px] font-black tracking-tight">Website Analyzer</span>
            <span className="block text-[8px] font-black uppercase tracking-[0.22em] text-[#7b8495]">Pro</span>
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 md:flex">
          <Link href="/tools" className="rounded-md px-3 py-2 text-[12px] font-bold text-[#334155] transition-colors hover:bg-[#f0f3f8] dark:text-zinc-300 dark:hover:bg-zinc-900">
            Tools
          </Link>
          <Link href="/preise" className="rounded-md px-3 py-2 text-[12px] font-bold text-[#334155] transition-colors hover:bg-[#f0f3f8] dark:text-zinc-300 dark:hover:bg-zinc-900">
            Preise
          </Link>
          <Link href="/" className="rounded-md px-3 py-2 text-[12px] font-bold text-[#334155] transition-colors hover:bg-[#f0f3f8] dark:text-zinc-300 dark:hover:bg-zinc-900">
            Full Audit
          </Link>
        </nav>

        <Link
          href="/"
          className="ml-auto flex items-center justify-center rounded-md bg-[#009b72] px-4 py-2 text-[12px] font-black text-white transition-colors hover:bg-[#087f61] md:ml-2"
        >
          Audit starten
        </Link>
      </div>
    </header>
  );
}

export function PublicToolsFooter() {
  return (
    <footer className="border-t border-[#dfe3ea] bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-[1380px] flex-col gap-4 px-6 py-8 text-[12px] font-bold text-[#64748b] dark:text-zinc-400 md:flex-row md:items-center md:justify-between md:px-10">
        <p>Website Analyzer Pro trennt Kurzchecks, Crawls, Reports und Add-ons sauber voneinander.</p>
        <div className="flex flex-wrap gap-4">
          <Link href="/impressum" className="hover:text-[#0b7de3]">Impressum</Link>
          <Link href="/datenschutz" className="hover:text-[#0b7de3]">Datenschutz</Link>
          <Link href="/agb" className="hover:text-[#0b7de3]">AGB</Link>
        </div>
      </div>
    </footer>
  );
}
