alter table public.recipes
  add column if not exists experience text,
  add column if not exists compound_meta jsonb,
  add column if not exists base_yield_type text,
  add column if not exists base_yield_value numeric,
  add column if not exists base_yield_unit text,
  add column if not exists base_yield_label text,
  add column if not exists ingredients_json jsonb,
  add column if not exists steps_json jsonb,
  add column if not exists time_summary_json jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'recipes_experience_check'
  ) then
    alter table public.recipes
      add constraint recipes_experience_check
      check (experience is null or experience in ('standard', 'compound'));
  end if;
end $$;
