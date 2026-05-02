import type { ProviderAvailability, ProviderStatus } from '@/types/provider-facts';

export function getProviderAvailability(env: Record<string, any> = process.env): ProviderAvailability {
  return {
    keyword: Boolean(env.DATAFORSEO_API_KEY || env.KEYWORD_PROVIDER_KEY),
    serp: Boolean(env.DATAFORSEO_API_KEY || env.SERPAPI_KEY || env.SERP_PROVIDER_KEY),
    backlink: Boolean(env.MAJESTIC_API_KEY || env.DATAFORSEO_API_KEY || env.BACKLINK_PROVIDER_KEY),
    traffic: Boolean(env.SIMILARWEB_API_KEY || env.TRAFFIC_PROVIDER_KEY),
    aiVisibility: Boolean(env.AI_VISIBILITY_PROVIDER_KEY || env.SERPAPI_KEY),
    gsc: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    psi: Boolean(env.PAGESPEED_API_KEY || env.GOOGLE_API_KEY),
    crux: Boolean(env.CRUX_API_KEY || env.GOOGLE_API_KEY),
  };
}

function status(configured: boolean, item: Omit<ProviderStatus, 'configured' | 'sourceType'>): ProviderStatus {
  return {
    ...item,
    configured,
    sourceType: configured ? 'provider' : 'unavailable',
  };
}

export function getProviderStatuses(env: Record<string, any> = process.env): ProviderStatus[] {
  return [
    status(Boolean(env.DATAFORSEO_API_KEY || env.KEYWORD_PROVIDER_KEY), {
      id: 'dataforseo',
      kind: 'keyword',
      name: 'DataForSEO Keyword Data',
      envVars: ['DATAFORSEO_API_KEY', 'KEYWORD_PROVIDER_KEY'],
      capabilities: ['keyword_fact', 'volume', 'cpc', 'competition', 'difficulty', 'intent'],
    }),
    status(Boolean(env.DATAFORSEO_API_KEY || env.SERPAPI_KEY || env.SERP_PROVIDER_KEY), {
      id: env.SERPAPI_KEY ? 'serpapi' : 'dataforseo',
      kind: 'serp',
      name: env.SERPAPI_KEY ? 'SerpApi SERP Data' : 'DataForSEO SERP Data',
      envVars: ['DATAFORSEO_API_KEY', 'SERPAPI_KEY', 'SERP_PROVIDER_KEY'],
      capabilities: ['rank_fact', 'rank', 'previousRank', 'serpFeatures'],
    }),
    status(Boolean(env.MAJESTIC_API_KEY || env.DATAFORSEO_API_KEY || env.BACKLINK_PROVIDER_KEY), {
      id: env.MAJESTIC_API_KEY ? 'majestic' : 'dataforseo',
      kind: 'backlink',
      name: env.MAJESTIC_API_KEY ? 'Majestic Backlinks' : 'DataForSEO Backlinks',
      envVars: ['MAJESTIC_API_KEY', 'DATAFORSEO_API_KEY', 'BACKLINK_PROVIDER_KEY'],
      capabilities: ['backlink_fact', 'sourceDomain', 'anchor', 'nofollow', 'authorityMetric'],
    }),
    status(Boolean(env.SIMILARWEB_API_KEY || env.TRAFFIC_PROVIDER_KEY), {
      id: 'similarweb',
      kind: 'traffic',
      name: 'Similarweb Traffic Data',
      envVars: ['SIMILARWEB_API_KEY', 'TRAFFIC_PROVIDER_KEY'],
      capabilities: ['traffic_fact', 'visitsEstimate', 'channel', 'region'],
    }),
    status(Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET), {
      id: 'google_search_console',
      kind: 'gsc',
      name: 'Google Search Console',
      envVars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
      capabilities: ['first_party_queries', 'clicks', 'impressions', 'position'],
    }),
    status(Boolean(env.PAGESPEED_API_KEY || env.GOOGLE_API_KEY), {
      id: 'pagespeed_insights',
      kind: 'psi',
      name: 'PageSpeed Insights',
      envVars: ['PAGESPEED_API_KEY', 'GOOGLE_API_KEY'],
      capabilities: ['psi', 'lighthouse', 'core_web_vitals_lab'],
    }),
    status(Boolean(env.CRUX_API_KEY || env.GOOGLE_API_KEY), {
      id: 'crux',
      kind: 'crux',
      name: 'CrUX',
      envVars: ['CRUX_API_KEY', 'GOOGLE_API_KEY'],
      capabilities: ['crux', 'field_core_web_vitals'],
    }),
    status(Boolean(env.AI_VISIBILITY_PROVIDER_KEY || env.SERPAPI_KEY), {
      id: 'ai_visibility_provider',
      kind: 'ai_visibility',
      name: 'AI Visibility Provider',
      envVars: ['AI_VISIBILITY_PROVIDER_KEY', 'SERPAPI_KEY'],
      capabilities: ['ai_visibility_fact', 'prompt_monitoring', 'ai_overview_tracking'],
    }),
  ];
}
