import { getPlaywrightBaseUrl } from './environment';

export const globalRecipesHomePath = '/recetas-globales';
export const globalRecipesAllPath = '/recetas-globales/todas';

export function normalizeHashPath(pathname: string): string {
  const trimmed = pathname.trim();
  if (!trimmed) return '/';
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+$/, '') || '/';
}

export function toHashRoute(pathname: string): string {
  return `#${normalizeHashPath(pathname)}`;
}

export function toAppUrl(pathname: string, baseUrl = getPlaywrightBaseUrl()): string {
  return `${baseUrl.replace(/\/+$/, '')}/${toHashRoute(pathname)}`;
}

export function recipeSetupPath(recipeId: string): string {
  return `/recetas/${encodeURIComponent(recipeId)}/configurar`;
}

export function recipeIngredientsPath(recipeId: string): string {
  return `/recetas/${encodeURIComponent(recipeId)}/ingredientes`;
}

export function recipeCookingPath(recipeId: string): string {
  return `/recetas/${encodeURIComponent(recipeId)}/cocinar`;
}
