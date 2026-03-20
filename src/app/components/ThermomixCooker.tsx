import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { MixedRecipeSearchResult, Recipe, RecipeCategoryId, Screen, WeeklyPlanItem, WeeklyPlanItemConfigSnapshot } from '../../types';
import { recipeCategories } from '../data/recipeCategories';

import {
  getIngredientKey,
  buildInitialIngredientSelection,
  clampNumber,
  normalizeText,
  splitIngredientQuantity,
  mapCountToPortion,
} from '../utils/recipeHelpers';

import { useRecipeSelection } from '../hooks/useRecipeSelection';
import { usePortions } from '../hooks/usePortions';
import { useCookingProgress } from '../hooks/useCookingProgress';
import { useAIRecipeGeneration } from '../hooks/useAIRecipeGeneration';
import { useAuthSession } from '../hooks/useAuthSession';
import { useUserFavorites } from '../hooks/useUserFavorites';
import { useUserLists } from '../hooks/useUserLists';
import { useUserRecipeConfigs } from '../hooks/useUserRecipeConfigs';
import { useWeeklyPlan } from '../hooks/useWeeklyPlan';
import { useRecipeSeeds } from '../hooks/useRecipeSeeds';
import { trackProductEvent } from '../lib/productEvents';
import { buildSavedRecipeSummary, deriveRecipeSetupBehavior } from '../lib/recipeSetupBehavior';
import { buildCookingSessionState } from '../lib/cookingSession';
import { GLOBAL_RECIPES_ALL_PATH, GLOBAL_RECIPES_HOME_PATH, isGlobalRecipesAllPath } from '../lib/globalRecipesRoute';
import { resolveRecipeOverlayHostScreen } from '../lib/recipeOverlayHostScreen';
import { matchesRecipeCategory } from '../lib/recipeCategoryMapping';
import { buildMixedRecipeSearchResults } from '../lib/mixedRecipeSearch';
import { isRecipeOverlayRoute, resolveOverlayPinnedRoute } from '../lib/recipeOverlayRoute';
import {
  resolveRecipeOverlayCloseDestination,
  resolveRecipeOverlayHostPath,
  resolveRecipePresentationMode,
} from '../lib/recipeNavigation';
import { resolveRoutableCategoryId } from '../lib/routableRecipeCategory';
import { resolveSubStepDisplayValue } from '../lib/recipeScaling';
import { hydratePlannedItemForRuntime } from '../lib/planningSnapshotV2';
import { resolvePersistedTargetYield } from '../lib/recipe-v2/resolvePersistedTargetYield';
import { buildCookingPresentationV2 } from '../lib/presentation/buildCookingPresentationV2';
import { buildCompoundCookingPresentationV2 } from '../lib/presentation/buildCompoundCookingPresentationV2';
import { isCanonicalRecipeV2 } from '../lib/recipe-v2/canonicalRecipeV2';

import { useThermomixVoice } from '../hooks/useThermomixVoice';
import { useThermomixTimer } from '../hooks/useThermomixTimer';
import { useThermomixHandlers } from '../hooks/useThermomixHandlers';
import { getCompoundConfigSignature, useCompoundCookingSessionV2 } from '../hooks/useCompoundCookingSessionV2';
import { useRecipeYield } from '../hooks/useRecipeYield';
import { useScaledRecipe } from '../hooks/useScaledRecipe';
import { useCookingProgressV2 } from '../hooks/useCookingProgressV2';
import { useThermomixTimerV2 } from '../hooks/useThermomixTimerV2';
import { resolveCookingPrimaryActionV2 } from '../lib/presentation/resolveCookingPrimaryActionV2';
import { resolveCompoundPrimaryActionV2 } from '../lib/presentation/resolveCompoundPrimaryActionV2';
import type { CookRuntimeBridgePayload } from '../features/recipe-journey/types';
import { createCookRuntimeEntryAdapter } from '../features/recipe-journey/compat/createCookRuntimeEntryAdapter';
import { createRecipeJourneyShellAdapter } from '../features/recipe-journey/compat/createRecipeJourneyShellAdapter';
import { isUnifiedJourneyEnabled } from '../features/recipe-journey/compat/isUnifiedJourneyEnabled';
import { buildRecipeJourneyViewModel } from '../features/recipe-journey/model/buildRecipeJourneyViewModel';
import { buildRecipeJourneyPath, parseRecipeJourneyRoute } from '../features/recipe-journey/router/recipeJourneyRoute';

import { CategorySelectScreen } from './screens/CategorySelectScreen';
import { IngredientsScreen } from './screens/IngredientsScreen';
import { RecipeLibraryScreen } from './screens/RecipeLibraryScreen';
import { GlobalRecipesScreen } from './screens/GlobalRecipesScreen';
import { GlobalRecipesCategoryScreen } from './screens/GlobalRecipesCategoryScreen';
import { formatVersionLabel } from '../lib/appMetadata';

const APPROX_GRAMS_PER_UNIT = 250;
const RecipeSetupScreen = lazy(() => import('./screens/RecipeSetupScreen').then((module) => ({ default: module.RecipeSetupScreen })));
const CookingScreen = lazy(() => import('./screens/CookingScreen').then((module) => ({ default: module.CookingScreen })));
const CookingScreenV2 = lazy(() => import('./screens/CookingScreenV2').then((module) => ({ default: module.CookingScreenV2 })));
const CompoundCookingScreen = lazy(() => import('./screens/CompoundCookingScreen').then((module) => ({ default: module.CompoundCookingScreen })));
const AIClarifyScreen = lazy(() => import('./screens/AIClarifyScreen').then((module) => ({ default: module.AIClarifyScreen })));
const DesignSystemScreen = lazy(() => import('./screens/DesignSystemScreen').then((module) => ({ default: module.DesignSystemScreen })));
const AISettingsScreen = lazy(() => import('./screens/AISettingsScreen').then((module) => ({ default: module.AISettingsScreen })));
const RecipeSeedSearchScreen = lazy(() => import('./screens/RecipeSeedSearchScreen').then((module) => ({ default: module.RecipeSeedSearchScreen })));
const WeeklyPlanScreen = lazy(() => import('./screens/WeeklyPlanScreen').then((module) => ({ default: module.WeeklyPlanScreen })));
const ShoppingListScreen = lazy(() => import('./screens/ShoppingListScreen').then((module) => ({ default: module.ShoppingListScreen })));
const ReleasesScreen = lazy(() => import('./screens/ReleasesScreen').then((module) => ({ default: module.ReleasesScreen })));
const BacklogScreen = lazy(() => import('./screens/BacklogScreen').then((module) => ({ default: module.BacklogScreen })));
const CompoundLabScreen = lazy(() => import('./screens/CompoundLabScreen').then((module) => ({ default: module.CompoundLabScreen })));
const PlanRecipeSheet = lazy(() => import('./screens/PlanRecipeSheet').then((module) => ({ default: module.PlanRecipeSheet })));
const RecipeSetupScreenV2 = lazy(() => import('./screens/RecipeSetupScreenV2').then((module) => ({ default: module.RecipeSetupScreenV2 })));
const IngredientsScreenV2 = lazy(() => import('./screens/IngredientsScreenV2').then((module) => ({ default: module.IngredientsScreenV2 })));
const RecipeJourneyHost = lazy(() => import('../features/recipe-journey/presentation/RecipeJourneyHost').then((module) => ({ default: module.RecipeJourneyHost })));

function ScreenFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-6 py-12">
      <div className="rounded-[1.5rem] border border-primary/10 bg-card/80 px-6 py-4 text-sm font-medium text-slate-500 shadow-sm dark:text-slate-400">
        Cargando pantalla...
      </div>
    </div>
  );
}

interface ThermomixCookerProps {
  auth: ReturnType<typeof useAuthSession>;
}

function dedupeRecipesById(recipes: Recipe[]): Recipe[] {
  const byId = new Map<string, Recipe>();
  for (const recipe of recipes) {
    byId.set(recipe.id, recipe);
  }
  return [...byId.values()];
}

const COMPOUND_DEMO_IDS = new Set([
  'arroz-lentejas-compuesto',
  'tallarines-rojos-compuesto',
]);

function getCompoundCookingStorageKey(recipeId: string, configSignature: string) {
  return `compound_cooking_progress_${recipeId}_${configSignature}`;
}

function getCompoundSavedSessionState(recipeId: string, configSignature: string | null): { hasSnapshot: boolean; isRecipeComplete: boolean } {
  if (!configSignature) return { hasSnapshot: false, isRecipeComplete: false };
  try {
    const raw = localStorage.getItem(getCompoundCookingStorageKey(recipeId, configSignature));
    if (!raw) return { hasSnapshot: false, isRecipeComplete: false };
    const parsed = JSON.parse(raw) as { isRecipeComplete?: boolean };
    return {
      hasSnapshot: true,
      isRecipeComplete: Boolean(parsed.isRecipeComplete),
    };
  } catch {
    return { hasSnapshot: false, isRecipeComplete: false };
  }
}

const COMPOUND_DEMO_FALLBACKS: Recipe[] = [
  {
    id: 'arroz-lentejas-compuesto',
    categoryId: 'arroces',
    name: 'Arroz con lentejas',
    icon: '🍛',
    emoji: '🍛',
    ingredient: 'Porciones',
    description: 'Fases guiadas · 45-55 min',
    experience: 'compound',
  },
  {
    id: 'tallarines-rojos-compuesto',
    categoryId: 'almuerzos',
    name: 'Tallarines rojos coordinados',
    icon: '🍝',
    emoji: '🍝',
    ingredient: 'Porciones',
    description: 'Salsa + pasta · flujo compuesto',
    experience: 'compound',
  },
];

function buildRecipeSignature(recipe: Recipe, content?: { ingredients: Array<{ name: string }>; steps: Array<{ stepName: string; subSteps: Array<{ subStepName: string }> }> } | null): string {
  const ingredientSignature = (content?.ingredients ?? [])
    .map((ingredient) => getIngredientKey(ingredient.name))
    .filter(Boolean)
    .sort()
    .join('|');
  const stepSignature = (content?.steps ?? [])
    .map((step) => normalizeText(`${step.stepName} ${step.subSteps.map((subStep) => subStep.subStepName).join(' ')}`))
    .filter(Boolean)
    .join('|');

  return [recipe.ownerUserId ?? '', recipe.visibility ?? 'public', normalizeText(recipe.name), normalizeText(recipe.ingredient), ingredientSignature, stepSignature].join('::');
}

function dedupeRecipesBySignature(
  recipes: Recipe[],
  recipeContentById: Record<string, { ingredients: Array<{ name: string }>; steps: Array<{ stepName: string; subSteps: Array<{ subStepName: string }> }> }>,
): Recipe[] {
  const bySignature = new Map<string, Recipe>();
  for (const recipe of recipes) {
    const signature = buildRecipeSignature(recipe, recipeContentById[recipe.id]);
    const existing = bySignature.get(signature);
    if (!existing) {
      bySignature.set(signature, recipe);
      continue;
    }
    const existingUpdatedAt = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
    const nextUpdatedAt = recipe.updatedAt ? new Date(recipe.updatedAt).getTime() : 0;
    if (nextUpdatedAt >= existingUpdatedAt) {
      bySignature.set(signature, recipe);
    }
  }
  return [...bySignature.values()];
}

export function ThermomixCooker({ auth }: ThermomixCookerProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const routeSyncRef = useRef(false);
  const lastProcessedRoutePathRef = useRef<string | null>(null);
  const recipeSelection = useRecipeSelection();
  const portions = usePortions({
    selectedRecipe: recipeSelection.selectedRecipe,
    activeRecipeContent: recipeSelection.activeRecipeContent,
    quantityMode: recipeSelection.quantityMode,
    amountUnit: recipeSelection.amountUnit,
    peopleCount: recipeSelection.peopleCount,
    availableCount: recipeSelection.availableCount,
    produceType: recipeSelection.produceType,
    produceSize: recipeSelection.produceSize,
    portion: recipeSelection.portion,
  });

  const cookingProgress = useCookingProgress({
    selectedRecipe: recipeSelection.selectedRecipe,
    activeRecipeContentSteps: recipeSelection.activeRecipeContent.steps,
    portion: recipeSelection.portion,
    cloudUserId: auth.userId,
  });
  const userLists = useUserLists({ userId: auth.userId });
  const userFavorites = useUserFavorites({ userId: auth.userId });
  const userRecipeConfigs = useUserRecipeConfigs({ userId: auth.userId });
  const weeklyPlan = useWeeklyPlan({
    userId: auth.userId,
    recipes: recipeSelection.availableRecipes,
    recipeContentById: recipeSelection.recipeContentById,
    recipeV2ById: recipeSelection.recipeV2ById,
    userRecipeConfigsByRecipeId: userRecipeConfigs.configsByRecipeId,
  });
  const [planningRecipe, setPlanningRecipe] = useState<Recipe | null>(null);
  const [editingPlanItem, setEditingPlanItem] = useState<WeeklyPlanItem | null>(null);
  const [planningInitialSnapshot, setPlanningInitialSnapshot] = useState<WeeklyPlanItemConfigSnapshot | null>(null);
  const [isPlanSheetOpen, setIsPlanSheetOpen] = useState(false);
  const [planSheetSourceScreen, setPlanSheetSourceScreen] = useState<Screen | null>(null);
  const [activePlannedRecipeItemId, setActivePlannedRecipeItemId] = useState<string | null>(null);
  const [isRecipeSetupSheetOpen, setIsRecipeSetupSheetOpen] = useState(false);
  const [isIngredientsSheetOpen, setIsIngredientsSheetOpen] = useState(false);
  const [recipeOverlayPinnedPath, setRecipeOverlayPinnedPath] = useState<string | null>(null);
  const [recipeOverlayHostScreen, setRecipeOverlayHostScreen] = useState<Screen | null>(null);
  const [recipeOverlayHostPath, setRecipeOverlayHostPath] = useState<string | null>(null);
  const currentScreenRef = useRef<Screen>(recipeSelection.screen);
  const currentRecipeOverlayHostScreenRef = useRef<Screen | null>(null);
  const [recipeSeedSearchTerm, setRecipeSeedSearchTerm] = useState('');
  const recipeSeeds = useRecipeSeeds({
    searchTerm: recipeSeedSearchTerm,
    limit: 48,
  });
  const appVersion = formatVersionLabel();
  const uniqueAvailableRecipes = useMemo(
    () => dedupeRecipesById(recipeSelection.availableRecipes),
    [recipeSelection.availableRecipes],
  );

  const aiRecipeGen = useAIRecipeGeneration({
    availableRecipes: recipeSelection.availableRecipes,
    recipeContentById: recipeSelection.recipeContentById,
    setAvailableRecipes: recipeSelection.setAvailableRecipes,
    setRecipeContentById: recipeSelection.setRecipeContentById,
    setIngredientSelectionByRecipe: recipeSelection.setIngredientSelectionByRecipe,
    setSelectedCategory: recipeSelection.setSelectedCategory,
    setSelectedRecipe: recipeSelection.setSelectedRecipe,
    setScreen: recipeSelection.setScreen,
    setIngredientsBackScreen: recipeSelection.setIngredientsBackScreen,
    setCookingSteps: cookingProgress.setCookingSteps,
    setQuantityMode: recipeSelection.setQuantityMode,
    setAmountUnit: recipeSelection.setAmountUnit,
    setAvailableCount: recipeSelection.setAvailableCount,
    setPortion: recipeSelection.setPortion,
    setPeopleCount: recipeSelection.setPeopleCount,
    setTimerScaleFactor: cookingProgress.setTimerScaleFactor,
    setTimingAdjustedLabel: cookingProgress.setTimingAdjustedLabel,
    setCurrentStepIndex: cookingProgress.setCurrentStepIndex,
    setCurrentSubStepIndex: cookingProgress.setCurrentSubStepIndex,
    setIsRunning: cookingProgress.setIsRunning,
    setActiveStepLoop: cookingProgress.setActiveStepLoop,
    setFlipPromptVisible: cookingProgress.setFlipPromptVisible,
    setPendingFlipAdvance: cookingProgress.setPendingFlipAdvance,
    setFlipPromptCountdown: cookingProgress.setFlipPromptCountdown,
    setStirPromptVisible: cookingProgress.setStirPromptVisible,
    setPendingStirAdvance: cookingProgress.setPendingStirAdvance,
    setStirPromptCountdown: cookingProgress.setStirPromptCountdown,
    setAwaitingNextUnitConfirmation: cookingProgress.setAwaitingNextUnitConfirmation,
    aiUserId: auth.userId,
    addRecipeToDefaultList: userLists.addRecipeToDefaultList,
    setRecipeV2ById: recipeSelection.setRecipeV2ById,
  });

  const {
    screen,
    voiceEnabled,
    setVoiceEnabled,
    voiceStatus,
    setVoiceStatus,
    currentStepIndex,
    currentSubStepIndex,
    currentSubStep,
    portion,
    flipPromptVisible,
    stirPromptVisible,
    currentStep,
    isRecipeFinished,
  } = { ...recipeSelection, ...cookingProgress, ...aiRecipeGen };
  const isCompoundRecipe = recipeSelection.selectedRecipe?.experience === 'compound' && Boolean(recipeSelection.activeRecipeContent.compoundMeta);
  const currentRecipeV2 = recipeSelection.selectedRecipeV2;
  const canonicalRecipeV2 = currentRecipeV2 && isCanonicalRecipeV2(currentRecipeV2) ? currentRecipeV2 : null;
  // Boundary note:
  // - unified journey: preferred path for recipes explicitly migrated to the new contract
  // - fallback legacy: compat path for everything not migrated yet
  const isUnifiedJourneyRecipe = isUnifiedJourneyEnabled(recipeSelection.selectedRecipe?.id);
  const setupRecipeV2 = isUnifiedJourneyRecipe
    ? currentRecipeV2
    : !isCompoundRecipe
      ? currentRecipeV2
      : null;
  const hasSetupRecipeV2 = Boolean(setupRecipeV2);
  const hasRecipeV2 = Boolean(canonicalRecipeV2);
  const standardRecipeV2 = !isCompoundRecipe ? canonicalRecipeV2 : null;
  const compoundRecipeV2 = isCompoundRecipe ? currentRecipeV2 : null;
  const standardYield = useRecipeYield({
    recipe: setupRecipeV2,
    initialTargetYield:
      setupRecipeV2 && recipeSelection.targetYield?.type === setupRecipeV2.baseYield.type
        ? recipeSelection.targetYield
        : setupRecipeV2?.baseYield ?? null,
  });
  const scaledStandardRecipe = useScaledRecipe({
    recipe: canonicalRecipeV2,
    targetYield: standardYield.selectedYield,
    cookingContext: recipeSelection.cookingContext,
    requireCanonical: true,
  });
  const scaledJourneyRecipe = useScaledRecipe({
    recipe: setupRecipeV2,
    targetYield: standardYield.selectedYield,
    cookingContext: recipeSelection.cookingContext,
  });
  const isStandardRecipeV2 = Boolean(canonicalRecipeV2 && scaledStandardRecipe);
  const scaledCompoundRecipe = compoundRecipeV2 ? scaledStandardRecipe : null;
  const standardCooking = useCookingProgressV2({
    recipe: scaledStandardRecipe,
  });
  const standardTimer = useThermomixTimerV2({
    currentSubStep: standardCooking.currentSubStep,
    active: screen === 'cooking' && isStandardRecipeV2,
  });
  const compoundCooking = useCompoundCookingSessionV2({
    selectedRecipe: recipeSelection.selectedRecipe,
    scaledRecipe: scaledCompoundRecipe,
    screen,
  });
  const cookingFlowFinished = isCompoundRecipe
    ? compoundCooking.isRecipeComplete
    : hasRecipeV2
      ? standardCooking.isRecipeFinished
      : isRecipeFinished;

  const recipesForCurrentView = uniqueAvailableRecipes.filter((recipe) => {
    if (userLists.catalogViewMode === 'platform') {
      return (recipe.visibility ?? 'public') === 'public';
    }
    if (userLists.catalogViewMode === 'my-lists') {
      return userLists.activeListRecipeIds.has(recipe.id);
    }
    return true;
  });

  const visibleRecipesForCurrentView = recipeSelection.selectedCategory
    ? recipesForCurrentView.filter((recipe) => matchesRecipeCategory(recipeSelection.selectedCategory, recipe.categoryId))
    : [];
  const publicLocalV2LibraryRecipes = useMemo(() => {
    const existingRecipeIds = new Set(uniqueAvailableRecipes.map((recipe) => recipe.id));

    return Object.values(recipeSelection.recipeV2ById)
      .filter((recipeV2) => recipeV2.isCoreRecipe)
      .filter((recipeV2) => !existingRecipeIds.has(recipeV2.id))
      .filter((recipeV2) => Boolean(recipeV2.categoryId))
      .map((recipeV2): Recipe => ({
        id: recipeV2.id,
        categoryId: recipeV2.categoryId as RecipeCategoryId,
        name: recipeV2.name,
        icon: recipeV2.icon ?? '🍳',
        ingredient: recipeV2.ingredient ?? 'receta',
        description: recipeV2.description ?? 'Receta disponible',
        experience: recipeV2.experience,
        visibility: 'public',
      }));
  }, [recipeSelection.recipeV2ById, uniqueAvailableRecipes]);
  const publicRecipes = useMemo(
    () => [
      ...uniqueAvailableRecipes.filter((recipe) => (recipe.visibility ?? 'public') === 'public'),
      ...publicLocalV2LibraryRecipes,
    ],
    [publicLocalV2LibraryRecipes, uniqueAvailableRecipes],
  );
  const selectableRecipesById = useMemo(
    () => new Map(publicRecipes.map((recipe) => [recipe.id, recipe])),
    [publicRecipes],
  );
  const globalCategories = useMemo(
    () => [
      {
        category: {
          id: 'all' as const,
          name: 'Todas',
          icon: '📚',
          description: 'Todas las recetas públicas disponibles en la fuente actual.',
        },
        recipeCount: publicRecipes.length,
      },
      ...recipeCategories
        .filter((category) => category.id !== 'personalizadas')
        .map((category) => ({
          category,
          recipeCount: publicRecipes.filter((recipe) => matchesRecipeCategory(category.id, recipe.categoryId)).length,
        }))
        .filter((entry) => entry.recipeCount > 0),
    ],
    [publicRecipes],
  );
  const globalCategoryItems = useMemo(() => {
    if (!recipeSelection.selectedCategory) {
      return publicRecipes
        .map((recipe) => ({ id: `recipe:${recipe.id}`, kind: 'recipe' as const, recipe }))
        .sort((a, b) => (a.recipe?.name ?? '').localeCompare(b.recipe?.name ?? ''));
    }

    const recipeItems = publicRecipes
      .filter((recipe) => matchesRecipeCategory(recipeSelection.selectedCategory, recipe.categoryId))
      .map((recipe) => ({ id: `recipe:${recipe.id}`, kind: 'recipe' as const, recipe }));

    return recipeItems.sort((a, b) => (a.recipe?.name ?? '').localeCompare(b.recipe?.name ?? ''));
  }, [publicRecipes, recipeSelection.selectedCategory]);
  const privateUserRecipes = dedupeRecipesBySignature(
    uniqueAvailableRecipes
    .filter((recipe) => recipe.ownerUserId === auth.userId && (recipe.visibility ?? 'public') === 'private')
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    }),
    recipeSelection.recipeContentById,
  );
  const recentPrivateRecipes = privateUserRecipes.slice(0, 4);
  const mixedSearchResults = useMemo(
    () =>
      buildMixedRecipeSearchResults({
        query: recipeSeedSearchTerm,
        recipes: uniqueAvailableRecipes,
        seeds: recipeSeeds.seeds,
        categories: recipeCategories,
        limit: recipeSeedSearchTerm.trim() ? 8 : 10,
      }),
    [recipeSeedSearchTerm, uniqueAvailableRecipes, recipeSeeds.seeds],
  );
  const favoriteRecipes = dedupeRecipesBySignature(
    uniqueAvailableRecipes.filter((recipe) => userFavorites.favoriteRecipeIds.has(recipe.id)),
    recipeSelection.recipeContentById,
  );
  const selectedRecipeSavedConfig = recipeSelection.selectedRecipe
    ? userRecipeConfigs.configsByRecipeId[recipeSelection.selectedRecipe.id] ?? null
    : null;
  const selectedRecipeSetupBehavior = deriveRecipeSetupBehavior(
    recipeSelection.selectedRecipe,
    recipeSelection.activeRecipeContent,
    selectedRecipeSavedConfig,
  );
  const selectedRecipeSavedSummary = buildSavedRecipeSummary(selectedRecipeSavedConfig);

  useEffect(() => {
    if (!standardYield.selectedYield) return;
    recipeSelection.setTargetYield(standardYield.selectedYield);
  }, [recipeSelection.setTargetYield, standardYield.selectedYield]);

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

  const openRecipeSetupSheet = () => {
    setIsIngredientsSheetOpen(false);
    setIsRecipeSetupSheetOpen(true);
  };

  const restoreRecipeOverlayHostRoute = () => {
    const destination = resolveRecipeOverlayCloseDestination({
      currentScreen: screen,
      currentHostScreen: recipeOverlayHostScreen,
      explicitHostPath: recipeOverlayHostPath,
      selectedCategory: recipeSelection.selectedCategory,
    });
    setRecipeOverlayHostScreen(null);
    setRecipeOverlayHostPath(null);
    recipeSelection.setScreenDirect(destination.screen);
    navigate(destination.path);
  };

  const closeRecipeSetupSheet = () => {
    setIsRecipeSetupSheetOpen(false);
    setRecipeOverlayPinnedPath(null);
    if (isRecipeOverlayRoute(location.pathname)) {
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
    if (isRecipeOverlayRoute(location.pathname)) {
      restoreRecipeOverlayHostRoute();
    }
  };

  const closeUnifiedJourneyOverlay = () => {
    const destination = resolveRecipeOverlayCloseDestination({
      currentScreen: screen,
      currentHostScreen: recipeOverlayHostScreen,
      explicitHostPath: recipeOverlayHostPath,
      selectedCategory: recipeSelection.selectedCategory,
    });

    resetRecipeOverlayNavigationContext();
    if (destination.screen !== 'recipe-select') {
      recipeSelection.setSelectedCategory(null);
    }
    recipeSelection.setScreenDirect(destination.screen);
    navigate(destination.path);
  };

  const parsedJourneyRoute = parseRecipeJourneyRoute(location.pathname);
  const shouldRenderUnifiedJourneyPage = Boolean(
    isUnifiedJourneyEnabled(parsedJourneyRoute.recipeId) &&
    parsedJourneyRoute.isValid &&
    parsedJourneyRoute.stage &&
    parsedJourneyRoute.stage !== 'cook'
  );

  const unifiedJourneyViewModel = buildRecipeJourneyViewModel({
    recipe: recipeSelection.selectedRecipe,
    recipeV2: setupRecipeV2,
    pathname: location.pathname,
    returnTo: recipeOverlayHostPath,
    presentationMode: 'page',
    selectedYield: standardYield.selectedYield,
    selectedCookingContext: recipeSelection.cookingContext,
    activeIngredientSelection: recipeSelection.activeIngredientSelectionV2,
  });
  const shouldRenderUnifiedJourneyOverlay = Boolean(isUnifiedJourneyRecipe && setupRecipeV2 && !shouldRenderUnifiedJourneyPage);
  const shouldRenderSetupV2Fallback = Boolean(!shouldRenderUnifiedJourneyOverlay && hasSetupRecipeV2);
  const shouldRenderLegacySetupFallback = Boolean(!shouldRenderUnifiedJourneyOverlay && !hasSetupRecipeV2);
  const shouldRenderIngredientsV2Fallback = Boolean(!shouldRenderUnifiedJourneyOverlay && hasRecipeV2);
  const shouldRenderLegacyIngredientsFallback = Boolean(!shouldRenderUnifiedJourneyOverlay && !hasRecipeV2);
  const shouldRenderCookingV2Path = Boolean(hasRecipeV2);

  const handleStandardIngredientToggle = (ingredientId: string) => {
    if (!canonicalRecipeV2) return;
    const recipeId = canonicalRecipeV2.id;
    recipeSelection.setIngredientSelectionByRecipe((prev) => {
      const current = prev[recipeId] ?? Object.fromEntries(canonicalRecipeV2.ingredients.map((ingredient) => [ingredient.id, true]));
      return {
        ...prev,
        [recipeId]: {
          ...current,
          [ingredientId]: !(current[ingredientId] ?? true),
        },
      };
    });
  };

  const hydrateRecipeSelection = (recipe: Recipe) => {
    const content = recipeSelection.recipeContentById[recipe.id] ?? null;
    const recipeV2 = recipeSelection.recipeV2ById[recipe.id] ?? null;
    const savedConfig = userRecipeConfigs.configsByRecipeId[recipe.id] ?? null;
    const setupBehavior = deriveRecipeSetupBehavior(recipe, content, savedConfig);
    const resolvedCategoryId = resolveRoutableCategoryId(recipe.categoryId);

    if (content && !recipeSelection.ingredientSelectionByRecipe[recipe.id]) {
      const baseSelection = buildInitialIngredientSelection(content.ingredients);
      const optionalKeys = savedConfig?.selectedOptionalIngredients ?? null;
      const hydratedSelection = optionalKeys
        ? Object.fromEntries(
          Object.entries(baseSelection).map(([key]) => {
            const ingredient = content.ingredients.find((item) => getIngredientKey(item.name) === key);
            if (ingredient?.indispensable) return [key, true];
            return [key, optionalKeys.includes(key)];
          }),
        )
        : baseSelection;
      recipeSelection.setIngredientSelectionByRecipe((prev) => ({
        ...prev,
        [recipe.id]: hydratedSelection,
      }));
    }

    recipeSelection.setSelectedRecipe(recipe);
    recipeSelection.setSelectedCategory(resolvedCategoryId);
    if (recipeV2) {
      recipeSelection.setTargetYield(
        resolvePersistedTargetYield(
          recipeV2,
          savedConfig?.targetYield,
        ),
      );
      recipeSelection.setCookingContext(savedConfig?.cookingContext ?? recipeV2.cookingContextDefaults ?? null);
      if (!recipeSelection.ingredientSelectionByRecipe[recipe.id]) {
        recipeSelection.setIngredientSelectionByRecipe((prev) => ({
          ...prev,
          [recipe.id]: Object.fromEntries(recipeV2.ingredients.map((ingredient) => [ingredient.id, true])),
        }));
      }
    }
    if (!recipeV2) {
      recipeSelection.setCookingContext(null);
    }

    const resolvedQuantityMode =
      savedConfig && (setupBehavior === 'saved_config_first' || setupBehavior === 'servings_or_quantity')
        ? (setupBehavior !== 'servings_only' && savedConfig.quantityMode === 'have' ? 'have' : 'people')
        : 'people';
    const resolvedPeopleCount = savedConfig?.peopleCount ?? recipe.basePortions ?? 2;
    const resolvedAvailableCount = savedConfig?.availableCount ?? 2;
    const resolvedAmountUnit = savedConfig?.amountUnit ?? 'units';

    if (savedConfig && (setupBehavior === 'saved_config_first' || setupBehavior === 'servings_or_quantity')) {
      recipeSelection.setQuantityMode(resolvedQuantityMode);
      recipeSelection.setPeopleCount(resolvedPeopleCount);
      recipeSelection.setAvailableCount(resolvedAvailableCount);
      recipeSelection.setAmountUnit(resolvedAmountUnit);
    } else {
      recipeSelection.setQuantityMode('people');
      recipeSelection.setPeopleCount(recipe.basePortions ?? 2);
      recipeSelection.setAvailableCount(2);
      recipeSelection.setAmountUnit('units');
    }

    const resolvedPortion = resolvedQuantityMode === 'people'
      ? mapCountToPortion(resolvedPeopleCount)
      : mapCountToPortion(
          resolvedAmountUnit === 'grams'
            ? Math.max(1, Math.round(resolvedAvailableCount / 250))
            : resolvedAvailableCount,
        );
    recipeSelection.setPortion(resolvedPortion);

    return {
      content,
      hydratedSelection: content
        ? (recipeSelection.ingredientSelectionByRecipe[recipe.id] ?? buildInitialIngredientSelection(content.ingredients))
        : {},
      quantityMode: resolvedQuantityMode,
      peopleCount: resolvedPeopleCount,
      amountUnit: resolvedAmountUnit,
      availableCount: resolvedAvailableCount,
      portion: resolvedPortion,
      recipeV2,
    };
  };

  const initializeCookingBase = (
    recipe: Recipe,
    options?: {
      content?: typeof recipeSelection.activeRecipeContent | null;
      activeIngredientSelection?: Record<string, boolean>;
      quantityMode?: 'people' | 'have';
      peopleCount?: number;
      amountUnit?: 'units' | 'grams';
      availableCount?: number;
      portion?: typeof recipeSelection.portion;
      scaleFactor?: number;
      timingLabel?: string;
    },
  ) => {
    const content = options?.content ?? recipeSelection.recipeContentById[recipe.id] ?? null;
    if (!content) return;
    if (recipe.experience === 'compound') {
      resetLegacyCookingRuntimeState({
        scaleFactor: options?.scaleFactor,
        timingLabel: options?.timingLabel,
      });
      return;
    }

    const quantityMode = options?.quantityMode ?? recipeSelection.quantityMode;
    const peopleCount = options?.peopleCount ?? recipeSelection.peopleCount;
    const amountUnit = options?.amountUnit ?? recipeSelection.amountUnit;
    const availableCount = options?.availableCount ?? recipeSelection.availableCount;
    const portion = options?.portion ?? recipeSelection.portion;
    const activeIngredientSelection = options?.activeIngredientSelection
      ?? recipeSelection.ingredientSelectionByRecipe[recipe.id]
      ?? buildInitialIngredientSelection(content.ingredients);
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

    cookingProgress.setCookingSteps(session.steps);
    cookingProgress.setActiveStepLoop(session.activeStepLoop);
    cookingProgress.setCurrentStepIndex(0);
    cookingProgress.setCurrentSubStepIndex(0);
    cookingProgress.setIsRunning(false);
    cookingProgress.setFlipPromptVisible(false);
    cookingProgress.setPendingFlipAdvance(false);
    cookingProgress.setFlipPromptCountdown(0);
    cookingProgress.setStirPromptVisible(false);
    cookingProgress.setPendingStirAdvance(false);
    cookingProgress.setStirPromptCountdown(0);
    cookingProgress.setAwaitingNextUnitConfirmation(false);
    cookingProgress.setTimerScaleFactor(scaleFactor);
    cookingProgress.setTimingAdjustedLabel(options?.timingLabel ?? 'Tiempo estándar');
  };

  function resetLegacyCookingRuntimeState(options?: {
    scaleFactor?: number;
    timingLabel?: string;
  }) {
    cookingProgress.setCookingSteps(null);
    cookingProgress.setActiveStepLoop(null);
    cookingProgress.setCurrentStepIndex(0);
    cookingProgress.setCurrentSubStepIndex(0);
    cookingProgress.setIsRunning(false);
    cookingProgress.setFlipPromptVisible(false);
    cookingProgress.setPendingFlipAdvance(false);
    cookingProgress.setFlipPromptCountdown(0);
    cookingProgress.setStirPromptVisible(false);
    cookingProgress.setPendingStirAdvance(false);
    cookingProgress.setStirPromptCountdown(0);
    cookingProgress.setAwaitingNextUnitConfirmation(false);
    cookingProgress.setTimerScaleFactor(options?.scaleFactor ?? 1);
    cookingProgress.setTimingAdjustedLabel(options?.timingLabel ?? 'Tiempo estándar');
  }

  const enterRecipeCookingRuntime = (args: {
    recipe: Recipe;
    recipeV2: ReturnType<typeof hydrateRecipeSelection>['recipeV2'] | null;
    useDirectScreen?: boolean;
    legacyOptions?: {
      content?: typeof recipeSelection.activeRecipeContent | null;
      activeIngredientSelection?: Record<string, boolean>;
      quantityMode?: 'people' | 'have';
      peopleCount?: number;
      amountUnit?: 'units' | 'grams';
      availableCount?: number;
      portion?: typeof recipeSelection.portion;
      scaleFactor?: number;
      timingLabel?: string;
    };
  }) => {
    const { recipe, recipeV2, useDirectScreen = false, legacyOptions } = args;
    const setCookingScreen = useDirectScreen ? recipeSelection.setScreenDirect : recipeSelection.setScreen;

    if (recipe.experience === 'compound') {
      resolveCompoundCookingEntry(recipe);
      resetLegacyCookingRuntimeState();
    } else if (recipeV2) {
      standardCooking.reset();
      standardTimer.resetTimer();
    } else {
      initializeCookingBase(recipe, legacyOptions);
    }

    clearRecipeOverlaySheets();
    setCookingScreen('cooking');
  };

  const handleCreateList = async () => {
    const name = window.prompt('Nombre de la nueva lista');
    if (!name?.trim()) return;
    await userLists.createUserList(name.trim());
  };

  const handleRenameList = async () => {
    if (!userLists.activeListId || !userLists.activeList) return;
    const name = window.prompt('Nuevo nombre de la lista', userLists.activeList.name);
    if (!name?.trim()) return;
    await userLists.renameUserList(userLists.activeListId, name.trim());
  };

  const handleDeleteList = async () => {
    if (!userLists.activeListId || !userLists.activeList) return;
    if (userLists.activeList.isDefault) {
      window.alert('No puedes eliminar la lista por defecto.');
      return;
    }
    const ok = window.confirm(`¿Eliminar la lista "${userLists.activeList.name}"?`);
    if (!ok) return;
    await userLists.deleteUserList(userLists.activeListId);
  };

  const closePlanSheet = () => {
    setIsPlanSheetOpen(false);
    setPlanningRecipe(null);
    setEditingPlanItem(null);
    setPlanningInitialSnapshot(null);
    setPlanSheetSourceScreen(null);
  };

  const hasTrackedHomeRef = useRef(false);
  const previousCookingPositionRef = useRef<{ step: number; subStep: number } | null>(null);
  const previousScreenRef = useRef<Screen>(screen);

  currentScreenRef.current = screen;
  currentRecipeOverlayHostScreenRef.current = recipeOverlayHostScreen;

  useEffect(() => {
    const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';
    const isHydrationSensitivePath = /^\/(?:categorias|recetas-globales)\/[^/]+$/.test(normalizedPath)
      || /^\/recetas\/[^/]+\/(configurar|ingredientes|cocinar)$/.test(normalizedPath);

    if (lastProcessedRoutePathRef.current === normalizedPath && !isHydrationSensitivePath) {
      return;
    }

    lastProcessedRoutePathRef.current = normalizedPath;

    routeSyncRef.current = true;

    if (normalizedPath === '/') {
      recipeSelection.setSelectedCategory(null);
      recipeSelection.setScreenDirect('category-select');
      return;
    }

    if (normalizedPath === '/ia/aclarar') {
      recipeSelection.setScreenDirect('ai-clarify');
      return;
    }
    if (normalizedPath === GLOBAL_RECIPES_HOME_PATH) {
      recipeSelection.setSelectedCategory(null);
      recipeSelection.setScreenDirect('global-recipes');
      return;
    }
    if (isGlobalRecipesAllPath(normalizedPath)) {
      recipeSelection.setSelectedCategory(null);
      recipeSelection.setScreenDirect('recipe-select');
      return;
    }
    if (normalizedPath === '/buscar-recetas') {
      recipeSelection.setScreenDirect('recipe-seed-search');
      return;
    }
    if (normalizedPath === '/design-system') {
      recipeSelection.setScreenDirect('design-system');
      return;
    }
    if (normalizedPath === '/ajustes' || normalizedPath === '/ajustes/ia') {
      recipeSelection.setScreenDirect('ai-settings');
      return;
    }
    if (normalizedPath === '/releases') {
      recipeSelection.setScreenDirect('releases');
      return;
    }
    if (normalizedPath === '/backlog') {
      recipeSelection.setScreenDirect('backlog');
      return;
    }
    if (normalizedPath === '/mis-recetas') {
      recipeSelection.setScreenDirect('my-recipes');
      return;
    }
    if (normalizedPath === '/favoritos') {
      recipeSelection.setScreenDirect('favorites');
      return;
    }
    if (normalizedPath === '/plan-semanal') {
      recipeSelection.setScreenDirect('weekly-plan');
      return;
    }
    if (normalizedPath === '/compras') {
      recipeSelection.setScreenDirect('shopping-list');
      return;
    }
    if (normalizedPath === '/experimentos/recetas-compuestas') {
      recipeSelection.setScreenDirect('compound-lab');
      return;
    }

    const categoryMatch = normalizedPath.match(/^\/(?:categorias|recetas-globales)\/([^/]+)$/);
    if (categoryMatch) {
      const categoryId = decodeURIComponent(categoryMatch[1]);
      const isValidCategory = recipeCategories.some((category) => category.id === categoryId);
      if (!isValidCategory) {
        routeSyncRef.current = false;
        navigate('/', { replace: true });
        return;
      }
      recipeSelection.setSelectedCategory(categoryId as RecipeCategoryId);
      recipeSelection.setScreenDirect('recipe-select');
      return;
    }

    const recipeStageMatch = normalizedPath.match(/^\/recetas\/([^/]+)\/(configurar|ingredientes|cocinar)$/);
    if (recipeStageMatch) {
      const recipeId = decodeURIComponent(recipeStageMatch[1]);
      const stage = recipeStageMatch[2];
      const recipe = selectableRecipesById.get(recipeId)
        ?? recipeSelection.availableRecipes.find((item) => item.id === recipeId);

      if (!recipe) {
        if (recipeSelection.isSyncingCatalog) return;
        routeSyncRef.current = false;
        navigate('/', { replace: true });
        return;
      }

      const hydratedRecipe = hydrateRecipeSelection(recipe);
      const overlayHostScreen = resolveRecipeOverlayHostScreen(
        currentScreenRef.current,
        currentRecipeOverlayHostScreenRef.current,
      );
      const presentationMode = resolveRecipePresentationMode(isUnifiedJourneyEnabled(recipe.id));

      if (stage === 'configurar') {
        cookingProgress.setTimerScaleFactor(1);
        cookingProgress.setTimingAdjustedLabel('Tiempo estándar');
        recipeSelection.setScreenDirect(overlayHostScreen);
        setRecipeOverlayHostScreen(overlayHostScreen);
        if (presentationMode === 'journey-page') {
          setIsRecipeSetupSheetOpen(false);
          setIsIngredientsSheetOpen(false);
          setRecipeOverlayPinnedPath(null);
        } else {
          setRecipeOverlayPinnedPath(normalizedPath);
          openRecipeSetupSheet();
        }
      } else if (stage === 'ingredientes') {
        cookingProgress.setTimerScaleFactor(1);
        cookingProgress.setTimingAdjustedLabel('Tiempo estándar');
        recipeSelection.setScreenDirect(overlayHostScreen);
        setRecipeOverlayHostScreen(overlayHostScreen);
        if (presentationMode === 'journey-page') {
          setIsRecipeSetupSheetOpen(false);
          setIsIngredientsSheetOpen(false);
          setRecipeOverlayPinnedPath(null);
        } else {
          setRecipeOverlayPinnedPath(normalizedPath);
          openIngredientsSheet();
        }
      } else {
        enterRecipeCookingRuntime({
          recipe,
          recipeV2: hydratedRecipe?.recipeV2 ?? null,
          useDirectScreen: true,
          legacyOptions: {
            content: hydratedRecipe?.content ?? null,
            activeIngredientSelection: hydratedRecipe?.hydratedSelection,
            quantityMode: hydratedRecipe?.quantityMode,
            peopleCount: hydratedRecipe?.peopleCount,
            amountUnit: hydratedRecipe?.amountUnit,
            availableCount: hydratedRecipe?.availableCount,
            portion: hydratedRecipe?.portion,
          },
        });
      }
      return;
    }

    routeSyncRef.current = false;
    navigate('/', { replace: true });
  }, [location.pathname, recipeSelection.availableRecipes, recipeSelection.isSyncingCatalog, userRecipeConfigs.configsByRecipeId, recipeSelection.recipeContentById, recipeSelection.ingredientSelectionByRecipe, selectableRecipesById]);

  useEffect(() => {
    if (routeSyncRef.current) {
      routeSyncRef.current = false;
      return;
    }

    const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';
    if (
      parsedJourneyRoute.isValid &&
      parsedJourneyRoute.stage &&
      parsedJourneyRoute.stage !== 'cook' &&
      isUnifiedJourneyEnabled(parsedJourneyRoute.recipeId)
    ) {
      return;
    }

    // During initial hydration, preserve the explicit "Todas" route long enough
    // for route -> state sync to settle instead of rewriting it back to home.
    if (
      screen === 'category-select' &&
      !isRecipeSetupSheetOpen &&
      !isIngredientsSheetOpen &&
      isGlobalRecipesAllPath(normalizedPath)
    ) {
      return;
    }

    const recipeId = recipeSelection.selectedRecipe?.id ? encodeURIComponent(recipeSelection.selectedRecipe.id) : null;
    const categoryId = recipeSelection.selectedCategory ? encodeURIComponent(recipeSelection.selectedCategory) : null;

    const pinnedOverlayPath =
      recipeOverlayPinnedPath && (isRecipeSetupSheetOpen || isIngredientsSheetOpen) && screen !== 'cooking'
        ? recipeOverlayPinnedPath
        : null;

    const targetPath = pinnedOverlayPath
      ?? (screen === 'design-system'
        ? '/design-system'
        : screen === 'recipe-seed-search'
          ? '/buscar-recetas'
          : screen === 'ai-settings'
            ? '/ajustes'
          : screen === 'releases'
            ? '/releases'
            : screen === 'backlog'
              ? '/backlog'
              : screen === 'compound-lab'
                ? '/experimentos/recetas-compuestas'
                : screen === 'my-recipes'
                  ? '/mis-recetas'
                  : screen === 'favorites'
                    ? '/favoritos'
                    : screen === 'weekly-plan'
                      ? '/plan-semanal'
                      : screen === 'shopping-list'
                        ? '/compras'
                        : screen === 'ai-clarify'
                          ? '/ia/aclarar'
                          : resolveOverlayPinnedRoute({
                              screen,
                              recipeId,
                              selectedCategory: categoryId,
                              isRecipeSetupSheetOpen,
                              isIngredientsSheetOpen,
                              recipeOverlayPinnedPath,
                            }));

    if (!targetPath) {
      return;
    }

    if (location.pathname !== targetPath) {
      navigate(targetPath);
    }
  }, [screen, recipeSelection.selectedCategory, recipeSelection.selectedRecipe?.id, location.pathname, navigate, isRecipeSetupSheetOpen, isIngredientsSheetOpen, recipeOverlayPinnedPath]);

  useEffect(() => {
    if (!auth.userId) return;
    if (screen !== 'category-select') {
      hasTrackedHomeRef.current = false;
      return;
    }
    if (hasTrackedHomeRef.current) return;
    hasTrackedHomeRef.current = true;
    void trackProductEvent(auth.userId, 'home_open');
  }, [auth.userId, screen]);

  useEffect(() => {
    if (!auth.userId) return;
    const prev = previousScreenRef.current;
    if (screen === 'cooking' && prev !== 'cooking' && recipeSelection.selectedRecipe) {
      void trackProductEvent(auth.userId, 'recipe_start', {
        recipeId: recipeSelection.selectedRecipe.id,
      });
      previousCookingPositionRef.current = { step: currentStepIndex, subStep: currentSubStepIndex };
    }
    previousScreenRef.current = screen;
  }, [screen, auth.userId, recipeSelection.selectedRecipe, currentStepIndex, currentSubStepIndex]);

  useEffect(() => {
    if (!auth.userId || screen !== 'cooking' || !recipeSelection.selectedRecipe) return;
    const previous = previousCookingPositionRef.current;
    if (!previous) {
      previousCookingPositionRef.current = { step: currentStepIndex, subStep: currentSubStepIndex };
      return;
    }

    if (currentStepIndex !== previous.step || currentSubStepIndex !== previous.subStep) {
      void trackProductEvent(auth.userId, 'step_next', {
        recipeId: recipeSelection.selectedRecipe.id,
        stepIndex: currentStepIndex,
        subStepIndex: currentSubStepIndex,
      });
      previousCookingPositionRef.current = { step: currentStepIndex, subStep: currentSubStepIndex };
    }
  }, [screen, currentStepIndex, currentSubStepIndex, auth.userId, recipeSelection.selectedRecipe]);

  useEffect(() => {
    if (!auth.userId || !cookingFlowFinished || !recipeSelection.selectedRecipe) return;
    void trackProductEvent(auth.userId, 'recipe_complete', {
      recipeId: recipeSelection.selectedRecipe.id,
    });
  }, [auth.userId, cookingFlowFinished, recipeSelection.selectedRecipe]);

  useEffect(() => {
    if (!isPlanSheetOpen) return;

    if (planSheetSourceScreen && screen !== planSheetSourceScreen) {
      closePlanSheet();
      return;
    }

    if (
      planningRecipe &&
      recipeSelection.selectedRecipe &&
      recipeSelection.selectedRecipe.id !== planningRecipe.id &&
      screen !== 'weekly-plan'
    ) {
      closePlanSheet();
    }
  }, [isPlanSheetOpen, planSheetSourceScreen, planningRecipe, recipeSelection.selectedRecipe, screen]);

  useEffect(() => {
    if (screen === 'cooking') return;
    const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';
    if (isRecipeOverlayRoute(normalizedPath)) return;
    const parsedRoute = parseRecipeJourneyRoute(normalizedPath);
    if (parsedRoute.isValid && parsedRoute.stage === 'cook') return;
    resetRecipeOverlayNavigationContext();
  }, [screen, location.pathname]);

  // Computed state for UI
  const currentSubStepText = `${currentSubStep?.subStepName ?? ''} ${currentSubStep?.notes ?? ''}`.toLowerCase();

  const isAutoReminderSubStep = Boolean(
    currentSubStep &&
    !currentSubStep.isTimer &&
    (() => {
      const text = currentSubStepText;
      return (
        text.includes('recordatorio') || text.includes('mueve') || text.includes('mover') ||
        text.includes('remueve') || text.includes('remover') || text.includes('revuelve') ||
        text.includes('revolver') || text.includes('voltea') || text.includes('voltear') ||
        text.includes('gira') || text.includes('girar') || text.includes('dar vuelta') ||
        text.includes('redistribuye') || text.includes('redistribuir') || text.includes('stir') ||
        text.includes('flip') || text.includes('turn')
      );
    })()
  );

  const isRetirarSubStep = Boolean(
    currentSubStep &&
    !currentSubStep.isTimer &&
    (currentSubStep.subStepName.toLowerCase().includes('retirar') ||
      currentSubStep.subStepName.toLowerCase().includes('tanda completada'))
  );

  const retirarIsEgg = currentSubStepText.includes('huevo');
  const retirarIsFries = recipeSelection.selectedRecipe?.id === 'papas-fritas' && isRetirarSubStep;

  const retirarTitle = retirarIsEgg ? 'El huevo está listo' : retirarIsFries ? 'Tanda completada' : 'Pieza completada';
  const retirarMessage = retirarIsEgg ? 'Retira tu huevo y prepárate para el siguiente.' : retirarIsFries ? 'Retira las papas, escurre y continúa con la siguiente tanda.' : 'Retira la pieza y prepárate para la siguiente.';

  const stirPromptTitle = currentSubStepText.includes('papa') || currentSubStepText.includes('frita')
    ? (currentSubStepText.includes('segundo tramo') ? 'Mover nuevamente' : 'Mover papas')
    : 'Recordatorio';

  const stirPromptMessage = currentSubStepText.includes('papa') || currentSubStepText.includes('frita')
    ? (currentSubStepText.includes('segundo tramo') ? 'Vuelve a mover para terminar de dorar parejo.' : 'Remueve y separa para evitar que se peguen.')
    : 'Realiza el giro o movimiento indicado antes del siguiente tramo.';

  const effectiveReminderTitle = isAutoReminderSubStep
    ? currentSubStep?.subStepName.replace(/^Recordatorio:\s*/i, 'Recordatorio')
    : stirPromptTitle;

  const effectiveReminderMessage = isAutoReminderSubStep
    ? currentSubStep?.notes || 'Realiza la acción indicada antes de continuar.'
    : stirPromptMessage;

  const showFlipHint = Boolean(currentSubStep?.notes?.toLowerCase().includes('voltear') || currentSubStepText.includes('dar vuelta'));
  const showStirHint = Boolean(currentSubStep?.isTimer && (currentSubStepText.includes('dorar') || currentSubStepText.includes('freir')));

  const rawResolvedSubStepValue = currentSubStep
    ? resolveSubStepDisplayValue({
      subStep: currentSubStep,
      recipe: recipeSelection.selectedRecipe,
      content: recipeSelection.activeRecipeContent,
      portion: recipeSelection.portion,
      peopleCount: recipeSelection.peopleCount,
      quantityMode: recipeSelection.quantityMode,
    })
    : null;
  const portionValue = currentSubStep?.isTimer
    ? (
      typeof rawResolvedSubStepValue === 'number'
        ? (currentSubStep.baseValue != null
          ? rawResolvedSubStepValue
          : Math.round(rawResolvedSubStepValue * portions.setupScaleFactor))
        : null
    )
    : (typeof rawResolvedSubStepValue === 'string' ? rawResolvedSubStepValue : null);

  const voice = useThermomixVoice({
    voiceEnabled,
    setVoiceEnabled,
    voiceStatus,
    setVoiceStatus,
    screen,
    currentStepIndex,
    currentSubStepIndex,
    currentSubStep,
    portion,
    flipPromptVisible,
    stirPromptVisible,
    isRetirarSubStep,
    retirarTitle,
    retirarMessage,
    effectiveReminderTitle,
    effectiveReminderMessage,
    compoundCurrentItem: isCompoundRecipe ? compoundCooking.currentItem : null,
    compoundCurrentTimer: isCompoundRecipe ? compoundCooking.currentTimer : null,
    compoundTimerStarted: isCompoundRecipe ? compoundCooking.isCurrentTimerStarted : false,
    compoundTimerExpired: isCompoundRecipe ? compoundCooking.isCurrentTimerExpired : false,
    compoundIsRecipeComplete: isCompoundRecipe ? compoundCooking.isRecipeComplete : false,
    compoundRecipeName: isCompoundRecipe ? recipeSelection.selectedRecipe?.name ?? null : null,
  });

  const handlers = useThermomixHandlers({
    ...recipeSelection,
    ...cookingProgress,
    ...aiRecipeGen,
    ...portions,
    portionValue,
    setPortion: recipeSelection.setPortion,
    setAiClarificationAnswers: aiRecipeGen.setAiClarificationAnswers,
    setIsCheckingClarifications: aiRecipeGen.setIsCheckingClarifications,
    setIsGeneratingRecipe: aiRecipeGen.setIsGeneratingRecipe,
    cookingProgressIsRunning: cookingProgress.isRunning,
    APPROX_GRAMS_PER_UNIT,
    getSavedRecipeConfig: (recipeId) => userRecipeConfigs.configsByRecipeId[recipeId] ?? null,
    resolveRecipeSetupBehavior: (recipe, config) =>
      deriveRecipeSetupBehavior(recipe, recipeSelection.recipeContentById[recipe.id] ?? null, config),
    saveUserRecipeConfig: userRecipeConfigs.saveConfig,
    recipeUserId: auth.userId,
    activePlannedRecipeItemId,
    openRecipeSetupOverlay: openRecipeSetupSheet,
    openIngredientsOverlay: openIngredientsSheet,
    closeRecipeOverlays: resetRecipeOverlayNavigationContext,
    savePlannedRecipeConfig: async (configSnapshot) => {
      if (!activePlannedRecipeItemId) return;
      const item = weeklyPlan.items.find((candidate) => candidate.id === activePlannedRecipeItemId);
      const recipe = recipeSelection.selectedRecipe;
      if (!item || !recipe) return;
      await weeklyPlan.saveItem({
        id: item.id,
        recipe,
        dayOfWeek: item.dayOfWeek,
        slot: item.slot,
        notes: item.notes,
        configSnapshot,
      });
    },
  });

  const openPlanSheetForRecipe = (
    recipe: Recipe,
    planItem: WeeklyPlanItem | null = null,
    snapshotOverride: WeeklyPlanItemConfigSnapshot | null = null,
  ) => {
    setPlanningRecipe(recipe);
    setEditingPlanItem(planItem);
    setPlanningInitialSnapshot(snapshotOverride);
    setPlanSheetSourceScreen(screen);
    setIsPlanSheetOpen(true);
  };

  const resolveCompoundCookingEntry = (recipe: Recipe) => {
    if (recipe.experience !== 'compound') return 'continue';

    const activeCompoundSignature =
      scaledCompoundRecipe?.id === recipe.id ? getCompoundConfigSignature(scaledCompoundRecipe) : null;
    if (!activeCompoundSignature) return 'continue';
    const savedState = getCompoundSavedSessionState(recipe.id, activeCompoundSignature);
    if (!savedState.hasSnapshot) return 'continue';

    if (savedState.isRecipeComplete) {
      localStorage.removeItem(getCompoundCookingStorageKey(recipe.id, activeCompoundSignature));
      if (recipeSelection.selectedRecipe?.id === recipe.id) {
        compoundCooking.resetCompoundSession();
      }
      window.alert('Esta receta ya estaba terminada. La reiniciaremos desde cero.');
      return 'restart';
    }

    const shouldContinue = window.confirm(
      'Encontré una sesión guardada para esta receta compuesta.\n\nAceptar: continuar donde te quedaste.\nCancelar: reiniciar desde cero.',
    );

    if (!shouldContinue) {
      localStorage.removeItem(getCompoundCookingStorageKey(recipe.id, activeCompoundSignature));
      if (recipeSelection.selectedRecipe?.id === recipe.id) {
        compoundCooking.resetCompoundSession();
      }
      return 'restart';
    }

    return 'continue';
  };

  const activeV2Ingredients = (scaledStandardRecipe?.ingredients ?? []).filter((ingredient) =>
    recipeSelection.activeIngredientSelectionV2[ingredient.id] ?? true,
  );
  const standardPresentation = buildCookingPresentationV2({
    recipe: scaledStandardRecipe,
    currentStep: standardCooking.currentStep,
    currentSubStep: standardCooking.currentSubStep,
    nextStep: standardCooking.nextItem?.subStep ?? null,
    currentIndex: standardCooking.currentIndex,
    totalItems: standardCooking.session.totalItems,
    progressPercent: standardCooking.progressPercent,
    isRecipeFinished: standardCooking.isRecipeFinished,
    timer: {
      hasTimer: standardTimer.hasTimer,
      isRunning: standardTimer.isRunning,
      isExpired: standardTimer.isExpired,
      timeRemaining: standardTimer.timeRemaining,
    },
  });
  const compoundPresentation = buildCompoundCookingPresentationV2({
    recipe: scaledCompoundRecipe,
    currentItem: compoundCooking.currentItem,
    nextItem: compoundCooking.nextItem,
    currentTimelineIndex: compoundCooking.currentTimelineIndex,
    totalTimelineItems: compoundCooking.timeline.length,
    progressPercent: compoundCooking.progressPercent,
    activeTimers: compoundCooking.activeTimers,
    componentProgress: compoundCooking.componentProgress,
    currentTimer: compoundCooking.currentTimer,
    isCurrentTimerStarted: compoundCooking.isCurrentTimerStarted,
    isCurrentTimerRunning: compoundCooking.isCurrentTimerRunning,
    isCurrentTimerExpired: compoundCooking.isCurrentTimerExpired,
    isRecipeComplete: compoundCooking.isRecipeComplete,
    inlineMessage: compoundCooking.inlineMessage,
  });
  const standardPrimaryAction = resolveCookingPrimaryActionV2({
    intent: standardPresentation.ctaIntent,
    hasTimer: standardTimer.hasTimer,
    isRunning: standardTimer.isRunning,
    isExpired: standardTimer.isExpired,
    isRecipeFinished: standardCooking.isRecipeFinished,
    isLastSubStep: standardCooking.session.totalItems > 0 && standardCooking.currentIndex >= standardCooking.session.totalItems - 1,
  });

  const handleStandardPrimaryAction = () => {
    if (standardPrimaryAction.kind === 'start_timer' || standardPrimaryAction.kind === 'pause_timer') {
      standardTimer.togglePause();
      return;
    }
    if (standardPrimaryAction.kind === 'continue_step' || standardPrimaryAction.kind === 'finish_recipe') {
      standardTimer.resetTimer();
      standardCooking.goNext();
      return;
    }
  };
  const compoundPrimaryAction = resolveCompoundPrimaryActionV2({
    intent: compoundPresentation.ctaIntent,
    hasCurrentTimer: compoundCooking.isCurrentTimerStarted,
    isCurrentTimerRunning: compoundCooking.isCurrentTimerRunning,
    isCurrentTimerExpired: compoundCooking.isCurrentTimerExpired,
    isRecipeComplete: compoundCooking.isRecipeComplete,
    nextFrontName: compoundCooking.nextItem?.componentName ?? null,
  });
  const handleCompoundPrimaryAction = () => {
    if (compoundPrimaryAction.kind === 'start_timer') {
      compoundCooking.handleNext();
      return;
    }
    if (compoundPrimaryAction.kind === 'pause_timer') {
      compoundCooking.handleToggleCurrentTimer();
      return;
    }
    if (compoundPrimaryAction.kind === 'focus_front' && compoundCooking.nextItem?.componentId) {
      compoundCooking.handleFocusComponent(compoundCooking.nextItem.componentId);
      compoundCooking.handleNext();
      return;
    }
    if (compoundPrimaryAction.kind === 'finish_recipe' && compoundCooking.isRecipeComplete) {
      handlers.handleChangeMission();
      return;
    }
    compoundCooking.handleNext();
  };

  const applyPlannedRecipeSnapshot = (item: WeeklyPlanItem, targetScreen: 'recipe-setup' | 'cooking') => {
    const recipe = item.recipeId ? recipeSelection.availableRecipes.find((candidate) => candidate.id === item.recipeId) ?? null : null;
    if (!recipe) return;
    const content = recipeSelection.recipeContentById[recipe.id] ?? null;
    const recipeV2 = recipeSelection.recipeV2ById[recipe.id] ?? null;
    if (!content && !recipeV2) return;
    const { snapshot, ingredientSelection: hydratedSelection } = hydratePlannedItemForRuntime({
      item,
      recipe,
      recipeContent: content,
      recipeV2,
    });

    recipeSelection.setIngredientSelectionByRecipe((prev) => ({
      ...prev,
      [recipe.id]: hydratedSelection,
    }));
    recipeSelection.setSelectedRecipe(recipe);
    recipeSelection.setSelectedCategory(recipe.categoryId);
    if (recipeV2) {
      recipeSelection.setTargetYield(resolvePersistedTargetYield(recipeV2, snapshot.targetYield));
      recipeSelection.setCookingContext(snapshot.cookingContext ?? recipeV2.cookingContextDefaults ?? null);
    } else {
      recipeSelection.setCookingContext(null);
    }
    if (!recipeV2) {
      recipeSelection.setQuantityMode(snapshot.quantityMode);
      recipeSelection.setPeopleCount(snapshot.peopleCount ?? recipeSelection.selectedRecipe?.basePortions ?? 2);
      recipeSelection.setAmountUnit((snapshot.amountUnit ?? 'units') as 'units' | 'grams');
      recipeSelection.setAvailableCount(snapshot.availableCount ?? 2);
      recipeSelection.setPortion(snapshot.resolvedPortion);
      cookingProgress.setTimerScaleFactor(snapshot.scaleFactor);
      cookingProgress.setTimingAdjustedLabel(
        Math.abs(snapshot.scaleFactor - 1) < 0.01
          ? 'Tiempo estándar'
          : `Tiempo ajustado x${snapshot.scaleFactor.toFixed(2)}`,
      );
    } else {
      cookingProgress.setTimerScaleFactor(1);
      cookingProgress.setTimingAdjustedLabel('Tiempo resuelto por V2');
    }
    setActivePlannedRecipeItemId(item.id);

    if (targetScreen === 'cooking') {
      enterRecipeCookingRuntime({
        recipe,
        recipeV2,
        legacyOptions: {
          content,
          activeIngredientSelection: hydratedSelection,
          quantityMode: snapshot.quantityMode,
          amountUnit: (snapshot.amountUnit ?? 'units') as 'units' | 'grams',
          availableCount: snapshot.availableCount ?? 2,
          peopleCount: snapshot.peopleCount ?? recipeSelection.selectedRecipe?.basePortions ?? 2,
          portion: snapshot.resolvedPortion,
          scaleFactor: snapshot.scaleFactor,
          timingLabel: Math.abs(snapshot.scaleFactor - 1) < 0.01
            ? 'Tiempo estándar'
            : `Tiempo ajustado x${snapshot.scaleFactor.toFixed(2)}`,
        },
      });
      return;
    }

    setRecipeOverlayPinnedPath(null);
    openRecipeSetupSheet();
  };

  const handleRecipeOpen = (recipe: Recipe) => {
    const setupPath = `/recetas/${encodeURIComponent(recipe.id)}/configurar`;
    const normalizedLocationPath = location.pathname.replace(/\/+$/, '') || '/';
    const hostPath = resolveRecipeOverlayHostPath({
      screen,
      selectedCategory: recipeSelection.selectedCategory,
      currentLocationPath: normalizedLocationPath,
    });
    const presentationMode = resolveRecipePresentationMode(isUnifiedJourneyEnabled(recipe.id));
    routeSyncRef.current = false;
    setActivePlannedRecipeItemId(null);
    hydrateRecipeSelection(recipe);
    setRecipeOverlayHostScreen(resolveRecipeOverlayHostScreen(screen, recipeOverlayHostScreen));
    setRecipeOverlayHostPath(hostPath);
    setRecipeOverlayPinnedPath(presentationMode === 'journey-page' ? null : setupPath);
    resetLegacyCookingRuntimeState();
    if (presentationMode === 'journey-page') {
      clearRecipeOverlaySheets();
    } else {
      openRecipeSetupSheet();
    }
    navigate(setupPath);
  };

  const handleSearchResultSelect = (result: MixedRecipeSearchResult) => {
    if (result.kind === 'recipe' && result.recipe) {
      handleRecipeOpen(result.recipe);
      return;
    }

    if (result.kind === 'seed' && result.seed) {
      aiRecipeGen.startWizardFromSeed(result.seed);
    }
  };

  const exitCurrentRecipe = () => {
    const destination = resolveRecipeOverlayCloseDestination({
      currentScreen: screen,
      currentHostScreen: recipeOverlayHostScreen,
      explicitHostPath: recipeOverlayHostPath,
      selectedCategory: recipeSelection.selectedCategory,
    });

    standardCooking.reset();
    standardTimer.resetTimer();
    resetRecipeOverlayNavigationContext();
    if (destination.screen !== 'recipe-select') {
      recipeSelection.setSelectedCategory(null);
    }
    recipeSelection.setScreenDirect(destination.screen);
    navigate(destination.path);
  };

  const cookRuntimeEntryAdapter = createCookRuntimeEntryAdapter({
    selectedRecipe: recipeSelection.selectedRecipe,
    recipeV2ById: recipeSelection.recipeV2ById,
    hasRecipeV2,
    setTargetYield: recipeSelection.setTargetYield,
    setCookingContext: recipeSelection.setCookingContext,
    setIngredientSelectionByRecipe: recipeSelection.setIngredientSelectionByRecipe,
    enterCompoundCookingRuntime: () => {
      if (!recipeSelection.selectedRecipe) return;
      enterRecipeCookingRuntime({
        recipe: recipeSelection.selectedRecipe,
        recipeV2: recipeSelection.recipeV2ById[recipeSelection.selectedRecipe.id] ?? null,
      });
    },
    enterStandardCookingRuntime: () => {
      if (!recipeSelection.selectedRecipe) return;
      enterRecipeCookingRuntime({
        recipe: recipeSelection.selectedRecipe,
        recipeV2: recipeSelection.recipeV2ById[recipeSelection.selectedRecipe.id] ?? null,
      });
    },
    startLegacyCooking: handlers.handleStartCooking,
    navigateToCookingRoute: (recipeId) => {
      navigate(`/recetas/${encodeURIComponent(recipeId)}/cocinar`);
    },
  });

  const openJourneyStageFromCooking = (stage: 'setup' | 'ingredients') => {
    const recipeId = recipeSelection.selectedRecipe?.id;
    if (!recipeId || !isUnifiedJourneyEnabled(recipeId)) {
      return false;
    }

    clearRecipeOverlaySheets();
    navigate(buildRecipeJourneyPath(recipeId, stage));
    return true;
  };

  const unifiedJourneyShellAdapter = createRecipeJourneyShellAdapter({
    recipe: recipeSelection.selectedRecipe,
    recipeV2: setupRecipeV2,
    scaledRecipe: scaledJourneyRecipe,
    pathname: location.pathname,
    returnTo: recipeOverlayHostPath,
    presentationMode: 'page',
    selectedYield: standardYield.selectedYield,
    selectedCookingContext: recipeSelection.cookingContext,
    activeIngredientSelection: recipeSelection.activeIngredientSelectionV2,
    onSelectedYieldChange: standardYield.setSelectedYield,
    onSelectedCookingContextChange: recipeSelection.setCookingContext,
    onDecrement: standardYield.decrementYield,
    onIncrement: standardYield.incrementYield,
    onIngredientToggle: handleStandardIngredientToggle,
    navigate,
    onClose: closeUnifiedJourneyOverlay,
    onEnterCooking: cookRuntimeEntryAdapter.enterCookRuntime,
  });

  const unifiedJourneyPage = shouldRenderUnifiedJourneyPage ? (
    <Suspense fallback={<ScreenFallback />}>
      <RecipeJourneyHost
        {...unifiedJourneyShellAdapter}
        viewModel={unifiedJourneyViewModel}
      />
    </Suspense>
  ) : null;

  useThermomixTimer({
    ...recipeSelection,
    ...cookingProgress,
    ...portions,
    screen: isCompoundRecipe || hasRecipeV2 ? 'category-select' : screen,
    portionValue: typeof portionValue === 'number' ? portionValue : 0,
    showFlipHint,
    showStirHint,
    currentSubStepText,
    handleNext: handlers.handleNext,
    isRetirarSubStep,
    isAutoReminderSubStep,
    timerScaleFactor: cookingProgress.timerScaleFactor,
    speakInstruction: voice.speakInstruction,
    currentRecipeData: cookingProgress.currentRecipeData,
  });

  const planRecipeSheet = isPlanSheetOpen ? (
    <Suspense fallback={null}>
      <PlanRecipeSheet
        open={isPlanSheetOpen}
        recipe={planningRecipe}
        recipeContent={planningRecipe ? recipeSelection.recipeContentById[planningRecipe.id] ?? null : null}
        recipeV2={planningRecipe ? recipeSelection.recipeV2ById[planningRecipe.id] ?? null : null}
        initialSnapshot={planningInitialSnapshot ?? (planningRecipe ? weeklyPlan.getDefaultPlanSnapshot(planningRecipe) : null)}
        editingItem={editingPlanItem}
        onOpenChange={(open) => {
          if (!open) {
            closePlanSheet();
            return;
          }
          setIsPlanSheetOpen(true);
        }}
        onSave={async (input) => {
          await weeklyPlan.saveItem(input);
          closePlanSheet();
        }}
      />
    </Suspense>
  ) : null;

  const recipeOverlays = (
    <>
      {isRecipeSetupSheetOpen && recipeSelection.selectedRecipe ? (
        <Suspense fallback={null}>
          {shouldRenderUnifiedJourneyOverlay ? (
            <RecipeJourneyHost
              {...unifiedJourneyShellAdapter}
              viewModel={unifiedJourneyViewModel}
            />
          ) : shouldRenderSetupV2Fallback ? (
            <RecipeSetupScreenV2
              selectedRecipe={recipeSelection.selectedRecipe}
              recipe={setupRecipeV2}
              selectedYield={standardYield.selectedYield}
              selectedCookingContext={recipeSelection.cookingContext}
              warnings={scaledStandardRecipe?.warnings ?? []}
              onDecrement={standardYield.decrementYield}
              onIncrement={standardYield.incrementYield}
              onSelectedYieldChange={standardYield.setSelectedYield}
              onSelectedCookingContextChange={recipeSelection.setCookingContext}
              onBack={closeRecipeSetupSheet}
              onContinue={() => {
                if (recipeSelection.selectedRecipe?.id) {
                  setRecipeOverlayPinnedPath(`/recetas/${encodeURIComponent(recipeSelection.selectedRecipe.id)}/ingredientes`);
                }
                openIngredientsSheet();
              }}
            />
          ) : shouldRenderLegacySetupFallback ? (
            // Fallback-only legacy setup branch. Do not add new setup variants here.
            <RecipeSetupScreen
              selectedRecipe={recipeSelection.selectedRecipe}
              setupBehavior={selectedRecipeSetupBehavior}
              savedConfig={selectedRecipeSavedConfig}
              savedContextSummary={selectedRecipeSavedSummary}
              quantityMode={recipeSelection.quantityMode}
              setQuantityMode={recipeSelection.setQuantityMode}
              amountUnit={recipeSelection.amountUnit}
              onAmountUnitChange={handlers.handleSetupAmountUnitChange}
              peopleCount={recipeSelection.peopleCount}
              setPeopleCount={recipeSelection.setPeopleCount}
              availableCount={recipeSelection.availableCount}
              setAvailableCount={recipeSelection.setAvailableCount}
              isTubersBoilRecipe={portions.isTubersBoilRecipe}
              produceType={recipeSelection.produceType}
              setProduceType={recipeSelection.setProduceType}
              produceSize={recipeSelection.produceSize}
              setProduceSize={recipeSelection.setProduceSize}
              setupPortionPreview={portions.setupPortionPreview}
              setupScaleFactor={portions.setupScaleFactor}
              targetYield={recipeSelection.targetYield}
              onBack={closeRecipeSetupSheet}
              onContinue={handlers.handleSetupContinue}
              onPlanRecipe={() => {
                if (recipeSelection.selectedRecipe) {
                  openPlanSheetForRecipe(recipeSelection.selectedRecipe, null, {
                    quantityMode: recipeSelection.quantityMode,
                    peopleCount: recipeSelection.peopleCount,
                    amountUnit: recipeSelection.quantityMode === 'have' ? recipeSelection.amountUnit : null,
                    availableCount: recipeSelection.quantityMode === 'have' ? recipeSelection.availableCount : null,
                    targetYield: recipeSelection.targetYield,
                    cookingContext: recipeSelection.cookingContext,
                    selectedOptionalIngredients: recipeSelection.currentIngredients
                      .filter((ingredient) => !ingredient.indispensable)
                      .map((ingredient) => getIngredientKey(ingredient.name))
                      .filter((key) => recipeSelection.activeIngredientSelection[key] ?? true),
                    sourceContextSummary: selectedRecipeSavedConfig?.sourceContextSummary ?? null,
                    resolvedPortion: portions.setupPortionPreview,
                    scaleFactor: portions.setupScaleFactor,
                  });
                }
              }}
            />
          ) : null}
        </Suspense>
      ) : null}
      {isIngredientsSheetOpen && recipeSelection.selectedRecipe ? (
        <Suspense fallback={null}>
          {shouldRenderUnifiedJourneyOverlay ? (
            <RecipeJourneyHost
              {...unifiedJourneyShellAdapter}
              viewModel={unifiedJourneyViewModel}
            />
          ) : shouldRenderIngredientsV2Fallback ? (
            <IngredientsScreenV2
              selectedRecipe={recipeSelection.selectedRecipe}
              scaledRecipe={scaledStandardRecipe}
              selectedYield={standardYield.selectedYield}
              activeIngredientSelection={recipeSelection.activeIngredientSelectionV2}
              onIngredientToggle={handleStandardIngredientToggle}
              onBack={() => {
                if (recipeSelection.selectedRecipe?.id) {
                  setRecipeOverlayPinnedPath(`/recetas/${encodeURIComponent(recipeSelection.selectedRecipe.id)}/configurar`);
                }
                openRecipeSetupSheet();
              }}
              onStartCooking={cookRuntimeEntryAdapter.enterCookRuntime}
            />
          ) : shouldRenderLegacyIngredientsFallback ? (
            // Fallback-only legacy ingredients branch. Keep compat only; no new capabilities here.
            <IngredientsScreen
              appVersion={appVersion}
              voiceEnabled={voiceEnabled}
              onVoiceToggle={voice.handleVoiceToggle}
              speechSupported={voice.speechSupported}
              selectedRecipe={recipeSelection.selectedRecipe}
              portion={recipeSelection.portion}
              currentPortionLabel={portions.currentPortionLabel}
              quantityMode={recipeSelection.quantityMode}
              peopleCount={recipeSelection.peopleCount}
              availableCount={recipeSelection.availableCount}
              amountUnit={recipeSelection.amountUnit}
              targetYield={recipeSelection.targetYield}
              timingAdjustedLabel={cookingProgress.timingAdjustedLabel}
              currentIngredients={recipeSelection.currentIngredients}
              activeIngredientSelection={recipeSelection.activeIngredientSelection}
              onIngredientToggle={handlers.handleIngredientToggle}
              batchCountForRecipe={portions.batchCountForRecipe}
              batchUsageTips={portions.batchUsageTips}
              currentTip={recipeSelection.activeRecipeContent.tip}
              onBack={() => {
                if (recipeSelection.ingredientsBackScreen === 'recipe-setup') {
                  openRecipeSetupSheet();
                  return;
                }
                closeIngredientsSheet();
              }}
              onStartCooking={cookRuntimeEntryAdapter.enterCookRuntime}
              currentRecipeData={recipeSelection.activeRecipeContent.steps}
            />
          ) : null}
        </Suspense>
      ) : null}
    </>
  );

  // Render Logic
  if (unifiedJourneyPage) {
    return (
      <>
        {unifiedJourneyPage}
        {planRecipeSheet}
      </>
    );
  }

  if (screen === 'category-select') {
    return (
      <>
        <CategorySelectScreen
          appVersion={appVersion}
          voiceEnabled={voiceEnabled}
          onVoiceToggle={voice.handleVoiceToggle}
          speechSupported={voice.speechSupported}
          aiError={aiRecipeGen.aiError}
          aiSuccess={aiRecipeGen.aiSuccess}
          onOpenAIWizard={() => {
            aiRecipeGen.setAiWizardStep('context');
            recipeSelection.setScreen('ai-clarify');
          }}
          recentRecipes={recentPrivateRecipes}
          favoriteRecipeIds={userFavorites.favoriteRecipeIds}
          searchTerm={recipeSeedSearchTerm}
          searchResults={mixedSearchResults}
          searchIsLoading={recipeSeeds.isLoading}
          onSearchTermChange={setRecipeSeedSearchTerm}
          onSearchSelectResult={handleSearchResultSelect}
          onRecipeOpen={handleRecipeOpen}
          onToggleFavorite={(recipeId) => void userFavorites.toggleFavorite(recipeId)}
          onOpenGlobalRecipes={() => recipeSelection.setScreen('global-recipes')}
          onOpenMyRecipes={() => recipeSelection.setScreen('my-recipes')}
          onOpenFavorites={() => recipeSelection.setScreen('favorites')}
          onOpenWeeklyPlan={() => recipeSelection.setScreen('weekly-plan')}
          onOpenShoppingList={() => recipeSelection.setScreen('shopping-list')}
          onOpenCompoundLab={() => recipeSelection.setScreen('compound-lab')}
          onOpenAISettings={() => recipeSelection.setScreen('ai-settings')}
          currentUserEmail={auth.user?.email ?? null}
          onSignOut={() => void auth.signOut()}
          onPlanRecipe={(recipe) => openPlanSheetForRecipe(recipe)}
        />
        {recipeOverlays}
        {planRecipeSheet}
      </>
    );
  }

  if (screen === 'design-system') {
    return (
      <>
        <Suspense fallback={<ScreenFallback />}>
          <DesignSystemScreen onBack={() => recipeSelection.setScreen('category-select')} />
        </Suspense>
        {recipeOverlays}
        {planRecipeSheet}
      </>
    );
  }

  if (screen === 'global-recipes') {
    return (
      <>
        <GlobalRecipesScreen
          currentUserEmail={auth.user?.email ?? null}
          categories={globalCategories}
          onSelectCategory={(category) => {
            recipeSelection.setSelectedCategory(category.id === 'all' ? null : category.id);
            recipeSelection.setScreen('recipe-select');
          }}
          onGoHome={() => recipeSelection.setScreen('category-select')}
          onGoGlobalRecipes={() => recipeSelection.setScreen('global-recipes')}
          onGoMyRecipes={() => recipeSelection.setScreen('my-recipes')}
          onGoFavorites={() => recipeSelection.setScreen('favorites')}
          onGoWeeklyPlan={() => recipeSelection.setScreen('weekly-plan')}
          onGoShoppingList={() => recipeSelection.setScreen('shopping-list')}
          onGoCompoundLab={() => recipeSelection.setScreen('compound-lab')}
          onGoSettings={() => recipeSelection.setScreen('ai-settings')}
          onSignOut={() => void auth.signOut()}
        />
        {recipeOverlays}
        {planRecipeSheet}
      </>
    );
  }

  if (screen === 'recipe-seed-search') {
    return (
      <>
        <Suspense fallback={<ScreenFallback />}>
          <RecipeSeedSearchScreen
            currentUserEmail={auth.user?.email ?? null}
            searchTerm={recipeSeedSearchTerm}
            results={mixedSearchResults}
            isLoading={recipeSeeds.isLoading}
            warning={recipeSeeds.warning}
            onSearchTermChange={setRecipeSeedSearchTerm}
            onSelectResult={handleSearchResultSelect}
            onBack={() => recipeSelection.goBackScreen('category-select')}
            onGoHome={() => recipeSelection.setScreen('category-select')}
            onGoGlobalRecipes={() => recipeSelection.setScreen('global-recipes')}
            onGoMyRecipes={() => recipeSelection.setScreen('my-recipes')}
            onGoFavorites={() => recipeSelection.setScreen('favorites')}
            onGoWeeklyPlan={() => recipeSelection.setScreen('weekly-plan')}
            onGoShoppingList={() => recipeSelection.setScreen('shopping-list')}
            onGoCompoundLab={() => recipeSelection.setScreen('compound-lab')}
            onGoSettings={() => recipeSelection.setScreen('ai-settings')}
            onSignOut={() => void auth.signOut()}
          />
        </Suspense>
        {recipeOverlays}
        {planRecipeSheet}
      </>
    );
  }

  if (screen === 'ai-settings') {
    return (
      <>
        <Suspense fallback={<ScreenFallback />}>
          <AISettingsScreen
            currentUserEmail={auth.user?.email ?? null}
            onGoHome={() => recipeSelection.setScreen('category-select')}
            onGoGlobalRecipes={() => recipeSelection.setScreen('global-recipes')}
            onGoMyRecipes={() => recipeSelection.setScreen('my-recipes')}
            onGoFavorites={() => recipeSelection.setScreen('favorites')}
            onGoWeeklyPlan={() => recipeSelection.setScreen('weekly-plan')}
            onGoShoppingList={() => recipeSelection.setScreen('shopping-list')}
            onGoCompoundLab={() => recipeSelection.setScreen('compound-lab')}
            onGoSettings={() => recipeSelection.setScreen('ai-settings')}
            onOpenReleases={() => recipeSelection.setScreen('releases')}
            onOpenBacklog={() => recipeSelection.setScreen('backlog')}
            onSignOut={() => void auth.signOut()}
          />
        </Suspense>
        {recipeOverlays}
        {planRecipeSheet}
      </>
    );
  }

  if (screen === 'releases') {
    return (
      <>
        <Suspense fallback={<ScreenFallback />}>
          <ReleasesScreen
            currentUserEmail={auth.user?.email ?? null}
            onGoHome={() => recipeSelection.setScreen('category-select')}
            onGoGlobalRecipes={() => recipeSelection.setScreen('global-recipes')}
            onGoMyRecipes={() => recipeSelection.setScreen('my-recipes')}
            onGoFavorites={() => recipeSelection.setScreen('favorites')}
            onGoWeeklyPlan={() => recipeSelection.setScreen('weekly-plan')}
            onGoShoppingList={() => recipeSelection.setScreen('shopping-list')}
            onGoCompoundLab={() => recipeSelection.setScreen('compound-lab')}
            onGoSettings={() => recipeSelection.setScreen('ai-settings')}
            onSignOut={() => void auth.signOut()}
          />
        </Suspense>
        {recipeOverlays}
        {planRecipeSheet}
      </>
    );
  }

  if (screen === 'backlog') {
    return (
      <>
        <Suspense fallback={<ScreenFallback />}>
          <BacklogScreen
            currentUserEmail={auth.user?.email ?? null}
            onGoHome={() => recipeSelection.setScreen('category-select')}
            onGoGlobalRecipes={() => recipeSelection.setScreen('global-recipes')}
            onGoMyRecipes={() => recipeSelection.setScreen('my-recipes')}
            onGoFavorites={() => recipeSelection.setScreen('favorites')}
            onGoWeeklyPlan={() => recipeSelection.setScreen('weekly-plan')}
            onGoShoppingList={() => recipeSelection.setScreen('shopping-list')}
            onGoCompoundLab={() => recipeSelection.setScreen('compound-lab')}
            onGoSettings={() => recipeSelection.setScreen('ai-settings')}
            onSignOut={() => void auth.signOut()}
          />
        </Suspense>
        {recipeOverlays}
        {planRecipeSheet}
      </>
    );
  }

  if (screen === 'my-recipes') {
    return (
      <>
        <RecipeLibraryScreen
          title="Mis recetas"
          description="Tus recetas privadas y creaciones de IA guardadas para volver a cocinarlas o afinarlas cuando quieras."
          activeItem="my-recipes"
          currentUserEmail={auth.user?.email ?? null}
          recipes={privateUserRecipes}
          favoriteRecipeIds={userFavorites.favoriteRecipeIds}
          emptyState="Aún no tienes recetas privadas. Crea una receta con IA desde Inicio para empezar tu biblioteca."
          onRecipeOpen={handleRecipeOpen}
          onToggleFavorite={(recipeId) => void userFavorites.toggleFavorite(recipeId)}
          onPlanRecipe={(recipe) => openPlanSheetForRecipe(recipe)}
          onGoHome={() => recipeSelection.setScreen('category-select')}
          onGoGlobalRecipes={() => recipeSelection.setScreen('global-recipes')}
          onGoMyRecipes={() => recipeSelection.setScreen('my-recipes')}
          onGoFavorites={() => recipeSelection.setScreen('favorites')}
          onGoWeeklyPlan={() => recipeSelection.setScreen('weekly-plan')}
          onGoShoppingList={() => recipeSelection.setScreen('shopping-list')}
          onGoCompoundLab={() => recipeSelection.setScreen('compound-lab')}
          onGoSettings={() => recipeSelection.setScreen('ai-settings')}
          onSignOut={() => void auth.signOut()}
        />
        {recipeOverlays}
        {planRecipeSheet}
      </>
    );
  }

  if (screen === 'favorites') {
    return (
      <>
      <RecipeLibraryScreen
        title="Favoritos"
        description="Tus recetas favoritas, públicas o privadas, reunidas en un solo lugar para volver a ellas rápido."
        activeItem="favorites"
        currentUserEmail={auth.user?.email ?? null}
        recipes={favoriteRecipes}
        favoriteRecipeIds={userFavorites.favoriteRecipeIds}
        emptyState="Todavía no tienes favoritos. Usa el corazón en Inicio, Mis recetas o en cualquier listado de recetas."
        onRecipeOpen={handleRecipeOpen}
        onToggleFavorite={(recipeId) => void userFavorites.toggleFavorite(recipeId)}
        onPlanRecipe={(recipe) => openPlanSheetForRecipe(recipe)}
        onGoHome={() => recipeSelection.setScreen('category-select')}
        onGoGlobalRecipes={() => recipeSelection.setScreen('global-recipes')}
        onGoMyRecipes={() => recipeSelection.setScreen('my-recipes')}
        onGoFavorites={() => recipeSelection.setScreen('favorites')}
        onGoWeeklyPlan={() => recipeSelection.setScreen('weekly-plan')}
        onGoShoppingList={() => recipeSelection.setScreen('shopping-list')}
        onGoCompoundLab={() => recipeSelection.setScreen('compound-lab')}
        onGoSettings={() => recipeSelection.setScreen('ai-settings')}
        onSignOut={() => void auth.signOut()}
      />
      {recipeOverlays}
      {planRecipeSheet}
      </>
    );
  }

  if (screen === 'weekly-plan') {
    return (
      <>
        <Suspense fallback={<ScreenFallback />}>
          <WeeklyPlanScreen
            currentUserEmail={auth.user?.email ?? null}
            plan={weeklyPlan.plan}
            items={weeklyPlan.items}
            recipesById={Object.fromEntries(recipeSelection.availableRecipes.map((recipe) => [recipe.id, recipe]))}
            isLoading={weeklyPlan.isLoading}
            error={weeklyPlan.error}
            onGoHome={() => recipeSelection.setScreen('category-select')}
            onGoGlobalRecipes={() => recipeSelection.setScreen('global-recipes')}
            onGoMyRecipes={() => recipeSelection.setScreen('my-recipes')}
            onGoFavorites={() => recipeSelection.setScreen('favorites')}
            onGoWeeklyPlan={() => recipeSelection.setScreen('weekly-plan')}
            onGoShoppingList={() => recipeSelection.setScreen('shopping-list')}
            onGoCompoundLab={() => recipeSelection.setScreen('compound-lab')}
            onGoSettings={() => recipeSelection.setScreen('ai-settings')}
            onSignOut={() => void auth.signOut()}
            onEditPlanItem={(item) => {
              const recipe = item.recipeId ? recipeSelection.availableRecipes.find((candidate) => candidate.id === item.recipeId) ?? null : null;
              if (!recipe) return;
              openPlanSheetForRecipe(recipe, item);
            }}
            onRemovePlanItem={(itemId) => void weeklyPlan.removeItem(itemId)}
            onOpenRecipeFromPlan={(item) => applyPlannedRecipeSnapshot(item, 'recipe-setup')}
            onCookFromPlan={(item) => applyPlannedRecipeSnapshot(item, 'cooking')}
            onCreateNextWeek={() => void weeklyPlan.createNextWeek()}
          />
        </Suspense>
        {recipeOverlays}
        {planRecipeSheet}
      </>
    );
  }

  if (screen === 'shopping-list') {
    return (
      <>
        <Suspense fallback={<ScreenFallback />}>
          <ShoppingListScreen
            currentUserEmail={auth.user?.email ?? null}
            plan={weeklyPlan.plan}
            shoppingList={weeklyPlan.shoppingList}
            shoppingItems={weeklyPlan.shoppingItems}
            shoppingTrip={weeklyPlan.shoppingTrip}
            shoppingTripItems={weeklyPlan.shoppingTripItems}
            aggregation={weeklyPlan.aggregation}
            variance={weeklyPlan.shoppingVariance}
            isLoading={weeklyPlan.isLoading}
            error={weeklyPlan.error}
            onGoHome={() => recipeSelection.setScreen('category-select')}
            onGoGlobalRecipes={() => recipeSelection.setScreen('global-recipes')}
            onGoMyRecipes={() => recipeSelection.setScreen('my-recipes')}
            onGoFavorites={() => recipeSelection.setScreen('favorites')}
            onGoShoppingList={() => recipeSelection.setScreen('shopping-list')}
            onGoWeeklyPlan={() => recipeSelection.setScreen('weekly-plan')}
            onGoCompoundLab={() => recipeSelection.setScreen('compound-lab')}
            onGoSettings={() => recipeSelection.setScreen('ai-settings')}
            onSignOut={() => void auth.signOut()}
            onRegenerateShopping={() => void weeklyPlan.regenerateShopping()}
            onToggleShoppingItem={(itemId, nextChecked) => void weeklyPlan.updateShoppingItemState(itemId, { isChecked: nextChecked })}
            onUpdateShoppingItem={(itemId, input) => void weeklyPlan.updateShoppingItemState(itemId, input)}
            onAddManualItem={(itemName, quantityText) => void weeklyPlan.addManualShoppingItem(itemName, quantityText)}
            onRemoveShoppingItem={(itemId) => void weeklyPlan.removeShoppingItem(itemId)}
            onStartShoppingTrip={() => void weeklyPlan.startShoppingTripFromList()}
            onToggleTripItemInCart={(itemId, nextChecked) => void weeklyPlan.toggleTripItemInCart(itemId, nextChecked)}
            onMarkTripItemSkipped={(itemId) => void weeklyPlan.markTripItemSkipped(itemId)}
            onUpdateTripItem={(itemId, input) => void weeklyPlan.updateTripItemActuals(itemId, input)}
            onAddExtraTripItem={(itemName, quantityText, lineTotal) => void weeklyPlan.addExtraTripItem(itemName, quantityText, lineTotal)}
            onUpdateTripMeta={(input) => void weeklyPlan.updateShoppingTripMeta(input)}
            onCheckoutTrip={(finalTotal, storeName) => void weeklyPlan.checkoutTrip(finalTotal, storeName)}
          />
        </Suspense>
        {recipeOverlays}
        {planRecipeSheet}
      </>
    );
  }

  if (screen === 'recipe-select') {
    return (
      <>
        <GlobalRecipesCategoryScreen
          currentUserEmail={auth.user?.email ?? null}
          category={recipeSelection.selectedCategoryMeta ?? {
            id: 'all' as const,
            name: 'Todas',
            icon: '📚',
            description: 'Todas las recetas públicas disponibles en la fuente actual.',
          }}
          items={globalCategoryItems}
          favoriteRecipeIds={userFavorites.favoriteRecipeIds}
          onBack={() => recipeSelection.goBackScreen('global-recipes')}
          onOpenRecipe={handleRecipeOpen}
          onToggleFavorite={(recipeId) => void userFavorites.toggleFavorite(recipeId)}
          onGoHome={() => recipeSelection.setScreen('category-select')}
          onGoGlobalRecipes={() => recipeSelection.setScreen('global-recipes')}
          onGoMyRecipes={() => recipeSelection.setScreen('my-recipes')}
          onGoFavorites={() => recipeSelection.setScreen('favorites')}
          onGoWeeklyPlan={() => recipeSelection.setScreen('weekly-plan')}
          onGoShoppingList={() => recipeSelection.setScreen('shopping-list')}
          onGoCompoundLab={() => recipeSelection.setScreen('compound-lab')}
          onGoSettings={() => recipeSelection.setScreen('ai-settings')}
          onSignOut={() => void auth.signOut()}
        />
        {recipeOverlays}
        {planRecipeSheet}
      </>
    );
  }

  if (screen === 'compound-lab') {
    const demoRecipes = dedupeRecipesById([
      ...recipeSelection.availableRecipes.filter((recipe) => recipe.experience === 'compound'),
      ...COMPOUND_DEMO_FALLBACKS,
    ]).filter((recipe) => COMPOUND_DEMO_IDS.has(recipe.id));

    return (
      <>
        <Suspense fallback={<ScreenFallback />}>
          <CompoundLabScreen
            currentUserEmail={auth.user?.email ?? null}
            recipes={demoRecipes}
            onOpenRecipe={handleRecipeOpen}
            onQuickCook={(recipe) => {
              const hydratedRecipe = hydrateRecipeSelection(recipe);
              resolveCompoundCookingEntry(recipe);
              initializeCookingBase(recipe, {
                content: hydratedRecipe?.content ?? null,
                activeIngredientSelection: hydratedRecipe?.hydratedSelection,
                quantityMode: hydratedRecipe?.quantityMode,
                peopleCount: hydratedRecipe?.peopleCount,
                amountUnit: hydratedRecipe?.amountUnit,
                availableCount: hydratedRecipe?.availableCount,
                portion: hydratedRecipe?.portion,
              });
              recipeSelection.setScreen('cooking');
            }}
            onGoHome={() => recipeSelection.setScreen('category-select')}
            onGoGlobalRecipes={() => recipeSelection.setScreen('global-recipes')}
            onGoMyRecipes={() => recipeSelection.setScreen('my-recipes')}
            onGoFavorites={() => recipeSelection.setScreen('favorites')}
            onGoWeeklyPlan={() => recipeSelection.setScreen('weekly-plan')}
            onGoShoppingList={() => recipeSelection.setScreen('shopping-list')}
            onGoCompoundLab={() => recipeSelection.setScreen('compound-lab')}
            onGoSettings={() => recipeSelection.setScreen('ai-settings')}
            onSignOut={() => void auth.signOut()}
          />
        </Suspense>
        {recipeOverlays}
        {planRecipeSheet}
      </>
    );
  }

  if (screen === 'ai-clarify') {
    return (
      <>
      <Suspense fallback={<ScreenFallback />}>
        <AIClarifyScreen
          contextDraft={aiRecipeGen.aiContextDraft}
          wizardStep={aiRecipeGen.aiWizardStep}
          questions={aiRecipeGen.aiClarificationQuestions}
          answers={aiRecipeGen.aiClarificationAnswers}
          numberModes={aiRecipeGen.aiClarificationNumberModes}
          quantityUnits={aiRecipeGen.aiClarificationQuantityUnits}
          selectedSeed={aiRecipeGen.selectedRecipeSeed}
          suggestedTitle={aiRecipeGen.aiClarificationSuggestedTitle}
          tip={aiRecipeGen.aiClarificationTip}
          aiError={aiRecipeGen.aiError}
          isCheckingClarifications={aiRecipeGen.isCheckingClarifications}
          onContextPromptChange={aiRecipeGen.handleAiPromptChange}
          isMockModeEnabled={aiRecipeGen.isAiMockModeEnabled}
          onContextServingsChange={(value) =>
            aiRecipeGen.setAiContextDraft((prev) => ({ ...prev, servings: value }))
          }
          onAddAvailableIngredient={aiRecipeGen.addAvailableIngredient}
          onRemoveAvailableIngredient={aiRecipeGen.removeAvailableIngredient}
          onAddAvoidIngredient={aiRecipeGen.addAvoidIngredient}
          onRemoveAvoidIngredient={aiRecipeGen.removeAvoidIngredient}
          onAnswerChange={handlers.handleAnswerChange}
          onNumberModeChange={aiRecipeGen.setAiClarificationNumberModes}
          onQuantityUnitChange={aiRecipeGen.setAiClarificationQuantityUnits}
          onBack={aiRecipeGen.handleAiWizardBack}
          onContinue={aiRecipeGen.handleAiContextContinue}
          onGenerate={aiRecipeGen.handleGenerateRecipe}
          onLoadMockExample={() => aiRecipeGen.applyMockScenarioToContext('milanesa')}
          onSkipToMockRefinement={() => aiRecipeGen.jumpToMockRefinement('milanesa')}
          onGenerateMockRecipe={() => void aiRecipeGen.generateMockRecipeDirect('milanesa')}
          isGenerating={aiRecipeGen.isGeneratingRecipe}
          resolveUnit={aiRecipeGen.resolveClarificationUnit}
        />
      </Suspense>
      {recipeOverlays}
      {planRecipeSheet}
      </>
    );
  }

  return (
    <>
    <Suspense fallback={<ScreenFallback />}>
      {isCompoundRecipe ? (
      <CompoundCookingScreen
        selectedRecipe={recipeSelection.selectedRecipe}
        presentation={compoundPresentation}
        currentItem={compoundCooking.currentItem}
        nextItem={compoundCooking.nextItem}
        currentTimelineIndex={compoundCooking.currentTimelineIndex}
        totalTimelineItems={compoundCooking.timeline.length}
        progressPercent={compoundCooking.progressPercent}
        activeTimers={compoundCooking.activeTimers}
        componentProgress={compoundCooking.componentProgress}
        currentTimer={compoundCooking.currentTimer}
        isCurrentTimerStarted={compoundCooking.isCurrentTimerStarted}
        isCurrentTimerRunning={compoundCooking.isCurrentTimerRunning}
        isCurrentTimerExpired={compoundCooking.isCurrentTimerExpired}
        isRecipeComplete={compoundCooking.isRecipeComplete}
        primaryActionLabel={compoundPrimaryAction.label}
        primaryActionKind={compoundPrimaryAction.kind}
        voiceEnabled={voiceEnabled}
        onVoiceToggle={voice.handleVoiceToggle}
        speechSupported={voice.speechSupported}
        inlineMessage={compoundCooking.inlineMessage}
        onPrevious={compoundCooking.handlePrevious}
        onNext={handleCompoundPrimaryAction}
        onToggleCurrentTimer={compoundCooking.handleToggleCurrentTimer}
        onFocusComponent={compoundCooking.handleFocusComponent}
        onDismissTimer={compoundCooking.dismissTimer}
        onOpenIngredients={() => {
          if (openJourneyStageFromCooking('ingredients')) return;
          handlers.handleOpenIngredientsFromCooking();
        }}
        onOpenSetup={() => {
          if (openJourneyStageFromCooking('setup')) return;
          handlers.handleOpenSetupFromCooking();
        }}
        onExitRecipe={exitCurrentRecipe}
        onChangeMission={() => {
          compoundCooking.resetCompoundSession();
          handlers.handleChangeMission();
        }}
        onPlanRecipe={() => {
          if (recipeSelection.selectedRecipe) {
            openPlanSheetForRecipe(recipeSelection.selectedRecipe, null, {
              quantityMode: recipeSelection.quantityMode,
              peopleCount: recipeSelection.peopleCount,
              amountUnit: recipeSelection.quantityMode === 'have' ? recipeSelection.amountUnit : null,
              availableCount: recipeSelection.quantityMode === 'have' ? recipeSelection.availableCount : null,
              selectedOptionalIngredients: recipeSelection.currentIngredients
                .filter((ingredient) => !ingredient.indispensable)
                .map((ingredient) => getIngredientKey(ingredient.name))
                .filter((key) => recipeSelection.activeIngredientSelection[key] ?? true),
              sourceContextSummary: selectedRecipeSavedConfig?.sourceContextSummary ?? null,
              resolvedPortion: recipeSelection.portion,
              scaleFactor: cookingProgress.timerScaleFactor,
            });
          }
        }}
        isBackgroundMuted={isRecipeSetupSheetOpen || isIngredientsSheetOpen || isPlanSheetOpen}
      />
      ) : (
      shouldRenderCookingV2Path ? (
        <CookingScreenV2
          selectedRecipe={recipeSelection.selectedRecipe}
          scaledRecipe={scaledStandardRecipe}
        presentation={standardPresentation}
        currentStep={standardCooking.currentStep}
        currentSubStep={standardCooking.currentSubStep}
        currentIndex={standardCooking.currentIndex}
        totalItems={standardCooking.session.totalItems}
        progressPercent={standardCooking.progressPercent}
        isRecipeFinished={standardCooking.isRecipeFinished}
        activeIngredients={activeV2Ingredients}
        isRunning={standardTimer.isRunning}
        hasTimer={standardTimer.hasTimer}
        isTimerExpired={standardTimer.isExpired}
        timeRemaining={standardTimer.timeRemaining}
        onResetTimer={() => {
          standardTimer.resetTimer();
          if (standardTimer.isExpired) {
            standardTimer.togglePause();
          }
        }}
        onPrevious={standardCooking.goPrevious}
          onNext={handleStandardPrimaryAction}
          primaryActionLabel={standardPrimaryAction.label}
          primaryActionKind={standardPrimaryAction.kind}
          onTogglePause={standardTimer.togglePause}
        onOpenIngredients={() => {
          if (openJourneyStageFromCooking('ingredients')) return;
          openIngredientsSheet();
        }}
        onOpenSetup={() => {
          if (openJourneyStageFromCooking('setup')) return;
          openRecipeSetupSheet();
        }}
        onExitRecipe={() => {
          exitCurrentRecipe();
        }}
      />
      ) : (
      // Fallback-only legacy cooking branch. Keep stable, but do not route new flows here.
      <CookingScreen
        appVersion={appVersion}
        voiceEnabled={voiceEnabled}
        onVoiceToggle={voice.handleVoiceToggle}
        speechSupported={voice.speechSupported}
        onChangeMission={handlers.handleChangeMission}
        currentRecipeData={cookingProgress.currentRecipeData}
        currentStepIndex={cookingProgress.currentStepIndex}
        currentSubStepIndex={cookingProgress.currentSubStepIndex}
        currentSubStep={cookingProgress.currentSubStep}
        isRunning={cookingProgress.isRunning}
        timeRemaining={cookingProgress.timeRemaining}
        onTogglePause={handlers.handleTogglePause}
        onPrevious={handlers.handlePrevious}
        onNext={handlers.handleNext}
        onJumpToSubStep={handlers.handleJumpToSubStep}
        onContinue={handlers.handleContinue}
        onConfirmNextUnit={handlers.handleConfirmNextUnit}
        onOpenIngredients={() => {
          if (openJourneyStageFromCooking('ingredients')) return;
          handlers.handleOpenIngredientsFromCooking();
        }}
        onOpenSetup={() => {
          if (openJourneyStageFromCooking('setup')) return;
          handlers.handleOpenSetupFromCooking();
        }}
        onExitRecipe={handlers.handleExitCooking}
        onPlanRecipe={() => {
          if (recipeSelection.selectedRecipe) {
            openPlanSheetForRecipe(recipeSelection.selectedRecipe, null, {
              quantityMode: recipeSelection.quantityMode,
              peopleCount: recipeSelection.peopleCount,
              amountUnit: recipeSelection.quantityMode === 'have' ? recipeSelection.amountUnit : null,
              availableCount: recipeSelection.quantityMode === 'have' ? recipeSelection.availableCount : null,
              selectedOptionalIngredients: recipeSelection.currentIngredients
                .filter((ingredient) => !ingredient.indispensable)
                .map((ingredient) => getIngredientKey(ingredient.name))
                .filter((key) => recipeSelection.activeIngredientSelection[key] ?? true),
              sourceContextSummary: selectedRecipeSavedConfig?.sourceContextSummary ?? null,
              resolvedPortion: recipeSelection.portion,
              scaleFactor: cookingProgress.timerScaleFactor,
            });
          }
        }}
        activeStepLoop={cookingProgress.activeStepLoop}
        portion={recipeSelection.portion}
        awaitingNextUnitConfirmation={cookingProgress.awaitingNextUnitConfirmation}
        flipPromptVisible={cookingProgress.flipPromptVisible}
        flipPromptCountdown={cookingProgress.flipPromptCountdown}
        stirPromptVisible={cookingProgress.stirPromptVisible}
        stirPromptCountdown={cookingProgress.stirPromptCountdown}
        effectiveReminderTitle={effectiveReminderTitle}
        effectiveReminderMessage={effectiveReminderMessage}
        isRetirarSubStep={isRetirarSubStep}
        retirarTitle={retirarTitle}
        retirarMessage={retirarMessage}
        currentStep={cookingProgress.currentStep}
        portionValue={portionValue}
        currentIngredients={recipeSelection.currentIngredients}
        activeIngredientSelection={recipeSelection.activeIngredientSelection}
        activeRecipeContent={recipeSelection.activeRecipeContent}
        selectedRecipe={recipeSelection.selectedRecipe}
        peopleCount={recipeSelection.peopleCount}
        quantityMode={recipeSelection.quantityMode}
        isBackgroundMuted={isRecipeSetupSheetOpen || isIngredientsSheetOpen || isPlanSheetOpen}
      />
      )
      )}
    </Suspense>
    {recipeOverlays}
    {planRecipeSheet}
    </>
  );
}
