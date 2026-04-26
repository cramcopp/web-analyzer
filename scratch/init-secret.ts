
import { adminDb } from './lib/firebase-admin';

async function initSecret() {
  const secret = process.env.INTERNAL_SECRET;
  if (!secret) {
    console.error('INTERNAL_SECRET environment variable is not set.');
    return;
  }

  try {
    await adminDb.collection('_internal').doc('secrets').set({
      adminSecret: secret
    });
    console.log('Successfully initialized internal secret in Firestore.');
  } catch (error) {
    console.error('Error initializing secret:', error);
  }
}

initSecret();
