import {
    Recipe,
    RecipeCategoryId,
    AmountUnit,
    Ingredient,
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
import {
    buildInitialIngredientSelection,
    buildEggFrySteps,
    ensureEquipmentTransitionSubSteps,
    buildCookingSteps,
    getLoopItemCount,
    isLoopableStep,
    hasExplicitUnitFlow,
    removeRedundantEggInsertSubStep,
    clampNumber,
    mapCountToPortion,
} from '../utils/recipeHelpers';
import { applyTimerScale } from '../utils/timerUtils';
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
    } = props;

    const handleRecipeSelect = (recipe: Recipe) => {
        const content = recipeContentById[recipe.id];
        if (content && !ingredientSelectionByRecipe[recipe.id]) {
            setIngredientSelectionByRecipe((prev: any) => ({
                ...prev,
                [recipe.id]: buildInitialIngredientSelection(content.ingredients),
            }));
        }
        setCookingSteps(null);
        setActiveStepLoop(null);
        setSelectedRecipe(recipe);
        setQuantityMode('people');
        setPeopleCount(2);
        setAvailableCount(2);
        setAmountUnit('units');
        setProduceType('blanca');
        setProduceSize('medium');
        setTimerScaleFactor(1);
        setTimingAdjustedLabel('Tiempo estándar');
        setScreen('recipe-setup');
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
        setScreen('ingredients');
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
        const eggTargetCount = quantityMode === 'have'
            ? (amountUnit === 'grams'
                ? Math.max(1, Math.round(availableCount / 55))
                : availableCount)
            : peopleCount;
        const sourceSteps = selectedRecipe?.id === 'huevo-frito'
            ? buildEggFrySteps(eggTargetCount)
            : activeRecipeContent.steps;

        let selectedSteps = removeRedundantEggInsertSubStep(
            ensureEquipmentTransitionSubSteps(
                buildCookingSteps(
                    sourceSteps,
                    currentIngredients,
                    activeIngredientSelection,
                ),
                selectedRecipe?.equipment
            ),
            selectedRecipe?.id,
        );
        if (timerScaleFactor !== 1) {
            selectedSteps = applyTimerScale(selectedSteps, timerScaleFactor);
        }
        const loopItems = selectedRecipe?.id === 'papas-fritas' ? 3 : getLoopItemCount(currentIngredients, portion);
        const shouldDisableLoop =
            selectedRecipe?.id === 'huevo-frito' || hasExplicitUnitFlow(selectedSteps);
        const loopStepIndex = !shouldDisableLoop && loopItems > 1
            ? selectedSteps.findIndex((step) => isLoopableStep(step))
            : -1;

        if (loopStepIndex >= 0) {
            setActiveStepLoop({
                stepIndex: loopStepIndex,
                totalItems: loopItems,
                currentItem: 1,
            });
        } else {
            setActiveStepLoop(null);
        }

        setCookingSteps(selectedSteps);
        setScreen('cooking');
        setCurrentStepIndex(0);
        setCurrentSubStepIndex(0);
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
    };
}
