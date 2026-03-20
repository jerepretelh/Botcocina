import test from 'node:test';
import assert from 'node:assert/strict';

import { localRecipeV2ById } from '../../../data/recipes.v2';
import { resolveUnifiedRecipeDefinition } from './resolveUnifiedRecipeDefinition';

test('resolveUnifiedRecipeDefinition maps keke-platano-molde to a standard unified definition', () => {
  const definition = resolveUnifiedRecipeDefinition({
    recipeV2: localRecipeV2ById['keke-platano-molde'] ?? null,
  });

  assert.ok(definition);
  assert.equal(definition?.id, 'keke-platano-molde');
  assert.equal(definition?.flowType, 'standard');
  assert.equal(definition?.yield.scalingModel, 'container_bound');
  assert.deepEqual(definition?.setup.fields.map((field) => field.kind), ['yield']);
  assert.equal(definition?.capabilities.supportsCookingContext, false);
  assert.equal(definition?.ingredients.allowOptionalSelection, false);
});

test('resolveUnifiedRecipeDefinition maps papas-airfryer with required cookingContext in setup', () => {
  const definition = resolveUnifiedRecipeDefinition({
    recipeV2: localRecipeV2ById['papas-airfryer'] ?? null,
  });

  assert.ok(definition);
  assert.equal(definition?.id, 'papas-airfryer');
  assert.equal(definition?.flowType, 'standard');
  assert.deepEqual(definition?.setup.fields.map((field) => field.kind), ['yield', 'cooking_context']);
  assert.equal(definition?.capabilities.supportsCookingContext, true);
  assert.ok(definition?.setup.defaults?.cookingContext);
});

test('resolveUnifiedRecipeDefinition maps pan-palta-huevo with allowOptionalSelection enabled in the current journey contract', () => {
  const definition = resolveUnifiedRecipeDefinition({
    recipeV2: localRecipeV2ById['pan-palta-huevo'] ?? null,
  });

  assert.ok(definition);
  assert.equal(definition?.id, 'pan-palta-huevo');
  assert.equal(definition?.flowType, 'standard');
  assert.deepEqual(definition?.setup.fields.map((field) => field.kind), ['yield']);
  assert.equal(definition?.capabilities.supportsCookingContext, false);
  assert.equal(definition?.capabilities.supportsOptionalIngredients, true);
  assert.equal(definition?.ingredients.allowOptionalSelection, true);
  assert.equal(definition?.presentationHints.preferredPresentationMode, 'sheet');
});

test('resolveUnifiedRecipeDefinition maps quinua-desayuno with allowOptionalSelection enabled in the current journey contract', () => {
  const definition = resolveUnifiedRecipeDefinition({
    recipeV2: localRecipeV2ById['quinua-desayuno'] ?? null,
  });

  assert.ok(definition);
  assert.equal(definition?.id, 'quinua-desayuno');
  assert.equal(definition?.flowType, 'standard');
  assert.deepEqual(definition?.setup.fields.map((field) => field.kind), ['yield']);
  assert.equal(definition?.capabilities.supportsCookingContext, false);
  assert.equal(definition?.capabilities.supportsOptionalIngredients, true);
  assert.equal(definition?.ingredients.allowOptionalSelection, true);
  assert.equal(definition?.presentationHints.preferredPresentationMode, 'sheet');
});

test('resolveUnifiedRecipeDefinition maps huevo-sancochado to the current standard journey contract', () => {
  const definition = resolveUnifiedRecipeDefinition({
    recipeV2: localRecipeV2ById['huevo-sancochado'] ?? null,
  });

  assert.ok(definition);
  assert.equal(definition?.id, 'huevo-sancochado');
  assert.equal(definition?.flowType, 'standard');
  assert.deepEqual(definition?.setup.fields.map((field) => field.kind), ['yield']);
  assert.equal(definition?.capabilities.supportsCookingContext, false);
  assert.equal(definition?.ingredients.allowOptionalSelection, true);
  assert.equal(definition?.presentationHints.preferredPresentationMode, 'sheet');
});

test('resolveUnifiedRecipeDefinition maps lomo-saltado-casero to the current standard journey contract', () => {
  const definition = resolveUnifiedRecipeDefinition({
    recipeV2: localRecipeV2ById['lomo-saltado-casero'] ?? null,
  });

  assert.ok(definition);
  assert.equal(definition?.id, 'lomo-saltado-casero');
  assert.equal(definition?.flowType, 'standard');
  assert.equal(definition?.yield.scalingModel, localRecipeV2ById['lomo-saltado-casero']?.scalingModel);
  assert.deepEqual(definition?.setup.fields.map((field) => field.kind), ['yield']);
  assert.equal(definition?.capabilities.supportsCookingContext, false);
  assert.equal(definition?.ingredients.allowOptionalSelection, true);
  assert.equal(definition?.presentationHints.preferredPresentationMode, 'sheet');
});

test('resolveUnifiedRecipeDefinition maps sopa-verduras to the current standard journey contract', () => {
  const definition = resolveUnifiedRecipeDefinition({
    recipeV2: localRecipeV2ById['sopa-verduras'] ?? null,
  });

  assert.ok(definition);
  assert.equal(definition?.id, 'sopa-verduras');
  assert.equal(definition?.flowType, 'standard');
  assert.equal(definition?.yield.scalingModel, localRecipeV2ById['sopa-verduras']?.scalingModel);
  assert.deepEqual(definition?.setup.fields.map((field) => field.kind), ['yield']);
  assert.equal(definition?.capabilities.supportsCookingContext, false);
  assert.equal(definition?.ingredients.allowOptionalSelection, true);
  assert.equal(definition?.presentationHints.preferredPresentationMode, 'sheet');
});

test('resolveUnifiedRecipeDefinition maps arroz with base_ingredient scalingModel', () => {
  const definition = resolveUnifiedRecipeDefinition({
    recipeV2: localRecipeV2ById.arroz ?? null,
  });

  assert.ok(definition);
  assert.equal(definition?.id, 'arroz');
  assert.equal(definition?.flowType, 'standard');
  assert.equal(definition?.yield.scalingModel, 'base_ingredient');
  assert.deepEqual(definition?.setup.fields.map((field) => field.kind), ['yield']);
  assert.equal(definition?.capabilities.supportsCookingContext, false);
  assert.equal(definition?.presentationHints.preferredPresentationMode, 'sheet');
});

test('resolveUnifiedRecipeDefinition maps arroz-lentejas-compuesto to the same unified journey contract', () => {
  const definition = resolveUnifiedRecipeDefinition({
    recipeV2: localRecipeV2ById['arroz-lentejas-compuesto'] ?? null,
  });

  assert.ok(definition);
  assert.equal(definition?.id, 'arroz-lentejas-compuesto');
  assert.equal(definition?.flowType, 'compound');
  assert.deepEqual(definition?.setup.fields.map((field) => field.kind), ['yield']);
  assert.equal(definition?.capabilities.supportsCookingContext, false);
});

test('resolveUnifiedRecipeDefinition maps tallarines-rojos-compuesto to the same unified journey contract', () => {
  const definition = resolveUnifiedRecipeDefinition({
    recipeV2: localRecipeV2ById['tallarines-rojos-compuesto'] ?? null,
  });

  assert.ok(definition);
  assert.equal(definition?.id, 'tallarines-rojos-compuesto');
  assert.equal(definition?.flowType, 'compound');
  assert.deepEqual(definition?.setup.fields.map((field) => field.kind), ['yield']);
  assert.equal(definition?.capabilities.supportsCookingContext, false);
});
