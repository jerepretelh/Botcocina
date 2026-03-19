import { ArrowLeft, Heart, HeartOff, Sparkles } from 'lucide-react';
import type { Recipe, RecipeCategory } from '../../../types';
import { MainShellLayout } from './MainShellLayout';

interface GlobalCategoryItem {
  id: string;
  kind: 'recipe';
  recipe?: Recipe;
}

interface GlobalRecipesCategoryScreenProps {
  currentUserEmail: string | null;
  category: (RecipeCategory | {
    id: 'all';
    name: string;
    icon: string;
    description?: string;
  }) | null;
  items: GlobalCategoryItem[];
  favoriteRecipeIds: Set<string>;
  onBack: () => void;
  onOpenRecipe: (recipe: Recipe) => void;
  onToggleFavorite: (recipeId: string) => void;
  onGoHome: () => void;
  onGoGlobalRecipes: () => void;
  onGoMyRecipes: () => void;
  onGoFavorites: () => void;
  onGoWeeklyPlan: () => void;
  onGoShoppingList: () => void;
  onGoCompoundLab: () => void;
  onGoSettings: () => void;
  onSignOut: () => void;
}

export function GlobalRecipesCategoryScreen({
  currentUserEmail,
  category,
  items,
  favoriteRecipeIds,
  onBack,
  onOpenRecipe,
  onToggleFavorite,
  onGoHome,
  onGoGlobalRecipes,
  onGoMyRecipes,
  onGoFavorites,
  onGoWeeklyPlan,
  onGoShoppingList,
  onGoCompoundLab,
  onGoSettings,
  onSignOut,
}: GlobalRecipesCategoryScreenProps) {
  return (
    <MainShellLayout
      activeItem="global-recipes"
      currentUserEmail={currentUserEmail}
      onGoHome={onGoHome}
      onGoGlobalRecipes={onGoGlobalRecipes}
      onGoMyRecipes={onGoMyRecipes}
      onGoFavorites={onGoFavorites}
      onGoWeeklyPlan={onGoWeeklyPlan}
      onGoShoppingList={onGoShoppingList}
      onGoCompoundLab={onGoCompoundLab}
      onGoSettings={onGoSettings}
      onSignOut={onSignOut}
    >
      <div className="min-h-screen bg-[#ede4dc] px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-5 flex items-start gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#d8d1cb] bg-[#f5f4f3] text-[#182338]"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#da6f3e]">Recetas globales</p>
              <h1 className="mt-2 text-[1rem] font-black tracking-tight text-[#131d36]">
                {category ? `${category.icon} ${category.name}` : 'Recetas'}
              </h1>
              <p className="mt-1 text-[0.875rem] text-[#6d6a67]">Aquí solo se muestran recetas públicas ya creadas dentro de esta agrupación.</p>
            </div>
          </div>

          <div className="space-y-4">
            {items.map((item) => {
              const recipe = item.recipe;
              const isRecipe = Boolean(recipe);
              const title = recipe?.name ?? 'Receta';
              const ingredient = recipe?.ingredient ?? 'Receta';
              const dateLabel = recipe?.createdAt ? new Date(recipe.createdAt).toLocaleDateString() : 'Receta disponible';
              const isFavorite = recipe ? favoriteRecipeIds.has(recipe.id) : false;

              return (
                <article
                  key={item.id}
                  className="rounded-[1.35rem] border border-[#d8d1cb] bg-[#f5f4f3] px-3 py-3 shadow-[0_8px_20px_rgba(78,64,53,0.08)] md:px-4 md:py-3.5"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (recipe) onOpenRecipe(recipe);
                      }}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <div className="flex size-16 shrink-0 items-center justify-center rounded-[0.95rem] bg-[#e7ddd5] text-[1.75rem] md:size-[4.5rem] md:text-[1.9rem]">
                        {recipe?.icon ?? category?.icon ?? '✨'}
                      </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-[1rem] font-black tracking-tight text-[#182338] md:text-[1rem]">{title}</h3>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.875rem] font-medium text-[#6d7788]">
                            <span>{ingredient}</span>
                            <span>{dateLabel}</span>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-2xl bg-[#d8e5ff] px-2.5 py-0.5 text-[0.75rem] font-bold text-[#2457eb]">
                              Receta completa
                            </span>
                            {recipe ? (
                              <span className="rounded-2xl bg-[#eef1f5] px-2.5 py-0.5 text-[0.75rem] font-bold text-[#667085]">
                                Pública
                              </span>
                            ) : null}
                          </div>
                        </div>
                    </button>

                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (recipe) onOpenRecipe(recipe);
                        }}
                        className="inline-flex h-9 items-center gap-1.5 rounded-[0.8rem] bg-[#da6f3e] px-3.5 text-[0.875rem] font-bold text-white transition-transform hover:scale-[1.01]"
                      >
                        Abrir
                      </button>
                      {recipe ? (
                        <button
                          type="button"
                          onClick={() => onToggleFavorite(recipe.id)}
                          className={`flex size-9 items-center justify-center rounded-[0.8rem] border transition-colors ${
                            isFavorite
                              ? 'border-[#da6f3e]/30 bg-[#f8e0d4] text-[#da6f3e]'
                              : 'border-[#c9cdd3] bg-transparent text-[#99a0ad]'
                          }`}
                          title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                        >
                          {isFavorite ? <Heart className="size-4 fill-current" /> : <HeartOff className="size-4" />}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}

            {items.length === 0 ? (
              <div className="rounded-[1.35rem] border border-dashed border-[#d8d1cb] bg-[#f5f4f3] p-8 text-center text-[0.875rem] text-[#6d6a67]">
                <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-[#f4ddd1] text-[#da6f3e]">
                  <Sparkles className="size-6" />
                </div>
                Esta agrupación aún no tiene recetas públicas visibles.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </MainShellLayout>
  );
}
