import { useMemo } from 'react';
import { Recipe, RecipeContent, QuantityMode, AmountUnit, Portion } from '../../types';
import {
    mapCountToPortion,
    clampNumber,
    buildBatchUsageTips,
    normalizeText
} from '../utils/recipeHelpers';

interface UsePortionsProps {
    selectedRecipe: Recipe | null;
    activeRecipeContent: RecipeContent;
    quantityMode: QuantityMode;
    amountUnit: AmountUnit;
    peopleCount: number;
    availableCount: number;
    produceType: string;
    produceSize: 'small' | 'medium' | 'large';
    portion: Portion;
}

export function usePortions({
    selectedRecipe,
    activeRecipeContent,
    quantityMode,
    amountUnit,
    peopleCount,
    availableCount,
    produceType,
    produceSize,
    portion
}: UsePortionsProps) {
    const currentIngredients = activeRecipeContent.ingredients;

    const currentPortionLabel = useMemo(() => {
        return portion === 1
            ? activeRecipeContent.portionLabels.singular
            : activeRecipeContent.portionLabels.plural;
    }, [portion, activeRecipeContent.portionLabels]);

    const recipeContextText = useMemo(() => {
        return normalizeText(
            `${selectedRecipe?.name ?? ''} ${selectedRecipe?.ingredient ?? ''} ${currentIngredients.map((ingredient) => ingredient.name).join(' ')}`
        );
    }, [selectedRecipe, currentIngredients]);

    const isTubersBoilRecipe = useMemo(() => {
        return Boolean(
            (recipeContextText.includes('papa') || recipeContextText.includes('camote')) &&
            (recipeContextText.includes('sancoch') || recipeContextText.includes('herv'))
        );
    }, [recipeContextText]);

    const targetMainCount = useMemo(() => {
        return quantityMode === 'have'
            ? (amountUnit === 'grams' ? Math.max(1, Math.round(availableCount / 250)) : availableCount)
            : peopleCount;
    }, [quantityMode, amountUnit, availableCount, peopleCount]);

    const setupPortionPreview = useMemo(() => {
        return quantityMode === 'people'
            ? mapCountToPortion(peopleCount)
            : mapCountToPortion(
                amountUnit === 'grams'
                    ? Math.max(1, Math.round(availableCount / 250))
                    : availableCount,
            );
    }, [quantityMode, peopleCount, amountUnit, availableCount]);

    const setupScaleFactor = useMemo(() => {
        let factor = 1;
        if (quantityMode === 'people') {
            factor *= clampNumber(peopleCount / 2, 0.8, 2);
        } else if (amountUnit === 'grams') {
            factor *= clampNumber(availableCount / 500, 0.7, 2.2);
        } else {
            factor *= clampNumber(availableCount / 2, 0.7, 2.2);
        }

        if (isTubersBoilRecipe) {
            const typeFactorMap: Record<string, number> = {
                blanca: 1,
                yungay: 1.05,
                huayro: 1.12,
                canchan: 1.08,
                camote_amarillo: 0.95,
                camote_morado: 1.08,
            };
            const sizeFactorMap = { small: 0.85, medium: 1, large: 1.2 };
            factor *= typeFactorMap[produceType] ?? 1;
            factor *= sizeFactorMap[produceSize];
        }
        return clampNumber(factor, 0.7, 2.5);
    }, [quantityMode, peopleCount, amountUnit, availableCount, isTubersBoilRecipe, produceType, produceSize]);

    const batchCountForRecipe = useMemo(() => {
        if (selectedRecipe?.id === 'papas-fritas') return 3;
        if (selectedRecipe?.id === 'huevo-frito') return clampNumber(targetMainCount, 1, 8);
        return 1;
    }, [selectedRecipe?.id, targetMainCount]);

    const batchUsageTips = useMemo(() => {
        return buildBatchUsageTips(currentIngredients, portion, batchCountForRecipe);
    }, [currentIngredients, portion, batchCountForRecipe]);

    return {
        currentPortionLabel,
        setupPortionPreview,
        setupScaleFactor,
        targetMainCount,
        batchCountForRecipe,
        batchUsageTips,
        isTubersBoilRecipe,
        recipeContextText,
    };
}
