import { useEffect, useMemo, useRef, useState } from 'react';
import type { ActiveCompoundTimer, Portion, QuantityMode, Recipe, RecipeContent } from '../../types';
import { buildCompoundSessionState, buildCompoundTimeline } from '../lib/compoundCooking';

interface UseCompoundCookingSessionArgs {
  selectedRecipe: Recipe | null;
  activeRecipeContent: RecipeContent;
  portion: Portion;
  peopleCount: number;
  quantityMode: QuantityMode;
  screen: string;
}

interface CompoundSnapshot {
  currentTimelineIndex: number;
  focusedComponentId: string | null;
  activeTimers: ActiveCompoundTimer[];
  isRecipeComplete: boolean;
}

interface InlineCompoundMessage {
  id: string;
  tone: 'info' | 'success';
  title: string;
  body: string;
}

function getStorageKey(recipeId: string) {
  return `compound_cooking_progress_${recipeId}`;
}

const AUTO_DISMISS_EXPIRED_TIMER_MS = 12000;

export function useCompoundCookingSession({
  selectedRecipe,
  activeRecipeContent,
  portion,
  peopleCount,
  quantityMode,
  screen,
}: UseCompoundCookingSessionArgs) {
  const timeline = useMemo(
    () => buildCompoundTimeline(activeRecipeContent, portion, { recipe: selectedRecipe, peopleCount, quantityMode }),
    [activeRecipeContent, portion, selectedRecipe, peopleCount, quantityMode],
  );
  const [currentTimelineIndex, setCurrentTimelineIndex] = useState(0);
  const [activeTimers, setActiveTimers] = useState<ActiveCompoundTimer[]>([]);
  const [focusedComponentId, setFocusedComponentId] = useState<string | null>(null);
  const [isRecipeComplete, setIsRecipeComplete] = useState(false);
  const [inlineMessage, setInlineMessage] = useState<InlineCompoundMessage | null>(null);
  const hydratedRecipeIdRef = useRef<string | null>(null);
  const previousTimersRef = useRef<ActiveCompoundTimer[]>([]);

  useEffect(() => {
    const recipeId = selectedRecipe?.id ?? null;
    const isCompound = selectedRecipe?.experience === 'compound' && Boolean(activeRecipeContent.compoundMeta);

    if (!recipeId || !isCompound) {
      hydratedRecipeIdRef.current = null;
      setCurrentTimelineIndex(0);
      setActiveTimers([]);
      setFocusedComponentId(null);
      setIsRecipeComplete(false);
      setInlineMessage(null);
      return;
    }

    if (hydratedRecipeIdRef.current === recipeId) return;
    hydratedRecipeIdRef.current = recipeId;

    const saved = localStorage.getItem(getStorageKey(recipeId));
    if (!saved) {
      setCurrentTimelineIndex(0);
      setActiveTimers([]);
      setFocusedComponentId(activeRecipeContent.compoundMeta?.components[0]?.id ?? null);
      setIsRecipeComplete(false);
      setInlineMessage(null);
      return;
    }

    try {
      const snapshot = JSON.parse(saved) as CompoundSnapshot;
      setCurrentTimelineIndex(snapshot.currentTimelineIndex ?? 0);
      setActiveTimers(snapshot.activeTimers ?? []);
      setFocusedComponentId(snapshot.focusedComponentId ?? activeRecipeContent.compoundMeta?.components[0]?.id ?? null);
      setIsRecipeComplete(snapshot.isRecipeComplete ?? false);
    } catch {
      setCurrentTimelineIndex(0);
      setActiveTimers([]);
      setFocusedComponentId(activeRecipeContent.compoundMeta?.components[0]?.id ?? null);
      setIsRecipeComplete(false);
      setInlineMessage(null);
    }
  }, [selectedRecipe?.id, selectedRecipe?.experience, activeRecipeContent]);

  useEffect(() => {
    const recipeId = selectedRecipe?.id;
    const isCompound = selectedRecipe?.experience === 'compound' && Boolean(activeRecipeContent.compoundMeta);
    if (!recipeId || !isCompound) return;

    const snapshot: CompoundSnapshot = {
      currentTimelineIndex,
      focusedComponentId,
      activeTimers,
      isRecipeComplete,
    };

    localStorage.setItem(getStorageKey(recipeId), JSON.stringify(snapshot));
  }, [selectedRecipe?.id, selectedRecipe?.experience, activeRecipeContent.compoundMeta, currentTimelineIndex, focusedComponentId, activeTimers, isRecipeComplete]);

  useEffect(() => {
    if (screen !== 'cooking') return;

    const hasRunningTimers = activeTimers.some((timer) => timer.status === 'running');
    if (!hasRunningTimers) return;

    const interval = window.setInterval(() => {
      setActiveTimers((prev) =>
        prev.map((timer) => {
          if (timer.status !== 'running') return timer;
          const nextRemaining = Math.max(timer.remainingSeconds - 1, 0);
          if (nextRemaining === 0) {
            return {
              ...timer,
              remainingSeconds: 0,
              status: 'expired',
              expiredAt: Date.now(),
            };
          }
          return {
            ...timer,
            remainingSeconds: nextRemaining,
          };
        }),
      );
    }, 1000);

    return () => window.clearInterval(interval);
  }, [screen, activeTimers]);

  useEffect(() => {
    const previousTimers = previousTimersRef.current;
    const newlyExpiredTimer = activeTimers.find((timer) => {
      if (timer.status !== 'expired') return false;
      const previous = previousTimers.find((entry) => entry.timelineItemId === timer.timelineItemId);
      return previous?.status !== 'expired';
    });

    if (newlyExpiredTimer) {
      const timelineItem = timeline.find((item) => item.id === newlyExpiredTimer.timelineItemId);
      setInlineMessage({
        id: `expired-${newlyExpiredTimer.timelineItemId}-${Date.now()}`,
        tone: 'success',
        title: `${timelineItem?.componentName ?? 'Proceso'} listo`,
        body: timelineItem?.completionMessage ?? 'Puedes revisarlo o cerrarlo cuando quieras desde el panel lateral.',
      });
    }

    previousTimersRef.current = activeTimers;
  }, [activeTimers, timeline]);

  useEffect(() => {
    if (!inlineMessage) return;
    const timeout = window.setTimeout(() => {
      setInlineMessage((current) => (current?.id === inlineMessage.id ? null : current));
    }, 4200);
    return () => window.clearTimeout(timeout);
  }, [inlineMessage]);

  useEffect(() => {
    const expiredTimers = activeTimers.filter((timer) => timer.status === 'expired' && typeof timer.expiredAt === 'number');
    if (expiredTimers.length === 0) return;

    const now = Date.now();
    const nextDismissIn = Math.min(
      ...expiredTimers.map((timer) => Math.max((timer.expiredAt ?? now) + AUTO_DISMISS_EXPIRED_TIMER_MS - now, 0)),
    );

    const timeout = window.setTimeout(() => {
      const cutoff = Date.now() - AUTO_DISMISS_EXPIRED_TIMER_MS;
      setActiveTimers((prev) =>
        prev.filter((timer) => timer.status !== 'expired' || typeof timer.expiredAt !== 'number' || timer.expiredAt > cutoff),
      );
    }, Math.max(nextDismissIn, 0));

    return () => window.clearTimeout(timeout);
  }, [activeTimers]);

  const session = useMemo(
    () =>
      buildCompoundSessionState({
        recipe: selectedRecipe,
        content: activeRecipeContent,
        portion,
        peopleCount,
        quantityMode,
        currentTimelineIndex,
        activeTimers,
        focusedComponentId,
      }),
    [selectedRecipe, activeRecipeContent, portion, peopleCount, quantityMode, currentTimelineIndex, activeTimers, focusedComponentId],
  );

  const currentTimer =
    session.currentItem
      ? activeTimers.find((timer) => timer.timelineItemId === session.currentItem?.id) ?? null
      : null;
  const isCurrentTimerStarted = Boolean(currentTimer);

  const startTimerForItem = (timelineItem = session.currentItem) => {
    if (!timelineItem || timelineItem.durationSeconds == null) return false;

    let created = false;
    setActiveTimers((prev) => {
      if (prev.some((timer) => timer.timelineItemId === timelineItem.id)) return prev;
      created = true;
      return [
        ...prev,
        {
          timelineItemId: timelineItem.id,
          componentId: timelineItem.componentId,
          label: timelineItem.timerLabel ?? timelineItem.subStepName,
          remainingSeconds: timelineItem.durationSeconds,
          totalSeconds: timelineItem.durationSeconds,
          status: 'running',
          expiredAt: undefined,
          stepIndex: timelineItem.stepIndex,
          subStepIndex: timelineItem.subStepIndex,
        },
      ];
    });
    return created;
  };

  const handleNext = () => {
    const currentItem = session.currentItem;
    if (!currentItem) return;

    if (!isRecipeComplete && currentItem.durationSeconds != null && !isCurrentTimerStarted) {
      const created = startTimerForItem(currentItem);
      setFocusedComponentId(currentItem.componentId);

      if (currentItem.autoAdvanceOnStart) {
        setInlineMessage({
          id: `started-${currentItem.id}-${Date.now()}`,
          tone: 'info',
          title: 'Proceso iniciado',
          body: currentItem.backgroundHint ?? 'Esto sigue en curso mientras avanzas en otro frente.',
        });
        if (created) {
          setCurrentTimelineIndex((prev) => Math.min(prev + 1, Math.max(timeline.length - 1, 0)));
        }
        return;
      }

      if (created) {
        setInlineMessage({
          id: `started-${currentItem.id}-${Date.now()}`,
          tone: 'info',
          title: `${currentItem.componentName} en curso`,
          body: currentItem.backgroundHint ?? 'El timer ya empezó. Puedes continuar cuando quieras.',
        });
      }
      return;
    }

    setCurrentTimelineIndex((prev) => {
      const lastIndex = Math.max(timeline.length - 1, 0);
      if (prev >= lastIndex) {
        setIsRecipeComplete(true);
        return lastIndex;
      }
      return Math.min(prev + 1, lastIndex);
    });
  };

  const handlePrevious = () => {
    setIsRecipeComplete(false);
    setCurrentTimelineIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleToggleCurrentTimer = () => {
    if (!session.currentItem) return;

    setActiveTimers((prev) =>
      prev.map((timer) => {
        if (timer.timelineItemId !== session.currentItem?.id) return timer;
        if (timer.status === 'expired') return timer;
        return {
          ...timer,
          status: timer.status === 'running' ? 'paused' : 'running',
        };
      }),
    );
  };

  const handleFocusComponent = (componentId: string) => {
    setFocusedComponentId(componentId);
  };

  const dismissTimer = (timelineItemId: string) => {
    setActiveTimers((prev) => prev.filter((timer) => timer.timelineItemId !== timelineItemId));
  };

  const resetCompoundSession = () => {
    setCurrentTimelineIndex(0);
    setActiveTimers([]);
    setFocusedComponentId(activeRecipeContent.compoundMeta?.components[0]?.id ?? null);
    setIsRecipeComplete(false);
    setInlineMessage(null);
    if (selectedRecipe?.id) {
      localStorage.removeItem(getStorageKey(selectedRecipe.id));
    }
  };

  return {
    ...session,
    currentTimer,
    isCurrentTimerStarted,
    isCurrentTimerRunning: currentTimer?.status === 'running',
    isCurrentTimerExpired: currentTimer?.status === 'expired',
    isRecipeComplete,
    inlineMessage,
    handleNext,
    handlePrevious,
    handleToggleCurrentTimer,
    handleFocusComponent,
    dismissTimer,
    resetCompoundSession,
  };
}
