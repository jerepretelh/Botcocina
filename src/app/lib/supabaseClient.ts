import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';
const supabaseEnabledFlag = (import.meta.env.VITE_SUPABASE_ENABLED ?? 'false').trim().toLowerCase() === 'true';

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
