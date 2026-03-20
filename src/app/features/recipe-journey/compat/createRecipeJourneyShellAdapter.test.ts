import test from 'node:test';
import assert from 'node:assert/strict';

import { createRecipeJourneyShellAdapter } from './createRecipeJourneyShellAdapter';

test('createRecipeJourneyShellAdapter navigates stages using the current recipe id', () => {
  let navigatedTo: string | null = null;

  const adapter = createRecipeJourneyShellAdapter({
    recipe: { id: 'keke-platano-molde', name: 'Keke de plátano' } as any,
    recipeV2: null,
    scaledRecipe: null,
    pathname: '/recetas/keke-platano-molde/configurar',
    returnTo: '/recetas-globales/todas',
    presentationMode: 'sheet',
    selectedYield: null,
    selectedCookingContext: null,
    activeIngredientSelection: {},
    onSelectedYieldChange: () => undefined,
    onSelectedCookingContextChange: () => undefined,
    onDecrement: () => undefined,
    onIncrement: () => undefined,
    onIngredientToggle: () => undefined,
    navigate: (path) => {
      navigatedTo = path;
    },
    onClose: () => undefined,
    onEnterCooking: () => undefined,
  });

  adapter.onNavigateStage('ingredients');
  assert.equal(navigatedTo, '/recetas/keke-platano-molde/ingredientes');
});
