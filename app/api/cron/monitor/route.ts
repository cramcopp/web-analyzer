import { NextResponse } from 'next/server';
import { getRuntimeEnv } from '@/lib/cloudflare-env';
import { normalizePlan } from '@/lib/plans';
import {
  createCloudflareScanPlaceholder,
  getCloudflareProject,
  getCloudflareUserProfile,
  hasCloudflareD1,
  queryCloudflareDueScheduledScans,
  updateCloudflareScheduledScanRun,
} from '@/lib/cloudflare-storage';

export const runtime = 'nodejs';

type ScanJob = {
  id?: string;
  userId?: string;
  projectId?: string;
  url: string;
  plan?: string;
  frequency?: 'daily' | 'weekly' | 'monthly';
  source: 'scheduledScans';
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

function nextRunAt(frequency: ScanJob['frequency'] = 'weekly') {
  const next = new Date();
  if (frequency === 'daily') next.setDate(next.getDate() + 1);
  else if (frequency === 'monthly') next.setMonth(next.getMonth() + 1);
  else next.setDate(next.getDate() + 7);
  return next.toISOString();
}

async function loadDueJobs(env: any): Promise<ScanJob[]> {
  const schedules = await queryCloudflareDueScheduledScans(env);
  const seen = new Set<string>();

  const jobs = await Promise.all(schedules
    .filter((schedule: any) => schedule.url)
    .map(async (schedule: any) => {
      const userProfile = schedule.userId
        ? await getCloudflareUserProfile(env, schedule.userId).catch(() => null)
        : null;
      const userPlan = typeof userProfile?.plan === 'string' ? normalizePlan(userProfile.plan) : null;
      const project = schedule.userId && schedule.projectId
        ? await getCloudflareProject(env, schedule.projectId, schedule.userId).catch(() => null)
        : null;
      const projectPlan = project && !('forbidden' in project) && typeof project.plan === 'string' ? normalizePlan(project.plan) : null;

      return {
        id: schedule.id,
        userId: schedule.userId,
        projectId: schedule.projectId,
        url: schedule.url,
        plan: userPlan || projectPlan || normalizePlan(schedule.plan || 'free'),
        frequency: schedule.frequency || 'weekly',
        source: 'scheduledScans' as const,
      };
    }));

  return jobs
    .filter((job) => {
      const key = `${job.id || job.projectId}:${job.url}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

async function triggerWorkflow(env: any, job: ScanJob) {
  if (!env.SCAN_WORKFLOW_SERVICE) {
    throw new Error('SCAN_WORKFLOW_SERVICE ist nicht gebunden');
  }

  const auditId = crypto.randomUUID();
  const now = new Date().toISOString();
  const scanPlan = normalizePlan(job.plan || 'free');

  const created = await createCloudflareScanPlaceholder(env, {
    id: auditId,
    userId: job.userId || '',
    projectId: job.projectId,
    url: job.url,
    plan: scanPlan,
    status: 'scanning',
    progress: 0,
    createdAt: now,
  });

  if (!created) {
    throw new Error('D1 cron scan placeholder konnte nicht erstellt werden');
  }

  const response = await env.SCAN_WORKFLOW_SERVICE.fetch(new Request('https://scan-workflow/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: job.url,
      plan: scanPlan,
      userId: job.userId,
      projectId: job.projectId,
      auditId,
    }),
  }));

  if (!response.ok) {
    throw new Error(`Workflow trigger failed: ${response.status}`);
  }

  if (job.id) {
    await updateCloudflareScheduledScanRun(env, {
      id: job.id,
      lastRunAt: now,
      nextRunAt: nextRunAt(job.frequency),
    });
  }

  return { auditId, url: job.url, projectId: job.projectId, plan: scanPlan, source: job.source };
}

export async function GET(req: Request) {
  const env = getRuntimeEnv();
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');

  if (!(await isAuthorizedSecret(secret))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasCloudflareD1(env)) {
    return NextResponse.json({ error: 'Cloudflare D1 ist nicht verfuegbar' }, { status: 503 });
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
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Failed to trigger scheduled scan ${job.url}:`, message);
          return { url: job.url, projectId: job.projectId, status: 'error', error: message };
        }
      }));
      results.push(...batchResults);
    }

    return NextResponse.json({ processed: jobs.length, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Cron Monitor Global Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
