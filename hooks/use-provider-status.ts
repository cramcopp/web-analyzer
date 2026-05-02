import { useEffect, useState } from 'react';
import type { ProviderAvailability, ProviderStatus } from '@/types/provider-facts';

type ProviderStatusResponse = {
  availability: ProviderAvailability;
  providers: ProviderStatus[];
  facts?: Record<string, any[]> | null;
};

export function useProviderStatus(projectId?: string) {
  const [data, setData] = useState<ProviderStatusResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
    fetch(`/api/providers${query}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Provider Status nicht verfuegbar');
        return response.json();
      })
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return data;
}
