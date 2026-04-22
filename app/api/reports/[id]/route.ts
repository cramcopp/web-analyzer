import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { getDocument } from '@/lib/firestore-edge';

export const runtime = 'edge';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const report = await getDocument('reports', id);

    if (!report) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Ownership check (if userId exists)
    if (report.userId && report.userId !== user.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(report);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
