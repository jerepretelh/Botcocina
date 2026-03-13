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
import { matchesRecipeCategory } from '../lib/recipeCategoryMapping';
import { buildMixedRecipeSearchResults } from '../lib/mixedRecipeSearch';

import { useThermomixVoice } from '../hooks/useThermomixVoice';
import { useThermomixTimer } from '../hooks/useThermomixTimer';
import { useThermomixHandlers } from '../hooks/useThermomixHandlers';

import { CategorySelectScreen } from './screens/CategorySelectScreen';
import { IngredientsScreen } from './screens/IngredientsScreen';
import { RecipeLibraryScreen } from './screens/RecipeLibraryScreen';
import { GlobalRecipesScreen } from './screens/GlobalRecipesScreen';
import { GlobalRecipesCategoryScreen } from './screens/GlobalRecipesCategoryScreen';
import { formatVersionLabel } from '../lib/appMetadata';

const APPROX_GRAMS_PER_UNIT = 250;
const RecipeSetupScreen = lazy(() => import('./screens/RecipeSetupScreen').then((module) => ({ default: module.RecipeSetupScreen })));
const CookingScreen = lazy(() => import('./screens/CookingScreen').then((module) => ({ default: module.CookingScreen })));
const AIClarifyScreen = lazy(() => import('./screens/AIClarifyScreen').then((module) => ({ default: module.AIClarifyScreen })));
const DesignSystemScreen = lazy(() => import('./screens/DesignSystemScreen').then((module) => ({ default: module.DesignSystemScreen })));
const AISettingsScreen = lazy(() => import('./screens/AISettingsScreen').then((module) => ({ default: module.AISettingsScreen })));
const RecipeSeedSearchScreen = lazy(() => import('./screens/RecipeSeedSearchScreen').then((module) => ({ default: module.RecipeSeedSearchScreen })));
const WeeklyPlanScreen = lazy(() => import('./screens/WeeklyPlanScreen').then((module) => ({ default: module.WeeklyPlanScreen })));
const ShoppingListScreen = lazy(() => import('./screens/ShoppingListScreen').then((module) => ({ default: module.ShoppingListScreen })));
const ReleasesScreen = lazy(() => import('./screens/ReleasesScreen').then((module) => ({ default: module.ReleasesScreen })));
const PlanRecipeSheet = lazy(() => import('./screens/PlanRecipeSheet').then((module) => ({ default: module.PlanRecipeSheet })));

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
  const publicRecipes = useMemo(
    () => uniqueAvailableRecipes.filter((recipe) => (recipe.visibility ?? 'public') === 'public'),
    [uniqueAvailableRecipes],
  );
  const globalCategories = useMemo(
    () =>
      recipeCategories
        .filter((category) => category.id !== 'personalizadas')
        .map((category) => ({
          category,
          recipeCount: publicRecipes.filter((recipe) => matchesRecipeCategory(category.id, recipe.categoryId)).length,
          ideaCount: recipeSeeds.seeds.filter((seed) => matchesRecipeCategory(category.id, seed.categoryId)).length,
        }))
        .filter((entry) => entry.recipeCount > 0 || entry.ideaCount > 0),
    [publicRecipes, recipeSeeds.seeds],
  );
  const globalCategoryItems = useMemo(() => {
    if (!recipeSelection.selectedCategory) return [];

    const recipeItems = publicRecipes
      .filter((recipe) => matchesRecipeCategory(recipeSelection.selectedCategory, recipe.categoryId))
      .map((recipe) => ({ id: `recipe:${recipe.id}`, kind: 'recipe' as const, recipe }));
    const seedItems = recipeSeeds.seeds
      .filter((seed) => matchesRecipeCategory(recipeSelection.selectedCategory, seed.categoryId))
      .map((seed) => ({ id: `seed:${seed.id}`, kind: 'seed' as const, seed }));

    return [...recipeItems, ...seedItems].sort((a, b) => {
      const aLabel = a.kind === 'recipe' ? a.recipe?.name ?? '' : a.seed?.name ?? '';
      const bLabel = b.kind === 'recipe' ? b.recipe?.name ?? '' : b.seed?.name ?? '';
      return aLabel.localeCompare(bLabel);
    });
  }, [publicRecipes, recipeSeeds.seeds, recipeSelection.selectedCategory]);
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

  const closeRecipeOverlays = () => {
    setIsRecipeSetupSheetOpen(false);
    setIsIngredientsSheetOpen(false);
    setRecipeOverlayPinnedPath(null);
  };

  const openRecipeSetupSheet = () => {
    setIsIngredientsSheetOpen(false);
    setIsRecipeSetupSheetOpen(true);
  };

  const closeRecipeSetupSheet = () => {
    setIsRecipeSetupSheetOpen(false);
    setRecipeOverlayPinnedPath(null);
  };

  const openIngredientsSheet = () => {
    setIsRecipeSetupSheetOpen(false);
    setIsIngredientsSheetOpen(true);
  };

  const closeIngredientsSheet = () => {
    setIsIngredientsSheetOpen(false);
    setRecipeOverlayPinnedPath(null);
  };

  const hydrateRecipeSelection = (recipe: Recipe) => {
    const content = recipeSelection.recipeContentById[recipe.id] ?? null;
    const savedConfig = userRecipeConfigs.configsByRecipeId[recipe.id] ?? null;
    const setupBehavior = deriveRecipeSetupBehavior(recipe, content, savedConfig);

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
    recipeSelection.setSelectedCategory(recipe.categoryId);

    const resolvedQuantityMode =
      savedConfig && (setupBehavior === 'saved_config_first' || setupBehavior === 'servings_or_quantity')
        ? (setupBehavior !== 'servings_only' && savedConfig.quantityMode === 'have' ? 'have' : 'people')
        : 'people';
    const resolvedPeopleCount = savedConfig?.peopleCount ?? 2;
    const resolvedAvailableCount = savedConfig?.availableCount ?? 2;
    const resolvedAmountUnit = savedConfig?.amountUnit ?? 'units';

    if (savedConfig && (setupBehavior === 'saved_config_first' || setupBehavior === 'servings_or_quantity')) {
      recipeSelection.setQuantityMode(resolvedQuantityMode);
      recipeSelection.setPeopleCount(resolvedPeopleCount);
      recipeSelection.setAvailableCount(resolvedAvailableCount);
      recipeSelection.setAmountUnit(resolvedAmountUnit);
    } else {
      recipeSelection.setQuantityMode('people');
      recipeSelection.setPeopleCount(2);
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

  useEffect(() => {
    const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';

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
    if (normalizedPath === '/recetas-globales') {
      recipeSelection.setSelectedCategory(null);
      recipeSelection.setScreenDirect('global-recipes');
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
      const recipe = recipeSelection.availableRecipes.find((item) => item.id === recipeId);

      if (!recipe) {
        if (recipeSelection.isSyncingCatalog) return;
        routeSyncRef.current = false;
        navigate('/', { replace: true });
        return;
      }

      const hydratedRecipe = hydrateRecipeSelection(recipe);
      if (stage === 'configurar') {
        cookingProgress.setTimerScaleFactor(1);
        cookingProgress.setTimingAdjustedLabel('Tiempo estándar');
        recipeSelection.setScreenDirect('category-select');
        setRecipeOverlayPinnedPath(normalizedPath);
        openRecipeSetupSheet();
      } else if (stage === 'ingredientes') {
        cookingProgress.setTimerScaleFactor(1);
        cookingProgress.setTimingAdjustedLabel('Tiempo estándar');
        recipeSelection.setScreenDirect('category-select');
        setRecipeOverlayPinnedPath(normalizedPath);
        openIngredientsSheet();
      } else {
        setRecipeOverlayPinnedPath(null);
        initializeCookingBase(recipe, {
          content: hydratedRecipe?.content ?? null,
          activeIngredientSelection: hydratedRecipe?.hydratedSelection,
          quantityMode: hydratedRecipe?.quantityMode,
          peopleCount: hydratedRecipe?.peopleCount,
          amountUnit: hydratedRecipe?.amountUnit,
          availableCount: hydratedRecipe?.availableCount,
          portion: hydratedRecipe?.portion,
        });
        recipeSelection.setScreenDirect('cooking');
        closeRecipeOverlays();
      }
      return;
    }

    routeSyncRef.current = false;
    navigate('/', { replace: true });
  }, [location.pathname, recipeSelection.availableRecipes, recipeSelection.isSyncingCatalog, userRecipeConfigs.configsByRecipeId, recipeSelection.recipeContentById, recipeSelection.ingredientSelectionByRecipe]);

  useEffect(() => {
    if (routeSyncRef.current) {
      routeSyncRef.current = false;
      return;
    }

    const recipeId = recipeSelection.selectedRecipe?.id ? encodeURIComponent(recipeSelection.selectedRecipe.id) : null;
    const categoryId = recipeSelection.selectedCategory ? encodeURIComponent(recipeSelection.selectedCategory) : null;

    const activeRecipeOverlay = isIngredientsSheetOpen ? 'ingredients' : isRecipeSetupSheetOpen ? 'recipe-setup' : null;

    const targetPath =
      recipeOverlayPinnedPath && activeRecipeOverlay && screen !== 'cooking'
        ? recipeOverlayPinnedPath
        :
      screen === 'category-select'
        ? '/'
        : screen === 'global-recipes'
          ? '/recetas-globales'
        : screen === 'design-system'
          ? '/design-system'
        : screen === 'recipe-seed-search'
          ? '/buscar-recetas'
        : screen === 'ai-settings'
          ? '/ajustes'
        : screen === 'releases'
          ? '/releases'
        : screen === 'my-recipes'
          ? '/mis-recetas'
        : screen === 'favorites'
          ? '/favoritos'
        : screen === 'weekly-plan'
          ? '/plan-semanal'
        : screen === 'shopping-list'
          ? '/compras'
        : screen === 'recipe-select'
          ? categoryId ? `/recetas-globales/${categoryId}` : '/recetas-globales'
          : screen === 'ai-clarify'
            ? '/ia/aclarar'
            : screen === 'recipe-setup' || screen === 'ingredients' || screen === 'cooking'
              ? recipeId
                ? activeRecipeOverlay === 'recipe-setup'
                  ? `/recetas/${recipeId}/configurar`
                  : activeRecipeOverlay === 'ingredients'
                    ? `/recetas/${recipeId}/ingredientes`
                    : `/recetas/${recipeId}/cocinar`
                : null
              : '/';

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
    if (!auth.userId || !isRecipeFinished || !recipeSelection.selectedRecipe) return;
    void trackProductEvent(auth.userId, 'recipe_complete', {
      recipeId: recipeSelection.selectedRecipe.id,
    });
  }, [auth.userId, isRecipeFinished, recipeSelection.selectedRecipe]);

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
    closeRecipeOverlays();
  }, [screen]);

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

  const portionValue = currentSubStep?.isTimer
    ? (typeof currentSubStep.portions[recipeSelection.portion] === 'number'
      ? Math.round((currentSubStep.portions[recipeSelection.portion] as number) * portions.setupScaleFactor)
      : null)
    : (currentSubStep?.portions[recipeSelection.portion] as string || null);

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
    closeRecipeOverlays,
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

  const applyPlannedRecipeSnapshot = (item: WeeklyPlanItem, targetScreen: 'recipe-setup' | 'cooking') => {
    const recipe = item.recipeId ? recipeSelection.availableRecipes.find((candidate) => candidate.id === item.recipeId) ?? null : null;
    if (!recipe) return;
    const content = recipeSelection.recipeContentById[recipe.id];
    if (!content) return;

    const hydratedSelection = Object.fromEntries(
      content.ingredients.map((ingredient) => {
        const key = getIngredientKey(ingredient.name);
        if (ingredient.indispensable) return [key, true];
        if (item.configSnapshot.selectedOptionalIngredients.length === 0) return [key, true];
        return [key, item.configSnapshot.selectedOptionalIngredients.includes(key)];
      }),
    );

    recipeSelection.setIngredientSelectionByRecipe((prev) => ({
      ...prev,
      [recipe.id]: hydratedSelection,
    }));
    recipeSelection.setSelectedRecipe(recipe);
    recipeSelection.setSelectedCategory(recipe.categoryId);
    recipeSelection.setQuantityMode(item.configSnapshot.quantityMode);
    recipeSelection.setPeopleCount(item.configSnapshot.peopleCount ?? 2);
    recipeSelection.setAmountUnit((item.configSnapshot.amountUnit ?? 'units') as 'units' | 'grams');
    recipeSelection.setAvailableCount(item.configSnapshot.availableCount ?? 2);
    recipeSelection.setPortion(item.configSnapshot.resolvedPortion);
    cookingProgress.setTimerScaleFactor(item.configSnapshot.scaleFactor);
    cookingProgress.setTimingAdjustedLabel(
      Math.abs(item.configSnapshot.scaleFactor - 1) < 0.01
        ? 'Tiempo estándar'
        : `Tiempo ajustado x${item.configSnapshot.scaleFactor.toFixed(2)}`,
    );
    setActivePlannedRecipeItemId(item.id);

    if (targetScreen === 'cooking') {
      const session = buildCookingSessionState({
        selectedRecipe: recipe,
        activeRecipeContentSteps: content.steps,
        currentIngredients: content.ingredients,
        activeIngredientSelection: hydratedSelection,
        quantityMode: item.configSnapshot.quantityMode,
        amountUnit: (item.configSnapshot.amountUnit ?? 'units') as 'units' | 'grams',
        availableCount: item.configSnapshot.availableCount ?? 2,
        peopleCount: item.configSnapshot.peopleCount ?? 2,
        portion: item.configSnapshot.resolvedPortion,
        timerScaleFactor: item.configSnapshot.scaleFactor,
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
      recipeSelection.setScreen('cooking');
      closeRecipeOverlays();
      return;
    }

    setRecipeOverlayPinnedPath(null);
    openRecipeSetupSheet();
  };

  const handleRecipeOpen = (recipe: Recipe) => {
    setActivePlannedRecipeItemId(null);
    const hydratedRecipe = hydrateRecipeSelection(recipe);
    setRecipeOverlayPinnedPath(null);
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
    cookingProgress.setTimerScaleFactor(1);
    cookingProgress.setTimingAdjustedLabel('Tiempo estándar');
    openRecipeSetupSheet();
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

  const handleEnterCookingFromOverlay = () => {
    handlers.handleStartCooking();
    if (recipeSelection.selectedRecipe?.id) {
      const recipeId = encodeURIComponent(recipeSelection.selectedRecipe.id);
      navigate(`/recetas/${recipeId}/cocinar`);
    }
  };

  useThermomixTimer({
    ...recipeSelection,
    ...cookingProgress,
    ...portions,
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
            onBack={closeRecipeSetupSheet}
            onContinue={handlers.handleSetupContinue}
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
                  resolvedPortion: portions.setupPortionPreview,
                  scaleFactor: portions.setupScaleFactor,
                });
              }
            }}
          />
        </Suspense>
      ) : null}
      {isIngredientsSheetOpen && recipeSelection.selectedRecipe ? (
        <Suspense fallback={null}>
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
            onStartCooking={handleEnterCookingFromOverlay}
            currentRecipeData={recipeSelection.activeRecipeContent.steps}
          />
        </Suspense>
      ) : null}
    </>
  );

  // Render Logic
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
            recipeSelection.setSelectedCategory(category.id);
            recipeSelection.setScreen('recipe-select');
          }}
          onGoHome={() => recipeSelection.setScreen('category-select')}
          onGoGlobalRecipes={() => recipeSelection.setScreen('global-recipes')}
          onGoMyRecipes={() => recipeSelection.setScreen('my-recipes')}
          onGoFavorites={() => recipeSelection.setScreen('favorites')}
          onGoWeeklyPlan={() => recipeSelection.setScreen('weekly-plan')}
          onGoShoppingList={() => recipeSelection.setScreen('shopping-list')}
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
            onGoSettings={() => recipeSelection.setScreen('ai-settings')}
            onOpenReleases={() => recipeSelection.setScreen('releases')}
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
          category={recipeSelection.selectedCategoryMeta}
          items={globalCategoryItems}
          favoriteRecipeIds={userFavorites.favoriteRecipeIds}
          onBack={() => recipeSelection.goBackScreen('global-recipes')}
          onOpenRecipe={handleRecipeOpen}
          onOpenSeed={(seed) => aiRecipeGen.startWizardFromSeed(seed)}
          onToggleFavorite={(recipeId) => void userFavorites.toggleFavorite(recipeId)}
          onGoHome={() => recipeSelection.setScreen('category-select')}
          onGoGlobalRecipes={() => recipeSelection.setScreen('global-recipes')}
          onGoMyRecipes={() => recipeSelection.setScreen('my-recipes')}
          onGoFavorites={() => recipeSelection.setScreen('favorites')}
          onGoWeeklyPlan={() => recipeSelection.setScreen('weekly-plan')}
          onGoShoppingList={() => recipeSelection.setScreen('shopping-list')}
          onGoSettings={() => recipeSelection.setScreen('ai-settings')}
          onSignOut={() => void auth.signOut()}
        />
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
        onOpenIngredients={handlers.handleOpenIngredientsFromCooking}
        onOpenSetup={handlers.handleOpenSetupFromCooking}
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
        isBackgroundMuted={isRecipeSetupSheetOpen || isIngredientsSheetOpen || isPlanSheetOpen}
      />
    </Suspense>
    {recipeOverlays}
    {planRecipeSheet}
    </>
  );
}
