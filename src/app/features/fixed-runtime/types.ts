export type FixedRuntimeScreen = 'library' | 'create' | 'runtime';

export interface FixedRecipeIngredientAmount {
  value: number | string;
  unit: string;
}

export interface FixedRecipeIngredientItem {
  name: string;
  canonicalName: string;
  shoppingKey?: string;
  amount: number | string;
  unit: string;
  displayAmount?: string;
  displayUnit?: string;
  notes?: string;
  preparation?: string;
  isFlexible?: boolean;
  isOptional?: boolean;
  purchasable?: boolean;
}

export interface FixedRecipeStepIngredientRef {
  name: string;
  canonicalName: string;
  shoppingKey?: string;
  amount: number | string;
  unit: string;
  displayAmount?: string;
  displayUnit?: string;
  notes?: string;
  preparation?: string;
  isFlexible?: boolean;
  isOptional?: boolean;
}

export interface FixedRecipeIngredientGroup {
  title: string;
  icon?: string | null;
  items: FixedRecipeIngredientItem[];
}

export interface FixedRecipeStep {
  id: string;
  kind?: 'action' | 'timer' | 'result';
  text: string;
  container?: string;
  timer?: number;
  type?: 'result';
  ingredients?: FixedRecipeStepIngredientRef[];
  groupId?: string;
  groupTitle?: string;
  groupStepText?: string;
  groupPosition?: 'header' | 'substep';
  groupSubstepIndex?: number;
  groupSubstepCount?: number;
}

export interface FixedRecipePhase {
  id: string;
  number: string;
  title: string;
  emoji?: string | null;
  steps: FixedRecipeStep[];
}

export interface FixedRecipeJson {
  id: string;
  title: string;
  yield?: string;
  recipeCategory?: 'stovetop' | 'baking' | 'dessert' | 'airfryer' | 'beverage' | 'other';
  equipment?: string[];
  servings: number;
  ingredients: FixedRecipeIngredientGroup[];
  phases: FixedRecipePhase[];
}

export interface FixedTimerState {
  duration: number;
  remaining: number;
  running: boolean;
  done: boolean;
}

export interface FixedRecipeStepMeta extends FixedRecipeStep {
  phaseId: string;
  phaseTitle: string;
  phaseNumber: string;
  phaseEmoji?: string | null;
  phaseIndex: number;
  stepIndex: number;
}
