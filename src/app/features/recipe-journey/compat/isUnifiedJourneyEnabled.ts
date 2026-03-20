const UNIFIED_JOURNEY_RECIPE_IDS = new Set([
  'keke-platano-molde',
  'papas-airfryer',
  'arroz-lentejas-compuesto',
  'tallarines-rojos-compuesto',
  'pan-palta-huevo',
  'quinua-desayuno',
  'huevo-sancochado',
  'arroz',
  'lomo-saltado-casero',
  'sopa-verduras',
]);

export function isUnifiedJourneyEnabled(recipeId: string | null | undefined): boolean {
  return Boolean(recipeId && UNIFIED_JOURNEY_RECIPE_IDS.has(recipeId));
}
