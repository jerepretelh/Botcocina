import { useEffect, useRef } from 'react';
import type { Screen } from '../../../../types';
import { trackProductEvent } from '../../../lib/productEvents';

export function useThermomixTelemetry(args: {
  authUserId: string | null | undefined;
  screen: Screen;
  selectedRecipeId: string | null;
  currentStepIndex: number;
  currentSubStepIndex: number;
  cookingFlowFinished: boolean;
}) {
  const hasTrackedHomeRef = useRef(false);
  const previousCookingPositionRef = useRef<{ step: number; subStep: number } | null>(null);
  const previousScreenRef = useRef<Screen>(args.screen);

  useEffect(() => {
    if (!args.authUserId) return;
    if (args.screen !== 'category-select') {
      hasTrackedHomeRef.current = false;
      return;
    }
    if (hasTrackedHomeRef.current) return;
    hasTrackedHomeRef.current = true;
    void trackProductEvent(args.authUserId, 'home_open');
  }, [args.authUserId, args.screen]);

  useEffect(() => {
    if (!args.authUserId) return;
    const prev = previousScreenRef.current;
    if (args.screen === 'cooking' && prev !== 'cooking' && args.selectedRecipeId) {
      void trackProductEvent(args.authUserId, 'recipe_start', {
        recipeId: args.selectedRecipeId,
      });
      previousCookingPositionRef.current = { step: args.currentStepIndex, subStep: args.currentSubStepIndex };
    }
    previousScreenRef.current = args.screen;
  }, [args.authUserId, args.currentStepIndex, args.currentSubStepIndex, args.screen, args.selectedRecipeId]);

  useEffect(() => {
    if (!args.authUserId || args.screen !== 'cooking' || !args.selectedRecipeId) return;
    const previous = previousCookingPositionRef.current;
    if (!previous) {
      previousCookingPositionRef.current = { step: args.currentStepIndex, subStep: args.currentSubStepIndex };
      return;
    }

    if (args.currentStepIndex !== previous.step || args.currentSubStepIndex !== previous.subStep) {
      void trackProductEvent(args.authUserId, 'step_next', {
        recipeId: args.selectedRecipeId,
        stepIndex: args.currentStepIndex,
        subStepIndex: args.currentSubStepIndex,
      });
      previousCookingPositionRef.current = { step: args.currentStepIndex, subStep: args.currentSubStepIndex };
    }
  }, [args.authUserId, args.currentStepIndex, args.currentSubStepIndex, args.screen, args.selectedRecipeId]);

  useEffect(() => {
    if (!args.authUserId || !args.cookingFlowFinished || !args.selectedRecipeId) return;
    void trackProductEvent(args.authUserId, 'recipe_complete', {
      recipeId: args.selectedRecipeId,
    });
  }, [args.authUserId, args.cookingFlowFinished, args.selectedRecipeId]);
}
