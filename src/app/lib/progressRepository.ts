import type { StepLoopState } from '../../types';

export interface RecipeProgressSnapshot {
  userId: string;
  recipeId: string;
  currentStepIndex: number;
  currentSubStepIndex: number;
  activeStepLoop: StepLoopState | null;
  timerState?: {
    isRunning: boolean;
    timeRemaining: number;
  };
}

export interface ProgressRepository {
  load: (userId: string, recipeId: string) => Promise<RecipeProgressSnapshot | null>;
  save: (snapshot: RecipeProgressSnapshot) => Promise<void>;
  clear: (userId: string, recipeId: string) => Promise<void>;
}

