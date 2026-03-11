begin;

create table if not exists public.shopping_trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  shopping_list_id uuid not null references public.shopping_lists(id) on delete cascade,
  weekly_plan_id uuid references public.weekly_plans(id) on delete set null,
  status text not null default 'active',
  store_name text,
  started_at timestamptz not null default now(),
  checked_out_at timestamptz,
  estimated_total numeric(10,2),
  final_total numeric(10,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shopping_trips_status_check check (status in ('active', 'checked_out', 'cancelled'))
);

create table if not exists public.shopping_trip_items (
  id uuid primary key default gen_random_uuid(),
  shopping_trip_id uuid not null references public.shopping_trips(id) on delete cascade,
  shopping_list_item_id uuid references public.shopping_list_items(id) on delete set null,
  planned_item_name_snapshot text,
  actual_item_name text not null,
  planned_quantity_text text,
  actual_quantity_text text,
  unit_price numeric(10,2),
  line_total numeric(10,2),
  status text not null default 'pending',
  is_in_cart boolean not null default false,
  is_extra boolean not null default false,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shopping_trip_items_status_check check (status in ('pending', 'in_cart', 'skipped'))
);

create unique index if not exists idx_shopping_trips_active_per_list
  on public.shopping_trips(shopping_list_id)
  where status = 'active';

create index if not exists idx_shopping_trips_user_status
  on public.shopping_trips(user_id, status, started_at desc);

create index if not exists idx_shopping_trip_items_trip_sort
  on public.shopping_trip_items(shopping_trip_id, sort_order);

create index if not exists idx_shopping_trip_items_source_item
  on public.shopping_trip_items(shopping_list_item_id);

alter table public.shopping_trips enable row level security;
alter table public.shopping_trip_items enable row level security;

drop policy if exists shopping_trips_owner_all on public.shopping_trips;
create policy shopping_trips_owner_all
  on public.shopping_trips
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists shopping_trip_items_owner_all on public.shopping_trip_items;
create policy shopping_trip_items_owner_all
  on public.shopping_trip_items
  for all
  to authenticated
  using (
    exists (
      select 1 from public.shopping_trips st
      where st.id = shopping_trip_items.shopping_trip_id
        and st.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.shopping_trips st
      where st.id = shopping_trip_items.shopping_trip_id
        and st.user_id = auth.uid()
    )
  );

commit;
