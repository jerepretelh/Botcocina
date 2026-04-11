import type { FixedRecipeJson } from './types';

export interface FixedRecipeGuidelineIssue {
  recipeId: string;
  message: string;
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function isAddAction(text: string): boolean {
  return /\b(agregar|anadir|añadir|incorporar|sumar)\b/i.test(normalizeText(text));
}

function isPreparationTitle(text: string): boolean {
  return /\b(preparacion|mise en place)\b/i.test(normalizeText(text));
}

function isFinalTitle(text: string): boolean {
  return /\b(final|armado|servir|emplatar)\b/i.test(normalizeText(text));
}

function hasValidStructuredIngredients(step: FixedRecipeJson['phases'][number]['steps'][number]): boolean {
  if (!Array.isArray(step.ingredients) || step.ingredients.length === 0) return false;
  return step.ingredients.every((ingredient) => {
    if (!ingredient || typeof ingredient !== 'object') return false;
    if (typeof ingredient.name !== 'string' || !ingredient.name.trim()) return false;
    const amount = ingredient.amount;
    const amountIsValid = (typeof amount === 'number' && Number.isFinite(amount) && amount > 0)
      || (typeof amount === 'string' && amount.trim().length > 0);
    if (!amountIsValid) return false;
    if (typeof ingredient.unit !== 'string' || !ingredient.unit.trim()) return false;
    return true;
  });
}

export function validateRecipeGuidelines(recipe: FixedRecipeJson): FixedRecipeGuidelineIssue[] {
  const issues: FixedRecipeGuidelineIssue[] = [];

  const firstPhase = recipe.phases[0];
  if (!firstPhase || !isPreparationTitle(firstPhase.title)) {
    issues.push({
      recipeId: recipe.id,
      message: 'Se recomienda que la primera fase sea de preparación (mise en place).',
    });
  }

  if (firstPhase) {
    const prepWithTimers = firstPhase.steps.some((step) => typeof step.timer === 'number' && step.timer > 0);
    if (prepWithTimers) {
      issues.push({
        recipeId: recipe.id,
        message: 'La fase de preparación no debería incluir timers.',
      });
    }
  }

  let resultStepCount = 0;
  recipe.phases.forEach((phase) => {
    phase.steps.forEach((step) => {
      if (step.type === 'result') {
        resultStepCount += 1;
      }
      if (isAddAction(step.text) && !hasValidStructuredIngredients(step)) {
        issues.push({
          recipeId: recipe.id,
          message: `Paso de agregado sin ingredients estructurado válido: "${step.text}".`,
        });
      }
    });
  });

  if (resultStepCount === 0) {
    issues.push({
      recipeId: recipe.id,
      message: 'Se recomienda incluir pasos de resultado esperado para validación visual.',
    });
  }

  const hasFinalPhase = recipe.phases.some((phase) => isFinalTitle(phase.title));
  if (!hasFinalPhase) {
    issues.push({
      recipeId: recipe.id,
      message: 'Se recomienda incluir fase de final/armado/servido.',
    });
  }

  return issues;
}

export function validateRecipesGuidelines(recipes: FixedRecipeJson[]): FixedRecipeGuidelineIssue[] {
  return recipes.flatMap((recipe) => validateRecipeGuidelines(recipe));
}
