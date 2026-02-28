const fs = require('fs');

const path = './src/app/components/ThermomixCooker.tsx';
let content = fs.readFileSync(path, 'utf8');

const stateBlockRegex = /const \[screen, setScreen[^]*?(?=const activeRecipeId = selectedRecipe\?\.id \?\? 'arroz';)/;

const newHooksStr = `  const [screen, setScreen] = useState<Screen>('category-select');
  const [ingredientsBackScreen, setIngredientsBackScreen] = useState<IngredientsBackScreen>('recipe-setup');
  
  const {
    availableRecipes,
    setAvailableRecipes,
    recipeContentById,
    setRecipeContentById,
    selectedCategory,
    setSelectedCategory,
    selectedRecipe,
    setSelectedRecipe,
    ingredientSelectionByRecipe,
    setIngredientSelectionByRecipe,
    quantityMode,
    setQuantityMode,
    amountUnit,
    setAmountUnit,
    produceType,
    setProduceType,
    produceSize,
    setProduceSize,
  } = useRecipeSelection();

  const activeRecipeId = selectedRecipe?.id ?? 'arroz';
  const activeRecipeContent = recipeContentById[activeRecipeId] ?? initialRecipeContent.arroz;
  const currentIngredients = activeRecipeContent.ingredients;
  const activeIngredientSelection =
    ingredientSelectionByRecipe[activeRecipeId] ?? buildInitialIngredientSelection(currentIngredients);

  const {
    portion,
    setPortion,
    peopleCount,
    setPeopleCount,
    availableCount,
    setAvailableCount,
    timerScaleFactor,
    setTimerScaleFactor,
    timingAdjustedLabel,
    setTimingAdjustedLabel,
    setupPortionPreview,
    setupScaleFactor,
    targetMainCount,
    batchCountForRecipe,
    batchUsageTips,
  } = usePortions({
    selectedRecipe,
    activeRecipeContent,
    quantityMode,
    amountUnit,
    peopleCount,
    availableCount,
    produceType,
    produceSize,
    portion
  });

  const {
    cookingSteps,
    setCookingSteps,
    activeStepLoop,
    setActiveStepLoop,
    currentStepIndex,
    setCurrentStepIndex,
    currentSubStepIndex,
    setCurrentSubStepIndex,
    isRunning,
    setIsRunning,
    timeRemaining,
    setTimeRemaining,
    flipPromptVisible,
    setFlipPromptVisible,
    pendingFlipAdvance,
    setPendingFlipAdvance,
    flipPromptCountdown,
    setFlipPromptCountdown,
    stirPromptVisible,
    setStirPromptVisible,
    pendingStirAdvance,
    setPendingStirAdvance,
    stirPromptCountdown,
    setStirPromptCountdown,
    awaitingNextUnitConfirmation,
    setAwaitingNextUnitConfirmation,
    voiceEnabled,
    setVoiceEnabled,
    voiceStatus,
    setVoiceStatus,
    currentRecipeData,
    currentStep,
    currentSubStep,
    isAtLastSubStep,
    isAtLastStep,
    hasPendingLoopItems,
    isRecipeFinished,
    isLoopingCurrentStep,
  } = useCookingProgress({
    selectedRecipe,
    cookingSteps,
    activeRecipeContentSteps: activeRecipeContent.steps,
    portion: portion
  });

  const {
    aiPrompt,
    setAiPrompt,
    aiClarificationQuestions,
    setAiClarificationQuestions,
    aiClarificationAnswers,
    setAiClarificationAnswers,
    aiClarificationNumberModes,
    setAiClarificationNumberModes,
    aiClarificationQuantityUnits,
    setAiClarificationQuantityUnits,
    isCheckingClarifications,
    setIsCheckingClarifications,
    isGeneratingRecipe,
    setIsGeneratingRecipe,
    aiError,
    setAiError,
    aiSuccess,
    setAiSuccess,
  } = useAIClarifications();

  `;

content = content.replace(stateBlockRegex, newHooksStr);

// Also we need to delete lines that are double computed.
// since activeRecipeId up to batchUsageTips are computed in the hooks, we should remove their local duplicate computations

const duplicateComputationsRegex = /const activeRecipeId.*?const batchUsageTips = buildBatchUsageTips\(currentIngredients, portion, batchCountForRecipe\);\n/s;
content = content.replace(duplicateComputationsRegex, '');


fs.writeFileSync(path, content, 'utf8');
console.log('Hooks replaced successfully');
