import test from 'node:test';
import assert from 'node:assert/strict';

import type { AIRecipeContextDraft, Recipe, RecipeContent } from '../../types';
import type { GeneratedRecipe } from './recipeAI';
import {
  assertGeneratedRecipePayload,
  persistPreparedAIRecipeWithFallback,
  prepareGeneratedAIRecipeArtifacts,
} from './aiRecipeGenerationFlow';

function buildStandardGeneratedRecipe(): GeneratedRecipe {
  return {
    name: 'Milanesa crocante de pollo',
    icon: '🍗',
    ingredient: 'milanesas',
    description: '5 pasos · 28 min aprox.',
    tip: 'Deja reposar el empanizado.',
    portionLabels: { singular: 'milanesa', plural: 'milanesas' },
    ingredients: [
      { name: 'Pechuga de pollo', emoji: '🍗', indispensable: true, portions: { 1: '1 filete', 2: '2 filetes', 4: '4 filetes' } },
      { name: 'Pan rallado', emoji: '🍞', indispensable: true, portions: { 1: '1/2 taza', 2: '1 taza', 4: '2 tazas' } },
      { name: 'Sal', emoji: '🧂', indispensable: false, portions: { 1: 'Al gusto', 2: 'Al gusto', 4: 'Al gusto' } },
    ],
    steps: [
      {
        stepNumber: 1,
        stepName: 'Preparar',
        fireLevel: 'medium',
        subSteps: [
          { subStepName: 'Sazonar pollo', notes: 'Condimenta bien.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
          { subStepName: 'Calentar sartén', notes: 'Precalienta antes de freír.', portions: { 1: 45, 2: 50, 4: 60 }, isTimer: true },
        ],
      },
      {
        stepNumber: 2,
        stepName: 'Freír',
        fireLevel: 'medium',
        subSteps: [
          { subStepName: 'Dorar primer lado', notes: 'Hasta sellar.', portions: { 1: 180, 2: 200, 4: 220 }, isTimer: true },
          { subStepName: 'Voltear y dorar', notes: 'Hasta crocante.', portions: { 1: 150, 2: 170, 4: 190 }, isTimer: true },
        ],
      },
    ],
  };
}

function buildCompoundGeneratedRecipe(): GeneratedRecipe {
  return {
    name: 'Tallarines rojos compuestos',
    icon: '🍝',
    ingredient: 'tallarines rojos',
    description: '6 pasos · 40 min aprox.',
    tip: 'Coordina salsa y pasta en paralelo.',
    portionLabels: { singular: 'plato', plural: 'platos' },
    ingredients: [
      { name: 'Tallarines', emoji: '🍝', indispensable: true, portions: { 1: '100 g', 2: '200 g', 4: '400 g' } },
      { name: 'Tomate', emoji: '🍅', indispensable: true, portions: { 1: '2', 2: '4', 4: '8' } },
      { name: 'Queso', emoji: '🧀', indispensable: false, portions: { 1: 'Al gusto', 2: 'Al gusto', 4: 'Al gusto' } },
    ],
    steps: [
      {
        stepNumber: 1,
        stepName: 'Preparar salsa',
        fireLevel: 'medium',
        subSteps: [
          { subStepName: 'Sofríe cebolla para la salsa', notes: 'Reserva por separado.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
          { subStepName: 'Reducir salsa de tomate', notes: 'Mientras tanto avanza con la pasta.', portions: { 1: 480, 2: 540, 4: 600 }, isTimer: true },
        ],
      },
      {
        stepNumber: 2,
        stepName: 'Cocer pasta',
        fireLevel: 'high',
        subSteps: [
          { subStepName: 'Hervir agua para pasta', notes: 'En otra olla.', portions: { 1: 420, 2: 480, 4: 540 }, isTimer: true },
          { subStepName: 'Escurrir tallarines', notes: 'Reserva un poco del agua.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
        ],
      },
    ],
  };
}

function buildContextDraft(prompt: string, servings = 2): AIRecipeContextDraft {
  return {
    prompt,
    servings,
    availableIngredients: [{ id: 'avail-1', value: 'Tomate' }],
    avoidIngredients: [{ id: 'avoid-1', value: 'Apio' }],
  };
}

type RecordedCall = {
  table: string;
  method: string;
  payload?: unknown;
  options?: unknown;
  filter?: { column: string; value: unknown };
};

function createSupabaseClientMock(config?: {
  recipeUpserts?: Array<{ error: { message?: string; details?: string; code?: string } | null }>;
  configUpserts?: Array<{ error: { message?: string; details?: string; code?: string } | null }>;
  insertGenerationId?: string;
}): { client: any; calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const recipeUpserts = [...(config?.recipeUpserts ?? [{ error: null }])];
  const configUpserts = [...(config?.configUpserts ?? [{ error: null }])];

  const client = {
    from(table: string) {
      return {
        insert(payload: unknown) {
          calls.push({ table, method: 'insert', payload });
          if (table === 'ai_recipe_generations') {
            return {
              select() {
                return {
                  async single() {
                    return { data: { id: config?.insertGenerationId ?? 'gen-1' } };
                  },
                };
              },
            };
          }
          return Promise.resolve({ error: null });
        },
        update(payload: unknown) {
          calls.push({ table, method: 'update', payload });
          return {
            async eq(column: string, value: unknown) {
              calls.push({ table, method: 'update.eq', filter: { column, value } });
              return { error: null };
            },
          };
        },
        async upsert(payload: unknown, options?: unknown) {
          calls.push({ table, method: 'upsert', payload, options });
          if (table === 'recipes') {
            return recipeUpserts.shift() ?? { error: null };
          }
          if (table === 'user_recipe_cooking_configs') {
            return configUpserts.shift() ?? { error: null };
          }
          return { error: null };
        },
        delete() {
          calls.push({ table, method: 'delete' });
          return {
            async eq(column: string, value: unknown) {
              calls.push({ table, method: 'delete.eq', filter: { column, value } });
              return { error: null };
            },
          };
        },
      };
    },
  };

  return { client, calls };
}

test('prepareGeneratedAIRecipeArtifacts keeps standard recipes private and runtime-ready', () => {
  const prepared = prepareGeneratedAIRecipeArtifacts({
    generatedRecipe: buildStandardGeneratedRecipe(),
    availableRecipes: [],
    recipeContentById: {},
    aiUserId: 'user-12345678',
    contextDraft: buildContextDraft('Quiero preparar una milanesa crocante para 2 personas.'),
    selectedSeed: null,
    suggestedTitle: 'Milanesa crocante casera',
    clarifiedSizing: null,
    clarifiedPeopleCount: 2,
    canUseCompoundRecipes: true,
  });

  assert.equal(prepared.recipe.categoryId, 'personalizadas');
  assert.equal(prepared.recipe.visibility, 'private');
  assert.equal(prepared.recipe.ownerUserId, 'user-12345678');
  assert.equal(prepared.recipe.experience, undefined);
  assert.equal(prepared.content.compoundMeta, undefined);
  assert.equal(prepared.initialConfig.quantityMode, 'people');
  assert.equal(prepared.initialConfig.peopleCount, 2);
  assert.equal(prepared.initialConfig.selectedOptionalIngredients.includes('sal'), true);
  assert.equal(prepared.nextRuntime.isCompound, false);
  assert.equal(prepared.nextRuntime.quantityMode, 'people');
  assert.equal(Object.keys(prepared.nextIngredientSelection).length, prepared.content.ingredients.length);
  assert.equal(prepared.initialConfig.sourceContextSummary?.availableIngredients?.[0], 'Tomate');
});

test('prepareGeneratedAIRecipeArtifacts classifies parallel payloads as compound', () => {
  const prepared = prepareGeneratedAIRecipeArtifacts({
    generatedRecipe: buildCompoundGeneratedRecipe(),
    availableRecipes: [],
    recipeContentById: {},
    aiUserId: 'user-12345678',
    contextDraft: buildContextDraft('Quiero tallarines rojos rendidores.', 4),
    selectedSeed: null,
    suggestedTitle: null,
    clarifiedSizing: { quantityMode: 'have', count: 600, amountUnit: 'grams' },
    clarifiedPeopleCount: 4,
    canUseCompoundRecipes: true,
  });

  assert.equal(prepared.recipe.experience, 'compound');
  assert.ok(prepared.content.compoundMeta);
  assert.equal(prepared.content.compoundMeta?.components.length, 2);
  assert.equal(prepared.recipeV2.experience, 'compound');
  assert.ok(prepared.recipeV2.compoundMeta);
  assert.equal(prepared.nextRuntime.isCompound, true);
  assert.equal(prepared.initialConfig.quantityMode, 'have');
  assert.equal(prepared.initialConfig.amountUnit, 'grams');
  assert.equal(prepared.initialConfig.availableCount, 600);
  assert.equal(prepared.initialConfig.targetYield.type, 'weight');
});

test('prepareGeneratedAIRecipeArtifacts reuses an equivalent private recipe id instead of duplicating', () => {
  const existingRecipe: Recipe = {
    id: 'existing-ai-recipe',
    categoryId: 'personalizadas',
    name: 'Milanesa crocante de pollo',
    icon: '🍗',
    ingredient: 'milanesas',
    description: 'Receta previa',
    ownerUserId: 'user-12345678',
    visibility: 'private',
    createdAt: '2026-03-10T10:00:00.000Z',
  };
  const existingContent: RecipeContent = {
    ingredients: buildStandardGeneratedRecipe().ingredients,
    steps: buildStandardGeneratedRecipe().steps,
    tip: buildStandardGeneratedRecipe().tip,
    portionLabels: { singular: 'milanesa', plural: 'milanesas' },
    baseServings: 2,
  };

  const prepared = prepareGeneratedAIRecipeArtifacts({
    generatedRecipe: buildStandardGeneratedRecipe(),
    availableRecipes: [existingRecipe],
    recipeContentById: { [existingRecipe.id]: existingContent },
    aiUserId: 'user-12345678',
    contextDraft: buildContextDraft('Quiero preparar una milanesa crocante.', 2),
    selectedSeed: null,
    suggestedTitle: null,
    clarifiedSizing: null,
    clarifiedPeopleCount: 2,
    canUseCompoundRecipes: true,
  });

  assert.equal(prepared.recipe.id, existingRecipe.id);
  assert.equal(prepared.existingEquivalentRecipe?.id, existingRecipe.id);
  assert.equal(prepared.recipe.createdAt, existingRecipe.createdAt);
});

test('assertGeneratedRecipePayload rejects invalid payloads from AI', () => {
  assert.throws(() => assertGeneratedRecipePayload(null), /respuesta inválida/i);
  assert.throws(() => assertGeneratedRecipePayload({}), /respuesta inválida/i);
  assert.throws(() => assertGeneratedRecipePayload({ recipe: null }), /receta inválida/i);
});

test('persistPreparedAIRecipeWithFallback persists recipe, content, config and generation log', async () => {
  const prepared = prepareGeneratedAIRecipeArtifacts({
    generatedRecipe: buildStandardGeneratedRecipe(),
    availableRecipes: [],
    recipeContentById: {},
    aiUserId: 'user-12345678',
    contextDraft: buildContextDraft('Quiero preparar una milanesa crocante.', 2),
    selectedSeed: null,
    suggestedTitle: null,
    clarifiedSizing: null,
    clarifiedPeopleCount: 2,
    canUseCompoundRecipes: true,
  });
  const { client, calls } = createSupabaseClientMock();
  const trackedEvents: Array<{ userId: string; eventName: string; payload: Record<string, unknown> }> = [];
  const defaultListAdds: string[] = [];

  await persistPreparedAIRecipeWithFallback({
    prepared,
    prompt: 'prompt final',
    source: 'real',
    aiUserId: 'user-12345678',
    isSupabaseEnabled: true,
    supabaseClient: client,
    canUseCompoundRecipes: true,
    canUseUserRecipeConfigs: true,
    disableUserRecipeConfigsForSession: () => assert.fail('should not disable config feature'),
    disableCompoundRecipesForSession: () => assert.fail('should not disable compound feature'),
    addRecipeToDefaultList: async (recipeId) => { defaultListAdds.push(recipeId); },
    trackProductEvent: async (userId, eventName, payload) => { trackedEvents.push({ userId, eventName, payload }); },
  });

  const recipeUpsert = calls.find((call) => call.table === 'recipes' && call.method === 'upsert');
  assert.ok(recipeUpsert);
  assert.equal((recipeUpsert?.payload as Record<string, unknown>).source, 'ai');
  assert.equal((recipeUpsert?.payload as Record<string, unknown>).owner_user_id, 'user-12345678');
  assert.equal((recipeUpsert?.payload as Record<string, unknown>).visibility, 'private');
  assert.ok('ingredients_json' in (recipeUpsert?.payload as Record<string, unknown>));
  const configUpsert = calls.find((call) => call.table === 'user_recipe_cooking_configs' && call.method === 'upsert');
  assert.ok(configUpsert);
  assert.equal((configUpsert?.payload as Record<string, unknown>).quantity_mode, 'people');
  assert.ok('target_yield' in (configUpsert?.payload as Record<string, unknown>));
  assert.ok('source_context_summary' in (configUpsert?.payload as Record<string, unknown>));
  assert.equal(defaultListAdds[0], prepared.recipe.id);
  assert.deepEqual(trackedEvents[0], {
    userId: 'user-12345678',
    eventName: 'ai_recipe_created_private',
    payload: { recipeId: prepared.recipe.id },
  });
  assert.ok(calls.some((call) => call.table === 'recipe_ingredients' && call.method === 'insert'));
  assert.ok(calls.some((call) => call.table === 'recipe_substeps' && call.method === 'insert'));
  assert.ok(calls.some((call) => call.table === 'ai_recipe_generations' && call.method === 'update'));
});

test('persistPreparedAIRecipeWithFallback retries recipes upsert without V2 columns when production schema is legacy', async () => {
  const prepared = prepareGeneratedAIRecipeArtifacts({
    generatedRecipe: buildStandardGeneratedRecipe(),
    availableRecipes: [],
    recipeContentById: {},
    aiUserId: 'user-12345678',
    contextDraft: buildContextDraft('Quiero preparar una milanesa crocante.', 2),
    selectedSeed: null,
    suggestedTitle: null,
    clarifiedSizing: null,
    clarifiedPeopleCount: 2,
    canUseCompoundRecipes: true,
  });
  const { client, calls } = createSupabaseClientMock({
    recipeUpserts: [
      { error: { code: '42703', message: 'column ingredients_json does not exist' } },
      { error: null },
    ],
  });

  await persistPreparedAIRecipeWithFallback({
    prepared,
    prompt: 'prompt final',
    source: 'real',
    aiUserId: 'user-12345678',
    isSupabaseEnabled: true,
    supabaseClient: client,
    canUseCompoundRecipes: true,
    canUseUserRecipeConfigs: true,
    disableUserRecipeConfigsForSession: () => assert.fail('should not disable config feature'),
    disableCompoundRecipesForSession: () => assert.fail('should not disable compound feature'),
  });

  const recipeUpserts = calls.filter((call) => call.table === 'recipes' && call.method === 'upsert');
  assert.equal(recipeUpserts.length, 2);
  assert.equal('ingredients_json' in (recipeUpserts[0].payload as Record<string, unknown>), true);
  assert.equal('ingredients_json' in (recipeUpserts[1].payload as Record<string, unknown>), false);
});

test('persistPreparedAIRecipeWithFallback disables user recipe configs only for missing table errors', async () => {
  const prepared = prepareGeneratedAIRecipeArtifacts({
    generatedRecipe: buildStandardGeneratedRecipe(),
    availableRecipes: [],
    recipeContentById: {},
    aiUserId: 'user-12345678',
    contextDraft: buildContextDraft('Quiero preparar una milanesa crocante.', 2),
    selectedSeed: null,
    suggestedTitle: null,
    clarifiedSizing: null,
    clarifiedPeopleCount: 2,
    canUseCompoundRecipes: true,
  });
  const { client } = createSupabaseClientMock({
    configUpserts: [{ error: { code: 'PGRST205', message: 'Could not find the table user_recipe_cooking_configs' } }],
  });
  let disabled = false;

  await persistPreparedAIRecipeWithFallback({
    prepared,
    prompt: 'prompt final',
    source: 'real',
    aiUserId: 'user-12345678',
    isSupabaseEnabled: true,
    supabaseClient: client,
    canUseCompoundRecipes: true,
    canUseUserRecipeConfigs: true,
    disableUserRecipeConfigsForSession: () => { disabled = true; },
    disableCompoundRecipesForSession: () => assert.fail('should not disable compound feature'),
  });

  assert.equal(disabled, true);
});

test('persistPreparedAIRecipeWithFallback retries without compound metadata when production is missing compound columns', async () => {
  const prepared = prepareGeneratedAIRecipeArtifacts({
    generatedRecipe: buildCompoundGeneratedRecipe(),
    availableRecipes: [],
    recipeContentById: {},
    aiUserId: 'user-12345678',
    contextDraft: buildContextDraft('Quiero tallarines rojos.', 4),
    selectedSeed: null,
    suggestedTitle: null,
    clarifiedSizing: null,
    clarifiedPeopleCount: 4,
    canUseCompoundRecipes: true,
  });
  const { client, calls } = createSupabaseClientMock({
    recipeUpserts: [
      { error: { code: '42703', message: 'column experience does not exist' } },
      { error: null },
    ],
  });
  let compoundDisabled = false;

  const persisted = await persistPreparedAIRecipeWithFallback({
    prepared,
    prompt: 'prompt final',
    source: 'real',
    aiUserId: 'user-12345678',
    isSupabaseEnabled: true,
    supabaseClient: client,
    canUseCompoundRecipes: true,
    canUseUserRecipeConfigs: true,
    disableUserRecipeConfigsForSession: () => assert.fail('should not disable config feature'),
    disableCompoundRecipesForSession: () => { compoundDisabled = true; },
  });

  assert.equal(compoundDisabled, true);
  assert.equal(persisted.recipe.experience, 'compound');
  assert.ok(persisted.content.compoundMeta);
  assert.equal(persisted.usedCompoundPersistenceFallback, true);
  const recipeUpserts = calls.filter((call) => call.table === 'recipes' && call.method === 'upsert');
  assert.equal(recipeUpserts.length, 2);
  assert.equal('experience' in (recipeUpserts[1].payload as Record<string, unknown>), false);
});

test('persistPreparedAIRecipeWithFallback surfaces a friendly error when persistence fails', async () => {
  const prepared = prepareGeneratedAIRecipeArtifacts({
    generatedRecipe: buildStandardGeneratedRecipe(),
    availableRecipes: [],
    recipeContentById: {},
    aiUserId: 'user-12345678',
    contextDraft: buildContextDraft('Quiero preparar una milanesa crocante.', 2),
    selectedSeed: null,
    suggestedTitle: null,
    clarifiedSizing: null,
    clarifiedPeopleCount: 2,
    canUseCompoundRecipes: true,
  });
  const { client } = createSupabaseClientMock({
    recipeUpserts: [{ error: { message: 'violates foreign key constraint' } }],
  });

  await assert.rejects(
    () => persistPreparedAIRecipeWithFallback({
      prepared,
      prompt: 'prompt final',
      source: 'real',
      aiUserId: 'user-12345678',
      isSupabaseEnabled: true,
      supabaseClient: client,
      canUseCompoundRecipes: true,
      canUseUserRecipeConfigs: true,
      disableUserRecipeConfigsForSession: () => undefined,
      disableCompoundRecipesForSession: () => undefined,
    }),
    /No se pudo guardar la receta generada en tu biblioteca/i,
  );
});
