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

## 5) Checklist de corte directo

1. Migración aplicada.
2. Importación exitosa (`import_runs.status = success`).
3. App carga Home/Setup/Cooking desde Supabase.
4. Progreso se reanuda tras recarga (usuario anónimo).
5. Google Sheets deshabilitado en producción.
