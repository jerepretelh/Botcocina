export type Screen = 'category-select' | 'recipe-select' | 'recipe-seed-search' | 'ai-clarify' | 'recipe-setup' | 'ingredients' | 'cooking' | 'design-system' | 'ai-settings' | 'releases' | 'my-recipes' | 'favorites' | 'weekly-plan' | 'shopping-list';
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';
export type AppEnvironment = 'production' | 'preview' | 'development';
export type Portion = 1 | 2 | 4;
export type RecipeCategoryId =
    | 'breakfast'
    | 'lunch'
    | 'dinner'
    | 'pescados-mariscos'
    | 'carnes-pollo'
    | 'arroces-pastas'
    | 'sopas-guisos'
    | 'postres'
    | 'saludables-veggies'
    | 'desayunos'
    | 'almuerzos'
    | 'cenas'
    | 'airfryer'
    | 'frituras'
    | 'arroces'
    | 'hervidos'
    | 'sopas'
    | 'personalizadas';
export type QuantityMode = 'people' | 'have';
export type AmountUnit = 'units' | 'grams';
export type ClarificationNumberMode = 'people' | 'quantity';
export type ClarificationQuantityUnit = 'units' | 'grams';
export type ClarificationNumberIntent = 'servings' | 'ingredient_base';
export type CookingEquipment = 'stove' | 'airfryer' | 'oven';
export type CatalogSource = 'supabase' | 'local-dev';
export type CatalogViewMode = 'platform' | 'my-lists' | 'all';
export type AIProvider = 'google_gemini' | 'openai';
export type AIAuthMode = 'platform_key' | 'user_key';
export type AIBudgetMode = 'none' | 'app_limit' | 'cloud_budget';
export type AIKeyCheckStatus = 'unknown' | 'valid' | 'invalid';
export type AIRequestKind = 'generate' | 'clarify' | 'validate';
export type AIRequestStatus = 'success' | 'failed' | 'blocked';
export type AIWizardStep = 'context' | 'refinement' | 'generating';
export type AIRequestSource = 'real' | 'mock';
export type RecipeSetupBehavior = 'servings_only' | 'servings_or_quantity' | 'saved_config_first';
export type WeeklyPlanView = 'calendar' | 'list';
export type ShoppingListView = 'totalized' | 'by_recipe';
export type WeeklyPlanSlot = 'desayuno' | 'almuerzo' | 'cena';
export type ShoppingListItemSourceType = 'plan_auto' | 'manual';
export type ShoppingTripStatus = 'active' | 'checked_out' | 'cancelled';
export type ShoppingTripItemStatus = 'pending' | 'in_cart' | 'skipped';

export type IngredientsBackScreen = 'recipe-setup' | 'ai-clarify' | 'cooking';

export interface AIIngredientToken {
    id: string;
    value: string;
}

export interface AIRecipeContextDraft {
    prompt: string;
    servings: number | null;
    availableIngredients: AIIngredientToken[];
    avoidIngredients: AIIngredientToken[];
}

export interface RecipeSeed {
    id: string;
    name: string;
    categoryId: RecipeCategoryId;
    searchTerms: string[];
    shortDescription?: string | null;
    locale: string;
    isActive: boolean;
    sortOrder: number;
}

export interface RecipeSeedSearchResult extends RecipeSeed {}

export interface AppRelease {
    version: string;
    title: string;
    date: string;
    summary: string;
    changes: string[];
    environmentNote?: string | null;
}

export interface SavedRecipeContextSummary {
    prompt?: string | null;
    servings?: number | null;
    quantityMode?: QuantityMode | null;
    amountUnit?: AmountUnit | null;
    availableCount?: number | null;
    availableIngredients?: string[];
    avoidIngredients?: string[];
    summaryLabel?: string | null;
    seedId?: string | null;
    seedName?: string | null;
    seedCategoryId?: RecipeCategoryId | null;
}

export interface UserRecipeCookingConfig {
    userId: string;
    recipeId: string;
    quantityMode: QuantityMode;
    peopleCount: number | null;
    amountUnit: AmountUnit | null;
    availableCount: number | null;
    selectedOptionalIngredients: string[];
    sourceContextSummary: SavedRecipeContextSummary | null;
    lastUsedAt: string;
    createdAt: string;
    updatedAt: string;
}

export interface WeeklyPlan {
    id: string;
    userId: string;
    title: string;
    status: 'active' | 'archived';
    weekStartDate: string;
    createdAt: string;
    updatedAt: string;
}

export interface WeeklyPlanItemConfigSnapshot {
    quantityMode: QuantityMode;
    peopleCount: number | null;
    amountUnit: AmountUnit | null;
    availableCount: number | null;
    selectedOptionalIngredients: string[];
    sourceContextSummary: SavedRecipeContextSummary | null;
    resolvedPortion: Portion;
    scaleFactor: number;
}

export interface WeeklyPlanItem {
    id: string;
    weeklyPlanId: string;
    dayOfWeek: number | null;
    slot: WeeklyPlanSlot | null;
    recipeId: string | null;
    recipeNameSnapshot: string;
    notes: string | null;
    sortOrder: number;
    configSnapshot: WeeklyPlanItemConfigSnapshot;
    createdAt: string;
}

export interface ShoppingList {
    id: string;
    userId: string;
    weeklyPlanId: string | null;
    title: string;
    status: 'active' | 'archived';
    createdAt: string;
    updatedAt: string;
}

export interface ShoppingListItem {
    id: string;
    shoppingListId: string;
    itemName: string;
    quantityText: string | null;
    isChecked: boolean;
    sourceRecipeId: string | null;
    sourceType: ShoppingListItemSourceType;
    sourcePlanItemId: string | null;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
}

export interface ShoppingTrip {
    id: string;
    userId: string;
    shoppingListId: string;
    weeklyPlanId: string | null;
    status: ShoppingTripStatus;
    storeName: string | null;
    startedAt: string;
    checkedOutAt: string | null;
    estimatedTotal: number | null;
    finalTotal: number | null;
    createdAt: string;
    updatedAt: string;
}

export interface ShoppingTripItem {
    id: string;
    shoppingTripId: string;
    shoppingListItemId: string | null;
    plannedItemNameSnapshot: string | null;
    actualItemName: string;
    plannedQuantityText: string | null;
    actualQuantityText: string | null;
    unitPrice: number | null;
    lineTotal: number | null;
    status: ShoppingTripItemStatus;
    isInCart: boolean;
    isExtra: boolean;
    notes: string | null;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
}

export interface ShoppingVarianceSummary {
    plannedCount: number;
    pendingCount: number;
    inCartCount: number;
    changedCount: number;
    skippedCount: number;
    extraCount: number;
    runningTotal: number;
    finalTotal: number | null;
}

export interface NormalizedIngredientAmount {
    normalizedName: string;
    displayName: string;
    canonicalUnit: string | null;
    unitFamily: 'weight' | 'volume' | 'unit' | 'cup' | 'tbsp' | 'tsp' | 'ambiguous';
    numericValue: number | null;
    quantityText: string;
    recipeId: string | null;
    recipeName: string;
    isAmbiguous: boolean;
}

export interface ShoppingAggregationEntry {
    key: string;
    itemName: string;
    quantityText: string;
    isAmbiguous: boolean;
    sourceRecipes: Array<{
        recipeId: string | null;
        recipeName: string;
    }>;
    sourcePlanItemIds: string[];
}

export interface ShoppingAggregationByRecipeGroup {
    planItemId: string;
    recipeId: string | null;
    recipeName: string;
    dayOfWeek: number | null;
    slot: WeeklyPlanSlot | null;
    items: ShoppingAggregationEntry[];
}

export interface ShoppingAggregationResult {
    totalized: ShoppingAggregationEntry[];
    byRecipe: ShoppingAggregationByRecipeGroup[];
}

export interface RecipeCategory {
    id: RecipeCategoryId;
    name: string;
    icon: string;
    description?: string;
}

export interface Recipe {
    id: string;
    categoryId: RecipeCategoryId;
    name: string;
    icon: string;
    emoji?: string;
    ingredient: string;
    description: string;
    basePortions?: number;
    equipment?: CookingEquipment;
    ownerUserId?: string | null;
    visibility?: 'public' | 'private';
    createdAt?: string;
    updatedAt?: string;
}

export interface UserRecipeList {
    id: string;
    userId: string;
    name: string;
    slug: string;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface UserListRecipe {
    listId: string;
    recipeId: string;
    sortOrder: number;
    createdAt: string;
}

export interface UserFavorite {
    userId: string;
    recipeId: string;
    createdAt: string;
}

export interface SubStep {
    subStepName: string;
    notes: string;
    portions: {
        1: string | number;
        2: string | number;
        4: string | number;
    };
    isTimer: boolean;
}

export interface RecipeStep {
    stepNumber: number;
    stepName: string;
    fireLevel?: 'low' | 'medium' | 'high'; // For stove
    temperature?: number; // For airfryer/oven
    equipment?: CookingEquipment;
    subSteps: SubStep[];
}

export interface Ingredient {
    name: string;
    emoji: string;
    indispensable?: boolean;
    portions: {
        1: string;
        2: string;
        4: string;
    };
}

export interface RecipeContent {
    ingredients: Ingredient[];
    steps: RecipeStep[];
    tip: string;
    portionLabels: {
        singular: string;
        plural: string;
    };
}

export interface StepLoopState {
    stepIndex: number;
    totalItems: number;
    currentItem: number;
}

export interface FaceTimerPair {
    firstIndex: number;
    secondIndex: number;
    firstSeconds: number;
    secondSeconds: number;
}

export interface UserIdentity {
    anon_user_id: string;
    session_id: string;
    created_at: string;
}

export interface AIUsageMetadata {
    provider: AIProvider;
    model: string;
    authMode: AIAuthMode;
    promptTokens: number;
    outputTokens: number;
    totalTokens: number;
    budgetMode: AIBudgetMode;
    remainingPercent?: number | null;
    requestKind?: AIRequestKind;
}

export interface AIProviderSettings {
    aiProvider: 'google_gemini';
    authMode: AIAuthMode;
    googleModel: string;
    tokenBudgetMode: AIBudgetMode;
    monthlyTokenLimit: number | null;
    budgetAmount: number | null;
    isKeyConfigured: boolean;
    keyLast4: string | null;
    lastKeyCheckAt: string | null;
    lastKeyCheckStatus: AIKeyCheckStatus;
    lastKeyCheckError: string | null;
    canUseUserKey: boolean;
}

export interface AIRequestUsageRecord {
    id: string;
    provider: AIProvider;
    model: string;
    authMode: AIAuthMode;
    requestKind: AIRequestKind;
    requestStatus: AIRequestStatus;
    promptTokens: number;
    outputTokens: number;
    totalTokens: number;
    remainingPercent: number | null;
    errorCode: string | null;
    errorMessage: string | null;
    createdAt: string;
}

export interface AIUsageSnapshot {
    budgetMode: AIBudgetMode;
    monthlyTokenLimit: number | null;
    budgetAmount: number | null;
    currentMonthTokens: number;
    currentMonthRequests: number;
    avgTokensPerRequest: number;
    lastRequestAt: string | null;
    lastRequestTokens: number | null;
    remainingPercent: number | null;
    budgetStatusText: string;
    recentRequests: AIRequestUsageRecord[];
}
