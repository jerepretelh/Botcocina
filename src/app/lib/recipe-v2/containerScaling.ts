import type {
  BatchResolutionV2,
  CookingContextV2,
  RecipeStepV2,
  RecipeV2,
  RecipeYieldV2,
} from '../../types/recipe-v2';

const MOLD_DIAMETER_BY_KEY: Record<string, number> = {
  'mold-small': 18,
  'mold-medium': 22,
  'mold-large': 26,
};

const BASKET_CAPACITY_BY_KEY: Record<string, number> = {
  'basket-small': 2500,
  'basket-medium': 3500,
  'basket-large': 5000,
  'tray-small': 2500,
  'tray-medium': 3500,
  'tray-large': 5000,
};

function clampFactor(value: number) {
  return Math.max(0.25, Math.min(4, value));
}

function getMoldDiameter(yieldValue: RecipeYieldV2) {
  if (yieldValue.containerMeta?.diameterCm) return yieldValue.containerMeta.diameterCm;
  if (yieldValue.containerKey && MOLD_DIAMETER_BY_KEY[yieldValue.containerKey]) {
    return MOLD_DIAMETER_BY_KEY[yieldValue.containerKey];
  }
  return null;
}

function getContainerCapacityMl(
  containerKey: string | null | undefined,
  containerMeta: RecipeYieldV2['containerMeta'] | CookingContextV2['selectedContainerMeta'],
) {
  if (containerMeta?.capacityMl) return containerMeta.capacityMl;
  if (containerKey && BASKET_CAPACITY_BY_KEY[containerKey]) {
    return BASKET_CAPACITY_BY_KEY[containerKey];
  }
  return null;
}

export function getContainerScaleFactor(
  baseYield: RecipeYieldV2,
  targetYield: RecipeYieldV2,
): number {
  if (baseYield.type !== targetYield.type) return 1;

  if (baseYield.type === 'pan_size') {
    const baseDiameter = getMoldDiameter(baseYield);
    const targetDiameter = getMoldDiameter(targetYield);
    if (!baseDiameter || !targetDiameter) {
      return 1;
    }
    return clampFactor((targetDiameter ** 2) / Math.max(baseDiameter ** 2, 1));
  }

  if (baseYield.type === 'tray_size') {
    const baseCapacity = getContainerCapacityMl(baseYield.containerKey, baseYield.containerMeta);
    const targetCapacity = getContainerCapacityMl(targetYield.containerKey, targetYield.containerMeta);
    if (!baseCapacity || !targetCapacity) {
      return 1;
    }
    return clampFactor(targetCapacity / Math.max(baseCapacity, 1));
  }

  return 1;
}

export function describeMissingContainerScale(baseYield: RecipeYieldV2, targetYield: RecipeYieldV2): string | null {
  if (baseYield.type !== targetYield.type) return null;
  if (baseYield.type === 'pan_size') {
    const baseDiameter = getMoldDiameter(baseYield);
    const targetDiameter = getMoldDiameter(targetYield);
    if (baseDiameter && targetDiameter) return null;
    return 'No se puede escalar por molde sin diámetro base o objetivo comparable.';
  }

  if (baseYield.type === 'tray_size') {
    const baseCapacity = getContainerCapacityMl(baseYield.containerKey, baseYield.containerMeta);
    const targetCapacity = getContainerCapacityMl(targetYield.containerKey, targetYield.containerMeta);
    if (baseCapacity && targetCapacity) return null;
    return 'No se puede escalar por bandeja sin capacidades comparables en base y objetivo.';
  }

  return null;
}

export function getContainerBatchContextFactor(
  recipe: RecipeV2,
  cookingContext: CookingContextV2 | null | undefined,
): {
  containerFactor: number;
  containerReferenceMissing: boolean;
  containerReferenceMessage?: string;
} {
  const recipeUsesAirfryer = recipe.steps.some((step) => step.equipment === 'airfryer');
  if (!recipeUsesAirfryer) {
    return {
      containerFactor: 1,
      containerReferenceMissing: false,
    };
  }

  const baseContainer = recipe.cookingContextDefaults?.selectedContainerMeta ?? null;
  const selectedContainer = cookingContext?.selectedContainerMeta ?? baseContainer;
  const baseKey = recipe.cookingContextDefaults?.selectedContainerKey ?? null;
  const selectedKey = cookingContext?.selectedContainerKey ?? baseKey;
  const baseCapacity = getContainerCapacityMl(baseKey, baseContainer);
  const selectedCapacity = getContainerCapacityMl(selectedKey, selectedContainer);

  if (!baseCapacity || !selectedCapacity) {
    return {
      containerFactor: 1,
      containerReferenceMissing: true,
      containerReferenceMessage: 'Sin capacidades comparables de canasta no hay batch por contexto de airfryer.',
    };
  }

  return {
    containerFactor: clampFactor(selectedCapacity / Math.max(baseCapacity, 1)),
    containerReferenceMissing: false,
  };
}

export function getYieldScaleFactor(baseYield: RecipeYieldV2, targetYield: RecipeYieldV2): number {
  if (baseYield.type !== targetYield.type) return 1;
  if (baseYield.type === 'pan_size' || baseYield.type === 'tray_size') {
    return getContainerScaleFactor(baseYield, targetYield);
  }
  if (baseYield.value == null || targetYield.value == null) return 1;
  return clampFactor(targetYield.value / Math.max(baseYield.value, 0.01));
}

export function recipeUsesAirfryer(recipe: Pick<RecipeV2, 'steps'> | Pick<RecipeStepV2, never>) {
  return recipe.steps.some((step) => step.equipment === 'airfryer');
}

export function resolveBatchCooking(
  recipe: RecipeV2,
  targetYield: RecipeYieldV2,
  cookingContext?: CookingContextV2 | null,
): BatchResolutionV2 {
  const overallFactor = getYieldScaleFactor(recipe.baseYield, targetYield);
  const containerContext = getContainerBatchContextFactor(recipe, cookingContext);
  const { containerFactor } = containerContext;

  if (!recipeUsesAirfryer(recipe)) {
    return {
      batchCount: 1,
      perBatchScaleFactor: overallFactor,
      containerFactor,
    };
  }

  const batchCount = Math.max(1, Math.ceil(overallFactor / Math.max(containerFactor, 0.25)));
  const perBatchScaleFactor = clampFactor(overallFactor / batchCount);

  return {
    batchCount,
    perBatchScaleFactor,
    containerFactor,
  };
}
