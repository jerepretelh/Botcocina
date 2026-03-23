import { useCallback } from 'react';
import { generatePreRecipeWithAI } from '../../lib/recipeAI';
import { useAIClarifications } from '../useAIClarifications';
import {
  findAIMockScenarioForPrompt,
  isAIMockModeEnabled,
} from '../../lib/aiMockScenarios';
import {
  buildPromptWithContext,
  type UseAIRecipeGenerationDeps,
} from './useAIRecipeGeneration.shared';
import { useAIRecipeGenerationWizardState } from './useAIRecipeGenerationWizardState';
import { useAIRecipeGenerationRuntimeHandoff } from './useAIRecipeGenerationRuntimeHandoff';

function buildPreviewMessageId(prefix: 'user' | 'assistant') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useAIRecipeGeneration(deps: UseAIRecipeGenerationDeps) {
  const ai = useAIClarifications();

  const buildFinalPrompt = useCallback(() => {
    const promptWithContext = buildPromptWithContext(ai.aiContextDraft);
    return promptWithContext || ai.aiPrompt.trim();
  }, [ai.aiContextDraft, ai.aiPrompt]);

  const wizard = useAIRecipeGenerationWizardState({
    ai,
    setScreen: deps.setScreen,
  });

  const runtimeHandoff = useAIRecipeGenerationRuntimeHandoff({
    ai,
    deps,
    buildFinalPrompt,
    inferSizing: () => null,
    inferPeopleCount: () => {
      if (typeof ai.aiContextDraft.servings === 'number' && ai.aiContextDraft.servings > 0) {
        return ai.aiContextDraft.servings;
      }
      if (ai.aiPreRecipe?.baseYield?.type === 'servings' && typeof ai.aiPreRecipe.baseYield.value === 'number') {
        return ai.aiPreRecipe.baseYield.value;
      }
      return 2;
    },
    resetAiWizardState: wizard.resetAiWizardState,
  });

  const requestPreview = useCallback(async (userMessageText?: string) => {
    const prompt = ai.aiContextDraft.prompt.trim();
    if (!prompt) {
      ai.setAiError('Escribe una idea de receta antes de continuar.');
      return;
    }

    ai.setAiPrompt(prompt);
    ai.setAiError(null);
    ai.setAiSuccess(null);
    ai.setIsCheckingClarifications(true);
    ai.setIsGeneratingPreview(true);

    const nextMessages = userMessageText?.trim()
      ? [
        ...ai.aiPreviewMessages,
        {
          id: buildPreviewMessageId('user'),
          role: 'user' as const,
          text: userMessageText.trim(),
        },
      ]
      : ai.aiPreviewMessages;

    if (userMessageText?.trim()) {
      ai.setAiPreviewMessages(nextMessages);
      ai.setAiPreviewDraftMessage('');
    }

    try {
      const activeMockScenario = isAIMockModeEnabled() ? findAIMockScenarioForPrompt(prompt) : null;
      if (activeMockScenario && nextMessages.length === 0) {
        ai.setAiRequestSource('mock');
        ai.setAiMockScenarioId(activeMockScenario.id);
        ai.setAiPreRecipe(activeMockScenario.preRecipe);
        ai.setAiPreviewMessages([
          {
            id: buildPreviewMessageId('assistant'),
            role: 'assistant',
            text: `Prereceta base lista para ${activeMockScenario.preRecipe.name}.`,
          },
        ]);
        ai.setAiWizardStep('preview');
        deps.setScreen('ai-clarify');
        ai.setAiSuccess('Usando escenario de prueba. No se consumirán créditos de IA.');
        return;
      }

      ai.setAiRequestSource('real');
      ai.setAiMockScenarioId(null);
      const previewResult = await generatePreRecipeWithAI({
        prompt,
        context: ai.aiContextDraft,
        messages: nextMessages,
      });
      ai.setAiPreRecipe(previewResult.preRecipe);
      ai.setAiPreviewMessages([
        ...nextMessages,
        {
          id: buildPreviewMessageId('assistant'),
          role: 'assistant',
          text: `Prereceta actualizada: ${previewResult.preRecipe.name}.`,
        },
      ]);
      ai.setAiClarificationSuggestedTitle(previewResult.preRecipe.name);
      ai.setAiClarificationTip(previewResult.preRecipe.tips?.[0] ?? null);
      ai.setAiWizardStep('preview');
      deps.setScreen('ai-clarify');
    } catch (error) {
      ai.setAiWizardStep(ai.aiPreRecipe ? 'preview' : 'context');
      ai.setAiError(error instanceof Error ? error.message : 'No se pudo consultar a la IA.');
    } finally {
      ai.setIsCheckingClarifications(false);
      ai.setIsGeneratingPreview(false);
    }
  }, [ai, deps]);

  const handleAiContextContinue = useCallback(async () => {
    await requestPreview();
  }, [requestPreview]);

  const handleUpdatePreRecipe = useCallback(async () => {
    const draft = ai.aiPreviewDraftMessage.trim();
    if (!draft) {
      ai.setAiError('Escribe un ajuste antes de actualizar la prereceta.');
      return;
    }
    await requestPreview(draft);
  }, [ai, requestPreview]);

  const handleGenerateRecipe = useCallback(async () => {
    if (!ai.aiPreRecipe) {
      await handleAiContextContinue();
      return;
    }
    await runtimeHandoff.finalizeRecipeGeneration();
  }, [ai.aiPreRecipe, handleAiContextContinue, runtimeHandoff]);

  return {
    aiPrompt: ai.aiPrompt,
    setAiPrompt: ai.setAiPrompt,
    aiContextDraft: ai.aiContextDraft,
    setAiContextDraft: ai.setAiContextDraft,
    selectedRecipeSeed: ai.selectedRecipeSeed,
    setSelectedRecipeSeed: ai.setSelectedRecipeSeed,
    aiWizardStep: ai.aiWizardStep,
    setAiWizardStep: ai.setAiWizardStep,
    aiPreRecipe: ai.aiPreRecipe,
    setAiPreRecipe: ai.setAiPreRecipe,
    aiPreviewMessages: ai.aiPreviewMessages,
    setAiPreviewMessages: ai.setAiPreviewMessages,
    aiPreviewDraftMessage: ai.aiPreviewDraftMessage,
    setAiPreviewDraftMessage: ai.setAiPreviewDraftMessage,
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
    isGeneratingPreview: ai.isGeneratingPreview,
    setIsGeneratingPreview: ai.setIsGeneratingPreview,
    isGeneratingRecipe: ai.isGeneratingRecipe,
    setIsGeneratingRecipe: ai.setIsGeneratingRecipe,
    handleGenerateRecipe,
    handleAiContextContinue,
    handleUpdatePreRecipe,
    handleAiWizardBack: wizard.handleAiWizardBack,
    handleAiPromptChange: wizard.handleAiPromptChange,
    startWizardFromSeed: wizard.startWizardFromSeed,
    isAiMockModeEnabled: isAIMockModeEnabled(),
    aiRequestSource: ai.aiRequestSource,
    applyMockScenarioToContext: wizard.applyMockScenarioToContext,
    jumpToMockPreview: wizard.jumpToMockPreview,
    generateMockRecipeDirect: runtimeHandoff.generateMockRecipeDirect,
    addAvailableIngredient: wizard.addAvailableIngredient,
    addAvoidIngredient: wizard.addAvoidIngredient,
    removeAvailableIngredient: wizard.removeAvailableIngredient,
    removeAvoidIngredient: wizard.removeAvoidIngredient,
    resolveClarificationUnit: () => '',
    getMissingClarificationQuestion: () => null,
  };
}
