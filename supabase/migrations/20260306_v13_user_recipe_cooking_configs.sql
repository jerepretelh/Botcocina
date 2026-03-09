create table if not exists public.user_recipe_cooking_configs (
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id text not null references public.recipes(id) on delete cascade,
  quantity_mode text not null default 'people',
  people_count integer,
  amount_unit text,
  available_count integer,
  selected_optional_ingredients jsonb not null default '[]'::jsonb,
  source_context_summary jsonb,
  last_used_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, recipe_id),
  constraint user_recipe_cooking_configs_quantity_mode_check check (quantity_mode in ('people', 'have')),
  constraint user_recipe_cooking_configs_amount_unit_check check (amount_unit is null or amount_unit in ('units', 'grams'))
);

create index if not exists idx_user_recipe_cooking_configs_user_id on public.user_recipe_cooking_configs(user_id);
create index if not exists idx_user_recipe_cooking_configs_recipe_id on public.user_recipe_cooking_configs(recipe_id);
create index if not exists idx_user_recipe_cooking_configs_last_used_at on public.user_recipe_cooking_configs(last_used_at desc);

alter table public.user_recipe_cooking_configs enable row level security;

drop policy if exists user_recipe_cooking_configs_owner_rw on public.user_recipe_cooking_configs;
create policy user_recipe_cooking_configs_owner_rw
  on public.user_recipe_cooking_configs
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
