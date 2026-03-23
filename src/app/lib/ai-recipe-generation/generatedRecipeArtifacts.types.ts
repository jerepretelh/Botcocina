import type {
  AIRecipeContextDraft,
  Portion,
  Recipe,
  RecipeContent,
  RecipeSeed,
  SavedRecipeContextSummary,
} from '../../types';
import type { RecipeYieldV2 } from '../../types/recipe-v2';
import type { GeneratedRecipe } from '../recipeAI';
import type { CanonicalRecipeV2 } from '../recipe-v2/canonicalRecipeV2';

export type ClarifiedSizing = {
  quantityMode: 'people' | 'have';
  count: number;
  amountUnit?: 'units' | 'grams';
} | null;

export interface PreparedGeneratedAIRecipe {
  existingEquivalentRecipe: Recipe | undefined;
  recipeId: string;
  recipeName: string;
  recipe: Recipe;
  content: RecipeContent;
  recipeV2: CanonicalRecipeV2;
  nextIngredientSelection: Record<string, boolean>;
  initialConfig: {
    quantityMode: 'people' | 'have';
    peopleCount: number | null;
    amountUnit: 'units' | 'grams' | null;
    availableCount: number | null;
    targetYield: RecipeYieldV2;
    selectedOptionalIngredients: string[];
    sourceContextSummary: SavedRecipeContextSummary | null;
  };
  nextRuntime: {
    quantityMode: 'people' | 'have';
    amountUnit: 'units' | 'grams';
    availableCount: number;
    peopleCount: number;
    portion: Portion;
    timerScaleFactor: number;
    timingAdjustedLabel: string;
    isCompound: boolean;
  };
}

export type PrepareGeneratedAIRecipeArtifactsArgs = {
  generatedRecipe: GeneratedRecipe;
  availableRecipes: Recipe[];
  recipeContentById: Record<string, RecipeContent>;
  aiUserId?: string | null;
  contextDraft: AIRecipeContextDraft;
  selectedSeed: RecipeSeed | null;
  suggestedTitle: string | null;
  clarifiedSizing: ClarifiedSizing;
  clarifiedPeopleCount: number | null;
  canUseCompoundRecipes: boolean;
};

export type ResolvedCompoundExperience = Partial<Pick<RecipeContent, 'compoundMeta'>> & {
  experience?: Recipe['experience'];
};

export type NormalizedGeneratedRecipe = {
  generated: ReturnType<typeof import('../../utils/recipeHelpers').ensureRecipeShape>;
  inferredPortion: Portion | null;
  contextualPeopleCount: number | null;
  resolvedPeopleCount: number | null;
  generatedV2: CanonicalRecipeV2;
  content: RecipeContent;
  compoundExperience: ResolvedCompoundExperience;
};

export type GeneratedRecipeIdentity = {
  recipeName: string;
  existingEquivalentRecipe: Recipe | undefined;
  recipeId: string;
  recipe: Recipe;
  recipeV2: CanonicalRecipeV2;
};

export type GeneratedRecipeRuntimeState = Pick<
  PreparedGeneratedAIRecipe,
  'initialConfig' | 'nextRuntime' | 'nextIngredientSelection'
>;
