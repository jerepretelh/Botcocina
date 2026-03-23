import { useThermomixVoice } from '../../../hooks/useThermomixVoice';
import { useThermomixTimer } from '../../../hooks/useThermomixTimer';
import { useThermomixCompatCookingActions } from '../compat/useThermomixCompatCookingActions';
import { useThermomixCookingCopy } from './useThermomixCookingCopy';
import { useThermomixCookingPresentation } from './useThermomixCookingPresentation';
import type {
  CompoundCookingController,
  CookingProgressController,
  PortionsController,
  RecipeSelectionController,
  StandardCookingController,
  StandardTimerController,
  ThermomixRecipeRuntime,
} from '../lib/controllerTypes';
import type { UseThermomixCompatCookingActionsArgs } from '../compat/useThermomixCompatCookingActions';

export function useThermomixCookingAssembly(args: {
  recipeSelection: RecipeSelectionController;
  cookingProgress: CookingProgressController;
  portions: PortionsController;
  isCompoundRecipe: boolean;
  hasRecipeV2: boolean;
  scaledStandardRecipe: ThermomixRecipeRuntime['scaledStandardRecipe'];
  standardCooking: StandardCookingController;
  standardTimer: StandardTimerController;
  compoundCooking: CompoundCookingController;
  scaledCompoundRecipe: ThermomixRecipeRuntime['scaledCompoundRecipe'];
  compatDeps: Omit<UseThermomixCompatCookingActionsArgs, 'recipeSelection' | 'cookingProgress' | 'portions' | 'portionValue'>;
}) {
  const copy = useThermomixCookingCopy({
    cookingProgress: args.cookingProgress,
    recipeSelection: args.recipeSelection,
    portions: args.portions,
  });

  const voice = useThermomixVoice({
    voiceEnabled: args.cookingProgress.voiceEnabled,
    setVoiceEnabled: args.cookingProgress.setVoiceEnabled,
    voiceStatus: args.cookingProgress.voiceStatus,
    setVoiceStatus: args.cookingProgress.setVoiceStatus,
    screen: args.recipeSelection.screen,
    currentStepIndex: args.cookingProgress.currentStepIndex,
    currentSubStepIndex: args.cookingProgress.currentSubStepIndex,
    currentSubStep: args.cookingProgress.currentSubStep,
    portion: args.recipeSelection.portion,
    flipPromptVisible: args.cookingProgress.flipPromptVisible,
    stirPromptVisible: args.cookingProgress.stirPromptVisible,
    isRetirarSubStep: copy.reminderState.isRetirarSubStep,
    retirarTitle: copy.reminderCopy.retirarTitle,
    retirarMessage: copy.reminderCopy.retirarMessage,
    effectiveReminderTitle: copy.reminderCopy.effectiveReminderTitle,
    effectiveReminderMessage: copy.reminderCopy.effectiveReminderMessage,
    compoundCurrentItem: args.isCompoundRecipe ? args.compoundCooking.currentItem : null,
    compoundCurrentTimer: args.isCompoundRecipe ? args.compoundCooking.currentTimer : null,
    compoundTimerStarted: args.isCompoundRecipe ? args.compoundCooking.isCurrentTimerStarted : false,
    compoundTimerExpired: args.isCompoundRecipe ? args.compoundCooking.isCurrentTimerExpired : false,
    compoundIsRecipeComplete: args.isCompoundRecipe ? args.compoundCooking.isRecipeComplete : false,
    compoundRecipeName: args.isCompoundRecipe ? args.recipeSelection.selectedRecipe?.name ?? null : null,
  });

  const handlers = useThermomixCompatCookingActions({
    ...args.compatDeps,
    recipeSelection: args.recipeSelection,
    cookingProgress: args.cookingProgress,
    portions: args.portions,
    portionValue: copy.portionValue,
  });

  const presentation = useThermomixCookingPresentation({
    scaledStandardRecipe: args.scaledStandardRecipe,
    standardCooking: args.standardCooking,
    standardTimer: args.standardTimer,
    scaledCompoundRecipe: args.scaledCompoundRecipe,
    compoundCooking: args.compoundCooking,
    handlers,
  });

  useThermomixTimer({
    ...args.recipeSelection,
    ...args.cookingProgress,
    ...args.portions,
    screen: args.isCompoundRecipe || args.hasRecipeV2 ? 'category-select' : args.recipeSelection.screen,
    portionValue: typeof copy.portionValue === 'number' ? copy.portionValue : 0,
    showFlipHint: copy.reminderCopy.showFlipHint,
    showStirHint: copy.reminderCopy.showStirHint,
    currentSubStepText: copy.reminderState.currentSubStepText,
    handleNext: handlers.handleNext,
    isRetirarSubStep: copy.reminderState.isRetirarSubStep,
    isAutoReminderSubStep: copy.reminderState.isAutoReminderSubStep,
    timerScaleFactor: args.cookingProgress.timerScaleFactor,
    speakInstruction: voice.speakInstruction,
    currentRecipeData: args.cookingProgress.currentRecipeData,
  });

  return {
    voice,
    handlers,
    portionValue: copy.portionValue,
    standardPresentation: presentation.standardPresentation,
    compoundPresentation: presentation.compoundPresentation,
    standardPrimaryAction: presentation.standardPrimaryAction,
    compoundPrimaryAction: presentation.compoundPrimaryAction,
    handleStandardPrimaryAction: presentation.handleStandardPrimaryAction,
    handleCompoundPrimaryAction: presentation.handleCompoundPrimaryAction,
    effectiveReminderTitle: copy.reminderCopy.effectiveReminderTitle,
    effectiveReminderMessage: copy.reminderCopy.effectiveReminderMessage,
    isRetirarSubStep: copy.reminderState.isRetirarSubStep,
    retirarTitle: copy.reminderCopy.retirarTitle,
    retirarMessage: copy.reminderCopy.retirarMessage,
  };
}
