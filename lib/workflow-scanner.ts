// @ts-ignore cloudflare:workers is provided by Wrangler for the workflow worker.
import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from 'cloudflare:workers';
import { performAnalysis } from './scanner';
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
    const { url, plan = 'free', auditId, userId = '', projectId } = event.payload;
    const targetUrl = normalizeTargetUrl(url);
    const reportId = auditId || crypto.randomUUID();

    try {
      await step.do('mark scan started', async () => {
        const created = await createCloudflareScanPlaceholder(this.env, {
          id: reportId,
          userId,
          projectId,
          url: targetUrl,
          plan,
          status: 'scanning',
          progress: 10,
        });

        if (!created) {
          throw new Error('D1 scan placeholder could not be created');
        }
      });

      const finalReport = await step.do('perform deterministic scan', async () => {
        const result = await performAnalysis({
          url: targetUrl,
          plan,
          userId,
          projectId,
          auditId: reportId,
          env: this.env,
        });

        const storedResult = await storeCloudflareScanArtifacts(this.env, result, { scanId: reportId, userId });
        await writeCloudflareScanResult(this.env, storedResult, { scanId: reportId, userId, projectId, plan });
        return storedResult;
      });

      return finalReport;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Workflow scan failed';
      console.error('Workflow Error:', message);
      await markCloudflareScanError(this.env, {
        scanId: reportId,
        userId,
        projectId,
        url: targetUrl,
        plan,
        message,
      }).catch((error) => console.warn('D1 scan error mark failed:', error instanceof Error ? error.message : 'unknown'));

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
