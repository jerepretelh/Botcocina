export type Screen = 'category-select' | 'recipe-select' | 'ai-clarify' | 'recipe-setup' | 'ingredients' | 'cooking';
export type Portion = 1 | 2 | 4;
export type RecipeCategoryId = 'desayunos' | 'almuerzos' | 'cenas' | 'airfryer' | 'frituras' | 'arroces' | 'hervidos' | 'sopas' | 'personalizadas';
export type QuantityMode = 'people' | 'have';
export type AmountUnit = 'units' | 'grams';
export type ClarificationNumberMode = 'people' | 'quantity';
export type ClarificationQuantityUnit = 'units' | 'grams';
export type CookingEquipment = 'stove' | 'airfryer' | 'oven';

export type IngredientsBackScreen = 'recipe-setup' | 'ai-clarify';

export interface RecipeCategory {
    id: RecipeCategoryId;
    name: string;
    icon: string;
    description: string;
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
