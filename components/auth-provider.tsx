'use client';

import { createContext, useContext, useEffect, useState } from 'react';

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
  const [user, setUser] = useState<any | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkSession = async () => {
    try {
      const res = await fetch('/api/user/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        
        if (data.userData) {
          setUserData(data.userData);
        } else {
          // Sync/Create profile if it doesn't exist
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
    } catch (e) {
      setUser(null);
      setUserData(null);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    checkSession();
  }, []);

  const signIn = async () => {
    try {
      setError(null);
      // For Google Login, we now use a redirect flow or a new window handled by our API
      const res = await fetch('/api/auth/google/url');
      const { url } = await res.json();
      
      // Use a popup or redirect. For consistency with old UX, we can use a popup.
      const popup = window.open(url, 'GoogleAuth', 'width=500,height=600');
      
      // Listen for the success message from our callback route
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data.type === 'GSC_AUTH_SUCCESS') {
          await checkSession();
          window.removeEventListener('message', handleMessage);
        }
      };
      
      window.addEventListener('message', handleMessage);
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

      await checkSession();
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

      await checkSession();
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
      user, userData, loading, error, signIn, signInEmail, signUpEmail, logOut, updateUser, deleteAccount, clearError 
    }}>
      {children}
    </AuthContext.Provider>
  );
}
