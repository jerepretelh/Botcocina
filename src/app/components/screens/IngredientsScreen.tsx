import { Suspense, lazy, useState } from 'react';
import { ArrowLeft, List, Lock, Volume2, VolumeX } from 'lucide-react';
import { Recipe, Ingredient, QuantityMode, AmountUnit, Portion, RecipeStep } from '../../../types';
import { getIngredientKey, splitIngredientQuantity, normalizeText } from '../../utils/recipeHelpers';
import { ProductSurface } from '../ui/product-system';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../ui/sheet';
import { resolveIngredientDisplayValue } from '../../lib/recipeScaling';
import type { RecipeYieldV2 } from '../../types/recipe-v2';
import { describeRecipeYield } from '../../lib/recipeV2';

const RoadmapModal = lazy(() => import('../ui/RoadmapModal').then((module) => ({ default: module.RoadmapModal })));

interface IngredientsScreenProps {
    appVersion: string;
    voiceEnabled: boolean;
    speechSupported: boolean;
    selectedRecipe: Recipe | null;
    portion: Portion;
    currentPortionLabel: string;
    quantityMode: QuantityMode;
    peopleCount: number;
    availableCount: number;
    amountUnit: AmountUnit;
    targetYield?: RecipeYieldV2 | null;
    timingAdjustedLabel: string;
    currentIngredients: Ingredient[];
    activeIngredientSelection: Record<string, boolean>;
    batchCountForRecipe: number;
    batchUsageTips: string[];
    currentTip?: string;
    onVoiceToggle: () => void;
    onIngredientToggle: (ingredient: Ingredient) => void;
    onBack: () => void;
    onStartCooking: () => void;
    currentRecipeData: RecipeStep[];
}

export function IngredientsScreen({
    appVersion,
    voiceEnabled,
    speechSupported,
    selectedRecipe,
    portion,
    currentPortionLabel,
    quantityMode,
    peopleCount,
    availableCount,
    amountUnit,
    targetYield,
    timingAdjustedLabel,
    currentIngredients,
    activeIngredientSelection,
    batchCountForRecipe,
    batchUsageTips,
    currentTip,
    onVoiceToggle,
    onIngredientToggle,
    onBack,
    onStartCooking,
    currentRecipeData,
}: IngredientsScreenProps) {
    const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);

    return (
        <>
            <Sheet
                open
                onOpenChange={(open) => {
                    if (!open) onBack();
                }}
            >
                <SheetContent
                    side="right"
                    className="w-full max-w-xl overflow-hidden border-primary/10 bg-[#ede4dc] p-0"
                >
                    <SheetHeader className="sr-only">
                        <SheetTitle>{selectedRecipe?.name ?? 'Checklist previo'}</SheetTitle>
                        <SheetDescription>Revisa los ingredientes antes de empezar a cocinar.</SheetDescription>
                    </SheetHeader>

                    <div className="flex h-full flex-col">
                        <div className="sticky top-0 z-20 border-b border-[#ecd9cd] bg-[#ede4dc]/95 px-5 pb-4 pt-6 backdrop-blur">
                            <div className="flex flex-col gap-4 pr-12">
                                <div className="flex items-start gap-3">
                                    <button
                                        type="button"
                                        onClick={onBack}
                                        className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-[#f7efe9] text-foreground transition-colors active:scale-[0.98]"
                                    >
                                        <ArrowLeft className="size-5" />
                                    </button>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">Ingredientes</p>
                                        <h1 className="mt-2 max-w-xl text-[1.45rem] font-bold leading-[1.12] tracking-tight text-slate-900 sm:text-[1.75rem]">
                                            {selectedRecipe?.name ?? 'Checklist previo'}
                                        </h1>
                                        <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600">
                                            {`Base: ${describeRecipeYield(targetYield) || (quantityMode === 'people'
                                                ? `${peopleCount} persona${peopleCount === 1 ? '' : 's'}`
                                                : `${availableCount} ${amountUnit === 'grams' ? 'g' : selectedRecipe?.ingredient ?? 'unidades'}`)} · ${timingAdjustedLabel}`}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap justify-start gap-2.5 sm:justify-end">
                                    <button
                                        onClick={onVoiceToggle}
                                        className={`flex size-12 items-center justify-center rounded-full border transition-colors ${voiceEnabled ? 'border-primary/30 bg-primary/10 text-primary' : 'border-primary/10 bg-card/70 text-slate-500'}`}
                                        title={speechSupported ? (voiceEnabled ? 'Desactivar voz' : 'Activar voz') : 'Tu navegador no soporta voz'}
                                    >
                                        {voiceEnabled ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
                                    </button>
                                    <button
                                        onClick={() => setIsRoadmapOpen(true)}
                                        className="flex size-12 items-center justify-center rounded-full border border-primary/15 bg-card/70 text-slate-600 transition-colors hover:bg-primary/8 hover:text-primary"
                                        title="Ver ruta de cocción"
                                    >
                                        <List className="size-5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 pb-24 pt-4">
                            <div className="space-y-4">
                                <ProductSurface className="border-[#dfd5cd] bg-[#f7f5f2] p-4 sm:p-5">
                                    <div className="mb-4 flex flex-wrap items-center gap-3 border-b border-[#ecd9cd] pb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex size-12 items-center justify-center rounded-[0.95rem] bg-[#f4ddd1] text-2xl">
                                                {selectedRecipe?.icon}
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Porcion activa</p>
                                                <p className="mt-1 text-base font-black text-[#131d36] sm:text-lg">
                                                    {describeRecipeYield(targetYield) || `${quantityMode === 'people' ? peopleCount : portion} ${currentPortionLabel}`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="rounded-full bg-[#f4ddd1] px-4 py-2 text-sm font-semibold text-primary">
                                            Version {appVersion}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="mb-4 text-[1.15rem] font-black text-[#131d36] sm:text-[1.35rem]">Ingredientes necesarios</h3>
                                            <div className="space-y-2">
                                                {currentIngredients.map((ingredient, index) => {
                                                    const displayPortionValue =
                                                        selectedRecipe?.id === 'huevo-frito' && normalizeText(ingredient.name).includes('huevo')
                                                            ? `${Math.max(1, batchCountForRecipe)} huevos`
                                                            : resolveIngredientDisplayValue({
                                                                ingredient,
                                                                recipe: selectedRecipe,
                                                                portion,
                                                                peopleCount,
                                                                quantityMode,
                                                            });
                                                    const quantity = splitIngredientQuantity(String(displayPortionValue));
                                                    const isSelected = activeIngredientSelection[getIngredientKey(ingredient.name)] ?? true;

                                                    return (
                                                        <button
                                                            key={index}
                                                            type="button"
                                                            onClick={() => onIngredientToggle(ingredient)}
                                                            className="flex w-full items-center gap-3 rounded-[1.15rem] border border-[#edd9cc] bg-[#f3ece4] px-3 py-3.5 text-left transition-colors hover:border-primary/25 disabled:cursor-not-allowed"
                                                            disabled={ingredient.indispensable}
                                                        >
                                                            <div className="w-4 shrink-0">
                                                                {ingredient.indispensable ? (
                                                                    <div className="flex size-6 items-center justify-center rounded-full border border-[#edd9cc] bg-[#fbf6f2]">
                                                                        <Lock className="size-3 text-slate-500" />
                                                                    </div>
                                                                ) : (
                                                                    <div className={`flex size-6 items-center justify-center rounded-full border ${isSelected ? 'border-primary bg-primary text-white' : 'border-[#edd9cc] bg-[#fbf6f2] text-transparent'}`}>
                                                                        ✓
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="flex size-11 shrink-0 items-center justify-center rounded-[0.9rem] bg-[#f4ddd1] text-lg sm:size-12 sm:text-xl">
                                                                {ingredient.emoji}
                                                            </div>

                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <p className="truncate text-[0.95rem] font-black text-[#131d36] sm:text-base">{ingredient.name}</p>
                                                                    {ingredient.indispensable && (
                                                                        <span className="rounded-full bg-[#f4ddd1] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                                                                            indispensable
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="text-right">
                                                                <p className="text-sm font-black text-primary sm:text-[15px]">{quantity.main}</p>
                                                                {quantity.detail && <p className="text-xs text-slate-500">{quantity.detail}</p>}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <p className="mt-4 text-sm text-slate-500">
                                                Puedes desactivar ingredientes opcionales. Los ingredientes marcados como indispensables quedan fijos en la receta.
                                            </p>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="rounded-[1.15rem] border border-[#edd9cc] bg-[#f3ece4] p-4">
                                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Consejo</p>
                                                <p className="mt-3 text-sm leading-7 text-slate-600">
                                                    {currentTip ?? 'Revisa el checklist y deja a mano solo lo que realmente vas a usar antes de empezar a cocinar.'}
                                                </p>
                                            </div>

                                            {batchUsageTips.length > 0 && (
                                            <div className="rounded-[1.15rem] border border-[#edd9cc] bg-[#f3ece4] p-4">
                                                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Notas de preparacion</p>
                                                    <div className="mt-3 space-y-2">
                                                        {batchUsageTips.map((tip, index) => (
                                                            <p key={index} className="text-sm leading-6 text-slate-600">
                                                                • {tip}
                                                            </p>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </ProductSurface>
                            </div>
                        </div>

                        <div className="sticky bottom-0 z-20 border-t border-[#ecd9cd] bg-[#ede4dc]/95 px-5 pb-5 pt-4 backdrop-blur">
                            <button
                                onClick={onStartCooking}
                                className="mx-auto block w-full rounded-[1.15rem] bg-primary py-4 text-base font-bold text-primary-foreground shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
                            >
                                Empezar a cocinar
                            </button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {isRoadmapOpen ? (
                <Suspense fallback={null}>
                    <RoadmapModal
                        isOpen={isRoadmapOpen}
                        onClose={() => setIsRoadmapOpen(false)}
                        title={`Ruta: ${selectedRecipe?.name}`}
                        steps={currentRecipeData}
                        portion={portion}
                    />
                </Suspense>
            ) : null}
        </>
    );
}
