import { NextResponse } from 'next/server';
import { queryDocuments, addDocument, updateDocument, incrementField } from '@/lib/firestore-edge';
import { performAnalysis } from '@/lib/scanner';

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
          console.log(`Analyzing project: ${project.url}`);
          const scanData = await performAnalysis({ url: project.url, plan: 'pro' });

          const reportRes = await fetch(`${new URL(req.url).origin}/api/generate-report`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-admin-secret': process.env.INTERNAL_SECRET || ''
            },
            body: JSON.stringify({ ...scanData, plan: 'pro' })
          });

          if (!reportRes.ok) throw new Error('AI Generation failed');
          const report = await reportRes.json();

          // Save report via Edge SDK
          const reportData = {
            projectId: project.id,
            userId: project.userId,
            url: project.url,
            score: report.seo?.score || 0,
            results: JSON.stringify(report),
            rawScrapeData: JSON.stringify(scanData),
            createdAt: new Date().toISOString(),
            adminSecret: process.env.INTERNAL_SECRET
          };

          const newReport = await addDocument('reports', reportData, process.env.INTERNAL_SECRET);

          // Update project with last report info
          await updateDocument('projects', project.id, {
            lastReportId: newReport.id,
            lastScore: report.seo?.score || 0,
            lastScanAt: new Date().toISOString(),
            adminSecret: process.env.INTERNAL_SECRET
          });

          // Increment scan count for user
          await incrementField('users', project.userId, 'scanCount', 1, process.env.INTERNAL_SECRET);

          return { project: project.name, status: 'success', score: report.seo?.score };
        } catch (err: any) {
          console.error(`Failed to process project ${project.url}:`, err.message);
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
