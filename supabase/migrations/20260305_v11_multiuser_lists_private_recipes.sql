alter table public.recipes
  add column if not exists owner_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists visibility text not null default 'public';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'recipes_visibility_check'
  ) then
    alter table public.recipes
      add constraint recipes_visibility_check check (visibility in ('public', 'private'));
  end if;
end $$;

update public.recipes
set owner_user_id = null,
    visibility = 'public'
where owner_user_id is null;

create table if not exists public.user_recipe_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

create table if not exists public.user_list_recipes (
  list_id uuid not null references public.user_recipe_lists(id) on delete cascade,
  recipe_id text not null references public.recipes(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (list_id, recipe_id)
);

create table if not exists public.user_catalog_bootstrap (
  user_id uuid primary key references auth.users(id) on delete cascade,
  bootstrapped_at timestamptz not null default now()
);

create index if not exists idx_recipes_owner_user_id on public.recipes(owner_user_id);
create index if not exists idx_recipes_visibility on public.recipes(visibility);
create index if not exists idx_user_recipe_lists_user_id on public.user_recipe_lists(user_id);
create index if not exists idx_user_list_recipes_list_id on public.user_list_recipes(list_id);
create index if not exists idx_user_list_recipes_recipe_id on public.user_list_recipes(recipe_id);

alter table public.user_recipe_lists enable row level security;
alter table public.user_list_recipes enable row level security;
alter table public.user_catalog_bootstrap enable row level security;

drop policy if exists recipes_select_published on public.recipes;
create policy recipes_select_public_or_owned_private
  on public.recipes
  for select
  to anon, authenticated
  using (
    (is_published = true and visibility = 'public')
    or
    (owner_user_id = auth.uid() and visibility = 'private')
  );

drop policy if exists recipes_owner_private_write on public.recipes;
create policy recipes_owner_private_write
  on public.recipes
  for all
  to authenticated
  using (owner_user_id = auth.uid() and visibility = 'private')
  with check (owner_user_id = auth.uid() and visibility = 'private');

drop policy if exists recipe_ingredients_select_published on public.recipe_ingredients;
drop policy if exists recipe_ingredients_select_public_or_owned_private on public.recipe_ingredients;
create policy recipe_ingredients_select_public_or_owned_private
  on public.recipe_ingredients
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id
        and (
          (r.is_published = true and r.visibility = 'public')
          or
          (r.owner_user_id = auth.uid() and r.visibility = 'private')
        )
    )
  );

drop policy if exists recipe_ingredients_owner_private_write on public.recipe_ingredients;
create policy recipe_ingredients_owner_private_write
  on public.recipe_ingredients
  for all
  to authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id
        and r.owner_user_id = auth.uid()
        and r.visibility = 'private'
    )
  )
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id
        and r.owner_user_id = auth.uid()
        and r.visibility = 'private'
    )
  );

drop policy if exists recipe_substeps_select_published on public.recipe_substeps;
drop policy if exists recipe_substeps_select_public_or_owned_private on public.recipe_substeps;
create policy recipe_substeps_select_public_or_owned_private
  on public.recipe_substeps
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_substeps.recipe_id
        and (
          (r.is_published = true and r.visibility = 'public')
          or
          (r.owner_user_id = auth.uid() and r.visibility = 'private')
        )
    )
  );

drop policy if exists recipe_substeps_owner_private_write on public.recipe_substeps;
create policy recipe_substeps_owner_private_write
  on public.recipe_substeps
  for all
  to authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_substeps.recipe_id
        and r.owner_user_id = auth.uid()
        and r.visibility = 'private'
    )
  )
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_substeps.recipe_id
        and r.owner_user_id = auth.uid()
        and r.visibility = 'private'
    )
  );

drop policy if exists user_recipe_lists_owner_all on public.user_recipe_lists;
create policy user_recipe_lists_owner_all
  on public.user_recipe_lists
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists user_list_recipes_owner_all on public.user_list_recipes;
create policy user_list_recipes_owner_all
  on public.user_list_recipes
  for all
  to authenticated
  using (
    exists (
      select 1 from public.user_recipe_lists l
      where l.id = user_list_recipes.list_id
        and l.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.user_recipe_lists l
      where l.id = user_list_recipes.list_id
        and l.user_id = auth.uid()
    )
  );

drop policy if exists user_catalog_bootstrap_owner_all on public.user_catalog_bootstrap;
create policy user_catalog_bootstrap_owner_all
  on public.user_catalog_bootstrap
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
