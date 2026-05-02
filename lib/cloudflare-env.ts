import { getCloudflareContext } from '@opennextjs/cloudflare';

export type ServiceBinding = {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
};

export type RuntimeEnv = NodeJS.ProcessEnv & {
  APP_URL?: string;
  FIREBASE_API_KEY?: string;
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_DATABASE_ID?: string;
  GEMINI_API_KEY?: string;
  GOOGLE_API_KEY?: string;
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
  AI_REPORT_MODE?: string;
  AI_REPORT_MODELS?: string;
  AI_WORKFLOW_SUMMARY?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  AI_GATEWAY_ID?: string;
  AI_GATEWAY_TOKEN?: string;
  SCAN_WORKFLOW_SERVICE?: ServiceBinding;
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
