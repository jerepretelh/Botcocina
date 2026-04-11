import assert from 'node:assert/strict';
import test from 'node:test';
import { buildLibraryCategoryOptions, filterLibraryRecipes, normalizeSearchText } from './librarySearch';
import type { FixedRecipeJson } from './types';

function formatCategory(category: FixedRecipeJson['recipeCategory'] | undefined): string {
  if (category === 'stovetop') return 'Cocina diaria';
  if (category === 'baking') return 'Horneado';
  return 'Runtime fijo';
}

const sampleRecipes: FixedRecipeJson[] = [
  {
    id: 'arroz-lentejas',
    title: 'Arroz con lentejas',
    recipeCategory: 'stovetop',
    servings: 2,
    equipment: ['olla'],
    ingredients: [
      {
        title: 'Base',
        items: [
          { name: 'Arroz', canonicalName: 'arroz', amount: 1, unit: 'taza' },
          { name: 'Lentejas', canonicalName: 'lentejas', amount: 1, unit: 'taza' },
        ],
      },
    ],
    phases: [{ id: 'f1', number: 'FASE 1', title: 'Preparación', steps: [{ id: 's1', text: 'Mezclar' }] }],
  },
  {
    id: 'keke-platano',
    title: 'Keke de plátano',
    recipeCategory: 'baking',
    servings: 4,
    equipment: ['molde'],
    ingredients: [
      {
        title: 'Masa',
        items: [
          { name: 'Plátano', canonicalName: 'platano', amount: 2, unit: 'unidad' },
          { name: 'Harina', canonicalName: 'harina', amount: 200, unit: 'g' },
        ],
      },
    ],
    phases: [{ id: 'f1', number: 'FASE 1', title: 'Preparación', steps: [{ id: 's1', text: 'Batir' }] }],
  },
];

test('normalizeSearchText strips accents and whitespace noise', () => {
  assert.equal(normalizeSearchText('  Plátano   MADURO  '), 'platano maduro');
});

test('buildLibraryCategoryOptions includes all + dynamic categories', () => {
  const options = buildLibraryCategoryOptions({ recipes: sampleRecipes, formatCategoryLabel: formatCategory });
  assert.equal(options[0]?.key, 'all');
  assert.ok(options.some((option) => option.key === 'stovetop'));
  assert.ok(options.some((option) => option.key === 'baking'));
});

test('filterLibraryRecipes matches by ingredient name', () => {
  const filtered = filterLibraryRecipes({
    recipes: sampleRecipes,
    query: 'lentejas',
    activeCategoryKey: 'all',
    formatCategoryLabel: formatCategory,
  });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.id, 'arroz-lentejas');
});

test('filterLibraryRecipes matches by category + query combination', () => {
  const filtered = filterLibraryRecipes({
    recipes: sampleRecipes,
    query: 'platano',
    activeCategoryKey: 'baking',
    formatCategoryLabel: formatCategory,
  });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.id, 'keke-platano');
});
