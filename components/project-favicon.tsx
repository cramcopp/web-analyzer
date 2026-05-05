'use client';

import { useMemo, useState } from 'react';
import { Globe2 } from 'lucide-react';

export function getProjectDomain(url?: string | null) {
  const value = (url || '').trim();
  if (!value) return '';

  try {
    return new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`).hostname;
  } catch {
    return value.replace(/^https?:\/\//i, '').split('/')[0] || value;
  }
}

export default function ProjectFavicon({
  url,
  name,
  className = 'h-8 w-8',
  iconClassName = 'h-4 w-4',
}: {
  url?: string | null;
  name?: string | null;
  className?: string;
  iconClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const domain = useMemo(() => getProjectDomain(url), [url]);

  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-[#dfe3ea] bg-white text-[#0b7de3] shadow-sm dark:border-zinc-800 dark:bg-zinc-950 ${className}`}>
      {domain && !failed ? (
        <img
          src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`}
          alt={name ? `${name} Favicon` : ''}
          className="h-[70%] w-[70%] object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <Globe2 className={iconClassName} />
      )}
    </span>
  );
}
