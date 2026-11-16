'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase/client';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  supabaseOn: boolean;
  /** Resolves to the raw access token, or null when signed out. */
  accessToken: () => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<{ needsConfirm: boolean }>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resendConfirmation: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabaseOn, setSupabaseOn] = useState(true);

  useEffect(() => {
    let sub: { unsubscribe: () => void } | null = null;
    try {
      const client = getSupabaseClient();
      client.auth.getSession().then(({ data }) => {
        setSession(data.session);
        setLoading(false);
      });
      const { data } = client.auth.onAuthStateChange((_evt, s) => setSession(s));
      sub = data.subscription;
    } catch {
      setSupabaseOn(false);
      setLoading(false);
    }
    return () => sub?.unsubscribe();
  }, []);

  const accessToken = useCallback(async () => {
    try {
      const { data } = await getSupabaseClient().auth.getSession();
      return data.session?.access_token || null;
    } catch {
      return null;
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await getSupabaseClient().auth.signUp({ email, password });
    if (error) throw new Error(error.message);
    return { needsConfirm: !data.session };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await getSupabaseClient().auth.signOut();
    } catch {
      /* offline */
    }
    setSession(null);
  }, []);

  const resendConfirmation = useCallback(async (email: string) => {
    const { error } = await getSupabaseClient().auth.resend({ type: 'signup', email });
    if (error) throw new Error(error.message);
  }, []);

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user || null, loading, supabaseOn, accessToken, signUp, signIn, signOut, resendConfirmation }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
