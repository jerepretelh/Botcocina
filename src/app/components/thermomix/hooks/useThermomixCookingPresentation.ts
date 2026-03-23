import { buildCookingPresentationV2 } from '../../../lib/presentation/buildCookingPresentationV2';
import { buildCompoundCookingPresentationV2 } from '../../../lib/presentation/buildCompoundCookingPresentationV2';
import {
  resolveCompoundPrimaryActionState,
  resolveStandardPrimaryActionState,
} from '../lib/cookingAssembly';
import type {
  CompatCookingHandlers,
  CompoundCookingController,
  StandardCookingController,
  StandardTimerController,
  ThermomixRecipeRuntime,
} from '../lib/controllerTypes';

export function useThermomixCookingPresentation(args: {
  scaledStandardRecipe: ThermomixRecipeRuntime['scaledStandardRecipe'];
  standardCooking: StandardCookingController;
  standardTimer: StandardTimerController;
  scaledCompoundRecipe: ThermomixRecipeRuntime['scaledCompoundRecipe'];
  compoundCooking: CompoundCookingController;
  handlers: Pick<CompatCookingHandlers, 'handleChangeMission'>;
}) {
  const standardPresentation = buildCookingPresentationV2({
    recipe: args.scaledStandardRecipe,
    currentStep: args.standardCooking.currentStep,
    currentSubStep: args.standardCooking.currentSubStep,
    nextStep: args.standardCooking.nextItem?.subStep ?? null,
    currentIndex: args.standardCooking.currentIndex,
    totalItems: args.standardCooking.session.totalItems,
    progressPercent: args.standardCooking.progressPercent,
    isRecipeFinished: args.standardCooking.isRecipeFinished,
    timer: {
      hasTimer: args.standardTimer.hasTimer,
      isRunning: args.standardTimer.isRunning,
      isExpired: args.standardTimer.isExpired,
      timeRemaining: args.standardTimer.timeRemaining,
    },
  });

  const compoundPresentation = buildCompoundCookingPresentationV2({
    recipe: args.scaledCompoundRecipe,
    currentItem: args.compoundCooking.currentItem,
    nextItem: args.compoundCooking.nextItem,
    currentTimelineIndex: args.compoundCooking.currentTimelineIndex,
    totalTimelineItems: args.compoundCooking.timeline.length,
    progressPercent: args.compoundCooking.progressPercent,
    activeTimers: args.compoundCooking.activeTimers,
    componentProgress: args.compoundCooking.componentProgress,
    currentTimer: args.compoundCooking.currentTimer,
    isCurrentTimerStarted: args.compoundCooking.isCurrentTimerStarted,
    isCurrentTimerRunning: args.compoundCooking.isCurrentTimerRunning,
    isCurrentTimerExpired: args.compoundCooking.isCurrentTimerExpired,
    isRecipeComplete: args.compoundCooking.isRecipeComplete,
    inlineMessage: args.compoundCooking.inlineMessage,
  });

  const standardPrimaryAction = resolveStandardPrimaryActionState({
    intent: standardPresentation.ctaIntent,
    hasTimer: args.standardTimer.hasTimer,
    isRunning: args.standardTimer.isRunning,
    isExpired: args.standardTimer.isExpired,
    isRecipeFinished: args.standardCooking.isRecipeFinished,
    totalItems: args.standardCooking.session.totalItems,
    currentIndex: args.standardCooking.currentIndex,
  });

  const compoundPrimaryAction = resolveCompoundPrimaryActionState({
    intent: compoundPresentation.ctaIntent,
    hasCurrentTimer: args.compoundCooking.isCurrentTimerStarted,
    isCurrentTimerRunning: args.compoundCooking.isCurrentTimerRunning,
    isCurrentTimerExpired: args.compoundCooking.isCurrentTimerExpired,
    isRecipeComplete: args.compoundCooking.isRecipeComplete,
    nextFrontName: args.compoundCooking.nextItem?.componentName ?? null,
  });

  const handleStandardPrimaryAction = () => {
    if (standardPrimaryAction.kind === 'start_timer' || standardPrimaryAction.kind === 'pause_timer') {
      args.standardTimer.togglePause();
      return;
    }
    if (standardPrimaryAction.kind === 'continue_step' || standardPrimaryAction.kind === 'finish_recipe') {
      args.standardTimer.resetTimer();
      args.standardCooking.goNext();
    }
  };

  const handleCompoundPrimaryAction = () => {
    if (compoundPrimaryAction.kind === 'start_timer') {
      args.compoundCooking.handleNext();
      return;
    }
    if (compoundPrimaryAction.kind === 'pause_timer') {
      args.compoundCooking.handleToggleCurrentTimer();
      return;
    }
    if (compoundPrimaryAction.kind === 'focus_front' && args.compoundCooking.nextItem?.componentId) {
      args.compoundCooking.handleFocusComponent(args.compoundCooking.nextItem.componentId);
      args.compoundCooking.handleNext();
      return;
    }
    if (compoundPrimaryAction.kind === 'finish_recipe' && args.compoundCooking.isRecipeComplete) {
      args.handlers.handleChangeMission();
      return;
    }
    args.compoundCooking.handleNext();
  };

  return {
    standardPresentation,
    compoundPresentation,
    standardPrimaryAction,
    compoundPrimaryAction,
    handleStandardPrimaryAction,
    handleCompoundPrimaryAction,
  };
}
