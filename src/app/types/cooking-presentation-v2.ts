export type CookingPresentationIntent =
  | 'start_timer'
  | 'start_and_continue'
  | 'continue'
  | 'switch_front'
  | 'next_batch'
  | 'finish';

export type CookingPresentationTimerTone = 'idle' | 'running' | 'expired' | 'background';

export type CookingPresentationFrontState = 'focused' | 'running' | 'waiting' | 'expired' | 'done';

export interface CookingPresentationNextStepPreview {
  title: string;
  detail?: string | null;
  componentName?: string | null;
}

export interface CookingPresentationTimerBanner {
  tone: CookingPresentationTimerTone;
  title: string;
  detail?: string | null;
  remainingSeconds?: number | null;
  timerCount?: number | null;
}

export interface CookingPresentationFrontStatus {
  componentId: string;
  label: string;
  state: CookingPresentationFrontState;
  progressLabel?: string | null;
}

export interface CookingPresentationCompletionMessage {
  title: string;
  body: string;
  summary?: string | null;
}

export interface CookingPresentationV2 {
  primaryTitle: string;
  supportingText: string | null;
  ctaLabel: string;
  ctaIntent: CookingPresentationIntent;
  nextStepPreview: CookingPresentationNextStepPreview | null;
  timerBanner: CookingPresentationTimerBanner | null;
  backgroundHint: string | null;
  activeFrontStatus: CookingPresentationFrontStatus[];
  completionMessage: CookingPresentationCompletionMessage | null;
  stepProgressLabel: string | null;
  componentLabel?: string | null;
}
