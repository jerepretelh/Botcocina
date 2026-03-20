import React from 'react';
import { ArrowLeft, X } from 'lucide-react';
import type { Recipe } from '../../../types';
import type { ContainerMetaV2, CookingContextV2, RecipeV2, RecipeYieldV2 } from '../../types/recipe-v2';
import { requiresExplicitContainerCapacity } from '../../lib/recipe-v2/measurements';
import { getSetupQuestion, shouldShowCookingContextBlock, usesDiscreteContainerControl } from '../../lib/recipe-v2/setupUxContract';
import { ProductSurface } from '../ui/product-system';
import { JourneyPageShell } from '../ui/journey-page-shell';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../ui/sheet';
import type { ReactNode } from 'react';
import {
  getBaseIngredientLabel,
  getYieldBaseSummary,
  getYieldCardLabel,
  getYieldDisplayValue,
} from './recipeSetupScreenV2.helpers';

interface RecipeSetupScreenV2Props {
  selectedRecipe: Recipe | null;
  recipe: RecipeV2 | null;
  selectedYield: RecipeYieldV2 | null;
  selectedCookingContext?: CookingContextV2 | null;
  presentationMode?: 'sheet' | 'page';
  warnings: string[];
  onDecrement: () => void;
  onIncrement: () => void;
  onSelectedYieldChange: (nextYield: RecipeYieldV2) => void;
  onSelectedCookingContextChange: (nextContext: CookingContextV2 | null) => void;
  onBack: () => void;
  onClose?: () => void;
  onContinue: () => void;
}

interface RecipeSetupContentV2Props {
  selectedRecipe: Recipe | null;
  recipe: RecipeV2 | null;
  selectedYield: RecipeYieldV2 | null;
  selectedCookingContext?: CookingContextV2 | null;
  warnings: string[];
  onDecrement: () => void;
  onIncrement: () => void;
  onSelectedYieldChange: (nextYield: RecipeYieldV2) => void;
  onSelectedCookingContextChange: (nextContext: CookingContextV2 | null) => void;
  layout?: 'stacked' | 'panel';
}

export function RecipeSetupContentV2({
  selectedRecipe,
  recipe,
  selectedYield,
  selectedCookingContext,
  warnings,
  onDecrement,
  onIncrement,
  onSelectedYieldChange,
  onSelectedCookingContextChange,
  layout = 'stacked',
}: RecipeSetupContentV2Props) {
  const baseIngredientLabel = getBaseIngredientLabel(recipe);
  const effectiveYield = selectedYield ?? recipe?.baseYield ?? null;
  const hasDiscreteContainerYield = usesDiscreteContainerControl(effectiveYield);
  const showCookingContextBlock = shouldShowCookingContextBlock(recipe, effectiveYield);

  const applyVolumeUnit = (unit: 'ml' | 'l' | 'taza' | 'vaso') => {
    if (!selectedYield) return;
    const labelMap: Record<typeof unit, string> = {
      ml: 'ml',
      l: 'l',
      taza: 'tazas',
      vaso: 'vasos',
    };
    const nextContainerMeta = unit === 'vaso'
      ? {
          kind: 'glass',
          sizeLabel: 'vaso',
          capacityMl: selectedYield.type === 'volume' ? (selectedYield.containerMeta?.capacityMl ?? null) : null,
        }
      : selectedYield.containerMeta?.kind === 'glass'
        ? null
        : selectedYield.containerMeta;

    onSelectedYieldChange({
      ...selectedYield,
      visibleUnit: unit,
      unit,
      label: labelMap[unit],
      containerMeta: nextContainerMeta,
    });
  };

  const applyContainerPreset = (key: string, meta: ContainerMetaV2) => {
    if (!selectedYield) return;
    onSelectedYieldChange({
      ...selectedYield,
      value: 1,
      containerKey: key,
      containerMeta: meta,
      visibleUnit: meta.sizeLabel ?? selectedYield.visibleUnit,
      label: meta.sizeLabel ?? selectedYield.label,
      unit: meta.sizeLabel ?? selectedYield.unit,
    });
  };

  const applyCookingContextPreset = (key: string, meta: ContainerMetaV2) => {
    onSelectedCookingContextChange({
      selectedContainerKey: key,
      selectedContainerMeta: meta,
    });
  };

  const updateContainerDimension = (field: 'diameterCm' | 'capacityMl', rawValue: string) => {
    if (!selectedYield) return;
    const parsed = rawValue ? Number(rawValue) : null;
    if (parsed !== null && (!Number.isFinite(parsed) || parsed <= 0)) return;
    onSelectedYieldChange({
      ...selectedYield,
      containerMeta: {
        kind: selectedYield.containerMeta?.kind ?? (selectedYield.type === 'pan_size' ? 'mold' : 'tray'),
        sizeLabel: selectedYield.containerMeta?.sizeLabel ?? selectedYield.label ?? selectedYield.visibleUnit ?? 'Personalizado',
        ...selectedYield.containerMeta,
        [field]: parsed,
      },
    });
  };

  const updateCookingContextDimension = (field: 'capacityMl', rawValue: string) => {
    const parsed = rawValue ? Number(rawValue) : null;
    if (parsed !== null && !Number.isFinite(parsed)) return;
    onSelectedCookingContextChange({
      selectedContainerKey: selectedCookingContext?.selectedContainerKey ?? null,
      selectedContainerMeta: {
        kind: selectedCookingContext?.selectedContainerMeta?.kind ?? 'basket',
        sizeLabel: selectedCookingContext?.selectedContainerMeta?.sizeLabel ?? 'Canasta personalizada',
        ...selectedCookingContext?.selectedContainerMeta,
        [field]: parsed,
      },
    });
  };
  const isPanelLayout = layout === 'panel';
  return (
    <div className={isPanelLayout ? 'h-full' : 'space-y-4 px-5 pb-6 pt-4'}>
      <ProductSurface className={`border-[#dfd5cd] bg-[#f7f5f2] ${isPanelLayout ? 'h-full p-6 sm:p-8' : 'p-4 sm:p-5'}`}>
        <div className="flex flex-col items-center border-b border-[#ecd9cd] pb-4 text-center">
              <div className="mb-3 flex size-14 items-center justify-center rounded-[1.15rem] bg-[#f4ddd1] text-3xl shadow-sm">
                {selectedRecipe?.icon ?? recipe?.icon ?? '🍳'}
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/80">
                {getYieldCardLabel(recipe, baseIngredientLabel)}
              </p>
              <h2 className="mt-2 text-[1.15rem] font-black tracking-tight text-[#131d36] sm:text-[1.35rem]">
                {effectiveYield?.label ?? effectiveYield?.visibleUnit ?? effectiveYield?.unit ?? 'Cantidad base'}
              </h2>
            </div>

        <div className="mt-6 rounded-[1.25rem] border border-[#edd9cc] bg-[#f3ece4] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            {hasDiscreteContainerYield ? <div className="size-12 shrink-0" aria-hidden="true" /> : (
              <button
                type="button"
                onClick={onDecrement}
                className="flex size-12 items-center justify-center rounded-full border border-[#efc7b4] bg-[#fbf6f2] text-xl text-primary transition-transform active:scale-95"
              >
                -
              </button>
            )}

            <div className="text-center">
              <span className="text-4xl font-black tracking-tight text-primary sm:text-5xl">
                {getYieldDisplayValue(effectiveYield, recipe?.baseYield)}
              </span>
              <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.24em] text-[#60708c] sm:text-xs">
                {effectiveYield?.label ?? effectiveYield?.visibleUnit ?? effectiveYield?.unit ?? 'Cantidad'}
              </p>
            </div>

            {hasDiscreteContainerYield ? <div className="size-12 shrink-0" aria-hidden="true" /> : (
              <button
                type="button"
                onClick={onIncrement}
                className="flex size-12 items-center justify-center rounded-full bg-primary text-xl text-primary-foreground shadow-lg shadow-primary/25 transition-transform active:scale-95"
              >
                +
              </button>
            )}
          </div>

          <div className="mt-5 rounded-[1rem] bg-[#f4ddd1] px-4 py-3 text-center text-sm font-medium text-primary">
            {`${getYieldBaseSummary(recipe, baseIngredientLabel)}: ${recipe?.baseYield ? getYieldDisplayValue(recipe.baseYield) : 'Base'}`}
          </div>
        </div>

        {effectiveYield?.type === 'volume' ? (
          <div className="mt-5 rounded-[1.15rem] border border-[#edd9cc] bg-[#f3ece4] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Unidad visible</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(['ml', 'l', 'taza', 'vaso'] as const).map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => applyVolumeUnit(unit)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold ${effectiveYield.visibleUnit === unit ? 'bg-primary text-primary-foreground' : 'bg-card text-slate-600 dark:text-slate-300'}`}
                    >
                      {unit}
                    </button>
                  ))}
                </div>
                {effectiveYield.visibleUnit === 'vaso' ? (
                  <div className="mt-3">
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Capacidad del vaso (ml)</label>
                    <input
                      type="number"
                      min={100}
                      step={10}
                      value={effectiveYield.containerMeta?.capacityMl ?? 240}
                      onChange={(event) => updateContainerDimension('capacityMl', event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-primary/10 bg-background/80 px-4 py-3 outline-none focus:border-primary"
                    />
                  </div>
                ) : null}
          </div>
        ) : null}

        {selectedYield?.type === 'pan_size' || selectedYield?.type === 'tray_size' ? (
          <div className="mt-5 rounded-[1.15rem] border border-[#edd9cc] bg-[#f3ece4] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Rendimiento del recipiente</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(
                    selectedYield.type === 'pan_size'
                      ? [
                          ['mold-small', { kind: 'mold', sizeLabel: 'Molde pequeño', diameterCm: 18 }],
                          ['mold-medium', { kind: 'mold', sizeLabel: 'Molde mediano', diameterCm: 22 }],
                          ['mold-large', { kind: 'mold', sizeLabel: 'Molde grande', diameterCm: 26 }],
                        ]
                      : [
                          ['tray-small', { kind: 'tray', sizeLabel: 'Bandeja pequeña', capacityMl: 2500 }],
                          ['tray-medium', { kind: 'tray', sizeLabel: 'Bandeja mediana', capacityMl: 3500 }],
                          ['tray-large', { kind: 'tray', sizeLabel: 'Bandeja grande', capacityMl: 5000 }],
                        ]
                  ).map(([key, meta]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => applyContainerPreset(key, meta as ContainerMetaV2)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold ${selectedYield.containerKey === key ? 'bg-primary text-primary-foreground' : 'bg-card text-slate-600 dark:text-slate-300'}`}
                    >
                      {(meta as ContainerMetaV2).sizeLabel}
                    </button>
                  ))}
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {selectedYield.type === 'pan_size' ? 'Diámetro (cm)' : 'Capacidad (ml)'}
                    </label>
                    <input
                      type="number"
                      min={selectedYield.type === 'pan_size' ? 12 : 1000}
                      step={selectedYield.type === 'pan_size' ? 1 : 100}
                      value={selectedYield.type === 'pan_size'
                        ? (selectedYield.containerMeta?.diameterCm ?? '')
                        : (selectedYield.containerMeta?.capacityMl ?? '')}
                      onChange={(event) => updateContainerDimension(selectedYield.type === 'pan_size' ? 'diameterCm' : 'capacityMl', event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-primary/10 bg-background/80 px-4 py-3 outline-none focus:border-primary"
                    />
                  </div>
                </div>
          </div>
        ) : null}

        {showCookingContextBlock ? (
          <div className="mt-5 rounded-[1.15rem] border border-[#edd9cc] bg-[#f3ece4] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Canasta de airfryer</p>
                <div className="mt-3 flex flex-wrap gap-2">
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

        {warnings.length > 0 ? (
          <div className="mt-5 rounded-[1.15rem] border border-[#edd9cc] bg-[#f3ece4] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Ten en cuenta</p>
            <div className="mt-3 space-y-2">
              {warnings.map((warning) => (
                <p key={warning} className="text-sm leading-6 text-slate-600">
                  • {warning}
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </ProductSurface>
    </div>
  );
}

function renderSetupFooter(onContinue: () => void, selectedYield: RecipeYieldV2 | null): ReactNode {
  return (
    <button
      type="button"
      onClick={onContinue}
      disabled={requiresExplicitContainerCapacity(selectedYield)}
      className="mx-auto block w-full rounded-[1.15rem] bg-primary py-4 text-base font-bold text-primary-foreground shadow-xl shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-60"
    >
      Ver ingredientes
    </button>
  );
}

export function RecipeSetupScreenV2({
  selectedRecipe,
  recipe,
  selectedYield,
  selectedCookingContext,
  presentationMode = 'sheet',
  warnings,
  onDecrement,
  onIncrement,
  onSelectedYieldChange,
  onSelectedCookingContextChange,
  onBack,
  onClose,
  onContinue,
}: RecipeSetupScreenV2Props) {
  const effectiveYield = selectedYield ?? recipe?.baseYield ?? null;
  const handleClose = onClose ?? onBack;
  const content = (
    <RecipeSetupContentV2
      selectedRecipe={selectedRecipe}
      recipe={recipe}
      selectedYield={selectedYield}
      selectedCookingContext={selectedCookingContext}
      warnings={warnings}
      onDecrement={onDecrement}
      onIncrement={onIncrement}
      onSelectedYieldChange={onSelectedYieldChange}
      onSelectedCookingContextChange={onSelectedCookingContextChange}
    />
  );

  if (presentationMode === 'page') {
    return (
      <JourneyPageShell
        eyebrow="Configura tu receta"
        title={selectedRecipe?.name ?? recipe?.name ?? 'Configurar receta'}
        description={getSetupQuestion(recipe, effectiveYield?.type)}
        onBack={onBack}
        onClose={handleClose}
        footer={renderSetupFooter(onContinue, selectedYield)}
      >
        <div className="sr-only">
          <span>{selectedRecipe?.name ?? 'Configurar receta'}</span>
          <p>Ajusta solo lo necesario antes de revisar ingredientes.</p>
        </div>
        {content}
      </JourneyPageShell>
    );
  }

  return (
    <Sheet open onOpenChange={(open) => !open && handleClose()}>
      <SheetContent
        side="right"
        className="w-full max-w-xl overflow-hidden border-primary/10 bg-[#ede4dc] p-0"
        onEscapeKeyDown={(event) => {
          event.preventDefault();
          handleClose();
        }}
      >
        <div className="flex h-full flex-col">
          <SheetHeader className="sr-only">
            <SheetTitle>{selectedRecipe?.name ?? 'Configurar receta'}</SheetTitle>
            <SheetDescription>Ajusta solo lo necesario antes de revisar ingredientes.</SheetDescription>
          </SheetHeader>

          <div className="sticky top-0 z-20 border-b border-[#ecd9cd] bg-[#ede4dc]/95 px-5 pb-4 pt-6 backdrop-blur">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={onBack}
                className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-[#f7efe9] text-foreground transition-colors active:scale-[0.98]"
              >
                <ArrowLeft className="size-5" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">Configura tu receta</p>
                <h1 className="mt-2 text-[1.45rem] font-bold leading-[1.12] tracking-tight text-slate-900 sm:text-[1.75rem]">
                  {selectedRecipe?.name ?? recipe?.name ?? 'Configurar receta'}
                </h1>
                <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600">
                  {getSetupQuestion(recipe, effectiveYield?.type)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {content}
          </div>

          <div className="sticky bottom-0 z-20 border-t border-[#ecd9cd] bg-[#ede4dc]/95 px-5 pb-5 pt-4 backdrop-blur">
            {renderSetupFooter(onContinue, selectedYield)}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
