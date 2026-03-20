import type { RecipeJourneyStage } from '../types';

export function canAutoSkipStage(_stage: RecipeJourneyStage): boolean {
  return false;
}
