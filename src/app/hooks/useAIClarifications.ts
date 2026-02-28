import { useState } from 'react';
import {
    AIClarificationQuestion,
} from '../lib/recipeAI';
import {
    ClarificationNumberMode,
    ClarificationQuantityUnit,
} from '../../types';

export function useAIClarifications() {
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiClarificationQuestions, setAiClarificationQuestions] = useState<AIClarificationQuestion[]>([]);
    const [aiClarificationAnswers, setAiClarificationAnswers] = useState<Record<string, string | number>>({});
    const [aiClarificationNumberModes, setAiClarificationNumberModes] = useState<Record<string, ClarificationNumberMode>>({});
    const [aiClarificationQuantityUnits, setAiClarificationQuantityUnits] = useState<Record<string, ClarificationQuantityUnit>>({});
    const [isCheckingClarifications, setIsCheckingClarifications] = useState(false);
    const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [aiSuccess, setAiSuccess] = useState<string | null>(null);

    return {
        aiPrompt,
        setAiPrompt,
        aiClarificationQuestions,
        setAiClarificationQuestions,
        aiClarificationAnswers,
        setAiClarificationAnswers,
        aiClarificationNumberModes,
        setAiClarificationNumberModes,
        aiClarificationQuantityUnits,
        setAiClarificationQuantityUnits,
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
