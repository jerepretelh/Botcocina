import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const cookerPath = '/Users/trabajo/bot/AsistenteCocina/src/app/components/ThermomixCooker.tsx';

test('ThermomixCooker composition root no longer imports heavy screen modules directly', () => {
  const source = readFileSync(cookerPath, 'utf8');

  assert.equal(source.includes("PlanRecipeSheet"), false);
  assert.equal(source.includes("RecipeSetupScreen"), false);
  assert.equal(source.includes("IngredientsScreenV2"), false);
  assert.equal(source.includes("CookingScreen"), false);
  assert.equal(source.includes("CompoundCookingScreen"), false);
  assert.equal(source.includes('useAIRecipeGeneration'), false);
  assert.equal(source.includes('libraryUi={{'), false);
  assert.equal(source.includes('planningUi={{'), false);
  assert.equal(source.includes('cookingUi={{'), false);
  assert.equal(source.includes('aiRecipeGen.'), false);
  assert.equal(source.includes('legacy'), false);
});
