import { getProviderStatuses } from './availability';
import type {
  AiVisibilityProvider,
  BacklinkProvider,
  KeywordProvider,
  ProviderKind,
  SerpProvider,
  TrafficProvider,
} from '@/types/provider-facts';

export class ProviderUnavailableError extends Error {
  constructor(kind: ProviderKind) {
    super(`${kind} provider is not connected`);
    this.name = 'ProviderUnavailableError';
  }
}

function unavailableKeywordProvider(): KeywordProvider {
  return {
    id: 'dataforseo',
    name: 'Keyword provider unavailable',
    kind: 'keyword',
    async fetchKeywordFacts() {
      throw new ProviderUnavailableError('keyword');
    },
  };
}

function unavailableSerpProvider(): SerpProvider {
  return {
    id: 'dataforseo',
    name: 'SERP provider unavailable',
    kind: 'serp',
    async fetchRankFacts() {
      throw new ProviderUnavailableError('serp');
    },
  };
}

function unavailableBacklinkProvider(): BacklinkProvider {
  return {
    id: 'dataforseo',
    name: 'Backlink provider unavailable',
    kind: 'backlink',
    async fetchBacklinkFacts() {
      throw new ProviderUnavailableError('backlink');
    },
  };
}

function unavailableTrafficProvider(): TrafficProvider {
  return {
    id: 'similarweb',
    name: 'Traffic provider unavailable',
    kind: 'traffic',
    async fetchTrafficFacts() {
      throw new ProviderUnavailableError('traffic');
    },
  };
}

function unavailableAiVisibilityProvider(): AiVisibilityProvider {
  return {
    id: 'ai_visibility_provider',
    name: 'AI visibility provider unavailable',
    kind: 'ai_visibility',
    async fetchAiVisibilityFacts() {
      throw new ProviderUnavailableError('ai_visibility');
    },
  };
}

export function getProviderRegistry(env: Record<string, any> = process.env) {
  const statuses = getProviderStatuses(env);
  const isConfigured = (kind: ProviderKind) => statuses.some((provider) => provider.kind === kind && provider.configured);

  return {
    statuses,
    keywordProvider: isConfigured('keyword') ? null : unavailableKeywordProvider(),
    serpProvider: isConfigured('serp') ? null : unavailableSerpProvider(),
    backlinkProvider: isConfigured('backlink') ? null : unavailableBacklinkProvider(),
    trafficProvider: isConfigured('traffic') ? null : unavailableTrafficProvider(),
    aiVisibilityProvider: isConfigured('ai_visibility') ? null : unavailableAiVisibilityProvider(),
  };
}
