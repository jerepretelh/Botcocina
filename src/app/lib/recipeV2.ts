import type {
  Ingredient,
  Recipe,
  RecipeContent,
  RecipeStep,
  SubStep,
} from '../../types';
import type {
  IngredientAmountV2,
  RecipeIngredientV2,
  RecipeStepV2,
  RecipeSubStepV2,
  RecipeTimeSummaryV2,
  RecipeV2,
  RecipeYieldType,
  RecipeYieldV2,
  ScaledRecipeIngredientV2,
  ScaledRecipeStepV2,
  ScaledRecipeSubStepV2,
  ScaledRecipeV2,
  ScalingPolicy,
} from '../types/recipe-v2';
import { scaleQuantityText, scaleTimerSeconds } from './recipeScaling';
import { normalizeStructuredAmount, normalizeYieldV2 } from './recipe-v2/measurements';
import { describeYieldValue } from './recipe-v2/resolveTargetYield';

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeAmountText(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function parseLeadingNumber(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = value.match(/(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  const token = match[1].trim();
  if (/^\d+\s+\d+\/\d+$/.test(token)) {
    const [whole, fraction] = token.split(/\s+/);
    const [numerator, denominator] = fraction.split('/');
    return Number(whole) + Number(numerator) / Number(denominator);
  }
  if (/^\d+\/\d+$/.test(token)) {
    const [numerator, denominator] = token.split('/');
    return Number(numerator) / Number(denominator);
  }
  const parsed = Number.parseFloat(token.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function inferAmountUnit(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.toLowerCase();
  const unitMatch = normalized.match(/\d(?:[.,]\d+)?\s*([a-záéíóúñ]+)\b/);
  return unitMatch?.[1] ?? null;
}

function inferScalingPolicyFromText(value: string | null | undefined): ScalingPolicy {
  const normalized = (value ?? '').toLowerCase();
  if (!normalized) return 'linear';
  if (normalized.includes('al gusto') || normalized.includes('aprox')) return 'non_scalable';
  return 'linear';
}

function inferBaseYieldFromLegacy(recipe: Recipe | null | undefined, content: RecipeContent | null | undefined): RecipeYieldV2 {
  const value = content?.baseServings ?? recipe?.basePortions ?? 2;
  return {
    type: 'servings',
    value,
    unit: value === 1 ? content?.portionLabels.singular ?? 'porción' : content?.portionLabels.plural ?? 'porciones',
    label: value === 1 ? content?.portionLabels.singular ?? 'porción' : content?.portionLabels.plural ?? 'porciones',
  };
}

function amountFromLegacyValue(value: string | number | null | undefined, isTimer = false, timerScaling?: 'fixed' | 'gentle'): IngredientAmountV2 {
  const normalized = normalizeAmountText(value);
  return normalizeStructuredAmount({
    value: typeof value === 'number' ? value : parseLeadingNumber(normalized),
    unit: isTimer ? 'seconds' : inferAmountUnit(normalized),
    text: normalized,
    scalable: !normalized?.toLowerCase().includes('al gusto'),
    scalingPolicy: isTimer ? (timerScaling === 'fixed' ? 'fixed' : 'gentle') : inferScalingPolicyFromText(normalized),
  });
}

function computeTimeSummaryFromSteps(steps: RecipeStepV2[]): RecipeTimeSummaryV2 {
  const timerMinutes = steps.reduce((total, step) => total + step.subSteps.reduce((stepTotal, subStep) => {
    return stepTotal + Math.max(0, Math.round((subStep.timer?.durationSeconds ?? 0) / 60));
  }, 0), 0);
  return {
    prepMinutes: steps.length > 0 ? Math.max(1, steps.length * 3) : null,
    cookMinutes: timerMinutes || null,
    totalMinutes: timerMinutes ? timerMinutes + Math.max(1, steps.length * 3) : null,
  };
}

export function normalizeLegacyRecipeToV2(recipe: Recipe, content: RecipeContent): RecipeV2 {
  const baseYield = inferBaseYieldFromLegacy(recipe, content);
  const baseServingKey = Math.max(1, Math.min(4, Math.round(baseYield.value ?? 2))) as 1 | 2 | 4;

  const ingredients: RecipeIngredientV2[] = content.ingredients.map((ingredient, index) => {
    const legacyValue = ingredient.baseValue ?? ingredient.portions[baseServingKey] ?? ingredient.portions[2];
    return {
      id: `${recipe.id}-ingredient-${index + 1}`,
      name: ingredient.name,
      emoji: ingredient.emoji || '🍽️',
      indispensable: ingredient.indispensable,
      amount: amountFromLegacyValue(legacyValue),
    };
  });

  const steps: RecipeStepV2[] = content.steps.map((step, stepIndex) => ({
    id: `${recipe.id}-step-${stepIndex + 1}`,
    title: step.stepName,
    fireLevel: step.fireLevel,
    temperature: step.temperature ?? null,
    equipment: step.equipment,
    subSteps: step.subSteps.map((subStep, subStepIndex) => {
      const legacyValue = subStep.baseValue ?? subStep.portions[baseServingKey] ?? subStep.portions[2];
      const timerAmount = amountFromLegacyValue(legacyValue, subStep.isTimer, subStep.timerScaling);
      return {
        id: `${recipe.id}-step-${stepIndex + 1}-substep-${subStepIndex + 1}`,
        text: subStep.subStepName,
        notes: subStep.notes,
        amount: subStep.isTimer ? null : timerAmount,
        timer: subStep.isTimer
          ? {
              durationSeconds: typeof legacyValue === 'number' ? legacyValue : timerAmount.value,
              scalingPolicy: timerAmount.scalingPolicy,
            }
          : null,
      } satisfies RecipeSubStepV2;
    }),
  }));

  return {
    id: recipe.id,
    name: recipe.name,
    description: recipe.description,
    tip: content.tip,
    icon: recipe.icon,
    ingredient: recipe.ingredient,
    categoryId: recipe.categoryId,
    baseYield,
    ingredients,
    steps,
    timeSummary: computeTimeSummaryFromSteps(steps),
    experience: recipe.experience,
    compoundMeta: content.compoundMeta,
    sourceRecipe: recipe,
    sourceContent: content,
  };
}

export function createRecipeYield(args: {
  type: RecipeYieldType;
  value: number | null;
  unit?: string | null;
  label?: string | null;
}): RecipeYieldV2 {
  return normalizeYieldV2({
    type: args.type,
    value: args.value,
    visibleUnit: args.unit ?? null,
    label: args.label ?? args.unit ?? null,
    unit: args.unit ?? null,
  });
}

export function deriveTargetYieldFromLegacy(args: {
  quantityMode?: 'people' | 'have';
  peopleCount?: number | null;
  amountUnit?: 'units' | 'grams' | null;
  availableCount?: number | null;
  recipe?: Recipe | null;
  content?: RecipeContent | null;
}): RecipeYieldV2 {
  if (args.quantityMode === 'have') {
    if (args.amountUnit === 'grams') {
      return createRecipeYield({ type: 'weight', value: args.availableCount ?? null, unit: 'g', label: 'gramos' });
    }
    return createRecipeYield({
      type: 'units',
      value: args.availableCount ?? null,
      unit: args.recipe?.ingredient ?? 'unidades',
      label: args.recipe?.ingredient ?? 'unidades',
    });
  }

  const baseYield = inferBaseYieldFromLegacy(args.recipe ?? null, args.content ?? null);
  return createRecipeYield({
    type: baseYield.type,
    value: args.peopleCount ?? baseYield.value,
    unit: baseYield.unit,
    label: baseYield.label,
  });
}

export function describeRecipeYield(yieldValue: RecipeYieldV2 | null | undefined): string {
  return describeYieldValue(yieldValue);
}

export function scaleFactorForYield(baseYield: RecipeYieldV2, targetYield: RecipeYieldV2): number {
  if (baseYield.value == null || targetYield.value == null) return 1;
  if (baseYield.type !== targetYield.type) return 1;
  return Math.max(0.25, Math.min(4, targetYield.value / Math.max(baseYield.value, 1)));
}

function scaleIngredientAmount(amount: IngredientAmountV2, factor: number): string {
  if (!amount.text) return amount.value == null ? 'Al gusto' : `${amount.value}${amount.unit ? ` ${amount.unit}` : ''}`.trim();
  if (!amount.scalable || amount.scalingPolicy === 'fixed' || amount.scalingPolicy === 'non_scalable') {
    return amount.text;
  }
  return scaleQuantityText(amount.text, factor);
}

function scaleSubStepValue(subStep: RecipeSubStepV2, factor: number): { displayValue: string | number | null; durationSeconds: number | null } {
  if (subStep.timer?.durationSeconds) {
    return {
      displayValue: scaleTimerSeconds(subStep.timer.durationSeconds, factor, subStep.timer.scalingPolicy === 'fixed' ? 'fixed' : 'gentle'),
      durationSeconds: scaleTimerSeconds(subStep.timer.durationSeconds, factor, subStep.timer.scalingPolicy === 'fixed' ? 'fixed' : 'gentle'),
    };
  }

  return {
    displayValue: subStep.amount ? scaleIngredientAmount(subStep.amount, factor) : null,
    durationSeconds: null,
  };
}

export function scaleRecipeV2(recipe: RecipeV2, targetYield: RecipeYieldV2): ScaledRecipeV2 {
  const factor = scaleFactorForYield(recipe.baseYield, targetYield);
  const warnings: string[] = [];

  const ingredients: ScaledRecipeIngredientV2[] = recipe.ingredients.map((ingredient) => ({
    ...ingredient,
    displayAmount: scaleIngredientAmount(ingredient.amount, factor),
  }));

  const steps: ScaledRecipeStepV2[] = recipe.steps.map((step) => ({
    ...step,
    subSteps: step.subSteps.map((subStep) => {
      const scaled = scaleSubStepValue(subStep, factor);
      if (subStep.amount?.scalingPolicy === 'non_scalable') {
        warnings.push(`"${subStep.text}" mantiene una referencia fija.`);
      }
      return {
        ...subStep,
        displayValue: scaled.displayValue,
        durationSeconds: scaled.durationSeconds,
      } satisfies ScaledRecipeSubStepV2;
    }),
  }));

  return {
    ...recipe,
    selectedYield: targetYield,
    scaleFactor: factor,
    ingredients,
    steps,
    warnings: [...new Set(warnings)],
  };
}

export function buildResolvedLegacyContentFromScaledRecipe(recipe: ScaledRecipeV2): RecipeContent {
  const ingredients: Ingredient[] = recipe.ingredients.map((ingredient) => ({
    name: ingredient.name,
    emoji: ingredient.emoji,
    indispensable: ingredient.indispensable,
    baseValue: ingredient.displayAmount,
    portions: {
      1: ingredient.displayAmount,
      2: ingredient.displayAmount,
      4: ingredient.displayAmount,
    },
  }));

  const steps: RecipeStep[] = recipe.steps.map((step, stepIndex) => ({
    stepNumber: stepIndex + 1,
    stepName: step.title,
    fireLevel: step.fireLevel,
    temperature: step.temperature ?? undefined,
    equipment: step.equipment,
    subSteps: step.subSteps.map((subStep) => ({
      subStepName: subStep.text,
      notes: subStep.notes ?? '',
      baseValue: subStep.displayValue ?? undefined,
      timerScaling: subStep.timer?.scalingPolicy === 'fixed' ? 'fixed' : 'gentle',
      isTimer: Boolean(subStep.timer?.durationSeconds),
      portions: {
        1: subStep.durationSeconds ?? String(subStep.displayValue ?? 'Continuar'),
        2: subStep.durationSeconds ?? String(subStep.displayValue ?? 'Continuar'),
        4: subStep.durationSeconds ?? String(subStep.displayValue ?? 'Continuar'),
      },
    } satisfies SubStep)),
  }));

  return {
    ingredients,
    steps,
    tip: recipe.tip ?? '',
    baseServings: recipe.selectedYield.type === 'servings' ? recipe.selectedYield.value ?? undefined : recipe.baseYield.value ?? undefined,
    aiComplexity: recipe.steps.length > 6 ? 'complex' : 'simple',
    portionLabels: {
      singular: recipe.selectedYield.label ?? recipe.selectedYield.unit ?? 'porción',
      plural: recipe.selectedYield.label ?? recipe.selectedYield.unit ?? 'porciones',
    },
    compoundMeta: recipe.compoundMeta,
  };
}

export function buildRecipeV2PersistenceShape(recipe: RecipeV2) {
  return {
    base_yield_type: recipe.baseYield.type,
    base_yield_value: recipe.baseYield.value,
    base_yield_unit: recipe.baseYield.unit,
    base_yield_label: recipe.baseYield.label ?? null,
    ingredients_json: recipe.ingredients,
    steps_json: recipe.steps,
    time_summary_json: recipe.timeSummary,
  };
}

export function hydrateRecipeV2FromPersistence(args: {
  recipe: Recipe;
  content?: RecipeContent | null;
  payload?: Partial<{
    base_yield_type: RecipeYieldType | null;
    base_yield_value: number | null;
    base_yield_unit: string | null;
    base_yield_label: string | null;
    ingredients_json: RecipeV2['ingredients'] | null;
    steps_json: RecipeV2['steps'] | null;
    time_summary_json: RecipeTimeSummaryV2 | null;
    experience: 'standard' | 'compound' | null;
    compound_meta: RecipeContent['compoundMeta'] | null;
  }> | null;
}): RecipeV2 {
  const { recipe, content, payload } = args;
  if (!payload?.ingredients_json || !payload?.steps_json || !payload?.base_yield_type) {
    if (!content) {
      throw new Error(`No se pudo hidratar la receta ${recipe.id} sin contenido legacy.`);
    }
    return normalizeLegacyRecipeToV2(recipe, content);
  }

  return {
    id: recipe.id,
    name: recipe.name,
    description: recipe.description,
    tip: content?.tip ?? null,
    icon: recipe.icon,
    ingredient: recipe.ingredient,
    categoryId: recipe.categoryId,
    baseYield: normalizeYieldV2({
      type: payload.base_yield_type,
      value: payload.base_yield_value ?? null,
      visibleUnit: payload.base_yield_unit ?? null,
      unit: payload.base_yield_unit ?? null,
      label: payload.base_yield_label ?? null,
    }),
    ingredients: payload.ingredients_json,
    steps: payload.steps_json,
    timeSummary: payload.time_summary_json ?? computeTimeSummaryFromSteps(payload.steps_json),
    experience: payload.experience ?? recipe.experience,
    compoundMeta: payload.compound_meta ?? content?.compoundMeta,
    sourceRecipe: recipe,
    sourceContent: content ?? null,
  };
}

export function normalizeAIRecipeV2(input: {
  id?: string;
  name: string;
  icon?: string | null;
  ingredient?: string | null;
  description?: string | null;
  tip?: string | null;
  baseYield: RecipeYieldV2;
  ingredients: Array<{
    name: string;
    emoji?: string | null;
    indispensable?: boolean;
    amount: IngredientAmountV2;
    notes?: string | null;
  }>;
  steps: Array<{
    title: string;
    fireLevel?: 'low' | 'medium' | 'high';
    temperature?: number | null;
    equipment?: 'stove' | 'airfryer' | 'oven';
    notes?: string | null;
    subSteps: Array<{
      text: string;
      notes?: string | null;
      amount?: IngredientAmountV2 | null;
      timer?: { durationSeconds: number | null; scalingPolicy: ScalingPolicy } | null;
    }>;
  }>;
  timeSummary?: RecipeTimeSummaryV2 | null;
  experience?: 'standard' | 'compound';
  compoundMeta?: RecipeContent['compoundMeta'];
}): RecipeV2 {
  const steps: RecipeStepV2[] = input.steps.map((step, stepIndex) => ({
    id: `${input.id ?? slugify(input.name)}-step-${stepIndex + 1}`,
    title: step.title,
    fireLevel: step.fireLevel,
    temperature: step.temperature ?? null,
    equipment: step.equipment,
    notes: step.notes ?? null,
    subSteps: step.subSteps.map((subStep, subStepIndex) => ({
      id: `${input.id ?? slugify(input.name)}-step-${stepIndex + 1}-substep-${subStepIndex + 1}`,
      text: subStep.text,
      notes: subStep.notes ?? null,
      amount: subStep.amount ?? null,
      timer: subStep.timer ?? null,
    })),
  }));

  return {
    id: input.id ?? slugify(input.name),
    name: input.name,
    description: input.description ?? null,
    tip: input.tip ?? null,
    icon: input.icon ?? '🍽️',
    ingredient: input.ingredient ?? null,
    baseYield: normalizeYieldV2({
      ...input.baseYield,
      visibleUnit: input.baseYield.visibleUnit ?? input.baseYield.unit ?? null,
      unit: input.baseYield.unit ?? input.baseYield.visibleUnit ?? null,
    }),
    ingredients: input.ingredients.map((ingredient, index) => ({
      id: `${input.id ?? slugify(input.name)}-ingredient-${index + 1}`,
      name: ingredient.name,
      emoji: ingredient.emoji ?? '🍽️',
      indispensable: ingredient.indispensable,
      amount: normalizeStructuredAmount(ingredient.amount),
      notes: ingredient.notes ?? null,
    })),
    steps,
    timeSummary: input.timeSummary ?? computeTimeSummaryFromSteps(steps),
    experience: input.experience,
    compoundMeta: input.compoundMeta,
  };
}
