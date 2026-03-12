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
    type AIClarificationResult,
    type GeneratedRecipe,
} from '../lib/recipeAI';
import {
    AIIngredientToken,
    AIRecipeContextDraft,
    AIWizardStep,
    ClarificationNumberMode,
    ClarificationQuantityUnit,
    Portion,
    Recipe,
    RecipeContent,
    RecipeSeed,
    SavedRecipeContextSummary,
    Screen,
} from '../../types';
import {
    normalizeText,
    inferPortionFromPrompt,
    inferPeopleCountFromClarifications,
    inferSizingFromClarifications,
    inferClarificationNumberIntent,
    buildInitialIngredientSelection,
    buildRecipeId,
    ensureRecipeShape,
    getIngredientKey,
    mapCountToPortion,
    clampNumber,
} from '../utils/recipeHelpers';
import { useAIClarifications } from './useAIClarifications';
import { isSupabaseEnabled, supabaseClient } from '../lib/supabaseClient';
import { canUseUserRecipeConfigs, disableUserRecipeConfigsForSession } from '../lib/supabaseOptionalFeatures';
import { trackProductEvent } from '../lib/productEvents';
import { buildCookingSessionState } from '../lib/cookingSession';
import {
    findAIMockScenarioForPrompt,
    getAIMockScenario,
    getDefaultAIMockScenario,
    isAIMockModeEnabled,
    type AIMockScenarioId,
} from '../lib/aiMockScenarios';
import { supportsIngredientBaseFromText } from '../lib/recipeSetupBehavior';

// ─── Types ───────────────────────────────────────────────────────────
interface UseAIRecipeGenerationDeps {
    availableRecipes: Recipe[];
    recipeContentById: Record<string, RecipeContent>;
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
    aiUserId?: string | null;
    addRecipeToDefaultList?: (recipeId: string) => Promise<void>;
}

const INITIAL_AI_CONTEXT_DRAFT: AIRecipeContextDraft = {
    prompt: '',
    servings: null,
    availableIngredients: [],
    avoidIngredients: [],
};

function buildRecipeEquivalenceSignature(
    recipe: Pick<Recipe, 'name' | 'ingredient'>,
    content: Pick<RecipeContent, 'ingredients' | 'steps'>,
): string {
    const ingredientSignature = content.ingredients
        .map((ingredient) => getIngredientKey(ingredient.name))
        .filter(Boolean)
        .sort()
        .join('|');
    const stepSignature = content.steps
        .map((step) => normalizeText(`${step.stepName} ${step.subSteps.map((subStep) => subStep.subStepName).join(' ')}`))
        .filter(Boolean)
        .join('|');

    return [normalizeText(recipe.name || ''), normalizeText(recipe.ingredient || ''), ingredientSignature, stepSignature].join('::');
}

// ─── Clarification Helpers (pure functions) ──────────────────────────

function resolveClarificationUnit(
    question: AIClarificationQuestion,
    numberModes: Record<string, ClarificationNumberMode>,
    quantityUnits: Record<string, ClarificationQuantityUnit>,
): string {
    if (question.type !== 'number') return '';
    if (inferClarificationNumberIntent(question) === 'servings') return 'personas';
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
            const isServingsQuestion =
                text.includes('persona') ||
                text.includes('personas') ||
                text.includes('comensal') ||
                text.includes('porcion') ||
                text.includes('porción');
            return {
                ...question,
                type: 'number',
                min: 1,
                max: isServingsQuestion ? 12 : (text.includes('gramos') || text.includes('kilos') ? 5000 : 20),
                step: text.includes('gramos') || text.includes('kilos') ? 50 : 1,
                unit: isServingsQuestion ? 'personas' : (text.includes('gramos') || text.includes('kilos') ? 'g' : 'unidades'),
                numberIntent: isServingsQuestion ? 'servings' : 'ingredient_base',
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
    contextDraft: AIRecipeContextDraft,
): AIClarificationQuestion[] {
    const normalizedPrompt = normalizeText(userPrompt);
    const supportsIngredientBase = supportsIngredientBaseFromText(userPrompt);
    const result = questions
        .map((question) => normalizeQuestionShape(question, normalizedPrompt))
        .filter((question) => {
            if (question.type !== 'number') return true;
            return supportsIngredientBase || inferClarificationNumberIntent(question) === 'servings';
        });

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
    const hasIngredientBaseQuestion = result.some(
        (question) => question.type === 'number' && inferClarificationNumberIntent(question) === 'ingredient_base',
    );
    if (supportsIngredientBase && !contextDraft.servings && !hasNumericQuestion && !hasIngredientBaseQuestion) {
        result.push({
            id: 'cantidad_base',
            question: '¿Con qué base quieres cocinar esta receta?',
            type: 'number',
            required: true,
            min: 1,
            max: 20,
            step: 1,
            unit: 'unidades',
            numberIntent: 'ingredient_base',
        });
    }

    return result.slice(0, 5);
}

function buildPromptWithContext(context: AIRecipeContextDraft): string {
    const prompt = context.prompt.trim();
    if (!prompt) return '';

    const lines = [prompt];
    if (typeof context.servings === 'number' && context.servings > 0) {
        lines.push(`- Comensales objetivo: ${context.servings}`);
    }
    if (context.availableIngredients.length > 0) {
        lines.push(`- Ingredientes disponibles: ${context.availableIngredients.map((item) => item.value).join(', ')}`);
    }
    if (context.avoidIngredients.length > 0) {
        lines.push(`- Ingredientes a evitar: ${context.avoidIngredients.map((item) => item.value).join(', ')}`);
    }
    return lines.join('\n');
}

function buildContextSummary(context: AIRecipeContextDraft, options: {
    quantityMode: 'people' | 'have';
    peopleCount: number | null;
    amountUnit: 'units' | 'grams' | null;
    availableCount: number | null;
    selectedSeed?: RecipeSeed | null;
}): SavedRecipeContextSummary | null {
    const availableIngredients = context.availableIngredients.map((item) => item.value.trim()).filter(Boolean);
    const avoidIngredients = context.avoidIngredients.map((item) => item.value.trim()).filter(Boolean);
    const prompt = context.prompt.trim();
    if (!prompt && !context.servings && availableIngredients.length === 0 && avoidIngredients.length === 0 && !options.selectedSeed) {
        return null;
    }

    const summaryLabel =
        options.quantityMode === 'have' && options.availableCount
            ? `Basada en ${options.availableCount}${options.amountUnit === 'grams' ? ' g' : ' unid.'}`
            : options.peopleCount
                ? `Creada para ${options.peopleCount} persona${options.peopleCount === 1 ? '' : 's'}`
                : null;

    return {
        prompt: prompt || null,
        servings: context.servings,
        quantityMode: options.quantityMode,
        amountUnit: options.amountUnit,
        availableCount: options.availableCount,
        availableIngredients,
        avoidIngredients,
        summaryLabel,
        seedId: options.selectedSeed?.id ?? null,
        seedName: options.selectedSeed?.name ?? null,
        seedCategoryId: options.selectedSeed?.categoryId ?? null,
    };
}

function isQuestionSatisfiedByContext(question: AIClarificationQuestion, context: AIRecipeContextDraft): boolean {
    const text = normalizeText(`${question.id} ${question.question}`);

    if (question.type === 'number' && inferClarificationNumberIntent(question) === 'servings') {
        return typeof context.servings === 'number' && context.servings > 0;
    }

    if (
        (text.includes('persona') || text.includes('comensal') || text.includes('porcion') || text.includes('porción')) &&
        typeof context.servings === 'number' &&
        context.servings > 0
    ) {
        return true;
    }

    if (
        (text.includes('ingredientes disponibles') ||
            text.includes('que tienes') ||
            text.includes('qué tienes') ||
            text.includes('tienes en casa') ||
            text.includes('disponible')) &&
        context.availableIngredients.length > 0
    ) {
        return true;
    }

    if (
        (text.includes('evitar') ||
            text.includes('alerg') ||
            text.includes('restric') ||
            text.includes('no quieres') ||
            text.includes('disgusto')) &&
        context.avoidIngredients.length > 0
    ) {
        return true;
    }

    return false;
}

function formatGenerationFailureMessage(error: unknown): string {
    const detail = error instanceof Error ? error.message.trim() : '';
    const generic = 'No se pudo completar la generación de la receta. La receta no se guardó. Puedes reintentar sin volver a responder todo.';

    if (!detail) {
        return generic;
    }

    if (
        detail.includes('respuesta inválida') ||
        detail.includes('receta incompleta') ||
        detail.includes('No se pudo interpretar') ||
        detail.includes('Google AI') ||
        detail.includes('OpenAI') ||
        detail.includes('No se pudo guardar')
    ) {
        return `${generic} Detalle: ${detail}`;
    }

    return generic;
}

function assertGeneratedRecipePayload(
    generatedResult: unknown,
): { recipe: GeneratedRecipe; usage?: { totalTokens: number } | undefined; mock?: boolean } {
    if (!generatedResult || typeof generatedResult !== 'object' || !('recipe' in generatedResult)) {
        throw new Error('La IA devolvió una respuesta inválida.');
    }

    const recipe = (generatedResult as { recipe?: unknown }).recipe;
    if (!recipe || typeof recipe !== 'object') {
        throw new Error('La IA devolvió una receta inválida.');
    }

    return generatedResult as { recipe: GeneratedRecipe; usage?: { totalTokens: number } | undefined; mock?: boolean };
}

// ─── Main Hook ───────────────────────────────────────────────────────

export function useAIRecipeGeneration(deps: UseAIRecipeGenerationDeps) {
    const {
        availableRecipes,
        recipeContentById,
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
        aiUserId,
        addRecipeToDefaultList,
    } = deps;

    const persistAiRecipeToSupabase = useCallback(
        async (
            recipe: Recipe,
            content: RecipeContent,
            prompt: string,
            options?: {
                source?: 'real' | 'mock';
                initialConfig?: {
                    quantityMode: 'people' | 'have';
                    peopleCount: number | null;
                    amountUnit: 'units' | 'grams' | null;
                    availableCount: number | null;
                    selectedOptionalIngredients: string[];
                    sourceContextSummary: SavedRecipeContextSummary | null;
                };
            },
        ) => {
            if (!isSupabaseEnabled || !supabaseClient || !aiUserId) return;
            const shouldLogGeneration = options?.source !== 'mock';
            const createdRun = shouldLogGeneration
                ? await supabaseClient
                    .from('ai_recipe_generations')
                    .insert({
                        user_id: aiUserId,
                        prompt,
                        mode: 'generate',
                        status: 'created',
                    })
                    .select('id')
                    .single()
                : { data: null };

            const generationId = createdRun.data?.id as string | undefined;

            const updateGeneration = async (status: 'approved' | 'failed', fields?: Record<string, unknown>) => {
                if (!generationId) return;
                await supabaseClient
                    .from('ai_recipe_generations')
                    .update({
                        status,
                        updated_at: new Date().toISOString(),
                        ...fields,
                    })
                    .eq('id', generationId);
            };

            try {
                await supabaseClient.from('recipes').upsert(
                    {
                        id: recipe.id,
                        category_id: recipe.categoryId,
                        name: recipe.name,
                        icon: recipe.icon,
                        emoji: recipe.emoji ?? recipe.icon,
                        ingredient: recipe.ingredient,
                        description: recipe.description,
                        equipment: recipe.equipment ?? null,
                        tip: content.tip,
                        portion_label_singular: content.portionLabels.singular,
                        portion_label_plural: content.portionLabels.plural,
                        source: 'ai',
                        owner_user_id: aiUserId,
                        visibility: 'private',
                        is_published: false,
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: 'id' },
                );

                await supabaseClient.from('recipe_ingredients').delete().eq('recipe_id', recipe.id);
                await supabaseClient.from('recipe_substeps').delete().eq('recipe_id', recipe.id);

                const ingredientsPayload = content.ingredients.map((ingredient, index) => ({
                    recipe_id: recipe.id,
                    sort_order: index + 1,
                    name: ingredient.name,
                    emoji: ingredient.emoji || '🍽️',
                    indispensable: Boolean(ingredient.indispensable),
                    p1: ingredient.portions[1] || 'Al gusto',
                    p2: ingredient.portions[2] || ingredient.portions[1] || 'Al gusto',
                    p4: ingredient.portions[4] || ingredient.portions[2] || ingredient.portions[1] || 'Al gusto',
                }));
                if (ingredientsPayload.length > 0) {
                    await supabaseClient.from('recipe_ingredients').insert(ingredientsPayload);
                }

                const substepsPayload = content.steps.flatMap((step) =>
                    step.subSteps.map((subStep, index) => {
                        const p1 = subStep.portions[1];
                        const p2 = subStep.portions[2];
                        const p4 = subStep.portions[4];
                        return {
                            recipe_id: recipe.id,
                            substep_order: step.stepNumber * 100 + index + 1,
                            step_number: step.stepNumber,
                            step_name: step.stepName,
                            substep_name: subStep.subStepName,
                            notes: subStep.notes || '',
                            is_timer: subStep.isTimer,
                            p1: String(p1 ?? (subStep.isTimer ? 30 : 'Continuar')),
                            p2: String(p2 ?? p1 ?? (subStep.isTimer ? 45 : 'Continuar')),
                            p4: String(p4 ?? p2 ?? p1 ?? (subStep.isTimer ? 60 : 'Continuar')),
                            fire_level: step.fireLevel ?? null,
                            equipment: step.equipment ?? null,
                            updated_at: new Date().toISOString(),
                        };
                    }),
                );
                if (substepsPayload.length > 0) {
                    await supabaseClient.from('recipe_substeps').insert(substepsPayload);
                }

                if (options?.initialConfig && canUseUserRecipeConfigs()) {
                    const { error: configError } = await supabaseClient.from('user_recipe_cooking_configs').upsert(
                        {
                            user_id: aiUserId,
                            recipe_id: recipe.id,
                            quantity_mode: options.initialConfig.quantityMode,
                            people_count: options.initialConfig.peopleCount,
                            amount_unit: options.initialConfig.amountUnit,
                            available_count: options.initialConfig.availableCount,
                            selected_optional_ingredients: options.initialConfig.selectedOptionalIngredients,
                            source_context_summary: options.initialConfig.sourceContextSummary,
                            last_used_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        },
                        { onConflict: 'user_id,recipe_id' },
                    );
                    if (configError) {
                        const configMessage = `${configError.message ?? ''} ${configError.details ?? ''}`.toLowerCase();
                        if (configError.code === 'PGRST205' || configMessage.includes('could not find the table') || (configMessage.includes('relation') && configMessage.includes('does not exist'))) {
                            disableUserRecipeConfigsForSession();
                        } else {
                            throw configError;
                        }
                    }
                }

                await updateGeneration('approved', {
                    recipe_id: recipe.id,
                    raw_response: content,
                });
                if (addRecipeToDefaultList) {
                    await addRecipeToDefaultList(recipe.id);
                }
                if (options?.source !== 'mock') {
                    await trackProductEvent(aiUserId, 'ai_recipe_created_private', { recipeId: recipe.id }).catch(() => {});
                }
            } catch (error) {
                await updateGeneration('failed', {
                    error_message: error instanceof Error ? error.message : 'failed-to-persist-ai-recipe',
                });
                throw new Error('No se pudo guardar la receta generada en tu biblioteca.');
            }
        },
        [aiUserId, addRecipeToDefaultList],
    );

    const ai = useAIClarifications();

    const resetAiWizardState = useCallback((nextContextDraft?: AIRecipeContextDraft) => {
        ai.setAiPrompt(nextContextDraft?.prompt ?? '');
        ai.setAiContextDraft(nextContextDraft ?? INITIAL_AI_CONTEXT_DRAFT);
        ai.setSelectedRecipeSeed(null);
        ai.setAiWizardStep('context');
        ai.setAiRequestSource('real');
        ai.setAiMockScenarioId(null);
        ai.setAiClarificationQuestions([]);
        ai.setAiClarificationAnswers({});
        ai.setAiClarificationNumberModes({});
        ai.setAiClarificationQuantityUnits({});
        ai.setAiClarificationSuggestedTitle(null);
        ai.setAiClarificationTip(null);
    }, [ai]);

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
                            inferClarificationNumberIntent(question) === 'ingredient_base' &&
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

    const buildFinalPrompt = useCallback(() => {
        const promptWithContext = buildPromptWithContext(ai.aiContextDraft);
        const promptBase = promptWithContext || ai.aiPrompt.trim();
        return buildPromptWithClarifications(promptBase);
    }, [ai.aiContextDraft, ai.aiPrompt, buildPromptWithClarifications]);

    const applyClarificationResult = useCallback((prompt: string, clarification: AIClarificationResult) => {
        const normalizedQuestions = Array.isArray(clarification.questions)
            ? clarification.questions
                .filter((question) => question && question.id && question.question && question.type)
                .slice(0, 5)
            : [];
        const enrichedQuestions = enrichClarificationQuestions(prompt, normalizedQuestions, ai.aiContextDraft)
            .filter((question) => !isQuestionSatisfiedByContext(question, ai.aiContextDraft));
        ai.setAiClarificationSuggestedTitle(clarification.suggestedTitle ?? null);
        ai.setAiClarificationTip(clarification.tip ?? null);

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
                    const questionIntent = inferClarificationNumberIntent(question);
                    initialNumberModes[question.id] = questionIntent === 'ingredient_base' ? 'quantity' : 'people';
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
            ai.setAiWizardStep('refinement');
            setScreen('ai-clarify');
            return true;
        }

        ai.setAiClarificationQuestions([]);
        ai.setAiClarificationAnswers({});
        ai.setAiClarificationNumberModes({});
        ai.setAiClarificationQuantityUnits({});
        return false;
    }, [ai, setScreen]);

    const applyMockScenarioToContext = useCallback((scenarioId?: AIMockScenarioId) => {
        const scenario = scenarioId ? getAIMockScenario(scenarioId) : getDefaultAIMockScenario();
        if (!scenario) return;
        const clonedContextDraft: AIRecipeContextDraft = {
            ...scenario.contextDraft,
            availableIngredients: scenario.contextDraft.availableIngredients.map((item) => ({ ...item })),
            avoidIngredients: scenario.contextDraft.avoidIngredients.map((item) => ({ ...item })),
        };
        ai.setSelectedRecipeSeed(null);
        ai.setAiContextDraft(clonedContextDraft);
        ai.setAiPrompt(clonedContextDraft.prompt);
        ai.setAiError(null);
        ai.setAiSuccess('Ejemplo cargado en modo prueba. No consumirá créditos.');
        ai.setAiRequestSource('mock');
        ai.setAiMockScenarioId(scenario.id);
    }, [ai]);

    const jumpToMockRefinement = useCallback((scenarioId?: AIMockScenarioId) => {
        const scenario = scenarioId ? getAIMockScenario(scenarioId) : getDefaultAIMockScenario();
        if (!scenario) return;
        applyMockScenarioToContext(scenario.id);
        ai.setAiRequestSource('mock');
        ai.setAiMockScenarioId(scenario.id);
        applyClarificationResult(scenario.contextDraft.prompt, scenario.clarification);
        ai.setAiSuccess('Refinamiento mock cargado. Puedes seguir probando sin usar IA real.');
    }, [ai, applyClarificationResult, applyMockScenarioToContext]);

    const startWizardFromSeed = useCallback((seed: RecipeSeed) => {
        const nextContextDraft: AIRecipeContextDraft = {
            ...INITIAL_AI_CONTEXT_DRAFT,
            prompt: seed.name,
        };
        ai.setSelectedRecipeSeed(seed);
        ai.setAiPrompt(seed.name);
        ai.setAiContextDraft(nextContextDraft);
        ai.setAiWizardStep('context');
        ai.setAiRequestSource('real');
        ai.setAiMockScenarioId(null);
        ai.setAiClarificationQuestions([]);
        ai.setAiClarificationAnswers({});
        ai.setAiClarificationNumberModes({});
        ai.setAiClarificationQuantityUnits({});
        ai.setAiClarificationSuggestedTitle(seed.name);
        ai.setAiClarificationTip(null);
        ai.setAiError(null);
        ai.setAiSuccess(null);
        setScreen('ai-clarify');
    }, [ai, setScreen]);

    const getMissingClarificationQuestion = useCallback(
        () =>
            ai.aiClarificationQuestions.find((question) => {
                if (!question.required) return false;
                const value = ai.aiClarificationAnswers[question.id];
                return value === undefined || value === null || value === '';
            }),
        [ai.aiClarificationQuestions, ai.aiClarificationAnswers],
    );

    const handleAiPromptChange = useCallback(
        (value: string) => {
            ai.setAiPrompt(value);
            ai.setAiContextDraft((prev) => ({ ...prev, prompt: value }));
            if (ai.selectedRecipeSeed && normalizeText(value) !== normalizeText(ai.selectedRecipeSeed.name)) {
                ai.setSelectedRecipeSeed(null);
            }
            if (ai.aiClarificationQuestions.length > 0) {
                ai.setAiClarificationQuestions([]);
                ai.setAiClarificationAnswers({});
                ai.setAiClarificationNumberModes({});
                ai.setAiClarificationQuantityUnits({});
                ai.setAiClarificationSuggestedTitle(null);
                ai.setAiClarificationTip(null);
                ai.setAiWizardStep('context');
            }
            ai.setAiRequestSource('real');
            ai.setAiMockScenarioId(null);
            ai.setAiSuccess(null);
            ai.setAiError(null);
        },
        [ai],
    );

    const upsertContextIngredients = useCallback(
        (field: 'availableIngredients' | 'avoidIngredients', nextValue: string) => {
            const trimmed = nextValue.trim();
            if (!trimmed) return;
            ai.setAiContextDraft((prev) => {
                const exists = prev[field].some((item) => normalizeText(item.value) === normalizeText(trimmed));
                if (exists) return prev;
                const nextToken: AIIngredientToken = {
                    id: `${field}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    value: trimmed,
                };
                return {
                    ...prev,
                    [field]: [...prev[field], nextToken],
                };
            });
            ai.setAiError(null);
        },
        [ai],
    );

    const removeContextIngredient = useCallback(
        (field: 'availableIngredients' | 'avoidIngredients', tokenId: string) => {
            ai.setAiContextDraft((prev) => ({
                ...prev,
                [field]: prev[field].filter((item) => item.id !== tokenId),
            }));
        },
        [ai],
    );

    const handleAiWizardBack = useCallback(() => {
        if (ai.aiWizardStep === 'refinement') {
            ai.setAiWizardStep('context');
            ai.setAiError(null);
            return;
        }
        ai.setAiError(null);
        ai.setAiSuccess(null);
        setScreen('category-select');
    }, [ai, setScreen]);

    const finalizeRecipeGeneration = useCallback(async () => {
        const finalPrompt = buildFinalPrompt();
        if (!finalPrompt) {
            ai.setAiError('Escribe una idea de receta antes de generar.');
            return;
        }

        ai.setIsGeneratingRecipe(true);
        ai.setAiWizardStep('generating');
        ai.setAiError(null);
        ai.setAiSuccess(null);

        try {
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
            const contextualPeopleCount = ai.aiContextDraft.servings ?? null;
            const resolvedPeopleCount = clarifiedPeopleCount || contextualPeopleCount || null;
            const inferredPortion = inferPortionFromPrompt(finalPrompt);
            const activeMockScenario =
                ai.aiRequestSource === 'mock' && ai.aiMockScenarioId
                    ? getAIMockScenario(ai.aiMockScenarioId as AIMockScenarioId) ?? null
                    : null;
            const generatedResult:
                { recipe: GeneratedRecipe; usage?: undefined; mock: true } |
                { recipe: GeneratedRecipe; usage?: { totalTokens: number } | undefined; mock?: false } =
                activeMockScenario
                    ? { recipe: activeMockScenario.recipe, mock: true }
                    : await generateRecipeWithAI(finalPrompt);
            const validatedResult = assertGeneratedRecipePayload(generatedResult);
            const generated = ensureRecipeShape(validatedResult.recipe);

            if (generated.ingredients.length === 0 || generated.steps.length === 0) {
                throw new Error('La IA devolvió una receta incompleta. Intenta nuevamente.');
            }

            const newContent: RecipeContent = {
                ingredients: generated.ingredients,
                steps: generated.steps,
                tip: generated.tip,
                portionLabels: {
                    singular: generated.portionLabels?.singular || 'porción',
                    plural: generated.portionLabels?.plural || 'porciones',
                },
            };

            const recipeName = generated.name || ai.aiClarificationSuggestedTitle || 'Nueva receta';
            const recipeSignature = buildRecipeEquivalenceSignature(
                {
                    name: recipeName,
                    ingredient: generated.ingredient,
                },
                newContent,
            );
            const existingEquivalentRecipe = availableRecipes.find((recipe) => {
                if (recipe.ownerUserId !== (aiUserId ?? null) || (recipe.visibility ?? 'public') !== 'private') {
                    return false;
                }
                const existingContent = recipeContentById[recipe.id];
                if (!existingContent) return false;
                return buildRecipeEquivalenceSignature(recipe, existingContent) === recipeSignature;
            });
            const recipeId =
                existingEquivalentRecipe?.id ??
                `${buildRecipeId(generated.id || recipeName)}-${aiUserId?.slice(0, 8) ?? 'anon'}-${Date.now()}`;

            const newRecipe: Recipe = {
                id: recipeId,
                categoryId: 'personalizadas',
                name: recipeName,
                icon: generated.icon,
                ingredient: generated.ingredient,
                description: generated.description,
                ownerUserId: aiUserId ?? null,
                visibility: 'private',
                createdAt: existingEquivalentRecipe?.createdAt ?? new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            setAvailableRecipes((prev: Recipe[]) => {
                if (!existingEquivalentRecipe) {
                    return [...prev, newRecipe];
                }
                return prev.map((recipe) => (recipe.id === existingEquivalentRecipe.id ? newRecipe : recipe));
            });
            setRecipeContentById((prev: Record<string, RecipeContent>) => ({ ...prev, [newRecipe.id]: newContent }));
            const nextIngredientSelection = buildInitialIngredientSelection(newContent.ingredients);
            setIngredientSelectionByRecipe((prev: Record<string, Record<string, boolean>>) => ({
                ...prev,
                [newRecipe.id]: nextIngredientSelection,
            }));
            const initialConfig = {
                quantityMode: clarifiedSizing?.quantityMode === 'have' ? 'have' as const : 'people' as const,
                peopleCount: clarifiedSizing?.quantityMode === 'have' ? resolvedPeopleCount : (resolvedPeopleCount ?? inferredPortion ?? 2),
                amountUnit: clarifiedSizing?.quantityMode === 'have' ? (clarifiedSizing.amountUnit === 'grams' ? 'grams' : 'units') : null,
                availableCount: clarifiedSizing?.quantityMode === 'have' ? clarifiedSizing.count : null,
                selectedOptionalIngredients: newContent.ingredients
                    .filter((ingredient) => !ingredient.indispensable)
                    .map((ingredient) => ingredient.name.toLowerCase().replace(/\s+/g, '_')),
                sourceContextSummary: buildContextSummary(ai.aiContextDraft, {
                    quantityMode: clarifiedSizing?.quantityMode === 'have' ? 'have' : 'people',
                    peopleCount: clarifiedSizing?.quantityMode === 'have' ? resolvedPeopleCount : (resolvedPeopleCount ?? inferredPortion ?? 2),
                    amountUnit: clarifiedSizing?.quantityMode === 'have' ? (clarifiedSizing.amountUnit === 'grams' ? 'grams' : 'units') : null,
                    availableCount: clarifiedSizing?.quantityMode === 'have' ? clarifiedSizing.count : null,
                    selectedSeed: ai.selectedRecipeSeed,
                }),
            };
            await persistAiRecipeToSupabase(newRecipe, newContent, finalPrompt, {
                source: ai.aiRequestSource,
                initialConfig,
            });
            setCookingSteps(null);
            setSelectedCategory('personalizadas');
            setSelectedRecipe(newRecipe);
            let nextQuantityMode: 'people' | 'have' = 'people';
            let nextAmountUnit: 'units' | 'grams' = 'units';
            let nextAvailableCount = 1;
            let nextPeopleCount = resolvedPeopleCount ?? inferredPortion ?? 2;
            let nextPortion: Portion = inferredPortion ?? mapCountToPortion(nextPeopleCount);
            let nextTimerScaleFactor = 1;
            let nextTimingAdjustedLabel = 'Tiempo estándar';

            if (clarifiedSizing?.quantityMode === 'have') {
                nextQuantityMode = 'have';
                nextAmountUnit = clarifiedSizing.amountUnit === 'grams' ? 'grams' : 'units';
                nextAvailableCount = clarifiedSizing.count;
                nextPortion = mapCountToPortion(clarifiedSizing.count);
            } else if (clarifiedPeopleCount) {
                nextPeopleCount = clarifiedPeopleCount;
                nextPortion = mapCountToPortion(clarifiedPeopleCount);
            } else if (contextualPeopleCount) {
                nextPeopleCount = contextualPeopleCount;
                nextPortion = mapCountToPortion(contextualPeopleCount);
            } else if (inferredPortion) {
                nextPeopleCount = inferredPortion;
                nextPortion = inferredPortion;
            }
            if (clarifiedSizing) {
                nextTimerScaleFactor = clampNumber(clarifiedSizing.count / 2, 0.8, 2);
                nextTimingAdjustedLabel =
                    Math.abs(nextTimerScaleFactor - 1) < 0.01
                        ? 'Tiempo estándar'
                        : `Tiempo ajustado x${nextTimerScaleFactor.toFixed(2)}`;
            }

            setQuantityMode(nextQuantityMode);
            setAmountUnit(nextAmountUnit);
            setAvailableCount(nextAvailableCount);
            setPeopleCount(nextPeopleCount);
            setPortion(nextPortion);
            setTimerScaleFactor(nextTimerScaleFactor);
            setTimingAdjustedLabel(nextTimingAdjustedLabel);

            const session = buildCookingSessionState({
                selectedRecipe: newRecipe,
                activeRecipeContentSteps: newContent.steps,
                currentIngredients: newContent.ingredients,
                activeIngredientSelection: nextIngredientSelection,
                quantityMode: nextQuantityMode,
                amountUnit: nextAmountUnit,
                availableCount: nextAvailableCount,
                peopleCount: nextPeopleCount,
                portion: nextPortion,
                timerScaleFactor: nextTimerScaleFactor,
            });

            setCookingSteps(session.steps);
            setActiveStepLoop(session.activeStepLoop);
            setScreen('cooking');
            resetAiWizardState();
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
            ai.setAiSuccess(
                validatedResult.mock
                    ? `Receta de prueba "${newRecipe.name}" lista en Mis recetas. No se consumieron créditos de IA.`
                    : clarifiedSizing?.quantityMode === 'have'
                    ? `Receta "${newRecipe.name}" guardada en Mis recetas con base "lo que tienes" (${clarifiedSizing.count} ${clarifiedSizing.amountUnit === 'grams' ? 'g' : 'unid'}).${validatedResult.usage ? ` Consumo: ${validatedResult.usage.totalTokens} tokens.` : ''}`
                    : clarifiedPeopleCount || contextualPeopleCount
                        ? `Receta "${newRecipe.name}" guardada en Mis recetas. Configurada para ${clarifiedPeopleCount || contextualPeopleCount} personas.${validatedResult.usage ? ` Consumo: ${validatedResult.usage.totalTokens} tokens.` : ''}`
                        : inferredPortion
                            ? `Receta "${newRecipe.name}" guardada en Mis recetas. Detecté ${inferredPortion} porciones desde el prompt.${validatedResult.usage ? ` Consumo: ${validatedResult.usage.totalTokens} tokens.` : ''}`
                            : `Receta "${newRecipe.name}" guardada en Mis recetas.${validatedResult.usage ? ` Consumo: ${validatedResult.usage.totalTokens} tokens.` : ''}`,
            );
        } catch (error) {
            ai.setAiWizardStep(ai.aiClarificationQuestions.length > 0 ? 'refinement' : 'context');
            ai.setAiError(formatGenerationFailureMessage(error));
        } finally {
            ai.setIsCheckingClarifications(false);
            ai.setIsGeneratingRecipe(false);
        }
    }, [
        ai,
        aiUserId,
        availableRecipes,
        buildFinalPrompt,
        persistAiRecipeToSupabase,
        recipeContentById,
        resetAiWizardState,
        setActiveStepLoop,
        setAmountUnit,
        setAvailableCount,
        setAvailableRecipes,
        setAwaitingNextUnitConfirmation,
        setCookingSteps,
        setCurrentStepIndex,
        setCurrentSubStepIndex,
        setFlipPromptCountdown,
        setFlipPromptVisible,
        setIngredientSelectionByRecipe,
        setIngredientsBackScreen,
        setIsRunning,
        setPeopleCount,
        setPendingFlipAdvance,
        setPendingStirAdvance,
        setPortion,
        setQuantityMode,
        setRecipeContentById,
        setScreen,
        setSelectedCategory,
        setSelectedRecipe,
        setStirPromptCountdown,
        setStirPromptVisible,
        setTimerScaleFactor,
        setTimingAdjustedLabel,
    ]);

    const generateMockRecipeDirect = useCallback(async (scenarioId?: AIMockScenarioId) => {
        const scenario = scenarioId ? getAIMockScenario(scenarioId) : getDefaultAIMockScenario();
        if (!scenario) return;
        applyMockScenarioToContext(scenario.id);
        ai.setAiRequestSource('mock');
        ai.setAiMockScenarioId(scenario.id);
        ai.setAiClarificationQuestions([]);
        ai.setAiClarificationAnswers({});
        ai.setAiClarificationNumberModes({});
        ai.setAiClarificationQuantityUnits({});
        ai.setAiClarificationSuggestedTitle(scenario.clarification.suggestedTitle ?? null);
        ai.setAiClarificationTip(scenario.clarification.tip ?? null);
        await finalizeRecipeGeneration();
    }, [ai, applyMockScenarioToContext, finalizeRecipeGeneration]);

    const handleAiContextContinue = useCallback(async () => {
        const prompt = ai.aiContextDraft.prompt.trim();
        if (!prompt) {
            ai.setAiError('Escribe una idea de receta antes de continuar.');
            return;
        }

        ai.setAiPrompt(prompt);
        ai.setAiError(null);
        ai.setAiSuccess(null);
        ai.setIsCheckingClarifications(true);

        try {
            const activeMockScenario =
                isAIMockModeEnabled() ? findAIMockScenarioForPrompt(prompt) : null;
            if (activeMockScenario) {
                ai.setAiRequestSource('mock');
                ai.setAiMockScenarioId(activeMockScenario.id);
                const movedToRefinement = applyClarificationResult(prompt, activeMockScenario.clarification);
                ai.setAiSuccess('Usando escenario de prueba. No se consumirán créditos de IA.');
                if (movedToRefinement) return;
                await finalizeRecipeGeneration();
                return;
            }

            ai.setAiRequestSource('real');
            ai.setAiMockScenarioId(null);
            const clarification = await requestRecipeClarificationWithAI(prompt, ai.aiContextDraft);
            const movedToRefinement = applyClarificationResult(prompt, clarification);
            if (movedToRefinement) return;
            await finalizeRecipeGeneration();
        } catch (error) {
            ai.setAiWizardStep('context');
            ai.setAiError(error instanceof Error ? error.message : 'No se pudo consultar a la IA.');
        } finally {
            ai.setIsCheckingClarifications(false);
        }
    }, [ai, finalizeRecipeGeneration, setScreen]);

    const handleGenerateRecipe = useCallback(async () => {
        if (ai.aiClarificationQuestions.length === 0) {
            await handleAiContextContinue();
            return;
        }

        const missingQuestion = getMissingClarificationQuestion();
        if (missingQuestion) {
            ai.setAiError(`Falta responder: ${missingQuestion.question}`);
            return;
        }

        await finalizeRecipeGeneration();
    }, [ai, finalizeRecipeGeneration, getMissingClarificationQuestion, handleAiContextContinue]);

    return {
        // State from useAIClarifications
        aiPrompt: ai.aiPrompt,
        setAiPrompt: ai.setAiPrompt,
        aiContextDraft: ai.aiContextDraft,
        setAiContextDraft: ai.setAiContextDraft,
        selectedRecipeSeed: ai.selectedRecipeSeed,
        setSelectedRecipeSeed: ai.setSelectedRecipeSeed,
        aiWizardStep: ai.aiWizardStep,
        setAiWizardStep: ai.setAiWizardStep,
        aiClarificationQuestions: ai.aiClarificationQuestions,
        setAiClarificationQuestions: ai.setAiClarificationQuestions,
        aiClarificationAnswers: ai.aiClarificationAnswers,
        setAiClarificationAnswers: ai.setAiClarificationAnswers,
        aiClarificationNumberModes: ai.aiClarificationNumberModes,
        setAiClarificationNumberModes: ai.setAiClarificationNumberModes,
        aiClarificationQuantityUnits: ai.aiClarificationQuantityUnits,
        setAiClarificationQuantityUnits: ai.setAiClarificationQuantityUnits,
        aiClarificationSuggestedTitle: ai.aiClarificationSuggestedTitle,
        setAiClarificationSuggestedTitle: ai.setAiClarificationSuggestedTitle,
        aiClarificationTip: ai.aiClarificationTip,
        setAiClarificationTip: ai.setAiClarificationTip,
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
        handleAiContextContinue,
        handleAiWizardBack,
        handleAiPromptChange,
        startWizardFromSeed,
        isAiMockModeEnabled: isAIMockModeEnabled(),
        aiRequestSource: ai.aiRequestSource,
        applyMockScenarioToContext,
        jumpToMockRefinement,
        generateMockRecipeDirect,
        addAvailableIngredient: (value: string) => upsertContextIngredients('availableIngredients', value),
        addAvoidIngredient: (value: string) => upsertContextIngredients('avoidIngredients', value),
        removeAvailableIngredient: (tokenId: string) => removeContextIngredient('availableIngredients', tokenId),
        removeAvoidIngredient: (tokenId: string) => removeContextIngredient('avoidIngredients', tokenId),
        // Helpers
        resolveClarificationUnit: (question: AIClarificationQuestion) =>
            resolveClarificationUnit(question, ai.aiClarificationNumberModes, ai.aiClarificationQuantityUnits),
        getMissingClarificationQuestion,
    };
}
