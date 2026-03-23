import { CalendarDays, Heart, HeartOff, Play, Sparkles } from 'lucide-react';
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
  onSignOut,
}: RecipeLibraryScreenProps) {
  return (
    <MainShellLayout
      activeItem={activeItem}
      currentUserEmail={currentUserEmail}
      onSignOut={onSignOut}
    >
      <div className="min-h-screen bg-[#ede4dc] px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-[1.6rem] border border-[#d8d1cb] bg-[#f3ece5]/70 p-5 shadow-[0_12px_32px_rgba(78,64,53,0.08)] md:p-6">
            <div className="flex flex-col gap-4 border-b border-[#d8d1cb] pb-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#da6f3e]">
                  Biblioteca personal
                </p>
                <h2 className="mt-2 text-[1rem] font-black tracking-tight text-[#131d36]">{title}</h2>
                <p className="mt-1 max-w-2xl text-[0.875rem] leading-5 text-[#6d6a67]">{description}</p>
              </div>
              <div className="rounded-2xl bg-[#f4ddd1] px-3 py-2 text-[0.875rem] font-semibold text-[#da6f3e]">
                {recipes.length} receta{recipes.length === 1 ? '' : 's'}
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {recipes.map((recipe) => {
                const isFavorite = favoriteRecipeIds.has(recipe.id);
                const isPrivate = recipe.visibility === 'private';
                return (
                  <article
                    key={recipe.id}
                    className="rounded-[1.35rem] border border-[#d8d1cb] bg-[#f5f4f3] px-3 py-3 shadow-[0_8px_20px_rgba(78,64,53,0.08)] md:px-4 md:py-3.5"
                  >
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                      <button
                        type="button"
                        onClick={() => onRecipeOpen(recipe)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <div className="flex size-16 shrink-0 items-center justify-center rounded-[0.95rem] bg-[#e7ddd5] text-[1.75rem] md:size-[4.5rem] md:text-[1.9rem]">
                          {recipe.icon}
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-[1rem] font-black tracking-tight text-[#182338] md:text-[1rem]">
                            {recipe.name}
                          </h3>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.875rem] font-medium text-[#6d7788] md:text-[0.875rem]">
                            <span>{isPrivate ? 'Receta privada' : 'Receta pública'}</span>
                            <span>{recipe.ingredient || 'Base abierta'}</span>
                            <span>{recipe.createdAt ? new Date(recipe.createdAt).toLocaleDateString() : 'Disponible ahora'}</span>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-2xl px-2.5 py-0.5 text-[0.75rem] font-bold ${
                                isPrivate ? 'bg-[#cfead6] text-[#0d8a48]' : 'bg-[#d8e5ff] text-[#2457eb]'
                              }`}
                            >
                              {isPrivate ? 'Mi receta' : 'Global'}
                            </span>
                            {recipe.categoryId === 'personalizadas' && (
                              <span className="inline-flex rounded-2xl bg-[#f4ddd1] px-2.5 py-0.5 text-[0.75rem] font-bold text-[#da6f3e]">
                                Generada con IA
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                      <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                        <button
                          type="button"
                          onClick={() => onPlanRecipe(recipe)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-[0.8rem] border border-[#c5c8ce] bg-transparent px-3.5 text-[0.875rem] font-bold text-[#4f5d73] transition-colors hover:bg-white/60"
                        >
                          <CalendarDays className="size-[0.95rem]" />
                          Planificar
                        </button>
                        <button
                          type="button"
                          onClick={() => onRecipeOpen(recipe)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-[0.8rem] bg-[#da6f3e] px-3.5 text-[0.875rem] font-bold text-white transition-transform hover:scale-[1.01]"
                        >
                          <Play className="size-[0.95rem]" />
                          Abrir
                        </button>
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
                      </div>
                    </div>
                  </article>
                );
              })}

              {recipes.length === 0 && (
                <div className="rounded-[1.35rem] border border-dashed border-[#d8d1cb] bg-[#f5f4f3] p-8 text-center text-[0.875rem] text-[#6d6a67]">
                  <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-[#f4ddd1] text-[#da6f3e]">
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
