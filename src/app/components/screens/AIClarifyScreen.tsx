import React, { useMemo, useState } from 'react';
import { ArrowLeft, LoaderCircle, Minus, Plus, Sparkles, WandSparkles, X } from 'lucide-react';
import { AIRecipeContextDraft, AIWizardStep, ClarificationNumberMode, ClarificationQuantityUnit, RecipeSeed } from '../../../types';
import { AIClarificationQuestion } from '../../lib/recipeAI';

interface AIClarifyScreenProps {
    contextDraft: AIRecipeContextDraft;
    wizardStep: AIWizardStep;
    questions: AIClarificationQuestion[];
    answers: Record<string, string | number>;
    numberModes: Record<string, ClarificationNumberMode>;
    quantityUnits: Record<string, ClarificationQuantityUnit>;
    selectedSeed: RecipeSeed | null;
    suggestedTitle: string | null;
    tip: string | null;
    aiError: string | null;
    isCheckingClarifications: boolean;
    isGenerating: boolean;
    isMockModeEnabled: boolean;
    onContextPromptChange: (value: string) => void;
    onContextServingsChange: (value: number | null) => void;
    onAddAvailableIngredient: (value: string) => void;
    onRemoveAvailableIngredient: (id: string) => void;
    onAddAvoidIngredient: (value: string) => void;
    onRemoveAvoidIngredient: (id: string) => void;
    onAnswerChange: (id: string, value: string | number) => void;
    onNumberModeChange: (id: string, mode: ClarificationNumberMode) => void;
    onQuantityUnitChange: (id: string, unit: ClarificationQuantityUnit) => void;
    onBack: () => void;
    onContinue: () => void;
    onGenerate: () => void;
    onLoadMockExample: () => void;
    onSkipToMockRefinement: () => void;
    onGenerateMockRecipe: () => void;
    resolveUnit: (question: AIClarificationQuestion) => string;
}

function StepDots({ currentStep }: { currentStep: 1 | 2 | 3 }) {
    return (
        <div className="flex w-full flex-row items-center justify-center gap-3 py-3">
            {[1, 2, 3].map((step) => (
                <div
                    key={step}
                    className={`rounded-full transition-all ${step === currentStep ? 'h-2.5 w-10 bg-primary' : step < currentStep ? 'h-2.5 w-6 bg-primary/35' : 'h-2.5 w-2.5 bg-primary/20'}`}
                />
            ))}
        </div>
    );
}

function IngredientSection({
    title,
    emoji,
    placeholder,
    actionLabel,
    tokens,
    onAdd,
    onRemove,
}: {
    title: string;
    emoji: string;
    placeholder: string;
    actionLabel: string;
    tokens: AIRecipeContextDraft['availableIngredients'];
    onAdd: (value: string) => void;
    onRemove: (id: string) => void;
}) {
    const [draft, setDraft] = useState('');

    const submitDraft = () => {
        if (!draft.trim()) return;
        onAdd(draft);
        setDraft('');
    };

    return (
        <section className="rounded-3xl border-2 border-primary/10 bg-white/85 p-5 shadow-sm dark:bg-primary/5">
            <div className="flex items-center gap-2">
                <span className="text-xl">{emoji}</span>
                <h3 className="font-bold">{title}</h3>
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Opcional</span>
            </div>

            {tokens.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                    {tokens.map((token) => (
                        <button
                            key={token.id}
                            type="button"
                            onClick={() => onRemove(token.id)}
                            className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/25"
                        >
                            <span>{token.value}</span>
                            <X className="size-3.5" />
                        </button>
                    ))}
                </div>
            )}

            <div className="mt-4 flex gap-2">
                <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            submitDraft();
                        }
                    }}
                    placeholder={placeholder}
                    className="min-w-0 flex-1 rounded-2xl border border-primary/10 bg-background/90 px-4 py-3 text-sm outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
                <button
                    type="button"
                    onClick={submitDraft}
                    className="shrink-0 rounded-2xl border-2 border-dashed border-primary/30 px-4 py-3 text-sm font-bold text-primary transition-colors hover:bg-primary/5"
                >
                    {actionLabel}
                </button>
            </div>
        </section>
    );
}

export const AIClarifyScreen: React.FC<AIClarifyScreenProps> = ({
    contextDraft,
    wizardStep,
    questions,
    answers,
    numberModes,
    quantityUnits,
    selectedSeed,
    suggestedTitle,
    tip,
    aiError,
    isCheckingClarifications,
    isGenerating,
    isMockModeEnabled,
    onContextPromptChange,
    onContextServingsChange,
    onAddAvailableIngredient,
    onRemoveAvailableIngredient,
    onAddAvoidIngredient,
    onRemoveAvoidIngredient,
    onAnswerChange,
    onNumberModeChange,
    onQuantityUnitChange,
    onBack,
    onContinue,
    onGenerate,
    onLoadMockExample,
    onSkipToMockRefinement,
    onGenerateMockRecipe,
    resolveUnit,
}) => {
    const displayStep: 1 | 2 | 3 = useMemo(() => {
        if (wizardStep === 'refinement') return 2;
        if (wizardStep === 'generating') return 3;
        return 1;
    }, [wizardStep]);
    const [isServingsEnabled, setIsServingsEnabled] = useState(Boolean(contextDraft.servings));
    const servingsValue = contextDraft.servings ?? 2;

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="sticky top-0 z-20 border-b border-primary/10 bg-background/85 backdrop-blur-md">
                <div className="mx-auto flex max-w-md items-center justify-between px-4 py-4">
                    <button
                        onClick={onBack}
                        className="flex size-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-primary/10"
                    >
                        <ArrowLeft className="size-5" />
                    </button>
                    <div className="flex flex-col items-center">
                        <span className="text-xs font-bold uppercase tracking-[0.28em] text-primary">
                            Paso {displayStep} de 3
                        </span>
                        <h2 className="text-sm font-bold">
                            {displayStep === 1 ? 'Contexto' : displayStep === 2 ? 'Refinamiento' : 'Generando'}
                        </h2>
                    </div>
                    <div className="size-10" />
                </div>
                <div className="mx-auto max-w-md border-t border-primary/5 px-4">
                    <StepDots currentStep={displayStep} />
                </div>
            </header>

            <main className="mx-auto max-w-md px-4 pb-32 pt-5">
                {wizardStep === 'context' && (
                    <div className="space-y-6">
                        <section>
                            <h1 className="text-3xl font-extrabold leading-tight">🥣 ¡Vamos a cocinar!</h1>
                            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                                Cuéntanos qué quieres resolver con la IA. Puedes añadir comensales o ingredientes si te ayuda a orientar mejor la receta.
                            </p>
                        </section>

                        {selectedSeed && (
                            <section className="rounded-[1.5rem] border border-primary/20 bg-primary/10 p-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">🍽️</span>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Receta base seleccionada</p>
                                        <h3 className="text-lg font-bold">{selectedSeed.name}</h3>
                                    </div>
                                </div>
                                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                                    La búsqueda ya dejó precargada esta idea. Ajusta el contexto si quieres y continúa con la generación guiada.
                                </p>
                            </section>
                        )}

                        <section>
                            <div className="mb-3 flex items-center gap-2">
                                <span className="text-xl">💡</span>
                                <label className="text-lg font-bold">¿Qué vamos a cocinar hoy?</label>
                            </div>
                            <textarea
                                value={contextDraft.prompt}
                                onChange={(event) => onContextPromptChange(event.target.value)}
                                placeholder="Describe tu idea... Ej: una cena rápida con pollo, pasta cremosa para 3 personas o un almuerzo con lo que tengo en la refri."
                                className="min-h-[160px] w-full rounded-[1.5rem] border-2 border-primary/20 bg-white p-4 text-base text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 dark:bg-primary/5 dark:text-slate-100 dark:placeholder:text-slate-500"
                            />
                        </section>

                        {isMockModeEnabled && (
                            <section className="rounded-3xl border border-dashed border-primary/30 bg-primary/5 p-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">🧪</span>
                                    <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Pruebas sin consumo</h3>
                                </div>
                                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                                    Puedes cargar un ejemplo local o saltar directamente al refinamiento mock. También funciona escribiendo palabras como “milanesa”.
                                </p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={onLoadMockExample}
                                        className="rounded-full border border-primary/25 bg-white px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary/10 dark:bg-background"
                                    >
                                        Cargar ejemplo Milanesa
                                    </button>
                                    <button
                                        type="button"
                                        onClick={onSkipToMockRefinement}
                                        className="rounded-full border border-primary/25 bg-white px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary/10 dark:bg-background"
                                    >
                                        Saltar a refinamiento
                                    </button>
                                </div>
                            </section>
                        )}

                        <section className="rounded-3xl border border-primary/20 bg-primary/5 p-5">
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">👥</span>
                                    <h3 className="text-lg font-bold">¿Para cuántas personas?</h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (isServingsEnabled) {
                                            setIsServingsEnabled(false);
                                            onContextServingsChange(null);
                                        } else {
                                            setIsServingsEnabled(true);
                                            onContextServingsChange(2);
                                        }
                                    }}
                                    className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] transition-colors ${isServingsEnabled ? 'bg-primary text-primary-foreground' : 'bg-white text-slate-500 dark:bg-background dark:text-slate-300'}`}
                                >
                                    {isServingsEnabled ? 'Omitir' : 'Usar'}
                                </button>
                            </div>

                            <div className={`flex items-center justify-between rounded-[1.5rem] border border-primary/20 bg-white px-4 py-4 shadow-sm transition-opacity dark:bg-background ${isServingsEnabled ? 'opacity-100' : 'opacity-55'}`}>
                                <button
                                    type="button"
                                    disabled={!isServingsEnabled}
                                    onClick={() => onContextServingsChange(Math.max(1, servingsValue - 1))}
                                    className="flex size-14 items-center justify-center rounded-full border-2 border-primary/30 bg-white text-primary transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-background"
                                >
                                    <Minus className="size-6" />
                                </button>
                                <div className="flex flex-col items-center">
                                    <span className="text-4xl font-black text-primary">{servingsValue}</span>
                                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Comensales</span>
                                </div>
                                <button
                                    type="button"
                                    disabled={!isServingsEnabled}
                                    onClick={() => onContextServingsChange(Math.min(20, servingsValue + 1))}
                                    className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <Plus className="size-6" />
                                </button>
                            </div>
                        </section>

                        <div className="grid gap-4">
                            <IngredientSection
                                title="Ingredientes que tengo"
                                emoji="🛒"
                                placeholder="Añade un ingrediente que ya tienes"
                                actionLabel="Añadir"
                                tokens={contextDraft.availableIngredients}
                                onAdd={onAddAvailableIngredient}
                                onRemove={onRemoveAvailableIngredient}
                            />
                            <IngredientSection
                                title="Evitar ingredientes"
                                emoji="🚫"
                                placeholder="Alergias, disgustos o restricciones"
                                actionLabel="Evitar"
                                tokens={contextDraft.avoidIngredients}
                                onAdd={onAddAvoidIngredient}
                                onRemove={onRemoveAvoidIngredient}
                            />
                        </div>
                    </div>
                )}

                {wizardStep !== 'context' && (
                    <div className="space-y-6">
                        {suggestedTitle && (
                            <div className="flex items-center gap-3 rounded-[1.5rem] border border-primary/20 bg-primary/10 p-4">
                                <span className="text-2xl">🍽️</span>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Dirección sugerida</p>
                                    <h3 className="text-lg font-bold">{suggestedTitle}</h3>
                                </div>
                            </div>
                        )}

                        {wizardStep === 'generating' ? (
                            <div className="flex min-h-[55vh] flex-col items-center justify-center text-center">
                                <div className="rounded-full bg-primary/15 p-5 text-primary">
                                    <LoaderCircle className="size-10 animate-spin" />
                                </div>
                                <h1 className="mt-6 text-3xl font-extrabold">Empezando tu receta</h1>
                                <p className="mt-3 max-w-sm text-sm leading-6 text-slate-600 dark:text-slate-400">
                                    La IA está terminando de combinar tu idea inicial, los ingredientes y las preferencias de refinamiento para abrir la cocción guiada.
                                </p>
                            </div>
                        ) : (
                            <>
                                {aiError ? (
                                    <div className="rounded-[1.5rem] border border-red-200 bg-red-50/90 p-4 dark:border-red-500/20 dark:bg-red-500/10">
                                        <p className="text-sm font-bold text-red-600 dark:text-red-400">No se completó la generación</p>
                                        <p className="mt-1 text-sm leading-6 text-red-600/90 dark:text-red-300">{aiError}</p>
                                    </div>
                                ) : null}

                                <section>
                                    <h1 className="text-3xl font-extrabold leading-tight">✨ Afinemos la receta</h1>
                                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                                        La IA necesita confirmar algunos detalles para generar una receta más precisa y útil para tu cocina. Si algo falla, tus respuestas quedarán listas para reintentar.
                                    </p>
                                </section>

                                <div className="space-y-4">
                                    {questions.map((question, index) => (
                                        <section key={question.id} className="space-y-4">
                                            <div className="flex items-center gap-2">
                                                <span className="rounded-md bg-primary/20 px-2 py-1 text-sm font-bold text-primary">
                                                    {String(index + 1).padStart(2, '0')}
                                                </span>
                                                <h4 className="text-lg font-bold">{question.question}</h4>
                                            </div>

                                            {question.type === 'single_choice' && (
                                                <div className="grid grid-cols-1 gap-3">
                                                    {question.options?.map((option) => {
                                                        const selected = answers[question.id] === option;
                                                        return (
                                                            <button
                                                                key={option}
                                                                type="button"
                                                                onClick={() => onAnswerChange(question.id, option)}
                                                                className={`flex items-center gap-4 rounded-[1.25rem] border-2 p-4 text-left transition-all ${selected ? 'border-primary bg-primary/8' : 'border-primary/10 bg-white/70 hover:border-primary/35 dark:bg-white/5'}`}
                                                            >
                                                                <div className={`flex size-6 items-center justify-center rounded-full border-2 ${selected ? 'border-primary bg-primary' : 'border-primary/30'}`}>
                                                                    <div className="size-2 rounded-full bg-white" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="font-bold">{option}</p>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {question.type === 'number' && (
                                                <div className="space-y-4 rounded-[1.5rem] border border-primary/20 bg-primary/5 p-4">
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => onNumberModeChange(question.id, 'people')}
                                                            className={`flex-1 rounded-full px-4 py-2 text-sm font-bold transition-colors ${numberModes[question.id] === 'people' ? 'bg-primary text-primary-foreground' : 'bg-white text-slate-600 dark:bg-background dark:text-slate-300'}`}
                                                        >
                                                            Por personas
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => onNumberModeChange(question.id, 'quantity')}
                                                            className={`flex-1 rounded-full px-4 py-2 text-sm font-bold transition-colors ${numberModes[question.id] === 'quantity' ? 'bg-primary text-primary-foreground' : 'bg-white text-slate-600 dark:bg-background dark:text-slate-300'}`}
                                                        >
                                                            Por cantidad
                                                        </button>
                                                    </div>

                                                    <div className="flex items-center justify-between rounded-[1.25rem] bg-white px-4 py-4 dark:bg-background">
                                                        <button
                                                            type="button"
                                                            onClick={() => onAnswerChange(question.id, Math.max(question.min ?? 1, Number(answers[question.id] ?? question.min ?? 1) - (question.step ?? 1)))}
                                                            className="flex size-12 items-center justify-center rounded-full border border-primary/30 text-primary"
                                                        >
                                                            <Minus className="size-5" />
                                                        </button>
                                                        <div className="text-center">
                                                            <div className="text-4xl font-black text-primary">{answers[question.id]}</div>
                                                            <div className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{resolveUnit(question)}</div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => onAnswerChange(question.id, Math.min(question.max ?? 20, Number(answers[question.id] ?? question.min ?? 1) + (question.step ?? 1)))}
                                                            className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground"
                                                        >
                                                            <Plus className="size-5" />
                                                        </button>
                                                    </div>

                                                    {numberModes[question.id] === 'quantity' && (
                                                        <div className="flex justify-center">
                                                            <div className="inline-flex rounded-full bg-white p-1 dark:bg-background">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => onQuantityUnitChange(question.id, 'units')}
                                                                    className={`rounded-full px-3 py-1 text-xs font-bold ${quantityUnits[question.id] === 'units' ? 'bg-primary text-primary-foreground' : 'text-slate-500'}`}
                                                                >
                                                                    unid
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => onQuantityUnitChange(question.id, 'grams')}
                                                                    className={`rounded-full px-3 py-1 text-xs font-bold ${quantityUnits[question.id] === 'grams' ? 'bg-primary text-primary-foreground' : 'text-slate-500'}`}
                                                                >
                                                                    gramos
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {question.type === 'text' && (
                                                <div className="relative">
                                                    <textarea
                                                        value={String(answers[question.id] ?? '')}
                                                        onChange={(event) => onAnswerChange(question.id, event.target.value)}
                                                        rows={3}
                                                        placeholder="Escribe aquí tu preferencia..."
                                                        className="w-full rounded-[1.5rem] border-2 border-primary/10 bg-white/70 p-4 outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 dark:bg-white/5"
                                                    />
                                                    <span className="pointer-events-none absolute bottom-3 right-3 text-xl">✨</span>
                                                </div>
                                            )}
                                        </section>
                                    ))}
                                </div>

                                {tip && (
                                    <div className="flex gap-4 rounded-[1.5rem] border border-primary/20 bg-gradient-to-br from-primary/20 to-transparent p-4">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                                            <WandSparkles className="size-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold">Tip de la IA</p>
                                            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{tip}</p>
                                        </div>
                                    </div>
                                )}

                                {isMockModeEnabled && (
                                    <div className="rounded-[1.5rem] border border-dashed border-primary/30 bg-primary/5 p-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">🧪</span>
                                            <p className="text-sm font-bold text-primary">Modo de pruebas</p>
                                        </div>
                                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                                            Si quieres evitar llamadas reales a la IA, puedes generar la receta mock directamente.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={onGenerateMockRecipe}
                                            className="mt-3 rounded-full border border-primary/25 bg-white px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary/10 dark:bg-background"
                                        >
                                            Generar receta mock
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {aiError && wizardStep === 'context' && (
                    <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                        {aiError}
                    </div>
                )}
            </main>

            <div className="fixed inset-x-0 bottom-0 border-t border-primary/10 bg-gradient-to-t from-background via-background to-transparent p-4 backdrop-blur-xl">
                <div className="mx-auto max-w-md">
                    {wizardStep === 'context' ? (
                        <button
                            onClick={onContinue}
                            disabled={isCheckingClarifications || isGenerating}
                            className="flex w-full items-center justify-center gap-2 rounded-[1.25rem] bg-primary py-4 text-lg font-bold text-primary-foreground shadow-xl shadow-primary/20 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isCheckingClarifications ? (
                                <>
                                    <LoaderCircle className="size-5 animate-spin" />
                                    Consultando a la IA...
                                </>
                            ) : (
                                <>
                                    Continuar
                                    <Sparkles className="size-5" />
                                </>
                            )}
                        </button>
                    ) : (
                        <button
                            onClick={onGenerate}
                            disabled={isCheckingClarifications || isGenerating || wizardStep === 'generating'}
                            className="flex w-full items-center justify-center gap-2 rounded-[1.25rem] bg-primary py-4 text-lg font-bold text-primary-foreground shadow-xl shadow-primary/20 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isGenerating || wizardStep === 'generating' ? (
                                <>
                                    <LoaderCircle className="size-5 animate-spin" />
                                    Empezando receta...
                                </>
                            ) : (
                                <>
                                    Empezar receta
                                    <Sparkles className="size-5" />
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
