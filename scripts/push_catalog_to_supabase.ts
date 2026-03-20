import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import type { RecipeContent } from '../src/types';
import { printCatalogValidation, validateCatalogData } from './catalogValidation';
import { buildPublicationCatalog } from './catalogPublication';

const OPTIONAL_RECIPE_COLUMNS = [
  'owner_user_id',
  'visibility',
  'experience',
  'compound_meta',
  'base_yield_type',
  'base_yield_value',
  'base_yield_unit',
  'base_yield_label',
  'ingredients_json',
  'steps_json',
  'time_summary_json',
] as const;

type OptionalRecipeColumn = (typeof OPTIONAL_RECIPE_COLUMNS)[number];

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Falta ${name}`);
  }
  return value;
}

async function detectSupportedRecipeColumns(client: ReturnType<typeof createClient>) {
  const supported = new Set<OptionalRecipeColumn>();

  for (const column of OPTIONAL_RECIPE_COLUMNS) {
    const response = await client.from('recipes').select(column).limit(1);
    if (!response.error) {
      supported.add(column);
      continue;
    }

    if (response.error.code !== 'PGRST204' && response.error.code !== '42703') {
      throw response.error;
    }
  }

  return supported;
}

async function main() {
  const validation = validateCatalogData();
  printCatalogValidation(validation);
  if (!validation.ok) {
    throw new Error('Catálogo inválido. Corrige errores antes de publicar.');
  }

  const publicationCatalog = buildPublicationCatalog();

  const supabaseUrl = requiredEnv('SUPABASE_URL');
  const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const supportedRecipeColumns = await detectSupportedRecipeColumns(client);
  const missingRecipeColumns = OPTIONAL_RECIPE_COLUMNS.filter((column) => !supportedRecipeColumns.has(column));

  if (missingRecipeColumns.length > 0) {
    console.warn(`[catalog] recipes schema incompleto en destino. Se publicará en modo legacy-compatible. Faltan: ${missingRecipeColumns.join(', ')}`);
  }

  const managedRecipeIds = publicationCatalog.entries.map(({ recipe }) => recipe.id);

  const categoriesPayload = publicationCatalog.categories.map((category, index) => ({
    id: category.id,
    name: category.name,
    icon: category.icon,
    description: category.description,
    sort_order: index,
  }));

  const recipesPayload = publicationCatalog.entries.map(({ recipe, content, persistence }) => {
    const payload: Record<string, unknown> = {
      id: recipe.id,
      category_id: recipe.categoryId,
      name: recipe.name,
      icon: recipe.icon,
      emoji: recipe.emoji ?? recipe.icon,
      ingredient: recipe.ingredient,
      description: recipe.description,
      equipment: recipe.equipment ?? null,
      tip: content?.tip ?? 'Ten todo listo antes de empezar.',
      portion_label_singular: content?.portionLabels?.singular ?? 'porción',
      portion_label_plural: content?.portionLabels?.plural ?? 'porciones',
      source: 'imported',
      is_published: true,
    };

    if (supportedRecipeColumns.has('owner_user_id')) payload.owner_user_id = null;
    if (supportedRecipeColumns.has('visibility')) payload.visibility = 'public';
    if (supportedRecipeColumns.has('experience')) payload.experience = recipe.experience ?? 'standard';
    if (supportedRecipeColumns.has('compound_meta')) payload.compound_meta = content?.compoundMeta ?? null;
    if (supportedRecipeColumns.has('base_yield_type')) payload.base_yield_type = persistence?.base_yield_type ?? null;
    if (supportedRecipeColumns.has('base_yield_value')) payload.base_yield_value = persistence?.base_yield_value ?? null;
    if (supportedRecipeColumns.has('base_yield_unit')) payload.base_yield_unit = persistence?.base_yield_unit ?? null;
    if (supportedRecipeColumns.has('base_yield_label')) payload.base_yield_label = persistence?.base_yield_label ?? null;
    if (supportedRecipeColumns.has('ingredients_json')) payload.ingredients_json = persistence?.ingredients_json ?? null;
    if (supportedRecipeColumns.has('steps_json')) payload.steps_json = persistence?.steps_json ?? null;
    if (supportedRecipeColumns.has('time_summary_json')) payload.time_summary_json = persistence?.time_summary_json ?? null;

    return payload;
  });

  const ingredientsPayload: Array<{
    recipe_id: string;
    sort_order: number;
    name: string;
    emoji: string;
    indispensable: boolean;
    p1: string;
    p2: string;
    p4: string;
  }> = [];

  const substepsPayload: Array<{
    recipe_id: string;
    substep_order: number;
    step_number: number;
    step_name: string;
    substep_name: string;
    notes: string;
    is_timer: boolean;
    p1: string;
    p2: string;
    p4: string;
    fire_level: 'low' | 'medium' | 'high' | null;
    equipment: 'stove' | 'airfryer' | 'oven' | null;
  }> = [];

  publicationCatalog.entries.forEach(({ recipe, content }) => {
    const safeContent: RecipeContent | undefined = content;
    if (!safeContent) return;

    safeContent.ingredients.forEach((ingredient, index) => {
      ingredientsPayload.push({
        recipe_id: recipe.id,
        sort_order: index,
        name: ingredient.name,
        emoji: ingredient.emoji,
        indispensable: Boolean(ingredient.indispensable),
        p1: String(ingredient.portions[1]),
        p2: String(ingredient.portions[2]),
        p4: String(ingredient.portions[4]),
      });
    });

    let substepOrder = 1;
    safeContent.steps.forEach((step) => {
      step.subSteps.forEach((subStep) => {
        substepsPayload.push({
          recipe_id: recipe.id,
          substep_order: substepOrder,
          step_number: step.stepNumber,
          step_name: step.stepName,
          substep_name: subStep.subStepName,
          notes: subStep.notes ?? '',
          is_timer: Boolean(subStep.isTimer),
          p1: String(subStep.portions[1]),
          p2: String(subStep.portions[2]),
          p4: String(subStep.portions[4]),
          fire_level: step.fireLevel ?? null,
          equipment: step.equipment ?? null,
        });
        substepOrder += 1;
      });
    });
  });

  const categoriesRes = await client.from('recipe_categories').upsert(categoriesPayload, { onConflict: 'id' });
  if (categoriesRes.error) throw categoriesRes.error;

  const recipesRes = await client.from('recipes').upsert(recipesPayload, { onConflict: 'id' });
  if (recipesRes.error) throw recipesRes.error;

  const delIngredientsRes = await client.from('recipe_ingredients').delete().in('recipe_id', managedRecipeIds);
  if (delIngredientsRes.error) throw delIngredientsRes.error;

  const delSubstepsRes = await client.from('recipe_substeps').delete().in('recipe_id', managedRecipeIds);
  if (delSubstepsRes.error) throw delSubstepsRes.error;

  const ingredientsRes = await client.from('recipe_ingredients').insert(ingredientsPayload);
  if (ingredientsRes.error) throw ingredientsRes.error;

  const substepsRes = await client.from('recipe_substeps').insert(substepsPayload);
  if (substepsRes.error) throw substepsRes.error;

  const [recipesCountRes, ingredientsCountRes, substepsCountRes] = await Promise.all([
    client.from('recipes').select('id', { count: 'exact', head: true }).in('id', managedRecipeIds),
    client.from('recipe_ingredients').select('id', { count: 'exact', head: true }).in('recipe_id', managedRecipeIds),
    client.from('recipe_substeps').select('id', { count: 'exact', head: true }).in('recipe_id', managedRecipeIds),
  ]);

  if (recipesCountRes.error) throw recipesCountRes.error;
  if (ingredientsCountRes.error) throw ingredientsCountRes.error;
  if (substepsCountRes.error) throw substepsCountRes.error;

  console.log(
    `[catalog] push ok: recipes=${recipesCountRes.count ?? 0} ingredients=${ingredientsCountRes.count ?? 0} substeps=${substepsCountRes.count ?? 0}`,
  );
}

main().catch((error) => {
  const message = error instanceof Error
    ? error.message
    : typeof error === 'object' && error !== null
      ? JSON.stringify(error, null, 2)
      : String(error);
  console.error(`[catalog] push failed: ${message}`);
  process.exit(1);
});
