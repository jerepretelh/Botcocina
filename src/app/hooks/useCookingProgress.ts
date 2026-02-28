import { useState, useCallback, useEffect } from 'react';
import { RecipeStep, StepLoopState, Recipe } from '../../types';

interface UseCookingProgressProps {
    selectedRecipe: Recipe | null;
    activeRecipeContentSteps: RecipeStep[];
    portion: number;
}

export function useCookingProgress({
    selectedRecipe,
    activeRecipeContentSteps,
    portion
}: UseCookingProgressProps) {
    const [cookingSteps, setCookingSteps] = useState<RecipeStep[] | null>(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [currentSubStepIndex, setCurrentSubStepIndex] = useState(0);
    const [activeStepLoop, setActiveStepLoop] = useState<StepLoopState | null>(null);

    // Timer states
    const [isRunning, setIsRunning] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [timerScaleFactor, setTimerScaleFactor] = useState(1);
    const [timingAdjustedLabel, setTimingAdjustedLabel] = useState('Tiempo estándar');

    // Prompts states
    const [flipPromptVisible, setFlipPromptVisible] = useState(false);
    const [pendingFlipAdvance, setPendingFlipAdvance] = useState(false);
    const [flipPromptCountdown, setFlipPromptCountdown] = useState(0);
    const [stirPromptVisible, setStirPromptVisible] = useState(false);
    const [pendingStirAdvance, setPendingStirAdvance] = useState(false);
    const [stirPromptCountdown, setStirPromptCountdown] = useState(0);
    const [awaitingNextUnitConfirmation, setAwaitingNextUnitConfirmation] = useState(false);

    // Additional feature state (e.g. voice)
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const [voiceStatus, setVoiceStatus] = useState('Voz lista');

    const currentRecipeData = cookingSteps ?? activeRecipeContentSteps;
    const currentStep = currentRecipeData[currentStepIndex];
    const currentSubStep = currentStep?.subSteps[currentSubStepIndex];
    const isAtLastSubStep = Boolean(currentStep && currentSubStepIndex === currentStep.subSteps.length - 1);
    const isAtLastStep = currentStepIndex === currentRecipeData.length - 1;

    const hasPendingLoopItems = Boolean(
        activeStepLoop &&
        activeStepLoop.stepIndex === currentStepIndex &&
        activeStepLoop.currentItem < activeStepLoop.totalItems,
    );

    const isRecipeFinished = isAtLastStep && isAtLastSubStep && !hasPendingLoopItems;
    const isLoopingCurrentStep = Boolean(activeStepLoop && activeStepLoop.stepIndex === currentStepIndex);

    // Persist progress feature
    useEffect(() => {
        if (selectedRecipe && (currentStepIndex > 0 || currentSubStepIndex > 0)) {
            const stateToSave = {
                currentStepIndex,
                currentSubStepIndex,
                activeStepLoop,
                timestamp: Date.now()
            };
            localStorage.setItem(`cooking_progress_${selectedRecipe.id}`, JSON.stringify(stateToSave));
        }
    }, [selectedRecipe, currentStepIndex, currentSubStepIndex, activeStepLoop]);

    // Load progress
    const loadProgress = useCallback(() => {
        if (selectedRecipe) {
            const saved = localStorage.getItem(`cooking_progress_${selectedRecipe.id}`);
            if (saved) {
                try {
                    const { currentStepIndex: savedStep, currentSubStepIndex: savedSubStep, activeStepLoop: savedLoop } = JSON.parse(saved);
                    setCurrentStepIndex(savedStep || 0);
                    setCurrentSubStepIndex(savedSubStep || 0);
                    if (savedLoop) setActiveStepLoop(savedLoop);
                    return true;
                } catch (e) {
                    console.error("Error loading progress", e);
                }
            }
        }
        return false;
    }, [selectedRecipe]);

    const resetProgress = useCallback(() => {
        setCurrentStepIndex(0);
        setCurrentSubStepIndex(0);
        setActiveStepLoop(null);
        setIsRunning(false);
        setTimeRemaining(0);
        setFlipPromptVisible(false);
        setStirPromptVisible(false);
        if (selectedRecipe) {
            localStorage.removeItem(`cooking_progress_${selectedRecipe.id}`);
        }
    }, [selectedRecipe]);

    return {
        cookingSteps,
        setCookingSteps,
        currentStepIndex,
        setCurrentStepIndex,
        currentSubStepIndex,
        setCurrentSubStepIndex,
        activeStepLoop,
        setActiveStepLoop,
        isRunning,
        setIsRunning,
        timeRemaining,
        setTimeRemaining,
        timerScaleFactor,
        setTimerScaleFactor,
        timingAdjustedLabel,
        setTimingAdjustedLabel,
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
        loadProgress,
        resetProgress,
    };
}
