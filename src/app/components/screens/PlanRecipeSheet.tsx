import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Plus, Minus } from 'lucide-react';
import type {
  Recipe,
  RecipeContent,
  WeeklyPlanItem,
  WeeklyPlanItemConfigSnapshot,
  WeeklyPlanSlot,
} from '../../../types';
import type { ContainerMetaV2, CookingContextV2, RecipeV2, RecipeYieldV2 } from '../../types/recipe-v2';
import { deriveRecipeSetupBehavior } from '../../lib/recipeSetupBehavior';
import { getIngredientKey, mapCountToPortion } from '../../utils/recipeHelpers';
import { deriveTargetYieldFromLegacy, describeRecipeYield } from '../../lib/recipeV2';
import { deriveLegacyPlanCompatFromTargetYield } from '../../lib/planSnapshotCompat';
import { convertCanonicalVolumeToVisible, requiresExplicitContainerCapacity } from '../../lib/recipe-v2/measurements';
import { getSetupQuestion, shouldShowCookingContextBlock, usesDiscreteContainerControl } from '../../lib/recipe-v2/setupUxContract';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '../ui/sheet';
import { Button } from '../ui/button';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const SLOTS: WeeklyPlanSlot[] = ['desayuno', 'almuerzo', 'cena'];

function getYieldDisplayValue(yieldValue: RecipeYieldV2 | null | undefined) {
  if (!yieldValue) return 'Base';
  if (yieldValue.type === 'pan_size' || yieldValue.type === 'tray_size') {
    return yieldValue.containerMeta?.sizeLabel ?? yieldValue.label ?? 'Recipiente';
  }
  if (yieldValue.value == null) return 'Base';
  if (yieldValue.type === 'volume' && yieldValue.canonicalUnit === 'ml') {
    const visible = convertCanonicalVolumeToVisible(yieldValue.value, yieldValue.visibleUnit, yieldValue.containerMeta);
    return String(Number(visible.toFixed(visible >= 10 ? 1 : 2))).replace(/\.0$/, '');
  }
  return `${yieldValue.value}`;
}

export function shouldShowPlanYieldStepper(yieldValue: RecipeYieldV2 | null | undefined) {
  return yieldValue?.type !== 'pan_size' && yieldValue?.type !== 'tray_size';
}

interface PlanRecipeSheetProps {
  open: boolean;
  recipe: Recipe | null;
  recipeContent: RecipeContent | null;
  recipeV2: RecipeV2 | null;
  initialSnapshot: WeeklyPlanItemConfigSnapshot | null;
  editingItem: WeeklyPlanItem | null;
  onOpenChange: (open: boolean) => void;
  onSave: (input: {
    id?: string;
    recipe: Recipe;
    dayOfWeek: number | null;
    slot: WeeklyPlanSlot | null;
    notes: string | null;
    configSnapshot: WeeklyPlanItemConfigSnapshot;
  }) => Promise<void>;
}

export function PlanRecipeSheet({
  open,
  recipe,
  recipeContent,
  recipeV2,
  initialSnapshot,
  editingItem,
  onOpenChange,
  onSave,
}: PlanRecipeSheetProps) {
  const supportsIngredientMode = useMemo(
    () => deriveRecipeSetupBehavior(recipe, recipeContent, null) !== 'servings_only',
    [recipe, recipeContent],
  );
  const [dayOfWeek, setDayOfWeek] = useState<number | null>(editingItem?.dayOfWeek ?? 0);
  const [slot, setSlot] = useState<WeeklyPlanSlot | null>(editingItem?.slot ?? 'almuerzo');
  const [notes, setNotes] = useState<string>(editingItem?.notes ?? '');
  const [quantityMode, setQuantityMode] = useState<'people' | 'have'>('people');
  const [peopleCount, setPeopleCount] = useState(2);
  const [amountUnit, setAmountUnit] = useState<'units' | 'grams'>('units');
  const [availableCount, setAvailableCount] = useState(2);
  const [selectedYield, setSelectedYield] = useState<RecipeYieldV2 | null>(null);
  const [selectedCookingContext, setSelectedCookingContext] = useState<CookingContextV2 | null>(null);
  const [selectedOptionalIngredients, setSelectedOptionalIngredients] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open || !recipe) return;
    const snapshot = editingItem?.configSnapshot ?? initialSnapshot;
    if (!snapshot) return;
    setDayOfWeek(editingItem?.dayOfWeek ?? 0);
    setSlot(editingItem?.slot ?? 'almuerzo');
    setNotes(editingItem?.notes ?? '');
    setQuantityMode(snapshot.quantityMode);
    setPeopleCount(snapshot.peopleCount ?? 2);
    setAmountUnit((snapshot.amountUnit ?? 'units') as 'units' | 'grams');
    setAvailableCount(snapshot.availableCount ?? 2);
    setSelectedYield(snapshot.targetYield ?? recipeV2?.baseYield ?? null);
    setSelectedCookingContext(snapshot.cookingContext ?? recipeV2?.cookingContextDefaults ?? null);
    setSelectedOptionalIngredients(snapshot.selectedOptionalIngredients);
  }, [editingItem, initialSnapshot, open, recipe, recipeV2]);

  const optionalIngredients = useMemo(() => {
    if (recipeV2) {
      return recipeV2.ingredients
        .filter((ingredient) => !ingredient.indispensable)
        .map((ingredient) => ({
          key: ingredient.id,
          label: ingredient.name,
          emoji: ingredient.emoji,
        }));
    }
    return (recipeContent?.ingredients ?? [])
      .filter((ingredient) => !ingredient.indispensable)
      .map((ingredient) => ({
        key: getIngredientKey(ingredient.name),
        label: ingredient.name,
        emoji: ingredient.emoji,
      }));
  }, [recipeContent, recipeV2]);

  const activeYield = selectedYield ?? recipeV2?.baseYield ?? initialSnapshot?.targetYield ?? null;
  const isYieldDriven = Boolean(recipeV2 && activeYield);
  const showCookingContextBlock = shouldShowCookingContextBlock(recipeV2, activeYield);
  const hasDiscreteContainerYield = usesDiscreteContainerControl(activeYield);
  const showYieldStepper = !isYieldDriven || shouldShowPlanYieldStepper(activeYield);
  const yieldStep = activeYield?.type === 'weight'
    ? 50
    : activeYield?.type === 'volume'
      ? activeYield.visibleUnit === 'l'
        ? 500
        : activeYield.visibleUnit === 'taza'
          ? 240
          : activeYield.visibleUnit === 'vaso'
            ? (activeYield.containerMeta?.capacityMl ?? 240)
            : 50
      : 1;
  const yieldUnitLabel = activeYield?.label ?? activeYield?.visibleUnit ?? activeYield?.unit ?? 'cantidad';
  const yieldValue = getYieldDisplayValue(activeYield);

  const adjustYield = (delta: number) => {
    if (!activeYield) return;
    if (activeYield.type === 'pan_size' || activeYield.type === 'tray_size') return;
    const currentValue = activeYield.value ?? 0;
    const min = activeYield.type === 'weight'
      ? 100
      : activeYield.type === 'volume'
        ? yieldStep
        : 1;
    const nextValue = Math.max(min, currentValue + (delta * yieldStep));
    setSelectedYield({
      ...activeYield,
      value: nextValue,
    });
  };

  const applyVolumeUnit = (unit: 'ml' | 'l' | 'taza' | 'vaso') => {
    if (!activeYield) return;
    const labelMap: Record<typeof unit, string> = {
      ml: 'ml',
      l: 'l',
      taza: 'tazas',
      vaso: 'vasos',
    };
    setSelectedYield({
      ...activeYield,
      visibleUnit: unit,
      unit,
      label: labelMap[unit],
      containerMeta:
        unit === 'vaso'
          ? { kind: 'glass', sizeLabel: 'vaso estándar', capacityMl: activeYield.containerMeta?.capacityMl ?? 240 }
          : activeYield.containerMeta,
    });
  };

  const applyContainerPreset = (key: string, meta: ContainerMetaV2) => {
    if (!activeYield) return;
    setSelectedYield({
      ...activeYield,
      value: 1,
      containerKey: key,
      containerMeta: meta,
      visibleUnit: meta.sizeLabel ?? activeYield.visibleUnit,
      label: meta.sizeLabel ?? activeYield.label,
      unit: meta.sizeLabel ?? activeYield.unit,
    });
  };

  const updateContainerDimension = (field: 'diameterCm' | 'capacityMl', rawValue: string) => {
    if (!activeYield) return;
    const parsed = rawValue ? Number(rawValue) : null;
    if (parsed !== null && !Number.isFinite(parsed)) return;
    setSelectedYield({
      ...activeYield,
      containerMeta: {
        kind: activeYield.containerMeta?.kind ?? (activeYield.type === 'pan_size' ? 'mold' : 'tray'),
        sizeLabel: activeYield.containerMeta?.sizeLabel ?? activeYield.label ?? activeYield.visibleUnit ?? 'Personalizado',
        ...activeYield.containerMeta,
        [field]: parsed,
      },
    });
  };

  const applyCookingContextPreset = (key: string, meta: ContainerMetaV2) => {
    setSelectedCookingContext({
      selectedContainerKey: key,
      selectedContainerMeta: meta,
    });
  };

  const updateCookingContextDimension = (field: 'capacityMl', rawValue: string) => {
    const parsed = rawValue ? Number(rawValue) : null;
    if (parsed !== null && !Number.isFinite(parsed)) return;
    setSelectedCookingContext({
      selectedContainerKey: selectedCookingContext?.selectedContainerKey ?? null,
      selectedContainerMeta: {
        kind: selectedCookingContext?.selectedContainerMeta?.kind ?? 'basket',
        sizeLabel: selectedCookingContext?.selectedContainerMeta?.sizeLabel ?? 'Canasta personalizada',
        ...selectedCookingContext?.selectedContainerMeta,
        [field]: parsed,
      },
    });
  };

  const legacyResolvedPortion = quantityMode === 'have'
    ? mapCountToPortion(amountUnit === 'grams' ? Math.max(1, Math.round(availableCount / 250)) : availableCount)
    : mapCountToPortion(peopleCount);
  const legacyScaleFactor = quantityMode === 'have'
    ? amountUnit === 'grams'
      ? Math.max(0.25, availableCount / (legacyResolvedPortion === 1 ? 250 : legacyResolvedPortion === 2 ? 500 : 1000))
      : Math.max(0.25, availableCount / legacyResolvedPortion)
    : Math.max(0.25, peopleCount / legacyResolvedPortion);

  const handleSave = async () => {
    if (!recipe) return;
    setIsSaving(true);
    try {
      const targetYield = isYieldDriven
        ? activeYield
        : deriveTargetYieldFromLegacy({
            quantityMode,
            peopleCount,
            amountUnit,
            availableCount,
            recipe,
            content: recipeContent,
          });
      const compat = deriveLegacyPlanCompatFromTargetYield(targetYield, recipeV2);
      await onSave({
        id: editingItem?.id,
        recipe,
        dayOfWeek,
        slot,
        notes: notes.trim() || null,
        configSnapshot: {
          quantityMode: isYieldDriven ? compat.quantityMode : quantityMode,
          peopleCount: isYieldDriven ? compat.peopleCount : peopleCount,
          amountUnit: isYieldDriven ? compat.amountUnit : quantityMode === 'have' ? amountUnit : null,
          availableCount: isYieldDriven ? compat.availableCount : quantityMode === 'have' ? availableCount : null,
          targetYield,
          cookingContext: recipeV2?.steps.some((step) => step.equipment === 'airfryer')
            ? selectedCookingContext ?? recipeV2?.cookingContextDefaults ?? null
            : null,
          selectedOptionalIngredients,
          sourceContextSummary: {
            ...(initialSnapshot?.sourceContextSummary ?? editingItem?.configSnapshot.sourceContextSummary ?? {}),
            cookingContext: recipeV2?.steps.some((step) => step.equipment === 'airfryer')
              ? selectedCookingContext ?? recipeV2?.cookingContextDefaults ?? null
              : null,
          },
          resolvedPortion: isYieldDriven ? compat.resolvedPortion : legacyResolvedPortion,
          scaleFactor: isYieldDriven ? compat.scaleFactor : legacyScaleFactor,
        },
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-xl overflow-y-auto border-primary/10 bg-background">
        <SheetHeader>
          <SheetTitle className="text-left text-2xl font-bold">Configurar para el plan</SheetTitle>
          <SheetDescription className="text-left">
            Guarda esta receta con la configuración que quieres usar en la semana.
          </SheetDescription>
        </SheetHeader>

        {recipe && (
          <div className="mt-6 space-y-6">
            <div className="rounded-[1.5rem] border border-primary/10 bg-card/85 p-5">
              <div className="flex items-center gap-4">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-3xl">
                  {recipe.icon}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Configuración de receta</p>
                  <h3 className="text-lg font-bold">{recipe.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{recipe.description}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
                    Referencia {describeRecipeYield(recipeV2?.baseYield ?? initialSnapshot?.targetYield ?? deriveTargetYieldFromLegacy({
                      quantityMode: 'people',
                      peopleCount: recipe.basePortions ?? recipeContent?.baseServings ?? 2,
                      recipe,
                      content: recipeContent,
                    }))}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 rounded-[1.5rem] border border-primary/10 bg-card/85 p-5">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-5 text-primary" />
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Semana</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-semibold">Día</p>
                  <div className="grid grid-cols-2 gap-2">
                    {DAYS.map((label, index) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setDayOfWeek(index)}
                        className={`rounded-2xl border px-3 py-2 text-sm font-semibold transition-colors ${dayOfWeek === index ? 'border-primary bg-primary/10 text-primary' : 'border-primary/10 bg-background/80 text-slate-600 dark:text-slate-300'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold">Momento</p>
                  <div className="grid gap-2">
                    {SLOTS.map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setSlot(value)}
                        className={`rounded-2xl border px-3 py-3 text-sm font-semibold capitalize transition-colors ${slot === value ? 'border-primary bg-primary/10 text-primary' : 'border-primary/10 bg-background/80 text-slate-600 dark:text-slate-300'}`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 rounded-[1.5rem] border border-primary/10 bg-card/85 p-5">
              {!isYieldDriven && supportsIngredientMode && (
                <div className="grid grid-cols-2 gap-2 rounded-[1.25rem] bg-primary/6 p-2">
                  <button
                    type="button"
                    onClick={() => setQuantityMode('people')}
                    className={`rounded-[1rem] px-4 py-3 text-sm font-bold transition-all ${quantityMode === 'people' ? 'bg-primary text-primary-foreground' : 'text-slate-600 dark:text-slate-300'}`}
                  >
                    Porciones
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuantityMode('have')}
                    className={`rounded-[1rem] px-4 py-3 text-sm font-bold transition-all ${quantityMode === 'have' ? 'bg-primary text-primary-foreground' : 'text-slate-600 dark:text-slate-300'}`}
                  >
                    Ingrediente base
                  </button>
                </div>
              )}

              <div className="rounded-[1.5rem] border border-primary/10 bg-background/80 p-5">
                <div className="flex items-center justify-between">
                  {showYieldStepper ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (isYieldDriven) {
                          adjustYield(-1);
                        } else if (quantityMode === 'people') {
                          setPeopleCount((prev) => Math.max(1, prev - 1));
                        } else {
                          setAvailableCount((prev) => Math.max(amountUnit === 'grams' ? 50 : 1, prev - (amountUnit === 'grams' ? 50 : 1)));
                        }
                      }}
                      className="flex size-12 items-center justify-center rounded-full border border-primary/20 text-primary"
                    >
                      <Minus className="size-5" />
                    </button>
                  ) : <div className="size-12 shrink-0" aria-hidden="true" />}
                  <div className="text-center">
                    <div className="text-5xl font-black text-primary">
                      {isYieldDriven ? (yieldValue ?? 'Base') : quantityMode === 'people' ? peopleCount : availableCount}
                    </div>
                    <div className="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                      {isYieldDriven
                        ? yieldUnitLabel
                        : quantityMode === 'people'
                          ? 'Personas'
                          : amountUnit === 'grams'
                            ? 'Gramos'
                            : 'Unidades'}
                    </div>
                    {isYieldDriven ? (
                      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                        {getSetupQuestion(recipeV2, activeYield?.type)}
                      </p>
                    ) : null}
                  </div>
                  {showYieldStepper ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (isYieldDriven) {
                          adjustYield(1);
                        } else if (quantityMode === 'people') {
                          setPeopleCount((prev) => Math.min(20, prev + 1));
                        } else {
                          setAvailableCount((prev) => prev + (amountUnit === 'grams' ? 50 : 1));
                        }
                      }}
                      className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground"
                    >
                      <Plus className="size-5" />
                    </button>
                  ) : <div className="size-12 shrink-0" aria-hidden="true" />}
                </div>
                {isYieldDriven && activeYield?.type === 'volume' ? (
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {(['ml', 'l', 'taza', 'vaso'] as const).map((unit) => (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => applyVolumeUnit(unit)}
                        className={`rounded-full px-4 py-2 text-xs font-semibold ${activeYield.visibleUnit === unit ? 'bg-primary text-primary-foreground' : 'bg-card text-slate-600 dark:text-slate-300'}`}
                      >
                        {unit}
                      </button>
                    ))}
                  </div>
                ) : null}
                {!isYieldDriven && supportsIngredientMode && quantityMode === 'have' && (
                  <div className="mt-4 flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAmountUnit('units')}
                      className={`rounded-full px-4 py-2 text-xs font-semibold ${amountUnit === 'units' ? 'bg-primary text-primary-foreground' : 'bg-card text-slate-600 dark:text-slate-300'}`}
                    >
                      unid
                    </button>
                    <button
                      type="button"
                      onClick={() => setAmountUnit('grams')}
                      className={`rounded-full px-4 py-2 text-xs font-semibold ${amountUnit === 'grams' ? 'bg-primary text-primary-foreground' : 'bg-card text-slate-600 dark:text-slate-300'}`}
                    >
                      gramos
                    </button>
                  </div>
                )}
                {isYieldDriven && activeYield?.visibleUnit === 'vaso' ? (
                  <div className="mt-4">
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Capacidad del vaso (ml)</label>
                    <input
                      type="number"
                      min={100}
                      step={10}
                      value={activeYield.containerMeta?.capacityMl ?? 240}
                      onChange={(event) => updateContainerDimension('capacityMl', event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-primary/10 bg-background/80 px-4 py-3 outline-none focus:border-primary"
                    />
                  </div>
                ) : null}
                {isYieldDriven && (activeYield?.type === 'pan_size' || activeYield?.type === 'tray_size') ? (
                  <div className="mt-4 space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {(
                        activeYield.type === 'pan_size'
                          ? [
                              ['mold-small', { kind: 'mold', sizeLabel: 'Molde pequeño', diameterCm: 18 }],
                              ['mold-medium', { kind: 'mold', sizeLabel: 'Molde mediano', diameterCm: 22 }],
                              ['mold-large', { kind: 'mold', sizeLabel: 'Molde grande', diameterCm: 26 }],
                            ]
                          : [
                              ['basket-small', { kind: 'basket', sizeLabel: 'Canasta pequeña', capacityMl: 2500 }],
                              ['basket-medium', { kind: 'basket', sizeLabel: 'Canasta mediana', capacityMl: 3500 }],
                              ['basket-large', { kind: 'basket', sizeLabel: 'Canasta grande', capacityMl: 5000 }],
                            ]
                      ).map(([key, meta]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => applyContainerPreset(key, meta as ContainerMetaV2)}
                          className={`rounded-full px-4 py-2 text-sm font-semibold ${activeYield.containerKey === key ? 'bg-primary text-primary-foreground' : 'bg-card text-slate-600 dark:text-slate-300'}`}
                        >
                          {(meta as ContainerMetaV2).sizeLabel}
                        </button>
                      ))}
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {activeYield.type === 'pan_size' ? 'Diámetro del molde (cm)' : 'Capacidad de canasta/bandeja (ml)'}
                      </label>
                      <input
                        type="number"
                        min={activeYield.type === 'pan_size' ? 12 : 1000}
                        step={activeYield.type === 'pan_size' ? 1 : 100}
                        value={activeYield.type === 'pan_size' ? (activeYield.containerMeta?.diameterCm ?? '') : (activeYield.containerMeta?.capacityMl ?? '')}
                        onChange={(event) => updateContainerDimension(activeYield.type === 'pan_size' ? 'diameterCm' : 'capacityMl', event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-primary/10 bg-background/80 px-4 py-3 outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                ) : null}
                {isYieldDriven && showCookingContextBlock ? (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Canasta airfryer</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        ['basket-small', { kind: 'basket', sizeLabel: 'Canasta pequeña', capacityMl: 2500 }],
                        ['basket-medium', { kind: 'basket', sizeLabel: 'Canasta mediana', capacityMl: 3500 }],
                        ['basket-large', { kind: 'basket', sizeLabel: 'Canasta grande', capacityMl: 5000 }],
                      ].map(([key, meta]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => applyCookingContextPreset(key, meta as ContainerMetaV2)}
                          className={`rounded-full px-4 py-2 text-sm font-semibold ${selectedCookingContext?.selectedContainerKey === key ? 'bg-primary text-primary-foreground' : 'bg-card text-slate-600 dark:text-slate-300'}`}
                        >
                          {(meta as ContainerMetaV2).sizeLabel}
                        </button>
                      ))}
                    </div>
                    <div className="mt-3">
                      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Capacidad de canasta (ml)</label>
                      <input
                        type="number"
                        min={1000}
                        step={100}
                        value={selectedCookingContext?.selectedContainerMeta?.capacityMl ?? ''}
                        onChange={(event) => updateCookingContextDimension('capacityMl', event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-primary/10 bg-background/80 px-4 py-3 outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                ) : null}
              </div>

              {optionalIngredients.length > 0 && (
                <div>
                  <p className="mb-3 text-sm font-semibold">Ingredientes opcionales</p>
                  <div className="flex flex-wrap gap-2">
                    {optionalIngredients.map((ingredient) => {
                      const key = ingredient.key;
                      const active = selectedOptionalIngredients.length === 0 || selectedOptionalIngredients.includes(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setSelectedOptionalIngredients((prev) => {
                              const base = prev.length === 0
                                ? optionalIngredients.map((item) => item.key)
                                : prev;
                              return base.includes(key) ? base.filter((item) => item !== key) : [...base, key];
                            });
                          }}
                          className={`rounded-full border px-3 py-2 text-sm font-semibold transition-colors ${active ? 'border-primary bg-primary/10 text-primary' : 'border-primary/10 bg-background/80 text-slate-500 dark:text-slate-300'}`}
                        >
                          {ingredient.emoji} {ingredient.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <p className="mb-2 text-sm font-semibold">Notas</p>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  className="w-full rounded-2xl border border-primary/10 bg-background/80 px-4 py-3 outline-none focus:border-primary"
                  placeholder="Ej: cocinar el miércoles en la noche, dejar marinado desde temprano..."
                />
              </div>
            </div>
          </div>
        )}

        <SheetFooter className="mt-8 sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSave()} disabled={!recipe || isSaving || requiresExplicitContainerCapacity(activeYield)}>
            {isSaving ? 'Guardando...' : editingItem ? 'Actualizar plan' : 'Agregar al plan'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
