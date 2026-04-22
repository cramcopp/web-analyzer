import { NextResponse } from 'next/server';
import { getSessionUser, getSessionToken } from '@/lib/auth-server';
import { getDocument, updateDocument } from '@/lib/firestore-edge';

export const runtime = 'edge';

export async function GET() {
  const user = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  try {
    let userData = await getDocument('users', user.uid, token);
    
    // Monthly Scan Reset Logic
    if (userData) {
      const now = new Date();
      const lastReset = userData.lastScanReset ? new Date(userData.lastScanReset) : new Date(userData.createdAt || now);
      
      const isNewMonth = now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear();
      
      if (isNewMonth) {
        console.log(`Resetting scanCount for user ${user.uid} (New Month)`);
        await updateDocument('users', user.uid, {
          scanCount: 0,
          lastScanReset: now.toISOString()
        }, token);
        // Fetch updated data
        userData = await getDocument('users', user.uid, token);
      }
    }
    
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

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  try {
    const data = await req.json();
    // Prevent sensitive fields from being updated here if necessary
    const { uid, email, role, createdAt, ...allowedData } = data;
    
    await updateDocument('users', user.uid, allowedData, token);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update User Firestore Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
