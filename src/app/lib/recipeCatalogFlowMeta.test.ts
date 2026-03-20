import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getRecipeCatalogCapabilityLabel,
  getRecipeCatalogFlowMeta,
  getRecipeCatalogFlowStatusLabel,
} from './recipeCatalogFlowMeta';

test('getRecipeCatalogFlowMeta returns the expected badges for migrated journey recipes', () => {
  assert.deepEqual(getRecipeCatalogFlowMeta('keke-platano-molde'), {
    status: 'journey',
    primaryCapability: 'container_bound',
  });
  assert.deepEqual(getRecipeCatalogFlowMeta('papas-airfryer'), {
    status: 'journey',
    primaryCapability: 'cooking_context',
  });
  assert.deepEqual(getRecipeCatalogFlowMeta('arroz-lentejas-compuesto'), {
    status: 'journey',
    primaryCapability: 'compound',
  });
  assert.deepEqual(getRecipeCatalogFlowMeta('quinua-desayuno'), {
    status: 'journey',
    primaryCapability: 'optional_ingredients',
  });
  assert.deepEqual(getRecipeCatalogFlowMeta('lomo-saltado-casero'), {
    status: 'journey',
    primaryCapability: 'standard',
  });
  assert.deepEqual(getRecipeCatalogFlowMeta('sopa-verduras'), {
    status: 'journey',
    primaryCapability: 'standard',
  });
  assert.deepEqual(getRecipeCatalogFlowMeta('tallarines-rojos-compuesto'), {
    status: 'journey',
    primaryCapability: 'compound',
  });
});

test('getRecipeCatalogFlowMeta falls back to review and standard for unclassified recipes', () => {
  assert.deepEqual(getRecipeCatalogFlowMeta('recipe-without-meta'), {
    status: 'review',
    primaryCapability: 'standard',
  });
});

test('labels are compact and user-facing', () => {
  assert.equal(getRecipeCatalogFlowStatusLabel('journey'), 'Journey');
  assert.equal(getRecipeCatalogFlowStatusLabel('legacy'), 'Legacy');
  assert.equal(getRecipeCatalogFlowStatusLabel('review'), 'Review');
  assert.equal(getRecipeCatalogCapabilityLabel('container_bound'), 'Container bound');
  assert.equal(getRecipeCatalogCapabilityLabel('optional_ingredients'), 'Optional ingredients');
});
