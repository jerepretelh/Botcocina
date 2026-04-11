import type {
  FixedRecipeIngredientGroup,
  FixedRecipeIngredientItem,
  FixedRecipeJson,
  FixedRecipePhase,
  FixedRecipeStep,
  FixedRecipeStepIngredientRef,
} from './types';

const FIXED_RECIPES_JSON_PATH = '/fixed-runtime/recipes.json';
const RECIPE_CATEGORIES = new Set(['stovetop', 'baking', 'dessert', 'airfryer', 'beverage', 'other']);

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(value: string): string {
  return normalizeText(value).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function parseIngredientReference(
  raw: unknown,
  recipeId: string,
  phaseId: string,
  stepIndex: number,
): FixedRecipeStepIngredientRef {
  if (!isObject(raw)) {
    throw new Error(`Paso con ingrediente inválido en receta ${recipeId}, fase ${phaseId}, índice ${stepIndex}.`);
  }
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  const canonicalName = typeof raw.canonicalName === 'string' && raw.canonicalName.trim()
    ? raw.canonicalName.trim()
    : normalizeText(name);
  const shoppingKey = typeof raw.shoppingKey === 'string' && raw.shoppingKey.trim()
    ? raw.shoppingKey.trim()
    : slugify(canonicalName || name);
  const amount = raw.amount;
  const amountIsValid = (typeof amount === 'number' && Number.isFinite(amount) && amount > 0)
    || (typeof amount === 'string' && amount.trim().length > 0);
  const unit = typeof raw.unit === 'string' ? raw.unit.trim() : '';
  if (!name || !canonicalName || !amountIsValid || !unit) {
    throw new Error(`Paso con ingrediente incompleto en receta ${recipeId}, fase ${phaseId}, índice ${stepIndex}.`);
  }
  return {
    name,
    canonicalName,
    shoppingKey,
    amount: amount as number | string,
    unit,
    displayAmount: typeof raw.displayAmount === 'string' && raw.displayAmount.trim() ? raw.displayAmount.trim() : undefined,
    displayUnit: typeof raw.displayUnit === 'string' && raw.displayUnit.trim() ? raw.displayUnit.trim() : undefined,
    notes: typeof raw.notes === 'string' && raw.notes.trim() ? raw.notes.trim() : undefined,
    preparation: typeof raw.preparation === 'string' && raw.preparation.trim() ? raw.preparation.trim() : undefined,
    isFlexible: typeof raw.isFlexible === 'boolean' ? raw.isFlexible : undefined,
    isOptional: typeof raw.isOptional === 'boolean' ? raw.isOptional : undefined,
  };
}

function parseIngredientItem(raw: unknown, recipeId: string, groupIndex: number): FixedRecipeIngredientItem {
  if (typeof raw === 'string' && raw.trim()) {
    const name = raw.trim();
    const canonicalName = normalizeText(name);
    return {
      name,
      canonicalName,
      shoppingKey: slugify(canonicalName),
      amount: name,
      unit: 'texto',
      isFlexible: true,
    };
  }
  if (!isObject(raw)) {
    throw new Error(`Grupo con item inválido en receta ${recipeId}, índice ${groupIndex}.`);
  }
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  const canonicalName = typeof raw.canonicalName === 'string' && raw.canonicalName.trim()
    ? raw.canonicalName.trim()
    : normalizeText(name);
  const shoppingKey = typeof raw.shoppingKey === 'string' && raw.shoppingKey.trim()
    ? raw.shoppingKey.trim()
    : slugify(canonicalName || name);
  const amount = raw.amount;
  const amountIsValid = (typeof amount === 'number' && Number.isFinite(amount) && amount > 0)
    || (typeof amount === 'string' && amount.trim().length > 0);
  const unit = typeof raw.unit === 'string' ? raw.unit.trim() : '';
  if (!name || !canonicalName || !amountIsValid || !unit) {
    throw new Error(`Grupo con item inválido en receta ${recipeId}, índice ${groupIndex}.`);
  }
  return {
    name,
    canonicalName,
    shoppingKey,
    amount: amount as number | string,
    unit,
    displayAmount: typeof raw.displayAmount === 'string' && raw.displayAmount.trim() ? raw.displayAmount.trim() : undefined,
    displayUnit: typeof raw.displayUnit === 'string' && raw.displayUnit.trim() ? raw.displayUnit.trim() : undefined,
    notes: typeof raw.notes === 'string' && raw.notes.trim() ? raw.notes.trim() : undefined,
    preparation: typeof raw.preparation === 'string' && raw.preparation.trim() ? raw.preparation.trim() : undefined,
    isFlexible: typeof raw.isFlexible === 'boolean' ? raw.isFlexible : undefined,
    isOptional: typeof raw.isOptional === 'boolean' ? raw.isOptional : undefined,
    purchasable: typeof raw.purchasable === 'boolean' ? raw.purchasable : undefined,
  };
}

function parseStepTree(
  input: unknown,
  recipeId: string,
  phaseId: string,
  index: number,
  parentGroupTitle?: string,
  fallbackId?: string,
): FixedRecipeStep[] {
  if (!isObject(input)) {
    throw new Error(`Paso inválido en receta ${recipeId}, fase ${phaseId}, índice ${index}.`);
  }

  const id = input.id;
  const text = input.text;
  const title = input.title;
  const timer = input.timer;
  const timerSec = input.timerSec;
  const kind = input.kind;
  const result = input.result;
  const type = input.type;
  const container = input.container;
  const ingredients = input.ingredients;
  const substeps = input.substeps;
  const resolvedId = typeof id === 'string' && id.trim() ? id.trim() : (fallbackId ?? '');

  if (!resolvedId) {
    throw new Error(`Paso sin id válido en receta ${recipeId}, fase ${phaseId}, índice ${index}.`);
  }
  if (kind != null && kind !== 'action' && kind !== 'timer' && kind !== 'result' && kind !== 'group') {
    throw new Error(`Paso con kind inválido en receta ${recipeId}, fase ${phaseId}, índice ${index}.`);
  }
  if (kind === 'group') {
    if (typeof title !== 'string' || !title.trim()) {
      throw new Error(`Paso group sin title válido en receta ${recipeId}, fase ${phaseId}, índice ${index}.`);
    }
    if (!Array.isArray(substeps) || substeps.length === 0) {
      throw new Error(`Paso group sin substeps en receta ${recipeId}, fase ${phaseId}, índice ${index}.`);
    }
    const intro: FixedRecipeStep = {
      id: resolvedId,
      kind: 'action',
      text: title.trim(),
      groupId: resolvedId,
      groupTitle: title.trim(),
      groupPosition: 'header',
      groupSubstepCount: substeps.length,
    };
    const nested = substeps.flatMap((substep, subIndex) =>
      parseStepTree(substep, recipeId, phaseId, subIndex, title.trim(), `${resolvedId}-sub-${subIndex + 1}`));
    return [intro, ...nested];
  }
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error(`Paso sin texto válido en receta ${recipeId}, fase ${phaseId}, índice ${index}.`);
  }
  if (timer != null && (typeof timer !== 'number' || !Number.isFinite(timer) || timer <= 0)) {
    throw new Error(`Paso con timer inválido en receta ${recipeId}, fase ${phaseId}, índice ${index}.`);
  }
  if (timerSec != null && (typeof timerSec !== 'number' || !Number.isFinite(timerSec) || timerSec <= 0)) {
    throw new Error(`Paso con timerSec inválido en receta ${recipeId}, fase ${phaseId}, índice ${index}.`);
  }
  if (kind === 'timer' && timerSec == null && timer == null) {
    throw new Error(`Paso kind=timer sin timerSec/timer en receta ${recipeId}, fase ${phaseId}, índice ${index}.`);
  }
  if (kind === 'result' && (typeof result !== 'string' || !result.trim()) && type !== 'result') {
    throw new Error(`Paso kind=result sin result en receta ${recipeId}, fase ${phaseId}, índice ${index}.`);
  }
  if (type != null && type !== 'result') {
    throw new Error(`Paso con type inválido en receta ${recipeId}, fase ${phaseId}, índice ${index}.`);
  }
  if (container != null && (typeof container !== 'string' || !container.trim())) {
    throw new Error(`Paso con container inválido en receta ${recipeId}, fase ${phaseId}, índice ${index}.`);
  }
  if (ingredients != null && !Array.isArray(ingredients)) {
    throw new Error(`Paso con ingredients inválido en receta ${recipeId}, fase ${phaseId}, índice ${index}.`);
  }

  const parsedIngredients = Array.isArray(ingredients)
    ? ingredients.map((entry) => parseIngredientReference(entry, recipeId, phaseId, index))
    : undefined;

  return [{
    id: resolvedId,
    kind: kind === 'action' || kind === 'timer' || kind === 'result' ? kind : undefined,
    text: parentGroupTitle ? `${parentGroupTitle}: ${text}` : text,
    container: typeof container === 'string' ? container.trim() : undefined,
    timer: typeof timer === 'number' ? timer : typeof timerSec === 'number' ? timerSec : undefined,
    type: type === 'result' || kind === 'result' ? 'result' : undefined,
    ingredients: parsedIngredients,
    groupId: parentGroupTitle ? fallbackId?.replace(/-sub-\d+$/, '') : undefined,
    groupTitle: parentGroupTitle,
    groupStepText: parentGroupTitle ? text.trim() : undefined,
    groupPosition: parentGroupTitle ? 'substep' : undefined,
    groupSubstepIndex: parentGroupTitle ? index + 1 : undefined,
  }];
}

/**
 * Post-processing: detect groups from already-flattened steps.
 * When stored in Supabase after initial parsing, `kind: 'group'` is lost.
 * This function looks for a "header" step whose text matches a shared prefix
 * in subsequent steps (e.g. "Preparar el pollo" followed by "Preparar el pollo: Cortar...").
 */
function inferGroupPositions(steps: FixedRecipeStep[]): FixedRecipeStep[] {
  if (steps.some((s) => s.groupPosition)) return steps; // already tagged

  const result = [...steps];

  for (let i = 0; i < result.length; i++) {
    const candidate = result[i];
    if (!candidate || candidate.groupPosition) continue;
    if (candidate.kind === 'timer' || candidate.kind === 'result' || candidate.type === 'result') continue;

    const prefix = candidate.text.trim();
    if (!prefix || prefix.length < 3) continue;

    // Look ahead for substeps with pattern "prefix: <substep text>"
    let substepCount = 0;
    for (let j = i + 1; j < result.length; j++) {
      const next = result[j];
      if (!next) break;
      if (next.kind === 'result' || next.type === 'result') {
        // result steps can appear within a group
        if (substepCount > 0) { substepCount++; continue; }
        break;
      }
      if (!next.text.startsWith(prefix + ':') && !next.text.startsWith(prefix + ' :')) break;
      substepCount++;
    }

    if (substepCount < 2) continue; // need at least 2 substeps to form a group

    const groupId = candidate.id;
    candidate.groupPosition = 'header';
    candidate.groupId = groupId;
    candidate.groupTitle = prefix;
    candidate.groupSubstepCount = substepCount;

    for (let j = i + 1; j <= i + substepCount; j++) {
      const sub = result[j];
      if (!sub) break;
      sub.groupPosition = 'substep';
      sub.groupId = groupId;
      sub.groupTitle = prefix;
      // Extract the substep-specific text after the prefix
      const colonIndex = sub.text.indexOf(':');
      sub.groupStepText = colonIndex >= 0 ? sub.text.slice(colonIndex + 1).trim() : sub.text;
      sub.groupSubstepIndex = j - i;
    }

    i += substepCount; // skip past the group
  }

  return result;
}

function parsePhase(input: unknown, recipeId: string, index: number): FixedRecipePhase {
  if (!isObject(input)) {
    throw new Error(`Fase inválida en receta ${recipeId}, índice ${index}.`);
  }

  const id = input.id;
  const number = input.number;
  const title = input.title;
  const emoji = input.emoji;
  const steps = input.steps;

  if (typeof id !== 'string' || !id) {
    throw new Error(`Fase sin id válido en receta ${recipeId}, índice ${index}.`);
  }
  if (typeof number !== 'string' || !number.trim()) {
    throw new Error(`Fase sin número válido en receta ${recipeId}, índice ${index}.`);
  }
  if (typeof title !== 'string' || !title.trim()) {
    throw new Error(`Fase sin título válido en receta ${recipeId}, índice ${index}.`);
  }
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new Error(`Fase sin pasos en receta ${recipeId}, fase ${id}.`);
  }

  const parsedSteps = steps.flatMap((step, stepIndex) => parseStepTree(step, recipeId, id, stepIndex));

  return {
    id,
    number,
    title,
    emoji: typeof emoji === 'string' && emoji.trim() ? emoji : null,
    steps: inferGroupPositions(parsedSteps),
  };
}

function parseIngredientGroup(input: unknown, recipeId: string, index: number): FixedRecipeIngredientGroup {
  if (!isObject(input)) {
    throw new Error(`Grupo de ingredientes inválido en receta ${recipeId}, índice ${index}.`);
  }

  const title = input.title;
  const icon = input.icon;
  const items = input.items;

  if (typeof title !== 'string' || !title.trim()) {
    throw new Error(`Grupo sin título válido en receta ${recipeId}, índice ${index}.`);
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error(`Grupo con items inválidos en receta ${recipeId}, índice ${index}.`);
  }

  const parsedItems = items.map((item) => parseIngredientItem(item, recipeId, index));

  return {
    title,
    icon: typeof icon === 'string' && icon.trim() ? icon : null,
    items: parsedItems,
  };
}

function parseRecipe(input: unknown, index: number): FixedRecipeJson {
  if (!isObject(input)) {
    throw new Error(`Receta inválida en índice ${index}.`);
  }

  const id = input.id;
  const title = input.title;
  const recipeYield = input.yield;
  const recipeCategory = input.recipeCategory;
  const equipment = input.equipment;
  const servings = input.servings;
  const ingredients = input.ingredients;
  const phases = input.phases;

  if (typeof id !== 'string' || !id.trim()) {
    throw new Error(`Receta sin id válido en índice ${index}.`);
  }
  if (typeof title !== 'string' || !title.trim()) {
    throw new Error(`Receta ${id} sin título válido.`);
  }
  if (recipeYield != null && (typeof recipeYield !== 'string' || !recipeYield.trim())) {
    throw new Error(`Receta ${id} con yield inválido.`);
  }
  if (typeof servings !== 'number' || !Number.isInteger(servings) || servings <= 0) {
    throw new Error(`Receta ${id} con servings inválido.`);
  }
  if (recipeCategory != null && (typeof recipeCategory !== 'string' || !RECIPE_CATEGORIES.has(recipeCategory))) {
    throw new Error(`Receta ${id} con recipeCategory inválido.`);
  }
  if (equipment != null && (!Array.isArray(equipment) || equipment.some((item) => typeof item !== 'string' || !item.trim()))) {
    throw new Error(`Receta ${id} con equipment inválido.`);
  }
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    throw new Error(`Receta ${id} sin ingredientes.`);
  }
  if (!Array.isArray(phases) || phases.length === 0) {
    throw new Error(`Receta ${id} sin fases.`);
  }

  return {
    id,
    title,
    yield: typeof recipeYield === 'string' ? recipeYield.trim() : undefined,
    recipeCategory: typeof recipeCategory === 'string' ? (recipeCategory as FixedRecipeJson['recipeCategory']) : undefined,
    equipment: Array.isArray(equipment) ? equipment.map((item) => item.trim()).filter(Boolean) : undefined,
    servings,
    ingredients: ingredients.map((group, ingredientIndex) => parseIngredientGroup(group, id, ingredientIndex)),
    phases: phases.map((phase, phaseIndex) => parsePhase(phase, id, phaseIndex)),
  };
}

export function parseFixedRecipesJson(input: unknown): FixedRecipeJson[] {
  if (!Array.isArray(input)) {
    throw new Error('El JSON de recetas fijas debe ser un arreglo.');
  }
  const recipes = input.map((item, index) => parseRecipe(item, index));
  const ids = new Set<string>();
  recipes.forEach((recipe) => {
    if (ids.has(recipe.id)) {
      throw new Error(`ID de receta duplicado: ${recipe.id}`);
    }
    ids.add(recipe.id);
  });
  return recipes;
}

export async function loadFixedRecipes(): Promise<FixedRecipeJson[]> {
  const response = await fetch(FIXED_RECIPES_JSON_PATH, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`No se pudo cargar recetas fijas (${response.status}).`);
  }
  const raw = await response.json();
  return parseFixedRecipesJson(raw);
}

export function findFixedRecipeById(recipes: FixedRecipeJson[], recipeId: string | null | undefined): FixedRecipeJson | null {
  if (!recipeId) return null;
  return recipes.find((recipe) => recipe.id === recipeId) ?? null;
}
