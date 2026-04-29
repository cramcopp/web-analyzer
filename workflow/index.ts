// @ts-ignore
import { WorkerEntrypoint } from 'cloudflare:workers';
import { ScanWorkflow } from '../lib/workflow-scanner';

export { ScanWorkflow };

// @ts-ignore
export default class extends WorkerEntrypoint<{ SCAN_WORKFLOW: Workflow }> {
  async startScan(params: any) {
    // @ts-ignore
    const instance = await this.env.SCAN_WORKFLOW.create({ params });
    return { id: instance.id };
  }

  async fetch(request: Request) {
    return new Response("Workflow Worker is running. Trigger it via startScan RPC.");
  }
}
