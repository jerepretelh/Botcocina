import type { RecipeV2, RecipeYieldV2 } from '../../types/recipe-v2';
import { convertCanonicalVolumeToVisible, formatYieldDisplayValue, normalizeYieldV2 } from './measurements';

function normalizeVolumeUnit(unit: string | null | undefined) {
  switch ((unit ?? '').trim().toLowerCase()) {
    case 'ml':
    case 'millilitro':
    case 'millilitros':
    case 'cc':
      return 'ml';
    case 'l':
    case 'lt':
    case 'litro':
    case 'litros':
      return 'l';
    case 'cup':
    case 'cups':
      return 'taza';
    case 'taza':
    case 'tazas':
      return 'taza';
    case 'vaso':
    case 'vasos':
      return 'vaso';
    default:
      return 'ml';
  }
}

function stepForYield(yieldValue: RecipeYieldV2) {
  if (yieldValue.type === 'weight') return 50;
  if (yieldValue.type === 'volume') {
    switch (normalizeVolumeUnit(yieldValue.visibleUnit)) {
      case 'l':
        return 500;
      case 'taza':
        return 240;
      case 'vaso':
        return yieldValue.containerMeta?.capacityMl ?? 1;
      case 'ml':
      default:
        return 50;
    }
  }
  if (yieldValue.type === 'pan_size' || yieldValue.type === 'tray_size') return 0;
  return 1;
}

function minForYield(yieldValue: Pick<RecipeYieldV2, 'type' | 'visibleUnit' | 'containerMeta'>) {
  if (yieldValue.type === 'weight') return 100;
  if (yieldValue.type === 'volume') {
    switch (normalizeVolumeUnit(yieldValue.visibleUnit)) {
      case 'l':
        return 500;
      case 'taza':
        return 240;
      case 'vaso':
        return yieldValue.containerMeta?.capacityMl ?? 1;
      case 'ml':
      default:
        return 50;
    }
  }
  return 1;
}

function maxFactorForYield(yieldValue: RecipeYieldV2 | Pick<RecipeYieldV2, 'type'>) {
  if (yieldValue.type === 'units') return 80;
  if (yieldValue.type === 'weight') return 120;
  if (yieldValue.type === 'volume') return 120;
  return 20;
}

function safePositiveNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

export function normalizeTargetYield(recipe: RecipeV2, targetYield?: RecipeYieldV2 | null): RecipeYieldV2 {
  const next = targetYield ?? recipe.baseYield;
  const baseValue = typeof recipe.baseYield.value === 'number' && Number.isFinite(recipe.baseYield.value) ? recipe.baseYield.value : 1;
  const safeBaseValue = safePositiveNumber(next.value, baseValue);
  const resolvedType = next.type ?? recipe.baseYield.type;
  const resolvedCanonicalUnit = next.canonicalUnit ?? recipe.baseYield.canonicalUnit;
  const resolvedVisibleUnit = next.visibleUnit ?? recipe.baseYield.visibleUnit;
  const resolvedLabel = next.label ?? recipe.baseYield.label;
  const resolvedContainerKey = next.containerKey ?? recipe.baseYield.containerKey;
  const resolvedContainerMeta = next.containerMeta ?? recipe.baseYield.containerMeta;
  const resolvedUnit = next.unit ?? recipe.baseYield.unit;
  const maxValue = baseValue * maxFactorForYield({ type: resolvedType } as RecipeYieldV2);
  const preNormalized =
    (resolvedType === 'volume' && resolvedCanonicalUnit === 'ml') || (resolvedType === 'weight' && resolvedCanonicalUnit === 'g')
      ? {
          type: resolvedType,
          value: safeBaseValue,
          canonicalUnit: resolvedCanonicalUnit,
          visibleUnit: resolvedVisibleUnit,
          label: resolvedLabel,
          containerKey: resolvedContainerKey,
          containerMeta: resolvedContainerMeta,
          unit: resolvedUnit,
        }
      : normalizeYieldV2({
          type: resolvedType,
          value: safeBaseValue,
          canonicalUnit: resolvedCanonicalUnit,
          visibleUnit: resolvedVisibleUnit,
          label: resolvedLabel,
          containerKey: resolvedContainerKey,
          containerMeta: resolvedContainerMeta,
          unit: resolvedUnit,
        });
  const boundedValue = safePositiveNumber(preNormalized.value, baseValue) > maxValue
    ? baseValue
    : preNormalized.value;
  const minValue = minForYield(preNormalized);
  const finalValue = Math.max(minValue, safePositiveNumber(boundedValue, minValue));

  if ((preNormalized.type === 'volume' && preNormalized.canonicalUnit === 'ml') || (preNormalized.type === 'weight' && preNormalized.canonicalUnit === 'g')) {
    return {
      ...preNormalized,
      value: finalValue,
    };
  }

  return normalizeYieldV2({
    ...preNormalized,
    value: finalValue,
  });
}

export function adjustTargetYield(recipe: RecipeV2, currentYield: RecipeYieldV2, direction: -1 | 1): RecipeYieldV2 {
  const normalized = normalizeTargetYield(recipe, currentYield);
  if (normalized.value == null || normalized.type === 'pan_size' || normalized.type === 'tray_size') {
    return normalized;
  }

  const step = stepForYield(normalized);
  const nextValue = Math.max(minForYield(normalized), normalized.value + (step * direction));

  return normalizeTargetYield(recipe, {
    ...normalized,
    value: Number(nextValue.toFixed(0)),
  });
}

export function describeYieldValue(yieldValue: RecipeYieldV2 | null | undefined): string {
  return formatYieldDisplayValue(yieldValue);
}
