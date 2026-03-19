import { useEffect, useMemo, useState } from 'react';
import type { ScaledRecipeStepV2, ScaledRecipeSubStepV2, ScaledRecipeV2 } from '../types/recipe-v2';
import { buildCookingSessionV2 } from '../lib/recipe-v2/buildCookingSessionV2';

interface UseCookingProgressV2Args {
  recipe: ScaledRecipeV2 | null;
}

export function useCookingProgressV2({ recipe }: UseCookingProgressV2Args) {
  const session = useMemo(() => buildCookingSessionV2(recipe), [recipe]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRecipeFinished, setIsRecipeFinished] = useState(false);

  useEffect(() => {
    setCurrentIndex(0);
    setIsRecipeFinished(false);
  }, [recipe?.id, recipe?.selectedYield?.value, recipe?.selectedYield?.type, recipe?.batchResolution?.batchCount, recipe?.selectedCookingContext?.selectedContainerKey]);

  const currentItem = session.items[currentIndex] ?? null;
  const currentStep: ScaledRecipeStepV2 | null = currentItem?.step ?? null;
  const currentSubStep: ScaledRecipeSubStepV2 | null = currentItem?.subStep ?? null;
  const nextItem = currentIndex < session.items.length - 1 ? session.items[currentIndex + 1] : null;
  const progressPercent = session.totalItems > 0
    ? Math.round((((isRecipeFinished ? session.totalItems : currentIndex + 1)) / session.totalItems) * 100)
    : 0;

  return {
    session,
    currentIndex,
    currentItem,
    currentStep,
    currentSubStep,
    nextItem,
    progressPercent,
    isRecipeFinished,
    setCurrentIndex,
    goNext: () => {
      if (session.totalItems === 0) return;
      if (currentIndex >= session.totalItems - 1) {
        setIsRecipeFinished(true);
        return;
      }
      setCurrentIndex((prev) => Math.min(session.totalItems - 1, prev + 1));
    },
    goPrevious: () => {
      if (isRecipeFinished) {
        setIsRecipeFinished(false);
        return;
      }
      setCurrentIndex((prev) => Math.max(0, prev - 1));
    },
    reset: () => {
      setCurrentIndex(0);
      setIsRecipeFinished(false);
    },
  };
}
