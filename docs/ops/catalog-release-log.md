# Registro de Releases de Catálogo

## Formato

- Fecha:
- Entorno:
- Responsable:
- Commit:
- Recetas afectadas:
- Resultado QA:
- Rollback aplicado: Sí/No
- Observaciones:

---

## Release inicial Supabase

- Fecha: 2026-03-05
- Entorno: producción
- Responsable: equipo producto
- Commit: n/a
- Recetas afectadas: `arroz`, `huevo-frito` (seed inicial)
- Resultado QA: pendiente de validación funcional final con `VITE_SUPABASE_ANON_KEY`
- Rollback aplicado: No
- Observaciones: estructura base operativa, fallback a Sheets bloqueado en producción por defecto.

## Resync catálogo canónico local

- Fecha: 2026-03-20
- Entorno: producción
- Responsable: Codex
- Commit: working tree local sobre `main`
- Recetas afectadas: republicación de 18 recetas públicas gestionadas, incluyendo `keke-platano-molde`, `papas-airfryer` y `tallarines-rojos-compuesto`
- Resultado QA: push ok (`recipes=18`, `ingredients=75`, `substeps=146`). El smoke autenticado productivo dejó de fallar en setup de `keke`, luego detectó y se corrigió el CTA `Planificar` en `Recetas globales > Todas`, y finalmente quedó bloqueado por drift de esquema en planning (`weekly_plan_items.target_yield` ausente en producción).
- Rollback aplicado: No
- Observaciones: el proyecto productivo aún no tiene las columnas V2 completas en `public.recipes`; se publicó en modo legacy-compatible y se añadió la migración `/Users/trabajo/bot/AsistenteCocina/supabase/migrations/20260320_v19_recipe_v2_catalog_columns.sql` para cerrar ese drift de esquema. Además, el smoke final confirmó que falta aplicar `/Users/trabajo/bot/AsistenteCocina/supabase/migrations/20260319_v18_target_yield_v2_contract.sql` en producción porque `weekly_plan_items.target_yield` sigue ausente.

## Runtime-fijo home redesign (search-first)

- Fecha: 2026-04-03
- Entorno: producción
- Responsable: Codex
- Commit: `a6f2cc9` + cambios locales no commiteados en `main` (release manual desde working tree)
- Recetas afectadas: sin cambios de catálogo o schema; actualización visual del shell `/#/runtime-fijo`
- Resultado QA: `npm run build` OK, `npm run test:unit` OK, `npm run typecheck:vercel-api` OK. Deploy productivo OK (`dpl_BHqaFZJWYdX7o8UuuiHtYJ9ZEaqj`, alias `https://botcocina.vercel.app`). El smoke legado `npm run test:e2e:prod:smoke` falló por expectativa desactualizada de ruta (`/recetas-globales/todas` vs `/runtime-fijo`). Smoke funcional dirigido de `runtime-fijo` (home/search/create/open/exit) pasó en producción.
- Rollback aplicado: No
- Observaciones: se confirma cutover visual y funcional de entrada en `/#/runtime-fijo`. Pendiente: actualizar `e2e/specs/product-production-smoke.spec.ts` y helpers para la nueva ruta oficial.
