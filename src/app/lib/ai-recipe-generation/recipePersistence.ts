import type { Recipe, RecipeContent } from '../../types';
import type { CanonicalRecipeV2 } from '../recipe-v2/canonicalRecipeV2';
import { buildRecipeV2PersistenceShape } from '../recipeV2';
import type { PersistClient } from './persistenceShared';
import { isMissingRecipeV2ColumnError } from './persistenceShared';

export async function persistRecipeRecord(args: {
  client: PersistClient;
  recipe: Recipe;
  content: RecipeContent;
  recipeV2: CanonicalRecipeV2;
  aiUserId: string;
  canUseCompoundRecipes: boolean;
}): Promise<void> {
  const recipePayload = {
    id: args.recipe.id,
    category_id: args.recipe.categoryId,
    name: args.recipe.name,
    icon: args.recipe.icon,
    emoji: args.recipe.emoji ?? args.recipe.icon,
    ingredient: args.recipe.ingredient,
    description: args.recipe.description,
    equipment: args.recipe.equipment ?? null,
    tip: args.content.tip,
    portion_label_singular: args.content.portionLabels.singular,
    portion_label_plural: args.content.portionLabels.plural,
    source: 'ai',
    owner_user_id: args.aiUserId,
    visibility: 'private',
    is_published: false,
    ...buildRecipeV2PersistenceShape(args.recipeV2),
    ...(args.canUseCompoundRecipes
      ? {
        experience: args.recipe.experience ?? 'standard',
        compound_meta: args.content.compoundMeta ?? null,
      }
      : {}),
    updated_at: new Date().toISOString(),
  };
  const recipeUpsert = await args.client.from('recipes').upsert(recipePayload, { onConflict: 'id' });
  if (recipeUpsert.error && isMissingRecipeV2ColumnError(recipeUpsert.error)) {
    const legacyRecipePayload = {
      id: args.recipe.id,
      category_id: args.recipe.categoryId,
      name: args.recipe.name,
      icon: args.recipe.icon,
      emoji: args.recipe.emoji ?? args.recipe.icon,
      ingredient: args.recipe.ingredient,
      description: args.recipe.description,
      equipment: args.recipe.equipment ?? null,
      tip: args.content.tip,
      portion_label_singular: args.content.portionLabels.singular,
      portion_label_plural: args.content.portionLabels.plural,
      source: 'ai',
      owner_user_id: args.aiUserId,
      visibility: 'private',
      is_published: false,
      ...(args.canUseCompoundRecipes
        ? {
          experience: args.recipe.experience ?? 'standard',
          compound_meta: args.content.compoundMeta ?? null,
        }
        : {}),
      updated_at: new Date().toISOString(),
    };
    const legacyRecipeUpsert = await args.client.from('recipes').upsert(legacyRecipePayload, { onConflict: 'id' });
    if (legacyRecipeUpsert.error) {
      throw legacyRecipeUpsert.error;
    }
    return;
  }
  if (recipeUpsert.error) {
    throw recipeUpsert.error;
  }
}

export async function persistRecipeIngredientsAndSubsteps(args: {
  client: PersistClient;
  recipe: Recipe;
  content: RecipeContent;
}): Promise<void> {
  await args.client.from('recipe_ingredients').delete().eq('recipe_id', args.recipe.id);
  await args.client.from('recipe_substeps').delete().eq('recipe_id', args.recipe.id);

  const ingredientsPayload = args.content.ingredients.map((ingredient, index) => ({
    recipe_id: args.recipe.id,
    sort_order: index + 1,
    name: ingredient.name,
    emoji: ingredient.emoji || '🍽️',
    indispensable: Boolean(ingredient.indispensable),
    p1: ingredient.portions[1] || 'Al gusto',
    p2: ingredient.portions[2] || ingredient.portions[1] || 'Al gusto',
    p4: ingredient.portions[4] || ingredient.portions[2] || ingredient.portions[1] || 'Al gusto',
  }));
  if (ingredientsPayload.length > 0) {
    await args.client.from('recipe_ingredients').insert(ingredientsPayload);
  }

  const substepsPayload = args.content.steps.flatMap((step) =>
    step.subSteps.map((subStep, index) => {
      const p1 = subStep.portions[1];
      const p2 = subStep.portions[2];
      const p4 = subStep.portions[4];
      return {
        recipe_id: args.recipe.id,
        substep_order: step.stepNumber * 100 + index + 1,
        step_number: step.stepNumber,
        step_name: step.stepName,
        substep_name: subStep.subStepName,
        notes: subStep.notes || '',
        is_timer: subStep.isTimer,
        p1: String(p1 ?? (subStep.isTimer ? 30 : 'Continuar')),
        p2: String(p2 ?? p1 ?? (subStep.isTimer ? 45 : 'Continuar')),
        p4: String(p4 ?? p2 ?? p1 ?? (subStep.isTimer ? 60 : 'Continuar')),
        fire_level: step.fireLevel ?? null,
        equipment: step.equipment ?? null,
        updated_at: new Date().toISOString(),
      };
    }),
  );
  if (substepsPayload.length > 0) {
    await args.client.from('recipe_substeps').insert(substepsPayload);
  }
}
