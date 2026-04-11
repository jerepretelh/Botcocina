# Supabase Setup (Corte Directo)

## 1) Variables de entorno

Frontend (Vite):

- `VITE_SUPABASE_ENABLED=true`
- `VITE_SUPABASE_URL=https://<project-ref>.supabase.co`
- `VITE_SUPABASE_ANON_KEY=<anon-key>`

Server/API (opcional para compat layer `/api/recipes`):

- `SUPABASE_ENABLED=true`
- `SUPABASE_URL=https://<project-ref>.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY=<service-role-key>`

Importación desde Google Sheets:

- `GOOGLE_SHEETS_RECIPES_SHEET_ID`
- `GOOGLE_SHEETS_RECIPES_RECIPES_GID`
- `GOOGLE_SHEETS_RECIPES_INGREDIENTS_GID`
- `GOOGLE_SHEETS_RECIPES_SUBSTEPS_GID`

## 2) Aplicar migración SQL

La migración quedó en:

- `supabase/migrations/20260305_supabase_bootstrap_cooking_assistant_v1.sql`
- `supabase/migrations/20260402_v20_fixed_runtime_recipes.sql`

Puedes aplicarla desde:

- Supabase SQL Editor
- CLI local (`supabase db push`)

## 3) Importar catálogo desde Google Sheets

Script:

- `scripts/import_recipes_from_sheets.ts`

Ejemplo de ejecución:

```bash
SUPABASE_URL="https://<project-ref>.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" \
GOOGLE_SHEETS_RECIPES_SHEET_ID="<sheet-id>" \
GOOGLE_SHEETS_RECIPES_RECIPES_GID="0" \
GOOGLE_SHEETS_RECIPES_INGREDIENTS_GID="<gid>" \
GOOGLE_SHEETS_RECIPES_SUBSTEPS_GID="<gid>" \
npx tsx scripts/import_recipes_from_sheets.ts
```

## 4) Seed desde datos locales (sin Google Sheets)

Generar SQL de seed desde `src/app/data/recipes.ts`:

```bash
npm run seed:catalog:generate
```

Archivo generado:

- `supabase/migrations/20260305_seed_catalog_from_local_data.sql`

Luego aplica ese SQL desde Supabase SQL Editor o vía MCP.

## 5) Flujo operativo semanal (Git + SQL seed)

1. Editar recetas en `src/app/data/recipes.ts`.
2. Validar catálogo:

```bash
npm run catalog:validate
```

3. Preparar release SQL:

```bash
npm run catalog:release:prepare
```

Opcional (publicación directa con service role):

```bash
npm run catalog:push
```

4. Aplicar seed primero en staging, luego producción.
5. Registrar release en `docs/ops/catalog-release-log.md`.

## 8) Seed oficial de Runtime Fijo (JSONB)

Para sembrar el catálogo oficial de `runtime-fijo` en `public.fixed_recipes`:

```bash
SUPABASE_URL="https://<project-ref>.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" \
npm run seed:fixed-runtime
```

El script toma como fuente:

- `public/fixed-runtime/recipes.json`

## 6) Reglas de fallback en producción

- Catálogo principal: Supabase.
- Fallback a Google Sheets por API queda deshabilitado por defecto en producción.
- Solo se habilita en desarrollo con:

```bash
ALLOW_SHEETS_FALLBACK=true
```

## 7) Checklist de corte directo

1. Migración aplicada.
2. Importación exitosa (`import_runs.status = success`).
3. App carga Home/Setup/Cooking desde Supabase.
4. Progreso se reanuda tras recarga (usuario anónimo).
5. Google Sheets deshabilitado en producción.
