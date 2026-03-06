import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initialRecipeContent, recipeCategories, recipes } from '../src/app/data/recipes';
import { printCatalogValidation, validateCatalogData } from './catalogValidation';

const q = (value: unknown): string => {
  if (value === null || value === undefined) return 'null';
  const text = String(value).replace(/'/g, "''");
  return `'${text}'`;
};

const qb = (value: boolean): string => (value ? 'true' : 'false');

const validation = validateCatalogData();
printCatalogValidation(validation);
if (!validation.ok) {
  console.error('[catalog] seed abortado: corrige errores de catálogo antes de generar SQL.');
  process.exit(1);
}

const recipeIds = recipes.map((recipe) => recipe.id);

const lines: string[] = [];
lines.push('-- Auto-generated seed from src/app/data/recipes.ts');
lines.push('begin;');

if (recipeIds.length > 0) {
  const inList = recipeIds.map((id) => q(id)).join(', ');
  lines.push(`delete from public.recipe_ingredients where recipe_id in (${inList});`);
  lines.push(`delete from public.recipe_substeps where recipe_id in (${inList});`);
  lines.push(`delete from public.recipes where id in (${inList});`);
}

const categoryIds = recipeCategories.map((category) => category.id);
if (categoryIds.length > 0) {
  const inList = categoryIds.map((id) => q(id)).join(', ');
  lines.push(`delete from public.recipe_categories where id in (${inList});`);
}

for (const [index, category] of recipeCategories.entries()) {
  lines.push(
    `insert into public.recipe_categories (id, name, icon, description, sort_order) values (${q(category.id)}, ${q(category.name)}, ${q(category.icon)}, ${q(category.description)}, ${index}) ` +
      `on conflict (id) do update set name = excluded.name, icon = excluded.icon, description = excluded.description, sort_order = excluded.sort_order;`,
  );
}

for (const recipe of recipes) {
  const content = initialRecipeContent[recipe.id];
  const tip = content?.tip ?? 'Ten todo listo antes de empezar.';
  const singular = content?.portionLabels?.singular ?? 'porción';
  const plural = content?.portionLabels?.plural ?? 'porciones';

  lines.push(
    `insert into public.recipes (` +
      `id, category_id, name, icon, emoji, ingredient, description, equipment, tip, portion_label_singular, portion_label_plural, source, is_published` +
      `, owner_user_id, visibility` +
      `) values (` +
      `${q(recipe.id)}, ${q(recipe.categoryId)}, ${q(recipe.name)}, ${q(recipe.icon)}, ${q((recipe as { emoji?: string }).emoji ?? recipe.icon)}, ${q(recipe.ingredient)}, ${q(recipe.description)}, ${q((recipe as { equipment?: string }).equipment ?? null)}, ${q(tip)}, ${q(singular)}, ${q(plural)}, 'imported', true, null, 'public'` +
      `) on conflict (id) do update set ` +
      `category_id = excluded.category_id, name = excluded.name, icon = excluded.icon, emoji = excluded.emoji, ingredient = excluded.ingredient, description = excluded.description, equipment = excluded.equipment, tip = excluded.tip, portion_label_singular = excluded.portion_label_singular, portion_label_plural = excluded.portion_label_plural, source = excluded.source, is_published = excluded.is_published, owner_user_id = excluded.owner_user_id, visibility = excluded.visibility, updated_at = now();`,
  );

  if (!content) continue;

  content.ingredients.forEach((ingredient, idx) => {
    lines.push(
      `insert into public.recipe_ingredients (recipe_id, sort_order, name, emoji, indispensable, p1, p2, p4) values (` +
        `${q(recipe.id)}, ${idx}, ${q(ingredient.name)}, ${q(ingredient.emoji)}, ${qb(Boolean(ingredient.indispensable))}, ${q(ingredient.portions[1])}, ${q(ingredient.portions[2])}, ${q(ingredient.portions[4])}` +
        `);`,
    );
  });

  let substepOrder = 1;
  content.steps.forEach((step) => {
    step.subSteps.forEach((substep) => {
      lines.push(
        `insert into public.recipe_substeps (` +
          `recipe_id, substep_order, step_number, step_name, substep_name, notes, is_timer, p1, p2, p4, fire_level, equipment` +
          `) values (` +
          `${q(recipe.id)}, ${substepOrder}, ${step.stepNumber ?? 'null'}, ${q(step.stepName ?? null)}, ${q(substep.subStepName)}, ${q(substep.notes ?? '')}, ${qb(Boolean(substep.isTimer))}, ${q(substep.portions[1])}, ${q(substep.portions[2])}, ${q(substep.portions[4])}, ${q(step.fireLevel ?? null)}, ${q((step as { equipment?: string }).equipment ?? null)}` +
          `);`,
      );
      substepOrder += 1;
    });
  });
}

lines.push('commit;');
lines.push('');

const outPath = resolve(process.cwd(), 'supabase/migrations/20260305_seed_catalog_from_local_data.sql');
writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log(`Generated ${outPath}`);
console.log(`Categories: ${recipeCategories.length}, Recipes: ${recipes.length}`);
