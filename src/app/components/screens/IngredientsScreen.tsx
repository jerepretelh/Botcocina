import { useState } from 'react';
import { List, Lock, Volume2, VolumeX } from 'lucide-react';
import { Recipe, Ingredient, QuantityMode, AmountUnit, Portion, RecipeStep } from '../../../types';
import { getIngredientKey, splitIngredientQuantity, normalizeText } from '../../utils/recipeHelpers';
import { RoadmapModal } from '../ui/RoadmapModal';
import { ProductBottomBar, ProductContainer, ProductHeader, ProductPage, ProductSurface } from '../ui/product-system';

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
    currentRecipeData
}: IngredientsScreenProps) {
    const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);
    return (
        <ProductPage>
            <ProductContainer className="max-w-5xl">
                <ProductHeader
                    eyebrow="Ingredientes"
                    title={selectedRecipe?.name ?? 'Checklist previo'}
                    description={`Base: ${quantityMode === 'people'
                        ? `para ${peopleCount} persona${peopleCount === 1 ? '' : 's'}`
                        : `con ${availableCount} ${amountUnit === 'grams' ? 'g' : selectedRecipe?.ingredient ?? 'unidades'}`} · ${timingAdjustedLabel}`}
                    onBack={onBack}
                    actions={
                        <>
                            <button
                                onClick={onVoiceToggle}
                                className={`flex size-12 items-center justify-center rounded-full border transition-colors ${voiceEnabled ? 'border-primary/30 bg-primary/10 text-primary' : 'border-primary/10 bg-card/70 text-slate-500 dark:text-slate-400'}`}
                                title={speechSupported ? (voiceEnabled ? 'Desactivar voz' : 'Activar voz') : 'Tu navegador no soporta voz'}
                            >
                                {voiceEnabled ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
                            </button>
                            <button
                                onClick={() => setIsRoadmapOpen(true)}
                                className="flex size-12 items-center justify-center rounded-full border border-primary/15 bg-card/70 text-slate-600 transition-colors hover:bg-primary/8 hover:text-primary dark:text-slate-300"
                                title="Ver ruta de cocción"
                            >
                                <List className="size-5" />
                            </button>
                        </>
                    }
                />

                <ProductSurface className="p-6 md:p-8">
                    <div className="mb-6 flex flex-wrap items-center gap-3 border-b border-primary/10 pb-6">
                        <div className="flex items-center gap-3">
                            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-3xl">
                                {selectedRecipe?.icon}
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Porción activa</p>
                                <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
                                    {portion} {currentPortionLabel}
                                </p>
                            </div>
                        </div>
                        <div className="rounded-full bg-primary/8 px-4 py-2 text-sm font-semibold text-primary">
                            Versión {appVersion}
                        </div>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
                        <div>
                            <h3 className="mb-4 text-xl font-bold text-slate-900 dark:text-slate-100">Ingredientes necesarios</h3>
                            <div className="space-y-2">
                                {currentIngredients.map((ingredient, index) => {
                                    const displayPortionValue =
                                        selectedRecipe?.id === 'huevo-frito' && normalizeText(ingredient.name).includes('huevo')
                                            ? `${Math.max(1, batchCountForRecipe)} huevos`
                                            : ingredient.portions[portion];
                                    const quantity = splitIngredientQuantity(String(displayPortionValue));
                                    const isSelected = activeIngredientSelection[getIngredientKey(ingredient.name)] ?? true;
                                    return (
                                        <button
                                            key={index}
                                            type="button"
                                            onClick={() => onIngredientToggle(ingredient)}
                                            className="flex w-full items-center gap-4 rounded-[1.35rem] border border-primary/10 bg-background/80 px-4 py-4 text-left transition-colors hover:border-primary/25 disabled:cursor-not-allowed"
                                            disabled={ingredient.indispensable}
                                        >
                                            <div className="w-4 shrink-0">
                                                {ingredient.indispensable ? (
                                                    <div className="flex size-5 items-center justify-center rounded-full border border-primary/10 bg-primary/6">
                                                        <Lock className="size-3 text-slate-500" />
                                                    </div>
                                                ) : (
                                                    <div className={`flex size-5 items-center justify-center rounded-full border ${isSelected ? 'border-primary bg-primary text-white' : 'border-primary/20 text-transparent'}`}>
                                                        ✓
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-xl">
                                                {ingredient.emoji}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="truncate text-base font-bold text-slate-900 dark:text-slate-100">{ingredient.name}</p>
                                                    {ingredient.indispensable && (
                                                        <span className="rounded-full bg-primary/8 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                                                            indispensable
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <p className="text-lg font-bold text-primary">{quantity.main}</p>
                                                {quantity.detail && <p className="text-xs text-slate-500 dark:text-slate-400">{quantity.detail}</p>}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                                Puedes desactivar ingredientes opcionales. Los ingredientes marcados como indispensables quedan fijos en la receta.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="rounded-[1.5rem] border border-primary/10 bg-background/75 p-5">
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Consejo</p>
                                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                                    {currentTip ?? 'Revisa el checklist y deja a mano solo lo que realmente vas a usar antes de empezar a cocinar.'}
                                </p>
                            </div>

                            {batchUsageTips.length > 0 && (
                                <div className="rounded-[1.5rem] border border-primary/10 bg-background/75 p-5">
                                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Notas de preparación</p>
                                    <div className="mt-3 space-y-2">
                                        {batchUsageTips.map((tip, index) => (
                                            <p key={index} className="text-sm leading-6 text-slate-600 dark:text-slate-400">
                                                • {tip}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </ProductSurface>
            </ProductContainer>

            <ProductBottomBar>
                <button
                    onClick={onStartCooking}
                    className="w-full rounded-[1.25rem] bg-primary py-4 text-lg font-bold text-primary-foreground shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
                >
                    Empezar a cocinar
                </button>
            </ProductBottomBar>

            <RoadmapModal
                isOpen={isRoadmapOpen}
                onClose={() => setIsRoadmapOpen(false)}
                title={`Ruta: ${selectedRecipe?.name}`}
                steps={currentRecipeData}
                portion={portion}
            />
        </ProductPage>
    );
}
