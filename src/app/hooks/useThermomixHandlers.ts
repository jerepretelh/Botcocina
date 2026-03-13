import {
    Recipe,
    RecipeCategoryId,
    AmountUnit,
    Ingredient,
    UserRecipeCookingConfig,
    Screen,
    RecipeStep,
    SubStep,
    StepLoopState,
    Portion,
    RecipeContent,
    QuantityMode,
    ClarificationNumberMode,
    ClarificationQuantityUnit,
} from '../../types';
import { AIClarificationQuestion } from '../lib/recipeAI';
import { buildCookingSessionState } from '../lib/cookingSession';
import {
    buildInitialIngredientSelection,
    clampNumber,
} from '../utils/recipeHelpers';
import { requestRecipeClarificationWithAI, generateRecipeWithAI } from '../lib/recipeAI';
import { buildRecipeId, ensureRecipeShape, normalizeText, inferSizingFromClarifications, inferPeopleCountFromClarifications, inferPortionFromPrompt } from '../utils/recipeHelpers';

interface UseThermomixHandlersProps {
    recipeContentById: Record<string, RecipeContent>;
    ingredientSelectionByRecipe: Record<string, Record<string, boolean>>;
    setIngredientSelectionByRecipe: (update: any) => void;
    setCookingSteps: (steps: RecipeStep[] | null) => void;
    setActiveStepLoop: (loop: StepLoopState | null) => void;
    setSelectedRecipe: (recipe: Recipe | null) => void;
    setQuantityMode: (mode: QuantityMode) => void;
    setPeopleCount: (count: number) => void;
    setAvailableCount: (count: number) => void;
    setAmountUnit: (unit: AmountUnit) => void;
    setProduceType: (type: string) => void;
    setProduceSize: (size: 'small' | 'medium' | 'large') => void;
    setTimerScaleFactor: (factor: number) => void;
    setTimingAdjustedLabel: (label: string) => void;
    setScreen: (screen: Screen) => void;
    setSelectedCategory: (category: RecipeCategoryId | null) => void;
    setAiClarificationQuestions: (questions: any) => void;
    setAiClarificationAnswers: (answers: any) => void;
    setAiClarificationNumberModes: (modes: any) => void;
    setAiClarificationQuantityUnits: (units: any) => void;
    setAiError: (error: any) => void;
    setAiSuccess: (success: any) => void;
    setIngredientsBackScreen: (screen: any) => void;
    setCurrentStepIndex: (index: any) => void;
    setCurrentSubStepIndex: (index: any) => void;
    setIsRunning: (running: any) => void;
    setFlipPromptVisible: (visible: any) => void;
    setPendingFlipAdvance: (pending: any) => void;
    setFlipPromptCountdown: (count: any) => void;
    setStirPromptVisible: (visible: any) => void;
    setPendingStirAdvance: (pending: any) => void;
    setStirPromptCountdown: (count: any) => void;
    setAwaitingNextUnitConfirmation: (awaiting: any) => void;
    setIsCheckingClarifications: (checking: any) => void;
    setIsGeneratingRecipe: (generating: any) => void;
    cookingProgressIsRunning: boolean;
    setAvailableRecipes: (action: any) => void;
    setRecipeContentById: (action: any) => void;
    setAiPrompt: (prompt: string) => void;
    setPortion: (portion: Portion) => void;
    // Dynamic props
    availableRecipes: Recipe[];
    activeRecipeId: string;
    currentIngredients: Ingredient[];
    activeIngredientSelection: Record<string, boolean>;
    activeRecipeContent: RecipeContent;
    quantityMode: QuantityMode;
    amountUnit: AmountUnit;
    availableCount: number;
    peopleCount: number;
    portion: Portion;
    timerScaleFactor: number;
    selectedRecipe: Recipe | null;
    setupPortionPreview: Portion;
    setupScaleFactor: number;
    aiPrompt: string;
    aiClarificationQuestions: AIClarificationQuestion[];
    aiClarificationAnswers: Record<string, string | number>;
    aiClarificationNumberModes: Record<string, ClarificationNumberMode>;
    aiClarificationQuantityUnits: Record<string, ClarificationQuantityUnit>;
    currentRecipeData: RecipeStep[];
    currentStepIndex: number;
    currentSubStepIndex: number;
    currentStep: RecipeStep | null;
    currentSubStep: SubStep | null;
    activeStepLoop: StepLoopState | null;
    resolveClarificationUnit: (question: AIClarificationQuestion) => string;
    APPROX_GRAMS_PER_UNIT: number;
    portionValue: number | string | null;
    getSavedRecipeConfig: (recipeId: string) => UserRecipeCookingConfig | null;
    resolveRecipeSetupBehavior: (recipe: Recipe, config: UserRecipeCookingConfig | null) => 'servings_only' | 'servings_or_quantity' | 'saved_config_first';
    saveUserRecipeConfig: (config: Omit<UserRecipeCookingConfig, 'createdAt' | 'updatedAt'>) => Promise<unknown>;
    recipeUserId: string | null;
    activePlannedRecipeItemId: string | null;
    savePlannedRecipeConfig: (configSnapshot: {
        quantityMode: QuantityMode;
        peopleCount: number | null;
        amountUnit: AmountUnit | null;
        availableCount: number | null;
        selectedOptionalIngredients: string[];
        sourceContextSummary: UserRecipeCookingConfig['sourceContextSummary'];
        resolvedPortion: Portion;
        scaleFactor: number;
    }) => Promise<unknown>;
    openRecipeSetupOverlay: () => void;
    openIngredientsOverlay: () => void;
    closeRecipeOverlays: () => void;
}

export function useThermomixHandlers(props: UseThermomixHandlersProps) {
    const {
        recipeContentById,
        ingredientSelectionByRecipe,
        setIngredientSelectionByRecipe,
        setCookingSteps,
        setActiveStepLoop,
        setSelectedRecipe,
        setQuantityMode,
        setPeopleCount,
        setAvailableCount,
        setAmountUnit,
        setProduceType,
        setProduceSize,
        setTimerScaleFactor,
        setTimingAdjustedLabel,
        setScreen,
        setSelectedCategory,
        setAiClarificationQuestions,
        setAiClarificationAnswers,
        setAiClarificationNumberModes,
        setAiClarificationQuantityUnits,
        setAiError,
        setAiSuccess,
        setIngredientsBackScreen,
        setCurrentStepIndex,
        setCurrentSubStepIndex,
        setIsRunning,
        setFlipPromptVisible,
        setPendingFlipAdvance,
        setFlipPromptCountdown,
        setStirPromptVisible,
        setPendingStirAdvance,
        setStirPromptCountdown,
        setAwaitingNextUnitConfirmation,
        setIsCheckingClarifications,
        setIsGeneratingRecipe,
        cookingProgressIsRunning,
        setAvailableRecipes,
        setRecipeContentById,
        setAiPrompt,
        setPortion,
        availableRecipes,
        activeRecipeId,
        currentIngredients,
        activeIngredientSelection,
        activeRecipeContent,
        quantityMode,
        amountUnit,
        availableCount,
        peopleCount,
        portion,
        timerScaleFactor,
        selectedRecipe,
        setupPortionPreview,
        setupScaleFactor,
        aiPrompt,
        aiClarificationQuestions,
        aiClarificationAnswers,
        aiClarificationNumberModes,
        aiClarificationQuantityUnits,
        currentRecipeData,
        currentStepIndex,
        currentSubStepIndex,
        currentStep,
        currentSubStep,
        activeStepLoop,
        resolveClarificationUnit,
        APPROX_GRAMS_PER_UNIT,
        getSavedRecipeConfig,
        resolveRecipeSetupBehavior,
        saveUserRecipeConfig,
        recipeUserId,
        activePlannedRecipeItemId,
        savePlannedRecipeConfig,
        openRecipeSetupOverlay,
        openIngredientsOverlay,
        closeRecipeOverlays,
    } = props;

    const persistRecipeConfigSafely = (config: Omit<UserRecipeCookingConfig, 'createdAt' | 'updatedAt'>) => {
        void Promise.resolve(saveUserRecipeConfig(config)).catch(() => null);
    };

    const persistPlannedRecipeConfigSafely = (configSnapshot: {
        quantityMode: QuantityMode;
        peopleCount: number | null;
        amountUnit: AmountUnit | null;
        availableCount: number | null;
        selectedOptionalIngredients: string[];
        sourceContextSummary: UserRecipeCookingConfig['sourceContextSummary'];
        resolvedPortion: Portion;
        scaleFactor: number;
    }) => {
        void Promise.resolve(savePlannedRecipeConfig(configSnapshot)).catch(() => null);
    };

    const handleRecipeSelect = (recipe: Recipe) => {
        const content = recipeContentById[recipe.id];
        const savedConfig = getSavedRecipeConfig(recipe.id);
        const setupBehavior = resolveRecipeSetupBehavior(recipe, savedConfig);
        if (content && !ingredientSelectionByRecipe[recipe.id]) {
            const baseSelection = buildInitialIngredientSelection(content.ingredients);
            const optionalKeys = savedConfig?.selectedOptionalIngredients ?? null;
            const hydratedSelection = optionalKeys
                ? Object.fromEntries(
                    Object.entries(baseSelection).map(([key, value]) => {
                        const ingredient = content.ingredients.find((item) => item.name.toLowerCase().replace(/\s+/g, '_') === key);
                        if (ingredient?.indispensable) return [key, true];
                        return [key, optionalKeys.includes(key)];
                    }),
                )
                : baseSelection;
            setIngredientSelectionByRecipe((prev: any) => ({
                ...prev,
                [recipe.id]: hydratedSelection,
            }));
        }
        setCookingSteps(null);
        setActiveStepLoop(null);
        setSelectedRecipe(recipe);
        if (savedConfig && (setupBehavior === 'saved_config_first' || setupBehavior === 'servings_or_quantity')) {
            const shouldUseHave = setupBehavior !== 'servings_only' && savedConfig.quantityMode === 'have';
            setQuantityMode(shouldUseHave ? 'have' : 'people');
            setPeopleCount(savedConfig.peopleCount ?? 2);
            setAvailableCount(savedConfig.availableCount ?? 2);
            setAmountUnit(savedConfig.amountUnit ?? 'units');
        } else {
            setQuantityMode('people');
            setPeopleCount(2);
            setAvailableCount(2);
            setAmountUnit('units');
        }
        setProduceType('blanca');
        setProduceSize('medium');
        setTimerScaleFactor(1);
        setTimingAdjustedLabel('Tiempo estándar');
        setCookingSteps(null);
        setActiveStepLoop(null);
        setCurrentStepIndex(0);
        setCurrentSubStepIndex(0);
        openRecipeSetupOverlay();
    };

    const handleCategorySelect = (categoryId: RecipeCategoryId) => {
        setSelectedCategory(categoryId);
        setScreen('recipe-select');
    };

    const handleBackToCategories = () => {
        setScreen('category-select');
        setSelectedCategory(null);
        setAiClarificationQuestions([]);
        setAiClarificationAnswers({});
        setAiClarificationNumberModes({});
        setAiClarificationQuantityUnits({});
        setAiError(null);
        setAiSuccess(null);
    };

    const handleBackToAIPrompt = () => {
        setScreen('category-select');
        setAiClarificationQuestions([]);
        setAiClarificationAnswers({});
        setAiClarificationNumberModes({});
        setAiClarificationQuantityUnits({});
        setAiError(null);
        setAiSuccess(null);
    };

    const handleSetupContinue = () => {
        const resolvedPortion = setupPortionPreview;
        setPortion(resolvedPortion);
        setTimerScaleFactor(setupScaleFactor);
        setTimingAdjustedLabel(
            Math.abs(setupScaleFactor - 1) < 0.01
                ? 'Tiempo estándar'
                : `Tiempo ajustado x${setupScaleFactor.toFixed(2)}`,
        );
        setIngredientsBackScreen('recipe-setup');
        openIngredientsOverlay();
        if (selectedRecipe && recipeUserId) {
            persistRecipeConfigSafely({
                userId: recipeUserId,
                recipeId: selectedRecipe.id,
                quantityMode,
                peopleCount: quantityMode === 'people' ? peopleCount : peopleCount,
                amountUnit: quantityMode === 'have' ? amountUnit : null,
                availableCount: quantityMode === 'have' ? availableCount : null,
                selectedOptionalIngredients: currentIngredients
                    .filter((ingredient) => !ingredient.indispensable)
                    .map((ingredient) => ingredient.name.toLowerCase().replace(/\s+/g, '_'))
                    .filter((key) => activeIngredientSelection[key] ?? true),
                sourceContextSummary: getSavedRecipeConfig(selectedRecipe.id)?.sourceContextSummary ?? null,
                lastUsedAt: new Date().toISOString(),
            });
        }
        if (selectedRecipe && activePlannedRecipeItemId) {
            persistPlannedRecipeConfigSafely({
                quantityMode,
                peopleCount,
                amountUnit: quantityMode === 'have' ? amountUnit : null,
                availableCount: quantityMode === 'have' ? availableCount : null,
                selectedOptionalIngredients: currentIngredients
                    .filter((ingredient) => !ingredient.indispensable)
                    .map((ingredient) => ingredient.name.toLowerCase().replace(/\s+/g, '_'))
                    .filter((key) => activeIngredientSelection[key] ?? true),
                sourceContextSummary: getSavedRecipeConfig(selectedRecipe.id)?.sourceContextSummary ?? null,
                resolvedPortion: setupPortionPreview,
                scaleFactor: setupScaleFactor,
            });
        }
    };

    const handleSetupAmountUnitChange = (nextUnit: AmountUnit) => {
        if (nextUnit === amountUnit) return;
        const current = availableCount;

        let converted = current;
        if (amountUnit === 'units' && nextUnit === 'grams') {
            converted = Math.round((current * APPROX_GRAMS_PER_UNIT) / 50) * 50;
            converted = clampNumber(converted, 50, 5000);
        } else if (amountUnit === 'grams' && nextUnit === 'units') {
            converted = Math.max(1, Math.round(current / APPROX_GRAMS_PER_UNIT));
            converted = clampNumber(converted, 1, 20);
        }

        setAmountUnit(nextUnit);
        setAvailableCount(converted);
    };

    const handleStartCooking = () => {
        const session = buildCookingSessionState({
            selectedRecipe,
            activeRecipeContentSteps: activeRecipeContent.steps,
            currentIngredients,
            activeIngredientSelection,
            quantityMode,
            amountUnit,
            availableCount,
            peopleCount,
            portion,
            timerScaleFactor,
        });

        setCookingSteps(session.steps);
        setActiveStepLoop(session.activeStepLoop);
        setScreen('cooking');
        closeRecipeOverlays();
        setCurrentStepIndex(0);
        setCurrentSubStepIndex(0);
        if (selectedRecipe && recipeUserId) {
            persistRecipeConfigSafely({
                userId: recipeUserId,
                recipeId: selectedRecipe.id,
                quantityMode,
                peopleCount,
                amountUnit: quantityMode === 'have' ? amountUnit : null,
                availableCount: quantityMode === 'have' ? availableCount : null,
                selectedOptionalIngredients: currentIngredients
                    .filter((ingredient) => !ingredient.indispensable)
                    .map((ingredient) => ingredient.name.toLowerCase().replace(/\s+/g, '_'))
                    .filter((key) => activeIngredientSelection[key] ?? true),
                sourceContextSummary: getSavedRecipeConfig(selectedRecipe.id)?.sourceContextSummary ?? null,
                lastUsedAt: new Date().toISOString(),
            });
        }
        if (selectedRecipe && activePlannedRecipeItemId) {
            persistPlannedRecipeConfigSafely({
                quantityMode,
                peopleCount,
                amountUnit: quantityMode === 'have' ? amountUnit : null,
                availableCount: quantityMode === 'have' ? availableCount : null,
                selectedOptionalIngredients: currentIngredients
                    .filter((ingredient) => !ingredient.indispensable)
                    .map((ingredient) => ingredient.name.toLowerCase().replace(/\s+/g, '_'))
                    .filter((key) => activeIngredientSelection[key] ?? true),
                sourceContextSummary: getSavedRecipeConfig(selectedRecipe.id)?.sourceContextSummary ?? null,
                resolvedPortion: portion,
                scaleFactor: timerScaleFactor,
            });
        }
    };

    const handleOpenIngredientsFromCooking = () => {
        setIngredientsBackScreen('cooking');
        openIngredientsOverlay();
    };

    const handleOpenSetupFromCooking = () => {
        setIngredientsBackScreen('recipe-setup');
        openRecipeSetupOverlay();
    };

    const handleExitCooking = () => {
        closeRecipeOverlays();
        setScreen('category-select');
        setSelectedCategory(null);
        setIsRunning(false);
        setFlipPromptVisible(false);
        setPendingFlipAdvance(false);
        setFlipPromptCountdown(0);
        setStirPromptVisible(false);
        setPendingStirAdvance(false);
        setStirPromptCountdown(0);
        setAwaitingNextUnitConfirmation(false);
    };

    const handleChangeMission = () => {
        setScreen('category-select');
        setSelectedCategory(null);
        setSelectedRecipe(null);
        setQuantityMode('people');
        setPeopleCount(2);
        setAvailableCount(2);
        setAmountUnit('units');
        setProduceType('blanca');
        setProduceSize('medium');
        setTimerScaleFactor(1);
        setTimingAdjustedLabel('Tiempo estándar');
        setIngredientsBackScreen('recipe-setup');
        closeRecipeOverlays();
        setCookingSteps(null);
        setActiveStepLoop(null);
        setCurrentStepIndex(0);
        setCurrentSubStepIndex(0);
        setIsRunning(false);
        setFlipPromptVisible(false);
        setPendingFlipAdvance(false);
        setFlipPromptCountdown(0);
        setStirPromptVisible(false);
        setPendingStirAdvance(false);
        setStirPromptCountdown(0);
        setAwaitingNextUnitConfirmation(false);
        setAiClarificationQuestions([]);
        setAiClarificationAnswers({});
        setAiClarificationNumberModes({});
        setAiClarificationQuantityUnits({});
        setAiError(null);
        setAiSuccess(null);
    };

    const handleNext = (options?: { keepFlipPrompt?: boolean }) => {
        if (!options?.keepFlipPrompt) {
            setFlipPromptVisible(false);
        }
        setAwaitingNextUnitConfirmation(false);
        if (!currentStep) return;

        if (currentSubStepIndex < currentStep.subSteps.length - 1) {
            setCurrentSubStepIndex(currentSubStepIndex + 1);
            if (currentStep?.stepNumber !== 5) {
                setIsRunning(false);
            }
        } else if (
            activeStepLoop &&
            activeStepLoop.stepIndex === currentStepIndex &&
            activeStepLoop.currentItem < activeStepLoop.totalItems
        ) {
            setActiveStepLoop({
                ...activeStepLoop,
                currentItem: activeStepLoop.currentItem + 1,
            });
            setCurrentSubStepIndex(0);
            setIsRunning(false);
        } else if (currentStepIndex < currentRecipeData.length - 1) {
            setCurrentStepIndex(currentStepIndex + 1);
            setCurrentSubStepIndex(0);
            setIsRunning(false);
            if (activeStepLoop && activeStepLoop.stepIndex === currentStepIndex) {
                setActiveStepLoop(null);
            }
        }
    };

    const handlePrevious = () => {
        if (currentSubStepIndex > 0) {
            setCurrentSubStepIndex(currentSubStepIndex - 1);
            if (currentStep?.stepNumber !== 5) {
                setIsRunning(false);
            }
        } else if (
            activeStepLoop &&
            activeStepLoop.stepIndex === currentStepIndex &&
            activeStepLoop.currentItem > 1
        ) {
            setActiveStepLoop({
                ...activeStepLoop,
                currentItem: activeStepLoop.currentItem - 1,
            });
            setCurrentSubStepIndex(Math.max((currentStep?.subSteps.length ?? 1) - 1, 0));
            setIsRunning(false);
        } else if (currentStepIndex > 0) {
            const previousStepIndex = currentStepIndex - 1;
            const previousStep = currentRecipeData[previousStepIndex];
            setCurrentStepIndex(previousStepIndex);
            setCurrentSubStepIndex(Math.max((previousStep?.subSteps.length ?? 1) - 1, 0));
            if (activeStepLoop && activeStepLoop.stepIndex > previousStepIndex) {
                setActiveStepLoop(null);
            }
            setIsRunning(false);
        }
    };

    const handleTogglePause = () => {
        if (currentSubStep?.isTimer || currentStep?.stepNumber === 5) {
            setIsRunning(!cookingProgressIsRunning);
        }
    };

    const handleContinue = () => {
        if (!currentSubStep?.isTimer) {
            handleNext();
        }
    };

    const handleConfirmNextUnit = () => {
        setAwaitingNextUnitConfirmation(false);
        handleNext();
    };

    const handleJumpToSubStep = (stepIndex: number, subStepIndex: number) => {
        setCurrentStepIndex(stepIndex);
        setCurrentSubStepIndex(subStepIndex);
        setIsRunning(false);
    };

    const handleIngredientToggle = (ingredient: Ingredient) => {
        if (ingredient.indispensable) return;

        const key = ingredient.name.toLowerCase().replace(/\s+/g, '_');
        setIngredientSelectionByRecipe((prev: any) => {
            const recipeSelection = prev[activeRecipeId] ?? buildInitialIngredientSelection(currentIngredients);
            return {
                ...prev,
                [activeRecipeId]: {
                    ...recipeSelection,
                    [key]: !(recipeSelection[key] ?? true),
                },
            };
        });
    };

    const handleAnswerChange = (id: string, value: string | number) => {
        setAiClarificationAnswers({
            ...aiClarificationAnswers,
            [id]: value
        });
    };

    return {
        handleRecipeSelect,
        handleCategorySelect,
        handleBackToCategories,
        handleBackToAIPrompt,
        handleSetupContinue,
        handleSetupAmountUnitChange,
        handleStartCooking,
        handleChangeMission,
        handleNext,
        handlePrevious,
        handleTogglePause,
        handleContinue,
        handleConfirmNextUnit,
        handleJumpToSubStep,
        handleIngredientToggle,
        handleAnswerChange,
        handleOpenIngredientsFromCooking,
        handleOpenSetupFromCooking,
        handleExitCooking,
    };
}
