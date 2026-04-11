import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { validateFixedRecipeJson } from '../../../../api/ai/fixedRecipeSchema';
import { parseFixedRecipesJson } from './loader';

function readFixture(fileName: string): unknown {
  const fixturePath = path.join(process.cwd(), 'public', 'fixed-runtime', 'fixtures', fileName);
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

test('schema v2.1 accepts baking fixture and loader keeps compatibility', () => {
  const baking = readFixture('baking-brownie-v2_1.json');
  const schema = validateFixedRecipeJson(baking);
  assert.equal(schema.valid, true);
  assert.equal(schema.schemaVersion, 'v2.1');

  const parsed = parseFixedRecipesJson([baking]);
  assert.equal(parsed[0]?.recipeCategory, 'baking');
  assert.equal(parsed[0]?.ingredients[0]?.items[0]?.displayUnit, 'tableta');
  assert.equal(parsed[0]?.phases[1]?.steps[0]?.container, 'molde-1');
});

test('schema v2.1 accepts beverage fixture and loader keeps optional fields', () => {
  const beverage = readFixture('beverage-limonada-v2_1.json');
  const schema = validateFixedRecipeJson(beverage);
  assert.equal(schema.valid, true);
  assert.equal(schema.schemaVersion, 'v2.1');

  const parsed = parseFixedRecipesJson([beverage]);
  assert.equal(parsed[0]?.recipeCategory, 'beverage');
  assert.deepEqual(parsed[0]?.equipment, ['licuadora', 'jarra']);
  assert.equal(parsed[0]?.ingredients[0]?.items.find((item) => item.name === 'hielo')?.isOptional, true);
  assert.equal(parsed[0]?.phases[1]?.steps[1]?.container, 'licuadora-1');
});
