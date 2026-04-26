import { NextResponse } from 'next/server';
import { getSessionUser, getSessionToken } from '@/lib/auth-server';
import { getDocument } from '@/lib/firestore-edge';

export const runtime = 'edge';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const report = await getDocument('reports', id, token);

    if (!report) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (report.userId !== user.uid) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 });
    }

    return NextResponse.json(report);
  } catch (error: any) {

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
