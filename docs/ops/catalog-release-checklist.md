# Checklist de Release de Catálogo (Semanal)

## 1) Preparación

- `git pull` y rama limpia.
- Cambios de recetas consolidados en el catálogo canónico local:
  - `/Users/trabajo/bot/AsistenteCocina/src/app/data/recipes.ts`
  - `/Users/trabajo/bot/AsistenteCocina/src/app/data/recipes.v2.ts`
- `.env` con claves válidas para entorno objetivo (staging o producción).
- Aplicar antes cualquier migración pendiente del catálogo, incluyendo `/Users/trabajo/bot/AsistenteCocina/supabase/migrations/20260320_v19_recipe_v2_catalog_columns.sql` cuando el entorno aún no tenga columnas V2 en `public.recipes`.

## 2) Validación local de catálogo

- Ejecutar: `npm run catalog:validate`
- Resultado esperado: sin `ERROR`.
- Si hay `WARN`, revisar antes de continuar.

## 3) Generación del SQL de catálogo

- Ejecutar: `npm run seed:catalog:generate`
- Archivo esperado: `/Users/trabajo/bot/AsistenteCocina/supabase/migrations/20260305_seed_catalog_from_local_data.sql`
- Este seed ya incluye el catálogo legacy gestionado más recetas core V2 visibles en runtime.

## 4) Publicación en staging

- Aplicar migración base (si staging es nuevo):
  - `/Users/trabajo/bot/AsistenteCocina/supabase/migrations/20260305_supabase_bootstrap_cooking_assistant_v1.sql`
- Aplicar seed de catálogo generado.
- Verificar conteos:
  - `recipe_categories`
  - `recipes`
  - `recipe_ingredients`
  - `recipe_substeps`
- Verificar regla: no recetas publicadas sin subpasos.

## 5) QA funcional en staging (flujo cocina)

- Home muestra recetas de Supabase.
- Seleccionar receta.
- Setup y porciones correctas.
- Cooking:
  - timer corre y descuenta
  - siguiente subpaso funciona
  - reanudar funciona tras recarga

## 6) Publicación en producción

- Repetir aplicación del seed en producción.
- Ejecutar smoke test rápido en producción:
  - abrir Home
  - iniciar 1 receta
  - avanzar al menos 2 subpasos

## 7) Cierre del release

- Registrar release en `/Users/trabajo/bot/AsistenteCocina/docs/ops/catalog-release-log.md`.
- Registrar recetas afectadas y resultado.
