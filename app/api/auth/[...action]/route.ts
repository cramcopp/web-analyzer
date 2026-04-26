import { NextResponse } from 'next/server';
import { POST as loginPOST } from './login';
import { POST as logoutPOST } from './logout';
import { GET as meGET } from './me';
import { POST as signupPOST } from './signup';

export const runtime = 'edge';

export async function GET(req: Request, { params }: { params: { action: string[] } }) {
  const action = params.action[0];
  if (action === 'me') return meGET(req);
  return NextResponse.json({ error: 'Not Found' }, { status: 404 });
}

export async function POST(req: Request, { params }: { params: { action: string[] } }) {
  const action = params.action[0];
  if (action === 'login') return loginPOST(req);
  if (action === 'logout') return logoutPOST(req);
  if (action === 'signup') return signupPOST(req);
  return NextResponse.json({ error: 'Not Found' }, { status: 404 });
}
