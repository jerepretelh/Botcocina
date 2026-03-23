import { useCallback } from 'react';
import { generateRecipeWithAI, type GeneratedRecipe } from '../../lib/recipeAI';
import { buildCookingSessionState } from '../../lib/cookingSession';
import { canUseCompoundRecipes, canUseUserRecipeConfigs, disableCompoundRecipesForSession, disableUserRecipeConfigsForSession } from '../../lib/supabaseOptionalFeatures';
import { isSupabaseEnabled, supabaseClient } from '../../lib/supabaseClient';
import { saveAIRecipeExactCache } from '../../lib/aiRecipeExactCache';
import { trackProductEvent } from '../../lib/productEvents';
import {
  assertGeneratedRecipePayload,
  formatGenerationFailureMessage,
  persistPreparedAIRecipeWithFallback,
  prepareGeneratedAIRecipeArtifacts,
  type ClarifiedSizing,
} from '../../lib/aiRecipeGenerationFlow';
import type { AIMockScenario, AIMockScenarioId } from '../../lib/aiMockScenarios';
import { getAIMockScenario, getDefaultAIMockScenario } from '../../lib/aiMockScenarios';
import { inferPortionFromPrompt } from '../../utils/recipeHelpers';
import type { AIClarificationsController, UseAIRecipeGenerationDeps } from './useAIRecipeGeneration.shared';

export function useAIRecipeGenerationRuntimeHandoff(args: {
  ai: AIClarificationsController;
  deps: UseAIRecipeGenerationDeps;
  buildFinalPrompt: () => string;
  inferSizing: () => ClarifiedSizing;
  inferPeopleCount: () => number | null;
  resetAiWizardState: () => void;
}) {
  const finalizeRecipeGeneration = useCallback(async (options?: {
    overrideMockScenario?: AIMockScenario | null;
    overrideRequestSource?: 'real' | 'mock';
  }) => {
    const finalPrompt = args.buildFinalPrompt();
    const approvedPreRecipe = options?.overrideMockScenario?.preRecipe ?? args.ai.aiPreRecipe;
    if (!finalPrompt) {
      args.ai.setAiError('Escribe una idea de receta antes de generar.');
      return;
    }
    if (!approvedPreRecipe) {
      args.ai.setAiError('Primero genera y confirma una prereceta.');
      return;
    }

    args.ai.setIsGeneratingRecipe(true);
    args.ai.setAiWizardStep('generating');
    args.ai.setAiError(null);
    args.ai.setAiSuccess(null);

    try {
      const clarifiedSizing = args.inferSizing();
      const clarifiedPeopleCount = args.inferPeopleCount();
      const requestSource = options?.overrideRequestSource ?? args.ai.aiRequestSource;
      const contextualPeopleCount = args.ai.aiContextDraft.servings ?? null;
      const inferredPortion = inferPortionFromPrompt(finalPrompt);
      const activeMockScenario =
        options?.overrideMockScenario
          ? options.overrideMockScenario
          : requestSource === 'mock' && args.ai.aiMockScenarioId
            ? getAIMockScenario(args.ai.aiMockScenarioId as AIMockScenarioId) ?? null
            : null;
      const generatedResult:
        { recipe: GeneratedRecipe; usage?: undefined; mock: true } |
        { recipe: GeneratedRecipe; usage?: { totalTokens: number } | undefined; mock?: false } =
        activeMockScenario
          ? { recipe: activeMockScenario.recipe, mock: true }
          : await generateRecipeWithAI({
            prompt: finalPrompt,
            context: args.ai.aiContextDraft,
            preRecipe: approvedPreRecipe,
            messages: args.ai.aiPreviewMessages,
          });
      const validatedResult = assertGeneratedRecipePayload(generatedResult);
      let prepared = prepareGeneratedAIRecipeArtifacts({
        generatedRecipe: validatedResult.recipe,
        availableRecipes: args.deps.availableRecipes,
        recipeContentById: args.deps.recipeContentById,
        aiUserId: args.deps.aiUserId,
        contextDraft: args.ai.aiContextDraft,
        selectedSeed: args.ai.selectedRecipeSeed,
        suggestedTitle: approvedPreRecipe.name,
        clarifiedSizing,
        clarifiedPeopleCount,
        canUseCompoundRecipes: canUseCompoundRecipes(),
      });
      if (prepared.recipeV2.experience === 'compound' && prepared.recipeV2.compoundMeta) {
        prepared = {
          ...prepared,
          recipe: {
            ...prepared.recipe,
            experience: 'compound',
          },
          content: {
            ...prepared.content,
            compoundMeta: prepared.recipeV2.compoundMeta,
          },
          nextRuntime: {
            ...prepared.nextRuntime,
            isCompound: true,
          },
        };
      }

      let persistedRecipe = prepared.recipe;
      let persistedContent = prepared.content;

      args.deps.setAvailableRecipes((prev: typeof args.deps.availableRecipes) => (
        !prepared.existingEquivalentRecipe
          ? [...prev, persistedRecipe]
          : prev.map((recipe) => (recipe.id === prepared.existingEquivalentRecipe?.id ? persistedRecipe : recipe))
      ));
      args.deps.setRecipeContentById((prev: typeof args.deps.recipeContentById) => ({ ...prev, [prepared.recipe.id]: persistedContent }));
      const nextIngredientSelection = prepared.nextIngredientSelection;
      args.deps.setIngredientSelectionByRecipe((prev: Record<string, Record<string, boolean>>) => ({
        ...prev,
        [prepared.recipe.id]: nextIngredientSelection,
      }));
      args.deps.setRecipeV2ById?.(prepared.recipe.id, prepared.recipeV2);
      saveAIRecipeExactCache(prepared.recipe, prepared.content);

      const persisted = await persistPreparedAIRecipeWithFallback({
        prepared,
        prompt: finalPrompt,
        source: requestSource,
        aiUserId: args.deps.aiUserId,
        isSupabaseEnabled,
        supabaseClient: supabaseClient as never,
        canUseCompoundRecipes: canUseCompoundRecipes(),
        canUseUserRecipeConfigs: canUseUserRecipeConfigs(),
        disableUserRecipeConfigsForSession,
        disableCompoundRecipesForSession,
        addRecipeToDefaultList: args.deps.addRecipeToDefaultList,
        trackProductEvent,
      });
      if (persisted.recipe.experience !== persistedRecipe.experience || Boolean(persisted.content.compoundMeta) !== Boolean(persistedContent.compoundMeta)) {
        persistedRecipe = persisted.recipe;
        persistedContent = persisted.content;
        args.deps.setAvailableRecipes((prev: typeof args.deps.availableRecipes) =>
          prev.map((recipe) => (recipe.id === prepared.recipe.id ? persistedRecipe : recipe)));
        args.deps.setRecipeContentById((prev: typeof args.deps.recipeContentById) => ({ ...prev, [prepared.recipe.id]: persistedContent }));
        saveAIRecipeExactCache(persistedRecipe, persistedContent);
      }
      args.deps.setRecipeV2ById?.(persistedRecipe.id, { ...prepared.recipeV2, id: persistedRecipe.id });

      args.deps.setCookingSteps(null);
      args.deps.setSelectedCategory('personalizadas');
      args.deps.setSelectedRecipe(persistedRecipe);
      args.deps.setQuantityMode(prepared.nextRuntime.quantityMode);
      args.deps.setAmountUnit(prepared.nextRuntime.amountUnit);
      args.deps.setAvailableCount(prepared.nextRuntime.availableCount);
      args.deps.setPeopleCount(prepared.nextRuntime.peopleCount);
      args.deps.setPortion(prepared.nextRuntime.portion);
      args.deps.setTargetYield(prepared.initialConfig.targetYield);
      args.deps.setCookingContext(null);
      args.deps.setTimerScaleFactor(prepared.nextRuntime.timerScaleFactor);
      args.deps.setTimingAdjustedLabel(prepared.nextRuntime.timingAdjustedLabel);

      if (persistedRecipe.experience === 'compound' && persistedContent.compoundMeta) {
        args.deps.setCookingSteps(null);
        args.deps.setActiveStepLoop(null);
      } else {
        const session = buildCookingSessionState({
          selectedRecipe: persistedRecipe,
          activeRecipeContentSteps: persistedContent.steps,
          currentIngredients: persistedContent.ingredients,
          activeIngredientSelection: nextIngredientSelection,
          quantityMode: prepared.nextRuntime.quantityMode,
          amountUnit: prepared.nextRuntime.amountUnit,
          availableCount: prepared.nextRuntime.availableCount,
          peopleCount: prepared.nextRuntime.peopleCount,
          portion: prepared.nextRuntime.portion,
          timerScaleFactor: prepared.nextRuntime.timerScaleFactor,
        });

        args.deps.setCookingSteps(session.steps);
        args.deps.setActiveStepLoop(session.activeStepLoop);
      }
      args.deps.setScreen('cooking');
      args.resetAiWizardState();
      args.deps.setCurrentStepIndex(0);
      args.deps.setCurrentSubStepIndex(0);
      args.deps.setIsRunning(false);
      args.deps.setFlipPromptVisible(false);
      args.deps.setPendingFlipAdvance(false);
      args.deps.setFlipPromptCountdown(0);
      args.deps.setStirPromptVisible(false);
      args.deps.setPendingStirAdvance(false);
      args.deps.setStirPromptCountdown(0);
      args.deps.setAwaitingNextUnitConfirmation(false);
      args.ai.setAiSuccess(
        validatedResult.mock
          ? `Receta de prueba "${persistedRecipe.name}" lista en Mis recetas. No se consumieron créditos de IA.`
          : clarifiedSizing?.quantityMode === 'have'
            ? `Receta "${persistedRecipe.name}" guardada en Mis recetas con base "${clarifiedSizing.count} ${clarifiedSizing.amountUnit === 'grams' ? 'g' : 'unid'}".`
            : clarifiedPeopleCount || contextualPeopleCount
              ? `Receta "${persistedRecipe.name}" guardada en Mis recetas. Base exacta: ${clarifiedPeopleCount || contextualPeopleCount} personas.`
              : inferredPortion
                ? `Receta "${persistedRecipe.name}" guardada en Mis recetas. Base exacta: ${prepared.content.baseServings ?? inferredPortion} porciones.`
                : `Receta "${persistedRecipe.name}" guardada en Mis recetas.`,
      );
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[ai-recipe-generation] finalizeRecipeGeneration failed', error);
      }
      args.ai.setAiWizardStep(args.ai.aiPreRecipe ? 'preview' : 'context');
      args.ai.setAiError(formatGenerationFailureMessage(error));
    } finally {
      args.ai.setIsCheckingClarifications(false);
      args.ai.setIsGeneratingRecipe(false);
    }
  }, [args]);

  const generateMockRecipeDirect = useCallback(async (scenarioId?: AIMockScenarioId) => {
    const scenario = scenarioId ? getAIMockScenario(scenarioId) : getDefaultAIMockScenario();
    if (!scenario) return;
    args.ai.setAiRequestSource('mock');
    args.ai.setAiMockScenarioId(scenario.id);
    args.ai.setAiPreRecipe(scenario.preRecipe);
    args.ai.setAiPreviewMessages([
      {
        id: `assistant-${scenario.id}`,
        role: 'assistant',
        text: `Prereceta base lista para ${scenario.preRecipe.name}.`,
      },
    ]);
    args.ai.setAiClarificationQuestions([]);
    args.ai.setAiClarificationAnswers({});
    args.ai.setAiClarificationNumberModes({});
    args.ai.setAiClarificationQuantityUnits({});
    args.ai.setAiClarificationSuggestedTitle(scenario.clarification.suggestedTitle ?? null);
    args.ai.setAiClarificationTip(scenario.clarification.tip ?? null);
    args.ai.setAiContextDraft(scenario.contextDraft);
    args.ai.setAiPrompt(scenario.contextDraft.prompt);
    await finalizeRecipeGeneration({
      overrideMockScenario: scenario,
      overrideRequestSource: 'mock',
    });
  }, [args.ai, finalizeRecipeGeneration]);

  return {
    finalizeRecipeGeneration,
    generateMockRecipeDirect,
  };
}
