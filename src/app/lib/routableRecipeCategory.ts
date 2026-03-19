import type { RecipeCategoryId } from '../../types';
import { recipeCategories } from '../data/recipeCategories';

export function resolveRoutableCategoryId(categoryId: RecipeCategoryId | string | null | undefined): RecipeCategoryId | null {
  if (!categoryId) return null;
  return recipeCategories.some((category) => category.id === categoryId)
    ? categoryId as RecipeCategoryId
    : null;
}
