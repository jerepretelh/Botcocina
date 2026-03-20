import type { CookingContextV2, RecipeScalingModel, RecipeV2, RecipeYieldV2 } from '../../types/recipe-v2';

export type RecipeJourneyStage = 'setup' | 'ingredients' | 'cook' | 'done';
export type RecipePresentationMode = 'sheet' | 'page';
export type RecipeFlowType = 'standard' | 'compound';
export type RecipeSetupFieldKind = 'yield' | 'cooking_context' | 'optional_ingredients' | 'resume_choice';

export type UnifiedRecipeYield = RecipeYieldV2;
export type UnifiedCookingContext = CookingContextV2;

export interface RecipeSetupFieldDefinition {
  id: string;
  kind: RecipeSetupFieldKind;
  required: boolean;
  defaultValue?: unknown;
  autoSkip?: boolean;
}

export interface UnifiedRecipeDefinition {
  id: string;
  name: string;
  flowType: RecipeFlowType;
  yield: {
    base: UnifiedRecipeYield;
    scalingModel: RecipeScalingModel | null | undefined;
  };
  setup: {
    fields: RecipeSetupFieldDefinition[];
    defaults?: {
      yield?: UnifiedRecipeYield | null;
      cookingContext?: UnifiedCookingContext | null;
    };
  };
  ingredients: {
    allowOptionalSelection: boolean;
  };
  cook: {
    supportsResume: boolean;
  };
  capabilities: {
    supportsCookingContext: boolean;
    supportsOptionalIngredients: boolean;
  };
  presentationHints?: {
    preferredPresentationMode?: RecipePresentationMode;
  };
  sourceRecipeV2?: RecipeV2 | null;
}

export interface RecipeJourneyState {
  recipeId: string;
  currentStage: RecipeJourneyStage;
  returnTo: string | null;
  presentationMode: RecipePresentationMode;
  setup: {
    selectedYield: UnifiedRecipeYield | null;
    selectedCookingContext: UnifiedCookingContext | null;
    isValid: boolean;
  };
  ingredients: {
    selectedIngredientIds: string[];
    isConfirmed: boolean;
  };
}

export interface CookRuntimeBridgePayload {
  recipeId: string;
  flowType: RecipeFlowType;
  selectedYield: UnifiedRecipeYield | null;
  selectedCookingContext: UnifiedCookingContext | null;
  selectedIngredientIds: string[];
}

export type LegacyCookingBridgePayload = CookRuntimeBridgePayload;

export interface RecipeSessionState {
  sessionId: string;
  recipeId: string;
  status: 'idle' | 'active' | 'completed' | 'abandoned';
  lastStage: RecipeJourneyStage;
  journey: RecipeJourneyState;
  persistedAt: string | null;
}
