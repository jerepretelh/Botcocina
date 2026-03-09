alter table public.weekly_plans
  add column if not exists week_start_date date not null default current_date;

create unique index if not exists idx_weekly_plans_one_active_per_user
  on public.weekly_plans(user_id)
  where status = 'active';

alter table public.weekly_plan_items
  add column if not exists recipe_name_snapshot text,
  add column if not exists quantity_mode text,
  add column if not exists people_count integer,
  add column if not exists amount_unit text,
  add column if not exists available_count integer,
  add column if not exists selected_optional_ingredients jsonb not null default '[]'::jsonb,
  add column if not exists source_context_summary jsonb,
  add column if not exists resolved_portion smallint,
  add column if not exists scale_factor numeric(10,4) not null default 1;

alter table public.weekly_plan_items
  drop constraint if exists weekly_plan_items_quantity_mode_check;

alter table public.weekly_plan_items
  add constraint weekly_plan_items_quantity_mode_check
  check (quantity_mode is null or quantity_mode in ('people', 'have'));

alter table public.weekly_plan_items
  drop constraint if exists weekly_plan_items_amount_unit_check;

alter table public.weekly_plan_items
  add constraint weekly_plan_items_amount_unit_check
  check (amount_unit is null or amount_unit in ('units', 'grams'));

create index if not exists idx_weekly_plan_items_day_slot_sort
  on public.weekly_plan_items(weekly_plan_id, day_of_week, slot, sort_order);
