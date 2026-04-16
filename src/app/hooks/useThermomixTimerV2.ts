import { useEffect, useMemo, useState, useRef } from 'react';
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
  const endTimeRef = useRef<number | null>(null);

  useEffect(() => {
    setIsRunning(false);
    setTimeRemaining(initialDuration ?? 0);
    endTimeRef.current = null;
  }, [timerKey, initialDuration]);

  useEffect(() => {
    if (isRunning) {
      endTimeRef.current = Date.now() + timeRemaining * 1000;
    } else {
      endTimeRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning]);

  const isFinished = timeRemaining <= 0;

  useEffect(() => {
    if (!active || !isRunning || isFinished) return undefined;
    
    const updateTimer = () => {
      if (!endTimeRef.current) return;
      const now = Date.now();
      const remainingSeconds = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000));
      
      setTimeRemaining((prev) => {
        if (prev !== remainingSeconds) return remainingSeconds;
        return prev;
      });
      
      if (remainingSeconds <= 0) {
        setIsRunning(false);
      }
    };

    const interval = window.setInterval(updateTimer, 500);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
         updateTimer();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [active, isRunning, isFinished]);

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
      endTimeRef.current = null;
    },
    setIsRunning,
  };
}
