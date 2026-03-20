import type { Portion, Recipe, RecipeContent } from '../src/types';
import { buildPublicationCatalog } from './catalogPublication';

export type CatalogValidationLevel = 'error' | 'warning';

export interface CatalogValidationIssue {
  level: CatalogValidationLevel;
  code: string;
  recipeId?: string;
  message: string;
}

export interface CatalogValidationResult {
  ok: boolean;
  errors: CatalogValidationIssue[];
  warnings: CatalogValidationIssue[];
  summary: {
    categories: number;
    recipes: number;
    contents: number;
    ingredients: number;
    substeps: number;
  };
}

const PORTIONS: Portion[] = [1, 2, 4];
const CONTINUE_TOKENS = new Set(['continuar', 'siguiente', 'ok', 'listo', '-', 'n/a', 'na', '']);

function normalized(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function isEffectivelyEmpty(value: unknown): boolean {
  return normalized(value).length === 0;
}

function isContinueToken(value: unknown): boolean {
  return CONTINUE_TOKENS.has(normalized(value));
}

function validateRecipeShape(recipe: Recipe, content: RecipeContent | undefined, categoryIds: Set<string>, issues: CatalogValidationIssue[]) {
  if (!categoryIds.has(recipe.categoryId)) {
    issues.push({
      level: 'error',
      code: 'recipe.category.missing',
      recipeId: recipe.id,
      message: `La receta "${recipe.name}" usa categoryId "${recipe.categoryId}" inexistente.`,
    });
  }

  if (!content) {
    issues.push({
      level: 'error',
      code: 'recipe.content.missing',
      recipeId: recipe.id,
      message: `La receta "${recipe.name}" no tiene contenido en initialRecipeContent.`,
    });
    return;
  }

  if (!Array.isArray(content.ingredients) || content.ingredients.length === 0) {
    issues.push({
      level: 'error',
      code: 'recipe.ingredients.empty',
      recipeId: recipe.id,
      message: `La receta "${recipe.name}" no tiene ingredientes.`,
    });
  }

  if (!Array.isArray(content.steps) || content.steps.length === 0) {
    issues.push({
      level: 'error',
      code: 'recipe.steps.empty',
      recipeId: recipe.id,
      message: `La receta "${recipe.name}" no tiene subpasos.`,
    });
  }

  for (const ingredient of content.ingredients) {
    for (const portion of PORTIONS) {
      const value = ingredient.portions[portion];
      if (isEffectivelyEmpty(value)) {
        issues.push({
          level: 'error',
          code: 'ingredient.portion.empty',
          recipeId: recipe.id,
          message: `Ingrediente "${ingredient.name}" sin valor de porción p${portion}.`,
        });
      }
    }
  }

  content.steps.forEach((step) => {
    if (!Array.isArray(step.subSteps) || step.subSteps.length === 0) {
      issues.push({
        level: 'error',
        code: 'step.substeps.empty',
        recipeId: recipe.id,
        message: `Paso "${step.stepName}" sin subpasos.`,
      });
      return;
    }

    step.subSteps.forEach((subStep, substepIndex) => {
      if (isEffectivelyEmpty(subStep.subStepName)) {
        issues.push({
          level: 'error',
          code: 'substep.name.empty',
          recipeId: recipe.id,
          message: `Subpaso vacío en paso "${step.stepName}" (#${substepIndex + 1}).`,
        });
      }

      for (const portion of PORTIONS) {
        const value = subStep.portions[portion];
        if (subStep.isTimer) {
          const numeric = Number(value);
          if (!Number.isFinite(numeric) || numeric <= 0) {
            issues.push({
              level: 'error',
              code: 'substep.timer.invalid',
              recipeId: recipe.id,
              message: `Timer inválido en "${subStep.subStepName}" para p${portion}.`,
            });
          }
        } else if (isEffectivelyEmpty(value)) {
          issues.push({
            level: 'error',
            code: 'substep.portion.empty',
            recipeId: recipe.id,
            message: `Subpaso "${subStep.subStepName}" sin porción p${portion}.`,
          });
        }
      }

      if (normalized(subStep.notes).startsWith('cantidad:')) {
        const hasRealQuantity = PORTIONS.some((portion) => !isContinueToken(subStep.portions[portion]));
        if (!hasRealQuantity) {
          issues.push({
            level: 'warning',
            code: 'substep.quantity.missing',
            recipeId: recipe.id,
            message: `Subpaso "${subStep.subStepName}" indica "Cantidad:" pero no tiene valor real de cantidad.`,
          });
        }
      }
    });
  });
}

export function validateCatalogData(): CatalogValidationResult {
  const publicationCatalog = buildPublicationCatalog();
  const issues: CatalogValidationIssue[] = [];
  const categoryIds = new Set(publicationCatalog.categories.map((category) => category.id));
  const recipeIds = new Set(publicationCatalog.entries.map(({ recipe }) => recipe.id));
  const contentsByRecipeId = Object.fromEntries(publicationCatalog.entries.map(({ recipe, content }) => [recipe.id, content]));

  for (const { recipe, content } of publicationCatalog.entries) {
    validateRecipeShape(recipe, content, categoryIds, issues);
  }

  Object.keys(contentsByRecipeId).forEach((contentRecipeId) => {
    if (!recipeIds.has(contentRecipeId)) {
      issues.push({
        level: 'warning',
        code: 'content.orphan',
        recipeId: contentRecipeId,
        message: `El catálogo publicado contiene "${contentRecipeId}" sin entrada en recipes[].`,
      });
    }
  });

  let ingredients = 0;
  let substeps = 0;
  Object.values(contentsByRecipeId).forEach((content) => {
    ingredients += content.ingredients.length;
    substeps += content.steps.reduce((sum, step) => sum + step.subSteps.length, 0);
  });

  const errors = issues.filter((issue) => issue.level === 'error');
  const warnings = issues.filter((issue) => issue.level === 'warning');

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    summary: {
      categories: publicationCatalog.categories.length,
      recipes: publicationCatalog.entries.length,
      contents: Object.keys(contentsByRecipeId).length,
      ingredients,
      substeps,
    },
  };
}

export function printCatalogValidation(result: CatalogValidationResult): void {
  console.log(
    `[catalog] categorías=${result.summary.categories} recetas=${result.summary.recipes} contenidos=${result.summary.contents} ingredientes=${result.summary.ingredients} subpasos=${result.summary.substeps}`,
  );

  if (result.errors.length === 0 && result.warnings.length === 0) {
    console.log('[catalog] validación ok: sin observaciones');
    return;
  }

  for (const issue of [...result.errors, ...result.warnings]) {
    const prefix = issue.level === 'error' ? 'ERROR' : 'WARN';
    const scope = issue.recipeId ? ` [${issue.recipeId}]` : '';
    console.log(`[catalog] ${prefix}${scope} ${issue.code}: ${issue.message}`);
  }

  if (result.errors.length > 0) {
    console.log(`[catalog] errores=${result.errors.length}, warnings=${result.warnings.length}`);
  } else {
    console.log(`[catalog] warnings=${result.warnings.length}`);
  }
}
