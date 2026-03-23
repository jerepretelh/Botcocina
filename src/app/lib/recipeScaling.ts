import type {
  Ingredient,
  Portion,
  PortionValueMap,
  QuantityMode,
  Recipe,
  RecipeContent,
  SubStep,
} from '../../types';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parseFractionToken(fragment: string): number | null {
  const trimmed = fragment.trim();
  if (/^\d+\s+\d+\/\d+$/.test(trimmed)) {
    const [whole, fraction] = trimmed.split(/\s+/);
    const [numerator, denominator] = fraction.split('/');
    return Number(whole) + Number(numerator) / Number(denominator);
  }
  if (/^\d+\/\d+$/.test(trimmed)) {
    const [numerator, denominator] = trimmed.split('/');
    return Number(numerator) / Number(denominator);
  }
  const parsed = Number.parseFloat(trimmed.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatScaledNumber(value: number): string {
  if (value >= 10) return String(Math.round(value * 10) / 10).replace(/\.0$/, '');
  return String(Math.round(value * 100) / 100).replace(/\.0$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
}

export function scaleQuantityText(baseValue: string | undefined | null, factor: number): string {
  const normalizedFactor = Number.isFinite(factor) ? factor : 1;
  const safeBase = String(baseValue ?? '');
  if (Math.abs(normalizedFactor - 1) < 0.01) return safeBase;

  const match = safeBase.match(/(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?)/);
  if (!match) return safeBase;

  const parsed = parseFractionToken(match[1]);
  if (parsed == null) return baseValue;

  const scaled = Math.max(parsed * normalizedFactor, 0.1);
  return `${baseValue.slice(0, match.index ?? 0)}${formatScaledNumber(scaled)}${baseValue.slice((match.index ?? 0) + match[1].length)}`;
}

export function scaleTimerSeconds(
  seconds: number,
  ratio: number,
  mode: 'fixed' | 'gentle' = 'gentle',
): number {
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  if (mode === 'fixed' || Math.abs(ratio - 1) < 0.01 || seconds <= 45) return Math.round(seconds);

  const multiplier = clamp(1 + ((ratio - 1) * 0.35), 0.8, 1.6);
  return Math.max(1, Math.round(seconds * multiplier));
}

export function buildLegacyPortionsFromBase(args: {
  baseValue: string | number;
  baseServings: number;
  isTimer: boolean;
  timerScaling?: 'fixed' | 'gentle';
}): PortionValueMap<string | number> {
  const { baseValue, baseServings, isTimer, timerScaling = 'gentle' } = args;
  const safeBaseServings = Math.max(1, Math.round(baseServings || 1));
  const targets: Portion[] = [1, 2, 4];

  return {
    1: resolvePortionValueFromBase(baseValue, safeBaseServings, 1, isTimer, timerScaling),
    2: resolvePortionValueFromBase(baseValue, safeBaseServings, 2, isTimer, timerScaling),
    4: resolvePortionValueFromBase(baseValue, safeBaseServings, 4, isTimer, timerScaling),
  };
}

function resolvePortionValueFromBase(
  baseValue: string | number,
  baseServings: number,
  targetServings: number,
  isTimer: boolean,
  timerScaling: 'fixed' | 'gentle',
): string | number {
  const ratio = clamp(targetServings / Math.max(baseServings, 1), 0.25, 4);
  if (isTimer) {
    const baseSeconds = typeof baseValue === 'number'
      ? baseValue
      : Number.parseFloat(String(baseValue).replace(',', '.'));
    return scaleTimerSeconds(baseSeconds, ratio, timerScaling);
  }

  return scaleQuantityText(String(baseValue), ratio);
}

function resolveTargetServings(args: {
  quantityMode?: QuantityMode;
  peopleCount?: number;
  portion: Portion;
}) {
  if (args.quantityMode === 'people' && typeof args.peopleCount === 'number' && args.peopleCount > 0) {
    return args.peopleCount;
  }
  return args.portion;
}

export function resolveIngredientDisplayValue(args: {
  ingredient: Ingredient;
  recipe: Recipe | null | undefined;
  content?: RecipeContent | null | undefined;
  portion: Portion;
  peopleCount?: number;
  quantityMode?: QuantityMode;
}): string {
  const { ingredient, recipe, content, portion } = args;
  const baseServings = content?.baseServings ?? recipe?.basePortions ?? null;
  if (ingredient.baseValue && baseServings) {
    const targetServings = resolveTargetServings(args);
    return scaleQuantityText(ingredient.baseValue, targetServings / Math.max(baseServings, 1));
  }
  return ingredient.portions[portion];
}

export function resolveSubStepDisplayValue(args: {
  subStep: SubStep;
  recipe: Recipe | null | undefined;
  content?: RecipeContent | null | undefined;
  portion: Portion;
  peopleCount?: number;
  quantityMode?: QuantityMode;
}): string | number | null {
  const { subStep, recipe, content, portion } = args;
  const baseServings = content?.baseServings ?? recipe?.basePortions ?? null;
  if (subStep.baseValue != null && baseServings) {
    const targetServings = resolveTargetServings(args);
    const ratio = targetServings / Math.max(baseServings, 1);
    if (subStep.isTimer) {
      const baseSeconds = typeof subStep.baseValue === 'number'
        ? subStep.baseValue
        : Number.parseFloat(String(subStep.baseValue).replace(',', '.'));
      return scaleTimerSeconds(baseSeconds, ratio, subStep.timerScaling ?? 'gentle');
    }
    return scaleQuantityText(String(subStep.baseValue), ratio);
  }

  return subStep.portions[portion] ?? null;
}
