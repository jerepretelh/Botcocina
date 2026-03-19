import type {
  NormalizedIngredientAmount,
  Recipe,
  RecipeContent,
  ShoppingAggregationEntry,
  ShoppingAggregationResult,
  WeeklyPlanItem,
} from '../../types';
import type { RecipeV2, ScaledRecipeIngredientV2 } from '../types/recipe-v2';
import { buildScaledRecipe } from './recipe-v2/buildScaledRecipe';
import { getIngredientKey, normalizeText } from '../utils/recipeHelpers';

const UNIT_ALIASES: Array<{ family: NormalizedIngredientAmount['unitFamily']; canonicalUnit: string; patterns: RegExp[]; multiplier?: number }> = [
  { family: 'weight', canonicalUnit: 'g', patterns: [/\bkg\b/, /\bkilo/, /\bkilos/], multiplier: 1000 },
  { family: 'weight', canonicalUnit: 'g', patterns: [/\bg\b/, /\bgr\b/, /\bgram/], multiplier: 1 },
  { family: 'volume', canonicalUnit: 'ml', patterns: [/\bl\b/, /\blitro/, /\blitros/], multiplier: 1000 },
  { family: 'volume', canonicalUnit: 'ml', patterns: [/\bml\b/], multiplier: 1 },
  { family: 'cup', canonicalUnit: 'taza', patterns: [/\btaza\b/, /\btazas\b/], multiplier: 1 },
  { family: 'tbsp', canonicalUnit: 'cda', patterns: [/\bcda\b/, /\bcdas\b/, /cucharada/], multiplier: 1 },
  { family: 'tsp', canonicalUnit: 'cdta', patterns: [/\bcdta\b/, /\bcdtas\b/, /cucharadita/], multiplier: 1 },
  { family: 'unit', canonicalUnit: 'unidad', patterns: [/\bunidad\b/, /\bunidades\b/, /\bhuevo\b/, /\bhuevos\b/, /\bpresa\b/, /\bpresas\b/, /\bpapa\b/, /\bpapas\b/], multiplier: 1 },
];

const AMBIGUOUS_TERMS = ['al gusto', 'ligero', 'pizca', 'porcion', 'porción', 'aprox'];

function parseFraction(fragment: string): number | null {
  const trimmed = fragment.trim();
  if (/^\d+\s+\d+\/\d+$/.test(trimmed)) {
    const [whole, fraction] = trimmed.split(/\s+/);
    const [n, d] = fraction.split('/');
    return Number(whole) + Number(n) / Number(d);
  }
  if (/^\d+\/\d+$/.test(trimmed)) {
    const [n, d] = trimmed.split('/');
    return Number(n) / Number(d);
  }
  const parsed = Number.parseFloat(trimmed.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseQuantity(value: string): { amount: number | null; quantityText: string; canonicalUnit: string | null; unitFamily: NormalizedIngredientAmount['unitFamily']; isAmbiguous: boolean } {
  const normalized = normalizeText(value);
  if (!normalized || AMBIGUOUS_TERMS.some((term) => normalized.includes(term)) || normalized.includes('-')) {
    return {
      amount: null,
      quantityText: value,
      canonicalUnit: null,
      unitFamily: 'ambiguous',
      isAmbiguous: true,
    };
  }

  const quantityMatch = normalized.match(/(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?)/);
  const amount = quantityMatch ? parseFraction(quantityMatch[1]) : null;

  for (const alias of UNIT_ALIASES) {
    if (alias.patterns.some((pattern) => pattern.test(normalized))) {
      return {
        amount: amount === null ? null : amount * (alias.multiplier ?? 1),
        quantityText: value,
        canonicalUnit: alias.canonicalUnit,
        unitFamily: alias.family,
        isAmbiguous: amount === null,
      };
    }
  }

  return {
    amount,
    quantityText: value,
    canonicalUnit: amount === null ? null : 'unidad',
    unitFamily: amount === null ? 'ambiguous' : 'unit',
    isAmbiguous: amount === null,
  };
}

function formatAmount(value: number, unit: string): string {
  const rounded = unit === 'g' || unit === 'ml' ? Math.round(value) : Math.round(value * 100) / 100;
  return `${String(rounded).replace(/\.0+$/, '')} ${unit}`;
}

function buildEntry(
  key: string,
  itemName: string,
  quantityText: string,
  isAmbiguous: boolean,
  sourceRecipes: ShoppingAggregationEntry['sourceRecipes'],
  sourcePlanItemIds: string[],
): ShoppingAggregationEntry {
  const uniqueSources = sourceRecipes.filter(
    (source, index, collection) =>
      collection.findIndex((candidate) => candidate.recipeId === source.recipeId && candidate.recipeName === source.recipeName) === index,
  );
  return {
    key,
    itemName,
    quantityText,
    isAmbiguous,
    sourceRecipes: uniqueSources,
    sourcePlanItemIds: [...new Set(sourcePlanItemIds)],
  };
}

function getAggregationKey(normalized: NormalizedIngredientAmount, itemId: string, index: number): string {
  if (!normalized.isAmbiguous && normalized.canonicalUnit) {
    return `${normalized.normalizedName}:${normalized.canonicalUnit}:${normalized.unitFamily}`;
  }
  const normalizedQuantity = normalizeText(normalized.quantityText).trim();
  if (!normalizedQuantity) {
    return `${normalized.normalizedName}:ambiguous:${itemId}:${index}`;
  }
  return `${normalized.normalizedName}:ambiguous:${normalizedQuantity}`;
}

function includeV2Ingredient(item: WeeklyPlanItem, ingredient: ScaledRecipeIngredientV2): boolean {
  if (ingredient.indispensable) return true;
  const selected = item.configSnapshot.selectedOptionalIngredients;
  if (selected.length === 0) return true;
  return selected.includes(ingredient.id) || selected.includes(getIngredientKey(ingredient.name));
}

function normalizeV2IngredientLine(
  ingredient: ScaledRecipeIngredientV2,
  item: WeeklyPlanItem,
): NormalizedIngredientAmount {
  if (
    ingredient.scaledAmount.scaledValue == null
    || !ingredient.scaledAmount.scaledCanonicalUnit
    || ingredient.scaledAmount.family === 'ambiguous'
  ) {
    return {
      normalizedName: normalizeText(ingredient.name),
      displayName: ingredient.name,
      canonicalUnit: ingredient.scaledAmount.scaledCanonicalUnit,
      unitFamily: ingredient.scaledAmount.family as NormalizedIngredientAmount['unitFamily'],
      numericValue: null,
      quantityText: ingredient.scaledAmount.displayText,
      recipeId: item.recipeId,
      recipeName: item.recipeNameSnapshot,
      isAmbiguous: true,
    };
  }
  return {
    normalizedName: normalizeText(ingredient.name),
    displayName: ingredient.name,
    canonicalUnit: ingredient.scaledAmount.scaledCanonicalUnit,
    unitFamily: ingredient.scaledAmount.family as NormalizedIngredientAmount['unitFamily'],
    numericValue: ingredient.scaledAmount.scaledValue,
    quantityText: ingredient.scaledAmount.displayText,
    recipeId: item.recipeId,
    recipeName: item.recipeNameSnapshot,
    isAmbiguous: false,
  };
}

function normalizeLegacyIngredientLine(
  ingredient: RecipeContent['ingredients'][number],
  item: WeeklyPlanItem,
): NormalizedIngredientAmount {
  const baseText = ingredient.portions[item.configSnapshot.resolvedPortion];
  const parsed = parseQuantity(baseText);
  if (parsed.isAmbiguous || parsed.amount === null || !parsed.canonicalUnit) {
    return {
      normalizedName: normalizeText(ingredient.name),
      displayName: ingredient.name,
      canonicalUnit: null,
      unitFamily: 'ambiguous',
      numericValue: null,
      quantityText: baseText,
      recipeId: item.recipeId,
      recipeName: item.recipeNameSnapshot,
      isAmbiguous: true,
    };
  }
  const scaledValue = parsed.amount * item.configSnapshot.scaleFactor;
  return {
    normalizedName: normalizeText(ingredient.name),
    displayName: ingredient.name,
    canonicalUnit: parsed.canonicalUnit,
    unitFamily: parsed.unitFamily,
    numericValue: scaledValue,
    quantityText: formatAmount(scaledValue, parsed.canonicalUnit),
    recipeId: item.recipeId,
    recipeName: item.recipeNameSnapshot,
    isAmbiguous: false,
  };
}

export function buildWeeklyShoppingAggregationV2(
  items: WeeklyPlanItem[],
  recipeV2ById: Record<string, RecipeV2>,
  recipeContentById: Record<string, RecipeContent>,
  recipesById: Record<string, Recipe>,
): ShoppingAggregationResult {
  const totalizedMap = new Map<string, { itemName: string; value: number | null; quantityText: string; isAmbiguous: boolean; sourceRecipes: ShoppingAggregationEntry['sourceRecipes']; sourcePlanItemIds: string[] }>();

  const byRecipe = items.map((item) => {
    const recipe = item.recipeId ? recipesById[item.recipeId] ?? null : null;
    const recipeV2 = item.recipeId ? recipeV2ById[item.recipeId] ?? null : null;
    const content = item.recipeId ? recipeContentById[item.recipeId] ?? null : null;

    let itemEntries: ShoppingAggregationEntry[] = [];

    if (recipeV2 && item.configSnapshot.targetYield) {
      const scaledRecipe = buildScaledRecipe(recipeV2, item.configSnapshot.targetYield);
      itemEntries = scaledRecipe.ingredients
        .filter((ingredient) => includeV2Ingredient(item, ingredient))
        .map((ingredient) => normalizeV2IngredientLine(ingredient, item))
        .map((normalized, index) => {
          const key = getAggregationKey(normalized, item.id, index);
          const existing = totalizedMap.get(key);

          if (normalized.isAmbiguous || normalized.numericValue === null || !normalized.canonicalUnit) {
            totalizedMap.set(key, {
              itemName: normalized.displayName,
              value: null,
              isAmbiguous: true,
              quantityText: normalized.quantityText,
              sourceRecipes: [...(existing?.sourceRecipes ?? []), { recipeId: normalized.recipeId, recipeName: normalized.recipeName }],
              sourcePlanItemIds: [...(existing?.sourcePlanItemIds ?? []), item.id],
            });
          } else if (existing && !existing.isAmbiguous && existing.value !== null) {
            totalizedMap.set(key, {
              ...existing,
              value: existing.value + normalized.numericValue,
              quantityText: formatAmount(existing.value + normalized.numericValue, normalized.canonicalUnit),
              sourceRecipes: [...existing.sourceRecipes, { recipeId: normalized.recipeId, recipeName: normalized.recipeName }],
              sourcePlanItemIds: [...existing.sourcePlanItemIds, item.id],
            });
          } else {
            totalizedMap.set(key, {
              itemName: normalized.displayName,
              value: normalized.numericValue,
              isAmbiguous: false,
              quantityText: normalized.quantityText,
              sourceRecipes: [{ recipeId: normalized.recipeId, recipeName: normalized.recipeName }],
              sourcePlanItemIds: [item.id],
            });
          }

          return buildEntry(key, normalized.displayName, normalized.quantityText, normalized.isAmbiguous, [{ recipeId: normalized.recipeId, recipeName: normalized.recipeName }], [item.id]);
        });
    } else if (recipe && content) {
      const selectedKeys = new Set(item.configSnapshot.selectedOptionalIngredients);
      itemEntries = content.ingredients
        .filter((ingredient) => ingredient.indispensable || selectedKeys.size === 0 || selectedKeys.has(getIngredientKey(ingredient.name)))
        .map((ingredient) => normalizeLegacyIngredientLine(ingredient, item))
        .map((normalized, index) => {
          const key = getAggregationKey(normalized, item.id, index);
          const existing = totalizedMap.get(key);

          if (normalized.isAmbiguous || normalized.numericValue === null || !normalized.canonicalUnit) {
            totalizedMap.set(key, {
              itemName: normalized.displayName,
              value: null,
              isAmbiguous: true,
              quantityText: normalized.quantityText,
              sourceRecipes: [...(existing?.sourceRecipes ?? []), { recipeId: normalized.recipeId, recipeName: normalized.recipeName }],
              sourcePlanItemIds: [...(existing?.sourcePlanItemIds ?? []), item.id],
            });
          } else if (existing && !existing.isAmbiguous && existing.value !== null) {
            totalizedMap.set(key, {
              ...existing,
              value: existing.value + normalized.numericValue,
              quantityText: formatAmount(existing.value + normalized.numericValue, normalized.canonicalUnit),
              sourceRecipes: [...existing.sourceRecipes, { recipeId: normalized.recipeId, recipeName: normalized.recipeName }],
              sourcePlanItemIds: [...existing.sourcePlanItemIds, item.id],
            });
          } else {
            totalizedMap.set(key, {
              itemName: normalized.displayName,
              value: normalized.numericValue,
              isAmbiguous: false,
              quantityText: normalized.quantityText,
              sourceRecipes: [{ recipeId: normalized.recipeId, recipeName: normalized.recipeName }],
              sourcePlanItemIds: [item.id],
            });
          }

          return buildEntry(key, normalized.displayName, normalized.quantityText, normalized.isAmbiguous, [{ recipeId: normalized.recipeId, recipeName: normalized.recipeName }], [item.id]);
        });
    }

    return {
      planItemId: item.id,
      recipeId: item.recipeId,
      recipeName: item.recipeNameSnapshot,
      dayOfWeek: item.dayOfWeek,
      slot: item.slot,
      items: itemEntries,
    };
  });

  const totalized = [...totalizedMap.entries()].map(([key, value]) =>
    buildEntry(key, value.itemName, value.quantityText, value.isAmbiguous, value.sourceRecipes, value.sourcePlanItemIds),
  );
  totalized.sort((a, b) => a.itemName.localeCompare(b.itemName, 'es'));

  return {
    totalized,
    byRecipe,
  };
}
