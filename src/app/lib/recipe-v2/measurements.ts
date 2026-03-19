import type { ContainerMetaV2, IngredientAmountV2, RecipeYieldType, RecipeYieldV2, UnitFamily } from '../../types/recipe-v2';

const VOLUME_UNIT_MAP: Record<string, { canonicalUnit: 'ml'; factor?: number; visibleUnit: 'ml' | 'l' | 'taza' | 'vaso'; requiresContainerCapacity?: boolean }> = {
  ml: { canonicalUnit: 'ml', factor: 1, visibleUnit: 'ml' },
  l: { canonicalUnit: 'ml', factor: 1000, visibleUnit: 'l' },
  litro: { canonicalUnit: 'ml', factor: 1000, visibleUnit: 'l' },
  litros: { canonicalUnit: 'ml', factor: 1000, visibleUnit: 'l' },
  cc: { canonicalUnit: 'ml', factor: 1, visibleUnit: 'ml' },
  taza: { canonicalUnit: 'ml', factor: 240, visibleUnit: 'taza' },
  tazas: { canonicalUnit: 'ml', factor: 240, visibleUnit: 'taza' },
  cup: { canonicalUnit: 'ml', factor: 240, visibleUnit: 'taza' },
  cups: { canonicalUnit: 'ml', factor: 240, visibleUnit: 'taza' },
  vaso: { canonicalUnit: 'ml', visibleUnit: 'vaso', requiresContainerCapacity: true },
  vasos: { canonicalUnit: 'ml', visibleUnit: 'vaso', requiresContainerCapacity: true },
  glass: { canonicalUnit: 'ml', visibleUnit: 'vaso', requiresContainerCapacity: true },
};

const WEIGHT_UNIT_MAP: Record<string, { canonicalUnit: 'g'; factor: number; visibleUnit: 'g' | 'kg' }> = {
  g: { canonicalUnit: 'g', factor: 1, visibleUnit: 'g' },
  gr: { canonicalUnit: 'g', factor: 1, visibleUnit: 'g' },
  gramos: { canonicalUnit: 'g', factor: 1, visibleUnit: 'g' },
  kg: { canonicalUnit: 'g', factor: 1000, visibleUnit: 'kg' },
  kilo: { canonicalUnit: 'g', factor: 1000, visibleUnit: 'kg' },
  kilos: { canonicalUnit: 'g', factor: 1000, visibleUnit: 'kg' },
};

const UNIT_ALIASES = new Set([
  'unidad',
  'unidades',
  'huevo',
  'huevos',
  'tajada',
  'tajadas',
  'tostada',
  'tostadas',
  'empanada',
  'empanadas',
  'presa',
  'presas',
  'papa',
  'papas',
]);

export function formatDisplayNumber(value: number, decimalsForSmallValues = 2) {
  if (!Number.isFinite(value)) return null;
  const decimals = Math.abs(value) >= 10 ? 1 : decimalsForSmallValues;
  const rounded = Number(value.toFixed(decimals));
  return Number.isInteger(rounded) ? `${rounded.toFixed(0)}` : `${rounded}`;
}

function normalizeKey(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase();
}

export function isVolumeAlias(unit: string | null | undefined): boolean {
  return Boolean(VOLUME_UNIT_MAP[normalizeKey(unit)]);
}

export function inferUnitFamily(unit: string | null | undefined, fallback: UnitFamily = 'custom'): UnitFamily {
  const key = normalizeKey(unit);
  if (!key) return fallback;
  if (VOLUME_UNIT_MAP[key]) return 'volume';
  if (WEIGHT_UNIT_MAP[key]) return 'weight';
  if (UNIT_ALIASES.has(key)) return 'unit';
  if (key === 'cda' || key === 'cdas') return 'tbsp';
  if (key === 'cdta' || key === 'cdtas') return 'tsp';
  return fallback;
}

function resolveVolumeFromUnit(value: number | null, rawUnit: string | null, containerCapacity: number | null) {
  const volume = rawUnit ? VOLUME_UNIT_MAP[rawUnit] : null;
  if (!volume) return null;

  if (volume.requiresContainerCapacity) {
    if (!containerCapacity) {
      return {
        value,
        canonicalUnit: null,
        visibleUnit: volume.visibleUnit,
        family: 'ambiguous' as UnitFamily,
        isAmbiguous: true,
      };
    }
    return {
      value: value == null ? null : value * containerCapacity,
      canonicalUnit: volume.canonicalUnit,
      visibleUnit: volume.visibleUnit,
      family: 'volume' as UnitFamily,
      isAmbiguous: false,
    };
  }

  return {
    value: value == null ? null : value * (volume.factor ?? 1),
    canonicalUnit: volume.canonicalUnit,
    visibleUnit: volume.visibleUnit,
    family: 'volume' as UnitFamily,
    isAmbiguous: false,
  };
}

export function normalizeStructuredAmount(input: {
  value: number | null;
  unit?: string | null;
  canonicalUnit?: string | null;
  visibleUnit?: string | null;
  family?: UnitFamily;
  text?: string | null;
  scalable: boolean;
  scalingPolicy: IngredientAmountV2['scalingPolicy'];
  containerMeta?: ContainerMetaV2 | null;
}): IngredientAmountV2 {
  const rawUnit = normalizeKey(input.visibleUnit ?? input.unit ?? input.canonicalUnit);
  const containerCapacity = input.containerMeta?.capacityMl ?? null;
  const canonicalKey = normalizeKey(input.canonicalUnit);

  if (canonicalKey === 'ml') {
    const preferredVisible = rawUnit && VOLUME_UNIT_MAP[rawUnit]
      ? VOLUME_UNIT_MAP[rawUnit].visibleUnit
      : 'ml';
    return {
      value: input.value,
      canonicalUnit: 'ml',
      visibleUnit: preferredVisible,
      family: 'volume',
      text: input.text ?? null,
      scalable: input.scalable,
      scalingPolicy: input.scalingPolicy,
      unit: input.visibleUnit ?? input.unit ?? preferredVisible,
    };
  }

  if (canonicalKey === 'g') {
    const preferredVisible = rawUnit && WEIGHT_UNIT_MAP[rawUnit]
      ? WEIGHT_UNIT_MAP[rawUnit].visibleUnit
      : 'g';
    return {
      value: input.value,
      canonicalUnit: 'g',
      visibleUnit: preferredVisible,
      family: 'weight',
      text: input.text ?? null,
      scalable: input.scalable,
      scalingPolicy: input.scalingPolicy,
      unit: input.visibleUnit ?? input.unit ?? preferredVisible,
    };
  }

  if (rawUnit && VOLUME_UNIT_MAP[rawUnit]) {
    const resolved = resolveVolumeFromUnit(input.value, rawUnit, containerCapacity);
    if (resolved) {
      return {
        value: resolved.value,
        canonicalUnit: resolved.canonicalUnit,
        visibleUnit: resolved.visibleUnit,
        family: resolved.family,
        text: input.text ?? null,
        scalable: input.scalable,
        scalingPolicy: input.scalingPolicy,
        unit: input.visibleUnit ?? input.unit ?? resolved.visibleUnit,
      };
    }
  }

  if (rawUnit && WEIGHT_UNIT_MAP[rawUnit]) {
    const weight = WEIGHT_UNIT_MAP[rawUnit];
    return {
      value: input.value == null ? null : input.value * weight.factor,
      canonicalUnit: 'g',
      visibleUnit: weight.visibleUnit,
      family: 'weight',
      text: input.text ?? null,
      scalable: input.scalable,
      scalingPolicy: input.scalingPolicy,
      unit: input.visibleUnit ?? input.unit ?? weight.visibleUnit,
    };
  }

  const family = input.family ?? inferUnitFamily(rawUnit || input.canonicalUnit, input.containerMeta ? 'container' : 'custom');
  const canonicalUnit =
    family === 'unit'
      ? 'unidad'
      : input.canonicalUnit ?? (rawUnit || null);

  return {
    value: input.value,
    canonicalUnit,
    visibleUnit: input.visibleUnit ?? input.unit ?? canonicalUnit,
    family,
    text: input.text ?? null,
    scalable: input.scalable,
    scalingPolicy: input.scalingPolicy,
    unit: input.visibleUnit ?? input.unit ?? canonicalUnit,
  };
}

export function convertCanonicalVolumeToVisible(valueMl: number, visibleUnit: string | null | undefined, containerMeta?: ContainerMetaV2 | null): number {
  if (!Number.isFinite(valueMl)) return NaN;
  const unit = normalizeKey(visibleUnit);
  if (!unit || unit === 'ml') return valueMl;
  if (unit === 'l' || unit === 'litro' || unit === 'litros') return valueMl / 1000;
  if (unit === 'taza' || unit === 'tazas') return valueMl / 240;
  if (unit === 'cup' || unit === 'cups') return valueMl / 240;
  if (unit === 'vaso' || unit === 'vasos') {
    const capacityMl = containerMeta?.capacityMl;
    if (!capacityMl || !Number.isFinite(capacityMl)) return NaN;
    return valueMl / capacityMl;
  }
  return valueMl;
}

export function requiresExplicitContainerCapacity(yieldValue: Pick<RecipeYieldV2, 'type' | 'visibleUnit' | 'containerMeta' | 'containerKey'> | null | undefined) {
  if (!yieldValue || yieldValue.type !== 'volume') return false;
  const unit = normalizeKey(yieldValue.visibleUnit);
  if (unit !== 'vaso' && unit !== 'vasos') return false;
  if (yieldValue.containerKey && yieldValue.containerMeta) return false;
  return !yieldValue.containerMeta?.capacityMl;
}

export function normalizeYieldVolume(input: {
  value: number | null;
  unit?: string | null;
  visibleUnit?: string | null;
  canonicalUnit?: string | null;
  containerMeta?: ContainerMetaV2 | null;
}) {
  const rawUnit = normalizeKey(input.visibleUnit ?? input.unit ?? input.canonicalUnit);
  const resolved = resolveVolumeFromUnit(input.value, rawUnit, input.containerMeta?.capacityMl ?? null);
  if (!resolved) {
    return {
      canonicalUnit: input.canonicalUnit ?? input.visibleUnit ?? input.unit ?? null,
      visibleUnit: input.visibleUnit ?? input.unit ?? null,
      value: input.value,
      isAmbiguous: false,
    };
  }
  return {
    canonicalUnit: resolved.canonicalUnit,
    visibleUnit: resolved.visibleUnit,
    value: resolved.value,
    isAmbiguous: resolved.isAmbiguous,
  };
}

export function formatYieldDisplayValue(yieldValue: RecipeYieldV2 | null | undefined): string {
  if (!yieldValue) return 'Cantidad base';
  if (yieldValue.type === 'pan_size' || yieldValue.type === 'tray_size') {
    return yieldValue.containerMeta?.sizeLabel ?? yieldValue.label ?? yieldValue.visibleUnit ?? 'Recipiente';
  }
  if (!Number.isFinite(yieldValue.value ?? NaN)) return yieldValue.label ?? yieldValue.visibleUnit ?? yieldValue.unit ?? 'Cantidad base';
  if (yieldValue.value == null) return yieldValue.label ?? yieldValue.visibleUnit ?? yieldValue.unit ?? 'Cantidad base';
  if (yieldValue.type === 'volume' && yieldValue.canonicalUnit === 'ml') {
    const visible = yieldValue.visibleUnit ?? 'ml';
    const displayValue = convertCanonicalVolumeToVisible(yieldValue.value, visible, yieldValue.containerMeta);
    if (!Number.isFinite(displayValue)) {
      return `${yieldValue.label ?? visible}`.trim();
    }
    const compactValue = formatDisplayNumber(displayValue) ?? `${yieldValue.label ?? visible}`;
    const compact = `${compactValue} ${yieldValue.label ?? visible}`.trim();
    if ((yieldValue.visibleUnit === 'vaso' || yieldValue.visibleUnit === 'vasos') && yieldValue.containerMeta?.capacityMl) {
      return `${compact} (${yieldValue.containerMeta.capacityMl} ml)`;
    }
    return compact;
  }
  const compactValue = formatDisplayNumber(yieldValue.value, Math.abs(yieldValue.value) >= 10 ? 1 : 2);
  const unitLabel = yieldValue.label ?? yieldValue.visibleUnit ?? yieldValue.unit ?? '';
  if (!compactValue) return unitLabel || 'Cantidad base';
  return `${compactValue} ${unitLabel}`.trim();
}

export function formatScaledStructuredAmount(amount: Pick<IngredientAmountV2, 'value' | 'canonicalUnit' | 'visibleUnit' | 'family' | 'text' | 'scalable' | 'scalingPolicy'>, scaledValue: number | null, containerMeta?: ContainerMetaV2 | null): string {
  if (amount.text && (!amount.scalable || amount.scalingPolicy === 'non_scalable')) {
    return amount.text;
  }
  if (scaledValue == null) {
    return amount.text ?? 'Al gusto';
  }

  if (amount.family === 'volume' && amount.canonicalUnit === 'ml') {
    const displayValue = convertCanonicalVolumeToVisible(scaledValue, amount.visibleUnit, containerMeta);
    if (!Number.isFinite(displayValue)) {
      return amount.text ?? 'Al gusto';
    }
    const rounded = displayValue >= 10 ? Math.round(displayValue * 10) / 10 : Math.round(displayValue * 100) / 100;
    const roundedText = formatDisplayNumber(rounded) ?? '0';
    return `${roundedText} ${amount.visibleUnit ?? 'ml'}`.trim();
  }

  const rounded = scaledValue >= 10 ? Math.round(scaledValue * 10) / 10 : Math.round(scaledValue * 100) / 100;
  const roundedText = formatDisplayNumber(rounded) ?? '0';
  return `${roundedText} ${amount.visibleUnit ?? amount.canonicalUnit ?? ''}`.trim();
}

export function normalizeYieldV2(input: {
  type: RecipeYieldType;
  value: number | null;
  unit?: string | null;
  canonicalUnit?: string | null;
  visibleUnit?: string | null;
  label?: string | null;
  containerKey?: string | null;
  containerMeta?: ContainerMetaV2 | null;
}): RecipeYieldV2 {
  const normalizedYield = input.type === 'volume'
    ? normalizeYieldVolume({
      value: input.value,
      visibleUnit: input.visibleUnit,
      unit: input.unit,
      canonicalUnit: input.canonicalUnit,
      containerMeta: input.containerMeta,
    })
    : {
      canonicalUnit: input.canonicalUnit ?? null,
      visibleUnit: input.visibleUnit ?? null,
      value: input.value,
      isAmbiguous: false,
    };

  const base = normalizeStructuredAmount({
    value: normalizedYield.value,
    unit: normalizedYield.visibleUnit ?? input.unit ?? input.canonicalUnit,
    canonicalUnit: normalizedYield.canonicalUnit,
    visibleUnit: input.visibleUnit,
    family:
      input.type === 'volume'
        ? 'volume'
        : input.type === 'weight'
          ? 'weight'
          : input.type === 'units'
            ? 'unit'
            : input.type === 'pan_size' || input.type === 'tray_size'
              ? 'container'
              : 'custom',
    scalable: true,
    scalingPolicy: 'linear',
    containerMeta: input.containerMeta,
  });

  return {
    type: input.type,
    value: base.value,
    canonicalUnit: input.type === 'pan_size' || input.type === 'tray_size' ? 'container' : base.canonicalUnit,
    visibleUnit: input.type === 'pan_size' || input.type === 'tray_size'
      ? input.containerMeta?.sizeLabel ?? input.visibleUnit ?? input.label ?? null
      : base.visibleUnit,
    label: input.label ?? base.visibleUnit ?? base.canonicalUnit ?? null,
    containerKey: input.containerKey ?? null,
    containerMeta: input.containerMeta ?? null,
    unit: input.visibleUnit ?? input.unit ?? base.visibleUnit ?? base.canonicalUnit ?? null,
  };
}
