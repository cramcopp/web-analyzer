import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// firebase.ts - SERVER-SIDE ONLY
// Diese Datei wird nur noch auf dem Server (Edge Runtime) genutzt.
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

// Falls wir aus Versehen im Client landen, werfen wir einen Fehler
if (typeof window !== 'undefined') {
  throw new Error("Sicherheits-Check: Firebase darf NICHT im Browser geladen werden.");
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const auth = getAuth(app);
