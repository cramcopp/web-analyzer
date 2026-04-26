import { cookies } from 'next/headers';
import { queryDocuments, deleteDocument } from './firestore-edge';

/**
 * Verifies the session cookie and returns the user information.
 * Uses the Firebase REST API to ensure Edge compatibility.
 */
export async function getSessionToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get('wap_session')?.value;
  const refreshToken = cookieStore.get('wap_refresh')?.value;

  if (!token) return null;

  // Basic check if token is valid via identitytoolkit lookup
  try {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${process.env.FIREBASE_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token })
    });

    if (response.ok) return token;

    // If token is invalid (e.g. expired), try to refresh it
    if (refreshToken) {
      console.log('ID Token expired, attempting refresh...');
      const newData = await refreshIdToken(refreshToken);
      
      // Update cookies
      cookieStore.set('wap_session', newData.idToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/'
      });
      cookieStore.set('wap_refresh', newData.refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/'
      });

      return newData.idToken;
    }

    return null;
  } catch (error) {
    console.error('getSessionToken error:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

async function refreshIdToken(refreshToken: string) {
  const url = `https://securetoken.googleapis.com/v1/token?key=${process.env.FIREBASE_API_KEY}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });

  if (!resp.ok) {
    throw new Error('Refresh failed');
  }

  const data = await resp.json();
  return {
    idToken: data.id_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in
  };
}

export async function getSessionUser() {
  const token = await getSessionToken();

  if (!token) return null;

  try {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${process.env.FIREBASE_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token })
    });

    if (!response.ok) return null;

    const data = await response.json();
    const user = data.users?.[0];

    if (!user) return null;

    return {
      uid: user.localId,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoUrl
    };
  } catch (error) {
    console.error('getSessionUser error:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}


export async function updateUserProfile(data: { displayName?: string; photoUrl?: string; email?: string; password?: string }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('wap_session')?.value;
  if (!token) throw new Error('Not authenticated');

  const url = `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${process.env.FIREBASE_API_KEY}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idToken: token,
      ...data,
      returnSecureToken: true
    })
  });

  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.error?.message || 'Update failed');
  }

  return await resp.json();
}


export async function deleteUserAccount() {
  const cookieStore = await cookies();
  const token = cookieStore.get('wap_session')?.value;
  if (!token) throw new Error('Not authenticated');

  // 1. Get User ID
  const user = await getSessionUser();
  if (!user) throw new Error('User not found');
  const uid = user.uid;

  // 2. Delete Firestore Data (GDPR - BIZ-10)
  try {
    // Delete Reports
    const reports = await queryDocuments('reports', [{ field: 'userId', op: 'EQUAL', value: uid }], 'AND', token);
    await Promise.all(reports.map(r => deleteDocument('reports', r.id, token)));

    // Delete Projects
    const projects = await queryDocuments('projects', [{ field: 'userId', op: 'EQUAL', value: uid }], 'AND', token);
    await Promise.all(projects.map(p => deleteDocument('projects', p.id, token)));

    // Delete User Profile
    await deleteDocument('users', uid, token);
  } catch (dbErr) {
    console.error('Firestore cleanup failed during account deletion');
    // We continue with Auth deletion anyway to ensure the account is closed
  }

  // 3. Delete Firebase Auth User
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${process.env.FIREBASE_API_KEY}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: token })
  });

  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.error?.message || 'Deletion failed');
  }

  cookieStore.delete('wap_session');
  cookieStore.delete('wap_refresh');
  return true;
}



export async function signInWithEmailRest(email: string, password: string) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      returnSecureToken: true
    })
  });

  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.error?.message || 'Login failed');
  }

  return await resp.json();
}

export async function signUpWithEmailRest(email: string, password: string) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${process.env.FIREBASE_API_KEY}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      returnSecureToken: true
    })
  });

  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.error?.message || 'Signup failed');
  }

  return await resp.json();
}
