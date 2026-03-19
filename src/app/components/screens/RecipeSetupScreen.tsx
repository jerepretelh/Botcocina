import { ArrowLeft } from 'lucide-react';
import { AmountUnit, Portion, QuantityMode, Recipe, RecipeSetupBehavior, SavedRecipeContextSummary, UserRecipeCookingConfig } from '../../../types';
import type { RecipeYieldV2 } from '../../types/recipe-v2';
import { ProductSurface } from '../ui/product-system';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../ui/sheet';

interface RecipeSetupScreenProps {
    selectedRecipe: Recipe | null;
    setupBehavior: RecipeSetupBehavior;
    savedConfig: UserRecipeCookingConfig | null;
    savedContextSummary: SavedRecipeContextSummary | null;
    quantityMode: QuantityMode;
    amountUnit: AmountUnit;
    peopleCount: number;
    availableCount: number;
    produceType: string;
    produceSize: 'small' | 'medium' | 'large';
    setupPortionPreview: Portion;
    setupScaleFactor: number;
    targetYield?: RecipeYieldV2 | null;
    isTubersBoilRecipe: boolean;
    setQuantityMode: (mode: QuantityMode) => void;
    setPeopleCount: (val: any) => void;
    setAvailableCount: (val: any) => void;
    setProduceType: (type: string) => void;
    setProduceSize: (size: 'small' | 'medium' | 'large') => void;
    onAmountUnitChange: (unit: AmountUnit) => void;
    onContinue: () => void;
    onBack: () => void;
    onPlanRecipe?: () => void;
}

export function RecipeSetupScreen({
    selectedRecipe,
    setupBehavior,
    savedConfig,
    savedContextSummary,
    quantityMode,
    amountUnit,
    peopleCount,
    availableCount,
    produceType,
    produceSize,
    setupPortionPreview,
    setupScaleFactor,
    targetYield,
    isTubersBoilRecipe,
    setQuantityMode,
    setPeopleCount,
    setAvailableCount,
    setProduceType,
    setProduceSize,
    onAmountUnitChange,
    onContinue,
    onBack: onBackToRecipeSelect,
    onPlanRecipe,
}: RecipeSetupScreenProps) {
    const supportsIngredientMode = setupBehavior !== 'servings_only';
    const lastUsedLabel = savedConfig?.lastUsedAt
        ? new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(new Date(savedConfig.lastUsedAt))
        : null;
    const sourceLines = [
        savedContextSummary?.servings ? `Creada para ${savedContextSummary.servings} ${savedContextSummary.servings === 1 ? 'persona' : 'personas'}` : null,
        savedContextSummary?.quantityMode === 'have' && savedContextSummary?.availableCount
            ? `Basada en ${savedContextSummary.availableCount}${savedContextSummary.amountUnit === 'grams' ? ' g' : ''} de ingrediente base`
            : null,
        savedContextSummary?.availableIngredients?.length
            ? `Contexto original: ${savedContextSummary.availableIngredients.slice(0, 3).join(', ')}`
            : null,
        savedContextSummary?.avoidIngredients?.length
            ? `Evitar: ${savedContextSummary.avoidIngredients.slice(0, 3).join(', ')}`
            : null,
    ].filter(Boolean) as string[];
    const savedModeLabel = savedConfig?.quantityMode === 'have' ? 'Configuracion basada en ingredientes' : 'Configuracion basada en porciones';
    const currentYieldLabel = targetYield?.label ?? targetYield?.unit ?? (quantityMode === 'people' ? 'personas' : amountUnit === 'grams' ? 'gramos' : 'unidades');
    const currentYieldTitle = targetYield?.type === 'servings'
        ? '¿Para cuánto quieres cocinar?'
        : targetYield?.type === 'weight'
            ? '¿Cuánto peso quieres preparar?'
            : targetYield?.type === 'units'
                ? '¿Cuántas unidades quieres preparar?'
                : 'Ajusta el rendimiento objetivo';

    return (
        <Sheet
            open
            onOpenChange={(open) => {
                if (!open) onBackToRecipeSelect();
            }}
        >
            <SheetContent
                side="right"
                className="w-full max-w-xl overflow-hidden border-primary/10 bg-[#ede4dc] p-0"
            >
                    <SheetHeader className="sr-only">
                        <SheetTitle>{selectedRecipe?.name || 'Tu receta'}</SheetTitle>
                        <SheetDescription>Ajusta solo lo necesario antes de pasar al checklist de ingredientes.</SheetDescription>
                    </SheetHeader>

                    <div className="flex h-full flex-col">
                        <div className="sticky top-0 z-20 border-b border-[#ecd9cd] bg-[#ede4dc]/95 px-5 pb-4 pt-6 backdrop-blur">
                            <div className="flex flex-col gap-4 pr-12">
                                <div className="flex items-start gap-3">
                                    <button
                                        type="button"
                                        onClick={onBackToRecipeSelect}
                                        className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-[#f7efe9] text-foreground transition-colors active:scale-[0.98]"
                                    >
                                        <ArrowLeft className="size-5" />
                                    </button>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">Configuracion</p>
                                        <h1 className="mt-2 max-w-xl text-[1.45rem] font-bold leading-[1.12] tracking-tight text-slate-900 sm:text-[1.75rem]">
                                            {selectedRecipe?.name || 'Tu receta'}
                                        </h1>
                                        <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600">
                                            Ajusta solo lo necesario antes de pasar al checklist de ingredientes.
                                        </p>
                                    </div>
                                </div>

                                {onPlanRecipe ? (
                                    <div className="flex justify-start">
                                        <button
                                            type="button"
                                            onClick={onPlanRecipe}
                                            className="rounded-full border border-[#f1cdb9] bg-[#f7efe9] px-5 py-3 text-sm font-bold text-primary transition-colors hover:bg-[#f4e3d9]"
                                        >
                                            Planificar
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 pb-24 pt-4">
                            <div className="space-y-4">
                                <ProductSurface className="border-[#dfd5cd] bg-[#f7f5f2] p-4 sm:p-5">
                                    <div className="flex flex-col items-center border-b border-[#ecd9cd] pb-4 text-center">
                                        <div className="mb-3 flex size-14 items-center justify-center rounded-[1.15rem] bg-[#f4ddd1] text-2xl shadow-sm sm:size-16 sm:text-3xl">
                                            {selectedRecipe?.emoji || selectedRecipe?.icon || '🍳'}
                                        </div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/80">Base de coccion</p>
                                        <h2 className="mt-2 text-[1.15rem] font-black tracking-tight text-[#131d36] sm:text-[1.35rem]">
                                            {currentYieldTitle}
                                        </h2>
                                    </div>

                                    <div className="mt-4 grid gap-4">
                                        {savedConfig && (
                                            <div className="rounded-[1.25rem] border border-[#edd9cc] bg-[#f3e8e0] p-4">
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">Configuracion guardada</p>
                                                        <h3 className="mt-2 text-sm font-bold text-[#2b1b16] sm:text-base">{savedModeLabel}</h3>
                                                        {lastUsedLabel && (
                                                            <p className="mt-1 text-sm text-slate-500">Ultimo uso: {lastUsedLabel}</p>
                                                        )}
                                                    </div>
                                                    <div className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-primary shadow-sm">
                                                        {savedConfig.quantityMode === 'have'
                                                            ? `${savedConfig.availableCount ?? availableCount}${savedConfig.amountUnit === 'grams' ? ' g' : ' uds.'}`
                                                            : `${savedConfig.peopleCount ?? peopleCount} porciones`}
                                                    </div>
                                                </div>
                                                {sourceLines.length > 0 && (
                                                    <div className="mt-4 grid gap-2">
                                                        {sourceLines.map((line) => (
                                                            <p key={line} className="text-sm text-slate-600">
                                                                {line}
                                                            </p>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {supportsIngredientMode ? (
                                            <div className="grid grid-cols-2 gap-2 rounded-[1.2rem] bg-[#f3e8e0] p-2">
                                                <button
                                                    onClick={() => setQuantityMode('people')}
                                                    className={`rounded-[1.05rem] px-4 py-2.5 text-sm font-bold transition-all ${quantityMode === 'people'
                                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                                        : 'text-slate-600 hover:bg-white/80'
                                                        }`}
                                                >
                                                    Porciones
                                                </button>
                                                <button
                                                    onClick={() => setQuantityMode('have')}
                                                    className={`rounded-[1.05rem] px-4 py-2.5 text-sm font-bold transition-all ${quantityMode === 'have'
                                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                                        : 'text-slate-600 hover:bg-white/80'
                                                        }`}
                                                >
                                                    Ingredientes
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="rounded-[1.2rem] border border-[#edd9cc] bg-[#f3e8e0] px-4 py-3.5">
                                                <p className="text-sm font-semibold text-slate-700">
                                                    Esta receta se reabre por porciones. La base por ingredientes no aplica bien a su escalado.
                                                </p>
                                            </div>
                                        )}

                                        {supportsIngredientMode && quantityMode === 'have' && (
                                            <div className="flex flex-wrap justify-center gap-3">
                                                <button
                                                    onClick={() => onAmountUnitChange('units')}
                                                    className={`rounded-full border px-4 py-2 text-xs font-semibold transition-all ${amountUnit === 'units' ? 'border-primary/25 bg-primary/10 text-primary' : 'border-[#e6d8ce] bg-[#f7f1ec] text-slate-500'}`}
                                                >
                                                    Unidades
                                                </button>
                                                <button
                                                    onClick={() => onAmountUnitChange('grams')}
                                                    className={`rounded-full border px-4 py-2 text-xs font-semibold transition-all ${amountUnit === 'grams' ? 'border-primary/25 bg-primary/10 text-primary' : 'border-[#e6d8ce] bg-[#f7f1ec] text-slate-500'}`}
                                                >
                                                    Gramos
                                                </button>
                                            </div>
                                        )}

                                        <div className="rounded-[1.25rem] border border-[#edd9cc] bg-[#f3ece4] p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <button
                                                    onClick={() =>
                                                        quantityMode === 'people'
                                                            ? setPeopleCount((prev: number) => Math.max(1, prev - 1))
                                                            : setAvailableCount((prev: number) => Math.max(1, prev - (amountUnit === 'grams' ? 50 : 1)))
                                                    }
                                                    className="flex size-12 items-center justify-center rounded-full border border-[#efc7b4] bg-[#fbf6f2] text-xl text-primary transition-transform active:scale-95"
                                                >
                                                    -
                                                </button>

                                                <div className="text-center">
                                                    <span className="text-4xl font-black tracking-tight text-primary sm:text-5xl">
                                                        {quantityMode === 'people' ? peopleCount : availableCount}
                                                    </span>
                                                    <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.24em] text-[#60708c] sm:text-xs">
                                                        {currentYieldLabel}
                                                    </p>
                                                </div>

                                                <button
                                                    onClick={() =>
                                                        quantityMode === 'people'
                                                            ? setPeopleCount((prev: number) => Math.min(8, prev + 1))
                                                            : setAvailableCount((prev: number) => Math.min(amountUnit === 'grams' ? 5000 : 20, prev + (amountUnit === 'grams' ? 50 : 1)))
                                                    }
                                                    className="flex size-12 items-center justify-center rounded-full bg-primary text-xl text-primary-foreground shadow-lg shadow-primary/25 transition-transform active:scale-95"
                                                >
                                                    +
                                                </button>
                                            </div>

                                            <div className="mt-4 rounded-[1rem] bg-[#f4ddd1] px-4 py-3 text-center text-sm font-medium text-primary">
                                                {quantityMode === 'people'
                                                    ? `Rendimiento objetivo: ${peopleCount} ${currentYieldLabel}`
                                                    : `Rendimiento objetivo: ${availableCount} ${currentYieldLabel}`}
                                            </div>
                                        </div>

                                        {isTubersBoilRecipe && (
                                            <div className="grid gap-4 rounded-[1.25rem] border border-[#edd9cc] bg-[#f7f1ec] p-4">
                                                <div>
                                                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Ajustes de producto</p>
                                                    <h3 className="mt-2 text-lg font-bold text-slate-900 sm:text-xl">Variedad y tamano</h3>
                                                </div>
                                                <div>
                                                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Variedad</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {[
                                                            { id: 'blanca', label: 'Blanca' },
                                                            { id: 'yungay', label: 'Yungay' },
                                                            { id: 'huayro', label: 'Huayro' },
                                                            { id: 'canchan', label: 'Canchan' },
                                                            { id: 'camote_amarillo', label: 'Camote Am.' },
                                                            { id: 'camote_morado', label: 'Camote Mor.' },
                                                        ].map((option) => (
                                                            <button
                                                                key={option.id}
                                                                onClick={() => setProduceType(option.id)}
                                                                className={`rounded-full border px-4 py-2 text-xs font-semibold transition-all ${produceType === option.id ? 'border-primary/25 bg-primary text-primary-foreground' : 'border-[#e6d8ce] bg-[#f7f1ec] text-slate-600'}`}
                                                            >
                                                                {option.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Tamano</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {[
                                                            { id: 'small', label: 'Pequeno' },
                                                            { id: 'medium', label: 'Mediano' },
                                                            { id: 'large', label: 'Grande' },
                                                        ].map((option) => (
                                                            <button
                                                                key={option.id}
                                                                onClick={() => setProduceSize(option.id as 'small' | 'medium' | 'large')}
                                                                className={`rounded-full border px-4 py-2 text-xs font-semibold transition-all ${produceSize === option.id ? 'border-primary/25 bg-primary text-primary-foreground' : 'border-[#e6d8ce] bg-[#f7f1ec] text-slate-600'}`}
                                                            >
                                                                {option.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </ProductSurface>
                            </div>
                        </div>

                        <div className="sticky bottom-0 z-20 border-t border-[#ecd9cd] bg-[#ede4dc]/95 px-5 pb-5 pt-4 backdrop-blur">
                            <button
                                onClick={onContinue}
                                className="mx-auto block w-full rounded-[1.15rem] bg-primary py-4 text-base font-bold text-primary-foreground shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
                            >
                                Continuar
                            </button>
                        </div>
                    </div>
            </SheetContent>
        </Sheet>
    );
}
