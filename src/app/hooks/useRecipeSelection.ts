import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { loadLocalRecipeCatalogV2 } from '../lib/localRecipeCatalogV2';
import { matchesRecipeCategory } from '../lib/recipeCategoryMapping';
import type { CatalogSource } from '../../types';
import type { CookingContextV2, RecipeV2, RecipeYieldV2 } from '../types/recipe-v2';
import type { CanonicalRecipeV2 } from '../lib/recipe-v2/canonicalRecipeV2';
import { deriveTargetYieldFromLegacy } from '../lib/recipeV2';
import { normalizeLegacyRecipeToV2 } from '../lib/recipe-v2/normalizeLegacyRecipeToV2';

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
    const [localRecipeV2ById, setLocalRecipeV2ById] = useState<Record<string, CanonicalRecipeV2>>({});
    const setRecipeV2ById = useCallback((recipeId: string, recipeV2: CanonicalRecipeV2) => {
        setLocalRecipeV2ById((prev) => ({ ...prev, [recipeId]: recipeV2 }));
    }, []);

    // Basic configuration state
    const [quantityMode, setQuantityMode] = useState<QuantityMode>('people');
    const [amountUnit, setAmountUnit] = useState<AmountUnit>('units');
    const [produceType, setProduceType] = useState('blanca');
    const [produceSize, setProduceSize] = useState<'small' | 'medium' | 'large'>('medium');

    // Portion/quantity states (used as inputs to usePortions)
    const [portion, setPortion] = useState<Portion>(2);
    const [peopleCount, setPeopleCount] = useState(2);
    const [availableCount, setAvailableCount] = useState(1);
    const [targetYield, setTargetYield] = useState<RecipeYieldV2>({
        type: 'servings',
        value: 2,
        unit: 'porciones',
        label: 'porciones',
    });
    const [cookingContext, setCookingContext] = useState<CookingContextV2 | null>(null);
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
    const recipeV2ById = useMemo(() => {
        const map: Record<string, RecipeV2> = { ...localRecipeV2ById };
        for (const recipe of availableRecipes) {
            if (map[recipe.id]) continue;
            const content = recipeContentById[recipe.id];
            if (!content) continue;
            if (recipe.experience === 'compound' && !content.compoundMeta) continue;
            try {
                map[recipe.id] = normalizeLegacyRecipeToV2(recipe, content);
            } catch {
                // Deja fuera recetas inválidas para el runtime V2.
            }
        }
        return map;
    }, [availableRecipes, localRecipeV2ById, recipeContentById]);
    const selectedRecipeV2 = selectedRecipe ? recipeV2ById[selectedRecipe.id] ?? null : null;
    const activeIngredientSelectionV2 = useMemo(() => {
        if (!selectedRecipeV2) return {};
        const current = ingredientSelectionByRecipe[activeRecipeId];
        if (current) return current;
        return Object.fromEntries(selectedRecipeV2.ingredients.map((ingredient) => [ingredient.id, true]));
    }, [ingredientSelectionByRecipe, activeRecipeId, selectedRecipeV2]);

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
            const [localCatalog, localCatalogV2] = await Promise.all([
                loadLocalRecipeCatalog(),
                loadLocalRecipeCatalogV2(),
            ]);
            if (cancelled) return;
            setAvailableRecipes(localCatalog.defaultRecipes);
            setRecipeContentById(localCatalog.initialRecipeContent);
            setLocalRecipeV2ById(localCatalogV2.recipeById);

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

    useEffect(() => {
        setTargetYield(deriveTargetYieldFromLegacy({
            quantityMode,
            peopleCount,
            amountUnit,
            availableCount,
            recipe: selectedRecipe,
            content: activeRecipeContent,
        }));
    }, [quantityMode, peopleCount, amountUnit, availableCount, selectedRecipe, activeRecipeContent]);

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
        targetYield,
        setTargetYield,
        cookingContext,
        setCookingContext,
        activeRecipeId,
        activeRecipeContent,
        selectedRecipeV2,
        recipeV2ById,
        currentIngredients,
        currentTip,
        activeIngredientSelection,
        activeIngredientSelectionV2,
        visibleRecipes,
        selectedCategoryMeta,
        catalogSource,
        catalogWarning,
        isSyncingCatalog,
        setRecipeV2ById,
    };
}
