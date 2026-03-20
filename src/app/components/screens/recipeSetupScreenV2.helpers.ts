import type { RecipeV2, RecipeYieldV2 } from '../../types/recipe-v2';
import { convertCanonicalVolumeToVisible, formatDisplayNumber } from '../../lib/recipe-v2/measurements';

const MAX_REASONABLE_YIELD_DISPLAY_VALUE = 1_000_000;

export function getYieldDisplayValue(yieldValue: RecipeYieldV2 | null | undefined, fallbackYieldValue: RecipeYieldV2 | null | undefined = null) {
  if (!yieldValue) return 'Base';
  if (yieldValue.type === 'pan_size' || yieldValue.type === 'tray_size') {
    return yieldValue.containerMeta?.sizeLabel ?? yieldValue.label ?? 'Recipiente';
  }
  if (!Number.isFinite(yieldValue.value ?? NaN)) return 'Base';
  if (yieldValue.value == null) return 'Base';
  if (yieldValue.value <= 0 || yieldValue.value > MAX_REASONABLE_YIELD_DISPLAY_VALUE) {
    if (fallbackYieldValue?.value && fallbackYieldValue.value > 0 && fallbackYieldValue.value <= MAX_REASONABLE_YIELD_DISPLAY_VALUE) {
      return getYieldDisplayValue(fallbackYieldValue, null);
    }
    return 'Base';
  }
  if (yieldValue.type === 'volume' && yieldValue.canonicalUnit === 'ml') {
    const visible = convertCanonicalVolumeToVisible(yieldValue.value, yieldValue.visibleUnit, yieldValue.containerMeta);
    if (!Number.isFinite(visible)) return 'Base';
    if (visible <= 0 || visible > MAX_REASONABLE_YIELD_DISPLAY_VALUE) {
      if (fallbackYieldValue?.value && fallbackYieldValue.value > 0 && fallbackYieldValue.value <= MAX_REASONABLE_YIELD_DISPLAY_VALUE) {
        return getYieldDisplayValue(fallbackYieldValue, null);
      }
      return 'Base';
    }
    return formatDisplayNumber(visible, Math.abs(visible) >= 10 ? 1 : 2) ?? 'Base';
  }
  return formatDisplayNumber(yieldValue.value, Math.abs(yieldValue.value) >= 10 ? 1 : 2) ?? 'Base';
}

export function getBaseIngredientLabel(recipe: RecipeV2 | null | undefined) {
  if (!recipe?.baseIngredientId) return recipe?.ingredient ?? 'ingrediente base';
  const baseIngredient = recipe.ingredients?.find((item) => item.id === recipe.baseIngredientId);
  if (baseIngredient?.name) return baseIngredient.name.toLowerCase();
  return recipe.baseIngredientId;
}

export function getYieldCardLabel(recipe: RecipeV2 | null | undefined, baseIngredientLabel: string) {
  if (recipe?.scalingModel === 'base_ingredient') {
    return `Cantidad base de ${baseIngredientLabel}`;
  }
  if (recipe?.scalingModel === 'container_bound') {
    return 'Recipiente que usarás';
  }
  return 'Cantidad que quieres preparar';
}

export function getYieldBaseSummary(recipe: RecipeV2 | null | undefined, baseIngredientLabel: string) {
  if (recipe?.scalingModel === 'base_ingredient') {
    return `Base de ${baseIngredientLabel}`;
  }
  if (recipe?.scalingModel === 'container_bound') {
    return 'Recipiente base';
  }
  return 'Referencia de la receta';
}
