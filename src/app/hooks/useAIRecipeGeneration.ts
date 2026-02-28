/**
 * Hook que gestiona la generación de recetas con IA.
 * Incluye clarificación previa, enriquecimiento de preguntas, y generación final.
 * Internamente consume useAIClarifications para el estado de UI.
 */
import { useCallback } from 'react';
import {
    generateRecipeWithAI,
    requestRecipeClarificationWithAI,
    type AIClarificationQuestion,
} from '../lib/recipeAI';
import {
    ClarificationNumberMode,
    ClarificationQuantityUnit,
    Portion,
    Recipe,
    RecipeContent,
    Screen,
} from '../../types';
import {
    normalizeText,
    inferPortionFromPrompt,
    inferPeopleCountFromClarifications,
    inferSizingFromClarifications,
    buildInitialIngredientSelection,
    buildRecipeId,
    ensureRecipeShape,
    mapCountToPortion,
    clampNumber,
} from '../utils/recipeHelpers';
import { useAIClarifications } from './useAIClarifications';

// ─── Types ───────────────────────────────────────────────────────────
interface UseAIRecipeGenerationDeps {
    availableRecipes: Recipe[];
    setAvailableRecipes: (action: any) => void;
    setRecipeContentById: (action: any) => void;
    setIngredientSelectionByRecipe: (action: any) => void;
    setSelectedCategory: (action: any) => void;
    setSelectedRecipe: (action: any) => void;
    setScreen: (action: any) => void;
    setIngredientsBackScreen: (action: any) => void;
    setCookingSteps: (action: any) => void;
    setQuantityMode: (action: any) => void;
    setAmountUnit: (action: any) => void;
    setAvailableCount: (action: any) => void;
    setPortion: (action: any) => void;
    setPeopleCount: (action: any) => void;
    setTimerScaleFactor: (action: any) => void;
    setTimingAdjustedLabel: (action: any) => void;
    setCurrentStepIndex: (action: any) => void;
    setCurrentSubStepIndex: (action: any) => void;
    setIsRunning: (action: any) => void;
    setActiveStepLoop: (action: any) => void;
    setFlipPromptVisible: (action: any) => void;
    setPendingFlipAdvance: (action: any) => void;
    setFlipPromptCountdown: (action: any) => void;
    setStirPromptVisible: (action: any) => void;
    setPendingStirAdvance: (action: any) => void;
    setStirPromptCountdown: (action: any) => void;
    setAwaitingNextUnitConfirmation: (action: any) => void;
}

// ─── Clarification Helpers (pure functions) ──────────────────────────

function resolveClarificationUnit(
    question: AIClarificationQuestion,
    numberModes: Record<string, ClarificationNumberMode>,
    quantityUnits: Record<string, ClarificationQuantityUnit>,
): string {
    if (question.type !== 'number') return '';
    const mode = numberModes[question.id];
    if (mode === 'people') return 'personas';
    const selectedQuantityUnit = quantityUnits[question.id];
    if (selectedQuantityUnit === 'grams') return 'g';
    if (selectedQuantityUnit === 'units') return 'unidades';
    const normalizedQuestionUnit = normalizeText(question.unit ?? '');
    if (normalizedQuestionUnit.includes('g') || normalizedQuestionUnit.includes('gram')) return 'g';
    if (normalizedQuestionUnit.includes('persona')) return 'unidades';
    return question.unit || 'unidades';
}

function normalizeQuestionShape(
    question: AIClarificationQuestion,
    normalizedPrompt: string,
): AIClarificationQuestion {
    const text = normalizeText(`${question.id} ${question.question}`);

    if (question.type === 'text') {
        if (text.includes('tipo de papa') || text.includes('papa tienes') || text.includes('papa prefieres')) {
            return { ...question, type: 'single_choice', options: ['Canchán', 'Huayro', 'Yungay', 'Única', 'Blanca', 'Otra'] };
        }
        if (text.includes('tipo de camote') || text.includes('camote prefieres')) {
            return { ...question, type: 'single_choice', options: ['Camote amarillo', 'Camote morado', 'Camote blanco', 'Otro'] };
        }
        if (text.includes('tipo de pescado')) {
            return { ...question, type: 'single_choice', options: ['Perico', 'Lenguado', 'Tilapia', 'Merluza', 'Bonito', 'Otro'] };
        }
        if (text.includes('corte') || text.includes('como cortar') || text.includes('trozos') || text.includes('filete')) {
            return { ...question, type: 'single_choice', options: ['Filete', 'Trozos medianos', 'Tiras', 'Bastones', 'Rodajas', 'Otro corte'] };
        }
        if (
            text.includes('cuantas personas') ||
            text.includes('cuanta') ||
            text.includes('cantidad') ||
            text.includes('gramos') ||
            text.includes('kilos') ||
            text.includes('cuantos')
        ) {
            return {
                ...question,
                type: 'number',
                min: 1,
                max: text.includes('gramos') || text.includes('kilos') ? 5000 : 20,
                step: text.includes('gramos') || text.includes('kilos') ? 50 : 1,
                unit: text.includes('gramos') || text.includes('kilos') ? 'g' : 'unidades',
            };
        }
    }

    if (
        question.type === 'single_choice' &&
        (!Array.isArray(question.options) || question.options.length === 0)
    ) {
        if (normalizedPrompt.includes('papa') || normalizedPrompt.includes('camote')) {
            return { ...question, options: ['Blanca', 'Canchán', 'Huayro', 'Yungay', 'Otra'] };
        }
        if (normalizedPrompt.includes('pescado')) {
            return { ...question, options: ['Perico', 'Tilapia', 'Merluza', 'Bonito', 'Otro'] };
        }
    }

    return question;
}

function enrichClarificationQuestions(
    userPrompt: string,
    questions: AIClarificationQuestion[],
): AIClarificationQuestion[] {
    const normalizedPrompt = normalizeText(userPrompt);
    const result = questions.map((question) => normalizeQuestionShape(question, normalizedPrompt));

    const hasCutQuestion = result.some((question) => {
        const text = normalizeText(`${question.id} ${question.question}`);
        return text.includes('corte') || text.includes('filete') || text.includes('trozo');
    });
    const isFishFry =
        normalizedPrompt.includes('pescado') &&
        (normalizedPrompt.includes('frito') || normalizedPrompt.includes('freir') || normalizedPrompt.includes('chicharron'));
    if (isFishFry && !hasCutQuestion) {
        result.push({
            id: 'tipo_corte_pescado',
            question: '¿Qué tipo de corte usarás?',
            type: 'single_choice',
            required: true,
            options: ['Filete', 'Trozos medianos', 'Entero abierto'],
        });
    }

    const hasNumericQuestion = result.some((question) => question.type === 'number');
    if (!hasNumericQuestion) {
        result.push({
            id: 'cantidad_base',
            question: '¿Con qué base quieres cocinar esta receta?',
            type: 'number',
            required: true,
            min: 1,
            max: 20,
            step: 1,
            unit: 'unidades',
        });
    }

    return result.slice(0, 5);
}

// ─── Main Hook ───────────────────────────────────────────────────────

export function useAIRecipeGeneration(deps: UseAIRecipeGenerationDeps) {
    const {
        availableRecipes,
        setAvailableRecipes,
        setRecipeContentById,
        setIngredientSelectionByRecipe,
        setSelectedCategory,
        setSelectedRecipe,
        setScreen,
        setIngredientsBackScreen,
        setCookingSteps,
        setQuantityMode,
        setAmountUnit,
        setAvailableCount,
        setPortion,
        setPeopleCount,
        setTimerScaleFactor,
        setTimingAdjustedLabel,
        setCurrentStepIndex,
        setCurrentSubStepIndex,
        setIsRunning,
        setActiveStepLoop,
        setFlipPromptVisible,
        setPendingFlipAdvance,
        setFlipPromptCountdown,
        setStirPromptVisible,
        setPendingStirAdvance,
        setStirPromptCountdown,
        setAwaitingNextUnitConfirmation,
    } = deps;

    const ai = useAIClarifications();

    const buildPromptWithClarifications = useCallback(
        (basePrompt: string): string => {
            if (ai.aiClarificationQuestions.length === 0) return basePrompt;
            const answeredLines = ai.aiClarificationQuestions
                .map((question) => {
                    const value = ai.aiClarificationAnswers[question.id];
                    if (value === undefined || value === null || value === '') return '';
                    const unit = resolveClarificationUnit(question, ai.aiClarificationNumberModes, ai.aiClarificationQuantityUnits);
                    const numberMode = ai.aiClarificationNumberModes[question.id];
                    const label =
                        question.type === 'number' &&
                            numberMode === 'quantity' &&
                            normalizeText(question.question).includes('persona')
                            ? 'Cantidad disponible'
                            : question.question;
                    return `- ${label}: ${value}${unit ? ` ${unit}` : ''}`;
                })
                .filter(Boolean);
            if (answeredLines.length === 0) return basePrompt;
            return [basePrompt, '', 'Datos adicionales confirmados por el usuario:', ...answeredLines, '- Genera la receta alineada a estos datos.'].join('\n');
        },
        [ai.aiClarificationQuestions, ai.aiClarificationAnswers, ai.aiClarificationNumberModes, ai.aiClarificationQuantityUnits],
    );

    const getMissingClarificationQuestion = useCallback(
        () =>
            ai.aiClarificationQuestions.find((question) => {
                if (!question.required) return false;
                const value = ai.aiClarificationAnswers[question.id];
                return value === undefined || value === null || value === '';
            }),
        [ai.aiClarificationQuestions, ai.aiClarificationAnswers],
    );

    const setAiClarificationAnswers = useCallback((id: string, value: string | number) => {
        ai.setAiClarificationAnswers((prev: Record<string, string | number>) => ({ ...prev, [id]: value }));
    }, [ai]);

    const setAiClarificationNumberModes = useCallback((id: string, mode: ClarificationNumberMode) => {
        ai.setAiClarificationNumberModes((prev: Record<string, ClarificationNumberMode>) => ({ ...prev, [id]: mode }));
    }, [ai]);

    const setAiClarificationQuantityUnits = useCallback((id: string, unit: ClarificationQuantityUnit) => {
        ai.setAiClarificationQuantityUnits((prev: Record<string, ClarificationQuantityUnit>) => ({ ...prev, [id]: unit }));
    }, [ai]);

    const handleAiPromptChange = useCallback(
        (value: string) => {
            ai.setAiPrompt(value);
            if (ai.aiClarificationQuestions.length > 0) {
                ai.setAiClarificationQuestions([]);
                ai.setAiClarificationAnswers({});
                ai.setAiClarificationNumberModes({});
                ai.setAiClarificationQuantityUnits({});
                ai.setAiSuccess(null);
                ai.setAiError(null);
            }
        },
        [ai],
    );

    const handleGenerateRecipe = useCallback(async () => {
        const prompt = ai.aiPrompt.trim();
        if (!prompt) {
            ai.setAiError('Escribe una idea de receta antes de generar.');
            return;
        }

        const missingQuestion = getMissingClarificationQuestion();
        if (missingQuestion) {
            ai.setAiError(`Falta responder: ${missingQuestion.question}`);
            return;
        }

        ai.setAiError(null);
        ai.setAiSuccess(null);

        try {
            if (ai.aiClarificationQuestions.length === 0) {
                ai.setIsCheckingClarifications(true);
                const clarification = await requestRecipeClarificationWithAI(prompt);
                const normalizedQuestions = Array.isArray(clarification.questions)
                    ? clarification.questions
                        .filter((question) => question && question.id && question.question && question.type)
                        .slice(0, 5)
                    : [];
                const enrichedQuestions = enrichClarificationQuestions(prompt, normalizedQuestions);
                if (clarification.needsClarification && enrichedQuestions.length > 0) {
                    const initialAnswers: Record<string, string | number> = {};
                    const initialNumberModes: Record<string, ClarificationNumberMode> = {};
                    const initialQuantityUnits: Record<string, ClarificationQuantityUnit> = {};
                    enrichedQuestions.forEach((question) => {
                        if (question.type === 'single_choice' && Array.isArray(question.options) && question.options.length > 0) {
                            initialAnswers[question.id] = '';
                            return;
                        }
                        if (question.type === 'number') {
                            initialAnswers[question.id] = typeof question.min === 'number' ? question.min : 1;
                            const normalizedQuestionText = normalizeText(`${question.id} ${question.question}`);
                            initialNumberModes[question.id] =
                                normalizedQuestionText.includes('persona') ||
                                    normalizedQuestionText.includes('porcion') ||
                                    normalizedQuestionText.includes('comensal')
                                    ? 'people'
                                    : 'quantity';
                            initialQuantityUnits[question.id] =
                                normalizeText(question.unit ?? '').includes('g') || normalizeText(question.unit ?? '').includes('gram')
                                    ? 'grams'
                                    : 'units';
                            return;
                        }
                        initialAnswers[question.id] = '';
                    });
                    ai.setAiClarificationQuestions(enrichedQuestions);
                    ai.setAiClarificationAnswers(initialAnswers);
                    ai.setAiClarificationNumberModes(initialNumberModes);
                    ai.setAiClarificationQuantityUnits(initialQuantityUnits);
                    ai.setAiSuccess(null);
                    setScreen('ai-clarify');
                    return;
                }
            }

            ai.setIsGeneratingRecipe(true);
            const finalPrompt = buildPromptWithClarifications(prompt);
            const clarifiedSizing = inferSizingFromClarifications(
                ai.aiClarificationQuestions,
                ai.aiClarificationAnswers,
                ai.aiClarificationNumberModes,
                ai.aiClarificationQuantityUnits,
            );
            const clarifiedPeopleCount = inferPeopleCountFromClarifications(
                ai.aiClarificationQuestions,
                ai.aiClarificationAnswers,
                ai.aiClarificationNumberModes,
            );
            const inferredPortion = inferPortionFromPrompt(finalPrompt);
            const generated = ensureRecipeShape(await generateRecipeWithAI(finalPrompt));
            const baseId = buildRecipeId(generated.id || generated.name);
            const uniqueId = availableRecipes.some((recipe) => recipe.id === baseId)
                ? `${baseId}-${Date.now()}`
                : baseId;

            if (generated.ingredients.length === 0 || generated.steps.length === 0) {
                throw new Error('La IA devolvió una receta incompleta. Intenta nuevamente.');
            }

            const newRecipe: Recipe = {
                id: uniqueId,
                categoryId: 'personalizadas',
                name: generated.name || 'Nueva receta',
                icon: generated.icon,
                ingredient: generated.ingredient,
                description: generated.description,
            };

            const newContent: RecipeContent = {
                ingredients: generated.ingredients,
                steps: generated.steps,
                tip: generated.tip,
                portionLabels: {
                    singular: generated.portionLabels?.singular || 'porción',
                    plural: generated.portionLabels?.plural || 'porciones',
                },
            };

            setAvailableRecipes((prev: Recipe[]) => [...prev, newRecipe]);
            setRecipeContentById((prev: Record<string, RecipeContent>) => ({ ...prev, [newRecipe.id]: newContent }));
            setIngredientSelectionByRecipe((prev: Record<string, Record<string, boolean>>) => ({
                ...prev,
                [newRecipe.id]: buildInitialIngredientSelection(newContent.ingredients),
            }));
            setCookingSteps(null);
            setSelectedCategory('personalizadas');
            setSelectedRecipe(newRecipe);
            if (clarifiedSizing?.quantityMode === 'have') {
                setQuantityMode('have');
                setAmountUnit(clarifiedSizing.amountUnit === 'grams' ? 'grams' : 'units');
                setAvailableCount(clarifiedSizing.count);
                setPortion(mapCountToPortion(clarifiedSizing.count));
            } else if (clarifiedPeopleCount) {
                setQuantityMode('people');
                setPeopleCount(clarifiedPeopleCount);
                setPortion(mapCountToPortion(clarifiedPeopleCount));
            } else if (inferredPortion) {
                setQuantityMode('people');
                setPortion(inferredPortion);
                setPeopleCount(inferredPortion);
            }
            if (clarifiedSizing) {
                const autoScaleFactor = clampNumber(clarifiedSizing.count / 2, 0.8, 2);
                setTimerScaleFactor(autoScaleFactor);
                setTimingAdjustedLabel(
                    Math.abs(autoScaleFactor - 1) < 0.01
                        ? 'Tiempo estándar'
                        : `Tiempo ajustado x${autoScaleFactor.toFixed(2)}`,
                );
                setIngredientsBackScreen('ai-clarify');
                setScreen('ingredients');
            } else {
                setIngredientsBackScreen('recipe-setup');
                setScreen('recipe-setup');
            }
            setCurrentStepIndex(0);
            setCurrentSubStepIndex(0);
            setIsRunning(false);
            setActiveStepLoop(null);
            setFlipPromptVisible(false);
            setPendingFlipAdvance(false);
            setFlipPromptCountdown(0);
            setStirPromptVisible(false);
            setPendingStirAdvance(false);
            setStirPromptCountdown(0);
            setAwaitingNextUnitConfirmation(false);
            if (!clarifiedSizing) {
                ai.setAiPrompt('');
                ai.setAiClarificationQuestions([]);
                ai.setAiClarificationAnswers({});
                ai.setAiClarificationNumberModes({});
                ai.setAiClarificationQuantityUnits({});
            }
            ai.setAiSuccess(
                clarifiedSizing?.quantityMode === 'have'
                    ? `Receta "${newRecipe.name}" agregada con base "lo que tienes" (${clarifiedSizing.count} ${clarifiedSizing.amountUnit === 'grams' ? 'g' : 'unid'}).`
                    : clarifiedPeopleCount
                        ? `Receta "${newRecipe.name}" agregada. Configurada para ${clarifiedPeopleCount} personas.`
                        : inferredPortion
                            ? `Receta "${newRecipe.name}" agregada. Detecté ${inferredPortion} porciones desde el prompt.`
                            : `Receta "${newRecipe.name}" agregada.`,
            );
        } catch (error) {
            ai.setAiError(error instanceof Error ? error.message : 'No se pudo generar la receta.');
        } finally {
            ai.setIsCheckingClarifications(false);
            ai.setIsGeneratingRecipe(false);
        }
    }, [
        ai, availableRecipes, buildPromptWithClarifications, getMissingClarificationQuestion,
        setAvailableRecipes, setRecipeContentById, setIngredientSelectionByRecipe,
        setSelectedCategory, setSelectedRecipe, setScreen, setIngredientsBackScreen,
        setCookingSteps, setQuantityMode, setAmountUnit, setAvailableCount,
        setPortion, setPeopleCount, setTimerScaleFactor, setTimingAdjustedLabel,
        setCurrentStepIndex, setCurrentSubStepIndex, setIsRunning, setActiveStepLoop,
        setFlipPromptVisible, setPendingFlipAdvance, setFlipPromptCountdown,
        setStirPromptVisible, setPendingStirAdvance, setStirPromptCountdown,
        setAwaitingNextUnitConfirmation,
    ]);

    return {
        // State from useAIClarifications
        aiPrompt: ai.aiPrompt,
        setAiPrompt: ai.setAiPrompt,
        aiClarificationQuestions: ai.aiClarificationQuestions,
        setAiClarificationQuestions: ai.setAiClarificationQuestions,
        aiClarificationAnswers: ai.aiClarificationAnswers,
        setAiClarificationAnswers: ai.setAiClarificationAnswers,
        aiClarificationNumberModes: ai.aiClarificationNumberModes,
        setAiClarificationNumberModes: ai.setAiClarificationNumberModes,
        aiClarificationQuantityUnits: ai.aiClarificationQuantityUnits,
        setAiClarificationQuantityUnits: ai.setAiClarificationQuantityUnits,
        aiError: ai.aiError,
        setAiError: ai.setAiError,
        aiSuccess: ai.aiSuccess,
        setAiSuccess: ai.setAiSuccess,
        isCheckingClarifications: ai.isCheckingClarifications,
        setIsCheckingClarifications: ai.setIsCheckingClarifications,
        isGeneratingRecipe: ai.isGeneratingRecipe,
        setIsGeneratingRecipe: ai.setIsGeneratingRecipe,
        // Handlers
        handleGenerateRecipe,
        handleAiPromptChange,
        // Helpers
        resolveClarificationUnit: (question: AIClarificationQuestion) =>
            resolveClarificationUnit(question, ai.aiClarificationNumberModes, ai.aiClarificationQuantityUnits),
        getMissingClarificationQuestion,
    };
}
