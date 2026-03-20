import type { RecipeV2 } from '../../../../types/recipe-v2';
import type { RecipeSetupFieldDefinition, UnifiedRecipeDefinition } from '../../types';

export function fromRecipeV2(recipe: RecipeV2): UnifiedRecipeDefinition {
  const supportsCookingContext = Boolean(
    recipe.cookingContextDefaults
      || recipe.steps.some((step) => step.equipment === 'airfryer'),
  );
  const supportsOptionalIngredients = recipe.ingredients.some((ingredient) => ingredient.indispensable === false);
  const setupFields: RecipeSetupFieldDefinition[] = [
    { id: 'yield', kind: 'yield', required: true },
  ];

  if (supportsCookingContext) {
    setupFields.push({
      id: 'cooking_context',
      kind: 'cooking_context',
      required: true,
      defaultValue: recipe.cookingContextDefaults ?? null,
    });
  }

  return {
    id: recipe.id,
    name: recipe.name,
    flowType: recipe.experience === 'compound' ? 'compound' : 'standard',
    yield: {
      base: recipe.baseYield,
      scalingModel: recipe.scalingModel,
    },
    setup: {
      fields: setupFields,
      defaults: {
        yield: recipe.baseYield,
        cookingContext: recipe.cookingContextDefaults ?? null,
      },
    },
    ingredients: {
      allowOptionalSelection: supportsOptionalIngredients,
    },
    cook: {
      supportsResume: true,
    },
    capabilities: {
      supportsCookingContext,
      supportsOptionalIngredients,
    },
    presentationHints: {
      preferredPresentationMode: 'sheet',
    },
    sourceRecipeV2: recipe,
  };
}
