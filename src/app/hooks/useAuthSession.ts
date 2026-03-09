import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { AuthStatus } from '../../types';
import { isSupabaseEnabled, supabaseClient } from '../lib/supabaseClient';

function isAnonymousSession(session: Session | null): boolean {
  return session?.user?.is_anonymous === true;
}

export function useAuthSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>(isSupabaseEnabled ? 'loading' : 'unauthenticated');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseEnabled || !supabaseClient) {
      setStatus('unauthenticated');
      setError('Supabase Auth no está configurado en este entorno.');
      return;
    }

    let active = true;

    const applySession = async (nextSession: Session | null) => {
      if (!active) return;

      if (isAnonymousSession(nextSession)) {
        await supabaseClient.auth.signOut();
        if (!active) return;
        setSession(null);
        setStatus('unauthenticated');
        return;
      }

      setSession(nextSession);
      setStatus(nextSession ? 'authenticated' : 'unauthenticated');
    };

    const init = async () => {
      const current = await supabaseClient.auth.getSession();
      if (!active) return;
      if (current.error) {
        setError(current.error.message);
      }
      await applySession(current.data.session);
    };

    void init();

    const listener = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      setError(null);
      void applySession(nextSession);
    });

    return () => {
      active = false;
      listener.data.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabaseClient) {
      throw new Error('Supabase Auth no está disponible.');
    }
    setError(null);
    const result = await supabaseClient.auth.signInWithPassword({ email, password });
    if (result.error) {
      setError(result.error.message);
      throw result.error;
    }
    return result.data;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabaseClient) {
      throw new Error('Supabase Auth no está disponible.');
    }
    setError(null);
    const result = await supabaseClient.auth.signUp({ email, password });
    if (result.error) {
      setError(result.error.message);
      throw result.error;
    }
    return result.data;
  }, []);

  const signOut = useCallback(async () => {
    if (!supabaseClient) return;
    setError(null);
    const result = await supabaseClient.auth.signOut();
    if (result.error) {
      setError(result.error.message);
      throw result.error;
    }
  }, []);

  return useMemo(
    () => ({
      session,
      user: (session?.user ?? null) as User | null,
      userId: session?.user?.id ?? null,
      isReady: status !== 'loading',
      isAuthenticated: status === 'authenticated',
      status,
      error,
      signIn,
      signUp,
      signOut,
      isSupabaseEnabled,
    }),
    [session, status, error, signIn, signOut, signUp],
  );
}
