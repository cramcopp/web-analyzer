import type { DataSourceType } from './data-source';

export type SearchDevice = 'desktop' | 'mobile';
export type ProviderKind = 'keyword' | 'serp' | 'backlink' | 'traffic' | 'ai_visibility' | 'gsc' | 'psi' | 'crux';
export type ProviderId =
  | 'dataforseo'
  | 'serpapi'
  | 'majestic'
  | 'similarweb'
  | 'google_search_console'
  | 'pagespeed_insights'
  | 'crux'
  | 'ai_visibility_provider';

export interface ProviderFactBase {
  projectId: string;
  userId?: string;
  provider: string;
  confidence: number;
}

export interface ProviderStatus {
  id: ProviderId;
  kind: ProviderKind;
  name: string;
  configured: boolean;
  sourceType: DataSourceType;
  envVars: string[];
  capabilities: string[];
}

export interface KeywordFactsRequest {
  projectId: string;
  keywords: string[];
  region: string;
  language: string;
  device: SearchDevice;
}

export interface SerpFactsRequest {
  projectId: string;
  keywords: string[];
  domain: string;
  region: string;
  language?: string;
  device: SearchDevice;
}

export interface BacklinkFactsRequest {
  projectId: string;
  domain: string;
}

export interface TrafficFactsRequest {
  projectId: string;
  domain: string;
  region: string;
}

export interface AiVisibilityFactsRequest {
  projectId: string;
  prompts: string[];
  brand?: string;
  competitors?: string[];
}

export interface KeywordFact extends ProviderFactBase {
  type: 'keyword_fact';
  keyword: string;
  region: string;
  language: string;
  device: SearchDevice;
  volume: number | null;
  cpc: number | null;
  competition: number | null;
  difficulty: number | null;
  intent?: string;
  fetchedAt: string;
}

export interface RankFact extends ProviderFactBase {
  type: 'rank_fact';
  keyword: string;
  domain: string;
  url?: string;
  rank: number | null;
  previousRank?: number | null;
  serpFeatures: string[];
  region: string;
  device: SearchDevice;
  checkedAt: string;
}

export interface BacklinkFact extends ProviderFactBase {
  type: 'backlink_fact';
  sourceUrl: string;
  sourceDomain: string;
  targetUrl: string;
  anchor?: string;
  nofollow: boolean;
  firstSeen?: string;
  lastSeen?: string;
  lost: boolean;
  authorityMetric?: number | null;
  fetchedAt: string;
}

export interface CompetitorFact {
  type: 'competitor_fact';
  projectId: string;
  competitorDomain: string;
  source: DataSourceType | string;
  createdAt: string;
}

export interface TrafficFact extends ProviderFactBase {
  type: 'traffic_fact';
  domain: string;
  channel: string;
  visitsEstimate: number | null;
  region: string;
  fetchedAt: string;
}

export interface AiVisibilityFact extends ProviderFactBase {
  type: 'ai_visibility_fact';
  prompt: string;
  brandMentioned: boolean;
  competitorsMentioned: string[];
  source: DataSourceType | string;
  checkedAt: string;
}

export interface ProviderAvailability {
  keyword: boolean;
  serp: boolean;
  backlink: boolean;
  traffic: boolean;
  aiVisibility: boolean;
  gsc: boolean;
  psi: boolean;
  crux: boolean;
}

export interface KeywordProvider {
  name: string;
  id: ProviderId;
  kind: 'keyword';
  fetchKeywordFacts(request: KeywordFactsRequest): Promise<KeywordFact[]>;
}

export interface SerpProvider {
  name: string;
  id: ProviderId;
  kind: 'serp';
  fetchRankFacts(request: SerpFactsRequest): Promise<RankFact[]>;
}

export interface BacklinkProvider {
  name: string;
  id: ProviderId;
  kind: 'backlink';
  fetchBacklinkFacts(request: BacklinkFactsRequest): Promise<BacklinkFact[]>;
}

export interface TrafficProvider {
  name: string;
  id: ProviderId;
  kind: 'traffic';
  fetchTrafficFacts(request: TrafficFactsRequest): Promise<TrafficFact[]>;
}

export interface AiVisibilityProvider {
  name: string;
  id: ProviderId;
  kind: 'ai_visibility';
  fetchAiVisibilityFacts(request: AiVisibilityFactsRequest): Promise<AiVisibilityFact[]>;
}
