import type { Screen } from '../../types';

export function resolveRecipeOverlayHostScreen(currentScreen: Screen, currentHostScreen: Screen | null): Screen {
  if (currentScreen === 'global-recipes' || currentScreen === 'recipe-select') return currentScreen;
  if (currentHostScreen === 'global-recipes' || currentHostScreen === 'recipe-select') return currentHostScreen;
  return 'recipe-select';
}
