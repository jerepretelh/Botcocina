import { useEffect, useMemo, useState } from 'react';
import type { ScaledRecipeSubStepV2 } from '../types/recipe-v2';

interface UseThermomixTimerV2Args {
  currentSubStep: ScaledRecipeSubStepV2 | null;
  active: boolean;
}

export function useThermomixTimerV2({ currentSubStep, active }: UseThermomixTimerV2Args) {
  const timerKey = currentSubStep?.id ?? null;
  const initialDuration = useMemo(() => currentSubStep?.durationSeconds ?? null, [timerKey, currentSubStep?.durationSeconds]);
  const [isRunning, setIsRunning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(initialDuration ?? 0);

  useEffect(() => {
    setIsRunning(false);
    setTimeRemaining(initialDuration ?? 0);
  }, [timerKey, initialDuration]);

  useEffect(() => {
    if (!active || !isRunning || timeRemaining <= 0) return undefined;
    const interval = window.setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [active, isRunning, timeRemaining]);

  const hasTimer = (initialDuration ?? 0) > 0;

  return {
    hasTimer,
    isRunning,
    isExpired: hasTimer && timeRemaining === 0,
    timeRemaining,
    togglePause: () => {
      if (!hasTimer) return;
      setIsRunning((prev) => !prev);
    },
    resetTimer: () => {
      setIsRunning(false);
      setTimeRemaining(initialDuration ?? 0);
    },
    setIsRunning,
  };
}
