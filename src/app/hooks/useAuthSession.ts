import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { AuthStatus } from '../../types';
import { isSupabaseEnabled, supabaseClient } from '../lib/supabaseClient';

const SESSION_INIT_TIMEOUT_MS = 4000;

function isNetworkErrorMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('failed to fetch') ||
    normalized.includes('network') ||
    normalized.includes('internet_disconnected') ||
    normalized.includes('load failed')
  );
}

function getOfflineMessage(): string {
  return 'Sin conexión a internet. No se pudo validar la sesión con Supabase.';
}

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

    const resolveOffline = () => {
      if (!active) return;
      setSession(null);
      setStatus('unauthenticated');
      setError(getOfflineMessage());
    };

    const getSessionWithTimeout = async () => {
      return await Promise.race([
        supabaseClient.auth.getSession(),
        new Promise<never>((_, reject) => {
          window.setTimeout(() => reject(new Error('auth-session-timeout')), SESSION_INIT_TIMEOUT_MS);
        }),
      ]);
    };

    const init = async () => {
      if (!navigator.onLine) {
        resolveOffline();
        return;
      }

      try {
        const current = await getSessionWithTimeout();
        if (!active) return;
        if (current.error) {
          const nextMessage = current.error.message;
          if (isNetworkErrorMessage(nextMessage)) {
            resolveOffline();
            return;
          }
          setError(nextMessage);
        }
        await applySession(current.data.session);
      } catch (error) {
        if (!active) return;
        const nextMessage = error instanceof Error ? error.message : '';
        if (nextMessage === 'auth-session-timeout' || !navigator.onLine || isNetworkErrorMessage(nextMessage)) {
          resolveOffline();
          return;
        }
        setSession(null);
        setStatus('unauthenticated');
        setError(nextMessage || 'No se pudo validar la sesión actual.');
      }
    };

    void init();

    const handleOnline = () => {
      setStatus('loading');
      setError(null);
      void init();
    };

    const handleOffline = () => {
      resolveOffline();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const listener = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      setError(null);
      void applySession(nextSession);
    });

    return () => {
      active = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      listener.data.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabaseClient) {
      throw new Error('Supabase Auth no está disponible.');
    }
    if (!navigator.onLine) {
      const offlineError = new Error(getOfflineMessage());
      setError(offlineError.message);
      throw offlineError;
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
    if (!navigator.onLine) {
      const offlineError = new Error(getOfflineMessage());
      setError(offlineError.message);
      throw offlineError;
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
