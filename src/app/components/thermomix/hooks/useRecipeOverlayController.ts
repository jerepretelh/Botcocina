import { useState } from 'react';
import type { RecipeCategoryId, Screen } from '../../../../types';
import { isRecipeOverlayRoute } from '../../../lib/recipeOverlayRoute';
import { resolveRecipeOverlayCloseDestination } from '../../../lib/recipeNavigation';

type UseRecipeOverlayControllerArgs = {
  navigate: (path: string) => void;
  pathname: string;
  screen: Screen;
  selectedCategory: RecipeCategoryId | null;
  setScreenDirect: (screen: Screen) => void;
  setSelectedCategory: (category: RecipeCategoryId | null) => void;
};

export function useRecipeOverlayController(args: UseRecipeOverlayControllerArgs) {
  const [isRecipeSetupSheetOpen, setIsRecipeSetupSheetOpen] = useState(false);
  const [isIngredientsSheetOpen, setIsIngredientsSheetOpen] = useState(false);
  const [recipeOverlayPinnedPath, setRecipeOverlayPinnedPath] = useState<string | null>(null);
  const [recipeOverlayHostScreen, setRecipeOverlayHostScreen] = useState<Screen | null>(null);
  const [recipeOverlayHostPath, setRecipeOverlayHostPath] = useState<string | null>(null);

  const clearRecipeOverlaySheets = () => {
    setIsRecipeSetupSheetOpen(false);
    setIsIngredientsSheetOpen(false);
    setRecipeOverlayPinnedPath(null);
  };

  const resetRecipeOverlayNavigationContext = () => {
    clearRecipeOverlaySheets();
    setRecipeOverlayHostScreen(null);
    setRecipeOverlayHostPath(null);
  };

  const restoreRecipeOverlayHostRoute = () => {
    const destination = resolveRecipeOverlayCloseDestination({
      currentScreen: args.screen,
      currentHostScreen: recipeOverlayHostScreen,
      explicitHostPath: recipeOverlayHostPath,
      selectedCategory: args.selectedCategory,
    });
    setRecipeOverlayHostScreen(null);
    setRecipeOverlayHostPath(null);
    args.setScreenDirect(destination.screen);
    args.navigate(destination.path);
  };

  const openRecipeSetupSheet = () => {
    setIsIngredientsSheetOpen(false);
    setIsRecipeSetupSheetOpen(true);
  };

  const closeRecipeSetupSheet = () => {
    setIsRecipeSetupSheetOpen(false);
    setRecipeOverlayPinnedPath(null);
    if (isRecipeOverlayRoute(args.pathname)) {
      restoreRecipeOverlayHostRoute();
    }
  };

  const openIngredientsSheet = () => {
    setIsRecipeSetupSheetOpen(false);
    setIsIngredientsSheetOpen(true);
  };

  const closeIngredientsSheet = () => {
    setIsIngredientsSheetOpen(false);
    setRecipeOverlayPinnedPath(null);
    if (isRecipeOverlayRoute(args.pathname)) {
      restoreRecipeOverlayHostRoute();
    }
  };

  const closeUnifiedJourneyOverlay = () => {
    const destination = resolveRecipeOverlayCloseDestination({
      currentScreen: args.screen,
      currentHostScreen: recipeOverlayHostScreen,
      explicitHostPath: recipeOverlayHostPath,
      selectedCategory: args.selectedCategory,
    });

    resetRecipeOverlayNavigationContext();
    if (destination.screen !== 'recipe-select') {
      args.setSelectedCategory(null);
    }
    args.setScreenDirect(destination.screen);
    args.navigate(destination.path);
  };

  return {
    isRecipeSetupSheetOpen,
    isIngredientsSheetOpen,
    recipeOverlayPinnedPath,
    recipeOverlayHostScreen,
    recipeOverlayHostPath,
    setRecipeOverlayPinnedPath,
    setRecipeOverlayHostScreen,
    setRecipeOverlayHostPath,
    clearRecipeOverlaySheets,
    resetRecipeOverlayNavigationContext,
    openRecipeSetupSheet,
    closeRecipeSetupSheet,
    openIngredientsSheet,
    closeIngredientsSheet,
    closeUnifiedJourneyOverlay,
  };
}
