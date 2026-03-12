/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
declare const __APP_METADATA__: {
  version: string;
  environment: 'production' | 'preview' | 'development';
};

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_ENABLED?: string;
  readonly VITE_SUPABASE_RECIPE_SEEDS_ENABLED?: string;
  readonly VITE_SUPABASE_USER_RECIPE_CONFIGS_ENABLED?: string;
  readonly VITE_AI_MOCK_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
