import { useEffect, useMemo, useRef, useState } from 'react';
import type { ActiveCompoundTimer, Recipe } from '../../types';
import type { ScaledRecipeV2 } from '../types/recipe-v2';
import { buildCompoundSessionStateV2, buildCompoundTimelineV2 } from '../lib/compoundCookingV2';

interface UseCompoundCookingSessionV2Args {
  selectedRecipe: Recipe | null;
  scaledRecipe: ScaledRecipeV2 | null;
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

export function getCompoundConfigSignature(recipe: ScaledRecipeV2 | null) {
  if (!recipe) return 'no-recipe';

  return JSON.stringify({
    recipeId: recipe.id,
    selectedYield: {
      type: recipe.selectedYield.type,
      value: recipe.selectedYield.value,
      canonicalUnit: recipe.selectedYield.canonicalUnit ?? null,
      visibleUnit: recipe.selectedYield.visibleUnit ?? null,
      label: recipe.selectedYield.label ?? null,
      containerKey: recipe.selectedYield.containerKey ?? null,
      containerSizeLabel: recipe.selectedYield.containerMeta?.sizeLabel ?? null,
      containerDiameterCm: recipe.selectedYield.containerMeta?.diameterCm ?? null,
      containerCapacityMl: recipe.selectedYield.containerMeta?.capacityMl ?? null,
    },
    selectedCookingContext: {
      selectedContainerKey: recipe.selectedCookingContext?.selectedContainerKey ?? null,
      selectedContainerSizeLabel: recipe.selectedCookingContext?.selectedContainerMeta?.sizeLabel ?? null,
      selectedContainerCapacityMl: recipe.selectedCookingContext?.selectedContainerMeta?.capacityMl ?? null,
    },
    batchCount: recipe.batchResolution?.batchCount ?? 1,
  });
}

function getStorageKey(recipeId: string, configSignature: string) {
  return `compound_cooking_progress_${recipeId}_${configSignature}`;
}

const AUTO_DISMISS_EXPIRED_TIMER_MS = 12000;

export function useCompoundCookingSessionV2({
  selectedRecipe,
  scaledRecipe,
  screen,
}: UseCompoundCookingSessionV2Args) {
  const timeline = useMemo(() => buildCompoundTimelineV2(scaledRecipe), [scaledRecipe]);
  const [currentTimelineIndex, setCurrentTimelineIndex] = useState(0);
  const [activeTimers, setActiveTimers] = useState<ActiveCompoundTimer[]>([]);
  const [focusedComponentId, setFocusedComponentId] = useState<string | null>(null);
  const [isRecipeComplete, setIsRecipeComplete] = useState(false);
  const [inlineMessage, setInlineMessage] = useState<InlineCompoundMessage | null>(null);
  const hydratedRecipeIdRef = useRef<string | null>(null);
  const hydratedConfigSignatureRef = useRef<string | null>(null);
  const previousTimersRef = useRef<ActiveCompoundTimer[]>([]);
  const configSignature = useMemo(() => getCompoundConfigSignature(scaledRecipe), [scaledRecipe]);

  useEffect(() => {
    const recipeId = selectedRecipe?.id ?? null;
    const isCompound = (
      selectedRecipe?.experience === 'compound'
      || scaledRecipe?.experience === 'compound'
    ) && Boolean(scaledRecipe?.compoundMeta);

    if (!recipeId || !isCompound) {
      hydratedRecipeIdRef.current = null;
      hydratedConfigSignatureRef.current = null;
      setCurrentTimelineIndex(0);
      setActiveTimers([]);
      setFocusedComponentId(null);
      setIsRecipeComplete(false);
      setInlineMessage(null);
      return;
    }

    if (hydratedRecipeIdRef.current === recipeId && hydratedConfigSignatureRef.current === configSignature) return;
    hydratedRecipeIdRef.current = recipeId;
    hydratedConfigSignatureRef.current = configSignature;

    const saved = localStorage.getItem(getStorageKey(recipeId, configSignature));
    if (!saved) {
      setCurrentTimelineIndex(0);
      setActiveTimers([]);
      setFocusedComponentId(scaledRecipe?.compoundMeta?.components[0]?.id ?? null);
      setIsRecipeComplete(false);
      setInlineMessage(null);
      return;
    }

    try {
      const snapshot = JSON.parse(saved) as CompoundSnapshot;
      setCurrentTimelineIndex(snapshot.currentTimelineIndex ?? 0);
      setActiveTimers(snapshot.activeTimers ?? []);
      setFocusedComponentId(snapshot.focusedComponentId ?? scaledRecipe?.compoundMeta?.components[0]?.id ?? null);
      setIsRecipeComplete(snapshot.isRecipeComplete ?? false);
    } catch {
      setCurrentTimelineIndex(0);
      setActiveTimers([]);
      setFocusedComponentId(scaledRecipe?.compoundMeta?.components[0]?.id ?? null);
      setIsRecipeComplete(false);
      setInlineMessage(null);
    }
  }, [selectedRecipe?.id, selectedRecipe?.experience, scaledRecipe, scaledRecipe?.experience, configSignature]);

  useEffect(() => {
    const recipeId = selectedRecipe?.id;
    const isCompound = (
      selectedRecipe?.experience === 'compound'
      || scaledRecipe?.experience === 'compound'
    ) && Boolean(scaledRecipe?.compoundMeta);
    if (!recipeId || !isCompound) return;

    const snapshot: CompoundSnapshot = {
      currentTimelineIndex,
      focusedComponentId,
      activeTimers,
      isRecipeComplete,
    };

    localStorage.setItem(getStorageKey(recipeId, configSignature), JSON.stringify(snapshot));
  }, [selectedRecipe?.id, selectedRecipe?.experience, scaledRecipe?.compoundMeta, scaledRecipe?.experience, currentTimelineIndex, focusedComponentId, activeTimers, isRecipeComplete, configSignature]);

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
            return { ...timer, remainingSeconds: 0, status: 'expired', expiredAt: Date.now() };
          }
          return { ...timer, remainingSeconds: nextRemaining };
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
    () => buildCompoundSessionStateV2({
      recipe: scaledRecipe,
      currentTimelineIndex,
      activeTimers,
      focusedComponentId,
    }),
    [scaledRecipe, currentTimelineIndex, activeTimers, focusedComponentId],
  );

  const currentTimer = session.currentItem
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
    setFocusedComponentId(scaledRecipe?.compoundMeta?.components[0]?.id ?? null);
    setIsRecipeComplete(false);
    setInlineMessage(null);
    if (selectedRecipe?.id) {
      localStorage.removeItem(getStorageKey(selectedRecipe.id, configSignature));
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
