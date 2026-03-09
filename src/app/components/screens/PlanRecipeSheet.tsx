import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Plus, Minus } from 'lucide-react';
import type {
  Recipe,
  RecipeContent,
  WeeklyPlanItem,
  WeeklyPlanItemConfigSnapshot,
  WeeklyPlanSlot,
} from '../../../types';
import { deriveRecipeSetupBehavior } from '../../lib/recipeSetupBehavior';
import { getIngredientKey, mapCountToPortion } from '../../utils/recipeHelpers';
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

interface PlanRecipeSheetProps {
  open: boolean;
  recipe: Recipe | null;
  recipeContent: RecipeContent | null;
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
    setSelectedOptionalIngredients(snapshot.selectedOptionalIngredients);
  }, [editingItem, initialSnapshot, open, recipe]);

  const optionalIngredients = (recipeContent?.ingredients ?? []).filter((ingredient) => !ingredient.indispensable);

  const handleSave = async () => {
    if (!recipe) return;
    setIsSaving(true);
    const resolvedPortion =
      quantityMode === 'have'
        ? mapCountToPortion(amountUnit === 'grams' ? Math.max(1, Math.round(availableCount / 250)) : availableCount)
        : mapCountToPortion(peopleCount);
    const scaleFactor =
      quantityMode === 'have'
        ? amountUnit === 'grams'
          ? Math.max(0.25, availableCount / (resolvedPortion === 1 ? 250 : resolvedPortion === 2 ? 500 : 1000))
          : Math.max(0.25, availableCount / resolvedPortion)
        : Math.max(0.25, peopleCount / resolvedPortion);

    try {
      await onSave({
        id: editingItem?.id,
        recipe,
        dayOfWeek,
        slot,
        notes: notes.trim() || null,
        configSnapshot: {
          quantityMode,
          peopleCount: quantityMode === 'people' ? peopleCount : peopleCount,
          amountUnit: quantityMode === 'have' ? amountUnit : null,
          availableCount: quantityMode === 'have' ? availableCount : null,
          selectedOptionalIngredients,
          sourceContextSummary: initialSnapshot?.sourceContextSummary ?? editingItem?.configSnapshot.sourceContextSummary ?? null,
          resolvedPortion,
          scaleFactor,
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
          <SheetTitle className="text-left text-2xl font-bold">Planificar receta</SheetTitle>
          <SheetDescription className="text-left">
            Guarda una snapshot de la receta con su configuración semanal. Los cambios futuros en la receta no alterarán este ítem.
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
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Receta</p>
                  <h3 className="text-lg font-bold">{recipe.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{recipe.description}</p>
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
              {supportsIngredientMode && (
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
                  <button
                    type="button"
                    onClick={() => {
                      if (quantityMode === 'people') setPeopleCount((prev) => Math.max(1, prev - 1));
                      else setAvailableCount((prev) => Math.max(amountUnit === 'grams' ? 50 : 1, prev - (amountUnit === 'grams' ? 50 : 1)));
                    }}
                    className="flex size-12 items-center justify-center rounded-full border border-primary/20 text-primary"
                  >
                    <Minus className="size-5" />
                  </button>
                  <div className="text-center">
                    <div className="text-5xl font-black text-primary">
                      {quantityMode === 'people' ? peopleCount : availableCount}
                    </div>
                    <div className="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                      {quantityMode === 'people' ? 'Personas' : amountUnit === 'grams' ? 'Gramos' : 'Unidades'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (quantityMode === 'people') setPeopleCount((prev) => Math.min(20, prev + 1));
                      else setAvailableCount((prev) => prev + (amountUnit === 'grams' ? 50 : 1));
                    }}
                    className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground"
                  >
                    <Plus className="size-5" />
                  </button>
                </div>
                {supportsIngredientMode && quantityMode === 'have' && (
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
              </div>

              {optionalIngredients.length > 0 && (
                <div>
                  <p className="mb-3 text-sm font-semibold">Ingredientes opcionales</p>
                  <div className="flex flex-wrap gap-2">
                    {optionalIngredients.map((ingredient) => {
                      const key = getIngredientKey(ingredient.name);
                      const active = selectedOptionalIngredients.length === 0 || selectedOptionalIngredients.includes(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setSelectedOptionalIngredients((prev) => {
                              const base = prev.length === 0
                                ? optionalIngredients.map((item) => getIngredientKey(item.name))
                                : prev;
                              return base.includes(key) ? base.filter((item) => item !== key) : [...base, key];
                            });
                          }}
                          className={`rounded-full border px-3 py-2 text-sm font-semibold transition-colors ${active ? 'border-primary bg-primary/10 text-primary' : 'border-primary/10 bg-background/80 text-slate-500 dark:text-slate-300'}`}
                        >
                          {ingredient.emoji} {ingredient.name}
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
          <Button onClick={() => void handleSave()} disabled={!recipe || isSaving}>
            {isSaving ? 'Guardando...' : editingItem ? 'Actualizar plan' : 'Agregar al plan'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
