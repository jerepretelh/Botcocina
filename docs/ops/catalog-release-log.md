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
- Resultado QA: push ok (`recipes=18`, `ingredients=75`, `substeps=146`). El smoke autenticado productivo dejó de fallar en setup de `keke`, pero encontró un bug nuevo en `Recetas globales > Todas`: faltaba el CTA `Planificar` en la tarjeta.
- Rollback aplicado: No
- Observaciones: el proyecto productivo aún no tiene las columnas V2 completas en `public.recipes`; se publicó en modo legacy-compatible y se añadió la migración `/Users/trabajo/bot/AsistenteCocina/supabase/migrations/20260320_v19_recipe_v2_catalog_columns.sql` para cerrar ese drift de esquema.
