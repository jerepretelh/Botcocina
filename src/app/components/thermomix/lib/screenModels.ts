import type { MixedRecipeSearchResult, Recipe, Screen, WeeklyPlanItem } from '../../../../types';
import type {
  AIRecipeGenerationController,
  CompatCookingHandlers,
  CompoundCookingController,
  CookingProgressController,
  GlobalCategoryEntry,
  GlobalCategoryItem,
  RecipeSeedsController,
  RecipeSelectionController,
  StandardCookingController,
  StandardTimerController,
  ThermomixCookingAssembly,
  ThermomixOverlayModel,
  ThermomixRecipeRuntime,
  UserFavoritesController,
  WeeklyPlanController,
} from './controllerTypes';

export interface AppShellModel {
  appVersion: string;
  currentUserEmail: string | null;
  authSignOut: () => void | Promise<void>;
}

export interface OverlayUiModel {
  overlayModel: ThermomixOverlayModel;
}

export interface LibraryUiModel {
  screen: Screen;
  voiceEnabled: boolean;
  onVoiceToggle: () => void;
  speechSupported: boolean;
  ai: AIRecipeGenerationController;
  openAIWizard: () => void;
  recipeSeedSearchTerm: string;
  setRecipeSeedSearchTerm: (value: string) => void;
  mixedSearchResults: MixedRecipeSearchResult[];
  recipeSeeds: Pick<RecipeSeedsController, 'isLoading' | 'warning'>;
  recentPrivateRecipes: Recipe[];
  favoriteRecipeIds: UserFavoritesController['favoriteRecipeIds'];
  toggleFavorite: UserFavoritesController['toggleFavorite'];
  handleSearchResultSelect: (result: MixedRecipeSearchResult) => void;
  handleRecipeOpen: (recipe: Recipe) => void;
  openPlanForRecipe: (recipe: Recipe, sourceScreen: Screen) => void;
  navigate: (screen: Screen) => void;
  goBackScreen: (fallback: Screen) => void;
  globalCategories: GlobalCategoryEntry[];
  selectGlobalCategory: (categoryId: string | null) => void;
  globalCategoryItems: GlobalCategoryItem[];
  selectedCategoryMeta: RecipeSelectionController['selectedCategoryMeta'];
  privateUserRecipes: Recipe[];
  favoriteRecipes: Recipe[];
  availableRecipes: Recipe[];
  quickCookCompoundRecipe: (recipe: Recipe) => void;
}

export interface PlanningUiModel {
  screen: Screen;
  weeklyPlan: WeeklyPlanController;
  runtimeRecipesById: Map<string, Recipe>;
  navigate: (screen: Screen) => void;
  applyPlannedRecipeSnapshot: (item: WeeklyPlanItem, targetScreen: 'recipe-setup' | 'cooking') => void;
  editPlanItem: (item: WeeklyPlanItem) => void;
}

export interface CookingUiModel {
  screen: Screen;
  ai: AIRecipeGenerationController;
  recipeSelection: RecipeSelectionController;
  cookingProgress: CookingProgressController;
  selectedRecipe: Recipe | null;
  voiceEnabled: boolean;
  speechSupported: boolean;
  isCompoundRecipe: boolean;
  compoundCooking: CompoundCookingController;
  compoundPresentation: ThermomixCookingAssembly['compoundPresentation'];
  compoundPrimaryAction: { label: string; kind: string };
  handleCompoundPrimaryAction: () => void;
  scaledStandardRecipe: ThermomixRecipeRuntime['scaledStandardRecipe'];
  activeV2Ingredients: NonNullable<ThermomixRecipeRuntime['scaledStandardRecipe']>['ingredients'];
  standardPresentation: ThermomixCookingAssembly['standardPresentation'];
  standardCooking: StandardCookingController;
  standardTimer: StandardTimerController;
  standardPrimaryAction: { label: string; kind: string };
  handleStandardPrimaryAction: () => void;
  compatActions: CompatCookingHandlers;
  voice: ThermomixCookingAssembly['voice'];
  portionValue: number | null;
  effectiveReminderTitle: string | null;
  effectiveReminderMessage: string | null;
  isRetirarSubStep: boolean;
  retirarTitle: string | null;
  retirarMessage: string | null;
  onOpenIngredients: () => void;
  onOpenSetup: () => void;
  onResetStandardTimer: () => void;
  onChangeMission: () => void;
  exitCurrentRecipe: () => void;
}

export interface ThermomixScreenModelBundle {
  appShell: AppShellModel;
  libraryUi: LibraryUiModel;
  planningUi: PlanningUiModel;
  cookingUi: CookingUiModel;
  overlayUi: OverlayUiModel;
}
