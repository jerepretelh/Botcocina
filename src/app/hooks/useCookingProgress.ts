import { useState, useCallback, useEffect } from 'react';
import { RecipeStep, StepLoopState, Recipe } from '../../types';
import { isSupabaseEnabled, supabaseClient } from '../lib/supabaseClient';

interface UseCookingProgressProps {
    selectedRecipe: Recipe | null;
    activeRecipeContentSteps: RecipeStep[];
    portion: number;
    cloudUserId?: string | null;
}

export function useCookingProgress({
    selectedRecipe,
    activeRecipeContentSteps,
    portion,
    cloudUserId
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

    useEffect(() => {
        if (!isSupabaseEnabled || !supabaseClient || !cloudUserId || !selectedRecipe) return;
        const shouldSave = currentStepIndex > 0 || currentSubStepIndex > 0 || Boolean(activeStepLoop);
        if (!shouldSave) return;

        const timeout = setTimeout(() => {
            void supabaseClient
                .from('user_recipe_progress')
                .upsert(
                    {
                        user_id: cloudUserId,
                        recipe_id: selectedRecipe.id,
                        current_step_index: currentStepIndex,
                        current_substep_index: currentSubStepIndex,
                        active_step_loop: activeStepLoop,
                        timer_state: {
                            isRunning,
                            timeRemaining,
                        },
                        last_saved_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: 'user_id,recipe_id' },
                );
        }, 250);

        return () => clearTimeout(timeout);
    }, [
        cloudUserId,
        selectedRecipe,
        currentStepIndex,
        currentSubStepIndex,
        activeStepLoop,
        isRunning,
        timeRemaining,
    ]);

    // Load progress
    const loadProgress = useCallback(() => {
        if (selectedRecipe) {
            if (isSupabaseEnabled && supabaseClient && cloudUserId) {
                void supabaseClient
                    .from('user_recipe_progress')
                    .select('current_step_index,current_substep_index,active_step_loop')
                    .eq('user_id', cloudUserId)
                    .eq('recipe_id', selectedRecipe.id)
                    .maybeSingle()
                    .then(({ data }) => {
                        if (!data) return;
                        setCurrentStepIndex(data.current_step_index || 0);
                        setCurrentSubStepIndex(data.current_substep_index || 0);
                        if (data.active_step_loop) setActiveStepLoop(data.active_step_loop);
                    });
            }
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
    }, [selectedRecipe, cloudUserId]);

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
            if (isSupabaseEnabled && supabaseClient && cloudUserId) {
                void supabaseClient
                    .from('user_recipe_progress')
                    .delete()
                    .eq('user_id', cloudUserId)
                    .eq('recipe_id', selectedRecipe.id);
            }
        }
    }, [selectedRecipe, cloudUserId]);

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
