export { resolveOverlayPinnedPath as resolveOverlayPinnedRoute } from './recipeNavigation';

export function isRecipeOverlayRoute(pathname: string): boolean {
  return /^\/recetas\/[^/]+\/(configurar|ingredientes)$/.test(pathname);
}
