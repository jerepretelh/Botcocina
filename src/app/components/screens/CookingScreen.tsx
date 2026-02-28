import { useState } from 'react';
import { ChefHat, Volume2, VolumeX, List } from 'lucide-react';
import { RecipeStep, StepLoopState, RecipeContent, SubStep, Portion, Ingredient } from '../../../types';
import { RoadmapModal } from '../ui/RoadmapModal';

interface CookingScreenProps {
    appVersion: string;
    voiceEnabled: boolean;
    speechSupported: boolean;
    currentStepIndex: number;
    currentSubStepIndex: number;
    activeStepLoop: StepLoopState | null;
    isRunning: boolean;
    timeRemaining: number;
    flipPromptVisible: boolean;
    flipPromptCountdown: number;
    stirPromptVisible: boolean;
    stirPromptCountdown: number;
    awaitingNextUnitConfirmation: boolean;
    currentRecipeData: RecipeStep[];
    currentStep: RecipeStep | null;
    currentSubStep: SubStep | null;
    portion: Portion;
    portionValue: number | null;
    isRetirarSubStep: boolean;
    retirarTitle: string;
    retirarMessage: string;
    effectiveReminderTitle: string;
    effectiveReminderMessage: string;
    onVoiceToggle: () => void;
    onChangeMission: () => void;
    onPrevious: () => void;
    onNext: () => void;
    onTogglePause: () => void;
    onJumpToSubStep: (stepIndex: number, subStepIndex: number) => void;
    onContinue: () => void;
    onConfirmNextUnit: () => void;
    currentIngredients: Ingredient[];
    activeIngredientSelection: Record<string, boolean>;
    activeRecipeContent: RecipeContent;
}

export function CookingScreen({
    appVersion,
    voiceEnabled,
    speechSupported,
    currentStepIndex,
    currentSubStepIndex,
    activeStepLoop,
    isRunning,
    timeRemaining,
    flipPromptVisible,
    flipPromptCountdown,
    stirPromptVisible,
    stirPromptCountdown,
    awaitingNextUnitConfirmation,
    currentRecipeData,
    currentStep,
    currentSubStep,
    portion,
    portionValue,
    isRetirarSubStep,
    retirarTitle,
    retirarMessage,
    effectiveReminderTitle,
    effectiveReminderMessage,
    onVoiceToggle,
    onChangeMission,
    onPrevious,
    onNext,
    onTogglePause,
    onJumpToSubStep,
    onContinue,
    onConfirmNextUnit,
    currentIngredients,
    activeIngredientSelection,
    activeRecipeContent,
}: CookingScreenProps) {
    const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);

    // Restauramos las variables calculadas que antes eran props o se perdieron
    const isRecipeFinished = currentStepIndex === currentRecipeData.length - 1 &&
        currentSubStepIndex === (currentStep?.subSteps.length ?? 0) - 1;

    const isLoopingCurrentStep = Boolean(activeStepLoop && activeStepLoop.stepIndex === currentStepIndex);

    const getFireEmojis = (level?: 'low' | 'medium' | 'high') => {
        switch (level) {
            case 'high': return '🔥🔥🔥';
            case 'medium': return '🔥🔥';
            case 'low': return '🔥';
            default: return '';
        }
    };

    const isAutoReminderSubStep = Boolean((currentSubStep as any)?.isAutoReminder);

    const handleJump = (sIdx: number, ssIdx: number) => {
        onJumpToSubStep(sIdx, ssIdx);
        setIsRoadmapOpen(false);
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="w-full max-w-5xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 md:mb-8">
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg md:rounded-xl flex items-center justify-center">
                            <ChefHat className="w-5 h-5 md:w-6 md:h-6 text-white" />
                        </div>
                        <div className="flex items-end gap-2">
                            <h1 className="text-lg md:text-xl font-bold text-white">Chef Bot Pro</h1>
                            <span className="text-[11px] md:text-xs text-slate-400 mb-0.5">{appVersion}</span>
                        </div>
                    </div>
                    <div className="flex gap-2 md:gap-3">
                        <button
                            onClick={() => setIsRoadmapOpen(true)}
                            className="w-9 h-9 md:w-10 md:h-10 bg-slate-800 text-white rounded-lg md:rounded-xl flex items-center justify-center border border-slate-700 hover:border-orange-500 transition-colors"
                            title="Ver ruta de receta"
                        >
                            <List className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                        <button
                            onClick={onChangeMission}
                            className="px-3 py-2 md:px-4 md:py-2 bg-slate-800 text-white rounded-lg md:rounded-xl text-xs md:text-sm border border-slate-700 hover:border-orange-500 transition-colors"
                        >
                            Cambiar receta
                        </button>
                        <button
                            onClick={onVoiceToggle}
                            className={`w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center border transition-colors ${voiceEnabled ? 'bg-orange-900/40 border-orange-600' : 'bg-slate-800 border-slate-700'
                                }`}
                            title={speechSupported ? (voiceEnabled ? 'Desactivar voz' : 'Activar voz') : 'Tu navegador no soporta voz'}
                        >
                            {voiceEnabled ? (
                                <Volume2 className="w-4 h-4 md:w-5 md:h-5 text-white" />
                            ) : (
                                <VolumeX className="w-4 h-4 md:w-5 md:h-5 text-slate-300" />
                            )}
                        </button>
                    </div>
                </div>

                <div className="bg-gradient-to-b from-slate-900 to-black rounded-2xl md:rounded-3xl p-4 md:p-8 border border-slate-800">
                    {/* Status Badge */}
                    <div className="flex justify-center items-center mb-4 md:mb-6 relative">
                        <button
                            onClick={onPrevious}
                            disabled={currentSubStepIndex === 0 || stirPromptVisible}
                            className="absolute left-0 w-10 h-10 md:w-12 md:h-12 bg-slate-800 rounded-lg md:rounded-xl flex items-center justify-center border border-slate-700 hover:border-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div className="bg-gradient-to-r from-orange-900 to-orange-800 px-4 py-2 md:px-6 md:py-3 rounded-full border border-orange-700 flex items-center gap-1 md:gap-2">
                            <span className="text-base md:text-lg">🔥</span>
                            <span className="text-white font-semibold uppercase tracking-wide text-xs md:text-sm">
                                {currentStep?.stepName}
                            </span>
                        </div>
                        <button
                            onClick={onNext}
                            disabled={isRecipeFinished || stirPromptVisible}
                            className="absolute right-0 w-10 h-10 md:w-12 md:h-12 bg-slate-800 rounded-lg md:rounded-xl flex items-center justify-center border border-slate-700 hover:border-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>

                    {/* Step Counters */}
                    <div className="text-center mb-4 md:mb-8">
                        <p className="text-slate-500 uppercase tracking-wider text-xs md:text-sm">
                            Paso {currentStep?.stepNumber} de {currentRecipeData.length}
                        </p>
                        <p className="text-orange-300 text-xs md:text-sm mt-1">
                            Fuego: {currentStep?.fireLevel === 'low' ? 'bajo' : currentStep?.fireLevel === 'high' ? 'alto' : 'medio'} {getFireEmojis(currentStep?.fireLevel)}
                        </p>
                        {isLoopingCurrentStep && activeStepLoop && (
                            <p className="text-orange-400 text-xs md:text-sm font-semibold mt-1">
                                Pieza {activeStepLoop.currentItem} de {activeStepLoop.totalItems}
                            </p>
                        )}
                    </div>

                    {/* Main Content - Split Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8">
                        {/* Left Side - Instructions */}
                        <div className="flex flex-col justify-center order-2 lg:order-1">
                            <p className="text-slate-500 uppercase tracking-wider text-xs md:text-sm mb-2">
                                Sub-paso {currentSubStepIndex + 1} de {currentStep?.subSteps.length}
                            </p>
                            <h3 className="text-2xl md:text-3xl font-bold text-white mb-3 md:mb-4">
                                {isRetirarSubStep ? retirarTitle : currentSubStep?.subStepName}
                            </h3>
                            {(isRetirarSubStep || (currentSubStep?.notes && !currentSubStep.notes.startsWith('Cantidad'))) && (
                                <p className="text-lg md:text-xl text-slate-400 leading-relaxed">
                                    {isRetirarSubStep ? retirarMessage : currentSubStep?.notes}
                                </p>
                            )}
                        </div>

                        {/* Right Side - Timer or Quantity Display */}
                        <div className="flex items-center justify-center order-1 lg:order-2">
                            {(currentSubStep?.isTimer || currentStep?.stepNumber === 5) ? (
                                <div className="relative">
                                    <svg className="w-64 h-64 md:w-80 md:h-80 transform -rotate-90">
                                        <circle
                                            cx="128"
                                            cy="128"
                                            r="115"
                                            stroke="currentColor"
                                            strokeWidth="12"
                                            fill="none"
                                            className="text-slate-800 md:hidden"
                                        />
                                        <circle
                                            cx="128"
                                            cy="128"
                                            r="115"
                                            stroke="currentColor"
                                            strokeWidth="12"
                                            fill="none"
                                            strokeDasharray={`${2 * Math.PI * 115}`}
                                            strokeDashoffset={`${2 * Math.PI * 115 * (1 - ((portionValue as number) - timeRemaining) / (portionValue as number))
                                                }`}
                                            className={`${(currentStep as any)?.equipment === 'airfryer' ? 'text-amber-500' : (currentStep as any)?.equipment === 'oven' ? 'text-rose-500' : 'text-orange-500'} transition-all duration-1000 md:hidden`}
                                            strokeLinecap="round"
                                        />
                                        <circle
                                            cx="160"
                                            cy="160"
                                            r="145"
                                            stroke="currentColor"
                                            strokeWidth="14"
                                            fill="none"
                                            className="text-slate-800 hidden md:block"
                                        />
                                        <circle
                                            cx="160"
                                            cy="160"
                                            r="145"
                                            stroke="currentColor"
                                            strokeWidth="14"
                                            fill="none"
                                            strokeDasharray={`${2 * Math.PI * 145}`}
                                            strokeDashoffset={`${2 * Math.PI * 145 * (1 - ((portionValue as number) - timeRemaining) / (portionValue as number))
                                                }`}
                                            className={`${(currentStep as any)?.equipment === 'airfryer' ? 'text-amber-500' : (currentStep as any)?.equipment === 'oven' ? 'text-rose-500' : 'text-orange-500'} transition-all duration-1000 hidden md:block`}
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 md:gap-4">
                                        <span className="text-6xl md:text-8xl font-bold text-white tabular-nums">
                                            {timeRemaining}
                                        </span>
                                        <button
                                            onClick={onTogglePause}
                                            className="bg-slate-800 text-white px-4 py-2 md:px-6 md:py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-semibold border border-slate-700 hover:border-orange-500 transition-colors flex items-center gap-2"
                                        >
                                            <span className="text-base md:text-lg">{isRunning ? '⏸' : '▶'}</span>
                                            {isRunning ? 'Pausar' : 'Iniciar'}
                                        </button>
                                    </div>
                                </div>
                            ) : (portionValue as any) !== 'Continuar' ? (
                                <div className="bg-slate-800 rounded-2xl md:rounded-3xl p-12 md:p-16 border border-slate-700">
                                    <p className="text-5xl md:text-7xl font-bold text-orange-400 text-center">
                                        {portionValue}
                                    </p>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center">
                                    <div className="text-6xl md:text-8xl">👌</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Controls */}
                    {isRetirarSubStep && !isRecipeFinished && (
                        <div className="space-y-3 mb-4">
                            <button
                                onClick={onNext}
                                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 rounded-xl md:rounded-2xl font-bold text-lg md:text-xl shadow-lg hover:from-orange-600 hover:to-orange-700 transition-colors"
                            >
                                Listo
                            </button>
                        </div>
                    )}

                    {isRecipeFinished && (
                        <div className="space-y-3 mb-4">
                            <button
                                onClick={onChangeMission}
                                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-4 rounded-xl md:rounded-2xl font-bold text-lg md:text-xl shadow-lg hover:from-emerald-600 hover:to-emerald-700 transition-colors"
                            >
                                Finalizar
                            </button>
                        </div>
                    )}

                    {awaitingNextUnitConfirmation && (
                        <div className="space-y-3 mb-4">
                            <button
                                onClick={onConfirmNextUnit}
                                className="w-full bg-blue-600 text-white py-4 rounded-xl md:rounded-2xl font-bold text-lg md:text-xl shadow-lg hover:bg-blue-700 transition-colors"
                            >
                                Continuar con siguiente {activeRecipeContent.portionLabels.singular}
                            </button>
                        </div>
                    )}

                    {!currentSubStep?.isTimer && !isRetirarSubStep && !isAutoReminderSubStep && (
                        <div className="space-y-4">
                            <button
                                onClick={onNext}
                                disabled={isRecipeFinished || awaitingNextUnitConfirmation || isRetirarSubStep}
                                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-5 md:py-6 rounded-xl md:rounded-2xl font-bold text-xl md:text-2xl shadow-lg hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                ¡Listo!
                            </button>
                        </div>
                    )}

                    {/* Next Step Preview */}
                    {!isRecipeFinished && (
                        <div className="mt-8 pt-6 border-t border-slate-800/50">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-pulse"></span>
                                <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">Próximo paso</p>
                            </div>
                            <div className="bg-slate-900/40 rounded-2xl p-4 border border-slate-800/50 group hover:border-orange-500/30 transition-colors">
                                {(() => {
                                    let nextStepObj = null;
                                    let nextSubStepObj = null;

                                    if (currentSubStepIndex < (currentStep?.subSteps.length ?? 0) - 1) {
                                        nextStepObj = currentStep;
                                        nextSubStepObj = currentStep?.subSteps[currentSubStepIndex + 1];
                                    } else if (currentStepIndex < currentRecipeData.length - 1) {
                                        nextStepObj = currentRecipeData[currentStepIndex + 1];
                                        nextSubStepObj = nextStepObj.subSteps[0];
                                    }

                                    if (!nextSubStepObj) return <p className="text-slate-600 italic text-sm">Fin de la receta</p>;

                                    return (
                                        <div className="flex items-start gap-4">
                                            <div className="flex-1">
                                                <p className="text-white font-bold text-sm md:text-base group-hover:text-orange-300 transition-colors">
                                                    {nextSubStepObj.subStepName}
                                                </p>
                                                <p className="text-slate-500 text-xs md:text-sm mt-1 line-clamp-1">
                                                    {nextSubStepObj.notes}
                                                </p>
                                            </div>
                                            {nextSubStepObj.isTimer && (
                                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-950/30 border border-orange-500/20 rounded-lg">
                                                    <span className="text-orange-400 text-xs font-bold">⏱️</span>
                                                    <span className="text-orange-400 text-xs font-black">
                                                        {nextSubStepObj.portions[portion] as string}s
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {flipPromptVisible && (
                <div className="fixed inset-0 z-40 bg-orange-500 flex items-center justify-center pointer-events-none">
                    <div className="text-center text-white px-6">
                        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-orange-400/40 flex items-center justify-center text-4xl">
                            ⏱️
                        </div>
                        <h3 className="text-5xl md:text-6xl font-bold mb-4">Voltea el huevo</h3>
                        <p className="text-2xl md:text-3xl">Da la vuelta ahora y continúa con el lado B.</p>
                        <p className="mt-6 text-4xl md:text-5xl font-bold tabular-nums">{flipPromptCountdown}s</p>
                    </div>
                </div>
            )}

            {stirPromptVisible && (
                <div className="fixed inset-0 z-30 bg-blue-600/95 flex items-center justify-center pointer-events-none">
                    <div className="text-center text-white px-6 max-w-2xl">
                        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-blue-400/30 flex items-center justify-center text-4xl">
                            🍟
                        </div>
                        <h3 className="text-4xl md:text-5xl font-bold mb-4">{effectiveReminderTitle}</h3>
                        <p className="text-xl md:text-2xl text-blue-100">{effectiveReminderMessage}</p>
                        <p className="mt-6 text-4xl md:text-5xl font-bold tabular-nums">{stirPromptCountdown}s</p>
                    </div>
                </div>
            )}

            <RoadmapModal
                isOpen={isRoadmapOpen}
                onClose={() => setIsRoadmapOpen(false)}
                title="Hoja de Ruta"
                steps={currentRecipeData}
                currentStepIndex={currentStepIndex}
                currentSubStepIndex={currentSubStepIndex}
                onJumpToSubStep={handleJump}
                portion={portion}
            />
        </div>
    );
}
