import type { MixedRecipeSearchResult, Recipe, Screen, WeeklyPlanItem } from '../../../../types';
import { resolvePlannedRecipeItem } from '../../../lib/plannedRecipeResolution';
import { buildThermomixScreenModelBundle } from '../lib/screenModelBundle';
import type { ThermomixScreenModelBundle } from '../lib/screenModels';
import type {
  AIRecipeGenerationController,
  CookingProgressController,
  GlobalCategoryEntry,
  GlobalCategoryItem,
  OverlayController,
  RecipeSeedsController,
  RecipeSelectionController,
  RuntimeHydratedRecipeSelection,
  ThermomixCookingAssembly,
  ThermomixOverlayModel,
  ThermomixRecipeRuntime,
  UserFavoritesController,
  WeeklyPlanController,
} from '../lib/controllerTypes';
import type { useCookingRuntimeController } from './useCookingRuntimeController';

function alertMissingPlannedRecipe() {
  window.alert('Esta receta ya no esta disponible en el catalogo actual. Puedes quitarla del plan o volver a publicarla para reabrirla.');
}

export function useThermomixScreenModelBundle(args: {
  auth: { user?: { email?: string | null }; signOut: () => void | Promise<void> };
  appVersion: string;
  screen: Screen;
  recipeSeedSearchTerm: string;
  setRecipeSeedSearchTerm: (value: string) => void;
  aiRecipeGen: AIRecipeGenerationController;
  recipeSelection: RecipeSelectionController;
  cookingProgress: CookingProgressController;
  recipeSeeds: RecipeSeedsController;
  userFavorites: UserFavoritesController;
  planning: { openPlanSheetForRecipe: (recipe: Recipe, sourceScreen: Screen, editingItem?: WeeklyPlanItem | null, initialSnapshot?: unknown) => void };
  weeklyPlan: WeeklyPlanController;
  overlayModel: ThermomixOverlayModel;
  runtimeController: ReturnType<typeof useCookingRuntimeController>;
  runtimeRecipesById: Map<string, Recipe>;
  globalCategories: GlobalCategoryEntry[];
  globalCategoryItems: GlobalCategoryItem[];
  privateUserRecipes: Recipe[];
  recentPrivateRecipes: Recipe[];
  mixedSearchResults: MixedRecipeSearchResult[];
  favoriteRecipes: Recipe[];
  uniqueAvailableRecipes: Recipe[];
  selectedCategoryMeta: RecipeSelectionController['selectedCategoryMeta'];
  handleSearchResultSelect: (result: MixedRecipeSearchResult) => void;
  handleRecipeOpen: (recipe: Recipe) => void;
  hydrateRecipeSelection: (recipe: Recipe) => RuntimeHydratedRecipeSelection;
  cookingAssembly: ThermomixCookingAssembly;
  isCompoundRecipe: boolean;
  scaledStandardRecipe: ThermomixRecipeRuntime['scaledStandardRecipe'];
  hasRecipeV2: boolean;
  standardCooking: ThermomixRecipeRuntime['standardCooking'];
  standardTimer: ThermomixRecipeRuntime['standardTimer'];
  compoundCooking: ThermomixRecipeRuntime['compoundCooking'];
  overlay: OverlayController;
}): ThermomixScreenModelBundle {
  const handleEditPlanItem = (item: WeeklyPlanItem) => {
    const { recipe } = resolvePlannedRecipeItem(item, args.runtimeRecipesById);
    if (!recipe) {
      alertMissingPlannedRecipe();
      return;
    }
    args.planning.openPlanSheetForRecipe(recipe, args.screen, item);
  };

  return buildThermomixScreenModelBundle({
    appShell: {
      appVersion: args.appVersion,
      currentUserEmail: args.auth.user?.email ?? null,
      authSignOut: () => args.auth.signOut(),
    },
    libraryUi: {
      screen: args.screen,
      voiceEnabled: args.cookingProgress.voiceEnabled,
      onVoiceToggle: args.cookingAssembly.voice.handleVoiceToggle,
      speechSupported: args.cookingAssembly.voice.speechSupported,
      ai: args.aiRecipeGen,
      openAIWizard: () => {
        args.aiRecipeGen.setAiWizardStep('context');
        args.recipeSelection.setScreen('ai-clarify');
      },
      recipeSeedSearchTerm: args.recipeSeedSearchTerm,
      setRecipeSeedSearchTerm: args.setRecipeSeedSearchTerm,
      mixedSearchResults: args.mixedSearchResults,
      recipeSeeds: args.recipeSeeds,
      recentPrivateRecipes: args.recentPrivateRecipes,
      favoriteRecipeIds: args.userFavorites.favoriteRecipeIds,
      toggleFavorite: args.userFavorites.toggleFavorite,
      handleSearchResultSelect: args.handleSearchResultSelect,
      handleRecipeOpen: args.handleRecipeOpen,
      openPlanForRecipe: (recipe: Recipe, sourceScreen: Screen) => args.planning.openPlanSheetForRecipe(recipe, sourceScreen),
      navigate: args.recipeSelection.setScreen,
      goBackScreen: args.recipeSelection.goBackScreen,
      globalCategories: args.globalCategories,
      selectGlobalCategory: (categoryId: string | null) => {
        args.recipeSelection.setSelectedCategory(categoryId);
        args.recipeSelection.setScreen('recipe-select');
      },
      globalCategoryItems: args.globalCategoryItems,
      selectedCategoryMeta: args.selectedCategoryMeta,
      privateUserRecipes: args.privateUserRecipes,
      favoriteRecipes: args.favoriteRecipes,
      availableRecipes: args.uniqueAvailableRecipes,
      quickCookCompoundRecipe: (recipe: Recipe) => {
        const hydrated = args.hydrateRecipeSelection(recipe);
        args.runtimeController.resolveCompoundCookingEntry(recipe);
        args.runtimeController.initializeCookingBase(recipe, {
          content: hydrated?.content ?? null,
          activeIngredientSelection: hydrated?.hydratedSelection,
          quantityMode: hydrated?.quantityMode,
          peopleCount: hydrated?.peopleCount,
          amountUnit: hydrated?.amountUnit,
          availableCount: hydrated?.availableCount,
          portion: hydrated?.portion,
        });
        args.recipeSelection.setScreen('cooking');
      },
    },
    planningUi: {
      screen: args.screen,
      weeklyPlan: args.weeklyPlan,
      runtimeRecipesById: args.runtimeRecipesById,
      navigate: args.recipeSelection.setScreen,
      applyPlannedRecipeSnapshot: args.runtimeController.applyPlannedRecipeSnapshot,
      editPlanItem: handleEditPlanItem,
    },
    cookingUi: {
      screen: args.screen,
      ai: args.aiRecipeGen,
      recipeSelection: args.recipeSelection,
      cookingProgress: args.cookingProgress,
      selectedRecipe: args.recipeSelection.selectedRecipe,
      voiceEnabled: args.cookingProgress.voiceEnabled,
      speechSupported: args.cookingAssembly.voice.speechSupported,
      isCompoundRecipe: args.isCompoundRecipe,
      compoundCooking: args.compoundCooking,
      compoundPresentation: args.cookingAssembly.compoundPresentation,
      compoundPrimaryAction: args.cookingAssembly.compoundPrimaryAction,
      handleCompoundPrimaryAction: args.cookingAssembly.handleCompoundPrimaryAction,
      scaledStandardRecipe: args.hasRecipeV2 ? args.scaledStandardRecipe : null,
      activeV2Ingredients: (args.scaledStandardRecipe?.ingredients ?? []).filter((ingredient) => args.recipeSelection.activeIngredientSelectionV2[ingredient.id] ?? true),
      standardPresentation: args.cookingAssembly.standardPresentation,
      standardCooking: args.standardCooking,
      standardTimer: args.standardTimer,
      standardPrimaryAction: args.cookingAssembly.standardPrimaryAction,
      handleStandardPrimaryAction: args.cookingAssembly.handleStandardPrimaryAction,
      compatActions: args.cookingAssembly.handlers,
      voice: args.cookingAssembly.voice,
      portionValue: args.cookingAssembly.portionValue,
      effectiveReminderTitle: args.cookingAssembly.effectiveReminderTitle,
      effectiveReminderMessage: args.cookingAssembly.effectiveReminderMessage,
      isRetirarSubStep: args.cookingAssembly.isRetirarSubStep,
      retirarTitle: args.cookingAssembly.retirarTitle,
      retirarMessage: args.cookingAssembly.retirarMessage,
      onOpenIngredients: () => {
        if (args.runtimeController.openJourneyStageFromCooking('ingredients')) return;
        if (args.isCompoundRecipe) {
          args.cookingAssembly.handlers.handleOpenIngredientsFromCooking();
          return;
        }
        args.overlay.openIngredientsSheet();
      },
      onOpenSetup: () => {
        if (args.runtimeController.openJourneyStageFromCooking('setup')) return;
        if (args.isCompoundRecipe) {
          args.cookingAssembly.handlers.handleOpenSetupFromCooking();
          return;
        }
        args.overlay.openRecipeSetupSheet();
      },
      onResetStandardTimer: () => {
        args.standardTimer.resetTimer();
        if (args.standardTimer.isExpired) args.standardTimer.togglePause();
      },
      onChangeMission: () => {
        args.compoundCooking.resetCompoundSession();
        args.cookingAssembly.handlers.handleChangeMission();
      },
      exitCurrentRecipe: args.runtimeController.exitCurrentRecipe,
    },
    overlayUi: {
      overlayModel: args.overlayModel,
    },
  });
}
