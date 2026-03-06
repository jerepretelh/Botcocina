create extension if not exists pgcrypto;

create table if not exists public.recipe_categories (
  id text primary key,
  name text not null,
  icon text not null,
  description text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.recipes (
  id text primary key,
  category_id text not null references public.recipe_categories(id) on delete restrict,
  name text not null,
  icon text not null,
  emoji text,
  ingredient text not null,
  description text not null,
  equipment text,
  tip text not null default 'Ten todo listo antes de empezar.',
  portion_label_singular text not null default 'porción',
  portion_label_plural text not null default 'porciones',
  source text not null default 'manual',
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipes_source_check check (source in ('manual', 'imported', 'ai'))
);

create table if not exists public.recipe_ingredients (
  id bigint generated always as identity primary key,
  recipe_id text not null references public.recipes(id) on delete cascade,
  sort_order integer not null default 0,
  name text not null,
  emoji text not null default '🍽️',
  indispensable boolean not null default false,
  p1 text not null,
  p2 text not null,
  p4 text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.recipe_substeps (
  id bigint generated always as identity primary key,
  recipe_id text not null references public.recipes(id) on delete cascade,
  substep_order integer not null,
  step_number integer,
  step_name text,
  substep_name text not null,
  notes text not null default '',
  is_timer boolean not null default false,
  p1 text not null,
  p2 text not null,
  p4 text not null,
  fire_level text,
  equipment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipe_substeps_fire_level_check check (fire_level is null or fire_level in ('low', 'medium', 'high'))
);

create table if not exists public.user_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id text not null references public.recipes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

create table if not exists public.user_recipe_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id text not null references public.recipes(id) on delete cascade,
  current_step_index integer not null default 0,
  current_substep_index integer not null default 0,
  active_step_loop jsonb,
  timer_state jsonb,
  session_id uuid,
  last_saved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

create table if not exists public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Plan semanal',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weekly_plans_status_check check (status in ('active', 'archived'))
);

create table if not exists public.weekly_plan_items (
  id uuid primary key default gen_random_uuid(),
  weekly_plan_id uuid not null references public.weekly_plans(id) on delete cascade,
  day_of_week smallint,
  slot text,
  recipe_id text references public.recipes(id) on delete set null,
  fixed_servings integer,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weekly_plan_id uuid references public.weekly_plans(id) on delete set null,
  title text not null default 'Lista de compras',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shopping_lists_status_check check (status in ('active', 'archived'))
);

create table if not exists public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  shopping_list_id uuid not null references public.shopping_lists(id) on delete cascade,
  item_name text not null,
  quantity_text text,
  is_checked boolean not null default false,
  source_recipe_id text references public.recipes(id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.import_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  status text not null default 'running',
  rows_read integer not null default 0,
  rows_inserted integer not null default 0,
  rows_updated integer not null default 0,
  error_count integer not null default 0,
  errors jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  constraint import_runs_status_check check (status in ('running', 'success', 'failed'))
);

create table if not exists public.ai_recipe_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  prompt text not null,
  mode text not null default 'generate',
  status text not null default 'created',
  recipe_id text references public.recipes(id) on delete set null,
  raw_response jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_recipe_generations_mode_check check (mode in ('generate', 'clarify')),
  constraint ai_recipe_generations_status_check check (status in ('created', 'approved', 'rejected', 'failed'))
);

create table if not exists public.product_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  session_id uuid,
  event_name text not null,
  event_payload jsonb,
  event_ts timestamptz not null default now()
);

create index if not exists idx_recipes_category_id on public.recipes(category_id);
create index if not exists idx_recipes_is_published on public.recipes(is_published);
create index if not exists idx_recipe_ingredients_recipe_id_sort on public.recipe_ingredients(recipe_id, sort_order);
create index if not exists idx_recipe_substeps_recipe_id_order on public.recipe_substeps(recipe_id, substep_order);
create index if not exists idx_user_recipe_progress_user_id on public.user_recipe_progress(user_id);
create index if not exists idx_user_recipe_progress_updated_at on public.user_recipe_progress(updated_at desc);
create index if not exists idx_weekly_plans_user_id on public.weekly_plans(user_id);
create index if not exists idx_weekly_plan_items_plan_id on public.weekly_plan_items(weekly_plan_id);
create index if not exists idx_shopping_lists_user_id on public.shopping_lists(user_id);
create index if not exists idx_shopping_list_items_list_id on public.shopping_list_items(shopping_list_id);
create index if not exists idx_ai_recipe_generations_user_id on public.ai_recipe_generations(user_id);
create index if not exists idx_product_events_name_ts on public.product_events(event_name, event_ts desc);
create index if not exists idx_product_events_user_id on public.product_events(user_id);

alter table public.recipe_categories enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_substeps enable row level security;
alter table public.user_favorites enable row level security;
alter table public.user_recipe_progress enable row level security;
alter table public.weekly_plans enable row level security;
alter table public.weekly_plan_items enable row level security;
alter table public.shopping_lists enable row level security;
alter table public.shopping_list_items enable row level security;
alter table public.import_runs enable row level security;
alter table public.ai_recipe_generations enable row level security;
alter table public.product_events enable row level security;

drop policy if exists recipe_categories_select_public on public.recipe_categories;
create policy recipe_categories_select_public
  on public.recipe_categories
  for select
  to anon, authenticated
  using (true);

drop policy if exists recipes_select_published on public.recipes;
create policy recipes_select_published
  on public.recipes
  for select
  to anon, authenticated
  using (is_published = true);

drop policy if exists recipe_ingredients_select_published on public.recipe_ingredients;
create policy recipe_ingredients_select_published
  on public.recipe_ingredients
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id
        and r.is_published = true
    )
  );

drop policy if exists recipe_substeps_select_published on public.recipe_substeps;
create policy recipe_substeps_select_published
  on public.recipe_substeps
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_substeps.recipe_id
        and r.is_published = true
    )
  );

drop policy if exists user_favorites_owner_all on public.user_favorites;
create policy user_favorites_owner_all
  on public.user_favorites
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists user_recipe_progress_owner_all on public.user_recipe_progress;
create policy user_recipe_progress_owner_all
  on public.user_recipe_progress
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists weekly_plans_owner_all on public.weekly_plans;
create policy weekly_plans_owner_all
  on public.weekly_plans
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists weekly_plan_items_owner_all on public.weekly_plan_items;
create policy weekly_plan_items_owner_all
  on public.weekly_plan_items
  for all
  to authenticated
  using (
    exists (
      select 1 from public.weekly_plans wp
      where wp.id = weekly_plan_items.weekly_plan_id
        and wp.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.weekly_plans wp
      where wp.id = weekly_plan_items.weekly_plan_id
        and wp.user_id = auth.uid()
    )
  );

drop policy if exists shopping_lists_owner_all on public.shopping_lists;
create policy shopping_lists_owner_all
  on public.shopping_lists
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists shopping_list_items_owner_all on public.shopping_list_items;
create policy shopping_list_items_owner_all
  on public.shopping_list_items
  for all
  to authenticated
  using (
    exists (
      select 1 from public.shopping_lists sl
      where sl.id = shopping_list_items.shopping_list_id
        and sl.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.shopping_lists sl
      where sl.id = shopping_list_items.shopping_list_id
        and sl.user_id = auth.uid()
    )
  );

drop policy if exists ai_recipe_generations_owner_rw on public.ai_recipe_generations;
create policy ai_recipe_generations_owner_rw
  on public.ai_recipe_generations
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists product_events_insert_owner on public.product_events;
create policy product_events_insert_owner
  on public.product_events
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists product_events_select_owner on public.product_events;
create policy product_events_select_owner
  on public.product_events
  for select
  to authenticated
  using (auth.uid() = user_id);
