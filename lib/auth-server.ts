import { cookies } from 'next/headers';

/**
 * Verifies the session cookie and returns the user information.
 * Uses the Firebase REST API to ensure Edge compatibility.
 */
export async function getSessionToken() {
  const cookieStore = await cookies();
  return cookieStore.get('wap_session')?.value;
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
    console.error('getSessionUser error:', error);
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
  return true;
}

