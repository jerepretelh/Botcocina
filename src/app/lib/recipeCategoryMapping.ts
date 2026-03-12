import type { RecipeCategoryId } from '../../types';

const CATEGORY_COMPATIBILITY: Record<string, RecipeCategoryId[]> = {
  breakfast: ['breakfast', 'desayunos'],
  lunch: ['lunch', 'almuerzos'],
  dinner: ['dinner', 'cenas'],
  'pescados-mariscos': ['pescados-mariscos', 'cenas'],
  'carnes-pollo': ['carnes-pollo', 'almuerzos', 'cenas', 'frituras', 'airfryer'],
  'arroces-pastas': ['arroces-pastas', 'arroces', 'almuerzos', 'cenas'],
  'sopas-guisos': ['sopas-guisos', 'sopas', 'hervidos', 'almuerzos'],
  postres: ['postres'],
  'saludables-veggies': ['saludables-veggies', 'hervidos', 'cenas'],
  desayunos: ['desayunos', 'breakfast'],
  almuerzos: ['almuerzos', 'lunch'],
  cenas: ['cenas', 'dinner'],
  airfryer: ['airfryer', 'carnes-pollo'],
  frituras: ['frituras', 'carnes-pollo'],
  arroces: ['arroces', 'arroces-pastas'],
  hervidos: ['hervidos', 'sopas-guisos', 'saludables-veggies'],
  sopas: ['sopas', 'sopas-guisos'],
  personalizadas: ['personalizadas'],
};

function uniqueIds(ids: RecipeCategoryId[]): RecipeCategoryId[] {
  return [...new Set(ids)];
}

export function getCompatibleCategoryIds(categoryId: RecipeCategoryId | null | undefined): RecipeCategoryId[] {
  if (!categoryId) return [];
  return uniqueIds(CATEGORY_COMPATIBILITY[categoryId] ?? [categoryId]);
}

export function matchesRecipeCategory(
  selectedCategoryId: RecipeCategoryId | null | undefined,
  recipeCategoryId: RecipeCategoryId | null | undefined,
): boolean {
  if (!selectedCategoryId || !recipeCategoryId) return false;
  return getCompatibleCategoryIds(selectedCategoryId).includes(recipeCategoryId);
}
