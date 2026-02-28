import { useEffect, useRef } from 'react';
import { SubStep, Screen, RecipeStep, Portion } from '../../types';

interface UseThermomixTimerProps {
    screen: Screen;
    isRunning: boolean;
    setIsRunning: (running: boolean) => void;
    timeRemaining: number;
    setTimeRemaining: (time: number | ((prev: number) => number)) => void;
    currentStepIndex: number;
    currentSubStepIndex: number;
    currentStep: RecipeStep | null;
    currentSubStep: SubStep | null;
    portion: Portion;
    portionValue: number | null;
    showFlipHint: boolean;
    setFlipPromptVisible: (visible: boolean) => void;
    setPendingFlipAdvance: (pending: boolean) => void;
    setFlipPromptCountdown: (count: number | ((prev: number) => number)) => void;
    showStirHint: boolean;
    setStirPromptVisible: (visible: boolean) => void;
    setPendingStirAdvance: (pending: boolean) => void;
    setStirPromptCountdown: (count: number | ((prev: number) => number)) => void;
    currentSubStepText: string;
    isAtLastSubStep: boolean;
    hasPendingLoopItems: boolean;
    setAwaitingNextUnitConfirmation: (awaiting: boolean) => void;
    handleNext: (options?: { keepFlipPrompt?: boolean }) => void;
    isRetirarSubStep: boolean;
    isAutoReminderSubStep: boolean;
    flipPromptVisible: boolean;
    pendingFlipAdvance: boolean;
    flipPromptCountdown: number;
    stirPromptVisible: boolean;
    pendingStirAdvance: boolean;
    stirPromptCountdown: number;
    timerScaleFactor: number;
    speakInstruction: (text: string, force?: boolean) => void;
    currentRecipeData: RecipeStep[];
}

export function useThermomixTimer({
    screen,
    isRunning,
    setIsRunning,
    timeRemaining,
    setTimeRemaining,
    currentStepIndex,
    currentSubStepIndex,
    currentStep,
    currentSubStep,
    portion,
    portionValue,
    showFlipHint,
    setFlipPromptVisible,
    setPendingFlipAdvance,
    setFlipPromptCountdown,
    showStirHint,
    setStirPromptVisible,
    setPendingStirAdvance,
    setStirPromptCountdown,
    currentSubStepText,
    isAtLastSubStep,
    hasPendingLoopItems,
    setAwaitingNextUnitConfirmation,
    handleNext,
    isRetirarSubStep,
    isAutoReminderSubStep,
    flipPromptVisible,
    pendingFlipAdvance,
    flipPromptCountdown,
    stirPromptVisible,
    pendingStirAdvance,
    stirPromptCountdown,
    timerScaleFactor,
    speakInstruction,
    currentRecipeData,
}: UseThermomixTimerProps) {
    const beepAudioContextRef = useRef<AudioContext | null>(null);

    const playCountdownBeep = async () => {
        if (typeof window === 'undefined') return;

        try {
            const AudioContextClass =
                (window as any).AudioContext ||
                (window as any).webkitAudioContext;
            if (!AudioContextClass) return;

            if (!beepAudioContextRef.current || beepAudioContextRef.current.state === 'closed') {
                beepAudioContextRef.current = new AudioContextClass();
            }

            const ctx = beepAudioContextRef.current!;
            if (ctx.state === 'suspended') {
                await ctx.resume();
            }

            const now = ctx.currentTime;
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(960, now);
            gainNode.gain.setValueAtTime(0.0001, now);
            gainNode.gain.exponentialRampToValueAtTime(0.09, now + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            oscillator.start(now);
            oscillator.stop(now + 0.2);
        } catch {
            // Ignore beep failures
        }
    };

    useEffect(() => {
        if (screen !== 'cooking') {
            setIsRunning(false);
            setTimeRemaining(0);
            setAwaitingNextUnitConfirmation(false);
            setStirPromptVisible(false);
            setPendingStirAdvance(false);
            setStirPromptCountdown(0);
            return;
        }

        if (currentSubStep?.isTimer && typeof portionValue === 'number') {
            setTimeRemaining(portionValue);
            setIsRunning(true);
        } else if (currentStep?.stepNumber === 5) {
            const timerSubStep = currentStep.subSteps.find(sub => sub.isTimer);
            if (timerSubStep && currentSubStepIndex === 0) {
                const timerValue = timerSubStep.portions[portion];
                if (typeof timerValue === 'number') {
                    // For step 5, we only set it if it's currently 0 to avoid resets
                    if (timeRemaining === 0) {
                        setTimeRemaining(Math.round(timerValue * (timerScaleFactor || 1)));
                        setIsRunning(true);
                    }
                }
            } else {
                // If we are in step 5 but not sub-step 0, and current is not timer,
                // do NOT set to 0 to allow the previously started timer to continue
            }
        } else {
            setTimeRemaining(0);
            setIsRunning(false);
        }
    }, [screen, currentStepIndex, currentSubStepIndex, portion, currentSubStep, portionValue, timerScaleFactor]);

    useEffect(() => {
        let interval: ReturnType<typeof setTimeout>;

        if (screen === 'cooking' && isRunning && timeRemaining > 0) {
            interval = setInterval(() => {
                setTimeRemaining((prev: number) => {
                    const nextValue = Math.max(prev - 1, 0);
                    if (nextValue === 15) {
                        let nextSubStepObj = null;
                        if (currentSubStepIndex < (currentStep?.subSteps.length ?? 0) - 1) {
                            nextSubStepObj = currentStep?.subSteps[currentSubStepIndex + 1];
                        } else if (currentStepIndex < currentRecipeData.length - 1) {
                            nextSubStepObj = currentRecipeData[currentStepIndex + 1].subSteps[0];
                        }

                        if (nextSubStepObj) {
                            speakInstruction(`En 15 segundos: ${nextSubStepObj.subStepName}`, true);
                        }
                    }

                    if (nextValue <= 5) {
                        void playCountdownBeep();
                    }

                    if (prev <= 1) {
                        setIsRunning(false);
                        if (showFlipHint) {
                            setFlipPromptVisible(true);
                            setPendingFlipAdvance(true);
                            setFlipPromptCountdown(7);
                        } else if (showStirHint) {
                            setStirPromptVisible(true);
                            setPendingStirAdvance(true);
                            setStirPromptCountdown(currentSubStepText.includes('huevo') ? 7 : 5);
                        } else if (isAtLastSubStep && hasPendingLoopItems) {
                            setAwaitingNextUnitConfirmation(true);
                        } else {
                            setTimeout(() => {
                                handleNext();
                            }, 1000);
                        }
                        return 0;
                    }
                    return nextValue;
                });
            }, 1000);
        }

        return () => clearInterval(interval);
    }, [screen, isRunning, timeRemaining, showFlipHint, showStirHint, isAtLastSubStep, hasPendingLoopItems]);

    useEffect(() => {
        if (isRetirarSubStep) {
            setAwaitingNextUnitConfirmation(false);
        }
    }, [isRetirarSubStep]);

    useEffect(() => {
        if (!stirPromptVisible || !pendingStirAdvance) return;

        const durationMs = (currentSubStepText.includes('huevo') ? 7 : 5) * 1000;
        const timeout = setTimeout(() => {
            setStirPromptVisible(false);
            setPendingStirAdvance(false);
            setStirPromptCountdown(0);
            handleNext({ keepFlipPrompt: true });
        }, durationMs);

        return () => clearTimeout(timeout);
    }, [stirPromptVisible, pendingStirAdvance, currentSubStepText]);

    useEffect(() => {
        if (screen !== 'cooking' || !isAutoReminderSubStep) return;
        setStirPromptVisible(true);
        setPendingStirAdvance(true);
        setStirPromptCountdown(5);
    }, [screen, currentStepIndex, currentSubStepIndex, isAutoReminderSubStep]);

    useEffect(() => {
        if (!stirPromptVisible || stirPromptCountdown <= 0) return;

        const interval = setInterval(() => {
            setStirPromptCountdown((prev: any) => (typeof prev === 'number' && prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(interval);
    }, [stirPromptVisible, stirPromptCountdown]);

    useEffect(() => {
        if (!flipPromptVisible || !pendingFlipAdvance) return;

        const timeout = setTimeout(() => {
            setFlipPromptVisible(false);
            setPendingFlipAdvance(false);
            setFlipPromptCountdown(0);
            handleNext({ keepFlipPrompt: true });
        }, 7000);

        return () => clearTimeout(timeout);
    }, [flipPromptVisible, pendingFlipAdvance]);

    useEffect(() => {
        if (!flipPromptVisible || flipPromptCountdown <= 0) return;

        const interval = setInterval(() => {
            setFlipPromptCountdown((prev: any) => (typeof prev === 'number' && prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(interval);
    }, [flipPromptVisible, flipPromptCountdown]);

    return {
        playCountdownBeep,
    };
}
