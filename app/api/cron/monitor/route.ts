import { NextResponse } from 'next/server';
import { queryDocuments, addDocument, updateDocument, incrementField } from '@/lib/firestore-edge';

export const runtime = 'edge';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');

  if (secret !== process.env.INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Get all projects with cron enabled using Edge-compatible query
    // We use the adminSecret bypass in firestore-edge
    const projects = await queryDocuments('projects', [
      { field: 'cronEnabled', op: 'EQUAL', value: true }
    ], 'AND', process.env.INTERNAL_SECRET);

    console.log(`Cron Monitor: Processing ${projects.length} projects`);

    const results: any[] = [];
    const BATCH_SIZE = 3; // Reduced batch size for edge environment stability

    for (let i = 0; i < projects.length; i += BATCH_SIZE) {
      const batch = projects.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (project) => {
        try {
          console.log(`Triggering workflow for project: ${project.url}`);
          
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
