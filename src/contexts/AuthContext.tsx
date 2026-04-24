'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { DocuMindUser } from '@/types';
import * as storage from '@/lib/storage';
import { generateId } from '@/lib/utils';

interface AuthContextValue {
  user: DocuMindUser | null;
  isLoading: boolean;
  login: (name: string) => void;
  renameUser: (name: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<DocuMindUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const stored = storage.getUser();

    queueMicrotask(() => {
      setUser(stored);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!isLoading && !user && pathname !== '/auth') {
      router.replace('/auth');
    }
  }, [user, isLoading, pathname, router]);

  const login = useCallback((name: string) => {
    const newUser: DocuMindUser = {
      id: generateId(),
      name: name.trim(),
      createdAt: new Date().toISOString(),
    };
    storage.setUser(newUser);
    setUser(newUser);
    router.replace('/');
  }, [router]);

  const renameUser = useCallback((name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName || !user) return false;

    const updatedUser: DocuMindUser = {
      ...user,
      name: trimmedName,
    };

    storage.setUser(updatedUser);
    setUser(updatedUser);
    return true;
  }, [user]);

  const logout = useCallback(() => {
    storage.clearAllUserData();
    setUser(null);
    router.replace('/auth');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, renameUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
