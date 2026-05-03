import { NextResponse } from 'next/server';
import { getSessionUser, getSessionToken } from '@/lib/auth-server';
import { getDocument, updateDocument } from '@/lib/firestore-edge';
import { getRuntimeEnv } from '@/lib/cloudflare-env';
import { getCloudflareUserProfile, patchCloudflareUserProfile, upsertCloudflareUserProfile } from '@/lib/cloudflare-storage';

export const runtime = 'nodejs';

export async function GET() {
  const env = getRuntimeEnv();
  const user = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  try {
    let userData: any = await getCloudflareUserProfile(env, user.uid).catch((error) => {
      console.warn('D1 user lookup skipped:', error instanceof Error ? error.message : 'unknown');
      return null;
    });
    if (!userData) {
      userData = await getDocument('users', user.uid, token, env).catch(() => null);
      if (userData) {
        await upsertCloudflareUserProfile(env, user, userData).catch((error) => {
          console.warn('D1 user backfill skipped:', error instanceof Error ? error.message : 'unknown');
        });
      }
    }
    
    // Monthly Scan Reset Logic
    if (userData) {
      const now = new Date();
      const lastReset = userData.lastScanReset ? new Date(userData.lastScanReset) : new Date(userData.createdAt || now);
      
      const isNewMonth = now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear();
      
      if (isNewMonth) {
        console.warn(`Resetting scanCount for user ${user.uid} (New Month)`);
        const resetData = {
          scanCount: 0,
          lastScanReset: now.toISOString()
        };
        await patchCloudflareUserProfile(env, user.uid, resetData).catch((error) => {
          console.warn('D1 monthly scan reset skipped:', error instanceof Error ? error.message : 'unknown');
        });
        await updateDocument('users', user.uid, resetData, token, env).catch((error) => {
          console.warn('Firestore monthly scan reset skipped:', error instanceof Error ? error.message : 'unknown');
        });
        // Fetch updated data
        userData = await getCloudflareUserProfile(env, user.uid).catch(() => null) || await getDocument('users', user.uid, token, env).catch(() => null);
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
    
    const d1Updated = await patchCloudflareUserProfile(env, user.uid, filteredData).catch((error) => {
      console.warn('D1 user profile update skipped:', error instanceof Error ? error.message : 'unknown');
      return false;
    });

    try {
      await updateDocument('users', user.uid, filteredData, token, env);
    } catch (firestoreError) {
      if (!d1Updated) throw firestoreError;
      console.warn('Firestore user profile update skipped during D1 transition:', firestoreError instanceof Error ? firestoreError.message : 'unknown');
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update User Firestore Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
