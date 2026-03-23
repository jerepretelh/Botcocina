import type { MutableRefObject } from 'react';
import type { Screen } from '../../../../types';
import type { useAIRecipeGeneration } from '../../../hooks/useAIRecipeGeneration';
import type { useCookingProgress } from '../../../hooks/useCookingProgress';
import type { useRecipeSeeds } from '../../../hooks/useRecipeSeeds';
import type { useRecipeSelection } from '../../../hooks/useRecipeSelection';
import type { useUserFavorites } from '../../../hooks/useUserFavorites';
import type { useUserLists } from '../../../hooks/useUserLists';
import type { useUserRecipeConfigs } from '../../../hooks/useUserRecipeConfigs';
import type { usePlanningController } from './usePlanningController';
import type { useRecipeOverlayController } from './useRecipeOverlayController';
import { useThermomixLibraryCatalog } from './useThermomixLibraryCatalog';
import { useThermomixRecipeSelectionHydration } from './useThermomixRecipeSelectionHydration';
import { useThermomixSearchAndFavorites } from './useThermomixSearchAndFavorites';

type RecipeSelectionController = ReturnType<typeof useRecipeSelection>;
type CookingProgressController = ReturnType<typeof useCookingProgress>;
type AIRecipeGenController = ReturnType<typeof useAIRecipeGeneration>;
type UserListsController = ReturnType<typeof useUserLists>;
type UserFavoritesController = ReturnType<typeof useUserFavorites>;
type UserRecipeConfigsController = ReturnType<typeof useUserRecipeConfigs>;
type RecipeSeedsController = ReturnType<typeof useRecipeSeeds>;
type OverlayController = ReturnType<typeof useRecipeOverlayController>;
type PlanningController = ReturnType<typeof usePlanningController>;

type UseLibraryAndSelectionControllerArgs = {
  authUserId: string | null;
  screen: Screen;
  pathname: string;
  navigate: (path: string) => void;
  routeSyncRef: MutableRefObject<boolean>;
  recipeSeedSearchTerm: string;
  recipeSelection: RecipeSelectionController;
  cookingProgress: CookingProgressController;
  aiRecipeGen: AIRecipeGenController;
  userLists: UserListsController;
  userFavorites: UserFavoritesController;
  userRecipeConfigs: UserRecipeConfigsController;
  recipeSeeds: RecipeSeedsController;
  overlay: OverlayController;
  planning: PlanningController;
  beforeOpenRecipe?: () => void;
};

export function useLibraryAndSelectionController(args: UseLibraryAndSelectionControllerArgs) {
  void args.cookingProgress;
  void args.userLists;

  const catalog = useThermomixLibraryCatalog({
    authUserId: args.authUserId,
    recipeSeedSearchTerm: args.recipeSeedSearchTerm,
    recipeSelection: args.recipeSelection,
    userFavorites: args.userFavorites,
    recipeSeeds: args.recipeSeeds,
  });

  const hydration = useThermomixRecipeSelectionHydration({
    screen: args.screen,
    pathname: args.pathname,
    navigate: args.navigate,
    routeSyncRef: args.routeSyncRef,
    recipeSelection: args.recipeSelection,
    userRecipeConfigs: args.userRecipeConfigs,
    overlay: args.overlay,
    planning: args.planning,
    beforeOpenRecipe: args.beforeOpenRecipe,
  });

  const search = useThermomixSearchAndFavorites({
    aiRecipeGen: args.aiRecipeGen,
    handleRecipeOpen: hydration.handleRecipeOpen,
  });

  return {
    ...catalog,
    ...hydration,
    ...search,
  };
}
