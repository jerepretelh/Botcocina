import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildImportPreview } from './importPreview';

const CANONICAL_EXAMPLE = {
  id: 'arroz-con-pollo-3p',
  title: 'Arroz con pollo',
  recipeCategory: 'stovetop',
  equipment: ['olla'],
  servings: 3,
  ingredients: [
    {
      title: 'Arroz',
      icon: '🍚',
      items: [
        {
          name: 'arroz',
          canonicalName: 'arroz',
          shoppingKey: 'arroz',
          amount: 300,
          unit: 'g',
          displayAmount: '1 1/2',
          displayUnit: 'tazas',
          isOptional: false,
        },
      ],
    },
  ],
  phases: [
    {
      id: 'fase-1',
      number: 'FASE 1',
      title: 'Preparación',
      emoji: '🔪',
      purpose: 'Mise en place',
      steps: [
        {
          id: 's1',
          kind: 'action',
          text: 'Lavar arroz.',
          ingredients: [
            {
              name: 'arroz',
              canonicalName: 'arroz',
              shoppingKey: 'arroz',
              amount: 300,
              unit: 'g',
              displayAmount: '1 1/2',
              displayUnit: 'tazas',
              isOptional: false,
            },
          ],
        },
        { id: 's2', kind: 'timer', text: 'Esperar.', timerSec: 60 },
        { id: 's3', kind: 'result', text: 'Listo.', result: 'listo' },
      ],
    },
  ],
};

describe('buildImportPreview', () => {
  it('acepta receta runtime pegada como objeto único', () => {
    const runtimeObject = {
      id: 'runtime-single',
      title: 'Runtime single',
      servings: 2,
      ingredients: [
        {
          title: 'Base',
          items: [{ name: 'agua', canonicalName: 'agua', shoppingKey: 'agua', amount: 1, unit: 'lt' }],
        },
      ],
      phases: [
        {
          id: 'fase-1',
          number: 'FASE 1',
          title: 'Cocción',
          steps: [
            { id: 's1', kind: 'action', text: 'Hervir agua' },
            { id: 's2', kind: 'timer', text: 'Esperar', timer: 60 },
          ],
        },
      ],
    };

    const preview = buildImportPreview(JSON.stringify(runtimeObject));
    assert.equal(preview.ok, true);
    assert.equal(preview.mode, 'runtime-object');
    assert.equal(preview.recipes.length, 1);
    assert.equal(preview.recipes[0]?.id, 'runtime-single');
  });

  it('acepta receta canónica y la convierte al runtime importable', () => {
    const preview = buildImportPreview(JSON.stringify(CANONICAL_EXAMPLE));
    assert.equal(preview.ok, true);
    assert.equal(['canonical-object', 'runtime-object'].includes(preview.mode), true);
    assert.equal(preview.recipes.length, 1);
    assert.equal(preview.recipes[0]?.id, 'arroz-con-pollo-3p');
    assert.equal(preview.recipes[0]?.recipeCategory, 'stovetop');
    assert.deepEqual(preview.recipes[0]?.equipment, ['olla']);
    assert.equal(preview.recipes[0]?.ingredients[0]?.items[0]?.displayUnit, 'tazas');
    assert.equal(preview.recipes[0]?.phases[0]?.steps[1]?.timer, 60);
  });

  it('acepta steps group en receta canónica y genera ids para substeps faltantes', () => {
    const grouped = {
      id: 'runtime-grouped',
      title: 'Runtime grouped',
      servings: 2,
      ingredients: [
        {
          title: 'Base',
          icon: '🥬',
          items: [{ name: 'vainitas', canonicalName: 'vainitas', amount: 200, unit: 'g' }],
        },
      ],
      phases: [
        {
          id: 'fase-1',
          number: 'FASE 1',
          title: 'Preparación',
          emoji: '🔪',
          purpose: 'Preparar ingredientes',
          steps: [
            {
              id: 'g1',
              kind: 'group',
              title: 'Preparar las vainitas',
              substeps: [
                { kind: 'action', text: 'Corta las puntas' },
                { kind: 'action', text: 'Corta en diagonal' },
              ],
            },
          ],
        },
      ],
    };

    const preview = buildImportPreview(JSON.stringify(grouped));
    assert.equal(preview.ok, true);
    assert.equal(preview.recipes[0]?.phases[0]?.steps.length, 3);
    assert.equal(preview.recipes[0]?.phases[0]?.steps[0]?.text, 'Preparar las vainitas');
    assert.equal(preview.recipes[0]?.phases[0]?.steps[1]?.id, 'g1-sub-1');
    assert.equal(preview.recipes[0]?.phases[0]?.steps[1]?.text, 'Preparar las vainitas: Corta las puntas');
  });

  it('marca inválido cuando pegan un schema en vez de receta', () => {
    const schemaLike = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      title: 'Cooking Runtime Recipe',
      properties: {},
      $defs: {},
    };
    const preview = buildImportPreview(JSON.stringify(schemaLike));
    assert.equal(preview.ok, false);
    assert.equal(preview.mode, 'invalid');
    assert.equal(preview.errors.some((error) => error.toLowerCase().includes('schema')), true);
  });
});
