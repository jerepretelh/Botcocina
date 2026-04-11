import type {
  NormalizedIngredientAmount,
  Recipe,
  RecipeContent,
  ShoppingAggregationByRecipeGroup,
  ShoppingAggregationEntry,
  ShoppingAggregationGroup,
  ShoppingAggregationIssue,
  ShoppingAggregationResult,
  WeeklyPlanItem,
} from '../../types';
import type { RecipeV2, ScaledRecipeIngredientV2 } from '../types/recipe-v2';
import { isPlannedOptionalIngredientSelected } from './planningSnapshotV2';
import { buildScaledRecipe } from './recipe-v2/buildScaledRecipe';
import { getIngredientKey, normalizeText } from '../utils/recipeHelpers';

type MergeSource = 'shoppingKey' | 'canonicalName' | 'name';
type ShoppingBucket = 'essential' | 'optional';
type ShoppingUnitFamily = 'weight' | 'volume' | 'unit' | 'other' | 'ambiguous';
type QuantityStatus = 'resolved' | 'ambiguous' | 'incompatible';

type IngredientLine = {
  mergeKey: string;
  canonicalName: string;
  displayName: string;
  mergeSource: MergeSource;
  bucket: ShoppingBucket;
  unitFamily: ShoppingUnitFamily;
  unit: string | null;
  amount: number | null;
  quantityText: string;
  recipeId: string | null;
  recipeName: string;
  planItemId: string;
};

type GroupEntryState = {
  key: string;
  unitFamily: ShoppingUnitFamily;
  unit: string | null;
  amount: number | null;
  quantityText: string;
  quantityStatus: QuantityStatus;
  sourceRecipes: Array<{ recipeId: string | null; recipeName: string }>;
  sourcePlanItemIds: string[];
};

type GroupState = {
  mergeKey: string;
  canonicalName: string;
  mergeSource: MergeSource;
  bucket: ShoppingBucket;
  hasIncompatibleUnits: boolean;
  displayNameVotes: Map<string, number>;
  entriesByKey: Map<string, GroupEntryState>;
};

const UNIT_ALIASES: Array<{
  family: NormalizedIngredientAmount['unitFamily'];
  canonicalUnit: string;
  patterns: RegExp[];
  multiplier?: number;
}> = [
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

function toShoppingUnitFamily(
  family: NormalizedIngredientAmount['unitFamily'] | null | undefined,
): ShoppingUnitFamily {
  if (family === 'weight' || family === 'volume' || family === 'unit') return family;
  if (family === 'ambiguous') return 'ambiguous';
  return 'other';
}

function mergeSourceRank(source: MergeSource): number {
  if (source === 'shoppingKey') return 3;
  if (source === 'canonicalName') return 2;
  return 1;
}

function chooseStableDisplayName(votes: Map<string, number>, fallback: string): string {
  if (votes.size === 0) return fallback;
  const ranked = [...votes.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    if (a[0].length !== b[0].length) return a[0].length - b[0].length;
    return a[0].localeCompare(b[0], 'es');
  });
  return ranked[0]?.[0] ?? fallback;
}

function formatAmount(value: number, unit: string): string {
  const rounded = unit === 'g' || unit === 'ml' ? Math.round(value) : Math.round(value * 100) / 100;
  return `${String(rounded).replace(/\.0+$/, '')} ${unit}`;
}

function buildEntryKey(mergeKey: string, family: ShoppingUnitFamily, unit: string | null): string {
  return `${mergeKey}|${family}|${unit ?? 'none'}`;
}

function parseQuantity(value: string): {
  amount: number | null;
  quantityText: string;
  canonicalUnit: string | null;
  unitFamily: ShoppingUnitFamily;
  isAmbiguous: boolean;
} {
  const normalized = normalizeText(value);
  if (!normalized || AMBIGUOUS_TERMS.some((term) => normalized.includes(term)) || normalized.includes('-')) {
    return {
      amount: null,
      quantityText: value || 'Cantidad variable',
      canonicalUnit: null,
      unitFamily: 'ambiguous',
      isAmbiguous: true,
    };
  }

  const quantityMatch = normalized.match(/(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?)/);
  const amount = quantityMatch ? parseFraction(quantityMatch[1]) : null;

  for (const alias of UNIT_ALIASES) {
    if (alias.patterns.some((pattern) => pattern.test(normalized))) {
      const numeric = amount === null ? null : amount * (alias.multiplier ?? 1);
      const unitFamily = toShoppingUnitFamily(alias.family);
      return {
        amount: numeric,
        quantityText: numeric != null ? formatAmount(numeric, alias.canonicalUnit) : value || 'Cantidad variable',
        canonicalUnit: alias.canonicalUnit,
        unitFamily,
        isAmbiguous: numeric == null,
      };
    }
  }

  return {
    amount,
    quantityText: amount != null ? formatAmount(amount, 'unidad') : value || 'Cantidad variable',
    canonicalUnit: amount === null ? null : 'unidad',
    unitFamily: amount === null ? 'ambiguous' : 'unit',
    isAmbiguous: amount === null,
  };
}

function includeV2Ingredient(item: WeeklyPlanItem, ingredient: ScaledRecipeIngredientV2): boolean {
  if (ingredient.indispensable) return true;
  return isPlannedOptionalIngredientSelected(item.configSnapshot.selectedOptionalIngredients, ingredient.id, ingredient.name);
}

function normalizeV2IngredientLine(
  ingredient: ScaledRecipeIngredientV2,
  item: WeeklyPlanItem,
): IngredientLine {
  const canonicalName = normalizeText(ingredient.name) || ingredient.name.toLowerCase();
  const mergeKey = canonicalName;
  const bucket: ShoppingBucket = ingredient.indispensable ? 'essential' : 'optional';
  const unitFamily = toShoppingUnitFamily(ingredient.scaledAmount.family as NormalizedIngredientAmount['unitFamily']);
  const amount =
    ingredient.scaledAmount.scaledValue != null
      && ingredient.scaledAmount.family !== 'ambiguous'
      ? ingredient.scaledAmount.scaledValue
      : null;
  const unit = ingredient.scaledAmount.scaledCanonicalUnit ?? null;
  return {
    mergeKey,
    canonicalName,
    displayName: ingredient.name,
    mergeSource: 'canonicalName',
    bucket,
    unitFamily: amount == null ? 'ambiguous' : unitFamily,
    unit,
    amount,
    quantityText:
      amount != null && unit
        ? formatAmount(amount, unit)
        : ingredient.scaledAmount.displayText || 'Cantidad variable',
    recipeId: item.recipeId,
    recipeName: item.recipeNameSnapshot,
    planItemId: item.id,
  };
}

function normalizeLegacyIngredientLine(
  ingredient: RecipeContent['ingredients'][number],
  item: WeeklyPlanItem,
): IngredientLine {
  const baseText = ingredient.portions[item.configSnapshot.resolvedPortion];
  const parsed = parseQuantity(baseText);
  const bucket: ShoppingBucket = ingredient.indispensable ? 'essential' : 'optional';
  const amount = parsed.amount == null ? null : parsed.amount * item.configSnapshot.scaleFactor;
  const quantityText =
    amount != null && parsed.canonicalUnit
      ? formatAmount(amount, parsed.canonicalUnit)
      : parsed.quantityText || 'Cantidad variable';
  const canonicalName = normalizeText(ingredient.name) || ingredient.name.toLowerCase();
  return {
    mergeKey: canonicalName,
    canonicalName,
    displayName: ingredient.name,
    mergeSource: 'canonicalName',
    bucket,
    unitFamily: amount == null ? 'ambiguous' : parsed.unitFamily,
    unit: parsed.canonicalUnit,
    amount,
    quantityText,
    recipeId: item.recipeId,
    recipeName: item.recipeNameSnapshot,
    planItemId: item.id,
  };
}

function addSourceEntry(
  target: Array<{ recipeId: string | null; recipeName: string }>,
  recipeId: string | null,
  recipeName: string,
): void {
  if (!target.some((entry) => entry.recipeId === recipeId && entry.recipeName === recipeName)) {
    target.push({ recipeId, recipeName });
  }
}

function toFlattenedEntry(
  group: ShoppingAggregationGroup,
  entry: ShoppingAggregationEntry,
): ShoppingAggregationEntry {
  return {
    ...entry,
    hasIncompatibleUnits: group.hasIncompatibleUnits,
  };
}

function mergeGroupEntries(entries: ShoppingAggregationEntry[]): ShoppingAggregationEntry[] {
  const byKey = new Map<string, ShoppingAggregationEntry>();
  for (const entry of entries) {
    const existing = byKey.get(entry.key);
    if (!existing) {
      byKey.set(entry.key, {
        ...entry,
        sourceRecipes: [...entry.sourceRecipes],
        sourcePlanItemIds: [...entry.sourcePlanItemIds],
      });
      continue;
    }
    const nextAmount =
      existing.amount != null && entry.amount != null ? existing.amount + entry.amount : existing.amount ?? entry.amount ?? null;
    const nextQuantityText =
      nextAmount != null && existing.unit
        ? formatAmount(nextAmount, existing.unit)
        : existing.quantityText || entry.quantityText;

    existing.amount = nextAmount;
    existing.quantityText = nextQuantityText;
    existing.isAmbiguous = existing.isAmbiguous || entry.isAmbiguous;
    existing.quantityStatus =
      existing.quantityStatus === 'incompatible' || entry.quantityStatus === 'incompatible'
        ? 'incompatible'
        : existing.quantityStatus === 'ambiguous' || entry.quantityStatus === 'ambiguous'
        ? 'ambiguous'
        : 'resolved';
    for (const source of entry.sourceRecipes) {
      if (!existing.sourceRecipes.some((candidate) => candidate.recipeId === source.recipeId && candidate.recipeName === source.recipeName)) {
        existing.sourceRecipes.push(source);
      }
    }
    for (const planItemId of entry.sourcePlanItemIds) {
      if (!existing.sourcePlanItemIds.includes(planItemId)) {
        existing.sourcePlanItemIds.push(planItemId);
      }
    }
  }
  return [...byKey.values()];
}

export function buildWeeklyShoppingAggregationV2(
  items: WeeklyPlanItem[],
  recipeV2ById: Record<string, RecipeV2>,
  recipeContentById: Record<string, RecipeContent>,
  recipesById: Record<string, Recipe>,
): ShoppingAggregationResult {
  const groups = new Map<string, GroupState>();
  const issues: ShoppingAggregationIssue[] = [];
  const issueKeys = new Set<string>();

  const byRecipe: ShoppingAggregationByRecipeGroup[] = items.map((item) => {
    const recipe = item.recipeId ? recipesById[item.recipeId] ?? null : null;
    const recipeV2 = item.recipeId ? recipeV2ById[item.recipeId] ?? null : null;
    const content = item.recipeId ? recipeContentById[item.recipeId] ?? null : null;

    let lines: IngredientLine[] = [];

    if (recipeV2) {
      if (!item.configSnapshot.targetYield) {
        throw new Error(`La receta planificada "${item.recipeNameSnapshot}" no tiene targetYield V2 para compras.`);
      }
      const scaledRecipe = buildScaledRecipe(
        recipeV2,
        item.configSnapshot.targetYield,
        item.configSnapshot.cookingContext ?? recipeV2.cookingContextDefaults ?? null,
      );
      lines = scaledRecipe.ingredients
        .filter((ingredient) => includeV2Ingredient(item, ingredient))
        .map((ingredient) => normalizeV2IngredientLine(ingredient, item));
    } else if (recipe && content) {
      const selectedKeys = new Set(item.configSnapshot.selectedOptionalIngredients);
      lines = content.ingredients
        .filter((ingredient) => ingredient.indispensable || selectedKeys.size === 0 || selectedKeys.has(getIngredientKey(ingredient.name)))
        .map((ingredient) => normalizeLegacyIngredientLine(ingredient, item));
    }

    const recipeEntries: ShoppingAggregationEntry[] = lines.map((line) => {
      const groupKey = `${line.bucket}|${line.mergeKey}`;
      let group = groups.get(groupKey);
      if (!group) {
        group = {
          mergeKey: line.mergeKey,
          canonicalName: line.canonicalName,
          mergeSource: line.mergeSource,
          bucket: line.bucket,
          hasIncompatibleUnits: false,
          displayNameVotes: new Map(),
          entriesByKey: new Map(),
        };
        groups.set(groupKey, group);
      } else if (mergeSourceRank(line.mergeSource) > mergeSourceRank(group.mergeSource)) {
        group.mergeSource = line.mergeSource;
      }

      group.displayNameVotes.set(line.displayName, (group.displayNameVotes.get(line.displayName) ?? 0) + 1);

      const entryKey = buildEntryKey(line.mergeKey, line.unitFamily, line.unit);
      let entry = group.entriesByKey.get(entryKey);
      if (!entry) {
        entry = {
          key: entryKey,
          unitFamily: line.unitFamily,
          unit: line.unit,
          amount: line.amount,
          quantityText: line.quantityText,
          quantityStatus: line.amount == null ? 'ambiguous' : 'resolved',
          sourceRecipes: [],
          sourcePlanItemIds: [],
        };
        group.entriesByKey.set(entryKey, entry);
      } else if (entry.amount != null && line.amount != null) {
        entry.amount += line.amount;
        entry.quantityText = entry.unit ? formatAmount(entry.amount, entry.unit) : line.quantityText;
      }

      addSourceEntry(entry.sourceRecipes, line.recipeId, line.recipeName);
      if (!entry.sourcePlanItemIds.includes(line.planItemId)) {
        entry.sourcePlanItemIds.push(line.planItemId);
      }

      return {
        key: entry.key,
        itemName: line.displayName,
        quantityText: line.quantityText,
        isAmbiguous: line.amount == null,
        mergeKey: line.mergeKey,
        mergeSource: line.mergeSource,
        bucket: line.bucket,
        canonicalName: line.canonicalName,
        displayName: line.displayName,
        unit: line.unit,
        unitFamily: line.unitFamily,
        amount: line.amount,
        quantityStatus: line.amount == null ? 'ambiguous' : 'resolved',
        sourceRecipes: [{ recipeId: line.recipeId, recipeName: line.recipeName }],
        sourcePlanItemIds: [line.planItemId],
      };
    });

    recipeEntries.sort((a, b) => a.itemName.localeCompare(b.itemName, 'es'));
    return {
      planItemId: item.id,
      recipeId: item.recipeId,
      recipeName: item.recipeNameSnapshot,
      dayOfWeek: item.dayOfWeek,
      slot: item.slot,
      items: recipeEntries,
      essentials: recipeEntries.filter((entry) => entry.bucket === 'essential'),
      optionals: recipeEntries.filter((entry) => entry.bucket === 'optional'),
    };
  });

  const computedGroups: ShoppingAggregationGroup[] = [];
  for (const groupState of groups.values()) {
    const displayName = chooseStableDisplayName(groupState.displayNameVotes, groupState.canonicalName);
    const entries = [...groupState.entriesByKey.values()];
    const uniqueResolvedUnits = new Set(
      entries
        .filter((entry) => entry.amount != null && entry.unitFamily !== 'ambiguous')
        .map((entry) => `${entry.unitFamily}:${entry.unit ?? 'none'}`),
    );
    const hasIncompatibleUnits = uniqueResolvedUnits.size > 1;

    const entriesOut: ShoppingAggregationEntry[] = entries
      .map((entry) => {
        const quantityStatus: QuantityStatus =
          entry.amount == null
            ? 'ambiguous'
            : hasIncompatibleUnits
            ? 'incompatible'
            : 'resolved';
        const quantityText =
          entry.amount != null && entry.unit
            ? formatAmount(entry.amount, entry.unit)
            : entry.quantityText || 'Cantidad variable';
        return {
          key: entry.key,
          itemName: displayName,
          quantityText,
          isAmbiguous: quantityStatus !== 'resolved',
          mergeKey: groupState.mergeKey,
          mergeSource: groupState.mergeSource,
          bucket: groupState.bucket,
          canonicalName: groupState.canonicalName,
          displayName,
          unit: entry.unit,
          unitFamily: entry.unitFamily,
          amount: entry.amount,
          quantityStatus,
          hasIncompatibleUnits,
          sourceRecipes: entry.sourceRecipes,
          sourcePlanItemIds: entry.sourcePlanItemIds,
        };
      })
      .sort((a, b) => (a.unit ?? '').localeCompare(b.unit ?? '', 'es'));

    computedGroups.push({
      mergeKey: groupState.mergeKey,
      canonicalName: groupState.canonicalName,
      displayName,
      mergeSource: groupState.mergeSource,
      bucket: groupState.bucket,
      hasIncompatibleUnits,
      entries: entriesOut,
    });
  }

  // Regla de producto: si un mergeKey aparece como essential al menos una vez, se consolida SOLO en essentials.
  const consolidatedByMergeKey = new Map<string, ShoppingAggregationGroup>();
  for (const group of computedGroups) {
    const existing = consolidatedByMergeKey.get(group.mergeKey);
    if (!existing) {
      consolidatedByMergeKey.set(group.mergeKey, {
        ...group,
        entries: mergeGroupEntries(group.entries),
      });
      continue;
    }

    const shouldPromoteToEssential = existing.bucket === 'optional' && group.bucket === 'essential';
    if (shouldPromoteToEssential) {
      existing.bucket = 'essential';
    }
    if (mergeSourceRank(group.mergeSource) > mergeSourceRank(existing.mergeSource)) {
      existing.mergeSource = group.mergeSource;
    }

    const mergedEntries = mergeGroupEntries([...existing.entries, ...group.entries]);
    existing.entries = mergedEntries;
    const uniqueResolvedUnits = new Set(
      mergedEntries
        .filter((entry) => entry.amount != null && entry.unitFamily !== 'ambiguous')
        .map((entry) => `${entry.unitFamily}:${entry.unit ?? 'none'}`),
    );
    existing.hasIncompatibleUnits = uniqueResolvedUnits.size > 1;
    existing.entries = mergedEntries.map((entry) => {
      const quantityStatus: QuantityStatus =
        entry.amount == null
          ? 'ambiguous'
          : existing.hasIncompatibleUnits
          ? 'incompatible'
          : 'resolved';
      return {
        ...entry,
        quantityStatus,
        isAmbiguous: quantityStatus !== 'resolved',
        hasIncompatibleUnits: existing.hasIncompatibleUnits,
      };
    });
  }

  const essentials: ShoppingAggregationGroup[] = [];
  const optionals: ShoppingAggregationGroup[] = [];

  for (const group of consolidatedByMergeKey.values()) {
    if (group.mergeSource === 'canonicalName') {
      const issueKey = `fallback-canonical|${group.mergeKey}`;
      if (!issueKeys.has(issueKey)) {
        issues.push({
          code: 'FALLBACK_TO_CANONICAL',
          mergeKey: group.mergeKey,
          mergeSource: group.mergeSource,
          details: 'Se agrupó por canonicalName al no contar con shoppingKey.',
          affectedKeys: group.entries.map((entry) => entry.key),
        });
        issueKeys.add(issueKey);
      }
    }

    if (group.mergeSource === 'name') {
      const issueKey = `fallback-name|${group.mergeKey}`;
      if (!issueKeys.has(issueKey)) {
        issues.push({
          code: 'FALLBACK_TO_NAME',
          mergeKey: group.mergeKey,
          mergeSource: group.mergeSource,
          details: 'Se agrupó por name como último recurso.',
          affectedKeys: group.entries.map((entry) => entry.key),
        });
        issueKeys.add(issueKey);
      }
    }

    if (group.hasIncompatibleUnits) {
      const issueKey = `incompatible|${group.mergeKey}`;
      if (!issueKeys.has(issueKey)) {
        issues.push({
          code: 'INCOMPATIBLE_UNIT',
          mergeKey: group.mergeKey,
          mergeSource: group.mergeSource,
          details: 'Se detectaron unidades incompatibles para el mismo mergeKey; se separaron en entries.',
          affectedKeys: group.entries.map((entry) => entry.key),
        });
        issueKeys.add(issueKey);
      }
    }

    if (group.entries.some((entry) => entry.quantityStatus === 'ambiguous')) {
      const issueKey = `ambiguous|${group.mergeKey}`;
      if (!issueKeys.has(issueKey)) {
        issues.push({
          code: 'AMBIGUOUS_AMOUNT',
          mergeKey: group.mergeKey,
          mergeSource: group.mergeSource,
          details: 'Hay cantidades ambiguas que no pudieron sumarse numéricamente.',
          affectedKeys: group.entries.filter((entry) => entry.quantityStatus === 'ambiguous').map((entry) => entry.key),
        });
        issueKeys.add(issueKey);
      }
    }

    if (group.bucket === 'essential') essentials.push(group);
    else optionals.push(group);
  }

  essentials.sort((a, b) => a.displayName.localeCompare(b.displayName, 'es'));
  optionals.sort((a, b) => a.displayName.localeCompare(b.displayName, 'es'));

  const totalized = essentials
    .flatMap((group) => group.entries.map((entry) => toFlattenedEntry(group, entry)))
    .sort((a, b) => a.itemName.localeCompare(b.itemName, 'es'));

  return {
    totalized,
    essentials,
    optionals,
    byRecipe,
    issues,
  };
}
