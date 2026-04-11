alter table public.weekly_plan_items
  drop constraint if exists weekly_plan_items_recipe_id_fkey;

alter table public.shopping_list_items
  drop constraint if exists shopping_list_items_source_recipe_id_fkey;
