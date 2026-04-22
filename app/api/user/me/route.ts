import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { getDocument } from '@/lib/firestore-edge';

export const runtime = 'edge';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  try {
    const userData = await getDocument('users', user.uid);
    
    return NextResponse.json({
      authenticated: true,
      user: user,
      userData: userData
    });
  } catch (error: any) {
    console.error('Fetch Me Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
