import type { RecipeCategory } from '../../types/index.js';

export const recipeCategories: RecipeCategory[] = [
  { id: 'breakfast', name: 'Desayunos', icon: '🥐' },
  { id: 'lunch', name: 'Almuerzos', icon: '🥪' },
  { id: 'dinner', name: 'Cenas', icon: '🍝' },
  { id: 'pescados-mariscos', name: 'Pescados y Mariscos', icon: '🐟' },
  { id: 'carnes-pollo', name: 'Carnes y Pollo', icon: '🍗' },
  { id: 'arroces-pastas', name: 'Arroces y Pastas', icon: '🍚' },
  { id: 'sopas-guisos', name: 'Sopas y Guisos', icon: '🍲' },
  { id: 'postres', name: 'Postres', icon: '🍰' },
  { id: 'saludables-veggies', name: 'Saludables y Veggies', icon: '🥗' },
];
