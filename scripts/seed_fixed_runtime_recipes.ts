import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { parseFixedRecipesJson } from '../src/app/features/fixed-runtime/loader';

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Falta ${name}`);
  }
  return value;
}

async function main() {
  const supabaseUrl = requiredEnv('SUPABASE_URL');
  const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  const jsonPath = resolve(process.cwd(), 'public/fixed-runtime/recipes.json');
  const rawJson = readFileSync(jsonPath, 'utf-8');
  const recipes = parseFixedRecipesJson(JSON.parse(rawJson));

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const payload = recipes.map((recipe) => ({
    slug: recipe.id,
    scope_key: 'global',
    title: recipe.title,
    recipe_json: recipe,
    source: 'seed',
    owner_user_id: null,
    is_active: true,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await client.from('fixed_recipes').upsert(payload, { onConflict: 'slug,scope_key' });
  if (error) {
    throw new Error(error.message || 'No se pudo sembrar fixed_recipes.');
  }

  const { count, error: countError } = await client
    .from('fixed_recipes')
    .select('id', { head: true, count: 'exact' })
    .eq('scope_key', 'global')
    .eq('is_active', true);
  if (countError) throw new Error(countError.message || 'No se pudo contar fixed_recipes.');

  console.log(`[fixed-runtime] seed ok: global_recipes=${count ?? 0}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[fixed-runtime] seed failed: ${message}`);
  process.exit(1);
});
