import { NextResponse } from 'next/server';
import { queryDocuments } from '@/lib/firestore-edge';
import { getRuntimeEnv } from '@/lib/cloudflare-env';

export const runtime = 'nodejs';

async function hashValue(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function isAuthorizedSecret(secret: string | null) {
  const expected = getRuntimeEnv().INTERNAL_SECRET;
  if (!secret || !expected) return false;
  const [providedHash, expectedHash] = await Promise.all([hashValue(secret), hashValue(expected)]);
  let diff = providedHash.length ^ expectedHash.length;
  const length = Math.max(providedHash.length, expectedHash.length);
  for (let i = 0; i < length; i++) {
    diff |= (providedHash.charCodeAt(i) || 0) ^ (expectedHash.charCodeAt(i) || 0);
  }
  return diff === 0;
}

export async function GET(req: Request) {
  const env = getRuntimeEnv();
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');

  if (!(await isAuthorizedSecret(secret))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Get all projects with cron enabled using Edge-compatible query
    // We use the adminSecret bypass in firestore-edge
    const projects = await queryDocuments('projects', [
      { field: 'cronEnabled', op: 'EQUAL', value: true }
    ], 'AND', env.INTERNAL_SECRET, env);

    console.warn(`Cron Monitor: Processing ${projects.length} projects`);

    const results: any[] = [];
    const BATCH_SIZE = 3; // Reduced batch size for edge environment stability

    for (let i = 0; i < projects.length; i += BATCH_SIZE) {
      const batch = projects.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (project) => {
        try {
          console.warn(`Triggering workflow for project: ${project.url}`);
          
          // Trigger workflow instead of direct analysis to save bundle size
          const analyzeRes = await fetch(`${new URL(req.url).origin}/api/analyze`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${secret}` // Internal secret as bearer
            },
            body: JSON.stringify({ url: project.url, plan: 'pro' })
          });

          if (!analyzeRes.ok) throw new Error(`Workflow trigger failed: ${analyzeRes.status}`);
          const { audit_id } = await analyzeRes.json();

          return { project: project.name, status: 'started', auditId: audit_id };
        } catch (err: any) {
          console.error(`Failed to trigger project ${project.url}:`, err.message);
          return { project: project.url, status: 'error', error: err.message };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return NextResponse.json({ processed: projects.length, results });

  } catch (error: any) {
    console.error('Cron Monitor Global Error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
