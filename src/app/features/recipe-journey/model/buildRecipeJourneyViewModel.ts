import type { Recipe } from '../../../../types';
import type { RecipeV2 } from '../../../types/recipe-v2';
import { resolveUnifiedRecipeDefinition } from '../definition/resolveUnifiedRecipeDefinition';
import { parseRecipeJourneyRoute } from '../router/recipeJourneyRoute';
import { createInitialRecipeJourneyState } from '../state/createInitialRecipeJourneyState';
import { validateJourneySetup } from '../state/validateJourneySetup';
import type {
  RecipeJourneyState,
  RecipePresentationMode,
  UnifiedCookingContext,
  UnifiedRecipeDefinition,
  UnifiedRecipeYield,
} from '../types';

interface BuildRecipeJourneyViewModelArgs {
  recipe: Recipe | null;
  recipeV2: RecipeV2 | null;
  pathname: string;
  returnTo: string | null;
  presentationMode: RecipePresentationMode;
  selectedYield: UnifiedRecipeYield | null;
  selectedCookingContext: UnifiedCookingContext | null;
  activeIngredientSelection: Record<string, boolean>;
}

export interface RecipeJourneyViewModel {
  definition: UnifiedRecipeDefinition;
  journeyState: RecipeJourneyState;
  canContinue: boolean;
  effectiveSelectedYield: UnifiedRecipeYield | null;
  effectiveSelectedCookingContext: UnifiedCookingContext | null;
}

export function buildRecipeJourneyViewModel({
  recipe,
  recipeV2,
  pathname,
  returnTo,
  presentationMode,
  selectedYield,
  selectedCookingContext,
  activeIngredientSelection,
}: BuildRecipeJourneyViewModelArgs): RecipeJourneyViewModel | null {
  if (!recipe || !recipeV2) return null;

  const parsedRoute = parseRecipeJourneyRoute(pathname);
  const definition = resolveUnifiedRecipeDefinition({ recipeV2 });
  if (!definition || !parsedRoute.isValid || parsedRoute.recipeId !== recipe.id || !parsedRoute.stage) {
    return null;
  }

  const selectedIngredientIds = Object.entries(activeIngredientSelection)
    .filter(([, isSelected]) => isSelected)
    .map(([ingredientId]) => ingredientId);

  const effectiveSelectedYield = selectedYield ?? definition.setup.defaults?.yield ?? null;
  const effectiveSelectedCookingContext = selectedCookingContext ?? definition.setup.defaults?.cookingContext ?? null;
  const canContinue = validateJourneySetup(
    definition,
    effectiveSelectedYield,
    effectiveSelectedCookingContext,
  );

  const journeyState = createInitialRecipeJourneyState({
    recipeId: recipe.id,
    currentStage: parsedRoute.stage,
    returnTo,
    presentationMode,
    selectedYield: effectiveSelectedYield,
    selectedCookingContext: effectiveSelectedCookingContext,
    selectedIngredientIds,
    isSetupValid: canContinue,
  });

  return {
    definition,
    journeyState,
    canContinue,
    effectiveSelectedYield,
    effectiveSelectedCookingContext,
  };
}
