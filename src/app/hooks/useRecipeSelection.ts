import { useState, useMemo } from 'react';
import {
    Screen,
    RecipeCategoryId,
    Recipe,
    RecipeContent,
    IngredientsBackScreen,
    QuantityMode,
    AmountUnit,
    Portion,
} from '../../types';
import { defaultRecipes, initialRecipeContent, recipeCategories } from '../data/recipes';
import { buildInitialIngredientSelection } from '../utils/recipeHelpers';

export function useRecipeSelection() {
    const [screen, setScreen] = useState<Screen>('category-select');
    const [availableRecipes, setAvailableRecipes] = useState<Recipe[]>(defaultRecipes);
    const [recipeContentById, setRecipeContentById] = useState<Record<string, RecipeContent>>(initialRecipeContent);
    const [selectedCategory, setSelectedCategory] = useState<RecipeCategoryId | null>(null);
    const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
    const [ingredientsBackScreen, setIngredientsBackScreen] = useState<IngredientsBackScreen>('recipe-setup');
    const [ingredientSelectionByRecipe, setIngredientSelectionByRecipe] = useState<Record<string, Record<string, boolean>>>({});

    // Basic configuration state
    const [quantityMode, setQuantityMode] = useState<QuantityMode>('people');
    const [amountUnit, setAmountUnit] = useState<AmountUnit>('units');
    const [produceType, setProduceType] = useState('blanca');
    const [produceSize, setProduceSize] = useState<'small' | 'medium' | 'large'>('medium');

    // Portion/quantity states (used as inputs to usePortions)
    const [portion, setPortion] = useState<Portion>(2);
    const [peopleCount, setPeopleCount] = useState(2);
    const [availableCount, setAvailableCount] = useState(1);

    const activeRecipeId = selectedRecipe?.id ?? 'arroz';
    const activeRecipeContent = recipeContentById[activeRecipeId] ?? initialRecipeContent.arroz;
    const currentIngredients = activeRecipeContent.ingredients;
    const currentTip = activeRecipeContent.tip;

    const activeIngredientSelection = useMemo(() => {
        return ingredientSelectionByRecipe[activeRecipeId] ?? buildInitialIngredientSelection(currentIngredients);
    }, [ingredientSelectionByRecipe, activeRecipeId, currentIngredients]);

    const visibleRecipes = useMemo(() => {
        return selectedCategory
            ? availableRecipes.filter((recipe) => recipe.categoryId === selectedCategory)
            : [];
    }, [selectedCategory, availableRecipes]);

    const selectedCategoryMeta = useMemo(() => {
        return selectedCategory
            ? recipeCategories.find((category) => category.id === selectedCategory) ?? null
            : null;
    }, [selectedCategory]);

    return {
        screen,
        setScreen,
        availableRecipes,
        setAvailableRecipes,
        recipeContentById,
        setRecipeContentById,
        selectedCategory,
        setSelectedCategory,
        selectedRecipe,
        setSelectedRecipe,
        ingredientsBackScreen,
        setIngredientsBackScreen,
        ingredientSelectionByRecipe,
        setIngredientSelectionByRecipe,
        quantityMode,
        setQuantityMode,
        amountUnit,
        setAmountUnit,
        produceType,
        setProduceType,
        produceSize,
        setProduceSize,
        portion,
        setPortion,
        peopleCount,
        setPeopleCount,
        availableCount,
        setAvailableCount,
        activeRecipeId,
        activeRecipeContent,
        currentIngredients,
        currentTip,
        activeIngredientSelection,
        visibleRecipes,
        selectedCategoryMeta,
    };
}
