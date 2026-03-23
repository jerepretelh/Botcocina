import type { PersistClient } from './persistenceShared';

export async function createAiRecipeGenerationRun(args: {
  client: PersistClient;
  aiUserId: string;
  prompt: string;
  shouldLogGeneration: boolean;
}): Promise<string | undefined> {
  if (!args.shouldLogGeneration) return undefined;
  const createdRun = await args.client
    .from('ai_recipe_generations')
    .insert({
      user_id: args.aiUserId,
      prompt: args.prompt,
      mode: 'generate',
      status: 'created',
    })
    .select('id')
    .single();

  return createdRun.data?.id;
}

export async function updateAiRecipeGenerationRun(args: {
  client: PersistClient;
  generationId?: string;
  status: 'approved' | 'failed';
  fields?: Record<string, unknown>;
}): Promise<void> {
  if (!args.generationId) return;
  await args.client
    .from('ai_recipe_generations')
    .update({
      status: args.status,
      updated_at: new Date().toISOString(),
      ...args.fields,
    })
    .eq('id', args.generationId);
}
