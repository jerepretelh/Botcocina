import type {
  LegacyCookingBridgePayload,
  RecipeJourneyStage,
  RecipeJourneyState,
  UnifiedRecipeDefinition,
} from '../types';
import {
  buildCookRuntimeBridgePayload,
  enterCookRuntimeBridge,
  shouldUseCookRuntimeBridge,
} from './cookRuntimeBridge';

export function shouldUseLegacyCookingBridge(stage: RecipeJourneyStage): boolean {
  return shouldUseCookRuntimeBridge(stage);
}

export function buildLegacyCookingBridgePayload(
  state: RecipeJourneyState,
  definition: UnifiedRecipeDefinition,
): LegacyCookingBridgePayload {
  return buildCookRuntimeBridgePayload(state, definition);
}

export function enterLegacyCookingBridge(
  payload: LegacyCookingBridgePayload,
  onStartCooking: (payload: LegacyCookingBridgePayload) => void,
): void {
  enterCookRuntimeBridge(payload, onStartCooking);
}
