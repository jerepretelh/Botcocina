import { useReducer, useCallback } from 'react';
import type { Recipe, RecipeCategoryId, RecipeContent, Portion } from '../types';

type Screen = 'category-select' | 'recipe-select' | 'ai-clarify' | 'recipe-setup' | 'ingredients' | 'cooking';

interface RecipeState {
  screen: Screen;
  selectedCategory: RecipeCategoryId | null;
  selectedRecipe: Recipe | null;
  availableRecipes: Recipe[];
  recipeContentById: Record<string, RecipeContent>;
  ingredientSelectionByRecipe: Record<string, Record<string, boolean>>;
  portion: Portion;
  quantityMode: 'people' | 'have';
  ingredientsBackScreen: 'recipe-setup' | 'ai-clarify';
}

export type RecipeAction =
  | { type: 'SET_SCREEN'; payload: Screen }
  | { type: 'SELECT_CATEGORY'; payload: RecipeCategoryId }
  | { type: 'SELECT_RECIPE'; payload: Recipe }
  | { type: 'BACK_TO_CATEGORY' }
  | { type: 'BACK_TO_RECIPE_SELECT' }
  | { type: 'ADD_RECIPE'; payload: { recipe: Recipe; content: RecipeContent } }
  | { type: 'UPDATE_PORTION'; payload: Portion }
  | { type: 'SET_QUANTITY_MODE'; payload: 'people' | 'have' }
  | { type: 'SET_INGREDIENT_SELECTION'; payload: { recipeId: string; selection: Record<string, boolean> } }
  | { type: 'SET_INGREDIENTS_BACK_SCREEN'; payload: 'recipe-setup' | 'ai-clarify' };

function recipeReducer(state: RecipeState, action: RecipeAction): RecipeState {
  switch (action.type) {
    case 'SET_SCREEN':
      return { ...state, screen: action.payload };

    case 'SELECT_CATEGORY':
      return {
        ...state,
        selectedCategory: action.payload,
        screen: 'recipe-select',
      };

    case 'SELECT_RECIPE':
      return {
        ...state,
        selectedRecipe: action.payload,
        screen: 'recipe-setup',
      };

    case 'BACK_TO_CATEGORY':
      return {
        ...state,
        selectedCategory: null,
        selectedRecipe: null,
        screen: 'category-select',
      };

    case 'BACK_TO_RECIPE_SELECT':
      return {
        ...state,
        selectedRecipe: null,
        screen: 'recipe-select',
      };

    case 'ADD_RECIPE':
      return {
        ...state,
        availableRecipes: [...state.availableRecipes, action.payload.recipe],
        recipeContentById: {
          ...state.recipeContentById,
          [action.payload.recipe.id]: action.payload.content,
        },
        selectedRecipe: action.payload.recipe,
        screen: 'recipe-setup',
      };

    case 'UPDATE_PORTION':
      return {
        ...state,
        portion: action.payload,
      };

    case 'SET_QUANTITY_MODE':
      return {
        ...state,
        quantityMode: action.payload,
      };

    case 'SET_INGREDIENT_SELECTION':
      return {
        ...state,
        ingredientSelectionByRecipe: {
          ...state.ingredientSelectionByRecipe,
          [action.payload.recipeId]: action.payload.selection,
        },
      };

    case 'SET_INGREDIENTS_BACK_SCREEN':
      return {
        ...state,
        ingredientsBackScreen: action.payload,
      };

    default:
      return state;
  }
}

export function useRecipeState(initialState: RecipeState) {
  const [state, dispatch] = useReducer(recipeReducer, initialState);

  const setScreen = useCallback((screen: Screen) => {
    dispatch({ type: 'SET_SCREEN', payload: screen });
  }, []);

  const selectCategory = useCallback((categoryId: RecipeCategoryId) => {
    dispatch({ type: 'SELECT_CATEGORY', payload: categoryId });
  }, []);

  const selectRecipe = useCallback((recipe: Recipe) => {
    dispatch({ type: 'SELECT_RECIPE', payload: recipe });
  }, []);

  const backToCategory = useCallback(() => {
    dispatch({ type: 'BACK_TO_CATEGORY' });
  }, []);

  const backToRecipeSelect = useCallback(() => {
    dispatch({ type: 'BACK_TO_RECIPE_SELECT' });
  }, []);

  const addRecipe = useCallback((recipe: Recipe, content: RecipeContent) => {
    dispatch({ type: 'ADD_RECIPE', payload: { recipe, content } });
  }, []);

  const updatePortion = useCallback((portion: Portion) => {
    dispatch({ type: 'UPDATE_PORTION', payload: portion });
  }, []);

  const setQuantityMode = useCallback((mode: 'people' | 'have') => {
    dispatch({ type: 'SET_QUANTITY_MODE', payload: mode });
  }, []);

  const setIngredientSelection = useCallback((recipeId: string, selection: Record<string, boolean>) => {
    dispatch({ type: 'SET_INGREDIENT_SELECTION', payload: { recipeId, selection } });
  }, []);

  const setIngredientsBackScreen = useCallback((screen: 'recipe-setup' | 'ai-clarify') => {
    dispatch({ type: 'SET_INGREDIENTS_BACK_SCREEN', payload: screen });
  }, []);

  return {
    state,
    setScreen,
    selectCategory,
    selectRecipe,
    backToCategory,
    backToRecipeSelect,
    addRecipe,
    updatePortion,
    setQuantityMode,
    setIngredientSelection,
    setIngredientsBackScreen,
  };
}
