import type { CompoundRecipeMeta, Recipe, RecipeContent } from '../../types/index.js';

export type RecipeYieldType =
  | 'servings'
  | 'units'
  | 'weight'
  | 'volume'
  | 'pan_size'
  | 'tray_size'
  | 'custom';

export type RecipeScalingModel = 'direct_yield' | 'base_ingredient' | 'container_bound';
export type RecipeScalingSensitivity = 'normal' | 'ratio_sensitive';

export type ScalingPolicy =
  | 'linear'
  | 'fixed'
  | 'gentle'
  | 'batch'
  | 'container_dependent'
  | 'non_scalable';

export type UnitFamily =
  | 'weight'
  | 'volume'
  | 'unit'
  | 'cup'
  | 'tbsp'
  | 'tsp'
  | 'container'
  | 'custom'
  | 'ambiguous';

export interface ContainerMetaV2 {
  kind: 'glass' | 'cup' | 'mold' | 'tray' | 'basket';
  sizeLabel?: string | null;
  capacityMl?: number | null;
  diameterCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
  depthCm?: number | null;
}

export interface CookingContextV2 {
  selectedContainerKey?: string | null;
  selectedContainerMeta?: ContainerMetaV2 | null;
}

export interface RecipeYieldV2 {
  type: RecipeYieldType;
  value: number | null;
  canonicalUnit: string | null;
  visibleUnit?: string | null;
  label?: string | null;
  containerKey?: string | null;
  containerMeta?: ContainerMetaV2 | null;
  unit?: string | null;
}

export interface IngredientAmountV2 {
  value: number | null;
  canonicalUnit: string | null;
  visibleUnit?: string | null;
  family: UnitFamily;
  text?: string | null;
  scalable: boolean;
  scalingPolicy: ScalingPolicy;
  unit?: string | null;
}

export interface ScaledAmountV2 extends IngredientAmountV2 {
  scaledValue: number | null;
  scaledCanonicalUnit: string | null;
  displayText: string;
}

export interface RecipeIngredientV2 {
  id: string;
  name: string;
  emoji: string;
  indispensable?: boolean;
  amount: IngredientAmountV2;
  notes?: string | null;
}

export interface StepTimerV2 {
  durationSeconds: number | null;
  scalingPolicy: ScalingPolicy;
}

export interface RecipeSubStepV2 {
  id: string;
  text: string;
  notes?: string | null;
  amount?: IngredientAmountV2 | null;
  timer?: StepTimerV2 | null;
}

export interface RecipeStepV2 {
  id: string;
  title: string;
  fireLevel?: 'low' | 'medium' | 'high';
  temperature?: number | null;
  equipment?: 'stove' | 'airfryer' | 'oven';
  activeMinutes?: number | null;
  passiveMinutes?: number | null;
  notes?: string | null;
  subSteps: RecipeSubStepV2[];
}

export interface RecipeTimeSummaryV2 {
  prepMinutes: number | null;
  cookMinutes: number | null;
  totalMinutes: number | null;
}

export interface RecipeV2 {
  id: string;
  name: string;
  description?: string | null;
  tip?: string | null;
  icon?: string | null;
  ingredient?: string | null;
  categoryId?: string | null;
  baseYield: RecipeYieldV2;
  ingredients: RecipeIngredientV2[];
  steps: RecipeStepV2[];
  timeSummary: RecipeTimeSummaryV2;
  experience?: 'standard' | 'compound';
  compoundMeta?: CompoundRecipeMeta;
  cookingContextDefaults?: CookingContextV2 | null;
  sourceRecipe?: Recipe | null;
  sourceContent?: RecipeContent | null;
  scalingModel?: RecipeScalingModel;
  sensitivity?: RecipeScalingSensitivity;
  baseIngredientId?: string | null;
  isCoreRecipe?: boolean;
}

export interface BatchResolutionV2 {
  batchCount: number;
  perBatchScaleFactor: number;
  containerFactor: number;
}

export interface ScaledRecipeIngredientV2 extends RecipeIngredientV2 {
  scaledAmount: ScaledAmountV2;
  displayAmount: string;
}

export interface ScaledRecipeSubStepV2 extends RecipeSubStepV2 {
  displayValue: string | number | null;
  durationSeconds: number | null;
}

export interface ScaledRecipeStepV2 extends Omit<RecipeStepV2, 'subSteps'> {
  subSteps: ScaledRecipeSubStepV2[];
}

export interface ScaledRecipeV2 extends Omit<RecipeV2, 'ingredients' | 'steps'> {
  selectedYield: RecipeYieldV2;
  selectedCookingContext?: CookingContextV2 | null;
  scaleFactor: number;
  batchResolution?: BatchResolutionV2 | null;
  ingredients: ScaledRecipeIngredientV2[];
  steps: ScaledRecipeStepV2[];
  warnings: string[];
}
