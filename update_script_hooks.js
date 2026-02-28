const fs = require('fs');

const path = './src/app/components/ThermomixCooker.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace the large state declaration block with hook usage
const stateBlockRegex = /const \[screen, setScreen[^]*?(?=const activeRecipeId)/s;

const newHooksStr = `  const [screen, setScreen] = useState<Screen>('category-select');
  const [ingredientsBackScreen, setIngredientsBackScreen] = useState<IngredientsBackScreen>('recipe-setup');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [, setVoiceStatus] = useState('Voz lista');
  const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const {
    availableRecipes,
    setAvailableRecipes,
    recipeContentById,
    setRecipeContentById,
    ingredientSelectionByRecipe,
    setIngredientSelectionByRecipe,
    selectedCategory,
    setSelectedCategory,
    selectedRecipe,
    setSelectedRecipe,
    quantityMode,
    setQuantityMode,
    amountUnit,
    setAmountUnit,
    produceType,
    setProduceType,
    produceSize,
    setProduceSize,
  } = useRecipeSelection(defaultRecipes, initialRecipeContent);

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
  } = usePortions(
    selectedRecipe,
    quantityMode,
    amountUnit,
    peopleCount,
    availableCount,
    produceType,
    produceSize,
    ingredientSelectionByRecipe[selectedRecipe?.id ?? ''] ? Object.keys(ingredientSelectionByRecipe[selectedRecipe?.id ?? '']) : [],
    portion
  );

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
  } = useCookingProgress();

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

// We need to pass the right variables from hook scope downwards to the screens rendered
fs.writeFileSync(path, content, 'utf8');
console.log('Hooks replaced');
