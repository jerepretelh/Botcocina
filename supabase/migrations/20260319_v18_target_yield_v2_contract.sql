alter table public.weekly_plan_items
  add column if not exists target_yield jsonb;

alter table public.user_recipe_cooking_configs
  add column if not exists target_yield jsonb;

update public.weekly_plan_items
set target_yield = case
  when coalesce(quantity_mode, 'people') = 'have' and amount_unit = 'grams' then jsonb_build_object(
    'type', 'weight',
    'value', greatest(coalesce(available_count, 500), 1),
    'canonicalUnit', 'g',
    'visibleUnit', 'g',
    'unit', 'g',
    'label', 'gramos'
  )
  when coalesce(quantity_mode, 'people') = 'have' then jsonb_build_object(
    'type', 'units',
    'value', greatest(coalesce(available_count, fixed_servings, 2), 1),
    'canonicalUnit', 'unidad',
    'visibleUnit', 'unidades',
    'unit', 'unidades',
    'label', 'unidades'
  )
  else jsonb_build_object(
    'type', 'servings',
    'value', greatest(coalesce(people_count, fixed_servings, 2), 1),
    'canonicalUnit', 'servings',
    'visibleUnit', 'porciones',
    'unit', 'porciones',
    'label', 'porciones'
  )
end
where target_yield is null;

update public.user_recipe_cooking_configs
set target_yield = case
  when coalesce(quantity_mode, 'people') = 'have' and amount_unit = 'grams' then jsonb_build_object(
    'type', 'weight',
    'value', greatest(coalesce(available_count, 500), 1),
    'canonicalUnit', 'g',
    'visibleUnit', 'g',
    'unit', 'g',
    'label', 'gramos'
  )
  when coalesce(quantity_mode, 'people') = 'have' then jsonb_build_object(
    'type', 'units',
    'value', greatest(coalesce(available_count, people_count, 2), 1),
    'canonicalUnit', 'unidad',
    'visibleUnit', 'unidades',
    'unit', 'unidades',
    'label', 'unidades'
  )
  else jsonb_build_object(
    'type', 'servings',
    'value', greatest(coalesce(people_count, 2), 1),
    'canonicalUnit', 'servings',
    'visibleUnit', 'porciones',
    'unit', 'porciones',
    'label', 'porciones'
  )
end
where target_yield is null;
