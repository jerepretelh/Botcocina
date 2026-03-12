import { CalendarDays, Heart, HeartOff, Play, Sparkles, Volume2, VolumeX } from 'lucide-react';
import type { MixedRecipeSearchResult, Recipe } from '../../../types';
import { MainShellLayout } from './MainShellLayout';
import { MixedRecipeSearchPanel } from '../search/MixedRecipeSearchPanel';

interface CategorySelectScreenProps {
  appVersion: string;
  voiceEnabled: boolean;
  speechSupported: boolean;
  currentUserEmail: string | null;
  aiError: string | null;
  aiSuccess: string | null;
  recentRecipes: Recipe[];
  favoriteRecipeIds: Set<string>;
  searchTerm: string;
  searchResults: MixedRecipeSearchResult[];
  searchIsLoading: boolean;
  onVoiceToggle: () => void;
  onOpenAIWizard: () => void;
  onSearchTermChange: (value: string) => void;
  onSearchSelectResult: (result: MixedRecipeSearchResult) => void;
  onRecipeOpen: (recipe: Recipe) => void;
  onToggleFavorite: (recipeId: string) => void;
  onOpenMyRecipes: () => void;
  onOpenGlobalRecipes: () => void;
  onOpenFavorites: () => void;
  onOpenWeeklyPlan: () => void;
  onOpenShoppingList: () => void;
  onOpenAISettings: () => void;
  onSignOut: () => void;
  onPlanRecipe: (recipe: Recipe) => void;
}

export function CategorySelectScreen({
  appVersion,
  voiceEnabled,
  speechSupported,
  currentUserEmail,
  aiError,
  aiSuccess,
  recentRecipes,
  favoriteRecipeIds,
  searchTerm,
  searchResults,
  searchIsLoading,
  onVoiceToggle,
  onOpenAIWizard,
  onSearchTermChange,
  onSearchSelectResult,
  onRecipeOpen,
  onToggleFavorite,
  onOpenMyRecipes,
  onOpenGlobalRecipes,
  onOpenFavorites,
  onOpenWeeklyPlan,
  onOpenShoppingList,
  onOpenAISettings,
  onSignOut,
  onPlanRecipe,
}: CategorySelectScreenProps) {
  const visibleRecentRecipes = recentRecipes.slice(0, 3);
  const hasSearch = Boolean(searchTerm.trim());

  return (
    <MainShellLayout
      activeItem="home"
      currentUserEmail={currentUserEmail}
      onGoHome={() => undefined}
      onGoGlobalRecipes={onOpenGlobalRecipes}
      onGoMyRecipes={onOpenMyRecipes}
      onGoFavorites={onOpenFavorites}
      onGoWeeklyPlan={onOpenWeeklyPlan}
      onGoShoppingList={onOpenShoppingList}
      onGoSettings={onOpenAISettings}
      onSignOut={onSignOut}
    >
      <div className="min-h-[100dvh] bg-[#ede4dc] px-3 py-4 sm:px-5 md:px-8 md:py-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7f756e]">Inicio</p>
              <p className="mt-1 text-xs text-[#8d837c]">Versión {appVersion}</p>
            </div>
            <button
              onClick={onVoiceToggle}
              className={`flex size-11 items-center justify-center rounded-full border transition-colors ${
                voiceEnabled
                  ? 'border-[#da6f3e]/50 bg-[#f4d5c4] text-[#da6f3e]'
                  : 'border-[#d6ccc3] bg-[#f4efea] text-[#8b919e]'
              }`}
              title={speechSupported ? (voiceEnabled ? 'Desactivar voz' : 'Activar voz') : 'Tu navegador no soporta voz'}
            >
              {voiceEnabled ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
            </button>
          </div>

          <div className="mx-auto mt-7 max-w-4xl text-center md:mt-8">
            <h1 className="text-[1rem] font-black leading-[1.1] tracking-tight text-[#131d36] md:text-[1rem]">
              ¿Qué cocinamos hoy?
            </h1>
            <p className="mx-auto mt-2 max-w-3xl text-[0.875rem] leading-5 text-[#56647c] md:text-[0.875rem] md:leading-5">
              Cuéntale a la IA qué quieres cocinar y empieza rápido con una receta guiada.
            </p>
          </div>

          <div className="mx-auto mt-6 max-w-4xl md:mt-7">
            <MixedRecipeSearchPanel
              query={searchTerm}
              onQueryChange={onSearchTermChange}
              results={searchResults}
              isLoading={searchIsLoading}
              placeholder="Buscar recetas por nombre, ingrediente o categoría..."
              emptyMessage="No encontré coincidencias. Prueba otro plato, ingrediente o categoría."
              totalLabel={`${searchResults.length} resultado${searchResults.length === 1 ? '' : 's'} encontrados`}
              onSelectResult={onSearchSelectResult}
            />
          </div>

          <div className="mt-5 flex flex-col items-center justify-center gap-3 text-center md:mt-6 md:flex-row">
            <span className="text-[0.95rem] font-medium text-[#67748a]">o bien</span>
            <button
              type="button"
              onClick={onOpenAIWizard}
              className="inline-flex items-center gap-2 rounded-[1rem] bg-[#f2d9cb] px-4 py-2.5 text-[0.95rem] font-bold text-[#da6f3e] transition-transform hover:scale-[1.01] active:scale-[0.99]"
            >
              <Sparkles className="size-4" />
              Crear receta nueva con IA
            </button>
          </div>

          {(aiError || aiSuccess) && (
            <div className="mx-auto mt-6 max-w-4xl rounded-[1.5rem] border border-[#d7cdc6] bg-[#f7f2ee] px-5 py-4 text-left shadow-[0_10px_26px_rgba(78,64,53,0.08)]">
              {aiError ? <p className="text-sm font-medium text-red-600">{aiError}</p> : null}
              {aiSuccess ? <p className="text-sm font-medium text-emerald-700">{aiSuccess}</p> : null}
            </div>
          )}

          {!hasSearch ? (
            <section className="mt-9 md:mt-10">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-[1rem] font-black tracking-tight text-[#131d36] md:text-[1rem]">
                    Tus últimas recetas creadas
                  </h2>
                  <p className="mt-1 text-[0.875rem] text-[#6d6a67] md:text-[0.875rem]">Vuelve a abrirlas, planificarlas o guardarlas como favoritas.</p>
                </div>
                <button className="hidden text-[0.95rem] font-semibold text-[#da6f3e] md:inline-flex" onClick={onOpenMyRecipes}>
                  Ver todas
                </button>
              </div>

              <div className="space-y-4 md:space-y-5">
                {visibleRecentRecipes.map((recipe) => {
                  const isFavorite = favoriteRecipeIds.has(recipe.id);
                  const isPrivate = recipe.visibility === 'private';

                  return (
                    <article
                      key={recipe.id}
                      className="rounded-[1.35rem] border border-[#d8d1cb] bg-[#f5f4f3] px-3 py-3 shadow-[0_8px_20px_rgba(78,64,53,0.08)] md:px-4 md:py-3.5"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center">
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
                              <span>{isPrivate ? 'Receta privada' : 'Receta global'}</span>
                              <span>{recipe.ingredient || 'Base abierta'}</span>
                              <span>{recipe.createdAt ? new Date(recipe.createdAt).toLocaleDateString() : 'Disponible ahora'}</span>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span
                                className={`rounded-2xl px-2.5 py-0.5 text-[0.75rem] font-bold ${
                                  isPrivate ? 'bg-[#cfead6] text-[#0d8a48]' : 'bg-[#d8e5ff] text-[#2457eb]'
                                }`}
                              >
                                {isPrivate ? 'Mi receta' : 'Global'}
                              </span>
                            </div>
                          </div>
                        </button>

                        <div className="flex flex-wrap items-center gap-2 md:justify-end">
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
                            title={isFavorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                          >
                            {isFavorite ? <Heart className="size-4 fill-current" /> : <HeartOff className="size-4" />}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}

                {visibleRecentRecipes.length === 0 ? (
                  <div className="rounded-[1.9rem] border border-dashed border-[#d5c9c1] bg-[#f5f1ed] px-6 py-10 text-[#726c66]">
                    Aún no tienes recetas privadas creadas. Usa el buscador o crea una nueva receta con IA para empezar.
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </MainShellLayout>
  );
}
