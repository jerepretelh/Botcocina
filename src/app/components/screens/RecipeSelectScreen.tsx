import { Suspense, lazy, useState, type MouseEvent } from 'react';
import { Bookmark, BookmarkCheck, Heart, List, Volume2, VolumeX } from 'lucide-react';
import { CatalogViewMode, Recipe, RecipeCategory, RecipeStep } from '../../../types';
import { MainShellLayout } from './MainShellLayout';
import { loadLocalRecipeCatalog } from '../../lib/localRecipeCatalog';
import { ProductContainer, ProductEmptyState, ProductHeader, ProductPage, ProductSurface } from '../ui/product-system';

const RoadmapModal = lazy(() => import('../ui/RoadmapModal').then((module) => ({ default: module.RoadmapModal })));

interface RecipeSelectScreenProps {
    appVersion: string;
    voiceEnabled: boolean;
    speechSupported: boolean;
    selectedCategoryMeta: RecipeCategory | null;
    visibleRecipes: Recipe[];
    onVoiceToggle: () => void;
    onBack: () => void;
    onRecipeSelect: (recipe: Recipe) => void;
    catalogViewMode: CatalogViewMode;
    activeListName: string | null;
    isRecipeInActiveList: (recipeId: string) => boolean;
    onToggleRecipeInActiveList: (recipeId: string) => void;
    isFavorite: (recipeId: string) => boolean;
    onToggleFavorite: (recipeId: string) => void;
    onPlanRecipe: (recipe: Recipe) => void;
    currentUserEmail: string | null;
    onGoHome: () => void;
    onGoMyRecipes: () => void;
    onGoFavorites: () => void;
    onGoWeeklyPlan: () => void;
    onGoShoppingList: () => void;
    onGoSettings: () => void;
    onSignOut: () => void;
    onOpenRecipeSearch: () => void;
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
    catalogViewMode,
    activeListName,
    isRecipeInActiveList,
    onToggleRecipeInActiveList,
    isFavorite,
    onToggleFavorite,
    onPlanRecipe,
    currentUserEmail,
    onGoHome,
    onGoMyRecipes,
    onGoFavorites,
    onGoWeeklyPlan,
    onGoShoppingList,
    onGoSettings,
    onSignOut,
    onOpenRecipeSearch,
}: RecipeSelectScreenProps) {
    const [roadmapRecipe, setRoadmapRecipe] = useState<Recipe | null>(null);
    const [roadmapSteps, setRoadmapSteps] = useState<RecipeStep[]>([]);

    const handleViewRoadmap = async (e: MouseEvent, recipe: Recipe) => {
        e.stopPropagation();
        const localCatalog = await loadLocalRecipeCatalog();
        setRoadmapSteps(localCatalog.initialRecipeContent[recipe.id]?.steps ?? []);
        setRoadmapRecipe(recipe);
    };

    return (
        <MainShellLayout
            activeItem="home"
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
                        eyebrow={selectedCategoryMeta ? `${selectedCategoryMeta.icon} Categoría` : 'Recetas'}
                        title={selectedCategoryMeta?.name ?? 'Recetas'}
                        description={
                            catalogViewMode === 'my-lists'
                                ? `Lista activa: ${activeListName ?? 'Mis listas'}`
                                : 'Explora recetas con el mismo lenguaje visual y abre la que quieras cocinar.'
                        }
                        onBack={onBackToCategories}
                        actions={
                            <button
                                onClick={onVoiceToggle}
                                className={`flex size-12 items-center justify-center rounded-full border transition-colors ${voiceEnabled ? 'border-primary/30 bg-primary/10 text-primary' : 'border-primary/10 bg-card/70 text-slate-500 dark:text-slate-400'}`}
                                title={speechSupported ? (voiceEnabled ? 'Desactivar voz' : 'Activar voz') : 'Tu navegador no soporta voz'}
                            >
                                {voiceEnabled ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
                            </button>
                        }
                    />

                    <ProductSurface className="p-6 md:p-8">
                        <div className="mb-6 flex flex-col gap-3 border-b border-primary/10 pb-6 md:flex-row md:items-end md:justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Catálogo</p>
                                <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                                    {visibleRecipes.length} receta{visibleRecipes.length === 1 ? '' : 's'} disponibles
                                </h2>
                            </div>
                            <div className="flex flex-col items-start gap-2 md:items-end">
                                <button
                                    type="button"
                                    onClick={onOpenRecipeSearch}
                                    className="rounded-full border border-primary/15 bg-card px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/8"
                                >
                                    Buscar idea por nombre
                                </button>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Versión {appVersion}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                            {visibleRecipes.map((recipe) => (
                                <div
                                    key={recipe.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => onRecipeSelect(recipe)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            onRecipeSelect(recipe);
                                        }
                                    }}
                                    className="group rounded-[1.75rem] border border-primary/10 bg-background/75 p-5 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-3xl shadow-sm">
                                            {recipe.icon}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <h3 className="truncate text-lg font-bold text-slate-900 dark:text-slate-100">
                                                        {recipe.name}
                                                    </h3>
                                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{recipe.description}</p>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onToggleFavorite(recipe.id);
                                                    }}
                                                    className={`flex size-11 items-center justify-center rounded-full border transition-colors ${isFavorite(recipe.id) ? 'border-primary/25 bg-primary/10 text-primary' : 'border-primary/10 bg-card text-slate-500 dark:text-slate-400'}`}
                                                    title={isFavorite(recipe.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                                                >
                                                    <Heart className={`size-5 ${isFavorite(recipe.id) ? 'fill-current' : ''}`} />
                                                </button>
                                            </div>

                                            <div className="mt-4 flex flex-wrap gap-2">
                                                <span className="rounded-full bg-primary/8 px-3 py-1 text-xs font-semibold text-primary">
                                                    {recipe.categoryId}
                                                </span>
                                                {recipe.visibility === 'private' ? (
                                                    <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                                                        Privada
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onToggleRecipeInActiveList(recipe.id);
                                                }}
                                                className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-card px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-primary/8 hover:text-primary dark:text-slate-200"
                                                title={isRecipeInActiveList(recipe.id) ? 'Quitar de lista' : 'Guardar en lista'}
                                            >
                                                {isRecipeInActiveList(recipe.id) ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
                                                {isRecipeInActiveList(recipe.id) ? 'En lista' : 'Guardar'}
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onPlanRecipe(recipe);
                                                }}
                                                className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-card px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-primary/8 hover:text-primary dark:text-slate-200"
                                                title="Agregar al plan semanal"
                                            >
                                                Planificar
                                            </button>
                                            <button
                                                onClick={(e) => handleViewRoadmap(e, recipe)}
                                                className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-card px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-primary/8 hover:text-primary dark:text-slate-200"
                                                title="Ver ruta de cocción"
                                            >
                                                <List className="size-4" />
                                                Ruta
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => onRecipeSelect(recipe)}
                                            className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.02]"
                                        >
                                            Abrir receta
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {visibleRecipes.length === 0 && (
                                <div className="lg:col-span-2">
                                    <ProductEmptyState message="Esta categoría aún no tiene recetas disponibles." />
                                </div>
                            )}
                        </div>
                    </ProductSurface>
                </ProductContainer>
            </ProductPage>

            {roadmapRecipe ? (
                <Suspense fallback={null}>
                    <RoadmapModal
                        isOpen={!!roadmapRecipe}
                        onClose={() => setRoadmapRecipe(null)}
                        title={`Ruta: ${roadmapRecipe?.name}`}
                        steps={roadmapSteps}
                        portion={1}
                    />
                </Suspense>
            ) : null}
        </MainShellLayout>
    );
}
