import { Heart, HeartOff, Play, Sparkles } from 'lucide-react';
import type { Recipe } from '../../../types';
import { MainShellLayout } from './MainShellLayout';

interface RecipeLibraryScreenProps {
  title: string;
  description: string;
  activeItem: 'my-recipes' | 'favorites';
  currentUserEmail: string | null;
  recipes: Recipe[];
  favoriteRecipeIds: Set<string>;
  emptyState: string;
  onRecipeOpen: (recipe: Recipe) => void;
  onToggleFavorite: (recipeId: string) => void;
  onPlanRecipe: (recipe: Recipe) => void;
  onGoHome: () => void;
  onGoMyRecipes: () => void;
  onGoFavorites: () => void;
  onGoWeeklyPlan: () => void;
  onGoShoppingList: () => void;
  onGoSettings: () => void;
  onSignOut: () => void;
}

export function RecipeLibraryScreen({
  title,
  description,
  activeItem,
  currentUserEmail,
  recipes,
  favoriteRecipeIds,
  emptyState,
  onRecipeOpen,
  onToggleFavorite,
  onPlanRecipe,
  onGoHome,
  onGoMyRecipes,
  onGoFavorites,
  onGoWeeklyPlan,
  onGoShoppingList,
  onGoSettings,
  onSignOut,
}: RecipeLibraryScreenProps) {
  return (
    <MainShellLayout
      activeItem={activeItem}
      currentUserEmail={currentUserEmail}
      onGoHome={onGoHome}
      onGoMyRecipes={onGoMyRecipes}
      onGoFavorites={onGoFavorites}
      onGoWeeklyPlan={onGoWeeklyPlan}
      onGoShoppingList={onGoShoppingList}
      onGoSettings={onGoSettings}
      onSignOut={onSignOut}
    >
      <div className="min-h-screen px-6 py-8 md:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-[2rem] border border-primary/10 bg-card/80 p-8 shadow-xl">
            <div className="flex flex-col gap-4 border-b border-primary/10 pb-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">
                  Biblioteca personal
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{title}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
              </div>
              <div className="rounded-2xl bg-primary/8 px-4 py-3 text-sm font-semibold text-primary">
                {recipes.length} receta{recipes.length === 1 ? '' : 's'}
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
              {recipes.map((recipe) => {
                const isFavorite = favoriteRecipeIds.has(recipe.id);
                return (
                  <div
                    key={recipe.id}
                    className="group rounded-[1.75rem] border border-primary/10 bg-background/80 p-5 transition-all hover:border-primary/30 hover:shadow-lg"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-3xl shadow-sm">
                        {recipe.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-lg font-bold text-slate-900 dark:text-slate-100">{recipe.name}</h3>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{recipe.description}</p>
                          </div>
                          <button
                            onClick={() => onToggleFavorite(recipe.id)}
                            className={`flex size-11 items-center justify-center rounded-full border transition-colors ${isFavorite ? 'border-primary/25 bg-primary/10 text-primary' : 'border-primary/10 bg-card text-slate-500 dark:text-slate-400'}`}
                            title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                          >
                            {isFavorite ? <Heart className="size-5 fill-current" /> : <HeartOff className="size-5" />}
                          </button>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-primary/8 px-3 py-1 text-xs font-semibold text-primary">
                            {recipe.visibility === 'private' ? 'Privada' : 'Pública'}
                          </span>
                          {recipe.categoryId === 'personalizadas' && (
                            <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                              Generada con IA
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between gap-4">
                      <div className="text-xs text-slate-500 dark:text-slate-500">
                        {recipe.createdAt ? `Creada ${new Date(recipe.createdAt).toLocaleDateString()}` : 'Disponible en tu biblioteca'}
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          onClick={() => onPlanRecipe(recipe)}
                          className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-card px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary/8"
                        >
                          Planificar
                        </button>
                        <button
                          onClick={() => onRecipeOpen(recipe)}
                          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.02]"
                        >
                          <Play className="size-4" />
                          Abrir receta
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {recipes.length === 0 && (
                <div className="rounded-[1.75rem] border border-dashed border-primary/20 bg-background/70 p-8 text-center text-sm text-slate-500 dark:text-slate-400 lg:col-span-2">
                  <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Sparkles className="size-7" />
                  </div>
                  {emptyState}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainShellLayout>
  );
}
