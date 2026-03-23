import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Bot, ImagePlus, LoaderCircle, MessageSquarePlus, Plus, SendHorizontal, Sparkles, WandSparkles, X, Sparkle } from 'lucide-react';
import type { AIRecipeContextDraft, AIWizardStep, RecipeSeed } from '../../../types';
import type { AIPreRecipe, AIPreviewMessage } from '../../lib/recipeAI';

interface AIClarifyScreenProps {
    contextDraft: AIRecipeContextDraft;
    wizardStep: AIWizardStep;
    preRecipe: AIPreRecipe | null;
    previewMessages: AIPreviewMessage[];
    previewDraftMessage: string;
    selectedSeed: RecipeSeed | null;
    suggestedTitle: string | null;
    tip: string | null;
    aiError: string | null;
    isGeneratingPreview: boolean;
    isGenerating: boolean;
    isMockModeEnabled: boolean;
    onContextPromptChange: (value: string) => void;
    onContextServingsChange: (value: number | null) => void;
    onAddAvailableIngredient: (value: string) => void;
    onRemoveAvailableIngredient: (id: string) => void;
    onAddAvoidIngredient: (value: string) => void;
    onRemoveAvoidIngredient: (id: string) => void;
    onPreviewDraftMessageChange: (value: string) => void;
    onBack: () => void;
    onContinue: () => void;
    onUpdatePreRecipe: () => void;
    onGenerate: () => void;
    onLoadMockExample: () => void;
    onSkipToMockPreview: () => void;
    onGenerateMockRecipe: () => void;
}

function ChatBubble({
    role,
    children,
}: {
    role: 'user' | 'assistant';
    children: React.ReactNode;
}) {
    const isAssistant = role === 'assistant';

    return (
        <div className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}>
            <div
                className={`max-w-[88%] rounded-[1.6rem] px-4 py-3 shadow-sm ${
                    isAssistant
                        ? 'rounded-tl-[0.4rem] border border-primary/10 bg-white text-slate-800 dark:bg-primary/5 dark:text-slate-100'
                        : 'rounded-tr-[0.4rem] bg-primary text-primary-foreground'
                }`}
            >
                {children}
            </div>
        </div>
    );
}

function ChatShell({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <motion.section 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[2rem] border border-white/20 bg-white/60 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl dark:border-white/5 dark:bg-black/40 md:p-6"
        >
            {children}
        </motion.section>
    );
}

function isSectionHeading(line: string): boolean {
    return /ingredientes|claves importantes|nota del chef|tips/i.test(line);
}

function isPhaseHeading(line: string): boolean {
    return /fase\s+\d+/i.test(line);
}

function isLikelySubheading(line: string): boolean {
    if (isSectionHeading(line) || isPhaseHeading(line)) return false;
    if (line.length > 42) return false;
    if (/[.!?]/.test(line)) return false;
    return /^[\p{L}\p{N}🍚🥣🥩🍌🍹🍛🧁🌿⚡🔥🔄🛒]+/u.test(line);
}

function isBulletLike(line: string): boolean {
    return /^(\d+\.\s|[-*•]\s|👉\s|❌\s|🔥\s|🔄\s|⚡\s|🍽️\s|⏱️\s)/u.test(line);
}

function renderLooseLines(lines: string[], keyPrefix: string) {
    const items: React.ReactNode[] = [];
    let index = 0;

    while (index < lines.length) {
        const line = lines[index];

        if (isLikelySubheading(line)) {
            const nested: string[] = [];
            let nestedIndex = index + 1;
            while (
                nestedIndex < lines.length &&
                !isLikelySubheading(lines[nestedIndex]) &&
                !isBulletLike(lines[nestedIndex]) &&
                !isPhaseHeading(lines[nestedIndex]) &&
                !isSectionHeading(lines[nestedIndex])
            ) {
                nested.push(lines[nestedIndex]);
                nestedIndex += 1;
            }

            items.push(
                <div key={`${keyPrefix}-sub-${index}`} className="pt-3 first:pt-0">
                    <h3 className="text-[1.35rem] font-semibold leading-tight text-[#171717] md:text-[1.5rem]">
                        {line}
                    </h3>
                    {nested.length > 0 ? (
                        <ul className="mt-3 space-y-2 pl-6 text-[1.16rem] leading-[1.8] text-[#2d2d2d] marker:text-[#8c8c8c] md:text-[1.24rem]">
                            {nested.map((nestedLine, nestedLineIndex) => (
                                <li key={`${keyPrefix}-sub-${index}-${nestedLineIndex}`}>{nestedLine}</li>
                            ))}
                        </ul>
                    ) : null}
                </div>,
            );
            index = nestedIndex;
            continue;
        }

        if (isBulletLike(line)) {
            const bulletLines: string[] = [];
            let nestedIndex = index;
            while (nestedIndex < lines.length && isBulletLike(lines[nestedIndex])) {
                bulletLines.push(lines[nestedIndex]);
                nestedIndex += 1;
            }

            const isOrdered = /^\d+\.\s/.test(bulletLines[0] ?? '');
            if (isOrdered) {
                items.push(
                    <ol
                        key={`${keyPrefix}-ol-${index}`}
                        className="space-y-2.5 pl-8 text-[1.16rem] font-medium leading-[1.8] text-[#202020] marker:font-semibold md:text-[1.24rem]"
                    >
                        {bulletLines.map((bulletLine, bulletIndex) => (
                            <li key={`${keyPrefix}-ol-${index}-${bulletIndex}`}>
                                {bulletLine.replace(/^\d+\.\s/, '')}
                            </li>
                        ))}
                    </ol>,
                );
            } else {
                items.push(
                    <ul
                        key={`${keyPrefix}-ul-${index}`}
                        className="space-y-2.5 text-[1.16rem] leading-[1.8] text-[#202020] md:text-[1.24rem]"
                    >
                        {bulletLines.map((bulletLine, bulletIndex) => (
                            <li key={`${keyPrefix}-ul-${index}-${bulletIndex}`} className="flex gap-3">
                                <span className="mt-[0.15rem] shrink-0 text-[1.05rem] text-[#7a7a7a]">
                                    {bulletLine.match(/^(\d+\.\s|[-*•]\s|👉\s|❌\s|🔥\s|🔄\s|⚡\s|🍽️\s|⏱️\s)/u)?.[0].trim()}
                                </span>
                                <span>{bulletLine.replace(/^(\d+\.\s|[-*•]\s|👉\s|❌\s|🔥\s|🔄\s|⚡\s|🍽️\s|⏱️\s)/u, '')}</span>
                            </li>
                        ))}
                    </ul>,
                );
            }
            index = nestedIndex;
            continue;
        }

        items.push(
            <p
                key={`${keyPrefix}-p-${index}`}
                className="text-[1.16rem] leading-[1.85] text-[#262626] md:text-[1.24rem]"
            >
                {line}
            </p>,
        );
        index += 1;
    }

    return items;
}

function RecipeMessageContent({ text }: { text: string }) {
    const sections = text
        .split(/\n{2,}/)
        .map((section) => section.trim())
        .filter(Boolean);

    return (
        <div className="space-y-8 text-[#1b1b1b]">
            {sections.map((section, sectionIndex) => {
                const lines = section
                    .split('\n')
                    .map((line) => line.trim())
                    .filter(Boolean);
                const firstLine = lines[0] ?? '';
                const remainingLines = lines.slice(1);

                if (sectionIndex === 0) {
                    return (
                        <section key={`section-${sectionIndex}`} className="space-y-4">
                            <h1 className="font-serif text-[2.2rem] leading-[1.08] tracking-[-0.02em] text-[#171717] md:text-[3rem]">
                                {firstLine}
                            </h1>
                            {remainingLines.length > 0 ? (
                                <div className="space-y-3">
                                    {renderLooseLines(remainingLines, `intro-${sectionIndex}`)}
                                </div>
                            ) : null}
                        </section>
                    );
                }

                if (isPhaseHeading(firstLine)) {
                    return (
                        <section key={`section-${sectionIndex}`} className="border-t border-black/10 pt-7">
                            <h2 className="text-[1.9rem] font-semibold leading-[1.15] tracking-[-0.02em] text-[#121212] md:text-[2.35rem]">
                                {firstLine}
                            </h2>
                            <div className="mt-4 space-y-3">
                                {renderLooseLines(remainingLines, `phase-${sectionIndex}`)}
                            </div>
                        </section>
                    );
                }

                if (isSectionHeading(firstLine)) {
                    return (
                        <section key={`section-${sectionIndex}`} className="space-y-4">
                            <h2 className="text-[1.7rem] font-semibold leading-tight tracking-[-0.02em] text-[#111111] md:text-[2.05rem]">
                                {firstLine}
                            </h2>
                            <div className="space-y-3">
                                {renderLooseLines(remainingLines, `section-${sectionIndex}`)}
                            </div>
                        </section>
                    );
                }

                return (
                    <section key={`section-${sectionIndex}`} className="space-y-3">
                        {renderLooseLines(lines, `generic-${sectionIndex}`)}
                    </section>
                );
            })}
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
        <div className="rounded-3xl border border-primary/10 bg-white/60 p-5 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-black/20">
            <div className="flex items-center gap-2">
                <span className="text-xl">{emoji}</span>
                <h3 className="font-bold text-slate-800 dark:text-slate-200">{title}</h3>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60">Opcional</span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
                <AnimatePresence mode="popLayout">
                    {tokens.map((token) => (
                        <motion.button
                            layout
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            key={token.id}
                            type="button"
                            onClick={() => onRemove(token.id)}
                            className="group inline-flex items-center gap-2 rounded-full border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 px-3 py-1.5 text-sm font-semibold text-primary shadow-sm transition-all hover:border-primary/40 hover:from-primary/20 hover:to-primary/10 hover:shadow"
                        >
                            <span>{token.value}</span>
                            <X className="size-3.5 opacity-50 transition-opacity group-hover:opacity-100" />
                        </motion.button>
                    ))}
                </AnimatePresence>
            </div>

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
                    className="min-w-0 flex-1 rounded-2xl border border-primary/10 bg-white/50 px-4 py-3 text-sm shadow-inner outline-none transition-all placeholder:text-slate-400 focus:border-primary/50 focus:bg-white focus:ring-4 focus:ring-primary/10 dark:bg-black/40 dark:focus:bg-black"
                />
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={submitDraft}
                    className="shrink-0 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg"
                >
                    {actionLabel}
                </motion.button>
            </div>
        </div>
    );
}

export const AIClarifyScreen: React.FC<AIClarifyScreenProps> = ({
    contextDraft,
    wizardStep,
    preRecipe,
    previewMessages,
    previewDraftMessage,
    selectedSeed,
    suggestedTitle,
    tip,
    aiError,
    isGeneratingPreview,
    isGenerating,
    isMockModeEnabled,
    onContextPromptChange,
    onContextServingsChange,
    onAddAvailableIngredient,
    onRemoveAvailableIngredient,
    onAddAvoidIngredient,
    onRemoveAvoidIngredient,
    onPreviewDraftMessageChange,
    onBack,
    onContinue,
    onUpdatePreRecipe,
    onGenerate,
    onLoadMockExample,
    onSkipToMockPreview,
    onGenerateMockRecipe,
}) => {
    const [isServingsEnabled, setIsServingsEnabled] = useState(Boolean(contextDraft.servings));
    const servingsValue = contextDraft.servings ?? 2;
    const handleComposerSubmit = () => {
        if (wizardStep === 'context') {
            onContinue();
            return;
        }
        onUpdatePreRecipe();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 text-foreground dark:from-slate-950 dark:to-slate-900">
            <header className="sticky top-0 z-20 border-b border-black/5 bg-white/60 backdrop-blur-xl dark:border-white/5 dark:bg-black/40">
                <div className="flex items-center justify-between px-4 py-3 md:px-8 lg:px-12">
                    <button
                        onClick={onBack}
                        className="flex size-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-primary/10"
                    >
                        <ArrowLeft className="size-5" />
                    </button>
                    <div className="flex flex-col items-center">
                        <span className="font-serif text-xl italic tracking-tight text-[#526145]">Kitchen Assistant</span>
                    </div>
                    <div className="size-10" />
                </div>
            </header>

            <main className="w-full px-4 pb-40 pt-4 md:px-8 lg:px-12">
                {wizardStep === 'context' && (
                    <div className="space-y-6">
                        <ChatShell>
                            <div className="mb-5 flex items-center justify-between gap-3 px-1">
                                <div className="min-w-0">
                                    <p className="font-serif text-xl italic tracking-tight text-[#526145]">Kitchen Assistant</p>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#526145]/70">Modern Gastronomer</p>
                                </div>
                                <div className="rounded-full bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#526145] shadow-sm">
                                    Nuevo chat
                                </div>
                            </div>

                            <div className="mb-4 flex justify-center">
                                <span className="rounded-full bg-[#e4e2dd] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
                                    Hoy • Inicio de conversación
                                </span>
                            </div>

                            <div className="space-y-4">
                                {aiError ? (
                                    <div className="flex items-start gap-3">
                                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 shadow-sm">
                                            <Bot className="size-4" />
                                        </div>
                                        <div className="max-w-[92%] rounded-[1.5rem] rounded-bl-md border border-red-200 bg-red-50 p-4 shadow-sm">
                                            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-red-600">
                                                Error
                                            </div>
                                            <p className="mt-2 text-sm leading-6 text-red-700">
                                                {aiError}
                                            </p>
                                        </div>
                                    </div>
                                ) : null}

                                <div className="flex items-start gap-3">
                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#6a795c] text-white shadow-sm">
                                        <Bot className="size-4" />
                                    </div>
                                    <div className="max-w-[92%] rounded-[1.5rem] rounded-bl-md bg-white p-4 shadow-sm">
                                        <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#526145]/75">
                                            IA editorial
                                        </div>
                                        <div className="mt-3 font-serif text-[28px] leading-[1.1] text-[#1b1c19] md:text-[40px]">
                                            Armemos la prereceta
                                        </div>
                                        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600 md:text-lg">
                                            La IA primero te mostrará ingredientes y fases. Cuando estés conforme, recién pasaremos al paso a paso final.
                                        </p>
                                    </div>
                                </div>

                                {selectedSeed && (
                                    <div className="flex items-start gap-3">
                                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#6a795c] text-white shadow-sm">
                                            <Bot className="size-4" />
                                        </div>
                                        <div className="max-w-[92%] rounded-[1.5rem] rounded-bl-md bg-white p-4 shadow-sm">
                                            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#526145]/75">
                                                Idea base
                                            </div>
                                            <p className="mt-2 text-sm leading-6 text-slate-700">
                                                Tomaré como punto de partida <span className="font-bold">{selectedSeed.name}</span>.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-start gap-3">
                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#6a795c] text-white shadow-sm">
                                        <Bot className="size-4" />
                                    </div>
                                    <div className="max-w-[92%] rounded-[1.5rem] rounded-bl-md bg-white p-4 shadow-sm">
                                        <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#526145]/75">
                                            Base de la prereceta
                                        </div>
                                        <p className="mt-2 text-sm leading-6 text-slate-700">
                                            Si no defines cantidad, asumiré <span className="font-bold">2 personas</span>.
                                        </p>
                                        <div className="mt-3 flex flex-wrap items-center gap-3">
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
                                                className="rounded-full bg-[#e4e2dd] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#526145]"
                                            >
                                                {isServingsEnabled ? 'Base definida' : 'Usar base 2'}
                                            </button>
                                            {isServingsEnabled ? (
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={20}
                                                    value={servingsValue}
                                                    onChange={(event) => onContextServingsChange(Math.max(1, Number(event.target.value || 2)))}
                                                    className="w-24 rounded-full border border-primary/15 bg-[#f5f3ee] px-3 py-2 text-sm font-bold outline-none"
                                                />
                                            ) : null}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#6a795c] text-white shadow-sm">
                                        <Bot className="size-4" />
                                    </div>
                                    <div className="min-w-0 max-w-[92%] flex-1 rounded-[1.5rem] rounded-bl-md bg-white p-4 shadow-sm">
                                        <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#526145]/75">
                                            Ajustes del contexto
                                        </div>
                                        <p className="mt-2 text-sm leading-6 text-slate-700">
                                            Puedes decir qué ingredientes tienes o qué ingredientes quieres evitar.
                                        </p>
                                        <div className="mt-4 space-y-3">
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
                                </div>
                            </div>
                        </ChatShell>
                    </div>
                )}

                {wizardStep !== 'context' && (
                    <div className="space-y-6">
                        {wizardStep === 'generating' ? (
                            <div className="flex min-h-[55vh] flex-col items-center justify-center text-center">
                                <div className="rounded-full bg-primary/15 p-5 text-primary">
                                    <LoaderCircle className="size-10 animate-spin" />
                                </div>
                                <h1 className="mt-6 text-3xl font-extrabold">Generando receta final</h1>
                                <p className="mt-3 max-w-sm text-sm leading-6 text-slate-600 dark:text-slate-400">
                                    La IA está transformando tu prereceta aprobada en pasos detallados, tiempos y cocción guiada.
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

                                <ChatShell>
                                    <div className="mb-5 flex items-center justify-between gap-3 px-1">
                                        <div className="min-w-0">
                                            <p className="font-serif text-xl italic tracking-tight text-[#526145]">Kitchen Assistant</p>
                                            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#526145]/70">Modern Gastronomer</p>
                                        </div>
                                        <div className="inline-flex items-center rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-[#526145] shadow-sm">
                                            {preRecipe?.name ?? suggestedTitle ?? 'Chat'}
                                        </div>
                                    </div>

                                    <div className="mb-4 flex justify-center">
                                        <span className="rounded-full bg-[#e4e2dd] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
                                            Hoy • Prereceta activa
                                        </span>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex justify-end">
                                            <div className="max-w-[82%] rounded-[1.4rem] rounded-br-md bg-[#96472f] px-4 py-3 text-white shadow-sm">
                                                <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/70">Tú</div>
                                                <div className="mt-2 whitespace-pre-wrap text-[15px] leading-6">
                                                    {contextDraft.prompt}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#6a795c] text-white shadow-sm">
                                                <Bot className="size-4" />
                                            </div>
                                            <div className="min-w-0 flex-1 space-y-4">
                                                <div className="max-w-[92%] rounded-[1.5rem] rounded-bl-md bg-white p-4 shadow-sm">
                                                    <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#526145]/75">
                                                        IA editorial
                                                    </div>
                                                    <div className="mt-4">
                                                        {preRecipe?.chatResponse ? (
                                                            <RecipeMessageContent text={preRecipe.chatResponse} />
                                                        ) : (
                                                            <div className="text-[1.08rem] leading-8 text-[#3a3a3a]">
                                                                Estoy preparando tu prereceta...
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {tip ? (
                                                    <div className="max-w-[90%] rounded-[1.4rem] bg-[#e4e2dd] p-4 text-[#1b1c19] shadow-sm">
                                                        <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#526145]/75">
                                                            Nota del chef
                                                        </div>
                                                        <p className="mt-2 text-sm leading-6">{tip}</p>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>

                                        {previewMessages
                                            .filter((message) => message.role === 'user')
                                            .map((message) => (
                                                <div key={message.id} className="flex justify-end">
                                                    <div className="max-w-[82%] rounded-[1.4rem] rounded-br-md bg-[#96472f] px-4 py-3 text-white shadow-sm">
                                                        <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/70">Tú</div>
                                                        <div className="mt-2 whitespace-pre-wrap text-[15px] leading-6">
                                                            {message.text}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                        <div className="flex items-start gap-3">
                                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#6a795c] text-white shadow-sm">
                                                <Bot className="size-4" />
                                            </div>
                                            <div className="max-w-[92%] rounded-[1.5rem] rounded-bl-md bg-white p-4 shadow-sm">
                                                <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#526145]/75">
                                                    Siguiente acción
                                                </div>
                                                <p className="mt-2 text-sm leading-6 text-slate-700">
                                                    Si esta prereceta ya quedó bien, genero la receta final con tiempos y pasos guiados.
                                                </p>
                                                <div className="mt-4 flex flex-wrap items-center gap-3">
                                                    {preRecipe?.baseYield?.label ? (
                                                        <div className="rounded-full bg-[#f0e0cc] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#221a0e]">
                                                            {preRecipe.baseYield.label}
                                                        </div>
                                                    ) : null}
                                                    <button
                                                        onClick={onGenerate}
                                                        disabled={isGeneratingPreview || isGenerating || wizardStep === 'generating'}
                                                        className="inline-flex items-center justify-center gap-2 rounded-[1rem] bg-[#526145] px-5 py-3 text-sm font-bold uppercase tracking-[0.14em] text-white shadow-sm transition-all hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        {isGenerating ? (
                                                            <>
                                                                <LoaderCircle className="size-4 animate-spin" />
                                                                Generando receta
                                                            </>
                                                        ) : (
                                                            <>
                                                                Generar receta
                                                                <Sparkles className="size-4" />
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </ChatShell>
                            </>
                        )}
                    </div>
                )}
            </main>

            <motion.div 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-white via-white/90 to-transparent px-4 pb-6 pt-12 dark:from-black dark:via-black/90 md:px-8 lg:px-12"
            >
                <div className="mx-auto max-w-4xl">
                    <div className="rounded-full border border-white/20 bg-white/70 p-2 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/70">
                        <div className="flex items-end gap-2 rounded-full bg-white/50 px-2 py-2 dark:bg-black/50">
                            <button
                                type="button"
                                className="flex size-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-200/50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                            >
                                <Plus className="size-5" />
                            </button>
                            <button
                                type="button"
                                className="flex size-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-200/50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                            >
                                <ImagePlus className="size-5" />
                            </button>
                            <textarea
                                value={wizardStep === 'context' ? contextDraft.prompt : previewDraftMessage}
                                onChange={(event) => {
                                    if (wizardStep === 'context') {
                                        onContextPromptChange(event.target.value);
                                        return;
                                    }
                                    onPreviewDraftMessageChange(event.target.value);
                                }}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' && !event.shiftKey) {
                                        event.preventDefault();
                                        handleComposerSubmit();
                                    }
                                }}
                                rows={1}
                                placeholder={wizardStep === 'context' ? '¿Qué vamos a cocinar hoy?' : 'Escribe tu ajuste para la prereceta...'}
                                className="max-h-28 min-h-10 flex-1 resize-none self-center bg-transparent px-2 py-2 text-[15px] font-medium text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-200 dark:placeholder:text-slate-500"
                            />
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                type="button"
                                onClick={handleComposerSubmit}
                                disabled={isGeneratingPreview || isGenerating}
                                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isGeneratingPreview ? (
                                    <LoaderCircle className="size-5 animate-spin" />
                                ) : (
                                    <SendHorizontal className="size-4 -translate-x-[1px] translate-y-[1px]" />
                                )}
                            </motion.button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
