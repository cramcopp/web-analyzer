// @ts-ignore cloudflare:workers is provided by Wrangler for the workflow worker.
import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from 'cloudflare:workers';
import { performAnalysis } from './scanner';
import { setServerDocument } from './server-firestore';
import { toStoredReportDocument } from './report-storage';
import {
  createCloudflareScanPlaceholder,
  markCloudflareScanError,
  storeCloudflareScanArtifacts,
  writeCloudflareScanResult,
} from './cloudflare-storage';
import type { ScanOptions } from './scanner/types';

type WorkflowBinding = {
  create(options: { params: ScanOptions }): Promise<unknown>;
};

export interface Env {
  SCAN_WORKFLOW: WorkflowBinding;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_DATABASE_ID: string;
  FIREBASE_API_KEY: string;
  GOOGLE_SERVICE_ACCOUNT_JSON?: string;
  FIREBASE_SERVICE_ACCOUNT_JSON?: string;
  GEMINI_API_KEY?: string;
  AI_WORKFLOW_SUMMARY?: string;
  INTERNAL_SECRET: string;
  DB?: any;
  AUDIT_ARTIFACTS?: any;
  REPORT_EXPORTS?: any;
  CACHE?: any;
  SCAN_FANOUT_QUEUE?: any;
}

function normalizeTargetUrl(url: string) {
  return url.startsWith('http') ? url : `https://${url}`;
}

export class ScanWorkflow extends WorkflowEntrypoint<Env, ScanOptions> {
  declare env: Env;

  async run(event: WorkflowEvent<ScanOptions>, step: WorkflowStep) {
    const { url, plan = 'free', auditId, userId, projectId, token } = event.payload;
    const targetUrl = normalizeTargetUrl(url);
    const reportId = auditId || crypto.randomUUID();

    try {
      await step.do('mark scan started', async () => {
        await createCloudflareScanPlaceholder(this.env, {
          id: reportId,
          userId,
          projectId,
          url: targetUrl,
          plan,
          status: 'scanning',
          progress: 10,
        }).catch((error) => console.warn('D1 scan placeholder skipped:', error instanceof Error ? error.message : 'unknown'));

        await setServerDocument('reports', reportId, {
          audit_id: reportId,
          userId,
          url: targetUrl,
          urlObj: targetUrl,
          createdAt: new Date().toISOString(),
          status: 'scanning',
          progress: 10,
          ...(projectId ? { projectId } : {}),
        }, ['audit_id', 'userId', 'url', 'urlObj', 'createdAt', 'status', 'progress', ...(projectId ? ['projectId'] : [])], token, this.env);
      });

      const finalReport = await step.do('perform single deterministic scan', async () => {
        const result = await performAnalysis({
          url: targetUrl,
          plan,
          userId,
          projectId,
          auditId: reportId,
          env: this.env,
        });

        const storedResult = await storeCloudflareScanArtifacts(this.env, result, { scanId: reportId, userId });
        await writeCloudflareScanResult(this.env, storedResult, { scanId: reportId, userId, projectId, plan })
          .catch((error) => console.warn('D1/R2 scan write skipped:', error instanceof Error ? error.message : 'unknown'));

        const report = toStoredReportDocument(storedResult, reportId, userId, projectId);

        await setServerDocument('reports', reportId, report, Object.keys(report), token, this.env);
        return report;
      });

      return finalReport;
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'Workflow scan failed';
      console.error('Workflow Error:', message);
      await markCloudflareScanError(this.env, {
        scanId: reportId,
        userId,
        projectId,
        url: targetUrl,
        plan,
        message,
      }).catch((error) => console.warn('D1 scan error mark skipped:', error instanceof Error ? error.message : 'unknown'));

      await setServerDocument('reports', reportId, {
        audit_id: reportId,
        userId,
        url: targetUrl,
        urlObj: targetUrl,
        createdAt: new Date().toISOString(),
        status: 'error',
        progress: 100,
        results: JSON.stringify({ error: message }),
        ...(projectId ? { projectId } : {}),
      }, ['audit_id', 'userId', 'url', 'urlObj', 'createdAt', 'status', 'progress', 'results', ...(projectId ? ['projectId'] : [])], token, this.env);
      throw err;
    }
  }
}

const workflowHttpEntrypoint = {
  async fetch(req: Request, env: Env) {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const params = await req.json() as ScanOptions;
    await env.SCAN_WORKFLOW.create({ params });
    return Response.json({ success: true });
  },
};

export default workflowHttpEntrypoint;
