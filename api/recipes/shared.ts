import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Recipe, RecipeContent, RecipeStep, SubStep } from '../../src/types'
import { defaultRecipes, initialRecipeContent } from '../../src/app/data/recipes'

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

async function resolveRecipesPayload(): Promise<{ source: 'sheets' | 'local'; payload: JsonRecipePayload; warning?: string }> {
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
