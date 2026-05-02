import { NextResponse } from 'next/server';
import { getSessionUser, getSessionToken } from '@/lib/auth-server';
import { getDocument } from '@/lib/firestore-edge';
import { getRuntimeEnv } from '@/lib/cloudflare-env';

export const runtime = 'nodejs';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const env = getRuntimeEnv();
  
  const { id } = await params;
  const user = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const report = await getDocument('reports', id, token, env);

    if (!report) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (report.userId !== user.uid) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 });
    }

    return NextResponse.json(report);
  } catch (error: any) {
    const msg = error instanceof Error ? error.message : 'Unknown Firestore Error';
    console.error(`[API] Error fetching report ${id}:`, msg);
    return NextResponse.json({ 
      error: msg,
      details: 'Prüfe ob die Firestore-Regeln den Zugriff erlauben und ob die Audit-ID korrekt ist.'
    }, { status: 500 });
  }
}
