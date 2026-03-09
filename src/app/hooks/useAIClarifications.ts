import { useState } from 'react';
import {
    AIClarificationQuestion,
} from '../lib/recipeAI';
import {
    AIRequestSource,
    AIRecipeContextDraft,
    AIWizardStep,
    ClarificationNumberMode,
    ClarificationQuantityUnit,
    RecipeSeed,
} from '../../types';

const INITIAL_AI_CONTEXT_DRAFT: AIRecipeContextDraft = {
    prompt: '',
    servings: null,
    availableIngredients: [],
    avoidIngredients: [],
};

export function useAIClarifications() {
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiContextDraft, setAiContextDraft] = useState<AIRecipeContextDraft>(INITIAL_AI_CONTEXT_DRAFT);
    const [selectedRecipeSeed, setSelectedRecipeSeed] = useState<RecipeSeed | null>(null);
    const [aiWizardStep, setAiWizardStep] = useState<AIWizardStep>('context');
    const [aiRequestSource, setAiRequestSource] = useState<AIRequestSource>('real');
    const [aiMockScenarioId, setAiMockScenarioId] = useState<string | null>(null);
    const [aiClarificationQuestions, setAiClarificationQuestions] = useState<AIClarificationQuestion[]>([]);
    const [aiClarificationAnswers, setAiClarificationAnswers] = useState<Record<string, string | number>>({});
    const [aiClarificationNumberModes, setAiClarificationNumberModes] = useState<Record<string, ClarificationNumberMode>>({});
    const [aiClarificationQuantityUnits, setAiClarificationQuantityUnits] = useState<Record<string, ClarificationQuantityUnit>>({});
    const [aiClarificationSuggestedTitle, setAiClarificationSuggestedTitle] = useState<string | null>(null);
    const [aiClarificationTip, setAiClarificationTip] = useState<string | null>(null);
    const [isCheckingClarifications, setIsCheckingClarifications] = useState(false);
    const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [aiSuccess, setAiSuccess] = useState<string | null>(null);

    return {
        aiPrompt,
        setAiPrompt,
        aiContextDraft,
        setAiContextDraft,
        selectedRecipeSeed,
        setSelectedRecipeSeed,
        aiWizardStep,
        setAiWizardStep,
        aiRequestSource,
        setAiRequestSource,
        aiMockScenarioId,
        setAiMockScenarioId,
        aiClarificationQuestions,
        setAiClarificationQuestions,
        aiClarificationAnswers,
        setAiClarificationAnswers,
        aiClarificationNumberModes,
        setAiClarificationNumberModes,
        aiClarificationQuantityUnits,
        setAiClarificationQuantityUnits,
        aiClarificationSuggestedTitle,
        setAiClarificationSuggestedTitle,
        aiClarificationTip,
        setAiClarificationTip,
        isCheckingClarifications,
        setIsCheckingClarifications,
        isGeneratingRecipe,
        setIsGeneratingRecipe,
        aiError,
        setAiError,
        aiSuccess,
        setAiSuccess,
    };
}
