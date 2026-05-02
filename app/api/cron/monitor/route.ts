import { NextResponse } from 'next/server';
import { queryDocuments, setDocument, updateDocument } from '@/lib/firestore-edge';
import { getRuntimeEnv } from '@/lib/cloudflare-env';

export const runtime = 'nodejs';

type ScanJob = {
  id?: string;
  userId?: string;
  projectId?: string;
  url: string;
  plan?: string;
  frequency?: 'daily' | 'weekly' | 'monthly';
  source: 'scheduledScans' | 'legacyProject';
};

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

function isDue(nextRunAt?: string) {
  if (!nextRunAt) return true;
  return new Date(nextRunAt).getTime() <= Date.now();
}

function nextRunAt(frequency: ScanJob['frequency'] = 'weekly') {
  const next = new Date();
  if (frequency === 'daily') next.setDate(next.getDate() + 1);
  else if (frequency === 'monthly') next.setMonth(next.getMonth() + 1);
  else next.setDate(next.getDate() + 7);
  return next.toISOString();
}

async function loadDueJobs(env: any): Promise<ScanJob[]> {
  const [schedules, legacyProjects] = await Promise.all([
    queryDocuments<any>('scheduledScans', [
      { field: 'enabled', op: 'EQUAL', value: true },
    ], 'AND', env.INTERNAL_SECRET, env).catch(() => []),
    queryDocuments<any>('projects', [
      { field: 'cronEnabled', op: 'EQUAL', value: true },
    ], 'AND', env.INTERNAL_SECRET, env).catch(() => []),
  ]);

  const scheduledJobs = schedules
    .filter((schedule) => schedule.url && isDue(schedule.nextRunAt))
    .map((schedule) => ({
      id: schedule.id,
      userId: schedule.userId,
      projectId: schedule.projectId,
      url: schedule.url,
      plan: schedule.plan || 'pro',
      frequency: schedule.frequency || 'weekly',
      source: 'scheduledScans' as const,
    }));

  const legacyJobs = legacyProjects
    .filter((project) => project.url)
    .map((project) => ({
      id: project.id,
      userId: project.userId,
      projectId: project.id,
      url: project.url,
      plan: project.plan || 'pro',
      frequency: 'weekly' as const,
      source: 'legacyProject' as const,
    }));

  return [...scheduledJobs, ...legacyJobs];
}

async function triggerWorkflow(env: any, job: ScanJob) {
  if (!env.SCAN_WORKFLOW_SERVICE) {
    throw new Error('SCAN_WORKFLOW_SERVICE ist nicht gebunden');
  }

  const auditId = crypto.randomUUID();
  const now = new Date().toISOString();
  await setDocument('reports', auditId, {
    audit_id: auditId,
    userId: job.userId,
    projectId: job.projectId,
    url: job.url,
    urlObj: job.url,
    createdAt: now,
    status: 'scanning',
    progress: 0,
    planUsed: job.plan || 'pro',
    source: 'scheduledScans',
    adminSecret: env.INTERNAL_SECRET,
  }, null, null, env);

  const response = await env.SCAN_WORKFLOW_SERVICE.fetch(new Request('https://scan-workflow/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: job.url,
      plan: job.plan || 'pro',
      userId: job.userId,
      projectId: job.projectId,
      auditId,
    }),
  }));

  if (!response.ok) {
    throw new Error(`Workflow trigger failed: ${response.status}`);
  }

  if (job.source === 'scheduledScans' && job.id) {
    await updateDocument('scheduledScans', job.id, {
      lastRunAt: now,
      nextRunAt: nextRunAt(job.frequency),
      updatedAt: now,
    }, env.INTERNAL_SECRET, env).catch((error) => {
      console.warn('Scheduled scan timestamp update skipped:', error instanceof Error ? error.message : 'Unknown error');
    });
  }

  return { auditId, url: job.url, projectId: job.projectId, source: job.source };
}

export async function GET(req: Request) {
  const env = getRuntimeEnv();
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');

  if (!(await isAuthorizedSecret(secret))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const jobs = await loadDueJobs(env);
    console.warn(`Cron Monitor: Processing ${jobs.length} due scan jobs`);

    const results: any[] = [];
    const batchSize = 3;

    for (let i = 0; i < jobs.length; i += batchSize) {
      const batch = jobs.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(async (job) => {
        try {
          const result = await triggerWorkflow(env, job);
          return { ...result, status: 'started' };
        } catch (err: any) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          console.error(`Failed to trigger scheduled scan ${job.url}:`, message);
          return { url: job.url, projectId: job.projectId, status: 'error', error: message };
        }
      }));
      results.push(...batchResults);
    }

    return NextResponse.json({ processed: jobs.length, results });
  } catch (error: any) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Cron Monitor Global Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
