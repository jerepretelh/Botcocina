import { createClient } from '@supabase/supabase-js';

const viteEnv = (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {}) as Record<string, string | undefined>;
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
