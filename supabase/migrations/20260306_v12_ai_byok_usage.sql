create table if not exists public.ai_provider_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ai_provider text not null default 'google_gemini',
  auth_mode text not null default 'platform_key',
  google_model text not null default 'gemini-2.5-flash',
  token_budget_mode text not null default 'none',
  monthly_token_limit integer,
  budget_amount numeric(12,2),
  is_key_configured boolean not null default false,
  key_last4 text,
  last_key_check_at timestamptz,
  last_key_check_status text not null default 'unknown',
  last_key_check_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_provider_settings_provider_check check (ai_provider in ('google_gemini')),
  constraint ai_provider_settings_auth_mode_check check (auth_mode in ('platform_key', 'user_key')),
  constraint ai_provider_settings_budget_mode_check check (token_budget_mode in ('none', 'app_limit', 'cloud_budget')),
  constraint ai_provider_settings_key_check_status check (last_key_check_status in ('unknown', 'valid', 'invalid')),
  constraint ai_provider_settings_monthly_limit_check check (monthly_token_limit is null or monthly_token_limit > 0),
  constraint ai_provider_settings_budget_amount_check check (budget_amount is null or budget_amount > 0)
);

create table if not exists public.ai_provider_secrets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ai_provider text not null default 'google_gemini',
  encrypted_key text not null,
  key_iv text not null,
  key_tag text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_provider_secrets_provider_check check (ai_provider in ('google_gemini'))
);

create table if not exists public.ai_request_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  model text not null,
  auth_mode text not null,
  request_kind text not null,
  request_status text not null,
  prompt_token_count integer not null default 0,
  candidates_token_count integer not null default 0,
  total_token_count integer not null default 0,
  estimated_cost numeric(12,6),
  budget_mode text not null default 'none',
  remaining_percent numeric(5,2),
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  constraint ai_request_usage_provider_check check (provider in ('google_gemini', 'openai')),
  constraint ai_request_usage_auth_mode_check check (auth_mode in ('platform_key', 'user_key')),
  constraint ai_request_usage_request_kind_check check (request_kind in ('generate', 'clarify', 'validate')),
  constraint ai_request_usage_request_status_check check (request_status in ('success', 'failed', 'blocked')),
  constraint ai_request_usage_budget_mode_check check (budget_mode in ('none', 'app_limit', 'cloud_budget')),
  constraint ai_request_usage_prompt_tokens_check check (prompt_token_count >= 0),
  constraint ai_request_usage_candidates_tokens_check check (candidates_token_count >= 0),
  constraint ai_request_usage_total_tokens_check check (total_token_count >= 0),
  constraint ai_request_usage_remaining_percent_check check (remaining_percent is null or (remaining_percent >= 0 and remaining_percent <= 100))
);

create index if not exists idx_ai_provider_settings_auth_mode on public.ai_provider_settings(auth_mode);
create index if not exists idx_ai_request_usage_user_created_at on public.ai_request_usage(user_id, created_at desc);
create index if not exists idx_ai_request_usage_user_status on public.ai_request_usage(user_id, request_status);

alter table public.ai_provider_settings enable row level security;
alter table public.ai_provider_secrets enable row level security;
alter table public.ai_request_usage enable row level security;

drop policy if exists ai_provider_settings_owner_all on public.ai_provider_settings;
create policy ai_provider_settings_owner_all
  on public.ai_provider_settings
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists ai_request_usage_owner_select on public.ai_request_usage;
create policy ai_request_usage_owner_select
  on public.ai_request_usage
  for select
  to authenticated
  using (auth.uid() = user_id);
