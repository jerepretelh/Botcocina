create table if not exists public.fixed_recipes (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  scope_key text not null default 'global',
  title text not null,
  recipe_json jsonb not null,
  source text not null default 'import',
  owner_user_id uuid references auth.users(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists idx_fixed_recipes_slug_scope
  on public.fixed_recipes(slug, scope_key);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'fixed_recipes_source_check'
  ) then
    alter table public.fixed_recipes
      add constraint fixed_recipes_source_check
      check (source in ('seed', 'import', 'ai'));
  end if;
end $$;

create index if not exists idx_fixed_recipes_owner_active
  on public.fixed_recipes(owner_user_id, is_active, updated_at desc);

create index if not exists idx_fixed_recipes_global_active
  on public.fixed_recipes(is_active, updated_at desc)
  where owner_user_id is null;

alter table public.fixed_recipes enable row level security;

drop policy if exists fixed_recipes_select_runtime on public.fixed_recipes;
create policy fixed_recipes_select_runtime
  on public.fixed_recipes for select
  using (
    auth.role() = 'authenticated'
    and is_active = true
    and (owner_user_id is null or owner_user_id = auth.uid())
  );

drop policy if exists fixed_recipes_insert_owner on public.fixed_recipes;
create policy fixed_recipes_insert_owner
  on public.fixed_recipes for insert
  with check (
    auth.role() = 'authenticated'
    and owner_user_id = auth.uid()
  );

drop policy if exists fixed_recipes_update_owner on public.fixed_recipes;
create policy fixed_recipes_update_owner
  on public.fixed_recipes for update
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

drop policy if exists fixed_recipes_delete_owner on public.fixed_recipes;
create policy fixed_recipes_delete_owner
  on public.fixed_recipes for delete
  using (owner_user_id = auth.uid());
