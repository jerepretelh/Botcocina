import test from 'node:test';
import assert from 'node:assert/strict';

import { localRecipeV2ById } from '../../../data/recipes.v2';
import { buildRecipeJourneyViewModel } from './buildRecipeJourneyViewModel';

test('buildRecipeJourneyViewModel resolves defaults and valid setup for papas-airfryer', () => {
  const recipeV2 = localRecipeV2ById['papas-airfryer'] ?? null;
  const viewModel = buildRecipeJourneyViewModel({
    recipe: recipeV2 ? { id: recipeV2.id, name: recipeV2.name } as any : null,
    recipeV2,
    pathname: '/recetas/papas-airfryer/configurar',
    returnTo: '/recetas-globales/todas',
    presentationMode: 'sheet',
    selectedYield: null,
    selectedCookingContext: null,
    activeIngredientSelection: {},
  });

  assert.ok(viewModel);
  assert.equal(viewModel?.definition.id, 'papas-airfryer');
  assert.equal(viewModel?.canContinue, true);
  assert.equal(viewModel?.effectiveSelectedCookingContext?.selectedContainerKey, 'basket-medium');
});

test('buildRecipeJourneyViewModel resolves defaults and valid setup for pan-palta-huevo', () => {
  const recipeV2 = localRecipeV2ById['pan-palta-huevo'] ?? null;
  const viewModel = buildRecipeJourneyViewModel({
    recipe: recipeV2 ? { id: recipeV2.id, name: recipeV2.name } as any : null,
    recipeV2,
    pathname: '/recetas/pan-palta-huevo/configurar',
    returnTo: '/recetas-globales/todas',
    presentationMode: 'sheet',
    selectedYield: null,
    selectedCookingContext: null,
    activeIngredientSelection: {},
  });

  assert.ok(viewModel);
  assert.equal(viewModel?.definition.id, 'pan-palta-huevo');
  assert.equal(viewModel?.journeyState.currentStage, 'setup');
  assert.equal(viewModel?.canContinue, true);
  assert.equal(viewModel?.effectiveSelectedYield?.value, 2);
  assert.equal(viewModel?.effectiveSelectedCookingContext, null);
});

test('buildRecipeJourneyViewModel resolves defaults and valid setup for quinua-desayuno', () => {
  const recipeV2 = localRecipeV2ById['quinua-desayuno'] ?? null;
  const viewModel = buildRecipeJourneyViewModel({
    recipe: recipeV2 ? { id: recipeV2.id, name: recipeV2.name } as any : null,
    recipeV2,
    pathname: '/recetas/quinua-desayuno/configurar',
    returnTo: '/recetas-globales/todas',
    presentationMode: 'sheet',
    selectedYield: null,
    selectedCookingContext: null,
    activeIngredientSelection: {},
  });

  assert.ok(viewModel);
  assert.equal(viewModel?.definition.id, 'quinua-desayuno');
  assert.equal(viewModel?.journeyState.currentStage, 'setup');
  assert.equal(viewModel?.canContinue, true);
  assert.equal(viewModel?.effectiveSelectedYield?.value, 2);
  assert.equal(viewModel?.effectiveSelectedCookingContext, null);
});

test('buildRecipeJourneyViewModel resolves defaults and valid setup for huevo-sancochado', () => {
  const recipeV2 = localRecipeV2ById['huevo-sancochado'] ?? null;
  const viewModel = buildRecipeJourneyViewModel({
    recipe: recipeV2 ? { id: recipeV2.id, name: recipeV2.name } as any : null,
    recipeV2,
    pathname: '/recetas/huevo-sancochado/configurar',
    returnTo: '/recetas-globales/todas',
    presentationMode: 'sheet',
    selectedYield: null,
    selectedCookingContext: null,
    activeIngredientSelection: {},
  });

  assert.ok(viewModel);
  assert.equal(viewModel?.definition.id, 'huevo-sancochado');
  assert.equal(viewModel?.journeyState.currentStage, 'setup');
  assert.equal(viewModel?.canContinue, true);
  assert.equal(viewModel?.effectiveSelectedYield?.value, 4);
  assert.equal(viewModel?.effectiveSelectedCookingContext, null);
});

test('buildRecipeJourneyViewModel resolves defaults and valid setup for lomo-saltado-casero', () => {
  const recipeV2 = localRecipeV2ById['lomo-saltado-casero'] ?? null;
  const viewModel = buildRecipeJourneyViewModel({
    recipe: recipeV2 ? { id: recipeV2.id, name: recipeV2.name } as any : null,
    recipeV2,
    pathname: '/recetas/lomo-saltado-casero/configurar',
    returnTo: '/recetas-globales/todas',
    presentationMode: 'sheet',
    selectedYield: null,
    selectedCookingContext: null,
    activeIngredientSelection: {},
  });

  assert.ok(viewModel);
  assert.equal(viewModel?.definition.id, 'lomo-saltado-casero');
  assert.equal(viewModel?.journeyState.currentStage, 'setup');
  assert.equal(viewModel?.canContinue, true);
  assert.equal(viewModel?.effectiveSelectedYield?.value, 2);
  assert.equal(viewModel?.effectiveSelectedCookingContext, null);
});

test('buildRecipeJourneyViewModel resolves defaults and valid setup for sopa-verduras', () => {
  const recipeV2 = localRecipeV2ById['sopa-verduras'] ?? null;
  const viewModel = buildRecipeJourneyViewModel({
    recipe: recipeV2 ? { id: recipeV2.id, name: recipeV2.name } as any : null,
    recipeV2,
    pathname: '/recetas/sopa-verduras/configurar',
    returnTo: '/recetas-globales/todas',
    presentationMode: 'sheet',
    selectedYield: null,
    selectedCookingContext: null,
    activeIngredientSelection: {},
  });

  assert.ok(viewModel);
  assert.equal(viewModel?.definition.id, 'sopa-verduras');
  assert.equal(viewModel?.journeyState.currentStage, 'setup');
  assert.equal(viewModel?.canContinue, true);
  assert.equal(viewModel?.effectiveSelectedYield?.value, 800);
  assert.equal(viewModel?.effectiveSelectedYield?.type, 'weight');
  assert.equal(viewModel?.effectiveSelectedCookingContext, null);
});

test('buildRecipeJourneyViewModel resolves defaults and valid setup for tallarines-rojos-compuesto', () => {
  const recipeV2 = localRecipeV2ById['tallarines-rojos-compuesto'] ?? null;
  const viewModel = buildRecipeJourneyViewModel({
    recipe: recipeV2 ? { id: recipeV2.id, name: recipeV2.name } as any : null,
    recipeV2,
    pathname: '/recetas/tallarines-rojos-compuesto/configurar',
    returnTo: '/recetas-globales/todas',
    presentationMode: 'sheet',
    selectedYield: null,
    selectedCookingContext: null,
    activeIngredientSelection: {},
  });

  assert.ok(viewModel);
  assert.equal(viewModel?.definition.id, 'tallarines-rojos-compuesto');
  assert.equal(viewModel?.journeyState.currentStage, 'setup');
  assert.equal(viewModel?.canContinue, true);
  assert.equal(viewModel?.effectiveSelectedYield?.value, 4);
  assert.equal(viewModel?.effectiveSelectedCookingContext, null);
});

test('buildRecipeJourneyViewModel resolves defaults and valid setup for arroz', () => {
  const recipeV2 = localRecipeV2ById.arroz ?? null;
  const viewModel = buildRecipeJourneyViewModel({
    recipe: recipeV2 ? { id: recipeV2.id, name: recipeV2.name } as any : null,
    recipeV2,
    pathname: '/recetas/arroz/configurar',
    returnTo: '/recetas-globales/todas',
    presentationMode: 'sheet',
    selectedYield: null,
    selectedCookingContext: null,
    activeIngredientSelection: {},
  });

  assert.ok(viewModel);
  assert.equal(viewModel?.definition.id, 'arroz');
  assert.equal(viewModel?.journeyState.currentStage, 'setup');
  assert.equal(viewModel?.canContinue, true);
  assert.equal(viewModel?.effectiveSelectedYield?.type, 'volume');
  assert.equal(viewModel?.effectiveSelectedYield?.visibleUnit, 'taza');
  assert.equal(viewModel?.effectiveSelectedCookingContext, null);
});

test('buildRecipeJourneyViewModel returns null for invalid recipe route pairing', () => {
  const recipeV2 = localRecipeV2ById['keke-platano-molde'] ?? null;
  const viewModel = buildRecipeJourneyViewModel({
    recipe: recipeV2 ? { id: recipeV2.id, name: recipeV2.name } as any : null,
    recipeV2,
    pathname: '/recetas/papas-airfryer/configurar',
    returnTo: '/recetas-globales/todas',
    presentationMode: 'sheet',
    selectedYield: null,
    selectedCookingContext: null,
    activeIngredientSelection: {},
  });

  assert.equal(viewModel, null);
});
