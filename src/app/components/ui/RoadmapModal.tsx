import React from 'react';
import { RecipeStep, Portion } from '../../../types';

interface RoadmapModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    steps: RecipeStep[];
    currentStepIndex?: number;
    currentSubStepIndex?: number;
    onJumpToSubStep?: (sIdx: number, ssIdx: number) => void;
    portion: Portion;
}

export function RoadmapModal({
    isOpen,
    onClose,
    title = 'Ruta de Cocción',
    steps,
    currentStepIndex = -1,
    currentSubStepIndex = -1,
    onJumpToSubStep,
    portion
}: RoadmapModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl max-h-[80vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-white">{title}</h2>
                        <p className="text-slate-400 text-sm">Previsualiza los pasos de tu receta</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors"
                    >
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    {steps.map((step, sIdx) => {
                        const isPastStep = sIdx < currentStepIndex;
                        const isCurrentStep = sIdx === currentStepIndex;

                        return (
                            <div key={sIdx} className="relative pl-8">
                                {/* Step Number Indicator */}
                                <div
                                    className={`absolute left-0 top-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold z-10 transition-colors ${isPastStep
                                        ? 'bg-emerald-500 text-white'
                                        : isCurrentStep
                                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/40'
                                            : 'bg-slate-700 text-slate-400'
                                        }`}
                                >
                                    {isPastStep ? '✓' : sIdx + 1}
                                </div>

                                {/* Connecting Line */}
                                {sIdx < steps.length - 1 && (
                                    <div
                                        className={`absolute left-[11px] top-6 w-0.5 h-full -mb-8 transition-colors ${isPastStep ? 'bg-emerald-500/30' : 'bg-slate-800'
                                            }`}
                                    />
                                )}

                                <div className="mb-2">
                                    <h3
                                        className={`font-bold transition-colors ${isCurrentStep ? 'text-orange-400' : 'text-slate-200'
                                            }`}
                                    >
                                        {step.stepName}
                                    </h3>
                                    {(step.fireLevel || step.temperature) && (
                                        <div className="flex gap-2 mt-1">
                                            {step.fireLevel && (
                                                <span className="text-[10px] bg-red-900/20 text-red-400 border border-red-900/50 px-2 py-0.5 rounded-full">
                                                    🔥 Fuego {step.fireLevel}
                                                </span>
                                            )}
                                            {step.temperature && (
                                                <span className="text-[10px] bg-amber-900/20 text-amber-400 border border-amber-900/50 px-2 py-0.5 rounded-full">
                                                    🌡️ {step.temperature}°C
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    {step.subSteps.map((sub, ssIdx) => {
                                        const isPastSubStep = isPastStep || (isCurrentStep && ssIdx < currentSubStepIndex);
                                        const isCurrentSubStep = isCurrentStep && ssIdx === currentSubStepIndex;
                                        const canJump = onJumpToSubStep && !isCurrentSubStep;

                                        return (
                                            <button
                                                key={ssIdx}
                                                disabled={!canJump}
                                                onClick={() => onJumpToSubStep?.(sIdx, ssIdx)}
                                                className={`w-full text-left p-3 rounded-xl border transition-all ${isCurrentSubStep
                                                    ? 'bg-orange-500/10 border-orange-500/50 shadow-inner shadow-orange-500/5'
                                                    : canJump
                                                        ? 'bg-slate-800/50 border-transparent hover:border-slate-600 hover:bg-slate-800'
                                                        : 'bg-slate-800/30 border-transparent'
                                                    }`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <p
                                                                className={`text-sm font-medium transition-colors ${isCurrentSubStep ? 'text-orange-200' : 'text-slate-300'
                                                                    }`}
                                                            >
                                                                {sub.subStepName}
                                                            </p>
                                                            {isPastSubStep && (
                                                                <span className="text-emerald-500 text-xs">✓</span>
                                                            )}
                                                        </div>
                                                        {sub.notes && (
                                                            <p className="text-[11px] text-slate-500 mt-0.5">
                                                                {sub.notes}
                                                            </p>
                                                        )}
                                                    </div>
                                                    {sub.isTimer && (
                                                        <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full flex items-center gap-1 border border-slate-700">
                                                            ⏱️ {sub.portions[portion] || sub.portions[1]}s
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-900/80 border-t border-slate-800 flex justify-center">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-500 transition-colors shadow-lg shadow-orange-900/20"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
}
