import { useEffect, useRef } from 'react';
import {
  buildCookRuntimeBridgePayload,
  enterCookRuntimeBridge,
  shouldUseCookRuntimeBridge,
} from '../compat/cookRuntimeBridge';
import type {
  CookRuntimeBridgePayload,
  RecipeJourneyStage,
  RecipeJourneyState,
  UnifiedRecipeDefinition,
} from '../types';

interface RecipeCookBridgeStageProps {
  stage: RecipeJourneyStage;
  definition: UnifiedRecipeDefinition;
  journeyState: RecipeJourneyState;
  onEnterCooking: (payload: CookRuntimeBridgePayload) => void;
}

export function RecipeCookBridgeStage({
  stage,
  definition,
  journeyState,
  onEnterCooking,
}: RecipeCookBridgeStageProps) {
  const hasEnteredRef = useRef(false);

  useEffect(() => {
    if (hasEnteredRef.current || !shouldUseCookRuntimeBridge(stage)) return;
    hasEnteredRef.current = true;
    enterCookRuntimeBridge(buildCookRuntimeBridgePayload(journeyState, definition), onEnterCooking);
  }, [stage, definition, journeyState, onEnterCooking]);

  return null;
}
