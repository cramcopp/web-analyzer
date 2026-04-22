import { NextResponse } from 'next/server';
import { queryDocuments, addDocument, updateDocument, getDocument } from '@/lib/firestore-edge';
import { performAnalysis } from '@/lib/scanner';

export const runtime = 'edge';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');

  if (secret !== process.env.INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Get all projects with cron enabled
    const projects = await queryDocuments('projects', [
      { field: 'cronEnabled', op: 'EQUAL', value: true }
    ]);

    console.log(`Cron Monitor: Processing ${projects.length} projects`);

    const results = [];

    for (const project of projects) {
      try {
        console.log(`Analyzing project: ${project.name} (${project.url})`);
        
        // 2. Perform Scan
        // We use 'pro' plan logic for cron jobs to ensure we get enough data
        const scanData = await performAnalysis({ url: project.url, plan: 'pro' });

        // 3. Generate Report (AI)
        // We call the internal API to reuse the Gemini logic
        // In a real production environment, we'd use a shared helper
        const reportRes = await fetch(`${new URL(req.url).origin}/api/generate-report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...scanData, plan: 'pro' })
        });

        if (!reportRes.ok) throw new Error('AI Generation failed');
        const report = await reportRes.json();

        // 4. Save Report to Firestore
        const reportDoc = await addDocument('reports', {
          projectId: project.id,
          userId: project.userId,
          url: project.url,
          score: report.seo?.score || 0,
          results: JSON.stringify(report),
          rawScrapeData: JSON.stringify(scanData),
          createdAt: new Date().toISOString(),
          adminSecret: process.env.INTERNAL_SECRET
        });

        // 5. Update Project with latest report ID and score
        await updateDocument('projects', project.id, {
          lastReportId: reportDoc.id,
          lastScore: report.seo?.score || 0,
          lastScanAt: new Date().toISOString(),
          adminSecret: process.env.INTERNAL_SECRET
        });

        // 6. Quota check: Increment user scan count
        const user = await getDocument('users', project.userId);
        if (user) {
           await updateDocument('users', project.userId, {
              scanCount: (user.scanCount || 0) + 1,
              adminSecret: process.env.INTERNAL_SECRET
           });
        }

        results.push({ project: project.name, status: 'success', score: report.seo?.score });

      } catch (err: any) {
        console.error(`Failed to process project ${project.name}:`, err);
        results.push({ project: project.name, status: 'error', error: err.message });
      }
    }

    return NextResponse.json({ processed: projects.length, results });

  } catch (error: any) {
    console.error('Cron Monitor Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
