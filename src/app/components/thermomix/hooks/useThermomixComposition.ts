import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { Screen } from '../../../../types';
import { useThermomixCoreControllers } from './useThermomixCoreControllers';
import { useThermomixJourneyComposition } from './useThermomixJourneyComposition';
import { useThermomixScreenComposition } from './useThermomixScreenComposition';

export function useThermomixComposition(args: {
  auth: { userId?: string | null; user?: { email?: string | null }; signOut: () => void | Promise<void> };
  pathname: string;
  navigate: (path: string) => void;
  appVersion: string;
  recipeSeedSearchTerm: string;
  setRecipeSeedSearchTerm: Dispatch<SetStateAction<string>>;
  routeSyncRef: MutableRefObject<boolean>;
  lastProcessedRoutePathRef: MutableRefObject<string | null>;
  currentScreenRef: MutableRefObject<Screen>;
  currentRecipeOverlayHostScreenRef: MutableRefObject<Screen | null>;
}) {
  const core = useThermomixCoreControllers({
    auth: args.auth,
    pathname: args.pathname,
    navigate: args.navigate,
    routeSyncRef: args.routeSyncRef,
    recipeSeedSearchTerm: args.recipeSeedSearchTerm,
    setRecipeSeedSearchTerm: args.setRecipeSeedSearchTerm,
  });

  const journey = useThermomixJourneyComposition({
    authUserId: args.auth.userId,
    pathname: args.pathname,
    navigate: args.navigate,
    appVersion: args.appVersion,
    screen: core.screen,
    recipeSelection: core.recipeSelection,
    cookingProgress: core.cookingProgress,
    portions: core.portions,
    userRecipeConfigs: core.userRecipeConfigs,
    weeklyPlan: core.weeklyPlan,
    planning: core.planning,
    overlay: core.overlay,
    aiRecipeGen: core.aiRecipeGen,
    runtime: core.runtime,
    runtimeController: core.runtimeController,
    librarySelection: core.librarySelection,
  });

  const screenModels = useThermomixScreenComposition({
    auth: args.auth,
    appVersion: args.appVersion,
    pathname: args.pathname,
    navigate: args.navigate,
    screen: core.screen,
    recipeSeedSearchTerm: args.recipeSeedSearchTerm,
    setRecipeSeedSearchTerm: args.setRecipeSeedSearchTerm,
    routeSyncRef: args.routeSyncRef,
    lastProcessedRoutePathRef: args.lastProcessedRoutePathRef,
    currentScreenRef: args.currentScreenRef,
    currentRecipeOverlayHostScreenRef: args.currentRecipeOverlayHostScreenRef,
    recipeSelection: core.recipeSelection,
    cookingProgress: core.cookingProgress,
    planning: core.planning,
    overlay: core.overlay,
    runtime: core.runtime,
    runtimeController: core.runtimeController,
    librarySelection: core.librarySelection,
    aiRecipeGen: core.aiRecipeGen,
    userFavorites: core.userFavorites,
    recipeSeeds: core.recipeSeeds,
    weeklyPlan: core.weeklyPlan,
    journey,
  });

  return {
    screen: core.screen,
    overlayModel: journey.overlayModel,
    shouldRenderUnifiedJourneyPage: journey.shouldRenderUnifiedJourneyPage,
    unifiedJourneyViewModel: journey.unifiedJourneyViewModel,
    unifiedJourneyShellAdapter: journey.unifiedJourneyShellAdapter,
    screenModels,
  };
}
