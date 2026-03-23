import type { RecipeCategoryId, Screen } from '../../../../types';
import { isGlobalRecipesAllPath } from '../../../lib/globalRecipesRoute';
import { resolveOverlayPinnedRoute } from '../../../lib/recipeOverlayRoute';

export function normalizeAppPath(pathname: string): string {
  return pathname.replace(/\/+$/, '') || '/';
}

export function isHydrationSensitiveAppPath(pathname: string): boolean {
  return /^\/(?:categorias|recetas-globales)\/[^/]+$/.test(pathname)
    || /^\/recetas\/[^/]+\/(configurar|ingredientes|cocinar)$/.test(pathname);
}

export function resolveStaticScreenForPath(pathname: string): Screen | null {
  if (pathname === '/') return 'category-select';
  if (pathname === '/ia/aclarar') return 'ai-clarify';
  if (pathname === '/recetas-globales') return 'global-recipes';
  if (isGlobalRecipesAllPath(pathname)) return 'recipe-select';
  if (pathname === '/buscar-recetas') return 'recipe-seed-search';
  if (pathname === '/design-system') return 'design-system';
  if (pathname === '/ajustes' || pathname === '/ajustes/ia') return 'ai-settings';
  if (pathname === '/releases') return 'releases';
  if (pathname === '/backlog') return 'backlog';
  if (pathname === '/mis-recetas') return 'my-recipes';
  if (pathname === '/favoritos') return 'favorites';
  if (pathname === '/plan-semanal') return 'weekly-plan';
  if (pathname === '/compras') return 'shopping-list';
  if (pathname === '/experimentos/recetas-compuestas') return 'compound-lab';
  return null;
}

export function resolveTargetPathFromState(args: {
  screen: Screen;
  recipeId: string | null;
  selectedCategory: string | null;
  isRecipeSetupSheetOpen: boolean;
  isIngredientsSheetOpen: boolean;
  recipeOverlayPinnedPath: string | null;
}): string | null {
  const pinnedOverlayPath =
    args.recipeOverlayPinnedPath && (args.isRecipeSetupSheetOpen || args.isIngredientsSheetOpen) && args.screen !== 'cooking'
      ? args.recipeOverlayPinnedPath
      : null;

  if (pinnedOverlayPath) return pinnedOverlayPath;
  if (args.screen === 'design-system') return '/design-system';
  if (args.screen === 'recipe-seed-search') return '/buscar-recetas';
  if (args.screen === 'ai-settings') return '/ajustes';
  if (args.screen === 'releases') return '/releases';
  if (args.screen === 'backlog') return '/backlog';
  if (args.screen === 'compound-lab') return '/experimentos/recetas-compuestas';
  if (args.screen === 'my-recipes') return '/mis-recetas';
  if (args.screen === 'favorites') return '/favoritos';
  if (args.screen === 'weekly-plan') return '/plan-semanal';
  if (args.screen === 'shopping-list') return '/compras';
  if (args.screen === 'ai-clarify') return '/ia/aclarar';

  return resolveOverlayPinnedRoute({
    screen: args.screen,
    recipeId: args.recipeId,
    selectedCategory: args.selectedCategory as RecipeCategoryId | null,
    isRecipeSetupSheetOpen: args.isRecipeSetupSheetOpen,
    isIngredientsSheetOpen: args.isIngredientsSheetOpen,
    recipeOverlayPinnedPath: args.recipeOverlayPinnedPath,
  });
}

