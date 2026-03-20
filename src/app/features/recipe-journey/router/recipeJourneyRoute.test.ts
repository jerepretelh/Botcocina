import test from 'node:test';
import assert from 'node:assert/strict';

import { buildRecipeJourneyPath, parseRecipeJourneyRoute } from './recipeJourneyRoute';

test('buildRecipeJourneyPath serializes setup and ingredients using legacy path aliases', () => {
  assert.equal(buildRecipeJourneyPath('keke-platano-molde', 'setup'), '/recetas/keke-platano-molde/configurar');
  assert.equal(buildRecipeJourneyPath('keke-platano-molde', 'ingredients'), '/recetas/keke-platano-molde/ingredientes');
  assert.equal(buildRecipeJourneyPath('keke-platano-molde', 'cook'), '/recetas/keke-platano-molde/cocinar');
});

test('parseRecipeJourneyRoute resolves a valid setup route', () => {
  assert.deepEqual(parseRecipeJourneyRoute('/recetas/keke-platano-molde/configurar'), {
    recipeId: 'keke-platano-molde',
    stage: 'setup',
    pathname: '/recetas/keke-platano-molde/configurar',
    isValid: true,
  });
});

test('parseRecipeJourneyRoute resolves a valid ingredients route with trailing slash', () => {
  assert.deepEqual(parseRecipeJourneyRoute('/recetas/keke-platano-molde/ingredientes/'), {
    recipeId: 'keke-platano-molde',
    stage: 'ingredients',
    pathname: '/recetas/keke-platano-molde/ingredientes',
    isValid: true,
  });
});

test('parseRecipeJourneyRoute rejects unrelated routes', () => {
  assert.deepEqual(parseRecipeJourneyRoute('/recetas-globales/todas'), {
    recipeId: null,
    stage: null,
    pathname: '/recetas-globales/todas',
    isValid: false,
  });
});
