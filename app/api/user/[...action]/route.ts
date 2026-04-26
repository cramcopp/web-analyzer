import { NextResponse } from 'next/server';
import { GET as meGET } from './me';
import { POST as syncPOST } from './sync';

export const runtime = 'edge';

export async function GET(req: Request, { params }: { params: Promise<{ action: string[] }> }) {
  const { action } = await params;
  const mainAction = action[0];
  if (mainAction === 'me') return meGET(req);
  return NextResponse.json({ error: 'Not Found' }, { status: 404 });
}

export async function POST(req: Request, { params }: { params: Promise<{ action: string[] }> }) {
  const { action } = await params;
  const mainAction = action[0];
  if (mainAction === 'sync') return syncPOST(req);
  return NextResponse.json({ error: 'Not Found' }, { status: 404 });
}
