import { NextResponse } from 'next/server';
import { getRuntimeEnv, hasCloudflareContext } from '@/lib/cloudflare-env';
import { hasCloudflareCache } from '@/lib/cloudflare-cache';
import { hasCloudflareAuditR2, hasCloudflareD1, hasCloudflareReportR2 } from '@/lib/cloudflare-storage';

export const runtime = 'nodejs';

export async function GET(_req: Request) {
  const env = getRuntimeEnv();
  
  const debugInfo = {
    runtime: 'cloudflare-workers',
    hasContextEnv: hasCloudflareContext(),
    hasProcessEnv: !!process.env,
    envKeys: Object.keys(env || {}).filter(k => !/SECRET|KEY|TOKEN|JSON/i.test(k)),
    serviceBindings: Object.keys(env || {}).filter(k => k.includes('SERVICE') || k.includes('WORKFLOW')),
    firebaseConfig: {
      hasProjectId: !!env?.FIREBASE_PROJECT_ID,
      hasApiKey: !!env?.FIREBASE_API_KEY,
      projectIdValue: env?.FIREBASE_PROJECT_ID?.substring(0, 4) + '...',
    },
    workflowBinding: !!env?.SCAN_WORKFLOW_SERVICE,
    cloudflareStorage: {
      d1: hasCloudflareD1(env),
      auditArtifactsR2: hasCloudflareAuditR2(env),
      reportExportsR2: hasCloudflareReportR2(env),
      kvCache: hasCloudflareCache(env),
      queueProducer: !!env?.SCAN_FANOUT_QUEUE,
    },
    authProvider: 'firebase-auth',
  };

  return NextResponse.json(debugInfo);
}
