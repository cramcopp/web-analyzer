import { NextResponse } from 'next/server';
import { getSessionUser, getSessionToken } from '@/lib/auth-server';
import { getDocument, updateDocument } from '@/lib/firestore-edge';
import { getRuntimeEnv } from '@/lib/cloudflare-env';

export const runtime = 'nodejs';

export async function GET() {
  const env = getRuntimeEnv();
  const user = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  try {
    let userData = await getDocument('users', user.uid, token, env);
    
    // Monthly Scan Reset Logic
    if (userData) {
      const now = new Date();
      const lastReset = userData.lastScanReset ? new Date(userData.lastScanReset) : new Date(userData.createdAt || now);
      
      const isNewMonth = now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear();
      
      if (isNewMonth) {
        console.warn(`Resetting scanCount for user ${user.uid} (New Month)`);
        await updateDocument('users', user.uid, {
          scanCount: 0,
          lastScanReset: now.toISOString()
        }, token, env);
        // Fetch updated data
        userData = await getDocument('users', user.uid, token, env);
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
  const env = getRuntimeEnv();
  const user = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  try {
    const data = await req.json();
    
    // SEC-02: Privilege Escalation Fix
    // Only allow updating non-sensitive profile fields.
    // Specifically block: role, plan, maxScans, scanCount, subscriptionId, etc.
    const allowedFields = ['displayName', 'photoURL', 'brandLogo'];
    const filteredData: any = {};
    
    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        filteredData[key] = data[key];
      }
    }

    if (Object.keys(filteredData).length === 0) {
      return NextResponse.json({ error: 'Keine gültigen Felder zum Aktualisieren angegeben' }, { status: 400 });
    }
    
    await updateDocument('users', user.uid, filteredData, token, env);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update User Firestore Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
