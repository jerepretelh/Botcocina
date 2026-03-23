import { createClient } from '@supabase/supabase-js';

const importMetaEnv = import.meta as ImportMeta & { env?: Record<string, string | undefined> };
const viteEnv = importMetaEnv.env ?? {};
const supabaseUrl = viteEnv.VITE_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = viteEnv.VITE_SUPABASE_ANON_KEY?.trim() ?? '';
const supabaseEnabledFlag = (viteEnv.VITE_SUPABASE_ENABLED ?? 'false').trim().toLowerCase() === 'true';

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
