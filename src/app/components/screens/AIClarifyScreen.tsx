import React from 'react';
import { ArrowLeft, Sparkles, ChevronRight, User, Scale, Box } from 'lucide-react';
import { AIClarificationQuestion } from '../../lib/recipeAI';
import { ClarificationNumberMode, ClarificationQuantityUnit } from '../../../types';

interface AIClarifyScreenProps {
    aiPrompt: string;
    questions: AIClarificationQuestion[];
    answers: Record<string, string | number>;
    numberModes: Record<string, ClarificationNumberMode>;
    quantityUnits: Record<string, ClarificationQuantityUnit>;
    onAnswerChange: (id: string, value: string | number) => void;
    onNumberModeChange: (id: string, mode: ClarificationNumberMode) => void;
    onQuantityUnitChange: (id: string, unit: ClarificationQuantityUnit) => void;
    onBack: () => void;
    onGenerate: () => void;
    isGenerating: boolean;
    resolveUnit: (question: AIClarificationQuestion) => string;
}

export const AIClarifyScreen: React.FC<AIClarifyScreenProps> = ({
    aiPrompt,
    questions,
    answers,
    numberModes,
    quantityUnits,
    onAnswerChange,
    onNumberModeChange,
    onQuantityUnitChange,
    onBack,
    onGenerate,
    isGenerating,
    resolveUnit,
}) => {
    return (
        <div className="flex flex-col h-full bg-slate-950 text-white font-sans overflow-hidden">
            {/* Header */}
            <div className="p-6 flex items-center gap-4 bg-slate-900/50 backdrop-blur-md border-b border-white/10 shrink-0">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        Personalizando tu idea
                    </h1>
                    <p className="text-sm text-slate-400 line-clamp-1 italic">
                        "{aiPrompt}"
                    </p>
                </div>
            </div>

            {/* Questions List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl flex gap-3 items-start animate-in fade-in slide-in-from-top-4 duration-500">
                    <Sparkles className="text-blue-400 shrink-0 mt-1" size={20} />
                    <p className="text-sm text-blue-100">
                        Para que la receta sea perfecta, la IA necesita precisar algunos detalles.
                    </p>
                </div>

                {questions.map((q, idx) => (
                    <div
                        key={q.id}
                        className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-500"
                        style={{ animationDelay: `${idx * 100}ms` }}
                    >
                        <label className="block text-lg font-medium text-slate-200">
                            {q.question}
                            {q.required && <span className="text-rose-500 ml-1">*</span>}
                        </label>

                        {q.type === 'number' && (
                            <div className="space-y-4">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => onNumberModeChange(q.id, 'people')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${numberModes[q.id] === 'people'
                                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40'
                                            : 'bg-slate-900 border-white/10 text-slate-400 hover:bg-white/5'
                                            }`}
                                    >
                                        <User size={18} />
                                        <span>Por personas</span>
                                    </button>
                                    <button
                                        onClick={() => onNumberModeChange(q.id, 'quantity')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${numberModes[q.id] === 'quantity'
                                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40'
                                            : 'bg-slate-900 border-white/10 text-slate-400 hover:bg-white/5'
                                            }`}
                                    >
                                        <Box size={18} />
                                        <span>Por cantidad</span>
                                    </button>
                                </div>

                                <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5 space-y-6">
                                    <div className="flex justify-between items-end">
                                        <span className="text-4xl font-black text-white">
                                            {answers[q.id]}
                                            <span className="text-xl font-medium text-slate-500 ml-2">
                                                {resolveUnit(q)}
                                            </span>
                                        </span>

                                        {numberModes[q.id] === 'quantity' && (
                                            <div className="flex bg-slate-800 rounded-lg p-1 text-xs">
                                                <button
                                                    onClick={() => onQuantityUnitChange(q.id, 'units')}
                                                    className={`px-3 py-1 rounded-md transition-colors ${quantityUnits[q.id] === 'units' ? 'bg-slate-600 text-white' : 'text-slate-400'
                                                        }`}
                                                >
                                                    unid
                                                </button>
                                                <button
                                                    onClick={() => onQuantityUnitChange(q.id, 'grams')}
                                                    className={`px-3 py-1 rounded-md transition-colors ${quantityUnits[q.id] === 'grams' ? 'bg-slate-600 text-white' : 'text-slate-400'
                                                        }`}
                                                >
                                                    gramos
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <input
                                        type="range"
                                        min={q.min ?? 1}
                                        max={q.max ?? 20}
                                        step={q.step ?? 1}
                                        value={answers[q.id] || (q.min ?? 1)}
                                        onChange={(e) => onAnswerChange(q.id, Number(e.target.value))}
                                        className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />

                                    <div className="flex justify-between text-xs text-slate-500 font-medium">
                                        <span>{q.min ?? 1} {resolveUnit(q)}</span>
                                        <span>{q.max ?? 20} {resolveUnit(q)}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {q.type === 'single_choice' && (
                            <div className="grid grid-cols-2 gap-3">
                                {q.options?.map((opt) => (
                                    <button
                                        key={opt}
                                        onClick={() => onAnswerChange(q.id, opt)}
                                        className={`p-4 rounded-2xl border text-sm font-semibold transition-all text-center ${answers[q.id] === opt
                                            ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/40'
                                            : 'bg-slate-900 border-white/10 text-slate-300 hover:bg-white/5 hover:border-white/20'
                                            }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        )}

                        {q.type === 'text' && (
                            <input
                                type="text"
                                value={answers[q.id] || ''}
                                onChange={(e) => onAnswerChange(q.id, e.target.value)}
                                placeholder="Escribe aquí..."
                                className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Footer Action */}
            <div className="p-6 bg-slate-900/80 backdrop-blur-xl border-t border-white/10 shrink-0">
                <button
                    onClick={onGenerate}
                    disabled={isGenerating}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-5 rounded-3xl shadow-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
                >
                    {isGenerating ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Generando receta...</span>
                        </>
                    ) : (
                        <>
                            <Sparkles size={22} className="text-yellow-300" />
                            <span>Generar Receta Mágica</span>
                            <ChevronRight size={20} />
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
