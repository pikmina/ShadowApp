import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { auth, googleAuthProvider } from '../lib/firebase';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';

export type DbUser = {
  id: number;
  uid: string;
  email: string;
  role: 'moderator' | 'superadmin';
};

interface AuthContextType {
  user: User | null;
  dbUser: DbUser | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
  syncUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [loading, setLoading] = useState(true);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const syncWithBackend = useCallback(async (firebaseUser: User, attempt = 1): Promise<void> => {
    try {
      const token = await firebaseUser.getIdToken();
      if (!token) return;

      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      const contentType = res.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');

      if (res.ok && isJson) {
        const text = await res.text();
        if (text.trim()) {
          try {
            const data = JSON.parse(text);
            if (data && typeof data === 'object') {
              setDbUser(data);
              return;
            }
          } catch (parseErr) {
            console.warn("Auth sync response was not valid JSON:", parseErr);
          }
        }
      }

      if (attempt < 3) {
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = setTimeout(() => {
          syncWithBackend(firebaseUser, attempt + 1);
        }, attempt * 1000);
      } else {
        setDbUser(prev => prev || {
          id: 0,
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          role: 'moderator'
        });
      }
    } catch (err) {
      if (attempt < 3) {
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = setTimeout(() => {
          syncWithBackend(firebaseUser, attempt + 1);
        }, attempt * 1000);
      } else {
        console.warn("Could not sync user with backend:", err);
        setDbUser(prev => prev || {
          id: 0,
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          role: 'moderator'
        });
      }
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        setDbUser(prev => prev || {
          id: 0,
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          role: 'moderator'
        });
        syncWithBackend(firebaseUser, 1);
      } else {
        setDbUser(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [syncWithBackend]);

  const signIn = async () => {
    await signInWithPopup(auth, googleAuthProvider);
  };

  const logout = async () => {
    await signOut(auth);
    setDbUser(null);
  };

  const getToken = async () => {
    if (!user) return null;
    return await user.getIdToken();
  };

  const syncUser = async () => {
    if (user) {
      await syncWithBackend(user, 1);
    }
  };

  return (
    <AuthContext.Provider value={{ user, dbUser, loading, signIn, logout, getToken, syncUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
