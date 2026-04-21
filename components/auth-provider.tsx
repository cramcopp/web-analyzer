'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, signInWithPopup, GoogleAuthProvider, signOut, 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  updateProfile, verifyBeforeUpdateEmail, updatePassword, deleteUser 
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  userData: any | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signInEmail: (email: string, pass: string) => Promise<void>;
  signUpEmail: (email: string, pass: string, name: string) => Promise<void>;
  logOut: () => Promise<void>;
  updateUser: (data: { displayName?: string; email?: string; password?: string }) => Promise<void>;
  deleteAccount: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  error: null,
  signIn: async () => {},
  signInEmail: async (email: string, pass: string) => {},
  signUpEmail: async (email: string, pass: string, name: string) => {},
  logOut: async () => {},
  updateUser: async (data: { displayName?: string; email?: string; password?: string }) => {},
  deleteAccount: async () => {},
  clearError: () => {}
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Automatically sync user profile to firestore
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            await setDoc(userRef, {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              role: 'user', 
              plan: 'free', 
              subpageLimit: 0, 
              scanCount: 0,
              maxScans: 5,
              resetDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
              createdAt: new Date().toISOString()
            });
          }
        } catch (e) {
          console.error('Error syncing user profile:', e);
        }
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Real-time Firestore user data sync
  useEffect(() => {
    if (!user) {
      setUserData(null);
      return;
    }

    const unsub = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        setUserData(doc.data());
      }
    });

    return () => unsub();
  }, [user]);

  const signIn = async () => {
    try {
      setError(null);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (e: any) {
      console.error("Sign in failed", e);
      if (e.code === 'auth/popup-closed-by-user') {
        setError('Das Anmeldefenster wurde geschlossen, bevor die Anmeldung abgeschlossen werden konnte. Bitte versuche es erneut.');
      } else {
        setError(e.message || 'Anmeldung fehlgeschlagen.');
      }
    }
  };

  const signInEmail = async (email: string, pass: string) => {
    try {
      setError(null);
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (e: any) {
      console.error("Email sign in failed", e);
      setError(e.message || 'Anmeldung fehlgeschlagen.');
      throw e;
    }
  };

  const signUpEmail = async (email: string, pass: string, name: string) => {
    try {
      setError(null);
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(cred.user, { displayName: name });
      // The onAuthStateChanged hook will sync to firestore
    } catch (e: any) {
      console.error("Email sign up failed", e);
      setError(e.message || 'Registrierung fehlgeschlagen.');
      throw e;
    }
  };

  const updateUser = async (data: { displayName?: string; email?: string; password?: string }) => {
    if (!user) return;
    try {
      setError(null);
      if (data.displayName) {
        await updateProfile(user, { displayName: data.displayName });
        await setDoc(doc(db, 'users', user.uid), { displayName: data.displayName }, { merge: true });
      }
      if (data.email) {
        await verifyBeforeUpdateEmail(user, data.email);
        // Note: Firestore email won't update until they verify, 
        // but we can update it now or wait. 
        // usually verifyBeforeUpdateEmail handles the auth side.
        // We'll update the Firestore record for consistency, 
        // though it might be slightly out of sync until verified.
        await setDoc(doc(db, 'users', user.uid), { email: data.email }, { merge: true });
      }
      if (data.password) {
        await updatePassword(user, data.password);
      }
      // Re-trigger user state update manually if needed, or rely on updateProfile effects
      setUser({ ...auth.currentUser } as User);
    } catch (e: any) {
      console.error("Update user failed", e);
      if (e.code === 'auth/requires-recent-login') {
        setError('Diese Aktion erfordert eine aktuelle Anmeldung. Bitte melde dich erneut an und versuche es noch einmal.');
      } else {
        setError(e.message || 'Aktualisierung fehlgeschlagen.');
      }
      throw e;
    }
  };

  const deleteAccount = async () => {
    if (!user) return;
    try {
      setError(null);
      const uid = user.uid;
      await deleteDoc(doc(db, 'users', uid));
      await deleteUser(user);
    } catch (e: any) {
      console.error("Delete account failed", e);
      if (e.code === 'auth/requires-recent-login') {
        setError('Das Löschen des Accounts erfordert eine aktuelle Anmeldung. Bitte melde dich erneut an und versuche es noch einmal.');
      } else {
        setError(e.message || 'Löschen fehlgeschlagen.');
      }
      throw e;
    }
  };

  const logOut = async () => {
    try {
      await signOut(auth);
    } catch (e: any) {
      console.error("Sign out failed", e);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider value={{ 
      user, userData, loading, error, signIn, signInEmail, signUpEmail, logOut, updateUser, deleteAccount, clearError 
    }}>
      {children}
    </AuthContext.Provider>
  );
}
