import { NextResponse } from 'next/server';
import { GET as meGET } from './me';
import { POST as syncPOST } from './sync';

export const runtime = 'edge';

export async function GET(req: Request, { params }: { params: { action: string[] } }) {
  const action = params.action[0];
  if (action === 'me') return meGET(req);
  return NextResponse.json({ error: 'Not Found' }, { status: 404 });
}

export async function POST(req: Request, { params }: { params: { action: string[] } }) {
  const action = params.action[0];
  if (action === 'sync') return syncPOST(req);
  return NextResponse.json({ error: 'Not Found' }, { status: 404 });
}
