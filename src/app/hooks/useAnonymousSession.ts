import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseEnabled, supabaseClient } from '../lib/supabaseClient';

export function useAnonymousSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(!isSupabaseEnabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseEnabled || !supabaseClient) return;

    let active = true;

    const init = async () => {
      const current = await supabaseClient.auth.getSession();
      if (!active) return;
      if (current.error) {
        setError(current.error.message);
      }
      const currentSession = current.data.session;
      if (currentSession) {
        setSession(currentSession);
        setIsReady(true);
        return;
      }

      const signed = await supabaseClient.auth.signInAnonymously();
      if (!active) return;
      if (signed.error) {
        setError(signed.error.message);
      }
      setSession(signed.data.session ?? null);
      setIsReady(true);
    };

    void init();

    const listener = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
    });

    return () => {
      active = false;
      listener.data.subscription.unsubscribe();
    };
  }, []);

  return useMemo(
    () => ({
      session,
      userId: session?.user?.id ?? null,
      isReady,
      error,
      isSupabaseEnabled,
    }),
    [session, isReady, error],
  );
}

