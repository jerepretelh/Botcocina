import { useState } from 'react';
import { ChevronDown, ChevronUp, Heart, HeartOff, Sparkles, Volume2, VolumeX } from 'lucide-react';
import type { Recipe, RecipeCategory, RecipeCategoryId } from '../../../types';
import { MainShellLayout } from './MainShellLayout';

interface CategorySelectScreenProps {
  appVersion: string;
  voiceEnabled: boolean;
  speechSupported: boolean;
  currentUserEmail: string | null;
  aiError: string | null;
  aiSuccess: string | null;
  recipeCategories: RecipeCategory[];
  recentRecipes: Recipe[];
  favoriteRecipeIds: Set<string>;
  onVoiceToggle: () => void;
  onOpenAIWizard: () => void;
  onOpenRecipeSearch: () => void;
  onCategorySelect: (id: RecipeCategoryId) => void;
  onRecipeOpen: (recipe: Recipe) => void;
  onToggleFavorite: (recipeId: string) => void;
  onOpenMyRecipes: () => void;
  onOpenTestRecipes: () => void;
  onOpenFavorites: () => void;
  onOpenWeeklyPlan: () => void;
  onOpenShoppingList: () => void;
  onOpenAISettings: () => void;
  onSignOut: () => void;
  onPlanRecipe: (recipe: Recipe) => void;
}

const FEATURED_CATEGORIES: RecipeCategoryId[] = ['desayunos', 'almuerzos', 'cenas'];

export function CategorySelectScreen({
  appVersion,
  voiceEnabled,
  speechSupported,
  currentUserEmail,
  aiError,
  aiSuccess,
  recipeCategories,
  recentRecipes,
  favoriteRecipeIds,
  onVoiceToggle,
  onOpenAIWizard,
  onOpenRecipeSearch,
  onCategorySelect,
  onRecipeOpen,
  onToggleFavorite,
  onOpenMyRecipes,
  onOpenTestRecipes,
  onOpenFavorites,
  onOpenWeeklyPlan,
  onOpenShoppingList,
  onOpenAISettings,
  onSignOut,
  onPlanRecipe,
}: CategorySelectScreenProps) {
  const [showAllCategories, setShowAllCategories] = useState(false);
  const featuredCategories = recipeCategories.filter((category) => FEATURED_CATEGORIES.includes(category.id));
  const otherCategories = recipeCategories.filter((category) => !FEATURED_CATEGORIES.includes(category.id));
  const visibleRecentRecipes = recentRecipes.slice(0, 2);

  return (
    <MainShellLayout
      activeItem="home"
      currentUserEmail={currentUserEmail}
      onGoHome={() => undefined}
      onGoMyRecipes={onOpenMyRecipes}
      onGoFavorites={onOpenFavorites}
      onGoWeeklyPlan={onOpenWeeklyPlan}
      onGoShoppingList={onOpenShoppingList}
      onGoSettings={onOpenAISettings}
      onSignOut={onSignOut}
    >
      <div className="relative min-h-[100dvh] overflow-hidden px-4 py-5 sm:px-5 md:px-8 md:py-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(236,91,19,0.18),_transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.1),transparent_60%)] dark:bg-[radial-gradient(circle_at_top,_rgba(236,91,19,0.22),_transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(rgba(236,91,19,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(236,91,19,0.18) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

        <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-8.5rem)] max-w-5xl flex-col">
          <div className="mb-4 flex items-center justify-between gap-3 md:mb-5">
            <div className="text-left md:text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">Inicio</p>
              <p className="mt-1 hidden text-xs text-slate-500 dark:text-slate-400 sm:block">Versión {appVersion}</p>
            </div>
            <button
              onClick={onVoiceToggle}
              className={`flex size-10 items-center justify-center rounded-full border transition-colors active:scale-[0.98] sm:size-11 ${voiceEnabled ? 'border-primary/40 bg-primary/10 text-primary' : 'border-primary/10 bg-card/70 text-slate-500 dark:text-slate-400'}`}
              title={speechSupported ? (voiceEnabled ? 'Desactivar voz' : 'Activar voz') : 'Tu navegador no soporta voz'}
            >
              {voiceEnabled ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
            </button>
          </div>

          <div className="mx-auto flex w-full max-w-md flex-1 flex-col text-center md:max-w-4xl">
            <div className="space-y-2.5">
              <h2 className="text-[2.15rem] font-bold leading-tight tracking-tight text-slate-900 dark:text-slate-100 md:text-5xl">
                ¿Qué cocinamos hoy?
              </h2>
              <p className="mx-auto max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400 md:text-lg md:leading-7">
                Cuéntale a la IA qué quieres cocinar y empieza rápido con una receta guiada.
              </p>
            </div>

            <div className="relative mt-6">
              <div className="absolute inset-0 rounded-full bg-primary/35 blur-[42px]" />
              <button
                className="relative flex w-full items-center justify-center gap-3 rounded-full bg-primary px-6 py-4 text-lg font-extrabold text-primary-foreground shadow-[0_18px_48px_rgba(236,91,19,0.35)] transition-transform active:scale-[0.98] md:w-auto md:px-10 md:py-5 md:text-2xl"
                onClick={onOpenAIWizard}
              >
                <Sparkles className="size-6 md:size-7" />
                Crear receta con IA
              </button>
            </div>

            <div className="mt-4 w-full rounded-[1.5rem] border border-primary/10 bg-card/80 p-4 text-left shadow-sm md:max-w-2xl md:rounded-[1.75rem]">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Búsqueda rápida</p>
                  <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-slate-100 md:text-lg">Busca una idea por nombre y arranca desde ahí</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Encuentra platos como ceviche o milanesa y abre el wizard con esa base ya lista.
                  </p>
                </div>
                <button
                  onClick={onOpenRecipeSearch}
                  className="shrink-0 rounded-full border border-primary/20 bg-white px-5 py-3 text-sm font-bold text-primary transition-colors active:scale-[0.98] dark:bg-background"
                >
                  Buscar recetas
                </button>
              </div>
            </div>

            <div className="mt-4 w-full rounded-[1.5rem] border border-primary/10 bg-card/80 p-4 text-left shadow-sm md:max-w-2xl md:rounded-[1.75rem]">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Pruebas V2</p>
                  <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-slate-100 md:text-lg">Abre el módulo de recetas compuestas</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Entra directo a las recetas pensadas para validar el cooking adaptativo sin buscarlas por categoría.
                  </p>
                </div>
                <button
                  onClick={onOpenTestRecipes}
                  className="shrink-0 rounded-full border border-primary/20 bg-white px-5 py-3 text-sm font-bold text-primary transition-colors active:scale-[0.98] dark:bg-background"
                >
                  Ver recetas de prueba
                </button>
              </div>
            </div>

            {(aiError || aiSuccess) && (
              <div className="mt-8 w-full max-w-3xl rounded-[1.5rem] border border-primary/10 bg-white/70 p-4 text-left shadow-sm dark:bg-[#221610]/70">
                {aiError ? <p className="text-sm font-medium text-red-500">{aiError}</p> : null}
                {aiSuccess ? <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{aiSuccess}</p> : null}
              </div>
            )}

            <section className="mt-8 w-full max-w-4xl md:mt-12">
              <div className="grid grid-cols-3 gap-3 md:gap-6">
                {featuredCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => onCategorySelect(category.id)}
                    className="group flex flex-col items-center gap-3 rounded-[1.5rem] p-1 transition-transform active:scale-[0.98] md:rounded-[2rem] md:p-2"
                  >
                    <div className="flex size-20 items-center justify-center rounded-full border-2 border-primary/10 bg-card shadow-lg transition-all group-hover:border-primary group-hover:bg-primary/5 md:size-32">
                      <span className="text-3xl md:text-5xl">{category.icon}</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 md:text-lg">{category.name}</p>
                      <p className="mt-1 hidden text-sm text-slate-500 dark:text-slate-400 md:block">{category.description}</p>
                    </div>
                  </button>
                ))}
              </div>

              {otherCategories.length > 0 && (
                <div className="mt-8 text-left">
                  <button
                    type="button"
                    onClick={() => setShowAllCategories((prev) => !prev)}
                    className="flex w-full items-center justify-between rounded-[1.25rem] border border-primary/10 bg-card/70 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition-colors active:scale-[0.99] dark:text-slate-300"
                  >
                    <span className="uppercase tracking-[0.2em] text-primary/80">
                      {showAllCategories ? 'Ocultar categorías' : 'Ver más categorías'}
                    </span>
                    {showAllCategories ? <ChevronUp className="size-4 text-primary" /> : <ChevronDown className="size-4 text-primary" />}
                  </button>
                  {showAllCategories ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {otherCategories.map((category) => (
                        <button
                          key={category.id}
                          onClick={() => onCategorySelect(category.id)}
                          className="rounded-full border border-primary/10 bg-card/80 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors active:scale-[0.98] md:px-4 md:text-sm dark:text-slate-300"
                        >
                          {category.icon} {category.name}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </section>

            <section className="mt-8 w-full text-left md:mt-14">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 md:text-2xl">Creaciones recientes</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Tus recetas listas para reabrir.</p>
                </div>
                <button className="text-sm font-semibold text-primary hover:underline" onClick={onOpenMyRecipes}>
                  Ver todas
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {visibleRecentRecipes.map((recipe) => {
                  const isFavorite = favoriteRecipeIds.has(recipe.id);
                  return (
                    <div
                      key={recipe.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onRecipeOpen(recipe)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onRecipeOpen(recipe);
                        }
                      }}
                      className="flex cursor-pointer items-center gap-3 rounded-[1.35rem] border border-primary/10 bg-white/60 p-3 shadow-sm transition-all hover:border-primary/30 hover:shadow-lg dark:bg-white/5 md:gap-4 md:p-4"
                    >
                      <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-2xl md:size-16 md:text-3xl">
                        {recipe.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{recipe.name}</h4>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{recipe.description}</p>
                        <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-500">
                          {recipe.createdAt ? `Creada ${new Date(recipe.createdAt).toLocaleDateString()}` : 'Receta privada'}
                        </p>
                      </div>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onToggleFavorite(recipe.id);
                        }}
                        className={`flex size-10 items-center justify-center rounded-full border transition-colors ${isFavorite ? 'border-primary/30 bg-primary/10 text-primary' : 'border-primary/10 bg-background text-slate-500 dark:text-slate-400'}`}
                        title={isFavorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                      >
                        {isFavorite ? <Heart className="size-5 fill-current" /> : <HeartOff className="size-5" />}
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onPlanRecipe(recipe);
                        }}
                        className="hidden items-center rounded-full border border-primary/10 bg-background px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/8 md:flex"
                      >
                        Planificar
                      </button>
                    </div>
                  );
                })}

                {recentRecipes.length === 0 && (
                  <div className="rounded-[1.5rem] border border-dashed border-primary/20 bg-white/40 p-6 text-sm text-slate-500 dark:bg-white/5 dark:text-slate-400 md:col-span-2">
                    Aún no tienes recetas privadas creadas con IA. Genera una desde el bloque principal y aparecerá aquí.
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </MainShellLayout>
  );
}
