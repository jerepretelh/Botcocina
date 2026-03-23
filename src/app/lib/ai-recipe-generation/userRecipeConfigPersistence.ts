import type { PreparedGeneratedAIRecipe } from './preparedRecipeRuntime';
import type { PersistClient } from './persistenceShared';
import { isMissingRecipeV2ColumnError, isMissingUserRecipeConfigsTableError } from './persistenceShared';

export async function persistUserRecipeConfig(args: {
  client: PersistClient;
  aiUserId: string;
  recipeId: string;
  initialConfig: PreparedGeneratedAIRecipe['initialConfig'];
  disableUserRecipeConfigsForSession: () => void;
}): Promise<void> {
  const { error: configError } = await args.client.from('user_recipe_cooking_configs').upsert(
    {
      user_id: args.aiUserId,
      recipe_id: args.recipeId,
      quantity_mode: args.initialConfig.quantityMode,
      people_count: args.initialConfig.peopleCount,
      amount_unit: args.initialConfig.amountUnit,
      available_count: args.initialConfig.availableCount,
      target_yield: args.initialConfig.targetYield ?? null,
      selected_optional_ingredients: args.initialConfig.selectedOptionalIngredients,
      source_context_summary: args.initialConfig.sourceContextSummary,
      last_used_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,recipe_id' },
  );
  if (!configError) return;

  if (isMissingRecipeV2ColumnError(configError)) {
    const legacyConfig = await args.client.from('user_recipe_cooking_configs').upsert(
      {
        user_id: args.aiUserId,
        recipe_id: args.recipeId,
        quantity_mode: args.initialConfig.quantityMode,
        people_count: args.initialConfig.peopleCount,
        amount_unit: args.initialConfig.amountUnit,
        available_count: args.initialConfig.availableCount,
        selected_optional_ingredients: args.initialConfig.selectedOptionalIngredients,
        source_context_summary: args.initialConfig.sourceContextSummary,
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,recipe_id' },
    );
    if (legacyConfig.error) {
      throw legacyConfig.error;
    }
    return;
  }

  if (isMissingUserRecipeConfigsTableError(configError)) {
    args.disableUserRecipeConfigsForSession();
    return;
  }

  throw configError;
}
