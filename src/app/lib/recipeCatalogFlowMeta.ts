import type { Recipe } from '../../types';

export type RecipeCatalogFlowStatus = 'journey' | 'legacy' | 'review';
export type RecipeCatalogPrimaryCapability =
  | 'standard'
  | 'compound'
  | 'base_ingredient'
  | 'container_bound'
  | 'cooking_context'
  | 'optional_ingredients';

export interface RecipeCatalogFlowMeta {
  status: RecipeCatalogFlowStatus;
  primaryCapability: RecipeCatalogPrimaryCapability;
}

const RECIPE_CATALOG_FLOW_META: Partial<Record<Recipe['id'], RecipeCatalogFlowMeta>> = {
  'keke-platano-molde': { status: 'journey', primaryCapability: 'container_bound' },
  'papas-airfryer': { status: 'journey', primaryCapability: 'cooking_context' },
  'arroz-lentejas-compuesto': { status: 'journey', primaryCapability: 'compound' },
  'pan-palta-huevo': { status: 'journey', primaryCapability: 'optional_ingredients' },
  'huevo-sancochado': { status: 'journey', primaryCapability: 'standard' },
  arroz: { status: 'journey', primaryCapability: 'base_ingredient' },
  'quinua-desayuno': { status: 'journey', primaryCapability: 'optional_ingredients' },
  'lomo-saltado-casero': { status: 'journey', primaryCapability: 'standard' },
  'sopa-verduras': { status: 'journey', primaryCapability: 'standard' },
  'tallarines-rojos-compuesto': { status: 'journey', primaryCapability: 'compound' },
};

export function getRecipeCatalogFlowMeta(recipeId: string | null | undefined): RecipeCatalogFlowMeta {
  if (!recipeId) {
    return { status: 'review', primaryCapability: 'standard' };
  }

  return RECIPE_CATALOG_FLOW_META[recipeId] ?? { status: 'review', primaryCapability: 'standard' };
}

export function getRecipeCatalogFlowStatusLabel(status: RecipeCatalogFlowStatus): string {
  switch (status) {
    case 'journey':
      return 'Journey';
    case 'legacy':
      return 'Legacy';
    case 'review':
      return 'Review';
  }
}

export function getRecipeCatalogCapabilityLabel(capability: RecipeCatalogPrimaryCapability): string {
  switch (capability) {
    case 'standard':
      return 'Standard';
    case 'compound':
      return 'Compound';
    case 'base_ingredient':
      return 'Base ingredient';
    case 'container_bound':
      return 'Container bound';
    case 'cooking_context':
      return 'Cooking context';
    case 'optional_ingredients':
      return 'Optional ingredients';
  }
}
