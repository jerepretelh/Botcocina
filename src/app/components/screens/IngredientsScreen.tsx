import { useState } from 'react';
import { ChefHat, Volume2, VolumeX, Lock, List } from 'lucide-react';
import { Recipe, Ingredient, QuantityMode, AmountUnit, Portion, RecipeStep } from '../../../types';
import { getIngredientKey, splitIngredientQuantity, normalizeText } from '../../utils/recipeHelpers';
import { RoadmapModal } from '../ui/RoadmapModal';

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
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-black flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 md:mb-8">
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
                            <ChefHat className="w-5 h-5 md:w-6 md:h-6 text-white" />
                        </div>
                        <div className="flex items-end gap-2">
                            <h1 className="text-lg md:text-xl font-bold text-white">Chef Bot Pro</h1>
                            <span className="text-[11px] md:text-xs text-slate-400 mb-0.5">{appVersion}</span>
                        </div>
                    </div>
                    <button
                        onClick={onVoiceToggle}
                        className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center border transition-colors ${voiceEnabled ? 'bg-orange-900/40 border-orange-600' : 'bg-slate-800 border-slate-700'
                            }`}
                        title={speechSupported ? (voiceEnabled ? 'Desactivar voz' : 'Activar voz') : 'Tu navegador no soporta voz'}
                    >
                        {voiceEnabled ? (
                            <Volume2 className="w-4 h-4 md:w-5 md:h-5 text-white" />
                        ) : (
                            <VolumeX className="w-4 h-4 md:w-5 md:h-5 text-slate-300" />
                        )}
                    </button>
                    <button
                        onClick={() => setIsRoadmapOpen(true)}
                        className="w-9 h-9 md:w-10 md:h-10 bg-slate-800 text-white rounded-xl flex items-center justify-center border border-slate-700 hover:border-orange-500 transition-colors"
                        title="Ver ruta de cocción"
                    >
                        <List className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                </div>

                <div className="bg-gradient-to-b from-slate-900 to-black rounded-2xl md:rounded-3xl p-5 md:p-8 border border-slate-800">
                    {/* Title Section */}
                    <div className="text-center mb-6 md:mb-8">
                        <div className="flex items-center justify-center gap-2 mb-3 md:mb-4">
                            <span className="text-3xl md:text-4xl">{selectedRecipe?.icon}</span>
                            <h2 className="text-2xl md:text-3xl font-bold text-white">{selectedRecipe?.name}</h2>
                        </div>
                        <div className="bg-orange-900/30 px-4 py-2 md:px-6 md:py-3 rounded-full border border-orange-700 inline-block">
                            <span className="text-sm md:text-base text-orange-400 font-semibold">
                                Porción: {portion} {currentPortionLabel}
                            </span>
                        </div>
                        <p className="mt-3 text-xs md:text-sm text-blue-200">
                            Base: {quantityMode === 'people'
                                ? `para ${peopleCount} persona${peopleCount === 1 ? '' : 's'}`
                                : `con ${availableCount} ${amountUnit === 'grams' ? 'g' : selectedRecipe?.ingredient ?? 'unidades'}`} · {timingAdjustedLabel}
                        </p>
                    </div>

                    {/* Ingredients List */}
                    <div className="mb-6 md:mb-8">
                        <h3 className="text-lg md:text-xl font-bold text-white mb-4 md:mb-6 flex items-center gap-2">
                            <span className="text-xl md:text-2xl">📋</span>
                            Ingredientes necesarios
                        </h3>
                        <div className="space-y-1.5 md:space-y-2">
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
                                        className="w-full h-20 text-left bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl md:rounded-2xl px-3 md:px-4 border border-slate-700 hover:border-orange-500 transition-colors flex items-center gap-3 md:gap-4 disabled:cursor-not-allowed"
                                        disabled={ingredient.indispensable}
                                    >
                                        <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                                            {ingredient.indispensable ? (
                                                <div className="w-4 h-4 rounded border border-slate-600/60 bg-slate-700/40 flex items-center justify-center">
                                                    <Lock className="w-2.5 h-2.5 text-slate-400/80" />
                                                </div>
                                            ) : (
                                                <div
                                                    className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-orange-500 border-orange-500' : 'border-slate-500'
                                                        }`}
                                                >
                                                    {isSelected && <span className="text-white text-[10px]">✓</span>}
                                                </div>
                                            )}
                                        </div>

                                        <div className="w-10 h-10 shrink-0 bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg flex items-center justify-center text-xl">
                                            {ingredient.emoji}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <p className="text-base md:text-lg font-semibold text-white truncate">
                                                    {ingredient.name}
                                                </p>
                                                {ingredient.indispensable && (
                                                    <span className="shrink-0 text-[10px] px-1.5 py-0.5 bg-orange-900/40 text-orange-300 border border-orange-700 rounded-full leading-none">
                                                        indispensable
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="shrink-0 text-right min-w-[110px] md:min-w-[150px]">
                                            <p className="text-lg md:text-xl font-bold text-orange-400 leading-tight truncate">
                                                {quantity.main}
                                            </p>
                                            {quantity.detail && (
                                                <p className="text-[10px] md:text-xs text-orange-300/90 leading-tight truncate">
                                                    {quantity.detail}
                                                </p>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-slate-400 text-xs md:text-sm mt-3">
                            Puedes desactivar ingredientes opcionales. Los indispensables están bloqueados y al cocinar se ajustan los pasos automáticamente.
                        </p>
                        {batchUsageTips.length > 0 && (
                            <div className="mt-3 space-y-1 text-left">
                                {batchUsageTips.map((tip, index) => (
                                    <p key={index} className="text-xs md:text-sm text-amber-300">
                                        • {tip}
                                    </p>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Info Card */}
                    {currentTip && (
                        <div className="bg-orange-900/20 border border-orange-700 rounded-xl md:rounded-2xl p-4 md:p-5 mb-6 md:mb-8">
                            <div className="flex gap-2 md:gap-3">
                                <span className="text-xl md:text-2xl shrink-0">💡</span>
                                <div>
                                    <p className="text-orange-300 font-semibold mb-1 text-sm md:text-base">Consejo</p>
                                    <p className="text-slate-300 text-xs md:text-sm">
                                        {currentTip}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                        <button
                            onClick={onBack}
                            className="flex-1 bg-slate-800 text-white py-4 md:py-5 rounded-xl md:rounded-2xl font-bold text-base md:text-lg border border-slate-700 hover:border-orange-500 transition-colors"
                        >
                            Volver
                        </button>
                        <button
                            onClick={onStartCooking}
                            className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 md:py-5 rounded-xl md:rounded-2xl font-bold text-base md:text-lg shadow-lg hover:from-orange-600 hover:to-orange-700 transition-all"
                        >
                            ¡Comenzar a cocinar!
                        </button>
                    </div>
                </div>
            </div>

            <RoadmapModal
                isOpen={isRoadmapOpen}
                onClose={() => setIsRoadmapOpen(false)}
                title={`Ruta: ${selectedRecipe?.name}`}
                steps={currentRecipeData}
                portion={portion}
            />
        </div>
    );
}
