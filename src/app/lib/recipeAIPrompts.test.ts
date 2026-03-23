import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPreviewConversation, buildStructuredUserPrompt } from '../../../api/ai/recipePrompts';

test('buildStructuredUserPrompt defaults prerecipe sizing to 2 people when omitted', () => {
  const prompt = buildStructuredUserPrompt('Arroz con lentejas y lomito al jugo', {
    prompt: 'Arroz con lentejas y lomito al jugo',
    servings: null,
    availableIngredients: [],
    avoidIngredients: [],
  });

  assert.match(prompt, /Comensales objetivo: 2/);
});

test('buildPreviewConversation preserves chat ordering for prerecipe adjustments', () => {
  const serialized = buildPreviewConversation([
    { id: 'user-1', role: 'user', text: 'Hazlo para 4 personas.' },
    { id: 'assistant-1', role: 'assistant', text: 'Actualicé la prereceta base.' },
  ]);

  assert.match(serialized, /Usuario: Hazlo para 4 personas\./);
  assert.match(serialized, /IA: Actualicé la prereceta base\./);
});
