import type { FixedRecipeJson } from './types';

export const SHELL_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const;
export const SHELL_MOMENTS = ['Desayuno', 'Almuerzo', 'Cena'] as const;

export type ShellDay = (typeof SHELL_DAYS)[number];
export type ShellMoment = (typeof SHELL_MOMENTS)[number];

export interface PlannedRecipeEntry {
  id: string;
  recipeId: string;
  day: ShellDay;
  moment: ShellMoment;
  persistedPlanItemId?: string;
  createdAt: number;
}

export interface ShoppingUiState {
  checked: boolean;
  price: string;
}

export interface ShoppingRowViewModel {
  key: string;
  name: string;
  recipeTitles: string[];
  recipeIds: string[];
  quantityLabel: string;
  quantityValue?: number;
  quantityUnit?: string;
  isManual?: boolean;
  persistedItemId?: string;
  checked: boolean;
  price: string;
}

export interface ManualShoppingItemInput {
  key: string;
  name: string;
  quantityLabel?: string | null;
  checked?: boolean;
  price?: string;
  persistedItemId?: string;
}

export interface BuildShellShoppingItemsOptions {
  selectedRecipeIds?: string[];
  manualItems?: ManualShoppingItemInput[];
}

export function shellDayToIndex(day: ShellDay): number {
  switch (day) {
    case 'Lunes':
      return 1;
    case 'Martes':
      return 2;
    case 'Miércoles':
      return 3;
    case 'Jueves':
      return 4;
    case 'Viernes':
      return 5;
    case 'Sábado':
      return 6;
    case 'Domingo':
      return 7;
    default:
      return 1;
  }
}

export function indexToShellDay(day: number | null): ShellDay | null {
  if (day === 1) return 'Lunes';
  if (day === 2) return 'Martes';
  if (day === 3) return 'Miércoles';
  if (day === 4) return 'Jueves';
  if (day === 5) return 'Viernes';
  if (day === 6) return 'Sábado';
  if (day === 0 || day === 7) return 'Domingo';
  return null;
}

export function shoppingNameKey(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildInitialExpandedPlanDays(defaultExpanded: ShellDay = 'Lunes'): Record<ShellDay, boolean> {
  return SHELL_DAYS.reduce((acc, day) => {
    acc[day] = day === defaultExpanded;
    return acc;
  }, {} as Record<ShellDay, boolean>);
}

export function resolveTodayShellDay(date: Date = new Date()): ShellDay {
  const day = date.getDay();
  if (day === 0) return 'Domingo';
  if (day === 1) return 'Lunes';
  if (day === 2) return 'Martes';
  if (day === 3) return 'Miércoles';
  if (day === 4) return 'Jueves';
  if (day === 5) return 'Viernes';
  return 'Sábado';
}

function resolveShoppingRowKey(input: { shoppingKey?: string; canonicalName?: string; name: string }): string {
  const shoppingKey = input.shoppingKey?.trim();
  if (shoppingKey) return shoppingKey;
  const canonicalName = input.canonicalName?.trim();
  if (canonicalName) return shoppingNameKey(canonicalName);
  return shoppingNameKey(input.name);
}

function formatQuantityLabel(input: { displayAmount?: string; amount: number | string; displayUnit?: string; unit: string }): string | null {
  const amountText = (input.displayAmount ?? String(input.amount)).trim();
  const unitText = (input.displayUnit ?? input.unit).trim();
  const combined = `${amountText} ${unitText}`.replace(/\s+/g, ' ').trim();
  return combined.length > 0 ? combined : null;
}

function formatNumericQuantity(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/\.00$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
}

export function buildShellShoppingItems(
  plannedEntries: PlannedRecipeEntry[],
  recipesById: Map<string, FixedRecipeJson>,
  uiState: Record<string, ShoppingUiState>,
  options: BuildShellShoppingItemsOptions = {},
): ShoppingRowViewModel[] {
  const selectedRecipeSet = options.selectedRecipeIds && options.selectedRecipeIds.length > 0
    ? new Set(options.selectedRecipeIds)
    : null;
  const grouped = new Map<string, {
    key: string;
    name: string;
    recipeTitles: Set<string>;
    recipeIds: Set<string>;
    quantityLabels: Set<string>;
    totalsByUnit: Map<string, { unit: string; amount: number }>;
  }>();

  plannedEntries.forEach((entry) => {
    if (selectedRecipeSet && !selectedRecipeSet.has(entry.recipeId)) return;
    const recipe = recipesById.get(entry.recipeId);
    if (!recipe) return;

    recipe.ingredients.forEach((group) => {
      group.items.forEach((item) => {
        const key = resolveShoppingRowKey({
          shoppingKey: item.shoppingKey,
          canonicalName: item.canonicalName,
          name: item.name,
        });
        const existing = grouped.get(key);
        const quantityLabel = formatQuantityLabel({
          displayAmount: item.displayAmount,
          amount: item.amount,
          displayUnit: item.displayUnit,
          unit: item.unit,
        });
        const amount = typeof item.amount === 'number' && Number.isFinite(item.amount) ? item.amount : null;
        const resolvedUnit = (item.displayUnit ?? item.unit).trim();
        const unitKey = shoppingNameKey(resolvedUnit);

        if (existing) {
          existing.recipeTitles.add(recipe.title);
          existing.recipeIds.add(recipe.id);
          if (amount !== null && resolvedUnit.length > 0) {
            const current = existing.totalsByUnit.get(unitKey) ?? { unit: resolvedUnit, amount: 0 };
            current.amount += amount;
            existing.totalsByUnit.set(unitKey, current);
          } else if (quantityLabel) {
            existing.quantityLabels.add(quantityLabel);
          }
          return;
        }

        grouped.set(key, {
          key,
          name: item.name,
          recipeTitles: new Set([recipe.title]),
          recipeIds: new Set([recipe.id]),
          quantityLabels: quantityLabel ? new Set([quantityLabel]) : new Set<string>(),
          totalsByUnit: amount !== null && resolvedUnit.length > 0
            ? new Map([[unitKey, { unit: resolvedUnit, amount }]])
            : new Map(),
        });
      });
    });
  });

  const derivedRows = Array.from(grouped.values()).map((item) => {
    const numericTotals = Array.from(item.totalsByUnit.values()).filter((entry) => entry.amount > 0);
    const numericQuantity = numericTotals.length === 1 ? numericTotals[0] : null;
    const quantityLabel = numericQuantity
      ? `${formatNumericQuantity(numericQuantity.amount)} ${numericQuantity.unit}`.trim()
      : item.quantityLabels.values().next().value ?? 'Cantidad pendiente';

    return {
      key: item.key,
      name: item.name,
      recipeTitles: Array.from(item.recipeTitles),
      recipeIds: Array.from(item.recipeIds),
      quantityLabel,
      quantityValue: numericQuantity?.amount,
      quantityUnit: numericQuantity?.unit,
      checked: uiState[item.key]?.checked ?? false,
      price: uiState[item.key]?.price ?? '',
    };
  });

  const manualRows = (options.manualItems ?? []).map((item) => ({
    key: item.key,
    name: item.name,
    recipeTitles: [],
    recipeIds: [],
    quantityLabel: item.quantityLabel?.trim() || 'Libre',
    checked: uiState[item.key]?.checked ?? item.checked ?? false,
    price: uiState[item.key]?.price ?? item.price ?? '',
    isManual: true,
    persistedItemId: item.persistedItemId,
  }));

  return [...derivedRows, ...manualRows];
}
