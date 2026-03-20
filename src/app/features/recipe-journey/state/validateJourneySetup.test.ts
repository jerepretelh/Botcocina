import test from 'node:test';
import assert from 'node:assert/strict';

import { localRecipeV2ById } from '../../../data/recipes.v2';
import { resolveUnifiedRecipeDefinition } from '../definition/resolveUnifiedRecipeDefinition';
import { validateJourneySetup } from './validateJourneySetup';

test('validateJourneySetup accepts keke setup with yield only', () => {
  const definition = resolveUnifiedRecipeDefinition({
    recipeV2: localRecipeV2ById['keke-platano-molde'] ?? null,
  });

  assert.ok(definition);
  assert.equal(
    validateJourneySetup(
      definition,
      localRecipeV2ById['keke-platano-molde']?.baseYield ?? null,
      null,
    ),
    true,
  );
});

test('validateJourneySetup requires cookingContext for papas-airfryer', () => {
  const recipe = localRecipeV2ById['papas-airfryer'] ?? null;
  const definition = resolveUnifiedRecipeDefinition({ recipeV2: recipe });

  assert.ok(recipe);
  assert.ok(definition);
  assert.equal(
    validateJourneySetup(definition, recipe.baseYield, null),
    false,
  );
  assert.equal(
    validateJourneySetup(
      definition,
      recipe.baseYield,
      recipe.cookingContextDefaults ?? null,
    ),
    true,
  );
});
