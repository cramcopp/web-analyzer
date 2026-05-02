import { NextResponse } from 'next/server';
import { getRuntimeEnv, hasCloudflareContext } from '@/lib/cloudflare-env';

export const runtime = 'nodejs';

export async function GET(_req: Request) {
  const env = getRuntimeEnv();
  
  const debugInfo = {
    runtime: 'cloudflare-workers',
    hasContextEnv: hasCloudflareContext(),
    hasProcessEnv: !!process.env,
    envKeys: Object.keys(env || {}).filter(k => !k.includes('SECRET') && !k.includes('KEY')),
    serviceBindings: Object.keys(env || {}).filter(k => k.includes('SERVICE') || k.includes('WORKFLOW')),
    firebaseConfig: {
      hasProjectId: !!env?.FIREBASE_PROJECT_ID,
      hasApiKey: !!env?.FIREBASE_API_KEY,
      projectIdValue: env?.FIREBASE_PROJECT_ID?.substring(0, 4) + '...',
    },
    workflowBinding: !!env?.SCAN_WORKFLOW_SERVICE
  };

  return NextResponse.json(debugInfo);
}
