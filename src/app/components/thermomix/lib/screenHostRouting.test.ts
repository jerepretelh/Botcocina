import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveThermomixScreenDomain } from './screenHostRouting';

test('resolveThermomixScreenDomain maps planning screens to planning host', () => {
  assert.equal(resolveThermomixScreenDomain('weekly-plan'), 'planning');
  assert.equal(resolveThermomixScreenDomain('shopping-list'), 'planning');
});

test('resolveThermomixScreenDomain maps cooking and ai clarify to cooking host', () => {
  assert.equal(resolveThermomixScreenDomain('cooking'), 'cooking');
  assert.equal(resolveThermomixScreenDomain('ai-clarify'), 'cooking');
});

test('resolveThermomixScreenDomain keeps library surfaces under library host', () => {
  assert.equal(resolveThermomixScreenDomain('category-select'), 'library');
  assert.equal(resolveThermomixScreenDomain('recipe-select'), 'library');
});
