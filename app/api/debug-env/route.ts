import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(req: Request) {
  // @ts-ignore
  const env = (req as any).context?.env || process.env;
  
  const debugInfo = {
    runtime: 'edge',
    hasContextEnv: !!(req as any).context?.env,
    hasProcessEnv: !!process.env,
    envKeys: Object.keys(env || {}).filter(k => !k.includes('SECRET') && !k.includes('KEY')),
    serviceBindings: Object.keys(env || {}).filter(k => k.includes('SERVICE') || k.includes('WORKFLOW')),
    firebaseConfig: {
      hasProjectId: !!(env?.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID),
      hasApiKey: !!(env?.FIREBASE_API_KEY || process.env.FIREBASE_API_KEY),
      projectIdValue: (env?.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID)?.substring(0, 4) + '...',
    },
    workflowBinding: !!env?.SCAN_WORKFLOW_SERVICE
  };

  return NextResponse.json(debugInfo);
}
