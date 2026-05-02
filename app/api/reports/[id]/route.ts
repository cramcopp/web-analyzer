import { NextResponse } from 'next/server';
import { getSessionUser, getSessionToken } from '@/lib/auth-server';
import { getDocument, updateDocument } from '@/lib/firestore-edge';
import { getRuntimeEnv } from '@/lib/cloudflare-env';
import { reportSaveSchema } from '@/lib/validations';

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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const env = getRuntimeEnv();
  const { id } = await params;
  const user = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const existing = await getDocument('reports', id, token, env);
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (existing.userId !== user.uid) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 });
    }

    const body = await req.json();
    const result = reportSaveSchema.partial().safeParse(body);

    if (!result.success) {
      return NextResponse.json({
        error: result.error.issues[0]?.message || 'Ungueltige Daten',
      }, { status: 400 });
    }

    const updated = await updateDocument('reports', id, {
      ...result.data,
      status: body.status || existing.status || 'completed',
      progress: typeof body.progress === 'number' ? body.progress : 100,
      updatedAt: new Date().toISOString(),
    }, token, env);

    return NextResponse.json({ id, success: true, report: updated });
  } catch (error: any) {
    const msg = error instanceof Error ? error.message : 'Unknown Firestore Error';
    console.error(`[API] Error updating report ${id}:`, msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
