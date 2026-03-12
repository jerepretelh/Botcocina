create table if not exists public.user_recipe_progress_v2 (
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id text not null references public.recipes(id) on delete cascade,
  session_version integer not null default 2,
  plan_snapshot jsonb not null,
  runtime_state jsonb not null,
  active_timers jsonb not null default '{}'::jsonb,
  resource_locks jsonb not null default '{}'::jsonb,
  recommended_task_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

create index if not exists idx_user_recipe_progress_v2_user_id on public.user_recipe_progress_v2(user_id);
create index if not exists idx_user_recipe_progress_v2_updated_at on public.user_recipe_progress_v2(updated_at desc);

alter table public.user_recipe_progress_v2 enable row level security;

drop policy if exists user_recipe_progress_v2_owner_all on public.user_recipe_progress_v2;
create policy user_recipe_progress_v2_owner_all
  on public.user_recipe_progress_v2
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
