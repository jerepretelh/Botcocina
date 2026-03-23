import { buildCookingSessionState } from '../../../lib/cookingSession';
import { getCompoundConfigSignature } from '../../../hooks/useCompoundCookingSessionV2';
import type { useScaledRecipe } from '../../../hooks/useScaledRecipe';
import type {
  CompoundCookingController,
  CookingProgressController,
  RecipeSelectionController,
  StandardCookingController,
  StandardTimerController,
} from '../lib/controllerTypes';
import { getCompoundSavedSessionState } from '../lib/runtimeHelpers';
import type { Recipe } from '../../../../types';

export type CompatRuntimeOptions = {
  content?: RecipeSelectionController['activeRecipeContent'] | null;
  activeIngredientSelection?: Record<string, boolean>;
  quantityMode?: 'people' | 'have';
  peopleCount?: number;
  amountUnit?: 'units' | 'grams';
  availableCount?: number;
  portion?: RecipeSelectionController['portion'];
  scaleFactor?: number;
  timingLabel?: string;
};

export type EnterRecipeCookingRuntimeArgs = {
  recipe: Recipe;
  recipeV2: RecipeSelectionController['selectedRecipeV2'] | null;
  useDirectScreen?: boolean;
  compatOptions?: CompatRuntimeOptions;
};

type UseThermomixCookingRuntimeEntryArgs = {
  recipeSelection: RecipeSelectionController;
  cookingProgress: CookingProgressController;
  standardCooking: StandardCookingController;
  standardTimer: StandardTimerController;
  compoundCooking: CompoundCookingController;
  scaledCompoundRecipe: ReturnType<typeof useScaledRecipe>;
  clearRecipeOverlaySheets: () => void;
};

export function useThermomixCookingRuntimeEntry(args: UseThermomixCookingRuntimeEntryArgs) {
  const resetCompatCookingRuntimeState = (options?: {
    scaleFactor?: number;
    timingLabel?: string;
  }) => {
    args.cookingProgress.setCookingSteps(null);
    args.cookingProgress.setActiveStepLoop(null);
    args.cookingProgress.setCurrentStepIndex(0);
    args.cookingProgress.setCurrentSubStepIndex(0);
    args.cookingProgress.setIsRunning(false);
    args.cookingProgress.setFlipPromptVisible(false);
    args.cookingProgress.setPendingFlipAdvance(false);
    args.cookingProgress.setFlipPromptCountdown(0);
    args.cookingProgress.setStirPromptVisible(false);
    args.cookingProgress.setPendingStirAdvance(false);
    args.cookingProgress.setStirPromptCountdown(0);
    args.cookingProgress.setAwaitingNextUnitConfirmation(false);
    args.cookingProgress.setTimerScaleFactor(options?.scaleFactor ?? 1);
    args.cookingProgress.setTimingAdjustedLabel(options?.timingLabel ?? 'Tiempo estándar');
  };

  const initializeCookingBase = (
    recipe: Recipe,
    options?: CompatRuntimeOptions,
  ) => {
    const content = options?.content ?? args.recipeSelection.recipeContentById[recipe.id] ?? null;
    if (!content) return;
    if (recipe.experience === 'compound') {
      resetCompatCookingRuntimeState({
        scaleFactor: options?.scaleFactor,
        timingLabel: options?.timingLabel,
      });
      return;
    }

    const quantityMode = options?.quantityMode ?? args.recipeSelection.quantityMode;
    const peopleCount = options?.peopleCount ?? args.recipeSelection.peopleCount;
    const amountUnit = options?.amountUnit ?? args.recipeSelection.amountUnit;
    const availableCount = options?.availableCount ?? args.recipeSelection.availableCount;
    const portion = options?.portion ?? args.recipeSelection.portion;
    const activeIngredientSelection = options?.activeIngredientSelection
      ?? args.recipeSelection.ingredientSelectionByRecipe[recipe.id]
      ?? {};
    const scaleFactor = options?.scaleFactor ?? 1;

    const session = buildCookingSessionState({
      selectedRecipe: recipe,
      activeRecipeContentSteps: content.steps,
      currentIngredients: content.ingredients,
      activeIngredientSelection,
      quantityMode,
      amountUnit,
      availableCount,
      peopleCount,
      portion,
      timerScaleFactor: scaleFactor,
    });

    args.cookingProgress.setCookingSteps(session.steps);
    args.cookingProgress.setActiveStepLoop(session.activeStepLoop);
    resetCompatCookingRuntimeState({
      scaleFactor,
      timingLabel: options?.timingLabel ?? 'Tiempo estándar',
    });
  };

  const resolveCompoundCookingEntry = (recipe: Recipe) => {
    if (recipe.experience !== 'compound') return 'continue';

    const activeCompoundSignature =
      args.scaledCompoundRecipe?.id === recipe.id
        ? getCompoundConfigSignature(args.scaledCompoundRecipe)
        : null;
    if (!activeCompoundSignature) return 'continue';
    const savedState = getCompoundSavedSessionState(recipe.id, activeCompoundSignature);
    if (!savedState.hasSnapshot) return 'continue';

    if (savedState.isRecipeComplete) {
      localStorage.removeItem(`compound_cooking_progress_${recipe.id}_${activeCompoundSignature}`);
      if (args.recipeSelection.selectedRecipe?.id === recipe.id) {
        args.compoundCooking.resetCompoundSession();
      }
      window.alert('Esta receta ya estaba terminada. La reiniciaremos desde cero.');
      return 'restart';
    }

    const shouldContinue = window.confirm(
      'Encontré una sesión guardada para esta receta compuesta.\n\nAceptar: continuar donde te quedaste.\nCancelar: reiniciar desde cero.',
    );

    if (!shouldContinue) {
      localStorage.removeItem(`compound_cooking_progress_${recipe.id}_${activeCompoundSignature}`);
      if (args.recipeSelection.selectedRecipe?.id === recipe.id) {
        args.compoundCooking.resetCompoundSession();
      }
      return 'restart';
    }

    return 'continue';
  };

  const enterRecipeCookingRuntime = ({
    recipe,
    recipeV2,
    useDirectScreen = false,
    compatOptions,
  }: EnterRecipeCookingRuntimeArgs) => {
    const setCookingScreen = useDirectScreen ? args.recipeSelection.setScreenDirect : args.recipeSelection.setScreen;

    if (recipe.experience === 'compound') {
      resolveCompoundCookingEntry(recipe);
      resetCompatCookingRuntimeState();
    } else if (recipeV2) {
      args.standardCooking.reset();
      args.standardTimer.resetTimer();
    } else {
      initializeCookingBase(recipe, compatOptions);
    }

    args.clearRecipeOverlaySheets();
    setCookingScreen('cooking');
  };

  return {
    initializeCookingBase,
    resetCompatCookingRuntimeState,
    resolveCompoundCookingEntry,
    enterRecipeCookingRuntime,
  };
}
