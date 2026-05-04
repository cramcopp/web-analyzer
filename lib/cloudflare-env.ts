import { getCloudflareContext } from '@opennextjs/cloudflare';

export type ServiceBinding = {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
};

export type D1Statement = {
  bind(...values: unknown[]): D1Statement;
  run<T = unknown>(): Promise<T>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results?: T[] } | T[]>;
};

export type D1Binding = {
  prepare(query: string): D1Statement;
  batch?(statements: unknown[]): Promise<unknown[]>;
};

export type R2Binding = {
  put(key: string, value: string | Uint8Array | ArrayBuffer, options?: Record<string, unknown>): Promise<unknown>;
  get(key: string): Promise<{ text(): Promise<string> } | null>;
  delete?(key: string): Promise<void>;
};

export type KVBinding = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
};

export type QueueBinding = {
  send(message: unknown, options?: Record<string, unknown>): Promise<void>;
};

export type AiGatewayBinding = {
  run(
    data: {
      provider: string;
      endpoint: string;
      headers: Record<string, string>;
      query: unknown;
    },
    options?: {
      gateway?: {
        cacheKey?: string;
        cacheTtl?: number;
        collectLog?: boolean;
        metadata?: Record<string, string | number | boolean | null>;
      };
      signal?: AbortSignal;
    },
  ): Promise<Response>;
};

export type AiBinding = {
  gateway(gatewayId: string): AiGatewayBinding;
};

export type RuntimeEnv = NodeJS.ProcessEnv & {
  APP_URL?: string;
  FIREBASE_API_KEY?: string;
  FIREBASE_PROJECT_ID?: string;
  GEMINI_API_KEY?: string;
  GOOGLE_API_KEY?: string;
  GOOGLE_SEARCH_API_KEY?: string;
  GOOGLE_CX?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI?: string;
  INTERNAL_SECRET?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_PRO_MONTHLY?: string;
  STRIPE_PRICE_PRO_YEARLY?: string;
  STRIPE_PRICE_AGENCY_MONTHLY?: string;
  STRIPE_PRICE_AGENCY_YEARLY?: string;
  STRIPE_PRICE_BUSINESS_MONTHLY?: string;
  STRIPE_PRICE_BUSINESS_YEARLY?: string;
  STRIPE_PRICE_ADDON_KEYWORDS_100?: string;
  STRIPE_PRICE_ADDON_PROJECT_100_KEYWORDS?: string;
  STRIPE_PRICE_ADDON_TEAM_SEAT?: string;
  STRIPE_PRICE_ADDON_WHITE_LABEL_DOMAIN?: string;
  STRIPE_PRICE_ADDON_BACKLINKS?: string;
  STRIPE_PRICE_ADDON_AI_VISIBILITY?: string;
  AI_REPORT_MODE?: string;
  AI_REPORT_MODELS?: string;
  AI_WORKFLOW_SUMMARY?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  AI_GATEWAY_ID?: string;
  AI_GATEWAY_TOKEN?: string;
  SCAN_WORKFLOW_SERVICE?: ServiceBinding;
  DB?: D1Binding;
  AUDIT_ARTIFACTS?: R2Binding;
  REPORT_EXPORTS?: R2Binding;
  CACHE?: KVBinding;
  SCAN_FANOUT_QUEUE?: QueueBinding;
  AI?: AiBinding;
};

export function getRuntimeEnv(): RuntimeEnv {
  try {
    const { env } = getCloudflareContext();
    return { ...process.env, ...(env as RuntimeEnv) };
  } catch {
    return process.env as RuntimeEnv;
  }
}

export function hasCloudflareContext(): boolean {
  try {
    getCloudflareContext();
    return true;
  } catch {
    return false;
  }
}
