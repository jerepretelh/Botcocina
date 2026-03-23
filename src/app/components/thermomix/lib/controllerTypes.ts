import type { MixedRecipeSearchResult, Recipe, RecipeCategory, Screen } from '../../../../types';
import type { useAIRecipeGeneration } from '../../../hooks/useAIRecipeGeneration';
import type { useCookingProgress } from '../../../hooks/useCookingProgress';
import type { useCookingProgressV2 } from '../../../hooks/useCookingProgressV2';
import type { usePortions } from '../../../hooks/usePortions';
import type { useRecipeSeeds } from '../../../hooks/useRecipeSeeds';
import type { useRecipeSelection } from '../../../hooks/useRecipeSelection';
import type { useRecipeYield } from '../../../hooks/useRecipeYield';
import type { useScaledRecipe } from '../../../hooks/useScaledRecipe';
import type { useThermomixHandlers } from '../../../hooks/useThermomixHandlers';
import type { useThermomixTimerV2 } from '../../../hooks/useThermomixTimerV2';
import type { useUserFavorites } from '../../../hooks/useUserFavorites';
import type { useUserLists } from '../../../hooks/useUserLists';
import type { useUserRecipeConfigs } from '../../../hooks/useUserRecipeConfigs';
import type { useWeeklyPlan } from '../../../hooks/useWeeklyPlan';
import type { useCompoundCookingSessionV2 } from '../../../hooks/useCompoundCookingSessionV2';
import type { usePlanningController } from '../hooks/usePlanningController';
import type { useRecipeOverlayController } from '../hooks/useRecipeOverlayController';
import type { useLibraryAndSelectionController } from '../hooks/useLibraryAndSelectionController';
import type { useCookingRuntimeController } from '../hooks/useCookingRuntimeController';
import type { useThermomixOverlayModel } from '../hooks/useThermomixOverlayModel';
import type { useThermomixCookingAssembly } from '../hooks/useThermomixCookingAssembly';
import type { useThermomixRecipeRuntime } from '../hooks/useThermomixRecipeRuntime';

export type RecipeSelectionController = ReturnType<typeof useRecipeSelection>;
export type CookingProgressController = ReturnType<typeof useCookingProgress>;
export type PortionsController = ReturnType<typeof usePortions>;
export type UserListsController = ReturnType<typeof useUserLists>;
export type UserFavoritesController = ReturnType<typeof useUserFavorites>;
export type UserRecipeConfigsController = ReturnType<typeof useUserRecipeConfigs>;
export type WeeklyPlanController = ReturnType<typeof useWeeklyPlan>;
export type PlanningController = ReturnType<typeof usePlanningController>;
export type OverlayController = ReturnType<typeof useRecipeOverlayController>;
export type RecipeSeedsController = ReturnType<typeof useRecipeSeeds>;
export type AIRecipeGenerationController = ReturnType<typeof useAIRecipeGeneration>;
export type LibrarySelectionController = ReturnType<typeof useLibraryAndSelectionController>;
export type CookingRuntimeController = ReturnType<typeof useCookingRuntimeController>;
export type ThermomixOverlayModel = ReturnType<typeof useThermomixOverlayModel>;
export type ThermomixCookingAssembly = ReturnType<typeof useThermomixCookingAssembly>;
export type ThermomixRecipeRuntime = ReturnType<typeof useThermomixRecipeRuntime>;
export type StandardCookingController = ReturnType<typeof useCookingProgressV2>;
export type StandardTimerController = ReturnType<typeof useThermomixTimerV2>;
export type CompoundCookingController = ReturnType<typeof useCompoundCookingSessionV2>;
export type StandardYieldController = ReturnType<typeof useRecipeYield>;
export type ScaledRecipeController = ReturnType<typeof useScaledRecipe>;
export type CompatCookingHandlers = ReturnType<typeof useThermomixHandlers>;

export type GlobalCategoryEntry = {
  category: RecipeCategory | { id: 'all'; name: string; icon: string; description: string };
  recipeCount: number;
};

export type GlobalCategoryItem = {
  id: string;
  kind: 'recipe';
  recipe: Recipe;
};

export type RuntimeHydratedRecipeSelection = {
  content?: RecipeSelectionController['activeRecipeContent'] | null;
  hydratedSelection?: Record<string, boolean>;
  quantityMode?: RecipeSelectionController['quantityMode'];
  peopleCount?: number;
  amountUnit?: RecipeSelectionController['amountUnit'];
  availableCount?: number;
  portion?: RecipeSelectionController['portion'];
  recipeV2?: RecipeSelectionController['selectedRecipeV2'] | null;
} | null;

export type SearchResultHandler = (result: MixedRecipeSearchResult) => void;
export type RecipeOpenHandler = (recipe: Recipe) => void;
export type ScreenNavigateHandler = (screen: Screen) => void;
