import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { AuthStatus } from '../../types';
import { isSupabaseEnabled, supabaseClient } from '../lib/supabaseClient';
import {
  AUTH_CONFIGURATION_ERROR,
  AUTH_OFFLINE_MESSAGE,
  AUTH_SESSION_TIMEOUT_MS,
  buildPasswordResetRedirectUrl,
  isNetworkErrorMessage,
  normalizeAuthErrorMessage,
} from './useAuthSession.helpers';

function isAnonymousSession(session: Session | null): boolean {
  return session?.user?.is_anonymous === true;
}

export function useAuthSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>(isSupabaseEnabled ? 'loading' : 'unauthenticated');
  const [error, setError] = useState<string | null>(isSupabaseEnabled ? null : AUTH_CONFIGURATION_ERROR);
  const [authFlow, setAuthFlow] = useState<'default' | 'password_recovery'>('default');

  const applySession = useCallback(async (nextSession: Session | null) => {
    if (isAnonymousSession(nextSession)) {
      await supabaseClient?.auth.signOut();
      setSession(null);
      setStatus('unauthenticated');
      return;
    }

    setSession(nextSession);
    setStatus(nextSession ? 'authenticated' : 'unauthenticated');
  }, []);

  const resolveOffline = useCallback(() => {
    setSession(null);
    setStatus('unauthenticated');
    setError(AUTH_OFFLINE_MESSAGE);
  }, []);

  const refreshSession = useCallback(async () => {
    if (!isSupabaseEnabled || !supabaseClient) {
      setSession(null);
      setStatus('unauthenticated');
      setError(AUTH_CONFIGURATION_ERROR);
      setAuthFlow('default');
      return;
    }

    if (!navigator.onLine) {
      resolveOffline();
      return;
    }

    setStatus('loading');
    setError(null);

    try {
      const current = await Promise.race([
        supabaseClient.auth.getSession(),
        new Promise<never>((_, reject) => {
          window.setTimeout(() => reject(new Error('auth-session-timeout')), AUTH_SESSION_TIMEOUT_MS);
        }),
      ]);

      if (current.error) {
        const nextMessage = current.error.message;
        if (isNetworkErrorMessage(nextMessage)) {
          resolveOffline();
          return;
        }
        setError(normalizeAuthErrorMessage(nextMessage, 'session'));
      }

      await applySession(current.data.session);
    } catch (nextError) {
      const nextMessage = nextError instanceof Error ? nextError.message : '';
      if (nextMessage === 'auth-session-timeout' || !navigator.onLine || isNetworkErrorMessage(nextMessage)) {
        resolveOffline();
        return;
      }
      setSession(null);
      setStatus('unauthenticated');
      setError(normalizeAuthErrorMessage(nextMessage, 'session'));
    }
  }, [applySession, resolveOffline]);

  useEffect(() => {
    if (!isSupabaseEnabled || !supabaseClient) {
      setSession(null);
      setStatus('unauthenticated');
      setError(AUTH_CONFIGURATION_ERROR);
      setAuthFlow('default');
      return;
    }

    let active = true;
    void refreshSession();

    const handleOnline = () => {
      if (!active) return;
      void refreshSession();
    };

    const handleOffline = () => {
      if (!active) return;
      resolveOffline();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const listener = supabaseClient.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      setError(null);
      if (event === 'PASSWORD_RECOVERY') {
        setAuthFlow('password_recovery');
      } else if (event === 'SIGNED_OUT') {
        setAuthFlow('default');
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setAuthFlow('default');
      }
      void applySession(nextSession);
    });

    return () => {
      active = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      listener.data.subscription.unsubscribe();
    };
  }, [applySession, refreshSession, resolveOffline]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabaseClient) {
      setError(AUTH_CONFIGURATION_ERROR);
      throw new Error(AUTH_CONFIGURATION_ERROR);
      return { session: null, user: null };
    }
    if (!navigator.onLine) {
      const offlineError = new Error(AUTH_OFFLINE_MESSAGE);
      setError(offlineError.message);
      throw offlineError;
    }
    setError(null);
    const result = await supabaseClient.auth.signInWithPassword({ email, password });
    if (result.error) {
      setError(normalizeAuthErrorMessage(result.error.message, 'signin'));
      throw result.error;
    }
    setAuthFlow('default');
    return result.data;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabaseClient) {
      setError(AUTH_CONFIGURATION_ERROR);
      throw new Error(AUTH_CONFIGURATION_ERROR);
      return { session: null, user: null };
    }
    if (!navigator.onLine) {
      const offlineError = new Error(AUTH_OFFLINE_MESSAGE);
      setError(offlineError.message);
      throw offlineError;
    }
    setError(null);
    const result = await supabaseClient.auth.signUp({ email, password });
    if (result.error) {
      setError(normalizeAuthErrorMessage(result.error.message, 'signup'));
      throw result.error;
    }
    setAuthFlow('default');
    return result.data;
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    if (!supabaseClient) {
      setError(AUTH_CONFIGURATION_ERROR);
      throw new Error(AUTH_CONFIGURATION_ERROR);
    }
    if (!navigator.onLine) {
      const offlineError = new Error(AUTH_OFFLINE_MESSAGE);
      setError(offlineError.message);
      throw offlineError;
    }
    setError(null);
    const result = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: buildPasswordResetRedirectUrl(window.location),
    });
    if (result.error) {
      setError(normalizeAuthErrorMessage(result.error.message, 'request_reset'));
      throw result.error;
    }
    return { email };
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    if (!supabaseClient) {
      setError(AUTH_CONFIGURATION_ERROR);
      throw new Error(AUTH_CONFIGURATION_ERROR);
    }
    if (!navigator.onLine) {
      const offlineError = new Error(AUTH_OFFLINE_MESSAGE);
      setError(offlineError.message);
      throw offlineError;
    }
    setError(null);
    const result = await supabaseClient.auth.updateUser({ password });
    if (result.error) {
      setError(normalizeAuthErrorMessage(result.error.message, 'update_password'));
      throw result.error;
    }
    await supabaseClient.auth.signOut();
    setAuthFlow('default');
    return result.data;
  }, []);

  const signOut = useCallback(async () => {
    if (!supabaseClient) {
      setError(AUTH_CONFIGURATION_ERROR);
      throw new Error(AUTH_CONFIGURATION_ERROR);
    }
    setError(null);
    const result = await supabaseClient.auth.signOut();
    if (result.error) {
      setError(normalizeAuthErrorMessage(result.error.message, 'signout'));
      throw result.error;
    }
    setAuthFlow('default');
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
      authFlow,
      signIn,
      signUp,
      requestPasswordReset,
      updatePassword,
      signOut,
      retry: refreshSession,
      isSupabaseEnabled,
    }),
    [authFlow, error, refreshSession, session, signIn, signOut, signUp, status, requestPasswordReset, updatePassword],
  );
}
