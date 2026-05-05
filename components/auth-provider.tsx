'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface AuthContextType {
  user: any | null;
  userData: any | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signInEmail: (email: string, pass: string) => Promise<void>;
  signUpEmail: (email: string, pass: string, name: string) => Promise<void>;
  logOut: () => Promise<void>;
  updateUser: (data: { displayName?: string; email?: string; password?: string }) => Promise<void>;
  updateUserData: (data: any) => Promise<void>;
  deleteAccount: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  error: null,
  signIn: async () => {},
  signInEmail: async (_email: string, _pass: string) => {},
  signUpEmail: async (_email: string, _pass: string, _name: string) => {},
  logOut: async () => {},
  updateUser: async (_data: { displayName?: string; email?: string; password?: string }) => {},
  updateUserData: async (_data: any) => {},
  deleteAccount: async () => {},
  clearError: () => {}
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch('/api/user/me');
      if (res.ok) {
        const data = await res.json();
        if (!data.authenticated || !data.user) {
          setUser(null);
          setUserData(null);
          return;
        }

        setUser(data.user);

        if (data.userData && data.userData.plan) {
          setUserData(data.userData);
        } else {
          // Sync/Create profile if it doesn't exist or is missing core fields
          const syncRes = await fetch('/api/user/sync', { method: 'POST' });
          if (syncRes.ok) {
            const syncData = await syncRes.json();
            setUserData(syncData.user);
          }
        }
      } else {
        setUser(null);
        setUserData(null);
      }
    } catch {
      setUser(null);
      setUserData(null);
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkSession();
  }, [checkSession]);

  const signIn = async () => {
    try {
      setError(null);
      const res = await fetch('/api/auth/google/url');
      if (!res.ok) {
        throw new Error(`Auth URL API failed with status ${res.status}`);
      }
      const data = await res.json();
      const { url } = data;
      
      const popup = window.open(url, 'GoogleAuth', 'width=500,height=600');
      if (!popup) {
        throw new Error('Popup wurde blockiert. Bitte Popups für diese Seite erlauben.');
      }
      
      const handleMessage = async (event: MessageEvent) => {
        // We accept messages from our own origin
        if (event.origin !== window.location.origin) return;
        if (event.data.type === 'GSC_AUTH_SUCCESS') {
          window.location.reload();
          try {
            popup.close();
          } catch {
            // Some browser COOP policies block opener operations after Google OAuth.
          }
        } else if (event.data.type === 'AUTH_ERROR') {
          setError(event.data.message || 'Anmeldung fehlgeschlagen.');
        }
      };
      
      window.addEventListener('message', handleMessage);

      const handleFocus = () => {
        window.setTimeout(() => {
          void checkSession();
        }, 500);
      };

      window.addEventListener('focus', handleFocus);

      window.setTimeout(() => {
        window.removeEventListener('message', handleMessage);
        window.removeEventListener('focus', handleFocus);
        void checkSession();
      }, 120000);

    } catch (e: any) {
      console.error("Sign in failed", e);
      setError(e.message || 'Anmeldung fehlgeschlagen.');
    }
  };

  const signInEmail = async (email: string, pass: string) => {
    try {
      setError(null);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Anmeldung fehlgeschlagen');
      }

      window.location.reload();
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  };

  const signUpEmail = async (email: string, pass: string, name: string) => {
    try {
      setError(null);
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass, displayName: name })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Registrierung fehlgeschlagen');
      }

      window.location.reload();
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  };

  const updateUser = async (data: { displayName?: string; email?: string; password?: string }) => {
    try {
      setError(null);
      const res = await fetch('/api/user/management', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Update fehlgeschlagen');
      }
      await checkSession();
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  };
  
  const updateUserData = async (data: any) => {
    try {
      setError(null);
      const res = await fetch('/api/user/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Update fehlgeschlagen');
      }
      await checkSession();
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  };

  const deleteAccount = async () => {
    try {
      setError(null);
      const res = await fetch('/api/user/management', { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Löschen fehlgeschlagen');
      }
      setUser(null);
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  };


  const logOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setUserData(null);
    } catch (e: any) {
      console.error("Sign out failed", e);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider value={{ 
      user, userData, loading, error, signIn, signInEmail, signUpEmail, logOut, updateUser, updateUserData, deleteAccount, clearError 
    }}>
      {children}
    </AuthContext.Provider>
  );
}
