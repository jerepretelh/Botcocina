import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Recipe, RecipeContent, RecipeStep, SubStep } from '../../src/types'
import { defaultRecipes, initialRecipeContent } from '../../src/app/data/recipes'
import { createClient } from '@supabase/supabase-js'

type JsonRecipePayload = {
  recipes: Recipe[]
  recipeContentById: Record<string, RecipeContent>
}

type NormalizedRow = Record<string, string>

type SingleSheetRow = {
  id: string
  categoryid: string
  name: string
  icon: string
  emoji?: string
  ingredient: string
  description: string
  equipment?: string
  ingredientsjson: string
  stepsjson: string
  tip?: string
  portionlabelsingular?: string
  portionlabelplural?: string
}

type MultiRecipesRow = {
  id: string
  categoryid: string
  name: string
  icon: string
  emoji?: string
  ingredient: string
  description: string
  equipment?: string
  tip?: string
  portionlabelsingular?: string
  portionlabelplural?: string
}

type MultiIngredientRow = {
  recipeid: string
  name: string
  emoji?: string
  indispensable?: string
  p1: string
  p2: string
  p4: string
}

type MultiStepRow = {
  recipeid: string
  stepnumber: string
  stepname: string
  firelevel?: string
  equipment?: string
}

type MultiSubStepRow = {
  recipeid: string
  stepnumber?: string
  substeporder: string
  substepname: string
  stepname?: string
  notes?: string
  istimer: string
  p1: string
  p2: string
  p4: string
  firelevel?: string
  equipment?: string
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function parseCsv(csv: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < csv.length; i += 1) {
    const ch = csv[i]
    const next = csv[i + 1]

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cell += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (!inQuotes && ch === ',') {
      row.push(cell)
      cell = ''
      continue
    }

    if (!inQuotes && (ch === '\n' || ch === '\r')) {
      if (ch === '\r' && next === '\n') i += 1
      row.push(cell)
      if (row.some((v) => v.trim().length > 0)) rows.push(row)
      row = []
      cell = ''
      continue
    }

    cell += ch
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell)
    if (row.some((v) => v.trim().length > 0)) rows.push(row)
  }

  return rows
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '').replace(/_/g, '')
}

function csvToNormalizedRows(csv: string): NormalizedRow[] {
  const data = parseCsv(csv)
  if (data.length < 2) return []

  const headers = data[0].map((h) => normalizeHeader(h.trim()))
  const rows = data.slice(1)

  return rows
    .map((values) => {
      const record: NormalizedRow = {}
      for (let i = 0; i < headers.length; i += 1) {
        record[headers[i]] = (values[i] ?? '').trim()
      }
      return record
    })
    .filter((row) => Object.values(row).some((v) => v.length > 0))
}

function toBool(value: string | undefined): boolean {
  const normalized = (value ?? '').trim().toLowerCase()
  return normalized === 'true' || normalized === '1' || normalized === 'si' || normalized === 'sí'
}

function toPositiveNumber(value: string): number | null {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n)
}

function getEnvCsvUrlFromSheetId(sheetId: string, gid: string): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`
}

function getSingleSheetCsvUrlFromEnv(): string | null {
  const explicit = process.env.GOOGLE_SHEETS_RECIPES_CSV_URL?.trim()
  if (explicit) return explicit

  const sheetId = process.env.GOOGLE_SHEETS_RECIPES_SHEET_ID?.trim()
  if (!sheetId) return null

  const gid = process.env.GOOGLE_SHEETS_RECIPES_GID?.trim() || '0'
  return getEnvCsvUrlFromSheetId(sheetId, gid)
}

function getMultiSheetCsvUrlsFromEnv(): { recipes: string; ingredients: string; steps: string; substeps: string } | null {
  const explicitRecipes = process.env.GOOGLE_SHEETS_RECIPES_RECIPES_CSV_URL?.trim()
  const explicitIngredients = process.env.GOOGLE_SHEETS_RECIPES_INGREDIENTS_CSV_URL?.trim()
  const explicitSteps = process.env.GOOGLE_SHEETS_RECIPES_STEPS_CSV_URL?.trim()
  const explicitSubsteps = process.env.GOOGLE_SHEETS_RECIPES_SUBSTEPS_CSV_URL?.trim()

  if (explicitRecipes && explicitIngredients && explicitSteps && explicitSubsteps) {
    return {
      recipes: explicitRecipes,
      ingredients: explicitIngredients,
      steps: explicitSteps,
      substeps: explicitSubsteps,
    }
  }

  const sheetId = process.env.GOOGLE_SHEETS_RECIPES_SHEET_ID?.trim()
  if (!sheetId) return null

  const recipesGid = process.env.GOOGLE_SHEETS_RECIPES_RECIPES_GID?.trim()
  const ingredientsGid = process.env.GOOGLE_SHEETS_RECIPES_INGREDIENTS_GID?.trim()
  const stepsGid = process.env.GOOGLE_SHEETS_RECIPES_STEPS_GID?.trim()
  const substepsGid = process.env.GOOGLE_SHEETS_RECIPES_SUBSTEPS_GID?.trim()

  if (!recipesGid || !ingredientsGid || !stepsGid || !substepsGid) return null

  return {
    recipes: getEnvCsvUrlFromSheetId(sheetId, recipesGid),
    ingredients: getEnvCsvUrlFromSheetId(sheetId, ingredientsGid),
    steps: getEnvCsvUrlFromSheetId(sheetId, stepsGid),
    substeps: getEnvCsvUrlFromSheetId(sheetId, substepsGid),
  }
}

function getMultiSheetCsvUrlsWithoutStepsFromEnv(): { recipes: string; ingredients: string; substeps: string } | null {
  const explicitRecipes = process.env.GOOGLE_SHEETS_RECIPES_RECIPES_CSV_URL?.trim()
  const explicitIngredients = process.env.GOOGLE_SHEETS_RECIPES_INGREDIENTS_CSV_URL?.trim()
  const explicitSubsteps = process.env.GOOGLE_SHEETS_RECIPES_SUBSTEPS_CSV_URL?.trim()

  if (explicitRecipes && explicitIngredients && explicitSubsteps) {
    return {
      recipes: explicitRecipes,
      ingredients: explicitIngredients,
      substeps: explicitSubsteps,
    }
  }

  const sheetId = process.env.GOOGLE_SHEETS_RECIPES_SHEET_ID?.trim()
  if (!sheetId) return null

  const recipesGid = process.env.GOOGLE_SHEETS_RECIPES_RECIPES_GID?.trim()
  const ingredientsGid = process.env.GOOGLE_SHEETS_RECIPES_INGREDIENTS_GID?.trim()
  const substepsGid = process.env.GOOGLE_SHEETS_RECIPES_SUBSTEPS_GID?.trim()

  if (!recipesGid || !ingredientsGid || !substepsGid) return null

  return {
    recipes: getEnvCsvUrlFromSheetId(sheetId, recipesGid),
    ingredients: getEnvCsvUrlFromSheetId(sheetId, ingredientsGid),
    substeps: getEnvCsvUrlFromSheetId(sheetId, substepsGid),
  }
}

function parseSingleSheetPayload(rows: NormalizedRow[]): JsonRecipePayload {
  const typedRows = rows
    .map((row) => {
      const mapped: SingleSheetRow = {
        id: row.id || '',
        categoryid: row.categoryid || '',
        name: row.name || '',
        icon: row.icon || '',
        emoji: row.emoji,
        ingredient: row.ingredient || '',
        description: row.description || '',
        equipment: row.equipment,
        ingredientsjson: row.ingredientsjson || '',
        stepsjson: row.stepsjson || '',
        tip: row.tip,
        portionlabelsingular: row.portionlabelsingular,
        portionlabelplural: row.portionlabelplural,
      }
      return mapped
    })
    .filter((r) => r.id && r.categoryid && r.name && r.ingredient && r.description && r.ingredientsjson && r.stepsjson)

  const recipes: Recipe[] = []
  const recipeContentById: Record<string, RecipeContent> = {}

  for (const row of typedRows) {
    try {
      const ingredients = JSON.parse(row.ingredientsjson)
      const steps = JSON.parse(row.stepsjson)
      if (!Array.isArray(ingredients) || !Array.isArray(steps)) continue

      recipes.push({
        id: row.id,
        categoryId: row.categoryid as Recipe['categoryId'],
        name: row.name,
        icon: row.icon || '🍽️',
        emoji: row.emoji || row.icon || '🍽️',
        ingredient: row.ingredient,
        description: row.description,
        equipment: (row.equipment as Recipe['equipment']) || undefined,
      })

      recipeContentById[row.id] = {
        ingredients,
        steps,
        tip: row.tip || 'Ten todo listo antes de empezar.',
        portionLabels: {
          singular: row.portionlabelsingular || 'porción',
          plural: row.portionlabelplural || 'porciones',
        },
      }
    } catch {
      // skip invalid row
    }
  }

  return {
    recipes,
    recipeContentById,
  }
}

function parseMultiSheetPayload(params: {
  recipesRows: NormalizedRow[]
  ingredientsRows: NormalizedRow[]
  stepsRows?: NormalizedRow[]
  substepsRows: NormalizedRow[]
}): JsonRecipePayload {
  const recipesRows = params.recipesRows
    .map((r) => ({
      id: r.id || '',
      categoryid: r.categoryid || '',
      name: r.name || '',
      icon: r.icon || '🍽️',
      emoji: r.emoji,
      ingredient: r.ingredient || '',
      description: r.description || '',
      equipment: r.equipment,
      tip: r.tip,
      portionlabelsingular: r.portionlabelsingular,
      portionlabelplural: r.portionlabelplural,
    } as MultiRecipesRow))
    .filter((r) => r.id && r.categoryid && r.name)

  const ingredientsRows = params.ingredientsRows
    .map((r) => ({
      recipeid: r.recipeid || '',
      name: r.name || '',
      emoji: r.emoji,
      indispensable: r.indispensable,
      p1: r.p1 || '',
      p2: r.p2 || '',
      p4: r.p4 || '',
    } as MultiIngredientRow))
    .filter((r) => r.recipeid && r.name)

  const stepsRows = (params.stepsRows ?? [])
    .map((r) => ({
      recipeid: r.recipeid || '',
      stepnumber: r.stepnumber || '',
      stepname: r.stepname || '',
      firelevel: r.firelevel,
      equipment: r.equipment,
    } as MultiStepRow))
    .filter((r) => r.recipeid && r.stepnumber && r.stepname)

  const substepsRows = params.substepsRows
    .map((r) => ({
      recipeid: r.recipeid || '',
      stepnumber: r.stepnumber || undefined,
      substeporder: r.substeporder || '',
      substepname: r.substepname || '',
      stepname: r.stepname || undefined,
      notes: r.notes,
      istimer: r.istimer || '',
      p1: r.p1 || '',
      p2: r.p2 || '',
      p4: r.p4 || '',
      firelevel: r.firelevel || undefined,
      equipment: r.equipment || undefined,
    } as MultiSubStepRow))
    .filter((r) => r.recipeid && r.substeporder && r.substepname)

  const ingredientsByRecipe = new Map<string, RecipeContent['ingredients']>()
  for (const row of ingredientsRows) {
    const list = ingredientsByRecipe.get(row.recipeid) ?? []
    list.push({
      name: row.name,
      emoji: row.emoji || '🍽️',
      indispensable: toBool(row.indispensable),
      portions: {
        1: row.p1 || 'Al gusto',
        2: row.p2 || row.p1 || 'Al gusto',
        4: row.p4 || row.p2 || row.p1 || 'Al gusto',
      },
    })
    ingredientsByRecipe.set(row.recipeid, list)
  }

  const substepsByRecipeStep = new Map<string, Array<{ order: number; subStep: SubStep }>>()
  for (const row of substepsRows) {
    const key = `${row.recipeid}::${row.stepnumber ?? '__auto__'}`
    const list = substepsByRecipeStep.get(key) ?? []

    const isTimer = toBool(row.istimer)
    const p1n = toPositiveNumber(row.p1)
    const p2n = toPositiveNumber(row.p2)
    const p4n = toPositiveNumber(row.p4)

    const portions: SubStep['portions'] = isTimer
      ? {
          1: p1n ?? 30,
          2: p2n ?? p1n ?? 45,
          4: p4n ?? p2n ?? p1n ?? 60,
        }
      : {
          1: row.p1 || 'Continuar',
          2: row.p2 || row.p1 || 'Continuar',
          4: row.p4 || row.p2 || row.p1 || 'Continuar',
        }

    list.push({
      order: Number(row.substeporder),
      subStep: {
        subStepName: row.substepname,
        notes: row.notes || '',
        portions,
        isTimer,
      },
    })

    substepsByRecipeStep.set(key, list)
  }

  const stepRowsByRecipe = new Map<string, MultiStepRow[]>()
  for (const row of stepsRows) {
    const list = stepRowsByRecipe.get(row.recipeid) ?? []
    list.push(row)
    stepRowsByRecipe.set(row.recipeid, list)
  }

  const recipes: Recipe[] = []
  const recipeContentById: Record<string, RecipeContent> = {}

  for (const row of recipesRows) {
    const recipeStepRows = (stepRowsByRecipe.get(row.id) ?? []).sort((a, b) => Number(a.stepnumber) - Number(b.stepnumber))

    let steps: RecipeStep[] = []

    if (recipeStepRows.length > 0) {
      steps = recipeStepRows
        .map((s) => {
          const key = `${row.id}::${s.stepnumber}`
          const subSteps = (substepsByRecipeStep.get(key) ?? [])
            .sort((a, b) => a.order - b.order)
            .map((item) => item.subStep)

          if (subSteps.length === 0) return null

          return {
            stepNumber: Number(s.stepnumber),
            stepName: s.stepname,
            fireLevel: (s.firelevel as RecipeStep['fireLevel']) || 'medium',
            equipment: (s.equipment as RecipeStep['equipment']) || undefined,
            subSteps,
          } as RecipeStep
        })
        .filter((step): step is RecipeStep => Boolean(step))
    } else {
      const autoSubsteps = substepsRows
        .filter((s) => s.recipeid === row.id)
        .sort((a, b) => Number(a.substeporder) - Number(b.substeporder))

      steps = autoSubsteps.map((s, index) => {
        const isTimer = toBool(s.istimer)
        const p1n = toPositiveNumber(s.p1)
        const p2n = toPositiveNumber(s.p2)
        const p4n = toPositiveNumber(s.p4)

        const portions: SubStep['portions'] = isTimer
          ? {
              1: p1n ?? 30,
              2: p2n ?? p1n ?? 45,
              4: p4n ?? p2n ?? p1n ?? 60,
            }
          : {
              1: s.p1 || 'Continuar',
              2: s.p2 || s.p1 || 'Continuar',
              4: s.p4 || s.p2 || s.p1 || 'Continuar',
            }

        return {
          stepNumber: index + 1,
          stepName: s.stepname || s.substepname,
          fireLevel: (s.firelevel as RecipeStep['fireLevel']) || 'medium',
          equipment: (s.equipment as RecipeStep['equipment']) || (row.equipment as RecipeStep['equipment']) || undefined,
          subSteps: [
            {
              subStepName: s.substepname,
              notes: s.notes || '',
              portions,
              isTimer,
            },
          ],
        } as RecipeStep
      })
    }

    if (steps.length === 0) continue

    recipes.push({
      id: row.id,
      categoryId: row.categoryid as Recipe['categoryId'],
      name: row.name,
      icon: row.icon || '🍽️',
      emoji: row.emoji || row.icon || '🍽️',
      ingredient: row.ingredient || 'Porciones',
      description: row.description || `${steps.length} pasos`,
      equipment: (row.equipment as Recipe['equipment']) || undefined,
    })

    recipeContentById[row.id] = {
      ingredients: ingredientsByRecipe.get(row.id) ?? [],
      steps,
      tip: row.tip || 'Ten todo listo antes de empezar.',
      portionLabels: {
        singular: row.portionlabelsingular || 'porción',
        plural: row.portionlabelplural || 'porciones',
      },
    }
  }

  return {
    recipes,
    recipeContentById,
  }
}

async function fetchCsv(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Error leyendo Google Sheets (${response.status})`)
  }
  return response.text()
}

function supabaseServerConfig(): { url: string; key: string } | null {
  const enabled = (process.env.SUPABASE_ENABLED ?? process.env.VITE_SUPABASE_ENABLED ?? 'false').trim().toLowerCase() === 'true'
  if (!enabled) return null
  const url = process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim()
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.VITE_SUPABASE_ANON_KEY?.trim()
  if (!url || !key) return null
  return { url, key }
}

async function loadFromSupabaseServer(): Promise<JsonRecipePayload | null> {
  const cfg = supabaseServerConfig()
  if (!cfg) return null

  const sb = createClient(cfg.url, cfg.key)
  const [recipesRes, ingredientsRes, substepsRes] = await Promise.all([
    sb
      .from('recipes')
      .select('id,category_id,name,icon,emoji,ingredient,description,equipment,tip,portion_label_singular,portion_label_plural')
      .eq('is_published', true),
    sb
      .from('recipe_ingredients')
      .select('recipe_id,sort_order,name,emoji,indispensable,p1,p2,p4'),
    sb
      .from('recipe_substeps')
      .select('recipe_id,substep_order,step_number,step_name,substep_name,notes,is_timer,p1,p2,p4,fire_level,equipment')
      .order('substep_order', { ascending: true }),
  ])

  if (recipesRes.error || ingredientsRes.error || substepsRes.error) return null

  const recipesRows = recipesRes.data ?? []
  if (recipesRows.length === 0) return null
  const ingredientsRows = ingredientsRes.data ?? []
  const substepsRows = substepsRes.data ?? []

  const ingredientsByRecipe = new Map<string, typeof ingredientsRows>()
  for (const item of ingredientsRows) {
    const list = ingredientsByRecipe.get(item.recipe_id) ?? []
    list.push(item)
    ingredientsByRecipe.set(item.recipe_id, list)
  }

  const substepsByRecipe = new Map<string, typeof substepsRows>()
  for (const item of substepsRows) {
    const list = substepsByRecipe.get(item.recipe_id) ?? []
    list.push(item)
    substepsByRecipe.set(item.recipe_id, list)
  }

  const recipes: Recipe[] = []
  const recipeContentById: Record<string, RecipeContent> = {}

  for (const row of recipesRows) {
    const sortedSubsteps = (substepsByRecipe.get(row.id) ?? []).sort((a, b) => a.substep_order - b.substep_order)
    if (sortedSubsteps.length === 0) continue

    const stepsByNumber = new Map<number, { stepName: string; fireLevel: RecipeStep['fireLevel']; equipment?: RecipeStep['equipment']; subSteps: Array<{ order: number; subStep: SubStep }> }>()
    for (const ss of sortedSubsteps) {
      const stepNumber = ss.step_number ?? ss.substep_order
      const existing = stepsByNumber.get(stepNumber) ?? {
        stepName: ss.step_name || ss.substep_name,
        fireLevel: (ss.fire_level as RecipeStep['fireLevel']) || 'medium',
        equipment: (ss.equipment as RecipeStep['equipment']) || undefined,
        subSteps: [],
      }
      const toTimerPortion = (value: string) => {
        const n = Number(value)
        return Number.isFinite(n) && n > 0 ? Math.round(n) : 30
      }
      existing.subSteps.push({
        order: ss.substep_order,
        subStep: {
          subStepName: ss.substep_name,
          notes: ss.notes || '',
          portions: ss.is_timer
            ? { 1: toTimerPortion(ss.p1), 2: toTimerPortion(ss.p2), 4: toTimerPortion(ss.p4) }
            : { 1: ss.p1 || 'Continuar', 2: ss.p2 || ss.p1 || 'Continuar', 4: ss.p4 || ss.p2 || ss.p1 || 'Continuar' },
          isTimer: ss.is_timer,
        },
      })
      stepsByNumber.set(stepNumber, existing)
    }

    const steps: RecipeStep[] = [...stepsByNumber.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([stepNumber, value]) => ({
        stepNumber,
        stepName: value.stepName,
        fireLevel: value.fireLevel,
        equipment: value.equipment,
        subSteps: value.subSteps.sort((a, b) => a.order - b.order).map((x) => x.subStep),
      }))
    if (steps.length === 0) continue

    recipes.push({
      id: row.id,
      categoryId: row.category_id as Recipe['categoryId'],
      name: row.name,
      icon: row.icon || '🍽️',
      emoji: row.emoji || row.icon || '🍽️',
      ingredient: row.ingredient,
      description: row.description,
      equipment: (row.equipment as Recipe['equipment']) || undefined,
    })

    recipeContentById[row.id] = {
      ingredients: (ingredientsByRecipe.get(row.id) ?? [])
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((it) => ({
          name: it.name,
          emoji: it.emoji || '🍽️',
          indispensable: it.indispensable,
          portions: {
            1: it.p1 || 'Al gusto',
            2: it.p2 || it.p1 || 'Al gusto',
            4: it.p4 || it.p2 || it.p1 || 'Al gusto',
          },
        })),
      steps,
      tip: row.tip || 'Ten todo listo antes de empezar.',
      portionLabels: {
        singular: row.portion_label_singular || 'porción',
        plural: row.portion_label_plural || 'porciones',
      },
    }
  }

  if (recipes.length === 0) return null

  return { recipes, recipeContentById }
}

async function resolveRecipesPayload(): Promise<{ source: 'supabase' | 'sheets' | 'local'; payload: JsonRecipePayload; warning?: string }> {
  const supabasePayload = await loadFromSupabaseServer()
  if (supabasePayload) {
    return {
      source: 'supabase',
      payload: supabasePayload,
    }
  }

  const allowSheetsFallback =
    (process.env.ALLOW_SHEETS_FALLBACK ?? 'false').trim().toLowerCase() === 'true' &&
    (process.env.NODE_ENV ?? 'development').toLowerCase() !== 'production'
  if (!allowSheetsFallback) {
    return {
      source: 'local',
      payload: {
        recipes: defaultRecipes,
        recipeContentById: initialRecipeContent,
      },
      warning: 'Supabase no disponible y fallback a Google Sheets deshabilitado para producción.',
    }
  }

  const multi = getMultiSheetCsvUrlsFromEnv()
  if (multi) {
    try {
      const [recipesCsv, ingredientsCsv, stepsCsv, substepsCsv] = await Promise.all([
        fetchCsv(multi.recipes),
        fetchCsv(multi.ingredients),
        fetchCsv(multi.steps),
        fetchCsv(multi.substeps),
      ])

      const payload = parseMultiSheetPayload({
        recipesRows: csvToNormalizedRows(recipesCsv),
        ingredientsRows: csvToNormalizedRows(ingredientsCsv),
        stepsRows: csvToNormalizedRows(stepsCsv),
        substepsRows: csvToNormalizedRows(substepsCsv),
      })

      if (payload.recipes.length > 0) {
        return { source: 'sheets', payload }
      }

      return {
        source: 'local',
        payload: { recipes: defaultRecipes, recipeContentById: initialRecipeContent },
        warning: 'Google Sheets multi-hoja sin filas válidas. Usando recetas locales.',
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo leer Google Sheets multi-hoja.'
      return {
        source: 'local',
        payload: { recipes: defaultRecipes, recipeContentById: initialRecipeContent },
        warning: `${message} Usando recetas locales.`,
      }
    }
  }

  const multiWithoutSteps = getMultiSheetCsvUrlsWithoutStepsFromEnv()
  if (multiWithoutSteps) {
    try {
      const [recipesCsv, ingredientsCsv, substepsCsv] = await Promise.all([
        fetchCsv(multiWithoutSteps.recipes),
        fetchCsv(multiWithoutSteps.ingredients),
        fetchCsv(multiWithoutSteps.substeps),
      ])

      const payload = parseMultiSheetPayload({
        recipesRows: csvToNormalizedRows(recipesCsv),
        ingredientsRows: csvToNormalizedRows(ingredientsCsv),
        substepsRows: csvToNormalizedRows(substepsCsv),
      })

      if (payload.recipes.length > 0) {
        return { source: 'sheets', payload }
      }

      return {
        source: 'local',
        payload: { recipes: defaultRecipes, recipeContentById: initialRecipeContent },
        warning: 'Google Sheets (recipes+ingredients+substeps) sin filas válidas. Usando recetas locales.',
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo leer Google Sheets sin steps.'
      return {
        source: 'local',
        payload: { recipes: defaultRecipes, recipeContentById: initialRecipeContent },
        warning: `${message} Usando recetas locales.`,
      }
    }
  }

  const singleCsvUrl = getSingleSheetCsvUrlFromEnv()
  if (!singleCsvUrl) {
    return {
      source: 'local',
      payload: {
        recipes: defaultRecipes,
        recipeContentById: initialRecipeContent,
      },
      warning: 'Google Sheets no configurado. Usando recetas locales.',
    }
  }

  try {
    const csv = await fetchCsv(singleCsvUrl)
    const payload = parseSingleSheetPayload(csvToNormalizedRows(csv))

    if (payload.recipes.length === 0) {
      return {
        source: 'local',
        payload: { recipes: defaultRecipes, recipeContentById: initialRecipeContent },
        warning: 'Google Sheets sin filas válidas. Usando recetas locales.',
      }
    }

    return {
      source: 'sheets',
      payload,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo leer Google Sheets.'
    return {
      source: 'local',
      payload: { recipes: defaultRecipes, recipeContentById: initialRecipeContent },
      warning: `${message} Usando recetas locales.`,
    }
  }
}

export async function handleRecipesRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' })
    return
  }

  try {
    const resolved = await resolveRecipesPayload()
    sendJson(res, 200, {
      ok: true,
      source: resolved.source,
      warning: resolved.warning,
      recipes: resolved.payload.recipes,
      recipeContentById: resolved.payload.recipeContentById,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar recetas'
    sendJson(res, 500, {
      ok: false,
      error: message,
      recipes: defaultRecipes,
      recipeContentById: initialRecipeContent,
    })
  }
}
