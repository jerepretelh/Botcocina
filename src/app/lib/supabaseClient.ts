import { createClient } from '@supabase/supabase-js';

const importMetaEnv = import.meta as ImportMeta & { env?: Record<string, string | undefined> };
const viteEnv = importMetaEnv.env ?? {};
const supabaseUrl = viteEnv.VITE_SUPABASE_URL?.trim() || __SUPABASE_CLIENT_CONFIG__.url || '';
const supabaseAnonKey = viteEnv.VITE_SUPABASE_ANON_KEY?.trim() || __SUPABASE_CLIENT_CONFIG__.anonKey || '';
const supabaseEnabledFlag =
  ((viteEnv.VITE_SUPABASE_ENABLED ?? '').trim()
    ? (viteEnv.VITE_SUPABASE_ENABLED ?? 'false').trim().toLowerCase() === 'true'
    : __SUPABASE_CLIENT_CONFIG__.enabled);

export const isSupabaseEnabled = Boolean(supabaseEnabledFlag && supabaseUrl && supabaseAnonKey);

export const supabaseClient = isSupabaseEnabled
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
