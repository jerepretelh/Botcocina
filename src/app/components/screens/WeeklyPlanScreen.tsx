import { useMemo, useState } from 'react';
import { CalendarDays, CalendarPlus, ChevronRight, Pencil, Trash2, UtensilsCrossed } from 'lucide-react';
import type { Recipe, WeeklyPlan, WeeklyPlanItem, WeeklyPlanSlot, WeeklyPlanView } from '../../../types';
import { MainShellLayout } from './MainShellLayout';
import { ProductContainer, ProductEmptyState, ProductHeader, ProductPage, ProductSectionTitle, ProductSurface } from '../ui/product-system';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const SLOTS: WeeklyPlanSlot[] = ['desayuno', 'almuerzo', 'cena'];

interface WeeklyPlanScreenProps {
  currentUserEmail: string | null;
  plan: WeeklyPlan | null;
  items: WeeklyPlanItem[];
  recipesById: Record<string, Recipe>;
  isLoading: boolean;
  error: string | null;
  onGoHome: () => void;
  onGoMyRecipes: () => void;
  onGoFavorites: () => void;
  onGoWeeklyPlan: () => void;
  onGoShoppingList: () => void;
  onGoSettings: () => void;
  onSignOut: () => void;
  onEditPlanItem: (item: WeeklyPlanItem) => void;
  onRemovePlanItem: (itemId: string) => void;
  onOpenRecipeFromPlan: (item: WeeklyPlanItem) => void;
  onCookFromPlan: (item: WeeklyPlanItem) => void;
  onCreateNextWeek: () => void;
}

function slotLabel(slot: WeeklyPlanSlot): string {
  return slot.charAt(0).toUpperCase() + slot.slice(1);
}

function configLabel(item: WeeklyPlanItem): string {
  return item.configSnapshot.quantityMode === 'people'
    ? `${item.configSnapshot.peopleCount ?? 2} personas`
    : `${item.configSnapshot.availableCount ?? 0} ${item.configSnapshot.amountUnit === 'grams' ? 'g' : 'unid'} de base`;
}

export function WeeklyPlanScreen({
  currentUserEmail,
  plan,
  items,
  recipesById,
  isLoading,
  error,
  onGoHome,
  onGoMyRecipes,
  onGoFavorites,
  onGoWeeklyPlan,
  onGoShoppingList,
  onGoSettings,
  onSignOut,
  onEditPlanItem,
  onRemovePlanItem,
  onOpenRecipeFromPlan,
  onCookFromPlan,
  onCreateNextWeek,
}: WeeklyPlanScreenProps) {
  const [view, setView] = useState<WeeklyPlanView>('list');

  const totalServings = useMemo(
    () =>
      items.reduce((sum, item) => {
        if (item.configSnapshot.quantityMode === 'people') {
          return sum + (item.configSnapshot.peopleCount ?? 0);
        }
        return sum;
      }, 0),
    [items],
  );

  const itemsByDayAndSlot = useMemo(() => {
    const map = new Map<string, WeeklyPlanItem[]>();
    for (const item of items) {
      const key = `${item.dayOfWeek ?? -1}:${item.slot ?? 'otros'}`;
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }, [items]);

  return (
    <MainShellLayout
      activeItem="weekly-plan"
      currentUserEmail={currentUserEmail}
      onGoHome={onGoHome}
      onGoMyRecipes={onGoMyRecipes}
      onGoFavorites={onGoFavorites}
      onGoWeeklyPlan={onGoWeeklyPlan}
      onGoShoppingList={onGoShoppingList}
      onGoSettings={onGoSettings}
      onSignOut={onSignOut}
    >
      <ProductPage>
        <ProductContainer>
          <ProductHeader
            eyebrow="Plan semanal"
            title={plan?.title ?? 'Plan semanal'}
            description={plan?.weekStartDate ? `Semana desde ${new Date(plan.weekStartDate).toLocaleDateString()}` : 'Define qué cocinarás y usa Compras como módulo operativo.'}
            actions={
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={onGoShoppingList}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
                >
                  Abrir compras
                  <ChevronRight className="size-4" />
                </button>
                <button
                  onClick={onCreateNextWeek}
                  className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/80 px-4 py-3 text-sm font-bold text-foreground transition-colors hover:bg-primary/8"
                >
                  <CalendarPlus className="size-4" />
                  Nueva semana
                </button>
              </div>
            }
          />

          {error ? <ProductSurface className="p-5 text-sm text-red-500">{error}</ProductSurface> : null}

          <ProductSurface className="p-6">
            <div className="flex flex-col gap-4 border-b border-primary/10 pb-5 md:flex-row md:items-center md:justify-between">
              <ProductSectionTitle
                eyebrow="Plan"
                title="Organiza la semana"
                description="La lista de compras vive como módulo operativo aparte. Aquí solo defines recetas, días y configuración snapshot."
              />
              <div className="flex flex-wrap gap-3">
                <div className="rounded-2xl bg-primary/8 px-4 py-3 text-sm font-semibold text-primary">
                  {items.length} receta{items.length === 1 ? '' : 's'}
                </div>
                <div className="rounded-2xl bg-primary/8 px-4 py-3 text-sm font-semibold text-primary">
                  {totalServings} porciones
                </div>
              </div>
            </div>

            <div className="mt-5 inline-flex rounded-full bg-primary/6 p-1">
              <button
                onClick={() => setView('calendar')}
                className={`rounded-full px-4 py-2 text-sm font-bold ${view === 'calendar' ? 'bg-primary text-primary-foreground' : 'text-slate-600 dark:text-slate-300'}`}
              >
                Calendario
              </button>
              <button
                onClick={() => setView('list')}
                className={`rounded-full px-4 py-2 text-sm font-bold ${view === 'list' ? 'bg-primary text-primary-foreground' : 'text-slate-600 dark:text-slate-300'}`}
              >
                Lista
              </button>
            </div>

            {isLoading ? (
              <div className="mt-6 text-sm text-slate-500">Cargando plan semanal...</div>
            ) : items.length === 0 ? (
              <div className="mt-6">
                <ProductEmptyState message="Aún no tienes recetas planificadas. Usa los botones “Planificar” desde Inicio, biblioteca o receta abierta." />
              </div>
            ) : view === 'calendar' ? (
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {DAYS.map((day, dayIndex) => (
                  <div key={day} className="rounded-[1.5rem] border border-primary/10 bg-background/70 p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-lg font-bold">{day}</p>
                      <CalendarDays className="size-5 text-primary" />
                    </div>
                    <div className="space-y-3">
                      {SLOTS.map((slot) => {
                        const slotItems = itemsByDayAndSlot.get(`${dayIndex}:${slot}`) ?? [];
                        return (
                          <div key={slot} className="rounded-2xl border border-primary/10 bg-card/80 p-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">{slotLabel(slot)}</p>
                            <div className="mt-2 space-y-2">
                              {slotItems.length === 0 ? (
                                <p className="text-sm text-slate-400">Sin recetas</p>
                              ) : (
                                slotItems.map((item) => {
                                  const recipe = item.recipeId ? recipesById[item.recipeId] ?? null : null;
                                  return (
                                    <div key={item.id} className="rounded-xl border border-primary/10 bg-background/85 p-3">
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                          <p className="truncate font-bold">{item.recipeNameSnapshot}</p>
                                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{configLabel(item)}</p>
                                        </div>
                                        <div className="flex gap-2">
                                          <button className="rounded-full border border-primary/10 p-2 text-slate-500" onClick={() => onEditPlanItem(item)}>
                                            <Pencil className="size-4" />
                                          </button>
                                          <button className="rounded-full border border-primary/10 p-2 text-red-500" onClick={() => onRemovePlanItem(item.id)}>
                                            <Trash2 className="size-4" />
                                          </button>
                                        </div>
                                      </div>
                                      <div className="mt-3 flex flex-wrap gap-2">
                                        {recipe ? (
                                          <button className="rounded-full border border-primary/15 px-3 py-2 text-xs font-semibold" onClick={() => onOpenRecipeFromPlan(item)}>
                                            Abrir
                                          </button>
                                        ) : null}
                                        {recipe ? (
                                          <button className="rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground" onClick={() => onCookFromPlan(item)}>
                                            Cocinar
                                          </button>
                                        ) : null}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {items.map((item) => {
                  const recipe = item.recipeId ? recipesById[item.recipeId] ?? null : null;
                  return (
                    <div key={item.id} className="rounded-[1.5rem] border border-primary/10 bg-background/80 p-4">
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
                            {item.dayOfWeek !== null ? DAYS[item.dayOfWeek] : 'Sin día'} · {item.slot ? slotLabel(item.slot) : 'Sin slot'}
                          </p>
                          <h3 className="mt-2 text-xl font-bold">{item.recipeNameSnapshot}</h3>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{configLabel(item)}</p>
                          {item.notes ? <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{item.notes}</p> : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {recipe ? (
                            <button className="rounded-full border border-primary/15 px-4 py-2 text-sm font-semibold" onClick={() => onOpenRecipeFromPlan(item)}>
                              Abrir
                            </button>
                          ) : null}
                          {recipe ? (
                            <button className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" onClick={() => onCookFromPlan(item)}>
                              <span className="inline-flex items-center gap-2">
                                <UtensilsCrossed className="size-4" />
                                Cocinar
                              </span>
                            </button>
                          ) : null}
                          <button className="rounded-full border border-primary/15 px-4 py-2 text-sm font-semibold" onClick={() => onEditPlanItem(item)}>
                            Editar
                          </button>
                          <button className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-500" onClick={() => onRemovePlanItem(item.id)}>
                            Quitar
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ProductSurface>
        </ProductContainer>
      </ProductPage>
    </MainShellLayout>
  );
}
