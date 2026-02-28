import { ChefHat, Volume2, VolumeX, UtensilsCrossed } from 'lucide-react';
import { RecipeCategoryId, Recipe } from '../../../types';
import { recipeCategories } from '../../data/recipes';

interface CategorySelectScreenProps {
    appVersion: string;
    voiceEnabled: boolean;
    speechSupported: boolean;
    aiPrompt: string;
    aiError: string | null;
    aiSuccess: string | null;
    isCheckingClarifications: boolean;
    isGeneratingRecipe: boolean;
    availableRecipes: Recipe[];
    onVoiceToggle: () => void;
    onAiPromptChange: (val: string) => void;
    onGenerateRecipe: () => void;
    onCategorySelect: (id: RecipeCategoryId) => void;
    recipeCategories: any[]; // Added to match usage
}

export function CategorySelectScreen({
    appVersion,
    voiceEnabled,
    speechSupported,
    aiPrompt,
    aiError,
    aiSuccess,
    isCheckingClarifications,
    isGeneratingRecipe,
    availableRecipes,
    onVoiceToggle,
    onAiPromptChange,
    onGenerateRecipe,
    onCategorySelect,
}: CategorySelectScreenProps) {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-black flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 md:mb-8">
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <ChefHat className="w-6 h-6 md:w-8 md:h-8 text-white" />
                        </div>
                        <div className="flex items-end gap-2">
                            <h1 className="text-xl md:text-2xl font-bold text-white">Chef Bot Pro</h1>
                            <span className="text-[11px] md:text-xs text-slate-400 mb-0.5">{appVersion}</span>
                        </div>
                    </div>
                    <button
                        onClick={onVoiceToggle}
                        className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border transition-colors ${voiceEnabled ? 'bg-orange-900/40 border-orange-600' : 'bg-slate-800 border-slate-700'
                            }`}
                        title={speechSupported ? (voiceEnabled ? 'Desactivar voz' : 'Activar voz') : 'Tu navegador no soporta voz'}
                    >
                        {voiceEnabled ? (
                            <Volume2 className="w-4 h-4 md:w-5 md:h-5 text-white" />
                        ) : (
                            <VolumeX className="w-4 h-4 md:w-5 md:h-5 text-slate-300" />
                        )}
                    </button>
                </div>

                {/* Primary Action */}
                <div className="mb-5 md:mb-6 bg-slate-900 rounded-2xl md:rounded-3xl p-4 md:p-5 border border-slate-700 space-y-3">
                    <p className="text-sm md:text-base text-white font-semibold">
                        Crear nueva receta con IA
                    </p>
                    <textarea
                        value={aiPrompt}
                        onChange={(e) => onAiPromptChange(e.target.value)}
                        placeholder="Ej: salmón al ajillo en sartén, con tiempos para 1, 2 y 4 porciones"
                        className="w-full min-h-24 bg-slate-800 border border-slate-600 rounded-xl p-3 text-sm md:text-base text-white placeholder:text-slate-400 focus:outline-none focus:border-orange-500"
                    />
                    {aiError && <p className="text-sm text-red-400">{aiError}</p>}
                    {aiSuccess && <p className="text-sm text-green-400">{aiSuccess}</p>}
                    <button
                        onClick={onGenerateRecipe}
                        disabled={isGeneratingRecipe || isCheckingClarifications}
                        className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-xl font-bold hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isCheckingClarifications
                            ? 'Consultando preguntas...'
                            : isGeneratingRecipe
                                ? 'Generando receta...'
                                : 'Agregar receta con IA'}
                    </button>
                </div>

                {/* Categories */}
                <div className="mb-4 md:mb-5">
                    <p className="text-sm md:text-base text-slate-300 font-semibold">Recetas por categoría</p>
                </div>

                <div className="space-y-4">
                    <h3 className="text-orange-400 text-xs md:text-sm font-semibold tracking-wider uppercase">
                        CATEGORÍAS
                    </h3>

                    {recipeCategories.map((category) => {
                        const recipeCount = availableRecipes.filter((recipe) => recipe.categoryId === category.id).length;
                        if (recipeCount === 0) return null;

                        return (
                            <button
                                key={category.id}
                                onClick={() => onCategorySelect(category.id)}
                                className="w-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl md:rounded-3xl p-4 md:p-6 border border-slate-700 hover:border-orange-500 transition-all hover:scale-[1.02] flex items-center gap-3 md:gap-4"
                            >
                                <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl md:rounded-2xl flex items-center justify-center text-2xl md:text-3xl shadow-lg">
                                    {category.icon}
                                </div>
                                <div className="flex-1 text-left">
                                    <h3 className="text-lg md:text-xl font-bold text-white mb-1">
                                        {category.name}
                                    </h3>
                                    <p className="text-xs md:text-sm text-slate-400">{category.description}</p>
                                </div>
                                <div className="flex gap-2">
                                    <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-700 rounded-full flex items-center justify-center">
                                        <span className="text-xs md:text-sm text-orange-300 font-bold">{recipeCount}</span>
                                    </div>
                                    <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-700 rounded-full flex items-center justify-center">
                                        <UtensilsCrossed className="w-4 h-4 md:w-5 md:h-5 text-slate-400" />
                                    </div>
                                </div>
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}
