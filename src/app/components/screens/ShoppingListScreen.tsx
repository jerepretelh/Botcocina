import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarRange, CircleOff, PackagePlus, RefreshCcw, ShoppingCart } from 'lucide-react';
import type {
  ShoppingAggregationResult,
  ShoppingList,
  ShoppingListItem,
  ShoppingTrip,
  ShoppingTripItem,
  ShoppingVarianceSummary,
  WeeklyPlan,
} from '../../../types';
import { MainShellLayout } from './MainShellLayout';
import { Button } from '../ui/button';
import { ProductContainer, ProductEmptyState, ProductHeader, ProductPage, ProductSurface } from '../ui/product-system';

interface ShoppingListScreenProps {
  currentUserEmail: string | null;
  plan: WeeklyPlan | null;
  shoppingList: ShoppingList | null;
  shoppingItems: ShoppingListItem[];
  shoppingTrip: ShoppingTrip | null;
  shoppingTripItems: ShoppingTripItem[];
  aggregation: ShoppingAggregationResult;
  variance: ShoppingVarianceSummary;
  isLoading: boolean;
  error: string | null;
  onGoShoppingList: () => void;
  onGoWeeklyPlan: () => void;
  onSignOut: () => void;
  onRegenerateShopping: () => void;
  onToggleShoppingItem: (itemId: string, nextChecked: boolean) => void;
  onUpdateShoppingItem: (itemId: string, input: Partial<Pick<ShoppingListItem, 'itemName' | 'quantityText'>>) => void;
  onAddManualItem: (itemName: string, quantityText: string | null) => void;
  onRemoveShoppingItem: (itemId: string) => void;
  onStartShoppingTrip: () => void;
  onToggleTripItemInCart: (itemId: string, nextChecked: boolean) => void;
  onMarkTripItemSkipped: (itemId: string) => void;
  onUpdateTripItem: (
    itemId: string,
    input: Partial<Pick<ShoppingTripItem, 'actualItemName' | 'actualQuantityText' | 'lineTotal' | 'notes' | 'status' | 'isInCart'>>,
  ) => void;
  onAddExtraTripItem: (itemName: string, quantityText: string | null, lineTotal: number | null) => void;
  onUpdateTripMeta: (input: Partial<Pick<ShoppingTrip, 'storeName' | 'estimatedTotal' | 'finalTotal'>>) => void;
  onCheckoutTrip: (finalTotal: number | null, storeName: string | null) => void;
}

type ShoppingScreenMode = 'planned' | 'trip';

function formatCurrency(value: number | null): string {
  return value === null
    ? 'Sin precio'
    : new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value);
}

function formatWeekRange(weekStartDate: string | null | undefined): string {
  if (!weekStartDate) {
    return 'Plan semanal activo';
  }

  const start = new Date(`${weekStartDate}T00:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return `Semana del ${start.toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'long',
  })} al ${end.toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'long',
  })}`;
}

function Badge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'primary' | 'success' | 'danger';
}) {
  const classes =
    tone === 'primary'
      ? 'bg-primary/10 text-primary'
      : tone === 'success'
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
        : tone === 'danger'
          ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'
          : 'bg-slate-900/5 text-slate-500 dark:bg-white/10 dark:text-slate-300';

  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${classes}`}>{label}</span>;
}

function PlannedItemRow({
  item,
  subtitle,
  badgeLabel,
  badgeTone,
  editable = false,
  onToggle,
  onRename,
  onQuantityChange,
  onRemove,
}: {
  item: ShoppingListItem;
  subtitle?: string | null;
  badgeLabel?: string;
  badgeTone?: 'neutral' | 'primary' | 'success';
  editable?: boolean;
  onToggle: (nextChecked: boolean) => void;
  onRename?: (value: string) => void;
  onQuantityChange?: (value: string) => void;
  onRemove?: () => void;
}) {
  return (
    <div
      className={`rounded-[1.35rem] border px-4 py-4 transition-colors ${
        item.isChecked
          ? 'border-transparent bg-slate-100/90 opacity-70 dark:bg-white/5'
          : 'border-primary/10 bg-white/85 shadow-sm dark:bg-white/5'
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onToggle(!item.isChecked)}
          className={`mt-1 flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
            item.isChecked ? 'border-primary bg-primary text-white' : 'border-primary/25 bg-transparent text-transparent'
          }`}
          aria-label={item.isChecked ? 'Marcar como pendiente' : 'Marcar como resuelto'}
        >
          ✓
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {editable && onRename ? (
                <input
                  value={item.itemName}
                  onChange={(event) => onRename(event.target.value)}
                  className={`w-full bg-transparent text-sm font-semibold outline-none ${
                    item.isChecked ? 'line-through text-slate-400' : 'text-slate-900 dark:text-slate-100'
                  }`}
                />
              ) : (
                <p className={`text-sm font-semibold ${item.isChecked ? 'line-through text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>
                  {item.itemName}
                </p>
              )}

              {subtitle ? <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
            </div>

            <div className="shrink-0 text-right">
              {item.quantityText ? <p className="text-sm font-bold text-primary">{item.quantityText}</p> : null}
              {badgeLabel ? <div className="mt-2 flex justify-end"><Badge label={badgeLabel} tone={badgeTone} /></div> : null}
            </div>
          </div>

          {editable ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_160px_auto]">
              <input
                value={item.quantityText ?? ''}
                onChange={(event) => onQuantityChange?.(event.target.value)}
                placeholder="Cantidad opcional"
                className="rounded-xl border border-primary/10 bg-background/80 px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
              <div className="hidden sm:block" />
              {onRemove ? (
                <button
                  type="button"
                  onClick={onRemove}
                  className="justify-self-start rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-500 transition-colors hover:bg-red-50 dark:border-red-500/30 dark:hover:bg-red-500/10"
                >
                  Eliminar
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TripItemRow({
  item,
  onToggleInCart,
  onMarkSkipped,
  onUpdate,
}: {
  item: ShoppingTripItem;
  onToggleInCart: (nextChecked: boolean) => void;
  onMarkSkipped: () => void;
  onUpdate: (
    input: Partial<Pick<ShoppingTripItem, 'actualItemName' | 'actualQuantityText' | 'lineTotal' | 'notes' | 'status' | 'isInCart'>>,
  ) => void;
}) {
  const statusLabel = item.status === 'in_cart' ? 'Comprado' : item.status === 'skipped' ? 'No comprado' : 'Pendiente';
  const statusTone = item.status === 'in_cart' ? 'success' : item.status === 'skipped' ? 'danger' : 'neutral';
  const showInlineInputs = item.status !== 'in_cart';
  const hasRealQuantity = item.actualQuantityText && item.actualQuantityText !== item.plannedQuantityText;

  return (
    <div
      className={`rounded-[1.35rem] border px-4 py-4 ${
        item.status === 'in_cart' ? 'border-transparent bg-slate-100/90 dark:bg-white/5' : 'border-primary/10 bg-white/85 shadow-sm dark:bg-white/5'
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onToggleInCart(item.status !== 'in_cart')}
          className={`mt-1 flex size-7 shrink-0 items-center justify-center rounded-lg border-2 text-sm font-bold transition-colors ${
            item.status === 'in_cart' ? 'border-primary bg-primary text-white' : 'border-primary/25 bg-transparent text-transparent'
          }`}
        >
          ✓
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className={`text-base font-bold ${item.status === 'in_cart' ? 'line-through text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>
                {item.actualItemName}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Planeado: {item.plannedQuantityText ?? 'Sin cantidad'}
                {hasRealQuantity ? ` · Real: ${item.actualQuantityText}` : ''}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {item.isExtra ? <Badge label="Extra" tone="primary" /> : null}
              <Badge label={statusLabel} tone={statusTone} />
            </div>
          </div>

          {showInlineInputs ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                value={item.actualQuantityText ?? ''}
                onChange={(event) => onUpdate({ actualQuantityText: event.target.value || null })}
                placeholder="Cantidad real"
                className="rounded-xl border border-primary/10 bg-background/80 px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
              <input
                value={item.lineTotal ?? ''}
                onChange={(event) => onUpdate({ lineTotal: event.target.value ? Number(event.target.value) : null })}
                placeholder="Precio total"
                className="rounded-xl border border-primary/10 bg-background/80 px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              {item.actualQuantityText ? <span className="font-medium text-slate-500 dark:text-slate-400">Comprado: {item.actualQuantityText}</span> : null}
              <span className="font-bold text-primary">{formatCurrency(item.lineTotal)}</span>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => onToggleInCart(item.status !== 'in_cart')}>
              {item.status === 'in_cart' ? 'En el coche' : 'Marcar comprado'}
            </Button>
            <Button variant="outline" size="sm" onClick={onMarkSkipped} className="text-red-500 hover:text-red-600">
              <CircleOff className="size-4" />
              No comprar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShoppingTripSummary({
  variance,
}: {
  variance: ShoppingVarianceSummary;
}) {
  const percent = variance.plannedCount === 0 ? 0 : Math.round((variance.inCartCount / variance.plannedCount) * 100);

  return (
    <ProductSurface className="p-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/80">Total acumulado</p>
          <p className="mt-2 text-3xl font-bold text-primary">{formatCurrency(variance.runningTotal)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {variance.inCartCount} / {Math.max(variance.plannedCount, 0)} items
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{percent}% completado</p>
        </div>
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>{variance.pendingCount} pendientes</span>
        <span>{variance.extraCount} extras</span>
      </div>
    </ProductSurface>
  );
}

export function ShoppingListScreen({
  currentUserEmail,
  plan,
  shoppingList,
  shoppingItems,
  shoppingTrip,
  shoppingTripItems,
  aggregation,
  variance,
  isLoading,
  error,
  onGoShoppingList,
  onGoWeeklyPlan,
  onSignOut,
  onRegenerateShopping,
  onToggleShoppingItem,
  onUpdateShoppingItem,
  onAddManualItem,
  onRemoveShoppingItem,
  onStartShoppingTrip,
  onToggleTripItemInCart,
  onMarkTripItemSkipped,
  onUpdateTripItem,
  onAddExtraTripItem,
  onUpdateTripMeta,
  onCheckoutTrip,
}: ShoppingListScreenProps) {
  const [mode, setMode] = useState<ShoppingScreenMode>('planned');
  const [isManualComposerOpen, setIsManualComposerOpen] = useState(false);
  const [manualDraft, setManualDraft] = useState({ name: '', quantity: '' });
  const [extraDraft, setExtraDraft] = useState({ name: '', quantity: '', total: '' });
  const [checkoutDraft, setCheckoutDraft] = useState({
    storeName: shoppingTrip?.storeName ?? '',
    finalTotal: shoppingTrip?.finalTotal ? String(shoppingTrip.finalTotal) : '',
  });

  const autoItems = useMemo(() => shoppingItems.filter((item) => item.sourceType === 'plan_auto'), [shoppingItems]);
  const manualItems = useMemo(() => shoppingItems.filter((item) => item.sourceType === 'manual'), [shoppingItems]);
  const pendingCount = shoppingItems.filter((item) => !item.isChecked).length;

  const plannedTripItems = useMemo(() => shoppingTripItems.filter((item) => !item.isExtra), [shoppingTripItems]);
  const extraTripItems = useMemo(() => shoppingTripItems.filter((item) => item.isExtra), [shoppingTripItems]);
  const pendingTripItems = plannedTripItems.filter((item) => item.status !== 'in_cart');
  const inCartTripItems = plannedTripItems.filter((item) => item.status === 'in_cart');
  const hasManualItems = manualItems.length > 0;

  useEffect(() => {
    if (shoppingTrip) {
      setCheckoutDraft({
        storeName: shoppingTrip.storeName ?? '',
        finalTotal: shoppingTrip.finalTotal !== null ? String(shoppingTrip.finalTotal) : '',
      });
    }
  }, [shoppingTrip]);

  const handleAddManualItem = () => {
    const name = manualDraft.name.trim();
    if (!name) {
      return;
    }

    onAddManualItem(name, manualDraft.quantity.trim() || null);
    setManualDraft({ name: '', quantity: '' });
    setIsManualComposerOpen(false);
  };

  const handleStartOrContinueTrip = () => {
    if (!shoppingTrip) {
      onStartShoppingTrip();
    }
    setMode('trip');
  };

  return (
    <MainShellLayout
      activeItem="shopping-list"
      currentUserEmail={currentUserEmail}
      onSignOut={onSignOut}
    >
      <ProductPage>
        <ProductContainer className="max-w-md pb-32 sm:max-w-lg md:max-w-xl lg:max-w-3xl">
          {mode === 'planned' ? (
            <>
              <ProductHeader
                eyebrow="Plan semanal"
                title="Lista planeada"
                description="Revisa lo importante, ajusta solo lo necesario y arranca la compra cuando ya estés en el súper."
                actions={
                  <Button variant="ghost" size="sm" onClick={onGoWeeklyPlan} className="rounded-full text-primary">
                    <CalendarRange className="size-4" />
                    Planificación
                  </Button>
                }
              />

              <div className="space-y-5">
                <div className="text-center">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Semana activa</p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{formatWeekRange(plan?.weekStartDate)}</p>
                </div>

                {shoppingTrip ? (
                  <ProductSurface className="p-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary/80">Compra en curso</p>
                        <h2 className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100 sm:text-xl">Ya puedes retomar tu compra real</h2>
                        <p className="mt-1.5 text-sm leading-6 text-slate-500 dark:text-slate-400">
                          {shoppingTrip.status === 'checked_out'
                            ? `Compra cerrada por ${formatCurrency(shoppingTrip.finalTotal)}`
                            : `Llevas ${variance.inCartCount} productos en el coche y ${variance.pendingCount} pendientes.`}
                        </p>
                      </div>
                      <Button onClick={() => setMode('trip')} className="w-full sm:w-auto">
                        {shoppingTrip.status === 'checked_out' ? 'Ver compra final' : 'Continuar compra'}
                        <ArrowRight className="size-4" />
                      </Button>
                    </div>
                  </ProductSurface>
                ) : null}

                {error ? <ProductSurface className="p-4 text-sm text-red-500">{error}</ProductSurface> : null}

                <ProductSurface className="overflow-hidden p-4 sm:p-5">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Ingredientes automáticos</p>
                      <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">Qué comprar</h2>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Lista totalizada desde tu plan semanal.</p>
                    </div>
                    <Badge label={`${autoItems.length} items`} tone="primary" />
                  </div>

                  {isLoading ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">Cargando lista de compras...</p>
                  ) : autoItems.length === 0 ? (
                    <ProductEmptyState message="Todavía no hay ingredientes automáticos. Planifica recetas para empezar la lista." />
                  ) : (
                    <div className="space-y-3">
                      {autoItems.map((item) => {
                        const relatedRecipes = aggregation.totalized.find((entry) => entry.itemName === item.itemName)?.sourceRecipes ?? [];
                        const originSummary =
                          relatedRecipes.length > 0
                            ? `Para: ${relatedRecipes
                                .slice(0, 2)
                                .map((recipe) => recipe.recipeName)
                                .join(' y ')}${relatedRecipes.length > 2 ? ` +${relatedRecipes.length - 2}` : ''}`
                            : 'Generado desde el plan semanal';

                        return (
                          <PlannedItemRow
                            key={item.id}
                            item={item}
                            badgeLabel="Auto"
                            badgeTone="primary"
                            subtitle={originSummary}
                            onToggle={(nextChecked) => onToggleShoppingItem(item.id, nextChecked)}
                          />
                        );
                      })}
                    </div>
                  )}
                </ProductSurface>

                <ProductSurface className="overflow-hidden p-4 sm:p-5">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Otros ítems</p>
                      <h2 className="mt-2 text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-xl">Lo que agregaste manualmente</h2>
                    </div>
                    <Badge label={`${manualItems.length} manuales`} />
                  </div>

                  {isManualComposerOpen || hasManualItems ? (
                    <div className="rounded-[1.35rem] border-2 border-dashed border-primary/20 bg-background/70 p-4">
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
                        <input
                          value={manualDraft.name}
                          onChange={(event) => setManualDraft((prev) => ({ ...prev, name: event.target.value }))}
                          placeholder="Añadir ítem manual"
                          className="rounded-xl border border-primary/10 bg-white/80 px-4 py-3 text-sm outline-none focus:border-primary dark:bg-white/5"
                        />
                        <input
                          value={manualDraft.quantity}
                          onChange={(event) => setManualDraft((prev) => ({ ...prev, quantity: event.target.value }))}
                          placeholder="Cantidad opcional"
                          className="rounded-xl border border-primary/10 bg-white/80 px-4 py-3 text-sm outline-none focus:border-primary dark:bg-white/5"
                        />
                      </div>
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <Button onClick={handleAddManualItem} variant="outline" className="w-full sm:w-auto">
                          <PackagePlus className="size-4" />
                          Añadir ítem manual
                        </Button>
                        {!hasManualItems ? (
                          <Button variant="ghost" className="w-full sm:w-auto" onClick={() => setIsManualComposerOpen(false)}>
                            Cancelar
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsManualComposerOpen(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-[1.35rem] border-2 border-dashed border-primary/20 bg-background/70 px-4 py-4 text-sm font-semibold text-primary transition-colors active:scale-[0.99]"
                    >
                      <PackagePlus className="size-4" />
                      Añadir ítem manual
                    </button>
                  )}

                  {manualItems.length === 0 ? (
                    <div className="mt-4 rounded-[1.15rem] bg-primary/5 px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                      Los ítems manuales quedan aparte de la lista generada desde tu plan.
                    </div>
                  ) : (
                    <div className="mt-5 space-y-3">
                      {manualItems.map((item) => (
                        <PlannedItemRow
                          key={item.id}
                          item={item}
                          editable
                          badgeLabel="Manual"
                          subtitle="Se conserva aunque regeneres la lista automática"
                          onToggle={(nextChecked) => onToggleShoppingItem(item.id, nextChecked)}
                          onRename={(value) => onUpdateShoppingItem(item.id, { itemName: value })}
                          onQuantityChange={(value) => onUpdateShoppingItem(item.id, { quantityText: value || null })}
                          onRemove={() => onRemoveShoppingItem(item.id)}
                        />
                      ))}
                    </div>
                  )}
                </ProductSurface>

                <div className="flex justify-center">
                  <Button variant="ghost" onClick={onRegenerateShopping} className="h-auto px-2 py-1 text-xs text-primary sm:text-sm">
                    <RefreshCcw className="size-4" />
                    Regenerar desde plan
                  </Button>
                </div>
              </div>

                <div className="fixed inset-x-0 bottom-[4.85rem] z-20 border-t border-primary/10 bg-gradient-to-t from-background via-background to-transparent px-4 pb-4 pt-3 backdrop-blur-xl lg:bottom-0 lg:pb-6 lg:pt-4">
                  <div className="mx-auto flex max-w-md flex-col gap-3 sm:max-w-lg lg:max-w-3xl">
                  <div className="flex items-center justify-between rounded-[1.25rem] border border-primary/10 bg-card/90 px-4 py-3 text-sm text-slate-500 shadow-sm dark:text-slate-300">
                    <span>{shoppingList?.title ?? 'Lista activa'}</span>
                    <span>{pendingCount} pendientes</span>
                  </div>
                  <Button size="lg" onClick={handleStartOrContinueTrip} className="w-full">
                    <ShoppingCart className="size-5" />
                    {shoppingTrip ? 'Continuar compra en el súper' : 'Iniciar compra en el súper'}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <ProductHeader
                eyebrow="Compra real"
                title="Compra en curso"
                description="Confirma lo que realmente entra al coche, ajusta cantidades y registra el total por línea."
                onBack={() => setMode('planned')}
              />

              <div className="space-y-5">
                {error ? <ProductSurface className="p-4 text-sm text-red-500">{error}</ProductSurface> : null}

                {!shoppingTrip ? (
                  <ProductSurface className="p-8 text-center">
                    <ShoppingCart className="mx-auto size-10 text-primary" />
                    <h2 className="mt-4 text-2xl font-bold text-slate-900 dark:text-slate-100">Todavía no empezaste una compra real</h2>
                    <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400">
                      Primero revisa la lista planeada y luego inicia la compra cuando ya estés en el súper.
                    </p>
                    <Button onClick={onStartShoppingTrip} className="mt-5">
                      <ShoppingCart className="size-4" />
                      Iniciar compra
                    </Button>
                  </ProductSurface>
                ) : (
                  <>
                    <ShoppingTripSummary variance={variance} />

                  <ProductSurface className="p-4 sm:p-5">
                      <div className="mb-4 flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Acción rápida</p>
                          <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">Añadir extra no planeado</h2>
                          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Registra algo que no venía en la lista sin salir de la compra.</p>
                        </div>
                        <Badge label={`${extraTripItems.length} extras`} tone="primary" />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px_140px]">
                        <input
                          value={extraDraft.name}
                          onChange={(event) => setExtraDraft((prev) => ({ ...prev, name: event.target.value }))}
                          placeholder="Producto extra"
                          className="rounded-xl border border-primary/10 bg-background/80 px-3 py-2.5 text-sm outline-none focus:border-primary"
                        />
                        <input
                          value={extraDraft.quantity}
                          onChange={(event) => setExtraDraft((prev) => ({ ...prev, quantity: event.target.value }))}
                          placeholder="Cantidad"
                          className="rounded-xl border border-primary/10 bg-background/80 px-3 py-2.5 text-sm outline-none focus:border-primary"
                        />
                        <input
                          value={extraDraft.total}
                          onChange={(event) => setExtraDraft((prev) => ({ ...prev, total: event.target.value }))}
                          placeholder="Precio"
                          className="rounded-xl border border-primary/10 bg-background/80 px-3 py-2.5 text-sm outline-none focus:border-primary"
                        />
                      </div>

                      <Button
                        variant="outline"
                        className="mt-3 w-full sm:w-auto"
                        onClick={() => {
                          const name = extraDraft.name.trim();
                          if (!name) {
                            return;
                          }
                          onAddExtraTripItem(name, extraDraft.quantity.trim() || null, extraDraft.total ? Number(extraDraft.total) : null);
                          setExtraDraft({ name: '', quantity: '', total: '' });
                        }}
                      >
                        <PackagePlus className="size-4" />
                        Añadir extra
                      </Button>
                    </ProductSurface>

                    <ProductSurface className="p-4 sm:p-5">
                      <div className="mb-4 flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Pendientes</p>
                          <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">Lo que falta revisar</h2>
                          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Confirma cantidad real y precio cuando el producto ya esté contigo.</p>
                        </div>
                        <Badge label={`${pendingTripItems.length} items`} />
                      </div>

                      {pendingTripItems.length === 0 ? (
                        <ProductEmptyState message="No quedan pendientes. Revisa los productos en el coche o finaliza la compra." />
                      ) : (
                        <div className="space-y-3">
                          {pendingTripItems.map((item) => (
                            <TripItemRow
                              key={item.id}
                              item={item}
                              onToggleInCart={(nextChecked) => onToggleTripItemInCart(item.id, nextChecked)}
                              onMarkSkipped={() => onMarkTripItemSkipped(item.id)}
                              onUpdate={(input) => onUpdateTripItem(item.id, input)}
                            />
                          ))}
                        </div>
                      )}
                    </ProductSurface>

                    <ProductSurface className="p-4 sm:p-5">
                      <div className="mb-4 flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">En el coche</p>
                          <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">Lo que ya confirmaste</h2>
                          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Aquí quedan los productos ya comprados y los extras que vas sumando.</p>
                        </div>
                        <Badge label={`${inCartTripItems.length} comprados`} tone="success" />
                      </div>

                      {inCartTripItems.length === 0 && extraTripItems.length === 0 ? (
                        <ProductEmptyState message="Todavía no has confirmado productos en el coche." />
                      ) : (
                        <div className="space-y-3">
                          {inCartTripItems.map((item) => (
                            <TripItemRow
                              key={item.id}
                              item={item}
                              onToggleInCart={(nextChecked) => onToggleTripItemInCart(item.id, nextChecked)}
                              onMarkSkipped={() => onMarkTripItemSkipped(item.id)}
                              onUpdate={(input) => onUpdateTripItem(item.id, input)}
                            />
                          ))}
                          {extraTripItems.map((item) => (
                            <TripItemRow
                              key={item.id}
                              item={item}
                              onToggleInCart={(nextChecked) => onToggleTripItemInCart(item.id, nextChecked)}
                              onMarkSkipped={() => onMarkTripItemSkipped(item.id)}
                              onUpdate={(input) => onUpdateTripItem(item.id, input)}
                            />
                          ))}
                        </div>
                      )}
                    </ProductSurface>

                    <ProductSurface className="p-4 sm:p-5">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Cierre</p>
                        <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">Finalizar compra</h2>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Guarda el nombre del súper y confirma el monto final en caja.</p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <input
                          value={checkoutDraft.storeName}
                          onChange={(event) => {
                            setCheckoutDraft((prev) => ({ ...prev, storeName: event.target.value }));
                            onUpdateTripMeta({ storeName: event.target.value || null });
                          }}
                          placeholder="Nombre del súper"
                          className="rounded-xl border border-primary/10 bg-background/80 px-3 py-2.5 text-sm outline-none focus:border-primary"
                        />
                        <input
                          value={checkoutDraft.finalTotal}
                          onChange={(event) => setCheckoutDraft((prev) => ({ ...prev, finalTotal: event.target.value }))}
                          placeholder="Total final en caja"
                          className="rounded-xl border border-primary/10 bg-background/80 px-3 py-2.5 text-sm outline-none focus:border-primary"
                        />
                      </div>
                    </ProductSurface>

                    <div className="fixed inset-x-0 bottom-[4.85rem] z-20 border-t border-primary/10 bg-gradient-to-t from-background via-background to-transparent px-4 pb-4 pt-3 backdrop-blur-xl lg:bottom-0 lg:pb-6 lg:pt-4">
                      <div className="mx-auto flex max-w-md flex-col gap-3 sm:max-w-lg lg:max-w-3xl">
                        <div className="flex items-center justify-between rounded-[1.25rem] border border-primary/10 bg-card/90 px-4 py-3 text-sm text-slate-500 shadow-sm dark:text-slate-300">
                          <span>{checkoutDraft.storeName?.trim() || 'Compra en curso'}</span>
                          <span>{formatCurrency(checkoutDraft.finalTotal ? Number(checkoutDraft.finalTotal) : variance.runningTotal)}</span>
                        </div>
                        <Button
                          size="lg"
                          className="w-full"
                          disabled={shoppingTrip.status === 'checked_out'}
                          onClick={() =>
                            onCheckoutTrip(
                              checkoutDraft.finalTotal ? Number(checkoutDraft.finalTotal) : variance.runningTotal,
                              checkoutDraft.storeName || null,
                            )
                          }
                        >
                          {shoppingTrip.status === 'checked_out' ? 'Compra cerrada' : 'Finalizar y cerrar compra'}
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </ProductContainer>
      </ProductPage>
    </MainShellLayout>
  );
}
