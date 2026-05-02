import type { DataSourceType } from './data-source';

export type AiCrawlerBot = 'GPTBot' | 'OAI-SearchBot' | 'Google-Extended' | 'PerplexityBot';
export type AiCheckStatus = 'ok' | 'warning' | 'blocked' | 'unavailable';

export interface AiCrawlerAccessCheck {
  bot: AiCrawlerBot;
  label: string;
  status: 'allowed' | 'blocked';
  rule: string;
  sourceType: DataSourceType;
  confidence: number;
}

export interface AiVisibilitySignalCheck {
  key: string;
  label: string;
  status: AiCheckStatus;
  signals: string[];
  missing: string[];
  sourceType: DataSourceType;
  confidence: number;
}

export interface AiVisibilityFutureProviderCheck {
  key: 'ai_overview_tracking' | 'prompt_monitoring';
  label: string;
  status: 'unavailable' | 'provider_configured';
  sourceType: DataSourceType;
  provider?: string;
}

export interface AiVisibilityCheckSet {
  sourceType: 'heuristic';
  crawlerAccess: AiCrawlerAccessCheck[];
  brandEntity: AiVisibilitySignalCheck;
  organizationSchema: AiVisibilitySignalCheck;
  sameAsLinks: AiVisibilitySignalCheck;
  aboutContactImpressum: AiVisibilitySignalCheck;
  snippetReadiness: AiVisibilitySignalCheck;
  faqDefinitionHowTo: AiVisibilitySignalCheck;
  aiOverviewTracking: AiVisibilityFutureProviderCheck;
  promptMonitoring: AiVisibilityFutureProviderCheck;
}
