import { useEffect, useMemo, useState } from 'react';
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
import { recipeCategories } from '../data/recipeCategories';
import { buildInitialIngredientSelection } from '../utils/recipeHelpers';
import { fetchRecipesCatalog } from '../lib/recipesCatalog';
import { loadLocalRecipeCatalog } from '../lib/localRecipeCatalog';
import { matchesRecipeCategory } from '../lib/recipeCategoryMapping';
import type { CatalogSource } from '../../types';

export function useRecipeSelection() {
    const [screen, setScreenState] = useState<Screen>('category-select');
    const [screenHistory, setScreenHistory] = useState<Screen[]>([]);
    const [availableRecipes, setAvailableRecipes] = useState<Recipe[]>([]);
    const [recipeContentById, setRecipeContentById] = useState<Record<string, RecipeContent>>({});
    const [selectedCategory, setSelectedCategory] = useState<RecipeCategoryId | null>(null);
    const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
    const [ingredientsBackScreen, setIngredientsBackScreen] = useState<IngredientsBackScreen>('recipe-setup');
    const [ingredientSelectionByRecipe, setIngredientSelectionByRecipe] = useState<Record<string, Record<string, boolean>>>({});
    const [catalogSource, setCatalogSource] = useState<CatalogSource>('local-dev');
    const [catalogWarning, setCatalogWarning] = useState<string | null>(null);
    const [isSyncingCatalog, setIsSyncingCatalog] = useState(false);

    // Basic configuration state
    const [quantityMode, setQuantityMode] = useState<QuantityMode>('people');
    const [amountUnit, setAmountUnit] = useState<AmountUnit>('units');
    const [produceType, setProduceType] = useState('blanca');
    const [produceSize, setProduceSize] = useState<'small' | 'medium' | 'large'>('medium');

    // Portion/quantity states (used as inputs to usePortions)
    const [portion, setPortion] = useState<Portion>(2);
    const [peopleCount, setPeopleCount] = useState(2);
    const [availableCount, setAvailableCount] = useState(1);
    const defaultActiveRecipeContent: RecipeContent = {
        tip: 'Selecciona una receta para ver sus ingredientes y pasos.',
        ingredients: [],
        steps: [],
        portionLabels: {
            singular: 'porción',
            plural: 'porciones',
        },
    };

    const activeRecipeId = selectedRecipe?.id ?? 'arroz';
    const activeRecipeContent = recipeContentById[activeRecipeId] ?? defaultActiveRecipeContent;
    const currentIngredients = activeRecipeContent.ingredients;
    const currentTip = activeRecipeContent.tip;

    const activeIngredientSelection = useMemo(() => {
        return ingredientSelectionByRecipe[activeRecipeId] ?? buildInitialIngredientSelection(currentIngredients);
    }, [ingredientSelectionByRecipe, activeRecipeId, currentIngredients]);

    const visibleRecipes = useMemo(() => {
        return selectedCategory
            ? availableRecipes.filter((recipe) => matchesRecipeCategory(selectedCategory, recipe.categoryId))
            : [];
    }, [selectedCategory, availableRecipes]);

    const selectedCategoryMeta = useMemo(() => {
        return selectedCategory
            ? recipeCategories.find((category) => category.id === selectedCategory) ?? null
            : null;
    }, [selectedCategory]);

    useEffect(() => {
        let cancelled = false;

        const syncCatalog = async () => {
            setIsSyncingCatalog(true);
            const localCatalog = await loadLocalRecipeCatalog();
            if (cancelled) return;
            setAvailableRecipes(localCatalog.defaultRecipes);
            setRecipeContentById(localCatalog.initialRecipeContent);

            const result = await fetchRecipesCatalog();
            if (cancelled) return;
            setAvailableRecipes(result.recipes);
            setRecipeContentById((prev) => ({
                ...prev,
                ...result.recipeContentById,
            }));
            setCatalogSource(result.source);
            setCatalogWarning(result.warning ?? null);
            setIsSyncingCatalog(false);
        };

        void syncCatalog();

        return () => {
            cancelled = true;
        };
    }, []);

    const navigateToScreen = (nextScreen: Screen) => {
        setScreenState((currentScreen) => {
            if (currentScreen === nextScreen) return currentScreen;
            setScreenHistory((prev) => [...prev, currentScreen]);
            return nextScreen;
        });
    };

    const goBackScreen = (fallback: Screen = 'category-select') => {
        setScreenHistory((prev) => {
            const last = prev[prev.length - 1];
            if (last) {
                setScreenState(last);
                return prev.slice(0, -1);
            }
            setScreenState(fallback);
            return prev;
        });
    };

    return {
        screen,
        setScreen: navigateToScreen,
        setScreenDirect: setScreenState,
        goBackScreen,
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
        catalogSource,
        catalogWarning,
        isSyncingCatalog,
    };
}
