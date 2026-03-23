import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isHydrationSensitiveAppPath,
  normalizeAppPath,
  resolveStaticScreenForPath,
  resolveTargetPathFromState,
} from './routeSync';

test('normalizeAppPath removes trailing slashes and preserves root', () => {
  assert.equal(normalizeAppPath('/favoritos/'), '/favoritos');
  assert.equal(normalizeAppPath('/'), '/');
});

test('isHydrationSensitiveAppPath identifies category and recipe stage routes', () => {
  assert.equal(isHydrationSensitiveAppPath('/categorias/desayunos'), true);
  assert.equal(isHydrationSensitiveAppPath('/recetas/arroz/configurar'), true);
  assert.equal(isHydrationSensitiveAppPath('/favoritos'), false);
});

test('resolveStaticScreenForPath maps known static routes', () => {
  assert.equal(resolveStaticScreenForPath('/compras'), 'shopping-list');
  assert.equal(resolveStaticScreenForPath('/ajustes/ia'), 'ai-settings');
  assert.equal(resolveStaticScreenForPath('/ruta-desconocida'), null);
});

test('resolveTargetPathFromState keeps pinned overlay routes when sheets are open', () => {
  assert.equal(
    resolveTargetPathFromState({
      screen: 'recipe-select',
      recipeId: 'arroz',
      selectedCategory: null,
      isRecipeSetupSheetOpen: true,
      isIngredientsSheetOpen: false,
      recipeOverlayPinnedPath: '/recetas/arroz/configurar',
    }),
    '/recetas/arroz/configurar',
  );
});

test('resolveTargetPathFromState maps static screens without going through overlay logic', () => {
  assert.equal(
    resolveTargetPathFromState({
      screen: 'shopping-list',
      recipeId: null,
      selectedCategory: null,
      isRecipeSetupSheetOpen: false,
      isIngredientsSheetOpen: false,
      recipeOverlayPinnedPath: null,
    }),
    '/compras',
  );
});

