'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from './auth-provider';
import TopNav from './top-nav';

type PublicSiteNavProps = {
  activeView?: string;
  compact?: boolean;
};

export default function PublicSiteNav({ activeView = 'tools', compact = false }: PublicSiteNavProps) {
  const router = useRouter();
  const { user, userData, signIn, logOut } = useAuth();

  const navigate = (view: string) => {
    const routes: Record<string, string> = {
      home: '/',
      dashboard: '/?view=dashboard',
      analyzer: '/scanner',
      projects: '/projekte',
      pricing: '/preise',
      team: '/projekte',
      profile: '/',
      settings: '/',
    };

    router.push(routes[view] || '/');
  };

  const startScan = (url: string) => {
    router.push(`/scanner?url=${encodeURIComponent(url)}&start=1`);
  };

  const logout = async () => {
    await logOut();
    router.refresh();
  };

  return (
    <TopNav
      mode="marketing"
      activeView={activeView}
      compact={compact}
      user={user}
      userData={userData}
      onNavigate={navigate}
      onStartScan={startScan}
      onSignIn={signIn}
      onLogout={logout}
    />
  );
}
