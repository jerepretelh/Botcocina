import test from 'node:test';
import assert from 'node:assert/strict';

import { __testing } from './planRepository';

test('mapPlanItem preserves backfilled target_yield as the planning source of truth', () => {
  const item = __testing.mapPlanItem({
    id: 'plan-1',
    weekly_plan_id: 'weekly-1',
    day_of_week: 1,
    slot: 'almuerzo',
    recipe_id: 'papas-airfryer',
    recipe_name_snapshot: 'Papas Airfryer',
    fixed_servings: 2,
    quantity_mode: 'people',
    people_count: 4,
    amount_unit: null,
    available_count: null,
    target_yield: {
      type: 'servings',
      value: 4,
      unit: 'porciones',
      visibleUnit: 'porciones',
      label: 'porciones',
    },
    selected_optional_ingredients: ['aji'],
    source_context_summary: null,
    resolved_portion: 4,
    scale_factor: 2,
    notes: null,
    sort_order: 10,
    created_at: '2026-03-19T00:00:00.000Z',
  });

  assert.equal(item.configSnapshot.targetYield?.type, 'servings');
  assert.equal(item.configSnapshot.targetYield?.value, 4);
  assert.deepEqual(item.configSnapshot.selectedOptionalIngredients, ['aji']);
});

test('mapPlanItem fails fast when target_yield is missing', () => {
  assert.throws(
    () => __testing.mapPlanItem({
      id: 'plan-2',
      weekly_plan_id: 'weekly-1',
      day_of_week: 1,
      slot: 'almuerzo',
      recipe_id: 'papas-airfryer',
      recipe_name_snapshot: 'Papas Airfryer',
      fixed_servings: 2,
      quantity_mode: 'people',
      people_count: 4,
      amount_unit: null,
      available_count: null,
      selected_optional_ingredients: [],
      source_context_summary: null,
      resolved_portion: 4,
      scale_factor: 2,
      notes: null,
      sort_order: 10,
      created_at: '2026-03-19T00:00:00.000Z',
    }),
    /target_yield válido/,
  );
});
