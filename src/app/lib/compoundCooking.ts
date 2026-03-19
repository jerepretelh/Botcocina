import type {
  ActiveCompoundTimer,
  CompoundCookingSessionState,
  CompoundResolvedTimelineItem,
  Portion,
  QuantityMode,
  Recipe,
  RecipeContent,
} from '../../types';
import { resolveSubStepDisplayValue } from './recipeScaling';

function isInformativeValue(value: string | number | null | undefined) {
  if (typeof value === 'number') return true;
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return !['continuar', 'siguiente', 'ok', 'listo', '-', 'n/a', 'na'].includes(normalized);
}

export function formatCompoundClock(seconds: number) {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

export function buildCompoundTimeline(
  content: RecipeContent,
  portion: Portion,
  options?: { recipe?: Recipe | null; peopleCount?: number; quantityMode?: QuantityMode },
): CompoundResolvedTimelineItem[] {
  const meta = content.compoundMeta;
  if (!meta) return [];

  return meta.timeline
    .map((item) => {
      const step = content.steps[item.stepIndex];
      const subStep = step?.subSteps[item.subStepIndex];
      const component = meta.components.find((entry) => entry.id === item.componentId);
      if (!step || !subStep || !component) return null;

      const rawValue = resolveSubStepDisplayValue({
        subStep,
        recipe: options?.recipe,
        content,
        portion,
        peopleCount: options?.peopleCount,
        quantityMode: options?.quantityMode,
      });
      return {
        id: item.id,
        componentId: item.componentId,
        componentName: component.name,
        componentIcon: component.icon,
        stepIndex: item.stepIndex,
        subStepIndex: item.subStepIndex,
        subStepName: subStep.subStepName,
        notes: subStep.notes,
        displayValue: isInformativeValue(rawValue) ? rawValue : null,
        durationSeconds: typeof rawValue === 'number' ? rawValue : null,
        timerLabel: item.timerLabel ?? (typeof rawValue === 'number' ? subStep.subStepName : null),
        autoAdvanceOnStart: Boolean(item.autoAdvanceOnStart),
        completionMessage: item.completionMessage ?? null,
        backgroundHint: item.backgroundHint ?? null,
      } satisfies CompoundResolvedTimelineItem;
    })
    .filter((item): item is CompoundResolvedTimelineItem => Boolean(item));
}

export function buildCompoundSessionState(args: {
  recipe?: Recipe | null;
  content: RecipeContent;
  portion: Portion;
  peopleCount?: number;
  quantityMode?: QuantityMode;
  currentTimelineIndex: number;
  activeTimers: ActiveCompoundTimer[];
  focusedComponentId: string | null;
}): CompoundCookingSessionState {
  const { recipe, content, portion, peopleCount, quantityMode, currentTimelineIndex, activeTimers, focusedComponentId } = args;
  const timeline = buildCompoundTimeline(content, portion, { recipe, peopleCount, quantityMode });
  const boundedIndex = Math.max(0, Math.min(currentTimelineIndex, Math.max(timeline.length - 1, 0)));
  const currentItem = timeline[boundedIndex] ?? null;
  const nextItem = boundedIndex < timeline.length - 1 ? timeline[boundedIndex + 1] : null;
  const meta = content.compoundMeta;

  const componentProgress = (meta?.components ?? []).map((component) => {
    const componentItems = timeline.filter((item) => item.componentId === component.id);
    const completedCount = componentItems.filter((item) => {
      const timelineIndex = timeline.findIndex((timelineItem) => timelineItem.id === item.id);
      if (!(timelineIndex >= 0 && timelineIndex < boundedIndex)) return false;
      const unresolvedTimer = activeTimers.some((timer) => timer.timelineItemId === item.id);
      return !unresolvedTimer;
    }).length;
    const hasActiveTimer = activeTimers.some((timer) => timer.componentId === component.id && timer.status === 'running');
    const hasExpiredTimer = activeTimers.some((timer) => timer.componentId === component.id && timer.status === 'expired');
    const nextForComponent = componentItems.find((item) => {
      const timelineIndex = timeline.findIndex((timelineItem) => timelineItem.id === item.id);
      return timelineIndex >= boundedIndex;
    });

    return {
      componentId: component.id,
      name: component.name,
      icon: component.icon,
      summary: component.summary,
      completedCount,
      totalCount: componentItems.length,
      isFocused: (focusedComponentId ?? currentItem?.componentId ?? null) === component.id,
      hasActiveTimer,
      hasExpiredTimer,
      nextTimelineItemId: nextForComponent?.id ?? null,
    };
  });

  return {
    timeline,
    currentTimelineIndex: boundedIndex,
    currentItem,
    nextItem,
    activeTimers,
    componentProgress,
    focusedComponentId: focusedComponentId ?? currentItem?.componentId ?? null,
    progressPercent: timeline.length > 0 ? Math.round(((boundedIndex + 1) / timeline.length) * 100) : 0,
  };
}
