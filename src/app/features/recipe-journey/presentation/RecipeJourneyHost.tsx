import type { Recipe } from '../../../../types';
import type { RecipeV2, ScaledRecipeV2 } from '../../../types/recipe-v2';
import { buildCookRuntimeBridgePayload } from '../compat/cookRuntimeBridge';
import type { RecipeJourneyViewModel } from '../model/buildRecipeJourneyViewModel';
import { transitionRecipeJourney } from '../state/transitionRecipeJourney';
import type {
  CookRuntimeBridgePayload,
  RecipeJourneyStage,
  UnifiedCookingContext,
  UnifiedRecipeYield,
} from '../types';
import { RecipeCookBridgeStage } from './RecipeCookBridgeStage';
import { RecipeIngredientsStage } from './RecipeIngredientsStage';
import { RecipeSetupStage } from './RecipeSetupStage';
import { RecipeUnifiedPageStage } from './RecipeUnifiedPageStage';

interface RecipeJourneyHostProps {
  recipe: Recipe | null;
  recipeV2: RecipeV2 | null;
  scaledRecipe: ScaledRecipeV2 | null;
  viewModel: RecipeJourneyViewModel | null;
  activeIngredientSelection: Record<string, boolean>;
  onSelectedYieldChange: (nextYield: UnifiedRecipeYield) => void;
  onSelectedCookingContextChange: (nextContext: UnifiedCookingContext | null) => void;
  onDecrement: () => void;
  onIncrement: () => void;
  onIngredientToggle: (ingredientId: string) => void;
  onNavigateStage: (stage: RecipeJourneyStage) => void;
  onCloseSetup: () => void;
  onCloseIngredients: () => void;
  onEnterCooking: (payload: CookRuntimeBridgePayload) => void;
}

export function RecipeJourneyHost({
  recipe,
  recipeV2,
  scaledRecipe,
  viewModel,
  activeIngredientSelection,
  onSelectedYieldChange,
  onSelectedCookingContextChange,
  onDecrement,
  onIncrement,
  onIngredientToggle,
  onNavigateStage,
  onCloseSetup,
  onCloseIngredients,
  onEnterCooking,
}: RecipeJourneyHostProps) {
  if (!recipe || !recipeV2 || !viewModel) {
    return null;
  }

  const {
    definition,
    journeyState,
    canContinue,
    effectiveSelectedYield,
    effectiveSelectedCookingContext,
  } = viewModel;

  const enterCookingFromUnifiedPage = () => {
    if (!canContinue) return;

    const ingredientsStageState = journeyState.currentStage === 'setup'
      ? transitionRecipeJourney(journeyState, { type: 'CONFIRM_SETUP' })
      : journeyState;

    if (!ingredientsStageState) return;

    const cookState = transitionRecipeJourney(ingredientsStageState, { type: 'START_COOK' });
    if (cookState?.currentStage === 'cook') {
      onEnterCooking(buildCookRuntimeBridgePayload(cookState, definition));
    }
  };

  if (journeyState.presentationMode === 'page' && (journeyState.currentStage === 'setup' || journeyState.currentStage === 'ingredients')) {
    return (
      <RecipeUnifiedPageStage
        recipe={recipe}
        recipeV2={recipeV2}
        scaledRecipe={scaledRecipe}
        selectedYield={effectiveSelectedYield}
        selectedCookingContext={effectiveSelectedCookingContext}
        activeIngredientSelection={activeIngredientSelection}
        canStartRecipe={canContinue && Boolean(scaledRecipe)}
        onDecrement={onDecrement}
        onIncrement={onIncrement}
        onSelectedYieldChange={onSelectedYieldChange}
        onSelectedCookingContextChange={onSelectedCookingContextChange}
        onIngredientToggle={onIngredientToggle}
        onBack={() => {
          if (journeyState.currentStage === 'ingredients') {
            const nextState = transitionRecipeJourney(journeyState, { type: 'BACK_FROM_INGREDIENTS' });
            if (nextState?.currentStage && nextState.currentStage !== journeyState.currentStage) {
              onNavigateStage(nextState.currentStage);
              return;
            }
          }
          onCloseSetup();
        }}
        onClose={journeyState.currentStage === 'ingredients' ? onCloseIngredients : onCloseSetup}
        onStartRecipe={enterCookingFromUnifiedPage}
      />
    );
  }

  if (journeyState.currentStage === 'setup') {
    return (
      <RecipeSetupStage
        definition={definition}
        selectedRecipe={recipe}
        recipeV2={recipeV2}
        selectedYield={effectiveSelectedYield}
        selectedCookingContext={effectiveSelectedCookingContext}
        scaledRecipe={scaledRecipe}
        onDecrement={onDecrement}
        onIncrement={onIncrement}
        onSelectedYieldChange={onSelectedYieldChange}
        onSelectedCookingContextChange={onSelectedCookingContextChange}
        presentationMode={journeyState.presentationMode}
        onContinue={() => {
          if (!canContinue) return;
          const nextState = transitionRecipeJourney(journeyState, { type: 'CONFIRM_SETUP' });
          if (nextState?.currentStage && nextState.currentStage !== journeyState.currentStage) {
            onNavigateStage(nextState.currentStage);
          }
        }}
        onClose={onCloseSetup}
      />
    );
  }

  if (journeyState.currentStage === 'ingredients') {
    return (
      <RecipeIngredientsStage
        selectedRecipe={recipe}
        scaledRecipe={scaledRecipe}
        selectedYield={effectiveSelectedYield}
        activeIngredientSelection={activeIngredientSelection}
        presentationMode={journeyState.presentationMode}
        onIngredientToggle={onIngredientToggle}
        onBack={() => {
          const nextState = transitionRecipeJourney(journeyState, { type: 'BACK_FROM_INGREDIENTS' });
          if (nextState?.currentStage && nextState.currentStage !== journeyState.currentStage) {
            onNavigateStage(nextState.currentStage);
          }
        }}
        onClose={onCloseIngredients}
        onStartCooking={() => {
          const nextState = transitionRecipeJourney(journeyState, { type: 'START_COOK' });
          if (nextState?.currentStage === 'cook') {
            onEnterCooking(buildCookRuntimeBridgePayload(nextState, definition));
          }
        }}
      />
    );
  }

  if (journeyState.currentStage === 'cook') {
    return (
      <RecipeCookBridgeStage
        stage={journeyState.currentStage}
        definition={definition}
        journeyState={journeyState}
        onEnterCooking={onEnterCooking}
      />
    );
  }

  return null;
}
