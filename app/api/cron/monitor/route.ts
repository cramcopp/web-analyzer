import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { performAnalysis } from '@/lib/scanner';


export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');

  if (secret !== process.env.INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Get all projects with cron enabled using Admin SDK (bypasses rules)
    const projectsSnapshot = await adminDb.collection('projects')
      .where('cronEnabled', '==', true)
      .get();
    
    const projects = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));


    console.log(`Cron Monitor: Processing ${projects.length} projects`);

    const results: any[] = [];
    const BATCH_SIZE = 5;

    for (let i = 0; i < projects.length; i += BATCH_SIZE) {
      const batch = projects.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (project) => {
        try {
          console.log(`Analyzing project ID: ${project.id}`);
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

          const reportRef = await adminDb.collection('reports').add({
            projectId: project.id,
            userId: project.userId,
            url: project.url,
            score: report.seo?.score || 0,
            results: JSON.stringify(report),
            rawScrapeData: JSON.stringify(scanData),
            createdAt: new Date().toISOString()
          });

          await adminDb.collection('projects').doc(project.id).update({
            lastReportId: reportRef.id,
            lastScore: report.seo?.score || 0,
            lastScanAt: new Date().toISOString()
          });

          const userDoc = await adminDb.collection('users').doc(project.userId).get();
          if (userDoc.exists) {
             const userData = userDoc.data();
             await adminDb.collection('users').doc(project.userId).update({
                scanCount: ((userData?.scanCount as number) || 0) + 1
             });
          }

          return { project: project.name, status: 'success', score: report.seo?.score };
        } catch (err: any) {
          console.error(`Failed to process project ID ${project.id}:`, err.message);
          return { project: project.name, status: 'error', error: err.message };
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
