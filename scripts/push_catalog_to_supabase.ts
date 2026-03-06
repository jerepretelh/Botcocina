import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { initialRecipeContent, recipeCategories, recipes } from '../src/app/data/recipes';
import { printCatalogValidation, validateCatalogData } from './catalogValidation';

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Falta ${name}`);
  }
  return value;
}

async function main() {
  const validation = validateCatalogData();
  printCatalogValidation(validation);
  if (!validation.ok) {
    throw new Error('Catálogo inválido. Corrige errores antes de publicar.');
  }

  const supabaseUrl = requiredEnv('SUPABASE_URL');
  const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const managedRecipeIds = recipes.map((recipe) => recipe.id);

  const categoriesPayload = recipeCategories.map((category, index) => ({
    id: category.id,
    name: category.name,
    icon: category.icon,
    description: category.description,
    sort_order: index,
  }));

  const recipesPayload = recipes.map((recipe) => {
    const content = initialRecipeContent[recipe.id];
    return {
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
      owner_user_id: null,
      visibility: 'public',
      is_published: true,
    };
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

  recipes.forEach((recipe) => {
    const content = initialRecipeContent[recipe.id];
    if (!content) return;

    content.ingredients.forEach((ingredient, index) => {
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
    content.steps.forEach((step) => {
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
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[catalog] push failed: ${message}`);
  process.exit(1);
});
