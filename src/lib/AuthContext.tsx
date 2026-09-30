'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'USER' | 'ADMIN';
  credits: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => Promise<void>;
  switchUser: (username: string) => Promise<boolean>;
  refreshUser: () => Promise<void>;
  deductCreditsLocally: (amount: number) => void;
  addCreditsLocally: (amount: number) => void;
  crtEnabled: boolean;
  toggleCrt: () => void;
  sfxEnabled: boolean;
  toggleSfx: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [crtEnabled, setCrtEnabled] = useState(false);
  const [sfxEnabled, setSfxEnabled] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
    // Load stored token if present
    const savedToken = localStorage.getItem('arcade_token');
    if (savedToken) setToken(savedToken);
  }, [refreshUser]);

  const login = async (email: string, pass: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('arcade_token', data.token);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('arcade_token');
    }
  };

  const switchUser = async (username: string) => {
    try {
      const res = await fetch('/api/auth/switch-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('arcade_token', data.token);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const deductCreditsLocally = (amount: number) => {
    setUser((prev) => (prev ? { ...prev, credits: Math.max(0, prev.credits - amount) } : null));
  };

  const addCreditsLocally = (amount: number) => {
    setUser((prev) => (prev ? { ...prev, credits: prev.credits + amount } : null));
  };

  const toggleCrt = () => setCrtEnabled((prev) => !prev);
  const toggleSfx = () => {
    setSfxEnabled((prev) => {
      const next = !prev;
      import('@/lib/soundFx').then(({ soundFx }) => {
        soundFx.enabled = next;
      });
      return next;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        switchUser,
        refreshUser,
        deductCreditsLocally,
        addCreditsLocally,
        crtEnabled,
        toggleCrt,
        sfxEnabled,
        toggleSfx,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
