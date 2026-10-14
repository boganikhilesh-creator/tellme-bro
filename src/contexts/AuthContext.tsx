'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  nickname?: string | null;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR' | 'USER';
  avatarUrl?: string | null;
  emailVerified: boolean;
  totpEnabled: boolean;
  createdAt: string;
  primaryLocation?: {
    city?: string;
    state?: string;
    country?: string;
  } | null;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  refreshUser: () => Promise<UserProfile | null>;
  logout: () => Promise<void>;
  hasPermission: (allowedRoles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refreshUser: async () => null,
  logout: async () => {},
  hasPermission: () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = async (): Promise<UserProfile | null> => {
    try {
      const res = await fetch('/api/v1/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data?.user) {
          setUser(data.data.user);
          return data.data.user;
        }
      }
      setUser(null);
      return null;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const logout = async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      setUser(null);
      router.push('/login');
    }
  };

  const hasPermission = (allowedRoles: string[]) => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        refreshUser,
        logout,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
