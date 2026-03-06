# Sincronizar recetas con Google Sheets

## Modo recomendado (subpasos-first, sin hoja `steps`)

Ahora puedes cargar recetas con solo 3 hojas:

1. `recipes`
2. `ingredients`
3. `substeps`

La API convierte cada subpaso en un paso secuencial interno para mantener compatibilidad con la app.

---

## 1) Variables de entorno (3 hojas)

Con `sheetId` + `gid`:

- `GOOGLE_SHEETS_RECIPES_SHEET_ID`
- `GOOGLE_SHEETS_RECIPES_RECIPES_GID`
- `GOOGLE_SHEETS_RECIPES_INGREDIENTS_GID`
- `GOOGLE_SHEETS_RECIPES_SUBSTEPS_GID`

O con URLs directas:

- `GOOGLE_SHEETS_RECIPES_RECIPES_CSV_URL`
- `GOOGLE_SHEETS_RECIPES_INGREDIENTS_CSV_URL`
- `GOOGLE_SHEETS_RECIPES_SUBSTEPS_CSV_URL`

---

## 2) Plantillas listas

- `guidelines/recipes_sheet_recipes.csv`
- `guidelines/recipes_sheet_ingredients.csv`
- `guidelines/recipes_sheet_substeps_only.csv`

---

## 3) Headers por hoja

### recipes
- `id`, `categoryId`, `name`, `icon`, `emoji`, `ingredient`, `description`, `equipment`, `tip`, `portionLabelSingular`, `portionLabelPlural`

### ingredients
- `recipeId`, `name`, `emoji`, `indispensable`, `p1`, `p2`, `p4`

### substeps
- `recipeId`, `subStepOrder`, `stepName`, `subStepName`, `notes`, `isTimer`, `p1`, `p2`, `p4`, `fireLevel`, `equipment`

Notas:
- `isTimer`: `true/false`
- Si `isTimer=true`, `p1/p2/p4` deben ser segundos (número)
- Si `isTimer=false`, `p1/p2/p4` pueden ser texto (`Continuar`, `2 cdas`, etc.)
- `subStepOrder` define el orden total de ejecución por receta.

---

## 4) Endpoint

- `GET /api/recipes`

Respuesta:
- `source: "sheets" | "local"`
- `warning` (si aplica)
- `recipes`
- `recipeContentById`

---

## 5) Compatibilidad

Sigue soportado:

- Modo 4 hojas (`recipes`, `ingredients`, `steps`, `substeps`)
- Modo 1 hoja (JSON embebido)

Pero para tu caso, usa 3 hojas con subpasos.

---

## 6) Ejemplo con tu Sheet ID

```bash
GOOGLE_SHEETS_RECIPES_SHEET_ID='1Qn6jRi5THXCrQYdF7A4ojvzIVIL7V0j9kS_wn1PyCsI' \
GOOGLE_SHEETS_RECIPES_RECIPES_GID='0' \
GOOGLE_SHEETS_RECIPES_INGREDIENTS_GID='TU_GID_INGREDIENTS' \
GOOGLE_SHEETS_RECIPES_SUBSTEPS_GID='TU_GID_SUBSTEPS' \
npm run dev
```
