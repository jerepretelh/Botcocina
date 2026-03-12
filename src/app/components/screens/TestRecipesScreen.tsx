import { FlaskConical, Play, Sparkles } from 'lucide-react';
import type { Recipe } from '../../../types';
import { MainShellLayout } from './MainShellLayout';

interface TestRecipesScreenProps {
  currentUserEmail: string | null;
  recipes: Recipe[];
  onRecipeOpen: (recipe: Recipe) => void;
  onGoHome: () => void;
  onGoMyRecipes: () => void;
  onGoFavorites: () => void;
  onGoWeeklyPlan: () => void;
  onGoShoppingList: () => void;
  onGoSettings: () => void;
  onSignOut: () => void;
}

export function TestRecipesScreen({
  currentUserEmail,
  recipes,
  onRecipeOpen,
  onGoHome,
  onGoMyRecipes,
  onGoFavorites,
  onGoWeeklyPlan,
  onGoShoppingList,
  onGoSettings,
  onSignOut,
}: TestRecipesScreenProps) {
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
      <div className="min-h-screen px-6 py-8 md:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-[2rem] border border-primary/10 bg-card/80 p-8 shadow-xl">
            <div className="flex flex-col gap-4 border-b border-primary/10 pb-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">Módulo de prueba</p>
                <h2 className="mt-3 flex items-center gap-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  <FlaskConical className="h-8 w-8 text-primary" />
                  Recetas V2 para validar
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Aquí reunimos solo las recetas pensadas para probar el cooking adaptativo, sin mezclar todavía el catálogo completo.
                </p>
              </div>
              <div className="rounded-2xl bg-primary/8 px-4 py-3 text-sm font-semibold text-primary">
                {recipes.length} receta{recipes.length === 1 ? '' : 's'} en prueba
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
              {recipes.map((recipe) => (
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
                        <div className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
                          V2
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-primary/8 px-3 py-1 text-xs font-semibold text-primary">
                          {recipe.categoryId}
                        </span>
                        {recipe.supportsAdaptiveCooking ? (
                          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                            Cooking adaptativo
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between gap-4">
                    <div className="text-xs text-slate-500 dark:text-slate-500">
                      Usa este acceso para validar paralelismo, timers y bloqueos.
                    </div>
                    <button
                      onClick={() => onRecipeOpen(recipe)}
                      className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.02]"
                    >
                      <Play className="size-4" />
                      Abrir receta
                    </button>
                  </div>
                </div>
              ))}

              {recipes.length === 0 && (
                <div className="rounded-[1.75rem] border border-dashed border-primary/20 bg-background/70 p-8 text-center text-sm text-slate-500 dark:text-slate-400 lg:col-span-2">
                  <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Sparkles className="size-7" />
                  </div>
                  No hay recetas V2 marcadas para prueba en el catálogo actual.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainShellLayout>
  );
}
