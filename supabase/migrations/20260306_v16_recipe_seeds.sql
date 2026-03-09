begin;

create table if not exists public.recipe_seeds (
  id text primary key,
  name text not null,
  category_id text not null references public.recipe_categories(id) on delete cascade,
  search_terms text[] not null default '{}',
  search_text text not null default '',
  short_description text,
  locale text not null default 'es-PE',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.recipe_seeds enable row level security;

drop policy if exists "recipe_seeds_read_public" on public.recipe_seeds;
create policy "recipe_seeds_read_public"
on public.recipe_seeds
for select
to anon, authenticated
using (is_active = true);

create index if not exists idx_recipe_seeds_category_sort
  on public.recipe_seeds(category_id, sort_order);

create index if not exists idx_recipe_seeds_active_sort
  on public.recipe_seeds(is_active, sort_order);

create index if not exists idx_recipe_seeds_search_text
  on public.recipe_seeds using gin (to_tsvector('simple', search_text));

insert into public.recipe_seeds (
  id,
  name,
  category_id,
  search_terms,
  search_text,
  short_description,
  locale,
  is_active,
  sort_order
)
values
  ('aji-de-gallina', 'Ají de gallina', 'almuerzos', array['aji gallina', 'gallina deshilachada'], 'ají de gallina aji gallina gallina deshilachada', 'Clásico cremoso peruano con ají amarillo.', 'es-PE', true, 1),
  ('causa-limena', 'Causa limeña', 'almuerzos', array['causa', 'causa rellena'], 'causa limeña causa causa rellena', 'Papa amarilla prensada con relleno frío.', 'es-PE', true, 2),
  ('seco-de-pollo', 'Seco de pollo', 'almuerzos', array['seco', 'guiso de pollo'], 'seco de pollo seco guiso de pollo', 'Guiso con culantro y sabor intenso.', 'es-PE', true, 3),
  ('estofado-de-pollo', 'Estofado de pollo', 'almuerzos', array['estofado pollo'], 'estofado de pollo estofado pollo', 'Pollo guisado con verduras y salsa casera.', 'es-PE', true, 4),
  ('arroz-chaufa', 'Arroz chaufa', 'arroces', array['chaufa', 'arroz frito'], 'arroz chaufa chaufa arroz frito', 'Salteado rápido estilo chifa.', 'es-PE', true, 5),
  ('tallarines-rojos', 'Tallarines rojos', 'almuerzos', array['pasta roja', 'fideos rojos'], 'tallarines rojos pasta roja fideos rojos', 'Pasta con salsa de tomate casera.', 'es-PE', true, 6),
  ('tallarines-verdes', 'Tallarines verdes', 'almuerzos', array['pasta verde', 'fideos verdes'], 'tallarines verdes pasta verde fideos verdes', 'Pasta cremosa con albahaca y espinaca.', 'es-PE', true, 7),
  ('lentejas-guisadas', 'Lentejas guisadas', 'almuerzos', array['guiso de lentejas', 'lentejas'], 'lentejas guisadas guiso de lentejas lentejas', 'Plato rendidor y reconfortante.', 'es-PE', true, 8),
  ('frejoles-con-seco', 'Frejoles con seco', 'almuerzos', array['frejoles', 'menestras'], 'frejoles con seco frejoles menestras', 'Combinación criolla con carne o pollo.', 'es-PE', true, 9),
  ('escabeche-de-pollo', 'Escabeche de pollo', 'almuerzos', array['escabeche'], 'escabeche de pollo escabeche', 'Pollo con cebolla encurtida tibia.', 'es-PE', true, 10),
  ('sanguchito-de-pollo', 'Sánguche de pollo deshilachado', 'desayunos', array['sandwich de pollo', 'sanguche pollo'], 'sánguche de pollo deshilachado sandwich de pollo sanguche pollo', 'Opción práctica para desayuno o lonche.', 'es-PE', true, 11),
  ('avena-con-fruta', 'Avena con fruta', 'desayunos', array['avena', 'porridge'], 'avena con fruta avena porridge', 'Desayuno caliente y rápido.', 'es-PE', true, 12),
  ('panqueques-de-avena', 'Panqueques de avena', 'desayunos', array['pancakes avena', 'hotcakes'], 'panqueques de avena pancakes avena hotcakes', 'Desayuno suave con fruta o miel.', 'es-PE', true, 13),
  ('omelette-de-queso', 'Omelette de queso', 'desayunos', array['omelet', 'tortilla de huevo'], 'omelette de queso omelet tortilla de huevo', 'Preparación rápida para sartén.', 'es-PE', true, 14),
  ('huevos-revueltos-cremosos', 'Huevos revueltos cremosos', 'desayunos', array['huevos revueltos'], 'huevos revueltos cremosos huevos revueltos', 'Clásico rápido con textura suave.', 'es-PE', true, 15),
  ('quinaola', 'Quinua con leche', 'desayunos', array['quinua dulce', 'desayuno quinua'], 'quinua con leche quinua dulce desayuno quinua', 'Desayuno dulce y nutritivo.', 'es-PE', true, 16),
  ('sopa-a-la-minuta', 'Sopa a la minuta', 'sopas', array['sopa minuta'], 'sopa a la minuta sopa minuta', 'Sopa rápida con carne y fideos.', 'es-PE', true, 17),
  ('caldo-de-gallina', 'Caldo de gallina', 'sopas', array['caldo gallina'], 'caldo de gallina caldo gallina', 'Caldo sustancioso y tradicional.', 'es-PE', true, 18),
  ('sopa-de-pollo-con-fideos', 'Sopa de pollo con fideos', 'sopas', array['sopa pollo', 'fideos caldo'], 'sopa de pollo con fideos sopa pollo fideos caldo', 'Plato casero y reconfortante.', 'es-PE', true, 19),
  ('crema-de-zapallo', 'Crema de zapallo', 'sopas', array['sopa crema zapallo'], 'crema de zapallo sopa crema zapallo', 'Crema suave y fácil de adaptar.', 'es-PE', true, 20),
  ('sudado-de-pescado', 'Sudado de pescado', 'cenas', array['pescado sudado', 'sudado'], 'sudado de pescado pescado sudado sudado', 'Pescado jugoso con tomate y cebolla.', 'es-PE', true, 21),
  ('pescado-a-la-plancha', 'Pescado a la plancha', 'cenas', array['filete pescado', 'pescado plancha'], 'pescado a la plancha filete pescado pescado plancha', 'Preparación ligera para cena.', 'es-PE', true, 22),
  ('salteado-de-verduras', 'Salteado de verduras', 'cenas', array['verduras salteadas', 'salteado veggie'], 'salteado de verduras verduras salteadas salteado veggie', 'Cena rápida con wok o sartén.', 'es-PE', true, 23),
  ('ensalada-de-pollo', 'Ensalada de pollo', 'cenas', array['ensalada con pollo'], 'ensalada de pollo ensalada con pollo', 'Ligera, fresca y rendidora.', 'es-PE', true, 24),
  ('papas-doradas-airfryer', 'Papas doradas en airfryer', 'airfryer', array['papas airfryer', 'papas crocantes'], 'papas doradas en airfryer papas airfryer papas crocantes', 'Guarnición crocante con poco aceite.', 'es-PE', true, 25),
  ('alitas-airfryer', 'Alitas en airfryer', 'airfryer', array['alitas crocantes', 'air fryer wings'], 'alitas en airfryer alitas crocantes air fryer wings', 'Alitas crocantes sin fritura profunda.', 'es-PE', true, 26),
  ('nuggets-caseros-airfryer', 'Nuggets caseros en airfryer', 'airfryer', array['nuggets airfryer'], 'nuggets caseros en airfryer nuggets airfryer', 'Pollo empanizado para niños y familia.', 'es-PE', true, 27),
  ('camote-frito-airfryer', 'Camote crocante en airfryer', 'airfryer', array['camote airfryer', 'camote crocante'], 'camote crocante en airfryer camote airfryer camote crocante', 'Versión dulce y crocante.', 'es-PE', true, 28),
  ('patacones', 'Patacones', 'frituras', array['tostones', 'platanos verdes fritos'], 'patacones tostones platanos verdes fritos', 'Plátano verde aplastado y frito.', 'es-PE', true, 29),
  ('tajadas-de-platano', 'Tajadas de plátano maduro', 'frituras', array['platano frito', 'tajadas'], 'tajadas de plátano maduro platano frito tajadas', 'Plátano maduro frito y dulce.', 'es-PE', true, 30),
  ('pollo-frito-casero', 'Pollo frito casero', 'frituras', array['pollo crocante', 'pollo broaster casero'], 'pollo frito casero pollo crocante pollo broaster casero', 'Fritura clásica con piel crocante.', 'es-PE', true, 31),
  ('croquetas-de-papa', 'Croquetas de papa', 'frituras', array['croquetas', 'bolitas de papa'], 'croquetas de papa croquetas bolitas de papa', 'Papas compactas y doradas.', 'es-PE', true, 32),
  ('pure-de-papas', 'Puré de papas', 'hervidos', array['pure papa'], 'puré de papas pure papa', 'Base clásica y adaptable.', 'es-PE', true, 33),
  ('yuca-sancochada', 'Yuca sancochada', 'hervidos', array['yuca cocida'], 'yuca sancochada yuca cocida', 'Guarnición simple y rendidora.', 'es-PE', true, 34),
  ('camote-sancochado', 'Camote sancochado', 'hervidos', array['camote hervido'], 'camote sancochado camote hervido', 'Acompañamiento suave y dulce.', 'es-PE', true, 35),
  ('verduras-al-vapor', 'Verduras al vapor', 'hervidos', array['vegetales vapor'], 'verduras al vapor vegetales vapor', 'Base ligera para cualquier comida.', 'es-PE', true, 36)
on conflict (id) do update set
  name = excluded.name,
  category_id = excluded.category_id,
  search_terms = excluded.search_terms,
  search_text = excluded.search_text,
  short_description = excluded.short_description,
  locale = excluded.locale,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

commit;
