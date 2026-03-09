import type {
  AmountUnit,
  Ingredient,
  NormalizedIngredientAmount,
  Portion,
  Recipe,
  RecipeContent,
  ShoppingAggregationEntry,
  ShoppingAggregationResult,
  WeeklyPlanItem,
} from '../../types';
import { getIngredientKey, normalizeText } from '../utils/recipeHelpers';

const UNIT_ALIASES: Array<{ family: NormalizedIngredientAmount['unitFamily']; canonicalUnit: string; patterns: RegExp[]; multiplier?: number }> = [
  { family: 'weight', canonicalUnit: 'g', patterns: [/\bkg\b/, /\bkilo/, /\bkilos/], multiplier: 1000 },
  { family: 'weight', canonicalUnit: 'g', patterns: [/\bg\b/, /\bgr\b/, /\bgram/], multiplier: 1 },
  { family: 'volume', canonicalUnit: 'ml', patterns: [/\bl\b/, /\blitro/, /\blitros/], multiplier: 1000 },
  { family: 'volume', canonicalUnit: 'ml', patterns: [/\bml\b/], multiplier: 1 },
  { family: 'cup', canonicalUnit: 'taza', patterns: [/\btaza\b/, /\btazas\b/], multiplier: 1 },
  { family: 'tbsp', canonicalUnit: 'cda', patterns: [/\bcda\b/, /\bcdas\b/, /cucharada/], multiplier: 1 },
  { family: 'tsp', canonicalUnit: 'cdta', patterns: [/\bcdta\b/, /\bcdtas\b/, /cucharadita/], multiplier: 1 },
  { family: 'unit', canonicalUnit: 'unidad', patterns: [/\bunidad\b/, /\bunidades\b/, /\bunidades\b/, /\bhuevo\b/, /\bhuevos\b/, /\bpresa\b/, /\bpresas\b/, /\bpapa\b/, /\bpapas\b/], multiplier: 1 },
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
    amount: amount,
    quantityText: value,
    canonicalUnit: amount === null ? null : 'unidad',
    unitFamily: amount === null ? 'ambiguous' : 'unit',
    isAmbiguous: amount === null,
  };
}

function formatAmount(value: number, unit: string): string {
  const rounded =
    unit === 'g' || unit === 'ml'
      ? Math.round(value)
      : Math.round(value * 100) / 100;
  return `${String(rounded).replace(/\.0+$/, '')} ${unit}`;
}

function resolveBasePortion(item: WeeklyPlanItem): Portion {
  return item.configSnapshot.resolvedPortion;
}

function resolveScaleFactor(item: WeeklyPlanItem): number {
  return item.configSnapshot.scaleFactor || 1;
}

function normalizeIngredientLine(
  ingredient: Ingredient,
  item: WeeklyPlanItem,
): NormalizedIngredientAmount {
  const basePortion = resolveBasePortion(item);
  const baseText = ingredient.portions[basePortion];
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

  return {
    normalizedName: normalizeText(ingredient.name),
    displayName: ingredient.name,
    canonicalUnit: parsed.canonicalUnit,
    unitFamily: parsed.unitFamily,
    numericValue: parsed.amount * resolveScaleFactor(item),
    quantityText: formatAmount(parsed.amount * resolveScaleFactor(item), parsed.canonicalUnit),
    recipeId: item.recipeId,
    recipeName: item.recipeNameSnapshot,
    isAmbiguous: false,
  };
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

export function buildWeeklyShoppingAggregation(
  items: WeeklyPlanItem[],
  recipeContentById: Record<string, RecipeContent>,
  recipesById: Record<string, Recipe>,
): ShoppingAggregationResult {
  const totalizedMap = new Map<string, { itemName: string; unit: string | null; family: NormalizedIngredientAmount['unitFamily']; value: number | null; isAmbiguous: boolean; sourceRecipes: ShoppingAggregationEntry['sourceRecipes']; quantityText: string; sourcePlanItemIds: string[] }>();
  const byRecipe = items.map((item) => {
    const recipe = item.recipeId ? recipesById[item.recipeId] ?? null : null;
    const content = item.recipeId ? recipeContentById[item.recipeId] ?? null : null;
    if (!recipe || !content) {
      return {
        planItemId: item.id,
        recipeId: item.recipeId,
        recipeName: item.recipeNameSnapshot,
        dayOfWeek: item.dayOfWeek,
        slot: item.slot,
        items: [] as ShoppingAggregationEntry[],
      };
    }

    const selectedKeys = new Set(item.configSnapshot.selectedOptionalIngredients);
    const itemEntries = content.ingredients
      .filter((ingredient) => ingredient.indispensable || selectedKeys.size === 0 || selectedKeys.has(getIngredientKey(ingredient.name)))
      .map((ingredient) => normalizeIngredientLine(ingredient, item))
      .map((normalized, index) => {
        const key = normalized.isAmbiguous
          ? `${normalized.normalizedName}:${item.id}:${index}`
          : `${normalized.normalizedName}:${normalized.canonicalUnit}:${normalized.unitFamily}`;

        const existing = totalizedMap.get(key);
        if (normalized.isAmbiguous || normalized.numericValue === null || !normalized.canonicalUnit) {
          totalizedMap.set(key, {
            itemName: normalized.displayName,
            unit: null,
            family: 'ambiguous',
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
            unit: normalized.canonicalUnit,
            family: normalized.unitFamily,
            value: normalized.numericValue,
            isAmbiguous: false,
            quantityText: formatAmount(normalized.numericValue, normalized.canonicalUnit),
            sourceRecipes: [{ recipeId: normalized.recipeId, recipeName: normalized.recipeName }],
            sourcePlanItemIds: [item.id],
          });
        }

        return buildEntry(
          key,
          normalized.displayName,
          normalized.quantityText,
          normalized.isAmbiguous,
          [{ recipeId: normalized.recipeId, recipeName: normalized.recipeName }],
          [item.id],
        );
      });

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
