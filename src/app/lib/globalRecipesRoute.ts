export const GLOBAL_RECIPES_HOME_PATH = '/recetas-globales';
export const GLOBAL_RECIPES_ALL_PATH = '/recetas-globales/todas';

export function isGlobalRecipesAllPath(pathname: string): boolean {
  return pathname === GLOBAL_RECIPES_ALL_PATH;
}
