# Checklist manual: generación IA y guardado

## Preparación
- Regenerar storage state si hace falta:
  - `PLAYWRIGHT_BASE_URL=https://botcocina.vercel.app npm run test:e2e:auth:generate`
- Entrar autenticado a `https://botcocina.vercel.app/`
- Tener abierta la consola de Supabase o SQL editor para revisar tablas:
  - `recipes`
  - `recipe_ingredients`
  - `recipe_substeps`
  - `user_recipe_cooking_configs`
  - `ai_recipe_generations`

## Escenario 1: receta IA `standard`
- Desde Inicio, abrir `Crear receta nueva con IA`
- Pedir una receta claramente lineal, por ejemplo una milanesa o una sopa simple
- Confirmar que la generación termina sin error
- Verificar que la receta entra a cocina y usa el runtime estándar actual
- Cerrar la receta
- Ir a `Mis recetas`
- Confirmar que la receta aparece con badge `Generada con IA`
- Abrirla otra vez
- Confirmar que pasa por setup y luego vuelve a cocina sin rebotes ni resets inesperados
- Refrescar la app y repetir apertura desde `Mis recetas`

## Escenario 2: receta IA `compound`
- Desde Inicio, abrir `Crear receta nueva con IA`
- Pedir una receta claramente paralela, por ejemplo tallarines con salsa y pasta en paralelo
- Confirmar que la generación termina sin error
- Verificar que entra al runtime compound actual, no al estándar
- Cerrar la receta
- Ir a `Mis recetas`
- Confirmar que la receta aparece con badge `Generada con IA`
- Abrirla otra vez
- Confirmar setup estable y entrada otra vez al runtime compound
- Refrescar la app y repetir apertura desde `Mis recetas`

## Verificación en Supabase
- En `recipes`, verificar:
  - `source = 'ai'`
  - `visibility = 'private'`
  - `owner_user_id` del usuario autenticado
  - columnas V2 presentes cuando el entorno las soporte
  - `experience` y `compound_meta` presentes para el caso compound
- En `recipe_ingredients`, verificar filas asociadas a la receta creada
- En `recipe_substeps`, verificar filas asociadas a la receta creada
- En `user_recipe_cooking_configs`, verificar:
  - `quantity_mode`
  - `target_yield`
  - `selected_optional_ingredients`
  - `source_context_summary`
- En `ai_recipe_generations`, verificar:
  - fila creada para el prompt
  - `status = approved`
  - `recipe_id` enlazado

## Comandos automatizados relacionados
- Unit tests: `npm run test:unit`
- Smoke IA local: `npm run test:e2e:ai-smoke`
- Smoke productivo autenticado:
  - `PLAYWRIGHT_BASE_URL=https://botcocina.vercel.app PLAYWRIGHT_STORAGE_STATE=playwright/.auth/user.json npm run test:e2e:prod:smoke`
