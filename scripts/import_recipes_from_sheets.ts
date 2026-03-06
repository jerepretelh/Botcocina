import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { recipeCategories } from '../src/app/data/recipes';

type Row = Record<string, string>;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

function optionalEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < csv.length; i += 1) {
    const ch = csv[i];
    const next = csv[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && ch === ',') {
      row.push(cell);
      cell = '';
      continue;
    }
    if (!inQuotes && (ch === '\n' || ch === '\r')) {
      if (ch === '\r' && next === '\n') i += 1;
      row.push(cell);
      if (row.some((v) => v.trim().length > 0)) rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    cell += ch;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((v) => v.trim().length > 0)) rows.push(row);
  }

  return rows;
}

function toRows(csv: string): Row[] {
  const data = parseCsv(csv);
  if (data.length < 2) return [];
  const headers = data[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, '').replace(/_/g, ''));
  return data.slice(1).map((cells) => {
    const row: Row = {};
    for (let i = 0; i < headers.length; i += 1) row[headers[i]] = (cells[i] ?? '').trim();
    return row;
  });
}

type SingleSheetRecipe = {
  id: string;
  categoryId: string;
  name: string;
  icon: string;
  emoji?: string;
  ingredient: string;
  description: string;
  equipment?: string;
  tip?: string;
  portionLabelSingular?: string;
  portionLabelPlural?: string;
  ingredientsJson: string;
  stepsJson: string;
};

function toCsvUrl(sheetId: string, gid: string): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

function toTimerValue(value: string): string {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? String(Math.round(n)) : '30';
}

function toSubstepOrder(stepNumber: number, subStepIndex: number): number {
  return stepNumber * 100 + subStepIndex + 1;
}

async function run(): Promise<void> {
  const supabaseUrl = requiredEnv('SUPABASE_URL');
  const serviceRole = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  const sheetId = requiredEnv('GOOGLE_SHEETS_RECIPES_SHEET_ID');
  const recipesGid = optionalEnv('GOOGLE_SHEETS_RECIPES_RECIPES_GID') ?? '0';
  const ingredientsGid = optionalEnv('GOOGLE_SHEETS_RECIPES_INGREDIENTS_GID');
  const substepsGid = optionalEnv('GOOGLE_SHEETS_RECIPES_SUBSTEPS_GID');

  const sb = createClient(supabaseUrl, serviceRole);
  const runStart = new Date().toISOString();

  const importRunRes = await sb.from('import_runs').insert({
    source: 'google_sheets',
    status: 'running',
    started_at: runStart,
  }).select('id').single();
  if (importRunRes.error || !importRunRes.data) {
    throw new Error(`Cannot create import run: ${importRunRes.error?.message ?? 'unknown'}`);
  }
  const importRunId = importRunRes.data.id as string;

  try {
    const [recipesCsv, ingredientsCsv, substepsCsv] = await Promise.all([
      fetch(toCsvUrl(sheetId, recipesGid)).then((r) => r.text()),
      ingredientsGid
        ? fetch(toCsvUrl(sheetId, ingredientsGid)).then((r) => r.text())
        : fetch(toCsvUrl(sheetId, recipesGid)).then((r) => r.text()),
      substepsGid
        ? fetch(toCsvUrl(sheetId, substepsGid)).then((r) => r.text())
        : fetch(toCsvUrl(sheetId, recipesGid)).then((r) => r.text()),
    ]);

    let recipesRows = toRows(recipesCsv).filter((r) => r.id && r.categoryid && r.name);
    let ingredientsRows = toRows(ingredientsCsv).filter((r) => r.recipeid && r.name);
    let substepsRows = toRows(substepsCsv).filter((r) => r.recipeid && r.substeporder && r.substepname);

    if (recipesRows.length > 0 && recipesRows[0].ingredientsjson && recipesRows[0].stepsjson) {
      const singles = recipesRows as unknown as SingleSheetRecipe[];
      const normalizedIngredients: Row[] = [];
      const normalizedSubsteps: Row[] = [];

      for (const single of singles) {
        let parsedIngredients: Array<{ name: string; emoji?: string; indispensable?: boolean; portions: { 1: string; 2: string; 4: string } }> = [];
        let parsedSteps: Array<{
          stepNumber: number;
          stepName: string;
          fireLevel?: string;
          equipment?: string;
          subSteps: Array<{ subStepName: string; notes?: string; isTimer: boolean; portions: { 1: number | string; 2: number | string; 4: number | string } }>;
        }> = [];

        try {
          parsedIngredients = JSON.parse(single.ingredientsJson || '[]');
        } catch {
          parsedIngredients = [];
        }
        try {
          parsedSteps = JSON.parse(single.stepsJson || '[]');
        } catch {
          parsedSteps = [];
        }

        for (const ingredient of parsedIngredients) {
          normalizedIngredients.push({
            recipeid: single.id,
            name: ingredient.name,
            emoji: ingredient.emoji || '🍽️',
            indispensable: ingredient.indispensable ? 'true' : 'false',
            p1: ingredient.portions[1] || 'Al gusto',
            p2: ingredient.portions[2] || ingredient.portions[1] || 'Al gusto',
            p4: ingredient.portions[4] || ingredient.portions[2] || ingredient.portions[1] || 'Al gusto',
          });
        }

        for (const step of parsedSteps) {
          const subSteps = Array.isArray(step.subSteps) ? step.subSteps : [];
          for (let i = 0; i < subSteps.length; i += 1) {
            const sub = subSteps[i];
            normalizedSubsteps.push({
              recipeid: single.id,
              substeporder: String(toSubstepOrder(step.stepNumber ?? 1, i)),
              stepnumber: String(step.stepNumber ?? 1),
              stepname: step.stepName || sub.subStepName,
              substepname: sub.subStepName,
              notes: sub.notes || '',
              istimer: sub.isTimer ? 'true' : 'false',
              p1: String(sub.portions[1] ?? (sub.isTimer ? 30 : 'Continuar')),
              p2: String(sub.portions[2] ?? sub.portions[1] ?? (sub.isTimer ? 45 : 'Continuar')),
              p4: String(sub.portions[4] ?? sub.portions[2] ?? sub.portions[1] ?? (sub.isTimer ? 60 : 'Continuar')),
              firelevel: step.fireLevel || '',
              equipment: step.equipment || single.equipment || '',
            });
          }
        }
      }

      recipesRows = recipesRows.map((r) => ({
        id: r.id,
        categoryid: r.categoryid || r.categoryId,
        name: r.name,
        icon: r.icon || '🍽️',
        emoji: r.emoji || r.icon || '🍽️',
        ingredient: r.ingredient || 'Porciones',
        description: r.description || 'Receta',
        equipment: r.equipment || '',
        tip: r.tip || 'Ten todo listo antes de empezar.',
        portionlabelsingular: r.portionlabelsingular || r.portionLabelSingular || 'porción',
        portionlabelplural: r.portionlabelplural || r.portionLabelPlural || 'porciones',
      }));
      ingredientsRows = normalizedIngredients;
      substepsRows = normalizedSubsteps;
    }

    const categoryRows = recipeCategories.map((c, idx) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      description: c.description,
      sort_order: idx + 1,
    }));
    const upsertCategories = await sb.from('recipe_categories').upsert(categoryRows, { onConflict: 'id' });
    if (upsertCategories.error) throw new Error(upsertCategories.error.message);

    const recipesPayload = recipesRows.map((r) => ({
      id: r.id,
      category_id: r.categoryid,
      name: r.name,
      icon: r.icon || '🍽️',
      emoji: r.emoji || r.icon || '🍽️',
      ingredient: r.ingredient || 'Porciones',
      description: r.description || 'Receta',
      equipment: r.equipment || null,
      tip: r.tip || 'Ten todo listo antes de empezar.',
      portion_label_singular: r.portionlabelsingular || 'porción',
      portion_label_plural: r.portionlabelplural || 'porciones',
      source: 'imported',
      is_published: true,
      updated_at: new Date().toISOString(),
    }));

    if (recipesPayload.length === 0) {
      throw new Error('No valid recipes rows found.');
    }

    const upsertRecipes = await sb.from('recipes').upsert(recipesPayload, { onConflict: 'id' });
    if (upsertRecipes.error) throw new Error(upsertRecipes.error.message);

    const recipeIds = recipesPayload.map((r) => r.id);
    await sb.from('recipe_ingredients').delete().in('recipe_id', recipeIds);
    await sb.from('recipe_substeps').delete().in('recipe_id', recipeIds);

    const ingredientsPayload = ingredientsRows
      .filter((r) => recipeIds.includes(r.recipeid))
      .map((r, idx) => ({
        recipe_id: r.recipeid,
        sort_order: idx + 1,
        name: r.name,
        emoji: r.emoji || '🍽️',
        indispensable: ['true', '1', 'si', 'sí'].includes((r.indispensable || '').toLowerCase()),
        p1: r.p1 || 'Al gusto',
        p2: r.p2 || r.p1 || 'Al gusto',
        p4: r.p4 || r.p2 || r.p1 || 'Al gusto',
      }));
    if (ingredientsPayload.length > 0) {
      const insertIngredients = await sb.from('recipe_ingredients').insert(ingredientsPayload);
      if (insertIngredients.error) throw new Error(insertIngredients.error.message);
    }

    const substepsPayload = substepsRows
      .filter((r) => recipeIds.includes(r.recipeid))
      .map((r) => {
        const isTimer = ['true', '1', 'si', 'sí'].includes((r.istimer || '').toLowerCase());
        return {
          recipe_id: r.recipeid,
          substep_order: Number(r.substeporder),
          step_number: r.stepnumber ? Number(r.stepnumber) : null,
          step_name: r.stepname || null,
          substep_name: r.substepname,
          notes: r.notes || '',
          is_timer: isTimer,
          p1: isTimer ? toTimerValue(r.p1) : (r.p1 || 'Continuar'),
          p2: isTimer ? toTimerValue(r.p2) : (r.p2 || r.p1 || 'Continuar'),
          p4: isTimer ? toTimerValue(r.p4) : (r.p4 || r.p2 || r.p1 || 'Continuar'),
          fire_level: r.firelevel || null,
          equipment: r.equipment || null,
          updated_at: new Date().toISOString(),
        };
      })
      .filter((row) => Number.isFinite(row.substep_order));

    if (substepsPayload.length === 0) {
      throw new Error('No valid substeps rows found.');
    }
    const insertSubsteps = await sb.from('recipe_substeps').insert(substepsPayload);
    if (insertSubsteps.error) throw new Error(insertSubsteps.error.message);

    const completion = await sb.from('import_runs').update({
      status: 'success',
      rows_read: recipesRows.length + ingredientsRows.length + substepsRows.length,
      rows_inserted: recipesPayload.length + ingredientsPayload.length + substepsPayload.length,
      rows_updated: recipesPayload.length,
      error_count: 0,
      finished_at: new Date().toISOString(),
    }).eq('id', importRunId);
    if (completion.error) throw new Error(completion.error.message);

    console.log(`Import success. recipes=${recipesPayload.length} ingredients=${ingredientsPayload.length} substeps=${substepsPayload.length}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown import error';
    await sb.from('import_runs').update({
      status: 'failed',
      error_count: 1,
      errors: { message },
      finished_at: new Date().toISOString(),
    }).eq('id', importRunId);
    throw error;
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
