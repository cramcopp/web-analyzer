const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const DATABASE_ID = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID;
const API_KEY = process.env.FIREBASE_API_KEY;
const INTERNAL_SECRET = process.env.INTERNAL_SECRET;

/**
 * Updates a user document in Firestore using the REST API and a shared secret.
 * This bypasses the need for Service Account keys by using a dedicated Security Rule.
 */
export async function updateStripeSubscription(uid: string, data: {
  plan: string;
  subscriptionId: string | null;
  trialUntil: string | null;
}) {
  // Firestore REST API Patch with API Key
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/users/${uid}?key=${API_KEY}&updateMask.fieldPaths=plan&updateMask.fieldPaths=subscriptionId&updateMask.fieldPaths=trialUntil&updateMask.fieldPaths=internalSecret`;

  // We need to fetch the current document first to merge or just send the fields we want to update.
  // Using query params updateMask to only touch specific fields.
  
  const body = {
    fields: {
      plan: { stringValue: data.plan },
      subscriptionId: data.subscriptionId ? { stringValue: data.subscriptionId } : { nullValue: null },
      trialUntil: data.trialUntil ? { stringValue: data.trialUntil } : { nullValue: null },
      internalSecret: { stringValue: INTERNAL_SECRET }
    }
  };

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.json();
    console.error('Firestore REST API Error:', error);
    // If it fails, maybe the document doesn't exist?
    throw new Error(`Firestore update failed: ${error.error?.message || 'Unknown error'}`);
  }

  return res.json();
}
