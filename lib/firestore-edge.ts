import * as jose from 'jose';

const PROJECT_ID = 'web-analyzer-493602';
const DATABASE_ID = 'ai-studio-07ef72ae-2e23-4af2-921d-d87a095a3626';

/**
 * Gets an OAuth2 access token for a Google Service Account using the 'jose' library.
 * Works in Edge Runtime.
 */
async function getAccessToken(clientEmail: string, privateKey: string) {
  const now = Math.floor(Date.now() / 1000);
  
  // Clean up private key if it's coming from an environment variable with escaped newlines
  const formattedKey = privateKey.replace(/\\n/g, '\n');

  const jwt = await new jose.SignJWT({
    iss: clientEmail,
    sub: clientEmail,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/datastore',
  })
    .setProtectedHeader({ alg: 'RS256' })
    .sign(await jose.importPKCS8(formattedKey, 'RS256'));

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(`Failed to get access token: ${error.error_description || error.error}`);
  }

  const { access_token } = await res.json();
  return access_token;
}

/**
 * Updates a user document in Firestore using the REST API.
 * This is an Edge-compatible replacement for firebase-admin's update/set.
 */
export async function updateStripeSubscription(uid: string, data: {
  plan: string;
  subscriptionId: string | null;
  trialUntil: string | null;
}) {
  const clientEmail = process.env.FIREBASE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    console.warn('Firebase Service Account credentials missing. Skipping Firestore update.');
    return;
  }

  const accessToken = await getAccessToken(clientEmail, privateKey);
  
  // Firestore REST API Patch
  // https://firestore.googleapis.com/v1/projects/{projectId}/databases/{databaseId}/documents/users/{uid}?updateMask.fieldPaths=plan&updateMask.fieldPaths=subscriptionId&updateMask.fieldPaths=trialUntil
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/users/${uid}?updateMask.fieldPaths=plan&updateMask.fieldPaths=subscriptionId&updateMask.fieldPaths=trialUntil`;

  const body = {
    fields: {
      plan: { stringValue: data.plan },
      subscriptionId: data.subscriptionId ? { stringValue: data.subscriptionId } : { nullValue: null },
      trialUntil: data.trialUntil ? { stringValue: data.trialUntil } : { nullValue: null }
    }
  };

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.json();
    console.error('Firestore REST API Error:', error);
    throw new Error(`Firestore update failed: ${error.error?.message || 'Unknown error'}`);
  }

  return res.json();
}
