import { parseFixedRecipesJson } from './loader';
import type {
  FixedRecipeIngredientItem,
  FixedRecipeJson,
  FixedRecipeStepIngredientRef,
} from './types';

type CanonicalAmount = number | string;

type CanonicalIngredientRef = {
  name: string;
  canonicalName: string;
  shoppingKey?: string;
  amount: CanonicalAmount;
  unit: string;
  displayAmount?: string;
  displayUnit?: string;
  notes?: string;
  preparation?: string;
  isFlexible?: boolean;
  isOptional?: boolean;
};

type CanonicalIngredientItem = CanonicalIngredientRef & {
  purchasable?: boolean;
};

type CanonicalIngredientGroup = {
  title: string;
  icon: string;
  items: CanonicalIngredientItem[];
};

type CanonicalStep = {
  id?: string;
  kind: 'action' | 'timer' | 'result' | 'group';
  text?: string;
  title?: string;
  container?: string;
  timerSec?: number;
  timer?: number;
  result?: string;
  ingredients?: CanonicalIngredientRef[];
  substeps?: CanonicalStep[];
};

type CanonicalPhase = {
  id: string;
  number: string;
  title: string;
  emoji: string;
  purpose: string;
  steps: CanonicalStep[];
};

type CanonicalRecipe = {
  id: string;
  title: string;
  yield?: string;
  recipeCategory?: 'stovetop' | 'baking' | 'dessert' | 'airfryer' | 'beverage' | 'other';
  equipment?: string[];
  servings: number;
  ingredients: CanonicalIngredientGroup[];
  phases: CanonicalPhase[];
};

export type ImportPreviewResult = {
  ok: boolean;
  mode: 'runtime-array' | 'runtime-object' | 'canonical-object' | 'canonical-array' | 'invalid';
  parsedJson: unknown | null;
  recipes: FixedRecipeJson[];
  errors: string[];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isValidAmount(value: unknown): value is CanonicalAmount {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0;
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return false;
}

function validateCanonicalStep(
  step: unknown,
  phaseIndex: number,
  stepIndex: number,
  errors: string[],
  parentPath?: string,
): void {
  const path = parentPath ?? `steps[${phaseIndex}:${stepIndex}]`;
  const isNestedSubstep = path.includes('.substeps[');
  if (!isObject(step)) {
    errors.push(`${path} debe ser objeto.`);
    return;
  }
  if ((!isNestedSubstep && (typeof step.id !== 'string' || !step.id.trim()))
    || (step.id != null && (typeof step.id !== 'string' || !step.id.trim()))) {
    errors.push(`${path}.id inválido.`);
  }
  if (step.kind !== 'action' && step.kind !== 'timer' && step.kind !== 'result' && step.kind !== 'group') {
    errors.push(`${path}.kind inválido.`);
    return;
  }

  if (step.kind === 'group') {
    if (typeof step.title !== 'string' || !step.title.trim()) errors.push(`${path}.title inválido para kind=group.`);
    if ('text' in step && step.text != null) errors.push(`${path}.text no permitido para kind=group.`);
    if (!Array.isArray(step.substeps) || step.substeps.length === 0) {
      errors.push(`${path}.substeps debe ser arreglo no vacío para kind=group.`);
      return;
    }
    step.substeps.forEach((substep, substepIndex) => {
      validateCanonicalStep(substep, phaseIndex, stepIndex, errors, `${path}.substeps[${substepIndex}]`);
    });
    return;
  }

  if (typeof step.text !== 'string' || !step.text.trim()) errors.push(`${path}.text inválido.`);
  if ('substeps' in step && step.substeps != null) errors.push(`${path}.substeps no permitido para kind=${step.kind}.`);
  if ('title' in step && step.title != null) errors.push(`${path}.title no permitido para kind=${step.kind}.`);
  if (step.container != null && (typeof step.container !== 'string' || !step.container.trim())) {
    errors.push(`${path}.container inválido.`);
  }
  if (step.kind === 'timer') {
    const timerValue = step.timerSec ?? step.timer;
    if (typeof timerValue !== 'number' || !Number.isInteger(timerValue) || timerValue <= 0) {
      errors.push(`${path}.timerSec inválido para kind=timer.`);
    }
  }
  if (step.kind === 'result') {
    if (typeof step.result !== 'string' || !step.result.trim()) {
      errors.push(`${path}.result inválido para kind=result.`);
    }
  }
  if (Array.isArray(step.ingredients)) {
    step.ingredients.forEach((ref, refIndex) => {
      if (!isObject(ref)) {
        errors.push(`${path}.ingredients[${refIndex}] debe ser objeto.`);
        return;
      }
      if (typeof ref.name !== 'string' || !ref.name.trim()) {
        errors.push(`${path}.ingredients[${refIndex}].name inválido.`);
      }
      if (typeof ref.canonicalName !== 'string' || !ref.canonicalName.trim()) {
        errors.push(`${path}.ingredients[${refIndex}].canonicalName inválido.`);
      }
      if (ref.shoppingKey != null && (typeof ref.shoppingKey !== 'string' || !ref.shoppingKey.trim())) {
        errors.push(`${path}.ingredients[${refIndex}].shoppingKey inválido.`);
      }
      if (!isValidAmount(ref.amount)) {
        errors.push(`${path}.ingredients[${refIndex}].amount inválido.`);
      }
      if (typeof ref.unit !== 'string' || !ref.unit.trim()) {
        errors.push(`${path}.ingredients[${refIndex}].unit inválido.`);
      }
      if (ref.displayAmount != null && (typeof ref.displayAmount !== 'string' || !ref.displayAmount.trim())) {
        errors.push(`${path}.ingredients[${refIndex}].displayAmount inválido.`);
      }
      if (ref.displayUnit != null && (typeof ref.displayUnit !== 'string' || !ref.displayUnit.trim())) {
        errors.push(`${path}.ingredients[${refIndex}].displayUnit inválido.`);
      }
      if (ref.isOptional != null && typeof ref.isOptional !== 'boolean') {
        errors.push(`${path}.ingredients[${refIndex}].isOptional inválido.`);
      }
    });
  }
}

function flattenCanonicalStep(
  step: CanonicalStep,
  parentGroupTitle?: string,
  fallbackId?: string,
): FixedRecipeJson['phases'][number]['steps'] {
  const resolvedId = typeof step.id === 'string' && step.id.trim() ? step.id.trim() : (fallbackId ?? 'step-auto');
  if (step.kind === 'group') {
    const groupIntro = {
      id: resolvedId,
      kind: 'action' as const,
      text: step.title?.trim() ?? 'Preparar',
      groupId: resolvedId,
      groupTitle: step.title?.trim() ?? 'Preparar',
      groupPosition: 'header' as const,
      groupSubstepCount: (step.substeps ?? []).length,
    };
    const nested = (step.substeps ?? []).flatMap((substep, index) => {
      const ensuredId = substep.id?.trim() ? substep.id : `${resolvedId}-sub-${index + 1}`;
      return flattenCanonicalStep({ ...substep, id: ensuredId }, step.title ?? parentGroupTitle, ensuredId);
    });
    return [groupIntro, ...nested];
  }

  if (step.kind === 'timer') {
    const timerSeconds = typeof step.timerSec === 'number'
      ? step.timerSec
      : (step as Record<string, unknown>).timer;
    return [{
      id: resolvedId,
      text: toTimerText(typeof timerSeconds === 'number' ? timerSeconds : 0),
      container: step.container,
      timer: typeof timerSeconds === 'number' ? timerSeconds : undefined,
      kind: 'timer' as const,
      groupId: parentGroupTitle ? fallbackId?.replace(/-sub-\d+$/, '') : undefined,
      groupTitle: parentGroupTitle,
      groupStepText: parentGroupTitle ? step.text : undefined,
      groupPosition: parentGroupTitle ? 'substep' as const : undefined,
      groupSubstepIndex: parentGroupTitle ? Number((resolvedId.match(/-sub-(\d+)$/)?.[1] ?? '0')) || undefined : undefined,
    }];
  }

  if (step.kind === 'result') {
    const resultText = typeof step.result === 'string' && step.result.trim()
      ? `Resultado: ${step.result.trim()}`
      : step.text ?? '';
    return [{
      id: resolvedId,
      text: resultText,
      container: step.container,
      type: 'result' as const,
      kind: 'result' as const,
      groupId: parentGroupTitle ? fallbackId?.replace(/-sub-\d+$/, '') : undefined,
      groupTitle: parentGroupTitle,
      groupStepText: parentGroupTitle ? step.text : undefined,
      groupPosition: parentGroupTitle ? 'substep' as const : undefined,
      groupSubstepIndex: parentGroupTitle ? Number((resolvedId.match(/-sub-(\d+)$/)?.[1] ?? '0')) || undefined : undefined,
    }];
  }

  const actionText = parentGroupTitle
    ? `${parentGroupTitle}: ${step.text ?? 'Continuar'}`
    : (step.text ?? 'Continuar');

  return [{
    id: resolvedId,
    kind: 'action' as const,
    text: actionText,
    container: step.container,
    groupId: parentGroupTitle ? fallbackId?.replace(/-sub-\d+$/, '') : undefined,
    groupTitle: parentGroupTitle,
    groupStepText: parentGroupTitle ? step.text : undefined,
    groupPosition: parentGroupTitle ? 'substep' as const : undefined,
    groupSubstepIndex: parentGroupTitle ? Number((resolvedId.match(/-sub-(\d+)$/)?.[1] ?? '0')) || undefined : undefined,
    ingredients: Array.isArray(step.ingredients)
      ? step.ingredients.map((item): FixedRecipeStepIngredientRef => ({
          name: item.name,
          canonicalName: item.canonicalName,
          shoppingKey: item.shoppingKey,
          amount: item.amount,
          unit: item.unit,
          displayAmount: item.displayAmount,
          displayUnit: item.displayUnit,
          notes: item.notes,
          preparation: item.preparation,
          isFlexible: item.isFlexible,
          isOptional: item.isOptional,
        }))
      : undefined,
  }];
}

function validateCanonicalRecipe(input: unknown): { valid: boolean; errors: string[]; recipe?: CanonicalRecipe } {
  const errors: string[] = [];
  if (!isObject(input)) {
    return { valid: false, errors: ['El JSON debe ser un objeto receta o un arreglo de recetas.'] };
  }

  const candidate = input as Record<string, unknown>;
  const hasSchemaFingerprint = '$defs' in candidate || ('$schema' in candidate && 'title' in candidate && 'properties' in candidate);
  if (hasSchemaFingerprint && !('phases' in candidate) && !('ingredients' in candidate)) {
    errors.push('Parece un JSON Schema, no una receta.');
  }

  if (typeof candidate.id !== 'string' || !candidate.id.trim()) errors.push('id debe ser string no vacío.');
  if (typeof candidate.title !== 'string' || !candidate.title.trim()) errors.push('title debe ser string no vacío.');
  if (candidate.yield != null && (typeof candidate.yield !== 'string' || !candidate.yield.trim())) {
    errors.push('yield debe ser string no vacío.');
  }
  if (
    candidate.recipeCategory != null
    && !['stovetop', 'baking', 'dessert', 'airfryer', 'beverage', 'other'].includes(String(candidate.recipeCategory))
  ) {
    errors.push('recipeCategory inválido.');
  }
  if (
    candidate.equipment != null
    && (!Array.isArray(candidate.equipment) || candidate.equipment.some((item) => typeof item !== 'string' || !item.trim()))
  ) {
    errors.push('equipment debe ser arreglo de strings no vacíos.');
  }
  if (typeof candidate.servings !== 'number' || !Number.isInteger(candidate.servings) || candidate.servings <= 0) {
    errors.push('servings debe ser entero >= 1.');
  }

  if (!Array.isArray(candidate.ingredients) || candidate.ingredients.length === 0) {
    errors.push('ingredients debe ser arreglo no vacío.');
  } else {
    candidate.ingredients.forEach((group, groupIndex) => {
      if (!isObject(group)) {
        errors.push(`ingredients[${groupIndex}] debe ser objeto.`);
        return;
      }
      if (typeof group.title !== 'string' || !group.title.trim()) errors.push(`ingredients[${groupIndex}].title inválido.`);
      if (typeof group.icon !== 'string' || !group.icon.trim()) errors.push(`ingredients[${groupIndex}].icon inválido.`);
      if (!Array.isArray(group.items) || group.items.length === 0) {
        errors.push(`ingredients[${groupIndex}].items debe ser arreglo no vacío.`);
        return;
      }
      group.items.forEach((item, itemIndex) => {
        if (!isObject(item)) {
          errors.push(`ingredients[${groupIndex}].items[${itemIndex}] debe ser objeto.`);
          return;
        }
        if (typeof item.name !== 'string' || !item.name.trim()) {
          errors.push(`ingredients[${groupIndex}].items[${itemIndex}].name inválido.`);
        }
        if (typeof item.canonicalName !== 'string' || !item.canonicalName.trim()) {
          errors.push(`ingredients[${groupIndex}].items[${itemIndex}].canonicalName inválido.`);
        }
        if (item.shoppingKey != null && (typeof item.shoppingKey !== 'string' || !item.shoppingKey.trim())) {
          errors.push(`ingredients[${groupIndex}].items[${itemIndex}].shoppingKey inválido.`);
        }
        if (!isValidAmount(item.amount)) {
          errors.push(`ingredients[${groupIndex}].items[${itemIndex}].amount inválido.`);
        }
        if (typeof item.unit !== 'string' || !item.unit.trim()) {
          errors.push(`ingredients[${groupIndex}].items[${itemIndex}].unit inválido.`);
        }
        if (item.displayAmount != null && (typeof item.displayAmount !== 'string' || !item.displayAmount.trim())) {
          errors.push(`ingredients[${groupIndex}].items[${itemIndex}].displayAmount inválido.`);
        }
        if (item.displayUnit != null && (typeof item.displayUnit !== 'string' || !item.displayUnit.trim())) {
          errors.push(`ingredients[${groupIndex}].items[${itemIndex}].displayUnit inválido.`);
        }
        if (item.isOptional != null && typeof item.isOptional !== 'boolean') {
          errors.push(`ingredients[${groupIndex}].items[${itemIndex}].isOptional inválido.`);
        }
      });
    });
  }

  const phaseNumberRegex = /^FASE\s+[0-9]+$/;
  if (!Array.isArray(candidate.phases) || candidate.phases.length === 0) {
    errors.push('phases debe ser arreglo no vacío.');
  } else {
    candidate.phases.forEach((phase, phaseIndex) => {
      if (!isObject(phase)) {
        errors.push(`phases[${phaseIndex}] debe ser objeto.`);
        return;
      }
      if (typeof phase.id !== 'string' || !phase.id.trim()) errors.push(`phases[${phaseIndex}].id inválido.`);
      if (typeof phase.number !== 'string' || !phaseNumberRegex.test(phase.number)) {
        errors.push(`phases[${phaseIndex}].number debe cumplir "FASE N".`);
      }
      if (typeof phase.title !== 'string' || !phase.title.trim()) errors.push(`phases[${phaseIndex}].title inválido.`);
      if (typeof phase.emoji !== 'string' || !phase.emoji.trim()) errors.push(`phases[${phaseIndex}].emoji inválido.`);
      if (phase.purpose != null && (typeof phase.purpose !== 'string' || !phase.purpose.trim())) {
        errors.push(`phases[${phaseIndex}].purpose inválido.`);
      }
      if (!Array.isArray(phase.steps) || phase.steps.length === 0) {
        errors.push(`phases[${phaseIndex}].steps debe ser arreglo no vacío.`);
        return;
      }
      phase.steps.forEach((step, stepIndex) => validateCanonicalStep(step, phaseIndex, stepIndex, errors));
    });
  }

  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, errors: [], recipe: candidate as unknown as CanonicalRecipe };
}

function toTimerText(seconds: number): string {
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  return `TIMER: ${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

function canonicalToRuntimeRecipe(recipe: CanonicalRecipe): FixedRecipeJson {
  return {
    id: recipe.id,
    title: recipe.title,
    yield: recipe.yield,
    recipeCategory: recipe.recipeCategory,
    equipment: recipe.equipment,
    servings: recipe.servings,
    ingredients: recipe.ingredients.map((group) => ({
      title: group.title,
      icon: group.icon,
      items: group.items.map((item): FixedRecipeIngredientItem => ({
        name: item.name,
        canonicalName: item.canonicalName,
        shoppingKey: item.shoppingKey,
        amount: item.amount,
        unit: item.unit,
        displayAmount: item.displayAmount,
        displayUnit: item.displayUnit,
        notes: item.notes,
        preparation: item.preparation,
        isFlexible: item.isFlexible,
        isOptional: item.isOptional,
        purchasable: item.purchasable,
      })),
    })),
    phases: recipe.phases.map((phase) => ({
      id: phase.id,
      number: phase.number,
      title: phase.title,
      emoji: phase.emoji,
      steps: phase.steps.flatMap((step) => flattenCanonicalStep(step)),
    })),
  };
}

export function buildImportPreview(rawJson: string): ImportPreviewResult {
  const trimmed = rawJson.trim();
  if (!trimmed) {
    return {
      ok: false,
      mode: 'invalid',
      parsedJson: null,
      recipes: [],
      errors: ['Pega un JSON para previsualizar.'],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    return {
      ok: false,
      mode: 'invalid',
      parsedJson: null,
      recipes: [],
      errors: [error instanceof Error ? error.message : 'JSON inválido.'],
    };
  }

  if (Array.isArray(parsed)) {
    try {
      const runtimeRecipes = parseFixedRecipesJson(parsed);
      return {
        ok: true,
        mode: 'runtime-array',
        parsedJson: parsed,
        recipes: runtimeRecipes,
        errors: [],
      };
    } catch {
      const canonicalResults = parsed.map((entry) => validateCanonicalRecipe(entry));
      const errors = canonicalResults.flatMap((item, index) =>
        item.valid ? [] : item.errors.map((message) => `item[${index}]: ${message}`),
      );
      if (errors.length > 0) {
        return {
          ok: false,
          mode: 'invalid',
          parsedJson: parsed,
          recipes: [],
          errors,
        };
      }
      const canonicalRecipes = canonicalResults
        .map((item) => item.recipe)
        .filter((recipe): recipe is CanonicalRecipe => Boolean(recipe))
        .map((recipe) => canonicalToRuntimeRecipe(recipe));
      try {
        const validated = parseFixedRecipesJson(canonicalRecipes);
        return {
          ok: true,
          mode: 'canonical-array',
          parsedJson: parsed,
          recipes: validated,
          errors: [],
        };
      } catch (error) {
        return {
          ok: false,
          mode: 'invalid',
          parsedJson: parsed,
          recipes: [],
          errors: [error instanceof Error ? error.message : 'No se pudo convertir recetas canónicas.'],
        };
      }
    }
  }

  try {
    const runtimeRecipe = parseFixedRecipesJson([parsed]);
    return {
      ok: true,
      mode: 'runtime-object',
      parsedJson: parsed,
      recipes: runtimeRecipe,
      errors: [],
    };
  } catch {
    // fallback a validación canónica
  }

  const canonical = validateCanonicalRecipe(parsed);
  if (!canonical.valid || !canonical.recipe) {
    return {
      ok: false,
      mode: 'invalid',
      parsedJson: parsed,
      recipes: [],
      errors: canonical.errors,
    };
  }

  const runtimeRecipe = canonicalToRuntimeRecipe(canonical.recipe);
  try {
    const validated = parseFixedRecipesJson([runtimeRecipe]);
    return {
      ok: true,
      mode: 'canonical-object',
      parsedJson: parsed,
      recipes: validated,
      errors: [],
    };
  } catch (error) {
    return {
      ok: false,
      mode: 'invalid',
      parsedJson: parsed,
      recipes: [],
      errors: [error instanceof Error ? error.message : 'No se pudo validar la receta convertida.'],
    };
  }
}
