import { useMemo, useState } from 'react';
import { CalendarRange, Pencil, Plus, RefreshCcw, ShoppingBasket, Trash2 } from 'lucide-react';
import type {
  ShoppingAggregationResult,
  ShoppingList,
  ShoppingListItem,
  ShoppingListView,
  WeeklyPlan,
} from '../../../types';
import { MainShellLayout } from './MainShellLayout';
import { ProductContainer, ProductEmptyState, ProductHeader, ProductPage, ProductSectionTitle, ProductSurface } from '../ui/product-system';

interface ShoppingListScreenProps {
  currentUserEmail: string | null;
  plan: WeeklyPlan | null;
  shoppingList: ShoppingList | null;
  shoppingItems: ShoppingListItem[];
  aggregation: ShoppingAggregationResult;
  isLoading: boolean;
  error: string | null;
  onGoHome: () => void;
  onGoMyRecipes: () => void;
  onGoFavorites: () => void;
  onGoShoppingList: () => void;
  onGoWeeklyPlan: () => void;
  onGoSettings: () => void;
  onSignOut: () => void;
  onRegenerateShopping: () => void;
  onToggleShoppingItem: (itemId: string, nextChecked: boolean) => void;
  onUpdateShoppingItem: (itemId: string, input: Partial<Pick<ShoppingListItem, 'itemName' | 'quantityText'>>) => void;
  onAddManualItem: (itemName: string, quantityText: string | null) => void;
  onRemoveShoppingItem: (itemId: string) => void;
}

type DraftState = {
  name: string;
  quantity: string;
};

export function ShoppingListScreen({
  currentUserEmail,
  plan,
  shoppingList,
  shoppingItems,
  aggregation,
  isLoading,
  error,
  onGoHome,
  onGoMyRecipes,
  onGoFavorites,
  onGoShoppingList,
  onGoWeeklyPlan,
  onGoSettings,
  onSignOut,
  onRegenerateShopping,
  onToggleShoppingItem,
  onUpdateShoppingItem,
  onAddManualItem,
  onRemoveShoppingItem,
}: ShoppingListScreenProps) {
  const [view, setView] = useState<ShoppingListView>('totalized');
  const [draft, setDraft] = useState<DraftState>({ name: '', quantity: '' });

  const autoItems = useMemo(() => shoppingItems.filter((item) => item.sourceType === 'plan_auto'), [shoppingItems]);
  const manualItems = useMemo(() => shoppingItems.filter((item) => item.sourceType === 'manual'), [shoppingItems]);
  const pendingCount = shoppingItems.filter((item) => !item.isChecked).length;

  return (
    <MainShellLayout
      activeItem="shopping-list"
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
        <ProductContainer className="space-y-6">
          <ProductHeader
            eyebrow="Compras"
            title={shoppingList?.title ?? 'Lista de compras'}
            description={plan?.weekStartDate ? `Basada en la semana desde ${new Date(plan.weekStartDate).toLocaleDateString()}` : 'Gestiona lo que comprarás y conserva tus añadidos manuales.'}
            actions={
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={onRegenerateShopping}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
                >
                  <RefreshCcw className="size-4" />
                  Regenerar desde plan
                </button>
                <button
                  onClick={onGoWeeklyPlan}
                  className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/80 px-4 py-3 text-sm font-bold text-foreground transition-colors hover:bg-primary/8"
                >
                  <CalendarRange className="size-4" />
                  Ver plan semanal
                </button>
              </div>
            }
          />

          {error ? <ProductSurface className="p-5 text-sm text-red-500">{error}</ProductSurface> : null}

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <ProductSurface className="p-6">
              <div className="flex flex-col gap-4 border-b border-primary/10 pb-5 md:flex-row md:items-center md:justify-between">
                <ProductSectionTitle
                  eyebrow="Operativo"
                  title="Lo que necesitas comprar"
                  description="Los items automáticos se recalculan desde el plan. Los manuales se conservan aunque regeneres."
                />
                <div className="flex flex-wrap gap-3">
                  <div className="rounded-2xl bg-primary/8 px-4 py-3 text-sm font-semibold text-primary">
                    {plan ? `${aggregation.byRecipe.length} recetas` : 'Sin plan'}
                  </div>
                  <div className="rounded-2xl bg-primary/8 px-4 py-3 text-sm font-semibold text-primary">
                    {pendingCount} pendientes
                  </div>
                  <div className="rounded-2xl bg-primary/8 px-4 py-3 text-sm font-semibold text-primary">
                    {manualItems.length} manuales
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-4">
                <div className="inline-flex rounded-full bg-primary/6 p-1">
                  <button
                    onClick={() => setView('totalized')}
                    className={`rounded-full px-4 py-2 text-sm font-bold ${view === 'totalized' ? 'bg-primary text-primary-foreground' : 'text-slate-600 dark:text-slate-300'}`}
                  >
                    Totalizada
                  </button>
                  <button
                    onClick={() => setView('by_recipe')}
                    className={`rounded-full px-4 py-2 text-sm font-bold ${view === 'by_recipe' ? 'bg-primary text-primary-foreground' : 'text-slate-600 dark:text-slate-300'}`}
                  >
                    Por receta
                  </button>
                </div>

                <div className="rounded-[1.5rem] border border-primary/10 bg-background/80 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Plus className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">Añadir item manual</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">No se mezclan con el cálculo automático y se mantienen al regenerar.</p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-[1fr_0.45fr_auto]">
                    <input
                      value={draft.name}
                      onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="Ej. papel toalla o salsa picante"
                      className="rounded-2xl border border-primary/15 bg-card/80 px-4 py-3 text-sm outline-none transition-colors focus:border-primary"
                    />
                    <input
                      value={draft.quantity}
                      onChange={(event) => setDraft((prev) => ({ ...prev, quantity: event.target.value }))}
                      placeholder="Cantidad opcional"
                      className="rounded-2xl border border-primary/15 bg-card/80 px-4 py-3 text-sm outline-none transition-colors focus:border-primary"
                    />
                    <button
                      onClick={() => {
                        onAddManualItem(draft.name, draft.quantity || null);
                        setDraft({ name: '', quantity: '' });
                      }}
                      className="rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
                    >
                      Añadir
                    </button>
                  </div>
                </div>
              </div>

              {isLoading ? (
                <div className="mt-6 text-sm text-slate-500">Cargando lista de compras...</div>
              ) : view === 'totalized' ? (
                <div className="mt-6 space-y-3">
                  {shoppingItems.length === 0 ? (
                    <ProductEmptyState message="Aún no hay items. Planifica recetas o añade compras manuales." />
                  ) : (
                    <>
                      {autoItems.length > 0 ? (
                        <div className="space-y-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">Generado desde el plan</p>
                          {autoItems.map((item) => (
                            <label key={item.id} className="flex items-center gap-3 rounded-2xl border border-primary/10 bg-background/80 px-4 py-3">
                              <input
                                type="checkbox"
                                checked={item.isChecked}
                                onChange={(event) => onToggleShoppingItem(item.id, event.target.checked)}
                                className="size-4 accent-[var(--primary)]"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className={`font-semibold ${item.isChecked ? 'line-through text-slate-400' : ''}`}>{item.itemName}</p>
                                  <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                                    Auto
                                  </span>
                                </div>
                                {item.quantityText ? <p className="text-sm text-slate-500 dark:text-slate-400">{item.quantityText}</p> : null}
                              </div>
                            </label>
                          ))}
                        </div>
                      ) : null}

                      {manualItems.length > 0 ? (
                        <div className="space-y-3 pt-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">Añadidos manuales</p>
                          {manualItems.map((item) => (
                            <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-primary/10 bg-background/80 px-4 py-3">
                              <input
                                type="checkbox"
                                checked={item.isChecked}
                                onChange={(event) => onToggleShoppingItem(item.id, event.target.checked)}
                                className="size-4 accent-[var(--primary)]"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <input
                                    value={item.itemName}
                                    onChange={(event) => onUpdateShoppingItem(item.id, { itemName: event.target.value })}
                                    className={`w-full bg-transparent text-sm font-semibold outline-none md:max-w-sm ${item.isChecked ? 'line-through text-slate-400' : ''}`}
                                  />
                                  <span className="rounded-full bg-slate-900/5 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-600 dark:bg-white/10 dark:text-slate-300">
                                    Manual
                                  </span>
                                </div>
                                <input
                                  value={item.quantityText ?? ''}
                                  onChange={(event) => onUpdateShoppingItem(item.id, { quantityText: event.target.value || null })}
                                  placeholder="Cantidad opcional"
                                  className="mt-1 w-full bg-transparent text-sm text-slate-500 outline-none dark:text-slate-400 md:max-w-sm"
                                />
                              </div>
                              <button
                                onClick={() => onRemoveShoppingItem(item.id)}
                                className="rounded-full border border-red-200 p-2 text-red-500"
                                title="Eliminar item manual"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {aggregation.byRecipe.length === 0 ? (
                    <ProductEmptyState message="Todavía no hay recetas planificadas para desglosar compras por origen." />
                  ) : (
                    aggregation.byRecipe.map((group) => (
                      <div key={group.planItemId} className="rounded-2xl border border-primary/10 bg-background/80 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold">{group.recipeName}</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {group.dayOfWeek !== null ? ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'][group.dayOfWeek] : 'Sin día'} · {group.slot ?? 'Sin slot'}
                            </p>
                          </div>
                          <div className="rounded-full bg-primary/8 px-3 py-1 text-xs font-semibold text-primary">
                            {group.items.length} item{group.items.length === 1 ? '' : 's'}
                          </div>
                        </div>
                        <div className="mt-3 space-y-2">
                          {group.items.map((entry) => (
                            <div key={entry.key} className="flex items-start justify-between gap-3 text-sm">
                              <div className="min-w-0">
                                <p>{entry.itemName}</p>
                                {entry.isAmbiguous ? (
                                  <p className="text-xs text-amber-600 dark:text-amber-400">Revisión manual sugerida</p>
                                ) : null}
                              </div>
                              <span className="shrink-0 text-slate-500 dark:text-slate-400">{entry.quantityText}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </ProductSurface>

            <ProductSurface className="p-6">
              <ProductSectionTitle
                eyebrow="Sincronización"
                title="Relación entre plan y compras"
                description="El plan define qué cocinarás. Compras consolida solo la parte automática y preserva lo manual."
              />

              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-primary/10 bg-background/75 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <ShoppingBasket className="size-5" />
                    </div>
                    <div>
                      <p className="font-semibold">Estado actual</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {plan ? `Plan activo: ${plan.title}` : 'Sin plan activo'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-primary/10 bg-background/75 p-4 text-sm text-slate-600 dark:text-slate-300">
                  <p className="font-semibold text-foreground">Regla de regeneración</p>
                  <p className="mt-2">
                    Al regenerar se recalculan solo los items automáticos. Los manuales se mantienen. Si editas un item automático, ese cambio puede perderse en la siguiente regeneración.
                  </p>
                </div>

                <div className="rounded-2xl border border-primary/10 bg-background/75 p-4">
                  <button
                    onClick={onGoWeeklyPlan}
                    className="inline-flex items-center gap-2 rounded-full border border-primary/15 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/8"
                  >
                    <Pencil className="size-4" />
                    Editar plan semanal
                  </button>
                </div>
              </div>
            </ProductSurface>
          </div>
        </ProductContainer>
      </ProductPage>
    </MainShellLayout>
  );
}
