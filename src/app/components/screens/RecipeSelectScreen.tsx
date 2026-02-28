import { useState } from 'react';
import { ChefHat, Volume2, VolumeX, List } from 'lucide-react';
import { Recipe, RecipeCategoryId, RecipeCategory, RecipeStep } from '../../../types';
import { RoadmapModal } from '../ui/RoadmapModal';
import { initialRecipeContent } from '../../data/recipes';

interface RecipeSelectScreenProps {
    appVersion: string;
    voiceEnabled: boolean;
    speechSupported: boolean;
    selectedCategoryMeta: RecipeCategory | null;
    visibleRecipes: Recipe[];
    onVoiceToggle: () => void;
    onBack: () => void;
    onRecipeSelect: (recipe: Recipe) => void;
}

export function RecipeSelectScreen({
    appVersion,
    voiceEnabled,
    speechSupported,
    selectedCategoryMeta,
    visibleRecipes,
    onVoiceToggle,
    onBack: onBackToCategories,
    onRecipeSelect,
}: RecipeSelectScreenProps) {
    const [roadmapRecipe, setRoadmapRecipe] = useState<Recipe | null>(null);

    const handleViewRoadmap = (e: React.MouseEvent, recipe: Recipe) => {
        e.stopPropagation();
        setRoadmapRecipe(recipe);
    };

    const roadmapSteps: RecipeStep[] = roadmapRecipe
        ? initialRecipeContent[roadmapRecipe.id]?.steps || []
        : [];

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

                {/* Title */}
                <div className="text-center mb-6 md:mb-8">
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                        {selectedCategoryMeta?.icon} {selectedCategoryMeta?.name ?? 'Recetas'}
                    </h2>
                    <p className="text-sm md:text-base text-slate-400">
                        Elige una receta
                    </p>
                </div>

                <div className="mb-4">
                    <button
                        onClick={onBackToCategories}
                        className="bg-slate-800 text-white px-4 py-2 rounded-xl border border-slate-700 hover:border-orange-500 transition-colors text-sm font-semibold"
                    >
                        ← Volver a categorías
                    </button>
                </div>

                {/* Recipes */}
                <div className="space-y-4">
                    <h3 className="text-orange-400 text-xs md:text-sm font-semibold tracking-wider uppercase">
                        RECETAS
                    </h3>

                    {visibleRecipes.map((recipe) => (
                        <button
                            key={recipe.id}
                            onClick={() => onRecipeSelect(recipe)}
                            className="w-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl md:rounded-3xl p-4 md:p-6 border border-slate-700 hover:border-orange-500 transition-all hover:scale-[1.02] flex items-center gap-3 md:gap-4"
                        >
                            <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl md:rounded-2xl flex items-center justify-center text-2xl md:text-3xl shadow-lg">
                                {recipe.icon}
                            </div>
                            <div className="flex-1 text-left">
                                <h3 className="text-lg md:text-xl font-bold text-white mb-1">
                                    {recipe.name}
                                </h3>
                                <p className="text-xs md:text-sm text-slate-400">{recipe.description}</p>
                            </div>
                            <div className="shrink-0">
                                <button
                                    onClick={(e) => handleViewRoadmap(e, recipe)}
                                    className="w-10 h-10 md:w-12 md:h-12 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center hover:bg-slate-700 hover:border-orange-500 transition-all text-orange-400 shadow-md"
                                    title="Ver ruta de cocción"
                                >
                                    <List className="w-5 h-5 md:w-6 md:h-6" />
                                </button>
                            </div>
                        </button>
                    ))}

                    {visibleRecipes.length === 0 && (
                        <div className="bg-slate-900 rounded-2xl p-4 border border-slate-700 text-slate-300 text-sm">
                            Esta categoría aún no tiene recetas.
                        </div>
                    )}

                </div>
            </div>

            <RoadmapModal
                isOpen={!!roadmapRecipe}
                onClose={() => setRoadmapRecipe(null)}
                title={`Ruta: ${roadmapRecipe?.name}`}
                steps={roadmapSteps}
                portion={1} // Preview default portion
            />
        </div>
    );
}
