import type { GeneratedRecipe } from '../recipeAI';

export function formatGenerationFailureMessage(error: unknown): string {
  const detail = error instanceof Error ? error.message.trim() : '';
  const generic = 'No se pudo completar la generación de la receta. La receta no se guardó. Puedes reintentar sin volver a responder todo.';

  if (!detail) {
    return generic;
  }

  return `${generic} Detalle: ${detail}`;
}

export function assertGeneratedRecipePayload(
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
