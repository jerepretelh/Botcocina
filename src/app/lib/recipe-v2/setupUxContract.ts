import type { RecipeV2, RecipeYieldV2 } from '../../types/recipe-v2';

function getBaseIngredientLabel(recipe: RecipeV2 | null | undefined) {
  if (!recipe?.baseIngredientId) return recipe?.ingredient ?? 'ingrediente base';
  const baseIngredient = recipe.ingredients?.find((item) => item.id === recipe.baseIngredientId);
  if (baseIngredient?.name) return baseIngredient.name.toLowerCase();
  return recipe.baseIngredientId;
}

export function getSetupQuestion(recipe: RecipeV2 | null | undefined, yieldType: RecipeYieldV2['type'] | undefined) {
  if (recipe?.scalingModel === 'base_ingredient') {
    const baseIngredient = getBaseIngredientLabel(recipe);
    switch (yieldType) {
      case 'units':
        return `¿Cuántas ${baseIngredient} quieres usar?`;
      case 'weight':
        return `¿Cuánto pesa la base de ${baseIngredient}?`;
      case 'volume':
        return `¿Cuánto ${baseIngredient} quieres usar?`;
      case 'pan_size':
      case 'tray_size':
        return `¿Qué recipiente usarás para ${baseIngredient}?`;
      default:
        return `¿Cuánto ${baseIngredient} quieres usar?`;
    }
  }

  if (recipe?.scalingModel === 'container_bound') {
    switch (yieldType) {
      case 'pan_size':
      case 'tray_size':
        return '¿Qué recipiente quieres usar como referencia?';
      default:
        return '¿Qué recipiente quieres usar para esta receta?';
    }
  }

  switch (yieldType) {
    case 'units':
      return '¿Cuántas unidades quieres preparar?';
    case 'weight':
      return '¿Cuánto peso quieres preparar?';
    case 'volume':
      return '¿Cuánto volumen quieres preparar?';
    case 'pan_size':
    case 'tray_size':
      return '¿Qué tamano de recipiente usarás?';
    default:
      return '¿Para cuánto quieres cocinar?';
  }
}

export function usesDiscreteContainerControl(yieldValue: RecipeYieldV2 | null | undefined) {
  return yieldValue?.type === 'pan_size' || yieldValue?.type === 'tray_size';
}

export function shouldShowCookingContextBlock(recipe: RecipeV2 | null | undefined, yieldValue: RecipeYieldV2 | null | undefined) {
  const isAirfryerRecipe = Boolean(recipe?.steps.some((step) => step.equipment === 'airfryer'));
  if (!isAirfryerRecipe) return false;
  if (yieldValue?.type === 'tray_size') return false;
  return true;
}
