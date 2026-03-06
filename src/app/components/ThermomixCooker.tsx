import { useEffect, useRef } from 'react';
import { ChefHat, Volume2, VolumeX, UtensilsCrossed } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { Screen, RecipeCategoryId } from '../../types';
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
import { useAnonymousSession } from '../hooks/useAnonymousSession';
import { useUserLists } from '../hooks/useUserLists';
import { trackProductEvent } from '../lib/productEvents';

import { useThermomixVoice } from '../hooks/useThermomixVoice';
import { useThermomixTimer } from '../hooks/useThermomixTimer';
import { useThermomixHandlers } from '../hooks/useThermomixHandlers';

import { CategorySelectScreen } from './screens/CategorySelectScreen';
import { RecipeSelectScreen } from './screens/RecipeSelectScreen';
import { RecipeSetupScreen } from './screens/RecipeSetupScreen';
import { IngredientsScreen } from './screens/IngredientsScreen';
import { CookingScreen } from './screens/CookingScreen';
import { AIClarifyScreen } from './screens/AIClarifyScreen';
import { DesignSystemScreen } from './screens/DesignSystemScreen';

const APP_VERSION = "v1.0.0"; // Fallback for __APP_VERSION__
const APPROX_GRAMS_PER_UNIT = 250;

export function ThermomixCooker() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeSyncRef = useRef(false);
  const anonymousSession = useAnonymousSession();
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
    cloudUserId: anonymousSession.userId,
  });
  const userLists = useUserLists({ userId: anonymousSession.userId });

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
    aiUserId: anonymousSession.userId,
    addRecipeToDefaultList: userLists.addRecipeToDefaultList,
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
    portion,
    flipPromptVisible,
    stirPromptVisible,
    currentStep,
    isRecipeFinished,
  } = { ...recipeSelection, ...cookingProgress, ...aiRecipeGen };

  const recipesForCurrentView = recipeSelection.availableRecipes.filter((recipe) => {
    if (userLists.catalogViewMode === 'platform') {
      return (recipe.visibility ?? 'public') === 'public';
    }
    if (userLists.catalogViewMode === 'my-lists') {
      return userLists.activeListRecipeIds.has(recipe.id);
    }
    return true;
  });

  const visibleRecipesForCurrentView = recipeSelection.selectedCategory
    ? recipesForCurrentView.filter((recipe) => recipe.categoryId === recipeSelection.selectedCategory)
    : [];

  const handleCreateList = async () => {
    const name = window.prompt('Nombre de la nueva lista');
    if (!name?.trim()) return;
    await userLists.createUserList(name.trim());
  };

  const handleRenameList = async () => {
    if (!userLists.activeListId || !userLists.activeList) return;
    const name = window.prompt('Nuevo nombre de la lista', userLists.activeList.name);
    if (!name?.trim()) return;
    await userLists.renameUserList(userLists.activeListId, name.trim());
  };

  const handleDeleteList = async () => {
    if (!userLists.activeListId || !userLists.activeList) return;
    if (userLists.activeList.isDefault) {
      window.alert('No puedes eliminar la lista por defecto.');
      return;
    }
    const ok = window.confirm(`¿Eliminar la lista "${userLists.activeList.name}"?`);
    if (!ok) return;
    await userLists.deleteUserList(userLists.activeListId);
  };
  const hasTrackedHomeRef = useRef(false);
  const previousCookingPositionRef = useRef<{ step: number; subStep: number } | null>(null);
  const previousScreenRef = useRef<Screen>(screen);

  useEffect(() => {
    const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';

    routeSyncRef.current = true;

    if (normalizedPath === '/') {
      recipeSelection.setSelectedCategory(null);
      recipeSelection.setScreenDirect('category-select');
      return;
    }

    if (normalizedPath === '/ia/aclarar') {
      recipeSelection.setScreenDirect('ai-clarify');
      return;
    }
    if (normalizedPath === '/design-system') {
      recipeSelection.setScreenDirect('design-system');
      return;
    }

    const categoryMatch = normalizedPath.match(/^\/categorias\/([^/]+)$/);
    if (categoryMatch) {
      const categoryId = decodeURIComponent(categoryMatch[1]);
      const isValidCategory = recipeCategories.some((category) => category.id === categoryId);
      if (!isValidCategory) {
        routeSyncRef.current = false;
        navigate('/', { replace: true });
        return;
      }
      recipeSelection.setSelectedCategory(categoryId as RecipeCategoryId);
      recipeSelection.setScreenDirect('recipe-select');
      return;
    }

    const recipeStageMatch = normalizedPath.match(/^\/recetas\/([^/]+)\/(configurar|ingredientes|cocinar)$/);
    if (recipeStageMatch) {
      const recipeId = decodeURIComponent(recipeStageMatch[1]);
      const stage = recipeStageMatch[2];
      const recipe = recipeSelection.availableRecipes.find((item) => item.id === recipeId);

      if (!recipe) {
        if (recipeSelection.isSyncingCatalog) return;
        routeSyncRef.current = false;
        navigate('/', { replace: true });
        return;
      }

      recipeSelection.setSelectedRecipe(recipe);
      recipeSelection.setSelectedCategory(recipe.categoryId);
      const targetScreen: Screen =
        stage === 'configurar'
          ? 'recipe-setup'
          : stage === 'ingredientes'
            ? 'ingredients'
            : 'cooking';
      recipeSelection.setScreenDirect(targetScreen);
      return;
    }

    routeSyncRef.current = false;
    navigate('/', { replace: true });
  }, [location.pathname, recipeSelection.availableRecipes, recipeSelection.isSyncingCatalog]);

  useEffect(() => {
    if (routeSyncRef.current) {
      routeSyncRef.current = false;
      return;
    }

    const recipeId = recipeSelection.selectedRecipe?.id ? encodeURIComponent(recipeSelection.selectedRecipe.id) : null;
    const categoryId = recipeSelection.selectedCategory ? encodeURIComponent(recipeSelection.selectedCategory) : null;

    const targetPath =
      screen === 'category-select'
        ? '/'
        : screen === 'design-system'
          ? '/design-system'
        : screen === 'recipe-select'
          ? categoryId ? `/categorias/${categoryId}` : '/'
          : screen === 'ai-clarify'
            ? '/ia/aclarar'
            : screen === 'recipe-setup'
              ? recipeId ? `/recetas/${recipeId}/configurar` : '/'
              : screen === 'ingredients'
                ? recipeId ? `/recetas/${recipeId}/ingredientes` : '/'
                : recipeId ? `/recetas/${recipeId}/cocinar` : '/';

    if (location.pathname !== targetPath) {
      navigate(targetPath);
    }
  }, [screen, recipeSelection.selectedCategory, recipeSelection.selectedRecipe?.id, location.pathname, navigate]);

  useEffect(() => {
    if (!anonymousSession.userId) return;
    if (screen !== 'category-select') {
      hasTrackedHomeRef.current = false;
      return;
    }
    if (hasTrackedHomeRef.current) return;
    hasTrackedHomeRef.current = true;
    void trackProductEvent(anonymousSession.userId, 'home_open');
  }, [anonymousSession.userId, screen]);

  useEffect(() => {
    if (!anonymousSession.userId) return;
    const prev = previousScreenRef.current;
    if (screen === 'cooking' && prev !== 'cooking' && recipeSelection.selectedRecipe) {
      void trackProductEvent(anonymousSession.userId, 'recipe_start', {
        recipeId: recipeSelection.selectedRecipe.id,
      });
      previousCookingPositionRef.current = { step: currentStepIndex, subStep: currentSubStepIndex };
    }
    previousScreenRef.current = screen;
  }, [screen, anonymousSession.userId, recipeSelection.selectedRecipe, currentStepIndex, currentSubStepIndex]);

  useEffect(() => {
    if (!anonymousSession.userId || screen !== 'cooking' || !recipeSelection.selectedRecipe) return;
    const previous = previousCookingPositionRef.current;
    if (!previous) {
      previousCookingPositionRef.current = { step: currentStepIndex, subStep: currentSubStepIndex };
      return;
    }

    if (currentStepIndex !== previous.step || currentSubStepIndex !== previous.subStep) {
      void trackProductEvent(anonymousSession.userId, 'step_next', {
        recipeId: recipeSelection.selectedRecipe.id,
        stepIndex: currentStepIndex,
        subStepIndex: currentSubStepIndex,
      });
      previousCookingPositionRef.current = { step: currentStepIndex, subStep: currentSubStepIndex };
    }
  }, [screen, currentStepIndex, currentSubStepIndex, anonymousSession.userId, recipeSelection.selectedRecipe]);

  useEffect(() => {
    if (!anonymousSession.userId || !isRecipeFinished || !recipeSelection.selectedRecipe) return;
    void trackProductEvent(anonymousSession.userId, 'recipe_complete', {
      recipeId: recipeSelection.selectedRecipe.id,
    });
  }, [anonymousSession.userId, isRecipeFinished, recipeSelection.selectedRecipe]);

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
    portion,
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
        availableRecipes={recipesForCurrentView}
        onCategorySelect={handlers.handleCategorySelect}
        onOpenDesignSystem={() => recipeSelection.setScreen('design-system')}
        catalogViewMode={userLists.catalogViewMode}
        onCatalogViewModeChange={userLists.setCatalogViewMode}
        userLists={userLists.lists}
        activeListId={userLists.activeListId}
        onActiveListChange={userLists.setActiveListId}
        onCreateList={() => void handleCreateList()}
        onRenameList={() => void handleRenameList()}
        onDeleteList={() => void handleDeleteList()}
      />
    );
  }

  if (screen === 'design-system') {
    return (
      <DesignSystemScreen onBack={() => recipeSelection.setScreen('category-select')} />
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
        onBack={() => recipeSelection.goBackScreen('category-select')}
        visibleRecipes={visibleRecipesForCurrentView}
        onRecipeSelect={handlers.handleRecipeSelect}
        catalogViewMode={userLists.catalogViewMode}
        activeListName={userLists.activeList?.name ?? null}
        isRecipeInActiveList={(recipeId) => userLists.activeListRecipeIds.has(recipeId)}
        onToggleRecipeInActiveList={(recipeId) => void userLists.toggleRecipeInActiveList(recipeId)}
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
        onBack={() => recipeSelection.goBackScreen('category-select')}
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
        onBack={() => recipeSelection.goBackScreen('recipe-select')}
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
        onBack={() => recipeSelection.goBackScreen(recipeSelection.ingredientsBackScreen)}
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
      portionValue={portionValue}
      currentIngredients={recipeSelection.currentIngredients}
      activeIngredientSelection={recipeSelection.activeIngredientSelection}
      activeRecipeContent={recipeSelection.activeRecipeContent}
      selectedRecipe={recipeSelection.selectedRecipe}
    />
  );
}
