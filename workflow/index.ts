import { ScanWorkflow } from '../lib/workflow-scanner';

export { ScanWorkflow };

export default {
  async fetch(request: Request, env: any) {
    return new Response("Workflow Worker is running. Trigger it via Service Binding or API.");
  }
};
