import { ChefHat, Volume2, VolumeX, UtensilsCrossed } from 'lucide-react';
import {
  recipeCategories,
} from '../data/recipes';

import {
  getIngredientKey,
  buildInitialIngredientSelection,
  clampNumber,
  splitIngredientQuantity,
} from '../utils/recipeHelpers';

import { useRecipeSelection } from '../hooks/useRecipeSelection';
import { usePortions } from '../hooks/usePortions';
import { useCookingProgress } from '../hooks/useCookingProgress';
import { useAIRecipeGeneration } from '../hooks/useAIRecipeGeneration';

import { useThermomixVoice } from '../hooks/useThermomixVoice';
import { useThermomixTimer } from '../hooks/useThermomixTimer';
import { useThermomixHandlers } from '../hooks/useThermomixHandlers';

import { CategorySelectScreen } from './screens/CategorySelectScreen';
import { RecipeSelectScreen } from './screens/RecipeSelectScreen';
import { RecipeSetupScreen } from './screens/RecipeSetupScreen';
import { IngredientsScreen } from './screens/IngredientsScreen';
import { CookingScreen } from './screens/CookingScreen';
import { AIClarifyScreen } from './screens/AIClarifyScreen';

const APP_VERSION = "v1.0.0"; // Fallback for __APP_VERSION__
const APPROX_GRAMS_PER_UNIT = 250;

export function ThermomixCooker() {
  const recipeSelection = useRecipeSelection();
  const portions = usePortions({
    selectedRecipe: recipeSelection.selectedRecipe,
    activeRecipeContent: recipeSelection.activeRecipeContent,
    quantityMode: recipeSelection.quantityMode,
    amountUnit: recipeSelection.amountUnit,
    peopleCount: recipeSelection.peopleCount,
    availableCount: recipeSelection.availableCount,
    produceType: recipeSelection.produceType,
    produceSize: recipeSelection.produceSize,
    portion: recipeSelection.portion,
  });

  const cookingProgress = useCookingProgress({
    selectedRecipe: recipeSelection.selectedRecipe,
    activeRecipeContentSteps: recipeSelection.activeRecipeContent.steps,
    portion: recipeSelection.portion,
  });

  const aiRecipeGen = useAIRecipeGeneration({
    availableRecipes: recipeSelection.availableRecipes,
    setAvailableRecipes: recipeSelection.setAvailableRecipes,
    setRecipeContentById: recipeSelection.setRecipeContentById,
    setIngredientSelectionByRecipe: recipeSelection.setIngredientSelectionByRecipe,
    setSelectedCategory: recipeSelection.setSelectedCategory,
    setSelectedRecipe: recipeSelection.setSelectedRecipe,
    setScreen: recipeSelection.setScreen,
    setIngredientsBackScreen: recipeSelection.setIngredientsBackScreen,
    setCookingSteps: cookingProgress.setCookingSteps,
    setQuantityMode: recipeSelection.setQuantityMode,
    setAmountUnit: recipeSelection.setAmountUnit,
    setAvailableCount: recipeSelection.setAvailableCount,
    setPortion: recipeSelection.setPortion,
    setPeopleCount: recipeSelection.setPeopleCount,
    setTimerScaleFactor: cookingProgress.setTimerScaleFactor,
    setTimingAdjustedLabel: cookingProgress.setTimingAdjustedLabel,
    setCurrentStepIndex: cookingProgress.setCurrentStepIndex,
    setCurrentSubStepIndex: cookingProgress.setCurrentSubStepIndex,
    setIsRunning: cookingProgress.setIsRunning,
    setActiveStepLoop: cookingProgress.setActiveStepLoop,
    setFlipPromptVisible: cookingProgress.setFlipPromptVisible,
    setPendingFlipAdvance: cookingProgress.setPendingFlipAdvance,
    setFlipPromptCountdown: cookingProgress.setFlipPromptCountdown,
    setStirPromptVisible: cookingProgress.setStirPromptVisible,
    setPendingStirAdvance: cookingProgress.setPendingStirAdvance,
    setStirPromptCountdown: cookingProgress.setStirPromptCountdown,
    setAwaitingNextUnitConfirmation: cookingProgress.setAwaitingNextUnitConfirmation,
  });

  const {
    screen,
    voiceEnabled,
    setVoiceEnabled,
    voiceStatus,
    setVoiceStatus,
    currentStepIndex,
    currentSubStepIndex,
    currentSubStep,
    flipPromptVisible,
    stirPromptVisible,
    currentStep,
  } = { ...recipeSelection, ...cookingProgress, ...aiRecipeGen };

  // Computed state for UI
  const currentSubStepText = `${currentSubStep?.subStepName ?? ''} ${currentSubStep?.notes ?? ''}`.toLowerCase();

  const isAutoReminderSubStep = Boolean(
    currentSubStep &&
    !currentSubStep.isTimer &&
    (() => {
      const text = currentSubStepText;
      return (
        text.includes('recordatorio') || text.includes('mueve') || text.includes('mover') ||
        text.includes('remueve') || text.includes('remover') || text.includes('revuelve') ||
        text.includes('revolver') || text.includes('voltea') || text.includes('voltear') ||
        text.includes('gira') || text.includes('girar') || text.includes('dar vuelta') ||
        text.includes('redistribuye') || text.includes('redistribuir') || text.includes('stir') ||
        text.includes('flip') || text.includes('turn')
      );
    })()
  );

  const isRetirarSubStep = Boolean(
    currentSubStep &&
    !currentSubStep.isTimer &&
    (currentSubStep.subStepName.toLowerCase().includes('retirar') ||
      currentSubStep.subStepName.toLowerCase().includes('tanda completada'))
  );

  const retirarIsEgg = currentSubStepText.includes('huevo');
  const retirarIsFries = recipeSelection.selectedRecipe?.id === 'papas-fritas' && isRetirarSubStep;

  const retirarTitle = retirarIsEgg ? 'El huevo está listo' : retirarIsFries ? 'Tanda completada' : 'Pieza completada';
  const retirarMessage = retirarIsEgg ? 'Retira tu huevo y prepárate para el siguiente.' : retirarIsFries ? 'Retira las papas, escurre y continúa con la siguiente tanda.' : 'Retira la pieza y prepárate para la siguiente.';

  const stirPromptTitle = currentSubStepText.includes('papa') || currentSubStepText.includes('frita')
    ? (currentSubStepText.includes('segundo tramo') ? 'Mover nuevamente' : 'Mover papas')
    : 'Recordatorio';

  const stirPromptMessage = currentSubStepText.includes('papa') || currentSubStepText.includes('frita')
    ? (currentSubStepText.includes('segundo tramo') ? 'Vuelve a mover para terminar de dorar parejo.' : 'Remueve y separa para evitar que se peguen.')
    : 'Realiza el giro o movimiento indicado antes del siguiente tramo.';

  const effectiveReminderTitle = isAutoReminderSubStep
    ? currentSubStep?.subStepName.replace(/^Recordatorio:\s*/i, 'Recordatorio')
    : stirPromptTitle;

  const effectiveReminderMessage = isAutoReminderSubStep
    ? currentSubStep?.notes || 'Realiza la acción indicada antes de continuar.'
    : stirPromptMessage;

  const showFlipHint = Boolean(currentSubStep?.notes?.toLowerCase().includes('voltear') || currentSubStepText.includes('dar vuelta'));
  const showStirHint = Boolean(currentSubStep?.isTimer && (currentSubStepText.includes('dorar') || currentSubStepText.includes('freir')));

  const portionValue = currentSubStep?.isTimer
    ? (typeof currentSubStep.portions[recipeSelection.portion] === 'number'
      ? Math.round((currentSubStep.portions[recipeSelection.portion] as number) * portions.setupScaleFactor)
      : null)
    : (currentSubStep?.portions[recipeSelection.portion] as string || null);

  const voice = useThermomixVoice({
    voiceEnabled,
    setVoiceEnabled,
    voiceStatus,
    setVoiceStatus,
    screen,
    currentStepIndex,
    currentSubStepIndex,
    currentSubStep,
    flipPromptVisible,
    stirPromptVisible,
    isRetirarSubStep,
    retirarTitle,
    retirarMessage,
    effectiveReminderTitle,
    effectiveReminderMessage,
  });

  const handlers = useThermomixHandlers({
    ...recipeSelection,
    ...cookingProgress,
    ...aiRecipeGen,
    ...portions,
    portionValue,
    setPortion: recipeSelection.setPortion,
    setAiClarificationAnswers: aiRecipeGen.setAiClarificationAnswers,
    setIsCheckingClarifications: aiRecipeGen.setIsCheckingClarifications,
    setIsGeneratingRecipe: aiRecipeGen.setIsGeneratingRecipe,
    cookingProgressIsRunning: cookingProgress.isRunning,
    APPROX_GRAMS_PER_UNIT,
  });

  useThermomixTimer({
    ...recipeSelection,
    ...cookingProgress,
    ...portions,
    portionValue: typeof portionValue === 'number' ? portionValue : 0,
    showFlipHint,
    showStirHint,
    currentSubStepText,
    handleNext: handlers.handleNext,
    isRetirarSubStep,
    isAutoReminderSubStep,
    timerScaleFactor: cookingProgress.timerScaleFactor,
    speakInstruction: voice.speakInstruction,
    currentRecipeData: cookingProgress.currentRecipeData,
  });

  // Render Logic
  if (screen === 'category-select') {
    return (
      <CategorySelectScreen
        appVersion={APP_VERSION}
        voiceEnabled={voiceEnabled}
        onVoiceToggle={voice.handleVoiceToggle}
        speechSupported={voice.speechSupported}
        aiPrompt={aiRecipeGen.aiPrompt}
        onAiPromptChange={aiRecipeGen.handleAiPromptChange}
        aiError={aiRecipeGen.aiError}
        aiSuccess={aiRecipeGen.aiSuccess}
        onGenerateRecipe={aiRecipeGen.handleGenerateRecipe}
        isGeneratingRecipe={aiRecipeGen.isGeneratingRecipe}
        isCheckingClarifications={aiRecipeGen.isCheckingClarifications}
        recipeCategories={recipeCategories}
        availableRecipes={recipeSelection.availableRecipes}
        onCategorySelect={handlers.handleCategorySelect}
      />
    );
  }

  if (screen === 'recipe-select') {
    return (
      <RecipeSelectScreen
        appVersion={APP_VERSION}
        voiceEnabled={voiceEnabled}
        onVoiceToggle={voice.handleVoiceToggle}
        speechSupported={voice.speechSupported}
        selectedCategoryMeta={recipeSelection.selectedCategoryMeta}
        onBack={handlers.handleBackToCategories}
        visibleRecipes={recipeSelection.visibleRecipes}
        onRecipeSelect={handlers.handleRecipeSelect}
      />
    );
  }

  if (screen === 'ai-clarify') {
    return (
      <AIClarifyScreen
        aiPrompt={aiRecipeGen.aiPrompt}
        questions={aiRecipeGen.aiClarificationQuestions}
        answers={aiRecipeGen.aiClarificationAnswers}
        numberModes={aiRecipeGen.aiClarificationNumberModes}
        quantityUnits={aiRecipeGen.aiClarificationQuantityUnits}
        onAnswerChange={handlers.handleAnswerChange}
        onNumberModeChange={(id, mode) => aiRecipeGen.setAiClarificationNumberModes({ ...aiRecipeGen.aiClarificationNumberModes, [id]: mode })}
        onQuantityUnitChange={(id, unit) => aiRecipeGen.setAiClarificationQuantityUnits({ ...aiRecipeGen.aiClarificationQuantityUnits, [id]: unit })}
        onBack={handlers.handleBackToAIPrompt}
        onGenerate={aiRecipeGen.handleGenerateRecipe}
        isGenerating={aiRecipeGen.isGeneratingRecipe}
        resolveUnit={aiRecipeGen.resolveClarificationUnit}
      />
    );
  }

  if (screen === 'recipe-setup') {
    return (
      <RecipeSetupScreen
        quantityMode={recipeSelection.quantityMode}
        setQuantityMode={recipeSelection.setQuantityMode}
        amountUnit={recipeSelection.amountUnit}
        onAmountUnitChange={handlers.handleSetupAmountUnitChange}
        peopleCount={recipeSelection.peopleCount}
        setPeopleCount={recipeSelection.setPeopleCount}
        availableCount={recipeSelection.availableCount}
        setAvailableCount={recipeSelection.setAvailableCount}
        isTubersBoilRecipe={portions.isTubersBoilRecipe}
        produceType={recipeSelection.produceType}
        setProduceType={recipeSelection.setProduceType}
        produceSize={recipeSelection.produceSize}
        setProduceSize={recipeSelection.setProduceSize}
        setupPortionPreview={portions.setupPortionPreview}
        setupScaleFactor={portions.setupScaleFactor}
        onBack={() => recipeSelection.setScreen('recipe-select')}
        onContinue={handlers.handleSetupContinue}
        selectedRecipe={recipeSelection.selectedRecipe}
      />
    );
  }

  if (screen === 'ingredients') {
    return (
      <IngredientsScreen
        appVersion={APP_VERSION}
        voiceEnabled={voiceEnabled}
        onVoiceToggle={voice.handleVoiceToggle}
        speechSupported={voice.speechSupported}
        selectedRecipe={recipeSelection.selectedRecipe}
        portion={recipeSelection.portion}
        currentPortionLabel={portions.currentPortionLabel}
        quantityMode={recipeSelection.quantityMode}
        peopleCount={recipeSelection.peopleCount}
        availableCount={recipeSelection.availableCount}
        amountUnit={recipeSelection.amountUnit}
        timingAdjustedLabel={cookingProgress.timingAdjustedLabel}
        currentIngredients={recipeSelection.currentIngredients}
        activeIngredientSelection={recipeSelection.activeIngredientSelection}
        onIngredientToggle={handlers.handleIngredientToggle}
        batchCountForRecipe={portions.batchCountForRecipe}
        batchUsageTips={portions.batchUsageTips}
        currentTip={recipeSelection.activeRecipeContent.tip}
        onBack={() => recipeSelection.setScreen(recipeSelection.ingredientsBackScreen)}
        onStartCooking={handlers.handleStartCooking}
        currentRecipeData={recipeSelection.activeRecipeContent.steps}
      />
    );
  }

  return (
    <CookingScreen
      appVersion={APP_VERSION}
      voiceEnabled={voiceEnabled}
      onVoiceToggle={voice.handleVoiceToggle}
      speechSupported={voice.speechSupported}
      onChangeMission={handlers.handleChangeMission}
      currentRecipeData={cookingProgress.currentRecipeData}
      currentStepIndex={cookingProgress.currentStepIndex}
      currentSubStepIndex={cookingProgress.currentSubStepIndex}
      currentSubStep={cookingProgress.currentSubStep}
      isRunning={cookingProgress.isRunning}
      timeRemaining={cookingProgress.timeRemaining}
      onTogglePause={handlers.handleTogglePause}
      onPrevious={handlers.handlePrevious}
      onNext={handlers.handleNext}
      onJumpToSubStep={handlers.handleJumpToSubStep}
      onContinue={handlers.handleContinue}
      onConfirmNextUnit={handlers.handleConfirmNextUnit}
      activeStepLoop={cookingProgress.activeStepLoop}
      portion={recipeSelection.portion}
      awaitingNextUnitConfirmation={cookingProgress.awaitingNextUnitConfirmation}
      flipPromptVisible={cookingProgress.flipPromptVisible}
      flipPromptCountdown={cookingProgress.flipPromptCountdown}
      stirPromptVisible={cookingProgress.stirPromptVisible}
      stirPromptCountdown={cookingProgress.stirPromptCountdown}
      effectiveReminderTitle={effectiveReminderTitle}
      effectiveReminderMessage={effectiveReminderMessage}
      isRetirarSubStep={isRetirarSubStep}
      retirarTitle={retirarTitle}
      retirarMessage={retirarMessage}
      currentStep={cookingProgress.currentStep}
      portionValue={portions.portionValue}
      currentIngredients={recipeSelection.currentIngredients}
      activeIngredientSelection={recipeSelection.activeIngredientSelection}
      activeRecipeContent={recipeSelection.activeRecipeContent}
    />
  );
}
