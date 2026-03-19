import type { RecipeV2, RecipeYieldType, ScalingPolicy, UnitFamily } from '../../types/recipe-v2';

const VALID_YIELD_TYPES: RecipeYieldType[] = ['servings', 'units', 'weight', 'volume', 'pan_size', 'tray_size', 'custom'];
const VALID_SCALING_POLICIES: ScalingPolicy[] = ['linear', 'fixed', 'gentle', 'batch', 'container_dependent', 'non_scalable'];
const VALID_FAMILIES: UnitFamily[] = ['weight', 'volume', 'unit', 'cup', 'tbsp', 'tsp', 'container', 'custom', 'ambiguous'];

export type CanonicalRecipeV2 = RecipeV2 & {
  __canonicalV2: true;
};

function assertRecipeYield(value: unknown, path: string): void {
  if (!value || typeof value !== 'object') {
    throw new Error(`Receta inválida en ${path}: baseYield no válido.`);
  }

  const yieldValue = value as Partial<RecipeV2['baseYield']>;
  if (typeof yieldValue.type !== 'string' || !VALID_YIELD_TYPES.includes(yieldValue.type as RecipeYieldType)) {
    throw new Error(`Receta inválida en ${path}: baseYield.type debe ser un tipo válido.`);
  }
  if (yieldValue.value !== null && typeof yieldValue.value !== 'number') {
    throw new Error(`Receta inválida en ${path}: baseYield.value debe ser número o null.`);
  }
  if (yieldValue.type === 'custom' && !yieldValue.canonicalUnit && !yieldValue.unit && !yieldValue.visibleUnit) {
    throw new Error('Receta inválida: yield tipo custom requiere unidad visible.');
  }
}

function assertIngredientAmount(amount: unknown, path: string): void {
  if (!amount || typeof amount !== 'object') {
    throw new Error(`Receta inválida en ${path}: amount inválido.`);
  }

  const typed = amount as Partial<RecipeV2['ingredients'][number]['amount']>;
  if (typeof typed.scalable !== 'boolean') {
    throw new Error(`Receta inválida en ${path}: amount.scalable inválido.`);
  }
  if (typeof typed.canonicalUnit !== 'string' || !typed.canonicalUnit) {
    throw new Error(`Receta inválida en ${path}: amount.canonicalUnit requerido.`);
  }
  if (!typed.family || !VALID_FAMILIES.includes(typed.family)) {
    throw new Error(`Receta inválida en ${path}: amount.family inválido.`);
  }
  if (!typed.scalingPolicy || !VALID_SCALING_POLICIES.includes(typed.scalingPolicy)) {
    throw new Error(`Receta inválida en ${path}: amount.scalingPolicy inválido.`);
  }
}

export function ensureCanonicalRecipeV2(recipe: unknown): CanonicalRecipeV2 {
  if (!recipe || typeof recipe !== 'object') {
    throw new Error('La receta V2 canónica debe ser un objeto válido.');
  }

  const candidate = recipe as Partial<RecipeV2>;
  if (typeof candidate.id !== 'string' || !candidate.id.trim()) {
    throw new Error('La receta V2 canónica debe incluir id.');
  }
  if (typeof candidate.name !== 'string' || !candidate.name.trim()) {
    throw new Error('La receta V2 canónica debe incluir name.');
  }
  assertRecipeYield(candidate.baseYield, 'baseYield');

  if (!Array.isArray(candidate.ingredients) || candidate.ingredients.length === 0) {
    throw new Error('La receta V2 canónica debe incluir ingredients.');
  }
  if (!Array.isArray(candidate.steps) || candidate.steps.length === 0) {
    throw new Error('La receta V2 canónica debe incluir steps.');
  }
  if (!candidate.timeSummary || typeof candidate.timeSummary !== 'object') {
    throw new Error('La receta V2 canónica debe incluir timeSummary.');
  }

  for (const [index, ingredient] of candidate.ingredients.entries()) {
    if (!ingredient || typeof ingredient !== 'object' || !ingredient.id || !ingredient.name) {
      throw new Error(`Ingrediente V2 inválido en posición ${index + 1}.`);
    }
    assertIngredientAmount(ingredient.amount, `ingredients[${index}].amount`);
  }

  for (const [stepIndex, step] of candidate.steps.entries()) {
    if (!step || typeof step !== 'object' || !step.id || !step.title) {
      throw new Error(`Paso V2 inválido en posición ${stepIndex + 1}.`);
    }
    if (!Array.isArray(step.subSteps)) {
      throw new Error(`Paso V2 inválido en posición ${stepIndex + 1}: subSteps inválido.`);
    }
    for (const [subStepIndex, subStep] of step.subSteps.entries()) {
      if (!subStep || typeof subStep !== 'object' || !subStep.id || !subStep.text) {
        throw new Error(`Subpaso V2 inválido en paso ${stepIndex + 1}, subpaso ${subStepIndex + 1}.`);
      }
      if (subStep.timer && (typeof subStep.timer.durationSeconds !== 'number' && subStep.timer.durationSeconds !== null)) {
        throw new Error(`Timer inválido en paso ${stepIndex + 1}, subpaso ${subStepIndex + 1}.`);
      }
      if (subStep.timer && !VALID_SCALING_POLICIES.includes(subStep.timer.scalingPolicy)) {
        throw new Error(`Timer scalingPolicy inválido en paso ${stepIndex + 1}, subpaso ${subStepIndex + 1}.`);
      }
    }
  }

  return {
    ...candidate,
    __canonicalV2: true,
  } as CanonicalRecipeV2;
}

export function isCanonicalRecipeV2(recipe: unknown): recipe is CanonicalRecipeV2 {
  try {
    ensureCanonicalRecipeV2(recipe);
    return true;
  } catch {
    return false;
  }
}
