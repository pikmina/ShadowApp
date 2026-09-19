import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { auth, googleAuthProvider } from '../lib/firebase';
import { onAuthStateChanged, signInWithPopup, signOut, User, updateProfile } from 'firebase/auth';

export type DbUser = {
  id: number;
  uid: string;
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  role: 'moderator' | 'superadmin' | 'player';
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

interface AuthContextType {
  user: User | null;
  dbUser: DbUser | null;
  loading: boolean;
  unauthorized: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
  syncUser: () => Promise<void>;
  updateProfileData: (data: { displayName?: string | null; avatarUrl?: string | null }) => Promise<DbUser>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  const syncWithBackend = useCallback(async (firebaseUser: User): Promise<void> => {
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

      if (res.status === 401 || res.status === 403) {
        setUnauthorized(true);
        setDbUser(null);
        setLoading(false);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          setDbUser(data);
          setUnauthorized(false);
        }
      } else {
        setUnauthorized(true);
      }
    } catch (err) {
      console.error("Auth sync error:", err);
      setUnauthorized(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        setLoading(true);
        setUnauthorized(false);
        await syncWithBackend(firebaseUser);
      } else {
        setDbUser(null);
        setUnauthorized(false);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [syncWithBackend]);

  const signIn = async () => {
    await signInWithPopup(auth, googleAuthProvider);
  };

  const logout = async () => {
    await signOut(auth);
    setDbUser(null);
    setUnauthorized(false);
  };

  const getToken = async () => {
    if (!user) return null;
    return await user.getIdToken();
  };

  const syncUser = async () => {
    if (user) {
      await syncWithBackend(user);
    }
  };

  const updateProfileData = async (data: { displayName?: string | null; avatarUrl?: string | null }): Promise<DbUser> => {
    if (!user) throw new Error("No hay usuario autenticado");
    const token = await user.getIdToken();
    if (!token) throw new Error("No se pudo obtener el token de autenticación");

    const res = await fetch('/api/auth/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || "Error al actualizar el perfil");
    }

    const updatedDbUser: DbUser = await res.json();
    setDbUser(updatedDbUser);

    try {
      const fbClientUpdate: { displayName?: string; photoURL?: string } = {};
      if (data.displayName !== undefined) {
        fbClientUpdate.displayName = data.displayName || "";
      }
      if (data.avatarUrl !== undefined) {
        const trimmed = (data.avatarUrl || "").trim();
        if (!trimmed) {
          fbClientUpdate.photoURL = "";
        } else {
          try {
            const parsed = new URL(trimmed);
            if (parsed.protocol === "http:" || parsed.protocol === "https:") {
              fbClientUpdate.photoURL = trimmed;
            }
          } catch {
            // Data URL or non-HTTP URL: skip setting photoURL on Firebase Auth client
          }
        }
      }

      if (Object.keys(fbClientUpdate).length > 0) {
        await updateProfile(user, fbClientUpdate);
      }
      setUser({ ...user } as User);
    } catch (fbErr) {
      console.warn("Client Firebase updateProfile error:", fbErr);
    }

    return updatedDbUser;
  };

  return (
    <AuthContext.Provider value={{ user, dbUser, loading, unauthorized, signIn, logout, getToken, syncUser, updateProfileData }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
