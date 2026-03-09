alter table public.shopping_list_items
  add column if not exists source_type text not null default 'plan_auto',
  add column if not exists source_plan_item_id uuid references public.weekly_plan_items(id) on delete set null;

update public.shopping_list_items
set source_type = 'plan_auto'
where source_type is null;

alter table public.shopping_list_items
  drop constraint if exists shopping_list_items_source_type_check;

alter table public.shopping_list_items
  add constraint shopping_list_items_source_type_check
  check (source_type in ('plan_auto', 'manual'));

create index if not exists idx_shopping_list_items_source_type
  on public.shopping_list_items(shopping_list_id, source_type, sort_order);

create index if not exists idx_shopping_list_items_source_plan_item
  on public.shopping_list_items(source_plan_item_id);
