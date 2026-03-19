import type { RecipeCategoryId } from '../../types';

const CATEGORY_COMPATIBILITY: Record<string, RecipeCategoryId[]> = {
  breakfast: ['breakfast', 'desayunos'],
  lunch: ['lunch', 'almuerzos'],
  dinner: ['dinner', 'cenas'],
  'pescados-mariscos': ['pescados-mariscos'],
  'carnes-pollo': ['carnes-pollo'],
  'arroces-pastas': ['arroces-pastas', 'arroces'],
  'sopas-guisos': ['sopas-guisos', 'sopas'],
  postres: ['postres'],
  'saludables-veggies': ['saludables-veggies'],
  desayunos: ['desayunos', 'breakfast'],
  almuerzos: ['almuerzos', 'lunch'],
  cenas: ['cenas', 'dinner'],
  airfryer: ['airfryer'],
  frituras: ['frituras'],
  arroces: ['arroces', 'arroces-pastas'],
  hervidos: ['hervidos'],
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
