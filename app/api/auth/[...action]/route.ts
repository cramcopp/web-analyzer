import { NextRequest, NextResponse } from 'next/server';
import { POST as loginPOST } from './login';
import { POST as logoutPOST } from './logout';
import { GET as meGET } from './me';
import { POST as signupPOST } from './signup';

export const runtime = 'edge';

export async function GET(req: NextRequest, { params }: { params: Promise<{ action: string[] }> }) {
  const { action } = await params;
  const mainAction = action[0];
  if (mainAction === 'me') return meGET(req);
  return NextResponse.json({ error: 'Not Found' }, { status: 404 });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ action: string[] }> }) {
  const { action } = await params;
  const mainAction = action[0];
  if (mainAction === 'login') return loginPOST(req);
  if (mainAction === 'logout') return logoutPOST(req);
  if (mainAction === 'signup') return signupPOST(req);
  return NextResponse.json({ error: 'Not Found' }, { status: 404 });
}
