import type { Recipe, RecipeContent } from '../../types'
import { defaultRecipes, initialRecipeContent } from '../data/recipes'

interface RecipesApiResponse {
  ok?: boolean
  source?: 'sheets' | 'local'
  warning?: string
  recipes?: Recipe[]
  recipeContentById?: Record<string, RecipeContent>
  error?: string
}

export interface RecipesCatalogPayload {
  source: 'sheets' | 'local'
  warning?: string
  recipes: Recipe[]
  recipeContentById: Record<string, RecipeContent>
}

export async function fetchRecipesCatalog(): Promise<RecipesCatalogPayload> {
  try {
    const response = await fetch('/api/recipes')
    if (!response.ok) {
      return {
        source: 'local',
        warning: `No se pudo sincronizar recetas (${response.status}). Usando catálogo local.`,
        recipes: defaultRecipes,
        recipeContentById: initialRecipeContent,
      }
    }

    const data = (await response.json()) as RecipesApiResponse
    const recipes = Array.isArray(data.recipes) ? data.recipes : defaultRecipes
    const content = data.recipeContentById && typeof data.recipeContentById === 'object' ? data.recipeContentById : initialRecipeContent

    return {
      source: data.source === 'sheets' ? 'sheets' : 'local',
      warning: data.warning,
      recipes,
      recipeContentById: content,
    }
  } catch {
    return {
      source: 'local',
      warning: 'No se pudo sincronizar recetas. Usando catálogo local.',
      recipes: defaultRecipes,
      recipeContentById: initialRecipeContent,
    }
  }
}
